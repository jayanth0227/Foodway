import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import "./config/firebase";
import fs from 'fs';

// Import AWS SDK Command helpers
import { ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { s3Client, dynamoDocClient, bucketName, tableName, usersTableName, menuItemsTableName, ordersTableName } from './config/aws';
import { uploadAndSeedVideos } from './utils/videoUploader';
import { ensureAllTablesExist } from './utils/setupTables';
import restaurantRouter from './routes/restaurant.routes';
import authRouter from './routes/auth.routes';
import notificationRouter from './routes/notification.routes';
import { menuService } from './services/menu.service';
import { orderService } from './services/order.service';
import { orderItemRepository } from './repositories/orderItem.repository';
import { RestaurantStatus } from './types/enums';
import { restaurantService } from './services/restaurant.service';
import { userService } from './services/user.service';
import { hashPassword } from './utils/hash.utils';
import { generateUserId } from './utils/idGenerator';
import { socketService } from './services/socket.service';

const app = express();
const httpServer = createServer(app);
socketService.initialize(httpServer);

const PORT = process.env.PORT || 5000;

// Enable CORS
const clientUrl = process.env.CLIENT_URL;
app.use(cors({
  origin: clientUrl ? clientUrl.split(',') : true, // Set to true to dynamically reflect any requesting origin (essential for mobile/local IP testing)
  credentials: true
}));

// Body parsing middleware with limit for base64 file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Unified Authentication & Notification API Routes
app.use('/api/auth', authRouter);
app.use('/api/notifications', notificationRouter);

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
  const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';
  const dynamoRegion = process.env.AWS_DYNAMODB_REGION || 'eu-north-1';

  res.json({
    credentialsConfigured: hasAccessKey && hasSecretKey,
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
      r.id === resId ||
      (r.email && r.email.toLowerCase() === resId.toLowerCase()) ||
      (r.restaurantName && r.restaurantName.toLowerCase() === resId.toLowerCase())
    );

    if (targetRes) {
      await restaurantService.updateProfile(targetRes.restaurantId, {
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
            (item.id === resId || item.restaurantId === resId || (item.name && item.name.toLowerCase() === resId.toLowerCase()) || (item.email && item.email.toLowerCase() === resId.toLowerCase()))
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
      } catch (e) {}
    }

    res.json({ success: true, message: `Restaurant status updated to ${nextStatus}.`, isOpen, status: nextStatus });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update restaurant status.', details: error.message });
  }
});

// Public Endpoint: Fetch All Restaurants directly from DynamoDB
app.get('/api/public/restaurants', async (req: Request, res: Response) => {
  try {
    const rawRestaurants = await restaurantService.getAllRestaurants();
    const mapped = rawRestaurants.map((r: any) => {
      const isClosed = r.isOpen === false || r.status === 'closed' || r.status === 'inactive';
      return {
        id: r.restaurantId,
        name: r.restaurantName,
        cuisine: r.cuisine || 'Multi-Cuisine',
        rating: r.rating || 4.8,
        deliveryTime: '20-30 mins',
        image: r.logo || r.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
        isOpen: !isClosed,
        status: isClosed ? 'closed' : 'active',
        address: r.address || '',
        phone: r.phone || '',
        description: r.description || ''
      };
    });
    res.json({ success: true, restaurants: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public restaurants.' });
  }
});

// Public Endpoint: Fetch All Dishes / Menu Items directly from DynamoDB
app.get('/api/public/dishes', async (req: Request, res: Response) => {
  try {
    const scanCommand = new ScanCommand({ TableName: menuItemsTableName });
    const response = await dynamoDocClient.send(scanCommand);
    const items = response.Items || [];

    const mapped = items.map((item: any) => ({
      id: item.menuItemId,
      name: item.foodName,
      description: item.description || '',
      price: Number(item.price),
      category: item.category || 'Main Course',
      image: item.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
      isVeg: item.isVeg !== undefined ? item.isVeg : true,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
      status: item.isAvailable === false || item.status === 'UNAVAILABLE' ? 'disabled' : 'active',
      rating: item.rating || 4.8,
      prepTime: item.preparationTime || '15-20 mins',
      restaurantId: item.restaurantId
    }));

    res.json({ success: true, dishes: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public dishes.' });
  }
});

// Public Endpoint: Fetch All Unique Categories dynamically from DynamoDB
app.get('/api/public/categories', async (req: Request, res: Response) => {
  try {
    const scanCommand = new ScanCommand({ TableName: menuItemsTableName });
    const response = await dynamoDocClient.send(scanCommand);
    const items = response.Items || [];

    const categoryMap: Record<string, { id: string; name: string; description: string; itemCount: number; image: string }> = {};

    items.forEach((item: any) => {
      const catName = item.category || 'Main Course';
      if (!categoryMap[catName]) {
        categoryMap[catName] = {
          id: `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`,
          name: catName,
          description: `Signature selection of ${catName} items from top kitchens.`,
          itemCount: 1,
          image: item.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'
        };
      } else {
        categoryMap[catName].itemCount += 1;
      }
    });

    const categories = Object.values(categoryMap);
    res.json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch public categories.' });
  }
});

// Fetch all orders for Admin (Enriched with full items breakdown, restaurant name, and customer details)
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
    } catch (e) {}

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
        } catch (e) {}
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

      return {
        ...o,
        id: o.orderId,
        orderId: o.orderId,
        restaurant: resName,
        restaurantName: resName,
        restaurantId: o.restaurantId,
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

    res.json({ success: true, orders: enriched });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders.', details: error.message });
  }
});

// Create New Customer Order (Persists directly to DynamoDB foodway-orders & foodway-order-items tables)
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
      restaurantName: bodyResName
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must contain at least one item.' });
    }

    // Extract restaurant ID & Name from first item or body
    const targetRestaurantId = bodyResId || items[0]?.restaurantId || 'RES_DEFAULT';
    const targetRestaurantName = bodyResName || items[0]?.restaurantName || 'Partner Restaurant';

    const orderData = {
      customerId: customerId || `CUST_${Date.now()}`,
      restaurantId: targetRestaurantId,
      restaurantName: targetRestaurantName,
      customerName: customerName || 'Valued Customer',
      customerPhone: customerPhone || '',
      deliveryAddress: deliveryAddress || '',
      paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
      items: items.map((i: any) => ({
        menuItemId: i.id || i.menuItemId || `item_${Date.now()}`,
        foodName: i.name || i.foodName || 'Food Item',
        quantity: Number(i.quantity || 1),
        price: Number(i.price || 0),
        image: i.image || ''
      })),
      subtotal: Number(subtotal || totalAmount),
      deliveryCharge: Number(deliveryFee || 0),
      tax: Number(taxes || 0),
      totalAmount: Number(totalAmount),
      rawItems: items
    };

    const created = await orderService.createOrder(orderData as any);

    // Attach raw items to order object for instant client rendering
    (created.order as any).items = items;

    res.status(201).json({
      success: true,
      message: 'Order created and saved to DynamoDB successfully.',
      orderId: created.order.orderId,
      order: created.order,
      items: created.orderItems
    });
  } catch (error: any) {
    console.error('Error creating order in DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save order to DynamoDB database.',
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
    const updated = await orderService.updateOrderStatus(orderId, upperStatus, cancelledBy);

    if (!updated) {
      return res.status(404).json({ success: false, error: `Order [${orderId}] not found.` });
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

// Fetch Orders for a specific Customer
app.get('/api/customer/orders/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const orders = await orderService.getOrdersByCustomer(customerId);
    
    // Fetch all restaurants to resolve human-readable names
    let allRestaurants: any[] = [];
    try {
      allRestaurants = await restaurantService.getAllRestaurants();
    } catch (e) {}

    const enriched = await Promise.all(orders.map(async (o: any) => {
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
        } catch (e) {
          console.warn(`Error fetching items for order ${o.orderId}:`, e);
        }
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

      return {
        ...o,
        restaurantName: resName,
        items: itemsList
      };
    }));

    res.json({ success: true, orders: enriched });
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

    const result = await restaurantService.registerRestaurant({
      restaurantName: name,
      ownerName: data.ownerName || name,
      email: email,
      password: data.password || 'restaurant123',
      phone: data.phone || '',
      address: data.address || '',
      cuisine: data.category || data.cuisine || 'Multi-Cuisine',
      openingTime: data.openingTime || '11:00 AM',
      closingTime: data.closingTime || '11:00 PM',
      logo: data.image || data.logo || '',
      bannerImage: data.image || data.bannerImage || ''
    });

    const saved = result.restaurant;

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
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const isAwsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  if (!isAwsConfigured || !usersTableName) {
    return res.status(500).json({ success: false, error: 'DynamoDB is not configured.' });
  }

  try {
    let matchedUser = null;

    // Fetch from DynamoDB
    const getCommand = new GetCommand({
      TableName: usersTableName,
      Key: { email }
    });
    const response = await dynamoDocClient.send(getCommand);
    if (response.Item && response.Item.password === password) {
      matchedUser = response.Item;
    }

    if (!matchedUser) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    res.json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        phone: matchedUser.phone,
        role: matchedUser.role || 'user'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.', details: error.message });
  }
});


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

    let matchedRestaurant: any = null;

    if (tableName) {
      try {
        const scanCommand = new ScanCommand({ TableName: tableName });
        const scanResponse = await dynamoDocClient.send(scanCommand);
        if (scanResponse.Items) {
          matchedRestaurant = scanResponse.Items.find(
            (item: any) =>
              (item.type === 'restaurant' || item.pk?.startsWith('RESTAURANT#') || item.email) &&
              item.email?.toLowerCase() === email.toLowerCase() &&
              item.password === password
          );
        }
      } catch (err) {
        console.warn('DynamoDB scan failed during restaurant login:', err);
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

// Fetch Menu Items for a specific Restaurant
app.get('/api/restaurant/menu/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const items = await menuService.getMenuByRestaurantId(restaurantId);

    // Map fields for frontend compatibility
    const mapped = items.map(item => ({
      ...item,
      id: item.menuItemId,
      name: item.foodName,
      image: item.foodImage,
      prepTime: item.preparationTime
    }));

    res.json({ success: true, items: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch menu items.', details: error.message });
  }
});

// Save or Update Menu Item
app.post('/api/restaurant/menu', async (req: Request, res: Response) => {
  try {
    const menuItemData = req.body;
    const name = menuItemData.name || menuItemData.foodName;
    const restaurantId = menuItemData.restaurantId;

    if (!menuItemData || !name || !restaurantId) {
      return res.status(400).json({ success: false, error: 'Missing required menu item fields.' });
    }

    const saved = await menuService.saveMenuItem({
      menuItemId: menuItemData.id || menuItemData.menuItemId,
      restaurantId,
      foodName: name,
      description: menuItemData.description,
      category: menuItemData.category,
      price: menuItemData.price,
      preparationTime: menuItemData.prepTime || menuItemData.preparationTime,
      isVeg: menuItemData.isVeg,
      foodImage: menuItemData.image || menuItemData.foodImage,
      isAvailable: menuItemData.isAvailable
    });

    res.json({
      success: true,
      message: 'Menu item saved successfully.',
      item: {
        ...saved,
        id: saved.menuItemId,
        name: saved.foodName,
        image: saved.foodImage,
        prepTime: saved.preparationTime
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save menu item.', details: error.message });
  }
});

// Delete Menu Item
app.delete('/api/restaurant/menu/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    await menuService.deleteMenuItem(itemId);
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
    } catch (e) {}

    const resName = targetRestaurant?.name?.toLowerCase() || '';
    const resIdStr = restaurantId.toLowerCase();

    // 3. Filter orders belonging to this restaurant
    const filteredOrders = allOrders.filter((ord: any) => {
      if (restaurantId === 'all') return true;

      const ordResId = (ord.restaurantId || '').toLowerCase();
      const ordResName = (ord.restaurantName || '').toLowerCase();

      // Direct match on restaurantId
      if (ordResId && (ordResId === resIdStr || ordResId === targetRestaurant?.id?.toLowerCase() || ordResId === targetRestaurant?.restaurantId?.toLowerCase())) {
        return true;
      }

      // Name match
      if (resName && ordResName && (ordResName.includes(resName) || resName.includes(ordResName))) {
        return true;
      }

      // Fallback for single restaurant or RES_DEFAULT
      if (ordResId === 'res_default' || !ordResId) {
        return true;
      }

      return false;
    });

    // 4. Enrich orders with items if missing
    const mapped = await Promise.all(filteredOrders.map(async (ord: any) => {
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
              price: Number(di.price || 0)
            }));
          }
        } catch (e) {}
      }

      return {
        ...ord,
        id: ord.orderId,
        customerPhone: ord.customerPhone || '',
        customerAddress: ord.deliveryAddress,
        total: ord.totalAmount,
        orderStatus: ord.status,
        time: ord.orderedAt,
        items: itemsList
      };
    }));

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

    const updated = {
      ...existing,
      assignedRider,
      updatedAt: new Date().toISOString()
    };

    const putCmd = new PutCommand({
      TableName: ordersTableName,
      Item: updated
    });

    await dynamoDocClient.send(putCmd);

    res.json({
      success: true,
      message: `Assigned delivery partner ${assignedRider} to order ${orderId}.`,
      orderId,
      assignedRider
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

// Get All Registered Delivery Partners for Admin
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
          role: 'DELIVERY_PARTNER'
        }));
    }

    res.json({ success: true, deliveryPartners: partners });
  } catch (error: any) {
    console.error('Error fetching delivery partners:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery partners.' });
  }
});

// Delete Delivery Partner
app.delete('/api/admin/delivery-partners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (usersTableName) {
      await dynamoDocClient.send(
        new DeleteCommand({
          TableName: usersTableName,
          Key: { userId: id }
        })
      );
    }
    res.json({ success: true, message: 'Delivery partner removed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete delivery partner.' });
  }
});

// Get Assigned Orders for a Delivery Partner
app.get('/api/delivery-partner/orders/:partnerIdentifier', async (req: Request, res: Response) => {
  try {
    const { partnerIdentifier } = req.params;
    const cleanId = decodeURIComponent(partnerIdentifier).toLowerCase();

    if (!ordersTableName) {
      return res.status(400).json({ success: false, error: 'Orders table not configured.' });
    }

    const scanCmd = new ScanCommand({ TableName: ordersTableName });
    const scanResp = await dynamoDocClient.send(scanCmd);
    const allOrders = scanResp.Items || [];

    const assignedOrders = allOrders.filter((o: any) => {
      const rider = (o.assignedRider || '').toLowerCase();
      return rider.includes(cleanId) || cleanId.includes(rider);
    });

    res.json({ success: true, orders: assignedOrders });
  } catch (error: any) {
    console.error('Error fetching delivery partner orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assigned orders.' });
  }
});

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

    res.json({ success: true, message: `Order status updated to ${upperStatus}.`, order: updated });
  } catch (error: any) {
    console.error('Error updating order status by delivery partner:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status.' });
  }
});

// Update Restaurant Profile
app.put('/api/restaurant/profile/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const profileUpdates = req.body;

    const updated = await restaurantService.updateProfile(restaurantId, profileUpdates);

    res.json({
      success: true,
      message: 'Restaurant profile updated successfully.',
      profile: updated || profileUpdates
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update restaurant profile.', details: error.message });
  }
});

// Fetch Categories for a specific Restaurant (Dynamic from DynamoDB, no hardcoded defaults)
app.get('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const customCategories: string[] = [];

    // 1. Scan main table for saved categories
    if (tableName) {
      const command = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(command);
      (response.Items || [])
        .filter((item: any) => item.type === 'category' && item.restaurantId === restaurantId)
        .forEach((item: any) => {
          if (item.name && !customCategories.includes(item.name.trim())) {
            customCategories.push(item.name.trim());
          }
        });
    }

    // 2. Scan foodway-menu-items table for categories on food items
    try {
      const menuItems = await menuService.getMenuByRestaurantId(restaurantId);
      menuItems.forEach((item: any) => {
        if (item.category && item.category.trim() && !customCategories.includes(item.category.trim())) {
          customCategories.push(item.category.trim());
        }
      });
    } catch (e) {
      console.warn('Error fetching menu items for categories:', e);
    }

    res.json({ success: true, categories: customCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant categories.', details: error.message });
  }
});

// Add New Category for a specific Restaurant (Persists to DynamoDB)
app.post('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const categoryName = name.trim();
    const categoryId = `cat_${Date.now()}`;

    if (tableName) {
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          pk: `CATEGORY#${restaurantId}#${categoryId}`,
          email: `CATEGORY#${restaurantId}#${categoryId}`,
          id: categoryId,
          restaurantId,
          name: categoryName,
          type: 'category',
          createdAt: new Date().toISOString()
        }
      });
      await dynamoDocClient.send(command);
    }

    // Gather all categories after adding
    const customCategories: string[] = [categoryName];

    if (tableName) {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(scanCommand);
      (response.Items || [])
        .filter((item: any) => item.type === 'category' && item.restaurantId === restaurantId)
        .forEach((item: any) => {
          if (item.name && !customCategories.includes(item.name.trim())) {
            customCategories.push(item.name.trim());
          }
        });
    }

    try {
      const menuItems = await menuService.getMenuByRestaurantId(restaurantId);
      menuItems.forEach((item: any) => {
        if (item.category && item.category.trim() && !customCategories.includes(item.category.trim())) {
          customCategories.push(item.category.trim());
        }
      });
    } catch (e) {}

    res.json({ success: true, message: 'Category added successfully.', category: categoryName, categories: customCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save category.', details: error.message });
  }
});

// Update/Rename Category for a specific Restaurant
app.put('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { oldName, newName } = req.body;

    if (!oldName || !newName || !newName.trim()) {
      return res.status(400).json({ success: false, error: 'Old and new category names are required.' });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    // 1. Update Category items in main table
    if (tableName) {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(scanCommand);
      const categoryItems = (response.Items || []).filter(
        (item: any) => item.type === 'category' && item.restaurantId === restaurantId && item.name === trimmedOld
      );

      for (const catItem of categoryItems) {
        await dynamoDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: { ...catItem, name: trimmedNew, updatedAt: new Date().toISOString() }
          })
        );
      }
    }

    // 2. Update category field on any food items matching trimmedOld in foodway-menu-items table
    try {
      const menuItems = await menuService.getMenuByRestaurantId(restaurantId);
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

    // Fetch updated categories list
    const updatedCategories: string[] = [];
    if (tableName) {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(scanCommand);
      (response.Items || [])
        .filter((item: any) => item.type === 'category' && item.restaurantId === restaurantId)
        .forEach((item: any) => {
          if (item.name && !updatedCategories.includes(item.name.trim())) {
            updatedCategories.push(item.name.trim());
          }
        });
    }

    try {
      const menuItems = await menuService.getMenuByRestaurantId(restaurantId);
      menuItems.forEach((item: any) => {
        if (item.category && item.category.trim() && !updatedCategories.includes(item.category.trim())) {
          updatedCategories.push(item.category.trim());
        }
      });
    } catch (e) {}

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

// Delete Category for a specific Restaurant (Deletes category item & updates food item categories)
app.delete('/api/restaurant/categories/:restaurantId/:categoryName', async (req: Request, res: Response) => {
  try {
    const { restaurantId, categoryName } = req.params;
    const targetCat = decodeURIComponent(categoryName).trim();
    const normalizedTarget = normalizeCatName(targetCat);

    // 1. Delete matching category items from main table
    if (tableName) {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(scanCommand);
      const categoryItems = (response.Items || []).filter(
        (item: any) =>
          item.type === 'category' &&
          item.restaurantId === restaurantId &&
          (item.name === targetCat || normalizeCatName(item.name) === normalizedTarget)
      );

      for (const catItem of categoryItems) {
        await dynamoDocClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { pk: catItem.pk, email: catItem.email }
          })
        );
      }
    }

    // 2. Update food items in foodway-menu-items table matching targetCat
    try {
      const menuItems = await menuService.getMenuByRestaurantId(restaurantId);
      for (const item of menuItems) {
        if (item.category === targetCat || normalizeCatName(item.category) === normalizedTarget) {
          await menuService.saveMenuItem({
            ...item,
            category: 'Uncategorized'
          });
        }
      }
    } catch (e) {
      console.warn('Error clearing food item categories on delete:', e);
    }

    // 3. Fetch remaining categories
    const remainingCategories: string[] = [];
    if (tableName) {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(scanCommand);
      (response.Items || [])
        .filter((item: any) => item.type === 'category' && item.restaurantId === restaurantId)
        .forEach((item: any) => {
          if (
            item.name &&
            item.name.trim() !== targetCat &&
            normalizeCatName(item.name) !== normalizedTarget &&
            !remainingCategories.includes(item.name.trim())
          ) {
            remainingCategories.push(item.name.trim());
          }
        });
    }

    try {
      const menuItems = await menuService.getMenuByRestaurantId(restaurantId);
      menuItems.forEach((item: any) => {
        if (
          item.category &&
          item.category.trim() !== 'Uncategorized' &&
          item.category.trim() !== targetCat &&
          normalizeCatName(item.category) !== normalizedTarget &&
          !remainingCategories.includes(item.category.trim())
        ) {
          remainingCategories.push(item.category.trim());
        }
      });
    } catch (e) {}

    res.json({ success: true, message: `Category "${targetCat}" deleted successfully.`, categories: remainingCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete category.', details: error.message });
  }
});

// Start the server
httpServer.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 Foodway Secure Backend Server with Real-Time WebSockets running on http://localhost:${PORT}`);
  console.log(`📦 AWS S3 client initialized (Bucket: ${bucketName || 'not set'}, Region: ${process.env.AWS_S3_REGION || 'ap-south-2'})`);
  console.log(`🗄️ AWS DynamoDB client initialized (Table: ${tableName || 'not set'}, Region: ${process.env.AWS_DYNAMODB_REGION || 'eu-north-1'})`);

  // Verify or create all 6 DynamoDB tables
  await ensureAllTablesExist();
});

export default app;
