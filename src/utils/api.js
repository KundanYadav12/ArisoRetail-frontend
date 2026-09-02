/**
 * Centralized API fetch wrapper with automatic JWT token refresh.
 * Uses import.meta.env.VITE_API_URL for production and development environment compatibility.
 */

import { db } from './offlineDb';
import { SyncService } from './syncService';

export const PRODUCTION_API_URL = (import.meta.env.VITE_PRODUCTION_API_URL || 'https://arisoretail.duckdns.org/api').replace(/\/+$/, '');
export const LOCAL_DEV_API_URL = (import.meta.env.VITE_DEV_API_URL || 'http://localhost:5005/api').replace(/\/+$/, '');

const isElectron = typeof window !== 'undefined' && (window.electron || window.location.protocol === 'file:');
const storedApiUrl = typeof window !== 'undefined' ? window.localStorage.getItem('ARISO_RETAIL_API_URL') : null;
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// In Electron / Windows application:
// - If user configured a custom URL in localStorage, use it.
// - If running in local Vite development (import.meta.env.DEV), default to local backend.
// - In production builds, default to the live production backend (https://arisoretail.duckdns.org/api).
// In Web browser:
// - If on localhost, use local dev backend.
// - In production web, use relative '/api' or production URL.
const defaultBaseUrl = isElectron 
  ? (storedApiUrl || (import.meta.env.DEV ? LOCAL_DEV_API_URL : PRODUCTION_API_URL)) 
  : (isLocalhost ? (import.meta.env.VITE_API_URL || LOCAL_DEV_API_URL) : (import.meta.env.VITE_API_URL || '/api'));

export const API_BASE_URL = (storedApiUrl || (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api' ? import.meta.env.VITE_API_URL : defaultBaseUrl)).replace(/\/+$/, '');

export function getApiUrl(endpoint) {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  } else if (cleanEndpoint === '/api') {
    cleanEndpoint = '';
  }
  
  if (!cleanEndpoint.startsWith('/') && cleanEndpoint !== '') {
    cleanEndpoint = '/' + cleanEndpoint;
  }
  
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export function resolveImageUrl(path) {
  if (!path) return '';
  let cleanPath = path;
  if (cleanPath.startsWith('file://') || cleanPath.startsWith('content://') || cleanPath.startsWith('ph://') || cleanPath.startsWith('data:') || cleanPath.startsWith('blob:')) {
    return cleanPath;
  }
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    const uploadsIndex = cleanPath.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      cleanPath = cleanPath.substring(uploadsIndex);
    } else {
      return cleanPath;
    }
  }
  const formattedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  const host = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${host}${formattedPath}`;
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Clear local credentials and notify app of session termination
 */
export function handleSessionExpired(reason = null) {
  localStorage.removeItem('ARISO_RETAIL_TOKEN');
  localStorage.removeItem('ARISO_RETAIL_REFRESH_TOKEN');
  localStorage.removeItem('ARISO_RETAIL_USER');
  window.dispatchEvent(new CustomEvent('auth_session_expired', { detail: { reason } }));
}

export async function apiFetch(url, options = {}) {
  const fullUrl = getApiUrl(url);
  const headers = options.headers || {};
  let token = localStorage.getItem('ARISO_RETAIL_TOKEN');

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const fetchOptions = {
    ...options,
    headers
  };

  const response = await fetch(fullUrl, fetchOptions);

  // Exclude auth-specific endpoints to prevent infinite refresh loops
  const isAuthEndpoint = fullUrl.includes('/api/auth/login') ||
                         fullUrl.includes('/api/auth/refresh') ||
                         fullUrl.includes('/api/auth/verify-otp');

  // Handle 401 Unauthorized (Expired or Invalid Access Token)
  if (response.status === 401 && !isAuthEndpoint) {
    // Check if session was invalidated due to single device login elsewhere
    try {
      const clonedRes = response.clone();
      const errorData = await clonedRes.json();
      if (errorData && errorData.code === 'LOGGED_IN_ELSEWHERE') {
        handleSessionExpired('LOGGED_IN_ELSEWHERE');
        return response;
      }
    } catch (e) {
      // Ignore clone/JSON parsing errors
    }

    const refreshToken = localStorage.getItem('ARISO_RETAIL_REFRESH_TOKEN') || localStorage.getItem('pos_refresh_token');

    // If no refresh token is present, clear session and return 401 response
    if (!refreshToken) {
      handleSessionExpired();
      return response;
    }

    // Check if another concurrent request or tab already refreshed the token
    const latestToken = localStorage.getItem('ARISO_RETAIL_TOKEN');
    if (latestToken && latestToken !== token) {
      fetchOptions.headers['Authorization'] = `Bearer ${latestToken}`;
      return fetch(fullUrl, fetchOptions);
    }

    // If a refresh is already in progress in this tab, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(newToken => {
          fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(fullUrl, fetchOptions);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, token: refreshToken })
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('ARISO_RETAIL_TOKEN', newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', newRefreshToken);
        }
        if (data.user) {
          localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));
        }

        // Notify all queued subscribers
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Dispatch token refresh event
        window.dispatchEvent(new CustomEvent('auth_token_refreshed', { detail: { token: newAccessToken, user: data.user } }));

        // Transparently retry the original failed request
        fetchOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(fullUrl, fetchOptions);
      } else {
        // Refresh token expired or invalid
        let reason = null;
        try {
          const rData = await refreshRes.json();
          if (rData && rData.code === 'LOGGED_IN_ELSEWHERE') {
            reason = 'LOGGED_IN_ELSEWHERE';
          }
        } catch (e) {}
        processQueue(new Error('Refresh token expired'), null);
        isRefreshing = false;
        handleSessionExpired(reason);
      }
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      isRefreshing = false;
      handleSessionExpired();
    }
  }

  if (response.status === 429) {
    console.warn(`[API Rate-Limit 429] Request limit reached on ${fullUrl}`);
  }

  return response;
}

/**
 * Triggers an authenticated file download using apiFetch (with automatic JWT token refresh).
 */
export async function downloadFile(endpoint, defaultFilename = 'export.xlsx') {
  try {
    const response = await apiFetch(endpoint);
    if (!response.ok) {
      let errMessage = 'Failed to download file.';
      try {
        const errJson = await response.json();
        errMessage = errJson.error || errMessage;
      } catch (e) {}
      throw new Error(errMessage);
    }

    let filename = defaultFilename;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (err) {
    console.error('File download error:', err);
    throw err;
  }
}

export async function fetchMobileMenu(token) {
  try {
    const res = await apiFetch('/api/menu');
    if (res.ok) {
      const items = await res.json();
      const menuList = Array.isArray(items) ? items : (items?.items || []);
      // Cache locally in background
      db.menu_items.clear().then(() => {
        db.menu_items.bulkPut(menuList);
      }).catch(err => console.warn('[IndexedDB] Failed to cache menu:', err.message));
      return menuList;
    }
  } catch (err) {
    console.warn('[API Fetch Menu Fallback] Offline, reading local DB:', err.message);
  }
  // Fallback to local Dexie cache
  return await db.menu_items.toArray();
}

export async function fetchMobileCategories(token) {
  try {
    const res = await apiFetch('/api/categories');
    if (res.ok) {
      const categories = await res.json();
      // Cache locally in background
      db.categories.clear().then(() => {
        db.categories.bulkPut(categories);
      }).catch(err => console.warn('[IndexedDB] Failed to cache categories:', err.message));
      return categories;
    }
  } catch (err) {
    console.warn('[API Fetch Categories Fallback] Offline, reading local DB:', err.message);
  }
  // Fallback to local Dexie cache
  return await db.categories.toArray();
}

export async function fetchRestaurantProfile(token) {
  try {
    const res = await apiFetch('/api/settings/profile');
    if (res.ok) {
      const profile = await res.json();
      db.settings.put({ key: 'restaurant_profile', value: profile }).catch(() => {});
      return profile;
    }
  } catch (e) {
    console.warn('[API Fetch Profile Fallback] Offline, reading local profile settings');
  }
  const local = await db.settings.get('restaurant_profile');
  return local ? local.value : null;
}

export async function fetchReceiptSettings(token) {
  try {
    const res = await apiFetch('/api/settings/receipt');
    if (res.ok) {
      const settings = await res.json();
      db.settings.put({ key: 'receipt_settings', value: settings }).catch(() => {});
      return settings;
    }
  } catch (e) {
    console.warn('[API Fetch Settings Fallback] Offline, reading local receipt settings');
  }
  const local = await db.settings.get('receipt_settings');
  return local ? local.value : null;
}

export async function createOrder(token, orderData) {
  try {
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      body: orderData
    });
    
    if (res.ok) {
      return await res.json();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create order on server.');
    }
  } catch (err) {
    // If it's a network/fetch error, fall back to offline order persistence
    const isNetworkError = !err.status && (
      err.message.includes('Failed to fetch') || 
      err.message.includes('NetworkError') || 
      err.message.includes('network') ||
      err.message.includes('TypeError') ||
      err.message.includes('type error')
    );
                           
    if (isNetworkError) {
      console.log('[API CreateOrder Failover] Server unreachable. Enqueuing order locally...', orderData);
      const savedOrder = await SyncService.saveOfflineOrder(orderData);
      return {
        message: 'Order saved locally in offline queue.',
        unique_order_number: savedOrder.offline_id,
        orderNumber: savedOrder.offline_id,
        id: savedOrder.offline_id,
        isOffline: true
      };
    }
    
    throw err;
  }
}
