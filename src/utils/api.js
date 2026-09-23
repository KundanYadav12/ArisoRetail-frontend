/**
 * Centralized API fetch wrapper with automatic JWT token refresh.
 * Uses import.meta.env.VITE_API_URL for production and development environment compatibility.
 */
import { db } from './offlineDb.js';
import { SyncService } from './syncService.js';

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      const custom = localStorage.getItem('ARISO_API_SERVER_URL');
      if (custom && (custom.includes('localhost') || custom.includes('127.0.0.1'))) {
        return custom.trim().replace(/\/+$/, '');
      }
      if (custom && !custom.includes('localhost') && !custom.includes('127.0.0.1')) {
        localStorage.removeItem('ARISO_API_SERVER_URL');
      }
      return 'http://localhost:5005/api';
    }

    const custom = localStorage.getItem('ARISO_API_SERVER_URL');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api') {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  
  return 'https://arisoretail.duckdns.org/api';
}

export function setCustomBaseUrl(url) {
  if (!url) {
    localStorage.removeItem('ARISO_API_SERVER_URL');
  } else {
    localStorage.setItem('ARISO_API_SERVER_URL', url.trim().replace(/\/+$/, ''));
  }
}

export const API_BASE_URL = getBaseUrl();

export function getApiUrl(endpoint, customBase = null) {
  const base = customBase ? customBase.replace(/\/+$/, '') : getBaseUrl();
  if (!endpoint) return base;
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
  
  return `${base}${cleanEndpoint}`;
}

export function resolveImageUrl(path) {
  if (!path) return '';
  let cleanPath = String(path).trim();
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
  const currentBase = getBaseUrl();
  const host = (currentBase || 'http://localhost:5005/api').replace(/\/api\/?$/, '');
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
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_refresh_token');
  localStorage.removeItem('pos_user');
  window.dispatchEvent(new CustomEvent('auth_session_expired', { detail: { reason } }));
}

export async function apiFetch(url, options = {}) {
  // Fast offline failover: if device is explicitly offline, throw immediately without hanging network calls
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineErr = new Error('Device is offline');
    offlineErr.name = 'NetworkError';
    offlineErr.isOffline = true;
    throw offlineErr;
  }

  const fullUrl = getApiUrl(url);
  const token = localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token');
  const refreshToken = localStorage.getItem('ARISO_RETAIL_REFRESH_TOKEN') || localStorage.getItem('pos_refresh_token');

  const headers = {
    ...(options.headers || {})
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
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

  // Attach 4.5s timeout controller if no custom signal provided to prevent hanging requests when network is dead
  const controller = typeof AbortController !== 'undefined' && !options.signal ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 4500) : null;
  if (controller) {
    fetchOptions.signal = controller.signal;
  }

  let response;
  try {
    response = await fetch(fullUrl, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);
  } catch (netErr) {
    if (timeoutId) clearTimeout(timeoutId);
    // Automatic Network Failover to Local Gateway when internet or cloud fails
    if (!fullUrl.includes('localhost') && !fullUrl.includes('127.0.0.1')) {
      const localFallbackUrl = fullUrl.replace(/^https?:\/\/[^\/]+/, 'http://localhost:5005');
      try {
        console.warn(`[API Network Failover] Cloud connection lost. Route fallback -> ${localFallbackUrl}`);
        const localController = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const localTimeout = localController ? setTimeout(() => localController.abort(), 2000) : null;
        response = await fetch(localFallbackUrl, { ...fetchOptions, signal: localController?.signal });
        if (localTimeout) clearTimeout(localTimeout);
      } catch (localErr) {
        throw netErr;
      }
    } else {
      throw netErr;
    }
  }

  // Exclude auth-specific endpoints to prevent infinite refresh loops
  const isAuthEndpoint = fullUrl.includes('/api/auth/login') ||
                         fullUrl.includes('/api/auth/refresh') ||
                         fullUrl.includes('/api/auth/verify-otp');

  // Handle 401 Unauthorized (Expired or Invalid Access Token)
  if (response.status === 401 && !isAuthEndpoint) {
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

    // If no refresh token is present, return 401 response without destroying cached session
    if (!refreshToken) {
      return response;
    }

    // Check if another concurrent request or tab already refreshed the token
    const latestToken = localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token');
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
      const refreshUrl = getApiUrl('/auth/refresh');
      const refreshRes = await fetch(refreshUrl, {
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
          localStorage.setItem('pos_token', newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', newRefreshToken);
          localStorage.setItem('pos_refresh_token', newRefreshToken);
        }
        if (data.user) {
          localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));
          localStorage.setItem('pos_user', JSON.stringify(data.user));
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
        let rData = null;
        try {
          rData = await refreshRes.json();
        } catch (e) {}

        processQueue(new Error('Silent token refresh failed'), null);
        isRefreshing = false;

        // Only explicitly terminate session if account was logged in elsewhere or permanently deactivated
        if (rData && rData.code === 'LOGGED_IN_ELSEWHERE') {
          handleSessionExpired('LOGGED_IN_ELSEWHERE');
        } else if (rData && rData.code === 'USER_INACTIVE') {
          handleSessionExpired('USER_INACTIVE');
        } else {
          console.warn('[API Auth] Background token refresh failed, keeping persistent offline session intact.');
        }
      }
    } catch (refreshErr) {
      console.warn('[API Auth] Network error during silent token refresh, maintaining local session:', refreshErr.message);
      processQueue(refreshErr, null);
      isRefreshing = false;
      // Do NOT clear credentials on network errors
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
  // Fast offline return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const cached = await db.menu_items.toArray();
      if (cached && cached.length > 0) return cached;
    } catch (e) {
      console.warn('[Dexie Menu Read Error]', e);
    }
    const local = localStorage.getItem('ariso_offline_menu_items');
    return local ? JSON.parse(local) : [];
  }

  try {
    const res = await apiFetch('/api/menu');
    if (res.ok) {
      const menuList = await res.json();
      if (Array.isArray(menuList) && menuList.length > 0) {
        db.menu_items.clear().then(() => {
          db.menu_items.bulkPut(menuList);
        }).catch(err => console.warn('[IndexedDB] Failed to cache menu:', err.message));
        try {
          localStorage.setItem('ariso_offline_menu_items', JSON.stringify(menuList));
        } catch (e) {}
      }
      return menuList;
    }
  } catch (err) {
    console.warn('[API Fetch Menu Fallback] Offline, reading local DB/Storage:', err.message);
  }

  try {
    const items = await db.menu_items.toArray();
    if (items && items.length > 0) return items;
  } catch (e) {}
  const local = localStorage.getItem('ariso_offline_menu_items');
  return local ? JSON.parse(local) : [];
}

export async function fetchMobileCategories(token) {
  // Fast offline return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const cached = await db.categories.toArray();
      if (cached && cached.length > 0) return cached;
    } catch (e) {
      console.warn('[Dexie Categories Read Error]', e);
    }
    const local = localStorage.getItem('ariso_offline_categories');
    return local ? JSON.parse(local) : [];
  }

  try {
    const res = await apiFetch('/api/categories');
    if (res.ok) {
      const categories = await res.json();
      if (Array.isArray(categories) && categories.length > 0) {
        db.categories.clear().then(() => {
          db.categories.bulkPut(categories);
        }).catch(err => console.warn('[IndexedDB] Failed to cache categories:', err.message));
        try {
          localStorage.setItem('ariso_offline_categories', JSON.stringify(categories));
        } catch (e) {}
      }
      return categories;
    }
  } catch (err) {
    console.warn('[API Fetch Categories Fallback] Offline, reading local DB/Storage:', err.message);
  }

  try {
    const cats = await db.categories.toArray();
    if (cats && cats.length > 0) return cats;
  } catch (e) {}
  const local = localStorage.getItem('ariso_offline_categories');
  return local ? JSON.parse(local) : [];
}

export async function fetchRestaurantProfile(token) {
  // Fast offline return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const local = await db.settings.get('restaurant_profile');
      if (local && local.value) return local.value;
    } catch (e) {}
    const str = localStorage.getItem('ariso_offline_restaurant_profile');
    return str ? JSON.parse(str) : null;
  }

  try {
    const res = await apiFetch('/api/settings/profile');
    if (res.ok) {
      const profile = await res.json();
      if (profile) {
        db.settings.put({ key: 'restaurant_profile', value: profile }).catch(() => {});
        try {
          localStorage.setItem('ariso_offline_restaurant_profile', JSON.stringify(profile));
        } catch (e) {}
      }
      return profile;
    }
  } catch (e) {
    console.warn('[API Fetch Profile Fallback] Offline, reading local profile settings');
  }
  try {
    const local = await db.settings.get('restaurant_profile');
    if (local && local.value) return local.value;
  } catch (e) {}
  const str = localStorage.getItem('ariso_offline_restaurant_profile');
  return str ? JSON.parse(str) : null;
}

export async function fetchReceiptSettings(token) {
  // Fast offline return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const local = await db.settings.get('receipt_settings');
      if (local && local.value) return local.value;
    } catch (e) {}
    const str = localStorage.getItem('ariso_offline_receipt_settings');
    return str ? JSON.parse(str) : null;
  }

  try {
    const res = await apiFetch('/api/settings/receipt');
    if (res.ok) {
      const settings = await res.json();
      if (settings) {
        db.settings.put({ key: 'receipt_settings', value: settings }).catch(() => {});
        try {
          localStorage.setItem('ariso_offline_receipt_settings', JSON.stringify(settings));
        } catch (e) {}
      }
      return settings;
    }
  } catch (e) {
    console.warn('[API Fetch Settings Fallback] Offline, reading local receipt settings');
  }
  try {
    const local = await db.settings.get('receipt_settings');
    if (local && local.value) return local.value;
  } catch (e) {}
  const str = localStorage.getItem('ariso_offline_receipt_settings');
  return str ? JSON.parse(str) : null;
}

export async function fetchPrinters(token) {
  // Fast offline return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const cached = await db.printers.toArray();
      if (cached && cached.length > 0) return cached;
    } catch (e) {}
    const str = localStorage.getItem('ariso_offline_printers');
    return str ? JSON.parse(str) : [];
  }

  try {
    const res = await apiFetch('/api/printers');
    if (res.ok) {
      const printers = await res.json();
      if (Array.isArray(printers) && printers.length > 0) {
        db.printers.clear().then(() => {
          db.printers.bulkPut(printers);
        }).catch(() => {});
        try {
          localStorage.setItem('ariso_offline_printers', JSON.stringify(printers));
        } catch (e) {}
        return printers;
      }
    }
  } catch (e) {
    console.warn('[API Fetch Printers Fallback] Offline, reading local DB:', e.message);
  }
  try {
    const items = await db.printers.toArray();
    if (items && items.length > 0) return items;
  } catch (e) {}
  const str = localStorage.getItem('ariso_offline_printers');
  return str ? JSON.parse(str) : [];
}

export async function createOrder(token, orderData) {
  // If explicitly offline, save to queue immediately without network delay
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.log('[API CreateOrder Offline] Device is offline. Saving directly to queue:', orderData);
    const savedOrder = await SyncService.saveOfflineOrder(orderData);
    return {
      message: 'Order saved locally in offline queue.',
      unique_order_number: savedOrder.offline_id,
      orderNumber: savedOrder.offline_id,
      id: savedOrder.offline_id,
      isOffline: true
    };
  }

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
    const isNetworkError = !err.status && (
      err.message?.includes('Failed to fetch') || 
      err.message?.includes('NetworkError') || 
      err.message?.includes('network') ||
      err.message?.includes('TypeError') ||
      err.message?.includes('type error') ||
      err.message?.includes('abort') ||
      err.name === 'AbortError'
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

export async function fetchCustomers(query = '') {
  const url = query ? `/api/customers?search=${encodeURIComponent(query)}` : '/api/customers';
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch customers');
  }
  return await res.json();
}

export async function createCustomer(customerData) {
  const res = await apiFetch('/api/customers', {
    method: 'POST',
    body: customerData
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create customer');
  }
  return await res.json();
}

export async function fetchPendingOrders() {
  const res = await apiFetch('/api/orders?status=pending');
  if (!res.ok) {
    throw new Error('Failed to fetch pending orders');
  }
  return await res.json();
}

export async function confirmPendingOrder(orderId) {
  const res = await apiFetch(`/api/orders/${orderId}/confirm`, {
    method: 'POST'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to confirm order');
  }
  return await res.json();
}

export async function cancelPendingOrder(orderId, cancelReason = 'Cancelled by user') {
  const res = await apiFetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: { status: 'cancelled', cancel_reason: cancelReason }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to cancel order');
  }
  return await res.json();
}

