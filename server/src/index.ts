import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import AWS SDK Command helpers
import { ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { s3Client, dynamoDocClient, bucketName, tableName, usersTableName } from './config/aws';
import { uploadAndSeedVideos } from './utils/videoUploader';
import { ensureUsersTableExists } from './utils/setupUsersTable';
import restaurantRouter from './routes/restaurant.routes';

const app = express();
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

// Save or Update Restaurant record in DynamoDB
app.post('/api/admin/restaurant', async (req: Request, res: Response) => {
  try {
    const restaurant = req.body;

    if (!restaurant || !restaurant.id || !restaurant.name) {
      return res.status(400).json({ success: false, error: 'Missing required restaurant parameters.' });
    }

    const isAwsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && tableName);
    
    if (isAwsConfigured && tableName) {
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          ...restaurant,
          pk: `RESTAURANT#${restaurant.id}`,
          type: 'restaurant',
          updatedAt: new Date().toISOString()
        }
      });

      await dynamoDocClient.send(command);

      return res.json({
        success: true,
        message: 'Restaurant saved to DynamoDB successfully.',
        storedInDynamoDB: true,
        restaurant
      });
    }

    // Fallback if AWS DynamoDB table is not configured
    res.json({
      success: true,
      message: 'Restaurant saved locally (DynamoDB not configured in environment).',
      storedInDynamoDB: false,
      restaurant
    });
  } catch (error: any) {
    console.error('Error saving restaurant to DynamoDB:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save restaurant to DynamoDB.', 
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
    if (!tableName) {
      return res.json({ success: true, items: [] });
    }

    const command = new ScanCommand({ TableName: tableName });
    const response = await dynamoDocClient.send(command);
    const menuItems = (response.Items || []).filter(
      (item: any) => item.type === 'menu_item' && item.restaurantId === restaurantId
    );

    res.json({ success: true, items: menuItems });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch menu items.', details: error.message });
  }
});

// Save or Update Menu Item
app.post('/api/restaurant/menu', async (req: Request, res: Response) => {
  try {
    const menuItem = req.body;
    if (!menuItem || !menuItem.name || !menuItem.restaurantId) {
      return res.status(400).json({ success: false, error: 'Missing required menu item fields.' });
    }

    if (tableName) {
      const itemId = menuItem.id || `food_${Date.now()}`;
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          ...menuItem,
          id: itemId,
          pk: `MENU#${itemId}`,
          type: 'menu_item',
          updatedAt: new Date().toISOString()
        }
      });
      await dynamoDocClient.send(command);
    }

    res.json({ success: true, message: 'Menu item saved successfully.', item: menuItem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save menu item.', details: error.message });
  }
});

// Delete Menu Item
app.delete('/api/restaurant/menu/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    if (tableName) {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: { pk: `MENU#${itemId}`, email: `MENU#${itemId}` }
      });
      await dynamoDocClient.send(command);
    }
    res.json({ success: true, message: 'Menu item deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete menu item.', details: error.message });
  }
});

// Fetch Orders for a specific Restaurant
app.get('/api/restaurant/orders/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    if (!tableName) {
      return res.json({ success: true, orders: [] });
    }

    const command = new ScanCommand({ TableName: tableName });
    const response = await dynamoDocClient.send(command);
    const orders = (response.Items || []).filter(
      (item: any) => item.type === 'order' && (item.restaurantId === restaurantId || item.restaurant === restaurantId)
    );

    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant orders.', details: error.message });
  }
});

// Update Order Status
app.put('/api/restaurant/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (tableName) {
      const getCommand = new GetCommand({ TableName: tableName, Key: { pk: `ORDER#${orderId}` } });
      const getResp = await dynamoDocClient.send(getCommand);
      if (getResp.Item) {
        const updatedItem = {
          ...getResp.Item,
          orderStatus: status,
          status: status,
          updatedAt: new Date().toISOString()
        };
        const putCommand = new PutCommand({ TableName: tableName, Item: updatedItem });
        await dynamoDocClient.send(putCommand);
      }
    }

    res.json({ success: true, message: `Order status updated to ${status}.`, orderId, status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update order status.', details: error.message });
  }
});

// Update Restaurant Profile
app.put('/api/restaurant/profile/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const profileUpdates = req.body;

    if (tableName) {
      const putCommand = new PutCommand({
        TableName: tableName,
        Item: {
          ...profileUpdates,
          pk: `RESTAURANT#${restaurantId}`,
          id: restaurantId,
          type: 'restaurant',
          updatedAt: new Date().toISOString()
        }
      });
      await dynamoDocClient.send(putCommand);
    }

    res.json({ success: true, message: 'Restaurant profile updated successfully.', profile: profileUpdates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update restaurant profile.', details: error.message });
  }
});

// Fetch Categories for a specific Restaurant
app.get('/api/restaurant/categories/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const defaultCategories = ['Starters', 'Main Course', 'Breads', 'Desserts', 'Beverages'];
    
    if (!tableName) {
      return res.json({ success: true, categories: defaultCategories });
    }

    const command = new ScanCommand({ TableName: tableName });
    const response = await dynamoDocClient.send(command);
    const customCategories = (response.Items || [])
      .filter((item: any) => item.type === 'category' && item.restaurantId === restaurantId)
      .map((item: any) => item.name);

    const allCategories = Array.from(new Set([...defaultCategories, ...customCategories]));
    res.json({ success: true, categories: allCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant categories.', details: error.message });
  }
});

// Add New Category for a specific Restaurant
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

    const defaultCategories = ['Starters', 'Main Course', 'Breads', 'Desserts', 'Beverages'];
    let allCategories = [...defaultCategories, categoryName];

    if (tableName) {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const response = await dynamoDocClient.send(scanCommand);
      const customCategories = (response.Items || [])
        .filter((item: any) => item.type === 'category' && item.restaurantId === restaurantId)
        .map((item: any) => item.name);
      allCategories = Array.from(new Set([...defaultCategories, ...customCategories]));
    }

    res.json({ success: true, message: 'Category added successfully.', category: categoryName, categories: allCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save category.', details: error.message });
  }
});

// Start the server
app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 Foodway Secure Backend Server running on http://localhost:${PORT} and accepting local network requests`);
  console.log(`📦 AWS S3 client initialized (Bucket: ${bucketName || 'not set'}, Region: ${process.env.AWS_S3_REGION || 'ap-south-2'})`);
  console.log(`🗄️ AWS DynamoDB client initialized (Table: ${tableName || 'not set'}, Region: ${process.env.AWS_DYNAMODB_REGION || 'eu-north-1'})`);
  
  // Verify or create the DynamoDB users table
  await ensureUsersTableExists();
});

export default app;
