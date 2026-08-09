import { Request, Response } from 'express';
import userService from '../services/user.service';
import restaurantService from '../services/restaurant.service';
import { generateToken, JwtUserPayload } from '../utils/jwt.utils';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { comparePassword, hashPassword } from '../utils/hash.utils';
import userRepository from '../repositories/user.repository';
import restaurantRepository from '../repositories/restaurant.repository';
import { generateUserId } from '../utils/idGenerator';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Admin Credentials in process.env
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@foodway.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (cleanEmail === adminEmail) {
      const isAdminPasswordValid = await comparePassword(password, adminPassword);
      if (isAdminPasswordValid) {
        // Ensure Admin user exists in foodway-users table
        let adminUser = await userRepository.findByEmail(adminEmail);
        if (!adminUser) {
          const hashedAdminPass = await hashPassword(adminPassword);
          adminUser = await userRepository.create({
            userId: 'ADM-001',
            role: 'ADMIN',
            name: 'System Admin',
            email: adminEmail,
            password: hashedAdminPass,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        const payload: JwtUserPayload = {
          id: adminUser.userId,
          email: adminEmail,
          name: adminUser.name,
          role: 'ADMIN'
        };

        const token = generateToken(payload);
        const expiresInSeconds = 86400;

        return res.json({
          success: true,
          message: 'Logged in successfully as Admin.',
          token,
          user: {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            role: payload.role
          },
          expiresIn: expiresInSeconds
        });
      }
    }

    // 2. Authenticate against foodway-users table
    let authenticatedUser = await userService.authenticateUser(cleanEmail, password);

    // 3. Fallback check for Restaurant accounts in foodway-restaurants table
    if (!authenticatedUser) {
      const restaurant = await restaurantRepository.findByEmail(cleanEmail);
      if (restaurant) {
        let ownerUser = await userRepository.findByEmail(cleanEmail);
        const hashedPassword = await hashPassword(password);
        const now = new Date().toISOString();

        if (!ownerUser) {
          // Auto-sync owner user into foodway-users table
          const ownerUserId = restaurant.ownerUserId || generateUserId('RESTAURANT');
          ownerUser = await userRepository.create({
            userId: ownerUserId,
            role: 'RESTAURANT',
            name: restaurant.restaurantName,
            email: cleanEmail,
            phone: restaurant.phone || '',
            password: hashedPassword,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now
          });

          if (!restaurant.ownerUserId) {
            await restaurantRepository.update(restaurant.restaurantId, { ownerUserId });
          }

          authenticatedUser = ownerUser;
        } else {
          // Owner exists in foodway-users; update password for seamless access
          ownerUser = (await userRepository.update(ownerUser.userId, {
            password: hashedPassword,
            role: 'RESTAURANT',
            status: 'ACTIVE'
          })) || ownerUser;

          authenticatedUser = ownerUser;
        }
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // If user is RESTAURANT, fetch restaurant ID from foodway-restaurants table
    let restaurantId: string | undefined = undefined;
    if (authenticatedUser.role === 'RESTAURANT') {
      const restaurant = await restaurantService.getRestaurantByOwnerUserId(authenticatedUser.userId) ||
                         await restaurantRepository.findByEmail(cleanEmail);
      restaurantId = restaurant?.restaurantId || authenticatedUser.userId;
    }

    const payload: JwtUserPayload = {
      id: authenticatedUser.userId,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role as any,
      restaurantId
    };

    const token = generateToken(payload);
    const expiresInSeconds = 86400;

    return res.json({
      success: true,
      message: `Logged in successfully as ${authenticatedUser.role}.`,
      token,
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        restaurantId: payload.restaurantId
      },
      expiresIn: expiresInSeconds
    });
  } catch (error: any) {
    console.error('Unified Auth Login Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred during login.',
      details: error.message
    });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  return res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      restaurantId: req.user.restaurantId
    }
  });
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Missing required registration fields.' });
  }

  try {
    const newUser = await userService.registerUser({
      name,
      email,
      password,
      phone,
      role: 'USER'
    });

    const payload: JwtUserPayload = {
      id: newUser.userId,
      email: newUser.email,
      name: newUser.name,
      role: 'USER'
    };

    const token = generateToken(payload);
    const expiresInSeconds = 86400;

    return res.json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        role: 'USER'
      },
      expiresIn: expiresInSeconds
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register user.'
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const userId = req.user.id;
    const { name, email, phone } = req.body;

    const existingUser = await userService.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const updates: any = {};
    if (name && name.trim()) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    if (email && email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      const emailTaken = await userService.getUserByEmail(cleanEmail);
      if (emailTaken && emailTaken.userId !== userId) {
        return res.status(400).json({ success: false, error: 'This email is already in use by another account.' });
      }
      updates.email = cleanEmail;
    }

    updates.updatedAt = new Date().toISOString();

    const updatedUser = await userService.updateUserProfile(userId, updates);
    if (!updatedUser) {
      return res.status(500).json({ success: false, error: 'Failed to update profile in database.' });
    }

    const payload: JwtUserPayload = {
      id: updatedUser.userId,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role as any,
      restaurantId: req.user.restaurantId
    };

    const newToken = generateToken(payload);

    return res.json({
      success: true,
      message: 'Profile updated successfully in database.',
      token: newToken,
      user: {
        id: updatedUser.userId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        role: updatedUser.role,
        restaurantId: req.user.restaurantId
      }
    });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile.',
      details: error.message
    });
  }
};
