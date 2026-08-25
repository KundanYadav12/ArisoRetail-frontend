import React, { useState } from 'react';
import { Key, Eye, EyeOff, Store, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '../utils/api';

export default function Register({ onBackToLogin }) {
  const [licenseId, setLicenseId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1 = License verification, 2 = Store info registration
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyLicense = async (e) => {
    e.preventDefault();
    if (!licenseId) {
      setError('Please enter your 12-digit License ID.');
      return;
    }

    const cleanCode = licenseId.trim();
    if (!/^\d{12}$/.test(cleanCode)) {
      setError('License ID must be exactly 12 numeric digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/api/auth/verify-license?license_id=${cleanCode}`));
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify license.');
      }
      
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!storeName || !ownerName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(getApiUrl('/api/auth/register-with-license'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_id: licenseId.trim(),
          store_name: storeName.trim(),
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

      setSuccess('Store registered and activated successfully!');
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        maxWidth: '450px',
        padding: 'clamp(20px, 5vw, 32px)',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        border: '1px solid #cbd5e1'
      }}>
        {/* Header */}
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
            Store Registration
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {step === 1 ? 'Verify your Ariso License ID' : 'Setup your store owner account'}
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

        {success && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '13px',
            marginBottom: '20px',
            fontWeight: '600'
          }}>
            {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleVerifyLicense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                12-DIGIT LICENSE ID
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={licenseId}
                  onChange={(e) => setLicenseId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="e.g. 482917305614"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontWeight: 'bold',
                    letterSpacing: '1px'
                  }}
                />
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
              {loading ? 'Verifying...' : 'Verify License'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                STORE NAME
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Ariso Supermarket"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                OWNER / USER NAME
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Kundan Kumar"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. kundan@ariso.com"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                PHONE NUMBER
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose password"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    paddingRight: '40px',
                    fontSize: '14px',
                    borderRadius: '6px',
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

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
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
              {loading ? 'Creating Store...' : 'Register & Activate Store'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
