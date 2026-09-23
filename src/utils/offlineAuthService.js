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
      role: user.role || 'staff',
      name: user.name || cleanUsername,
      restaurant_id: user.restaurant_id || null,
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
 * Returns { user, accessToken, refreshToken } if valid, null otherwise.
 */
export async function verifyOfflineLogin(identifier, password) {
  if (!identifier || !password) return null;
  const cleanId = identifier.trim().toLowerCase();
  const inputHash = await hashPassword(password);

  try {
    // 1. Search Dexie by email or username
    let localRecord = await db.users.where('email').equals(cleanId).first();
    if (!localRecord) {
      localRecord = await db.users.where('username').equals(cleanId).first();
    }
    if (!localRecord) {
      // Direct search all in case of migration
      const all = await db.users.toArray();
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

    if (localRecord && localRecord.password_hash === inputHash) {
      const user = JSON.parse(localRecord.raw_user_payload || '{}');
      const token = localRecord.access_token || localStorage.getItem('ARISO_RETAIL_TOKEN') || `OFFLINE_TOKEN_${Date.now()}`;
      const refreshToken = localRecord.refresh_token || localStorage.getItem('ARISO_RETAIL_REFRESH_TOKEN') || '';

      console.log(`[OfflineAuth] Offline login successful for ${cleanId}`);
      return {
        user,
        accessToken: token,
        refreshToken: refreshToken,
        isOfflineSession: true
      };
    }
  } catch (err) {
    console.error('[OfflineAuth] Error verifying offline login:', err);
  }
  return null;
}
