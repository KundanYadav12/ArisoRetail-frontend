import { db } from './offlineDb.js';

/**
 * Hash a plain text string using SHA-256 via native browser Web Crypto API
 */
export async function hashPassword(password) {
  if (!password) return '';
  const msgUint8 = new TextEncoder().encode(password);
  const subtle = (typeof window !== 'undefined' && window.crypto?.subtle) || globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Crypto API unavailable');
  const hashBuffer = await subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Seed default offline store profile, categories, items, and receipt settings if database is empty.
 */
export async function seedDefaultOfflineDataIfNeeded() {
  try {
    const catCount = await db.categories.count().catch(() => 0);
    if (catCount === 0) {
      const defaultCategories = [
        { id: 1, name: 'General', sequence: 1 },
        { id: 2, name: 'Groceries', sequence: 2 },
        { id: 3, name: 'Snacks & Beverages', sequence: 3 },
        { id: 4, name: 'Dairy & Bakery', sequence: 4 },
        { id: 5, name: 'Household', sequence: 5 }
      ];
      await db.categories.bulkPut(defaultCategories);
    }

    const menuCount = await db.menu_items.count().catch(() => 0);
    if (menuCount === 0) {
      const sampleItems = [
        { id: 1, name: 'Sample Item 1', price: 100, selling_price: 100, cost_price: 80, sku: 'SKU-001', barcode: '8901001', category_id: 1, category_name: 'General', current_stock: 50 },
        { id: 2, name: 'Sample Item 2', price: 250, selling_price: 250, cost_price: 200, sku: 'SKU-002', barcode: '8901002', category_id: 2, category_name: 'Groceries', current_stock: 30 },
        { id: 3, name: 'Cold Drink 500ml', price: 40, selling_price: 40, cost_price: 32, sku: 'SKU-003', barcode: '8901003', category_id: 3, category_name: 'Snacks & Beverages', current_stock: 100 },
        { id: 4, name: 'Bread Loaf', price: 45, selling_price: 45, cost_price: 35, sku: 'SKU-004', barcode: '8901004', category_id: 4, category_name: 'Dairy & Bakery', current_stock: 25 },
        { id: 5, name: 'Mineral Water 1L', price: 20, selling_price: 20, cost_price: 14, sku: 'SKU-005', barcode: '8901005', category_id: 3, category_name: 'Snacks & Beverages', current_stock: 60 }
      ];
      await db.menu_items.bulkPut(sampleItems);
    }

    const receiptSetting = await db.settings.get('receipt_settings').catch(() => null);
    if (!receiptSetting) {
      await db.settings.put({
        key: 'receipt_settings',
        value: {
          store_name: 'Ariso Retail Store',
          restaurant_name: 'Ariso Retail Store',
          address: 'Main Market, Local Terminal',
          phone: '+91 9876543210',
          gstin: '',
          cart_position: 'right',
          paper_width: 80,
          header_message: 'Welcome to Ariso Retail',
          thank_you_message: 'Thank you for shopping with us!',
          footer_message: 'Please visit again',
          terms_conditions: 'Items once sold can be exchanged within 7 days with original invoice.'
        }
      });
    }

    const profileSetting = await db.settings.get('restaurant_profile').catch(() => null);
    if (!profileSetting) {
      await db.settings.put({
        key: 'restaurant_profile',
        value: {
          name: 'Ariso Retail Store',
          currency_symbol: '₹',
          tax_rate: 0
        }
      });
    }
  } catch (err) {
    console.warn('[OfflineDB] Error seeding default offline data:', err);
  }
}

/**
 * Cache user login credentials and session tokens locally for offline verification.
 * Saves in both Dexie (IndexedDB) and localStorage fallback.
 */
export async function cacheUserCredentials(user, password, accessToken = '', refreshToken = '') {
  if (!user || (!user.id && !user.email && !user.username)) return;
  try {
    const passwordHash = await hashPassword(password);
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const cleanUsername = (user.username || user.email || '').trim().toLowerCase();

    const record = {
      id: user.id || cleanEmail || cleanUsername,
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passwordHash,
      access_token: accessToken || '',
      refresh_token: refreshToken || '',
      role: user.role || 'admin',
      name: user.name || cleanUsername,
      restaurant_id: user.restaurant_id || 1,
      restaurant_name: user.restaurant_name || 'Ariso Retail POS',
      raw_user_payload: JSON.stringify(user),
      updated_at: new Date().toISOString()
    };

    // Store in Dexie
    await db.users.put(record);

    // Also store in LocalStorage for instant fallback
    try {
      localStorage.setItem(`OFFLINE_CRED_${cleanUsername}`, JSON.stringify(record));
      if (cleanEmail && cleanEmail !== cleanUsername) {
        localStorage.setItem(`OFFLINE_CRED_${cleanEmail}`, JSON.stringify(record));
      }
    } catch (_) {}

    console.log(`[OfflineAuth] Credentials cached successfully for: ${cleanUsername || cleanEmail}`);
  } catch (err) {
    console.error('[OfflineAuth] Error caching credentials:', err);
  }
}

/**
 * Verify credentials locally when offline.
 * Returns { user, accessToken, refreshToken } if valid.
 * Automatically provisions a local offline operator session if no local account exists yet.
 */
export async function verifyOfflineLogin(identifier, password) {
  const cleanId = (identifier || 'admin').trim().toLowerCase();
  const inputPassword = password || 'admin';
  const inputHash = await hashPassword(inputPassword);

  try {
    // 1. Search Dexie by email or username
    let localRecord = await db.users.where('email').equals(cleanId).first().catch(() => null);
    if (!localRecord) {
      localRecord = await db.users.where('username').equals(cleanId).first().catch(() => null);
    }
    if (!localRecord) {
      const all = await db.users.toArray().catch(() => []);
      localRecord = all.find(
        (u) =>
          (u.email && u.email.toLowerCase() === cleanId) ||
          (u.username && u.username.toLowerCase() === cleanId)
      );
    }

    // 2. Fallback to LocalStorage if Dexie didn't find record
    if (!localRecord) {
      const stored = localStorage.getItem(`OFFLINE_CRED_${cleanId}`);
      if (stored) {
        try {
          localRecord = JSON.parse(stored);
        } catch (_) {}
      }
    }

    // 3. If matching record found, verify password
    if (localRecord) {
      if (localRecord.password_hash === inputHash || !localRecord.password_hash) {
        const user = JSON.parse(localRecord.raw_user_payload || '{}');
        const token = localRecord.access_token || localStorage.getItem('ARISO_RETAIL_TOKEN') || `OFFLINE_TOKEN_${Date.now()}`;
        const refreshToken = localRecord.refresh_token || localStorage.getItem('ARISO_RETAIL_REFRESH_TOKEN') || '';

        await seedDefaultOfflineDataIfNeeded();

        console.log(`[OfflineAuth] Offline login successful for ${cleanId}`);
        return {
          user: {
            ...user,
            role: user.role || 'admin',
            restaurant_name: user.restaurant_name || 'Ariso Retail POS'
          },
          accessToken: token,
          refreshToken: refreshToken,
          isOfflineSession: true
        };
      } else {
        // Password mismatch for cached user
        console.warn(`[OfflineAuth] Password mismatch for offline user ${cleanId}`);
        return null;
      }
    }

    // 4. Standalone / First-Time Offline Mode: Auto-provision local administrator session
    const cleanName = cleanId.split('@')[0];
    const displayName = cleanName ? (cleanName.charAt(0).toUpperCase() + cleanName.slice(1)) : 'Admin';
    const newUser = {
      id: 1,
      username: cleanName || 'admin',
      email: cleanId.includes('@') ? cleanId : `${cleanName || 'admin'}@ariso.local`,
      name: displayName || 'Offline Admin',
      role: 'admin',
      restaurant_id: 1,
      restaurant_name: 'Ariso Retail POS',
      is_offline_user: true
    };

    const offlineToken = `OFFLINE_TOKEN_${Date.now()}`;
    const offlineRefreshToken = `OFFLINE_REFRESH_${Date.now()}`;

    // Cache credentials locally so future logins succeed
    await cacheUserCredentials(newUser, inputPassword, offlineToken, offlineRefreshToken);
    await seedDefaultOfflineDataIfNeeded();

    console.log(`[OfflineAuth] Auto-provisioned standalone offline user: ${cleanId}`);
    return {
      user: newUser,
      accessToken: offlineToken,
      refreshToken: offlineRefreshToken,
      isOfflineSession: true
    };
  } catch (err) {
    console.error('[OfflineAuth] Error verifying offline login:', err);

    // Absolute fallback so the offline app is never blocked
    const fallbackUser = {
      id: 1,
      username: 'admin',
      email: 'admin@ariso.local',
      name: 'Offline Admin',
      role: 'admin',
      restaurant_id: 1,
      restaurant_name: 'Ariso Retail POS',
      is_offline_user: true
    };
    return {
      user: fallbackUser,
      accessToken: `OFFLINE_TOKEN_${Date.now()}`,
      refreshToken: '',
      isOfflineSession: true
    };
  }
}
