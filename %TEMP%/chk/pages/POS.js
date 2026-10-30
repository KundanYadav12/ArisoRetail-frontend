import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "../utils/useKeyboardShortcuts";
import WeightInputModal from "../components/WeightInputModal";
import SerialSelectionModal from "../components/SerialSelectionModal";
import CartQtyEditModal from "../components/CartQtyEditModal";
import CartPriceEditModal from "../components/CartPriceEditModal";
import OpenItemModal from "../components/OpenItemModal";
import KeyboardHelpModal from "../components/KeyboardHelpModal";
import LanguageSelectorModal from "../components/LanguageSelectorModal";
import WebBarcodeScannerModal from "../components/WebBarcodeScannerModal";
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Search,
  Camera,
  Maximize2,
  Layers,
  Menu as MenuIconLucide,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  ClipboardList,
  Scale,
  Package,
  Store,
  User,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Trash2,
  Edit3,
  ArrowRight,
  Tag,
  PauseCircle,
  PackagePlus,
  PlusCircle
} from "lucide-react";
import ProductStickerModal from "../components/ProductStickerModal";
import HeldReceiptsModal from "../components/HeldReceiptsModal";
import { useLanguage } from "../locales/LanguageContext";
import { useNotify } from "../context/NotificationContext";
import { useDataRefresh } from "../context/DataRefreshContext";
import {
  apiFetch,
  fetchMobileMenu,
  fetchMobileCategories,
  fetchReceiptSettings,
  fetchPrinters,
  createOrder,
  resolveImageUrl,
  fetchCustomers,
  fetchPendingOrders,
  confirmPendingOrder,
  cancelPendingOrder,
  fetchHeldReceipts,
  createHeldReceipt,
  updateHeldReceipt,
  resumeHeldReceipt,
  completeHeldReceipt,
  cancelHeldReceipt
} from "../utils/api";
import { db } from "../utils/offlineDb";
import { SyncService } from "../utils/syncService";
import { seedDefaultOfflineDataIfNeeded } from "../utils/offlineAuthService";
import {
  generateLocalHtmlReceipt,
  generateLocalEscPosReceipt,
  generateLocalHtmlKot,
  generateLocalEscPosKot,
  safeUtf8ToBase64,
  printHtmlSilentlyViaIframe
} from "../utils/localReceiptGenerator";
import { calculateDocumentTax, resolvePlaceOfSupply, validateGstin } from "../utils/gstCalculator";
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
  onManualSync: propManualSync,
  pricingMode: propPricingMode,
  onPricingModeChange: propOnPricingModeChange
}) {
  const { t, language, supportedLanguages } = useLanguage();
  const notify = useNotify();
  const { menuVersion, categoryVersion } = useDataRefresh();
  const [user, setUser] = useState(() => {
    if (propUser && Object.keys(propUser).length > 0) return propUser;
    const saved = localStorage.getItem("ARISO_RETAIL_USER");
    return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => {
    if (propUser && Object.keys(propUser).length > 0) {
      setUser(propUser);
    }
  }, [propUser]);
  const token = propToken || localStorage.getItem("ARISO_RETAIL_TOKEN") || "";
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("pos_theme_mode") || "light";
  });
  const toggleThemeMode = () => {
    const nextMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextMode);
    localStorage.setItem("pos_theme_mode", nextMode);
  };
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem("pos_focus_mode") === "true";
  });
  const [categoryLayout, setCategoryLayout] = useState(() => {
    return localStorage.getItem("pos_category_layout") || "horizontal";
  });
  const [densityMode, setDensityMode] = useState(() => {
    return localStorage.getItem("pos_density_mode") || "standard";
  });
  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    localStorage.setItem("pos_focus_mode", next ? "true" : "false");
  };
  const toggleCategoryLayout = () => {
    const next = categoryLayout === "sidebar" ? "horizontal" : "sidebar";
    setCategoryLayout(next);
    localStorage.setItem("pos_category_layout", next);
    if (windowWidth < 900) {
      setMobileSidebarDrawerOpen(next === "sidebar");
    }
  };
  const changeDensityMode = (mode) => {
    setDensityMode(mode);
    localStorage.setItem("pos_density_mode", mode);
  };
  const [activeMobileTab, setActiveMobileTab] = useState("catalog");
  const isDark = themeMode === "dark";
  const colors = {
    bgApp: isDark ? "#0F172A" : "#F8FAFC",
    bgCard: isDark ? "#1E293B" : "#FFFFFF",
    bgHeader: isDark ? "#1E293B" : "#FFFFFF",
    bgInput: isDark ? "#0F172A" : "#F1F5F9",
    borderColor: isDark ? "#334155" : "#E2E8F0",
    borderActive: "#F97316",
    textPrimary: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    accentOrange: "#F97316",
    accentEmerald: "#10B981",
    accentSky: isDark ? "#38BDF8" : "#0284C7",
    tableHeadBg: isDark ? "#0F172A" : "#F1F5F9",
    rowHoverBg: isDark ? "rgba(249, 115, 22, 0.12)" : "rgba(249, 115, 22, 0.06)"
  };
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [localCart, localSetCart] = useState([]);
  const cart = sharedCart !== void 0 ? sharedCart : localCart;
  const setCart = sharedSetCart !== void 0 ? sharedSetCart : localSetCart;
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const [localDiscountType, localSetDiscountType] = useState("percentage");
  const discountType = sharedDiscountType !== void 0 ? sharedDiscountType : localDiscountType;
  const setDiscountType = sharedSetDiscountType !== void 0 ? sharedSetDiscountType : localSetDiscountType;
  const [localDiscountValue, localSetDiscountValue] = useState("0");
  const discountValue = sharedDiscountValue !== void 0 ? sharedDiscountValue : localDiscountValue;
  const setDiscountValue = sharedSetDiscountValue !== void 0 ? sharedSetDiscountValue : localSetDiscountValue;
  const [localPricingMode, setLocalPricingMode] = useState(() => {
    try {
      return localStorage.getItem("ariso_pricing_mode") || "retail";
    } catch {
      return "retail";
    }
  });
  const pricingMode = propPricingMode !== void 0 ? propPricingMode : localPricingMode;
  const handleSwitchPricingMode = useCallback((newMode) => {
    if (newMode === pricingMode) return;
    if (cart && cart.length > 0) {
      const confirmChange = window.confirm(
        `Switch pricing mode to ${newMode === "wholesale" ? "Wholesale" : "Retail"}? Items currently in the cart will be repriced to the ${newMode} rates.`
      );
      if (!confirmChange) return;
    }
    if (propOnPricingModeChange) {
      propOnPricingModeChange(newMode);
    } else {
      setLocalPricingMode(newMode);
      try {
        localStorage.setItem("ariso_pricing_mode", newMode);
        window.dispatchEvent(new CustomEvent("ariso_pricing_mode_change", { detail: { mode: newMode } }));
      } catch (_) {
      }
    }
  }, [pricingMode, cart, propOnPricingModeChange]);
  const prevPricingModeRef = useRef(pricingMode);
  useEffect(() => {
    if (prevPricingModeRef.current !== pricingMode) {
      prevPricingModeRef.current = pricingMode;
      if (cart && cart.length > 0 && menuItems && menuItems.length > 0) {
        setCart((prevCart) => {
          return prevCart.map((item) => {
            const prodId = item.product_id || item.menu_item_id || item.id;
            const product = menuItems.find((m) => (m.id || m.menu_item_id) === prodId);
            if (!product) return item;
            const isWholesale = pricingMode === "wholesale";
            const unitPrice = isWholesale && product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? parseFloat(product.wholesale_price) : parseFloat(product.price || product.selling_price || 0);
            const qty = item.is_weight_based ? parseFloat(item.item_weight) || 1 : parseFloat(item.quantity) || 1;
            return {
              ...item,
              price: unitPrice,
              unit_price: unitPrice,
              base_unit_price: item.is_weight_based ? unitPrice : item.base_unit_price,
              total_price: (qty * unitPrice).toFixed(2)
            };
          });
        });
      }
    }
  }, [pricingMode, menuItems, cart, setCart]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [storeName, setStoreName] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingOrdersModalOpen, setPendingOrdersModalOpen] = useState(false);
  const [loadingPendingOrders, setLoadingPendingOrders] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [heldReceipts, setHeldReceipts] = useState([]);
  const [heldReceiptsModalOpen, setHeldReceiptsModalOpen] = useState(false);
  const [loadingHeldReceipts, setLoadingHeldReceipts] = useState(false);
  const [activeHoldId, setActiveHoldId] = useState(null);
  const [holdingReceipt, setHoldingReceipt] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState(null);
  const [serialModalVisible, setSerialModalVisible] = useState(false);
  const [selectedSerialProduct, setSelectedSerialProduct] = useState(null);
  const [editingCartIndex, setEditingCartIndex] = useState(null);
  const [cartQtyModalOpen, setCartQtyModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [cartPriceModalOpen, setCartPriceModalOpen] = useState(false);
  const [modalIsPcs, setModalIsPcs] = useState(false);
  const [modalShowPrice, setModalShowPrice] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState(null);
  const [openItemModalOpen, setOpenItemModalOpen] = useState(false);
  const [editingOpenItem, setEditingOpenItem] = useState(null);
  const [editingOpenItemIndex, setEditingOpenItemIndex] = useState(null);
  const cartTableBodyRef = useRef(null);
  const [mobileCartSheetOpen, setMobileCartSheetOpen] = useState(false);
  const [mobileSidebarDrawerOpen, setMobileSidebarDrawerOpen] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [posScanMode, setPosScanMode] = useState("auto");
  const [stickerModalItems, setStickerModalItems] = useState(null);
  useEffect(() => {
    if (cartTableBodyRef.current && selectedCartIndex >= 0) {
      const row = cartTableBodyRef.current.children[selectedCartIndex];
      if (row && typeof row.scrollIntoView === "function") {
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedCartIndex]);
  const audioCtxRef = useRef(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
      }
    }
    return audioCtxRef.current;
  };
  const playBeep = (freq = 880, duration = 80, type = "sine", gain = 0.4, delay = 0) => {
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
      gainNode.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + delay + duration / 1e3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration / 1e3 + 0.05);
    } catch (e) {
    }
  };
  const playBarcodeSuccess = () => {
    playBeep(1200, 60, "square", 0.3, 0);
    playBeep(1600, 100, "sine", 0.3, 0.07);
  };
  const playBarcodeError = () => {
    playBeep(300, 120, "sawtooth", 0.3, 0);
    playBeep(220, 120, "sawtooth", 0.3, 0.14);
  };
  const [quickEditProduct, setQuickEditProduct] = useState(null);
  const [quickEditPrice, setQuickEditPrice] = useState("");
  const [quickEditStock, setQuickEditStock] = useState("");
  const [quickEditError, setQuickEditError] = useState("");
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [localReceiptSettings, localSetReceiptSettings] = useState(null);
  const receiptSettings = sharedReceiptSettings !== void 0 ? sharedReceiptSettings : localReceiptSettings;
  const setReceiptSettings = sharedSetReceiptSettings !== void 0 ? sharedSetReceiptSettings : localSetReceiptSettings;
  const [localTaxType, localSetTaxType] = useState("intra");
  const taxType = sharedTaxType !== void 0 ? sharedTaxType : localTaxType;
  const setTaxType = sharedSetTaxType !== void 0 ? sharedSetTaxType : localSetTaxType;
  const [localPaymentMode, localSetPaymentMode] = useState("cash");
  const paymentMode = sharedPaymentMode !== void 0 ? sharedPaymentMode : localPaymentMode;
  const setPaymentMode = sharedSetPaymentMode !== void 0 ? sharedSetPaymentMode : localSetPaymentMode;
  const [cashReceived, setCashReceived] = useState("");
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [creditPartialPaidAmount, setCreditPartialPaidAmount] = useState("");
  const [creditPartialPaidMode, setCreditPartialPaidMode] = useState("cash");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [printersList, setPrintersList] = useState([]);
  const [printStatusToast, setPrintStatusToast] = useState(null);
  const [netStatus, setNetStatus] = useState(propNetStatus || {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
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
  const searchInputRef = useRef(null);
  const [cartPosition, setCartPosition] = useState(() => {
    try {
      return receiptSettings?.cart_position || localStorage.getItem("ARISO_POS_CART_POSITION") || "right";
    } catch (e) {
      return "right";
    }
  });
  useEffect(() => {
    if (receiptSettings?.cart_position) {
      setCartPosition(receiptSettings.cart_position);
    }
    const handleCartPosChange = (e) => {
      if (e.detail?.cart_position) {
        setCartPosition(e.detail.cart_position);
      }
    };
    window.addEventListener("cart_position_changed", handleCartPosChange);
    return () => window.removeEventListener("cart_position_changed", handleCartPosChange);
  }, [receiptSettings?.cart_position]);
  const toggleCartPosition = useCallback(() => {
    setCartPosition((prev) => {
      const next = prev === "right" ? "left" : "right";
      try {
        localStorage.setItem("ARISO_POS_CART_POSITION", next);
        window.dispatchEvent(new CustomEvent("cart_position_changed", { detail: { cart_position: next } }));
      } catch (e) {
      }
      return next;
    });
  }, []);
  const [cartPanelWidth, setCartPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("ARISO_POS_CART_WIDTH");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 900) {
          return parsed;
        }
      }
    } catch (e) {
    }
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
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, [cartPanelWidth]);
  useEffect(() => {
    const handleMove = (e) => {
      if (!isResizingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rawDelta = startXRef.current - clientX;
      const delta = cartPosition === "left" ? -rawDelta : rawDelta;
      const minW = 280;
      const maxW = Math.max(380, Math.min(850, window.innerWidth - 320));
      const newWidth = Math.min(maxW, Math.max(minW, startWidthRef.current + delta));
      setCartPanelWidth(newWidth);
    };
    const handleEnd = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizingCart(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        setCartPanelWidth((currentW) => {
          try {
            localStorage.setItem("ARISO_POS_CART_WIDTH", currentW.toString());
          } catch (e) {
          }
          return currentW;
        });
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);
  const autoFocusSearch = useCallback(() => {
    const triggerFocus = () => {
      if (searchInputRef.current) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          searchInputRef.current.focus();
        } else if (document.activeElement === searchInputRef.current) {
        } else if (document.activeElement?.classList?.contains("pos-search-input")) {
          searchInputRef.current.focus();
        }
      }
    };
    requestAnimationFrame(triggerFocus);
    setTimeout(triggerFocus, 40);
    setTimeout(triggerFocus, 150);
    setTimeout(triggerFocus, 350);
    setTimeout(triggerFocus, 600);
  }, []);
  useEffect(() => {
    loadData();
    loadCustomers();
    loadPendingOrders();
    loadHeldReceipts();
    autoFocusSearch();
    const handleWindowFocus = () => {
      autoFocusSearch();
    };
    window.addEventListener("focus", handleWindowFocus);
    if (typeof window !== "undefined" && window.electron?.onGatewayJobStatus) {
      window.electron.onGatewayJobStatus((data) => {
        if (data.status === "SUCCESS") {
          setPrintStatusToast({ type: "success", message: `Gateway: ${data.title} printed successfully!` });
          setTimeout(() => setPrintStatusToast(null), 4e3);
        } else if (data.status === "FAILED") {
          setPrintStatusToast({ type: "error", message: `Gateway Print Failed: ${data.title} (${data.error || "Timeout"})` });
        }
      });
    }
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [token, autoFocusSearch]);
  useEffect(() => {
    if (menuVersion > 0 || categoryVersion > 0) {
      loadData();
    }
  }, [menuVersion, categoryVersion]);
  const loadData = async () => {
    try {
      let [localCats, localItems, localReceipt, localPrinters] = await Promise.all([
        db.categories.toArray().catch(() => []),
        db.menu_items.toArray().catch(() => []),
        db.settings.get("receipt_settings").catch(() => null),
        db.printers.toArray().catch(() => [])
      ]);
      if (!localCats || localCats.length === 0) {
        try {
          const lsCats = localStorage.getItem("ariso_offline_categories");
          if (lsCats) localCats = JSON.parse(lsCats);
        } catch (e) {
        }
      }
      if (!localItems || localItems.length === 0) {
        try {
          const lsItems = localStorage.getItem("ariso_offline_menu_items");
          if (lsItems) localItems = JSON.parse(lsItems);
        } catch (e) {
        }
      }
      if (!localReceipt?.value) {
        try {
          const lsRec = localStorage.getItem("ariso_offline_receipt_settings");
          if (lsRec) localReceipt = { value: JSON.parse(lsRec) };
        } catch (e) {
        }
      }
      if (!localPrinters || localPrinters.length === 0) {
        try {
          const lsPrn = localStorage.getItem("ariso_offline_printers");
          if (lsPrn) localPrinters = JSON.parse(lsPrn);
        } catch (e) {
        }
      }
      if ((!localCats || localCats.length === 0) && (!localItems || localItems.length === 0)) {
        await seedDefaultOfflineDataIfNeeded();
        [localCats, localItems, localReceipt, localPrinters] = await Promise.all([
          db.categories.toArray().catch(() => []),
          db.menu_items.toArray().catch(() => []),
          db.settings.get("receipt_settings").catch(() => null),
          db.printers.toArray().catch(() => [])
        ]);
      }
      if (localCats && localCats.length > 0) setCategories(localCats);
      if (localItems && localItems.length > 0) setMenuItems(localItems);
      if (localReceipt?.value) setReceiptSettings(localReceipt.value);
      if (localPrinters && localPrinters.length > 0) setPrintersList(localPrinters);
      setLoading(false);
    } catch (e) {
      console.warn("[POS] IndexedDB instant load:", e);
      setLoading(false);
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setLoading(false);
      return;
    }
    try {
      const [cats, menu, receiptData, prnData] = await Promise.allSettled([
        fetchMobileCategories(token),
        fetchMobileMenu(token),
        fetchReceiptSettings(token),
        fetchPrinters(token)
      ]);
      if (cats.status === "fulfilled" && cats.value) {
        const catList = Array.isArray(cats.value) ? cats.value : cats.value?.categories || [];
        if (catList.length > 0) setCategories(catList);
      }
      if (menu.status === "fulfilled" && menu.value) {
        const itemList = Array.isArray(menu.value) ? menu.value : menu.value?.items || [];
        if (itemList.length > 0) setMenuItems(itemList);
      }
      if (receiptData.status === "fulfilled" && receiptData.value) {
        setReceiptSettings(receiptData.value);
      }
      let loadedPrns = [];
      if (prnData.status === "fulfilled" && Array.isArray(prnData.value) && prnData.value.length > 0) {
        loadedPrns = prnData.value;
      } else {
        loadedPrns = await db.printers.toArray().catch(() => []);
      }
      if (loadedPrns.length === 0 && window.electron && window.electron.getPrinters) {
        try {
          const sysList = await window.electron.getPrinters();
          if (Array.isArray(sysList) && sysList.length > 0) {
            const virtualKeywords = ["microsoft print to pdf", "onenote", "xps", "fax", "pdf", "nul:"];
            const physicalPrinters = sysList.filter((p) => {
              const n = (p.name || "").toLowerCase();
              const port = (p.portName || "").toLowerCase();
              const drv = (p.driverName || "").toLowerCase();
              const isVirtual = virtualKeywords.some((v) => n.includes(v) || port.includes(v) || drv.includes(v));
              return !isVirtual && !p.workOffline;
            });
            const bestSys = physicalPrinters.find((p) => p.isDefault) || physicalPrinters[0] || sysList.find((p) => p.isDefault) || sysList[0];
            if (bestSys && bestSys.name) {
              loadedPrns = [{
                id: "sys-default",
                name: bestSys.name,
                type: "usb",
                role: "both",
                paper_width: 80,
                is_default_receipt: 1,
                is_default_kot: 1
              }];
            }
          }
        } catch (sysErr) {
          console.warn("[POS] Auto-detected printer query failed:", sysErr);
        }
      }
      setPrintersList(loadedPrns);
    } catch (err) {
      console.warn("[Desktop POS] Error during online background refresh:", err.message);
    } finally {
      setLoading(false);
    }
  };
  const queryLower = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    const list = menuItems.filter((p) => {
      if (selectedCategory && String(p.category_id) !== String(selectedCategory.id)) {
        return false;
      }
      if (!queryLower) return true;
      const matchName = (p.name || "").toLowerCase().includes(queryLower);
      const matchBarcode = (p.barcode || "").toLowerCase().includes(queryLower);
      const matchSku = (p.sku || "").toLowerCase().includes(queryLower);
      const matchCat = (p.category_name || "").toLowerCase().includes(queryLower);
      const matchDesc = (p.description || "").toLowerCase().includes(queryLower);
      return matchName || matchBarcode || matchSku || matchCat || matchDesc;
    });
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [menuItems, selectedCategory, queryLower]);
  const isProductWeightBased = (p) => {
    if (!p) return false;
    if (p.is_weight_based === 1 || p.is_weight_based === true || p.is_weight_based === "1") return true;
    if (p.is_weight_based === 0 || p.is_weight_based === false || p.is_weight_based === "0") return false;
    const u = (p.base_unit || p.unit || "").toLowerCase();
    return ["kg", "gram", "gm", "g", "litre", "ltr", "ml"].includes(u);
  };
  const isProductSerialTracked = useCallback((p) => {
    if (!p) return false;
    const unitType = (p.pos_unit_type || p.item_type || p.itemType || "").toUpperCase().trim();
    if (unitType === "SERIAL" || unitType === "SERIAL NUMBER" || unitType === "SERIALIZED") return true;
    if (unitType === "WEIGHT" || p.is_weight_based === 1 || p.is_weight_based === true || p.is_weight_based === "1") return false;
    if (p.is_serial_tracked === 1 || p.is_serial_tracked === true || p.is_serial_tracked === "1") {
      if (p.sku === "122" || p.barcode === "122" || p.name && p.name.toLowerCase().includes("hdmi")) {
        return true;
      }
    }
    return false;
  }, []);
  const alreadyInCartSerials = useMemo(() => {
    return cart.map((i) => i.serial_number).filter(Boolean);
  }, [cart]);
  const isEnterKeyQtyPopupEnabled = receiptSettings?.enter_key_qty_popup !== void 0 ? Number(receiptSettings.enter_key_qty_popup) === 1 || receiptSettings.enter_key_qty_popup === true || receiptSettings.enter_key_qty_popup === "1" : true;
  const loadCustomers = useCallback(async (query = "") => {
    try {
      const data = await fetchCustomers(query);
      if (Array.isArray(data)) {
        setCustomersList(data);
      }
    } catch (e) {
      console.warn("[POS] Could not load customers:", e.message);
    }
  }, []);
  const handleSelectCustomer = (c) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomerData(c);
    setCustomerName(c.name || "");
    setCustomerPhone(c.phone || "");
    setCustomerAddress(c.address || "");
    setStoreName(c.store_name || "");
    setCustomerGst(c.gst_number || "");
    setCustomerSearchQuery(`${c.store_name ? c.store_name + " - " : ""}${c.name} (${c.phone || "No phone"})`);
    setCustomerDropdownOpen(false);
    if (c.credit_days > 0) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + parseInt(c.credit_days));
      setCreditDueDate(d.toISOString().slice(0, 10));
    } else {
      setCreditDueDate("");
    }
    if (c.gst_number || c.state_code || c.state) {
      const resolved = resolvePlaceOfSupply({
        storeStateCode: receiptSettings?.state_code || "27",
        customerGstin: c.gst_number,
        customerStateCode: c.state_code,
        customerState: c.state
      });
      setTaxType(resolved.taxType);
    }
  };
  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setSelectedCustomerData(null);
    setCreditPartialPaidAmount("");
    setCreditDueDate("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setStoreName("");
    setCustomerGst("");
    setCustomerSearchQuery("");
  };
  const loadPendingOrders = useCallback(async () => {
    setLoadingPendingOrders(true);
    try {
      const data = await fetchPendingOrders();
      if (Array.isArray(data)) {
        setPendingOrders(data);
      }
    } catch (e) {
      console.warn("[POS] Could not load pending orders:", e.message);
    } finally {
      setLoadingPendingOrders(false);
    }
  }, []);
  const loadHeldReceipts = useCallback(async () => {
    setLoadingHeldReceipts(true);
    try {
      const data = await fetchHeldReceipts({ status: "held" });
      if (Array.isArray(data)) {
        setHeldReceipts(data);
      }
    } catch (e) {
      console.warn("[POS] Could not load held receipts:", e.message);
    } finally {
      setLoadingHeldReceipts(false);
    }
  }, []);
  const handleConfirmPending = async (order) => {
    if (!window.confirm(`Confirm Order #${order.unique_order_number || order.id}? This will deduct physical stock.`)) {
      return;
    }
    setConfirmingOrderId(order.id);
    try {
      await confirmPendingOrder(order.id);
      setPrintStatusToast({
        type: "success",
        message: `Order #${order.unique_order_number || order.id} confirmed! Stock deducted.`
      });
      setTimeout(() => setPrintStatusToast(null), 3500);
      await loadData();
      await loadPendingOrders();
    } catch (e) {
      notify?.error("Failed to confirm order: " + (e.message || "Unknown error"), "Order Error");
    } finally {
      setConfirmingOrderId(null);
    }
  };
  const handleCancelPending = async (order) => {
    const reason = window.prompt(`Cancel Order #${order.unique_order_number || order.id}?
Enter reason (reserved stock will be released):`, "Cancelled by staff");
    if (reason === null) return;
    setCancellingOrderId(order.id);
    try {
      await cancelPendingOrder(order.id, reason);
      setPrintStatusToast({
        type: "info",
        message: `Order #${order.unique_order_number || order.id} cancelled. Reserved stock released!`
      });
      setTimeout(() => setPrintStatusToast(null), 3500);
      await loadData();
      await loadPendingOrders();
    } catch (e) {
      notify?.error("Failed to cancel order: " + (e.message || "Unknown error"), "Order Error");
    } finally {
      setCancellingOrderId(null);
    }
  };
  const handleClearCart = useCallback(() => {
    setCart([]);
    setSelectedCartIndex(0);
    setDiscountValue("0");
    handleClearCustomer();
    setActiveHoldId(null);
    setCashReceived("");
    setCheckoutVisible(false);
    setWeightModalVisible(false);
    setCartQtyModalOpen(false);
    setEditingCartItem(null);
    setEditingCartIndex(null);
    setKeyboardHelpVisible(false);
    setLanguageModalVisible(false);
    setQuickEditProduct(null);
    setSearchQuery("");
    autoFocusSearch();
  }, [setCart, setDiscountValue]);
  const isCartItemMatchingProduct = useCallback((cartItem, product) => {
    if (!cartItem || !product || cartItem.is_weight_based || cartItem.is_open_item) return false;
    if (cartItem.serial_number || product.scanned_serial_number) return false;
    const prodId = product.id || product.menu_item_id || product.product_id;
    const prodSku = (product.sku || "").trim().toLowerCase();
    const prodBarcode = (product.barcode || "").trim().toLowerCase();
    const itemProdId = cartItem.product_id;
    const itemSku = (cartItem.sku || "").trim().toLowerCase();
    const itemBarcode = (cartItem.barcode || "").trim().toLowerCase();
    if (prodId && itemProdId && String(prodId) === String(itemProdId)) {
      return true;
    }
    if (prodSku && itemSku && prodSku === itemSku) {
      return true;
    }
    if (prodBarcode && itemBarcode && prodBarcode === itemBarcode) {
      return true;
    }
    return false;
  }, []);
  const addPieceItemToCart = useCallback((product) => {
    const isWholesale = pricingMode === "wholesale";
    const price = isWholesale && product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? parseFloat(product.wholesale_price) : parseFloat(product.price || product.selling_price || 0);
    const prodId = product.id || product.menu_item_id || product.product_id;
    if (product.track_inventory !== 0 && product.current_stock !== null && product.current_stock !== void 0) {
      const physical = parseFloat(product.current_stock || 0);
      const reserved = parseFloat(product.reserved_stock || 0);
      const available = Math.max(0, physical - reserved);
      const inCart = cart.find((item) => isCartItemMatchingProduct(item, product));
      const currentCartQty = inCart ? parseInt(inCart.quantity, 10) || 1 : 0;
      if (currentCartQty + 1 > available) {
        notify?.warning(
          `Requested qty exceeds available stock of ${available} ${product.unit || "pcs"}.`,
          "Stock Limit Reached",
          5e3
        );
        notify?.alert({
          title: "Insufficient Stock",
          message: `Cannot add "${product.name}" to cart.`,
          type: "warning",
          buttonText: "Understood (Enter / Esc)",
          details: {
            requested: `${currentCartQty + 1} ${product.unit || "pcs"}`,
            available: `${available} ${product.unit || "pcs"}`,
            physical: `${physical} ${product.unit || "pcs"}`,
            reserved: `${reserved} ${product.unit || "pcs"}`
          },
          subtitle: physical <= 0 ? "This product is currently completely out of stock in your inventory." : "Units are reserved by other pending or held orders."
        });
        return;
      }
    }
    const existingIdx = cart.findIndex((item) => isCartItemMatchingProduct(item, product) && !item.rate_overridden);
    if (existingIdx > -1) {
      setSelectedCartIndex(existingIdx);
    } else {
      setSelectedCartIndex(cart.length);
    }
    setCart((prevCart) => {
      const idx = prevCart.findIndex((item) => isCartItemMatchingProduct(item, product) && !item.rate_overridden);
      if (idx > -1) {
        const updated = [...prevCart];
        const item = updated[idx];
        const newQty = (parseInt(item.quantity, 10) || 1) + 1;
        const unitPrice = parseFloat(item.price !== void 0 && item.price !== null ? item.price : item.unit_price || price);
        updated[idx] = {
          ...item,
          quantity: newQty,
          total_price: (newQty * unitPrice).toFixed(2)
        };
        return updated;
      } else {
        const newItem = {
          product_id: prodId,
          name: product.name,
          sku: product.sku || "",
          barcode: product.barcode || "",
          price,
          unit_price: price,
          unit_rate: price,
          original_rate: price,
          rate_overridden: false,
          quantity: 1,
          unit: product.base_unit || product.unit || "pcs",
          is_weight_based: false,
          total_price: price.toFixed(2),
          gst_rate: parseFloat(product.gst_rate !== void 0 && product.gst_rate !== null ? product.gst_rate : 5),
          notes: product.scanned_serial_number ? `SN: ${product.scanned_serial_number}` : "",
          serial_number: product.scanned_serial_number || null
        };
        return [...prevCart, newItem];
      }
    });
  }, [setCart, cart, isCartItemMatchingProduct, pricingMode]);
  const addPcsLine = useCallback((product, qty, unitPrice) => {
    const isWholesale = pricingMode === "wholesale";
    const menuPrice = isWholesale && product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? parseFloat(product.wholesale_price) : parseFloat(product.price || product.selling_price || 0);
    const price = parseFloat(unitPrice);
    const prodId = product.id || product.menu_item_id || product.product_id;
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const overridden = Math.abs(price - menuPrice) > 5e-3;
    setCart((prevCart) => {
      const idx = prevCart.findIndex((item) => isCartItemMatchingProduct(item, product) && !item.is_weight_based && !item.serial_number && Math.abs(parseFloat(item.price !== void 0 && item.price !== null ? item.price : item.unit_price) - price) < 5e-3);
      if (idx > -1) {
        const updated = [...prevCart];
        const item = updated[idx];
        const newQty = (parseInt(item.quantity, 10) || 1) + q;
        updated[idx] = { ...item, quantity: newQty, total_price: (newQty * price).toFixed(2) };
        return updated;
      }
      return [...prevCart, {
        product_id: prodId,
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        price,
        unit_price: price,
        unit_rate: price,
        original_rate: menuPrice,
        rate_overridden: overridden,
        quantity: q,
        unit: product.base_unit || product.unit || "pcs",
        is_weight_based: false,
        total_price: (q * price).toFixed(2),
        gst_rate: parseFloat(product.gst_rate !== void 0 && product.gst_rate !== null ? product.gst_rate : 5),
        notes: "",
        serial_number: null
      }];
    });
    setSelectedCartIndex(cart.length);
  }, [setCart, cart.length, isCartItemMatchingProduct, pricingMode]);
  const addWeightLine = useCallback((product, weightKg, rate) => {
    const isWholesale = pricingMode === "wholesale";
    const menuPrice = isWholesale && product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? parseFloat(product.wholesale_price) : parseFloat(product.price || product.selling_price || 0);
    const price = rate !== void 0 && rate !== null ? parseFloat(rate) : menuPrice;
    if (product.track_inventory !== 0 && product.current_stock !== null && product.current_stock !== void 0) {
      const available = Math.max(0, parseFloat(product.current_stock || 0) - parseFloat(product.reserved_stock || 0));
      if (weightKg > available) {
        notify?.warning(
          `Requested ${weightKg.toFixed(3)} kg exceeds available stock of ${available.toFixed(3)} kg.`,
          "Stock Limit Exceeded",
          5e3
        );
        return false;
      }
    }
    const unit = product.base_unit || product.unit || "kg";
    setCart((prevCart) => [...prevCart, {
      product_id: product.id || product.menu_item_id,
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      price,
      unit_price: price,
      base_unit_price: price,
      original_rate: menuPrice,
      unit_rate: price,
      rate_overridden: Math.abs(price - menuPrice) > 5e-3,
      item_weight: weightKg,
      displayWeight: weightKg,
      weight_unit: unit,
      unit,
      quantity: 1,
      is_weight_based: true,
      total_price: (weightKg * price).toFixed(2),
      gst_rate: parseFloat(product.gst_rate !== void 0 && product.gst_rate !== null ? product.gst_rate : 5),
      notes: "",
      serial_number: null
    }]);
    setSelectedCartIndex(cart.length);
    return true;
  }, [setCart, cart.length, pricingMode, notify]);
  const handleSelectProduct = useCallback((product, fromEnterKey = false) => {
    if (!product) return;
    if (product.not_for_sale === 1 || product.not_for_sale === true || product.not_for_sale === "1") {
      notify?.warning(`"${product.name}" is marked Not For Sale.`, "Not For Sale");
      playBarcodeError();
      return;
    }
    const isWeight = isProductWeightBased(product);
    if (!isWeight && isProductSerialTracked(product)) {
      setSelectedSerialProduct(product);
      setSerialModalVisible(true);
      return;
    }
    const truthy = (v) => v === 1 || v === true || v === "1";
    const isQ = truthy(product.open_qty_popup);
    const isP = truthy(product.open_price_popup);
    const legacyEnterQty = !isQ && !isP && !isWeight && fromEnterKey && isEnterKeyQtyPopupEnabled && !cart.some((item) => isCartItemMatchingProduct(item, product));
    if (isQ || legacyEnterQty) {
      setSelectedWeightProduct(product);
      setEditingCartIndex(null);
      setModalIsPcs(!isWeight);
      setModalShowPrice(isP);
      setWeightModalVisible(true);
      return;
    }
    if (isP) {
      setEditingPriceItem(product);
      setCartPriceModalOpen(true);
      return;
    }
    if (isWeight) {
      if (!addWeightLine(product, 1)) return;
    } else {
      addPieceItemToCart(product);
    }
    setSearchQuery("");
    autoFocusSearch();
  }, [cart, isEnterKeyQtyPopupEnabled, isCartItemMatchingProduct, isProductWeightBased, isProductSerialTracked, addPieceItemToCart, addWeightLine, notify, autoFocusSearch]);
  const handleSerialConfirm = useCallback((selectedSerials, product) => {
    if (!product || !Array.isArray(selectedSerials) || selectedSerials.length === 0) return;
    selectedSerials.forEach((sn) => {
      addPieceItemToCart({
        ...product,
        scanned_serial_number: sn,
        serial_number: sn
      });
    });
    setSerialModalVisible(false);
    setSelectedSerialProduct(null);
    setSearchQuery("");
    autoFocusSearch();
    playBarcodeSuccess();
  }, [addPieceItemToCart, autoFocusSearch]);
  const handleWeightConfirm = (weightData) => {
    const {
      product,
      weightInKg,
      displayWeight,
      unit,
      pricePerBaseUnit,
      original_rate,
      originalRate,
      unit_rate,
      rate_overridden,
      calculatedTotal
    } = weightData;
    if (weightData.isPcs && product) {
      const qty = parseInt(weightData.quantity, 10) || 1;
      const rate = parseFloat(weightData.pricePerBaseUnit);
      if (product.track_inventory !== 0 && product.current_stock !== null && product.current_stock !== void 0) {
        const available = Math.max(0, parseFloat(product.current_stock || 0) - parseFloat(product.reserved_stock || 0));
        const inCartQty = cart.filter((item) => isCartItemMatchingProduct(item, product) && !item.is_weight_based).reduce((s, item) => s + (parseInt(item.quantity, 10) || 0), 0);
        if (inCartQty + qty > available) {
          notify?.warning(
            `Requested qty exceeds available stock of ${available} ${product.unit || "pcs"}.`,
            "Stock Limit Reached",
            5e3
          );
          return;
        }
      }
      addPcsLine(product, qty, rate);
      setWeightModalVisible(false);
      setSelectedWeightProduct(null);
      setEditingCartIndex(null);
      setSearchQuery("");
      autoFocusSearch();
      return;
    }
    if (product && product.track_inventory !== 0 && product.current_stock !== null && product.current_stock !== void 0) {
      const physical = parseFloat(product.current_stock || 0);
      const reserved = parseFloat(product.reserved_stock || 0);
      const available = Math.max(0, physical - reserved);
      if (weightInKg > available) {
        notify?.warning(
          `Requested ${weightInKg.toFixed(3)} kg exceeds available stock of ${available.toFixed(3)} kg.`,
          "Stock Limit Exceeded",
          5e3
        );
        notify?.alert({
          title: "Insufficient Stock",
          message: `Cannot add "${product.name}" to cart.`,
          type: "warning",
          buttonText: "Understood (Enter / Esc)",
          details: {
            requested: `${weightInKg.toFixed(3)} kg`,
            available: `${available.toFixed(3)} kg`,
            physical: `${physical.toFixed(3)} kg`,
            reserved: `${reserved.toFixed(3)} kg`
          },
          subtitle: physical <= 0 ? "This product is currently completely out of stock in your warehouse." : "Portions of this stock are reserved by other pending or held orders."
        });
        return;
      }
    }
    const effectiveRate = parseFloat(pricePerBaseUnit);
    const origRate = original_rate !== void 0 && original_rate !== null ? parseFloat(original_rate) : originalRate !== void 0 && originalRate !== null ? parseFloat(originalRate) : effectiveRate;
    const isOverridden = rate_overridden !== void 0 ? Boolean(rate_overridden) : Math.abs(effectiveRate - origRate) > 5e-3;
    const finalTotal = typeof calculatedTotal === "number" ? calculatedTotal.toFixed(2) : parseFloat(calculatedTotal || weightInKg * effectiveRate).toFixed(2);
    if (editingCartIndex !== null && editingCartIndex >= 0 && editingCartIndex < cart.length) {
      setCart((prevCart) => {
        const updated = [...prevCart];
        updated[editingCartIndex] = {
          ...updated[editingCartIndex],
          item_weight: weightInKg,
          displayWeight,
          weight_unit: unit,
          unit,
          base_unit_price: effectiveRate,
          price: effectiveRate,
          unit_price: effectiveRate,
          unit_rate: effectiveRate,
          original_rate: origRate,
          rate_overridden: isOverridden,
          total_price: finalTotal
        };
        return updated;
      });
    } else {
      setCart((prevCart) => [
        ...prevCart,
        {
          product_id: product.id || product.menu_item_id,
          name: product.name,
          sku: product.sku || "",
          barcode: product.barcode || "",
          price: effectiveRate,
          unit_price: effectiveRate,
          base_unit_price: effectiveRate,
          original_rate: origRate,
          unit_rate: effectiveRate,
          rate_overridden: isOverridden,
          item_weight: weightInKg,
          displayWeight,
          weight_unit: unit,
          unit,
          quantity: 1,
          is_weight_based: true,
          total_price: finalTotal,
          gst_rate: parseFloat(product.gst_rate !== void 0 && product.gst_rate !== null ? product.gst_rate : 5),
          notes: product.scanned_serial_number ? `SN: ${product.scanned_serial_number}` : product.notes || "",
          serial_number: product.scanned_serial_number || product.serial_number || null
        }
      ]);
    }
    setWeightModalVisible(false);
    setSelectedWeightProduct(null);
    setEditingCartIndex(null);
    setSearchQuery("");
    autoFocusSearch();
  };
  const handleSaveCartQty = (qtyOrData) => {
    let newQty = 1;
    let customRate = null;
    let customOrigRate = null;
    let customRateOverridden = null;
    if (typeof qtyOrData === "object" && qtyOrData !== null) {
      newQty = parseFloat(qtyOrData.quantity || 1);
      customRate = qtyOrData.rate !== void 0 ? parseFloat(qtyOrData.rate) : qtyOrData.price !== void 0 ? parseFloat(qtyOrData.price) : null;
      customOrigRate = qtyOrData.original_rate !== void 0 ? parseFloat(qtyOrData.original_rate) : qtyOrData.originalRate !== void 0 ? parseFloat(qtyOrData.originalRate) : null;
      customRateOverridden = qtyOrData.rate_overridden !== void 0 ? Boolean(qtyOrData.rate_overridden) : qtyOrData.rateOverridden !== void 0 ? Boolean(qtyOrData.rateOverridden) : null;
    } else {
      newQty = parseFloat(qtyOrData || 1);
    }
    if (editingCartIndex !== null && editingCartIndex >= 0 && editingCartIndex < cart.length) {
      setCart((prevCart) => {
        const updated = [...prevCart];
        const item = updated[editingCartIndex];
        const unitPrice = customRate !== null ? customRate : parseFloat(item.price || item.unit_price || 0);
        const origRate = customOrigRate !== null ? customOrigRate : item.original_rate !== void 0 ? parseFloat(item.original_rate) : unitPrice;
        const isOverridden = customRateOverridden !== null ? customRateOverridden : Math.abs(unitPrice - origRate) > 5e-3;
        updated[editingCartIndex] = {
          ...item,
          quantity: newQty,
          price: unitPrice,
          unit_price: unitPrice,
          unit_rate: unitPrice,
          original_rate: origRate,
          rate_overridden: isOverridden,
          total_price: (newQty * unitPrice).toFixed(2)
        };
        return updated;
      });
    } else if (editingCartItem) {
      const product = editingCartItem;
      const isWholesale = pricingMode === "wholesale";
      const defaultMenuPrice = isWholesale && product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? parseFloat(product.wholesale_price) : parseFloat(product.price || product.selling_price || product.unit_price || 0);
      const finalPrice = customRate !== null ? customRate : defaultMenuPrice;
      const origRate = customOrigRate !== null ? customOrigRate : defaultMenuPrice;
      const isOverridden = customRateOverridden !== null ? customRateOverridden : Math.abs(finalPrice - origRate) > 5e-3;
      const prodId = product.id || product.menu_item_id || product.product_id;
      setCart((prevCart) => {
        const idx = !isOverridden ? prevCart.findIndex((item) => isCartItemMatchingProduct(item, product) && !item.rate_overridden) : -1;
        if (idx > -1) {
          const updated = [...prevCart];
          const item = updated[idx];
          const unitPrice = parseFloat(item.price !== void 0 && item.price !== null ? item.price : item.unit_price || finalPrice);
          updated[idx] = {
            ...item,
            quantity: newQty,
            total_price: (newQty * unitPrice).toFixed(2)
          };
          return updated;
        } else {
          const newItem = {
            product_id: prodId,
            name: product.name,
            sku: product.sku || "",
            barcode: product.barcode || "",
            price: finalPrice,
            unit_price: finalPrice,
            unit_rate: finalPrice,
            original_rate: origRate,
            rate_overridden: isOverridden,
            quantity: newQty,
            unit: product.base_unit || product.unit || "pcs",
            is_weight_based: false,
            total_price: (newQty * finalPrice).toFixed(2),
            gst_rate: parseFloat(product.gst_rate !== void 0 && product.gst_rate !== null ? product.gst_rate : 5),
            notes: "",
            serial_number: product.serial_number || null
          };
          return [...prevCart, newItem];
        }
      });
    }
    setCartQtyModalOpen(false);
    setEditingCartItem(null);
    setEditingCartIndex(null);
    setSearchQuery("");
    autoFocusSearch();
  };
  const handleSaveCartPrice = (newPrice) => {
    if (!editingPriceItem) return;
    const product = editingPriceItem;
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    if (isProductWeightBased(product)) {
      if (!addWeightLine(product, 1, price)) return;
    } else {
      addPcsLine(product, 1, price);
    }
    setCartPriceModalOpen(false);
    setEditingPriceItem(null);
    setSearchQuery("");
    autoFocusSearch();
  };
  const handleOpenAddOpenItem = useCallback(() => {
    setEditingOpenItem(null);
    setEditingOpenItemIndex(null);
    setOpenItemModalOpen(true);
  }, []);
  const handleSaveOpenItem = useCallback((itemData) => {
    const {
      name,
      price,
      quantity,
      unit,
      gst_rate,
      is_tax_exempt,
      hsn_code,
      discount_amount,
      discount_type,
      discount_value,
      linked_product,
      total_price
    } = itemData;
    const linkedProd = linked_product || null;
    const prodId = linkedProd ? linkedProd.id || linkedProd.menu_item_id : null;
    const numericQty = parseFloat(quantity) || 1;
    const unitPrice = parseFloat(price);
    if (linkedProd && linkedProd.track_inventory !== 0 && linkedProd.current_stock !== null && linkedProd.current_stock !== void 0) {
      const available = Math.max(0, parseFloat(linkedProd.current_stock || 0) - parseFloat(linkedProd.reserved_stock || 0));
      const inCartQty = cart.filter((item, i) => i !== editingOpenItemIndex && isCartItemMatchingProduct(item, linkedProd)).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      if (inCartQty + numericQty > available) {
        notify?.warning(
          `Requested qty (${numericQty}) exceeds available stock of ${available} ${linkedProd.unit || "pcs"}.`,
          "Stock Limit Reached",
          5e3
        );
        return;
      }
    }
    const newItem = {
      product_id: prodId,
      menu_item_id: prodId,
      name: name.trim(),
      sku: linkedProd?.sku || "CUSTOM",
      barcode: linkedProd?.barcode || "",
      price: unitPrice,
      unit_price: unitPrice,
      unit_rate: unitPrice,
      original_rate: unitPrice,
      rate_overridden: false,
      quantity: numericQty,
      unit: unit || linkedProd?.unit || "pcs",
      is_weight_based: Boolean(linkedProd?.is_weight_based),
      is_open_item: true,
      is_stock_linked: Boolean(linkedProd),
      linked_product_name: linkedProd?.name || null,
      hsn_code: hsn_code || null,
      gst_rate: is_tax_exempt ? 0 : parseFloat(gst_rate || 0),
      is_tax_exempt: Boolean(is_tax_exempt),
      discount_amount: parseFloat(discount_amount || 0),
      discount_type: discount_type || "amount",
      discount_value: parseFloat(discount_value || 0),
      total_price: parseFloat(total_price).toFixed(2),
      notes: linkedProd ? `Linked: ${linkedProd.name}` : "Open Item"
    };
    if (editingOpenItemIndex !== null && editingOpenItemIndex >= 0 && editingOpenItemIndex < cart.length) {
      setCart((prevCart) => {
        const updated = [...prevCart];
        updated[editingOpenItemIndex] = newItem;
        return updated;
      });
      setSelectedCartIndex(editingOpenItemIndex);
      notify?.success(`Updated "${newItem.name}" in cart.`, "Item Updated");
    } else {
      setCart((prevCart) => [...prevCart, newItem]);
      setSelectedCartIndex(cart.length);
      notify?.success(`Added "${newItem.name}" to cart.`, "Item Added");
    }
    setOpenItemModalOpen(false);
    setEditingOpenItem(null);
    setEditingOpenItemIndex(null);
    setSearchQuery("");
    autoFocusSearch();
  }, [cart, editingOpenItemIndex, isCartItemMatchingProduct, notify, autoFocusSearch, setCart]);
  const openCartItemEdit = (index) => {
    const idx = index !== void 0 && index !== null ? index : selectedCartIndex;
    const item = cart[idx];
    if (!item) return;
    setSelectedCartIndex(idx);
    setEditingCartIndex(idx);
    if (item.is_open_item) {
      setEditingOpenItem(item);
      setEditingOpenItemIndex(idx);
      setOpenItemModalOpen(true);
    } else if (item.is_weight_based) {
      const catalogItem = (menuItems || []).find((p) => (p.id || p.menu_item_id) === (item.product_id || item.id));
      setSelectedWeightProduct({
        id: item.product_id,
        name: item.name,
        price: item.price,
        selling_price: item.price,
        original_rate: item.original_rate !== void 0 ? item.original_rate : catalogItem?.price || item.base_unit_price || item.price,
        unit: item.weight_unit || item.unit || "kg",
        base_unit: item.weight_unit || item.unit || "kg",
        is_weight_based: true,
        gst_rate: item.gst_rate,
        purchase_price: catalogItem?.purchase_price || item.purchase_price,
        cost_price: catalogItem?.cost_price || item.cost_price
      });
      setWeightModalVisible(true);
    } else {
      setEditingCartItem(item);
      setCartQtyModalOpen(true);
    }
  };
  const removeCartItem = (index) => {
    setSelectedCartIndex((prevIdx) => {
      const nextLen = cart.length - 1;
      if (nextLen <= 0) return 0;
      return Math.max(0, Math.min(index, nextLen - 1));
    });
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };
  const updateCartQty = (index, delta) => {
    if (!cart || index < 0 || index >= cart.length) return;
    const item = cart[index];
    if (!item || item.is_weight_based || item.serial_number) return;
    const currentQty = parseFloat(item.quantity) || 1;
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeCartItem(index);
      return;
    }
    const unitPrice = parseFloat(item.price !== void 0 && item.price !== null ? item.price : item.unit_price || item.selling_price || 0);
    let discountAmt = parseFloat(item.discount_amount || 0);
    if (item.is_open_item && item.discount_type === "percentage" && parseFloat(item.discount_value) > 0) {
      discountAmt = newQty * unitPrice * Math.min(100, parseFloat(item.discount_value)) / 100;
    }
    const lineTotal = Math.max(0, newQty * unitPrice - discountAmt);
    setCart((prevCart) => {
      if (!prevCart || index < 0 || index >= prevCart.length) return prevCart;
      const updated = [...prevCart];
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        discount_amount: discountAmt,
        total_price: lineTotal.toFixed(2)
      };
      return updated;
    });
  };
  const findMatchingProduct = useCallback((rawCode, allowSkuFallback = true) => {
    if (!rawCode || !menuItems || menuItems.length === 0) return null;
    const clean = String(rawCode).trim().toLowerCase();
    if (!clean) return null;
    let match = menuItems.find((p) => {
      const b = String(p.barcode || "").trim().toLowerCase();
      return b && b === clean;
    });
    if (match) return match;
    match = menuItems.find((p) => {
      const id = String(p.id || p.menu_item_id || "").trim().toLowerCase();
      if (!id) return false;
      return clean === `prd${id}` || clean === `prd-${id}` || clean === id;
    });
    if (match) return match;
    match = menuItems.find((p) => {
      const b = String(p.barcode || "").trim().replace(/^0+/, "").toLowerCase();
      const c = clean.replace(/^0+/, "");
      return b && c && b === c;
    });
    if (match) return match;
    if (allowSkuFallback) {
      match = menuItems.find((p) => {
        const s = String(p.sku || "").trim().toLowerCase();
        return s && s === clean;
      });
      if (match) return match;
    }
    return null;
  }, [menuItems]);
  const handleBarcodeScanAdd = useCallback((product) => {
    if (!product) return;
    if (product.not_for_sale === 1 || product.not_for_sale === true || product.not_for_sale === "1") {
      notify?.warning(`"${product.name}" is marked Not For Sale.`, "Not For Sale");
      playBarcodeError();
      return;
    }
    if (product.scanned_serial_number && !isProductWeightBased(product)) {
      addPieceItemToCart(product);
      setSearchQuery("");
      autoFocusSearch();
      playBarcodeSuccess();
      return;
    }
    const truthy = (v) => v === 1 || v === true || v === "1";
    const opensPopup = truthy(product.open_qty_popup) || truthy(product.open_price_popup) || !isProductWeightBased(product) && isProductSerialTracked(product);
    handleSelectProduct(product, false);
    if (!opensPopup) playBarcodeSuccess();
  }, [handleSelectProduct, addPieceItemToCart, isProductWeightBased, isProductSerialTracked, autoFocusSearch, notify]);
  useEffect(() => {
    let buffer = "";
    let timeoutId = null;
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Enter") {
        const candidate = buffer.trim();
        if (candidate.length >= 2) {
          if (posScanMode === "serial") {
            if (/^\d{8}$/.test(candidate)) {
              e.preventDefault();
              e.stopPropagation();
              apiFetch(`/api/serial-numbers/lookup?sn=${candidate}`).then((res) => res.json()).then((sData) => {
                if (sData.success && sData.data && !sData.data.is_sold) {
                  const prod = menuItems.find((p) => (p.id || p.menu_item_id) === sData.data.product.id) || sData.data.product;
                  handleBarcodeScanAdd({ ...prod, scanned_serial_number: sData.data.serial_number });
                } else if (sData.success && sData.data && sData.data.is_sold) {
                  playBarcodeError();
                  notify?.error(`Serial #${candidate} is already sold.`, "Serial Sold");
                } else {
                  playBarcodeError();
                  notify?.error(`Serial #${candidate} not found.`, "Invalid Serial");
                }
              }).catch(() => playBarcodeError());
              buffer = "";
              clearTimeout(timeoutId);
              return;
            } else {
              playBarcodeError();
              notify?.error(`Serial Number must be 8 digits (scanned: ${candidate})`, "Serial Mode Error");
              buffer = "";
              clearTimeout(timeoutId);
              return;
            }
          }
          if (posScanMode === "barcode") {
            const barcodeMatch = findMatchingProduct(candidate, false);
            if (barcodeMatch) {
              e.preventDefault();
              e.stopPropagation();
              handleBarcodeScanAdd(barcodeMatch);
              buffer = "";
              clearTimeout(timeoutId);
              return;
            } else {
              playBarcodeError();
              notify?.error(`No product barcode matching: ${candidate}`, "Barcode Not Found");
              buffer = "";
              clearTimeout(timeoutId);
              return;
            }
          }
          const exactBarcode = findMatchingProduct(candidate, false);
          if (exactBarcode) {
            e.preventDefault();
            e.stopPropagation();
            handleBarcodeScanAdd(exactBarcode);
            buffer = "";
            clearTimeout(timeoutId);
            return;
          }
          if (/^\d{8}$/.test(candidate)) {
            e.preventDefault();
            e.stopPropagation();
            apiFetch(`/api/serial-numbers/lookup?sn=${candidate}`).then((res) => res.json()).then((sData) => {
              if (sData.success && sData.data && !sData.data.is_sold) {
                const prod = menuItems.find((p) => (p.id || p.menu_item_id) === sData.data.product.id) || sData.data.product;
                handleBarcodeScanAdd({ ...prod, scanned_serial_number: sData.data.serial_number });
              } else if (sData.success && sData.data && sData.data.is_sold) {
                playBarcodeError();
              }
            }).catch(() => {
            });
            buffer = "";
            clearTimeout(timeoutId);
            return;
          }
          const skuMatch = findMatchingProduct(candidate, true);
          if (skuMatch) {
            e.preventDefault();
            e.stopPropagation();
            handleBarcodeScanAdd(skuMatch);
            buffer = "";
            clearTimeout(timeoutId);
            return;
          }
        }
        buffer = "";
        clearTimeout(timeoutId);
        return;
      }
      if (e.key && e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          buffer = "";
        }, 80);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      clearTimeout(timeoutId);
    };
  }, [findMatchingProduct, handleBarcodeScanAdd, posScanMode, menuItems, notify]);
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!queryLower) return;
    if (posScanMode === "serial") {
      if (/^\d{8}$/.test(queryLower)) {
        apiFetch(`/api/serial-numbers/lookup?sn=${queryLower}`).then((res) => res.json()).then((sData) => {
          if (sData.success && sData.data && !sData.data.is_sold) {
            const prod = menuItems.find((p) => (p.id || p.menu_item_id) === sData.data.product.id) || sData.data.product;
            handleBarcodeScanAdd({ ...prod, scanned_serial_number: sData.data.serial_number });
          } else if (sData.success && sData.data && sData.data.is_sold) {
            playBarcodeError();
            notify?.error(`Serial #${queryLower} is already sold (${sData.data.sale?.invoice || "Order"}).`, "Already Sold");
          } else {
            playBarcodeError();
            notify?.error(`No active product found for serial #${queryLower}`, "Not Found");
          }
        }).catch(() => playBarcodeError());
      } else {
        playBarcodeError();
        notify?.error(`Serial Number must be 8 digits (entered: ${queryLower})`, "Serial Mode");
      }
      return;
    }
    if (posScanMode === "barcode") {
      const barcodeMatch = findMatchingProduct(queryLower, false);
      if (barcodeMatch) {
        handleBarcodeScanAdd(barcodeMatch);
        return;
      } else if (filteredProducts.length > 0) {
        handleSelectProduct(filteredProducts[selectedProductIndex] || filteredProducts[0], false);
        return;
      } else {
        playBarcodeError();
        notify?.error(`No product barcode matching: ${queryLower}`, "Barcode Not Found");
        return;
      }
    }
    const exactBarcode = findMatchingProduct(queryLower, false);
    if (exactBarcode) {
      handleBarcodeScanAdd(exactBarcode);
    } else if (/^\d{8}$/.test(queryLower)) {
      apiFetch(`/api/serial-numbers/lookup?sn=${queryLower}`).then((res) => res.json()).then((sData) => {
        if (sData.success && sData.data && !sData.data.is_sold) {
          const prod = menuItems.find((p) => (p.id || p.menu_item_id) === sData.data.product.id) || sData.data.product;
          handleBarcodeScanAdd({ ...prod, scanned_serial_number: sData.data.serial_number });
        } else if (sData.success && sData.data && sData.data.is_sold) {
          playBarcodeError();
          notify?.error(`Serial #${queryLower} is already sold (${sData.data.sale?.invoice || "Order"}).`, "Already Sold");
        } else {
          playBarcodeError();
          notify?.error(`No active product found for serial #${queryLower}`, "Not Found");
        }
      }).catch(() => playBarcodeError());
    } else {
      const skuOrIdMatch = findMatchingProduct(queryLower, true);
      if (skuOrIdMatch) {
        handleBarcodeScanAdd(skuOrIdMatch);
      } else if (filteredProducts.length > 0) {
        handleSelectProduct(filteredProducts[selectedProductIndex] || filteredProducts[0], false);
      } else {
        playBarcodeError();
      }
    }
  };
  const handleCameraBarcodeScan = async (scannedCode) => {
    if (!scannedCode) return { success: false, message: "No barcode detected" };
    const clean = String(scannedCode).trim();
    if (!clean) return { success: false, message: "Empty input" };
    if (/^\d{8}$/.test(clean)) {
      try {
        const res = await apiFetch(`/api/serial-numbers/lookup?sn=${clean}`);
        const sData = await res.json();
        if (sData.success && sData.data) {
          if (sData.data.is_sold) {
            playBarcodeError();
            const invoiceRef = sData.data.sale?.invoice || "Past Order";
            notify?.error(`Serial #${clean} is already sold (${invoiceRef}).`, "Already Sold");
            return { success: false, message: `Serial #${clean} is already SOLD (${invoiceRef})` };
          }
          const alreadyInCart = cart.some((it) => it.serial_number === clean || it.scanned_serial_number === clean);
          if (alreadyInCart) {
            playBarcodeError();
            notify?.warning(`Serial #${clean} is already added in your active cart.`, "Already In Cart");
            return { success: false, message: `Serial #${clean} already in cart` };
          }
          const prod = menuItems.find((p) => (p.id || p.menu_item_id) === sData.data.product.id) || sData.data.product;
          handleBarcodeScanAdd({ ...prod, scanned_serial_number: sData.data.serial_number });
          return { success: true, message: `Added ${prod.name} (SN: ${clean}) to cart` };
        }
      } catch (snErr) {
        console.warn("[Camera Scan] Serial lookup exception, proceeding to barcode check:", snErr);
      }
      const barcodeMatch = findMatchingProduct(clean, false);
      if (barcodeMatch) {
        handleBarcodeScanAdd(barcodeMatch);
        return { success: true, message: `Added ${barcodeMatch.name} to cart` };
      }
      const skuMatch = findMatchingProduct(clean, true);
      if (skuMatch) {
        handleBarcodeScanAdd(skuMatch);
        return { success: true, message: `Added ${skuMatch.name} to cart` };
      }
      playBarcodeError();
      notify?.error(`Serial / Barcode #${clean} not found in inventory.`, "Not Found");
      return { success: false, message: `Serial / Barcode #${clean} not found` };
    }
    const matchedBarcode = findMatchingProduct(clean, false);
    if (matchedBarcode) {
      handleBarcodeScanAdd(matchedBarcode);
      return { success: true, message: `Added ${matchedBarcode.name} to cart` };
    }
    const skuFallback = findMatchingProduct(clean, true);
    if (skuFallback) {
      handleBarcodeScanAdd(skuFallback);
      return { success: true, message: `Added ${skuFallback.name} to cart` };
    }
    try {
      const res = await apiFetch(`/api/serial-numbers/lookup?sn=${clean}`);
      const sData = await res.json();
      if (sData.success && sData.data) {
        if (sData.data.is_sold) {
          playBarcodeError();
          notify?.error(`Serial #${clean} is already sold.`, "Already Sold");
          return { success: false, message: `Serial #${clean} is already sold` };
        }
        const alreadyInCart = cart.some((it) => it.serial_number === clean || it.scanned_serial_number === clean);
        if (alreadyInCart) {
          playBarcodeError();
          notify?.warning(`Serial #${clean} is already added in your active cart.`, "Already In Cart");
          return { success: false, message: `Serial #${clean} already in cart` };
        }
        const prod = menuItems.find((p) => (p.id || p.menu_item_id) === sData.data.product.id) || sData.data.product;
        handleBarcodeScanAdd({ ...prod, scanned_serial_number: sData.data.serial_number });
        return { success: true, message: `Added ${prod.name} (SN: ${clean}) to cart` };
      }
    } catch (_) {
    }
    playBarcodeError();
    notify?.error(`No product barcode or serial number matching: "${clean}"`, "Not Found");
    return { success: false, message: `No item found for "${clean}"` };
  };
  const longPressTimer = useRef(null);
  const isLongPressedRef = useRef(false);
  const openQuickEdit = (product) => {
    setQuickEditProduct(product);
    setQuickEditPrice(product.price !== void 0 ? product.price.toString() : "");
    setQuickEditStock(product.current_stock !== void 0 ? product.current_stock.toString() : "0");
    setQuickEditError("");
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
      setQuickEditError("Price must be greater than or equal to 0.");
      return;
    }
    if (isNaN(stockVal) || stockVal < 0) {
      setQuickEditError("Stock quantity must be greater than or equal to 0.");
      return;
    }
    setSavingQuickEdit(true);
    setQuickEditError("");
    try {
      const res = await apiFetch(`/api/menu/${quickEditProduct.id}`, {
        method: "PUT",
        body: {
          price: priceVal,
          current_stock: stockVal
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update item.");
      setMenuItems(
        (prev) => prev.map(
          (item) => item.id === quickEditProduct.id ? { ...item, price: priceVal, current_stock: stockVal } : item
        )
      );
      notify?.success(`Product "${quickEditProduct.name}" updated successfully.`, "Product Updated");
      setQuickEditProduct(null);
    } catch (err) {
      setQuickEditError(err.message);
    } finally {
      setSavingQuickEdit(false);
    }
  };
  const subtotal = cart.reduce((acc, item) => acc + parseFloat(item.total_price || 0), 0);
  const numDiscVal = parseFloat(discountValue || 0);
  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = subtotal * (Math.min(numDiscVal, 100) / 100);
  } else {
    discountAmount = Math.min(numDiscVal, subtotal);
  }
  const isGstEnabled = receiptSettings ? receiptSettings.gst_enabled === 1 || receiptSettings.gst_enabled === true || receiptSettings.gst_enabled === "true" : true;
  const gstMode = receiptSettings?.gst_mode || "excluded";
  const isComposition = receiptSettings?.gst_registration_type === "composition";
  const docTax = calculateDocumentTax({
    items: cart.map((item) => ({
      ...item,
      price: parseFloat(item.price || 0),
      quantity: item.is_weight_based ? parseFloat(item.item_weight) || 1 : parseFloat(item.quantity) || 1,
      gst_rate: isGstEnabled ? parseFloat(item.gst_rate !== void 0 ? item.gst_rate : 5) : 0,
      is_tax_exempt: Boolean(item.is_tax_exempt),
      hsn_code: item.hsn_code || item.hsnCode || null
    })),
    orderDiscountType: discountType,
    orderDiscountValue: numDiscVal,
    gstMode,
    taxType,
    additionalCharges: 0,
    isComposition,
    storeStateCode: receiptSettings?.state_code || "27",
    customerGstin: customerGst
  });
  const cartWithTax = docTax.items.map((item) => ({
    ...item,
    discount_amount: item.discountAmount,
    tax_amount: item.totalTax
  }));
  const taxAmount = docTax.totalTax;
  const taxableAmount = docTax.taxableAmount;
  const displaySubtotal = docTax.subtotal;
  const cgstAmount = docTax.cgstAmount;
  const sgstAmount = docTax.sgstAmount;
  const igstAmount = docTax.igstAmount;
  const grandTotal = docTax.grandTotal;
  const roundOff = docTax.roundOff;
  const taxInvoiceType = docTax.taxInvoiceType;
  const numericCashReceived = parseFloat(cashReceived || "0");
  const changeToReturn = Math.max(0, numericCashReceived - grandTotal);
  const totalCartCount = cart.reduce((acc, item) => acc + (item.is_weight_based ? 1 : parseInt(item.quantity, 10) || 1), 0);
  const handleCompleteSale = async (overridePaymentMode = null, overrideWorkflow = null, targetStatus = "completed") => {
    if (submittingSale) return;
    if (cart.length === 0) {
      return;
    }
    const effectivePaymentMode = overridePaymentMode || paymentMode || "cash";
    if (effectivePaymentMode === "credit" || effectivePaymentMode === "due" || effectivePaymentMode === "udhar") {
      if (!selectedCustomerId) {
        notify?.warning("Please select a customer for Credit/Udhar sale.", "Customer Required");
        return;
      }
    }
    let effectiveCashReceived = numericCashReceived;
    if (effectivePaymentMode === "cash" && targetStatus !== "pending" && (effectiveCashReceived <= 0 || effectiveCashReceived < grandTotal)) {
      effectiveCashReceived = grandTotal;
    }
    setPaymentMode(effectivePaymentMode);
    setSubmittingSale(true);
    const isPendingOrder = targetStatus === "pending";
    const isCreditSale = effectivePaymentMode === "credit" || effectivePaymentMode === "due" || effectivePaymentMode === "udhar";
    const immediatePaid = isCreditSale ? Math.max(0, Math.min(grandTotal, parseFloat(creditPartialPaidAmount || 0))) : effectivePaymentMode === "cash" ? effectiveCashReceived : grandTotal;
    const remainingCredit = Math.max(0, grandTotal - immediatePaid);
    let paymentDetails = null;
    if (isCreditSale) {
      if (immediatePaid > 0) {
        paymentDetails = [
          { mode: creditPartialPaidMode || "cash", amount: immediatePaid },
          { mode: "credit", amount: remainingCredit }
        ];
      } else {
        paymentDetails = [
          { mode: "credit", amount: grandTotal }
        ];
      }
    }
    const orderPayload = {
      items: cartWithTax.map((i) => ({
        menu_item_id: i.product_id || i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity || 1,
        item_weight: i.item_weight || null,
        weight_unit: i.weight_unit || i.unit || "pcs",
        is_weight_based: i.is_weight_based ? 1 : 0,
        total_price: i.total_price || parseFloat(i.price) * (parseFloat(i.quantity) || 1),
        gst_rate: i.gstRate !== void 0 ? i.gstRate : parseFloat(i.gst_rate) || 0,
        hsn_code: i.hsnCode || i.hsn_code || null,
        taxable_amount: i.taxableAmount !== void 0 ? i.taxableAmount : 0,
        cgst_rate: i.cgstRate || 0,
        cgst_amount: i.cgstAmount || 0,
        sgst_rate: i.sgstRate || 0,
        sgst_amount: i.sgstAmount || 0,
        igst_rate: i.igstRate || 0,
        igst_amount: i.igstAmount || 0,
        tax_amount: parseFloat(i.totalTax !== void 0 ? i.totalTax : i.tax_amount || 0).toFixed(2),
        discount_amount: parseFloat(i.discountAmount !== void 0 ? i.discountAmount : i.discount_amount || 0).toFixed(2),
        notes: i.notes || "",
        serial_number: i.serial_number || null,
        original_rate: i.original_rate !== void 0 && i.original_rate !== null ? parseFloat(i.original_rate) : parseFloat(i.price),
        unit_rate: parseFloat(i.unit_rate !== void 0 && i.unit_rate !== null ? i.unit_rate : i.price),
        rate_overridden: Boolean(i.rate_overridden),
        cashier_id: user?.id || null
      })),
      subtotal: docTax.subtotal.toFixed(2),
      discount_amount: docTax.discountAmount.toFixed(2),
      taxable_amount: docTax.taxableAmount.toFixed(2),
      cgst_amount: docTax.cgstAmount.toFixed(2),
      sgst_amount: docTax.sgstAmount.toFixed(2),
      igst_amount: docTax.igstAmount.toFixed(2),
      tax_amount: docTax.totalTax.toFixed(2),
      round_off: docTax.roundOff.toFixed(2),
      tax_invoice_type: docTax.taxInvoiceType,
      total_amount: docTax.grandTotal.toFixed(2),
      payment_mode: effectivePaymentMode,
      payment_details: paymentDetails,
      paid_amount: isCreditSale ? immediatePaid : grandTotal,
      due_date: isCreditSale ? creditDueDate || null : null,
      status: targetStatus,
      cashier_name: user?.name || "Desktop Cashier",
      customer_id: selectedCustomerId || null,
      customer_name: customerName || storeName || "Walk-in Customer",
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      store_name: storeName || null,
      gst_number: customerGst || null,
      tax_type: docTax.taxType || taxType,
      salesman_id: user?.role === "salesman" || user?.role === "admin" || user?.role === "manager" ? user.id : null,
      salesman_name: user?.role === "salesman" || user?.role === "admin" || user?.role === "manager" ? user.name : null,
      warehouse_id: user?.assigned_warehouse_id || null,
      price_list: pricingMode || "retail"
    };
    try {
      const orderRes = await createOrder(token, orderPayload);
      const invoiceNo = orderRes?.unique_order_number || orderRes?.orderNumber || orderRes?.id || `RET-${Date.now().toString().slice(-6)}`;
      if (isPendingOrder) {
        setMenuItems((prevItems) => {
          return prevItems.map((prod) => {
            const matchedItem = cartWithTax.find((c) => (c.product_id || c.id || c.menu_item_id) === (prod.id || prod.menu_item_id));
            if (matchedItem && prod.current_stock !== null && prod.current_stock !== void 0) {
              const qty = matchedItem.is_weight_based ? parseFloat(matchedItem.item_weight) || 1 : matchedItem.quantity || 1;
              const newReserved = parseFloat(prod.reserved_stock || 0) + qty;
              return { ...prod, reserved_stock: newReserved };
            }
            return prod;
          });
        });
        setPrintStatusToast({
          type: "success",
          message: `Sales Order placed in Pending status (${invoiceNo})! Stock reserved.`
        });
        setTimeout(() => setPrintStatusToast(null), 4e3);
        await loadPendingOrders();
      } else {
        setMenuItems((prevItems) => {
          return prevItems.map((prod) => {
            const matchedItem = cartWithTax.find((c) => (c.product_id || c.id || c.menu_item_id) === (prod.id || prod.menu_item_id));
            if (matchedItem && prod.current_stock !== null && prod.current_stock !== void 0) {
              const deduction = matchedItem.is_weight_based ? parseFloat(matchedItem.item_weight) || 1 : matchedItem.quantity || 1;
              const newStock = Math.max(0, parseFloat(prod.current_stock) - deduction);
              return { ...prod, current_stock: newStock };
            }
            return prod;
          });
        });
        if (activeHoldId) {
          try {
            await completeHeldReceipt(activeHoldId, orderRes?.id || null, invoiceNo);
            setActiveHoldId(null);
            loadHeldReceipts();
          } catch (completeErr) {
            console.warn("[completeHeldReceipt error]", completeErr);
          }
        }
        setCart([]);
        setDiscountValue("0");
        handleClearCustomer();
        setCreditPartialPaidAmount("");
        setCreditDueDate("");
        loadCustomers();
        setCheckoutVisible(false);
        setCashReceived("");
        setActiveMobileTab("catalog");
        const workflowAction = overrideWorkflow || receiptSettings?.print_stage2_mode || "print_receipt_only";
        executePrintWorkflow(invoiceNo, orderPayload, effectivePaymentMode, cartWithTax, workflowAction).catch((printErr) => {
          console.error("[Print Workflow Warning]", printErr);
        });
      }
    } catch (err) {
      console.error("[Complete Sale Error]", err);
      notify?.error("Error completing sale: " + (err.message || "Unknown error"), "Sale Error");
    } finally {
      setSubmittingSale(false);
      autoFocusSearch();
    }
  };
  const handleHoldReceipt = async (explicitNotes = null) => {
    if (cart.length === 0) {
      notify?.warning("Cart is empty! Add products before holding a receipt.", "Cart Empty");
      return;
    }
    if (holdingReceipt) return;
    setHoldingReceipt(true);
    try {
      const holdPayload = {
        customer_id: selectedCustomerId || null,
        customer_name: customerName || storeName || "Walk-in Customer",
        customer_phone: customerPhone || "",
        customer_address: customerAddress || "",
        customer_gst: customerGst || "",
        item_count: cart.reduce((sum, item) => sum + (parseFloat(item.quantity) || 1), 0),
        subtotal: docTax.subtotal || 0,
        discount_type: discountType || "percentage",
        discount_value: discountValue || "0",
        discount_amount: docTax.discountAmount || 0,
        tax_type: docTax.taxType || taxType,
        tax_amount: docTax.totalTax || 0,
        total_amount: docTax.grandTotal || 0,
        cart_data: cart,
        notes: explicitNotes !== null ? explicitNotes : "",
        cashier_name: user?.name || "Cashier"
      };
      let result;
      if (activeHoldId) {
        result = await updateHeldReceipt(activeHoldId, holdPayload);
      } else {
        result = await createHeldReceipt(holdPayload);
      }
      const holdNumber = result?.hold_number || result?.held_receipt?.hold_number || "PARKED";
      setPrintStatusToast({
        type: "success",
        message: `Sale parked as #${holdNumber}! Cart cleared for next customer.`
      });
      setTimeout(() => setPrintStatusToast(null), 3500);
      handleClearCart();
      setActiveHoldId(null);
      await loadHeldReceipts();
    } catch (err) {
      console.error("[handleHoldReceipt error]", err);
      notify?.error("Failed to hold receipt: " + (err.message || "Unknown error"), "Hold Failed");
    } finally {
      setHoldingReceipt(false);
      autoFocusSearch();
    }
  };
  const handleResumeReceipt = async (heldReceipt, mode = "normal") => {
    if (!heldReceipt) return;
    try {
      if (mode === "hold_current" && cart.length > 0) {
        const holdCurrentPayload = {
          customer_id: selectedCustomerId || null,
          customer_name: customerName || storeName || "Walk-in Customer",
          customer_phone: customerPhone || "",
          customer_address: customerAddress || "",
          customer_gst: customerGst || "",
          item_count: cart.reduce((sum, item) => sum + (parseFloat(item.quantity) || 1), 0),
          subtotal: docTax.subtotal || 0,
          discount_type: discountType || "percentage",
          discount_value: discountValue || "0",
          discount_amount: docTax.discountAmount || 0,
          tax_type: docTax.taxType || taxType,
          tax_amount: docTax.totalTax || 0,
          total_amount: docTax.grandTotal || 0,
          cart_data: cart,
          notes: "",
          cashier_name: user?.name || "Cashier"
        };
        if (activeHoldId) {
          await updateHeldReceipt(activeHoldId, holdCurrentPayload);
        } else {
          await createHeldReceipt(holdCurrentPayload);
        }
      }
      let restoredCart = [];
      try {
        const raw = heldReceipt.cart_data;
        restoredCart = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
      } catch (parseErr) {
        console.error("Failed to parse held cart data:", parseErr);
        restoredCart = [];
      }
      setCart(restoredCart);
      setSelectedCartIndex(0);
      setCustomerName(heldReceipt.customer_name === "Walk-in Customer" ? "" : heldReceipt.customer_name || "");
      setCustomerPhone(heldReceipt.customer_phone || "");
      setCustomerAddress(heldReceipt.customer_address || "");
      setCustomerGst(heldReceipt.customer_gst || "");
      setSelectedCustomerId(heldReceipt.customer_id || null);
      setDiscountType(heldReceipt.discount_type || "percentage");
      setDiscountValue(String(heldReceipt.discount_value || "0"));
      if (heldReceipt.tax_type) {
        setTaxType(heldReceipt.tax_type);
      }
      setActiveHoldId(heldReceipt.id);
      await resumeHeldReceipt(heldReceipt.id).catch((e) => console.warn("resume notify warn:", e));
      setPrintStatusToast({
        type: "success",
        message: `Resumed Hold #${heldReceipt.hold_number} (${heldReceipt.customer_name || "Walk-in Customer"})`
      });
      setTimeout(() => setPrintStatusToast(null), 3500);
      setHeldReceiptsModalOpen(false);
      await loadHeldReceipts();
    } catch (err) {
      console.error("[handleResumeReceipt error]", err);
      notify?.error("Failed to resume held receipt: " + (err.message || "Unknown error"), "Resume Failed");
    } finally {
      autoFocusSearch();
    }
  };
  const handleCancelReceipt = async (receiptId) => {
    try {
      await cancelHeldReceipt(receiptId);
      if (activeHoldId === receiptId) {
        setActiveHoldId(null);
      }
      setPrintStatusToast({
        type: "info",
        message: "Held receipt discarded."
      });
      setTimeout(() => setPrintStatusToast(null), 3500);
      await loadHeldReceipts();
    } catch (err) {
      console.error("[handleCancelReceipt error]", err);
      notify?.error("Failed to cancel held receipt: " + (err.message || "Unknown error"), "Cancel Failed");
    }
  };
  const executePrintWorkflow = async (invoiceNo, orderPayload, effectivePaymentMode, cartItems, workflowAction) => {
    const action = (workflowAction || "print_receipt_only").toLowerCase();
    if (action === "save_only") {
      return;
    }
    const orderData = {
      unique_order_number: invoiceNo,
      subtotal: parseFloat(orderPayload.subtotal || 0).toFixed(2),
      discount_amount: parseFloat(orderPayload.discount_amount || 0).toFixed(2),
      tax_amount: parseFloat(orderPayload.tax_amount || 0).toFixed(2),
      total_amount: parseFloat(orderPayload.total_amount || 0).toFixed(2),
      payment_mode: effectivePaymentMode,
      paid_amount: orderPayload.paid_amount,
      due_date: orderPayload.due_date,
      cashier_name: orderPayload.cashier_name,
      customer_name: orderPayload.customer_name,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      tax_type: taxType
    };
    const defaultReceiptPrn = printersList.find((p) => (p.is_default_receipt === 1 || p.is_default_receipt === true) && (p.type === "lan" || p.type === "network" || !!p.ip_address)) || printersList.find((p) => p.is_default_receipt === 1 || p.is_default_receipt === true) || printersList.find((p) => (p.role === "receipt" || p.role === "both") && (p.type === "lan" || p.type === "network" || !!p.ip_address)) || printersList.find((p) => p.type === "lan" || p.type === "network" || !!p.ip_address) || printersList.find((p) => p.role === "receipt" || p.role === "both") || printersList[0] || null;
    const defaultKotPrn = printersList.find((p) => (p.is_default_kot === 1 || p.is_default_kot === true) && (p.type === "lan" || p.type === "network" || !!p.ip_address)) || printersList.find((p) => p.is_default_kot === 1 || p.is_default_kot === true) || printersList.find((p) => (p.role === "kitchen" || p.role === "both") && (p.type === "lan" || p.type === "network" || !!p.ip_address)) || printersList.find((p) => p.type === "lan" || p.type === "network" || !!p.ip_address) || printersList.find((p) => p.role === "kitchen" || p.role === "both") || defaultReceiptPrn || null;
    const shouldPrintReceipt = action !== "print_kot_only";
    const shouldPrintKot = action === "print_kot_only" || action === "print_kot_receipt";
    setPrintStatusToast({ type: "printing", message: "Printing thermal receipt..." });
    let printErrors = [];
    const effectivePaperSize = receiptSettings?.paper_size || defaultReceiptPrn?.paper_width || "auto";
    const printEngine = receiptSettings?.print_engine || "auto";
    const openBrowserPrintFallback = () => {
      try {
        const htmlReceipt = generateLocalHtmlReceipt(orderData, cartItems, user || {}, receiptSettings);
        printHtmlSilentlyViaIframe(htmlReceipt);
      } catch (err) {
        console.error("[Browser Print Fallback Error]", err);
      }
    };
    if (shouldPrintReceipt) {
      try {
        if (window.electron) {
          const isLan = (defaultReceiptPrn?.type === "lan" || defaultReceiptPrn?.type === "network") && !!defaultReceiptPrn?.ip_address;
          if (isLan) {
            try {
              const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              await window.electron.printLanRaw(defaultReceiptPrn.ip_address, defaultReceiptPrn.port || 9100, base64Payload);
            } catch (lanErr) {
              console.warn("[POS Receipt LAN Failover] LAN socket failed, attempting Windows Spooler fallback...", lanErr.message);
              const htmlReceipt = generateLocalHtmlReceipt(orderData, cartItems, user || {}, receiptSettings);
              await window.electron.printSystemSilent(htmlReceipt, defaultReceiptPrn?.name || "", { paperSize: effectivePaperSize });
            }
          } else {
            const targetPrinterName = receiptSettings?.default_printer_name || defaultReceiptPrn?.name || "";
            const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
            const base64Payload = safeUtf8ToBase64(rawEscPos);
            if (window.electron?.printThermalReceipt) {
              await window.electron.printThermalReceipt(targetPrinterName, orderData, cartItems, user || {}, receiptSettings);
            } else if (window.electron?.printWindowsRaw) {
              await window.electron.printWindowsRaw(targetPrinterName, base64Payload);
            } else {
              const htmlReceipt = generateLocalHtmlReceipt(orderData, cartItems, user || {}, receiptSettings);
              await window.electron.printSystemSilent(htmlReceipt, targetPrinterName, { paperSize: effectivePaperSize });
            }
          }
        } else {
          const targetPrn = (defaultReceiptPrn?.ip_address ? defaultReceiptPrn : null) || printersList.find((p) => (p.type === "lan" || p.type === "network" || !!p.ip_address) && !!p.ip_address);
          if (targetPrn?.ip_address) {
            let printedOnLan = false;
            try {
              const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              const printRes = await apiFetch("/api/printers/print-receipt", {
                method: "POST",
                timeout: 5e3,
                body: {
                  order: orderData,
                  items: cartItems,
                  printer_id: targetPrn.id,
                  payload_base64: base64Payload,
                  print_type: "RECEIPT"
                }
              });
              const resData = await printRes.json().catch(() => ({}));
              if (printRes.ok && resData.success !== false) {
                printedOnLan = true;
              } else {
                console.warn("[POS LAN Print] Server returned error or printer unreachable:", resData.error || resData.message);
              }
            } catch (lanErr) {
              console.warn("[POS LAN Print Failover] Direct LAN socket unreachable, falling back to browser print:", lanErr.message || lanErr);
            }
            if (!printedOnLan) {
              openBrowserPrintFallback();
            }
          } else {
            let printedOnBackend = false;
            try {
              const rawEscPos = generateLocalEscPosReceipt(orderData, cartItems, user || {}, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              const printRes = await apiFetch("/api/printers/print-receipt", {
                method: "POST",
                timeout: 4e3,
                body: {
                  order: orderData,
                  items: cartItems,
                  payload_base64: base64Payload,
                  print_type: "RECEIPT"
                }
              });
              const resData = await printRes.json().catch(() => ({}));
              if (printRes.ok && resData.success) {
                printedOnBackend = true;
                fetchPrinters(token).then((prns) => {
                  if (prns?.length > 0) setPrintersList(prns);
                }).catch(() => {
                });
              }
            } catch (backendErr) {
            }
            if (!printedOnBackend) {
              openBrowserPrintFallback();
            }
          }
        }
      } catch (receiptErr) {
        console.error("[Receipt Print Error]", receiptErr);
        printErrors.push(`Receipt Printer: ${receiptErr.message}`);
      }
    }
    if (shouldPrintKot) {
      try {
        if (window.electron) {
          const isLan = (defaultKotPrn?.type === "lan" || defaultKotPrn?.type === "network") && !!defaultKotPrn?.ip_address;
          if (isLan) {
            try {
              const rawEscPos = generateLocalEscPosKot(orderData, cartItems, receiptSettings);
              const base64Payload = safeUtf8ToBase64(rawEscPos);
              await window.electron.printLanRaw(defaultKotPrn.ip_address, defaultKotPrn.port || 9100, base64Payload);
            } catch (lanKotErr) {
              console.warn("[POS KOT LAN Failover] LAN socket failed, attempting Windows Spooler fallback...", lanKotErr.message);
              const htmlKot = generateLocalHtmlKot(orderData, cartItems, receiptSettings);
              await window.electron.printSystemSilent(htmlKot, defaultKotPrn?.name || "", { paperSize: effectivePaperSize });
            }
          } else {
            const targetPrinterName = defaultKotPrn?.name || receiptSettings?.default_printer_name || "";
            const rawEscPos = generateLocalEscPosKot(orderData, cartItems, receiptSettings);
            const base64Payload = safeUtf8ToBase64(rawEscPos);
            if (window.electron?.printThermalKot) {
              await window.electron.printThermalKot(targetPrinterName, orderData, cartItems, receiptSettings);
            } else if (window.electron?.printWindowsRaw) {
              await window.electron.printWindowsRaw(targetPrinterName, base64Payload);
            } else {
              const htmlKot = generateLocalHtmlKot(orderData, cartItems, receiptSettings);
              await window.electron.printSystemSilent(htmlKot, targetPrinterName, { paperSize: effectivePaperSize });
            }
          }
        } else {
          const isLan = (defaultKotPrn?.type === "lan" || defaultKotPrn?.type === "network" || !!defaultKotPrn?.ip_address) && !!defaultKotPrn?.ip_address;
          if (isLan) {
            const rawEscPos = generateLocalEscPosKot(orderData, cartItems, receiptSettings);
            const base64Payload = safeUtf8ToBase64(rawEscPos);
            const printRes = await apiFetch("/api/printers/print-receipt", {
              method: "POST",
              body: {
                order: orderData,
                items: cartItems,
                printer_id: defaultKotPrn.id,
                payload_base64: base64Payload,
                print_type: "KOT"
              }
            });
            const resData = await printRes.json().catch(() => ({}));
            if (!printRes.ok || resData.success === false) {
              throw new Error(resData.error || resData.message || `Unable to reach LAN KOT printer (${defaultKotPrn.name || "Kitchen"} at ${defaultKotPrn.ip_address}:${defaultKotPrn.port || 9100})`);
            }
          }
        }
      } catch (kotErr) {
        console.error("[KOT Print Error]", kotErr);
        printErrors.push(`KOT Printer: ${kotErr.message}`);
      }
    }
    if (printErrors.length > 0) {
      setPrintStatusToast({
        type: "error",
        message: `Printing Issue: ${printErrors.join(" | ")}`,
        retryFn: () => executePrintWorkflow(invoiceNo, orderPayload, effectivePaymentMode, cartItems, workflowAction),
        fallbackFn: () => openBrowserPrintFallback()
      });
    } else {
      setPrintStatusToast({
        type: "success",
        message: `Printed successfully (${shouldPrintReceipt && shouldPrintKot ? "Receipt + KOT" : shouldPrintReceipt ? "Receipt" : "KOT"})`
      });
      setTimeout(() => setPrintStatusToast(null), 4e3);
    }
  };
  const isAnyModalOpen = cartQtyModalOpen || weightModalVisible || openItemModalOpen || checkoutVisible || pendingOrdersModalOpen || keyboardHelpVisible || languageModalVisible || barcodeScannerOpen || heldReceiptsModalOpen || Boolean(quickEditProduct);
  useKeyboardShortcuts({
    "F1": (e) => {
      e?.preventDefault();
      if (!isAnyModalOpen) {
        handleOpenAddOpenItem();
      }
    },
    "Ctrl+O": (e) => {
      e?.preventDefault();
      if (!isAnyModalOpen) {
        handleOpenAddOpenItem();
      }
    },
    "Alt+O": (e) => {
      e?.preventDefault();
      if (!isAnyModalOpen) {
        handleOpenAddOpenItem();
      }
    },
    "F2": (e) => {
      e?.preventDefault();
      autoFocusSearch();
    },
    "Ctrl+F": (e) => {
      e?.preventDefault();
      autoFocusSearch();
    },
    "Ctrl+E": (e) => {
      e?.preventDefault();
      const selected = filteredProducts[selectedProductIndex];
      if (selected) {
        openQuickEdit(selected);
      }
    },
    "F3": (e) => {
      e?.preventDefault();
      if (cart.length > 0) setSelectedCartIndex(0);
    },
    "F4": (e) => {
      e?.preventDefault();
      if (heldReceiptsModalOpen) {
        setHeldReceiptsModalOpen(false);
      } else {
        loadHeldReceipts();
        setHeldReceiptsModalOpen(true);
      }
    },
    "F5": (e) => {
      e?.preventDefault();
      const selected = filteredProducts[selectedProductIndex];
      if (selected) {
        setSelectedWeightProduct(selected);
        setModalIsPcs(false);
        setModalShowPrice(true);
        setWeightModalVisible(true);
      }
    },
    "F6": (e) => {
      e?.preventDefault();
      const selected = filteredProducts[selectedProductIndex] || menuItems.find((p) => p.is_weight_based);
      if (selected) {
        handleWeightConfirm({
          product: selected,
          weightInKg: 1.25,
          displayWeight: 1.25,
          unit: "kg",
          pricePerBaseUnit: parseFloat(selected.price || 0),
          calculatedTotal: 1.25 * parseFloat(selected.price || 0)
        });
      }
    },
    "F7": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !holdingReceipt) {
        handleHoldReceipt();
      }
    },
    "F8": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        setCashReceived(grandTotal.toFixed(2));
        setCheckoutVisible(true);
      }
    },
    "F9": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale("cash", "print_receipt_only");
      }
    },
    "End": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale("cash", "print_receipt_only");
      }
    },
    "F10": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale("upi", "print_receipt_only");
      }
    },
    "F11": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale("card", "print_receipt_only");
      }
    },
    "F12": (e) => {
      e?.preventDefault();
      if (cart.length > 0 && !submittingSale) {
        handleCompleteSale(paymentMode || "cash", "print_receipt_only");
      }
    },
    "ArrowDown": (e) => {
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      e?.preventDefault();
      setSelectedCartIndex((prev) => Math.min(cart.length - 1, Math.max(0, prev + 1)));
    },
    "ArrowUp": (e) => {
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      e?.preventDefault();
      setSelectedCartIndex((prev) => Math.max(0, prev - 1));
    },
    "Enter": (e) => {
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      e?.preventDefault();
      if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        openCartItemEdit(selectedCartIndex);
      }
    },
    "Esc": (e) => {
      e?.preventDefault();
      if (heldReceiptsModalOpen) {
        setHeldReceiptsModalOpen(false);
        return;
      }
      handleClearCart();
    },
    "Delete": (e) => {
      if (isAnyModalOpen) return;
      if (searchQuery.trim().length > 0) return;
      if (cart.length > 0 && selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        e?.preventDefault();
        removeCartItem(selectedCartIndex);
      }
    },
    "+": (e) => {
      e?.preventDefault();
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        updateCartQty(selectedCartIndex, 1);
      }
    },
    "-": (e) => {
      e?.preventDefault();
      if (isAnyModalOpen || cart.length === 0) return;
      if (searchQuery.trim().length > 0) return;
      if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
        updateCartQty(selectedCartIndex, -1);
      }
    },
    "?": (e) => setKeyboardHelpVisible((prev) => !prev),
    "Ctrl+/": (e) => setKeyboardHelpVisible((prev) => !prev)
  }, [cart, selectedCartIndex, searchQuery, isAnyModalOpen, filteredProducts, selectedProductIndex, grandTotal, paymentMode, cashReceived, submittingSale, checkoutVisible, heldReceiptsModalOpen, handleClearCart]);
  const currentLangObj = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];
  const isWarehouseManager = (user?.role || propUser?.role) === "warehouse_manager";
  const hasPosPermission = !isWarehouseManager || Array.isArray(user?.permissions || propUser?.permissions) && ((user?.permissions || propUser?.permissions).includes("pos_billing") || (user?.permissions || propUser?.permissions).includes("all"));
  if (isWarehouseManager && !hasPosPermission) {
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "60vh", padding: "2rem", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "#FEF2F2", border: "1px solid #F87171", borderRadius: "16px", padding: "2.5rem", maxWidth: "520px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", boxShadow: "0 10px 25px rgba(0,0,0,0.06)" } }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 52, color: "#DC2626" }), /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, color: "#991B1B", fontWeight: 800 } }, "Warehouse Manager Terminal Notice"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, color: "#7F1D1D", fontSize: "14px", lineHeight: "1.6" } }, "Your account is assigned to ", /* @__PURE__ */ React.createElement("b", null, "Warehouse & Godown Operations"), ". POS billing, checkout, and payment collection functions are restricted by default."), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, color: "#991B1B", fontSize: "13px" } }, "Please use the ", /* @__PURE__ */ React.createElement("b", null, "Warehouse Suite"), " for stock management, receiving, and transfers."), onNavigate && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onNavigate("warehouse"),
        style: {
          backgroundColor: "#DC2626",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 22px",
          fontWeight: 700,
          fontSize: "14px",
          cursor: "pointer",
          marginTop: "10px"
        }
      },
      "Go to Warehouse Suite"
    )));
  }
  return /* @__PURE__ */ React.createElement("div", { style: { ...styles.container, backgroundColor: colors.bgApp, color: colors.textPrimary } }, printStatusToast && /* @__PURE__ */ React.createElement("div", { style: {
    position: "fixed",
    top: "70px",
    right: "20px",
    zIndex: 999999,
    padding: "12px 18px",
    borderRadius: "10px",
    backgroundColor: printStatusToast.type === "error" ? "#FEF2F2" : printStatusToast.type === "printing" ? "#EFF6FF" : "#ECFDF5",
    border: `1px solid ${printStatusToast.type === "error" ? "#F87171" : printStatusToast.type === "printing" ? "#93C5FD" : "#6EE7B7"}`,
    color: printStatusToast.type === "error" ? "#991B1B" : printStatusToast.type === "printing" ? "#1E40AF" : "#065F46",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: "700",
    fontSize: "13px"
  } }, printStatusToast.type === "printing" && /* @__PURE__ */ React.createElement(Printer, { size: 16 }), printStatusToast.type === "error" && /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16 }), printStatusToast.type === "success" && /* @__PURE__ */ React.createElement(CheckCircle2, { size: 16 }), /* @__PURE__ */ React.createElement("span", null, printStatusToast.message), printStatusToast.retryFn && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: printStatusToast.retryFn,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "6px",
        backgroundColor: "#DC2626",
        color: "#FFFFFF",
        border: "none",
        fontWeight: "800",
        cursor: "pointer",
        fontSize: "12px"
      }
    },
    /* @__PURE__ */ React.createElement(RotateCw, { size: 13 }),
    "Retry Print"
  ), printStatusToast.fallbackFn && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: printStatusToast.fallbackFn,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "6px",
        backgroundColor: "#374151",
        color: "#FFFFFF",
        border: "none",
        fontWeight: "700",
        cursor: "pointer",
        fontSize: "12px"
      },
      title: "Open browser print dialog as fallback"
    },
    /* @__PURE__ */ React.createElement(Printer, { size: 13 }),
    "Browser Print"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPrintStatusToast(null),
      style: {
        background: "none",
        border: "none",
        color: "inherit",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px",
        opacity: 0.75
      }
    },
    /* @__PURE__ */ React.createElement(X, { size: 15 })
  )), /* @__PURE__ */ React.createElement("div", { style: { ...styles.mainLayout, flexDirection: cartPosition === "left" ? "row-reverse" : "row" } }, /* @__PURE__ */ React.createElement("div", { style: {
    ...styles.catalogSection,
    display: activeMobileTab === "catalog" ? "flex" : "none"
  }, className: "pos-catalog-panel" }, /* @__PURE__ */ React.createElement(
    "form",
    {
      style: { ...styles.searchForm, backgroundColor: colors.bgCard, borderColor: colors.borderActive },
      onSubmit: handleSearchSubmit
    },
    /* @__PURE__ */ React.createElement("span", { style: styles.searchIcon }, /* @__PURE__ */ React.createElement(Search, { size: 18 })),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: searchInputRef,
        autoFocus: true,
        style: { ...styles.searchInput, color: colors.textPrimary },
        className: "pos-search-input",
        type: "text",
        placeholder: posScanMode === "barcode" ? "Scan Product Barcode (F2)..." : posScanMode === "serial" ? "Scan 8-digit Serial Number (F2)..." : t("searchPlaceholder"),
        value: searchQuery,
        onChange: (e) => {
          setSearchQuery(e.target.value);
          setSelectedProductIndex(0);
        }
      }
    ),
    searchQuery && /* @__PURE__ */ React.createElement("button", { style: { ...styles.clearSearchBtn, color: colors.textSecondary }, type: "button", onClick: () => setSearchQuery("") }, /* @__PURE__ */ React.createElement(X, { size: 15 })),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "4px", paddingRight: "6px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        id: "pos-scan-mode-toggle",
        title: `Scanner Mode: ${posScanMode === "barcode" ? "Barcode Mode (Strict Product Scan)" : posScanMode === "serial" ? "Serial Number Mode (Strict 8-digit Unit Scan)" : "Auto Mode (Product Barcode First)"}. Click to switch.`,
        onClick: () => {
          setPosScanMode((prev) => prev === "auto" ? "barcode" : prev === "barcode" ? "serial" : "auto");
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          borderRadius: "6px",
          border: "1px solid",
          fontSize: "11px",
          fontWeight: "800",
          cursor: "pointer",
          userSelect: "none",
          whiteSpace: "nowrap",
          backgroundColor: posScanMode === "barcode" ? isDark ? "#1e3a8a" : "#EFF6FF" : posScanMode === "serial" ? isDark ? "#78350f" : "#FEF3C7" : isDark ? "#1e293b" : "#F1F5F9",
          borderColor: posScanMode === "barcode" ? "#3B82F6" : posScanMode === "serial" ? "#F59E0B" : "#94A3B8",
          color: posScanMode === "barcode" ? isDark ? "#93C5FD" : "#1D4ED8" : posScanMode === "serial" ? isDark ? "#FDE68A" : "#B45309" : isDark ? "#CBD5E1" : "#475569"
        }
      },
      posScanMode === "auto" && "\u26A1 Auto Scan",
      posScanMode === "barcode" && "\u{1F3F7}\uFE0F Barcode Only",
      posScanMode === "serial" && "\u{1F522} Serial No"
    ))
  ), /* @__PURE__ */ React.createElement("div", { style: { ...styles.controlBar, backgroundColor: colors.bgCard, borderColor: colors.borderColor }, className: "pos-control-bar" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "pos-control-pill",
      onClick: async () => {
        if (netStatus.isSyncing) return;
        setPrintStatusToast({ type: "printing", message: "Syncing catalog & pending sales..." });
        try {
          if (propManualSync) {
            await propManualSync();
          } else {
            await SyncService.triggerManualSync(token);
          }
          await loadData();
          setPrintStatusToast({ type: "success", message: "All sales & items synchronized successfully!" });
          setTimeout(() => setPrintStatusToast(null), 3e3);
        } catch (e) {
          setPrintStatusToast({ type: "error", message: "Sync: " + (e.message || "Offline") });
          setTimeout(() => setPrintStatusToast(null), 4e3);
        }
      },
      style: {
        ...styles.controlPill,
        backgroundColor: !netStatus.isOnline ? isDark ? "#78350F" : "#FEF3C7" : netStatus.pendingCount > 0 ? isDark ? "#0C4A6E" : "#E0F2FE" : isDark ? "#064E3B" : "#ECFDF5",
        color: !netStatus.isOnline ? isDark ? "#FDE68A" : "#92400E" : netStatus.pendingCount > 0 ? isDark ? "#BAE6FD" : "#0369A1" : isDark ? "#A7F3D0" : "#059669",
        borderColor: !netStatus.isOnline ? "#F59E0B" : netStatus.pendingCount > 0 ? "#38BDF8" : "#10B981",
        fontWeight: "700",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
      },
      title: netStatus.isOnline ? "Online: Click to sync with server" : "Offline Mode: Sales are queued locally and will auto-sync when online"
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center" } }, netStatus.isSyncing ? /* @__PURE__ */ React.createElement(RotateCw, { size: 13, className: "spin" }) : !netStatus.isOnline ? /* @__PURE__ */ React.createElement(AlertTriangle, { size: 13 }) : /* @__PURE__ */ React.createElement(CheckCircle2, { size: 13 })),
    /* @__PURE__ */ React.createElement("span", null, netStatus.isSyncing ? "Syncing..." : !netStatus.isOnline ? `Offline (${netStatus.pendingCount} pending)` : netStatus.pendingCount > 0 ? `Sync (${netStatus.pendingCount})` : "Online")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: "#0284C7",
        color: "#FFFFFF",
        borderColor: "#0284C7",
        fontWeight: "700",
        boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)"
      },
      onClick: () => setBarcodeScannerOpen(true),
      title: "Open Live Camera Barcode Scanner"
    },
    /* @__PURE__ */ React.createElement(Camera, { size: 14 }),
    " Barcode Camera"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        borderColor: colors.borderColor,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer"
      },
      onClick: () => setStickerModalItems(menuItems),
      title: "Open Barcode Sticker Designer & Printer"
    },
    /* @__PURE__ */ React.createElement(Tag, { size: 14 }),
    " Stickers"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-open-item-btn",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
        color: colors.accentOrange,
        borderColor: colors.accentOrange,
        fontWeight: "800",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(249, 115, 22, 0.2)"
      },
      onClick: handleOpenAddOpenItem,
      title: "Add Custom / Open Item to Sale (F1 or Ctrl+O)"
    },
    /* @__PURE__ */ React.createElement(PackagePlus, { size: 14 }),
    " Open Item (F1)"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: pendingOrders.length > 0 ? isDark ? "#78350F" : "#FEF3C7" : colors.bgInput,
        color: pendingOrders.length > 0 ? isDark ? "#FDE68A" : "#B45309" : colors.textPrimary,
        borderColor: pendingOrders.length > 0 ? "#F59E0B" : colors.borderColor,
        fontWeight: "700",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        boxShadow: pendingOrders.length > 0 ? "0 1px 3px rgba(245, 158, 11, 0.3)" : "none"
      },
      onClick: () => {
        loadPendingOrders();
        setPendingOrdersModalOpen(true);
      },
      title: "View and Confirm Pending Sales Orders"
    },
    /* @__PURE__ */ React.createElement(ClipboardList, { size: 14 }),
    " Pending Orders (",
    pendingOrders.length,
    ")"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-top-held-receipts-btn",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: heldReceipts.length > 0 ? isDark ? "#7C2D12" : "#FFEDD5" : colors.bgInput,
        color: heldReceipts.length > 0 ? isDark ? "#FDBA74" : "#C2410C" : colors.textPrimary,
        borderColor: heldReceipts.length > 0 ? "#F97316" : colors.borderColor,
        fontWeight: "700",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        boxShadow: heldReceipts.length > 0 ? "0 1px 3px rgba(249, 115, 22, 0.3)" : "none"
      },
      onClick: () => {
        loadHeldReceipts();
        setHeldReceiptsModalOpen(true);
      },
      title: "View and Resume Held Receipts (F4)"
    },
    /* @__PURE__ */ React.createElement(PauseCircle, { size: 14 }),
    " Held Receipts (",
    heldReceipts.length,
    ")"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: focusMode ? colors.accentOrange : colors.bgInput,
        color: focusMode ? "#FFFFFF" : colors.textPrimary,
        borderColor: focusMode ? colors.accentOrange : colors.borderColor
      },
      onClick: toggleFocusMode
    },
    /* @__PURE__ */ React.createElement(Maximize2, { size: 13 }),
    " ",
    focusMode ? "Focus On" : "Focus"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "pos-control-pill",
      style: {
        ...styles.controlPill,
        backgroundColor: categoryLayout === "sidebar" ? colors.accentOrange : colors.bgInput,
        color: categoryLayout === "sidebar" ? "#FFFFFF" : colors.textPrimary,
        borderColor: categoryLayout === "sidebar" ? colors.accentOrange : colors.borderColor
      },
      onClick: toggleCategoryLayout
    },
    categoryLayout === "sidebar" ? /* @__PURE__ */ React.createElement(MenuIconLucide, { size: 13 }) : /* @__PURE__ */ React.createElement(Layers, { size: 13 }),
    " ",
    categoryLayout === "sidebar" ? "Sidebar" : "Top Pills"
  ), /* @__PURE__ */ React.createElement("div", { style: { ...styles.densityGroup, backgroundColor: colors.bgInput, borderColor: colors.borderColor }, className: "pos-density-group" }, [
    { key: "icon", label: "Icon" },
    { key: "compact", label: "Compact" },
    { key: "standard", label: "Standard" },
    { key: "spacious", label: "Spacious" }
  ].map((d) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: d.key,
      type: "button",
      id: `pos-density-${d.key}`,
      "data-density": d.key,
      style: {
        ...styles.densityBtn,
        backgroundColor: densityMode === d.key ? colors.accentOrange : "transparent",
        color: densityMode === d.key ? "#FFFFFF" : colors.textSecondary
      },
      onClick: () => changeDensityMode(d.key)
    },
    d.label
  ))), /* @__PURE__ */ React.createElement("div", { style: { ...styles.densityGroup, backgroundColor: colors.bgInput, borderColor: colors.borderColor }, className: "pos-pricing-mode-group" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-pricing-retail",
      style: {
        ...styles.densityBtn,
        backgroundColor: pricingMode === "retail" ? colors.accentOrange : "transparent",
        color: pricingMode === "retail" ? "#FFFFFF" : colors.textSecondary,
        fontWeight: pricingMode === "retail" ? "800" : "600",
        padding: "3px 8px"
      },
      onClick: () => handleSwitchPricingMode("retail")
    },
    "Retail"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-pricing-wholesale",
      style: {
        ...styles.densityBtn,
        backgroundColor: pricingMode === "wholesale" ? "#9333EA" : "transparent",
        color: pricingMode === "wholesale" ? "#FFFFFF" : colors.textSecondary,
        fontWeight: pricingMode === "wholesale" ? "800" : "600",
        padding: "3px 8px"
      },
      onClick: () => handleSwitchPricingMode("wholesale")
    },
    "Wholesale"
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      title: `Cart is on the ${cartPosition}. Click to move to ${cartPosition === "right" ? "left" : "right"}`,
      style: {
        ...styles.controlPill,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        borderColor: colors.borderColor,
        fontSize: "12px",
        gap: "4px"
      },
      onClick: toggleCartPosition
    },
    cartPosition === "right" ? "\u25E7" : "\u25E8",
    " Cart ",
    cartPosition === "right" ? "Right" : "Left"
  )), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: styles.categoryRail,
      className: "pos-category-rail",
      onWheel: (e) => {
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        style: {
          ...styles.catBtn,
          backgroundColor: selectedCategory === null ? colors.accentOrange : colors.bgCard,
          color: selectedCategory === null ? "#FFFFFF" : colors.textSecondary,
          borderColor: selectedCategory === null ? colors.accentOrange : colors.borderColor
        },
        onClick: () => setSelectedCategory(null)
      },
      t("allProducts"),
      " (",
      menuItems.length,
      ")"
    ),
    categories.map((cat) => {
      const count = menuItems.filter((i) => i.category_id === cat.id).length;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: cat.id,
          style: {
            ...styles.catBtn,
            backgroundColor: selectedCategory?.id === cat.id ? colors.accentOrange : colors.bgCard,
            color: selectedCategory?.id === cat.id ? "#FFFFFF" : colors.textSecondary,
            borderColor: selectedCategory?.id === cat.id ? colors.accentOrange : colors.borderColor
          },
          onClick: () => setSelectedCategory(cat)
        },
        cat.name,
        " ",
        count > 0 ? `(${count})` : ""
      );
    })
  ), /* @__PURE__ */ React.createElement("div", { style: styles.catalogBodyLayout, className: "pos-catalog-body" }, categoryLayout === "sidebar" && /* @__PURE__ */ React.createElement("div", { style: { ...styles.sidebarContainer, backgroundColor: colors.bgCard, borderColor: colors.borderColor }, className: "pos-sidebar" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: {
        ...styles.sidebarItem,
        backgroundColor: selectedCategory === null ? colors.accentOrange : "transparent",
        color: selectedCategory === null ? "#FFFFFF" : colors.textPrimary,
        fontWeight: selectedCategory === null ? "800" : "600"
      },
      onClick: () => setSelectedCategory(null)
    },
    /* @__PURE__ */ React.createElement("div", { style: styles.sidebarItemText }, /* @__PURE__ */ React.createElement("span", null, t("allProducts")), /* @__PURE__ */ React.createElement("span", { style: { ...styles.sidebarCount, color: selectedCategory === null ? "#FFFFFF" : colors.textSecondary } }, menuItems.length))
  ), categories.map((cat) => {
    const isSelected = selectedCategory?.id === cat.id;
    const catItemCount = menuItems.filter((i) => i.category_id === cat.id).length;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: cat.id,
        type: "button",
        style: {
          ...styles.sidebarItem,
          backgroundColor: isSelected ? colors.accentOrange : "transparent",
          color: isSelected ? "#FFFFFF" : colors.textPrimary,
          fontWeight: isSelected ? "800" : "600"
        },
        onClick: () => setSelectedCategory(cat)
      },
      /* @__PURE__ */ React.createElement("div", { style: styles.sidebarItemText }, /* @__PURE__ */ React.createElement("span", null, cat.name), /* @__PURE__ */ React.createElement("span", { style: { ...styles.sidebarCount, color: isSelected ? "#FFFFFF" : colors.textSecondary } }, catItemCount))
    );
  })), loading ? /* @__PURE__ */ React.createElement("div", { style: styles.loadingBox }, /* @__PURE__ */ React.createElement(RotateCw, { size: 26, className: "spin", style: { color: colors.accentOrange, marginBottom: 8 } }), /* @__PURE__ */ React.createElement("p", null, "Loading retail items...")) : filteredProducts.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: styles.emptyProductsBox }, /* @__PURE__ */ React.createElement(Search, { size: 32, strokeWidth: 1.5, style: { color: colors.textSecondary } }), /* @__PURE__ */ React.createElement("p", { style: { fontWeight: "700", marginTop: "8px" } }, "No products found"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px", color: colors.textSecondary } }, "Try searching by name, barcode, or SKU")) : /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "pos-product-grid",
      style: {
        ...styles.productGrid,
        alignContent: densityMode === "icon" || densityMode === "compact" ? "start" : void 0,
        gridAutoRows: densityMode === "icon" || densityMode === "compact" ? "max-content" : void 0,
        gridTemplateColumns: windowWidth < 600 ? densityMode === "icon" ? "repeat(3, 1fr)" : densityMode === "compact" ? "repeat(2, 1fr)" : densityMode === "spacious" ? "repeat(1, 1fr)" : "repeat(2, 1fr)" : windowWidth < 900 ? densityMode === "icon" ? "repeat(auto-fill, minmax(110px, 1fr))" : densityMode === "compact" ? "repeat(auto-fill, minmax(130px, 1fr))" : densityMode === "spacious" ? "repeat(auto-fill, minmax(180px, 1fr))" : "repeat(auto-fill, minmax(140px, 1fr))" : densityMode === "icon" ? "repeat(auto-fill, minmax(118px, 1fr))" : densityMode === "compact" ? "repeat(auto-fill, minmax(140px, 1fr))" : densityMode === "spacious" ? "repeat(auto-fill, minmax(220px, 1fr))" : "repeat(auto-fill, minmax(160px, 1fr))",
        gap: densityMode === "icon" ? "6px" : densityMode === "compact" ? "8px" : densityMode === "spacious" ? "12px" : "10px"
      }
    },
    filteredProducts.map((product, idx) => {
      const isWeight = isProductWeightBased(product);
      const isSerial = isProductSerialTracked(product);
      const isWholesale = pricingMode === "wholesale";
      const price = isWholesale && product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? parseFloat(product.wholesale_price) : parseFloat(product.price || product.selling_price || 0);
      const isMobile = windowWidth < 600;
      const cardPadding = isMobile ? densityMode === "icon" ? "4px 5px" : densityMode === "compact" ? "6px 7px" : densityMode === "spacious" ? "12px" : "8px" : densityMode === "icon" ? "5px 6px" : densityMode === "compact" ? "7px 8px" : densityMode === "spacious" ? "16px" : "12px";
      const titleFontSize = isMobile ? densityMode === "icon" ? "9.5px" : densityMode === "compact" ? "10.5px" : densityMode === "spacious" ? "14px" : "12px" : densityMode === "icon" ? "10.5px" : densityMode === "compact" ? "11.5px" : densityMode === "spacious" ? "15px" : "13px";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: product.id || idx,
          style: {
            ...styles.productCard,
            padding: cardPadding,
            height: densityMode === "icon" ? isMobile ? "94px" : "98px" : densityMode === "compact" ? isMobile ? "114px" : "118px" : "auto",
            minHeight: densityMode === "spacious" ? "160px" : "125px",
            borderColor: colors.borderColor,
            boxShadow: isDark ? "0 4px 6px -1px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.05)",
            position: "relative",
            overflow: "hidden",
            cursor: product.not_for_sale === 1 || product.not_for_sale === true || product.not_for_sale === "1" ? "not-allowed" : "pointer",
            opacity: product.not_for_sale === 1 || product.not_for_sale === true || product.not_for_sale === "1" ? 0.65 : 1,
            backgroundColor: colors.bgCard
          },
          onTouchStart: () => handleTouchStart(product),
          onTouchEnd: handleTouchEnd,
          onContextMenu: (e) => handleProductContextMenu(product, e),
          onClick: (e) => handleProductClick(product, e)
        },
        product.image_url && /* @__PURE__ */ React.createElement(
          "img",
          {
            src: resolveImageUrl(product.image_url),
            alt: product.name,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              pointerEvents: "none"
            },
            onError: (e) => {
              const raw = String(product.image_url || "").trim();
              const clean = raw.startsWith("/") ? raw.slice(1) : raw;
              if (!e.currentTarget.dataset.retried) {
                e.currentTarget.dataset.retried = "true";
                e.currentTarget.src = "./" + clean;
              } else {
                e.currentTarget.style.display = "none";
              }
            }
          }
        ),
        product.image_url && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.92) 100%)",
              zIndex: 2,
              pointerEvents: "none"
            }
          }
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              width: "100%",
              flex: 1,
              minWidth: 0,
              overflow: "hidden"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: {
            ...styles.cardHeader,
            marginBottom: densityMode === "icon" ? "1px" : densityMode === "compact" ? "3px" : "4px",
            gap: "3px",
            overflow: "hidden"
          } }, /* @__PURE__ */ React.createElement("span", { style: {
            ...styles.badge,
            ...isSerial ? { backgroundColor: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe" } : isWeight ? styles.weightBadge : styles.pieceBadge,
            fontSize: densityMode === "icon" ? "8px" : densityMode === "compact" ? "9px" : "10px",
            padding: densityMode === "icon" ? "1px 3px" : "2px 5px",
            flexShrink: 0
          } }, isSerial ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Tag, { size: densityMode === "icon" ? 8 : 10, style: { marginRight: 2 } }), densityMode === "icon" ? "SN" : "SERIAL") : isWeight ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Scale, { size: densityMode === "icon" ? 8 : 10, style: { marginRight: 2 } }), densityMode === "icon" ? "WT" : t("weightBadge")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Package, { size: densityMode === "icon" ? 8 : 10, style: { marginRight: 2 } }), densityMode === "icon" ? "PCS" : t("pcsBadge"))), (product.not_for_sale === 1 || product.not_for_sale === true || product.not_for_sale === "1") && /* @__PURE__ */ React.createElement("span", { style: {
            ...styles.badge,
            backgroundColor: "#DC2626",
            color: "#FFFFFF",
            fontSize: densityMode === "icon" ? "7.5px" : "8.5px",
            padding: "1px 4px",
            fontWeight: "900",
            flexShrink: 0
          } }, "NOT FOR SALE"), (product.barcode || product.sku) && /* @__PURE__ */ React.createElement("span", { style: {
            ...styles.barcodeText,
            fontSize: densityMode === "icon" ? "8px" : densityMode === "compact" ? "9px" : "10px",
            fontWeight: "800",
            fontFamily: "monospace",
            color: product.image_url ? "rgba(255,255,255,0.95)" : colors.textSecondary,
            textShadow: product.image_url ? "0 1px 3px rgba(0,0,0,0.95)" : "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: densityMode === "icon" ? "55px" : densityMode === "compact" ? "70px" : "none",
            flexShrink: 1,
            minWidth: 0,
            textAlign: "right"
          } }, "#", product.sku || product.barcode)),
          /* @__PURE__ */ React.createElement("h3", { style: {
            ...styles.cardTitle,
            fontSize: titleFontSize,
            color: product.image_url ? "#FFFFFF" : colors.textPrimary,
            textShadow: product.image_url ? "0 1px 4px rgba(0,0,0,0.95)" : "none",
            fontWeight: "800",
            lineHeight: densityMode === "icon" ? 1.2 : densityMode === "compact" ? 1.2 : 1.15,
            margin: "1px 0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: densityMode === "icon" ? "nowrap" : "normal",
            display: densityMode === "icon" ? "block" : "-webkit-box",
            WebkitLineClamp: densityMode === "compact" ? 2 : 3,
            WebkitBoxOrient: "vertical",
            wordBreak: densityMode === "icon" ? "normal" : "break-word"
          } }, product.name),
          product.current_stock !== null && product.current_stock !== void 0 && /* @__PURE__ */ React.createElement("div", { style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2px",
            margin: densityMode === "icon" ? "1px 0" : "2px 0",
            flexWrap: "nowrap",
            overflow: "hidden",
            minWidth: 0
          } }, (() => {
            const physical = parseFloat(product.current_stock) || 0;
            const reserved = parseFloat(product.reserved_stock) || 0;
            const available = Math.max(0, physical - reserved) || 0;
            const unitStr = (product.base_unit || product.unit || (isWeight ? "kg" : "pcs")).toLowerCase();
            const formattedAvail = isWeight ? densityMode === "icon" ? available.toFixed(1) : available.toFixed(3) : available % 1 === 0 ? available.toFixed(0) : available.toFixed(2);
            const formattedRes = isWeight ? densityMode === "icon" ? reserved.toFixed(1) : reserved.toFixed(3) : reserved % 1 === 0 ? reserved.toFixed(0) : reserved.toFixed(2);
            const isOutOfStock = available <= 0;
            const isLow = available <= (product.low_stock_threshold || 5);
            return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: {
              fontSize: densityMode === "icon" ? "7.5px" : densityMode === "compact" ? "8.5px" : "9.5px",
              fontWeight: "800",
              color: isOutOfStock ? "#EF4444" : isLow ? "#F59E0B" : "#10B981",
              backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
              padding: densityMode === "icon" ? "1px 3px" : "1px 4px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flexShrink: 1,
              minWidth: 0
            } }, isOutOfStock ? "OOS" : densityMode === "icon" ? `${formattedAvail} ${unitStr}` : `Avail: ${formattedAvail} ${unitStr}`), reserved > 0 && /* @__PURE__ */ React.createElement(
              "span",
              {
                title: `Physical Stock: ${isWeight ? physical.toFixed(3) : physical} | Reserved in Pending Orders: ${formattedRes}`,
                style: {
                  fontSize: densityMode === "icon" ? "7px" : densityMode === "compact" ? "8px" : "9px",
                  fontWeight: "800",
                  color: "#D97706",
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7",
                  padding: densityMode === "icon" ? "1px 2px" : "1px 4px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  flexShrink: 0
                }
              },
              /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "2px" } }, /* @__PURE__ */ React.createElement(Clock, { size: densityMode === "icon" ? 7 : 9 }), " ", densityMode === "icon" ? reserved % 1 === 0 ? reserved.toFixed(0) : reserved.toFixed(1) : `${formattedRes} res`)
            ));
          })()),
          /* @__PURE__ */ React.createElement("div", { style: {
            ...styles.cardFooter,
            marginTop: "auto",
            flexShrink: 0,
            paddingTop: densityMode === "icon" ? "1px" : "2px",
            borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "2px",
            minWidth: 0
          } }, /* @__PURE__ */ React.createElement("span", { style: {
            ...styles.cardPrice,
            fontSize: densityMode === "icon" ? "11px" : densityMode === "compact" ? "13px" : "15px",
            color: product.image_url ? "#FB923C" : pricingMode === "wholesale" ? "#C084FC" : "#10B981",
            textShadow: product.image_url ? "0 1px 3px rgba(0,0,0,0.95)" : "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontWeight: "800",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px"
          } }, "\u20B9", price.toFixed(2), pricingMode === "wholesale" && /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: densityMode === "icon" ? "7px" : "8px",
                fontWeight: "900",
                backgroundColor: product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? "#9333EA" : "#6B7280",
                color: "#FFFFFF",
                padding: "1px 3px",
                borderRadius: "3px",
                lineHeight: 1
              },
              title: product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? "Wholesale Price" : "Fallback to Retail Price"
            },
            "W"
          )), /* @__PURE__ */ React.createElement("span", { style: {
            ...styles.cardUnit,
            fontSize: densityMode === "icon" ? "7.5px" : densityMode === "compact" ? "8.5px" : "10px",
            color: product.image_url ? "rgba(255,255,255,0.9)" : colors.textSecondary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "right",
            marginLeft: "auto"
          } }, densityMode === "icon" ? `/${isWeight ? product.base_unit || product.unit || "kg" : product.base_unit || product.unit || "pcs"}` : `per ${isWeight ? product.base_unit || product.unit || "kg" : product.base_unit || product.unit || "pcs"}`))
        )
      );
    })
  ))), !focusMode && activeMobileTab === "catalog" && windowWidth >= 700 && /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: startCartResize,
      onTouchStart: startCartResize,
      title: "Drag to resize Product Grid & Sale Cart width",
      style: {
        width: "8px",
        cursor: "col-resize",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isResizingCart ? colors.accentOrange || "#F97316" : colors.borderColor,
        transition: isResizingCart ? "none" : "background-color 0.2s ease",
        zIndex: 20,
        flexShrink: 0,
        userSelect: "none",
        touchAction: "none"
      },
      className: "pos-cart-resize-handle"
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          width: "4px",
          height: isResizingCart ? "54px" : "40px",
          borderRadius: "4px",
          backgroundColor: isResizingCart ? "#FFFFFF" : themeMode === "dark" ? "#94A3B8" : "#64748B",
          boxShadow: isResizingCart ? "0 0 10px rgba(249,115,22,0.9)" : "0 1px 3px rgba(0,0,0,0.15)",
          transition: "all 0.15s ease"
        }
      }
    )
  ), /* @__PURE__ */ React.createElement("div", { style: {
    ...styles.cartSection,
    width: windowWidth >= 700 ? `${cartPanelWidth}px` : "100%",
    minWidth: windowWidth >= 700 ? `${cartPanelWidth}px` : "auto",
    maxWidth: windowWidth >= 700 ? `${cartPanelWidth}px` : "100%",
    backgroundColor: colors.bgCard,
    borderColor: colors.borderColor,
    display: focusMode ? "none" : activeMobileTab === "cart" ? "flex" : "flex"
  }, className: "pos-cart-panel" }, /* @__PURE__ */ React.createElement("div", { style: styles.cartHeader }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h2", { style: { ...styles.cartTitle, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px", margin: 0 } }, /* @__PURE__ */ React.createElement(ShoppingCart, { size: 18 }), " ", t("cartTitle"), " | Items: ", cart.length, " | Total Qty: ", totalCartCount), /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: "12px",
        fontSize: "10.5px",
        fontWeight: "800",
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        backgroundColor: pricingMode === "wholesale" ? isDark ? "rgba(147, 51, 234, 0.25)" : "#F3E8FF" : isDark ? "rgba(234, 88, 12, 0.2)" : "#FFEDD5",
        color: pricingMode === "wholesale" ? isDark ? "#C084FC" : "#7E22CE" : isDark ? "#FB923C" : "#C2410C",
        border: `1px solid ${pricingMode === "wholesale" ? isDark ? "rgba(147, 51, 234, 0.4)" : "#DDD6FE" : isDark ? "rgba(234, 88, 12, 0.35)" : "#FDBA74"}`
      },
      title: pricingMode === "wholesale" ? "Active: Wholesale Pricing Mode" : "Active: Retail Pricing Mode"
    },
    pricingMode === "wholesale" ? "Wholesale Rate" : "Retail Rate"
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-cart-open-item-btn",
      onClick: handleOpenAddOpenItem,
      style: {
        backgroundColor: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFEDD5",
        color: colors.accentOrange,
        border: `1px solid ${colors.accentOrange}`,
        borderRadius: "6px",
        padding: "4px 8px",
        fontSize: "11px",
        fontWeight: "800",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        cursor: "pointer"
      },
      title: "Add Custom / Open Item (F1 / Ctrl+O)"
    },
    /* @__PURE__ */ React.createElement(PackagePlus, { size: 12 }),
    " Open Item (F1)"
  ), /* @__PURE__ */ React.createElement("button", { style: styles.clearCartBtn, onClick: handleClearCart }, t("clearCart"), " (Esc)"))), activeHoldId && /* @__PURE__ */ React.createElement("div", { style: {
    backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
    color: colors.accentEmerald,
    border: `1px solid ${isDark ? "#059669" : "#A7F3D0"}`,
    borderRadius: "8px",
    padding: "6px 12px",
    margin: "0 12px 8px 12px",
    fontSize: "12px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  } }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(PauseCircle, { size: 14 }), " Resumed Parked Sale"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleHoldReceipt(),
      style: {
        background: "none",
        border: "none",
        color: colors.accentEmerald,
        fontSize: "11px",
        fontWeight: "800",
        textDecoration: "underline",
        cursor: "pointer"
      }
    },
    "Park Again (F7)"
  )), /* @__PURE__ */ React.createElement("div", { style: styles.cartTableContainer, className: "pos-cart-table-container" }, cart.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { ...styles.emptyCart, color: colors.textSecondary } }, /* @__PURE__ */ React.createElement(ShoppingCart, { size: 38, strokeWidth: 1.5, style: { color: colors.textSecondary, marginBottom: 8 } }), /* @__PURE__ */ React.createElement("p", { style: { fontWeight: "700", marginTop: "10px" } }, t("cartEmptyTitle")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "12px" } }, t("cartEmptySub"))) : /* @__PURE__ */ React.createElement("table", { style: styles.table }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { ...styles.trHead, borderColor: colors.borderColor, backgroundColor: colors.tableHeadBg } }, /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("productHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("qtyWeightHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("rateHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("totalHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }))), /* @__PURE__ */ React.createElement("tbody", { ref: cartTableBodyRef }, cart.map((item, idx) => {
    const isSelected = selectedCartIndex === idx;
    const itemSku = (item.sku || item.barcode || (menuItems || []).find((p) => (p.id || p.menu_item_id) === (item.product_id || item.id))?.sku || (menuItems || []).find((p) => (p.id || p.menu_item_id) === (item.product_id || item.id))?.barcode || "").trim();
    return /* @__PURE__ */ React.createElement(
      "tr",
      {
        key: idx,
        style: {
          ...styles.trBody,
          borderColor: colors.borderColor,
          backgroundColor: isSelected ? themeMode === "dark" ? "#1E3A5F" : "#EFF6FF" : "transparent",
          borderLeft: isSelected ? `4px solid ${colors.accentOrange || "#F97316"}` : "4px solid transparent",
          boxShadow: isSelected ? "inset 0 0 0 1px rgba(249, 115, 22, 0.35)" : "none",
          cursor: "pointer",
          transition: "background-color 0.15s ease, border-left 0.15s ease"
        },
        onClick: () => setSelectedCartIndex(idx),
        onDoubleClick: () => openCartItemEdit(idx)
      },
      /* @__PURE__ */ React.createElement("td", { style: styles.td }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "700", color: colors.textPrimary } }, item.name), isSelected && itemSku && /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: "10px",
        color: themeMode === "dark" ? "#94A3B8" : "#64748B",
        fontFamily: "monospace",
        fontWeight: "600",
        lineHeight: 1.2,
        marginTop: "1px"
      } }, "#", itemSku), item.serial_number && /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: "10px",
        color: "#9333ea",
        fontFamily: "monospace",
        fontWeight: "800",
        marginTop: "1px"
      } }, "SN: ", item.serial_number), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: colors.accentOrange } }, item.is_open_item ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px", color: "#0ea5e9", fontWeight: 800 } }, /* @__PURE__ */ React.createElement(PackagePlus, { size: 11 }), "OPEN ITEM") : item.serial_number ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px", color: "#9333ea", fontWeight: 700 } }, /* @__PURE__ */ React.createElement(Tag, { size: 10 }), "SERIAL") : item.is_weight_based ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px" } }, /* @__PURE__ */ React.createElement(Scale, { size: 10 }), t("weightBadge")) : /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px" } }, /* @__PURE__ */ React.createElement(Package, { size: 10 }), t("pcsBadge"))), parseFloat(item.discount_amount || 0) > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#F59E0B", fontWeight: "700", marginTop: "1px" } }, "Disc: -\u20B9", parseFloat(item.discount_amount).toFixed(2)), item.is_stock_linked && item.linked_product_name && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#38BDF8", fontWeight: "600", marginTop: "1px" } }, "Stock: ", item.linked_product_name)),
      /* @__PURE__ */ React.createElement("td", { style: { ...styles.td, color: colors.textPrimary } }, item.serial_number ? /* @__PURE__ */ React.createElement(
        "span",
        {
          style: {
            fontWeight: "800",
            padding: "3px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            backgroundColor: themeMode === "dark" ? "#3b0764" : "#f3e8ff",
            color: "#9333ea",
            border: "1px solid #d8b4fe",
            display: "inline-block",
            cursor: "pointer",
            userSelect: "none"
          },
          title: "Serial item quantity is 1. Click to edit rate.",
          onClick: (e) => {
            e.stopPropagation();
            openCartItemEdit(idx);
          }
        },
        "1"
      ) : item.is_weight_based ? /* @__PURE__ */ React.createElement(
        "span",
        {
          style: {
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: isSelected ? themeMode === "dark" ? "#334155" : "#DBEAFE" : "transparent"
          },
          title: "Click or press Enter to edit weight",
          onClick: (e) => {
            e.stopPropagation();
            openCartItemEdit(idx);
          }
        },
        item.displayWeight || item.item_weight,
        " ",
        item.weight_unit || "kg"
      ) : /* @__PURE__ */ React.createElement("div", { style: styles.qtyBox }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          style: { ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary },
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateCartQty(idx, -1);
          },
          title: "Decrease Quantity (-1)"
        },
        "-"
      ), /* @__PURE__ */ React.createElement(
        "span",
        {
          style: {
            fontWeight: "800",
            margin: "0 6px",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: isSelected ? themeMode === "dark" ? "#334155" : "#DBEAFE" : "transparent"
          },
          title: "Click or press Enter to edit quantity",
          onClick: (e) => {
            e.stopPropagation();
            openCartItemEdit(idx);
          }
        },
        item.quantity
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          style: { ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary },
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            updateCartQty(idx, 1);
          },
          title: "Increase Quantity (+1)"
        },
        "+"
      ))),
      /* @__PURE__ */ React.createElement(
        "td",
        {
          style: { ...styles.td, color: colors.textPrimary, cursor: "pointer" },
          title: "Click to edit rate",
          onClick: (e) => {
            e.stopPropagation();
            openCartItemEdit(idx);
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: item.rate_overridden ? "800" : "normal" } }, "\u20B9", parseFloat(item.price).toFixed(2)), item.rate_overridden && /* @__PURE__ */ React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "2px" } }, /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontSize: "9px",
              fontWeight: "800",
              padding: "1px 5px",
              borderRadius: "4px",
              backgroundColor: themeMode === "dark" ? "rgba(249, 115, 22, 0.25)" : "#FFF7ED",
              color: "#EA580C",
              border: "1px solid #FDBA74",
              lineHeight: 1.2
            },
            title: `Original menu rate: \u20B9${parseFloat(item.original_rate ?? item.price).toFixed(2)}`
          },
          "Rate edited"
        ), /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontSize: "10px",
              color: colors.textSecondary,
              textDecoration: "line-through"
            },
            title: "Original menu rate"
          },
          "\u20B9",
          parseFloat(item.original_rate ?? item.price).toFixed(2)
        )))
      ),
      /* @__PURE__ */ React.createElement("td", { style: styles.tdBold }, "\u20B9", parseFloat(item.total_price).toFixed(2)),
      /* @__PURE__ */ React.createElement("td", { style: styles.td }, /* @__PURE__ */ React.createElement("button", { style: styles.deleteBtn, onClick: (e) => {
        e.stopPropagation();
        removeCartItem(idx);
      }, title: "Remove item" }, /* @__PURE__ */ React.createElement(Trash2, { size: 13 })))
    );
  })))), /* @__PURE__ */ React.createElement("div", { style: { ...styles.cartSummary, backgroundColor: colors.bgInput, borderColor: colors.borderColor } }, /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, t("subtotal")), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", displaySubtotal.toFixed(2))), discountAmount > 0 && /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, t("discount")), /* @__PURE__ */ React.createElement("span", { style: { color: "#EF4444", fontWeight: "700" } }, "-\u20B9", discountAmount.toFixed(2))), taxType === "inter" ? /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "IGST"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", igstAmount.toFixed(2))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "CGST"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", cgstAmount.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "SGST"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", sgstAmount.toFixed(2)))), roundOff !== 0 && /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "Round Off"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "600", color: colors.textPrimary } }, roundOff > 0 ? `+\u20B9${roundOff.toFixed(2)}` : `-\u20B9${Math.abs(roundOff).toFixed(2)}`)), taxInvoiceType === "BILL_OF_SUPPLY" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#f97316", fontWeight: "800", textAlign: "center", marginTop: "4px", textTransform: "uppercase" } }, "* Bill of Supply (Exempt / Composition) *"), /* @__PURE__ */ React.createElement("div", { style: { ...styles.summaryDivider, backgroundColor: colors.borderColor } }), /* @__PURE__ */ React.createElement("div", { style: styles.grandTotalRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.accentSky, fontWeight: "900", fontSize: "15px" } }, t("payableTotal")), /* @__PURE__ */ React.createElement("span", { style: { color: colors.accentEmerald, fontWeight: "900", fontSize: "26px" } }, "\u20B9", grandTotal.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-hold-receipt-btn",
      style: {
        ...styles.holdReceiptBtn,
        opacity: cart.length === 0 ? 0.5 : 1,
        cursor: cart.length === 0 ? "not-allowed" : "pointer",
        backgroundColor: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFF7ED",
        color: colors.accentOrange,
        borderColor: isDark ? "#C2410C" : "#FDBA74"
      },
      disabled: cart.length === 0 || holdingReceipt,
      onClick: () => handleHoldReceipt(),
      title: "Hold / Park Current Receipt (F7)"
    },
    /* @__PURE__ */ React.createElement(PauseCircle, { size: 15 }),
    /* @__PURE__ */ React.createElement("span", null, activeHoldId ? "Hold Again" : "Hold Receipt", " (F7)")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-held-receipts-btn",
      style: {
        ...styles.heldReceiptsBtn,
        backgroundColor: heldReceipts.length > 0 ? isDark ? "#1E3A5F" : "#EFF6FF" : colors.bgInput,
        color: heldReceipts.length > 0 ? colors.accentSky : colors.textSecondary,
        borderColor: heldReceipts.length > 0 ? colors.accentSky : colors.borderColor
      },
      onClick: () => {
        loadHeldReceipts();
        setHeldReceiptsModalOpen(true);
      },
      title: "View and Resume Held Receipts (F4)"
    },
    /* @__PURE__ */ React.createElement(Clock, { size: 15 }),
    /* @__PURE__ */ React.createElement("span", null, "Held Receipts (", heldReceipts.length, ")")
  )), /* @__PURE__ */ React.createElement("div", { style: styles.checkoutActionGrid }, /* @__PURE__ */ React.createElement(
    "button",
    {
      style: styles.paymentShortcutBtn,
      disabled: cart.length === 0,
      onClick: () => {
        setCashReceived(grandTotal.toFixed(2));
        setCheckoutVisible(true);
      }
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(CreditCard, { size: 18 }), " ", t("checkoutBtn"))
  ))))), cart.length > 0 && /* @__PURE__ */ React.createElement("div", { style: styles.floatingMobileCartBar, className: "pos-floating-cart-bar", onClick: () => setMobileCartSheetOpen(true) }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#CBD5E1" } }, totalCartCount, " Item(s) in Cart"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "20px", fontWeight: "900", color: "#10B981" } }, "\u20B9", grandTotal.toFixed(2))), /* @__PURE__ */ React.createElement("button", { style: styles.viewCartBtn, onClick: () => setMobileCartSheetOpen(true) }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(ShoppingCart, { size: 16 }), " View Cart & Pay ", /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 })))), mobileCartSheetOpen && /* @__PURE__ */ React.createElement("div", { style: styles.modalOverlay, onClick: () => setMobileCartSheetOpen(false) }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        ...styles.cartBottomSheet,
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor
      },
      className: "pos-cart-bottom-sheet",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { style: styles.cartHeader }, /* @__PURE__ */ React.createElement("h2", { style: { ...styles.cartTitle, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(ShoppingCart, { size: 18 }), " ", t("cartTitle"), " | Items: ", cart.length, " | Total Qty: ", totalCartCount), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, /* @__PURE__ */ React.createElement("button", { style: styles.clearCartBtn, onClick: handleClearCart }, t("clearCart"), " (Esc)"), /* @__PURE__ */ React.createElement("button", { style: styles.closeBtn, onClick: () => setMobileCartSheetOpen(false) }, /* @__PURE__ */ React.createElement(X, { size: 16 })))),
    /* @__PURE__ */ React.createElement("div", { style: styles.cartTableContainer, className: "pos-cart-table-container" }, cart.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { ...styles.emptyCart, color: colors.textSecondary } }, /* @__PURE__ */ React.createElement(ShoppingCart, { size: 38, strokeWidth: 1.5, style: { color: colors.textSecondary, marginBottom: 8 } }), /* @__PURE__ */ React.createElement("p", { style: { fontWeight: "700", marginTop: "10px" } }, t("cartEmptyTitle"))) : /* @__PURE__ */ React.createElement("table", { style: styles.table }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { ...styles.trHead, borderColor: colors.borderColor, backgroundColor: colors.tableHeadBg } }, /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("productHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("qtyWeightHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("rateHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }, t("totalHeader")), /* @__PURE__ */ React.createElement("th", { style: { ...styles.th, color: colors.textSecondary } }))), /* @__PURE__ */ React.createElement("tbody", null, cart.map((item, idx) => {
      const isSelected = selectedCartIndex === idx;
      const itemSku = (item.sku || item.barcode || (menuItems || []).find((p) => (p.id || p.menu_item_id) === (item.product_id || item.id))?.sku || (menuItems || []).find((p) => (p.id || p.menu_item_id) === (item.product_id || item.id))?.barcode || "").trim();
      return /* @__PURE__ */ React.createElement(
        "tr",
        {
          key: idx,
          style: {
            ...styles.trBody,
            borderColor: colors.borderColor,
            backgroundColor: isSelected ? themeMode === "dark" ? "#1E3A5F" : "#EFF6FF" : "transparent",
            borderLeft: isSelected ? `4px solid ${colors.accentOrange || "#F97316"}` : "4px solid transparent",
            boxShadow: isSelected ? "inset 0 0 0 1px rgba(249, 115, 22, 0.35)" : "none",
            cursor: "pointer",
            transition: "background-color 0.15s ease, border-left 0.15s ease"
          },
          onClick: () => setSelectedCartIndex(idx),
          onDoubleClick: () => openCartItemEdit(idx)
        },
        /* @__PURE__ */ React.createElement("td", { style: styles.td }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "700", color: colors.textPrimary } }, item.name), isSelected && itemSku && /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: "10px",
          color: themeMode === "dark" ? "#94A3B8" : "#64748B",
          fontFamily: "monospace",
          fontWeight: "600",
          lineHeight: 1.2,
          marginTop: "1px"
        } }, "#", itemSku), item.serial_number && /* @__PURE__ */ React.createElement("div", { style: {
          fontSize: "10px",
          color: "#9333ea",
          fontFamily: "monospace",
          fontWeight: "800",
          marginTop: "1px"
        } }, "SN: ", item.serial_number), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: colors.accentOrange } }, item.is_open_item ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px", color: "#0ea5e9", fontWeight: 800 } }, /* @__PURE__ */ React.createElement(PackagePlus, { size: 11 }), "OPEN ITEM") : item.serial_number ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px", color: "#9333ea", fontWeight: 700 } }, /* @__PURE__ */ React.createElement(Tag, { size: 10 }), "SERIAL") : item.is_weight_based ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px" } }, /* @__PURE__ */ React.createElement(Scale, { size: 10 }), t("weightBadge")) : /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "3px" } }, /* @__PURE__ */ React.createElement(Package, { size: 10 }), t("pcsBadge"))), parseFloat(item.discount_amount || 0) > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#F59E0B", fontWeight: "700", marginTop: "1px" } }, "Disc: -\u20B9", parseFloat(item.discount_amount).toFixed(2)), item.is_stock_linked && item.linked_product_name && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#38BDF8", fontWeight: "600", marginTop: "1px" } }, "Stock: ", item.linked_product_name)),
        /* @__PURE__ */ React.createElement("td", { style: { ...styles.td, color: colors.textPrimary } }, item.serial_number ? /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontWeight: "800",
              padding: "3px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              backgroundColor: themeMode === "dark" ? "#3b0764" : "#f3e8ff",
              color: "#9333ea",
              border: "1px solid #d8b4fe",
              display: "inline-block",
              cursor: "pointer",
              userSelect: "none"
            },
            title: "Serial item quantity is 1. Click to edit rate.",
            onClick: (e) => {
              e.stopPropagation();
              openCartItemEdit(idx);
            }
          },
          "1"
        ) : item.is_weight_based ? /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: isSelected ? themeMode === "dark" ? "#334155" : "#DBEAFE" : "transparent"
            },
            title: "Click or press Enter to edit weight",
            onClick: (e) => {
              e.stopPropagation();
              openCartItemEdit(idx);
            }
          },
          item.displayWeight || item.item_weight,
          " ",
          item.weight_unit || "kg"
        ) : /* @__PURE__ */ React.createElement("div", { style: styles.qtyBox }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            style: { ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary },
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              updateCartQty(idx, -1);
            },
            title: "Decrease Quantity (-1)"
          },
          "-"
        ), /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              fontWeight: "800",
              margin: "0 6px",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: isSelected ? themeMode === "dark" ? "#334155" : "#DBEAFE" : "transparent"
            },
            title: "Click or press Enter to edit quantity",
            onClick: (e) => {
              e.stopPropagation();
              openCartItemEdit(idx);
            }
          },
          item.quantity
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            style: { ...styles.qtyBtn, backgroundColor: colors.bgInput, color: colors.textPrimary },
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              updateCartQty(idx, 1);
            },
            title: "Increase Quantity (+1)"
          },
          "+"
        ))),
        /* @__PURE__ */ React.createElement(
          "td",
          {
            style: { ...styles.td, color: colors.textPrimary, cursor: "pointer" },
            title: "Click to edit rate",
            onClick: (e) => {
              e.stopPropagation();
              openCartItemEdit(idx);
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: item.rate_overridden ? "800" : "normal" } }, "\u20B9", parseFloat(item.price).toFixed(2)), item.rate_overridden && /* @__PURE__ */ React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "2px" } }, /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: "9px",
                fontWeight: "800",
                padding: "1px 5px",
                borderRadius: "4px",
                backgroundColor: themeMode === "dark" ? "rgba(249, 115, 22, 0.25)" : "#FFF7ED",
                color: "#EA580C",
                border: "1px solid #FDBA74",
                lineHeight: 1.2
              },
              title: `Original menu rate: \u20B9${parseFloat(item.original_rate ?? item.price).toFixed(2)}`
            },
            "Rate edited"
          ), /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: "10px",
                color: colors.textSecondary,
                textDecoration: "line-through"
              },
              title: "Original menu rate"
            },
            "\u20B9",
            parseFloat(item.original_rate ?? item.price).toFixed(2)
          )))
        ),
        /* @__PURE__ */ React.createElement("td", { style: styles.tdBold }, "\u20B9", parseFloat(item.total_price).toFixed(2)),
        /* @__PURE__ */ React.createElement("td", { style: styles.td }, /* @__PURE__ */ React.createElement("button", { style: styles.deleteBtn, onClick: (e) => {
          e.stopPropagation();
          removeCartItem(idx);
        }, title: "Remove item" }, /* @__PURE__ */ React.createElement(Trash2, { size: 13 })))
      );
    })))),
    /* @__PURE__ */ React.createElement("div", { style: { ...styles.cartSummary, backgroundColor: colors.bgInput, borderColor: colors.borderColor } }, /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, t("subtotal")), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", displaySubtotal.toFixed(2))), discountAmount > 0 && /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, t("discount")), /* @__PURE__ */ React.createElement("span", { style: { color: "#EF4444", fontWeight: "700" } }, "-\u20B9", discountAmount.toFixed(2))), taxType === "inter" ? /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "IGST"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", igstAmount.toFixed(2))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "CGST"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", cgstAmount.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "SGST"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, "\u20B9", sgstAmount.toFixed(2)))), roundOff !== 0 && /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "Round Off"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "600", color: colors.textPrimary } }, roundOff > 0 ? `+\u20B9${roundOff.toFixed(2)}` : `-\u20B9${Math.abs(roundOff).toFixed(2)}`)), taxInvoiceType === "BILL_OF_SUPPLY" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#f97316", fontWeight: "800", textAlign: "center", marginTop: "4px", textTransform: "uppercase" } }, "* Bill of Supply (Exempt / Composition) *"), /* @__PURE__ */ React.createElement("div", { style: { ...styles.summaryDivider, backgroundColor: colors.borderColor } }), /* @__PURE__ */ React.createElement("div", { style: styles.grandTotalRow }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.accentSky, fontWeight: "900", fontSize: "15px" } }, t("payableTotal")), /* @__PURE__ */ React.createElement("span", { style: { color: colors.accentEmerald, fontWeight: "900", fontSize: "24px" } }, "\u20B9", grandTotal.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        style: {
          ...styles.holdReceiptBtn,
          opacity: cart.length === 0 ? 0.5 : 1,
          backgroundColor: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFF7ED",
          color: colors.accentOrange,
          borderColor: isDark ? "#C2410C" : "#FDBA74"
        },
        disabled: cart.length === 0 || holdingReceipt,
        onClick: () => {
          setMobileCartSheetOpen(false);
          handleHoldReceipt();
        }
      },
      /* @__PURE__ */ React.createElement(PauseCircle, { size: 15 }),
      /* @__PURE__ */ React.createElement("span", null, activeHoldId ? "Hold Again" : "Hold Receipt")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        style: {
          ...styles.heldReceiptsBtn,
          backgroundColor: heldReceipts.length > 0 ? isDark ? "#1E3A5F" : "#EFF6FF" : colors.bgInput,
          color: heldReceipts.length > 0 ? colors.accentSky : colors.textSecondary,
          borderColor: heldReceipts.length > 0 ? colors.accentSky : colors.borderColor
        },
        onClick: () => {
          setMobileCartSheetOpen(false);
          loadHeldReceipts();
          setHeldReceiptsModalOpen(true);
        }
      },
      /* @__PURE__ */ React.createElement(Clock, { size: 15 }),
      /* @__PURE__ */ React.createElement("span", null, "Held (", heldReceipts.length, ")")
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        style: styles.paymentShortcutBtn,
        disabled: cart.length === 0,
        onClick: () => {
          setMobileCartSheetOpen(false);
          setCashReceived(grandTotal.toFixed(2));
          setCheckoutVisible(true);
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(CreditCard, { size: 18 }), " ", t("checkoutBtn"), " (\u20B9", grandTotal.toFixed(2), ")")
    ))
  )), mobileSidebarDrawerOpen && /* @__PURE__ */ React.createElement("div", { style: styles.modalOverlay, onClick: () => setMobileSidebarDrawerOpen(false) }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        ...styles.mobileSidebarDrawer,
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor
      },
      className: "pos-sidebar-drawer",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { style: styles.drawerHeader }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "16px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(Layers, { size: 18 }), " Categories"), /* @__PURE__ */ React.createElement("button", { style: styles.closeBtn, onClick: () => setMobileSidebarDrawerOpen(false) }, /* @__PURE__ */ React.createElement(X, { size: 16 }))),
    /* @__PURE__ */ React.createElement("div", { style: styles.drawerBody }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        style: {
          ...styles.sidebarItem,
          backgroundColor: selectedCategory === null ? colors.accentOrange : "transparent",
          color: selectedCategory === null ? "#FFFFFF" : colors.textPrimary,
          fontWeight: selectedCategory === null ? "800" : "600"
        },
        onClick: () => {
          setSelectedCategory(null);
          setMobileSidebarDrawerOpen(false);
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: styles.sidebarItemText }, /* @__PURE__ */ React.createElement("span", null, t("allProducts")), /* @__PURE__ */ React.createElement("span", { style: { ...styles.sidebarCount, color: selectedCategory === null ? "#FFFFFF" : colors.textSecondary } }, menuItems.length))
    ), categories.map((cat) => {
      const isSelected = selectedCategory?.id === cat.id;
      const catItemCount = menuItems.filter((i) => String(i.category_id) === String(cat.id)).length;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: cat.id,
          type: "button",
          style: {
            ...styles.sidebarItem,
            backgroundColor: isSelected ? colors.accentOrange : "transparent",
            color: isSelected ? "#FFFFFF" : colors.textPrimary,
            fontWeight: isSelected ? "800" : "600"
          },
          onClick: () => {
            setSelectedCategory(cat);
            setMobileSidebarDrawerOpen(false);
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: styles.sidebarItemText }, /* @__PURE__ */ React.createElement("span", null, cat.name), /* @__PURE__ */ React.createElement("span", { style: { ...styles.sidebarCount, color: isSelected ? "#FFFFFF" : colors.textSecondary } }, catItemCount))
      );
    }))
  )), /* @__PURE__ */ React.createElement(
    WeightInputModal,
    {
      isOpen: weightModalVisible,
      product: selectedWeightProduct,
      pricingMode,
      initialWeightInKg: editingCartIndex !== null ? cart[editingCartIndex]?.item_weight || cart[editingCartIndex]?.quantity || 0 : 0,
      initialRate: editingCartIndex !== null ? cart[editingCartIndex]?.unit_rate ?? cart[editingCartIndex]?.price : null,
      user,
      receiptSettings,
      isPcs: modalIsPcs && editingCartIndex === null,
      showPrice: modalShowPrice || editingCartIndex !== null,
      onConfirm: handleWeightConfirm,
      onClose: () => {
        setWeightModalVisible(false);
        setSelectedWeightProduct(null);
        setEditingCartIndex(null);
      }
    }
  ), /* @__PURE__ */ React.createElement(
    SerialSelectionModal,
    {
      isOpen: serialModalVisible,
      product: selectedSerialProduct,
      alreadyInCartSerials,
      pricingMode,
      onConfirm: handleSerialConfirm,
      onClose: () => {
        setSerialModalVisible(false);
        setSelectedSerialProduct(null);
        autoFocusSearch();
      }
    }
  ), /* @__PURE__ */ React.createElement(
    CartQtyEditModal,
    {
      isOpen: cartQtyModalOpen,
      item: editingCartItem || (editingCartIndex !== null ? cart[editingCartIndex] : cart[selectedCartIndex]),
      pricingMode,
      user,
      receiptSettings,
      onConfirm: handleSaveCartQty,
      onClose: () => {
        setCartQtyModalOpen(false);
        setEditingCartItem(null);
        setEditingCartIndex(null);
        autoFocusSearch();
      },
      onClearCart: handleClearCart
    }
  ), /* @__PURE__ */ React.createElement(
    CartPriceEditModal,
    {
      isOpen: cartPriceModalOpen,
      item: editingPriceItem,
      onConfirm: handleSaveCartPrice,
      onClose: () => {
        setCartPriceModalOpen(false);
        setEditingPriceItem(null);
        autoFocusSearch();
      }
    }
  ), /* @__PURE__ */ React.createElement(
    OpenItemModal,
    {
      isOpen: openItemModalOpen,
      initialItem: editingOpenItem,
      menuItems,
      receiptSettings,
      onConfirm: handleSaveOpenItem,
      onClose: () => {
        setOpenItemModalOpen(false);
        setEditingOpenItem(null);
        setEditingOpenItemIndex(null);
        autoFocusSearch();
      }
    }
  ), /* @__PURE__ */ React.createElement(
    KeyboardHelpModal,
    {
      isOpen: keyboardHelpVisible,
      onClose: () => setKeyboardHelpVisible(false)
    }
  ), /* @__PURE__ */ React.createElement(
    LanguageSelectorModal,
    {
      isOpen: languageModalVisible,
      onClose: () => setLanguageModalVisible(false)
    }
  ), /* @__PURE__ */ React.createElement(
    WebBarcodeScannerModal,
    {
      open: barcodeScannerOpen,
      onClose: () => setBarcodeScannerOpen(false),
      onScan: handleCameraBarcodeScan,
      continuous: true,
      title: `POS Camera Scanner (${posScanMode === "barcode" ? "Barcode Mode" : posScanMode === "serial" ? "Serial Number Mode" : "Auto Mode"})`,
      subtitle: posScanMode === "barcode" ? "Point camera at product barcode to continuously add items to cart" : posScanMode === "serial" ? "Point camera at 8-digit Serial Number barcodes to track unit items" : "Point camera at item barcode or serial number to continuously add items to cart"
    }
  ), /* @__PURE__ */ React.createElement(
    HeldReceiptsModal,
    {
      isOpen: heldReceiptsModalOpen,
      onClose: () => setHeldReceiptsModalOpen(false),
      heldReceipts,
      onResume: handleResumeReceipt,
      onCancelReceipt: handleCancelReceipt,
      currentCart: cart,
      isDark,
      loading: loadingHeldReceipts
    }
  ), quickEditProduct && /* @__PURE__ */ React.createElement("div", { style: styles.modalOverlay, onClick: () => setQuickEditProduct(null) }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        ...styles.checkoutModal,
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor,
        maxWidth: "450px",
        padding: "24px"
      },
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { style: styles.modalHeader }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: "20px", fontWeight: "800", color: colors.textPrimary } }, /* @__PURE__ */ React.createElement(Edit3, { size: 18, style: { marginRight: 8, verticalAlign: "middle" } }), " Quick Edit Product"), /* @__PURE__ */ React.createElement("button", { style: styles.closeBtn, onClick: () => setQuickEditProduct(null) }, /* @__PURE__ */ React.createElement(X, { size: 16 }))),
    /* @__PURE__ */ React.createElement("div", { style: { margin: "16px 0 20px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase" } }, "Item Name"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: "900", color: colors.textPrimary, marginTop: "4px" } }, quickEditProduct.name)),
    quickEditError && /* @__PURE__ */ React.createElement("div", { style: { color: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontWeight: "700", fontSize: "13px" } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 15 }), " ", quickEditError)),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: "800", color: colors.textSecondary, display: "block", marginBottom: "6px", textTransform: "uppercase" } }, "Price (\u20B9)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        style: {
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          backgroundColor: colors.bgInput,
          color: colors.textPrimary,
          border: `1px solid ${colors.borderColor}`,
          fontSize: "16px",
          fontWeight: "700",
          outline: "none"
        },
        type: "number",
        step: "0.01",
        value: quickEditPrice,
        onChange: (e) => setQuickEditPrice(e.target.value)
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: "800", color: colors.textSecondary, display: "block", marginBottom: "6px", textTransform: "uppercase" } }, "Current Stock Quantity (", quickEditProduct.unit || quickEditProduct.base_unit || "pcs", ")"), /* @__PURE__ */ React.createElement(
      "input",
      {
        style: {
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          backgroundColor: colors.bgInput,
          color: colors.textPrimary,
          border: `1px solid ${colors.borderColor}`,
          fontSize: "16px",
          fontWeight: "700",
          outline: "none"
        },
        type: "number",
        value: quickEditStock,
        onChange: (e) => setQuickEditStock(e.target.value)
      }
    ))),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        style: {
          padding: "12px 14px",
          borderRadius: "8px",
          backgroundColor: "#0284C7",
          color: "#FFFFFF",
          border: "none",
          fontWeight: "800",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        },
        onClick: () => setStickerModalItems([quickEditProduct]),
        title: "Print barcode sticker for this product"
      },
      /* @__PURE__ */ React.createElement(Tag, { size: 15 }),
      " Sticker"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        style: {
          flex: 1,
          padding: "12px",
          borderRadius: "8px",
          backgroundColor: colors.bgInput,
          color: colors.textPrimary,
          border: `1px solid ${colors.borderColor}`,
          fontWeight: "800",
          cursor: "pointer"
        },
        onClick: () => setQuickEditProduct(null)
      },
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        style: {
          flex: 2,
          padding: "12px",
          borderRadius: "8px",
          backgroundColor: colors.accentOrange,
          color: "#FFFFFF",
          border: "none",
          fontWeight: "900",
          cursor: "pointer",
          opacity: savingQuickEdit ? 0.7 : 1
        },
        disabled: savingQuickEdit,
        onClick: handleSaveQuickEdit
      },
      savingQuickEdit ? "Saving..." : "Save Changes"
    ))
  )), checkoutVisible && /* @__PURE__ */ React.createElement("div", { style: styles.modalOverlay, onClick: () => setCheckoutVisible(false) }, /* @__PURE__ */ React.createElement("div", { style: { ...styles.checkoutModal, backgroundColor: colors.bgCard, borderColor: colors.borderColor }, className: "pos-checkout-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: styles.modalHeader }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: "20px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(CreditCard, { size: 20 }), " ", t("checkoutModalTitle")), /* @__PURE__ */ React.createElement("button", { style: styles.closeBtn, onClick: () => setCheckoutVisible(false) }, /* @__PURE__ */ React.createElement(X, { size: 18 }))), /* @__PURE__ */ React.createElement("div", { style: { ...styles.billBox, backgroundColor: colors.bgInput, borderColor: colors.borderColor } }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary, fontSize: "12px", fontWeight: "800" } }, t("payableAmount")), /* @__PURE__ */ React.createElement("span", { style: { color: colors.accentEmerald, fontSize: "32px", fontWeight: "900" } }, "\u20B9", grandTotal.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: {
    marginBottom: "16px",
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
    border: `1px solid ${colors.borderColor}`
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(Store, { size: 15 }), " Customer / Store Info:"), selectedCustomerId ? /* @__PURE__ */ React.createElement("span", { style: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#059669",
    backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "#ECFDF5",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #10B981"
  } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 12 }), " Existing Customer #", selectedCustomerId)) : customerName || storeName || customerPhone ? /* @__PURE__ */ React.createElement("span", { style: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#7C3AED",
    backgroundColor: isDark ? "rgba(124, 58, 237, 0.2)" : "#F5F3FF",
    padding: "2px 8px",
    borderRadius: "12px",
    border: "1px solid #A78BFA"
  } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(Sparkles, { size: 12 }), " Auto-Creates Record")) : null), selectedCustomerId && selectedCustomerData && /* @__PURE__ */ React.createElement("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: isDark ? "rgba(30, 58, 138, 0.25)" : "#EFF6FF",
    border: `1px solid ${isDark ? "#1E40AF" : "#BFDBFE"}`,
    borderRadius: "8px",
    padding: "6px 10px",
    marginBottom: "8px",
    fontSize: "11px",
    gap: "8px",
    flexWrap: "wrap"
  } }, /* @__PURE__ */ React.createElement("span", { style: { color: colors.textPrimary, fontWeight: "700" } }, "Outstanding: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#EF4444" } }, "\u20B9", parseFloat(selectedCustomerData.current_balance || 0).toFixed(2))), /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "Credit Limit: ", /* @__PURE__ */ React.createElement("b", { style: { color: colors.textPrimary } }, parseFloat(selectedCustomerData.credit_limit || 0) > 0 ? `\u20B9${parseFloat(selectedCustomerData.credit_limit).toFixed(2)}` : "No Limit")), /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary } }, "Available: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#10B981" } }, parseFloat(selectedCustomerData.credit_limit || 0) > 0 ? `\u20B9${Math.max(0, parseFloat(selectedCustomerData.credit_limit) - parseFloat(selectedCustomerData.current_balance || 0)).toFixed(2)}` : "Unlimited")), selectedCustomerData.allow_credit === 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#DC2626", fontWeight: "800", backgroundColor: "#FEE2E2", padding: "1px 6px", borderRadius: "4px" } }, "Credit Disabled")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search existing customer by name or phone...",
      value: customerSearchQuery,
      onChange: (e) => {
        setCustomerSearchQuery(e.target.value);
        setCustomerDropdownOpen(true);
      },
      onFocus: () => setCustomerDropdownOpen(true),
      style: {
        width: "100%",
        padding: "8px 10px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        fontSize: "13px",
        fontWeight: "500",
        outline: "none",
        boxSizing: "border-box"
      }
    }
  ), customerDropdownOpen && /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.bgCard,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "8px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
    maxHeight: "180px",
    overflowY: "auto",
    marginTop: "2px"
  } }, customersList.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase();
    return c.name && c.name.toLowerCase().includes(q) || c.phone && c.phone.includes(q) || c.store_name && c.store_name.toLowerCase().includes(q);
  }).slice(0, 10).map((c) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: c.id,
      onClick: () => handleSelectCustomer(c),
      style: {
        padding: "8px 12px",
        cursor: "pointer",
        borderBottom: `1px solid ${colors.borderColor}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
        backgroundColor: selectedCustomerId === c.id ? isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" : "transparent"
      },
      onMouseEnter: (e) => e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC",
      onMouseLeave: (e) => e.currentTarget.style.backgroundColor = selectedCustomerId === c.id ? isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" : "transparent"
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "700", color: colors.textPrimary } }, c.store_name ? `${c.store_name} (${c.name})` : c.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: colors.textSecondary } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(Phone, { size: 11 }), " ", c.phone || "No phone", " ", c.address ? /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2022 ", /* @__PURE__ */ React.createElement(MapPin, { size: 11 }), " ", c.address) : ""))),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", fontWeight: "700", color: "#0284C7" } }, "Select")
  )), customersList.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase();
    return c.name && c.name.toLowerCase().includes(q) || c.phone && c.phone.includes(q) || c.store_name && c.store_name.toLowerCase().includes(q);
  }).length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px", fontSize: "12px", color: colors.textSecondary, textAlign: "center" } }, "No existing store/customer matched. Enter details below to auto-create!"), /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 8px", borderTop: `1px solid ${colors.borderColor}`, textAlign: "right" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.stopPropagation();
        setCustomerDropdownOpen(false);
      },
      style: { fontSize: "11px", padding: "2px 8px", background: "none", border: "none", color: colors.textSecondary, cursor: "pointer" }
    },
    "Close List ",
    /* @__PURE__ */ React.createElement(X, { size: 12, style: { marginLeft: 3, verticalAlign: "middle" } })
  )))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "Customer Name / Store:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "e.g. Ramesh General Store",
      value: customerName,
      onChange: (e) => setCustomerName(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        fontSize: "13px",
        boxSizing: "border-box"
      }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "Phone Number:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "e.g. 9876543210",
      value: customerPhone,
      onChange: (e) => setCustomerPhone(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        fontSize: "13px",
        boxSizing: "border-box"
      }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "8px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "Store Address (Optional):"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "e.g. Market Road, Sector 4",
      value: customerAddress,
      onChange: (e) => setCustomerAddress(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        fontSize: "13px",
        boxSizing: "border-box"
      }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "GSTIN (Optional):"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "e.g. 27ABCDE1234F1Z5",
      value: customerGst,
      onChange: (e) => setCustomerGst(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        fontSize: "13px",
        boxSizing: "border-box"
      }
    }
  ))), selectedCustomerId && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", textAlign: "right" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleClearCustomer,
      style: {
        background: "none",
        border: "none",
        color: "#EF4444",
        fontSize: "11px",
        fontWeight: "700",
        cursor: "pointer",
        padding: 0
      }
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(X, { size: 12 }), " Clear & Select Different Customer")
  ))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "15px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: "800", color: colors.textSecondary, display: "block", marginBottom: "6px", textTransform: "uppercase" } }, "Place of Supply (GST Type):"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: taxType,
      onChange: (e) => setTaxType(e.target.value),
      style: {
        width: "100%",
        padding: "10px",
        borderRadius: "8px",
        backgroundColor: colors.bgInput,
        color: colors.textPrimary,
        border: `1px solid ${colors.borderColor}`,
        fontSize: "14px",
        fontWeight: "600",
        outline: "none",
        cursor: "pointer"
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "intra" }, "Intra-State (CGST + SGST split)"),
    /* @__PURE__ */ React.createElement("option", { value: "inter" }, "Inter-State (IGST)")
  )), /* @__PURE__ */ React.createElement("label", { style: { ...styles.label, color: colors.textSecondary } }, t("selectPayment")), /* @__PURE__ */ React.createElement("div", { style: { ...styles.payGrid, gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: { ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...paymentMode === "cash" ? styles.payActive : {}, opacity: submittingSale ? 0.7 : 1 },
      onClick: () => setPaymentMode("cash"),
      disabled: submittingSale
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(Banknote, { size: 16 }), " Cash (F9)")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: { ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...paymentMode === "card" ? styles.payActive : {}, opacity: submittingSale ? 0.7 : 1 },
      onClick: () => setPaymentMode("card"),
      disabled: submittingSale
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(CreditCard, { size: 16 }), " Card (F11)")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: { ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...paymentMode === "upi" ? styles.payActive : {}, opacity: submittingSale ? 0.7 : 1 },
      onClick: () => setPaymentMode("upi"),
      disabled: submittingSale
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(Smartphone, { size: 16 }), " UPI (F10)")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: { ...styles.payBtn, backgroundColor: colors.bgInput, borderColor: colors.borderColor, color: colors.textPrimary, ...paymentMode === "bank" ? styles.payActive : {}, opacity: submittingSale ? 0.7 : 1 },
      onClick: () => setPaymentMode("bank"),
      disabled: submittingSale
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(FileText, { size: 16 }), " Bank")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      id: "pos-credit-udhar-pay-btn",
      style: {
        ...styles.payBtn,
        backgroundColor: paymentMode === "credit" || paymentMode === "due" ? "rgba(234, 88, 12, 0.15)" : colors.bgInput,
        borderColor: paymentMode === "credit" || paymentMode === "due" ? "#EA580C" : colors.borderColor,
        color: paymentMode === "credit" || paymentMode === "due" ? "#EA580C" : colors.textPrimary,
        fontWeight: paymentMode === "credit" || paymentMode === "due" ? "900" : "700",
        opacity: submittingSale ? 0.7 : 1
      },
      onClick: () => {
        setPaymentMode("credit");
        if (!selectedCustomerId) {
          notify?.warning("Please select a customer for Credit/Udhar sale.", "Customer Required");
        }
      },
      disabled: submittingSale
    },
    /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 16 }), " Credit / Udhar")
  )), paymentMode === "cash" && /* @__PURE__ */ React.createElement("div", { style: { ...styles.cashBox, backgroundColor: colors.bgInput, borderColor: colors.borderColor } }, /* @__PURE__ */ React.createElement("label", { style: { ...styles.label, color: colors.textSecondary } }, t("cashReceivedLabel")), /* @__PURE__ */ React.createElement(
    "input",
    {
      style: { ...styles.cashInput, backgroundColor: colors.bgCard, color: colors.textPrimary },
      type: "number",
      value: cashReceived,
      onChange: (e) => setCashReceived(e.target.value),
      autoFocus: true
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { ...styles.changeRow, color: colors.textPrimary } }, /* @__PURE__ */ React.createElement("span", null, t("changeReturnLabel")), /* @__PURE__ */ React.createElement("span", { style: { color: changeToReturn > 0 ? colors.accentEmerald : colors.textSecondary, fontWeight: "900", fontSize: "20px" } }, "\u20B9", changeToReturn.toFixed(2)))), (paymentMode === "credit" || paymentMode === "due") && /* @__PURE__ */ React.createElement("div", { style: { ...styles.cashBox, backgroundColor: colors.bgInput, borderColor: colors.borderColor } }, !selectedCustomerId ? /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid #EF4444", borderRadius: "8px", padding: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#EF4444", fontWeight: "800", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16 }), " Customer Required for Credit / Udhar"), /* @__PURE__ */ React.createElement("div", { style: { color: colors.textSecondary, fontSize: "12px", marginTop: "4px" } }, "Please select an existing customer or enter customer details above. Anonymous credit sales are not permitted.")) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", paddingBottom: "6px", borderBottom: `1px solid ${colors.borderColor}` } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", fontWeight: "800", color: colors.textPrimary, textTransform: "uppercase" } }, "Udhar / Credit Settlement"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: colors.accentOrange, fontWeight: "700" } }, "Customer #", selectedCustomerId)), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "Down Payment / Paid Now:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "0",
      max: grandTotal,
      placeholder: "\u20B90.00 (Full Udhar)",
      value: creditPartialPaidAmount,
      onChange: (e) => setCreditPartialPaidAmount(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgCard,
        color: colors.textPrimary,
        fontSize: "13px",
        boxSizing: "border-box"
      }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "Down Payment Mode:"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: creditPartialPaidMode,
      onChange: (e) => setCreditPartialPaidMode(e.target.value),
      style: {
        width: "100%",
        padding: "6px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgCard,
        color: colors.textPrimary,
        fontSize: "13px",
        boxSizing: "border-box"
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "cash" }, "Cash"),
    /* @__PURE__ */ React.createElement("option", { value: "upi" }, "UPI"),
    /* @__PURE__ */ React.createElement("option", { value: "card" }, "Card"),
    /* @__PURE__ */ React.createElement("option", { value: "bank" }, "Bank / Transfer")
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "8px", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 10px", backgroundColor: colors.bgCard, borderRadius: "6px", border: `1px solid ${colors.borderColor}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: colors.textSecondary, fontWeight: "700" } }, "Credit / Udhar Due:"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "17px", fontWeight: "900", color: colors.accentOrange } }, "\u20B9", Math.max(0, grandTotal - (parseFloat(creditPartialPaidAmount) || 0)).toFixed(2))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: "700", color: colors.textSecondary, display: "block", marginBottom: "2px" } }, "Due Date:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: creditDueDate,
      onChange: (e) => setCreditDueDate(e.target.value),
      style: {
        width: "100%",
        padding: "5px 8px",
        borderRadius: "6px",
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.bgCard,
        color: colors.textPrimary,
        fontSize: "12px",
        boxSizing: "border-box"
      }
    }
  ))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      style: {
        width: "100%",
        padding: "12px",
        backgroundColor: "#D97706",
        color: "#FFFFFF",
        border: "none",
        borderRadius: "10px",
        fontSize: "15px",
        fontWeight: "800",
        cursor: submittingSale ? "not-allowed" : "pointer",
        opacity: submittingSale ? 0.7 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "0 2px 6px rgba(217, 119, 6, 0.3)"
      },
      onClick: () => !submittingSale && handleCompleteSale(paymentMode || "pending", "save_only", "pending"),
      disabled: submittingSale,
      title: "Saves order in Pending status and reserves item stocks without deducting physical inventory"
    },
    /* @__PURE__ */ React.createElement(ClipboardList, { size: 18 }),
    " Place Sales Order (Pending / Reserve Stock)"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      style: { ...styles.completeBtn, opacity: submittingSale ? 0.7 : 1 },
      onClick: () => !submittingSale && handleCompleteSale(paymentMode || "cash", "print_receipt_only", "completed"),
      disabled: submittingSale
    },
    submittingSale ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(RotateCw, { size: 16, className: "spin" }), " Processing Sale & Printing...") : /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 18 }), " ", t("completeSaleBtn"), " (F12)")
  )))), pendingOrdersModalOpen && /* @__PURE__ */ React.createElement("div", { style: styles.modalOverlay, onClick: () => setPendingOrdersModalOpen(false) }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        ...styles.checkoutModal,
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor,
        maxWidth: "720px",
        width: "94%",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px"
      },
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { style: { ...styles.modalHeader, marginBottom: "14px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 22, style: { color: colors.accentOrange } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: "18px", fontWeight: "900", color: colors.textPrimary } }, "Pending Sales Orders (", pendingOrders.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: colors.textSecondary } }, "Review, confirm to deduct stock, or cancel to release reserved stock"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: loadPendingOrders,
        style: {
          padding: "6px 12px",
          borderRadius: "6px",
          backgroundColor: colors.bgInput,
          color: colors.textPrimary,
          border: `1px solid ${colors.borderColor}`,
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        },
        disabled: loadingPendingOrders
      },
      loadingPendingOrders ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(RotateCw, { size: 12, className: "spin" }), " Syncing...") : /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(RotateCw, { size: 12 }), " Refresh")
    ), /* @__PURE__ */ React.createElement("button", { style: styles.closeBtn, onClick: () => setPendingOrdersModalOpen(false) }, /* @__PURE__ */ React.createElement(X, { size: 16 })))),
    /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "4px" } }, pendingOrders.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 20px", color: colors.textSecondary } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 42, strokeWidth: 1.5, style: { color: colors.textSecondary } })), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "800", fontSize: "16px", color: colors.textPrimary } }, "No Pending Orders"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", marginTop: "4px" } }, "All orders are confirmed and physical stocks are fully up to date.")) : pendingOrders.map((ord) => {
      const items = Array.isArray(ord.items) ? ord.items : [];
      const isConfirming = confirmingOrderId === ord.id;
      const isCancelling = cancellingOrderId === ord.id;
      const orderDate = ord.created_at ? new Date(ord.created_at).toLocaleString() : "Recent";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: ord.id,
          style: {
            padding: "14px",
            borderRadius: "10px",
            border: `1px solid ${colors.borderColor}`,
            backgroundColor: colors.bgInput,
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "900", fontSize: "15px", color: colors.textPrimary } }, "#", ord.unique_order_number || ord.order_number || ord.id), /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: "11px",
          fontWeight: "800",
          backgroundColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#FEF3C7",
          color: "#D97706",
          padding: "2px 8px",
          borderRadius: "10px",
          border: "1px solid rgba(245, 158, 11, 0.4)"
        } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(Clock, { size: 11 }), " PENDING / RESERVED"))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: colors.textSecondary, marginTop: "2px" } }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(Clock, { size: 11 }), " ", orderDate, " ", ord.salesman_name ? /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2022 ", /* @__PURE__ */ React.createElement(User, { size: 11 }), " Salesman: ", ord.salesman_name) : ord.cashier_name ? `\u2022 Staff: ${ord.cashier_name}` : ""))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "900", fontSize: "18px", color: "#10B981" } }, "\u20B9", parseFloat(ord.total_amount || 0).toFixed(2)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: colors.textSecondary, textTransform: "uppercase" } }, "Pay: ", ord.payment_mode || "Pending"))),
        (ord.customer_name || ord.customer_phone || ord.store_name) && /* @__PURE__ */ React.createElement("div", { style: {
          padding: "6px 10px",
          borderRadius: "6px",
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          border: `1px solid ${colors.borderColor}`,
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap"
        } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", color: colors.textPrimary } }, /* @__PURE__ */ React.createElement(Store, { size: 13, style: { marginRight: 4, verticalAlign: "middle" } }), " ", ord.store_name ? `${ord.store_name} (${ord.customer_name})` : ord.customer_name), ord.customer_phone && /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary, display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(Phone, { size: 11 }), " ", ord.customer_phone), ord.customer_address && /* @__PURE__ */ React.createElement("span", { style: { color: colors.textSecondary, display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(MapPin, { size: 11 }), " ", ord.customer_address)),
        items.length > 0 && /* @__PURE__ */ React.createElement("div", { style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "6px 0"
        } }, items.map((it, iIdx) => {
          const isWeight = it.item_weight !== null && it.item_weight !== void 0;
          const qtyStr = isWeight ? `${parseFloat(it.item_weight).toFixed(3)} ${it.weight_unit || "kg"}` : `${it.quantity} ${it.unit || "pcs"}`;
          return /* @__PURE__ */ React.createElement(
            "span",
            {
              key: iIdx,
              style: {
                fontSize: "12px",
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                color: colors.textPrimary,
                fontWeight: "600"
              }
            },
            /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(Package, { size: 12 }), " ", it.item_name || it.name, ": ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#F97316" } }, qtyStr), " (\u20B9", parseFloat(it.price || 0).toFixed(2), ")")
          );
        })),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "4px" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            style: {
              flex: 1,
              padding: "9px 12px",
              backgroundColor: "#059669",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              fontWeight: "800",
              fontSize: "13px",
              cursor: isConfirming || isCancelling ? "not-allowed" : "pointer",
              opacity: isConfirming || isCancelling ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            },
            disabled: isConfirming || isCancelling,
            onClick: () => handleConfirmPending(ord),
            title: "Confirm this order and permanently deduct items from physical stock"
          },
          isConfirming ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(RotateCw, { size: 14, className: "spin" }), " Confirming...") : /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 15 }), " Confirm Order (Deduct Stock)")
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            style: {
              padding: "9px 14px",
              backgroundColor: "transparent",
              color: "#EF4444",
              border: "1px solid #EF4444",
              borderRadius: "6px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: isConfirming || isCancelling ? "not-allowed" : "pointer",
              opacity: isConfirming || isCancelling ? 0.6 : 1
            },
            disabled: isConfirming || isCancelling,
            onClick: () => handleCancelPending(ord),
            title: "Cancel order and release reserved stock"
          },
          isCancelling ? /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(RotateCw, { size: 14, className: "spin" }), " ...") : /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(X, { size: 14 }), " Cancel")
        ))
      );
    }))
  )), stickerModalItems && /* @__PURE__ */ React.createElement(
    ProductStickerModal,
    {
      open: true,
      onClose: () => setStickerModalItems(null),
      items: stickerModalItems,
      shopData: receiptSettings
    }
  ), /* @__PURE__ */ React.createElement("style", null, `
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
      `));
}
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
    overflow: "hidden",
    position: "relative"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: "1px solid #E2E8F0",
    flexWrap: "wrap",
    gap: "8px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  logo: {
    fontSize: "26px"
  },
  brandTitle: {
    fontSize: "17px",
    fontWeight: "900",
    margin: 0
  },
  storeName: {
    fontSize: "11px",
    color: "#F97316",
    fontWeight: "700"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap"
  },
  mobileTabGroup: {
    display: "flex",
    backgroundColor: "#F1F5F9",
    borderRadius: "8px",
    padding: "2px"
  },
  mobileTabBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer"
  },
  headerIconBtn: {
    border: "1px solid #CBD5E1",
    padding: "6px 10px",
    borderRadius: "8px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer"
  },
  shortcutHelpBtn: {
    backgroundColor: "#0284C7",
    color: "#FFFFFF",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer"
  },
  mainLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden"
  },
  catalogSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "14px",
    overflow: "hidden"
  },
  searchForm: {
    display: "flex",
    alignItems: "center",
    borderRadius: "12px",
    border: "2px solid #F97316",
    padding: "8px 14px",
    marginBottom: "12px"
  },
  searchIcon: {
    fontSize: "18px",
    marginRight: "8px"
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    fontSize: "15px",
    fontWeight: "600",
    outline: "none"
  },
  clearSearchBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold"
  },
  categoryRail: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    marginBottom: "12px",
    paddingBottom: "4px"
  },
  catBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#64748B"
  },
  emptyProductsBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#64748B"
  },
  controlBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    borderRadius: "10px",
    border: "1px solid #E2E8F0",
    marginBottom: "10px",
    flexWrap: "wrap"
  },
  controlPill: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 12px",
    borderRadius: "16px",
    border: "1px solid #E2E8F0",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.15s ease"
  },
  densityGroup: {
    display: "flex",
    alignItems: "center",
    borderRadius: "16px",
    padding: "2px",
    border: "1px solid #E2E8F0"
  },
  densityBtn: {
    border: "none",
    padding: "4px 10px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "11px",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.15s ease"
  },
  catalogBodyLayout: {
    display: "flex",
    gap: "10px",
    flex: 1,
    overflow: "hidden"
  },
  sidebarContainer: {
    width: "210px",
    flexShrink: 0,
    borderRadius: "12px",
    border: "1px solid #E2E8F0",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto"
  },
  sidebarItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.15s ease"
  },
  sidebarItemText: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%"
  },
  sidebarCount: {
    fontSize: "11px",
    fontWeight: "700",
    marginLeft: "6px",
    opacity: 0.85
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: "10px",
    overflowY: "auto",
    flex: 1,
    paddingRight: "4px"
  },
  productCard: {
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid #E2E8F0",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "120px"
  },
  imageContainer: {
    width: "100%",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    border: "1px solid #F1F5F9"
  },
  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px"
  },
  badge: {
    fontSize: "10px",
    fontWeight: "800",
    padding: "2px 5px",
    borderRadius: "4px"
  },
  weightBadge: {
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    color: "#0284C7"
  },
  pieceBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10B981"
  },
  barcodeText: {
    fontSize: "10px"
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: "700",
    margin: "0 0 8px 0"
  },
  cardFooter: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between"
  },
  cardPrice: {
    fontSize: "15px",
    fontWeight: "900",
    color: "#10B981"
  },
  cardUnit: {
    fontSize: "10px"
  },
  cartSection: {
    borderLeft: "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column",
    padding: "14px",
    height: "100%",
    overflow: "hidden",
    minHeight: 0,
    boxSizing: "border-box",
    flexShrink: 0
  },
  cartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    flexShrink: 0
  },
  cartTitle: {
    fontSize: "15px",
    fontWeight: "800",
    margin: 0
  },
  clearCartBtn: {
    backgroundColor: "transparent",
    color: "#EF4444",
    border: "none",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "12px"
  },
  cartTableContainer: {
    flex: "1 1 0%",
    overflowY: "auto",
    overflowX: "hidden",
    minHeight: 0,
    marginBottom: "10px",
    WebkitOverflowScrolling: "touch"
  },
  emptyCart: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  trHead: {
    borderBottom: "1px solid #E2E8F0",
    textAlign: "left"
  },
  th: {
    padding: "6px 4px",
    fontSize: "11px",
    fontWeight: "800"
  },
  trBody: {
    borderBottom: "1px solid #E2E8F0",
    cursor: "pointer"
  },
  td: {
    padding: "8px 4px",
    fontSize: "12px"
  },
  tdBold: {
    padding: "8px 4px",
    fontSize: "12px",
    fontWeight: "900",
    color: "#10B981"
  },
  qtyBox: {
    display: "flex",
    alignItems: "center"
  },
  qtyBtn: {
    border: "none",
    borderRadius: "4px",
    width: "22px",
    height: "22px",
    cursor: "pointer",
    fontWeight: "bold",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    fontSize: "14px",
    lineHeight: "1",
    padding: 0
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#EF4444",
    cursor: "pointer",
    fontWeight: "bold"
  },
  cartSummary: {
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid #E2E8F0"
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginBottom: "4px"
  },
  summaryDivider: {
    height: "1px",
    margin: "8px 0"
  },
  grandTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  checkoutActionGrid: {
    display: "flex",
    gap: "8px"
  },
  paymentShortcutBtn: {
    width: "100%",
    backgroundColor: "#F97316",
    color: "#FFFFFF",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "15px",
    cursor: "pointer"
  },
  holdReceiptBtn: {
    border: "1px solid",
    borderRadius: "8px",
    padding: "9px 10px",
    fontWeight: "800",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.15s ease"
  },
  heldReceiptsBtn: {
    border: "1px solid",
    borderRadius: "8px",
    padding: "9px 10px",
    fontWeight: "800",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease"
  },
  floatingMobileCartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    color: "#FFFFFF",
    padding: "12px 16px",
    display: "none",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 -4px 12px rgba(0,0,0,0.3)",
    zIndex: 999
  },
  viewCartBtn: {
    backgroundColor: "#F97316",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "14px",
    cursor: "pointer"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px"
  },
  checkoutModal: {
    borderRadius: "16px",
    width: "100%",
    maxWidth: "460px",
    padding: "20px",
    border: "1px solid #E2E8F0"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },
  closeBtn: {
    background: "#E2E8F0",
    border: "none",
    color: "#475569",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    cursor: "pointer"
  },
  billBox: {
    borderRadius: "12px",
    padding: "14px",
    textAlign: "center",
    marginBottom: "14px",
    border: "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column"
  },
  label: {
    fontSize: "11px",
    fontWeight: "800",
    display: "block",
    marginBottom: "6px"
  },
  payGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "14px"
  },
  payBtn: {
    padding: "10px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer"
  },
  payActive: {
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    color: "#F97316",
    borderColor: "#F97316",
    fontWeight: "900"
  },
  cashBox: {
    borderRadius: "10px",
    padding: "10px",
    marginBottom: "14px",
    border: "1px solid #E2E8F0"
  },
  cashInput: {
    width: "100%",
    border: "2px solid #0284C7",
    borderRadius: "8px",
    fontSize: "22px",
    fontWeight: "900",
    padding: "6px 10px",
    marginBottom: "8px",
    outline: "none",
    boxSizing: "border-box"
  },
  changeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "700"
  },
  completeBtn: {
    width: "100%",
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "900",
    fontSize: "15px",
    cursor: "pointer"
  },
  mobileSidebarDrawer: {
    borderRadius: "16px",
    width: "280px",
    maxWidth: "85vw",
    height: "80vh",
    padding: "16px",
    border: "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: "16px",
    top: "10vh",
    boxSizing: "border-box",
    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
    zIndex: 99999
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    borderBottom: "1px solid #E2E8F0",
    paddingBottom: "10px"
  },
  drawerBody: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  cartBottomSheet: {
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: "520px",
    height: "80vh",
    padding: "20px",
    border: "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    bottom: 0,
    boxSizing: "border-box",
    boxShadow: "0 -10px 25px rgba(0,0,0,0.3)",
    zIndex: 99999
  }
};
