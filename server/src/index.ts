import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import "./config/firebase";
import { verifySMTP } from "./config/email";
import fs from 'fs';

// Import AWS SDK Command helpers
import { ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { s3Client, dynamoDocClient, bucketName, tableName, usersTableName, menuItemsTableName, ordersTableName, settingsTableName, reviewsTableName, categoriesTableName } from './config/aws';
import { uploadAndSeedVideos } from './utils/videoUploader';
import { ensureAllTablesExist } from './utils/setupTables';
import restaurantRouter from './routes/restaurant.routes';
import authRouter from './routes/auth.routes';
import { forgotPassword, resetPassword } from './controllers/auth.controller';
import notificationRouter from './routes/notification.routes';
import deliveryLocationRouter from './routes/deliveryLocation.routes';
import { menuService } from './services/menu.service';
import { orderService } from './services/order.service';
import orderRepository from './repositories/order.repository';
import { orderItemRepository } from './repositories/orderItem.repository';
import { RestaurantStatus } from './types/enums';
import shopService, { restaurantService } from './services/restaurant.service';
import { shopRepository } from './repositories/shop.repository';
import { userService } from './services/user.service';
import { userRepository } from './repositories/user.repository';
import { hashPassword, comparePassword } from './utils/hash.utils';
import { generateUserId } from './utils/idGenerator';
import { socketService } from './services/socket.service';
import notificationService from './services/notification.service';
import categoryService from './services/category.service';

import cookieParser from 'cookie-parser';
import { securityHeaders } from './middleware/security.middleware';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Disable technology disclosure header
app.disable('x-powered-by');

// Enable top-level cors middleware for standard CORS handling
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'token', 'userid'],
  exposedHeaders: ['Authorization', 'Set-Cookie']
}));

// Strip AWS API Gateway Stage Prefixes if present in req.url (/production, /prod, /stage)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.startsWith('/production/')) {
    req.url = req.url.substring('/production'.length);
  } else if (req.url.startsWith('/prod/')) {
    req.url = req.url.substring('/prod'.length);
  } else if (req.url.startsWith('/stage/')) {
    req.url = req.url.substring('/stage'.length);
  }
  next();
});

// Enable security headers & cookie parser middleware
app.use(securityHeaders);
app.use(cookieParser());

// Universal Production CORS Middleware for Web & Mobile Clients (Amplify, Custom Domains, Localhost)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Dynamically reflect requesting origin to satisfy Access-Control-Allow-Credentials
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, token, userid'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Authorization, Set-Cookie');

  // Fast-respond to HTTP OPTIONS preflight checks with 200 OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'token',
    'userid'
  ]
}));

app.options('*', cors({ origin: true, credentials: true }));

// Body parsing middleware with limit for base64 file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

import shopRouter from './routes/shop.routes';

// Apply Rate Limiting Policy: Strict for Auth, General for API
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);

// Unified Authentication & Notification API Routes
app.use('/api/auth', authRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api', deliveryLocationRouter);
app.use('/api/shops', shopRouter);
app.use('/api/restaurants', shopRouter);


// Health Check API
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Foodway server is running securely.',
    timestamp: new Date().toISOString(),
    aws: {
      s3Initialized: !!s3Client,
      dynamoInitialized: !!dynamoDocClient,
      bucketName: bucketName || 'Not Configured',
      tableName: tableName || 'Not Configured',
    }
  });
});

// A test route for AWS S3 and DynamoDB initialization check
app.get('/api/aws/status', (req: Request, res: Response) => {
  const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
  const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.LAMBDA_TASK_ROOT;
  const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';
  const dynamoRegion = process.env.AWS_DYNAMODB_REGION || 'ap-south-2';

  res.json({
    credentialsConfigured: (hasAccessKey && hasSecretKey) || isLambda,
    authMethod: isLambda ? 'IAM Execution Role' : (hasAccessKey ? 'Static Credentials' : 'Default SDK Chain'),
    regions: {
      s3Region,
      dynamoRegion,
    },
    s3BucketConfigured: !!bucketName,
    dynamoTableConfigured: !!tableName,
  });
});

// -----------------
// Admin API Routes
// -----------------

// Platform System Settings — defaults, backed by DynamoDB & local file for complete persistence
const defaultPlatformSettings = {
  deliveryFeePerKm: 15,
  baseDeliveryFee: 25,
  freeDeliveryThreshold: 0
};

const settingsFilePath = path.resolve(__dirname, '../data/platform_settings.json');
function readSettingsFromFile() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return null;
}

function saveSettingsToFile(settings: any) {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {}
}

// Helper: Read platform settings from DynamoDB & local disk file
let _settingsCache: typeof defaultPlatformSettings | null = null;
async function getPlatformSettings(forceRefresh = false): Promise<typeof defaultPlatformSettings> {
  if (_settingsCache && !forceRefresh) return _settingsCache;

  // 1. Try reading from dedicated settingsTableName ('foodway-settings')
  try {
    const resSettings = await dynamoDocClient.send(new GetCommand({
      TableName: settingsTableName,
      Key: { settingId: 'platform_settings' }
    }));
    if (resSettings.Item && typeof resSettings.Item.deliveryFeePerKm === 'number') {
      _settingsCache = {
        deliveryFeePerKm: Number(resSettings.Item.deliveryFeePerKm),
        baseDeliveryFee: Number(resSettings.Item.baseDeliveryFee ?? defaultPlatformSettings.baseDeliveryFee),
        freeDeliveryThreshold: Number(resSettings.Item.freeDeliveryThreshold ?? defaultPlatformSettings.freeDeliveryThreshold)
      };
      saveSettingsToFile(_settingsCache);
      return _settingsCache;
    }
  } catch (e) {}

  // 2. Try reading from usersTableName ('foodway-users') with userId PK schema
  try {
    const resUsers = await dynamoDocClient.send(new GetCommand({
      TableName: usersTableName,
      Key: { userId: 'platform_settings' }
    }));
    if (resUsers.Item && typeof resUsers.Item.deliveryFeePerKm === 'number') {
      _settingsCache = {
        deliveryFeePerKm: Number(resUsers.Item.deliveryFeePerKm),
        baseDeliveryFee: Number(resUsers.Item.baseDeliveryFee ?? defaultPlatformSettings.baseDeliveryFee),
        freeDeliveryThreshold: Number(resUsers.Item.freeDeliveryThreshold ?? defaultPlatformSettings.freeDeliveryThreshold)
      };
      saveSettingsToFile(_settingsCache);
      return _settingsCache;
    }
  } catch (e) {}

  // 3. Try reading from tableName ('mk-delivery-services')
  try {
    const resTable = await dynamoDocClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: 'platform_settings' }
    }));
    if (resTable.Item && typeof resTable.Item.deliveryFeePerKm === 'number') {
      _settingsCache = {
        deliveryFeePerKm: Number(resTable.Item.deliveryFeePerKm),
        baseDeliveryFee: Number(resTable.Item.baseDeliveryFee ?? defaultPlatformSettings.baseDeliveryFee),
        freeDeliveryThreshold: Number(resTable.Item.freeDeliveryThreshold ?? defaultPlatformSettings.freeDeliveryThreshold)
      };
      saveSettingsToFile(_settingsCache);
      return _settingsCache;
    }
  } catch (e) {}

  // 4. Try reading from local disk file
  const fileSettings = readSettingsFromFile();
  if (fileSettings && typeof fileSettings.deliveryFeePerKm === 'number') {
    _settingsCache = {
      deliveryFeePerKm: Number(fileSettings.deliveryFeePerKm),
      baseDeliveryFee: Number(fileSettings.baseDeliveryFee ?? defaultPlatformSettings.baseDeliveryFee),
      freeDeliveryThreshold: Number(fileSettings.freeDeliveryThreshold ?? defaultPlatformSettings.freeDeliveryThreshold)
    };
    return _settingsCache;
  }

  _settingsCache = { ...defaultPlatformSettings };
  return _settingsCache;
}

// GET Admin System Settings
app.get('/api/admin/settings', async (req: Request, res: Response) => {
  const settings = await getPlatformSettings(true);
  res.json({ success: true, settings });
});

// GET Public / Cart Delivery Settings
app.get('/api/settings/delivery', async (req: Request, res: Response) => {
  const settings = await getPlatformSettings(true);
  res.json({
    success: true,
    deliveryFeePerKm: settings.deliveryFeePerKm,
    baseDeliveryFee: settings.baseDeliveryFee,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    settings
  });
});

app.get('/api/settings', async (req: Request, res: Response) => {
  const settings = await getPlatformSettings(true);
  res.json({ success: true, settings });
});

// UPDATE Admin System Settings (Delivery Charge Per KM & Base Rate)
app.put('/api/admin/settings', async (req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings(true);
    const { deliveryFeePerKm, baseDeliveryFee, freeDeliveryThreshold } = req.body;
    if (typeof deliveryFeePerKm === 'number' && !isNaN(deliveryFeePerKm) && deliveryFeePerKm >= 0) {
      settings.deliveryFeePerKm = Number(deliveryFeePerKm);
    }
    if (typeof baseDeliveryFee === 'number' && !isNaN(baseDeliveryFee) && baseDeliveryFee >= 0) {
      settings.baseDeliveryFee = Number(baseDeliveryFee);
    }
    if (typeof freeDeliveryThreshold === 'number' && !isNaN(freeDeliveryThreshold) && freeDeliveryThreshold >= 0) {
      settings.freeDeliveryThreshold = Number(freeDeliveryThreshold);
    }
    _settingsCache = settings;

    // 1. Save to local disk file
    saveSettingsToFile(settings);

    // 2. Persist to DynamoDB tables with matching PK schemas for each table
    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: settingsTableName,
        Item: { settingId: 'platform_settings', id: 'platform_settings', ...settings, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: usersTableName,
        Item: { userId: 'platform_settings', id: 'platform_settings', settingId: 'platform_settings', ...settings, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: tableName,
        Item: { id: 'platform_settings', settingId: 'platform_settings', ...settings, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    // 3. Broadcast real-time live update to all active customer sessions
    if (socketService) {
      socketService.emitDeliverySettingsUpdated(settings);
    }
    res.json({
      success: true,
      message: 'Delivery fee settings updated and saved to DynamoDB successfully.',
      settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update admin settings.', details: error.message });
  }
});

// --- WEBSITE HOMEPAGE CMS CONFIGURATION & DYNAMODB PERSISTENCE ---
const defaultHomepageCMS = {
  heroStats: {
    customers: '20K+',
    restaurants: '500+',
    deliveryTime: '30 min'
  },
  flavoursOfKonaseema: {
    title: 'Flavours of Konaseema',
    subtitle: 'Experience traditional recipes, local ingredients, and unforgettable gourmet tastes directly from the kitchens that define Konaseema.',
    featuredItemIds: [] as string[]
  },
  whyChooseUs: {
    title: 'Why Choose MK Delivery..!',
    subtitle: 'From fresh hot meals to groceries, pooja essentials, and daily necessities, discover how we deliver all your essential needs right to your doorstep.',
    features: [
      {
        id: 'feat-1',
        title: 'All Essentials & Fresh Meals',
        badge: 'ALL-IN-ONE',
        description: 'Order groceries, fresh food, pooja items, bakery treats, and daily household essentials from trusted local shops.'
      },
      {
        id: 'feat-2',
        title: 'Express Superfast Delivery',
        badge: '20-30 MINS',
        description: 'Get your food, groceries, vegetables, and daily necessities delivered lightning fast across Konaseema.'
      },
      {
        id: 'feat-3',
        title: 'Live Order Tracking',
        badge: 'LIVE',
        description: 'Track your essential order in real time from store confirmation until our delivery partner reaches your doorstep.'
      }
    ]
  },
  faqs: [
    {
      id: 'faq-1',
      question: 'How do I place an order?',
      answer: 'Browse restaurants, select your favorite dishes, add them to your cart, and proceed to checkout with live order tracking.'
    },
    {
      id: 'faq-2',
      question: 'How long does delivery take?',
      answer: 'Most orders across Konaseema are delivered within 20 to 30 minutes depending on your location.'
    },
    {
      id: 'faq-3',
      question: 'Can I track my order?',
      answer: 'Yes! Real-time GPS order tracking and status updates are visible directly on your active order screen.'
    },
    {
      id: 'faq-4',
      question: 'Which areas do you currently serve?',
      answer: 'We deliver fast and fresh across Ravulapalem and surrounding towns in Konaseema.'
    }
  ],
  contactDetails: {
    email: 'mkdeliveryservices12@gmail.com',
    phone: '+91 9573041191',
    address: 'Ravulapalem-533238',
    whatsapp: '+919573041191',
    instagram: 'https://instagram.com/mkdeliveryservices',
    copyrightText: '© 2026 MK DELIVERY SERVICES. ALL RIGHTS RESERVED.'
  }
};

const cmsFilePath = path.resolve(__dirname, '../data/homepage_cms.json');
let _cmsCache: typeof defaultHomepageCMS | null = null;

function saveCMSToFile(cms: any) {
  try {
    const dir = path.dirname(cmsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cmsFilePath, JSON.stringify(cms, null, 2), 'utf-8');
  } catch (e) {}
}

async function getHomepageCMS(forceRefresh = false): Promise<typeof defaultHomepageCMS> {
  if (_cmsCache && !forceRefresh) return _cmsCache;

  // 1. Try reading from dedicated settingsTableName ('foodway-settings')
  try {
    const resSettings = await dynamoDocClient.send(new GetCommand({
      TableName: settingsTableName,
      Key: { settingId: 'homepage_cms' }
    }));
    if (resSettings.Item && (resSettings.Item.heroStats || resSettings.Item.faqs || resSettings.Item.contactDetails)) {
      _cmsCache = {
        heroStats: { ...defaultHomepageCMS.heroStats, ...(resSettings.Item.heroStats || {}) },
        flavoursOfKonaseema: { ...defaultHomepageCMS.flavoursOfKonaseema, ...(resSettings.Item.flavoursOfKonaseema || {}) },
        whyChooseUs: { ...defaultHomepageCMS.whyChooseUs, ...(resSettings.Item.whyChooseUs || {}) },
        faqs: Array.isArray(resSettings.Item.faqs) && resSettings.Item.faqs.length > 0 ? resSettings.Item.faqs : defaultHomepageCMS.faqs,
        contactDetails: { ...defaultHomepageCMS.contactDetails, ...(resSettings.Item.contactDetails || {}) }
      };
      saveCMSToFile(_cmsCache);
      return _cmsCache;
    }
  } catch (e) {}

  // 2. Try reading from usersTableName ('foodway-users') with userId PK
  try {
    const resUsers = await dynamoDocClient.send(new GetCommand({
      TableName: usersTableName,
      Key: { userId: 'homepage_cms' }
    }));
    if (resUsers.Item && (resUsers.Item.heroStats || resUsers.Item.faqs || resUsers.Item.contactDetails)) {
      _cmsCache = {
        heroStats: { ...defaultHomepageCMS.heroStats, ...(resUsers.Item.heroStats || {}) },
        flavoursOfKonaseema: { ...defaultHomepageCMS.flavoursOfKonaseema, ...(resUsers.Item.flavoursOfKonaseema || {}) },
        whyChooseUs: { ...defaultHomepageCMS.whyChooseUs, ...(resUsers.Item.whyChooseUs || {}) },
        faqs: Array.isArray(resUsers.Item.faqs) && resUsers.Item.faqs.length > 0 ? resUsers.Item.faqs : defaultHomepageCMS.faqs,
        contactDetails: { ...defaultHomepageCMS.contactDetails, ...(resUsers.Item.contactDetails || {}) }
      };
      saveCMSToFile(_cmsCache);
      return _cmsCache;
    }
  } catch (e) {}

  // 3. Try reading from tableName ('mk-delivery-services')
  try {
    const resTable = await dynamoDocClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: 'homepage_cms' }
    }));
    if (resTable.Item && (resTable.Item.heroStats || resTable.Item.faqs || resTable.Item.contactDetails)) {
      _cmsCache = {
        heroStats: { ...defaultHomepageCMS.heroStats, ...(resTable.Item.heroStats || {}) },
        flavoursOfKonaseema: { ...defaultHomepageCMS.flavoursOfKonaseema, ...(resTable.Item.flavoursOfKonaseema || {}) },
        whyChooseUs: { ...defaultHomepageCMS.whyChooseUs, ...(resTable.Item.whyChooseUs || {}) },
        faqs: Array.isArray(resTable.Item.faqs) && resTable.Item.faqs.length > 0 ? resTable.Item.faqs : defaultHomepageCMS.faqs,
        contactDetails: { ...defaultHomepageCMS.contactDetails, ...(resTable.Item.contactDetails || {}) }
      };
      saveCMSToFile(_cmsCache);
      return _cmsCache;
    }
  } catch (e) {}

  // 4. Try reading from local file
  try {
    if (fs.existsSync(cmsFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(cmsFilePath, 'utf-8'));
      _cmsCache = {
        heroStats: { ...defaultHomepageCMS.heroStats, ...(fileData.heroStats || {}) },
        flavoursOfKonaseema: { ...defaultHomepageCMS.flavoursOfKonaseema, ...(fileData.flavoursOfKonaseema || {}) },
        whyChooseUs: { ...defaultHomepageCMS.whyChooseUs, ...(fileData.whyChooseUs || {}) },
        faqs: Array.isArray(fileData.faqs) && fileData.faqs.length > 0 ? fileData.faqs : defaultHomepageCMS.faqs,
        contactDetails: { ...defaultHomepageCMS.contactDetails, ...(fileData.contactDetails || {}) }
      };
      return _cmsCache;
    }
  } catch (e) {}

  _cmsCache = { ...defaultHomepageCMS };
  return _cmsCache;
}

// GET Public Homepage CMS
app.get('/api/cms/homepage', async (req: Request, res: Response) => {
  const cms = await getHomepageCMS(true);
  res.json({ success: true, cms });
});

// UPDATE Admin Homepage CMS (Saves to DynamoDB and local storage)
app.put('/api/admin/cms/homepage', async (req: Request, res: Response) => {
  try {
    const currentCMS = await getHomepageCMS(true);
    const { heroStats, flavoursOfKonaseema, whyChooseUs, faqs, contactDetails } = req.body;

    const updatedCMS = {
      heroStats: heroStats ? { ...currentCMS.heroStats, ...heroStats } : currentCMS.heroStats,
      flavoursOfKonaseema: flavoursOfKonaseema ? { ...currentCMS.flavoursOfKonaseema, ...flavoursOfKonaseema } : currentCMS.flavoursOfKonaseema,
      whyChooseUs: whyChooseUs ? { ...currentCMS.whyChooseUs, ...whyChooseUs } : currentCMS.whyChooseUs,
      faqs: Array.isArray(faqs) ? faqs : currentCMS.faqs,
      contactDetails: contactDetails ? { ...currentCMS.contactDetails, ...contactDetails } : currentCMS.contactDetails
    };

    _cmsCache = updatedCMS;
    saveCMSToFile(updatedCMS);

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: settingsTableName,
        Item: { settingId: 'homepage_cms', id: 'homepage_cms', ...updatedCMS, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: usersTableName,
        Item: { userId: 'homepage_cms', id: 'homepage_cms', settingId: 'homepage_cms', ...updatedCMS, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: tableName,
        Item: { id: 'homepage_cms', settingId: 'homepage_cms', ...updatedCMS, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    if (socketService) {
      await socketService.emitCMSUpdated(updatedCMS);
    }

    res.json({ success: true, message: 'Homepage CMS updated successfully', cms: updatedCMS });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update CMS' });
  }
});

// --- HOMEPAGE DYNAMIC CATEGORIES CONFIGURATION & DYNAMODB PERSISTENCE ---
export interface IHomepageCategoryItem {
  id: string;
  name: string;
  image: string;
  description: string;
  keywords: string[];
  badge?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

const defaultHomepageCategories: IHomepageCategoryItem[] = [
  {
    id: 'cat_bakery',
    name: 'Bakery & Cakes',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Breads, Custom Cakes, Pastries & Confectionery.',
    keywords: ['bakery', 'cake', 'cakes', 'pastry', 'pastries', 'bread', 'puff', 'puffs', 'cookie', 'cookies', 'dessert', 'sweet', 'sweets'],
    badge: 'SWEET DELIGHTS',
    isActive: true,
    order: 1
  },
  {
    id: 'cat_beverages',
    name: 'Beverages & Coolers',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    description: 'Soft Drinks, Packaged Juices, Milkshakes & Water.',
    keywords: ['beverage', 'beverages', 'drink', 'drinks', 'shake', 'shakes', 'juice', 'juices', 'soda', 'tea', 'coffee', 'coolers', 'cooler'],
    badge: 'ICE COLD',
    isActive: true,
    order: 2
  },
  {
    id: 'cat_dairy',
    name: 'Dairy, Milk & Eggs',
    image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Milk, Curd, Butter, Paneer, Cheese & Eggs.',
    keywords: ['dairy', 'milk', 'curd', 'paneer', 'butter', 'ghee', 'cheese', 'egg', 'eggs', 'cream'],
    badge: 'QUICK DELIVERY',
    isActive: true,
    order: 3
  },
  {
    id: 'cat_freshfood',
    name: 'Fresh Food & Restaurants',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600',
    description: 'Authentic Biryani, Tandoori Kebabs, Meals & Fast Food.',
    keywords: ['food', 'biryani', 'restaurant', 'meal', 'meals', 'tandoori', 'curry', 'starter', 'fast food', 'kitchen', 'tiffins', 'chicken', 'mutton', 'paneer', 'dosa', 'roti', 'rice bowl'],
    badge: 'HOT & FRESH',
    isActive: true,
    order: 4
  },
  {
    id: 'cat_fruits_veg',
    name: 'Fruits & Fresh Vegetables',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600',
    description: 'Farm Fresh Produce, Organic Vegetables & Seasonal Fruits.',
    keywords: ['fruit', 'fruits', 'vegetable', 'vegetables', 'fresh produce', 'veggie', 'veggies'],
    badge: 'FARM FRESH',
    isActive: true,
    order: 5
  },
  {
    id: 'cat_groceries',
    name: 'Groceries & Supermarket',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
    description: 'Rice, Atta, Cooking Oils, Spices, Staples & Daily Packaged Foods.',
    keywords: ['grocery', 'groceries', 'supermarket', 'staples', 'mart', 'provision', 'provisions'],
    badge: 'DAILY ESSENTIALS',
    isActive: true,
    order: 6
  },
  {
    id: 'cat_household',
    name: 'Household & Personal Care',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&q=80&w=600',
    description: 'Soaps, Shampoos, Detergents, Hygiene & Home Cleaning.',
    keywords: ['household', 'personal care', 'soap', 'shampoo', 'detergent', 'cleaning', 'hygiene', 'toiletries'],
    badge: 'HOME CARE',
    isActive: true,
    order: 7
  },
  {
    id: 'cat_pooja',
    name: 'Pooja Essentials & Flowers',
    image: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3da60?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Garland Flowers, Agarbatti, Camphor, Diya Oils & Ritual Packs.',
    keywords: ['pooja', 'puja', 'flower', 'flowers', 'agarbatti', 'camphor', 'diya', 'dhoop', 'ritual', 'temple', 'garland', 'samagri', 'moola', 'kumkum', 'turmeric'],
    badge: 'TEMPLE SPECIAL',
    isActive: true,
    order: 8
  }
];

const categoriesFilePath = path.resolve(__dirname, '../data/homepage_categories.json');
let _categoriesCache: IHomepageCategoryItem[] | null = null;

function saveHomepageCategoriesToFile(categories: IHomepageCategoryItem[]) {
  try {
    const dir = path.dirname(categoriesFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 2), 'utf-8');
  } catch (e) {}
}

async function getHomepageCategories(forceRefresh = false): Promise<IHomepageCategoryItem[]> {
  if (_categoriesCache && !forceRefresh) return _categoriesCache;

  // 1. Try reading from dedicated settingsTableName ('foodway-settings')
  try {
    const resSettings = await dynamoDocClient.send(new GetCommand({
      TableName: settingsTableName,
      Key: { settingId: 'homepage_categories' }
    }));
    if (resSettings.Item && Array.isArray(resSettings.Item.categories) && resSettings.Item.categories.length > 0) {
      _categoriesCache = resSettings.Item.categories;
      saveHomepageCategoriesToFile(_categoriesCache!);
      return _categoriesCache!;
    }
  } catch (e) {}

  // 2. Try reading from usersTableName
  try {
    const resUsers = await dynamoDocClient.send(new GetCommand({
      TableName: usersTableName,
      Key: { userId: 'homepage_categories' }
    }));
    if (resUsers.Item && Array.isArray(resUsers.Item.categories) && resUsers.Item.categories.length > 0) {
      _categoriesCache = resUsers.Item.categories;
      saveHomepageCategoriesToFile(_categoriesCache!);
      return _categoriesCache!;
    }
  } catch (e) {}

  // 3. Try reading from tableName
  try {
    const resTable = await dynamoDocClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: 'homepage_categories' }
    }));
    if (resTable.Item && Array.isArray(resTable.Item.categories) && resTable.Item.categories.length > 0) {
      _categoriesCache = resTable.Item.categories;
      saveHomepageCategoriesToFile(_categoriesCache!);
      return _categoriesCache!;
    }
  } catch (e) {}

  // 4. Try reading from local file
  try {
    if (fs.existsSync(categoriesFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(categoriesFilePath, 'utf-8'));
      if (Array.isArray(fileData) && fileData.length > 0) {
        _categoriesCache = fileData;
        return _categoriesCache!;
      }
    }
  } catch (e) {}

  // 5. Fallback to default categories
  _categoriesCache = [...defaultHomepageCategories];
  saveHomepageCategoriesToFile(_categoriesCache);
  return _categoriesCache;
}

// GET Public Homepage Categories (only active ones, sorted by order)
app.get('/api/public/homepage-categories', async (req: Request, res: Response) => {
  try {
    const allCategories = await getHomepageCategories(false);
    const activeCategories = allCategories
      .filter(c => c.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ success: true, categories: activeCategories });
  } catch (err: any) {
    res.json({ success: true, categories: defaultHomepageCategories });
  }
});

// GET Admin Homepage Categories (all categories, including inactive)
app.get('/api/admin/homepage-categories', async (req: Request, res: Response) => {
  try {
    const categories = await getHomepageCategories(true);
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch categories' });
  }
});

// PUT Admin Update Full Homepage Categories List (for reordering, mass edits, etc.)
app.put('/api/admin/homepage-categories', async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ success: false, error: 'Categories array is required' });
    }

    const cleanedCategories: IHomepageCategoryItem[] = categories.map((cat, idx) => ({
      id: cat.id || `cat_${Date.now()}_${idx}`,
      name: String(cat.name || '').trim(),
      image: String(cat.image || '').trim(),
      description: String(cat.description || '').trim(),
      keywords: Array.isArray(cat.keywords) ? cat.keywords.map((k: any) => String(k).trim()).filter(Boolean) : [],
      badge: cat.badge ? String(cat.badge).trim() : undefined,
      isActive: cat.isActive !== false,
      order: typeof cat.order === 'number' ? cat.order : idx + 1,
      updatedAt: new Date().toISOString()
    })).filter(c => Boolean(c.name));

    _categoriesCache = cleanedCategories;
    saveHomepageCategoriesToFile(cleanedCategories);

    // Persist to DynamoDB tables
    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: settingsTableName,
        Item: { settingId: 'homepage_categories', id: 'homepage_categories', categories: cleanedCategories, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: usersTableName,
        Item: { userId: 'homepage_categories', id: 'homepage_categories', settingId: 'homepage_categories', categories: cleanedCategories, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: tableName,
        Item: { id: 'homepage_categories', settingId: 'homepage_categories', categories: cleanedCategories, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      if (categoriesTableName) {
        for (const cat of cleanedCategories) {
          await dynamoDocClient.send(new PutCommand({
            TableName: categoriesTableName,
            Item: {
              categoryId: cat.id,
              id: cat.id,
              name: cat.name,
              image: cat.image,
              description: cat.description,
              badge: cat.badge,
              keywords: cat.keywords,
              order: cat.order,
              isActive: cat.isActive,
              type: 'homepage_category',
              restaurantId: 'admin',
              shopId: 'admin',
              updatedAt: new Date().toISOString()
            }
          }));
        }
      }
    } catch (e) {}

    if (socketService) {
      await socketService.emitCategoryUpdated(cleanedCategories);
    }

    res.json({ success: true, message: 'Homepage categories saved successfully', categories: cleanedCategories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update categories' });
  }
});

// POST Admin Add/Update Single Category
app.post('/api/admin/homepage-categories', async (req: Request, res: Response) => {
  try {
    const currentList = await getHomepageCategories(true);
    const categoryData = req.body;

    if (!categoryData.name || !String(categoryData.name).trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const catId = categoryData.id || `cat_${Date.now()}`;
    const existingIndex = currentList.findIndex(c => c.id === catId);

    const formattedItem: IHomepageCategoryItem = {
      id: catId,
      name: String(categoryData.name).trim(),
      image: String(categoryData.image || '').trim(),
      description: String(categoryData.description || '').trim(),
      keywords: Array.isArray(categoryData.keywords)
        ? categoryData.keywords.map((k: any) => String(k).trim()).filter(Boolean)
        : typeof categoryData.keywords === 'string'
          ? categoryData.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
          : [],
      badge: categoryData.badge ? String(categoryData.badge).trim() : undefined,
      isActive: categoryData.isActive !== false,
      order: typeof categoryData.order === 'number' ? categoryData.order : currentList.length + 1,
      updatedAt: new Date().toISOString()
    };

    let updatedList: IHomepageCategoryItem[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...formattedItem };
    } else {
      updatedList = [...currentList, formattedItem];
    }

    _categoriesCache = updatedList;
    saveHomepageCategoriesToFile(updatedList);

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: settingsTableName,
        Item: { settingId: 'homepage_categories', id: 'homepage_categories', categories: updatedList, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: usersTableName,
        Item: { userId: 'homepage_categories', id: 'homepage_categories', settingId: 'homepage_categories', categories: updatedList, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: tableName,
        Item: { id: 'homepage_categories', settingId: 'homepage_categories', categories: updatedList, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      if (categoriesTableName) {
        await dynamoDocClient.send(new PutCommand({
          TableName: categoriesTableName,
          Item: {
            categoryId: formattedItem.id,
            id: formattedItem.id,
            name: formattedItem.name,
            image: formattedItem.image,
            description: formattedItem.description,
            badge: formattedItem.badge,
            keywords: formattedItem.keywords,
            order: formattedItem.order,
            isActive: formattedItem.isActive,
            type: 'homepage_category',
            restaurantId: 'admin',
            shopId: 'admin',
            updatedAt: new Date().toISOString()
          }
        }));
      }
    } catch (e) {}

    if (socketService) {
      await socketService.emitCategoryUpdated(updatedList);
    }

    res.json({ success: true, message: 'Category saved successfully', category: formattedItem, categories: updatedList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save category' });
  }
});

// DELETE Admin Delete Category by ID
app.delete('/api/admin/homepage-categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentList = await getHomepageCategories(true);
    const updatedList = currentList.filter(c => c.id !== id);

    _categoriesCache = updatedList;
    saveHomepageCategoriesToFile(updatedList);

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: settingsTableName,
        Item: { settingId: 'homepage_categories', id: 'homepage_categories', categories: updatedList, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: usersTableName,
        Item: { userId: 'homepage_categories', id: 'homepage_categories', settingId: 'homepage_categories', categories: updatedList, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: tableName,
        Item: { id: 'homepage_categories', settingId: 'homepage_categories', categories: updatedList, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    try {
      if (categoriesTableName) {
        await dynamoDocClient.send(new DeleteCommand({
          TableName: categoriesTableName,
          Key: { categoryId: id }
        }));
      }
    } catch (e) {}

    if (socketService) {
      await socketService.emitCategoryUpdated(updatedList);
    }

    res.json({ success: true, message: 'Category removed successfully', categories: updatedList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete category' });
  }
});

// POST Admin Reset Categories to Default
app.post('/api/admin/homepage-categories/reset', async (req: Request, res: Response) => {
  try {
    _categoriesCache = [...defaultHomepageCategories];
    saveHomepageCategoriesToFile(_categoriesCache);

    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: settingsTableName,
        Item: { settingId: 'homepage_categories', id: 'homepage_categories', categories: _categoriesCache, updatedAt: new Date().toISOString() }
      }));
    } catch (e) {}

    if (socketService) {
      await socketService.emitCategoryUpdated(_categoriesCache);
    }

    res.json({ success: true, message: 'Categories restored to defaults', categories: _categoriesCache });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to reset categories' });
  }
});

// --- REQUEST INVITATIONS SUBSCRIPTION MANAGEMENT & DYNAMODB PERSISTENCE ---
const invitationsFilePath = path.resolve(__dirname, '../data/invitations.json');
function readInvitationsFromFile(): any[] {
  try {
    if (fs.existsSync(invitationsFilePath)) {
      return JSON.parse(fs.readFileSync(invitationsFilePath, 'utf-8'));
    }
  } catch (e) {}
  return [];
}
function saveInvitationsToFile(list: any[]) {
  try {
    const dir = path.dirname(invitationsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(invitationsFilePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {}
}

// POST Public Request Invitation (Name, Email, Phone Number)
app.post('/api/invitations', async (req: Request, res: Response) => {
  try {
    const { name, email, phone } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const newInvitation = {
      id: `INV-${Date.now()}`,
      name: (name || '').trim() || 'Guest',
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim() || 'N/A',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const currentList = readInvitationsFromFile();
    const existingIdx = currentList.findIndex(i => i.email === newInvitation.email);
    if (existingIdx >= 0) {
      currentList[existingIdx] = { ...currentList[existingIdx], ...newInvitation };
    } else {
      currentList.unshift(newInvitation);
    }
    saveInvitationsToFile(currentList);

    const tablesToTry = Array.from(new Set([tableName, usersTableName, 'foodway-users', 'mk-delivery-services'].filter(Boolean)));
    for (const tName of tablesToTry) {
      try {
        await dynamoDocClient.send(
          new PutCommand({
            TableName: tName,
            Item: {
              userId: `invitation_${newInvitation.id}`,
              pk: 'invitation',
              sk: newInvitation.id,
              type: 'INVITATION_REQUEST',
              ...newInvitation
            }
          })
        );
      } catch (e) {}
    }

    res.json({ success: true, message: 'Invitation request submitted successfully', invitation: newInvitation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to submit invitation request' });
  }
});

// GET Admin Invitations List
app.get('/api/admin/invitations', async (req: Request, res: Response) => {
  try {
    const fileList = readInvitationsFromFile();
    const tablesToTry = Array.from(new Set([tableName, usersTableName, 'foodway-users', 'mk-delivery-services'].filter(Boolean)));
    let dbItems: any[] = [];
    for (const tName of tablesToTry) {
      try {
        const result = await dynamoDocClient.send(new ScanCommand({
          TableName: tName,
          FilterExpression: 'begins_with(id, :prefix) OR #t = :invType',
          ExpressionAttributeNames: { '#t': 'type' },
          ExpressionAttributeValues: { ':prefix': 'INV-', ':invType': 'INVITATION_REQUEST' }
        }));
        if (result.Items && result.Items.length > 0) {
          dbItems = result.Items;
          break;
        }
      } catch (e) {}
    }

    const mergedMap = new Map<string, any>();
    fileList.forEach(item => mergedMap.set(item.id || item.email, item));
    dbItems.forEach(item => mergedMap.set(item.id || item.email, item));

    const invitations = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ success: true, invitations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch invitations' });
  }
});

// DELETE Admin Invitation Request
app.delete('/api/admin/invitations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let list = readInvitationsFromFile().filter(i => i.id !== id && i.email !== id);
    saveInvitationsToFile(list);

    const tablesToTry = Array.from(new Set([tableName, usersTableName, 'foodway-users', 'mk-delivery-services'].filter(Boolean)));
    for (const tName of tablesToTry) {
      try {
        await dynamoDocClient.send(new DeleteCommand({ TableName: tName, Key: { id, email: id } }));
      } catch (e) {}
    }

    res.json({ success: true, message: 'Invitation request deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete invitation' });
  }
});

// Fetch User Active Cart — reads directly from DynamoDB user profile
app.get('/api/cart/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    let items: any[] = [];
    const dbUser = await userService.getUserById(userId);
    if (dbUser && Array.isArray((dbUser as any).activeCart)) {
      items = (dbUser as any).activeCart;
    }
    res.json({ success: true, cartItems: items });
  } catch (e) {
    res.json({ success: true, cartItems: [] });
  }
});

// Update & Broadcast User Active Cart across all logged-in devices
app.put('/api/cart/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { cartItems } = req.body;
    const items = Array.isArray(cartItems) ? cartItems : [];

    // Save to DynamoDB user record
    await userService.updateProfile(userId, { activeCart: items } as any).catch(() => { });

    // Broadcast WebSocket event to user room (no-op in Lambda)
    socketService.emitCartUpdated(userId, items);

    res.json({ success: true, message: 'Cart synchronized across devices.', cartItems: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to sync cart.' });
  }
});

// Public Endpoint to fetch Delivery Rates for Cart Calculation
app.get('/api/settings/delivery', async (req: Request, res: Response) => {
  const settings = await getPlatformSettings();
  res.json({ success: true, ...settings });
});

// Admin Login API
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@foodway.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (email === adminEmail && password === adminPassword) {
    res.json({
      success: true,
      message: 'Logged in successfully as Admin',
      admin: {
        email,
        role: 'admin',
        token: 'mock-jwt-admin-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }
});

// Fetch all restaurants for Admin from foodway-restaurants table
app.get('/api/admin/restaurants', async (req: Request, res: Response) => {
  try {
    const rawRestaurants = await restaurantService.getAllRestaurants();
    const mapped = rawRestaurants.map((r: any) => {
      const isClosed = r.isOpen === false || r.status === 'closed' || r.status === 'inactive';
      return {
        ...r,
        id: r.restaurantId,
        name: r.restaurantName,
        ownerName: r.ownerName || r.restaurantName,
        email: r.email,
        phone: r.phone || '',
        address: r.address || '',
        category: r.cuisine || 'Gourmet',
        image: r.logo || r.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
        isOpen: !isClosed,
        status: isClosed ? 'closed' : 'active'
      };
    });
    res.json({ success: true, restaurants: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurants.', details: error.message });
  }
});

// Update Restaurant Open / Close Status (Called when toggling Offline / Closed)
app.put('/api/restaurant/status/:resId', async (req: Request, res: Response) => {
  try {
    const { resId } = req.params;
    const { isOpen } = req.body;

    const nextStatus: RestaurantStatus = isOpen ? 'ACTIVE' : 'INACTIVE';

    // 1. Scan and update in foodway-restaurants table
    const allRestaurants = await restaurantService.getAllRestaurants();
    const targetRes = allRestaurants.find((r: any) =>
      r.restaurantId === resId ||
      r.shopId === resId ||
      r.id === resId ||
      r.ownerUserId === resId ||
      (r.email && r.email.toLowerCase() === resId.toLowerCase()) ||
      (r.restaurantName && r.restaurantName.toLowerCase() === resId.toLowerCase()) ||
      (r.shopName && r.shopName.toLowerCase() === resId.toLowerCase())
    );

    if (targetRes) {
      const targetId = targetRes.shopId || targetRes.restaurantId || (targetRes as any).id || '';
      if (targetId) {
        await restaurantService.updateProfile(targetId, {
          isOpen,
          status: nextStatus
        });
      }
    } else {
      // Direct update attempt by resId
      await restaurantService.updateProfile(resId, {
        isOpen,
        status: nextStatus
      });
    }

    // 2. Also update in main table if present
    if (tableName) {
      try {
        const scanCommand = new ScanCommand({ TableName: tableName });
        const response = await dynamoDocClient.send(scanCommand);
        const mainResItems = (response.Items || []).filter(
          (item: any) =>
            item.type === 'restaurant' &&
            (item.id === resId || item.restaurantId === resId || item.shopId === resId || (item.name && item.name.toLowerCase() === resId.toLowerCase()) || (item.email && item.email.toLowerCase() === resId.toLowerCase()))
        );

        for (const resItem of mainResItems) {
          await dynamoDocClient.send(
            new PutCommand({
              TableName: tableName,
              Item: {
                ...resItem,
                isOpen,
                status: nextStatus,
                updatedAt: new Date().toISOString()
              }
            })
          );
        }
      } catch (e) { }
    }

    if (socketService) {
      socketService.emitShopStatusUpdated(resId, isOpen, nextStatus);
    }

    res.json({ success: true, message: `Restaurant status updated to ${nextStatus}.`, isOpen, status: nextStatus });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update restaurant status.', details: error.message });
  }
});

// Public Endpoint: Fetch All Restaurants directly from DynamoDB with Dynamic Ratings
app.get('/api/public/restaurants', async (req: Request, res: Response) => {
  try {
    const rawRestaurants = await restaurantService.getAllRestaurants();

    // Compute average ratings from foodway-reviews table
    let ratingsMap: Record<string, { sum: number; count: number }> = {};
    try {
      if (reviewsTableName) {
        const scanRev = new ScanCommand({ TableName: reviewsTableName });
        const revResp = await dynamoDocClient.send(scanRev);
        (revResp.Items || []).forEach((rev: any) => {
          const resId = rev.restaurantId || rev.shopId;
          if (resId && rev.rating) {
            if (!ratingsMap[resId]) ratingsMap[resId] = { sum: 0, count: 0 };
            ratingsMap[resId].sum += Number(rev.rating);
            ratingsMap[resId].count += 1;
          }
        });
      }
    } catch (e) { }

    const mapped = rawRestaurants.map((r: any) => {
      const isClosed = r.isOpen === false || r.isOpen === 'false' || r.status === 'closed' || r.status === 'inactive' || r.status === 'INACTIVE' || r.status === 'OFFLINE' || r.status === 'offline' || r.status === 'CLOSED';
      const resId = r.shopId || r.restaurantId || r.id;
      const resName = r.shopName || r.restaurantName || r.name;
      const dietaryType = r.dietaryType || (r.isVegOnly ? 'PURE_VEG' : 'BOTH');

      let dynamicRating = Number(r.rating || 4.8);
      if (ratingsMap[resId] && ratingsMap[resId].count > 0) {
        dynamicRating = Number((ratingsMap[resId].sum / ratingsMap[resId].count).toFixed(1));
      }

      return {
        id: resId,
        shopId: resId,
        restaurantId: resId,
        name: resName,
        shopName: resName,
        restaurantName: resName,
        cuisine: r.cuisine || r.category || r.shopType || 'Multi-Cuisine',
        category: r.category || r.shopType || r.cuisine || 'General Store',
        shopType: r.shopType || r.category || r.cuisine || 'FOOD',
        rating: dynamicRating,
        ratingCount: ratingsMap[resId]?.count || 0,
        deliveryTime: '20-30 mins',
        image: r.logo || r.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
        isOpen: !isClosed,
        status: isClosed ? 'closed' : 'active',
        address: r.address || '',
        phone: r.phone || '',
        description: r.description || '',
        dietaryType,
        isVegOnly: dietaryType === 'PURE_VEG'
      };
    });
    res.json({ success: true, restaurants: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public restaurants.' });
  }
});

// Submit Rating & Feedback for a Completed Order (DynamoDB Persisted)
app.post('/api/orders/:orderId/review', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { rating, feedback, reviewText, customerName } = req.body;

    const numRating = Math.max(1, Math.min(5, Number(rating || 5)));
    const text = (feedback || reviewText || '').trim();

    let targetOrder: any = null;
    if (ordersTableName) {
      const scanCmd = new ScanCommand({ TableName: ordersTableName });
      const scanResp = await dynamoDocClient.send(scanCmd);
      const items = scanResp.Items || [];
      targetOrder = items.find((o: any) => o.id === orderId || o.orderId === orderId);

      if (targetOrder) {
        await dynamoDocClient.send(new PutCommand({
          TableName: ordersTableName,
          Item: {
            ...targetOrder,
            rating: numRating,
            feedback: text,
            reviewText: text,
            reviewedAt: new Date().toISOString()
          }
        }));
      }
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const reviewItem = {
      reviewId,
      orderId,
      restaurantId: targetOrder?.restaurantId || targetOrder?.shopId || 'res_default',
      restaurantName: targetOrder?.restaurant || targetOrder?.restaurantName || targetOrder?.shopName || 'Gourmet Merchant',
      customerName: customerName || targetOrder?.customer?.name || targetOrder?.customerName || 'Valued Patron',
      customerEmail: targetOrder?.customer?.email || targetOrder?.customerEmail || '',
      rating: numRating,
      feedback: text,
      reviewText: text,
      createdAt: new Date().toISOString()
    };

    if (reviewsTableName) {
      try {
        await dynamoDocClient.send(new PutCommand({
          TableName: reviewsTableName,
          Item: reviewItem
        }));
      } catch (err) {
        console.warn('Error saving to reviewsTableName:', err);
      }
    }

    res.json({ success: true, message: 'Rating and review submitted successfully!', review: reviewItem });
  } catch (error: any) {
    console.error('Error submitting order review:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review.' });
  }
});

// Fetch All Customer Reviews for Homepage Testimonials & Store Reviews
app.get('/api/public/reviews', async (req: Request, res: Response) => {
  try {
    let reviews: any[] = [];

    if (reviewsTableName) {
      try {
        const scanCmd = new ScanCommand({ TableName: reviewsTableName });
        const resp = await dynamoDocClient.send(scanCmd);
        reviews = resp.Items || [];
      } catch (e) { }
    }

    // Fallback scan orders table for reviewed orders if reviewsTableName empty
    if (reviews.length === 0 && ordersTableName) {
      try {
        const scanCmd = new ScanCommand({ TableName: ordersTableName });
        const resp = await dynamoDocClient.send(scanCmd);
        const orders = resp.Items || [];
        reviews = orders
          .filter((o: any) => o.rating)
          .map((o: any) => ({
            reviewId: `rev_${o.id || o.orderId}`,
            orderId: o.id || o.orderId,
            restaurantId: o.restaurantId || o.shopId || '',
            restaurantName: o.restaurant || o.restaurantName || o.shopName || 'Gourmet Merchant',
            customerName: o.customer?.name || o.customerName || 'Valued Patron',
            rating: Number(o.rating || 5),
            feedback: o.feedback || o.reviewText || 'Excellent delivery service and quality food!',
            reviewText: o.feedback || o.reviewText || 'Excellent delivery service and quality food!',
            createdAt: o.reviewedAt || o.createdAt || new Date().toISOString()
          }));
      } catch (e) { }
    }

    // Sort newest first
    reviews.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({ success: true, reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public reviews.' });
  }
});

// Public Endpoint: Fetch All Dishes / Menu Items directly from DynamoDB
app.get('/api/public/dishes', async (req: Request, res: Response) => {
  try {
    const scanCommand = new ScanCommand({ TableName: menuItemsTableName });
    const response = await dynamoDocClient.send(scanCommand);
    const items = response.Items || [];

    let resMap: Record<string, string> = {};
    try {
      const rawRestaurants = await restaurantService.getAllRestaurants();
      rawRestaurants.forEach((r: any) => {
        resMap[r.restaurantId || r.id] = r.restaurantName || r.name;
      });
    } catch (e) { }

    const mapped = items.map((item: any) => ({
      id: item.menuItemId,
      name: item.foodName,
      description: item.description || '',
      price: Number(item.price),
      category: item.category || 'Main Course',
      image: item.foodImage || item.image || '',
      isVeg: item.isVeg !== undefined ? item.isVeg : true,
      type: item.isVeg ? 'veg' : 'non-veg',
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
      status: item.isAvailable === false || item.status === 'UNAVAILABLE' ? 'disabled' : 'active',
      rating: item.rating || 4.8,
      prepTime: item.preparationTime || '15-20 mins',
      restaurantId: item.restaurantId,
      restaurantName: item.restaurantName || resMap[item.restaurantId] || 'Jayanth Foods'
    }));

    res.json({ success: true, dishes: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public dishes.' });
  }
});

// Public Endpoint: Fetch Single Dish by ID
app.get('/api/public/dishes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scanCommand = new ScanCommand({ TableName: menuItemsTableName });
    const response = await dynamoDocClient.send(scanCommand);
    const items = response.Items || [];

    const found = items.find((i: any) => String(i.menuItemId || i.id || i._id) === String(id));
    if (!found) {
      return res.status(404).json({ success: false, error: 'Dish not found' });
    }

    let restaurantName = found.restaurantName || 'Partner Store';
    try {
      if (found.restaurantId) {
        const resObj = await restaurantService.getRestaurantById(found.restaurantId);
        if (resObj && ((resObj as any).restaurantName || (resObj as any).name || (resObj as any).shopName)) {
          restaurantName = (resObj as any).restaurantName || (resObj as any).name || (resObj as any).shopName;
        }
      }
    } catch (e) { }

    const isVeg = found.isVeg !== undefined ? found.isVeg : found.type !== 'non-veg' && found.type !== 'nonveg';
    const isAvailable = found.isAvailable !== false && found.status !== 'UNAVAILABLE' && found.status !== 'disabled';

    let variants = Array.isArray(found.variants) ? found.variants : [];
    if (variants.length === 0) {
      variants = [{
        id: `${found.menuItemId || id}-V1`,
        variantId: `${found.menuItemId || id}-V1`,
        quantity: 1,
        unit: 'pcs',
        price: Number(found.price || 0),
        label: 'Standard',
        isAvailable: isAvailable
      }];
    }

    const mappedDish = {
      id: found.menuItemId || id,
      menuItemId: found.menuItemId || id,
      name: found.foodName || found.name || 'Delicious Item',
      foodName: found.foodName || found.name || 'Delicious Item',
      description: found.description || '',
      price: Number(found.price || 0),
      category: found.category || found.foodCategory || 'General',
      foodCategory: found.category || found.foodCategory || 'General',
      image: found.foodImage || found.image || '',
      foodImage: found.foodImage || found.image || '',
      isVeg: isVeg,
      type: isVeg ? 'veg' : 'non-veg',
      isAvailable: isAvailable,
      status: isAvailable ? 'active' : 'disabled',
      rating: found.rating || 4.8,
      prepTime: found.preparationTime || '15-20 mins',
      restaurantId: found.restaurantId || 'kona-res',
      restaurantName: restaurantName,
      shopName: restaurantName,
      variants: variants
    };

    res.json({ success: true, dish: mappedDish });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch dish details' });
  }
});



// Public Endpoint: Fetch All Unique Categories dynamically from DynamoDB
app.get('/api/public/categories', async (req: Request, res: Response) => {
  try {
    const categoryMap: Record<string, { id: string; name: string; description: string; itemCount: number; restaurants: Set<string>; image: string; badge?: string; keywords?: string[] }> = {};

    // 0. Include dynamic homepage & platform categories configured by admin
    try {
      const dynamicCats = await getHomepageCategories(false);
      dynamicCats.filter(c => c.isActive !== false).forEach(c => {
        const catName = (c.name || '').trim();
        if (!catName) return;
        categoryMap[catName] = {
          id: c.id || `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`,
          name: catName,
          description: c.description || `Signature selection of ${catName} items from top stores.`,
          itemCount: 0,
          restaurants: new Set<string>(),
          image: c.image || '',
          badge: c.badge,
          keywords: c.keywords
        };
      });
    } catch (e) {}

    // 1. Read categories saved in foodway-categories table
    try {
      const allDbCats = await categoryService.getAllCategories();
      allDbCats.forEach((c: any) => {
        const catName = (c.name || '').trim();
        if (!catName || catName === 'Uncategorized') return;
        if (!categoryMap[catName]) {
          categoryMap[catName] = {
            id: `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`,
            name: catName,
            description: c.description || `Signature selection of ${catName} items from top kitchens.`,
            itemCount: 0,
            restaurants: new Set(c.restaurantId ? [c.restaurantId] : []),
            image: c.image || ''
          };
        } else if (c.restaurantId) {
          categoryMap[catName].restaurants.add(c.restaurantId);
        }
      });
    } catch (e) { }

    // 2. Scan food items table for categories on food items
    try {
      const scanCommand = new ScanCommand({ TableName: menuItemsTableName });
      const response = await dynamoDocClient.send(scanCommand);
      const items = response.Items || [];

      items.forEach((item: any) => {
        const catName = (item.category || 'Main Course').trim();
        if (!catName || catName === 'Uncategorized') return;

        if (!categoryMap[catName]) {
          categoryMap[catName] = {
            id: `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`,
            name: catName,
            description: `Signature selection of ${catName} items from top kitchens.`,
            itemCount: 1,
            restaurants: new Set(item.restaurantId ? [item.restaurantId] : []),
            image: item.foodImage || item.image || ''
          };
        } else {
          categoryMap[catName].itemCount += 1;
          if (item.restaurantId) {
            categoryMap[catName].restaurants.add(item.restaurantId);
          }
          if (!categoryMap[catName].image && (item.foodImage || item.image)) {
            categoryMap[catName].image = item.foodImage || item.image;
          }
        }
      });
    } catch (e) { }

    // 3. Scan shop profiles for categories
    try {
      const allShops = await restaurantService.getAllRestaurants();
      allShops.forEach((shop: any) => {
        if (Array.isArray(shop.categories)) {
          shop.categories.forEach((catName: string) => {
            const trimmed = (catName || '').trim();
            if (!trimmed || trimmed === 'Uncategorized') return;
            if (!categoryMap[trimmed]) {
              categoryMap[trimmed] = {
                id: `cat_${trimmed.toLowerCase().replace(/\s+/g, '_')}`,
                name: trimmed,
                description: `Signature selection of ${trimmed} items from top kitchens.`,
                itemCount: 0,
                restaurants: new Set(shop.id || shop.restaurantId || shop.shopId ? [shop.id || shop.restaurantId || shop.shopId] : []),
                image: ''
              };
            } else if (shop.id || shop.restaurantId || shop.shopId) {
              categoryMap[trimmed].restaurants.add(shop.id || shop.restaurantId || shop.shopId);
            }
          });
        }
      });
    } catch (e) { }

    const categories = Object.values(categoryMap).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      itemCount: c.itemCount,
      restaurantCount: c.restaurants.size || 1,
      image: c.image,
      badge: c.badge,
      keywords: c.keywords
    }));

    res.json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public categories.' });
  }
});

// Fetch all orders for Admin (Enriched with full items breakdown, restaurant name, and customer details)
// Fetch all orders for Admin (Enriched with full items breakdown, multi-vendor aggregation, restaurant name, and customer details)
app.get('/api/admin/orders', async (req: Request, res: Response) => {
  try {
    let allOrders: any[] = [];
    if (ordersTableName) {
      const command = new ScanCommand({ TableName: ordersTableName });
      const resp = await dynamoDocClient.send(command);
      allOrders = resp.Items || [];
    } else {
      allOrders = await orderService.getOrdersByRestaurant('all');
    }

    let allRestaurants: any[] = [];
    try {
      allRestaurants = await restaurantService.getAllRestaurants();
    } catch (e) { }

    const resMap: Record<string, any> = {};
    allRestaurants.forEach((r: any) => {
      resMap[r.id || r.restaurantId] = r;
    });

    const enriched = await Promise.all(allOrders.map(async (o: any) => {
      let itemsList = o.items || o.rawItems || [];
      if (!Array.isArray(itemsList) || itemsList.length === 0) {
        try {
          const dbItems = await orderItemRepository.findByOrderId(o.orderId);
          if (dbItems && dbItems.length > 0) {
            itemsList = dbItems.map((di: any) => ({
              id: di.menuItemId || di.orderItemId,
              foodName: di.foodName || 'Food Item',
              name: di.foodName || 'Food Item',
              quantity: Number(di.quantity || 1),
              price: Number(di.price || 0),
              image: di.foodImage || ''
            }));
          }
        } catch (e) { }
      }

      // Resolve human-readable restaurant name
      let resName = o.restaurantName;
      if (!resName || resName === 'RES_DEFAULT' || resName === 'Partner Restaurant') {
        const found = allRestaurants.find((r: any) => r.id === o.restaurantId || r.restaurantId === o.restaurantId);
        if (found && found.name) {
          resName = found.name;
        } else if (allRestaurants.length > 0 && allRestaurants[0]?.name) {
          resName = allRestaurants[0].name;
        } else {
          resName = 'Likhith foods';
        }
      }

      const restObj = resMap[o.restaurantId] || {};

      return {
        ...o,
        id: o.orderId,
        orderId: o.orderId,
        parentOrderId: o.parentOrderId || o.orderId,
        restaurant: resName,
        restaurantName: resName,
        restaurantId: o.restaurantId,
        restaurantAddress: restObj.address || o.restaurantAddress || '',
        restaurantPhone: restObj.phone || o.restaurantPhone || '',
        customerName: o.customerName || 'Valued Customer',
        customerPhone: o.customerPhone || '',
        customerAddress: o.deliveryAddress || '',
        customer: {
          name: o.customerName || 'Valued Customer',
          phone: o.customerPhone || '',
          address: o.deliveryAddress || ''
        },
        items: itemsList,
        total: Number(o.totalAmount || 0),
        orderStatus: o.status || 'pending',
        createdTime: o.orderedAt || o.createdAt || new Date().toISOString()
      };
    }));

    // Group sub-orders by parentOrderId into single consolidated Multi-Vendor Order cards
    const parentGroupMap: Record<string, any> = {};

    for (const o of enriched) {
      const parentId = o.parentOrderId || o.orderId;
      if (!parentGroupMap[parentId]) {
        parentGroupMap[parentId] = {
          ...o,
          id: parentId,
          orderId: parentId,
          parentOrderId: parentId,
          subOrders: [o],
          items: [...(o.items || [])],
          vendorStatuses: [{
            subOrderId: o.orderId,
            restaurantId: o.restaurantId,
            restaurantName: o.restaurantName,
            restaurantAddress: o.restaurantAddress,
            restaurantPhone: o.restaurantPhone,
            status: o.orderStatus || o.status || 'Pending',
            items: o.items || [],
            totalAmount: o.total || o.totalAmount || 0
          }],
          totalAmount: Number(o.total || o.totalAmount || 0),
          total: Number(o.total || o.totalAmount || 0)
        };
      } else {
        const group = parentGroupMap[parentId];
        group.subOrders.push(o);
        group.items = [...group.items, ...(o.items || [])];
        group.vendorStatuses.push({
          subOrderId: o.orderId,
          restaurantId: o.restaurantId,
          restaurantName: o.restaurantName,
          restaurantAddress: o.restaurantAddress,
          restaurantPhone: o.restaurantPhone,
          status: o.orderStatus || o.status || 'Pending',
          items: o.items || [],
          totalAmount: o.total || o.totalAmount || 0
        });
        group.totalAmount += Number(o.total || o.totalAmount || 0);
        group.total += Number(o.total || o.totalAmount || 0);
      }
    }

    const consolidatedAdminOrders = Object.values(parentGroupMap).map((group: any) => {
      const isMultiVendor = group.vendorStatuses.length > 1;
      const vendorNames = Array.from(new Set(group.vendorStatuses.map((vs: any) => vs.restaurantName))).join(' • ');
      
      const statuses = group.vendorStatuses.map((vs: any) => String(vs.status || '').toLowerCase());
      const cancelledCount = statuses.filter((s: string) => s.includes('cancel') || s.includes('reject')).length;
      const readyCount = statuses.filter((s: string) => s.includes('ready') || s.includes('packed')).length;
      const activeCount = group.vendorStatuses.length - cancelledCount;

      let aggregatedStatus = group.orderStatus || 'Pending';
      if (cancelledCount === group.vendorStatuses.length) {
        aggregatedStatus = 'Cancelled';
      } else if (activeCount > 0 && readyCount >= activeCount) {
        aggregatedStatus = 'Ready for Pickup';
      } else if (statuses.some((s: string) => s.includes('prepar') || s.includes('accept'))) {
        aggregatedStatus = 'Preparing';
      }

      let cancellationNotice = null;
      if (cancelledCount > 0 && cancelledCount < group.vendorStatuses.length) {
        const cancelledStores = group.vendorStatuses.filter((vs: any) => String(vs.status || '').toLowerCase().includes('cancel') || String(vs.status || '').toLowerCase().includes('reject')).map((vs: any) => vs.restaurantName).join(', ');
        cancellationNotice = `Items from ${cancelledStores} were cancelled by the store.`;
      }

      return {
        ...group,
        isMultiVendor,
        restaurantName: isMultiVendor ? `${vendorNames} (Multi-Vendor)` : group.restaurantName,
        restaurant: isMultiVendor ? `${vendorNames} (Multi-Vendor)` : group.restaurant,
        orderStatus: aggregatedStatus,
        status: aggregatedStatus,
        cancellationNotice
      };
    });

    res.json({ success: true, orders: consolidatedAdminOrders });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders.', details: error.message });
  }
});

// Create New Customer Order (Persists directly to DynamoDB foodway-orders & foodway-order-items tables)
// Supports multi-vendor order splitting: items from different vendors are logically split into sub-orders per vendor.
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      deliveryAddress,
      paymentMethod,
      items,
      totalAmount,
      subtotal,
      deliveryFee,
      taxes,
      restaurantId: bodyResId,
      restaurantName: bodyResName,
      distanceKm,
      latitude,
      longitude
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must contain at least one item.' });
    }

    // Strict 20km Maximum Delivery Radius Check
    const MAX_DELIVERY_RADIUS_KM = 20.0;
    if (distanceKm && Number(distanceKm) > MAX_DELIVERY_RADIUS_KM) {
      return res.status(400).json({
        success: false,
        error: `Delivery distance (${Number(distanceKm).toFixed(1)} km) exceeds the maximum allowed radius of ${MAX_DELIVERY_RADIUS_KM} km. Orders cannot be booked outside the 20 km delivery zone.`
      });
    }

    // Group items by vendor / restaurantId
    const vendorItemsMap: Record<string, { restaurantName: string; items: any[] }> = {};

    items.forEach((item: any) => {
      const vId = item.restaurantId || bodyResId || 'RES_DEFAULT';
      const vName = item.restaurantName || bodyResName || 'Partner Restaurant';
      if (!vendorItemsMap[vId]) {
        vendorItemsMap[vId] = { restaurantName: vName, items: [] };
      }
      vendorItemsMap[vId].items.push(item);
    });

    const vendorIds = Object.keys(vendorItemsMap);

    if (vendorIds.length > 1) {
      return res.status(400).json({
        success: false,
        error: 'Multi-vendor orders are not supported in a single order. Please place separate orders for items from different restaurants.'
      });
    }

    // Validate store status, item availability, and distance before order creation
    for (let index = 0; index < vendorIds.length; index++) {
      const vId = vendorIds[index];
      const { restaurantName: vName, items: vItems } = vendorItemsMap[vId];

      const shop = await shopService.getShopById(vId);
      if (shop) {
        const statusStr = String(shop.status || '').toLowerCase();
        const isClosed = shop.isOpen === false || (shop as any).isOpen === 'false' || statusStr === 'closed' || statusStr === 'inactive' || statusStr === 'offline';
        if (isClosed) {
          const shopName = (shop as any).shopName || (shop as any).restaurantName || (shop as any).name || vName;
          return res.status(400).json({
            success: false,
            error: `Store "${shopName}" is currently closed and not accepting online orders right now.`
          });
        }

        // Validate Geodesic distance if store and customer coordinates exist
        const shopLat = Number(shop.latitude || (shop as any).lat);
        const shopLng = Number(shop.longitude || (shop as any).lng || (shop as any).lon);
        const custLat = Number(latitude);
        const custLng = Number(longitude);

        if (!isNaN(shopLat) && !isNaN(shopLng) && !isNaN(custLat) && !isNaN(custLng) && shopLat !== 0 && custLat !== 0) {
          const R = 6371; // Earth radius in KM
          const dLat = (custLat - shopLat) * (Math.PI / 180);
          const dLon = (custLng - shopLng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(shopLat * (Math.PI / 180)) * Math.cos(custLat * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const directKm = R * c;
          if (directKm > MAX_DELIVERY_RADIUS_KM) {
            return res.status(400).json({
              success: false,
              error: `Delivery distance (${directKm.toFixed(1)} km) exceeds the maximum allowed radius of ${MAX_DELIVERY_RADIUS_KM} km. Order cannot be booked.`
            });
          }
        }
      }

      for (const item of vItems) {
        if (item.isAvailable === false || item.isAvailable === 'false') {
          return res.status(400).json({
            success: false,
            error: `Item "${item.name || item.foodName}" is currently unavailable from store.`
          });
        }
        const itemId = item.id || item.menuItemId || item.itemId;
        if (itemId) {
          const dbItem = await menuService.getItemById(itemId);
          if (dbItem && (dbItem.isAvailable === false || (dbItem as any).isAvailable === 'false')) {
            return res.status(400).json({
              success: false,
              error: `Item "${item.name || item.foodName || dbItem.name}" is currently unavailable from store.`
            });
          }
        }
      }
    }

    const parentOrderId = `ORD-${Date.now()}`;
    const createdSubOrders: any[] = [];
    const isMultiVendor = vendorIds.length > 1;

    // Create sub-order for each vendor
    for (let index = 0; index < vendorIds.length; index++) {
      const vId = vendorIds[index];
      const { restaurantName: vName, items: vItems } = vendorItemsMap[vId];

      // Calculate vendor-specific subtotal and portion of delivery/taxes
      const vSubtotal = vItems.reduce((acc: number, i: any) => acc + Number(i.price || 0) * Number(i.quantity || 1), 0);
      const vRatio = subtotal > 0 ? vSubtotal / Number(subtotal) : 1 / vendorIds.length;
      const vDelivery = Number((Number(deliveryFee || 0) * vRatio).toFixed(2));
      const vTax = Number((Number(taxes || 0) * vRatio).toFixed(2));
      const vTotal = Number((vSubtotal + vDelivery + vTax).toFixed(2));

      const subOrderId = isMultiVendor ? `${parentOrderId}-${index + 1}` : parentOrderId;

      const orderData = {
        orderId: subOrderId,
        parentOrderId,
        isMultiVendor,
        customerId: customerId || `CUST_${Date.now()}`,
        restaurantId: vId,
        restaurantName: vName,
        customerName: customerName || 'Valued Customer',
        customerPhone: customerPhone || '',
        deliveryAddress: deliveryAddress || '',
        paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
        items: vItems.map((i: any) => ({
          menuItemId: i.id || i.menuItemId || `item_${Date.now()}`,
          foodName: i.name || i.foodName || 'Food Item',
          quantity: Number(i.quantity || 1),
          price: Number(i.price || 0),
          image: i.image || '',
          restaurantId: vId,
          restaurantName: vName
        })),
        subtotal: vSubtotal,
        deliveryCharge: vDelivery,
        tax: vTax,
        totalAmount: vTotal,
        rawItems: vItems
      };

      const created = await orderService.createOrder(orderData as any);

      const newOrderObj = {
        ...created.order,
        orderId: created.order.orderId,
        id: created.order.orderId,
        parentOrderId,
        isMultiVendor,
        restaurantId: vId,
        restaurantName: vName,
        customerName: customerName || 'Valued Customer',
        customerPhone: customerPhone || '',
        deliveryAddress: deliveryAddress || '',
        totalAmount: vTotal,
        total: vTotal,
        status: 'Pending',
        orderStatus: 'Pending',
        items: vItems,
        orderedAt: new Date().toISOString(),
        time: 'Just Now'
      };

      (created.order as any).items = vItems;

      // ⚡ Real-Time Socket Emission & FCM Push Notification to Merchant
      try {
        if (socketService) {
          await socketService.emitOrderCreated(newOrderObj);
          console.log(`📡 [Real-Time Order Alert] Emitted order_created for Order #${created.order.orderId} to vendor ${vId}`);
        }
        void notificationService.notifyMerchantNewOrder({
          orderId: newOrderObj.orderId || newOrderObj.id || vId,
          restaurantId: vId,
          customerName: req.body?.customerName || customerName || 'Customer',
          totalAmount: newOrderObj.totalAmount || newOrderObj.total || 0,
          itemsCount: (vItems || []).length
        });
      } catch (e: any) {
        console.warn('⚠️ Socket/FCM emission error on order creation:', e?.message);
      }

      createdSubOrders.push(newOrderObj);
    }

    res.status(201).json({
      success: true,
      message: 'Order created and logically split per vendor successfully.',
      parentOrderId,
      orderId: createdSubOrders[0]?.orderId || parentOrderId,
      orders: createdSubOrders
    });
  } catch (error: any) {
    console.error('Error creating order in DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save order to database.',
      details: error.message
    });
  }
});

// Update Order Status (PATCH & PUT /api/orders/:orderId/status & /api/restaurant/orders/:orderId/status)
const handleOrderStatusUpdate = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, cancelledBy } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status field is required.' });
    }

    const upperStatus = String(status).toUpperCase() as any;

    // 🔒 Cancellation Policy Enforcement: Customer can only cancel UNTIL vendor accepts the order
    if (upperStatus === 'CANCELLED' && (cancelledBy === 'CUSTOMER' || (req as any).user?.role === 'USER')) {
      const existingOrder = await orderRepository.findByOrderId(orderId);
      if (existingOrder) {
        const currentSt = String(existingOrder.status || (existingOrder as any).orderStatus || '').toUpperCase();
        const nonCancellableStatuses = [
          'ACCEPTED',
          'CONFIRMED',
          'PREPARING',
          'FOOD_READY',
          'READY',
          'READY_FOR_PICKUP',
          'ASSIGNED',
          'OUT_FOR_DELIVERY',
          'PICKED_UP',
          'DELIVERED',
          'COMPLETED'
        ];
        if (nonCancellableStatuses.includes(currentSt)) {
          return res.status(400).json({
            success: false,
            error: 'Order cannot be cancelled after the store has accepted it.'
          });
        }
      }
    }

    const updated = await orderService.updateOrderStatus(orderId, upperStatus, cancelledBy);

    if (!updated) {
      return res.status(404).json({ success: false, error: `Order [${orderId}] not found.` });
    }

    // Handle Multi-Vendor Aggregation & Cancellation Logic
    const parentId = (updated as any).parentOrderId || updated.orderId;
    let siblingSubOrders: any[] = [];
    if (ordersTableName) {
      try {
        const scanRes = await dynamoDocClient.send(new ScanCommand({
          TableName: ordersTableName,
          FilterExpression: 'parentOrderId = :pid OR orderId = :pid',
          ExpressionAttributeValues: { ':pid': parentId }
        }));
        siblingSubOrders = scanRes.Items || [updated];
      } catch (e) {
        siblingSubOrders = [updated];
      }
    } else {
      siblingSubOrders = [updated];
    }

    const isMultiVendor = siblingSubOrders.length > 1;
    const isCancellation = upperStatus === 'CANCELLED' || upperStatus === 'REJECTED' || upperStatus === 'CANCELLED_BY_STORE';

    const cancelledSiblings = siblingSubOrders.filter((o: any) => {
      const st = String(o.status || o.orderStatus || '').toUpperCase();
      return st === 'CANCELLED' || st === 'REJECTED' || st === 'CANCELLED_BY_STORE';
    });

    const activeSiblings = siblingSubOrders.filter((o: any) => {
      const st = String(o.status || o.orderStatus || '').toUpperCase();
      return st !== 'CANCELLED' && st !== 'REJECTED' && st !== 'CANCELLED_BY_STORE';
    });

    // ⚡ Real-Time Socket Emissions
    try {
      if (socketService) {
        if (isCancellation && isMultiVendor) {
          if (cancelledSiblings.length === siblingSubOrders.length) {
            // ALL vendors cancelled -> Entire order cancelled
            console.log(`🚨 [Multi-Vendor All Cancelled] Order #${parentId} completely cancelled`);
            socketService.emitOrderStatusUpdated({
              ...updated,
              orderId: parentId,
              status: 'CANCELLED',
              cancellationNotice: 'All participating stores cancelled the order.'
            });
          } else {
            // PARTIAL vendor cancellation -> Notify customer & update multi-vendor state
            const cancelledVendorName = updated.shopName || updated.restaurantName || 'Vendor Store';
            console.log(`⚠️ [Multi-Vendor Partial Cancel] Store ${cancelledVendorName} cancelled items for Order #${parentId}`);
            socketService.emitVendorItemsCancelled({
              parentOrderId: parentId,
              customerId: updated.customerId,
              cancelledVendorId: updated.shopId || updated.restaurantId,
              cancelledVendorName,
              cancelledItems: updated.items || [],
              remainingActiveStoresCount: activeSiblings.length
            });
            socketService.emitOrderStatusUpdated({
              ...updated,
              parentOrderId: parentId,
              cancellationNotice: `Items from ${cancelledVendorName} were cancelled by the store.`
            });
          }
        } else {
          await socketService.emitOrderStatusUpdated(updated);
          if (['ASSIGNED', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(upperStatus)) {
            await socketService.emitRiderStatusUpdated(updated);
          }
        }

        // 🔔 FCM Push Notification to Customer for Status Update
        void notificationService.notifyCustomerOrderStatus({
          orderId: parentId,
          customerId: updated.customerId,
          customerEmail: updated.customerEmail,
          restaurantName: updated.restaurantName || updated.shopName,
          status: (upperStatus as any) || 'UPDATED'
        });

        const st = String(updated.status || status).toLowerCase();

        // Check if all active vendors are READY
        const allActiveReady = activeSiblings.length > 0 && activeSiblings.every((o: any) => {
          const s = String(o.status || o.orderStatus || '').toLowerCase();
          return s === 'ready' || s === 'packed' || s === 'ready_for_pickup' || s === 'ready for pickup';
        });

        if (allActiveReady || st === 'ready' || st === 'ready_for_pickup' || st === 'ready for pickup' || st === 'assigned') {
          console.log(`📡 [Real-Time Socket & FCM Push] Emitting order_ready_pickup for Multi-Vendor Order #${parentId}`);
          await socketService.emitOrderReadyForPickup({
            ...updated,
            orderId: parentId,
            status: 'READY'
          });
          await socketService.emitOrderAssigned({ ...updated, orderId: parentId });

          void notificationService.notifyDeliveryPartnersPickupAvailable({
            orderId: parentId,
            restaurantId: String(updated.shopId || updated.restaurantId || ''),
            restaurantName: String(updated.shopName || updated.restaurantName || 'Restaurant')
          });
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Socket emission warning on order status update:', e?.message);
    }

    return res.json({
      success: true,
      message: `Order status updated to ${upperStatus}.`,
      order: updated
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update order status.', details: error.message });
  }
};

app.patch('/api/orders/:orderId/status', handleOrderStatusUpdate);
app.put('/api/orders/:orderId/status', handleOrderStatusUpdate);
app.patch('/api/restaurant/orders/:orderId/status', handleOrderStatusUpdate);
app.put('/api/restaurant/orders/:orderId/status', handleOrderStatusUpdate);
app.patch('/api/delivery-partner/orders/:orderId/status', handleOrderStatusUpdate);
app.put('/api/delivery-partner/orders/:orderId/status', handleOrderStatusUpdate);

// Fetch Orders for a specific Customer (Consolidates multi-vendor sub-orders under a single Parent Order for Customer view)
app.get('/api/customer/orders/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const orders = await orderService.getOrdersByCustomer(customerId);

    // Fetch all restaurants to resolve human-readable names
    let allRestaurants: any[] = [];
    try {
      allRestaurants = await restaurantService.getAllRestaurants();
    } catch (e) { }

    const resMap: Record<string, string> = {};
    allRestaurants.forEach((r: any) => {
      resMap[r.id || r.restaurantId] = r.name || r.restaurantName;
    });

    const parentGroupMap: Record<string, any> = {};

    for (const o of orders) {
      const parentId = o.parentOrderId || o.orderId;

      let itemsList = o.items || o.rawItems || [];
      if (!Array.isArray(itemsList) || itemsList.length === 0) {
        try {
          const dbItems = await orderItemRepository.findByOrderId(o.orderId);
          if (dbItems && dbItems.length > 0) {
            itemsList = dbItems.map((di: any) => ({
              id: di.menuItemId || di.orderItemId,
              foodName: di.foodName || 'Food Item',
              name: di.foodName || 'Food Item',
              quantity: Number(di.quantity || 1),
              price: Number(di.price || 0),
              image: di.foodImage || '',
              restaurantId: di.restaurantId || o.restaurantId,
              restaurantName: di.restaurantName || o.restaurantName || (di.restaurantId ? resMap[di.restaurantId] : '') || (o.restaurantId ? resMap[o.restaurantId] : '')
            }));
          }
        } catch (e) { }
      }

      // Ensure each item has its specific shop/restaurant name
      const enrichedItems = itemsList.map((i: any) => ({
        ...i,
        restaurantId: i.restaurantId || o.restaurantId,
        restaurantName: i.restaurantName || o.restaurantName || (i.restaurantId ? resMap[i.restaurantId] : '') || (o.restaurantId ? resMap[o.restaurantId] : '') || 'Gourmet Kitchen'
      }));

      if (!parentGroupMap[parentId]) {
        const resName = o.restaurantName || (o.restaurantId ? resMap[o.restaurantId] : '') || 'Multi-Vendor Order';
        parentGroupMap[parentId] = {
          ...o,
          orderId: parentId,
          id: parentId,
          restaurantName: resName,
          items: [...enrichedItems],
          subtotal: Number(o.subtotal || 0),
          deliveryCharge: Number(o.deliveryCharge || 0),
          tax: Number(o.tax || 0),
          totalAmount: Number(o.totalAmount || 0),
          vendorNames: new Set([resName])
        };
      } else {
        const existing = parentGroupMap[parentId];
        const resName = o.restaurantName || (o.restaurantId ? resMap[o.restaurantId] : '') || 'Vendor';
        existing.items = [...existing.items, ...enrichedItems];
        existing.subtotal += Number(o.subtotal || 0);
        existing.deliveryCharge += Number(o.deliveryCharge || 0);
        existing.tax += Number(o.tax || 0);
        existing.totalAmount += Number(o.totalAmount || 0);
        existing.vendorNames.add(resName);
      }
    }

    const consolidatedOrders = Object.values(parentGroupMap).map((o: any) => {
      const vendorsList = Array.from(o.vendorNames).filter(Boolean);
      return {
        ...o,
        restaurantName: vendorsList.length > 1 ? vendorsList.join(' • ') : (vendorsList[0] || 'Multi-Vendor Order')
      };
    });

    res.json({ success: true, orders: consolidatedOrders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch customer orders.', details: error.message });
  }
});

// Fetch items from DynamoDB table
app.get('/api/admin/db-items', async (req: Request, res: Response) => {
  try {
    if (!tableName) {
      return res.status(400).json({ error: 'DynamoDB table name is not configured.' });
    }

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await dynamoDocClient.send(command);
    res.json(response.Items || []);
  } catch (error: any) {
    console.error('Error scanning DynamoDB table:', error);
    res.status(500).json({
      error: 'Failed to fetch items from DynamoDB.',
      details: error.message
    });
  }
});

// Seed default menu items to DynamoDB
app.post('/api/admin/seed-db', async (req: Request, res: Response) => {
  try {
    if (!tableName) {
      return res.status(400).json({ error: 'DynamoDB table name is not configured.' });
    }

    const dishes = [
      {
        id: 'dish_1',
        email: 'dish_1', // Support tables with partition key "email"
        name: 'Caviar Wagyu Burger',
        description: 'A 250g A5 Wagyu patty topped with Osetra caviar and gold-leaf details.',
        price: 150,
        category: 'burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
        rating: 4.9,
        premium: true
      },
      {
        id: 'dish_2',
        email: 'dish_2', // Support tables with partition key "email"
        name: 'Truffle Lobster Pasta',
        description: 'Fresh tagliatelle, butter-poached Maine lobster, and shaved winter black truffle.',
        price: 120,
        category: 'pasta',
        image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800',
        rating: 4.8,
        premium: true
      },
      {
        id: 'dish_3',
        email: 'dish_3', // Support tables with partition key "email"
        name: '24K Gold Saffron Risotto',
        description: 'Creamy carnaroli risotto with saffron threads, topped with 24-karat edible gold foil.',
        price: 95,
        category: 'risotto',
        image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=800',
        rating: 4.9,
        premium: true
      }
    ];

    const putPromises = dishes.map(dish => {
      const command = new PutCommand({
        TableName: tableName,
        Item: dish
      });
      return dynamoDocClient.send(command);
    });

    await Promise.all(putPromises);

    res.json({
      success: true,
      message: 'Successfully seeded 3 gourmet dishes into DynamoDB.',
      seededItems: dishes
    });
  } catch (error: any) {
    console.error('Error seeding database:', error);
    res.status(500).json({
      error: 'Failed to seed items to DynamoDB.',
      details: error.message
    });
  }
});

// S3 File Upload Endpoint (Handles base64 payloads)
app.post('/api/admin/upload-s3', async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileData } = req.body;

    if (!bucketName) {
      return res.status(400).json({ error: 'AWS S3 bucket name is not configured.' });
    }

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: 'Missing required file payload parameters.' });
    }

    // Clean base64 string
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const uniqueFileName = `uploads/${Date.now()}_${fileName}`;
    const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: fileType,
    });

    await s3Client.send(command);

    // Construct S3 URL
    const fileUrl = `https://${bucketName}.s3.${s3Region}.amazonaws.com/${uniqueFileName}`;

    res.json({
      success: true,
      message: 'File uploaded successfully to S3.',
      fileUrl
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to upload file to S3.',
      details: error.message
    });
  }
});

// Alias for S3 Image Upload (/api/upload/image)
app.post('/api/upload/image', async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileData, image } = req.body;

    if (!bucketName) {
      return res.status(400).json({ error: 'AWS S3 bucket name is not configured.' });
    }

    const payloadData = fileData || image;
    if (!payloadData) {
      return res.status(400).json({ error: 'Missing file payload.' });
    }

    const name = fileName || `image_${Date.now()}.jpg`;
    const type = fileType || 'image/jpeg';

    const base64Data = payloadData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const uniqueFileName = `uploads/${Date.now()}_${name}`;
    const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: type,
    });

    await s3Client.send(command);

    const fileUrl = `https://${bucketName}.s3.${s3Region}.amazonaws.com/${uniqueFileName}`;

    res.json({
      success: true,
      message: 'File uploaded successfully to S3.',
      fileUrl
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to upload file to S3.',
      details: error.message
    });
  }
});

// Save or Update Restaurant record in DynamoDB table "foodway-restaurants"
app.post('/api/admin/restaurant', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const name = data.name || data.restaurantName;
    const email = data.email;

    if (!data || !name || !email) {
      return res.status(400).json({ success: false, error: 'Missing required restaurant parameters.' });
    }

    const isNew = !data.id && !data.restaurantId && !data.shopId;
    if (isNew && (!data.password || !data.password.trim())) {
      return res.status(400).json({ success: false, error: 'Password is required to create a new vendor account.' });
    }

    const result = await restaurantService.registerRestaurant({
      restaurantName: name,
      ownerName: data.ownerName || name,
      email: email,
      password: data.password && data.password.trim() ? data.password.trim() : undefined,
      phone: data.phone || '',
      address: data.address || '',
      cuisine: data.category || data.cuisine || 'Multi-Cuisine',
      openingTime: data.openingTime || '11:00 AM',
      closingTime: data.closingTime || '11:00 PM',
      logo: data.image || data.logo || '',
      bannerImage: data.image || data.bannerImage || ''
    });

    const saved = result.shop || (result as any).restaurant;

    if (socketService) {
      socketService.emitShopCreated(saved);
    }

    return res.json({
      success: true,
      message: 'Restaurant saved to foodway-restaurants table in DynamoDB successfully.',
      storedInDynamoDB: true,
      restaurant: {
        ...data,
        id: saved.restaurantId,
        restaurantId: saved.restaurantId,
        ownerUserId: result.ownerUser.userId,
        name: saved.restaurantName,
        email: saved.email,
        phone: saved.phone,
        address: saved.address,
        category: saved.cuisine,
        image: saved.logo || data.image
      }
    });
  } catch (error: any) {
    console.error('Error saving restaurant to DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save restaurant to foodway-restaurants table in DynamoDB.',
      details: error.message
    });
  }
});

// Fetch background video URLs
app.get('/api/hero/videos', async (req: Request, res: Response) => {
  try {
    const fallbackUrls = {
      darkest: '/darkest.mp4',
      dark_mobile: '/dark_mobile.mp4',
      lightest: '/lightest.mp4',
      light_mobile: '/light_mobile.mp4'
    };

    if (!tableName) {
      return res.json({
        success: false,
        message: 'DynamoDB table not configured. Using local fallbacks.',
        urls: fallbackUrls
      });
    }

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await dynamoDocClient.send(command);
    const configItem = response.Items?.find((item: any) => item.id === 'hero_videos' || item.email === 'hero_videos');

    if (!configItem) {
      return res.json({
        success: false,
        message: 'Background video configuration not found in DynamoDB. Using local fallbacks.',
        urls: fallbackUrls
      });
    }

    res.json({
      success: true,
      urls: {
        darkest: configItem.darkest || fallbackUrls.darkest,
        dark_mobile: configItem.dark_mobile || fallbackUrls.dark_mobile,
        lightest: configItem.lightest || fallbackUrls.lightest,
        light_mobile: configItem.light_mobile || fallbackUrls.light_mobile,
      }
    });
  } catch (error: any) {
    console.error('Error fetching background videos from DynamoDB:', error);
    res.json({
      success: false,
      message: 'Failed to fetch background videos from DynamoDB. Using local fallbacks.',
      details: error.message,
      urls: {
        darkest: '/darkest.mp4',
        dark_mobile: '/dark_mobile.mp4',
        lightest: '/lightest.mp4',
        light_mobile: '/light_mobile.mp4'
      }
    });
  }
});

// Setup background videos by uploading local client public videos to S3 and seeding DynamoDB
app.post('/api/admin/setup-hero-videos', async (req: Request, res: Response) => {
  try {
    const urls = await uploadAndSeedVideos();
    res.json({
      success: true,
      message: 'Background videos uploaded to S3 and stored in DynamoDB successfully.',
      urls
    });
  } catch (error: any) {
    console.error('Error setting up background videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload and setup background videos.',
      details: error.message
    });
  }
});

// User Registration API
app.post('/api/user/register', async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  const isAwsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  if (!isAwsConfigured || !usersTableName) {
    return res.status(500).json({ success: false, error: 'DynamoDB is not configured.' });
  }

  try {
    // Check in DynamoDB
    const getCommand = new GetCommand({
      TableName: usersTableName,
      Key: { email }
    });
    const response = await dynamoDocClient.send(getCommand);
    const userExists = !!response.Item;

    if (userExists) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    const newUser = {
      id: `user_${Date.now()}`,
      email,
      name,
      phone: phone || '',
      password, // Stored as plain text for compatibility
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Write to DynamoDB
    const putCommand = new PutCommand({
      TableName: usersTableName,
      Item: newUser
    });
    await dynamoDocClient.send(putCommand);

    res.json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.', details: error.message });
  }
});

// User Login API
app.post('/api/user/login', async (req: Request, res: Response) => {
  const { email, phone, identifier, password } = req.body;
  const loginId = (identifier || email || phone || '').trim();
  if (!loginId || !password) {
    return res.status(400).json({ success: false, error: 'Email or Mobile number and password are required.' });
  }

  try {
    const user = await userRepository.findByIdentifier(loginId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email/mobile number or password.' });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid && user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email/mobile number or password.' });
    }

    res.json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: user.userId || (user as any).id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role || 'user'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// User Forgot Password API
app.post('/api/user/forgot-password', forgotPassword);
app.post('/api/user/reset-password', resetPassword);


// -----------------
// Restaurant Portal API Routes
// -----------------

// Clean Architecture Restaurant Module Routes
app.use('/api/restaurant', restaurantRouter);

// Restaurant Login API
app.post('/api/restaurant/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let matchedRestaurant: any = null;

    if (tableName) {
      try {
        const scanCommand = new ScanCommand({ TableName: tableName });
        const scanResponse = await dynamoDocClient.send(scanCommand);
        if (scanResponse.Items) {
          for (const item of scanResponse.Items) {
            if ((item.type === 'restaurant' || item.pk?.startsWith('RESTAURANT#') || item.email) && item.email?.toLowerCase() === cleanEmail) {
              const storedPass = item.password || item.pass || item.vendorPassword;
              let isMatch = false;
              if (storedPass) {
                try {
                  isMatch = await comparePassword(password, storedPass);
                } catch (e) { }
                if (!isMatch && storedPass === password) {
                  isMatch = true;
                }
              }
              if (isMatch) {
                matchedRestaurant = item;
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn('DynamoDB scan failed during restaurant login:', err);
      }
    }

    if (!matchedRestaurant) {
      // Fallback check against restaurantRepository
      const restRepoMatch = await shopRepository.findByEmail(cleanEmail);
      if (restRepoMatch) {
        const storedPass = (restRepoMatch as any).password || (restRepoMatch as any).pass;
        let isMatch = false;
        if (storedPass) {
          try {
            isMatch = await comparePassword(password, storedPass);
          } catch (e) { }
          if (!isMatch && storedPass === password) {
            isMatch = true;
          }
        }
        if (isMatch) {
          matchedRestaurant = restRepoMatch;
        }
      }
    }

    if (!matchedRestaurant) {
      return res.status(401).json({ success: false, error: 'Invalid restaurant email or password.' });
    }

    res.json({
      success: true,
      message: 'Logged in successfully as Restaurant Owner.',
      token: 'mock-jwt-restaurant-token',
      restaurant: {
        id: matchedRestaurant.id || matchedRestaurant.pk?.replace('RESTAURANT#', ''),
        name: matchedRestaurant.name,
        ownerName: matchedRestaurant.ownerName,
        email: matchedRestaurant.email,
        phone: matchedRestaurant.phone || '',
        address: matchedRestaurant.address || '',
        image: matchedRestaurant.image || '',
        openingTime: matchedRestaurant.openingTime || '11:00 AM',
        closingTime: matchedRestaurant.closingTime || '11:00 PM',
        description: matchedRestaurant.description || 'Gourmet establishment serving handcrafted culinary delights.',
        cuisine: matchedRestaurant.cuisine || matchedRestaurant.category || 'Multi-Cuisine',
        isOpen: matchedRestaurant.isOpen !== undefined ? matchedRestaurant.isOpen : true,
        role: 'RESTAURANT'
      }
    });
  } catch (error: any) {
    console.error('Restaurant login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login.', details: error.message });
  }
});

// Fetch Menu Items for a specific Restaurant (Resolves all vendor aliases & active establishment categories)
app.get('/api/restaurant/menu/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { canonicalId, shop } = await resolveCanonicalShopId(restaurantId);

    const candidateIds: string[] = [restaurantId, canonicalId];
    if (shop) {
      if (shop.shopId) candidateIds.push(shop.shopId);
      if (shop.id) candidateIds.push(shop.id);
      if (shop.restaurantId) candidateIds.push(shop.restaurantId);
      if (shop.ownerUserId) candidateIds.push(shop.ownerUserId);
      if (shop.email) candidateIds.push(shop.email);
    }

    // Get vendor's active establishment categories
    let vendorCategories: string[] = [];
    try {
      const dbCats = await categoryService.getCategoriesByRestaurantId(canonicalId);
      vendorCategories = dbCats.map(c => c.name);
      if (shop && Array.isArray(shop.categories)) {
        shop.categories.forEach((c: string) => {
          if (c && !vendorCategories.includes(c)) vendorCategories.push(c);
        });
      }
    } catch (e) { }

    const items = await menuService.getMenuByRestaurantId(candidateIds, vendorCategories);

    // Map fields for frontend compatibility while preserving variants array
    const mapped = items.map((item: any) => ({
      ...item,
      id: item.itemId || item.menuItemId,
      itemId: item.itemId || item.menuItemId,
      menuItemId: item.itemId || item.menuItemId,
      name: item.foodName || item.name,
      foodName: item.foodName || item.name,
      image: item.foodImage || item.image,
      foodImage: item.foodImage || item.image,
      prepTime: item.preparationTime,
      variants: Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : []
    }));

    res.json({ success: true, items: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch menu items.', details: error.message });
  }
});

// Save or Update Menu Item (Resolves canonical vendor shop profile and attaches aliases)
app.post('/api/restaurant/menu', async (req: Request, res: Response) => {
  try {
    const menuItemData = req.body;
    const name = menuItemData.name || menuItemData.foodName;
    const inputResId = menuItemData.restaurantId || menuItemData.shopId;

    if (!menuItemData || !name || !inputResId) {
      return res.status(400).json({ success: false, error: 'Missing required menu item fields.' });
    }

    const { canonicalId, shop } = await resolveCanonicalShopId(inputResId);

    const saved = await menuService.saveMenuItem({
      itemId: menuItemData.id || menuItemData.itemId || menuItemData.menuItemId,
      menuItemId: menuItemData.id || menuItemData.itemId || menuItemData.menuItemId,
      restaurantId: canonicalId,
      shopId: canonicalId,
      ownerUserId: shop?.ownerUserId || inputResId,
      email: shop?.email || inputResId,
      foodName: name,
      name,
      description: menuItemData.description,
      category: menuItemData.category,
      price: menuItemData.price,
      preparationTime: menuItemData.prepTime || menuItemData.preparationTime,
      isVeg: menuItemData.isVeg,
      foodImage: menuItemData.image || menuItemData.foodImage,
      image: menuItemData.image || menuItemData.foodImage,
      isAvailable: menuItemData.isAvailable,
      variants: Array.isArray(menuItemData.variants) ? menuItemData.variants : []
    });

    if (saved) {
      socketService.emitMenuUpdated(canonicalId, saved);
      if (inputResId !== canonicalId) {
        socketService.emitMenuUpdated(inputResId, saved);
      }
    }

    res.json({
      success: true,
      message: 'Menu item saved successfully.',
      item: saved ? {
        ...saved,
        id: (saved as any).id || saved.itemId || saved.menuItemId,
        name: saved.name || saved.foodName,
        image: saved.image || saved.foodImage,
        prepTime: saved.preparationTime,
        variants: saved.variants || menuItemData.variants || []
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save menu item.', details: error.message });
  }
});

// Delete Menu Item
app.delete('/api/restaurant/menu/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const item = await menuService.getItemById(itemId);
    await menuService.deleteMenuItem(itemId);
    if (item && (item.shopId || item.restaurantId)) {
      socketService.emitMenuUpdated((item.shopId || item.restaurantId)!, { deletedId: itemId });
    }
    res.json({ success: true, message: 'Menu item deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete menu item.', details: error.message });
  }
});

// Fetch Orders for a specific Restaurant (Smart multi-field matching & item enrichment)
app.get('/api/restaurant/orders/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;

    // 1. Fetch all orders from DynamoDB
    let allOrders: any[] = [];
    if (ordersTableName) {
      const command = new ScanCommand({ TableName: ordersTableName });
      const resp = await dynamoDocClient.send(command);
      allOrders = resp.Items || [];
    } else {
      allOrders = await orderService.getOrdersByRestaurant('all');
    }

    // 2. Fetch target restaurant details to get name, email, pk, id
    let targetRestaurant: any = null;
    try {
      const allRes = await restaurantService.getAllRestaurants();
      targetRestaurant = allRes.find((r: any) =>
        r.id === restaurantId ||
        r.restaurantId === restaurantId ||
        r.email === restaurantId ||
        r.pk === `RESTAURANT#${restaurantId}`
      );
    } catch (e) { }

    const resName = targetRestaurant?.name?.toLowerCase() || '';
    const resIdStr = restaurantId.toLowerCase();

    // 3. Filter orders belonging strictly to this restaurant/vendor
    const filteredOrders = allOrders.filter((ord: any) => {
      if (restaurantId === 'all') return true;

      const ordResId = (ord.restaurantId || '').toLowerCase();
      const ordResName = (ord.restaurantName || '').toLowerCase();
      const itemsList = ord.items || ord.rawItems || [];

      // Check if any item in the order explicitly belongs to this vendor
      const hasVendorItem = Array.isArray(itemsList) && itemsList.some((item: any) => {
        const itemResId = (item.restaurantId || '').toLowerCase();
        const itemResName = (item.restaurantName || '').toLowerCase();
        return itemResId ? (
          itemResId === resIdStr ||
          itemResId === targetRestaurant?.id?.toLowerCase() ||
          itemResId === targetRestaurant?.restaurantId?.toLowerCase()
        ) : (resName && itemResName && itemResName === resName);
      });

      if (hasVendorItem) {
        return true;
      }

      // Check direct order-level match (only if order items don't explicitly belong to other vendors)
      const hasOtherVendorItems = Array.isArray(itemsList) && itemsList.some((item: any) => {
        const itemResId = (item.restaurantId || '').toLowerCase();
        return itemResId && itemResId !== resIdStr && itemResId !== targetRestaurant?.id?.toLowerCase() && itemResId !== targetRestaurant?.restaurantId?.toLowerCase();
      });

      if (hasOtherVendorItems) {
        return false;
      }

      if (ordResId && (ordResId === resIdStr || ordResId === targetRestaurant?.id?.toLowerCase() || ordResId === targetRestaurant?.restaurantId?.toLowerCase())) {
        return true;
      }

      if (resName && ordResName && ordResName === resName) {
        return true;
      }

      return false;
    });

    // 4. Enrich and strictly scope items and totals to this vendor only
    const mappedPromises = filteredOrders.map(async (ord: any) => {
      let itemsList = ord.items || ord.rawItems || [];
      if (!Array.isArray(itemsList) || itemsList.length === 0) {
        try {
          const dbItems = await orderItemRepository.findByOrderId(ord.orderId);
          if (dbItems && dbItems.length > 0) {
            itemsList = dbItems.map((di: any) => ({
              id: di.menuItemId || di.orderItemId,
              name: di.foodName || 'Food Item',
              foodName: di.foodName || 'Food Item',
              quantity: Number(di.quantity || 1),
              price: Number(di.price || 0),
              restaurantId: di.restaurantId,
              restaurantName: di.restaurantName
            }));
          }
        } catch (e) { }
      }

      // Filter items to vendor-only items
      const vendorItems = itemsList.filter((i: any) => {
        if (restaurantId === 'all') return true;
        const iResId = (i.restaurantId || '').toLowerCase();
        const iResName = (i.restaurantName || '').toLowerCase();
        if (iResId) {
          return (
            iResId === resIdStr ||
            iResId === targetRestaurant?.id?.toLowerCase() ||
            iResId === targetRestaurant?.restaurantId?.toLowerCase()
          );
        }
        if (resName && iResName) {
          return iResName === resName;
        }
        return (ord.restaurantId || '').toLowerCase() === resIdStr;
      });

      const finalItems = vendorItems;
      const vendorSubtotal = finalItems.reduce((acc: number, item: any) => acc + Number(item.price || 0) * Number(item.quantity || 1), 0);

      return {
        ...ord,
        id: ord.orderId,
        customerPhone: ord.customerPhone || '',
        customerAddress: ord.deliveryAddress,
        total: vendorSubtotal > 0 ? vendorSubtotal : ord.totalAmount,
        totalAmount: vendorSubtotal > 0 ? vendorSubtotal : ord.totalAmount,
        orderStatus: ord.status || ord.orderStatus || 'Pending',
        time: ord.orderedAt,
        items: finalItems
      };
    });

    const mapped = (await Promise.all(mappedPromises)).filter(ord => ord.items && ord.items.length > 0);

    res.json({ success: true, orders: mapped });
  } catch (error: any) {
    console.error('Error fetching restaurant orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant orders.', details: error.message });
  }
});

// Admin Assign Delivery Boy / Rider to Order
app.put('/api/admin/orders/:orderId/assign-rider', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { assignedRider } = req.body;

    if (!ordersTableName) {
      return res.status(400).json({ success: false, error: 'Orders table not configured.' });
    }

    const scanCmd = new ScanCommand({ TableName: ordersTableName });
    const scanResp = await dynamoDocClient.send(scanCmd);
    const existing = (scanResp.Items || []).find((o: any) => o.id === orderId || o.orderId === orderId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Look up delivery partner user details in users table
    let riderUser: any = null;
    if (assignedRider) {
      try {
        const uScan = await dynamoDocClient.send(
          new ScanCommand({
            TableName: usersTableName,
            FilterExpression: 'email = :r OR id = :r OR userId = :r OR phone = :r',
            ExpressionAttributeValues: { ':r': assignedRider }
          })
        );
        if (uScan.Items && uScan.Items.length > 0) {
          riderUser = uScan.Items[0];
          const isOffDuty = riderUser.dutyStatus === 'OFF_DUTY' || riderUser.dutyStatus === 'OFFLINE' || riderUser.isOnDuty === false;
          if (isOffDuty) {
            return res.status(400).json({
              success: false,
              error: `Cannot assign order: Delivery partner "${riderUser.name || assignedRider}" is currently OFF DUTY and unavailable for delivery.`
            });
          }
        }
      } catch (uErr) {}
    }

    const riderName = riderUser?.name || riderUser?.email || assignedRider || 'Delivery Partner';
    const riderPhone = riderUser?.phone || riderUser?.mobile || riderUser?.phoneNumber || 'N/A';
    const riderEmail = riderUser?.email || (String(assignedRider).includes('@') ? assignedRider : '');
    const riderId = riderUser?.id || riderUser?.userId || assignedRider;

    const nextStatus = (existing.status === 'PENDING' || existing.orderStatus === 'PENDING') ? 'ASSIGNED' : (existing.status || existing.orderStatus || 'ASSIGNED');

    const updated = {
      ...existing,
      assignedRider: riderName,
      deliveryUserId: riderId,
      deliveryPartnerName: riderName,
      deliveryPartnerPhone: riderPhone,
      deliveryPartnerEmail: riderEmail,
      deliveryPartner: {
        id: riderId,
        name: riderName,
        email: riderEmail,
        phone: riderPhone
      },
      status: nextStatus,
      orderStatus: nextStatus,
      updatedAt: new Date().toISOString()
    };

    const putCmd = new PutCommand({
      TableName: ordersTableName,
      Item: updated
    });

    await dynamoDocClient.send(putCmd);

    // Real-Time Socket & FCM Push Emissions to Vendor, Customer, Admin, and Delivery Partner
    try {
      await socketService.emitOrderAssigned(updated);
      await socketService.emitOrderStatusUpdated(updated);
      await socketService.emitRiderStatusUpdated(updated);
      await socketService.emitOrderReadyForPickup(updated);

      const updatedPayload: any = updated;
      void notificationService.notifyCustomerOrderStatus({
        orderId,
        customerId: updatedPayload.customerId || (existing as any)?.customerId,
        customerEmail: updatedPayload.customerEmail || (existing as any)?.customerEmail,
        status: 'ASSIGNED'
      });
      void notificationService.notifyRiderOrderAssigned({
        orderId,
        riderId,
        riderEmail,
        restaurantName: updatedPayload.restaurantName || updatedPayload.shopName
      });
    } catch (sErr) {
      console.warn('Socket/FCM emission warning on assign-rider:', sErr);
    }

    res.json({
      success: true,
      message: `Assigned delivery partner ${riderName} to order ${orderId}.`,
      orderId,
      assignedRider: riderName,
      order: updated
    });
  } catch (error: any) {
    console.error('Error assigning rider to order:', error);
    res.status(500).json({ success: false, error: 'Failed to assign rider to order.' });
  }
});

// --------------------------------------------------------------------------
// DELIVERY PARTNER MANAGEMENT ENDPOINTS
// --------------------------------------------------------------------------

// Create New Delivery Partner (Stored in DynamoDB foodway-users)
app.post('/api/admin/delivery-partners', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, vehicleType, vehicleNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await userService.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists.' });
    }

    const userId = generateUserId('DELIVERY_PARTNER');
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    const newPartner = {
      userId,
      role: 'DELIVERY_PARTNER',
      name,
      email: cleanEmail,
      phone: phone || '',
      password: hashedPassword,
      vehicleType: vehicleType || 'Bike',
      vehicleNumber: vehicleNumber || '',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };

    // Save to users table
    if (usersTableName) {
      await dynamoDocClient.send(
        new PutCommand({
          TableName: usersTableName,
          Item: newPartner
        })
      );
    }

    res.json({
      success: true,
      message: `Delivery partner "${name}" created successfully.`,
      partner: {
        id: userId,
        userId,
        name,
        email: cleanEmail,
        phone,
        vehicleType: vehicleType || 'Bike',
        vehicleNumber: vehicleNumber || '',
        status: 'ACTIVE',
        role: 'DELIVERY_PARTNER'
      }
    });
  } catch (error: any) {
    console.error('Error creating delivery partner:', error);
    res.status(500).json({ success: false, error: 'Failed to create delivery partner.', details: error.message });
  }
});

// Get All Registered Delivery Partners for Admin (includes real-time duty status)
app.get('/api/admin/delivery-partners', async (req: Request, res: Response) => {
  try {
    let partners: any[] = [];

    if (usersTableName) {
      const scanCmd = new ScanCommand({ TableName: usersTableName });
      const scanResp = await dynamoDocClient.send(scanCmd);
      const items = scanResp.Items || [];
      partners = items
        .filter((u: any) => u.role === 'DELIVERY_PARTNER' || u.role === 'DELIVERY' || (u.userId && u.userId.startsWith('DEL-')))
        .map((p: any) => ({
          id: p.userId || p.id,
          userId: p.userId || p.id,
          name: p.name,
          email: p.email,
          phone: p.phone || '',
          vehicleType: p.vehicleType || 'Bike',
          vehicleNumber: p.vehicleNumber || 'N/A',
          status: p.status || 'ACTIVE',
          dutyStatus: p.dutyStatus || 'ON_DUTY',
          role: 'DELIVERY_PARTNER'
        }));
    }

    res.json({ success: true, deliveryPartners: partners });
  } catch (error: any) {
    console.error('Error fetching delivery partners:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery partners.' });
  }
});

// Update Delivery Partner Duty Status (ON_DUTY / OFF_DUTY)
app.put('/api/delivery-partner/duty-status', async (req: Request, res: Response) => {
  try {
    const { userId, name, email, isOnDuty } = req.body;
    const dutyStatus = isOnDuty ? 'ON_DUTY' : 'OFF_DUTY';

    if (usersTableName) {
      try {
        const scanCmd = new ScanCommand({ TableName: usersTableName });
        const scanResp = await dynamoDocClient.send(scanCmd);
        const items = scanResp.Items || [];
        const partners = items.filter((u: any) => u.role === 'DELIVERY_PARTNER' || u.role === 'DELIVERY' || (u.userId && u.userId.startsWith('DEL-')));

        const targetUser = partners.find((u: any) =>
          (userId && (u.userId === userId || u.id === userId)) ||
          (email && u.email?.toLowerCase() === email.toLowerCase()) ||
          (name && u.name?.toLowerCase() === name.toLowerCase())
        ) || (partners.length === 1 ? partners[0] : null);

        if (targetUser) {
          const updatedUser = {
            ...targetUser,
            dutyStatus,
            updatedAt: new Date().toISOString()
          };
          await dynamoDocClient.send(new PutCommand({ TableName: usersTableName, Item: updatedUser }));
        }
      } catch (dbErr) {
        console.warn('⚠️ Error updating user duty status in DynamoDB:', dbErr);
      }
    }

    // Broadcast Real-Time Duty Status Update via Socket to ALL connected clients (Admin + Rider)
    try {
      if (socketService) {
        console.log('📢 Emitting partner_duty_updated via WebSocket:', { userId, name, email, isOnDuty, dutyStatus });
        await socketService.emitDeliveryDutyUpdated({ userId, name, email, isOnDuty, dutyStatus });
      }
    } catch (socErr) {
      console.warn('⚠️ Error broadcasting duty status socket event:', socErr);
    }

    return res.json({ success: true, message: `Duty status updated to ${dutyStatus}.`, isOnDuty, dutyStatus });
  } catch (error: any) {
    console.error('Error updating duty status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update duty status.' });
  }
});

// Fetch Delivery Partner Duty Status
app.get('/api/delivery-partner/duty-status/:partnerIdentifier', async (req: Request, res: Response) => {
  try {
    const { partnerIdentifier } = req.params;
    const cleanId = decodeURIComponent(partnerIdentifier).toLowerCase().trim();

    if (usersTableName) {
      try {
        const scanCmd = new ScanCommand({ TableName: usersTableName });
        const scanResp = await dynamoDocClient.send(scanCmd);
        const items = scanResp.Items || [];
        const targetUser = items.find((u: any) =>
          (u.id && String(u.id).toLowerCase() === cleanId) ||
          (u.userId && String(u.userId).toLowerCase() === cleanId) ||
          (u.email && String(u.email).toLowerCase() === cleanId) ||
          (u.name && String(u.name).toLowerCase() === cleanId)
        );

        if (targetUser) {
          const dutyStatus = targetUser.dutyStatus || 'ON_DUTY';
          const isOnDuty = dutyStatus === 'ON_DUTY';
          return res.json({ success: true, dutyStatus, isOnDuty });
        }
      } catch (e) {
        console.warn('⚠️ Error fetching user duty status from DynamoDB:', e);
      }
    }
    return res.json({ success: true, dutyStatus: 'ON_DUTY', isOnDuty: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch duty status.' });
  }
});

// Delete Delivery Partner
app.delete('/api/admin/delivery-partners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cleanId = decodeURIComponent(id || '').trim().toLowerCase();

    if (usersTableName) {
      const scanCmd = new ScanCommand({ TableName: usersTableName });
      const scanResp = await dynamoDocClient.send(scanCmd);
      const items = scanResp.Items || [];

      const targetUser = items.find((u: any) =>
        (u.userId && String(u.userId).trim().toLowerCase() === cleanId) ||
        (u.id && String(u.id).trim().toLowerCase() === cleanId) ||
        (u.email && String(u.email).trim().toLowerCase() === cleanId) ||
        (u.phone && String(u.phone).trim().toLowerCase() === cleanId)
      );

      if (targetUser) {
        if (targetUser.email) {
          try {
            await dynamoDocClient.send(
              new DeleteCommand({
                TableName: usersTableName,
                Key: { email: targetUser.email }
              })
            );
          } catch (e1) {}
        }
        if (targetUser.userId) {
          try {
            await dynamoDocClient.send(
              new DeleteCommand({
                TableName: usersTableName,
                Key: { userId: targetUser.userId }
              })
            );
          } catch (e2) {}
        }
        if (targetUser.id) {
          try {
            await dynamoDocClient.send(
              new DeleteCommand({
                TableName: usersTableName,
                Key: { id: targetUser.id }
              })
            );
          } catch (e3) {}
        }
      } else {
        // Fallback delete attempts if direct key match exists
        try {
          await dynamoDocClient.send(new DeleteCommand({ TableName: usersTableName, Key: { email: id } }));
        } catch (e1) {}
        try {
          await dynamoDocClient.send(new DeleteCommand({ TableName: usersTableName, Key: { userId: id } }));
        } catch (e2) {}
        try {
          await dynamoDocClient.send(new DeleteCommand({ TableName: usersTableName, Key: { id } }));
        } catch (e3) {}
      }
    }
    return res.json({ success: true, message: 'Delivery partner removed.' });
  } catch (error: any) {
    console.error('Error deleting delivery partner:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete delivery partner.', details: error.message });
  }
});

// Get Assigned Orders for a Delivery Partner
app.get('/api/delivery-partner/orders/:partnerIdentifier', async (req: Request, res: Response) => {
  try {
    const { partnerIdentifier } = req.params;
    const cleanId = decodeURIComponent(partnerIdentifier).toLowerCase().trim();

    if (!ordersTableName) {
      return res.status(400).json({ success: false, error: 'Orders table not configured.' });
    }

    const scanCmd = new ScanCommand({ TableName: ordersTableName });
    const scanResp = await dynamoDocClient.send(scanCmd);
    const allOrders = scanResp.Items || [];

    const assignedOrders = allOrders
      .filter((o: any) => {
        const rider = (o.assignedRider || '').toLowerCase().trim();
        const delUser = (o.deliveryUserId || o.riderId || '').toLowerCase().trim();
        const delName = (o.deliveryPartnerName || '').toLowerCase().trim();
        const delEmail = (o.deliveryPartnerEmail || '').toLowerCase().trim();

        // Must have at least one non-empty assignment field
        if (!rider && !delUser && !delName && !delEmail) {
          return false;
        }

        return (
          (rider && (rider === cleanId || cleanId.includes(rider) || rider.includes(cleanId))) ||
          (delUser && (delUser === cleanId || cleanId.includes(delUser) || delUser.includes(cleanId))) ||
          (delName && (delName === cleanId || cleanId.includes(delName) || delName.includes(cleanId))) ||
          (delEmail && (delEmail === cleanId || cleanId.includes(delEmail) || delEmail.includes(cleanId)))
        );
      })
      .map((o: any) => {
        const pin = (o.deliveryPin || o.deliveryOtp || String((o.id || o.orderId || '').replace(/\D/g, '').slice(-4) || '4829'));
        return { ...o, deliveryPin: pin, deliveryOtp: pin };
      });

    res.json({ success: true, orders: assignedOrders });
  } catch (error: any) {
    console.error('Error fetching delivery partner orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assigned orders.' });
  }
});

// Helper to ensure every order has a 4-digit Delivery PIN
const ensureDeliveryPin = (order: any) => {
  if (order.deliveryPin || order.deliveryOtp) {
    return String(order.deliveryPin || order.deliveryOtp);
  }
  const digits = (order.id || order.orderId || '').replace(/\D/g, '');
  let pin = digits.length >= 4 ? digits.slice(-4) : '';
  if (!pin || pin.length < 4 || pin === '0000') {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  }
  order.deliveryPin = pin;
  order.deliveryOtp = pin;
  return pin;
};

// Update Order Status by Delivery Partner
app.put('/api/delivery-partner/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status field is required.' });
    }

    const upperStatus = String(status).toUpperCase() as any;
    const updated = await orderService.updateOrderStatus(orderId, upperStatus, 'DELIVERY');

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    ensureDeliveryPin(updated);
    res.json({ success: true, message: `Order status updated to ${upperStatus}.`, order: updated });
  } catch (error: any) {
    console.error('Error updating order status by delivery partner:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status.' });
  }
});

// Verify 4-Digit Delivery PIN by Delivery Partner
app.post('/api/delivery-partner/orders/:orderId/verify-pin', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ success: false, error: '4-digit Delivery PIN is required.' });
    }

    if (!ordersTableName) {
      return res.status(400).json({ success: false, error: 'Orders table not configured.' });
    }

    const scanCmd = new ScanCommand({ TableName: ordersTableName });
    const scanResp = await dynamoDocClient.send(scanCmd);
    const existing = (scanResp.Items || []).find((o: any) => o.id === orderId || o.orderId === orderId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const expectedPin = ensureDeliveryPin(existing);

    if (String(pin).trim() !== String(expectedPin).trim()) {
      return res.status(400).json({
        success: false,
        error: `Incorrect PIN (${pin}). Please ask the customer for the correct 4-digit delivery PIN.`
      });
    }

    // PIN is correct! Transition order status to DELIVERED
    const updated = await orderService.updateOrderStatus(orderId, 'DELIVERED' as any, 'DELIVERY');

    res.json({
      success: true,
      message: '✅ 4-Digit Delivery PIN Verified! Order completed successfully.',
      order: updated || { ...existing, status: 'DELIVERED', orderStatus: 'DELIVERED' }
    });
  } catch (error: any) {
    console.error('Error verifying delivery PIN:', error);
    res.status(500).json({ success: false, error: 'Failed to verify delivery PIN.' });
  }
});

// Update Restaurant Profile
app.put('/api/restaurant/profile/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const profileUpdates = req.body;

    const updated = await restaurantService.updateProfile(restaurantId, profileUpdates);

    if (socketService) {
      socketService.emitShopUpdated(updated || profileUpdates);
    }

    res.json({
      success: true,
      message: 'Restaurant profile updated successfully.',
      profile: updated || profileUpdates
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update restaurant profile.', details: error.message });
  }
});

// Helper: Safe DynamoDB item deletion handling key schema variations
async function safeDeleteTableItem(targetTableName: string, item: any) {
  if (!targetTableName || !item) return;

  // Try 1: Key using pk and email
  if (item.pk && item.email) {
    try {
      await dynamoDocClient.send(new DeleteCommand({ TableName: targetTableName, Key: { pk: item.pk, email: item.email } }));
      return;
    } catch (e: any) {
      if (!e.message?.toLowerCase().includes('schema')) throw e;
    }
  }

  // Try 2: Key using pk only
  if (item.pk) {
    try {
      await dynamoDocClient.send(new DeleteCommand({ TableName: targetTableName, Key: { pk: item.pk } }));
      return;
    } catch (e: any) {
      if (!e.message?.toLowerCase().includes('schema')) throw e;
    }
  }

  // Try 3: Key using id only
  if (item.id) {
    try {
      await dynamoDocClient.send(new DeleteCommand({ TableName: targetTableName, Key: { id: item.id } }));
      return;
    } catch (e: any) { }
  }
}

// Helper: Resolve canonical shop ID and shop record from user ID, email, or restaurant ID
async function resolveCanonicalShopId(idOrEmail: string): Promise<{ canonicalId: string; shop: any }> {
  if (!idOrEmail) return { canonicalId: 'RES-001', shop: null };
  const clean = String(idOrEmail).trim();

  try {
    const shop = await shopService.getShopById(clean);
    if (shop) return { canonicalId: shop.shopId || (shop as any).id || clean, shop };
  } catch (e) { }

  try {
    const shop = await shopService.getShopByOwnerUserId(clean);
    if (shop) return { canonicalId: shop.shopId || (shop as any).id || clean, shop };
  } catch (e) { }

  try {
    const shop = await shopRepository.findByEmail(clean);
    if (shop) return { canonicalId: shop.shopId || (shop as any).id || clean, shop };
  } catch (e) { }

  try {
    const all = await restaurantService.getAllRestaurants();
    const cleanLower = clean.toLowerCase();
    const matched = all.find((s: any) =>
      (s.id && String(s.id).toLowerCase() === cleanLower) ||
      (s.shopId && String(s.shopId).toLowerCase() === cleanLower) ||
      (s.restaurantId && String(s.restaurantId).toLowerCase() === cleanLower) ||
      (s.ownerUserId && String(s.ownerUserId).toLowerCase() === cleanLower) ||
      (s.email && String(s.email).toLowerCase() === cleanLower)
    );
    if (matched) return { canonicalId: matched.shopId || (matched as any).id || clean, shop: matched };
  } catch (e) { }

  return { canonicalId: clean, shop: null };
}

// Fetch Categories for a specific Restaurant (Source of truth: foodway-categories & foodway-shops in DynamoDB)
app.get('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { canonicalId, shop } = await resolveCanonicalShopId(restaurantId);

    // 1. Query foodway-categories table in DynamoDB
    let dbCats = await categoryService.getCategoriesByRestaurantId(canonicalId);
    if (dbCats.length === 0 && restaurantId !== canonicalId) {
      dbCats = await categoryService.getCategoriesByRestaurantId(restaurantId);
    }
    if (dbCats.length === 0 && shop?.email) {
      dbCats = await categoryService.getCategoriesByRestaurantId(shop.email);
    }
    if (dbCats.length === 0 && shop?.ownerUserId) {
      dbCats = await categoryService.getCategoriesByRestaurantId(shop.ownerUserId);
    }

    if (dbCats.length > 0) {
      const catNames = Array.from(new Set(dbCats.map(c => c.name.trim()).filter(Boolean)));
      return res.json({ success: true, categories: catNames });
    }

    // 2. Fallback: Shop profile categories list in foodway-shops
    if (shop && Array.isArray(shop.categories) && shop.categories.length > 0) {
      const catNames = Array.from(new Set(shop.categories.map((c: string) => String(c).trim()).filter(Boolean)));
      return res.json({ success: true, categories: catNames });
    }

    // 3. Fallback: Items belonging strictly to this restaurant
    try {
      const menuItems = await menuService.getMenuByRestaurantId(canonicalId || restaurantId);
      const catNames = Array.from(new Set(
        menuItems
          .map((item: any) => (item.category || '').trim())
          .filter((c: string) => c && c !== 'Uncategorized')
      ));
      if (catNames.length > 0) {
        return res.json({ success: true, categories: catNames });
      }
    } catch (e) { }

    res.json({ success: true, categories: [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant categories.', details: error.message });
  }
});

// Add New Category for a specific Restaurant (Persists strictly to foodway-categories table in DynamoDB & Shop Details)
app.post('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name } = req.body;
    const { canonicalId, shop } = await resolveCanonicalShopId(restaurantId);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const categoryName = name.trim();

    // 1. Persist directly to foodway-categories table in DynamoDB
    await categoryService.addCategory(canonicalId, categoryName);
    if (restaurantId !== canonicalId) {
      await categoryService.addCategory(restaurantId, categoryName);
    }

    // 2. Gather all categories after adding
    const customCategories: string[] = [];
    const addCat = (c: string) => {
      if (c && c.trim()) {
        const trimmed = c.trim();
        if (!customCategories.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
          customCategories.push(trimmed);
        }
      }
    };

    addCat(categoryName);

    try {
      const dbCats = await categoryService.getCategoriesByRestaurantId(canonicalId);
      dbCats.forEach(c => addCat(c.name));
    } catch (e) { }

    if (shop && Array.isArray(shop.categories)) {
      shop.categories.forEach((catName: string) => addCat(catName));
    }

    try {
      const menuItems = await menuService.getMenuByRestaurantId(canonicalId || restaurantId);
      menuItems.forEach((item: any) => {
        if (item.category && item.category.trim() && item.category.trim() !== 'Uncategorized') {
          addCat(item.category);
        }
      });
    } catch (e) { }

    // 3. Update shop profile in foodway-shops
    try {
      await shopService.updateShop(canonicalId, {
        categories: customCategories,
        cuisine: customCategories.join(', ')
      });
      if (restaurantId !== canonicalId) {
        await shopService.updateShop(restaurantId, {
          categories: customCategories,
          cuisine: customCategories.join(', ')
        });
      }
    } catch (e) {
      console.warn('Warning: Could not update categories on shop record:', e);
    }

    res.json({ success: true, message: 'Category added successfully.', category: categoryName, categories: customCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save category.', details: error.message });
  }
});

// Set Full Category List for a specific Restaurant (Overwrites and persists strictly to foodway-categories table in DynamoDB)
app.put('/api/restaurant/categories/:restaurantId/set', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { categories: inputCategories } = req.body;
    const { canonicalId } = await resolveCanonicalShopId(restaurantId);

    if (!Array.isArray(inputCategories)) {
      return res.status(400).json({ success: false, error: 'Categories array is required.' });
    }

    const cleanCategories = Array.from(new Set(inputCategories.map((c: string) => String(c).trim()).filter(Boolean)));

    // 1. Overwrite categories in foodway-categories table in DynamoDB
    await categoryService.setCategoriesForRestaurant(canonicalId, cleanCategories);
    if (restaurantId !== canonicalId) {
      await categoryService.setCategoriesForRestaurant(restaurantId, cleanCategories);
    }

    // 2. Update shop profile categories in foodway-shops table
    try {
      await shopService.updateShop(canonicalId, {
        categories: cleanCategories,
        cuisine: cleanCategories.join(', ')
      });
      if (restaurantId !== canonicalId) {
        await shopService.updateShop(restaurantId, {
          categories: cleanCategories,
          cuisine: cleanCategories.join(', ')
        });
      }
    } catch (e) {
      console.warn('Warning: Could not update categories on shop record:', e);
    }

    res.json({ success: true, message: 'Categories set successfully.', categories: cleanCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to set categories.', details: error.message });
  }
});

// Update/Rename Category for a specific Restaurant
app.put('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { oldName, newName } = req.body;
    const { canonicalId } = await resolveCanonicalShopId(restaurantId);

    if (!oldName || !newName || !newName.trim()) {
      return res.status(400).json({ success: false, error: 'Old and new category names are required.' });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    // 1. Update Category in foodway-categories table
    await categoryService.deleteCategory(canonicalId, trimmedOld);
    await categoryService.addCategory(canonicalId, trimmedNew);

    // 2. Update category field on any food items matching trimmedOld in foodway-items table
    try {
      const menuItems = await menuService.getMenuByRestaurantId(canonicalId || restaurantId);
      for (const item of menuItems) {
        if (item.category === trimmedOld) {
          await menuService.saveMenuItem({
            ...item,
            category: trimmedNew
          });
        }
      }
    } catch (e) {
      console.warn('Error updating menu item categories:', e);
    }

    const dbCats = await categoryService.getCategoriesByRestaurantId(canonicalId);
    const updatedCategories = dbCats.map(c => c.name);

    res.json({ success: true, message: 'Category renamed successfully.', categories: updatedCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to rename category.', details: error.message });
  }
});

// Helper: normalize category string by removing emojis and trimming
const normalizeCatName = (name: string) => {
  return (name || '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase();
};

// Delete Category for a specific Restaurant (Deletes category item from foodway-categories & updates food item categories)
app.delete('/api/restaurant/categories/:restaurantId/:categoryName', async (req: Request, res: Response) => {
  try {
    const { restaurantId, categoryName } = req.params;
    const targetCat = decodeURIComponent(categoryName).trim();
    const { canonicalId } = await resolveCanonicalShopId(restaurantId);

    // 1. Delete matching category items from foodway-categories table
    await categoryService.deleteCategory(canonicalId, targetCat);
    if (restaurantId !== canonicalId) {
      await categoryService.deleteCategory(restaurantId, targetCat);
    }

    // 2. Clear category on matching food items in foodway-items
    try {
      const menuItems = await menuService.getMenuByRestaurantId(canonicalId || restaurantId);
      for (const item of menuItems) {
        if (item.category === targetCat || normalizeCatName(item.category) === normalizeCatName(targetCat)) {
          await menuService.saveMenuItem({
            ...item,
            category: 'Uncategorized'
          });
        }
      }
    } catch (e) {
      console.warn('Error clearing food item categories on delete:', e);
    }

    const dbCats = await categoryService.getCategoriesByRestaurantId(canonicalId);
    const remainingCategories = dbCats.map(c => c.name);

    try {
      await shopService.updateShop(canonicalId, {
        categories: remainingCategories,
        cuisine: remainingCategories.join(', ')
      });
    } catch (e) {
      console.warn('Warning: Could not update shop categories on delete:', e);
    }

    res.json({ success: true, message: `Category "${targetCat}" deleted successfully.`, categories: remainingCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete category.', details: error.message });
  }
});

// Admin Endpoint: Reset/Seed default password (DISABLED)
app.post('/api/admin/seed-shop-passwords', async (_req: Request, res: Response) => {
  return res.status(400).json({
    success: false,
    error: 'Default password seeding has been disabled. Vendor passwords must be set during registration or updated in profile settings.'
  });
});

// Centralized Production Error Handling Middleware
// Masks internal stack traces and implementation details in production
app.use((err: any, req: Request, res: Response, _next: any) => {
  console.error('❌ Server Error:', err?.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: isProd ? 'An internal server error occurred.' : (err?.message || 'Server error'),
    code: err?.code || 'INTERNAL_SERVER_ERROR',
    ...(isProd ? {} : { stack: err?.stack })
  });
});

export default app;
