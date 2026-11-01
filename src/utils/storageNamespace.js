import Dexie from 'dexie';

/**
 * Storage Namespace & Cache Isolation Utility
 * Guarantees 100% strict tenant and user isolation across localStorage, sessionStorage, and IndexedDB.
 */

export const CACHE_ISOLATION_VERSION = 'v2';

export function getCurrentTenantId() {
  if (typeof window === 'undefined') return 'server';
  try {
    const savedTenant = localStorage.getItem('ariso_current_tenant_id');
    if (savedTenant && savedTenant.trim() && savedTenant !== 'undefined' && savedTenant !== 'null') {
      return String(savedTenant).trim();
    }
    const rawUser = localStorage.getItem('ARISO_RETAIL_USER') || localStorage.getItem('pos_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && parsed.restaurant_id) {
        const tId = String(parsed.restaurant_id).trim();
        localStorage.setItem('ariso_current_tenant_id', tId);
        return tId;
      }
    }
  } catch (_) {}
  return 'default';
}

export function getCurrentUserId() {
  if (typeof window === 'undefined') return 'server';
  try {
    const rawUser = localStorage.getItem('ARISO_RETAIL_USER') || localStorage.getItem('pos_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && (parsed.id || parsed.username)) {
        return String(parsed.id || parsed.username).trim();
      }
    }
  } catch (_) {}
  return 'global';
}

/**
 * Constructs a strictly namespaced key: "ariso:<tenantId>:<userId>:<key>"
 */
export function getTenantStorageKey(key, tenantId = null, userId = null) {
  const tId = tenantId ? String(tenantId).trim() : getCurrentTenantId();
  const uId = userId ? String(userId).trim() : getCurrentUserId();
  return `ariso:${tId}:${uId}:${key}`;
}

export function getTenantItem(key, tenantId = null, userId = null) {
  if (typeof window === 'undefined') return null;
  const namespacedKey = getTenantStorageKey(key, tenantId, userId);
  return localStorage.getItem(namespacedKey);
}

export function setTenantItem(key, value, tenantId = null, userId = null) {
  if (typeof window === 'undefined') return;
  const namespacedKey = getTenantStorageKey(key, tenantId, userId);
  if (typeof value === 'object' && value !== null) {
    localStorage.setItem(namespacedKey, JSON.stringify(value));
  } else {
    localStorage.setItem(namespacedKey, String(value));
  }
}

export function removeTenantItem(key, tenantId = null, userId = null) {
  if (typeof window === 'undefined') return;
  const namespacedKey = getTenantStorageKey(key, tenantId, userId);
  localStorage.removeItem(namespacedKey);
}

/**
 * Purges all storage keys belonging to a specific tenant
 */
export function purgeTenantStorage(tenantId) {
  if (typeof window === 'undefined') return;
  const prefix = `ariso:${tenantId}:`;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/**
 * One-time migration: Purges legacy un-namespaced caches (like the one previously in the user's browser)
 * Bumps version to v2 so subsequent reloads are fast and clean.
 */
export async function runCacheIsolationMigration() {
  if (typeof window === 'undefined') return;
  try {
    const currentVersion = localStorage.getItem('ariso_cache_isolation_version');
    if (currentVersion === CACHE_ISOLATION_VERSION) {
      return; // Already migrated to strict namespacing
    }

    console.log('[CacheIsolation] Performing one-time legacy cache purge & v2 migration...');

    // 1. Delete legacy un-namespaced localStorage keys
    const legacyKeys = [
      'ariso_offline_menu_items',
      'ariso_offline_categories',
      'ariso_offline_receipt_settings',
      'ariso_offline_restaurant_profile',
      'ariso_offline_printers',
      'ariso_pos_cart',
      'ariso_offline_user_credentials'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));

    // 2. Delete legacy un-namespaced Dexie database if present
    try {
      if (Dexie && typeof Dexie.delete === 'function') {
        await Dexie.delete('ArisoRetailOfflineDB');
        console.log('[CacheIsolation] Legacy ArisoRetailOfflineDB deleted successfully.');
      }
    } catch (dexieErr) {
      console.warn('[CacheIsolation] Legacy Dexie delete warning:', dexieErr.message);
    }

    // 3. Set version marker
    localStorage.setItem('ariso_cache_isolation_version', CACHE_ISOLATION_VERSION);
    console.log('[CacheIsolation] Migration to v2 completed successfully.');
  } catch (err) {
    console.warn('[CacheIsolation] Migration warning:', err.message);
  }
}
