// import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
// import {
//   dynamoDocClient,
//   usersTableName,
//   restaurantsTableName,
//   deliveryTableName
// } from '../config/aws';
// import { JwtUserPayload } from '../utils/jwt.utils';
// import userRepository from '../repositories/user.repository';
// import restaurantRepository from '../repositories/restaurant.repository';
// import deliveryRepository from '../repositories/delivery.repository';
// import orderRepository from '../repositories/order.repository';
// import { sendNotification } from './fcm.service';
// import { OrderStatus } from '../types/enums';

// export class NotificationService {
//   /**
//    * Save/Update FCM token in existing DynamoDB item for the authenticated user/merchant/delivery partner.
//    */
//   async saveFcmToken(user: JwtUserPayload, fcmToken: string): Promise<{ updatedTables: string[] }> {
//     const lastTokenUpdatedAt = new Date().toISOString();
//     const updatedTables: string[] = [];
//     const role = (user.role || '').toUpperCase();

//     // 1. If role is RESTAURANT or user has restaurantId, update foodway-restaurants table
//     if (role === 'RESTAURANT' || user.restaurantId) {
//       let restId = user.restaurantId;
//       if (!restId) {
//         const restaurant = await restaurantRepository.findByOwnerUserId(user.id) ||
//           await restaurantRepository.findByEmail(user.email);
//         restId = restaurant?.restaurantId;
//       }

//       if (restId) {
//         try {
//           await dynamoDocClient.send(
//             new UpdateCommand({
//               TableName: restaurantsTableName,
//               Key: { shopId: restId },
//               UpdateExpression: 'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',
//               ExpressionAttributeValues: {
//                 ':token': fcmToken,
//                 ':updatedAt': lastTokenUpdatedAt,
//               },
//             })
//           );
//           updatedTables.push(restaurantsTableName);
//         } catch (err) {
//           console.error(`Failed to update FCM token in ${restaurantsTableName}:`, err);
//         }
//       }
//     }

//     // 2. If role is DELIVERY_PARTNER or DELIVERY, update foodway-delivery table if applicable
//     if (role === 'DELIVERY_PARTNER' || role === 'DELIVERY') {
//       try {
//         await dynamoDocClient.send(
//           new UpdateCommand({
//             TableName: deliveryTableName,
//             Key: { deliveryId: user.id },
//             UpdateExpression: 'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',
//             ExpressionAttributeValues: {
//               ':token': fcmToken,
//               ':updatedAt': lastTokenUpdatedAt,
//             },
//           })
//         );
//         updatedTables.push(deliveryTableName);
//       } catch (err) {
//         // Primary record might be in usersTableName
//       }
//     }

//     // 3. Always update foodway-users table for primary user account (userId)
//     try {
//       const existingUser = await userRepository.findByEmail(user.email);
//       if (existingUser) {
//         await dynamoDocClient.send(
//           new UpdateCommand({
//             TableName: usersTableName,
//             Key: {
//               email: user.email    // ✅ Correct
//             },
//             UpdateExpression: 'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',
//             ExpressionAttributeValues: {
//               ':token': fcmToken,
//               ':updatedAt': lastTokenUpdatedAt,
//             },
//           })
//         );
//         updatedTables.push(usersTableName);
//       }
//     } catch (err) {
//       console.error(`Failed to update FCM token in ${usersTableName}:`, err);
//     }

//     return { updatedTables };
//   }

//   /**
//    * Send New Order push notification to Merchant/Restaurant owner.
//    * Triggered immediately after successful order creation in database.
//    */
//   async notifyMerchantNewOrder(params: {
//     orderId: string;
//     restaurantId: string;
//     customerName: string;
//     totalAmount: number;
//     itemsCount?: number;
//   }): Promise<void> {
//     try {
//       const { orderId, restaurantId, customerName, totalAmount } = params;

//       // 1. Fetch Restaurant & Owner user to get FCM tokens
//       let tokens: string[] = [];
//       const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);

//       if (restaurant?.fcmToken) {
//         tokens.push(restaurant.fcmToken);
//       }
//       if (restaurant?.ownerUserId) {
//         const ownerUser = await userRepository.findByUserId(restaurant.ownerUserId);
//         if (ownerUser?.fcmToken) tokens.push(ownerUser.fcmToken);
//       }
//       if (restaurant?.email) {
//         const ownerByEmail = await userRepository.findByEmail(restaurant.email);
//         if (ownerByEmail?.fcmToken) tokens.push(ownerByEmail.fcmToken);
//       }

//       // Fallback: If specific lookup returned no token, scan for any logged-in RESTAURANT merchant with an active token
//       if (tokens.length === 0) {
//         const allUsers = await userRepository.scan();
//         const restUsers = allUsers.filter(u => u.role === 'RESTAURANT' && u.fcmToken);
//         tokens = restUsers.map(u => u.fcmToken!).filter(Boolean);
//       }

//       const uniqueTokens = Array.from(new Set(tokens));

//       if (uniqueTokens.length === 0) {
//         console.warn(`ℹ️ Notification skipped: No FCM token found for restaurant ID [${restaurantId}].`);
//         return;
//       }

//       // 2. Send high-priority FCM notification to all resolved merchant devices
//       for (const token of uniqueTokens) {
//         await sendNotification({
//           token,
//           title: '🔔 New Order Received',
//           body: `Order #${orderId}\nCustomer: ${customerName}\nAmount: ₹${totalAmount}`,
//           data: {
//             orderId,
//             restaurantId,
//             type: 'NEW_ORDER',
//             customerName,
//             totalAmount: String(totalAmount),
//           },
//           link: `/restaurant/dashboard?orderId=${orderId}`,
//         });
//       }
//     } catch (error) {
//       console.error('❌ Failed to send Merchant New Order Notification (non-blocking):', error);
//     }
//   }

//   /**
//    * Send Order Status Update push notification to Customer.
//    * Triggered immediately after order status updates in database.
//    */
//   async notifyCustomerOrderStatus(params: {
//     orderId: string;
//     customerId?: string;
//     customerEmail?: string;
//     restaurantName?: string;
//     status: OrderStatus;
//   }): Promise<void> {
//     try {
//       const { orderId, customerId, customerEmail, status } = params;
//       let restaurantName = params.restaurantName || 'Partner Restaurant';

//       let fcmToken: string | undefined;

//       // 1. Try finding customer by email if provided
//       if (customerEmail) {
//         const customerByEmail = await userRepository.findByEmail(customerEmail);
//         if (customerByEmail?.fcmToken) {
//           fcmToken = customerByEmail.fcmToken;
//         }
//       }

//       // 2. Try finding customer by customerId/userId if no token yet
//       if (!fcmToken && customerId) {
//         const customerById = await userRepository.findByUserId(customerId);
//         if (customerById?.fcmToken) {
//           fcmToken = customerById.fcmToken;
//         } else if (customerId.includes('@')) {
//           const customerByEmailId = await userRepository.findByEmail(customerId);
//           if (customerByEmailId?.fcmToken) {
//             fcmToken = customerByEmailId.fcmToken;
//           }
//         }
//       }

//       // 3. Fallback: If still no token and orderId provided, fetch full order from DB
//       if (!fcmToken && orderId) {
//         const fullOrder = await orderRepository.findByOrderId(orderId);
//         if (fullOrder) {
//           if (fullOrder.restaurantName) restaurantName = fullOrder.restaurantName;
//           if (fullOrder.customerEmail) {
//             const cust = await userRepository.findByEmail(fullOrder.customerEmail);
//             if (cust?.fcmToken) fcmToken = cust.fcmToken;
//           }
//           if (!fcmToken && fullOrder.customerId) {
//             const cust = await userRepository.findByUserId(fullOrder.customerId);
//             if (cust?.fcmToken) fcmToken = cust.fcmToken;
//           }
//         }
//       }

//       // 4. Fallback: If still no token, scan for active logged-in USER token
//       if (!fcmToken) {
//         const allUsers = await userRepository.scan();
//         const userWithToken = allUsers.find(u => u.role === 'USER' && u.fcmToken);
//         if (userWithToken?.fcmToken) {
//           fcmToken = userWithToken.fcmToken;
//         }
//       }

//       if (!fcmToken) {
//         console.warn(
//           `ℹ️ Notification skipped: Customer [${customerEmail || customerId || orderId}] has no active FCM token registered.`
//         );
//         return;
//       }

//       // 2. Map status to title and body payload
//       let title = '';
//       let body = '';

//       switch (status) {
//         case 'ACCEPTED':
//           title = '🎉 Order Accepted';
//           body = `Your order from ${restaurantName} has been accepted by the restaurant.`;
//           break;
//         case 'PREPARING':
//           title = 'Chef is Preparing Meal';
//           body = `The chef is preparing your delicious meal at ${restaurantName}.`;
//           break;
//         case 'READY':
//           title = ' Order Ready';
//           body = `Your order from ${restaurantName} is prepared and ready!`;
//           break;
//         case 'ASSIGNED':
//           title = ' Rider Assigned';
//           body = `A delivery partner has been assigned to pick up your order.`;
//           break;
//         case 'PICKED_UP':
//           title = 'Order On The Way';
//           body = `Your order from ${restaurantName} is picked up and on the way to your address.`;
//           break;
//         case 'DELIVERED':
//           title = ' Order Delivered';
//           body = `Your order from ${restaurantName} has been delivered. Enjoy your meal!`;
//           break;
//         case 'CANCELLED':
//           title = 'Order Cancelled';
//           body = `Your order from ${restaurantName} was cancelled.`;
//           break;
//         default:
//           title = ' Order Update';
//           body = `Your order #${orderId} status has been updated to ${status}.`;
//       }

//       await sendNotification({
//         token: fcmToken,
//         title,
//         body,
//         data: {
//           orderId,
//           status,
//           type: 'ORDER_STATUS_UPDATE',
//         },
//         link: '/orders',
//       });
//     } catch (error) {
//       console.error(' Failed to send Customer Order Status Notification (non-blocking):', error);
//     }
//   }

//   /**
//    * Send Notification to Delivery Partners when order is READY for pickup.
//    */
//   async notifyDeliveryPartnersPickupAvailable(params: {
//     orderId: string;
//     restaurantId: string;
//     restaurantName: string;
//   }): Promise<void> {
//     try {
//       const { orderId, restaurantId, restaurantName } = params;

//       // Scan all delivery partners in usersTableName with role DELIVERY_PARTNER or DELIVERY or RIDER
//       const allUsers = await userRepository.scan();
//       const deliveryPartners = allUsers.filter(
//         (u: any) =>
//           (u.role === 'DELIVERY_PARTNER' || u.role === 'DELIVERY' || u.role === 'RIDER' || (u.userId && u.userId.startsWith('DEL-'))) &&
//           u.fcmToken
//       );

//       for (const partner of deliveryPartners) {
//         if (partner.fcmToken) {
//           await sendNotification({
//             token: partner.fcmToken,
//             title: '📦 Pickup Available',
//             body: `Order #${orderId} is ready for pickup at ${restaurantName}.`,
//             data: {
//               orderId,
//               restaurantId,
//               type: 'PICKUP_AVAILABLE',
//             },
//             link: '/delivery/dashboard',
//           });
//         }
//       }
//     } catch (error) {
//       console.error(' Failed to send Delivery Partner Notification (non-blocking):', error);
//     }
//   }

//   /**
//    * Send FCM Push Notification to assigned rider when Admin assigns an order.
//    */
//   async notifyRiderOrderAssigned(params: {
//     orderId: string;
//     riderId: string;
//     riderEmail?: string;
//     restaurantName?: string;
//   }): Promise<void> {
//     try {
//       const { orderId, riderId, riderEmail, restaurantName } = params;
//       const allUsers = await userRepository.scan();
//       const riderUser = allUsers.find(
//         (u: any) =>
//           (u.id === riderId || u.userId === riderId || u.email === riderEmail || (u.email && u.email === riderId)) &&
//           u.fcmToken
//       );

//       if (riderUser && riderUser.fcmToken) {
//         await sendNotification({
//           token: riderUser.fcmToken,
//           title: '🛵 Order Assigned to You',
//           body: `Order #${orderId} from ${restaurantName || 'Restaurant'} has been assigned to you by Admin.`,
//           data: {
//             orderId,
//             type: 'ORDER_ASSIGNED',
//           },
//           link: '/delivery/dashboard',
//         });
//       }
//     } catch (error) {
//       console.error('Failed to send Rider Order Assigned Notification (non-blocking):', error);
//     }
//   }

//   /**
//    * Send Delivery Completed notification to Restaurant.
//    */
//   async notifyDeliveryCompleted(params: {
//     orderId: string;
//     restaurantId: string;
//   }): Promise<void> {
//     try {
//       const { orderId, restaurantId } = params;

//       const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
//       const fcmToken = restaurant?.fcmToken;

//       if (fcmToken) {
//         await sendNotification({
//           token: fcmToken,
//           title: 'Delivery Completed',
//           body: `Order #${orderId} has been successfully delivered to the customer.`,
//           data: {
//             orderId,
//             type: 'DELIVERY_COMPLETED',
//           },
//           link: '/restaurant/dashboard',
//         });
//       }
//     } catch (error) {
//       console.error(' Failed to send Delivery Completed Notification (non-blocking):', error);
//     }
//   }

//   /**
//    * Send Order Cancellation Notifications.
//    */
//   async notifyOrderCancelled(params: {
//     orderId: string;
//     customerId: string;
//     restaurantId: string;
//     cancelledBy: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY';
//   }): Promise<void> {
//     try {
//       const { orderId, customerId, restaurantId, cancelledBy } = params;

//       if (cancelledBy === 'CUSTOMER') {
//         // Notify Restaurant
//         const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
//         if (restaurant?.fcmToken) {
//           await sendNotification({
//             token: restaurant.fcmToken,
//             title: 'Order Cancelled',
//             body: `Customer cancelled order #${orderId}.`,
//             data: { orderId, type: 'ORDER_CANCELLED' },
//             link: '/restaurant/dashboard',
//           });
//         }
//       } else if (cancelledBy === 'RESTAURANT') {
//         // Notify Customer
//         const customer = await userRepository.findByUserId(customerId);
//         if (customer?.fcmToken) {
//           await sendNotification({
//             token: customer.fcmToken,
//             title: ' Order Cancelled',
//             body: `Restaurant cancelled order #${orderId}.`,
//             data: { orderId, type: 'ORDER_CANCELLED' },
//             link: '/orders',
//           });
//         }
//       }
//     } catch (error) {
//       console.error(' Failed to send Cancellation Notification (non-blocking):', error);
//     }
//   }
// }

// export const notificationService = new NotificationService();
// export default notificationService;



///  notification.service.ts

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
   * Save/Update FCM token in existing DynamoDB item
   * for the authenticated user/merchant/delivery partner.
   */
  async saveFcmToken(
    user: JwtUserPayload,
    fcmToken: string
  ): Promise<{ updatedTables: string[] }> {

    const lastTokenUpdatedAt = new Date().toISOString();
    const updatedTables: string[] = [];

    const role = (user.role || '').toUpperCase();

    console.log('🔥 SAVE FCM TOKEN START', {
      userId: user.id,
      email: user.email,
      role,
      hasToken: !!fcmToken
    });

    // =========================================================
    // 1. RESTAURANT
    // =========================================================

    if (role === 'RESTAURANT' || user.restaurantId) {

      let restId = user.restaurantId;

      if (!restId) {
        const restaurant =
          await restaurantRepository.findByOwnerUserId(user.id) ||
          await restaurantRepository.findByEmail(user.email);

        restId = restaurant?.restaurantId;
      }

      if (restId) {
        try {

          await dynamoDocClient.send(
            new UpdateCommand({
              TableName: restaurantsTableName,

              Key: {
                shopId: restId
              },

              UpdateExpression:
                'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',

              ExpressionAttributeValues: {
                ':token': fcmToken,
                ':updatedAt': lastTokenUpdatedAt
              }
            })
          );

          updatedTables.push(restaurantsTableName);

          console.log('✅ Restaurant FCM token updated', {
            restaurantId: restId
          });

        } catch (err) {

          console.error(
            `❌ Failed to update FCM token in ${restaurantsTableName}:`,
            err
          );
        }
      }
    }

    // =========================================================
    // 2. DELIVERY PARTNER
    // =========================================================

    if (
      role === 'DELIVERY_PARTNER' ||
      role === 'DELIVERY'
    ) {

      try {

        await dynamoDocClient.send(
          new UpdateCommand({
            TableName: deliveryTableName,

            Key: {
              deliveryId: user.id
            },

            UpdateExpression:
              'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',

            ExpressionAttributeValues: {
              ':token': fcmToken,
              ':updatedAt': lastTokenUpdatedAt
            }
          })
        );

        updatedTables.push(deliveryTableName);

        console.log('✅ Delivery FCM token updated', {
          deliveryId: user.id
        });

      } catch (err) {

        console.error(
          `❌ Failed to update FCM token in ${deliveryTableName}:`,
          err
        );

        // Primary record might be in usersTableName
      }
    }

    // =========================================================
    // 3. USERS TABLE
    // =========================================================

    try {

      const existingUser =
        await userRepository.findByEmail(user.email);

      if (existingUser) {

        await dynamoDocClient.send(
          new UpdateCommand({
            TableName: usersTableName,

            Key: {
              email: user.email
            },

            UpdateExpression:
              'SET fcmToken = :token, lastTokenUpdatedAt = :updatedAt, updatedAt = :updatedAt',

            ExpressionAttributeValues: {
              ':token': fcmToken,
              ':updatedAt': lastTokenUpdatedAt
            }
          })
        );

        updatedTables.push(usersTableName);

        console.log('✅ User FCM token updated', {
          email: user.email
        });
      }

    } catch (err) {

      console.error(
        `❌ Failed to update FCM token in ${usersTableName}:`,
        err
      );
    }

    console.log('🏁 SAVE FCM TOKEN END', {
      userId: user.id,
      email: user.email,
      updatedTables
    });

    return {
      updatedTables
    };
  }


  // ===========================================================
  // MERCHANT - NEW ORDER
  // ===========================================================

  /**
   * Send New Order push notification to Merchant/Restaurant owner.
   * Triggered immediately after successful order creation.
   */
  async notifyMerchantNewOrder(params: {
    orderId: string;
    restaurantId: string;
    customerName: string;
    totalAmount: number;
    itemsCount?: number;
  }): Promise<void> {

    try {

      const {
        orderId,
        restaurantId,
        customerName,
        totalAmount
      } = params;

      console.log('🔔 MERCHANT NEW ORDER FCM START', {
        orderId,
        restaurantId,
        customerName,
        totalAmount
      });

      // -------------------------------------------------------
      // 1. Fetch Restaurant & Owner user to get FCM tokens
      // -------------------------------------------------------

      let tokens: string[] = [];

      const restaurant =
        await restaurantRepository.findByRestaurantId(
          restaurantId
        );

      if (restaurant?.fcmToken) {
        tokens.push(restaurant.fcmToken);
      }

      if (restaurant?.ownerUserId) {

        const ownerUser =
          await userRepository.findByUserId(
            restaurant.ownerUserId
          );

        if (ownerUser?.fcmToken) {
          tokens.push(ownerUser.fcmToken);
        }
      }

      if (restaurant?.email) {

        const ownerByEmail =
          await userRepository.findByEmail(
            restaurant.email
          );

        if (ownerByEmail?.fcmToken) {
          tokens.push(ownerByEmail.fcmToken);
        }
      }

      // -------------------------------------------------------
      // FALLBACK
      // -------------------------------------------------------

      if (tokens.length === 0) {

        const allUsers =
          await userRepository.scan();

        const restUsers =
          allUsers.filter(
            u =>
              u.role === 'RESTAURANT' &&
              u.fcmToken
          );

        tokens =
          restUsers
            .map(u => u.fcmToken!)
            .filter(Boolean);
      }

      const uniqueTokens =
        Array.from(new Set(tokens));

      console.log('🎯 MERCHANT FCM TOKEN RESULT', {
        orderId,
        restaurantId,
        tokenCount: uniqueTokens.length,
        hasToken: uniqueTokens.length > 0
      });

      if (uniqueTokens.length === 0) {

        console.warn(
          `ℹ️ Notification skipped: No FCM token found for restaurant ID [${restaurantId}].`
        );

        return;
      }

      // -------------------------------------------------------
      // 2. Send notification
      // -------------------------------------------------------

      for (const token of uniqueTokens) {

        console.log('🚀 SENDING MERCHANT FCM', {
          orderId,
          restaurantId,
          tokenPreview:
            `${token.substring(0, 15)}...`
        });

        await sendNotification({

          token,

          title: '🔔 New Order Received',

          body:
            `Order #${orderId}\n` +
            `Customer: ${customerName}\n` +
            `Amount: ₹${totalAmount}`,

          data: {
            orderId,
            restaurantId,
            type: 'NEW_ORDER',
            role: 'RESTAURANT',
            customerName,
            totalAmount: String(totalAmount)
          },

          link:
            `/restaurant/dashboard?orderId=${orderId}`
        });

        console.log('✅ MERCHANT FCM SENT', {
          orderId,
          restaurantId
        });
      }

    } catch (error) {

      console.error(
        '❌ Failed to send Merchant New Order Notification (non-blocking):',
        error
      );
    }
  }

// ===========================================================
// DELIVERY PARTNERS - NEW ORDER ALERT
// ===========================================================

/**
 * Send NEW ORDER alert to delivery partners.
 * Triggered immediately after successful order creation.
 */
async notifyDeliveryPartnersNewOrder(params: {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  customerName?: string;
  totalAmount?: number;
}): Promise<void> {
  try {
    const {
      orderId,
      restaurantId,
      restaurantName,
      customerName,
      totalAmount,
    } = params;

    console.log(
      '🔔 DELIVERY PARTNER NEW ORDER FCM START',
      {
        orderId,
        restaurantId,
        restaurantName,
      }
    );

    // Find all delivery partners having FCM token
    const allUsers = await userRepository.scan();

    const deliveryPartners = allUsers.filter(
      (u: any) =>
        (
          u.role === 'DELIVERY_PARTNER' ||
          u.role === 'DELIVERY' ||
          u.role === 'RIDER' ||
          (
            u.userId &&
            u.userId.startsWith('DEL-')
          )
        ) &&
        u.fcmToken
    );

    console.log(
      '🎯 DELIVERY PARTNERS WITH FCM',
      {
        orderId,
        count: deliveryPartners.length,
      }
    );

    // Send NEW ORDER notification
    for (const partner of deliveryPartners) {
      if (!partner.fcmToken) continue;

      console.log(
        '🚀 SENDING DELIVERY PARTNER NEW ORDER FCM',
        {
          orderId,
          deliveryId:
            partner.userId ||
            partner.email,
        }
      );

      await sendNotification({
        token: partner.fcmToken,

        title: '🔔 New Order Available',

        body:
          `New order #${orderId} from ${restaurantName}` +
          (
            customerName
              ? ` for ${customerName}`
              : ''
          ) +
          (
            totalAmount !== undefined
              ? ` • ₹${totalAmount}`
              : ''
          ),

        data: {
          orderId,
          restaurantId,
          type: 'NEW_ORDER',
          role: 'DELIVERY_PARTNER',
          restaurantName,
          customerName: customerName || '',
          totalAmount:
            totalAmount !== undefined
              ? String(totalAmount)
              : '',
        },

        link:
          `/delivery/dashboard?orderId=${orderId}`,
      });

      console.log(
        '✅ DELIVERY PARTNER NEW ORDER FCM SENT',
        {
          orderId,
          deliveryId:
            partner.userId ||
            partner.email,
        }
      );
    }

  } catch (error) {
    console.error(
      '❌ Failed to send Delivery Partner New Order Notification (non-blocking):',
      error
    );
  }
}
  // ===========================================================
  // CUSTOMER - ORDER STATUS
  // ===========================================================

  /**
   * Send Order Status Update push notification to Customer.
   *
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

      // -------------------------------------------------------
      // START LOG
      // -------------------------------------------------------

      console.log('🔔 CUSTOMER FCM START', {

        orderId: params.orderId,

        customerId: params.customerId,

        customerEmail: params.customerEmail,

        status: params.status

      });

      const {
        orderId,
        customerId,
        customerEmail,
        status
      } = params;

      let restaurantName =
        params.restaurantName ||
        'Partner Restaurant';

      let fcmToken: string | undefined;


      // =======================================================
      // 1. FIND CUSTOMER BY EMAIL
      // =======================================================

      if (customerEmail) {

        console.log('🔎 CUSTOMER FCM LOOKUP BY EMAIL', {
          customerEmail
        });

        const customerByEmail =
          await userRepository.findByEmail(
            customerEmail
          );

        if (customerByEmail?.fcmToken) {

          fcmToken =
            customerByEmail.fcmToken;

          console.log('✅ FCM TOKEN FOUND BY EMAIL', {
            customerEmail
          });
        }
      }


      // =======================================================
      // 2. FIND CUSTOMER BY USER ID
      // =======================================================

      if (!fcmToken && customerId) {

        console.log('🔎 CUSTOMER FCM LOOKUP BY USER ID', {
          customerId
        });

        const customerById =
          await userRepository.findByUserId(
            customerId
          );

        if (customerById?.fcmToken) {

          fcmToken =
            customerById.fcmToken;

          console.log('✅ FCM TOKEN FOUND BY USER ID', {
            customerId
          });

        } else if (customerId.includes('@')) {

          console.log(
            '🔎 CUSTOMER ID LOOKS LIKE EMAIL, TRYING EMAIL LOOKUP',
            {
              customerId
            }
          );

          const customerByEmailId =
            await userRepository.findByEmail(
              customerId
            );

          if (customerByEmailId?.fcmToken) {

            fcmToken =
              customerByEmailId.fcmToken;

            console.log(
              '✅ FCM TOKEN FOUND BY CUSTOMER EMAIL ID',
              {
                customerId
              }
            );
          }
        }
      }


      // =======================================================
      // 3. FETCH FULL ORDER IF TOKEN NOT FOUND
      // =======================================================

      if (!fcmToken && orderId) {

        console.log(
          '🔎 CUSTOMER FCM LOOKUP FROM FULL ORDER',
          {
            orderId
          }
        );

        const fullOrder =
          await orderRepository.findByOrderId(
            orderId
          );

        if (fullOrder) {

          if (fullOrder.restaurantName) {

            restaurantName =
              fullOrder.restaurantName;
          }

          // ---------------------------------------------------
          // Find customer by order customerEmail
          // ---------------------------------------------------

          if (fullOrder.customerEmail) {

            console.log(
              '🔎 LOOKING CUSTOMER FROM ORDER EMAIL',
              {
                customerEmail:
                  fullOrder.customerEmail
              }
            );

            const cust =
              await userRepository.findByEmail(
                fullOrder.customerEmail
              );

            if (cust?.fcmToken) {

              fcmToken =
                cust.fcmToken;

              console.log(
                '✅ FCM TOKEN FOUND FROM ORDER EMAIL',
                {
                  customerEmail:
                    fullOrder.customerEmail
                }
              );
            }
          }


          // ---------------------------------------------------
          // Find customer by order customerId
          // ---------------------------------------------------

          if (
            !fcmToken &&
            fullOrder.customerId
          ) {

            console.log(
              '🔎 LOOKING CUSTOMER FROM ORDER CUSTOMER ID',
              {
                customerId:
                  fullOrder.customerId
              }
            );

            const cust =
              await userRepository.findByUserId(
                fullOrder.customerId
              );

            if (cust?.fcmToken) {

              fcmToken =
                cust.fcmToken;

              console.log(
                '✅ FCM TOKEN FOUND FROM ORDER CUSTOMER ID',
                {
                  customerId:
                    fullOrder.customerId
                }
              );
            }
          }

        } else {

          console.warn(
            '⚠️ Full order not found while looking for FCM token',
            {
              orderId
            }
          );
        }
      }


      // =======================================================
      // IMPORTANT:
      // DO NOT USE FIRST USER TOKEN FALLBACK
      // =======================================================

      /*
        ❌ REMOVED:

        const allUsers = await userRepository.scan();

        const userWithToken = allUsers.find(
          u => u.role === 'USER' && u.fcmToken
        );

        This was dangerous because if the actual customer
        doesn't have a token, notification could be sent
        to another customer.
      */


      // =======================================================
      // TOKEN RESULT LOG
      // =======================================================

      console.log('🎯 CUSTOMER FCM TOKEN RESULT', {

        orderId,

        customerId,

        customerEmail,

        status,

        restaurantName,

        hasToken: !!fcmToken,

        tokenPreview: fcmToken
          ? `${fcmToken.substring(0, 15)}...`
          : null

      });


      // =======================================================
      // NO TOKEN
      // =======================================================

      if (!fcmToken) {

        console.warn(

          `ℹ️ Notification skipped: Customer [` +
          `${customerEmail || customerId || orderId}` +
          `] has no active FCM token registered.`

        );

        return;
      }


      // =======================================================
      // 4. MAP STATUS TO TITLE & BODY
      // =======================================================

      let title = '';

      let body = '';

      switch (status) {

        case 'ACCEPTED':

          title =
            '🎉 Order Accepted';

          body =
            `Your order from ${restaurantName} has been accepted by the restaurant.`;

          break;


        case 'PREPARING':

          title =
            'Chef is Preparing Meal';

          body =
            `The chef is preparing your delicious meal at ${restaurantName}.`;

          break;


        case 'READY':

          title =
            '📦 Order Ready';

          body =
            `Your order from ${restaurantName} is prepared and ready!`;

          break;


        case 'ASSIGNED':

          title =
            '🛵 Rider Assigned';

          body =
            'A delivery partner has been assigned to pick up your order.';

          break;


        case 'PICKED_UP':

          title =
            '🚚 Order On The Way';

          body =
            `Your order from ${restaurantName} is picked up and on the way to your address.`;

          break;


        case 'DELIVERED':

          title =
            '✅ Order Delivered';

          body =
            `Your order from ${restaurantName} has been delivered. Enjoy your meal!`;

          break;


        case 'CANCELLED':

          title =
            '❌ Order Cancelled';

          body =
            `Your order from ${restaurantName} was cancelled.`;

          break;


        default:

          title =
            '🔔 Order Update';

          body =
            `Your order #${orderId} status has been updated to ${status}.`;

          break;
      }


      // =======================================================
      // SEND CUSTOMER FCM
      // =======================================================

      console.log('🚀 SENDING CUSTOMER FCM', {

        orderId,

        customerId,

        customerEmail,

        status,

        title,

        body,

        tokenPreview:
          `${fcmToken.substring(0, 15)}...`

      });


      await sendNotification({

        token: fcmToken,

        title,

        body,

        data: {

          orderId,

          status,

          type: 'ORDER_STATUS_UPDATE'

        },

        link: '/orders'

      });


      // =======================================================
      // SUCCESS LOG
      // =======================================================

      console.log('✅ CUSTOMER FCM SENT', {

        orderId,

        customerId,

        customerEmail,

        status

      });

    } catch (error) {

      console.error(
        '❌ Failed to send Customer Order Status Notification (non-blocking):',
        error
      );
    }
  }


  // ===========================================================
  // DELIVERY PARTNERS - PICKUP AVAILABLE
  // ===========================================================

  /**
   * Send Notification to Delivery Partners
   * when order is READY for pickup.
   */
  async notifyDeliveryPartnersPickupAvailable(params: {

    orderId: string;

    restaurantId: string;

    restaurantName: string;

  }): Promise<void> {

    try {

      const {
        orderId,
        restaurantId,
        restaurantName
      } = params;

      console.log(
        '🔔 DELIVERY PARTNER PICKUP FCM START',
        {
          orderId,
          restaurantId
        }
      );

      // -------------------------------------------------------
      // Scan all delivery partners
      // -------------------------------------------------------

      const allUsers =
        await userRepository.scan();

      const deliveryPartners =
        allUsers.filter(

          (u: any) =>

            (
              u.role === 'DELIVERY_PARTNER' ||
              u.role === 'DELIVERY' ||
              u.role === 'RIDER' ||
              (
                u.userId &&
                u.userId.startsWith('DEL-')
              )
            ) &&

            u.fcmToken
        );


      console.log(
        '🎯 DELIVERY PARTNERS WITH FCM',
        {
          orderId,
          count: deliveryPartners.length
        }
      );


      for (const partner of deliveryPartners) {

        if (partner.fcmToken) {

          console.log(
            '🚀 SENDING DELIVERY PARTNER FCM',
            {
              orderId,
              deliveryId:
                partner.userId ||
                partner.email
            }
          );

          await sendNotification({

            token:
              partner.fcmToken,

            title:
              '📦 Pickup Available',

            body:
              `Order #${orderId} is ready for pickup at ${restaurantName}.`,

            data: {

              orderId,

              restaurantId,

              type:
                'PICKUP_AVAILABLE'

            },

            link:
              '/delivery/dashboard'
          });

          console.log(
            '✅ DELIVERY PARTNER FCM SENT',
            {
              orderId
            }
          );
        }
      }

    } catch (error) {

      console.error(
        '❌ Failed to send Delivery Partner Notification (non-blocking):',
        error
      );
    }
  }


  // ===========================================================
  // RIDER - ORDER ASSIGNED
  // ===========================================================

  /**
   * Send FCM Push Notification to assigned rider
   * when Admin assigns an order.
   */
  async notifyRiderOrderAssigned(params: {

    orderId: string;

    riderId: string;

    riderEmail?: string;

    restaurantName?: string;

  }): Promise<void> {

    try {

      const {
        orderId,
        riderId,
        riderEmail,
        restaurantName
      } = params;


      console.log(
        '🔔 RIDER ASSIGNMENT FCM START',
        {
          orderId,
          riderId,
          riderEmail
        }
      );


      const allUsers =
        await userRepository.scan();


      const riderUser =
        allUsers.find(

          (u: any) =>

            (
              u.id === riderId ||
              u.userId === riderId ||
              u.email === riderEmail ||
              (
                u.email &&
                u.email === riderId
              )
            ) &&

            u.fcmToken
        );


      if (
        riderUser &&
        riderUser.fcmToken
      ) {

        console.log(
          '🚀 SENDING RIDER ASSIGNMENT FCM',
          {
            orderId,
            riderId
          }
        );


        await sendNotification({

          token:
            riderUser.fcmToken,

          title:
            '🛵 Order Assigned to You',

          body:
            `Order #${orderId} from ${restaurantName || 'Restaurant'} has been assigned to you by Admin.`,

          data: {

            orderId,

            type:
              'ORDER_ASSIGNED'

          },

          link:
            '/delivery/dashboard'

        });


        console.log(
          '✅ RIDER ASSIGNMENT FCM SENT',
          {
            orderId,
            riderId
          }
        );

      } else {

        console.warn(
          '⚠️ Rider FCM token not found',
          {
            orderId,
            riderId,
            riderEmail
          }
        );
      }

    } catch (error) {

      console.error(
        '❌ Failed to send Rider Order Assigned Notification (non-blocking):',
        error
      );
    }
  }


  // ===========================================================
  // RESTAURANT - DELIVERY COMPLETED
  // ===========================================================

  /**
   * Send Delivery Completed notification to Restaurant.
   */
  async notifyDeliveryCompleted(params: {

    orderId: string;

    restaurantId: string;

  }): Promise<void> {

    try {

      const {
        orderId,
        restaurantId
      } = params;


      console.log(
        '🔔 DELIVERY COMPLETED FCM START',
        {
          orderId,
          restaurantId
        }
      );


      const restaurant =
        await restaurantRepository.findByRestaurantId(
          restaurantId
        );


      const fcmToken =
        restaurant?.fcmToken;


      if (fcmToken) {

        console.log(
          '🚀 SENDING DELIVERY COMPLETED FCM',
          {
            orderId,
            restaurantId
          }
        );


        await sendNotification({

          token:
            fcmToken,

          title:
            'Delivery Completed',

          body:
            `Order #${orderId} has been successfully delivered to the customer.`,

          data: {

            orderId,

            type:
              'DELIVERY_COMPLETED'

          },

          link:
            '/restaurant/dashboard'

        });


        console.log(
          '✅ DELIVERY COMPLETED FCM SENT',
          {
            orderId,
            restaurantId
          }
        );

      } else {

        console.warn(
          '⚠️ Restaurant FCM token not found',
          {
            orderId,
            restaurantId
          }
        );
      }

    } catch (error) {

      console.error(
        '❌ Failed to send Delivery Completed Notification (non-blocking):',
        error
      );
    }
  }


  // ===========================================================
  // ORDER CANCELLATION
  // ===========================================================

  /**
   * Send Order Cancellation Notifications.
   */
  async notifyOrderCancelled(params: {

    orderId: string;

    customerId: string;

    restaurantId: string;

    cancelledBy:
      | 'CUSTOMER'
      | 'RESTAURANT'
      | 'DELIVERY';

  }): Promise<void> {

    try {

      const {
        orderId,
        customerId,
        restaurantId,
        cancelledBy
      } = params;


      console.log(
        '🔔 ORDER CANCELLED FCM START',
        {
          orderId,
          customerId,
          restaurantId,
          cancelledBy
        }
      );


      // =======================================================
      // CUSTOMER CANCELLED
      // Notify Restaurant
      // =======================================================

      if (
        cancelledBy === 'CUSTOMER'
      ) {

        const restaurant =
          await restaurantRepository.findByRestaurantId(
            restaurantId
          );


        if (restaurant?.fcmToken) {

          console.log(
            '🚀 SENDING RESTAURANT CANCELLATION FCM',
            {
              orderId,
              restaurantId
            }
          );


          await sendNotification({

            token:
              restaurant.fcmToken,

            title:
              'Order Cancelled',

            body:
              `Customer cancelled order #${orderId}.`,

            data: {

              orderId,

              type:
                'ORDER_CANCELLED'

            },

            link:
              '/restaurant/dashboard'

          });


          console.log(
            '✅ RESTAURANT CANCELLATION FCM SENT',
            {
              orderId
            }
          );
        }


      // =======================================================
      // RESTAURANT CANCELLED
      // Notify Customer
      // =======================================================

      } else if (
        cancelledBy === 'RESTAURANT'
      ) {

        const customer =
          await userRepository.findByUserId(
            customerId
          );


        if (customer?.fcmToken) {

          console.log(
            '🚀 SENDING CUSTOMER CANCELLATION FCM',
            {
              orderId,
              customerId
            }
          );


          await sendNotification({

            token:
              customer.fcmToken,

            title:
              '❌ Order Cancelled',

            body:
              `Restaurant cancelled order #${orderId}.`,

            data: {

              orderId,

              type:
                'ORDER_CANCELLED'

            },

            link:
              '/orders'

          });


          console.log(
            '✅ CUSTOMER CANCELLATION FCM SENT',
            {
              orderId,
              customerId
            }
          );
        } else {

          console.warn(
            '⚠️ Customer FCM token not found for cancellation',
            {
              orderId,
              customerId
            }
          );
        }
      }

    } catch (error) {

      console.error(
        '❌ Failed to send Cancellation Notification (non-blocking):',
        error
      );
    }
  }
}


// =============================================================
// EXPORT
// =============================================================

export const notificationService =
  new NotificationService();

export default notificationService;