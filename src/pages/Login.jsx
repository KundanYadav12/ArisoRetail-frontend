import React, { useState } from 'react';
import { Utensils, Eye, EyeOff } from 'lucide-react';
import OTPVerification from './OTPVerification';
import Register from './Register';
import { getApiUrl } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantId, setRestaurantId] = useState('');
  const [startingCash, setStartingCash] = useState('1000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification View state
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');

  // Desktop Server Configuration state
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('ARISO_RETAIL_API_URL') || (import.meta.env.DEV ? 'http://localhost:5005/api' : 'https://arisoretail.duckdns.org/api'));
  const isDesktop = typeof window !== 'undefined' && (window.electron || window.location.protocol === 'file:');

  const handleSaveServerUrl = () => {
    if (!serverUrl.trim()) {
      localStorage.removeItem('ARISO_RETAIL_API_URL');
    } else {
      localStorage.setItem('ARISO_RETAIL_API_URL', serverUrl.trim());
    }
    alert('Server URL config saved! Reloading POS app to apply settings...');
    window.location.reload();
  };

  const [diagnosticStatus, setDiagnosticStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in your registered email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setDiagnosticStatus('Connecting to authentication server...');

    const loginPayload = {
      email: email.trim().toLowerCase(),
      username: email.trim().toLowerCase(),
      password,
      restaurant_id: restaurantId || null,
      starting_cash: parseFloat(startingCash || 0),
      device: typeof window !== 'undefined' && window.electron ? 'Windows Desktop POS' : `Web Browser (${navigator.userAgent.slice(0, 40)})`
    };

    const targetUrl = getApiUrl('/api/auth/login');
    let data = null;
    let lastNetworkError = null;
    const maxRetries = 3;

    // Retry loop with exponential backoff and timeout for weak/slow network resilience
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          setDiagnosticStatus(`Network slow or high latency. Retrying connection (Attempt ${attempt}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, (attempt - 1) * 1200));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second request timeout

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const resJson = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Authentication errors (400, 401, 403) should not be retried indefinitely
          if (response.status === 401 || response.status === 400 || response.status === 403) {
            const authErr = new Error(resJson.error || resJson.message || 'Invalid email or password.');
            authErr.isAuthError = true;
            throw authErr;
          }

          if (resJson.error && resJson.error.includes('pending activation')) {
            setOwnerEmail(email.trim().toLowerCase());
            setShowOTPVerification(true);
          }
          throw new Error(resJson.error || resJson.message || `Server returned error (${response.status})`);
        }

        data = resJson;
        break; // Success! Exit retry loop.
      } catch (err) {
        if (err.isAuthError) {
          setError(err.message);
          setLoading(false);
          setDiagnosticStatus('');
          return;
        }

        lastNetworkError = err;
        const isAbort = err.name === 'AbortError';
        console.warn(`[Login] Attempt ${attempt}/${maxRetries} failed:`, isAbort ? 'Request timed out after 8s' : err.message);
      }
    }

    // --- Online Authentication Success ---
    if (data && (data.accessToken || data.token)) {
      const accessToken = data.accessToken || data.token;
      localStorage.setItem('ARISO_RETAIL_TOKEN', accessToken);
      if (data.refreshToken) localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', data.refreshToken);
      localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));

      // Cache credentials locally for future offline login fallback
      try {
        const { cacheUserCredentials } = await import('../utils/offlineAuthService');
        await cacheUserCredentials(data.user, password);
      } catch (cacheErr) {
        console.warn('[OfflineAuth] Failed to cache credentials locally:', cacheErr.message);
      }

      // Automatically initialize Inbuild Print Gateway in Electron
      if (typeof window !== 'undefined' && window.electron?.startGateway) {
        try {
          await window.electron.startGateway({
            serverUrl: getApiUrl(''),
            token: accessToken,
            restaurantId: data.user.restaurant_id
          });
          console.log('[Inbuild Gateway] Auto-started successfully after login.');
        } catch (gwErr) {
          console.warn('[Inbuild Gateway] Startup warning:', gwErr.message);
        }
      }

      // Cleanup legacy keys
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_refresh_token');
      localStorage.removeItem('pos_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setDiagnosticStatus('');
      setLoading(false);
      onLoginSuccess(data.user, accessToken);
      return;
    }

    // --- Fallback to Local Offline Authentication ---
    setDiagnosticStatus('Server unreachable. Evaluating local offline credentials cache...');
    try {
      const { verifyOfflineLogin } = await import('../utils/offlineAuthService');
      const { db } = await import('../utils/offlineDb');

      const cleanUsername = email.trim().toLowerCase();
      const localUser = await db.users.where('username').equals(cleanUsername).first();

      if (!localUser) {
        setError(`Server unreachable at "${targetUrl}". No offline account is cached for "${cleanUsername}" on this device. Initial setup requires a server connection.`);
        setLoading(false);
        setDiagnosticStatus('');
        return;
      }

      const offlineUser = await verifyOfflineLogin(email, password);
      if (offlineUser) {
        console.log('[OfflineAuth] ✅ Verified offline login for user:', email);
        const dummyToken = `OFFLINE-SESSION-TOKEN-${Date.now()}`;
        localStorage.setItem('ARISO_RETAIL_TOKEN', dummyToken);
        localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(offlineUser));

        setDiagnosticStatus('');
        setLoading(false);
        onLoginSuccess(offlineUser, dummyToken);
        return;
      } else {
        setError('Server unreachable. Incorrect password for cached offline account.');
        setLoading(false);
        setDiagnosticStatus('');
        return;
      }
    } catch (offlineErr) {
      console.error('[OfflineAuth] Exception during offline verification:', offlineErr);
      setError(`Login failed: ${lastNetworkError?.message || 'Server unreachable'}`);
    } finally {
      setLoading(false);
      setDiagnosticStatus('');
    }
  };

  if (showOTPVerification) {
    return (
      <OTPVerification
        initialEmail={ownerEmail}
        onVerificationSuccess={onLoginSuccess}
        onBackToLogin={() => setShowOTPVerification(false)}
      />
    );
  }

  if (showRegister) {
    return (
      <Register
        onBackToLogin={() => setShowRegister(false)}
      />
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: '"Inter", sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: 'clamp(20px, 5vw, 32px)',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        border: '1px solid #cbd5e1'
      }}>
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}>
            <img src="/ariso-pos-logo.png" alt="Ariso POS" style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Ariso Retail
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Sign in to access your Terminal
          </p>
        </div>

        {diagnosticStatus && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            🔄 {diagnosticStatus}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '20px',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              REGISTERED EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@restaurant.com"
              autoComplete="email"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => {
                  setOwnerEmail(email.trim().toLowerCase());
                  setShowOTPVerification(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f97316',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingRight: '40px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px',
              fontSize: '15px',
              fontWeight: '700',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Terminal'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              if (email) {
                setOwnerEmail(email.trim().toLowerCase());
              }
              setShowOTPVerification(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            🔐 Forgot Password / Reset via Email OTP
          </button>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#16a34a',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '4px'
            }}
          >
            🔑 Register Store using License ID
          </button>
        </div>

        {/* Server Settings for Desktop App */}
        {isDesktop && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setShowServerSettings(!showServerSettings)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>⚙️ SERVER CONNECTION SETTINGS</span>
              <span>{showServerSettings ? '▲ Hide' : '▼ Show'}</span>
            </button>

            {showServerSettings && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                  BACKEND API ENDPOINT URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="e.g. https://arisoretail.duckdns.org/api or http://192.168.1.100:5005/api"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveServerUrl}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#ffffff',
                      backgroundColor: '#2563eb',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Save & Apply
                  </button>
                </div>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Note: Changes require application reload. Default is: https://arisoretail.duckdns.org/api
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
