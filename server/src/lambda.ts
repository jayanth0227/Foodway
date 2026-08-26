import serverlessExpress from '@vendia/serverless-express';
import app from './index';
import { verifyToken } from './utils/jwt.utils';
import { socketService } from './services/socket.service';
import { dynamoDocClient, usersTableName } from './config/aws';
import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize HTTP Express serverless handler once
const expressHandler = serverlessExpress({ app });

// AWS API Gateway WebSocket Handler ($connect, $disconnect, $default)
async function handleWebSocketEvent(event: any, context: any) {
  const rc = event.requestContext || {};
  const routeKey = rc.routeKey || rc.eventType || '';
  const connectionId = rc.connectionId;

  console.log(`⚡ [AWS WebSocket Lambda Invocation] RouteKey: ${routeKey}, ConnectionId: ${connectionId}`);

  if (!connectionId) {
    return { statusCode: 400, body: 'Missing connectionId' };
  }

  // 1. $connect Route Handler (Authenticate JWT & Register ConnectionId in foodway-users)
  if (routeKey === '$connect' || rc.eventType === 'CONNECT') {
    const qsp = event.queryStringParameters || {};
    const headers = event.headers || {};
    const token = qsp.token || headers.Authorization?.replace('Bearer ', '') || headers.authorization?.replace('Bearer ', '') || headers['sec-websocket-protocol'];
    const clientUserId = qsp.userId;

    let authenticatedUserId: string | undefined = undefined;

    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded && (decoded.id || decoded.email)) {
          authenticatedUserId = decoded.id;
          console.log(`[WS AUTH SUCCESS] connectionId=${connectionId} authenticatedUserId=${authenticatedUserId}`);
        }
      } catch (err: any) {
        console.warn(`[WS AUTH FAILED] connectionId=${connectionId} reason=INVALID_TOKEN error=${err?.message}`);
      }
    }

    // Fallback: If no token provided but clientUserId present in dev environments
    if (!authenticatedUserId && clientUserId && !token) {
      authenticatedUserId = clientUserId;
    }

    if (authenticatedUserId) {
      await socketService.registerUserSocketId(authenticatedUserId, connectionId);
    } else {
      console.warn(`[WS REGISTER FAILED] connectionId=${connectionId} reason=NO_AUTHENTICATED_USER_ID`);
    }

    return { statusCode: 200, body: 'Connected' };
  }

  // 2. $disconnect Route Handler (Clean up ConnectionId)
  if (routeKey === '$disconnect' || rc.eventType === 'DISCONNECT') {
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
          console.log(`[WS DISCONNECT CLEANUP] connectionId=${connectionId} userId=${item.userId || item.email}`);
        }
      }
    } catch (e) {
      console.warn(`⚠️ WebSocket disconnect cleanup error:`, e);
    }
    return { statusCode: 200, body: 'Disconnected' };
  }

  // 3. $default Route Handler (Heartbeat ping/pong & custom actions)
  if (routeKey === '$default' || rc.eventType === 'MESSAGE') {
    try {
      let payload: any = {};
      if (event.body) {
        payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      }

      const action = payload.action || payload.event || payload.type || '';
      const token = payload.token || payload.data?.token || '';
      const clientUserId = payload.userId || payload.data?.userId || payload.customerId || payload.data?.customerId;
      const orderId = payload.orderId || payload.data?.orderId;
      let authenticatedUserId: string | undefined = undefined;

      if (token) {
        try {
          const decoded = verifyToken(token);
          if (decoded && (decoded.id || decoded.email)) {
            authenticatedUserId = decoded.id;
          }
        } catch (err: any) {
          console.warn(`[WS AUTH FAILED] connectionId=${connectionId} reason=INVALID_TOKEN_IN_MESSAGE error=${err?.message}`);
        }
      }

      const targetUserId = authenticatedUserId || clientUserId;

      if (action === 'register_connection' || action === 'join_user' || action === 'join_customer' || action === 'join_room' || action === 'join_restaurant' || action === 'join_admin' || action === 'join_delivery') {
        if (targetUserId) {
          await socketService.registerUserSocketId(targetUserId, connectionId, orderId);
        } else {
          console.warn(`[WS REGISTER FAILED] connectionId=${connectionId} action=${action} reason=NO_USER_ID`);
        }
      }
    } catch (e) {
      console.warn(`⚠️ WebSocket $default message handling warning:`, e);
    }

    return { statusCode: 200, body: JSON.stringify({ status: 'OK', connectionId }) };
  }

  return { statusCode: 200, body: 'OK' };
}

import { initializeFirebaseAdmin } from './config/firebase';

// Master Unified Lambda Handler (Auto-detects HTTP API vs WebSocket API)
export const handler = async (event: any, context: any) => {
  // Ensure Firebase Admin is initialized non-blockingly from AWS Secrets Manager / local config
  try {
    await initializeFirebaseAdmin();
  } catch (fbErr: any) {
    console.warn('⚠️ Firebase async initialization warning:', fbErr?.message);
  }

  // Check if event is an AWS API Gateway WebSocket Event
  const rc = event.requestContext;
  const isWebSocketEvent = rc && (rc.connectionId || rc.routeKey === '$connect' || rc.routeKey === '$disconnect' || rc.routeKey === '$default' || rc.eventType === 'CONNECT' || rc.eventType === 'DISCONNECT' || rc.eventType === 'MESSAGE');

  if (isWebSocketEvent) {
    return await handleWebSocketEvent(event, context);
  }

  // Otherwise, handle standard HTTP API request via serverless-express
  return await expressHandler(event, context);
};
