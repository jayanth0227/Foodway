import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before importing app
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from './index';
import { socketService } from './services/socket.service';
import { verifySMTP } from './config/email';
import { ensureAllTablesExist } from './utils/setupTables';
import { bucketName, tableName } from './config/aws';

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO for real-time features
const httpServer = createServer(app);
socketService.initialize(httpServer);

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
  console.log(`🗄️ AWS DynamoDB client initialized (Table: ${tableName || 'not set'}, Region: ${process.env.AWS_DYNAMODB_REGION || 'ap-south-2'})`);

  // Verify SMTP connection
  await verifySMTP();

  // Verify or create all DynamoDB tables
  await ensureAllTablesExist();
});
