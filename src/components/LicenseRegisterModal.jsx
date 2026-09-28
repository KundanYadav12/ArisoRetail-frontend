import React, { useState } from 'react';
import {
  KeyRound, Building2, User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle2, ArrowRight, ArrowLeft, X, ShieldCheck, Sparkles, Store
} from 'lucide-react';
import { getApiUrl } from '../utils/api';

export default function LicenseRegisterModal({ isOpen, onClose, onRegisterSuccess }) {
  const [step, setStep] = useState(1); // 1: Validate License, 2: Store Details, 3: Success
  const [licenseId, setLicenseId] = useState('');
  const [validatedDetails, setValidatedDetails] = useState(null);

  // Form Fields
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registered Data State
  const [registeredUser, setRegisteredUser] = useState(null);
  const [registeredToken, setRegisteredToken] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleValidateLicense = async (e) => {
    e.preventDefault();
    const cleanId = licenseId.trim();

    if (!cleanId || !/^\d{12}$/.test(cleanId)) {
      setError('Please enter a valid 12-digit numeric License ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/api/auth/verify-license?license_id=${cleanId}`));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'License validation failed.');
      }

      setValidatedDetails(data);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to validate License ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const cleanStoreName = restaurantName.trim();
    const cleanOwnerName = ownerName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanStoreName || !cleanOwnerName || !cleanEmail || !password) {
      setError('Please fill in all required fields (Store Name, Owner Name, Email, Password).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/auth/register-with-license'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_id: licenseId.trim(),
          store_name: cleanStoreName,
          restaurant_name: cleanStoreName,
          owner_name: cleanOwnerName,
          email: cleanEmail,
          phone: phone ? phone.trim() : null,
          password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      const token = data.accessToken || data.token;
      const user = data.user;

      if (token && user) {
        localStorage.setItem('ARISO_RETAIL_TOKEN', token);
        localStorage.setItem('pos_token', token);
        localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(user));
        localStorage.setItem('pos_user', JSON.stringify(user));
      }

      setRegisteredUser(user);
      setRegisteredToken(token);
      setStep(3); // Transition to Success view
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessLogin = () => {
    if (onRegisterSuccess) {
      onRegisterSuccess(registeredUser, registeredToken, email.trim().toLowerCase());
    } else {
      onClose();
    }
  };

  const handleSuccessBackToLogin = () => {
    if (onRegisterSuccess) {
      // Pass null token so Login screen stays open with the pre-filled email
      onRegisterSuccess(null, null, email.trim().toLowerCase());
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      fontFamily: '"Inter", system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.37)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} color="#f97316" />
              Create Account with Licence ID
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {step === 1 && 'Step 1 of 2: Validate 12-Digit Licence ID'}
              {step === 2 && 'Step 2 of 2: Setup Store & Admin Account'}
              {step === 3 && 'Store Registered & Activated!'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '13px',
              marginBottom: '16px',
              fontWeight: '600'
            }}>
              {error}
            </div>
          )}

          {/* --- STEP 1: VALIDATE 12-DIGIT LICENCE ID --- */}
          {step === 1 && (
            <form onSubmit={handleValidateLicense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  12-DIGIT LICENCE ID *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    autoFocus
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="e.g. 482917305614"
                    maxLength={12}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '18px',
                      fontWeight: '800',
                      letterSpacing: '2.5px',
                      fontFamily: 'monospace',
                      borderRadius: '8px',
                      border: '2px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <ShieldCheck size={22} color="#f97316" style={{ position: 'absolute', right: '12px' }} />
                </div>
                <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                  Enter the 12-digit numeric Licence ID issued by your Ariso distributor or administrator.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || licenseId.length !== 12}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading || licenseId.length !== 12 ? 'not-allowed' : 'pointer',
                    opacity: loading || licenseId.length !== 12 ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
                  }}
                >
                  {loading ? 'Validating...' : <>Validate Licence <ArrowRight size={16} /></>}
                </button>
              </div>
            </form>
          )}

          {/* --- STEP 2: STORE DETAILS REGISTRATION --- */}
          {step === 2 && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Validated Banner */}
              {validatedDetails && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} color="#16a34a" /> Licence Key Verified (#{licenseId})
                  </div>
                  <div style={{ marginTop: '2px', color: '#15803d' }}>
                    Distributor: <b>{validatedDetails.distributor_name || 'Authorized Distributor'}</b> | Validity: <b>{validatedDetails.subscription_period_years || 1} Year(s)</b>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  STORE / RESTAURANT NAME *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    autoFocus
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Ariso Flagship Retail"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  OWNER FULL NAME *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    EMAIL ADDRESS *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '10px' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@store.com"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 10px 10px 32px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    PHONE NUMBER
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '10px' }} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      style={{
                        width: '100%',
                        padding: '10px 10px 10px 32px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ADMIN PASSWORD *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 36px',
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
                  }}
                >
                  {loading ? 'Activating Store...' : 'Complete & Activate Store'}
                </button>
              </div>
            </form>
          )}

          {/* --- STEP 3: SUCCESS CONFIRMATION --- */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: '10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                border: '2px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <CheckCircle2 size={36} color="#16a34a" />
              </div>

              <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                Store Successfully Activated!
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Your store <b>{restaurantName}</b> is now fully registered with Licence <b>#{licenseId}</b>.
              </p>

              <div style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Store Name:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{restaurantName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Admin Email:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Account Role:</span>
                  <span style={{ fontWeight: '700', color: '#16a34a' }}>Store Administrator</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  onClick={handleSuccessLogin}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={16} /> Enter POS Terminal Now
                </button>

                <button
                  type="button"
                  onClick={handleSuccessBackToLogin}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Return to Login Screen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
