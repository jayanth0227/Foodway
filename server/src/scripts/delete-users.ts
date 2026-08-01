import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, usersTableName } from '../config/aws';

async function deleteAllUsers() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('ℹ️ AWS credentials not set. No DynamoDB users to delete.');
    return;
  }

  if (!usersTableName) {
    console.log('ℹ️ Users table name is not configured.');
    return;
  }

  try {
    console.log(`🔍 Scanning users in DynamoDB table "${usersTableName}"...`);
    const scanCommand = new ScanCommand({ TableName: usersTableName });
    const response = await dynamoDocClient.send(scanCommand);
    
    const users = response.Items || [];
    if (users.length === 0) {
      console.log('ℹ️ No users found in DynamoDB table.');
      return;
    }

    console.log(`🗑️ Deleting ${users.length} users...`);
    for (const user of users) {
      if (user.email === 'admin@foodway.com' || user.role === 'admin') {
        console.log(`⏭️ Skipping admin: ${user.email}`);
        continue;
      }
      const deleteCommand = new DeleteCommand({
        TableName: usersTableName,
        Key: { email: user.email }
      });
      await dynamoDocClient.send(deleteCommand);
      console.log(`✅ Deleted user: ${user.email}`);
    }
    console.log('🎉 DynamoDB clean up complete.');
  } catch (error: any) {
    console.error('❌ Failed to delete users from DynamoDB:', error.message || error);
  }
}

deleteAllUsers();
