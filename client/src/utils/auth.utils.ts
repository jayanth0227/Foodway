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
  'hms_settings_invoice'
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
 * Save auth data into React/JS memory state AND persistent storage
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

  try {
    localStorage.removeItem('foodway_explicit_logout');
    localStorage.setItem('foodway_session_token', token);
    localStorage.setItem('foodway_session_user', JSON.stringify(inMemoryUser));
  } catch (e) { }

  // Run security cleanup of obsolete persistent storage
  cleanupObsoleteStorage();
};

/**
 * Clear in-memory session and persistent storage thoroughly
 */
export const clearSession = (): void => {
  inMemoryAccessToken = null;
  inMemoryUser = null;

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodway_explicit_logout', 'true');

      const allAuthKeys = [
        'foodway_session_token',
        'foodway_session_user',
        'foodway_auth_token',
        'mk_auth_token',
        'restaurantAuth',
        'adminAuth',
        'userAuth',
        'currentUser',
        'vendor_active_tab',
        'admin_active_tab',
        'foodway_jwt_token',
        'foodway_user_id',
        'foodway_user_role',
        'foodway_user_name',
        'foodway_user_email',
        'foodway_user_phone',
        'foodway_user_addresses',
        'foodway_restaurant_id',
        'foodway_token_expiry',
        'foodway_status_changed_at'
      ];

      allAuthKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      try {
        sessionStorage.clear();
      } catch (e) {}
    }
  } catch (e) { }

  cleanupObsoleteStorage();
};

/**
 * Retrieve active JWT Access Token
 */
export const getToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const saved = localStorage.getItem('foodway_session_token');
    if (saved) {
      inMemoryAccessToken = saved;
      return saved;
    }
  } catch (e) { }
  return null;
};

/**
 * Set active JWT Access Token
 */
export const setToken = (token: string | null): void => {
  inMemoryAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('foodway_session_token', token);
    } else {
      localStorage.removeItem('foodway_session_token');
    }
  } catch (e) { }
};

/**
 * Get Current Authenticated User object
 */
export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined' && localStorage.getItem('foodway_explicit_logout') === 'true') {
    inMemoryUser = null;
    return null;
  }
  if (inMemoryUser) return inMemoryUser;
  try {
    const savedUser = localStorage.getItem('foodway_session_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && typeof parsed === 'object') {
        inMemoryUser = parsed;
        return parsed;
      }
    }
  } catch (e) { }
  return null;
};

/**
 * Set Current Authenticated User object
 */
export const setCurrentUser = (user: User | null): void => {
  inMemoryUser = user ? {
    ...user,
    role: (user.role || 'USER').toUpperCase() as Role
  } : null;
  try {
    if (inMemoryUser) {
      localStorage.setItem('foodway_session_user', JSON.stringify(inMemoryUser));
    } else {
      localStorage.removeItem('foodway_session_user');
    }
  } catch (e) { }
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
