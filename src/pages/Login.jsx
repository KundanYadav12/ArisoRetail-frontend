import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Server, Globe, Laptop, Settings, Check, KeyRound } from 'lucide-react';
import OTPVerification from './OTPVerification';
import LicenseRegisterModal from '../components/LicenseRegisterModal';
import { getApiUrl, getBaseUrl, setCustomBaseUrl } from '../utils/api';
import { cacheUserCredentials, verifyOfflineLogin } from '../utils/offlineAuthService';
import { SyncService } from '../utils/syncService';
import arisoLogo from '../assets/retail-logo.png';

export default function Login({ onLoginSuccess }) {
  const emailInputRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantId, setRestaurantId] = useState('');
  const [startingCash, setStartingCash] = useState('1000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Server Switcher Modal state
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState(getBaseUrl());
  const [customServerInput, setCustomServerInput] = useState(localStorage.getItem('ARISO_API_SERVER_URL') || '');

  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('ariso_remember_me') !== 'false');

  // Auto-focus email input on mount and load remembered email
  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
      const savedServer = localStorage.getItem('ARISO_API_SERVER_URL');
      if (savedServer && !savedServer.includes('localhost') && !savedServer.includes('127.0.0.1')) {
        localStorage.removeItem('ARISO_API_SERVER_URL');
        setCurrentServerUrl('http://localhost:5005/api');
        setCustomServerInput('');
      }
    }

    const savedIdentifier = localStorage.getItem('ariso_remembered_identifier');
    if (savedIdentifier) {
      setEmail(savedIdentifier);
    }
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // OTP Verification View state
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');

  const handleSelectServer = (url) => {
    setCustomBaseUrl(url);
    setCurrentServerUrl(getBaseUrl());
    setServerModalOpen(false);
    setError('');
  };

  const handleSaveCustomServer = (e) => {
    e.preventDefault();
    if (!customServerInput.trim()) return;
    let url = customServerInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    if (!url.endsWith('/api')) {
      url = url.replace(/\/+$/, '') + '/api';
    }
    handleSelectServer(url);
  };

  const performDirectOfflineLogin = async (cleanIdentifier, plainPassword) => {
    try {
      const offlineSession = await verifyOfflineLogin(cleanIdentifier, plainPassword);
      if (offlineSession && offlineSession.user) {
        localStorage.setItem('ARISO_RETAIL_TOKEN', offlineSession.accessToken);
        localStorage.setItem('pos_token', offlineSession.accessToken);
        if (offlineSession.refreshToken) {
          localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', offlineSession.refreshToken);
          localStorage.setItem('pos_refresh_token', offlineSession.refreshToken);
        }
        localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(offlineSession.user));
        localStorage.setItem('pos_user', JSON.stringify(offlineSession.user));

        if (rememberMe) {
          localStorage.setItem('ariso_remember_me', 'true');
          localStorage.setItem('ariso_remembered_identifier', cleanIdentifier);
        } else {
          localStorage.setItem('ariso_remember_me', 'false');
          localStorage.removeItem('ariso_remembered_identifier');
        }

        onLoginSuccess(offlineSession.user, offlineSession.accessToken);
        return true;
      }
    } catch (e) {
      console.error('[Login] Direct offline login error:', e);
    }
    return false;
  };

  const attemptLoginFetch = async (targetBaseUrl, payload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
    const url = getApiUrl('/api/auth/login', targetBaseUrl);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = null;
      }

      return {
        ok: true,
        httpOk: res.ok,
        status: res.status,
        data,
        rawText: text,
        url
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return { ok: false, error: err, url };
    }
  };

  const handleOfflineLoginClick = async () => {
    const cleanIdentifier = (email || 'admin').trim().toLowerCase();
    const cleanPassword = password || 'admin';
    setLoading(true);
    setError('');
    const success = await performDirectOfflineLogin(cleanIdentifier, cleanPassword);
    if (!success) {
      setError('Incorrect password for cached offline account. Please check your password.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanIdentifier = (email || 'admin').trim().toLowerCase();
    if (!cleanIdentifier || !password) {
      setError('Please fill in your registered email or username and password.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      email: cleanIdentifier,
      username: cleanIdentifier,
      password,
      restaurant_id: restaurantId || null,
      starting_cash: parseFloat(startingCash || 0),
      device: `Windows Desktop (${navigator.userAgent.slice(0, 40)})`
    };

    // 1. If device is explicitly offline according to navigator, log in offline immediately
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const offlineSuccess = await performDirectOfflineLogin(cleanIdentifier, password);
      if (offlineSuccess) {
        setLoading(false);
        return;
      } else {
        setError('Incorrect password for cached offline account.');
        setLoading(false);
        return;
      }
    }

    // 2. Attempt Online Authentication
    const primaryUrl = getBaseUrl();
    let fetchResult = await attemptLoginFetch(primaryUrl, payload);

    // If Primary URL didn't return a valid JSON response (e.g. server down, 502/503 HTML, timeout, NetworkError), try fallback
    const isPrimaryUnavailable = !fetchResult.ok || !fetchResult.data || fetchResult.status >= 500;
    
    if (isPrimaryUnavailable) {
      const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (!isLocalHost) {
        const prodCloudUrl = typeof window !== 'undefined' && window.location.protocol && window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
          ? `${window.location.origin}/api`
          : 'https://retail.arisotechnologies.com/api';
        const fallbackUrl = primaryUrl.includes('localhost')
          ? prodCloudUrl
          : 'http://localhost:5005/api';

        console.warn(`[Login] Primary server (${primaryUrl}) unavailable. Trying fallback (${fallbackUrl})...`);
        const fallbackResult = await attemptLoginFetch(fallbackUrl, payload);
        
        if (fallbackResult.ok && fallbackResult.data) {
          fetchResult = fallbackResult;
          setCustomBaseUrl(fallbackUrl);
          setCurrentServerUrl(fallbackUrl);
        }
      }
    }

    // 3. Process Server Response
    if (fetchResult.ok && fetchResult.data) {
      const { httpOk, data, status } = fetchResult;

      if (httpOk && data.accessToken) {
        // Online login succeeded! Save tokens in all stores
        localStorage.setItem('ARISO_RETAIL_TOKEN', data.accessToken);
        localStorage.setItem('pos_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', data.refreshToken);
          localStorage.setItem('pos_refresh_token', data.refreshToken);
        }
        localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));
        localStorage.setItem('pos_user', JSON.stringify(data.user));

        if (rememberMe) {
          localStorage.setItem('ariso_remember_me', 'true');
          localStorage.setItem('ariso_remembered_identifier', cleanIdentifier);
        } else {
          localStorage.setItem('ariso_remember_me', 'false');
          localStorage.removeItem('ariso_remembered_identifier');
        }

        // Cache credentials locally for future offline verification
        await cacheUserCredentials(data.user, password, data.accessToken, data.refreshToken);

        // Preload offline data
        SyncService.syncDownward(data.accessToken).catch(() => {});

        onLoginSuccess(data.user, data.accessToken);
        return;
      }

      if (status === 401 || status === 400 || status === 403) {
        if (data.error && data.error.includes('pending activation')) {
          setOwnerEmail(cleanIdentifier);
          setShowOTPVerification(true);
          setLoading(false);
          return;
        }
        
        setError(data.error || data.message || 'Invalid email/username or password.');
        setLoading(false);
        return;
      }
    }

    // 4. If online servers are unreachable (network drop, DNS error, server down), log in offline
    console.warn('[Login] Online servers unavailable, transitioning to local offline POS mode...');
    const offlineSuccess = await performDirectOfflineLogin(cleanIdentifier, password);
    if (offlineSuccess) {
      setLoading(false);
      return;
    }

    setError('Incorrect password for cached offline account. Please check your password.');
    setLoading(false);
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

  const isCloud = currentServerUrl.includes('arisotechnologies.com') || currentServerUrl.includes('duckdns.org') || currentServerUrl.includes('https://');
  const isLocal = currentServerUrl.includes('localhost') || currentServerUrl.includes('127.0.0.1');

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
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}>
            <img 
              src={arisoLogo} 
              alt="Ariso Retail POS" 
              style={{ width: '72px', height: '72px', borderRadius: '16px', objectFit: 'contain' }} 
              onError={(e) => { e.target.src = arisoLogo; }}
            />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Ariso Retail POS
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Sign in to access your Terminal
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: '600',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              EMAIL OR USERNAME
            </label>
            <input
              ref={emailInputRef}
              autoFocus
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin or user@company.com"
              autoComplete="username"
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

          {/* Remember Me Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#f97316',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                Remember Me (Stay Signed In)
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
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

            <button
              type="button"
              disabled={loading}
              onClick={handleOfflineLoginClick}
              style={{
                padding: '9px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ⚡ Log In Offline (Local Mode)
            </button>
          </div>

          {/* Create New Account using Licence ID Option */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '4px',
            paddingTop: '12px',
            borderTop: '1px dashed #e2e8f0',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>
              New Store or Outlet?
            </span>
            <button
              type="button"
              onClick={() => {
                setError('');
                setLicenseModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ea580c',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              <KeyRound size={14} color="#ea580c" />
              Create New Account using Licence ID
            </button>
          </div>
        </form>

        {/* Server Indicator & Switcher Button */}
        <div style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={() => setServerModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#475569',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Click to change POS Server Connection"
          >
            <Server size={12} color="#0284c7" />
            <span>Server: {isCloud ? 'Cloud' : isLocal ? 'Localhost' : 'Custom'}</span>
            <Settings size={11} color="#64748b" />
          </button>

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
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🔐 Email OTP Login
          </button>
        </div>
      </div>

      {/* Server Selection Modal */}
      {serverModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Server size={20} color="#0284c7" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                POS Server Connection
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.4 }}>
              Select where this POS Terminal connects to sync bills, inventory, and staff authentication:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {/* Cloud Option */}
              <button
                type="button"
                onClick={() => handleSelectServer('https://retail.arisotechnologies.com/api')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: (currentServerUrl.includes('arisotechnologies.com') || currentServerUrl.includes('duckdns.org')) ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  backgroundColor: (currentServerUrl.includes('arisotechnologies.com') || currentServerUrl.includes('duckdns.org')) ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={18} color="#0284c7" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Cloud Server (Production)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>https://retail.arisotechnologies.com/api</div>
                  </div>
                </div>
                {(currentServerUrl.includes('arisotechnologies.com') || currentServerUrl.includes('duckdns.org')) && <Check size={16} color="#0284c7" />}
              </button>

              {/* Localhost Option */}
              <button
                type="button"
                onClick={() => handleSelectServer('http://localhost:5005/api')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: currentServerUrl.includes('localhost') ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  backgroundColor: currentServerUrl.includes('localhost') ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Laptop size={18} color="#16a34a" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Local Server (Port 5005)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>http://localhost:5005/api</div>
                  </div>
                </div>
                {currentServerUrl.includes('localhost') && <Check size={16} color="#16a34a" />}
              </button>
            </div>

            {/* Custom Server IP */}
            <form onSubmit={handleSaveCustomServer} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                OR ENTER CUSTOM SERVER IP / DOMAIN:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100:5005"
                  value={customServerInput}
                  onChange={(e) => setCustomServerInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Apply
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => setServerModalOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                color: '#475569',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* License Registration Modal */}
      <LicenseRegisterModal
        isOpen={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        onRegisterSuccess={(newUser, newToken, registeredEmail) => {
          setLicenseModalOpen(false);
          if (registeredEmail) {
            setEmail(registeredEmail);
          } else if (newUser?.email) {
            setEmail(newUser.email);
          }
          if (newUser && newToken && onLoginSuccess) {
            onLoginSuccess(newUser, newToken);
          }
        }}
      />
    </div>
  );
}
