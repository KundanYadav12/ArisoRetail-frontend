import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { Trophy, MapPin, User, LogOut, LayoutDashboard, Calendar, Shield } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container nav-content">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo">
          <Trophy size={28} className="text-emerald-400" color="#10b981" />
          <span>TurfSpot</span>
        </Link>

        {/* Links */}
        <ul className="nav-links">
          <li>
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              Explore Venues
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <Link to="/my-bookings" className={`nav-link ${location.pathname === '/my-bookings' ? 'active' : ''}`}>
                My Bookings
              </Link>
            </li>
          )}
          <li>
            <span className="nav-link" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Teams (Coming Soon)
            </span>
          </li>
          <li>
            <span className="nav-link" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Matches (Coming Soon)
            </span>
          </li>
          <li>
            <span className="nav-link" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Tournaments (Coming Soon)
            </span>
          </li>
        </ul>

        {/* Actions & User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {user?.role === 'VENUE_OWNER' && (
                <Link to="/owner/dashboard" className="btn btn-secondary btn-sm">
                  <LayoutDashboard size={16} /> Owner Dashboard
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin/dashboard" className="btn btn-secondary btn-sm">
                  <Shield size={16} /> Admin Portal
                </Link>
              )}
              <span className="badge badge-success">
                <User size={12} /> {user?.fullName} ({user?.role})
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

                  <LayoutDashboard size={16} /> Owner
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin/dashboard" className="btn btn-secondary btn-sm">
                  <Shield size={16} /> Admin
                </Link>
              )}
              <span className="badge badge-success">
                <User size={12} /> {user?.fullName?.split(' ')[0]}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
