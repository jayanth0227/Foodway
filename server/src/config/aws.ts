import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });


const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';
const dynamoRegion = process.env.AWS_DYNAMODB_REGION || 'eu-north-1';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

if (!accessKeyId || !secretAccessKey) {
  console.warn('⚠️ WARNING: AWS credentials are not set in the environment variables.');
}

// Initialize the S3 client
export const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Initialize the DynamoDB client
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
export const tableName = process.env.AWS_DYNAMODB_TABLE_NAME || '';
export const usersTableName = process.env.AWS_DYNAMODB_USERS_TABLE_NAME || 'foodway-users';
