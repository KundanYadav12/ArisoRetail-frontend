import { apiFetch } from './api';

const CURRENT_DESKTOP_VERSION = '1.1.0';
const CURRENT_MOBILE_VERSION = '1.1.0';

/**
 * Get the currently installed version
 */
export async function getInstalledVersion() {
  if (window.electronAPI?.getAppVersion) {
    try {
      const v = await window.electronAPI.getAppVersion();
      if (v) return v;
    } catch (_) {}
  }
  return CURRENT_DESKTOP_VERSION;
}

/**
 * Check if a new version is available from backend API
 */
export async function checkAppVersionUpdate(platform = 'windows') {
  try {
    const currentVersion = await getInstalledVersion();
    const endpoint = `/api/version/check?platform=${encodeURIComponent(platform)}&current_version=${encodeURIComponent(currentVersion)}`;

    const res = await apiFetch(endpoint);
    if (!res.ok) {
      console.warn('[UpdateService] Version check returned status:', res.status);
      return { update_available: false };
    }

    const data = await res.json();
    return {
      ...data,
      installed_version: currentVersion
    };
  } catch (err) {
    console.warn('[UpdateService] Version check network error:', err.message);
    return { update_available: false, error: err.message };
  }
}
