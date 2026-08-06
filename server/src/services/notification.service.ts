import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  dynamoDocClient,
  usersTableName,
  restaurantsTableName,
  deliveryTableName
} from '../config/aws';
import { JwtUserPayload } from '../utils/jwt.utils';
import userRepository from '../repositories/user.repository';
import restaurantRepository from '../repositories/restaurant.repository';
import deliveryRepository from '../repositories/delivery.repository';
import orderRepository from '../repositories/order.repository';
import { sendNotification } from './fcm.service';
import { OrderStatus } from '../types/enums';

export class NotificationService {
  /**
   * Save/Update FCM token in existing DynamoDB item for the authenticated user/merchant/delivery partner.
   */
  async saveFcmToken(user: JwtUserPayload, fcmToken: string): Promise<{ updatedTables: string[] }> {
    const lastTokenUpdatedAt = new Date().toISOString();
    const updatedTables: string[] = [];
    const role = (user.role || '').toUpperCase();

    // 1. If role is RESTAURANT or user has restaurantId, update foodway-restaurants table
    if (role === 'RESTAURANT' || user.restaurantId) {
      let restId = user.restaurantId;
      if (!restId) {
        const restaurant = await restaurantRepository.findByOwnerUserId(user.id) ||
          await restaurantRepository.findByEmail(user.email);
        restId = restaurant?.restaurantId;
      }

      if (restId) {
        try {
          await dynamoDocClient.send(
            new UpdateCommand({
              TableName: restaurantsTableName,
              Key: { restaurantId: restId },
              UpdateExpression: 'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',
              ExpressionAttributeValues: {
                ':token': fcmToken,
                ':updatedAt': lastTokenUpdatedAt,
              },
            })
          );
          updatedTables.push(restaurantsTableName);
        } catch (err) {
          console.error(`Failed to update FCM token in ${restaurantsTableName}:`, err);
        }
      }
    }

    // 2. If role is DELIVERY_PARTNER or DELIVERY, update foodway-delivery table if applicable
    if (role === 'DELIVERY_PARTNER' || role === 'DELIVERY') {
      try {
        await dynamoDocClient.send(
          new UpdateCommand({
            TableName: deliveryTableName,
            Key: { deliveryId: user.id },
            UpdateExpression: 'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':token': fcmToken,
              ':updatedAt': lastTokenUpdatedAt,
            },
          })
        );
        updatedTables.push(deliveryTableName);
      } catch (err) {
        // Primary record might be in usersTableName
      }
    }

    // 3. Always update foodway-users table for primary user account (userId)
    try {
      const existingUser = await userRepository.findByEmail(user.email);
      if (existingUser) {
        await dynamoDocClient.send(
          new UpdateCommand({
            TableName: usersTableName,
            Key: {
              email: user.email    // ✅ Correct
            },
            UpdateExpression: 'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':token': fcmToken,
              ':updatedAt': lastTokenUpdatedAt,
            },
          })
        );
        updatedTables.push(usersTableName);
      }
    } catch (err) {
      console.error(`Failed to update FCM token in ${usersTableName}:`, err);
    }

    return { updatedTables };
  }

  /**
   * Send New Order push notification to Merchant/Restaurant owner.
   * Triggered immediately after successful order creation in database.
   */
  async notifyMerchantNewOrder(params: {
    orderId: string;
    restaurantId: string;
    customerName: string;
    totalAmount: number;
    itemsCount?: number;
  }): Promise<void> {
    try {
      const { orderId, restaurantId, customerName, totalAmount } = params;

      // 1. Fetch Restaurant & Owner user to get FCM tokens
      let tokens: string[] = [];
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);

      if (restaurant?.fcmToken) {
        tokens.push(restaurant.fcmToken);
      }
      if (restaurant?.ownerUserId) {
        const ownerUser = await userRepository.findByUserId(restaurant.ownerUserId);
        if (ownerUser?.fcmToken) tokens.push(ownerUser.fcmToken);
      }
      if (restaurant?.email) {
        const ownerByEmail = await userRepository.findByEmail(restaurant.email);
        if (ownerByEmail?.fcmToken) tokens.push(ownerByEmail.fcmToken);
      }

      // Fallback: If specific lookup returned no token, scan for any logged-in RESTAURANT merchant with an active token
      if (tokens.length === 0) {
        const allUsers = await userRepository.scan();
        const restUsers = allUsers.filter(u => u.role === 'RESTAURANT' && u.fcmToken);
        tokens = restUsers.map(u => u.fcmToken!).filter(Boolean);
      }

      const uniqueTokens = Array.from(new Set(tokens));

      if (uniqueTokens.length === 0) {
        console.warn(`ℹ️ Notification skipped: No FCM token found for restaurant ID [${restaurantId}].`);
        return;
      }

      // 2. Send high-priority FCM notification to all resolved merchant devices
      for (const token of uniqueTokens) {
        await sendNotification({
          token,
          title: '🔔 New Order Received',
          body: `Order #${orderId}\nCustomer: ${customerName}\nAmount: ₹${totalAmount}`,
          data: {
            orderId,
            restaurantId,
            type: 'NEW_ORDER',
            customerName,
            totalAmount: String(totalAmount),
          },
          link: `/restaurant/dashboard?orderId=${orderId}`,
        });
      }
    } catch (error) {
      console.error('❌ Failed to send Merchant New Order Notification (non-blocking):', error);
    }
  }

  /**
   * Send Order Status Update push notification to Customer.
   * Triggered immediately after order status updates in database.
   */
  async notifyCustomerOrderStatus(params: {
    orderId: string;
    customerId?: string;
    customerEmail?: string;
    restaurantName?: string;
    status: OrderStatus;
  }): Promise<void> {
    try {
      const { orderId, customerId, customerEmail, status } = params;
      let restaurantName = params.restaurantName || 'Partner Restaurant';

      let fcmToken: string | undefined;

      // 1. Try finding customer by email if provided
      if (customerEmail) {
        const customerByEmail = await userRepository.findByEmail(customerEmail);
        if (customerByEmail?.fcmToken) {
          fcmToken = customerByEmail.fcmToken;
        }
      }

      // 2. Try finding customer by customerId/userId if no token yet
      if (!fcmToken && customerId) {
        const customerById = await userRepository.findByUserId(customerId);
        if (customerById?.fcmToken) {
          fcmToken = customerById.fcmToken;
        } else if (customerId.includes('@')) {
          const customerByEmailId = await userRepository.findByEmail(customerId);
          if (customerByEmailId?.fcmToken) {
            fcmToken = customerByEmailId.fcmToken;
          }
        }
      }

      // 3. Fallback: If still no token and orderId provided, fetch full order from DB
      if (!fcmToken && orderId) {
        const fullOrder = await orderRepository.findByOrderId(orderId);
        if (fullOrder) {
          if (fullOrder.restaurantName) restaurantName = fullOrder.restaurantName;
          if (fullOrder.customerEmail) {
            const cust = await userRepository.findByEmail(fullOrder.customerEmail);
            if (cust?.fcmToken) fcmToken = cust.fcmToken;
          }
          if (!fcmToken && fullOrder.customerId) {
            const cust = await userRepository.findByUserId(fullOrder.customerId);
            if (cust?.fcmToken) fcmToken = cust.fcmToken;
          }
        }
      }

      // 4. Fallback: If still no token, scan for active logged-in USER token
      if (!fcmToken) {
        const allUsers = await userRepository.scan();
        const userWithToken = allUsers.find(u => u.role === 'USER' && u.fcmToken);
        if (userWithToken?.fcmToken) {
          fcmToken = userWithToken.fcmToken;
        }
      }

      if (!fcmToken) {
        console.warn(
          `ℹ️ Notification skipped: Customer [${customerEmail || customerId || orderId}] has no active FCM token registered.`
        );
        return;
      }

      // 2. Map status to title and body payload
      let title = '';
      let body = '';

      switch (status) {
        case 'ACCEPTED':
          title = '🎉 Order Accepted';
          body = `Your order from ${restaurantName} has been accepted by the restaurant.`;
          break;
        case 'PREPARING':
          title = 'Chef is Preparing Meal';
          body = `The chef is preparing your delicious meal at ${restaurantName}.`;
          break;
        case 'READY':
          title = ' Order Ready';
          body = `Your order from ${restaurantName} is prepared and ready!`;
          break;
        case 'ASSIGNED':
          title = ' Rider Assigned';
          body = `A delivery partner has been assigned to pick up your order.`;
          break;
        case 'PICKED_UP':
          title = 'Order On The Way';
          body = `Your order from ${restaurantName} is picked up and on the way to your address.`;
          break;
        case 'DELIVERED':
          title = ' Order Delivered';
          body = `Your order from ${restaurantName} has been delivered. Enjoy your meal!`;
          break;
        case 'CANCELLED':
          title = 'Order Cancelled';
          body = `Your order from ${restaurantName} was cancelled.`;
          break;
        default:
          title = ' Order Update';
          body = `Your order #${orderId} status has been updated to ${status}.`;
      }

      await sendNotification({
        token: fcmToken,
        title,
        body,
        data: {
          orderId,
          status,
          type: 'ORDER_STATUS_UPDATE',
        },
        link: '/orders',
      });
    } catch (error) {
      console.error(' Failed to send Customer Order Status Notification (non-blocking):', error);
    }
  }

  /**
   * Send Notification to Delivery Partners when order is READY for pickup.
   */
  async notifyDeliveryPartnersPickupAvailable(params: {
    orderId: string;
    restaurantId: string;
    restaurantName: string;
  }): Promise<void> {
    try {
      const { orderId, restaurantId, restaurantName } = params;

      // Scan all delivery partners in usersTableName with role DELIVERY_PARTNER
      const allUsers = await userRepository.scan();
      const deliveryPartners = allUsers.filter(
        (u) => (u.role === 'DELIVERY_PARTNER' || u.role === 'DELIVERY') && u.fcmToken
      );

      for (const partner of deliveryPartners) {
        if (partner.fcmToken) {
          await sendNotification({
            token: partner.fcmToken,
            title: '📦 Pickup Available',
            body: `Order #${orderId} is ready for pickup at ${restaurantName}.`,
            data: {
              orderId,
              restaurantId,
              type: 'PICKUP_AVAILABLE',
            },
            link: '/delivery/dashboard',
          });
        }
      }
    } catch (error) {
      console.error(' Failed to send Delivery Partner Notification (non-blocking):', error);
    }
  }

  /**
   * Send Delivery Completed notification to Restaurant.
   */
  async notifyDeliveryCompleted(params: {
    orderId: string;
    restaurantId: string;
  }): Promise<void> {
    try {
      const { orderId, restaurantId } = params;

      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      const fcmToken = restaurant?.fcmToken;

      if (fcmToken) {
        await sendNotification({
          token: fcmToken,
          title: 'Delivery Completed',
          body: `Order #${orderId} has been successfully delivered to the customer.`,
          data: {
            orderId,
            type: 'DELIVERY_COMPLETED',
          },
          link: '/restaurant/dashboard',
        });
      }
    } catch (error) {
      console.error(' Failed to send Delivery Completed Notification (non-blocking):', error);
    }
  }

  /**
   * Send Order Cancellation Notifications.
   */
  async notifyOrderCancelled(params: {
    orderId: string;
    customerId: string;
    restaurantId: string;
    cancelledBy: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY';
  }): Promise<void> {
    try {
      const { orderId, customerId, restaurantId, cancelledBy } = params;

      if (cancelledBy === 'CUSTOMER') {
        // Notify Restaurant
        const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
        if (restaurant?.fcmToken) {
          await sendNotification({
            token: restaurant.fcmToken,
            title: 'Order Cancelled',
            body: `Customer cancelled order #${orderId}.`,
            data: { orderId, type: 'ORDER_CANCELLED' },
            link: '/restaurant/dashboard',
          });
        }
      } else if (cancelledBy === 'RESTAURANT') {
        // Notify Customer
        const customer = await userRepository.findByUserId(customerId);
        if (customer?.fcmToken) {
          await sendNotification({
            token: customer.fcmToken,
            title: ' Order Cancelled',
            body: `Restaurant cancelled order #${orderId}.`,
            data: { orderId, type: 'ORDER_CANCELLED' },
            link: '/orders',
          });
        }
      }
    } catch (error) {
      console.error(' Failed to send Cancellation Notification (non-blocking):', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
