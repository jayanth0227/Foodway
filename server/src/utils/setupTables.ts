import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  dynamoDocClient,
  usersTableName,
  shopsTableName,
  itemsTableName,
  restaurantsTableName,
  menuItemsTableName,
  ordersTableName,
  orderItemsTableName,
  deliveryTableName,
  deliveryLocationsTableName
} from '../config/aws';

async function verifyOrCreateTable(tableName: string, keySchema: any[], attributeDefinitions: any[], globalSecondaryIndexes?: any[]) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return;
  }

  try {
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    await dynamoDocClient.send(describeCommand);
    console.log(`🗄️ DynamoDB Table "${tableName}" verified.`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`🗄️ DynamoDB Table "${tableName}" not found. Creating table...`);
      try {
        const createParams: any = {
          TableName: tableName,
          KeySchema: keySchema,
          AttributeDefinitions: attributeDefinitions,
          BillingMode: 'PAY_PER_REQUEST'
        };

        if (globalSecondaryIndexes && globalSecondaryIndexes.length > 0) {
          createParams.GlobalSecondaryIndexes = globalSecondaryIndexes;
        }

        const baseClient = (dynamoDocClient as any).client || dynamoDocClient;
        await baseClient.send(new CreateTableCommand(createParams));
        console.log(`🗄️ DynamoDB Table "${tableName}" created successfully.`);
      } catch (createErr: any) {
        console.error(`❌ Failed to create table "${tableName}":`, createErr.message || createErr);
      }
    }
  }
}

export async function ensureAllTablesExist() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('ℹ️ AWS credentials not configured. Skipping DynamoDB table verification.');
    return;
  }

  // 1. foodway-users (PK: userId)
  await verifyOrCreateTable(
    usersTableName,
    [{ AttributeName: 'userId', KeyType: 'HASH' }],
    [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );

  // 2. foodway-shops (PK: shopId, GSI: ownerUserId-index)
  await verifyOrCreateTable(
    shopsTableName,
    [{ AttributeName: 'shopId', KeyType: 'HASH' }],
    [
      { AttributeName: 'shopId', AttributeType: 'S' },
      { AttributeName: 'ownerUserId', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'ownerUserId-index',
        KeySchema: [{ AttributeName: 'ownerUserId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );

  // 3. foodway-items (PK: itemId, GSIs: shopId-index, restaurantId-index)
  await verifyOrCreateTable(
    itemsTableName,
    [{ AttributeName: 'itemId', KeyType: 'HASH' }],
    [
      { AttributeName: 'itemId', AttributeType: 'S' },
      { AttributeName: 'shopId', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'shopId-index',
        KeySchema: [{ AttributeName: 'shopId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );

  // 4. foodway-orders (PK: orderId, GSIs: customerId-index, restaurantId-index, status-index)
  await verifyOrCreateTable(
    ordersTableName,
    [{ AttributeName: 'orderId', KeyType: 'HASH' }],
    [
      { AttributeName: 'orderId', AttributeType: 'S' },
      { AttributeName: 'customerId', AttributeType: 'S' },
      { AttributeName: 'restaurantId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'customerId-index',
        KeySchema: [{ AttributeName: 'customerId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'restaurantId-index',
        KeySchema: [{ AttributeName: 'restaurantId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'status-index',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );

  // 5. foodway-order-items (PK: orderItemId, GSI: orderId-index)
  await verifyOrCreateTable(
    orderItemsTableName,
    [{ AttributeName: 'orderItemId', KeyType: 'HASH' }],
    [
      { AttributeName: 'orderItemId', AttributeType: 'S' },
      { AttributeName: 'orderId', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'orderId-index',
        KeySchema: [{ AttributeName: 'orderId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );

  // 6. foodway-delivery (PK: deliveryId, GSIs: deliveryUserId-index, orderId-index, status-index)
  await verifyOrCreateTable(
    deliveryTableName,
    [{ AttributeName: 'deliveryId', KeyType: 'HASH' }],
    [
      { AttributeName: 'deliveryId', AttributeType: 'S' },
      { AttributeName: 'deliveryUserId', AttributeType: 'S' },
      { AttributeName: 'orderId', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'deliveryUserId-index',
        KeySchema: [{ AttributeName: 'deliveryUserId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'orderId-index',
        KeySchema: [{ AttributeName: 'orderId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );

  // 7. foodway-delivery-locations (PK: locationId, GSI: status-index)
  await verifyOrCreateTable(
    deliveryLocationsTableName,
    [{ AttributeName: 'locationId', KeyType: 'HASH' }],
    [
      { AttributeName: 'locationId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' }
    ],
    [
      {
        IndexName: 'status-index',
        KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  );
}
