import type { User, Role } from '../types/auth.types';

const STORAGE_KEYS = {
  TOKEN: 'foodway_jwt_token',
  USER_ID: 'foodway_user_id',
  ROLE: 'foodway_user_role',
  NAME: 'foodway_user_name',
  EMAIL: 'foodway_user_email',
  RESTAURANT_ID: 'foodway_restaurant_id',
  TOKEN_EXPIRY: 'foodway_token_expiry',
};

/**
 * Save auth data into SessionStorage and populate legacy keys for backward compatibility
 */
export const saveSession = (
  token: string,
  user: User,
  expiresInSeconds?: number
): void => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
    sessionStorage.setItem(STORAGE_KEYS.USER_ID, user.id);
    sessionStorage.setItem(STORAGE_KEYS.ROLE, user.role.toUpperCase());
    sessionStorage.setItem(STORAGE_KEYS.NAME, user.name);
    sessionStorage.setItem(STORAGE_KEYS.EMAIL, user.email);

    if (user.restaurantId) {
      sessionStorage.setItem(STORAGE_KEYS.RESTAURANT_ID, user.restaurantId);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.RESTAURANT_ID);
    }

    if (expiresInSeconds) {
      const expiryTimestamp = Date.now() + expiresInSeconds * 1000;
      sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTimestamp.toString());
    }

    // Populate legacy keys so legacy components operate seamlessly
    const roleUpper = user.role.toUpperCase();
    if (roleUpper === 'ADMIN') {
      const adminData = JSON.stringify({ isLoggedIn: true, email: user.email, role: 'admin', token });
      sessionStorage.setItem('adminAuth', adminData);
      localStorage.setItem('adminAuth', adminData);
    } else if (roleUpper === 'RESTAURANT') {
      const restId = user.restaurantId || user.id;
      const restData = JSON.stringify({
        isLoggedIn: true,
        email: user.email,
        role: 'RESTAURANT',
        token,
        restaurant: {
          id: restId,
          name: user.name,
          email: user.email,
          ownerName: user.name,
        }
      });
      sessionStorage.setItem('restaurantAuth', restData);
      localStorage.setItem('restaurantAuth', restData);
    } else {
      const userData = JSON.stringify({
        isLoggedIn: true,
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'user',
        token
      });
      sessionStorage.setItem('userAuth', userData);
      localStorage.setItem('userAuth', userData);
    }
  } catch (error) {
    console.error('Error saving session to sessionStorage:', error);
  }
};

/**
 * Clear session from SessionStorage and LocalStorage
 */
export const clearSession = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('restaurantAuth');
    localStorage.removeItem('userAuth');
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('restaurantAuth');
    sessionStorage.removeItem('userAuth');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

/**
 * Retrieve JWT Token
 */
export const getToken = (): string | null => {
  return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
};

/**
 * Get Current Authenticated User object from SessionStorage
 */
export const getCurrentUser = (): User | null => {
  const token = getToken();
  const id = sessionStorage.getItem(STORAGE_KEYS.USER_ID);
  const role = sessionStorage.getItem(STORAGE_KEYS.ROLE) as Role | null;
  const name = sessionStorage.getItem(STORAGE_KEYS.NAME);
  const email = sessionStorage.getItem(STORAGE_KEYS.EMAIL);
  const restaurantId = sessionStorage.getItem(STORAGE_KEYS.RESTAURANT_ID) || undefined;

  if (!token || !id || !role || !name || !email) {
    // Check legacy fallback
    const rawRestAuth = sessionStorage.getItem('restaurantAuth') || localStorage.getItem('restaurantAuth');
    if (rawRestAuth) {
      try {
        const parsed = JSON.parse(rawRestAuth);
        if (parsed.isLoggedIn && parsed.restaurant) {
          return {
            id: parsed.restaurant.id || 'restaurant_user',
            name: parsed.restaurant.name || 'Restaurant Owner',
            email: parsed.email || parsed.restaurant.email || 'restaurant@foodway.com',
            role: 'RESTAURANT',
            restaurantId: parsed.restaurant.id
          };
        }
      } catch (e) {}
    }

    const rawAdminAuth = sessionStorage.getItem('adminAuth') || localStorage.getItem('adminAuth');
    if (rawAdminAuth) {
      try {
        const parsed = JSON.parse(rawAdminAuth);
        if (parsed.isLoggedIn) {
          return {
            id: 'admin_1',
            name: 'Administrator',
            email: parsed.email || 'admin@foodway.com',
            role: 'ADMIN'
          };
        }
      } catch (e) {}
    }

    return null;
  }

  // Check token expiration
  if (isTokenExpired()) {
    clearSession();
    return null;
  }

  return {
    id,
    name,
    email,
    role: role.toUpperCase() as Role,
    restaurantId
  };
};

/**
 * Get Current User Role
 */
export const getCurrentRole = (): Role | null => {
  const user = getCurrentUser();
  return user ? user.role : null;
};

/**
 * Get Restaurant ID if logged in as Restaurant
 */
export const getRestaurantId = (): string | null => {
  const user = getCurrentUser();
  return user?.restaurantId || sessionStorage.getItem(STORAGE_KEYS.RESTAURANT_ID);
};

/**
 * Check if user is authenticated and token is valid
 */
export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  return true;
};

/**
 * Check if stored token has expired
 */
export const isTokenExpired = (): boolean => {
  const expiryStr = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  if (!expiryStr) return false;
  const expiryTimestamp = parseInt(expiryStr, 10);
  return Date.now() >= expiryTimestamp;
};
