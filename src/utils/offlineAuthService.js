import { db } from './offlineDb';

/**
 * Hash a plain text string using SHA-256 via native browser Web Crypto API
 */
export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Cache user login credentials locally for offline verification.
 * Saves the user object along with the hashed password.
 */
export async function cacheUserCredentials(user, password) {
  if (!user || !user.id || !user.username) return;
  try {
    const passwordHash = await hashPassword(password);
    await db.users.put({
      id: user.id,
      username: user.username.trim().toLowerCase(),
      password_hash: passwordHash,
      role: user.role,
      name: user.name,
      restaurant_id: user.restaurant_id,
      shift_id: user.shift_id || null,
      raw_user_payload: JSON.stringify(user)
    });
    console.log(`[OfflineAuth] Cached credentials for user: ${user.username}`);
  } catch (err) {
    console.error('[OfflineAuth] Error caching credentials:', err);
  }
}

/**
 * Verify credentials locally when offline.
 * Returns the user object if valid, null otherwise.
 */
export async function verifyOfflineLogin(username, password) {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const localUser = await db.users.where('username').equals(cleanUsername).first();
    if (!localUser) return null;

    const inputHash = await hashPassword(password);
    if (localUser.password_hash === inputHash) {
      return JSON.parse(localUser.raw_user_payload);
    }
  } catch (err) {
    console.error('[OfflineAuth] Error verifying offline login:', err);
  }
  return null;
}
