import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';
const dynamoRegion = process.env.AWS_DYNAMODB_REGION || 'eu-north-1';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

if (!accessKeyId || !secretAccessKey) {
  console.warn('⚠️ WARNING: AWS credentials are not set in environment variables.');
}

// Initialize S3 client
export const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: dynamoRegion,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Create DynamoDB Document Client helper
export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
export const tableName = process.env.AWS_DYNAMODB_TABLE_NAME || 'mk-delivery-services';

// Clean Architecture Production Table Names
export const usersTableName = process.env.AWS_DYNAMODB_USERS_TABLE_NAME || 'foodway-users';
export const shopsTableName = process.env.AWS_DYNAMODB_SHOPS_TABLE_NAME || 'foodway-shops';
export const restaurantsTableName = shopsTableName; // Backward compatibility alias
export const itemsTableName = process.env.AWS_DYNAMODB_ITEMS_TABLE_NAME || 'foodway-items';
export const menuItemsTableName = itemsTableName; // Backward compatibility alias
export const ordersTableName = process.env.AWS_DYNAMODB_ORDERS_TABLE_NAME || 'foodway-orders';
export const orderItemsTableName = process.env.AWS_DYNAMODB_ORDER_ITEMS_TABLE_NAME || 'foodway-order-items';
export const deliveryTableName = process.env.AWS_DYNAMODB_DELIVERY_TABLE_NAME || 'foodway-delivery';
export const deliveryLocationsTableName = process.env.AWS_DYNAMODB_DELIVERY_LOCATIONS_TABLE_NAME || 'foodway-delivery-locations';
export const categoriesTableName = process.env.AWS_DYNAMODB_CATEGORIES_TABLE_NAME || 'foodway-categories';


