import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, Button, IconButton, useMediaQuery, Menu, MenuItem, Chip } from '@mui/material';
// Clean Vite HMR trigger
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogOutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import KeyboardOutlinedIcon from '@mui/icons-material/KeyboardOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ElectricBoltOutlinedIcon from '@mui/icons-material/ElectricBoltOutlined';
import VerifiedIcon from '@mui/icons-material/Verified';

import Login from './pages/Login';
import POSScreen from './pages/POS';
import CashierDashboard from './pages/CashierDashboard';
import DayEndDashboard from './components/day_end/DayEndDashboard';
import PaymentReconciliationSuite from './components/finance/PaymentReconciliationSuite';
import { ArrowRightLeft } from 'lucide-react';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import SuperBillItems from './pages/SuperBillItems';
import SuperBillBilling from './pages/SuperBillBilling';
import ChangePasswordModal from './components/ChangePasswordModal';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import KeyboardHelpModal from './components/KeyboardHelpModal';
import { NotificationProvider } from './context/NotificationContext';
import { apiFetch, resolveImageUrl } from './utils/api';
import { applyThemeToCssVariables } from './utils/themePresets';

import { LanguageProvider } from './locales/LanguageContext';
import { SyncService } from './utils/syncService';
import retailLogo from './assets/retail-logo.png';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ARISO_RETAIL_USER') || localStorage.getItem('pos_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token') || '');
  const [currentView, setCurrentView] = useState(() => {
    try {
      const saved = localStorage.getItem('ARISO_RETAIL_USER') || localStorage.getItem('pos_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'super_admin' || parsed.role === 'superadmin') return 'superadmin';
        if (parsed.role === 'warehouse_manager') return 'warehouse';
      }
    } catch (e) {}
    return 'pos';
  });
  const [themeMode, setThemeMode] = useState('light');
  const [posFocusMode, setPosFocusMode] = useState(() => localStorage.getItem('pos_focus_mode') === 'true');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);

  // Shared POS / SuperBill Cart & Checkout States
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [taxType, setTaxType] = useState('intra');
  const [receiptSettings, setReceiptSettings] = useState(null);

  const [anchorElNav, setAnchorElNav] = useState(null);
  const isMobile = useMediaQuery('(max-width:900px)');

  const [netStatus, setNetStatus] = useState({
    isOnline: true,
    pendingCount: 0,
    isSyncing: false
  });

  useEffect(() => {
    if (token) {
      SyncService.startAutoSync(token, (status) => {
        setNetStatus(status);
      });
    }
    return () => {
      SyncService.stopAutoSync();
    };
  }, [token]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout warning:', e);
    } finally {
      localStorage.removeItem('ARISO_RETAIL_TOKEN');
      localStorage.removeItem('ARISO_RETAIL_REFRESH_TOKEN');
      localStorage.removeItem('ARISO_RETAIL_USER');
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_refresh_token');
      localStorage.removeItem('pos_user');
      setUser(null);
      setToken('');
    }
  };

  useEffect(() => {
    const syncSessionAndCatalog = async () => {
      const savedToken = localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token');
      const savedUser = localStorage.getItem('ARISO_RETAIL_USER') || localStorage.getItem('pos_user');
      if (!savedToken || !savedUser) {
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.role === 'super_admin' || parsedUser.role === 'superadmin') {
          setCurrentView('superadmin');
        } else if (parsedUser.role === 'warehouse_manager') {
          setCurrentView(prev => prev === 'pos' ? 'warehouse' : prev);
        }

        // Validate session with backend server in background if online
        try {
          const res = await apiFetch('/api/auth/me');
          if (res && res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(data.user));
              localStorage.setItem('pos_user', JSON.stringify(data.user));
            }
            // Background preload / sync catalog
            SyncService.downloadLatestCatalog(savedToken).catch(() => {});
          } else if (res && (res.status === 401 || res.status === 403)) {
            console.warn('[Session Sync] Server returned status', res.status, '- session is expired or invalid. Resetting to login.');
            handleLogout();
          } else {
            console.warn('[Session Sync] Server status:', res?.status, '- maintaining persistent session.');
          }
        } catch (netErr) {
          console.warn('[Session Sync] Offline or server unreachable, maintaining local offline session:', netErr.message);
        }
      } catch (e) {
        console.error('Session sync error:', e);
      }
    };

    syncSessionAndCatalog();

    const handleSessionExpired = (e) => {
      const reason = e?.detail?.reason;
      if (reason === 'LOGGED_IN_ELSEWHERE') {
        alert('You have been logged out because your account was logged in from another device.');
      } else if (reason === 'USER_INACTIVE') {
        alert('Your account is currently inactive. Please contact the administrator.');
      }
      handleLogout();
    };

    const handleTokenRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
      }
      if (e.detail?.user) {
        setUser(e.detail.user);
      }
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    window.addEventListener('auth_token_refreshed', handleTokenRefreshed);

    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
      window.removeEventListener('auth_token_refreshed', handleTokenRefreshed);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setReceiptSettings(null);
      return;
    }
    const fetchReceipt = async () => {
      try {
        const res = await apiFetch('/api/settings/receipt');
        if (res.ok) {
          const data = await res.json();
          setReceiptSettings(data);
        }
      } catch (err) {
        console.warn('[App] Failed to fetch receipt settings:', err);
      }
    };
    fetchReceipt();
  }, [token]);

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
  const isSalesman = user?.role === 'salesman';
  const isWarehouseManager = user?.role === 'warehouse_manager';
  const hasPosPermission = !isWarehouseManager || (Array.isArray(user?.permissions) && (user.permissions.includes('pos_billing') || user.permissions.includes('all')));

  return (
    <LanguageProvider>
      <NotificationProvider>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />

        <ChangePasswordModal
          open={Boolean(user?.must_change_password)}
          onPasswordChanged={(updatedUser) => setUser(updatedUser)}
        />
        <LanguageSelectorModal
          isOpen={languageModalVisible}
          onClose={() => setLanguageModalVisible(false)}
        />
        <KeyboardHelpModal
          isOpen={keyboardHelpVisible}
          onClose={() => setKeyboardHelpVisible(false)}
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
                    src={resolveImageUrl(user?.restaurant_logo_url) || retailLogo}
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
                    onError={(e) => { e.target.src = retailLogo; }}
                  />
                  <Typography
                    variant="h6"
                    title={user?.restaurant_name || 'Ariso Retail Flagship'}
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '0.95rem', sm: '1.1rem', xl: '1.6rem' },
                      color: 'primary.main',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {user?.restaurant_name || 'Ariso Retail Flagship'}
                  </Typography>
                </Box>

                {/* Navigation Menu (Responsive: ☰ Hamburger on Mobile, Inline Tabs on Desktop) */}
                {/* Desktop inline tabs */}
                {!isMobile && (
                  <Box sx={{ display: 'flex', gap: { xs: 1, xl: 2.5 } }}>
                    {isWarehouseManager && (
                      <Button
                        variant={currentView === 'warehouse' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('warehouse')}
                        startIcon={<Inventory2OutlinedIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Warehouse Suite
                      </Button>
                    )}
                    {(!isWarehouseManager || hasPosPermission) && (
                      <Button
                        variant={currentView === 'pos' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('pos')}
                        startIcon={<ShoppingCartOutlinedIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        POS Screen
                      </Button>
                    )}
                    {isSalesman && (
                      <Button
                        variant={currentView === 'inventory' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('inventory')}
                        startIcon={<Inventory2OutlinedIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Stock Inventory
                      </Button>
                    )}
                    {!isSalesman && !isWarehouseManager && (
                      <Button
                        variant={currentView === 'cashier' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('cashier')}
                        startIcon={<PointOfSaleOutlinedIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Cashier Shift
                      </Button>
                    )}
                    {isAdminOrManager && (
                      <Button
                        variant={currentView === 'admin' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('admin')}
                        startIcon={<AdminPanelSettingsOutlinedIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Admin Panel
                      </Button>
                    )}
                    {isAdminOrManager && (
                      <Button
                        variant={currentView === 'day_end' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('day_end')}
                        startIcon={<VerifiedIcon fontSize="small" />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Day End
                      </Button>
                    )}
                    {isAdminOrManager && (
                      <Button
                        variant={currentView === 'payment_reconciliation' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('payment_reconciliation')}
                        startIcon={<ArrowRightLeft size={18} />}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Reconciliation
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <Button
                        variant={currentView === 'superadmin' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('superadmin')}
                        startIcon={<SecurityOutlinedIcon fontSize="small" />}
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
                        sx: { minWidth: 220, borderRadius: 2, mt: 1 }
                      }
                    }}
                  >
                    {isWarehouseManager && (
                      <MenuItem
                        onClick={() => { setCurrentView('warehouse'); setAnchorElNav(null); }}
                        selected={currentView === 'warehouse'}
                        sx={{ fontWeight: currentView === 'warehouse' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <Inventory2OutlinedIcon fontSize="small" /> Warehouse Suite
                      </MenuItem>
                    )}
                    {(!isWarehouseManager || hasPosPermission) && (
                      <MenuItem
                        onClick={() => { setCurrentView('pos'); setAnchorElNav(null); }}
                        selected={currentView === 'pos'}
                        sx={{ fontWeight: currentView === 'pos' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <ShoppingCartOutlinedIcon fontSize="small" /> POS Screen
                      </MenuItem>
                    )}
                    {isSalesman && (
                      <MenuItem
                        onClick={() => { setCurrentView('inventory'); setAnchorElNav(null); }}
                        selected={currentView === 'inventory'}
                        sx={{ fontWeight: currentView === 'inventory' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <Inventory2OutlinedIcon fontSize="small" /> Stock Inventory
                      </MenuItem>
                    )}
                    {(user?.feature_superbill || isSuperAdmin) && !isSalesman && !isWarehouseManager && (
                      <>
                        <MenuItem
                          onClick={() => { setCurrentView('superbill_billing'); setAnchorElNav(null); }}
                          selected={currentView === 'superbill_billing'}
                          sx={{ fontWeight: currentView === 'superbill_billing' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <ElectricBoltOutlinedIcon fontSize="small" /> SuperBill Billing
                        </MenuItem>
                        <MenuItem
                          onClick={() => { setCurrentView('superbill_items'); setAnchorElNav(null); }}
                          selected={currentView === 'superbill_items'}
                          sx={{ fontWeight: currentView === 'superbill_items' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <Inventory2OutlinedIcon fontSize="small" /> SuperBill Items
                        </MenuItem>
                      </>
                    )}
                    {!isSalesman && !isWarehouseManager && (
                      <MenuItem
                        onClick={() => { setCurrentView('cashier'); setAnchorElNav(null); }}
                        selected={currentView === 'cashier'}
                        sx={{ fontWeight: currentView === 'cashier' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <PointOfSaleOutlinedIcon fontSize="small" /> Cashier Shift
                      </MenuItem>
                    )}
                    {isAdminOrManager && (
                      <MenuItem
                        onClick={() => { setCurrentView('admin'); setAnchorElNav(null); }}
                        selected={currentView === 'admin'}
                        sx={{ fontWeight: currentView === 'admin' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <AdminPanelSettingsOutlinedIcon fontSize="small" /> Admin Panel
                      </MenuItem>
                    )}
                    {isAdminOrManager && (
                      <MenuItem
                        onClick={() => { setCurrentView('day_end'); setAnchorElNav(null); }}
                        selected={currentView === 'day_end'}
                        sx={{ fontWeight: currentView === 'day_end' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <VerifiedIcon fontSize="small" /> Day End Closing
                      </MenuItem>
                    )}
                    {isAdminOrManager && (
                      <MenuItem
                        onClick={() => { setCurrentView('payment_reconciliation'); setAnchorElNav(null); }}
                        selected={currentView === 'payment_reconciliation'}
                        sx={{ fontWeight: currentView === 'payment_reconciliation' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <ArrowRightLeft size={18} /> Payment Reconciliation
                      </MenuItem>
                    )}
                    {isSuperAdmin && (
                      <MenuItem
                        onClick={() => { setCurrentView('superadmin'); setAnchorElNav(null); }}
                        selected={currentView === 'superadmin'}
                        sx={{ fontWeight: currentView === 'superadmin' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <SecurityOutlinedIcon fontSize="small" /> Super Admin
                      </MenuItem>
                    )}
                    <Box sx={{ my: 1, borderTop: 1, borderColor: 'divider' }} />
                    <MenuItem
                      onClick={() => { setAnchorElNav(null); setLanguageModalVisible(true); }}
                      sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <LanguageOutlinedIcon fontSize="small" /> Language
                    </MenuItem>
                    <MenuItem
                      onClick={() => { setAnchorElNav(null); setKeyboardHelpVisible(true); }}
                      sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <KeyboardOutlinedIcon fontSize="small" /> Keyboard Shortcuts
                    </MenuItem>
                    <Box sx={{ my: 1, borderTop: 1, borderColor: 'divider' }} />
                    <MenuItem
                      onClick={() => { toggleTheme(); setAnchorElNav(null); }}
                      sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      {themeMode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
                      {themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </MenuItem>
                    <Box sx={{ my: 1, borderTop: 1, borderColor: 'divider' }} />
                    <MenuItem
                      onClick={() => { setAnchorElNav(null); handleLogout(); }}
                      sx={{ color: 'error.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <LogOutIcon fontSize="small" /> Logout
                    </MenuItem>
                  </Menu>
                </Box>

                {/* User Profile & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5, xl: 3 }, flexShrink: 0 }}>
                  
                  {/* Network/Offline Sync Indicator */}
                  {netStatus.isOnline ? (
                    <Chip
                      label={netStatus.isSyncing ? "Syncing..." : (netStatus.pendingCount > 0 ? `${netStatus.pendingCount} Pending` : "Online")}
                      color={netStatus.isSyncing ? "info" : (netStatus.pendingCount > 0 ? "warning" : "success")}
                      size="small"
                      onClick={() => { if (netStatus.pendingCount > 0) SyncService.syncPendingOrders(token); }}
                      sx={{ fontWeight: 'bold', cursor: netStatus.pendingCount > 0 ? 'pointer' : 'default' }}
                      title={netStatus.pendingCount > 0 ? "Click to Sync Pending Bills Now" : "System Online"}
                    />
                  ) : (
                    <Chip
                      label={`Offline (${netStatus.pendingCount} Pending)`}
                      color="error"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                      title="System Offline - Working Locally"
                    />
                  )}

                  <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', xl: '1.2rem' } }}>{user?.name || 'User'}</Typography>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: { xs: '0.75rem', xl: '1rem' } }}>
                      {user?.role === 'warehouse_manager' ? 'Warehouse Manager' : (user?.role || 'Staff')}
                    </Typography>
                    {user?.assigned_warehouse_name && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>
                        🏬 {user.assigned_warehouse_name}
                      </Typography>
                    )}
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
                cart={cart}
                setCart={setCart}
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                paymentMode={paymentMode}
                setPaymentMode={setPaymentMode}
                taxType={taxType}
                setTaxType={setTaxType}
                receiptSettings={receiptSettings}
                setReceiptSettings={setReceiptSettings}
                onNavigate={setCurrentView}
                netStatus={netStatus}
                onManualSync={() => SyncService.triggerManualSync(token)}
              />
            )}
            {currentView === 'superbill_billing' && user?.feature_superbill && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperBillBilling
                  user={user}
                  token={token}
                  cart={cart}
                  setCart={setCart}
                  discountType={discountType}
                  setDiscountType={setDiscountType}
                  discountValue={discountValue}
                  setDiscountValue={setDiscountValue}
                  paymentMode={paymentMode}
                  setPaymentMode={setPaymentMode}
                  taxType={taxType}
                  setTaxType={setTaxType}
                  receiptSettings={receiptSettings}
                  setReceiptSettings={setReceiptSettings}
                  onNavigate={setCurrentView}
                />
              </Box>
            )}
            {currentView === 'superbill_items' && user?.feature_superbill && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperBillItems user={user} token={localStorage.getItem('ARISO_RETAIL_TOKEN') || ''} />
              </Box>
            )}
            {currentView === 'cashier' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <CashierDashboard user={user} token={token} onLogout={handleLogout} />
              </Box>
            )}
            {currentView === 'inventory' && isSalesman && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel user={user} token={token} initialTab={5} isSalesmanView={true} />
              </Box>
            )}
            {(currentView === 'warehouse' || (isWarehouseManager && currentView === 'admin')) && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel user={user} token={token} initialTab={5} isWarehouseManagerView={true} />
              </Box>
            )}
            {currentView === 'admin' && !isWarehouseManager && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel user={user} token={token} />
              </Box>
            )}
            {currentView === 'day_end' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <DayEndDashboard user={user} token={token} />
              </Box>
            )}
            {currentView === 'payment_reconciliation' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <PaymentReconciliationSuite user={user} />
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
