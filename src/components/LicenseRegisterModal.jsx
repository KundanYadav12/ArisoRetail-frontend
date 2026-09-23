import React, { useState } from 'react';
import { KeyRound, Building2, User, Mail, Phone, Lock, CheckCircle2, ArrowRight, ArrowLeft, X, ShieldCheck } from 'lucide-react';
import { getApiUrl } from '../utils/api';

export default function LicenseRegisterModal({ isOpen, onClose, onRegisterSuccess }) {
  const [step, setStep] = useState(1); // 1: Validate License, 2: Store Details
  const [licenseId, setLicenseId] = useState('');
  const [validatedDetails, setValidatedDetails] = useState(null);

  // Form Fields
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

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
      const response = await fetch(getApiUrl('/api/auth/validate-license'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_id: cleanId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'License validation failed.');
      }

      setValidatedDetails(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in your email address and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/auth/register-license'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_id: licenseId.trim(),
          restaurant_name: restaurantName.trim(),
          owner_name: ownerName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem('pos_token', data.accessToken);
      localStorage.setItem('pos_user', JSON.stringify(data.user));

      if (onRegisterSuccess) {
        onRegisterSuccess(data.user, data.accessToken);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              Register Store via License Key
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {step === 1 ? 'Step 1 of 2: Validate 12-Digit License' : 'Step 2 of 2: Setup Restaurant Account'}
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
              marginBottom: '20px',
              fontWeight: '600'
            }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleValidateLicense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  12-DIGIT LICENSE KEY
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="e.g. 482917305614"
                    maxLength={12}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '16px',
                      fontWeight: '800',
                      letterSpacing: '2px',
                      borderRadius: '8px',
                      border: '2px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <ShieldCheck size={20} color="#f97316" style={{ position: 'absolute', right: '12px' }} />
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Enter the 12-digit numeric License ID provided by your distributor.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || licenseId.length !== 12}
                style={{
                  marginTop: '12px',
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
                  gap: '8px'
                }}
              >
                {loading ? 'Validating...' : <>Validate License <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Validated Banner */}
              {validatedDetails && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '12px',
                  marginBottom: '6px'
                }}>
                  <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} color="#16a34a" /> License Verified
                  </div>
                  <div style={{ marginTop: '2px', color: '#15803d' }}>
                    Distributor: <b>{validatedDetails.distributor_name}</b> | Current Pricing: <b>₹{validatedDetails.current_year_pricing}</b>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  RESTAURANT / STORE NAME
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Royal Spice Restaurant"
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
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  OWNER FULL NAME
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
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
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    EMAIL ADDRESS
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
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    PHONE NUMBER
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '10px' }} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  CREATE PASSWORD
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Activating Store...' : 'Complete & Activate Store'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
}
