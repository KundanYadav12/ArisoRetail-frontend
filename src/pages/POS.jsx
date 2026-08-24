import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import WeightInputModal from '../components/WeightInputModal';
import KeyboardHelpModal from '../components/KeyboardHelpModal';
import LanguageSelectorModal from '../components/LanguageSelectorModal';
import { useLanguage } from '../locales/LanguageContext';
import {
  apiFetch,
  fetchMobileMenu,
  fetchMobileCategories,
  createOrder
} from '../utils/api';

export default function POS({ user: propUser, token: propToken }) {
  const { t, language, supportedLanguages } = useLanguage();

  // Load User & Token from Props or Isolated ARISO_RETAIL Local Storage
  const [user, setUser] = useState(() => {
    if (propUser && Object.keys(propUser).length > 0) return propUser;
    const saved = localStorage.getItem('ARISO_RETAIL_USER');
    return saved ? JSON.parse(saved) : {};
  });

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
  const [cart, setCart] = useState([]);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('0');

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Modals & Overlay Visibility
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState(null);
  const [editingCartIndex, setEditingCartIndex] = useState(null);

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

  // Payment State
  const [paymentMode, setPaymentMode] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');

  // Search input DOM ref for automatic focus management
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadData();
    autoFocusSearch();
  }, [token]);

  const autoFocusSearch = () => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 150);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, menu] = await Promise.all([
        fetchMobileCategories(token),
        fetchMobileMenu(token)
      ]);
      const catList = Array.isArray(cats) ? cats : (cats?.categories || []);
      const itemList = Array.isArray(menu) ? menu : (menu?.items || []);
      setCategories(catList);
      setMenuItems(itemList);
      setSelectedCategory(null);
    } catch (err) {
      console.warn('[Desktop POS] Error loading data:', err.message);
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

  // Product Selection & Cart Actions
  const handleSelectProduct = (product) => {
    if (!product) return;
    if (product.is_weight_based) {
      setSelectedWeightProduct(product);
      setEditingCartIndex(null);
      setWeightModalVisible(true);
    } else {
      addPieceItemToCart(product);
      setSearchQuery('');
      autoFocusSearch();
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
            price: price,
            unit_price: price,
            quantity: 1,
            unit: product.base_unit || product.unit || 'pcs',
            is_weight_based: false,
            total_price: price.toFixed(2),
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

  // Cart Controls
  const updateCartQty = (index, delta) => {
    setCart((prevCart) => {
      const updated = [...prevCart];
      const item = updated[index];
      if (item.is_weight_based) return prevCart;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...item,
        quantity: newQty,
        total_price: (newQty * parseFloat(item.price)).toFixed(2)
      };
      return updated;
    });
  };

  const removeCartItem = (index) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
    if (selectedCartIndex >= cart.length - 1 && selectedCartIndex > 0) {
      setSelectedCartIndex(selectedCartIndex - 1);
    }
  };

  // USB Barcode Scanner Enter Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!queryLower) return;

    const exactMatch = menuItems.find(
      (p) => (p.barcode || '').toLowerCase() === queryLower || (p.sku || '').toLowerCase() === queryLower
    );

    if (exactMatch) {
      handleSelectProduct(exactMatch);
    } else if (filteredProducts.length > 0) {
      handleSelectProduct(filteredProducts[selectedProductIndex] || filteredProducts[0]);
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

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstRate = 5;
  const taxAmount = taxableAmount * (gstRate / 100);
  const grandTotal = Math.max(0, taxableAmount + taxAmount);

  const numericCashReceived = parseFloat(cashReceived || '0');
  const changeToReturn = Math.max(0, numericCashReceived - grandTotal);
  const totalCartCount = cart.reduce((acc, item) => acc + (item.is_weight_based ? 1 : item.quantity), 0);

  // Complete Sale & Print LAN Thermal Receipt
  const handleCompleteSale = async (overridePaymentMode = null) => {
    if (submittingSale) return; // Prevent duplicate clicks/re-entrancy
    if (cart.length === 0) {
      alert('Cart is empty. Add products before completing sale.');
      return;
    }

    const effectivePaymentMode = overridePaymentMode || paymentMode;
    if (!effectivePaymentMode) {
      if (!checkoutVisible) {
        setCashReceived(grandTotal.toFixed(2));
        setCheckoutVisible(true);
        return;
      }
      alert('Please select a payment method (Cash, UPI, Card, or Due).');
      return;
    }

    if (effectivePaymentMode === 'cash' && numericCashReceived < grandTotal) {
      alert(`Amount received (₹${numericCashReceived.toFixed(2)}) is less than total bill (₹${grandTotal.toFixed(2)}).`);
      return;
    }

    setPaymentMode(effectivePaymentMode);
    setSubmittingSale(true);

    const orderPayload = {
      items: cart.map((i) => ({
        menu_item_id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity || 1,
        item_weight: i.item_weight || null,
        weight_unit: i.weight_unit || i.unit || 'pcs',
        is_weight_based: i.is_weight_based ? 1 : 0,
        total_price: i.total_price,
        notes: i.notes || ''
      })),
      subtotal: subtotal.toFixed(2),
      discount_amount: discountAmount.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total_amount: grandTotal.toFixed(2),
      payment_mode: effectivePaymentMode,
      cashier_name: user.name || 'Desktop Cashier',
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      customer_address: customerAddress
    };

    try {
      // Step 1: Save Sale Order to Database & Enqueue Receipt Print Job
      const orderRes = await createOrder(token, orderPayload);
      const invoiceNo = orderRes?.unique_order_number || orderRes?.orderNumber || orderRes?.id || `RET-${Date.now().toString().slice(-6)}`;

      // Step 2: Inform Cashier with Success Toast/Alert & Clear Cart for Next Sale
      alert(`🎉 Payment completed successfully!\nBill #${invoiceNo} | Total: ₹${grandTotal.toFixed(2)}`);

      // Step 3: Clear Cart & Reset UI for next sale
      setCart([]);
      setDiscountValue('0');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setOrderNotes('');
      setSelectAllItems(false);
      setSelectedCartItemIds([]);
      setCheckoutVisible(false);
      setCashReceived('');
      setActiveMobileTab('catalog');
      autoFocusSearch();
    } catch (err) {
      alert('Error completing sale: ' + err.message);
    } finally {
      setSubmittingSale(false);
    }
  };

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
        handleCompleteSale('cash');
      }
    },
    'F10': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale('upi');
      }
    },
    'F11': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale('card');
      }
    },
    'F12': (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale();
      }
    },
    'Esc': (e) => {
      setCheckoutVisible(false);
      setWeightModalVisible(false);
      setKeyboardHelpVisible(false);
      setLanguageModalVisible(false);
      autoFocusSearch();
    },
    'Delete': (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        if (cart.length > 0 && selectedCartIndex < cart.length) {
          removeCartItem(selectedCartIndex);
        }
      }
    },
    '+': (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        if (cart.length > 0) updateCartQty(selectedCartIndex, 1);
      }
    },
    '-': (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        if (cart.length > 0) updateCartQty(selectedCartIndex, -1);
      }
    },
    '?': (e) => setKeyboardHelpVisible((prev) => !prev),
    'Ctrl+/': (e) => setKeyboardHelpVisible((prev) => !prev),
  }, [cart, selectedCartIndex, filteredProducts, selectedProductIndex, grandTotal, paymentMode, cashReceived, submittingSale, checkoutVisible]);

  const currentLangObj = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  return (
    <div style={{ ...styles.container, backgroundColor: colors.bgApp, color: colors.textPrimary }}>
      {/* HEADER */}
      <header style={{ ...styles.header, backgroundColor: colors.bgHeader, borderColor: colors.borderColor }} className="pos-header">
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🛍️</span>
          <div>
            <h1 style={{ ...styles.brandTitle, color: colors.textPrimary }} className="pos-brand-title">{t('brandName')}</h1>
            <span style={styles.storeName}>{t('counterLabel')} • {t('cashierLabel')}: {user.name || 'Admin'}</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Mobile Tab Switcher Toggle (Catalog / Cart) */}
          <div style={styles.mobileTabGroup} className="pos-mobile-tab-group">
            <button
              style={{
                ...styles.mobileTabBtn,
                backgroundColor: activeMobileTab === 'catalog' ? colors.accentOrange : colors.bgInput,
                color: activeMobileTab === 'catalog' ? '#FFFFFF' : colors.textPrimary
              }}
              onClick={() => setActiveMobileTab('catalog')}
            >
              📦 Catalog
            </button>
            <button
              style={{
                ...styles.mobileTabBtn,
                backgroundColor: activeMobileTab === 'cart' ? colors.accentOrange : colors.bgInput,
                color: activeMobileTab === 'cart' ? '#FFFFFF' : colors.textPrimary
              }}
              onClick={() => setActiveMobileTab('cart')}
            >
              🛒 Cart ({totalCartCount})
            </button>
          </div>

          {/* Language Switcher Button */}
          <button
            style={{
              ...styles.headerIconBtn,
              backgroundColor: isDark ? '#334155' : '#F1F5F9',
              color: colors.textPrimary,
              borderColor: colors.borderColor
            }}
            onClick={() => setLanguageModalVisible(true)}
            title="Change Language"
          >
            🌐 {currentLangObj.nativeName}
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            style={{
              ...styles.headerIconBtn,
              backgroundColor: isDark ? '#334155' : '#F1F5F9',
              color: colors.textPrimary,
              borderColor: colors.borderColor
            }}
            onClick={toggleThemeMode}
            title="Toggle Light/Dark Mode"
          >
            {isDark ? '🌙' : '☀️'}
          </button>

          <button style={styles.shortcutHelpBtn} onClick={() => setKeyboardHelpVisible(true)}>
            ⌨️ {t('shortcutsBtn')}
          </button>
        </div>
      </header>

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

          {/* CONTROL BAR: Focus | Sidebar Toggle | Density (Icon | Compact | Standard | Spacious) */}
          <div style={{ ...styles.controlBar, backgroundColor: colors.bgCard, borderColor: colors.borderColor }} className="pos-control-bar">
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
          <div style={styles.categoryRail} className="pos-category-rail">
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
                  const isWeight = !!product.is_weight_based;
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
                        backgroundColor: colors.bgCard,
                        borderColor: selectedProductIndex === idx ? colors.accentOrange : colors.borderColor,
                        boxShadow: isDark ? '0 4px 6px -1px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div style={styles.cardHeader}>
                        <span style={{ ...styles.badge, ...(isWeight ? styles.weightBadge : styles.pieceBadge) }}>
                          {isWeight ? `⚖️ ${t('weightBadge')}` : `📦 ${t('pcsBadge')}`}
                        </span>
                        {product.barcode && <span style={{ ...styles.barcodeText, color: colors.textSecondary }}>#{product.barcode}</span>}
                      </div>
                      <h3 style={{ ...styles.cardTitle, fontSize: titleFontSize, color: colors.textPrimary }}>{product.name}</h3>
                      <div style={styles.cardFooter}>
                        <span style={styles.cardPrice}>₹{price.toFixed(2)}</span>
                        <span style={{ ...styles.cardUnit, color: colors.textSecondary }}>per {product.base_unit || 'pcs'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CART SECTION (Visible on desktop unless Focus Mode is active, or when activeMobileTab is 'cart') */}
        <div style={{
          ...styles.cartSection,
          backgroundColor: colors.bgCard,
          borderColor: colors.borderColor,
          display: focusMode ? 'none' : (activeMobileTab === 'cart' ? 'flex' : 'flex')
        }} className="pos-cart-panel">
          <div style={styles.cartHeader}>
            <h2 style={{ ...styles.cartTitle, color: colors.textPrimary }}>🛒 {t('cartTitle')}</h2>
            <button style={styles.clearCartBtn} onClick={() => setCart([])}>{t('clearCart')}</button>
          </div>

          {/* CART ITEMS TABLE */}
          <div style={styles.cartTableContainer}>
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
                <tbody>
                  {cart.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        ...styles.trBody,
                        borderColor: colors.borderColor,
                        backgroundColor: selectedCartIndex === idx ? colors.rowHoverBg : 'transparent'
                      }}
                      onClick={() => setSelectedCartIndex(idx)}
                    >
                      <td style={styles.td}>
                        <div style={{ fontWeight: '700', color: colors.textPrimary }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: colors.accentOrange }}>
                          {item.is_weight_based ? `⚖️ ${t('weightBadge')}` : `📦 ${t('pcsBadge')}`}
                        </div>
                      </td>
                      <td style={{ ...styles.td, color: colors.textPrimary }}>
                        {item.is_weight_based ? (
                          <span>{item.displayWeight || item.item_weight} {item.weight_unit || 'kg'}</span>
                        ) : (
                          <div style={styles.qtyBox}>
                            <button style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }} onClick={() => updateCartQty(idx, -1)}>-</button>
                            <span style={{ fontWeight: '800', margin: '0 6px' }}>{item.quantity}</span>
                            <button style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }} onClick={() => updateCartQty(idx, 1)}>+</button>
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, color: colors.textPrimary }}>₹{parseFloat(item.price).toFixed(2)}</td>
                      <td style={styles.tdBold}>₹{parseFloat(item.total_price).toFixed(2)}</td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtn} onClick={() => removeCartItem(idx)}>✕</button>
                      </td>
                    </tr>
                  ))}
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
            <div style={styles.summaryRow}>
              <span style={{ color: colors.textSecondary }}>{t('gstTax')}</span>
              <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{taxAmount.toFixed(2)}</span>
            </div>

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
              <h2 style={{ ...styles.cartTitle, color: colors.textPrimary }}>🛒 {t('cartTitle')} ({totalCartCount})</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button style={styles.clearCartBtn} onClick={() => setCart([])}>{t('clearCart')}</button>
                <button style={styles.closeBtn} onClick={() => setMobileCartSheetOpen(false)}>✕</button>
              </div>
            </div>

            <div style={styles.cartTableContainer}>
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
                    {cart.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          ...styles.trBody,
                          borderColor: colors.borderColor,
                          backgroundColor: selectedCartIndex === idx ? colors.rowHoverBg : 'transparent'
                        }}
                        onClick={() => setSelectedCartIndex(idx)}
                      >
                        <td style={styles.td}>
                          <div style={{ fontWeight: '700', color: colors.textPrimary }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: colors.accentOrange }}>
                            {item.is_weight_based ? `⚖️ ${t('weightBadge')}` : `📦 ${t('pcsBadge')}`}
                          </div>
                        </td>
                        <td style={{ ...styles.td, color: colors.textPrimary }}>
                          {item.is_weight_based ? (
                            <span>{item.displayWeight || item.item_weight} {item.weight_unit || 'kg'}</span>
                          ) : (
                            <div style={styles.qtyBox}>
                              <button style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }} onClick={() => updateCartQty(idx, -1)}>-</button>
                              <span style={{ fontWeight: '800', margin: '0 6px' }}>{item.quantity}</span>
                              <button style={{ ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary }} onClick={() => updateCartQty(idx, 1)}>+</button>
                            </div>
                          )}
                        </td>
                        <td style={{ ...styles.td, color: colors.textPrimary }}>₹{parseFloat(item.price).toFixed(2)}</td>
                        <td style={styles.tdBold}>₹{parseFloat(item.total_price).toFixed(2)}</td>
                        <td style={styles.td}>
                          <button style={styles.deleteBtn} onClick={() => removeCartItem(idx)}>✕</button>
                        </td>
                      </tr>
                    ))}
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
              <div style={styles.summaryRow}>
                <span style={{ color: colors.textSecondary }}>{t('gstTax')}</span>
                <span style={{ fontWeight: '700', color: colors.textPrimary }}>₹{taxAmount.toFixed(2)}</span>
              </div>

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

      <KeyboardHelpModal
        isOpen={keyboardHelpVisible}
        onClose={() => setKeyboardHelpVisible(false)}
      />

      <LanguageSelectorModal
        isOpen={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

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

            <label style={{ ...styles.label, color: colors.textSecondary }}>{t('selectPayment')}</label>
            <div style={styles.payGrid}>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'cash' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('cash')}
                disabled={submittingSale}
              >
                💵 {t('cashPay')} (F9)
              </button>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'upi' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('upi')}
                disabled={submittingSale}
              >
                📱 {t('upiPay')} (F10)
              </button>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'card' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('card')}
                disabled={submittingSale}
              >
                💳 {t('cardPay')} (F11)
              </button>
              <button
                style={{ ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...(paymentMode === 'due' ? styles.payActive : {}), opacity: submittingSale ? 0.7 : 1 }}
                onClick={() => !submittingSale && handleCompleteSale('due')}
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
              onClick={() => !submittingSale && handleCompleteSale()}
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
            width: 380px !important;
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
            width: 320px !important;
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
    width: '400px',
    borderLeft: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    padding: '14px',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
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
    flex: 1,
    overflowY: 'auto',
    marginBottom: '10px',
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
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    fontWeight: 'bold',
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
