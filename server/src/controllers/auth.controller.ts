import { Request, Response } from 'express';
import userService from '../services/user.service';
import restaurantService from '../services/restaurant.service';
import { generateToken, JwtUserPayload } from '../utils/jwt.utils';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { comparePassword, hashPassword } from '../utils/hash.utils';
import userRepository from '../repositories/user.repository';
import restaurantRepository from '../repositories/restaurant.repository';
import { generateUserId } from '../utils/idGenerator';
import socketService from '../services/socket.service';
import { sendPasswordResetOtpEmail } from '../services/email.service';

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie('foodway_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  });
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('foodway_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.clearCookie('foodway_session');
  res.cookie('foodway_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, phone, identifier, password } = req.body;
    const loginIdentifier = (identifier || email || phone || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email or Mobile number and password are required.'
      });
    }

    const cleanEmail = loginIdentifier.toLowerCase();

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
        setAuthCookie(res, token);

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

    // 2. Check if email belongs to a Shop/Restaurant account
    const shopMatch = await restaurantRepository.findByEmail(cleanEmail);
    let ownerUser = await userRepository.findByEmail(cleanEmail);

    if (shopMatch || (ownerUser && ['SHOP', 'RESTAURANT', 'VENDOR'].includes((ownerUser.role || '').toUpperCase()))) {
      let isPassValid = false;

      if (!isPassValid && ownerUser && ownerUser.password) {
        try {
          isPassValid = await comparePassword(password, ownerUser.password);
        } catch (e) {}
        if (!isPassValid && ownerUser.password === password) isPassValid = true;
      }

      if (!isPassValid && shopMatch) {
        const storedRestPassword = (shopMatch as any).password || (shopMatch as any).pass || (shopMatch as any).vendorPassword;
        if (storedRestPassword) {
          try {
            isPassValid = await comparePassword(password, storedRestPassword);
          } catch (e) {}
          if (!isPassValid && storedRestPassword === password) isPassValid = true;
        }
      }

      if (!isPassValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email address or password.'
        });
      }

      const hashedPassword = await hashPassword(password);
      const now = new Date().toISOString();

      if (!ownerUser) {
        const ownerUserId = shopMatch?.ownerUserId || generateUserId('SHOP');
        ownerUser = await userRepository.create({
          userId: ownerUserId,
          role: 'SHOP',
          name: shopMatch?.shopName || shopMatch?.restaurantName || 'Shop Owner',
          email: cleanEmail,
          phone: shopMatch?.phone || '',
          password: hashedPassword,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        });
      } else {
        ownerUser.role = 'SHOP';
      }

      const restaurantId = shopMatch?.shopId || shopMatch?.restaurantId || ownerUser.userId;

      const payload: JwtUserPayload = {
        id: ownerUser.userId,
        email: ownerUser.email,
        name: ownerUser.name,
        role: 'SHOP',
        restaurantId
      };

      const token = generateToken(payload);
      const expiresInSeconds = 86400;
      setAuthCookie(res, token);

      return res.json({
        success: true,
        message: 'Logged in successfully as SHOP.',
        token,
        user: {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: 'SHOP',
          restaurantId,
          shopId: restaurantId
        },
        expiresIn: expiresInSeconds
      });
    }

    // 3. Customer / Non-vendor user authentication against foodway-users table
    let authenticatedUser = await userService.authenticateUser(cleanEmail, password);

    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    let restaurantId: string | undefined = undefined;
    const finalShopMatch = await restaurantRepository.findByEmail(cleanEmail);

    if (finalShopMatch) {
      authenticatedUser.role = 'SHOP';
      restaurantId = finalShopMatch.shopId || finalShopMatch.restaurantId;
    } else {
      const userRoleUpper = (authenticatedUser.role || '').toUpperCase();
      if (['RESTAURANT', 'SHOP', 'VENDOR'].includes(userRoleUpper)) {
        const restaurant = await restaurantService.getRestaurantByOwnerUserId(authenticatedUser.userId);
        restaurantId = restaurant?.restaurantId || restaurant?.shopId || authenticatedUser.userId;
      }
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
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: `Logged in successfully as ${authenticatedUser.role}.`,
      token,
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        restaurantId: payload.restaurantId,
        shopId: payload.restaurantId
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

  // Extract current token from Bearer header or cookie to echo back to React memory state
  const activeToken = req.headers.authorization?.split(' ')[1] || req.cookies?.foodway_session || '';

  try {
    const dbUser = await userService.getUserById(req.user.id);
    if (!dbUser) {
      return res.json({
        success: true,
        token: activeToken,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          restaurantId: req.user.restaurantId,
          shopId: req.user.restaurantId
        }
      });
    }

    return res.json({
      success: true,
      token: activeToken,
      user: {
        id: dbUser.userId,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone || '',
        role: dbUser.role,
        restaurantId: req.user.restaurantId,
        shopId: req.user.restaurantId,
        profileImage: dbUser.profileImage || '',
        addresses: dbUser.addresses || [],
        createdAt: dbUser.createdAt,
        status: dbUser.status
      }
    });
  } catch (err: any) {
    return res.json({
      success: true,
      token: activeToken,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        restaurantId: req.user.restaurantId,
        shopId: req.user.restaurantId
      }
    });
  }
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
    setAuthCookie(res, token);

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
    const { name, email, phone, profileImage, addresses } = req.body;

    const existingUser = await userService.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const updates: any = {};
    if (name && name.trim()) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (Array.isArray(addresses)) updates.addresses = addresses;

    if (req.body.password && req.body.password.trim()) {
      const newHashedPass = await hashPassword(req.body.password.trim());
      updates.password = newHashedPass;
      
      try {
        let shopToUpdate = req.user.restaurantId ? await restaurantRepository.findByShopId(req.user.restaurantId) : null;
        if (!shopToUpdate) {
          shopToUpdate = await restaurantRepository.findByOwnerUserId(userId);
        }
        if (!shopToUpdate && existingUser.email) {
          shopToUpdate = await restaurantRepository.findByEmail(existingUser.email);
        }
        if (shopToUpdate) {
          await restaurantRepository.update(shopToUpdate.shopId, {
            password: newHashedPass,
            vendorPassword: req.body.password.trim()
          } as any);
        }
      } catch (e) {}
    }

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
    setAuthCookie(res, newToken);

    if (socketService) {
      socketService.emitProfileUpdated(updatedUser).catch(() => {});
    }

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
        restaurantId: req.user.restaurantId,
        shopId: req.user.restaurantId,
        profileImage: updatedUser.profileImage || '',
        addresses: updatedUser.addresses || [],
        createdAt: updatedUser.createdAt,
        status: updatedUser.status
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

// Store OTPs in memory with expiration timestamp
interface OtpRecord {
  otp: string;
  expiresAt: number;
  identifier: string;
  email: string;
}

const otpMemoryStore = new Map<string, OtpRecord>();

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    const cleanId = (identifier || '').trim().toLowerCase();

    if (!cleanId) {
      return res.status(400).json({ success: false, error: 'Email address or mobile number is required.' });
    }

    // Check if user exists in database
    let user = await userRepository.findByIdentifier(cleanId);
    if (!user) {
      user = await userRepository.findByEmail(cleanId);
    }

    let targetEmail = user?.email || (cleanId.includes('@') ? cleanId : null);
    let targetName = user?.name || 'Valued User';

    // If user not found in users table, check shops table for vendor email
    if (!user && !targetEmail) {
      const allShops = await restaurantRepository.findAll();
      const matchShop = allShops.find(s => 
        (s.email && s.email.toLowerCase() === cleanId) || 
        (s.phone && s.phone === cleanId) ||
        (s.ownerUserId && s.ownerUserId.toLowerCase() === cleanId)
      );
      if (matchShop) {
        targetEmail = matchShop.email;
        targetName = (matchShop as any).name || matchShop.restaurantName || 'Valued Partner';
      }
    }

    if (!targetEmail) {
      return res.status(404).json({
        success: false,
        error: 'No registered account found matching that email or mobile number.'
      });
    }

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // Valid for 10 minutes

    // Save to OTP memory store
    otpMemoryStore.set(cleanId, {
      otp: otpCode,
      expiresAt,
      identifier: cleanId,
      email: targetEmail
    });

    if (targetEmail.toLowerCase() !== cleanId) {
      otpMemoryStore.set(targetEmail.toLowerCase(), {
        otp: otpCode,
        expiresAt,
        identifier: cleanId,
        email: targetEmail
      });
    }

    // Send email with OTP
    await sendPasswordResetOtpEmail(targetEmail, otpCode, targetName);

    return res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${targetEmail}.`,
      email: targetEmail
    });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process password reset request.'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();
    const password = (newPassword || '').trim();

    if (!cleanId || !cleanOtp || !password) {
      return res.status(400).json({
        success: false,
        error: 'Identifier, verification code, and new password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const otpRecord = otpMemoryStore.get(cleanId);
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active password reset request found. Please request a new verification code.'
      });
    }

    if (Date.now() > otpRecord.expiresAt) {
      otpMemoryStore.delete(cleanId);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new code.'
      });
    }

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid 6-digit verification code. Please check and try again.'
      });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // 1. Update in userRepository
    let user = await userRepository.findByIdentifier(cleanId);
    if (!user && otpRecord.email) {
      user = await userRepository.findByEmail(otpRecord.email);
    }

    if (user) {
      await userRepository.update(user.userId, { password: hashedPassword });
    }

    // 2. Also update in restaurant/shop repository if vendor account
    const allShops = await restaurantRepository.findAll();
    const matchingShops = allShops.filter(s =>
      (s.email && s.email.toLowerCase() === (user?.email?.toLowerCase() || otpRecord.email.toLowerCase())) ||
      (s.ownerUserId && user && s.ownerUserId === user.userId)
    );

    for (const shop of matchingShops) {
      await restaurantRepository.update(shop.shopId, {
        password: hashedPassword,
        vendorPassword: password
      } as any);
    }

    // Clear OTP from memory store
    otpMemoryStore.delete(cleanId);
    if (otpRecord.email) {
      otpMemoryStore.delete(otpRecord.email.toLowerCase());
    }

    return res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password. Please try again.'
    });
  }
};



