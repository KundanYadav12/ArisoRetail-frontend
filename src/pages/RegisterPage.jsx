import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { registerApi } from '../services/authService';
import { setCredentials } from '../features/auth/authSlice';
import { Trophy, UserCheck, Shield } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await registerApi({ fullName, email, phone, password, role });
      if (res.success) {
        dispatch(setCredentials(res.data));
        if (role === 'VENUE_OWNER') navigate('/owner/dashboard');
        else navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Trophy size={32} color="#10b981" />
            <span>TurfSpot</span>
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join as a Player or Venue Owner</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {/* Role Toggle Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setRole('PLAYER')}
            className="btn btn-sm"
            style={{
              background: role === 'PLAYER' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
              color: role === 'PLAYER' ? '#022c22' : 'var(--text-muted)',
              border: role === 'PLAYER' ? 'none' : '1px solid var(--border-color)',
              padding: '0.75rem'
            }}
          >
            🏃 Player Account
          </button>
          <button
            type="button"
            onClick={() => setRole('VENUE_OWNER')}
            className="btn btn-sm"
            style={{
              background: role === 'VENUE_OWNER' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
              color: role === 'VENUE_OWNER' ? '#022c22' : 'var(--text-muted)',
              border: role === 'VENUE_OWNER' ? 'none' : '1px solid var(--border-color)',
              padding: '0.75rem'
            }}
          >
            🏟️ Turf Owner
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Kundan Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
            {loading ? 'Creating Account...' : 'Register Now'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already registered? <Link to="/login" style={{ color: '#34d399', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
