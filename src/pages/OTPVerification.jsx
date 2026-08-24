import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Mail, CheckCircle2, Lock, ArrowRight, RefreshCw, Eye, EyeOff, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { Button, Box, Typography, Alert, CircularProgress } from '@mui/material';
import { getApiUrl } from '../utils/api';

export default function OTPVerification({ initialEmail = '', onVerificationSuccess, onBackToLogin }) {
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState(initialEmail ? 1 : 0); // 0 = Request OTP Email, 1 = Verify OTP Code, 2 = Reset Password
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Timers
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 mins
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // Auto-send OTP when opening screen with initialEmail
  useEffect(() => {
    if (initialEmail && initialEmail.trim().includes('@')) {
      handleSendOTP(initialEmail.trim().toLowerCase());
    }
  }, []);

  // Expiry Timer Countdown
  useEffect(() => {
    let timer;
    if (expirySeconds > 0 && step === 1) {
      timer = setInterval(() => {
        setExpirySeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [expirySeconds, step]);

  // Resend Cooldown Countdown
  useEffect(() => {
    let timer;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Request & Send OTP via Email
  const handleSendOTP = async (targetEmail = email) => {
    const cleanEmail = (targetEmail || email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log(`[OTP Verification UI] Requesting OTP code for: "${cleanEmail}"`);
      const res = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to send verification OTP.');
      }

      setMessage(data.message || `6-digit OTP code dispatched to ${cleanEmail}. Please check your email inbox and spam folder.`);
      setEmail(cleanEmail);
      setStep(1); // Advance to 6-digit OTP code entry
      setExpirySeconds(600);
      setCooldownSeconds(60);
      setAttemptsLeft(5);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      console.error('[OTP Verification Error]', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit input
  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      inputRefs[5].current?.focus();
    }
  };

  const getFullOTP = () => otpDigits.join('');

  // Step 1: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpCode = getFullOTP();
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes('attempt(s) remaining')) {
          setAttemptsLeft(prev => Math.max(0, prev - 1));
        }
        throw new Error(data.error || 'OTP verification failed.');
      }

      setMessage('✅ OTP Code Verified! Now set your new secure password.');
      setError('');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set New Password & Reset
  const handleActivatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(getApiUrl('/api/auth/activate-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: getFullOTP(), password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed.');

      setMessage('🎉 Password reset successfully! Logging in with your new credentials...');
      
      if (data.accessToken && data.user) {
        localStorage.setItem('ARISO_RETAIL_TOKEN', data.accessToken);
        localStorage.setItem('ARISO_RETAIL_REFRESH_TOKEN', data.refreshToken);
        localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));

        if (onVerificationSuccess) {
          onVerificationSuccess(data.user, data.accessToken);
          return;
        }
      }

      setTimeout(() => {
        if (onBackToLogin) onBackToLogin();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        maxWidth: '460px',
        padding: 'clamp(20px, 5vw, 36px)',
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Back to Login Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
            {step === 0 ? 'Step 1 of 3' : step === 1 ? 'Step 2 of 3' : 'Step 3 of 3'}
          </span>
        </div>

        {/* Logo Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            color: '#fff',
            marginBottom: '12px',
            boxShadow: '0 4px 12px rgba(249,115,22,0.35)'
          }}>
            {step === 0 ? <Mail size={28} /> : step === 1 ? <Shield size={28} /> : <Lock size={28} />}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            {step === 0 ? 'Forgot Password Recovery' : step === 1 ? 'Verify Email OTP Code' : 'Create New Password'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {step === 0 
              ? 'Enter your registered email address to receive a 6-digit OTP code.'
              : step === 1 
              ? `Enter the 6-digit OTP code sent to ${email || 'your email'}`
              : 'Create a secure password to access your POS Dashboard'}
          </p>
        </div>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600, fontSize: '0.85rem' }}>
            {error}
          </Alert>
        )}

        {message && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600, fontSize: '0.85rem' }}>
            {message}
          </Alert>
        )}

        {/* STEP 0: ENTER REGISTERED EMAIL ADDRESS */}
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendOTP(); }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                REGISTERED EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@restaurant.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: '700',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  <span>Generating & Dispatched OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Verification OTP</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 1: OTP INPUT CODE */}
        {step === 1 && (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  TARGET EMAIL ADDRESS
                </label>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Change Email
                </button>
              </div>
              <input
                type="email"
                value={email}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  6-DIGIT VERIFICATION CODE
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#f97316', fontWeight: '700' }}>
                  <Clock size={14} />
                  <span>{formatTimer(expirySeconds)}</span>
                </div>
              </div>

              {/* 6 Digit Inputs */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    style={{
                      width: '46px',
                      height: '52px',
                      fontSize: '22px',
                      fontWeight: '800',
                      textAlign: 'center',
                      borderRadius: '10px',
                      border: digit ? '2px solid #ea580c' : '1px solid #cbd5e1',
                      backgroundColor: digit ? '#fff7ed' : '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || getFullOTP().length < 6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: '700',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: (loading || getFullOTP().length < 6) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                opacity: (loading || getFullOTP().length < 6) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP Code</span>
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => handleSendOTP(email)}
                disabled={cooldownSeconds > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: cooldownSeconds > 0 ? '#94a3b8' : '#2563eb',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                {cooldownSeconds > 0 ? `Resend OTP in ${cooldownSeconds}s` : 'Resend OTP Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: SET NEW PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleActivatePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                NEW PASSWORD
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    paddingRight: '40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                CONFIRM NEW PASSWORD
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: '700',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password & Log In</span>
                  <Lock size={18} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
