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

    // Dynamic origin detection for web production (e.g., https://retail.arisotechnologies.com)
    if (window.location.protocol && window.location.protocol.startsWith('http') && window.location.hostname) {
      return `${window.location.origin}/api`;
    }
  }
  
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    const envUrl = String(import.meta.env.VITE_API_URL).trim();
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
      return envUrl.replace(/\/+$/, '');
    }
  }
  
  return 'https://retail.arisotechnologies.com/api';
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
  } else if (typeof options.body === 'string' && !headers['Content-Type'] && !headers['content-type']) {
    const trimmed = options.body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const fetchOptions = {
    ...options,
    headers
  };

  // Attach timeout controller if no custom signal provided to prevent hanging requests when network is dead
  const timeoutMs = options.timeout !== undefined ? options.timeout : (fullUrl.includes('/printers') ? 10000 : 4500);
  const controller = typeof AbortController !== 'undefined' && !options.signal && timeoutMs > 0 ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
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

    // If no refresh token is present, server rejected access token - expire session cleanly
    if (!refreshToken) {
      handleSessionExpired('TOKEN_EXPIRED');
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

        // Explicitly terminate session if refresh token is expired or unauthorized on server
        if (rData && rData.code === 'LOGGED_IN_ELSEWHERE') {
          handleSessionExpired('LOGGED_IN_ELSEWHERE');
        } else if (rData && rData.code === 'USER_INACTIVE') {
          handleSessionExpired('USER_INACTIVE');
        } else {
          handleSessionExpired('TOKEN_EXPIRED');
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
export async function downloadFile(endpoint, defaultFilename = 'export.xlsx', options = {}) {
  try {
    const response = await apiFetch(endpoint, options);
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
    const res = await apiFetch('/api/menu', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
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
    const res = await apiFetch('/api/categories', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
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
    const res = await apiFetch('/api/settings/profile', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
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
    const res = await apiFetch('/api/settings/receipt', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
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
    const res = await apiFetch('/api/printers', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
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

// ----------------------------------------------------
// Held Receipts / Park Sale API & Offline Helpers
// ----------------------------------------------------

export async function fetchHeldReceipts(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append('search', params.search);
  if (params.status) searchParams.append('status', params.status);

  try {
    const url = `/api/held-receipts${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch held receipts from server');
    }
    const receipts = await res.json();
    
    // Sync to Dexie for offline readiness
    try {
      if (Array.isArray(receipts) && db?.held_receipts) {
        await db.held_receipts.bulkPut(receipts.map(r => ({
          ...r,
          id: String(r.id)
        })));
      }
    } catch (cacheErr) {
      console.warn('[fetchHeldReceipts] Dexie cache warning:', cacheErr);
    }
    
    return receipts;
  } catch (err) {
    // Offline or network error: fallback to local Dexie cache
    console.warn('[fetchHeldReceipts] Fetch failed, falling back to local Dexie:', err);
    try {
      if (db?.held_receipts) {
        let query = db.held_receipts.toCollection();
        let items = await query.toArray();
        const activeStatus = params.status || 'held';
        items = items.filter(r => r.status === activeStatus);
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          items = items.filter(r => 
            (r.hold_number && r.hold_number.toLowerCase().includes(q)) ||
            (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
            (r.customer_phone && r.customer_phone.toLowerCase().includes(q)) ||
            (r.notes && r.notes.toLowerCase().includes(q))
          );
        }
        return items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
    } catch (localErr) {
      console.error('[fetchHeldReceipts] Dexie retrieval failed:', localErr);
    }
    throw err;
  }
}

export async function createHeldReceipt(data) {
  try {
    const res = await apiFetch('/api/held-receipts', {
      method: 'POST',
      body: data
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to hold receipt');
    }
    const result = await res.json();
    // Cache created receipt locally
    try {
      if (db?.held_receipts && result?.held_receipt) {
        await db.held_receipts.put({
          ...result.held_receipt,
          id: String(result.held_receipt.id)
        });
      }
    } catch (dexErr) {
      console.warn('[createHeldReceipt] Dexie cache warning:', dexErr);
    }
    return result;
  } catch (err) {
    const isNetworkError = (
      !navigator.onLine || 
      err.isOffline ||
      err.name === 'NetworkError' || 
      err.name === 'TypeError' ||
      err.message?.includes('Failed to fetch')
    );

    if (isNetworkError && db?.held_receipts) {
      const localId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '').slice(0, 4);
      const randomSeq = String(Math.floor(Math.random() * 900) + 100);
      const offlineHoldNumber = `HOLD-${timeStr}-${randomSeq}`;
      
      const offlineRecord = {
        id: localId,
        hold_number: offlineHoldNumber,
        status: 'held',
        restaurant_id: data.restaurant_id || 1,
        branch_id: data.branch_id || null,
        created_by_user_id: data.created_by_user_id || null,
        cashier_name: data.cashier_name || 'Cashier',
        customer_id: data.customer_id || null,
        customer_name: data.customer_name || 'Walk-in Customer',
        customer_phone: data.customer_phone || '',
        customer_address: data.customer_address || '',
        customer_gst: data.customer_gst || '',
        item_count: data.item_count || 0,
        subtotal: data.subtotal || 0,
        discount_type: data.discount_type || 'fixed',
        discount_value: data.discount_value || 0,
        discount_amount: data.discount_amount || 0,
        tax_type: data.tax_type || 'inclusive',
        tax_amount: data.tax_amount || 0,
        total_amount: data.total_amount || 0,
        cart_data: typeof data.cart_data === 'string' ? JSON.parse(data.cart_data) : data.cart_data,
        notes: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_offline: true
      };

      await db.held_receipts.put(offlineRecord);
      return {
        message: 'Receipt held locally (offline)',
        held_receipt: offlineRecord,
        hold_number: offlineHoldNumber,
        is_offline: true
      };
    }
    throw err;
  }
}

export async function updateHeldReceipt(id, data) {
  try {
    const res = await apiFetch(`/api/held-receipts/${id}`, {
      method: 'PUT',
      body: data
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update held receipt');
    }
    const result = await res.json();
    try {
      if (db?.held_receipts && result?.held_receipt) {
        await db.held_receipts.put({
          ...result.held_receipt,
          id: String(result.held_receipt.id)
        });
      }
    } catch (dexErr) {
      console.warn('[updateHeldReceipt] Dexie cache warning:', dexErr);
    }
    return result;
  } catch (err) {
    if (db?.held_receipts) {
      const existing = await db.held_receipts.get(String(id));
      if (existing) {
        const updated = {
          ...existing,
          ...data,
          cart_data: typeof data.cart_data === 'string' ? JSON.parse(data.cart_data) : (data.cart_data || existing.cart_data),
          updated_at: new Date().toISOString()
        };
        await db.held_receipts.put(updated);
        return { message: 'Receipt updated locally', held_receipt: updated };
      }
    }
    throw err;
  }
}

export async function resumeHeldReceipt(id) {
  try {
    const res = await apiFetch(`/api/held-receipts/${id}/resume`, {
      method: 'POST'
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to resume held receipt');
    }
    const result = await res.json();
    return result;
  } catch (err) {
    if (db?.held_receipts) {
      const existing = await db.held_receipts.get(String(id));
      if (existing) {
        existing.status = 'resumed';
        existing.resumed_at = new Date().toISOString();
        await db.held_receipts.put(existing);
        return { message: 'Receipt marked resumed locally', held_receipt: existing };
      }
    }
    throw err;
  }
}

export async function completeHeldReceipt(id, saleId = null, invoiceNumber = null) {
  try {
    const res = await apiFetch(`/api/held-receipts/${id}/complete`, {
      method: 'POST',
      body: { sale_id: saleId, invoice_number: invoiceNumber }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to complete held receipt');
    }
    const result = await res.json();
    try {
      if (db?.held_receipts) {
        await db.held_receipts.delete(String(id));
      }
    } catch (dexErr) {
      console.warn('[completeHeldReceipt] Dexie delete warning:', dexErr);
    }
    return result;
  } catch (err) {
    if (db?.held_receipts) {
      try {
        await db.held_receipts.delete(String(id));
      } catch (e) {
        console.warn('Could not remove held receipt from Dexie', e);
      }
    }
    return { success: true };
  }
}

export async function cancelHeldReceipt(id, reason = 'Cancelled by cashier') {
  try {
    const res = await apiFetch(`/api/held-receipts/${id}/cancel`, {
      method: 'POST',
      body: { reason }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to cancel held receipt');
    }
    const result = await res.json();
    try {
      if (db?.held_receipts) {
        await db.held_receipts.delete(String(id));
      }
    } catch (dexErr) {
      console.warn('[cancelHeldReceipt] Dexie delete warning:', dexErr);
    }
    return result;
  } catch (err) {
    if (db?.held_receipts) {
      try {
        await db.held_receipts.delete(String(id));
      } catch (e) {
        console.warn('Could not remove held receipt from Dexie', e);
      }
    }
    throw err;
  }
}

// ==========================================
// CUSTOMER RECEIVABLES & CREDIT SALE METHODS
// ==========================================

export async function fetchReceivablesSummary(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/receivables/summary${query ? '?' + query : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch receivables summary');
  }
  return res.json();
}

export async function fetchCustomerUnpaidInvoices(customerId) {
  const res = await apiFetch(`/api/receivables/customers/${customerId}/invoices`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch customer invoices');
  }
  return res.json();
}

export async function recordCustomerPayment(paymentData) {
  const res = await apiFetch('/api/receivables/payments', {
    method: 'POST',
    body: paymentData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record customer payment');
  }
  return res.json();
}

export async function fetchCustomerAgeingReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/receivables/ageing${query ? '?' + query : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch ageing report');
  }
  return res.json();
}

export async function fetchCustomerStatement(customerId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/receivables/customers/${customerId}/statement${query ? '?' + query : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch customer statement');
  }
  return res.json();
}
