import express, { Request, Response } from 'express';
import { createServer } from 'http';
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

import { s3Client, dynamoDocClient, bucketName, tableName, usersTableName, menuItemsTableName, ordersTableName } from './config/aws';
import { uploadAndSeedVideos } from './utils/videoUploader';
import { ensureAllTablesExist } from './utils/setupTables';
import restaurantRouter from './routes/restaurant.routes';
import authRouter from './routes/auth.routes';
import notificationRouter from './routes/notification.routes';
import deliveryLocationRouter from './routes/deliveryLocation.routes';
import { menuService } from './services/menu.service';
import { orderService } from './services/order.service';
import { orderItemRepository } from './repositories/orderItem.repository';
import { RestaurantStatus } from './types/enums';
import shopService, { restaurantService } from './services/restaurant.service';
import { shopRepository } from './repositories/shop.repository';
import { userService } from './services/user.service';
import { hashPassword } from './utils/hash.utils';
import { generateUserId } from './utils/idGenerator';
import { socketService } from './services/socket.service';
import categoryService from './services/category.service';

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

import shopRouter from './routes/shop.routes';

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

// Platform System Settings State (Delivery Fee per KM & Base Rate)
let platformSettings = {
  deliveryFeePerKm: 15,
  baseDeliveryFee: 25,
  freeDeliveryThreshold: 0
};

// GET Admin System Settings
app.get('/api/admin/settings', (req: Request, res: Response) => {
  res.json({ success: true, settings: platformSettings });
});

// UPDATE Admin System Settings (Delivery Charge Per KM & Base Rate)
app.put('/api/admin/settings', (req: Request, res: Response) => {
  try {
    const { deliveryFeePerKm, baseDeliveryFee, freeDeliveryThreshold } = req.body;
    if (typeof deliveryFeePerKm === 'number' && !isNaN(deliveryFeePerKm) && deliveryFeePerKm >= 0) {
      platformSettings.deliveryFeePerKm = Number(deliveryFeePerKm);
    }
    if (typeof baseDeliveryFee === 'number' && !isNaN(baseDeliveryFee) && baseDeliveryFee >= 0) {
      platformSettings.baseDeliveryFee = Number(baseDeliveryFee);
    }
    if (typeof freeDeliveryThreshold === 'number' && !isNaN(freeDeliveryThreshold) && freeDeliveryThreshold >= 0) {
      platformSettings.freeDeliveryThreshold = Number(freeDeliveryThreshold);
    }
    res.json({
      success: true,
      message: 'Delivery fee settings updated successfully.',
      settings: platformSettings
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
});

// In-memory Multi-device Cart Store (persisted to DynamoDB user profile)
const activeUserCarts = new Map<string, any[]>();

// Fetch User Active Cart for Multi-Device Sync
app.get('/api/cart/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    let items = activeUserCarts.get(userId);
    if (!items && tableName) {
      const dbUser = await userService.getUserById(userId);
      if (dbUser && Array.isArray((dbUser as any).activeCart)) {
        items = (dbUser as any).activeCart;
        activeUserCarts.set(userId, items || []);
      }
    }
    res.json({ success: true, cartItems: items || [] });
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
    activeUserCarts.set(userId, items);

    // Save to DynamoDB user record asynchronously
    userService.updateProfile(userId, { activeCart: items } as any).catch(() => {});

    // Broadcast WebSocket event to user room
    socketService.emitCartUpdated(userId, items);

    res.json({ success: true, message: 'Cart synchronized across devices.', cartItems: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to sync cart.' });
  }
});

// Public Endpoint to fetch Delivery Rates for Cart Calculation
app.get('/api/settings/delivery', (req: Request, res: Response) => {
  res.json({ success: true, ...platformSettings });
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
      const isClosed = r.isOpen === false || r.isOpen === 'false' || r.status === 'closed' || r.status === 'inactive' || r.status === 'INACTIVE' || r.status === 'OFFLINE' || r.status === 'offline' || r.status === 'CLOSED';
      const resId = r.shopId || r.restaurantId || r.id;
      const resName = r.shopName || r.restaurantName || r.name;
      return {
        id: resId,
        shopId: resId,
        restaurantId: resId,
        name: resName,
        shopName: resName,
        restaurantName: resName,
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
      image: item.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
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


// Public Endpoint: Fetch All Unique Categories dynamically from DynamoDB
app.get('/api/public/categories', async (req: Request, res: Response) => {
  try {
    const categoryMap: Record<string, { id: string; name: string; description: string; itemCount: number; restaurants: Set<string>; image: string }> = {};

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
            image: c.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'
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
            image: item.foodImage || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'
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
                image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'
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
      image: c.image
    }));

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
    } catch (e) { }

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
      restaurantName: bodyResName
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must contain at least one item.' });
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
    const parentOrderId = `ORD-${Date.now()}`;
    const createdSubOrders: any[] = [];

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

      // Append suffix if multiple vendors in order
      const subOrderId = vendorIds.length > 1 ? `${parentOrderId}-${index + 1}` : parentOrderId;

      const orderData = {
        orderId: subOrderId,
        parentOrderId,
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

      // Attach raw items to order object
      (created.order as any).items = vItems;

      // ⚡ Real-Time Socket Emission to Merchant Room & Broadcast
      try {
        if (socketService) {
          socketService.emitOrderCreated(newOrderObj);
          socketService.getIO().emit('order_created', newOrderObj);
          console.log(`📡 [Real-Time Order Alert] Emitted order_created for Order #${created.order.orderId} to vendor ${vId}`);
        }
      } catch (e: any) {
        console.warn('⚠️ Socket emission error on order creation:', e?.message);
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
    const updated = await orderService.updateOrderStatus(orderId, upperStatus, cancelledBy);

    if (!updated) {
      return res.status(404).json({ success: false, error: `Order [${orderId}] not found.` });
    }

    // ⚡ Real-Time Socket Emissions for Admin, Vendors, Riders & Customers
    try {
      if (socketService) {
        // Emit general order status update to customer, order, and restaurant rooms
        socketService.emitOrderStatusUpdated(updated);
        socketService.emitRiderStatusUpdated(updated);
        socketService.getIO().emit('order_status_updated', updated);
        socketService.getIO().emit('rider_status_updated', updated);

        const st = String(updated.status || status).toLowerCase();
        console.log(`📡 [Real-Time Socket Event Triggered] Order #${orderId} Status Changed to: ${st}`);

        // Broadcast READY or ASSIGNED order events to all riders
        if (st === 'ready' || st === 'ready_for_pickup' || st === 'ready for pickup' || st === 'assigned') {
          console.log(`📡 [Real-Time Socket] Emitting order_ready_pickup & order_assigned for Order #${orderId}`);
          socketService.emitOrderReadyForPickup(updated);
          socketService.getIO().emit('order_ready_pickup', updated);
          socketService.getIO().emit('order_assigned', updated);
          socketService.getIO().to('delivery_riders').emit('order_assigned', updated);
        }

        // Broadcast DELIVERED order event to Admin & Vendor shops for real-time count updates
        if (st === 'delivered' || st === 'completed') {
          console.log(`📡 [Real-Time Socket] Emitting order_delivered for Order #${orderId} to Admin & Vendor Shops`);
          socketService.getIO().emit('order_delivered', updated);
          if (updated.restaurantId) {
            socketService.getIO().to(`restaurant_${updated.restaurantId}`).emit('order_delivered', updated);
          }
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

    const saved = result.shop || (result as any).restaurant;

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
      if (socketService && socketService.getIO()) {
        console.log('📢 Emitting partner_duty_updated via WebSocket:', { userId, name, email, isOnDuty, dutyStatus });
        socketService.getIO().emit('partner_duty_updated', { userId, name, email, isOnDuty, dutyStatus });
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

// Start the server
httpServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use (EADDRINUSE). Please kill the process using port ${PORT} or set a different PORT in .env.`);
  } else {
    console.error('❌ Server error:', err);
  }
});

httpServer.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 Foodway Secure Backend Server with Real-Time WebSockets running on http://localhost:${PORT}`);

  console.log(`📦 AWS S3 client initialized (Bucket: ${bucketName || 'not set'}, Region: ${process.env.AWS_S3_REGION || 'ap-south-2'})`);
  console.log(`🗄️ AWS DynamoDB client initialized (Table: ${tableName || 'not set'}, Region: ${process.env.AWS_DYNAMODB_REGION || 'eu-north-1'})`);

    // Verify SMTP connection
  await verifySMTP();
  
  // Verify or create all 6 DynamoDB tables
  await ensureAllTablesExist();
});

export default app;

