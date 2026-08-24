import React, { useState } from 'react';
import { Utensils, Eye, EyeOff } from 'lucide-react';
import OTPVerification from './OTPVerification';
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
  const [ownerEmail, setOwnerEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in your registered email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: email.trim().toLowerCase(),
          password,
          restaurant_id: restaurantId || null,
          starting_cash: parseFloat(startingCash || 0),
          device: `Web Browser (${navigator.userAgent.slice(0, 40)})`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error && data.error.includes('pending activation')) {
          setOwnerEmail(email.trim().toLowerCase());
          setShowOTPVerification(true);
        }
        throw new Error(data.error || 'Login failed.');
      }

      localStorage.setItem('ARISO_RETAIL_TOKEN', data.accessToken);
      localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', data.refreshToken);
      localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));

      // Remove any legacy POS keys from browser
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_refresh_token');
      localStorage.removeItem('pos_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      onLoginSuccess(data.user, data.accessToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        </div>
      </div>
    </div>
  );
}
