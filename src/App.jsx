import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, Button, IconButton, useMediaQuery, Menu, MenuItem, Chip } from '@mui/material';
// Clean Vite HMR trigger
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogOutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';

import Login from './pages/Login';
import POSScreen from './pages/POS';
import CashierDashboard from './pages/CashierDashboard';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import SuperBillItems from './pages/SuperBillItems';
import SuperBillBilling from './pages/SuperBillBilling';
import ChangePasswordModal from './components/ChangePasswordModal';
import { NotificationProvider } from './context/NotificationContext';
import { apiFetch, resolveImageUrl } from './utils/api';
import { applyThemeToCssVariables } from './utils/themePresets';

import { LanguageProvider } from './locales/LanguageContext';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [currentView, setCurrentView] = useState('pos'); // pos, cashier, admin, superadmin
  const [themeMode, setThemeMode] = useState('light');
  const [posFocusMode, setPosFocusMode] = useState(() => localStorage.getItem('pos_focus_mode') === 'true');

  const [anchorElNav, setAnchorElNav] = useState(null);
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    const validateAndSyncSession = async () => {
      const savedToken = localStorage.getItem('ARISO_RETAIL_TOKEN');
      const savedUser = localStorage.getItem('ARISO_RETAIL_USER');
      if (!savedToken || !savedUser) {
        setToken('');
        setUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        
        if (parsedUser.role === 'super_admin' || parsedUser.role === 'superadmin') {
          setCurrentView('superadmin');
        }

        // Validate session with backend server
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));
          }
        } else if (res.status === 401 || res.status === 403) {
          console.warn('[Session Sync] Token or session invalid after backend deployment. Prompting re-login.');
          handleLogout();
        }
      } catch (e) {
        console.error('Session sync error:', e);
      }
    };

    validateAndSyncSession();

    const handleSessionExpired = (e) => {
      const reason = e?.detail?.reason;
      if (reason === 'LOGGED_IN_ELSEWHERE') {
        alert('You have been logged out because your account was logged in from another device.');
      }
      setToken('');
      setUser(null);
    };

    const handleTokenRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
      }
      if (e.detail?.user) {
        setUser(e.detail.user);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'ARISO_RETAIL_TOKEN' || e.key === 'ARISO_RETAIL_USER' || e.key === 'ARISO_RETAIL_REFRESH_TOKEN') {
        validateAndSyncSession();
      }
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    window.addEventListener('auth_token_refreshed', handleTokenRefreshed);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', validateAndSyncSession);

    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
      window.removeEventListener('auth_token_refreshed', handleTokenRefreshed);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', validateAndSyncSession);
    };
  }, []);

  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [dangerColor, setDangerColor] = useState('#ef4444');
  const [infoColor, setInfoColor] = useState('#3b82f6');

  useEffect(() => {
    fetchGlobalTheme();
    const handleThemeChanged = (e) => {
      if (e.detail?.primary_color) {
        setPrimaryColor(e.detail.primary_color);
        setSecondaryColor(e.detail.secondary_color || '#10b981');
        setDangerColor(e.detail.danger_color || '#ef4444');
        setInfoColor(e.detail.info_color || '#3b82f6');
        applyThemeToCssVariables(e.detail.primary_color, e.detail.secondary_color || '#10b981');
      }
    };
    window.addEventListener('theme_changed', handleThemeChanged);
    return () => window.removeEventListener('theme_changed', handleThemeChanged);
  }, []);

  const fetchGlobalTheme = async () => {
    try {
      const res = await apiFetch('/api/theme/config');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.primary_color) {
        setPrimaryColor(data.primary_color);
        setSecondaryColor(data.secondary_color || '#10b981');
        setDangerColor(data.danger_color || '#ef4444');
        setInfoColor(data.info_color || '#3b82f6');
        applyThemeToCssVariables(data.primary_color, data.secondary_color || '#10b981');
      }
    } catch (err) {
      console.warn('[App] Failed to fetch dynamic theme:', err);
    }
  };

  const muiTheme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: primaryColor,
        contrastText: '#ffffff'
      },
      secondary: {
        main: secondaryColor
      },
      error: {
        main: dangerColor
      },
      info: {
        main: infoColor
      },
      background: {
        default: themeMode === 'light' ? '#f8fafc' : '#0f172a',
        paper: themeMode === 'light' ? '#ffffff' : '#1e293b'
      }
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  });

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout warning:', e);
    } finally {
      localStorage.removeItem('ARISO_RETAIL_TOKEN');
      localStorage.removeItem('ARISO_RETAIL_REFRESH_TOKEN');
      localStorage.removeItem('ARISO_RETAIL_USER');
      setUser(null);
      setToken('');
    }
  };

  const handleFocusModeChange = (isFocus) => {
    setPosFocusMode(isFocus);
    localStorage.setItem('pos_focus_mode', isFocus ? 'true' : 'false');
  };

  if (!token || !user) {
    return (
      <NotificationProvider>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Login onLoginSuccess={(u, t) => { setUser(u); setToken(t); }} />
        </ThemeProvider>
      </NotificationProvider>
    );
  }

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <LanguageProvider>
      <NotificationProvider>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />

        <ChangePasswordModal
          open={Boolean(user?.must_change_password)}
          onPasswordChanged={(updatedUser) => setUser(updatedUser)}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          {/* Header Bar */}
          {!posFocusMode && (
            <AppBar position="static" color="default" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 46, sm: 56, xl: 80 }, py: { xs: 0.5, sm: 1 }, px: { xs: 1, sm: 2, xl: 4 }, gap: 1 }}>
                
                {/* Brand Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5, xl: 2 }, flexShrink: 1, minWidth: 0, maxWidth: { xs: 200, sm: 320, md: 500 } }}>
                  <Box
                    component="img"
                    src={resolveImageUrl(user?.restaurant_logo_url) || '/ariso-pos-logo.png'}
                    alt="Ariso POS"
                    sx={{
                      width: { xs: 28, sm: 34, xl: 42 },
                      height: { xs: 28, sm: 34, xl: 42 },
                      borderRadius: 1.5,
                      objectFit: 'contain',
                      border: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0
                    }}
                    onError={(e) => { e.target.src = '/ariso-pos-logo.png'; }}
                  />
                  <Typography
                    variant="h6"
                    title={user?.restaurant_name || 'Ariso Retail'}
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '0.95rem', sm: '1.1rem', xl: '1.6rem' },
                      color: 'primary.main',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {user?.restaurant_name || 'Ariso Retail'}
                  </Typography>
                </Box>

                {/* Navigation Menu (Responsive: ☰ Hamburger on Mobile, Inline Tabs on Desktop) */}
                {/* Desktop inline tabs */}
                {!isMobile && (
                  <Box sx={{ display: 'flex', gap: { xs: 1, xl: 2.5 } }}>
                    <Button
                      variant={currentView === 'pos' ? 'contained' : 'text'}
                      onClick={() => setCurrentView('pos')}
                      sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                    >
                      POS Screen
                    </Button>
                    {(user?.feature_superbill || isSuperAdmin) && (
                      <>
                        <Button
                          variant={currentView === 'superbill_billing' ? 'contained' : 'text'}
                          onClick={() => setCurrentView('superbill_billing')}
                          color="secondary"
                          sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                        >
                          ⚡ SuperBill Billing
                        </Button>
                        <Button
                          variant={currentView === 'superbill_items' ? 'contained' : 'text'}
                          onClick={() => setCurrentView('superbill_items')}
                          color="secondary"
                          sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                        >
                          📦 SuperBill Items
                        </Button>
                      </>
                    )}
                    <Button
                      variant={currentView === 'cashier' ? 'contained' : 'text'}
                      onClick={() => setCurrentView('cashier')}
                      sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                    >
                      Cashier Shift
                    </Button>
                    {isAdminOrManager && (
                      <Button
                        variant={currentView === 'admin' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('admin')}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Admin Panel
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <Button
                        variant={currentView === 'superadmin' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('superadmin')}
                        color="secondary"
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Super Admin
                      </Button>
                    )}
                  </Box>
                )}

                {/* Hamburger menu trigger icon (accessible on all viewports) */}
                <Box>
                  <IconButton
                    onClick={(e) => setAnchorElNav(e.currentTarget)}
                    color="inherit"
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Menu
                    anchorEl={anchorElNav}
                    open={Boolean(anchorElNav)}
                    onClose={() => setAnchorElNav(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                      paper: {
                        elevation: 4,
                        sx: { minWidth: 200, borderRadius: 2, mt: 1 }
                      }
                    }}
                  >
                    <MenuItem
                      onClick={() => { setCurrentView('pos'); setAnchorElNav(null); }}
                      selected={currentView === 'pos'}
                      sx={{ fontWeight: currentView === 'pos' ? 800 : 500 }}
                    >
                      🛒 &nbsp; POS Screen
                    </MenuItem>
                    {(user?.feature_superbill || isSuperAdmin) && (
                      <>
                        <MenuItem
                          onClick={() => { setCurrentView('superbill_billing'); setAnchorElNav(null); }}
                          selected={currentView === 'superbill_billing'}
                          sx={{ fontWeight: currentView === 'superbill_billing' ? 800 : 500 }}
                        >
                          ⚡ &nbsp; SuperBill Billing
                        </MenuItem>
                        <MenuItem
                          onClick={() => { setCurrentView('superbill_items'); setAnchorElNav(null); }}
                          selected={currentView === 'superbill_items'}
                          sx={{ fontWeight: currentView === 'superbill_items' ? 800 : 500 }}
                        >
                          📦 &nbsp; SuperBill Items
                        </MenuItem>
                      </>
                    )}
                    <MenuItem
                      onClick={() => { setCurrentView('cashier'); setAnchorElNav(null); }}
                      selected={currentView === 'cashier'}
                      sx={{ fontWeight: currentView === 'cashier' ? 800 : 500 }}
                    >
                      💼 &nbsp; Cashier Shift
                    </MenuItem>
                    {isAdminOrManager && (
                      <MenuItem
                        onClick={() => { setCurrentView('admin'); setAnchorElNav(null); }}
                        selected={currentView === 'admin'}
                        sx={{ fontWeight: currentView === 'admin' ? 800 : 500 }}
                      >
                        ⚙️ &nbsp; Admin Panel
                      </MenuItem>
                    )}
                    {isSuperAdmin && (
                      <MenuItem
                        onClick={() => { setCurrentView('superadmin'); setAnchorElNav(null); }}
                        selected={currentView === 'superadmin'}
                        sx={{ fontWeight: currentView === 'superadmin' ? 800 : 500 }}
                      >
                        👑 &nbsp; Super Admin
                      </MenuItem>
                    )}
                    <Box sx={{ my: 1, borderTop: 1, borderColor: 'divider' }} />
                    <MenuItem
                      onClick={() => { toggleTheme(); setAnchorElNav(null); }}
                      sx={{ fontWeight: 500 }}
                    >
                      {themeMode === 'light' ? '🌓 \u00a0 Dark Mode' : '☀️ \u00a0 Light Mode'}
                    </MenuItem>
                    <Box sx={{ my: 1, borderTop: 1, borderColor: 'divider' }} />
                    <MenuItem
                      onClick={() => { setAnchorElNav(null); handleLogout(); }}
                      sx={{ color: 'error.main', fontWeight: 700 }}
                    >
                      🚪 &nbsp; Logout
                    </MenuItem>
                  </Menu>
                </Box>

                {/* User Profile & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5, xl: 3 }, flexShrink: 0 }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', xl: '1.2rem' } }}>{user?.name || 'User'}</Typography>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: { xs: '0.75rem', xl: '1rem' } }}>
                      {user?.role || 'Staff'}
                    </Typography>
                  </Box>


                  <IconButton onClick={handleLogout} color="error" title="End Session" size="small">
                    <LogOutIcon fontSize="small" />
                  </IconButton>
                </Box>

              </Toolbar>
            </AppBar>
          )}

          {/* View Content */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {currentView === 'pos' && (
              <POSScreen
                user={user}
                token={token}
                onLogout={handleLogout}
                isFocusMode={posFocusMode}
                onFocusModeChange={handleFocusModeChange}
              />
            )}
            {currentView === 'superbill_billing' && user?.feature_superbill && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperBillBilling user={user} />
              </Box>
            )}
            {currentView === 'superbill_items' && user?.feature_superbill && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperBillItems user={user} />
              </Box>
            )}
            {currentView === 'cashier' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <CashierDashboard user={user} token={token} onLogout={handleLogout} />
              </Box>
            )}
            {currentView === 'admin' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel token={token} />
              </Box>
            )}
            {currentView === 'superadmin' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperAdminPanel token={token} />
              </Box>
            )}
          </Box>
        </Box>
      </ThemeProvider>
    </NotificationProvider>
  </LanguageProvider>
  );
}
