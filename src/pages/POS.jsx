import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import WeightInputModal from '../components/WeightInputModal';
import CartQtyEditModal from '../components/CartQtyEditModal';
import KeyboardHelpModal from '../components/KeyboardHelpModal';
import LanguageSelectorModal from '../components/LanguageSelectorModal';
import WebBarcodeScannerModal from '../components/WebBarcodeScannerModal';
import { Printer, CheckCircle2, AlertTriangle, RotateCw, X } from 'lucide-react';
import { useLanguage } from '../locales/LanguageContext';
import {
  apiFetch,
  fetchMobileMenu,
  fetchMobileCategories,
  fetchReceiptSettings,
  fetchPrinters,
  createOrder,
  resolveImageUrl
} from '../utils/api';
import { db } from '../utils/offlineDb';
import { SyncService } from '../utils/syncService';
import {
  generateLocalHtmlReceipt,
  generateLocalEscPosReceipt,
  generateLocalHtmlKot,
  generateLocalEscPosKot,
  safeUtf8ToBase64
} from '../utils/localReceiptGenerator';

export default function POS({
  user: propUser,
  token: propToken,
  cart: sharedCart,
  setCart: sharedSetCart,
  discountType: sharedDiscountType,
  setDiscountType: sharedSetDiscountType,
  discountValue: sharedDiscountValue,
  setDiscountValue: sharedSetDiscountValue,
  paymentMode: sharedPaymentMode,
  setPaymentMode: sharedSetPaymentMode,
  taxType: sharedTaxType,
  setTaxType: sharedSetTaxType,
  receiptSettings: sharedReceiptSettings,
  setReceiptSettings: sharedSetReceiptSettings,
  onNavigate,
  netStatus: propNetStatus,
  onManualSync: propManualSync
}) {
  const { t, language, supportedLanguages } = useLanguage();

  // Load User & Token from Props or Isolated ARISO_RETAIL Local Storage
  const [user, setUser] = useState(() => {
    if (propUser && Object.keys(propUser).length > 0) return propUser;
    const saved = localStorage.getItem('ARISO_RETAIL_USER');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    if (propUser && Object.keys(propUser).length > 0) {
      setUser(propUser);
    }
  }, [propUser]);

  const token = propToken || localStorage.getItem('ARISO_RETAIL_TOKEN') || '';

  // Theme Mode State (Default: 'light')
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('pos_theme_mode') || 'light';
  });

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    localStorage.setItem('pos_theme_mode', nextMode);
  };

  // Layout & Density Control States with LocalStorage Persistence
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('pos_focus_mode') === 'true';
  });

  const [categoryLayout, setCategoryLayout] = useState(() => {
    return localStorage.getItem('pos_category_layout') || 'horizontal';
  });

  const [densityMode, setDensityMode] = useState(() => {
    return localStorage.getItem('pos_density_mode') || 'standard';
  });

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    localStorage.setItem('pos_focus_mode', next ? 'true' : 'false');
  };

  const toggleCategoryLayout = () => {
    const next = categoryLayout === 'sidebar' ? 'horizontal' : 'sidebar';
    setCategoryLayout(next);
    localStorage.setItem('pos_category_layout', next);
    if (windowWidth < 900) {
      setMobileSidebarDrawerOpen(next === 'sidebar');
    }
  };

  const changeDensityMode = (mode) => {
    setDensityMode(mode);
    localStorage.setItem('pos_density_mode', mode);
  };

  // Responsive View State for Mobile Screens (< 900px)
  const [activeMobileTab, setActiveMobileTab] = useState('catalog'); // 'catalog' | 'cart'

  const isDark = themeMode === 'dark';

  // Dynamic Theme Palette
  const colors = {
    bgApp: isDark ? '#0F172A' : '#F8FAFC',
    bgCard: isDark ? '#1E293B' : '#FFFFFF',
    bgHeader: isDark ? '#1E293B' : '#FFFFFF',
    bgInput: isDark ? '#0F172A' : '#F1F5F9',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderActive: '#F97316',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    accentOrange: '#F97316',
    accentEmerald: '#10B981',
    accentSky: isDark ? '#38BDF8' : '#0284C7',
    tableHeadBg: isDark ? '#0F172A' : '#F1F5F9',
    rowHoverBg: isDark ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.06)',
  };

  // Data states
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  // Cart & Order Options
  const [localCart, localSetCart] = useState([]);
  const cart = sharedCart !== undefined ? sharedCart : localCart;
  const setCart = sharedSetCart !== undefined ? sharedSetCart : localSetCart;

  const [selectedCartIndex, setSelectedCartIndex] = useState(0);

  const [localDiscountType, localSetDiscountType] = useState('percentage');
  const discountType = sharedDiscountType !== undefined ? sharedDiscountType : localDiscountType;
  const setDiscountType = sharedSetDiscountType !== undefined ? sharedSetDiscountType : localSetDiscountType;

  const [localDiscountValue, localSetDiscountValue] = useState('0');
  const discountValue = sharedDiscountValue !== undefined ? sharedDiscountValue : localDiscountValue;
  const setDiscountValue = sharedSetDiscountValue !== undefined ? sharedSetDiscountValue : localSetDiscountValue;

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Modals & Overlay Visibility
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState(null);
  const [editingCartIndex, setEditingCartIndex] = useState(null);
  const [cartQtyModalOpen, setCartQtyModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const cartTableBodyRef = useRef(null);

  const [mobileCartSheetOpen, setMobileCartSheetOpen] = useState(false);
  const [mobileSidebarDrawerOpen, setMobileSidebarDrawerOpen] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);

  // Responsive Window Width Tracker
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

  // Auto-scroll selected cart row into view when selectedCartIndex changes
  useEffect(() => {
    if (cartTableBodyRef.current && selectedCartIndex >= 0) {
      const row = cartTableBodyRef.current.children[selectedCartIndex];
      if (row && typeof row.scrollIntoView === 'function') {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCartIndex]);

  // AudioContext sound helpers for barcode feedback
  const audioCtxRef = useRef(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return audioCtxRef.current;
  };
  const playBeep = (freq = 880, duration = 80, type = 'sine', gain = 0.4, delay = 0) => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration / 1000);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration / 1000 + 0.05);
    } catch (e) {}
  };
  const playBarcodeSuccess = () => { playBeep(1200, 60, 'square', 0.3, 0); playBeep(1600, 100, 'sine', 0.3, 0.07); };
  const playBarcodeError = () => { playBeep(300, 120, 'sawtooth', 0.3, 0); playBeep(220, 120, 'sawtooth', 0.3, 0.14); };

  // POS Quick Edit States
  const [quickEditProduct, setQuickEditProduct] = useState(null);
  const [quickEditPrice, setQuickEditPrice] = useState('');
  const [quickEditStock, setQuickEditStock] = useState('');
  const [quickEditError, setQuickEditError] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  // Receipt Settings & Place of Supply (Tax Type)
  const [localReceiptSettings, localSetReceiptSettings] = useState(null);
  const receiptSettings = sharedReceiptSettings !== undefined ? sharedReceiptSettings : localReceiptSettings;
  const setReceiptSettings = sharedSetReceiptSettings !== undefined ? sharedSetReceiptSettings : localSetReceiptSettings;

  const [localTaxType, localSetTaxType] = useState('intra');
  const taxType = sharedTaxType !== undefined ? sharedTaxType : localTaxType;
  const setTaxType = sharedSetTaxType !== undefined ? sharedSetTaxType : localSetTaxType;

  // Payment State
  const [localPaymentMode, localSetPaymentMode] = useState('cash');
  const paymentMode = sharedPaymentMode !== undefined ? sharedPaymentMode : localPaymentMode;
  const setPaymentMode = sharedSetPaymentMode !== undefined ? sharedSetPaymentMode : localSetPaymentMode;

  const [cashReceived, setCashReceived] = useState('');
  const [printersList, setPrintersList] = useState([]);
  const [printStatusToast, setPrintStatusToast] = useState(null);

  // Live Network & Auto-Sync State Tracker
  const [netStatus, setNetStatus] = useState(propNetStatus || {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false
  });

  useEffect(() => {
    if (propNetStatus) {
      setNetStatus(propNetStatus);
    }
  }, [propNetStatus]);

  useEffect(() => {
    if (token && !propNetStatus) {
      SyncService.startAutoSync(token, (st) => setNetStatus(st));
    }
  }, [token, propNetStatus]);

  // Search input DOM ref for automatic focus management
  const searchInputRef = useRef(null);

  // Resizable Sale Cart Panel Width state with localStorage persistence
  const [cartPanelWidth, setCartPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('ARISO_POS_CART_WIDTH');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 900) {
          return parsed;
        }
      }
    } catch (e) {}
    return 420;
  });

  const [isResizingCart, setIsResizingCart] = useState(false);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(420);

  const startCartResize = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizingCart(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = cartPanelWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [cartPanelWidth]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!isResizingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const delta = startXRef.current - clientX;
      const minW = 280;
      const maxW = Math.max(380, Math.min(850, window.innerWidth - 320));
      const newWidth = Math.min(maxW, Math.max(minW, startWidthRef.current + delta));
      setCartPanelWidth(newWidth);
    };

    const handleEnd = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizingCart(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        setCartPanelWidth((currentW) => {
          try {
            localStorage.setItem('ARISO_POS_CART_WIDTH', currentW.toString());
          } catch (e) {}
          return currentW;
        });
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const autoFocusSearch = useCallback(() => {
    const triggerFocus = () => {
      if (searchInputRef.current) {
        // Do not steal focus if user is actively interacting with another input/textarea
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          searchInputRef.current.focus();
        } else if (document.activeElement === searchInputRef.current) {
          // Already active
        } else if (document.activeElement?.classList?.contains('pos-search-input')) {
          searchInputRef.current.focus();
        }
      }
    };

    // Staggered multi-stage ticks to ensure focus lands after React render cycles & DOM attachment
    requestAnimationFrame(triggerFocus);
    setTimeout(triggerFocus, 40);
    setTimeout(triggerFocus, 150);
    setTimeout(triggerFocus, 350);
    setTimeout(triggerFocus, 600);
  }, []);

  useEffect(() => {
    loadData();
    autoFocusSearch();

    const handleWindowFocus = () => {
      autoFocusSearch();
    };

    window.addEventListener('focus', handleWindowFocus);

    if (typeof window !== 'undefined' && window.electron?.onGatewayJobStatus) {
      window.electron.onGatewayJobStatus((data) => {
        if (data.status === 'SUCCESS') {
          setPrintStatusToast({ type: 'success', message: `Gateway: ${data.title} printed successfully!` });
          setTimeout(() => setPrintStatusToast(null), 4000);
        } else if (data.status === 'FAILED') {
          setPrintStatusToast({ type: 'error', message: `Gateway Print Failed: ${data.title} (${data.error || 'Timeout'})` });
        }
      });
    }

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [token, autoFocusSearch]);

  const loadData = async () => {
    // 1. Instant Local Offline Load from Dexie IndexedDB (< 50ms)
    try {
      const [localCats, localItems, localReceipt, localPrinters] = await Promise.all([
        db.categories.toArray().catch(() => []),
        db.menu_items.toArray().catch(() => []),
        db.settings.get('receipt_settings').catch(() => null),
        db.printers.toArray().catch(() => [])
      ]);

      if (localCats && localCats.length > 0) setCategories(localCats);
      if (localItems && localItems.length > 0) setMenuItems(localItems);
      if (localReceipt?.value) setReceiptSettings(localReceipt.value);
      if (localPrinters && localPrinters.length > 0) setPrintersList(localPrinters);

      // If cached data is available, show the POS UI immediately without waiting
      if ((localCats && localCats.length > 0) || (localItems && localItems.length > 0)) {
        setLoading(false);
      }
    } catch (e) {
      console.warn('[POS] IndexedDB instant load:', e);
    }

    // 2. Background Stale-While-Revalidate if Online
    try {
      const [cats, menu, receiptData, prnData] = await Promise.allSettled([
        fetchMobileCategories(token),
        fetchMobileMenu(token),
        fetchReceiptSettings(token),
        fetchPrinters(token)
      ]);

      if (cats.status === 'fulfilled' && cats.value) {
        const catList = Array.isArray(cats.value) ? cats.value : (cats.value?.categories || []);
        if (catList.length > 0) setCategories(catList);
      }

      if (menu.status === 'fulfilled' && menu.value) {
        const itemList = Array.isArray(menu.value) ? menu.value : (menu.value?.items || []);
        if (itemList.length > 0) setMenuItems(itemList);
      }

      if (receiptData.status === 'fulfilled' && receiptData.value) {
        setReceiptSettings(receiptData.value);
      }

      let loadedPrns = [];
      if (prnData.status === 'fulfilled' && Array.isArray(prnData.value) && prnData.value.length > 0) {
        loadedPrns = prnData.value;
      } else {
        loadedPrns = await db.printers.toArray().catch(() => []);
      }

      // Auto-detect Windows physical printers if none configured
      if (loadedPrns.length === 0 && window.electron && window.electron.getPrinters) {
        try {
          const sysList = await window.electron.getPrinters();
          if (Array.isArray(sysList) && sysList.length > 0) {
            const virtualKeywords = ['microsoft print to pdf', 'onenote', 'xps', 'fax', 'pdf', 'nul:'];

            const physicalPrinters = sysList.filter(p => {
              const n = (p.name || '').toLowerCase();
              const port = (p.portName || '').toLowerCase();
              const drv = (p.driverName || '').toLowerCase();
              const isVirtual = virtualKeywords.some(v => n.includes(v) || port.includes(v) || drv.includes(v));
              return !isVirtual && !p.workOffline;
            });

            const bestSys = physicalPrinters.find(p => p.isDefault) ||
                            physicalPrinters[0] ||
                            sysList.find(p => p.isDefault) ||
                            sysList[0];

            if (bestSys && bestSys.name) {
              loadedPrns = [{
                id: 'sys-default',
                name: bestSys.name,
                type: 'usb',
                role: 'both',
                paper_width: 80,
                is_default_receipt: 1,
                is_default_kot: 1
              }];
            }
          }
        } catch (sysErr) {
          console.warn('[POS] Auto-detected printer query failed:', sysErr);
        }
      }

      setPrintersList(loadedPrns);
    } catch (err) {
      console.warn('[Desktop POS] Error during online background refresh:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by category and search term (Name, Barcode, SKU, Description)
  const queryLower = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    const list = menuItems.filter((p) => {
      if (selectedCategory && String(p.category_id) !== String(selectedCategory.id)) {
        return false;
      }
      if (!queryLower) return true;
      const matchName = (p.name || '').toLowerCase().includes(queryLower);
      const matchBarcode = (p.barcode || '').toLowerCase().includes(queryLower);
      const matchSku = (p.sku || '').toLowerCase().includes(queryLower);
      const matchCat = (p.category_name || '').toLowerCase().includes(queryLower);
      const matchDesc = (p.description || '').toLowerCase().includes(queryLower);
      return matchName || matchBarcode || matchSku || matchCat || matchDesc;
    });

    // Alphabetical sort by Dish Name by default
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [menuItems, selectedCategory, queryLower]);

  const isProductWeightBased = (p) => {
    if (!p) return false;
    if (p.is_weight_based === 1 || p.is_weight_based === true || p.is_weight_based === '1') return true;
    if (p.is_weight_based === 0 || p.is_weight_based === false || p.is_weight_based === '0') return false;
    const u = (p.base_unit || p.unit || '').toLowerCase();
    return ['kg', 'gram', 'gm', 'g', 'litre', 'ltr', 'ml'].includes(u);
  };

  // Enter Key - Quantity Popup Setting Resolver (Default: ON)
  const isEnterKeyQtyPopupEnabled = receiptSettings?.enter_key_qty_popup !== undefined
    ? (Number(receiptSettings.enter_key_qty_popup) === 1 || receiptSettings.enter_key_qty_popup === true || receiptSettings.enter_key_qty_popup === '1')
    : true;

  // Dedicated Clear All Items from Cart Handler (Reserved for Esc key & Clear Button)
  const handleClearCart = useCallback(() => {
    setCart([]);
    setSelectedCartIndex(0);
    setDiscountValue('0');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCashReceived('');
    setCheckoutVisible(false);
    setWeightModalVisible(false);
    setCartQtyModalOpen(false);
    setEditingCartItem(null);
    setEditingCartIndex(null);
    setKeyboardHelpVisible(false);
    setLanguageModalVisible(false);
    setQuickEditProduct(null);
    setSearchQuery('');
    autoFocusSearch();
  }, [setCart, setDiscountValue]);

  // Product Selection & Cart Actions
  const handleSelectProduct = (product, fromEnterKey = false) => {
    if (!product) return;
    if (isProductWeightBased(product)) {
      setSelectedWeightProduct(product);
      setEditingCartIndex(null);
      setWeightModalVisible(true);
    } else {
      if (fromEnterKey && isEnterKeyQtyPopupEnabled) {
        // Open quantity popup for the selected/scanned item
        const existingIdx = cart.findIndex(
          (item) => item.product_id === (product.id || product.menu_item_id) && !item.is_weight_based
        );
        if (existingIdx > -1) {
          setSelectedCartIndex(existingIdx);
          setEditingCartIndex(existingIdx);
          setEditingCartItem(cart[existingIdx]);
        } else {
          setSelectedCartIndex(cart.length);
          setEditingCartIndex(null);
          setEditingCartItem({
            ...product,
            product_id: product.id || product.menu_item_id,
            quantity: 1
          });
        }
        setCartQtyModalOpen(true);
      } else {
        addPieceItemToCart(product);
        setSearchQuery('');
        autoFocusSearch();
      }
    }
  };

  const addPieceItemToCart = (product) => {
    const price = parseFloat(product.price || product.selling_price || 0);
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.product_id === (product.id || product.menu_item_id) && !item.is_weight_based
      );

      if (existingIdx > -1) {
        const updated = [...prevCart];
        const item = updated[existingIdx];
        const newQty = item.quantity + 1;
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          total_price: (newQty * price).toFixed(2)
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product_id: product.id || product.menu_item_id,
            name: product.name,
            sku: product.sku || '',
            barcode: product.barcode || '',
            price: price,
            unit_price: price,
            quantity: 1,
            unit: product.base_unit || product.unit || 'pcs',
            is_weight_based: false,
            total_price: price.toFixed(2),
            gst_rate: parseFloat(product.gst_rate !== undefined && product.gst_rate !== null ? product.gst_rate : 5),
            notes: ''
          }
        ];
      }
    });
  };

  const handleWeightConfirm = (weightData) => {
    const { product, weightInKg, displayWeight, unit, pricePerBaseUnit, calculatedTotal } = weightData;

    if (editingCartIndex !== null) {
      setCart((prevCart) => {
        const updated = [...prevCart];
        updated[editingCartIndex] = {
          ...updated[editingCartIndex],
          item_weight: weightInKg,
          displayWeight: displayWeight,
          weight_unit: unit,
          unit: unit,
          base_unit_price: pricePerBaseUnit,
          price: pricePerBaseUnit,
          total_price: calculatedTotal.toFixed(2)
        };
        return updated;
      });
    } else {
      setCart((prevCart) => [
        ...prevCart,
        {
          product_id: product.id || product.menu_item_id,
          name: product.name,
          sku: product.sku || '',
          barcode: product.barcode || '',
          price: pricePerBaseUnit,
          unit_price: pricePerBaseUnit,
          base_unit_price: pricePerBaseUnit,
          item_weight: weightInKg,
          displayWeight: displayWeight,
          weight_unit: unit,
          unit: unit,
          quantity: 1,
          is_weight_based: true,
          total_price: calculatedTotal.toFixed(2),
          gst_rate: parseFloat(product.gst_rate !== undefined && product.gst_rate !== null ? product.gst_rate : 5),
          notes: ''
        }
      ]);
    }

    setWeightModalVisible(false);
    setSelectedWeightProduct(null);
    setEditingCartIndex(null);
    setSearchQuery('');
    autoFocusSearch();
  };

  // Cart Controls - Handles saving quantity for existing or new items
  const handleSaveCartQty = (newQty) => {
    if (editingCartIndex !== null && editingCartIndex >= 0 && editingCartIndex < cart.length) {
      setCart((prevCart) => {
        const updated = [...prevCart];
        const item = updated[editingCartIndex];
        const unitPrice = parseFloat(item.price || item.unit_price || 0);
        updated[editingCartIndex] = {
          ...item,
          quantity: newQty,
          total_price: (newQty * unitPrice).toFixed(2)
        };
        return updated;
      });
    } else if (editingCartItem) {
      const product = editingCartItem;
      const price = parseFloat(product.price || product.selling_price || product.unit_price || 0);
      const prodId = product.id || product.menu_item_id || product.product_id;

      setCart((prevCart) => {
        const existingIdx = prevCart.findIndex(
          (item) => item.product_id === prodId && !item.is_weight_based
        );

        if (existingIdx > -1) {
          const updated = [...prevCart];
          const item = updated[existingIdx];
          updated[existingIdx] = {
            ...item,
            quantity: newQty,
            total_price: (newQty * price).toFixed(2)
          };
          setSelectedCartIndex(existingIdx);
          return updated;
        } else {
          const newItem = {
            product_id: prodId,
            name: product.name,
            sku: product.sku || '',
            barcode: product.barcode || '',
            price: price,
            unit_price: price,
            quantity: newQty,
            unit: product.base_unit || product.unit || 'pcs',
            is_weight_based: false,
            total_price: (newQty * price).toFixed(2),
            gst_rate: parseFloat(product.gst_rate !== undefined && product.gst_rate !== null ? product.gst_rate : 5),
            notes: ''
          };
          const nextCart = [...prevCart, newItem];
          setSelectedCartIndex(nextCart.length - 1);
          return nextCart;
        }
      });
    }
    setCartQtyModalOpen(false);
    setEditingCartItem(null);
    setEditingCartIndex(null);
    setSearchQuery('');
    autoFocusSearch();
  };

  const openCartItemEdit = (index) => {
    const idx = index !== undefined && index !== null ? index : selectedCartIndex;
    const item = cart[idx];
    if (!item) return;
    setSelectedCartIndex(idx);
    setEditingCartIndex(idx);
    if (item.is_weight_based) {
      setSelectedWeightProduct({
        id: item.product_id,
        name: item.name,
        price: item.base_unit_price || item.price,
        selling_price: item.base_unit_price || item.price,
        unit: item.weight_unit || item.unit || 'kg',
        base_unit: item.weight_unit || item.unit || 'kg',
        is_weight_based: true,
        gst_rate: item.gst_rate
      });
      setWeightModalVisible(true);
    } else {
      setEditingCartItem(item);
      setCartQtyModalOpen(true);
    }
  };

  const updateCartQty = (index, delta) => {
    setCart((prevCart) => {
      if (!prevCart || index < 0 || index >= prevCart.length) return prevCart;
      const item = prevCart[index];
      if (!item || item.is_weight_based) return prevCart;

      const currentQty = parseInt(item.quantity, 10) || 1;
      const newQty = currentQty + delta;
      const unitPrice = parseFloat(item.price !== undefined && item.price !== null ? item.price : (item.unit_price || item.selling_price || 0));

      if (newQty <= 0) {
        const nextCart = prevCart.filter((_, i) => i !== index);
        const nextIdx = Math.max(0, Math.min(index, nextCart.length - 1));
        setSelectedCartIndex(nextIdx);
        return nextCart;
      }

      const updated = [...prevCart];
      updated[index] = {
        ...item,
        quantity: newQty,
        total_price: (newQty * unitPrice).toFixed(2)
      };
      return updated;
    });
  };

  const removeCartItem = (index) => {
    setCart((prevCart) => {
      const nextCart = prevCart.filter((_, i) => i !== index);
      const nextIdx = Math.max(0, Math.min(index, nextCart.length - 1));
      setSelectedCartIndex(nextIdx);
      return nextCart;
    });
  };

  // Global USB Barcode Scanner Keyboard Emulation Interceptor
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    let keyTimes = [];

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      keyTimes.push(diff);
      if (keyTimes.length > 4) {
        keyTimes.shift();
      }

      const avgSpeed = keyTimes.reduce((a, b) => a + b, 0) / keyTimes.length;
      const isFast = avgSpeed < 35;

      if (e.key === 'Enter') {
        if (buffer.length >= 3 && isFast) {
          e.preventDefault();
          e.stopPropagation();

          const scannedCode = buffer.trim().toLowerCase();
          console.log('[Global Scanner] Scanned barcode:', scannedCode);

          const exactMatch = menuItems.find(
            (p) => (p.barcode || '').toLowerCase() === scannedCode || 
                   (p.sku || '').toLowerCase() === scannedCode
          );

          if (exactMatch) {
            handleSelectProduct(exactMatch, true);
            playBarcodeSuccess();
          } else {
            playBarcodeError();
            alert(`Product not found for barcode: "${buffer}"`);
          }
        }
        buffer = '';
        keyTimes = [];
      } else if (e.key.length === 1) {
        if (isFast || (buffer.length > 0 && diff < 35)) {
          e.preventDefault();
          e.stopPropagation();
          buffer += e.key;
        } else {
          buffer = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [menuItems, handleSelectProduct]);

  // USB Barcode Scanner & Search Input Enter Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!queryLower) return;

    const exactMatch = menuItems.find(
      (p) => (p.barcode || '').toLowerCase() === queryLower || (p.sku || '').toLowerCase() === queryLower
    );

    if (exactMatch) {
      handleSelectProduct(exactMatch, true);
    } else if (filteredProducts.length > 0) {
      handleSelectProduct(filteredProducts[selectedProductIndex] || filteredProducts[0], true);
    }
  };

  // Live Camera Barcode Scanner Continuous Handler
  const handleCameraBarcodeScan = (scannedCode) => {
    if (!scannedCode) return { success: false, message: 'No barcode detected' };
    const clean = scannedCode.trim().toLowerCase();
    const matched = menuItems.find(
      (p) => (p.barcode || '').toLowerCase() === clean || (p.sku || '').toLowerCase() === clean
    );
    if (matched) {
      handleSelectProduct(matched, true);
      playBarcodeSuccess();
      return { success: true, message: `Added ${matched.name}` };
    }
    playBarcodeError();
    return { success: false, message: `No item found for barcode "${scannedCode}"` };
  };

  // POS Quick Edit Handlers
  const longPressTimer = useRef(null);
  const isLongPressedRef = useRef(false);

  const openQuickEdit = (product) => {
    setQuickEditProduct(product);
    setQuickEditPrice(product.price !== undefined ? product.price.toString() : '');
    setQuickEditStock(product.current_stock !== undefined ? product.current_stock.toString() : '0');
    setQuickEditError('');
  };

  const handleTouchStart = (product) => {
    isLongPressedRef.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      isLongPressedRef.current = true;
      openQuickEdit(product);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleProductClick = (product, e) => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }
    handleSelectProduct(product);
  };

  const handleProductContextMenu = (product, e) => {
    e.preventDefault();
    openQuickEdit(product);
  };

  const handleSaveQuickEdit = async () => {
    const priceVal = parseFloat(quickEditPrice);
    const stockVal = parseFloat(quickEditStock);

    if (isNaN(priceVal) || priceVal < 0) {
      setQuickEditError('Price must be greater than or equal to 0.');
      return;
    }
    if (isNaN(stockVal) || stockVal < 0) {
      setQuickEditError('Stock quantity must be greater than or equal to 0.');
      return;
    }

    setSavingQuickEdit(true);
    setQuickEditError('');
    try {
      const res = await apiFetch(`/api/menu/${quickEditProduct.id}`, {
        method: 'PUT',
        body: {
          price: priceVal,
          current_stock: stockVal
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item.');

      // Update locally immediately
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === quickEditProduct.id
            ? { ...item, price: priceVal, current_stock: stockVal }
            : item
        )
      );

      alert(`🎉 Product "${quickEditProduct.name}" updated successfully.`);
      setQuickEditProduct(null);
    } catch (err) {
      setQuickEditError(err.message);
    } finally {
      setSavingQuickEdit(false);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + parseFloat(item.total_price || 0), 0);
  const numDiscVal = parseFloat(discountValue || 0);
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (Math.min(numDiscVal, 100) / 100);
  } else {
    discountAmount = Math.min(numDiscVal, subtotal);
  }

  const isGstEnabled = receiptSettings ? (receiptSettings.gst_enabled === 1 || receiptSettings.gst_enabled === true || receiptSettings.gst_enabled === 'true') : true;
  const gstMode = receiptSettings?.gst_mode || 'excluded';

  let calculatedTax = 0;
  const cartWithTax = cart.map(item => {
    const itemTotalPrice = parseFloat(item.total_price || 0);
    const itemGstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);
    
    // Proportional discount distribution
    const itemDiscountShare = subtotal > 0 ? (itemTotalPrice / subtotal) * discountAmount : 0;
    const itemTaxableAmount = Math.max(0, itemTotalPrice - itemDiscountShare);
    
    let itemTaxAmount = 0;
    if (isGstEnabled && itemGstRate > 0) {
      if (gstMode === 'included') {
        itemTaxAmount = itemTaxableAmount - (itemTaxableAmount / (1 + (itemGstRate / 100)));
      } else {
        itemTaxAmount = itemTaxableAmount * (itemGstRate / 100);
      }
    }
    
    calculatedTax += itemTaxAmount;
    
    return {
      ...item,
      discount_amount: itemDiscountShare,
      tax_amount: itemTaxAmount
    };
  });

  const taxAmount = parseFloat(calculatedTax.toFixed(2));
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const grandTotal = gstMode === 'included' 
    ? taxableAmount 
    : Math.max(0, taxableAmount + taxAmount);

  const numericCashReceived = parseFloat(cashReceived || '0');
  const changeToReturn = Math.max(0, numericCashReceived - grandTotal);
  const totalCartCount = cart.reduce((acc, item) => acc + (item.is_weight_based ? 1 : (parseInt(item.quantity, 10) || 1)), 0);

  // Complete Sale & Execute Configured Print Stage Workflow
  const handleCompleteSale = async (overridePaymentMode = null, overrideWorkflow = null) => {
    if (submittingSale) return; // Prevent duplicate clicks/re-entrancy
    if (cart.length === 0) {
      return;
    }

    const effectivePaymentMode = overridePaymentMode || paymentMode || 'cash';
    let effectiveCashReceived = numericCashReceived;
    if (effectivePaymentMode === 'cash' && (effectiveCashReceived <= 0 || effectiveCashReceived < grandTotal)) {
      effectiveCashReceived = grandTotal;
    }

    setPaymentMode(effectivePaymentMode);
    setSubmittingSale(true);

    const orderPayload = {
      items: cartWithTax.map((i) => ({
        menu_item_id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity || 1,
        item_weight: i.item_weight || null,
        weight_unit: i.weight_unit || i.unit || 'pcs',
        is_weight_based: i.is_weight_based ? 1 : 0,
        total_price: i.total_price,
        gst_rate: i.gst_rate,
        tax_amount: parseFloat(i.tax_amount || 0).toFixed(2),
        discount_amount: parseFloat(i.discount_amount || 0).toFixed(2),
        notes: i.notes || ''
      })),
      subtotal: subtotal.toFixed(2),
      discount_amount: discountAmount.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total_amount: grandTotal.toFixed(2),
      payment_mode: effectivePaymentMode,
      cashier_name: user?.name || 'Desktop Cashier',
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      customer_address: customerAddress,
      tax_type: taxType
    };

    try {
      // Step 1: Save Sale Order to Database or Offline Queue
      const orderRes = await createOrder(token, orderPayload);
      const invoiceNo = orderRes?.unique_order_number || orderRes?.orderNumber || orderRes?.id || `RET-${Date.now().toString().slice(-6)}`;

      // Update local product stock in React state immediately
      setMenuItems((prevItems) => {
        return prevItems.map((prod) => {
          const matchedItem = cartWithTax.find(c => (c.product_id || c.id || c.menu_item_id) === (prod.id || prod.menu_item_id));
          if (matchedItem && prod.current_stock !== null && prod.current_stock !== undefined) {
            const deduction = matchedItem.is_weight_based ? (parseFloat(matchedItem.item_weight) || 1) : (matchedItem.quantity || 1);
            const newStock = Math.max(0, parseFloat(prod.current_stock) - deduction);
            return { ...prod, current_stock: newStock };
          }
          return prod;
        });
      });

      // Step 2: Determine and Execute Print Stage Workflow (non-blocking)
      const workflowAction = overrideWorkflow || receiptSettings?.print_stage2_mode || 'print_receipt_only';
      try {
        await executePrintWorkflow(invoiceNo, orderPayload, effectivePaymentMode, cartWithTax, workflowAction);
      } catch (printErr) {
        console.error('[Print Workflow Warning]', printErr);
      }

      // Step 3: Clear Cart & Reset UI for next sale
      setCart([]);
      setDiscountValue('0');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCheckoutVisible(false);
      setCashReceived('');
      setActiveMobileTab('catalog');
    } catch (err) {
      console.error('[Complete Sale Error]', err);
      alert('Error completing sale: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingSale(false);
      autoFocusSearch();
    }
  };

  const executePrintWorkflow = async (invoiceNo, orderPayload, effectivePaymentMode, cartItems, workflowAction) => {
    const action = (workflowAction || 'print_receipt_only').toLowerCase();
    if (action === 'save_only') {
      return;
    }

    const orderData = {
      unique_order_number: invoiceNo,
      subtotal: parseFloat(orderPayload.subtotal || 0).toFixed(2),
      discount_amount: parseFloat(orderPayload.discount_amount || 0).toFixed(2),
      tax_amount: parseFloat(orderPayload.tax_amount || 0).toFixed(2),
      total_amount: parseFloat(orderPayload.total_amount || 0).toFixed(2),
      payment_mode: effectivePaymentMode,
      cashier_name: orderPayload.cashier_name,
      customer_name: orderPayload.customer_name,
      created_at: new Date().toISOString(),
      tax_type: taxType
    };

    // Find default receipt & KOT printers
    const defaultReceiptPrn = printersList.find(p => p.is_default_receipt === 1 || p.is_default_receipt === true) ||
                              printersList.find(p => p.role === 'receipt' || p.role === 'both') ||
                              printersList[0] || null;

    const defaultKotPrn = printersList.find(p => p.is_default_kot === 1 || p.is_default_kot === true) ||
                          printersList.find(p => p.role === 'kitchen' || p.role === 'both') ||
                          defaultReceiptPrn || null;

    const shouldPrintReceipt = action !== 'print_kot_only';
    const shouldPrintKot = action === 'print_kot_only' || action === 'print_kot_receipt';

    setPrintStatusToast({ type: 'printing', message: 'Printing thermal receipt...' });

    let printErrors = [];

    // 1. Dispatch Receipt
    if (shouldPrintReceipt) {
      try {
        if (window.electron) {
          const isLan = (defaultReceiptPrn?.type === 'lan' || defaultReceiptPrn?.type === 'network') && !!defaultReceiptPrn?.ip_address;
          if (isLan) {
            try {
              const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              await window.electron.printLanRaw(defaultReceiptPrn.ip_address, defaultReceiptPrn.port || 9100, base64Payload);
            } catch (lanErr) {
              console.warn('[POS Receipt LAN Failover] LAN socket failed, attempting Windows Spooler raw fallback...', lanErr.message);
              const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              await window.electron.printWindowsRaw(defaultReceiptPrn?.name || '', base64Payload);
            }
          } else {
            const targetPrinterName = defaultReceiptPrn?.name || receiptSettings?.default_printer_name || '';
            const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
            const base64Payload = safeUtf8ToBase64(rawEscPos);
            try {
              // Primary method for USB Thermal Receipt Printers: Direct RAW ESC/POS Spooling with Hardware Verification
              await window.electron.printWindowsRaw(targetPrinterName, base64Payload);
            } catch (rawErr) {
              console.warn('[POS USB RAW Print Failover] RAW ESC/POS spooling failed, falling back to silent HTML rendering...', rawErr?.message);
              const htmlReceipt = generateLocalHtmlReceipt(orderData, cartItems, user || {}, receiptSettings);
              await window.electron.printSystemSilent(htmlReceipt, targetPrinterName);
            }
          }
        } else {
          // Browser Web Fallback
          const htmlReceipt = generateLocalHtmlReceipt(orderData, cartItems, user || {}, receiptSettings);
          const printWin = window.open('', '_blank');
          if (printWin) {
            printWin.document.write(htmlReceipt);
            printWin.document.close();
            printWin.focus();
            printWin.print();
            printWin.close();
          }
        }
      } catch (receiptErr) {
        console.error('[Receipt Print Error]', receiptErr);
        printErrors.push(`Receipt Printer (${defaultReceiptPrn?.name || defaultReceiptPrn?.ip_address || 'Default'}): ${receiptErr.message}`);
      }
    }

    // 2. Dispatch KOT
    if (shouldPrintKot) {
      try {
        if (window.electron) {
          const isLan = (defaultKotPrn?.type === 'lan' || defaultKotPrn?.type === 'network') && !!defaultKotPrn?.ip_address;
          if (isLan) {
            try {
              const rawEscPos = generateLocalEscPosKot(orderData, cartItems, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              await window.electron.printLanRaw(defaultKotPrn.ip_address, defaultKotPrn.port || 9100, base64Payload);
            } catch (lanKotErr) {
              console.warn('[POS KOT LAN Failover] LAN socket failed, attempting Windows Spooler raw fallback...', lanKotErr.message);
              const rawEscPos = generateLocalEscPosKot(orderData, cartItems, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              await window.electron.printWindowsRaw(defaultKotPrn?.name || '', base64Payload);
            }
          } else {
            const targetPrinterName = defaultKotPrn?.name || receiptSettings?.default_printer_name || '';
            const rawEscPos = generateLocalEscPosKot(orderData, cartItems, receiptSettings);
            const base64Payload = safeUtf8ToBase64(rawEscPos);
            try {
              // Primary method for USB Thermal KOT Printers: Direct RAW ESC/POS Spooling with Hardware Verification
              await window.electron.printWindowsRaw(targetPrinterName, base64Payload);
            } catch (rawErr) {
              console.warn('[POS KOT USB RAW Print Failover] RAW ESC/POS spooling failed, falling back to silent HTML rendering...', rawErr?.message);
              const htmlKot = generateLocalHtmlKot(orderData, cartItems, receiptSettings);
              await window.electron.printSystemSilent(htmlKot, targetPrinterName);
            }
          }
        }
      } catch (kotErr) {
        console.error('[KOT Print Error]', kotErr);
        printErrors.push(`KOT Printer (${defaultKotPrn?.name || defaultKotPrn?.ip_address || 'Default'}): ${kotErr.message}`);
      }
    }

    if (printErrors.length > 0) {
      setPrintStatusToast({
        type: 'error',
        message: `Printing Issue: ${printErrors.join(' | ')}`,
        retryFn: () => executePrintWorkflow(invoiceNo, orderPayload, effectivePaymentMode, cartItems, workflowAction)
      });
    } else {
      setPrintStatusToast({
        type: 'success',
        message: `Printed successfully (${shouldPrintReceipt && shouldPrintKot ? 'Receipt + KOT' : shouldPrintReceipt ? 'Receipt' : 'KOT'})`
      });
      setTimeout(() => setPrintStatusToast(null), 4000);
    }
  };

  const isAnyModalOpen = cartQtyModalOpen ||
                         weightModalVisible ||
                         checkoutVisible ||
                         keyboardHelpVisible ||
                         languageModalVisible ||
                         barcodeScannerOpen ||
                         Boolean(quickEditProduct);

  // Keyboard Shortcuts Registration
  useKeyboardShortcuts({
    'F2': (e) => {
      e?.preventDefault();
      autoFocusSearch();
    },
    'Ctrl+F': (e) => {
      e?.preventDefault();
      autoFocusSearch();
    },
    'Ctrl+E': (e) => {
      e?.preventDefault();
      const selected = filteredProducts[selectedProductIndex];
      if (selected) {
        openQuickEdit(selected);
      }
    },
    'F3': (e) => {
      e?.preventDefault();
      if (cart.length > 0) setSelectedCartIndex(0);
    },
    'F5': (e) => {
      e?.preventDefault();
      const selected = filteredProducts[selectedProductIndex];
      if (selected) {
        setSelectedWeightProduct(selected);
        setWeightModalVisible(true);
      }
    },
    'F6': (e) => {
      e?.preventDefault();
      const selected = filteredProducts[selectedProductIndex] || menuItems.find(p => p.is_weight_based);
      if (selected) {
        handleWeightConfirm({
          product: selected,
          weightInKg: 1.250,
          displayWeight: 1.250,
          unit: 'kg',
          pricePerBaseUnit: parseFloat(selected.price || 0),
          calculatedTotal: 1.250 * parseFloat(selected.price || 0)
        });
      }
    },
    'F8': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        setCashReceived(grandTotal.toFixed(2));
        setCheckoutVisible(true);
      }
    },
    'F9': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale('cash', 'print_receipt_only');
      }
    },
    'End': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale('cash', 'print_receipt_only');
      }
    },
    'F10': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale('upi', 'print_receipt_only');
      }
    },
    'F11': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale('card', 'print_receipt_only');
      }
    },
    'F12': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale(paymentMode || 'cash', 'print_receipt_only');
      }
    },
    'ArrowDown': (e) => {
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      e?.preventDefault();
      setSelectedCartIndex((prev) => Math.min(cart.length - 1, Math.max(0, prev + 1)));
    },
    'ArrowUp': (e) => {
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      e?.preventDefault();
      setSelectedCartIndex((prev) => Math.max(0, prev - 1));
    },
    'Enter': (e) => {
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      e?.preventDefault();
      if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        openCartItemEdit(selectedCartIndex);
      }
    },
    'Esc': (e) => {
      e?.preventDefault();
      handleClearCart();
    },
    'Delete': (e) => {
      if (isAnyModalOpen) return;
      if (searchQuery.trim().length > 0) return;
      if (cart.length > 0 && selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        e?.preventDefault();
        removeCartItem(selectedCartIndex);
      }
    },
    '+': (e) => {
      e?.preventDefault();
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        updateCartQty(selectedCartIndex, 1);
      }
    },
    '-': (e) => {
      e?.preventDefault();
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        updateCartQty(selectedCartIndex, -1);
      }
    },
    '?': (e) => setKeyboardHelpVisible((prev) => !prev),
    'Ctrl+/': (e) => setKeyboardHelpVisible((prev) => !prev),
  }, [cart, selectedCartIndex, searchQuery, isAnyModalOpen, filteredProducts, selectedProductIndex, grandTotal, paymentMode, cashReceived, submittingSale, checkoutVisible, handleClearCart]);

  const currentLangObj = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  return (
    <div style={{ ...styles.container, backgroundColor: colors.bgApp, color: colors.textPrimary }}>
      {/* Floating Thermal Print Status Toast / Banner */}
      {printStatusToast && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          zIndex: 999999,
          padding: '12px 18px',
          borderRadius: '10px',
          backgroundColor: printStatusToast.type === 'error' ? '#FEF2F2' : (printStatusToast.type === 'printing' ? '#EFF6FF' : '#ECFDF5'),
          border: `1px solid ${printStatusToast.type === 'error' ? '#F87171' : (printStatusToast.type === 'printing' ? '#93C5FD' : '#6EE7B7')}`,
          color: printStatusToast.type === 'error' ? '#991B1B' : (printStatusToast.type === 'printing' ? '#1E40AF' : '#065F46'),
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '700',
          fontSize: '13px'
        }}>
          {printStatusToast.type === 'printing' && <Printer size={16} />}
          {printStatusToast.type === 'error' && <AlertTriangle size={16} />}
          {printStatusToast.type === 'success' && <CheckCircle2 size={16} />}
          <span>{printStatusToast.message}</span>
          {printStatusToast.retryFn && (
            <button
              onClick={printStatusToast.retryFn}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              <RotateCw size={13} />
              Retry Print
            </button>
          )}
          <button
            onClick={() => setPrintStatusToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              opacity: 0.75
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* MAIN RESPONSIVE CONTENT AREA */}
      <div style={styles.mainLayout}>
        {/* CATALOG SECTION (Visible on desktop or when activeMobileTab is 'catalog') */}
        <div style={{
          ...styles.catalogSection,
          display: activeMobileTab === 'catalog' ? 'flex' : 'none'
        }} className="pos-catalog-panel">
          {/* SEARCH BAR & BARCODE INPUT */}
          <form
            style={{ ...styles.searchForm, backgroundColor: colors.bgCard, borderColor: colors.borderActive }}
            onSubmit={handleSearchSubmit}
          >
            <span style={styles.searchIcon}>🔍</span>
            <input
              ref={searchInputRef}
              autoFocus
              style={{ ...styles.searchInput, color: colors.textPrimary }}
              className="pos-search-input"
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedProductIndex(0);
              }}
            />
            {searchQuery && (
              <button style={{ ...styles.clearSearchBtn, color: colors.textSecondary }} type="button" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </form>

          {/* CONTROL BAR: Live Status | Barcode Camera | Focus | Sidebar Toggle | Density */}
          <div style={{ ...styles.controlBar, backgroundColor: colors.bgCard, borderColor: colors.borderColor }} className="pos-control-bar">
            {/* Network & Offline Sync Status Chip */}
            <button
              type="button"
              className="pos-control-pill"
              onClick={async () => {
                if (netStatus.isSyncing) return;
                setPrintStatusToast({ type: 'printing', message: '🔄 Syncing catalog & pending sales...' });
                try {
                  if (propManualSync) {
                    await propManualSync();
                  } else {
                    await SyncService.triggerManualSync(token);
                  }
                  await loadData();
                  setPrintStatusToast({ type: 'success', message: '✅ All sales & items synchronized successfully!' });
                  setTimeout(() => setPrintStatusToast(null), 3000);
                } catch (e) {
                  setPrintStatusToast({ type: 'error', message: '⚠️ Sync: ' + (e.message || 'Offline') });
                  setTimeout(() => setPrintStatusToast(null), 4000);
                }
              }}
              style={{
                ...styles.controlPill,
                backgroundColor: !netStatus.isOnline 
                  ? (isDark ? '#78350F' : '#FEF3C7') 
                  : (netStatus.pendingCount > 0 ? (isDark ? '#0C4A6E' : '#E0F2FE') : (isDark ? '#064E3B' : '#ECFDF5')),
                color: !netStatus.isOnline 
                  ? (isDark ? '#FDE68A' : '#92400E') 
                  : (netStatus.pendingCount > 0 ? (isDark ? '#BAE6FD' : '#0369A1') : (isDark ? '#A7F3D0' : '#059669')),
                borderColor: !netStatus.isOnline 
                  ? '#F59E0B' 
                  : (netStatus.pendingCount > 0 ? '#38BDF8' : '#10B981'),
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title={netStatus.isOnline ? "Online: Click to sync with server" : "Offline Mode: Sales are queued locally and will auto-sync when online"}
            >
              <span>{netStatus.isSyncing ? '🔄' : (!netStatus.isOnline ? '⚡' : '🟢')}</span>
              <span>
                {netStatus.isSyncing 
                  ? 'Syncing...' 
                  : (!netStatus.isOnline 
                      ? `Offline (${netStatus.pendingCount} pending)` 
                      : (netStatus.pendingCount > 0 ? `Sync (${netStatus.pendingCount})` : 'Online'))}
              </span>
            </button>

            {/* Live Camera Barcode Scanner Button */}
            <button
              type="button"
              className="pos-control-pill"
              style={{
                ...styles.controlPill,
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                borderColor: '#0284C7',
                fontWeight: '700',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)'
              }}
              onClick={() => setBarcodeScannerOpen(true)}
              title="Open Live Camera Barcode Scanner"
            >
              <span>📷</span> Barcode Camera
            </button>

            {/* Focus Mode Button */}
            <button
              type="button"
              className="pos-control-pill"
              style={{
                ...styles.controlPill,
                backgroundColor: focusMode ? colors.accentOrange : colors.bgInput,
                color: focusMode ? '#FFFFFF' : colors.textPrimary,
                borderColor: focusMode ? colors.accentOrange : colors.borderColor,
              }}
              onClick={toggleFocusMode}
            >
              <span>⛶</span> {focusMode ? 'Focus On' : 'Focus'}
            </button>

            {/* Category Layout Toggle (Top Pills ↔ Left Sidebar) */}
            <button
              type="button"
              className="pos-control-pill"
              style={{
                ...styles.controlPill,
                backgroundColor: categoryLayout === 'sidebar' ? colors.accentOrange : colors.bgInput,
                color: categoryLayout === 'sidebar' ? '#FFFFFF' : colors.textPrimary,
                borderColor: categoryLayout === 'sidebar' ? colors.accentOrange : colors.borderColor,
              }}
              onClick={toggleCategoryLayout}
            >
              <span>{categoryLayout === 'sidebar' ? '☰' : '☷'}</span> {categoryLayout === 'sidebar' ? 'Sidebar' : 'Top Pills'}
            </button>

            {/* 4-Option Density Control Selector */}
            <div style={{ ...styles.densityGroup, backgroundColor: colors.bgInput, borderColor: colors.borderColor }} className="pos-density-group">
              {[
                { key: 'icon', label: 'Icon' },
                { key: 'compact', label: 'Compact' },
                { key: 'standard', label: 'Standard' },
                { key: 'spacious', label: 'Spacious' },
              ].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  style={{
                    ...styles.densityBtn,
                    backgroundColor: densityMode === d.key ? colors.accentOrange : 'transparent',
                    color: densityMode === d.key ? '#FFFFFF' : colors.textSecondary,
                  }}
                  onClick={() => changeDensityMode(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* TOP CATEGORY PILLS RAIL (Visible when categoryLayout === 'horizontal' OR on Mobile) */}
          <div
            style={styles.categoryRail}
            className="pos-category-rail"
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <button
              style={{
                ...styles.catBtn,
                backgroundColor: selectedCategory === null ? colors.accentOrange : colors.bgCard,
                color: selectedCategory === null ? '#FFFFFF' : colors.textSecondary,
                borderColor: selectedCategory === null ? colors.accentOrange : colors.borderColor
              }}
              onClick={() => setSelectedCategory(null)}
            >
              {t('allProducts')} ({menuItems.length})
            </button>
            {categories.map((cat) => {
              const count = menuItems.filter(i => i.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  style={{
                    ...styles.catBtn,
                    backgroundColor: selectedCategory?.id === cat.id ? colors.accentOrange : colors.bgCard,
                    color: selectedCategory?.id === cat.id ? '#FFFFFF' : colors.textSecondary,
                    borderColor: selectedCategory?.id === cat.id ? colors.accentOrange : colors.borderColor
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.name} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
          </div>

          {/* CATALOG BODY (With optional Left Vertical Sidebar or Full-Width Grid) */}
          <div style={styles.catalogBodyLayout} className="pos-catalog-body">
            {categoryLayout === 'sidebar' && (
              <div style={{ ...styles.sidebarContainer, backgroundColor: colors.bgCard, borderColor: colors.borderColor }} className="pos-sidebar">
                <button
                  type="button"
                  style={{
                    ...styles.sidebarItem,
                    backgroundColor: selectedCategory === null ? colors.accentOrange : 'transparent',
                    color: selectedCategory === null ? '#FFFFFF' : colors.textPrimary,
                    fontWeight: selectedCategory === null ? '800' : '600',
                  }}
                  onClick={() => setSelectedCategory(null)}
                >
                  <div style={styles.sidebarItemText}>
                    <span>{t('allProducts')}</span>
                    <span style={{ ...styles.sidebarCount, color: selectedCategory === null ? '#FFFFFF' : colors.textSecondary }}>
                      {menuItems.length}
                    </span>
                  </div>
                </button>

                {categories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  const catItemCount = menuItems.filter(i => i.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      style={{
                        ...styles.sidebarItem,
                        backgroundColor: isSelected ? colors.accentOrange : 'transparent',
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        fontWeight: isSelected ? '800' : '600',
                      }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <div style={styles.sidebarItemText}>
                        <span>{cat.name}</span>
                        <span style={{ ...styles.sidebarCount, color: isSelected ? '#FFFFFF' : colors.textSecondary }}>
                          {catItemCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* PRODUCT GRID */}
            {loading ? (
              <div style={styles.loadingBox}>
                <span style={{ fontSize: '24px' }}>⌛</span>
                <p>Loading retail items...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={styles.emptyProductsBox}>
                <span style={{ fontSize: '32px' }}>🔍</span>
                <p style={{ fontWeight: '700', marginTop: '8px' }}>No products found</p>
                <p style={{ fontSize: '12px', color: colors.textSecondary }}>Try searching by name, barcode, or SKU</p>
              </div>
            ) : (
              <div
                className="pos-product-grid"
                style={{
                  ...styles.productGrid,
                  gridTemplateColumns: windowWidth < 600
                    ? (densityMode === 'icon' ? 'repeat(4, 1fr)' : densityMode === 'compact' ? 'repeat(3, 1fr)' : densityMode === 'spacious' ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)')
                    : windowWidth < 900
                    ? (densityMode === 'icon' ? 'repeat(auto-fill, minmax(110px, 1fr))' : densityMode === 'compact' ? 'repeat(auto-fill, minmax(140px, 1fr))' : densityMode === 'spacious' ? 'repeat(auto-fill, minmax(220px, 1fr))' : 'repeat(auto-fill, minmax(170px, 1fr))')
                    : (densityMode === 'icon' ? 'repeat(auto-fill, minmax(125px, 1fr))' : densityMode === 'compact' ? 'repeat(auto-fill, minmax(160px, 1fr))' : densityMode === 'spacious' ? 'repeat(auto-fill, minmax(250px, 1fr))' : 'repeat(auto-fill, minmax(190px, 1fr))')
                }}
              >
                {filteredProducts.map((product, idx) => {
                  const isWeight = isProductWeightBased(product);
                  const price = parseFloat(product.price || product.selling_price || 0);
                  const isMobile = windowWidth < 600;
                  const cardPadding = isMobile
                    ? (densityMode === 'icon' ? '4px 6px' : densityMode === 'compact' ? '6px 8px' : densityMode === 'spacious' ? '14px' : '10px')
                    : (densityMode === 'icon' ? '8px' : densityMode === 'compact' ? '10px' : densityMode === 'spacious' ? '18px' : '14px');
                  const titleFontSize = isMobile
                    ? (densityMode === 'icon' ? '10px' : densityMode === 'compact' ? '11px' : densityMode === 'spacious' ? '15px' : '13px')
                    : (densityMode === 'icon' ? '12px' : densityMode === 'compact' ? '13px' : densityMode === 'spacious' ? '16px' : '14px');

                  return (
                    <div
                      key={product.id || idx}
                      style={{
                        ...styles.productCard,
                        padding: cardPadding,
                        borderColor: colors.borderColor,
                        boxShadow: isDark ? '0 4px 6px -1px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        backgroundColor: colors.bgCard,
                      }}
                      onTouchStart={() => handleTouchStart(product)}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={(e) => handleProductContextMenu(product, e)}
                      onClick={(e) => handleProductClick(product, e)}
                    >
                      {/* Product Image Tile */}
                      {product.image_url && (
                        <img
                          src={resolveImageUrl(product.image_url)}
                          alt={product.name}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                            pointerEvents: 'none',
                          }}
                          onError={(e) => {
                            const raw = String(product.image_url || '').trim();
                            const clean = raw.startsWith('/') ? raw.slice(1) : raw;
                            if (!e.currentTarget.dataset.retried) {
                              e.currentTarget.dataset.retried = 'true';
                              e.currentTarget.src = './' + clean;
                            } else {
                              e.currentTarget.style.display = 'none';
                            }
                          }}
                        />
                      )}

                      {/* Dark gradient overlay scrim for text legibility, only if image is present */}
                      {product.image_url && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.92) 100%)',
                            zIndex: 2,
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* Card Content - Z-Indexed above the scrim */}
                      <div
                        style={{
                          zIndex: 3,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          height: '100%',
                          width: '100%',
                          flex: 1,
                        }}
                      >
                        <div style={styles.cardHeader}>
                          <span style={{ ...styles.badge, ...(isWeight ? styles.weightBadge : styles.pieceBadge) }}>
                            {isWeight ? `⚖️ ${t('weightBadge')}` : `📦 ${t('pcsBadge')}`}
                          </span>
                          {(product.barcode || product.sku) && (
                            <span style={{
                              ...styles.barcodeText,
                              color: product.image_url ? 'rgba(255,255,255,0.85)' : colors.textSecondary
                            }}>
                              #{product.sku || product.barcode}
                            </span>
                          )}
                        </div>
                        <h3 style={{
                          ...styles.cardTitle,
                          fontSize: titleFontSize,
                          color: product.image_url ? '#FFFFFF' : colors.textPrimary,
                          textShadow: product.image_url ? '0 1px 4px rgba(0,0,0,0.95)' : 'none',
                          fontWeight: '800'
                        }}>
                          {product.name}
                        </h3>
                        <div style={styles.cardFooter}>
                          <span style={{
                            ...styles.cardPrice,
                            color: product.image_url ? '#FB923C' : '#10B981',
                            textShadow: product.image_url ? '0 1px 3px rgba(0,0,0,0.9)' : 'none'
                          }}>
                            ₹{price.toFixed(2)}
                          </span>
                          <span style={{
                            ...styles.cardUnit,
                            color: product.image_url ? 'rgba(255,255,255,0.85)' : colors.textSecondary
                          }}>
                            per {isWeight ? (product.base_unit || product.unit || 'kg') : (product.base_unit || product.unit || 'pcs')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* VISIBLE DRAGGABLE VERTICAL DIVIDER (Between Product Grid and Sale Cart) */}
        {!focusMode && activeMobileTab === 'catalog' && windowWidth >= 700 && (
          <div
            onMouseDown={startCartResize}
            onTouchStart={startCartResize}
            title="Drag to resize Product Grid & Sale Cart width"
            style={{
              width: '8px',
              cursor: 'col-resize',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isResizingCart ? (colors.accentOrange || '#F97316') : colors.borderColor,
              transition: isResizingCart ? 'none' : 'background-color 0.2s ease',
              zIndex: 20,
              flexShrink: 0,
              userSelect: 'none',
              touchAction: 'none',
            }}
            className="pos-cart-resize-handle"
          >
            {/* Visual centered grab grip pill */}
            <div
              style={{
                width: '4px',
                height: isResizingCart ? '54px' : '40px',
                borderRadius: '4px',
                backgroundColor: isResizingCart ? '#FFFFFF' : (themeMode === 'dark' ? '#94A3B8' : '#64748B'),
                boxShadow: isResizingCart ? '0 0 10px rgba(249,115,22,0.9)' : '0 1px 3px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}
            />
          </div>
        )}

        {/* CART SECTION (Visible on desktop unless Focus Mode is active, or when activeMobileTab is 'cart') */}
        <div style={{
          ...styles.cartSection,
          width: windowWidth >= 700 ? `${cartPanelWidth}px` : '100%',
          minWidth: windowWidth >= 700 ? `${cartPanelWidth}px` : 'auto',
          maxWidth: windowWidth >= 700 ? `${cartPanelWidth}px` : '100%',
          backgroundColor: colors.bgCard,
          borderColor: colors.borderColor,
          display: focusMode ? 'none' : (activeMobileTab === 'cart' ? 'flex' : 'flex')
        }} className="pos-cart-panel">
          <div style={styles.cartHeader}>
            <h2 style={{ ...styles.cartTitle, color: colors.textPrimary }}>🛒 {t('cartTitle')} | Items: {cart.length} | Total Qty: {totalCartCount}</h2>
            <button style={styles.clearCartBtn} onClick={handleClearCart}>{t('clearCart')} (Esc)</button>
          </div>

          {/* CART ITEMS TABLE */}
          <div style={styles.cartTableContainer} className="pos-cart-table-container">
            {cart.length === 0 ? (
              <div style={{ ...styles.emptyCart, color: colors.textSecondary }}>
                <span style={{ fontSize: '36px' }}>🛒</span>
                <p style={{ fontWeight: '700', marginTop: '10px' }}>{t('cartEmptyTitle')}</p>
                <p style={{ fontSize: '12px' }}>{t('cartEmptySub')}</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={{ ...styles.trHead, borderColor: colors.borderColor, backgroundColor: colors.tableHeadBg }}>
                    <th style={{ ...styles.th, color: colors.textSecondary }}>{t('productHeader')}</th>
                    <th style={{ ...styles.th, color: colors.textSecondary }}>{t('qtyWeightHeader')}</th>
                    <th style={{ ...styles.th, color: colors.textSecondary }}>{t('rateHeader')}</th>
                    <th style={{ ...styles.th, color: colors.textSecondary }}>{t('totalHeader')}</th>
                    <th style={{ ...styles.th, color: colors.textSecondary }}></th>
                  </tr>
                </thead>
                <tbody ref={cartTableBodyRef}>
                  {cart.map((item, idx) => {
                    const isSelected = selectedCartIndex === idx;
                    const itemSku = (item.sku || item.barcode || products.find(p => (p.id || p.menu_item_id) === item.product_id)?.sku || products.find(p => (p.id || p.menu_item_id) === item.product_id)?.barcode || '').trim();
                    return (
                      <tr
                        key={idx}
                        style={{
                          ...styles.trBody,
                          borderColor: colors.borderColor,
                          backgroundColor: isSelected ? (themeMode === 'dark' ? '#1E3A5F' : '#EFF6FF') : 'transparent',
                          borderLeft: isSelected ? `4px solid ${colors.accentOrange || '#F97316'}` : '4px solid transparent',
                          boxShadow: isSelected ? 'inset 0 0 0 1px rgba(249, 115, 22, 0.35)' : 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease, border-left 0.15s ease'
                        }}
                        onClick={() => setSelectedCartIndex(idx)}
                        onDoubleClick={() => openCartItemEdit(idx)}
                      >
                        <td style={styles.td}>
                          <div style={{ fontWeight: '700', color: colors.textPrimary }}>{item.name}</div>
                          {isSelected && itemSku && (
                            <div style={{
                              fontSize: '10px',
                              color: themeMode === 'dark' ? '#94A3B8' : '#64748B',
                              fontFamily: 'monospace',
                              fontWeight: '600',
                              lineHeight: 1.2,
                              marginTop: '1px'
                            }}>
                              #{itemSku}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: colors.accentOrange }}>
                            {item.is_weight_based ? `⚖️ ${t('weightBadge')}` : `📦 ${t('pcsBadge')}`}
                          </div>
                        </td>
                        <td style={{ ...styles.td, color: colors.textPrimary }}>
                          {item.is_weight_based ? (
                            <span
                              style={{
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isSelected ? (themeMode === 'dark' ? '#334155' : '#DBEAFE') : 'transparent'
                              }}
                              title="Click or press Enter to edit weight"
                              onClick={(e) => { e.stopPropagation(); openCartItemEdit(idx); }}
                            >
                              {item.displayWeight || item.item_weight} {item.weight_unit || 'kg'}
                            </span>
                          ) : (
                            <div style={styles.qtyBox}>
                              <button
                                type="button"
                                style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateCartQty(idx, -1);
                                }}
                                title="Decrease Quantity (-1)"
                              >
                                -
                              </button>
                              <span
                                style={{
                                  fontWeight: '800',
                                  margin: '0 6px',
                                  cursor: 'pointer',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isSelected ? (themeMode === 'dark' ? '#334155' : '#DBEAFE') : 'transparent'
                                }}
                                title="Click or press Enter to edit quantity"
                                onClick={(e) => { e.stopPropagation(); openCartItemEdit(idx); }}
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateCartQty(idx, 1);
                                }}
                                title="Increase Quantity (+1)"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ ...styles.td, color: colors.textPrimary }}>₹{parseFloat(item.price).toFixed(2)}</td>
                        <td style={styles.tdBold}>₹{parseFloat(item.total_price).toFixed(2)}</td>
                        <td style={styles.td}>
                          <button style={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); removeCartItem(idx); }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* PERMANENT CHECKOUT SUMMARY */}
          <div style={{ ...styles.cartSummary, backgroundColor: colors.bgInput, borderColor: colors.borderColor }}>
            <div style={styles.summaryRow}>
              <span style={{ color: colors.textSecondary }}>{t('subtotal')}</span>
              <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={styles.summaryRow}>
                <span style={{ color: colors.textSecondary }}>{t('discount')}</span>
                <span style={{ color: '#EF4444', fontWeight: '700' }}>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            {taxType === 'inter' ? (
              <div style={styles.summaryRow}>
                <span style={{ color: colors.textSecondary }}>IGST</span>
                <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{taxAmount.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div style={styles.summaryRow}>
                  <span style={{ color: colors.textSecondary }}>CGST</span>
                  <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{(taxAmount / 2).toFixed(2)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={{ color: colors.textSecondary }}>SGST</span>
                  <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{(taxAmount / 2).toFixed(2)}</span>
                </div>
              </>
            )}

            <div style={{ ...styles.summaryDivider, backgroundColor: colors.borderColor }} />

            <div style={styles.grandTotalRow}>
              <span style={{ color: colors.accentSky, fontWeight: '900', fontSize: '15px' }}>{t('payableTotal')}</span>
              <span style={{ color: colors.accentEmerald, fontWeight: '900', fontSize: '26px' }}>₹{grandTotal.toFixed(2)}</span>
            </div>

            <div style={styles.checkoutActionGrid}>
              <button
                style={styles.paymentShortcutBtn}
                onClick={() => {
                  setCashReceived(grandTotal.toFixed(2));
                  setCheckoutVisible(true);
                }}
              >
                💳 {t('checkoutBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING BOTTOM CART DOCKED BAR */}
      {cart.length > 0 && (
        <div style={styles.floatingMobileCartBar} className="pos-floating-cart-bar" onClick={() => setMobileCartSheetOpen(true)}>
          <div>
            <div style={{ fontSize: '12px', color: '#CBD5E1' }}>{totalCartCount} Item(s) in Cart</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>₹{grandTotal.toFixed(2)}</div>
          </div>
          <button style={styles.viewCartBtn} onClick={() => setMobileCartSheetOpen(true)}>
            🛒 View Cart & Pay ➔
          </button>
        </div>
      )}

      {/* MOBILE CART BOTTOM SHEET MODAL (Slides up directly over product view) */}
      {mobileCartSheetOpen && (
        <div style={styles.modalOverlay} onClick={() => setMobileCartSheetOpen(false)}>
          <div
            style={{
              ...styles.cartBottomSheet,
              backgroundColor: colors.bgCard,
              borderColor: colors.borderColor
            }}
            className="pos-cart-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.cartHeader}>
              <h2 style={{ ...styles.cartTitle, color: colors.textPrimary }}>🛒 {t('cartTitle')} | Items: {cart.length} | Total Qty: {totalCartCount}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button style={styles.clearCartBtn} onClick={handleClearCart}>{t('clearCart')} (Esc)</button>
                <button style={styles.closeBtn} onClick={() => setMobileCartSheetOpen(false)}>✕</button>
              </div>
            </div>

            <div style={styles.cartTableContainer} className="pos-cart-table-container">
              {cart.length === 0 ? (
                <div style={{ ...styles.emptyCart, color: colors.textSecondary }}>
                  <span style={{ fontSize: '36px' }}>🛒</span>
                  <p style={{ fontWeight: '700', marginTop: '10px' }}>{t('cartEmptyTitle')}</p>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={{ ...styles.trHead, borderColor: colors.borderColor, backgroundColor: colors.tableHeadBg }}>
                      <th style={{ ...styles.th, color: colors.textSecondary }}>{t('productHeader')}</th>
                      <th style={{ ...styles.th, color: colors.textSecondary }}>{t('qtyWeightHeader')}</th>
                      <th style={{ ...styles.th, color: colors.textSecondary }}>{t('rateHeader')}</th>
                      <th style={{ ...styles.th, color: colors.textSecondary }}>{t('totalHeader')}</th>
                      <th style={{ ...styles.th, color: colors.textSecondary }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => {
                      const isSelected = selectedCartIndex === idx;
                      const itemSku = (item.sku || item.barcode || products.find(p => (p.id || p.menu_item_id) === item.product_id)?.sku || products.find(p => (p.id || p.menu_item_id) === item.product_id)?.barcode || '').trim();
                      return (
                        <tr
                          key={idx}
                          style={{
                            ...styles.trBody,
                            borderColor: colors.borderColor,
                            backgroundColor: isSelected ? (themeMode === 'dark' ? '#1E3A5F' : '#EFF6FF') : 'transparent',
                            borderLeft: isSelected ? `4px solid ${colors.accentOrange || '#F97316'}` : '4px solid transparent',
                            boxShadow: isSelected ? 'inset 0 0 0 1px rgba(249, 115, 22, 0.35)' : 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease, border-left 0.15s ease'
                          }}
                          onClick={() => setSelectedCartIndex(idx)}
                          onDoubleClick={() => openCartItemEdit(idx)}
                        >
                          <td style={styles.td}>
                            <div style={{ fontWeight: '700', color: colors.textPrimary }}>{item.name}</div>
                            {isSelected && itemSku && (
                              <div style={{
                                fontSize: '10px',
                                color: themeMode === 'dark' ? '#94A3B8' : '#64748B',
                                fontFamily: 'monospace',
                                fontWeight: '600',
                                lineHeight: 1.2,
                                marginTop: '1px'
                              }}>
                                #{itemSku}
                              </div>
                            )}
                            <div style={{ fontSize: '11px', color: colors.accentOrange }}>
                              {item.is_weight_based ? `⚖️ ${t('weightBadge')}` : `📦 ${t('pcsBadge')}`}
                            </div>
                          </td>
                          <td style={{ ...styles.td, color: colors.textPrimary }}>
                            {item.is_weight_based ? (
                              <span
                                style={{
                                  cursor: 'pointer',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isSelected ? (themeMode === 'dark' ? '#334155' : '#DBEAFE') : 'transparent'
                                }}
                                title="Click or press Enter to edit weight"
                                onClick={(e) => { e.stopPropagation(); openCartItemEdit(idx); }}
                              >
                                {item.displayWeight || item.item_weight} {item.weight_unit || 'kg'}
                              </span>
                            ) : (
                              <div style={styles.qtyBox}>
                                <button
                                  type="button"
                                  style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateCartQty(idx, -1);
                                  }}
                                  title="Decrease Quantity (-1)"
                                >
                                  -
                                </button>
                                <span
                                  style={{
                                    fontWeight: '800',
                                    margin: '0 6px',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isSelected ? (themeMode === 'dark' ? '#334155' : '#DBEAFE') : 'transparent'
                                  }}
                                  title="Click or press Enter to edit quantity"
                                  onClick={(e) => { e.stopPropagation(); openCartItemEdit(idx); }}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateCartQty(idx, 1);
                                  }}
                                  title="Increase Quantity (+1)"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ ...styles.td, color: colors.textPrimary }}>₹{parseFloat(item.price).toFixed(2)}</td>
                          <td style={styles.tdBold}>₹{parseFloat(item.total_price).toFixed(2)}</td>
                          <td style={styles.td}>
                            <button style={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); removeCartItem(idx); }}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ ...styles.cartSummary, backgroundColor: colors.bgInput, borderColor: colors.borderColor }}>
              <div style={styles.summaryRow}>
                <span style={{ color: colors.textSecondary }}>{t('subtotal')}</span>
                <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={styles.summaryRow}>
                  <span style={{ color: colors.textSecondary }}>{t('discount')}</span>
                  <span style={{ color: '#EF4444', fontWeight: '700' }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxType === 'inter' ? (
                <div style={styles.summaryRow}>
                  <span style={{ color: colors.textSecondary }}>IGST</span>
                  <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{taxAmount.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div style={styles.summaryRow}>
                    <span style={{ color: colors.textSecondary }}>CGST</span>
                    <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={{ color: colors.textSecondary }}>SGST</span>
                    <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                </>
              )}

              <div style={{ ...styles.summaryDivider, backgroundColor: colors.borderColor }} />

              <div style={styles.grandTotalRow}>
                <span style={{ color: colors.accentSky, fontWeight: '900', fontSize: '15px' }}>{t('payableTotal')}</span>
                <span style={{ color: colors.accentEmerald, fontWeight: '900', fontSize: '24px' }}>₹{grandTotal.toFixed(2)}</span>
              </div>

              <button
                style={styles.paymentShortcutBtn}
                disabled={cart.length === 0}
                onClick={() => {
                  setMobileCartSheetOpen(false);
                  setCashReceived(grandTotal.toFixed(2));
                  setCheckoutVisible(true);
                }}
              >
                💳 {t('checkoutBtn')} (₹{grandTotal.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* MOBILE CATEGORY SIDEBAR DRAWER OVERLAY */}
      {mobileSidebarDrawerOpen && (
        <div style={styles.modalOverlay} onClick={() => setMobileSidebarDrawerOpen(false)}>
          <div
            style={{
              ...styles.mobileSidebarDrawer,
              backgroundColor: colors.bgCard,
              borderColor: colors.borderColor
            }}
            className="pos-sidebar-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.drawerHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: colors.textPrimary }}>📁 Categories</h3>
              <button style={styles.closeBtn} onClick={() => setMobileSidebarDrawerOpen(false)}>✕</button>
            </div>

            <div style={styles.drawerBody}>
              <button
                type="button"
                style={{
                  ...styles.sidebarItem,
                  backgroundColor: selectedCategory === null ? colors.accentOrange : 'transparent',
                  color: selectedCategory === null ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: selectedCategory === null ? '800' : '600',
                }}
                onClick={() => {
                  setSelectedCategory(null);
                  setMobileSidebarDrawerOpen(false);
                }}
              >
                <div style={styles.sidebarItemText}>
                  <span>{t('allProducts')}</span>
                  <span style={{ ...styles.sidebarCount, color: selectedCategory === null ? '#FFFFFF' : colors.textSecondary }}>
                    {menuItems.length}
                  </span>
                </div>
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                const catItemCount = menuItems.filter(i => String(i.category_id) === String(cat.id)).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    style={{
                      ...styles.sidebarItem,
                      backgroundColor: isSelected ? colors.accentOrange : 'transparent',
                      color: isSelected ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: isSelected ? '800' : '600',
                    }}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setMobileSidebarDrawerOpen(false);
                    }}
                  >
                    <div style={styles.sidebarItemText}>
                      <span>{cat.name}</span>
                      <span style={{ ...styles.sidebarCount, color: isSelected ? '#FFFFFF' : colors.textSecondary }}>
                        {catItemCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <WeightInputModal
        isOpen={weightModalVisible}
        product={selectedWeightProduct}
        initialWeightInKg={editingCartIndex !== null ? cart[editingCartIndex]?.item_weight : 0}
        onConfirm={handleWeightConfirm}
        onClose={() => setWeightModalVisible(false)}
      />

      <CartQtyEditModal
        isOpen={cartQtyModalOpen}
        item={editingCartItem || (editingCartIndex !== null ? cart[editingCartIndex] : cart[selectedCartIndex])}
        onConfirm={handleSaveCartQty}
        onClose={() => {
          setCartQtyModalOpen(false);
          setEditingCartItem(null);
          setEditingCartIndex(null);
          autoFocusSearch();
        }}
        onClearCart={handleClearCart}
      />

      <KeyboardHelpModal
        isOpen={keyboardHelpVisible}
        onClose={() => setKeyboardHelpVisible(false)}
      />

      <LanguageSelectorModal
        isOpen={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      <WebBarcodeScannerModal
        open={barcodeScannerOpen}
        onClose={() => setBarcodeScannerOpen(false)}
        onScan={handleCameraBarcodeScan}
        continuous={true}
        title="📷 POS Camera Barcode Scanner"
        subtitle="Point camera at item barcode to continuously add items to cart"
      />

      {/* QUICK EDIT MODAL */}
      {quickEditProduct && (
        <div style={styles.modalOverlay} onClick={() => setQuickEditProduct(null)}>
          <div
            style={{
              ...styles.checkoutModal,
              backgroundColor: colors.bgCard,
              borderColor: colors.borderColor,
              maxWidth: '450px',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: colors.textPrimary }}>
                📝 Quick Edit Product
              </h2>
              <button style={styles.closeBtn} onClick={() => setQuickEditProduct(null)}>✕</button>
            </div>

            <div style={{ margin: '16px 0 20px 0' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' }}>
                Item Name
              </span>
              <div style={{ fontSize: '18px', fontWeight: '900', color: colors.textPrimary, marginTop: '4px' }}>
                {quickEditProduct.name}
              </div>
            </div>

            {quickEditError && (
              <div style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontWeight: '700', fontSize: '13px' }}>
                ⚠️ {quickEditError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: colors.textSecondary, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Price (₹)
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: colors.bgInput,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.borderColor}`,
                    fontSize: '16px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                  type="number"
                  step="0.01"
                  value={quickEditPrice}
                  onChange={(e) => setQuickEditPrice(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: colors.textSecondary, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Current Stock Quantity ({quickEditProduct.unit || quickEditProduct.base_unit || 'pcs'})
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: colors.bgInput,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.borderColor}`,
                    fontSize: '16px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                  type="number"
                  value={quickEditStock}
                  onChange={(e) => setQuickEditStock(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgInput,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.borderColor}`,
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
                onClick={() => setQuickEditProduct(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.accentOrange,
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: '900',
                  cursor: 'pointer',
                  opacity: savingQuickEdit ? 0.7 : 1
                }}
                disabled={savingQuickEdit}
                onClick={handleSaveQuickEdit}
              >
                {savingQuickEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutVisible && (
        <div style={styles.modalOverlay} onClick={() => setCheckoutVisible(false)}>
          <div style={{ ...styles.checkoutModal, backgroundColor: colors.bgCard, borderColor: colors.borderColor }} className="pos-checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: colors.textPrimary }}>💳 {t('checkoutModalTitle')}</h2>
              <button style={styles.closeBtn} onClick={() => setCheckoutVisible(false)}>✕</button>
            </div>

            <div style={{ ...styles.billBox, backgroundColor: colors.bgInput, borderColor: colors.borderColor }}>
              <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: '800' }}>{t('payableAmount')}</span>
              <span style={{ color: colors.accentEmerald, fontSize: '32px', fontWeight: '900' }}>₹{grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: colors.textSecondary, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Place of Supply (GST Type):</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgInput,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.borderColor}`,
                  fontSize: '14px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="intra">Intra-State (CGST + SGST split)</option>
                <option value="inter">Inter-State (IGST)</option>
              </select>
            </div>

            <label style={{ ...styles.label, color: colors.textSecondary }}>{t('selectPayment')}</label>
            <div style={styles.payGrid}>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'cash' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('cash', 'print_receipt_only')}
                disabled={submittingSale}
              >
                💵 {t('cashPay')} (F9)
              </button>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'upi' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('upi', 'print_receipt_only')}
                disabled={submittingSale}
              >
                📱 {t('upiPay')} (F10)
              </button>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'card' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('card', 'print_receipt_only')}
                disabled={submittingSale}
              >
                💳 {t('cardPay')} (F11)
              </button>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'due' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('due', 'print_receipt_only')}
                disabled={submittingSale}
              >
                📝 {t('duePay')}
              </button>
            </div>

            {paymentMode === 'cash' && (
              <div style={{ ...styles.cashBox, backgroundColor: colors.bgInput, borderColor: colors.borderColor }}>
                <label style={{ ...styles.label, color: colors.textSecondary }}>{t('cashReceivedLabel')}</label>
                <input
                  style={{ ...styles.cashInput, backgroundColor: colors.bgCard, color: colors.textPrimary }}
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  autoFocus
                />
                <div style={{ ...styles.changeRow, color: colors.textPrimary }}>
                  <span>{t('changeReturnLabel')}</span>
                  <span style={{ color: changeToReturn > 0 ? colors.accentEmerald : colors.textSecondary, fontWeight: '900', fontSize: '20px' }}>
                    ₹{changeToReturn.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              style={{ ...styles.completeBtn, opacity: submittingSale ? 0.7 : 1 }}
              onClick={() => !submittingSale && handleCompleteSale(paymentMode || 'cash', 'print_receipt_only')}
              disabled={submittingSale}
            >
              {submittingSale ? '⌛ Processing Sale & Printing...' : `💾 ${t('completeSaleBtn')} (F12)`}
            </button>
          </div>
        </div>
      )}

      {/* Multi-Breakpoint Responsive CSS for Desktop (>=1280px), Tablet (768px-1279px), & Mobile (<768px) */}
      <style>{`
        /* DESKTOP BREAKPOINT (>= 1280px) */
        @media (min-width: 1280px) {
          .pos-catalog-panel {
            display: flex !important;
            flex: 1 !important;
          }
          .pos-cart-panel {
            display: flex !important;
            flex-shrink: 0 !important;
          }
          .pos-floating-cart-bar {
            display: none !important;
          }
          .pos-mobile-tab-group {
            display: none !important;
          }
        }

        /* TABLET BREAKPOINT (768px to 1279px) */
        @media (min-width: 768px) and (max-width: 1279px) {
          .pos-catalog-panel {
            display: flex !important;
            flex: 1 !important;
          }
          .pos-cart-panel {
            display: flex !important;
            flex-shrink: 0 !important;
            padding: 10px !important;
          }
          .pos-floating-cart-bar {
            display: none !important;
          }
          .pos-mobile-tab-group {
            display: none !important;
          }
          .pos-sidebar {
            display: none !important;
          }
          .pos-control-pill {
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
        }

        .pos-cart-resize-handle:hover {
          background-color: #F97316 !important;
        }

        /* MOBILE BREAKPOINT (< 768px) */
        @media (max-width: 767px) {
          .pos-catalog-panel {
            width: 100% !important;
            flex: 1 !important;
            padding-bottom: 75px !important;
          }
          .pos-cart-panel {
            display: none !important;
          }
          .pos-floating-cart-bar {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 9999 !important;
          }
          .pos-mobile-tab-group {
            display: flex !important;
          }
          .pos-control-bar {
            display: flex !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding-bottom: 6px !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
          }
          .pos-control-bar::-webkit-scrollbar {
            display: none !important;
          }
          .pos-control-pill {
            flex-shrink: 0 !important;
          }
          .pos-density-group {
            flex-shrink: 0 !important;
            display: inline-flex !important;
          }
          .pos-category-rail {
            display: flex !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            padding-bottom: 6px !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            mask-image: linear-gradient(to right, black 85%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
          }
          .pos-category-rail::-webkit-scrollbar {
            display: none !important;
          }
          .pos-catalog-body {
            flex-direction: column !important;
          }
          .pos-sidebar {
            display: none !important;
          }
        }

        /* SMARTPHONE SCREEN OPTIMIZATIONS (< 480px) */
        @media (max-width: 480px) {
          .pos-header {
            padding: 8px 10px !important;
          }
          .pos-brand-title {
            font-size: 14px !important;
          }
          .pos-search-input {
            font-size: 12px !important;
            padding: 6px 8px !important;
            text-overflow: ellipsis !important;
          }
          .pos-checkout-modal {
            padding: 14px !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #E2E8F0',
    flexWrap: 'wrap',
    gap: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    fontSize: '26px',
  },
  brandTitle: {
    fontSize: '17px',
    fontWeight: '900',
    margin: 0,
  },
  storeName: {
    fontSize: '11px',
    color: '#F97316',
    fontWeight: '700',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  mobileTabGroup: {
    display: 'flex',
    backgroundColor: '#F1F5F9',
    borderRadius: '8px',
    padding: '2px',
  },
  mobileTabBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '800',
    fontSize: '12px',
    cursor: 'pointer',
  },
  headerIconBtn: {
    border: '1px solid #CBD5E1',
    padding: '6px 10px',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '12px',
    cursor: 'pointer',
  },
  shortcutHelpBtn: {
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '12px',
    cursor: 'pointer',
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  catalogSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '14px',
    overflow: 'hidden',
  },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '12px',
    border: '2px solid #F97316',
    padding: '8px 14px',
    marginBottom: '12px',
  },
  searchIcon: {
    fontSize: '18px',
    marginRight: '8px',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    outline: 'none',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  categoryRail: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    marginBottom: '12px',
    paddingBottom: '4px',
  },
  catBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#64748B',
  },
  emptyProductsBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#64748B',
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  controlPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  densityGroup: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '16px',
    padding: '2px',
    border: '1px solid #E2E8F0',
  },
  densityBtn: {
    border: 'none',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  catalogBodyLayout: {
    display: 'flex',
    gap: '10px',
    flex: 1,
    overflow: 'hidden',
  },
  sidebarContainer: {
    width: '210px',
    flexShrink: 0,
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '8px',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  },
  sidebarItemText: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sidebarCount: {
    fontSize: '11px',
    fontWeight: '700',
    marginLeft: '6px',
    opacity: 0.85,
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: '10px',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px',
  },
  productCard: {
    borderRadius: '12px',
    padding: '12px',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
  },
  imageContainer: {
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    border: '1px solid #F1F5F9',
  },
  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 5px',
    borderRadius: '4px',
  },
  weightBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    color: '#0284C7',
  },
  pieceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
  },
  barcodeText: {
    fontSize: '10px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardPrice: {
    fontSize: '15px',
    fontWeight: '900',
    color: '#10B981',
  },
  cardUnit: {
    fontSize: '10px',
  },
  cartSection: {
    borderLeft: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    padding: '14px',
    height: '100%',
    overflow: 'hidden',
    minHeight: 0,
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexShrink: 0,
  },
  cartTitle: {
    fontSize: '15px',
    fontWeight: '800',
    margin: 0,
  },
  clearCartBtn: {
    backgroundColor: 'transparent',
    color: '#EF4444',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '12px',
  },
  cartTableContainer: {
    flex: '1 1 0%',
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    marginBottom: '10px',
    WebkitOverflowScrolling: 'touch',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  trHead: {
    borderBottom: '1px solid #E2E8F0',
    textAlign: 'left',
  },
  th: {
    padding: '6px 4px',
    fontSize: '11px',
    fontWeight: '800',
  },
  trBody: {
    borderBottom: '1px solid #E2E8F0',
    cursor: 'pointer',
  },
  td: {
    padding: '8px 4px',
    fontSize: '12px',
  },
  tdBold: {
    padding: '8px 4px',
    fontSize: '12px',
    fontWeight: '900',
    color: '#10B981',
  },
  qtyBox: {
    display: 'flex',
    alignItems: 'center',
  },
  qtyBtn: {
    border: 'none',
    borderRadius: '4px',
    width: '22px',
    height: '22px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    fontSize: '14px',
    lineHeight: '1',
    padding: 0
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#EF4444',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  cartSummary: {
    borderRadius: '12px',
    padding: '12px',
    border: '1px solid #E2E8F0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '4px',
  },
  summaryDivider: {
    height: '1px',
    margin: '8px 0',
  },
  grandTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  checkoutActionGrid: {
    display: 'flex',
    gap: '8px',
  },
  paymentShortcutBtn: {
    width: '100%',
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: '900',
    fontSize: '15px',
    cursor: 'pointer',
  },
  floatingMobileCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: '12px 16px',
    display: 'none',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  viewCartBtn: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '900',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
  },
  checkoutModal: {
    borderRadius: '16px',
    width: '100%',
    maxWidth: '460px',
    padding: '20px',
    border: '1px solid #E2E8F0',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  closeBtn: {
    background: '#E2E8F0',
    border: 'none',
    color: '#475569',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    cursor: 'pointer',
  },
  billBox: {
    borderRadius: '12px',
    padding: '14px',
    textAlign: 'center',
    marginBottom: '14px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '11px',
    fontWeight: '800',
    display: 'block',
    marginBottom: '6px',
  },
  payGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '14px',
  },
  payBtn: {
    padding: '10px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
  },
  payActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    color: '#F97316',
    borderColor: '#F97316',
    fontWeight: '900',
  },
  cashBox: {
    borderRadius: '10px',
    padding: '10px',
    marginBottom: '14px',
    border: '1px solid #E2E8F0',
  },
  cashInput: {
    width: '100%',
    border: '2px solid #0284C7',
    borderRadius: '8px',
    fontSize: '22px',
    fontWeight: '900',
    padding: '6px 10px',
    marginBottom: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  changeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '700',
  },
  completeBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: '900',
    fontSize: '15px',
    cursor: 'pointer',
  },
  mobileSidebarDrawer: {
    borderRadius: '16px',
    width: '280px',
    maxWidth: '85vw',
    height: '80vh',
    padding: '16px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: '16px',
    top: '10vh',
    boxSizing: 'border-box',
    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
    zIndex: 99999,
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '10px',
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cartBottomSheet: {
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: '520px',
    height: '80vh',
    padding: '20px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    bottom: 0,
    boxSizing: 'border-box',
    boxShadow: '0 -10px 25px rgba(0,0,0,0.3)',
    zIndex: 99999,
  },
};
