import React, { useState, useEffect } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar,
  Typography, Button, IconButton, useMediaQuery, Menu, MenuItem, Chip,
  Tooltip, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
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
import { ArrowRightLeft, Tag, ChevronDown, MoreHorizontal, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import SuperBillItems from './pages/SuperBillItems';
import SuperBillBilling from './pages/SuperBillBilling';
import ChangePasswordModal from './components/ChangePasswordModal';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import KeyboardHelpModal from './components/KeyboardHelpModal';
import { NotificationProvider } from './context/NotificationContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import { apiFetch, resolveImageUrl } from './utils/api';
import { applyThemeToCssVariables } from './utils/themePresets';

import { LanguageProvider } from './locales/LanguageContext';
import { SyncService } from './utils/syncService';
import retailLogo from './assets/retail-logo.png';

const VALID_VIEWS = [
  'pos',
  'inventory',
  'admin',
  'warehouse',
  'cashier',
  'superbill_billing',
  'superbill_items',
  'day_end',
  'payment_reconciliation',
  'serial_numbers',
  'superadmin'
];

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
      // 1. Check URL hash (e.g. #/inventory, #/admin, #pos)
      if (typeof window !== 'undefined' && window.location.hash) {
        const cleanHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0].trim().toLowerCase();
        if (cleanHash && VALID_VIEWS.includes(cleanHash)) {
          return cleanHash;
        }
      }
      // 2. Check query params (?view=admin or ?page=inventory)
      if (typeof window !== 'undefined' && window.location.search) {
        const sp = new URLSearchParams(window.location.search);
        const qp = (sp.get('view') || sp.get('page') || '').toLowerCase().trim();
        if (qp && VALID_VIEWS.includes(qp)) {
          return qp;
        }
      }
      // 3. Check localStorage for previously viewed screen
      const savedView = localStorage.getItem('ARISO_RETAIL_CURRENT_VIEW') || localStorage.getItem('ariso_current_view');
      if (savedView && VALID_VIEWS.includes(savedView)) {
        return savedView;
      }
      // 4. Role-based fallback
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

  // Shared POS / SuperBill Cart & Checkout States (restored on refresh)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('ariso_pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (Array.isArray(cart) && cart.length > 0) {
        localStorage.setItem('ariso_pos_cart', JSON.stringify(cart));
      } else {
        localStorage.removeItem('ariso_pos_cart');
      }
    } catch (_) {}
  }, [cart]);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [taxType, setTaxType] = useState('intra');
  const [receiptSettings, setReceiptSettings] = useState(null);

  // Global Session Pricing Mode: 'retail' | 'wholesale'
  const [pricingMode, setPricingMode] = useState(() => {
    try {
      return localStorage.getItem('ariso_pricing_mode') || 'retail';
    } catch {
      return 'retail';
    }
  });

  const handleGlobalPricingModeChange = (newMode) => {
    if (newMode === pricingMode) return;
    if (cart && cart.length > 0) {
      const confirmChange = window.confirm(
        `Switch pricing mode to ${newMode === 'wholesale' ? 'Wholesale' : 'Retail'}? Items currently in the cart will be repriced to the ${newMode} rates.`
      );
      if (!confirmChange) return;
    }
    setPricingMode(newMode);
    try {
      localStorage.setItem('ariso_pricing_mode', newMode);
      window.dispatchEvent(new CustomEvent('ariso_pricing_mode_change', { detail: { mode: newMode } }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleModeEvent = (e) => {
      if (e.detail?.mode && e.detail.mode !== pricingMode) {
        setPricingMode(e.detail.mode);
      }
    };
    window.addEventListener('ariso_pricing_mode_change', handleModeEvent);
    return () => window.removeEventListener('ariso_pricing_mode_change', handleModeEvent);
  }, [pricingMode]);

  const [anchorElUserMenu, setAnchorElUserMenu] = useState(null);
  const [anchorElMore, setAnchorElMore] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:899px)');
  const isMidScreen = useMediaQuery('(min-width:900px) and (max-width:1279px)');

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
      localStorage.removeItem('ARISO_RETAIL_CURRENT_VIEW');
      localStorage.removeItem('ariso_current_view');
      localStorage.removeItem('ariso_admin_active_tab');
      localStorage.removeItem('ariso_admin_inventory_subtab');
      localStorage.removeItem('ariso_admin_gst_subtab');
      localStorage.removeItem('ariso_pos_cart');
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch (_) {}
      setUser(null);
      setToken('');
    }
  };

  // Persist currentView and sync URL hash on view change
  useEffect(() => {
    if (currentView) {
      try {
        localStorage.setItem('ARISO_RETAIL_CURRENT_VIEW', currentView);
        localStorage.setItem('ariso_current_view', currentView);
        const currentHashBase = window.location.hash.split('?')[0].replace(/^#\/?/, '').trim().toLowerCase();
        if (currentHashBase !== currentView) {
          const searchPart = window.location.hash.includes('?') ? `?${window.location.hash.split('?')[1]}` : '';
          window.history.replaceState(null, '', `#/${currentView}${searchPart}`);
        }
      } catch (e) {}
    }
  }, [currentView]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const cleanHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0].trim().toLowerCase();
        if (cleanHash && VALID_VIEWS.includes(cleanHash)) {
          setCurrentView(cleanHash);
        }
      } catch (e) {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    if (!token) return;

    const checkTenantStatus = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res && res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(prev => {
              if (!prev) return data.user;
              if (
                prev.subscription_status !== data.user.subscription_status ||
                prev.is_subscription_expired !== data.user.is_subscription_expired ||
                String(prev.subscription_expires_at || '') !== String(data.user.subscription_expires_at || '') ||
                prev.feature_serial_numbers !== data.user.feature_serial_numbers ||
                prev.reconciliation_enabled !== data.user.reconciliation_enabled ||
                String(prev.support_contact_number || '') !== String(data.user.support_contact_number || '')
              ) {
                const updated = { ...prev, ...data.user };
                localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(updated));
                localStorage.setItem('pos_user', JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // network or offline, ignore
      }
    };

    checkTenantStatus();
    const interval = setInterval(checkTenantStatus, 15000);
    window.addEventListener('focus', checkTenantStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkTenantStatus);
    };
  }, [token]);

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

  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'superadmin';
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
  const isSalesman = userRole === 'salesman';
  const isWarehouseManager = userRole === 'warehouse_manager';

  const userPerms = React.useMemo(() => {
    if (Array.isArray(user?.permissions) && user.permissions.length > 0) return user.permissions;
    if (isSuperAdmin || userRole === 'admin') return ['all'];
    if (userRole === 'manager') return [
      'pos_billing', 'order_history', 'sales_orders', 'customers',
      'menu_items', 'categories', 'inventory', 'warehouse_dashboard', 'inventory_catalog',
      'warehouses', 'rack_management', 'stock_transfer', 'stock_receiving', 'stock_count',
      'stock_adjustment', 'stock_requests', 'stock_ledger', 'warehouse_reports',
      'reports', 'item_sales_report', 'bank_accounts', 'expenses', 'day_end',
      'payment_reconciliation', 'suppliers', 'printers', 'gst', 'settings'
    ];
    if (userRole === 'salesman') return ['pos_billing', 'sales_orders', 'customers', 'inventory', 'order_history'];
    if (userRole === 'warehouse_manager') return [
      'inventory', 'warehouse_dashboard', 'inventory_catalog', 'warehouses',
      'rack_management', 'stock_transfer', 'stock_receiving', 'stock_count',
      'stock_adjustment', 'stock_requests', 'stock_ledger', 'warehouse_reports',
      'suppliers', 'item_sales_report', 'sales_orders', 'customers'
    ];
    return ['pos_billing', 'order_history', 'day_end', 'customers'];
  }, [user?.permissions, userRole, isSuperAdmin]);

  const hasPosPermission = !isSuperAdmin && (userPerms.includes('pos_billing') || userPerms.includes('all'));
  const hasDayEndPermission = !isSuperAdmin && (isAdminOrManager || userPerms.includes('day_end') || userPerms.includes('all'));
  const hasReconciliationPermission = !isSuperAdmin && Boolean(user?.reconciliation_enabled) && (isAdminOrManager || userPerms.includes('payment_reconciliation') || userPerms.includes('all'));
  const hasAdminPanelPermission = !isSuperAdmin && (isAdminOrManager || userPerms.some(p => [
    'menu_items', 'categories', 'printers', 'reports', 'item_sales_report', 'inventory',
    'gst', 'settings', 'profile', 'staff', 'order_history', 'sales_orders', 'customers',
    'bank_accounts', 'expenses', 'day_end', 'payment_reconciliation', 'suppliers', 'serial_numbers'
  ].includes(p)));
  const hasSerialNumbersPermission = !isSuperAdmin && (user?.feature_serial_numbers !== false) && (userRole === 'admin' || userPerms.includes('serial_numbers') || userPerms.includes('all'));
  const hasCashierShiftPermission = !isSuperAdmin && !isSalesman && !isWarehouseManager;

  const navItems = React.useMemo(() => {
    return [
      isSuperAdmin && {
        id: 'superadmin',
        label: 'Super Admin',
        icon: <SecurityOutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('superadmin')
      },
      isWarehouseManager && {
        id: 'warehouse',
        label: 'Warehouse Suite',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('warehouse')
      },
      hasPosPermission && {
        id: 'pos',
        label: 'POS Screen',
        icon: <ShoppingCartOutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('pos')
      },
      isSalesman && {
        id: 'inventory',
        label: 'Stock Inventory',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('inventory')
      },
      (!isSuperAdmin && user?.feature_superbill && !isSalesman && !isWarehouseManager) && {
        id: 'superbill_billing',
        label: 'SuperBill Billing',
        icon: <ElectricBoltOutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('superbill_billing')
      },
      (!isSuperAdmin && user?.feature_superbill && !isSalesman && !isWarehouseManager) && {
        id: 'superbill_items',
        label: 'SuperBill Items',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('superbill_items')
      },
      hasCashierShiftPermission && {
        id: 'cashier',
        label: 'Cashier Shift',
        icon: <PointOfSaleOutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('cashier')
      },
      hasAdminPanelPermission && {
        id: 'admin',
        label: 'Admin Panel',
        icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
        onClick: () => setCurrentView('admin')
      },
      hasDayEndPermission && {
        id: 'day_end',
        label: 'Day End',
        icon: <VerifiedIcon fontSize="small" />,
        onClick: () => setCurrentView('day_end')
      },
      hasReconciliationPermission && {
        id: 'payment_reconciliation',
        label: 'Reconciliation',
        icon: <ArrowRightLeft size={16} />,
        onClick: () => setCurrentView('payment_reconciliation')
      },
      hasSerialNumbersPermission && {
        id: 'serial_numbers',
        label: 'Serial Numbers',
        icon: <Tag size={16} />,
        onClick: () => setCurrentView('serial_numbers')
      }
    ].filter(Boolean);
  }, [
    isSuperAdmin, isWarehouseManager, hasPosPermission, isSalesman,
    user?.feature_superbill, hasCashierShiftPermission, hasAdminPanelPermission,
    hasDayEndPermission, hasReconciliationPermission, hasSerialNumbersPermission
  ]);

  const { visibleNavItems, overflowNavItems } = React.useMemo(() => {
    const maxVisibleOnMid = 3;
    if (!isMidScreen || navItems.length <= 4) {
      return { visibleNavItems: navItems, overflowNavItems: [] };
    }
    const activeIndex = navItems.findIndex(i => i.id === currentView);
    if (activeIndex >= maxVisibleOnMid) {
      const visible = [...navItems.slice(0, maxVisibleOnMid - 1), navItems[activeIndex]];
      const overflow = navItems.filter(item => !visible.some(v => v.id === item.id));
      return { visibleNavItems: visible, overflowNavItems: overflow };
    }
    return {
      visibleNavItems: navItems.slice(0, maxVisibleOnMid),
      overflowNavItems: navItems.slice(maxVisibleOnMid)
    };
  }, [navItems, isMidScreen, currentView]);

  const parseDateNormalized = (d) => {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    const str = String(d).trim();
    const isoStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
    const date = new Date(isoStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const isAccountExpired = React.useMemo(() => {
    if (isSuperAdmin) return false;
    if (user?.subscription_status === 'expired') return true;
    if (user?.is_subscription_expired) return true;
    if (user?.subscription_expires_at) {
      const exp = parseDateNormalized(user.subscription_expires_at);
      if (exp && exp.getTime() < Date.now()) {
        return true;
      }
    }
    return false;
  }, [isSuperAdmin, user?.subscription_status, user?.is_subscription_expired, user?.subscription_expires_at]);

  const preExpiryInfo = React.useMemo(() => {
    if (isSuperAdmin || isAccountExpired) return null;
    if (!user?.subscription_expires_at) return null;

    const exp = parseDateNormalized(user.subscription_expires_at);
    if (!exp) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(exp);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 10) {
      const isUrgentFinalDay = diffDays <= 1;
      const message = diffDays === 0
        ? 'Your subscription will expire today'
        : (diffDays === 1
          ? 'Your subscription will expire in 1 day'
          : `Your subscription will expire in ${diffDays} days`);

      return {
        daysRemaining: diffDays,
        isUrgentFinalDay,
        message
      };
    }

    return null;
  }, [isSuperAdmin, isAccountExpired, user?.subscription_expires_at]);

  const expiredBannerText = React.useMemo(() => {
    const base = 'Your account has expired. Please contact support to renew.';
    const phone = String(user?.support_contact_number || '').trim();
    if (!phone) return base;
    return `${base} Mouse and keyboard will not work until you renew. Call ${phone} to renew.`;
  }, [user?.support_contact_number]);

  const contentLockRef = React.useRef(null);

  // Hard lock: when expired, make the page content inert (no focus/clicks) and swallow
  // all keyboard / pointer events that do not originate from the header or banner.
  useEffect(() => {
    const el = contentLockRef.current;
    if (!isAccountExpired) {
      if (el) el.removeAttribute('inert');
      return undefined;
    }
    if (el) el.setAttribute('inert', '');
    try {
      const active = document.activeElement;
      if (active && active !== document.body && el && el.contains(active)) active.blur();
    } catch (_) {}

    const isAllowedTarget = (target) =>
      target && target.closest && target.closest('header, [role="presentation"], [data-expiry-allow]');

    const block = (e) => {
      if (isAllowedTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    const events = ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel', 'paste', 'input'];
    events.forEach(ev => window.addEventListener(ev, block, true));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, block, true));
      if (contentLockRef.current) contentLockRef.current.removeAttribute('inert');
    };
  }, [isAccountExpired]);
  if (!token || !user) {
    return (
      <NotificationProvider>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Login onLoginSuccess={(u, t) => {
            setUser(u);
            setToken(t);
            let targetView = 'pos';
            const cleanHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0].trim().toLowerCase();
            const savedV = localStorage.getItem('ARISO_RETAIL_CURRENT_VIEW') || localStorage.getItem('ariso_current_view');
            const candidate = (cleanHash && VALID_VIEWS.includes(cleanHash)) ? cleanHash : (savedV && VALID_VIEWS.includes(savedV) ? savedV : null);
            if (candidate) {
              targetView = candidate;
            } else if (u.role === 'super_admin' || u.role === 'superadmin') {
              targetView = 'superadmin';
            } else if (u.role === 'warehouse_manager') {
              targetView = 'warehouse';
            }
            setCurrentView(targetView);
          }} />
        </ThemeProvider>
      </NotificationProvider>
    );
  }

  return (
    <LanguageProvider>
      <NotificationProvider>
      <DataRefreshProvider token={token}>
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
            <AppBar
              position="static"
              color="default"
              elevation={0}
              sx={{
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: isAccountExpired ? 'relative' : undefined,
                zIndex: (theme) => theme.zIndex.appBar
              }}
            >
              <Toolbar
                variant="dense"
                disableGutters
                sx={{
                  height: { xs: 52, md: 56 },
                  minHeight: { xs: 52, md: 56 },
                  maxHeight: { xs: 52, md: 56 },
                  px: { xs: 1.5, sm: 2, lg: 3 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: { xs: 1, sm: 1.5, lg: 2 }
                }}
              >
                {/* 1. Left Side: Brand Logo & Full Business Name */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    flexShrink: 0,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => {
                    if (hasPosPermission) setCurrentView('pos');
                    else if (isSuperAdmin) setCurrentView('superadmin');
                  }}
                >
                  <Box
                    component="img"
                    src={isSuperAdmin ? retailLogo : (resolveImageUrl(user?.restaurant_logo_url) || retailLogo)}
                    alt="Ariso Retail"
                    sx={{
                      width: { xs: 28, md: 32 },
                      height: { xs: 28, md: 32 },
                      borderRadius: 1.5,
                      objectFit: 'contain',
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.25,
                      bgcolor: '#ffffff'
                    }}
                    onError={(e) => { e.target.src = retailLogo; }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '0.88rem', sm: '1rem' },
                      color: 'text.primary',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.02em',
                      maxWidth: { xs: 150, sm: 240, md: 'none' },
                      overflow: { xs: 'hidden', md: 'visible' },
                      textOverflow: { xs: 'ellipsis', md: 'clip' }
                    }}
                  >
                    {isSuperAdmin ? 'Ariso Retail Enterprise' : (user?.restaurant_name || 'Ariso Retail Flagship')}
                  </Typography>
                  {isSuperAdmin && (
                    <Chip
                      label="SUPER ADMIN"
                      color="secondary"
                      size="small"
                      icon={<SecurityOutlinedIcon fontSize="small" />}
                      sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22, ml: 0.5, display: { xs: 'none', sm: 'inline-flex' } }}
                    />
                  )}
                  {isAccountExpired && (
                    <Chip
                      label="EXPIRED"
                      color="error"
                      size="small"
                      sx={{ fontWeight: 900, fontSize: '0.65rem', height: 22, ml: 0.5 }}
                    />
                  )}
                  {preExpiryInfo && (
                    <Chip
                      label={preExpiryInfo.daysRemaining === 0 ? 'EXPIRES TODAY' : `EXPIRES IN ${preExpiryInfo.daysRemaining}D`}
                      color="error"
                      size="small"
                      sx={{
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        height: 22,
                        ml: 0.5,
                        animation: preExpiryInfo.isUrgentFinalDay ? 'bannerPulse 1.5s infinite ease-in-out' : 'none'
                      }}
                    />
                  )}
                </Box>

                {/* 2. Center: Desktop Navigation Bar (nowrap, compact, aligned icons) */}
                {!isMobile && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { md: 0.75, lg: 1 },
                      flex: 1,
                      justifyContent: 'center',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}
                  >
                    {visibleNavItems.map(item => {
                      const isActive = currentView === item.id;
                      return (
                        <Button
                          key={item.id}
                          onClick={item.onClick}
                          startIcon={item.icon}
                          sx={{
                            height: 34,
                            minHeight: 34,
                            px: { md: 1.2, lg: 1.6 },
                            borderRadius: '8px',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            fontSize: '0.84rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive
                              ? '#ea580c'
                              : (themeMode === 'dark' ? '#94a3b8' : '#475569'),
                            bgcolor: isActive
                              ? (themeMode === 'dark' ? 'rgba(234, 88, 12, 0.16)' : 'rgba(234, 88, 12, 0.08)')
                              : 'transparent',
                            border: '1px solid',
                            borderColor: isActive
                              ? (themeMode === 'dark' ? 'rgba(234, 88, 12, 0.35)' : 'rgba(234, 88, 12, 0.22)')
                              : 'transparent',
                            boxShadow: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            flexShrink: 0,
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              bgcolor: isActive
                                ? (themeMode === 'dark' ? 'rgba(234, 88, 12, 0.22)' : 'rgba(234, 88, 12, 0.14)')
                                : (themeMode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                              color: isActive ? '#ea580c' : (themeMode === 'dark' ? '#f8fafc' : '#0f172a'),
                              borderColor: isActive
                                ? (themeMode === 'dark' ? 'rgba(234, 88, 12, 0.45)' : 'rgba(234, 88, 12, 0.32)')
                                : 'transparent'
                            },
                            '& .MuiButton-startIcon': {
                              mr: 0.25,
                              ml: 0,
                              color: isActive ? '#ea580c' : (themeMode === 'dark' ? '#94a3b8' : '#64748b'),
                              display: 'flex',
                              alignItems: 'center'
                            }
                          }}
                        >
                          {item.label}
                        </Button>
                      );
                    })}

                    {/* Responsive "More" Dropdown on mid-size screens */}
                    {overflowNavItems.length > 0 && (
                      <>
                        <Button
                          onClick={(e) => setAnchorElMore(e.currentTarget)}
                          endIcon={<ChevronDown size={14} />}
                          sx={{
                            height: 34,
                            minHeight: 34,
                            px: 1.25,
                            borderRadius: '8px',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            color: overflowNavItems.some(i => i.id === currentView) ? '#ea580c' : 'text.secondary',
                            bgcolor: overflowNavItems.some(i => i.id === currentView) ? 'rgba(234, 88, 12, 0.08)' : 'transparent',
                            border: '1px solid',
                            borderColor: overflowNavItems.some(i => i.id === currentView) ? 'rgba(234, 88, 12, 0.22)' : 'transparent',
                            flexShrink: 0,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          More
                        </Button>
                        <Menu
                          anchorEl={anchorElMore}
                          open={Boolean(anchorElMore)}
                          onClose={() => setAnchorElMore(null)}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                          slotProps={{
                            paper: {
                              elevation: 4,
                              sx: { minWidth: 180, borderRadius: 2, mt: 0.5, p: 0.5 }
                            }
                          }}
                        >
                          {overflowNavItems.map(item => (
                            <MenuItem
                              key={item.id}
                              onClick={() => { item.onClick(); setAnchorElMore(null); }}
                              sx={{
                                borderRadius: 1.5,
                                py: 1,
                                px: 1.5,
                                fontWeight: currentView === item.id ? 700 : 500,
                                fontSize: '0.85rem',
                                color: currentView === item.id ? '#ea580c' : 'text.primary',
                                bgcolor: currentView === item.id ? 'rgba(234, 88, 12, 0.08)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                                '&:hover': {
                                  bgcolor: currentView === item.id ? 'rgba(234, 88, 12, 0.14)' : 'action.hover'
                                }
                              }}
                            >
                              {item.icon} {item.label}
                            </MenuItem>
                          ))}
                        </Menu>
                      </>
                    )}
                  </Box>
                )}

                {/* 3. Right Side: Desktop (Status, User Menu, Theme, Logout) */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                  {/* Pricing Mode Toggle: Retail vs Wholesale */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                      p: '3px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                    }}
                    title="Pricing Mode for POS Billing and Sales Orders"
                  >
                    <Button
                      size="small"
                      onClick={() => handleGlobalPricingModeChange('retail')}
                      sx={{
                        px: 1.2,
                        py: 0.25,
                        minWidth: 'auto',
                        height: 26,
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: pricingMode === 'retail' ? 800 : 600,
                        textTransform: 'none',
                        bgcolor: pricingMode === 'retail' ? (themeMode === 'dark' ? 'primary.main' : '#ea580c') : 'transparent',
                        color: pricingMode === 'retail' ? '#fff' : 'text.secondary',
                        boxShadow: pricingMode === 'retail' ? '0 1px 3px rgba(234, 88, 12, 0.35)' : 'none',
                        '&:hover': {
                          bgcolor: pricingMode === 'retail' ? (themeMode === 'dark' ? 'primary.dark' : '#c2410c') : 'action.hover'
                        }
                      }}
                    >
                      Retail
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleGlobalPricingModeChange('wholesale')}
                      sx={{
                        px: 1.2,
                        py: 0.25,
                        minWidth: 'auto',
                        height: 26,
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: pricingMode === 'wholesale' ? 800 : 600,
                        textTransform: 'none',
                        bgcolor: pricingMode === 'wholesale' ? '#9333ea' : 'transparent',
                        color: pricingMode === 'wholesale' ? '#fff' : 'text.secondary',
                        boxShadow: pricingMode === 'wholesale' ? '0 1px 3px rgba(147, 51, 234, 0.35)' : 'none',
                        '&:hover': {
                          bgcolor: pricingMode === 'wholesale' ? '#7e22ce' : 'action.hover'
                        }
                      }}
                    >
                      Wholesale
                    </Button>
                  </Box>

                  {/* Network / Offline Sync Status */}
                  <Box
                    onClick={() => { if (netStatus.pendingCount > 0) SyncService.syncPendingOrders(token); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.2,
                      py: 0.4,
                      borderRadius: 4,
                      bgcolor: netStatus.isOnline
                        ? (netStatus.pendingCount > 0 ? 'warning.light' : (themeMode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5'))
                        : (themeMode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                      border: '1px solid',
                      borderColor: netStatus.isOnline
                        ? (netStatus.pendingCount > 0 ? 'warning.main' : (themeMode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'))
                        : (themeMode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'),
                      cursor: netStatus.pendingCount > 0 ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                    title={netStatus.isOnline ? (netStatus.pendingCount > 0 ? 'Click to sync pending orders' : 'System Online') : 'System Offline (Local DB)'}
                  >
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: netStatus.isOnline ? (netStatus.pendingCount > 0 ? '#f59e0b' : '#16a34a') : '#dc2626'
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        color: netStatus.isOnline ? (netStatus.pendingCount > 0 ? '#b45309' : '#15803d') : '#b91c1c'
                      }}
                    >
                      {netStatus.isSyncing ? 'Syncing...' : (netStatus.pendingCount > 0 ? `${netStatus.pendingCount} P` : (netStatus.isOnline ? 'Online' : 'Offline'))}
                    </Typography>
                  </Box>

                  {/* User Profile trigger with dropdown */}
                  <Box
                    onClick={(e) => setAnchorElUserMenu(e.currentTarget)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      cursor: 'pointer',
                      px: 1,
                      py: 0.4,
                      borderRadius: 1.5,
                      border: '1px solid transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' }
                    }}
                  >
                    <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2, color: 'text.primary', whiteSpace: 'nowrap' }}>
                        {user?.name || (isSuperAdmin ? 'Super Administrator' : 'User')}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', color: isSuperAdmin ? 'secondary.main' : 'text.secondary', whiteSpace: 'nowrap' }}>
                        {isSuperAdmin ? 'Super Admin' : (user?.role === 'warehouse_manager' ? 'Warehouse Manager' : (user?.role || 'Staff'))}
                      </Typography>
                    </Box>
                    <ChevronDown size={14} color="#64748b" />
                  </Box>

                  {/* User Settings Dropdown */}
                  <Menu
                    anchorEl={anchorElUserMenu}
                    open={Boolean(anchorElUserMenu)}
                    onClose={() => setAnchorElUserMenu(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                      paper: {
                        elevation: 4,
                        sx: { minWidth: 220, borderRadius: 2, mt: 0.5, p: 0.5 }
                      }
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', borderRadius: 1.5, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {user?.name || (isSuperAdmin ? 'Super Administrator' : 'User')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isSuperAdmin ? 'secondary.main' : '#ea580c', fontWeight: 700, textTransform: 'uppercase' }}>
                        {isSuperAdmin ? 'Super Admin Console' : (user?.role === 'warehouse_manager' ? 'Warehouse Manager' : (user?.role || 'Staff'))}
                      </Typography>
                      {!isSuperAdmin && user?.assigned_warehouse_name && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mt: 0.25 }}>
                          🏬 {user.assigned_warehouse_name}
                        </Typography>
                      )}
                    </Box>
                    <MenuItem onClick={() => { setAnchorElUserMenu(null); setLanguageModalVisible(true); }} sx={{ borderRadius: 1.5, py: 0.9, gap: 1.25, fontSize: '0.85rem' }}>
                      <LanguageOutlinedIcon fontSize="small" /> Language
                    </MenuItem>
                    <MenuItem onClick={() => { setAnchorElUserMenu(null); setKeyboardHelpVisible(true); }} sx={{ borderRadius: 1.5, py: 0.9, gap: 1.25, fontSize: '0.85rem' }}>
                      <KeyboardOutlinedIcon fontSize="small" /> Keyboard Shortcuts
                    </MenuItem>
                    <MenuItem onClick={() => { toggleTheme(); setAnchorElUserMenu(null); }} sx={{ borderRadius: 1.5, py: 0.9, gap: 1.25, fontSize: '0.85rem' }}>
                      {themeMode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
                      {themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    <MenuItem onClick={() => { setAnchorElUserMenu(null); handleLogout(); }} sx={{ borderRadius: 1.5, py: 0.9, gap: 1.25, fontSize: '0.85rem', color: 'error.main', fontWeight: 600 }}>
                      <LogOutIcon fontSize="small" /> Logout
                    </MenuItem>
                  </Menu>

                  {/* Dark Mode Toggle Quick Icon */}
                  <Tooltip title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} arrow>
                    <IconButton
                      onClick={toggleTheme}
                      size="small"
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'action.hover', color: 'text.primary' }
                      }}
                    >
                      {themeMode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
                    </IconButton>
                  </Tooltip>

                  {/* Direct Logout Icon Button */}
                  <Tooltip title="Logout / End Session" arrow>
                    <IconButton
                      onClick={handleLogout}
                      size="small"
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '8px',
                        color: '#ef4444',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: '#fef2f2', borderColor: '#fca5a5' }
                      }}
                    >
                      <LogOutIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* 4. Right Side: Mobile (Only Essentials: Online Badge + 44px Hamburger Button) */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
                  {/* Compact Status Dot */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.9,
                      py: 0.35,
                      borderRadius: 4,
                      bgcolor: netStatus.isOnline
                        ? (netStatus.pendingCount > 0 ? 'warning.light' : (themeMode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5'))
                        : (themeMode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                      border: '1px solid',
                      borderColor: netStatus.isOnline
                        ? (netStatus.pendingCount > 0 ? 'warning.main' : (themeMode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'))
                        : (themeMode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca')
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: netStatus.isOnline ? (netStatus.pendingCount > 0 ? '#f59e0b' : '#16a34a') : '#dc2626'
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        color: netStatus.isOnline ? (netStatus.pendingCount > 0 ? '#b45309' : '#15803d') : '#b91c1c'
                      }}
                    >
                      {netStatus.isOnline ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>

                  {/* 44px Hamburger Touch Target Button */}
                  <IconButton
                    onClick={() => setMobileDrawerOpen(true)}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <MenuIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Toolbar>
              {/* Pre-Expiry Countdown Banner or Expired Account Header Banner */}
              {(isAccountExpired || preExpiryInfo) && (
                <Box
                  sx={{
                    bgcolor: '#dc2626',
                    color: '#ffffff',
                    px: 2,
                    py: 0.85,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.25,
                    fontWeight: 700,
                    fontSize: { xs: '0.8rem', sm: '0.88rem' },
                    letterSpacing: '0.01em',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                    textAlign: 'center',
                    animation: (!isAccountExpired && preExpiryInfo?.isUrgentFinalDay) ? 'bannerPulse 1.5s infinite ease-in-out' : 'none',
                    '@keyframes bannerPulse': {
                      '0%': {
                        backgroundColor: '#dc2626',
                        opacity: 1,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
                      },
                      '50%': {
                        backgroundColor: '#991b1b',
                        opacity: 0.88,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 14px rgba(220, 38, 38, 0.8)'
                      },
                      '100%': {
                        backgroundColor: '#dc2626',
                        opacity: 1,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
                      }
                    }
                  }}
                >
                  {isAccountExpired ? (
                    <>
                      <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                      <span>{expiredBannerText}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <span>{preExpiryInfo?.message}</span>
                    </>
                  )}
                </Box>
              )}
            </AppBar>
          )}

          {/* POS Focus Mode Banner (Pre-expiry countdown or Expired) */}
          {posFocusMode && (isAccountExpired || preExpiryInfo) && (
            <Box
              sx={{
                bgcolor: '#dc2626',
                color: '#ffffff',
                px: 2,
                py: 0.85,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.25,
                fontWeight: 700,
                fontSize: { xs: '0.8rem', sm: '0.88rem' },
                textAlign: 'center',
                zIndex: 9999,
                position: 'relative',
                animation: (!isAccountExpired && preExpiryInfo?.isUrgentFinalDay) ? 'bannerPulse 1.5s infinite ease-in-out' : 'none',
                '@keyframes bannerPulse': {
                  '0%': {
                    backgroundColor: '#dc2626',
                    opacity: 1
                  },
                  '50%': {
                    backgroundColor: '#991b1b',
                    opacity: 0.88
                  },
                  '100%': {
                    backgroundColor: '#dc2626',
                    opacity: 1
                  }
                }
              }}
            >
              {isAccountExpired ? (
                <>
                  <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                  <span>{expiredBannerText}</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>{preExpiryInfo?.message}</span>
                </>
              )}
            </Box>
          )}

          {/* Mobile Navigation Drawer (Full touch targets, no text clipping) */}
          <Drawer
            anchor="right"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            slotProps={{
              paper: {
                sx: { width: 290, maxWidth: '85vw', display: 'flex', flexDirection: 'column' }
              }
            }}
          >
            {/* Drawer Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component="img"
                  src={isSuperAdmin ? retailLogo : (resolveImageUrl(user?.restaurant_logo_url) || retailLogo)}
                  alt="Ariso"
                  sx={{ width: 26, height: 26, borderRadius: 1 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {isSuperAdmin ? 'Ariso Retail' : (user?.restaurant_name || 'Ariso Retail Flagship')}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setMobileDrawerOpen(false)} sx={{ width: 36, height: 36 }}>
                <X size={18} />
              </IconButton>
            </Box>

            {/* Mobile User Profile Card */}
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {user?.name || (isSuperAdmin ? 'Super Administrator' : 'User')}
              </Typography>
              <Typography variant="caption" sx={{ color: isSuperAdmin ? 'secondary.main' : '#ea580c', fontWeight: 700, textTransform: 'uppercase' }}>
                {isSuperAdmin ? 'Super Admin Console' : (user?.role === 'warehouse_manager' ? 'Warehouse Manager' : (user?.role || 'Staff'))}
              </Typography>
              {!isSuperAdmin && user?.assigned_warehouse_name && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem', mt: 0.25 }}>
                  🏬 {user.assigned_warehouse_name}
                </Typography>
              )}
              {isAccountExpired && (
                <Chip
                  label="SUBSCRIPTION EXPIRED"
                  color="error"
                  size="small"
                  sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20, mt: 0.75 }}
                />
              )}
              {preExpiryInfo && (
                <Chip
                  label={preExpiryInfo.daysRemaining === 0 ? 'EXPIRES TODAY' : `EXPIRES IN ${preExpiryInfo.daysRemaining} DAY${preExpiryInfo.daysRemaining === 1 ? '' : 'S'}`}
                  color="error"
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    height: 20,
                    mt: 0.75,
                    animation: preExpiryInfo.isUrgentFinalDay ? 'bannerPulse 1.5s infinite ease-in-out' : 'none'
                  }}
                />
              )}
            </Box>

            {/* Mobile Pricing Mode Switcher */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Pricing Mode:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  p: '2px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                }}
              >
                <Button
                  size="small"
                  onClick={() => handleGlobalPricingModeChange('retail')}
                  sx={{
                    px: 1.2,
                    py: 0.25,
                    minWidth: 'auto',
                    height: 26,
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: pricingMode === 'retail' ? 800 : 600,
                    textTransform: 'none',
                    bgcolor: pricingMode === 'retail' ? '#ea580c' : 'transparent',
                    color: pricingMode === 'retail' ? '#fff' : 'text.secondary'
                  }}
                >
                  Retail
                </Button>
                <Button
                  size="small"
                  onClick={() => handleGlobalPricingModeChange('wholesale')}
                  sx={{
                    px: 1.2,
                    py: 0.25,
                    minWidth: 'auto',
                    height: 26,
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: pricingMode === 'wholesale' ? 800 : 600,
                    textTransform: 'none',
                    bgcolor: pricingMode === 'wholesale' ? '#9333ea' : 'transparent',
                    color: pricingMode === 'wholesale' ? '#fff' : 'text.secondary'
                  }}
                >
                  Wholesale
                </Button>
              </Box>
            </Box>

            {/* Mobile Navigation List */}
            <List sx={{ px: 1, py: 1.5, flex: 1, overflowY: 'auto' }}>
              {navItems.map(item => {
                const isActive = currentView === item.id;
                return (
                  <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => {
                        item.onClick();
                        setMobileDrawerOpen(false);
                      }}
                      sx={{
                        minHeight: 44,
                        borderRadius: 2,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#c2410c' : 'text.primary',
                        bgcolor: isActive ? 'rgba(234, 88, 12, 0.09)' : 'transparent',
                        border: '1px solid',
                        borderColor: isActive ? 'rgba(234, 88, 12, 0.22)' : 'transparent',
                        '&:hover': {
                          bgcolor: isActive ? 'rgba(234, 88, 12, 0.14)' : 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: isActive ? '#ea580c' : 'text.secondary' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 700 : 500
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>

            {/* Mobile Drawer Footer Utilities & Logout */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={<LanguageOutlinedIcon fontSize="small" />}
                onClick={() => { setMobileDrawerOpen(false); setLanguageModalVisible(true); }}
                sx={{ minHeight: 44, justifyContent: 'flex-start', color: 'text.primary', textTransform: 'none' }}
              >
                Language
              </Button>
              <Button
                fullWidth
                variant="text"
                startIcon={<KeyboardOutlinedIcon fontSize="small" />}
                onClick={() => { setMobileDrawerOpen(false); setKeyboardHelpVisible(true); }}
                sx={{ minHeight: 44, justifyContent: 'flex-start', color: 'text.primary', textTransform: 'none' }}
              >
                Keyboard Shortcuts
              </Button>
              <Button
                fullWidth
                variant="text"
                startIcon={themeMode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
                onClick={() => { toggleTheme(); setMobileDrawerOpen(false); }}
                sx={{ minHeight: 44, justifyContent: 'flex-start', color: 'text.primary', textTransform: 'none' }}
              >
                {themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
              </Button>
              <Divider sx={{ my: 0.5 }} />
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<LogOutIcon fontSize="small" />}
                onClick={() => { setMobileDrawerOpen(false); handleLogout(); }}
                sx={{ minHeight: 44, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
              >
                Logout
              </Button>
            </Box>
          </Drawer>

          {/* Expired-account full-screen interaction lock (header + banner stay above it) */}
          {isAccountExpired && (
            <Box
              data-expiry-overlay="true"
              aria-hidden="true"
              onContextMenu={(e) => e.preventDefault()}
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1050,
                bgcolor: 'rgba(15, 23, 42, 0.35)',
                cursor: 'not-allowed',
                touchAction: 'none'
              }}
            />
          )}

          {/* View Content */}
          <Box ref={contentLockRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
                pricingMode={pricingMode}
                onPricingModeChange={handleGlobalPricingModeChange}
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
            {currentView === 'inventory' && !isSalesman && !isWarehouseManager && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel user={user} token={token} initialTab={5} />
              </Box>
            )}
            {(currentView === 'warehouse' || (isWarehouseManager && (currentView === 'admin' || currentView === 'inventory'))) && (
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
            {currentView === 'payment_reconciliation' && hasReconciliationPermission && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <PaymentReconciliationSuite user={user} />
              </Box>
            )}
            {currentView === 'payment_reconciliation' && !hasReconciliationPermission && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error" sx={{ fontWeight: 800, mb: 1 }}>Access Denied</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: 3 }}>
                  Payment Reconciliation is disabled for this store by the Super Administrator.
                </Typography>
                <Button variant="contained" onClick={() => setCurrentView(isSuperAdmin ? 'superadmin' : (isAdminOrManager ? 'admin' : 'pos'))}>
                  Return to Dashboard
                </Button>
              </Box>
            )}
            {currentView === 'superadmin' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperAdminPanel token={token} />
              </Box>
            )}
            {currentView === 'serial_numbers' && hasSerialNumbersPermission && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel user={user} token={token} initialTab={18} />
              </Box>
            )}
            {currentView === 'serial_numbers' && !hasSerialNumbersPermission && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error" sx={{ fontWeight: 800, mb: 1 }}>Access Denied</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: 3 }}>
                  Product Serial Number Tracking is disabled for this store or account by the Super Administrator.
                </Typography>
                <Button variant="contained" onClick={() => setCurrentView(isSuperAdmin ? 'superadmin' : (isAdminOrManager ? 'admin' : 'pos'))}>
                  Return to Dashboard
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </ThemeProvider>
      </DataRefreshProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}

