import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';
const dynamoRegion = process.env.AWS_DYNAMODB_REGION || 'ap-south-2';

// Check for explicit AWS credentials in environment variables or .env
// In AWS Lambda, AWS injects temporary credentials into AWS_ACCESS_KEY_ID (starting with ASIA)
// which require AWS_SESSION_TOKEN. We prioritize explicit permanent IAM user keys (AKIA*),
// or pass the complete session token if running under Lambda's temporary STS role.
const staticAccessKey = process.env.FOODWAY_AWS_ACCESS_KEY_ID || 
  (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID.startsWith('AKIA') ? process.env.AWS_ACCESS_KEY_ID : undefined);
const staticSecretKey = process.env.FOODWAY_AWS_SECRET_ACCESS_KEY || 
  (staticAccessKey ? process.env.AWS_SECRET_ACCESS_KEY : undefined);

let credentials: any = undefined;

if (staticAccessKey && staticSecretKey) {
  credentials = {
    accessKeyId: staticAccessKey,
    secretAccessKey: staticSecretKey,
  };
} else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SESSION_TOKEN) {
  credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

// Initialize S3 client (uses static keys if provided, else falls back to default SDK credential chain / IAM role)
export const s3Client = new S3Client({
  region: s3Region,
  ...(credentials ? { credentials } : {})
});

// Initialize DynamoDB client (uses static keys if provided, else falls back to default SDK credential chain / IAM role)
const dynamoClient = new DynamoDBClient({
  region: dynamoRegion,
  ...(credentials ? { credentials } : {})
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
export const settingsTableName = process.env.AWS_DYNAMODB_SETTINGS_TABLE_NAME || 'foodway-settings';
export const reviewsTableName = process.env.AWS_DYNAMODB_REVIEWS_TABLE_NAME || 'foodway-reviews';


