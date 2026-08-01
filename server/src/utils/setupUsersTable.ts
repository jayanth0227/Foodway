import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { dynamoDocClient, usersTableName } from '../config/aws';

export async function ensureUsersTableExists() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('ℹ️ AWS credentials not set. Skipping DynamoDB users table creation.');
    return;
  }

  try {
    const describeCommand = new DescribeTableCommand({ TableName: usersTableName });
    await dynamoDocClient.send(describeCommand);
    console.log(`🗄️ DynamoDB Users Table "${usersTableName}" verified.`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`🗄️ DynamoDB Users Table "${usersTableName}" not found. Creating it...`);
      try {
        const createCommand = new CreateTableCommand({
          TableName: usersTableName,
          KeySchema: [
            { AttributeName: 'email', KeyType: 'HASH' }
          ],
          AttributeDefinitions: [
            { AttributeName: 'email', AttributeType: 'S' }
          ],
          BillingMode: 'PAY_PER_REQUEST'
        });
        
        // Use the base client inside dynamoDocClient to send the raw CreateTableCommand
        const baseClient = (dynamoDocClient as any).client || dynamoDocClient;
        await baseClient.send(createCommand);
        console.log(`🗄️ DynamoDB Users Table "${usersTableName}" created successfully.`);
      } catch (createErr: any) {
        console.error('❌ Failed to create DynamoDB users table:', createErr.message || createErr);
      }
    } else {
      console.error('❌ Error checking DynamoDB users table:', error.message || error);
    }
  }
}
