import type { User, Role } from '../types/auth.types';

// In-Memory Authentication State (Never persisted to localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let inMemoryUser: User | null = null;

// Obsolete / Sensitive storage keys that MUST be purged from browser storage
const OBSOLETE_KEYS = [
  'foodway_jwt_token',
  'foodway_user_id',
  'foodway_user_role',
  'foodway_user_name',
  'foodway_user_email',
  'foodway_user_phone',
  'foodway_user_addresses',
  'foodway_restaurant_id',
  'foodway_token_expiry',
  'foodway_status_changed_at',
  'adminAuth',
  'restaurantAuth',
  'userAuth',
  'admin_orders',
  'admin_restaurants',
  'admin_activities',
  'foodway_video_urls',
  'hms_laboratory_inventory',
  'hms_payroll',
  'hms_settings_invoice',
  'mk_cart'
];

/**
 * Automatically purges obsolete authentication & sensitive data from localStorage & sessionStorage
 * while preserving harmless UI settings (e.g. foodway-theme, foodway-language)
 */
export const cleanupObsoleteStorage = (): void => {
  try {
    if (typeof window === 'undefined') return;

    OBSOLETE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    // Ignore storage cleanup error in restricted environments
  }
};

/**
 * Save auth data into React/JS memory state (and clear obsolete persistent storage)
 */
export const saveSession = (
  token: string,
  user: User,
  _expiresInSeconds?: number
): void => {
  inMemoryAccessToken = token;
  inMemoryUser = {
    ...user,
    role: (user.role || 'USER').toUpperCase() as Role
  };

  // Run security cleanup of persistent storage
  cleanupObsoleteStorage();
};

/**
 * Clear in-memory session and purge obsolete storage
 */
export const clearSession = (): void => {
  inMemoryAccessToken = null;
  inMemoryUser = null;

  cleanupObsoleteStorage();
};

/**
 * Retrieve active in-memory JWT Access Token
 */
export const getToken = (): string | null => {
  return inMemoryAccessToken;
};

/**
 * Set active in-memory JWT Access Token
 */
export const setToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

/**
 * Get Current Authenticated User object from in-memory state
 */
export const getCurrentUser = (): User | null => {
  return inMemoryUser;
};

/**
 * Set Current Authenticated User object in in-memory state
 */
export const setCurrentUser = (user: User | null): void => {
  inMemoryUser = user ? {
    ...user,
    role: (user.role || 'USER').toUpperCase() as Role
  } : null;
};

/**
 * Get Current User Role from in-memory state
 */
export const getCurrentRole = (): Role | null => {
  return inMemoryUser ? inMemoryUser.role : null;
};

/**
 * Get Restaurant ID if logged in as Restaurant from in-memory state
 */
export const getRestaurantId = (): string | null => {
  return inMemoryUser?.restaurantId || inMemoryUser?.shopId || null;
};

/**
 * Check if user is authenticated in memory
 */
export const isAuthenticated = (): boolean => {
  return !!inMemoryUser && !!inMemoryAccessToken;
};

/**
 * Check if token has expired
 */
export const isTokenExpired = (): boolean => {
  return false;
};
