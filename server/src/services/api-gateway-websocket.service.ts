import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  DeleteConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi';
import { dynamoDocClient, usersTableName, ordersTableName } from '../config/aws';
import { UpdateCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import userRepository from '../repositories/user.repository';

export class ApiGatewayWebSocketService {
  private client: ApiGatewayManagementApiClient | null = null;
  private endpoint: string = '';

  constructor() {
    this.initClient();
  }

  private initClient() {
    let ep = process.env.WEBSOCKET_API_ENDPOINT || '';
    if (ep) {
      // Normalize endpoint: ensure it uses https:// (not wss://) for AWS SDK PostToConnection
      ep = ep.replace(/^wss:\/\//i, 'https://').replace(/\/$/, '');
      this.endpoint = ep;
      this.client = new ApiGatewayManagementApiClient({
        endpoint: this.endpoint,
        region: process.env.AWS_DYNAMODB_REGION || process.env.AWS_S3_REGION || 'ap-south-2'
      });
    }
  }

  private getClient(): ApiGatewayManagementApiClient | null {
    if (!this.client) {
      this.initClient();
    }
    return this.client;
  }

  // 1. Post JSON payload directly to a specific connectionId
  async postToConnection(connectionId: string, eventName: string, data: any): Promise<boolean> {
    if (!connectionId) return false;
    const client = this.getClient();
    if (!client) {
      return false;
    }

    try {
      const payloadString = JSON.stringify({
        event: eventName,
        type: eventName,
        action: eventName,
        data
      });

      await client.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(payloadString)
        })
      );
      return true;
    } catch (err: any) {
      console.warn(`⚠️ API Gateway PostToConnection error for connectionId [${connectionId}]:`, err?.message);
      if (err.name === 'GoneException' || err.$metadata?.httpStatusCode === 410) {
        // Stale connection ID, clear from foodway-users
        this.clearStaleConnection(connectionId).catch(() => {});
      }
      return false;
    }
  }

  // Clear stale connectionId from DynamoDB
  private async clearStaleConnection(connectionId: string): Promise<void> {
    try {
      const scanRes = await dynamoDocClient.send(
        new ScanCommand({
          TableName: usersTableName,
          FilterExpression: 'socketConnectionId = :cid',
          ExpressionAttributeValues: { ':cid': connectionId }
        })
      );
      for (const item of scanRes.Items || []) {
        const key: any = {};
        if (item.userId) key.userId = item.userId;
        else if (item.email) key.email = item.email;
        else if (item.id) key.id = item.id;

        if (Object.keys(key).length > 0) {
          await dynamoDocClient.send(
            new UpdateCommand({
              TableName: usersTableName,
              Key: key,
              UpdateExpression: 'REMOVE socketConnectionId, lastSocketConnectedAt'
            })
          );
        }
      }
    } catch (e) {}
  }

  // 2. Lookup recipient connection IDs for Socket.IO-equivalent rooms using existing tables
  async getConnectionsForRoom(room: string): Promise<string[]> {
    const connectionIds = new Set<string>();
    const cleanRoom = room.trim();

    try {
      if (cleanRoom === 'admin') {
        // Find users where role = 'ADMIN'
        const scanRes = await dynamoDocClient.send(
          new ScanCommand({
            TableName: usersTableName,
            FilterExpression: '#role = :r AND attribute_exists(socketConnectionId)',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':r': 'ADMIN' }
          })
        );
        (scanRes.Items || []).forEach(item => {
          if (item.socketConnectionId) connectionIds.add(item.socketConnectionId);
        });
      } else if (cleanRoom.startsWith('restaurant_')) {
        const shopId = cleanRoom.replace('restaurant_', '');
        const scanRes = await dynamoDocClient.send(
          new ScanCommand({
            TableName: usersTableName,
            FilterExpression: '(shopId = :sid OR restaurantId = :sid OR userId = :sid OR id = :sid) AND attribute_exists(socketConnectionId)',
            ExpressionAttributeValues: { ':sid': shopId }
          })
        );
        (scanRes.Items || []).forEach(item => {
          if (item.socketConnectionId) connectionIds.add(item.socketConnectionId);
        });
      } else if (cleanRoom.startsWith('user_')) {
        const userId = cleanRoom.replace('user_', '');
        try {
          const userItem = await userRepository.findByUserId(userId) || await userRepository.findByIdentifier(userId);
          if (userItem && (userItem as any).socketConnectionId) {
            connectionIds.add((userItem as any).socketConnectionId);
          } else {
            const scanRes = await dynamoDocClient.send(
              new ScanCommand({
                TableName: usersTableName,
                FilterExpression: '(userId = :uid OR id = :uid OR email = :uid) AND attribute_exists(socketConnectionId)',
                ExpressionAttributeValues: { ':uid': userId }
              })
            );
            (scanRes.Items || []).forEach(item => {
              if (item.socketConnectionId) connectionIds.add(item.socketConnectionId);
            });
          }
        } catch (e) {}
      } else if (cleanRoom.startsWith('order_')) {
        const orderId = cleanRoom.replace('order_', '');
        let orderItem: any = null;
        try {
          const getOrderRes = await dynamoDocClient.send(
            new GetCommand({
              TableName: ordersTableName,
              Key: { orderId }
            })
          );
          orderItem = getOrderRes.Item;
        } catch (e) {}

        if (!orderItem) {
          try {
            const scanRes = await dynamoDocClient.send(
              new ScanCommand({
                TableName: ordersTableName,
                FilterExpression: 'orderId = :oid OR id = :oid',
                ExpressionAttributeValues: { ':oid': orderId }
              })
            );
            if (scanRes.Items && scanRes.Items.length > 0) {
              orderItem = scanRes.Items[0];
            }
          } catch (e) {}
        }

        if (orderItem) {
          if (orderItem.customerSocketConnectionId) {
            connectionIds.add(orderItem.customerSocketConnectionId);
          }
          if (orderItem.customerId) {
            const cust = await userRepository.findByUserId(orderItem.customerId);
            if (cust && (cust as any).socketConnectionId) {
              connectionIds.add((cust as any).socketConnectionId);
            }
          }
        }
      } else if (cleanRoom === 'delivery_riders' || cleanRoom.startsWith('delivery_')) {
        const scanRes = await dynamoDocClient.send(
          new ScanCommand({
            TableName: usersTableName,
            FilterExpression: '#role = :r AND attribute_exists(socketConnectionId)',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':r': 'DELIVERY_PARTNER' }
          })
        );
        (scanRes.Items || []).forEach(item => {
          if (item.socketConnectionId) connectionIds.add(item.socketConnectionId);
        });
      }
    } catch (err: any) {
      console.warn(`⚠️ DynamoDB connection lookup error for room [${cleanRoom}]:`, err?.message);
    }

    return Array.from(connectionIds);
  }

  // Broadcast event payload to target room
  async broadcastToRoom(room: string, eventName: string, data: any): Promise<number> {
    const connectionIds = await this.getConnectionsForRoom(room);
    if (connectionIds.length === 0) return 0;

    let successCount = 0;
    await Promise.all(
      connectionIds.map(async (cid) => {
        const sent = await this.postToConnection(cid, eventName, data);
        if (sent) successCount++;
      })
    );
    return successCount;
  }
}

export const apiGatewayWS = new ApiGatewayWebSocketService();
export default apiGatewayWS;
