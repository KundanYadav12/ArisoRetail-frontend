import React, { useState, useEffect, useMemo } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Button, TextField, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, useMediaQuery, IconButton, CircularProgress, Checkbox, TablePagination, InputAdornment, TableSortLabel, Tooltip, FormControl, InputLabel, Badge, Switch, FormControlLabel, Divider, Alert, Menu, RadioGroup, Radio, Popover } from '@mui/material';
import { Plus, Edit2, Scale, Camera, Smartphone, Trash2, Shield, Settings, FileText, Wifi, List, RefreshCw, Download, Layers, GripVertical, Search, X, Filter, ArrowUpDown, ArrowRightLeft, CheckSquare, Square, Utensils, CheckCircle, XCircle, Printer, Users, UserPlus, Key, ArrowUp, ArrowDown, Boxes, Package, AlertTriangle, TrendingUp, History, FileSpreadsheet, Save, Upload, Image as ImageIcon, Store, QrCode, Tag, ClipboardList, Clock, User, MoreVertical, Share2, Mail, Truck, RotateCcw, Landmark, Receipt, BadgeIndianRupee, Eye, ShoppingCart } from 'lucide-react';
import { apiFetch, getApiUrl, downloadFile, resolveImageUrl, confirmPendingOrder, cancelPendingOrder } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import DateRangePicker from '../components/DateRangePicker';
import GstDashboard from '../components/GstDashboard';
import ReportsSuite from '../components/reports/ReportsSuite';
import FinancialAccountsSuite from '../components/finance/FinancialAccountsSuite';
import ExpenseManagementSuite from '../components/finance/ExpenseManagementSuite';
import DayEndDashboard from '../components/day_end/DayEndDashboard';
import PaymentReconciliationSuite from '../components/finance/PaymentReconciliationSuite';
import SupplierPayablesDashboard from '../components/finance/SupplierPayablesDashboard';
import CreditNoteModal from '../components/CreditNoteModal';
import MenuBulkImportModal from '../components/MenuBulkImportModal';
import ProductStickerModal from '../components/ProductStickerModal';
import SalesOrderModal from '../components/SalesOrderModal';
import SalesOrderVoucherModal from '../components/SalesOrderVoucherModal';
import PartyTab from '../components/PartyTab';
import InventorySuite from '../components/inventory/InventorySuite';
import SerialNumberSuite from '../components/inventory/SerialNumberSuite';
import AdminSidebar from '../components/AdminSidebar';
import { openWhatsAppShare } from '../utils/whatsappHelper';
import { generateLocalHtmlReceipt, generateLocalHtmlKot, generateLocalEscPosReceipt, generateLocalEscPosKot, safeUtf8ToBase64, is2InchPaper, formatReceiptDateTime, printHtmlSilentlyViaIframe } from '../utils/localReceiptGenerator';
import { db } from '../utils/offlineDb';
import { getISTDateString } from '../utils/dateUtils';

const getLocalDateString = (date) => {
  return getISTDateString(date);
};

const resolveDateRange = (preset, stateFrom, stateTo) => {
  if (preset === 'custom') {
    return { from: stateFrom, to: stateTo };
  }
  const todayStr = getLocalDateString(new Date());
  let from = '';
  let to = `${todayStr} 23:59:59`;

  if (preset === 'today') {
    from = `${todayStr} 00:00:00`;
  } else if (preset === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = getLocalDateString(d);
    from = `${yesterdayStr} 00:00:00`;
    to = `${yesterdayStr} 23:59:59`;
  } else if (preset === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    from = `${getLocalDateString(d)} 00:00:00`;
  } else if (preset === '15days') {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    from = `${getLocalDateString(d)} 00:00:00`;
  } else if (preset === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    from = `${getLocalDateString(d)} 00:00:00`;
  } else if (preset === 'all') {
    from = '';
    to = '';
  }
  return { from, to };
};

const ALL_ADMIN_MODULES = [
  // 1. Sales & POS
  { key: 'pos_billing', label: 'POS Billing & Cashier Terminal', category: 'Sales & POS', desc: 'Counter POS terminal, cart billing, customer checkout, and cash drawer' },
  { key: 'order_history', label: 'Order History & Receipts', category: 'Sales & POS', desc: 'Past receipts, refunds, reprints, kitchen status, and invoice history' },
  { key: 'sales_orders', label: 'Sales Orders & Estimates', category: 'Sales & POS', desc: 'Commercial sales orders, quotations, and delivery challans' },
  { key: 'customers', label: 'Parties & Customers Directory', category: 'Sales & POS', desc: 'Customer directory, party ledger statements, and credit balances' },

  // 2. Catalog & Store Administration
  { key: 'menu_items', label: 'Menu Items / Products Catalog', category: 'Catalog & Store Administration', desc: 'Products, selling prices, tax slabs, barcode labels, and food items' },
  { key: 'categories', label: 'Categories Management', category: 'Catalog & Store Administration', desc: 'Product categories, hierarchies, and display groupings' },
  { key: 'printers', label: 'Printers & Kitchen Routing', category: 'Catalog & Store Administration', desc: 'Network printers, thermal ESC/POS, and kitchen routing' },
  { key: 'gst', label: 'GST & Compliance Suite', category: 'Catalog & Store Administration', desc: 'GSTR-1, GSTR-3B tax summaries, HSN/SAC breakdowns, and tax rates' },
  { key: 'settings', label: 'Receipt & GST Settings', category: 'Catalog & Store Administration', desc: 'Store invoice headers, footer notes, terms, round-off, and numbering sequences' },
  { key: 'profile', label: 'Retail Store Profile', category: 'Catalog & Store Administration', desc: 'Store business address, GSTIN, phone, currency, and company details' },
  { key: 'staff', label: 'Staff & Cashiers Management', category: 'Catalog & Store Administration', desc: 'Staff user accounts, roles, assigned store/warehouse, and module permissions' },

  // 3. Reports & Analytics
  { key: 'reports', label: 'Reports & Business Intelligence', category: 'Reports & Analytics', desc: 'Sales summaries, category breakdown, tax reports, and business KPIs' },
  { key: 'item_sales_report', label: 'Item Sales Report & Analytics', category: 'Reports & Analytics', desc: 'Item-wise velocity, revenue contribution, and product sales insights' },

  // 4. Inventory & Warehouses
  { key: 'inventory', label: 'Inventory & Warehouses (Core)', category: 'Inventory & Warehouse Operations', desc: 'Main inventory portal, stock management, and multi-location tracking' },
  { key: 'warehouse_dashboard', label: 'Warehouse Dashboard & Metrics', category: 'Inventory & Warehouse Operations', desc: 'Executive inventory valuation, low stock alerts, and warehouse KPIs' },
  { key: 'inventory_catalog', label: 'Stock Catalog & Levels', category: 'Inventory & Warehouse Operations', desc: 'View and search stock levels, SKU items, categories, and barcode numbers' },
  { key: 'warehouses', label: 'Warehouses & Godowns List', category: 'Inventory & Warehouse Operations', desc: 'View warehouses/godowns, locations, and localized stock numbers' },
  { key: 'rack_management', label: 'Rack & Bin Management', category: 'Inventory & Warehouse Operations', desc: 'Manage warehouse racks, shelves, bins, and exact item location mappings' },
  { key: 'stock_transfer', label: 'Stock Transfer', category: 'Inventory & Warehouse Operations', desc: 'Create and dispatch stock transfers between warehouses and branches' },
  { key: 'stock_receiving', label: 'Stock Receiving & GRN', category: 'Inventory & Warehouse Operations', desc: 'Receive incoming stock transfers and process Goods Received Notes (GRN)' },
  { key: 'stock_count', label: 'Stock Counting Suite', category: 'Inventory & Warehouse Operations', desc: 'Physical audit sessions, device assignments, and barcode verification' },
  { key: 'stock_adjustment', label: 'Stock Adjustment', category: 'Inventory & Warehouse Operations', desc: 'Quantity adjustments, wastage write-offs, and stock corrections' },
  { key: 'stock_requests', label: 'Stock Requests & Indents', category: 'Inventory & Warehouse Operations', desc: 'Store indenting & replenishment requests' },
  { key: 'stock_ledger', label: 'Stock Ledger Audit', category: 'Inventory & Warehouse Operations', desc: 'Perpetual transaction journal & movement history' },
  { key: 'warehouse_reports', label: 'Warehouse Reports', category: 'Inventory & Warehouse Operations', desc: 'Item-wise velocity & inventory analytics' },
  { key: 'suppliers', label: 'Suppliers & Vendor Directory', category: 'Inventory & Warehouse Operations', desc: 'Supplier directory & ledger statements' },
  { key: 'serial_numbers', label: 'Product Serial Number Tracking', category: 'Inventory & Warehouse Operations', desc: '8-digit serial number tracking, barcode printing, manufacturer purchase and customer sale traceability' },

  // 5. Finance & Banking
  { key: 'bank_accounts', label: 'Bank & Financial Accounts', category: 'Finance & Banking', desc: 'Bank accounts, cash registers, and inter-account transfers' },
  { key: 'expenses', label: 'Expense Management', category: 'Finance & Banking', desc: 'Store petty cash & operational expense vouchers' },
  { key: 'day_end', label: 'Day End & Cash Closing', category: 'Finance & Banking', desc: 'Daily shift register closing and denomination verification' },
  { key: 'payment_reconciliation', label: 'Payment Reconciliation', category: 'Finance & Banking', desc: 'UPI, Card, and Cash gateway settlement audit' }
];

const MODULE_CATEGORIES = [
  { name: 'Sales & POS', color: '#16a34a' },
  { name: 'Catalog & Store Administration', color: '#4f46e5' },
  { name: 'Reports & Analytics', color: '#9333ea' },
  { name: 'Inventory & Warehouse Operations', color: '#0284c7' },
  { name: 'Finance & Banking', color: '#ea580c' }
];

const ROLE_DEFAULT_PERMISSIONS = {
  admin: ALL_ADMIN_MODULES.map(m => m.key),
  manager: [
    'pos_billing', 'order_history', 'sales_orders', 'customers',
    'menu_items', 'categories', 'inventory', 'warehouse_dashboard', 'inventory_catalog',
    'warehouses', 'rack_management', 'stock_transfer', 'stock_receiving', 'stock_count',
    'stock_adjustment', 'stock_requests', 'stock_ledger', 'warehouse_reports',
    'reports', 'item_sales_report', 'bank_accounts', 'expenses', 'day_end',
    'payment_reconciliation', 'suppliers', 'printers', 'gst', 'settings'
  ],
  cashier: [
    'pos_billing', 'order_history', 'day_end', 'customers'
  ],
  salesman: [
    'pos_billing', 'sales_orders', 'customers', 'inventory', 'order_history'
  ],
  warehouse_manager: [
    'inventory',
    'warehouse_dashboard',
    'inventory_catalog',
    'warehouses',
    'rack_management',
    'stock_transfer',
    'stock_receiving',
    'stock_count',
    'stock_adjustment',
    'stock_requests',
    'stock_ledger',
    'warehouse_reports',
    'suppliers',
    'item_sales_report',
    'sales_orders',
    'customers'
  ]
};

const TAB_PERMISSION_MAP = {
  0: 'menu_items',
  1: 'categories',
  2: 'printers',
  3: 'reports',
  4: 'item_sales_report',
  5: 'inventory',
  6: 'gst',
  7: 'settings',
  8: 'profile',
  9: 'staff',
  10: 'order_history',
  11: 'sales_orders',
  12: 'customers',
  13: 'bank_accounts',
  14: 'expenses',
  15: 'day_end',
  16: 'payment_reconciliation',
  17: 'suppliers',
  18: 'serial_numbers'
};

export default function AdminPanel({ token, user, initialTab = 0, isSalesmanView = false, isWarehouseManagerView = false }) {
  const { notify, confirmDialog } = useNotify();
  const { menuVersion, categoryVersion, stockVersion, orderVersion, inventoryVersion } = useDataRefresh();
  const isSalesman = isSalesmanView || user?.role === 'salesman';
  const isWarehouseManager = isWarehouseManagerView || user?.role === 'warehouse_manager';

  const DEFAULT_WAREHOUSE_PERMS = React.useMemo(() => ROLE_DEFAULT_PERMISSIONS.warehouse_manager, []);

  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'superadmin';
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  const userPermissions = React.useMemo(() => {
    if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    return ROLE_DEFAULT_PERMISSIONS[userRole] || [];
  }, [user?.permissions, userRole]);

  const hasUserPermission = React.useCallback((perm) => {
    if (isSuperAdmin) return true;
    if (perm === 'serial_numbers') {
      if (user?.feature_serial_numbers === false) return false;
      return userPermissions.includes('serial_numbers') || isAdminOrOwner || userPermissions.includes('all');
    }
    if (perm === 'payment_reconciliation') {
      if (!user?.reconciliation_enabled) return false;
      return userPermissions.includes('payment_reconciliation') || isAdminOrOwner || userPermissions.includes('all');
    }
    if (isAdminOrOwner && (!user?.permissions || user.permissions.length === 0)) return true;
    if (userPermissions.includes('all') || userPermissions.includes(perm)) return true;
    if (perm === 'warehouse_reports' && userPermissions.includes('item_sales_report')) return true;
    if (perm === 'item_sales_report' && userPermissions.includes('warehouse_reports')) return true;
    if (perm === 'bank_accounts' && userPermissions.includes('finance_accounts')) return true;
    return false;
  }, [isSuperAdmin, isAdminOrOwner, user?.permissions, userPermissions, user?.feature_serial_numbers, user?.reconciliation_enabled]);

  const validTabValues = React.useMemo(() => {
    const baseTabs = (isSuperAdmin || (isAdminOrOwner && (!user?.permissions || user.permissions.length === 0)))
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]
      : [];

    if (baseTabs.length > 0) {
      if (Boolean(user?.reconciliation_enabled) || isSuperAdmin) {
        baseTabs.push(16);
      }
      if (user?.feature_serial_numbers !== false && (isSuperAdmin || userPermissions.includes('serial_numbers') || isAdminOrOwner)) {
        baseTabs.push(18);
      }
      baseTabs.sort((a, b) => a - b);
      return baseTabs;
    }

    const permitted = [];
    for (let tabIndex = 0; tabIndex <= 18; tabIndex++) {
      const permKey = TAB_PERMISSION_MAP[tabIndex];
      if (hasUserPermission(permKey)) {
        permitted.push(tabIndex);
      }
    }
    return permitted.length > 0 ? permitted : [0];
  }, [isSuperAdmin, isAdminOrOwner, user?.permissions, userPermissions, hasUserPermission, user?.reconciliation_enabled, user?.feature_serial_numbers]);

  const defaultTab = React.useMemo(() => {
    if (initialTab !== undefined && initialTab !== null && validTabValues.includes(initialTab)) {
      return initialTab;
    }
    try {
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(hashQuery || window.location.search);
      const urlTab = params.get('tab');
      if (urlTab !== null && !isNaN(Number(urlTab))) {
        const numTab = Number(urlTab);
        if (validTabValues.includes(numTab)) return numTab;
      }
    } catch (_) {}
    try {
      const savedTab = localStorage.getItem('ariso_admin_active_tab');
      if (savedTab !== null && !isNaN(Number(savedTab))) {
        const numTab = Number(savedTab);
        if (validTabValues.includes(numTab)) return numTab;
      }
    } catch (_) {}
    return validTabValues[0] ?? 0;
  }, [initialTab, validTabValues]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  const prevInitialTabRef = React.useRef(initialTab);
  useEffect(() => {
    if (initialTab !== undefined && initialTab !== null && initialTab !== prevInitialTabRef.current) {
      prevInitialTabRef.current = initialTab;
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!validTabValues.includes(activeTab)) {
      setActiveTab(validTabValues[0] ?? 0);
    }
  }, [validTabValues, activeTab]);

  useEffect(() => {
    try {
      if (initialTab === undefined || initialTab === null) {
        localStorage.setItem('ariso_admin_active_tab', String(activeTab));
      }
      const hashBase = window.location.hash.split('?')[0].replace(/^#\/?/, '').trim().toLowerCase();
      if (hashBase === 'admin') {
        const newHash = `#/admin?tab=${activeTab}`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      }
    } catch (_) {}
  }, [activeTab, initialTab]);

  const currentTabValue = validTabValues.includes(activeTab) ? activeTab : (validTabValues[0] ?? 0);

  const [inventorySubTab, setInventorySubTab] = useState(() => {
    try {
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const params = new URLSearchParams(hashQuery || window.location.search);
      const urlSubTab = params.get('subtab');
      if (urlSubTab) return urlSubTab;
      const saved = localStorage.getItem('ariso_admin_inventory_subtab');
      if (saved) return saved;
    } catch (_) {}
    return 'overview';
  });

  useEffect(() => {
    try {
      localStorage.setItem('ariso_admin_inventory_subtab', inventorySubTab);
    } catch (_) {}
  }, [inventorySubTab]);

  const [gstSubTab, setGstSubTab] = useState(() => {
    try {
      const saved = localStorage.getItem('ariso_admin_gst_subtab');
      if (saved !== null && !isNaN(Number(saved))) return Number(saved);
    } catch (_) {}
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ariso_admin_gst_subtab', String(gstSubTab));
    } catch (_) {}
  }, [gstSubTab]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('ariso_admin_sidebar_collapsed');
      if (saved !== null) return JSON.parse(saved);
      return window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ariso_admin_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [reports, setReports] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = React.useRef(null);

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    if (scrollTop > 10 && !isScrolled) {
      setIsScrolled(true);
    } else if (scrollTop <= 10 && isScrolled) {
      setIsScrolled(false);
    }
  };

  // Staff User Dialog States
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('cashier');
  const [staffActive, setStaffActive] = useState(true);
  const [staffWarehouseId, setStaffWarehouseId] = useState('');
  const [staffPermissions, setStaffPermissions] = useState([]);
  const [availableWarehouses, setAvailableWarehouses] = useState([]);

  // --- Item Sales Report (Tab 4) States ---
  const [itemReportData, setItemReportData] = useState([]);
  const [itemReportPreset, setItemReportPreset] = useState('30days');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [itemReportCategory, setItemReportCategory] = useState('all');
  const [itemReportSearch, setItemReportSearch] = useState('');
  const [itemReportSortBy, setItemReportSortBy] = useState('qtySold');
  const [itemReportSortOrder, setItemReportSortOrder] = useState('DESC');
  const [itemReportDateFrom, setItemReportDateFrom] = useState('');
  const [itemReportDateTo, setItemReportDateTo] = useState('');

  // Column-wise filtering for Item-Wise Sales Analytics
  const initialItemReportColFilters = useMemo(() => ({
    name: { value: '', mode: 'contains' },
    category: [],
    sku: { value: '', mode: 'contains' },
    qty_sold: { min: '', max: '' },
    gross_sales: { min: '', max: '' },
    discount_given: { min: '', max: '' },
    gst_collected: { min: '', max: '' },
    net_sales: { min: '', max: '' },
    avg_selling_price: { min: '', max: '' },
    last_sold_at: { from: '', to: '' }
  }), []);

  const [itemReportColFilters, setItemReportColFilters] = useState({
    name: { value: '', mode: 'contains' },
    category: [],
    sku: { value: '', mode: 'contains' },
    qty_sold: { min: '', max: '' },
    gross_sales: { min: '', max: '' },
    discount_given: { min: '', max: '' },
    gst_collected: { min: '', max: '' },
    net_sales: { min: '', max: '' },
    avg_selling_price: { min: '', max: '' },
    last_sold_at: { from: '', to: '' }
  });
  const [colFilterAnchorEl, setColFilterAnchorEl] = useState(null);
  const [activeFilterCol, setActiveFilterCol] = useState(null);

  const isColFilterActive = (key) => {
    const f = itemReportColFilters[key];
    if (!f) return false;
    if (key === 'name' || key === 'sku') return Boolean(f.value?.trim());
    if (key === 'category') return Boolean(f.length > 0);
    if (key === 'last_sold_at') return Boolean(f.from || f.to);
    return (f.min !== '' && f.min !== undefined) || (f.max !== '' && f.max !== undefined);
  };

  const activeColFiltersCount = useMemo(() => {
    return Object.keys(itemReportColFilters).filter(k => isColFilterActive(k)).length;
  }, [itemReportColFilters]);

  const handleClearColumnFilter = (colKey) => {
    setItemReportColFilters(prev => ({
      ...prev,
      [colKey]: initialItemReportColFilters[colKey]
    }));
  };

  const handleClearAllColumnFilters = () => {
    setItemReportColFilters(initialItemReportColFilters);
  };

  const itemReportCategoryOptions = useMemo(() => {
    const list = [...categories.map(c => c.name)];
    itemReportData.forEach(r => {
      if (r.category_name && !list.includes(r.category_name)) {
        list.push(r.category_name);
      }
    });
    return list.filter(Boolean);
  }, [categories, itemReportData]);

  const filteredItemSales = useMemo(() => {
    return itemReportData.filter(row => {
      // 1. Item Name
      if (itemReportColFilters.name?.value?.trim()) {
        const q = itemReportColFilters.name.value.trim().toLowerCase();
        const val = (row.name || '').toLowerCase();
        if (itemReportColFilters.name.mode === 'starts_with') {
          if (!val.startsWith(q)) return false;
        } else {
          if (!val.includes(q)) return false;
        }
      }

      // 2. Category
      if (itemReportColFilters.category && itemReportColFilters.category.length > 0) {
        const rowCat = (row.category_name || '').toLowerCase();
        const match = itemReportColFilters.category.some(catVal => {
          return String(catVal).toLowerCase() === rowCat || String(catVal) === String(row.category_id);
        });
        if (!match) return false;
      }

      // 3. SKU
      if (itemReportColFilters.sku?.value?.trim()) {
        const q = itemReportColFilters.sku.value.trim().toLowerCase();
        const val = (row.sku || '').toLowerCase();
        if (itemReportColFilters.sku.mode === 'starts_with') {
          if (!val.startsWith(q)) return false;
        } else {
          if (!val.includes(q)) return false;
        }
      }

      // 4. Qty Sold
      if (itemReportColFilters.qty_sold?.min !== '' && itemReportColFilters.qty_sold?.min !== undefined) {
        if (Number(row.qty_sold || 0) < Number(itemReportColFilters.qty_sold.min)) return false;
      }
      if (itemReportColFilters.qty_sold?.max !== '' && itemReportColFilters.qty_sold?.max !== undefined) {
        if (Number(row.qty_sold || 0) > Number(itemReportColFilters.qty_sold.max)) return false;
      }

      // 5. Gross Sales
      if (itemReportColFilters.gross_sales?.min !== '' && itemReportColFilters.gross_sales?.min !== undefined) {
        if (Number(row.gross_sales || 0) < Number(itemReportColFilters.gross_sales.min)) return false;
      }
      if (itemReportColFilters.gross_sales?.max !== '' && itemReportColFilters.gross_sales?.max !== undefined) {
        if (Number(row.gross_sales || 0) > Number(itemReportColFilters.gross_sales.max)) return false;
      }

      // 6. Discount
      if (itemReportColFilters.discount_given?.min !== '' && itemReportColFilters.discount_given?.min !== undefined) {
        if (Number(row.discount_given || 0) < Number(itemReportColFilters.discount_given.min)) return false;
      }
      if (itemReportColFilters.discount_given?.max !== '' && itemReportColFilters.discount_given?.max !== undefined) {
        if (Number(row.discount_given || 0) > Number(itemReportColFilters.discount_given.max)) return false;
      }

      // 7. GST
      if (itemReportColFilters.gst_collected?.min !== '' && itemReportColFilters.gst_collected?.min !== undefined) {
        if (Number(row.gst_collected || 0) < Number(itemReportColFilters.gst_collected.min)) return false;
      }
      if (itemReportColFilters.gst_collected?.max !== '' && itemReportColFilters.gst_collected?.max !== undefined) {
        if (Number(row.gst_collected || 0) > Number(itemReportColFilters.gst_collected.max)) return false;
      }

      // 8. Net Sales
      if (itemReportColFilters.net_sales?.min !== '' && itemReportColFilters.net_sales?.min !== undefined) {
        if (Number(row.net_sales || 0) < Number(itemReportColFilters.net_sales.min)) return false;
      }
      if (itemReportColFilters.net_sales?.max !== '' && itemReportColFilters.net_sales?.max !== undefined) {
        if (Number(row.net_sales || 0) > Number(itemReportColFilters.net_sales.max)) return false;
      }

      // 9. Avg Selling Price
      if (itemReportColFilters.avg_selling_price?.min !== '' && itemReportColFilters.avg_selling_price?.min !== undefined) {
        if (Number(row.avg_selling_price || 0) < Number(itemReportColFilters.avg_selling_price.min)) return false;
      }
      if (itemReportColFilters.avg_selling_price?.max !== '' && itemReportColFilters.avg_selling_price?.max !== undefined) {
        if (Number(row.avg_selling_price || 0) > Number(itemReportColFilters.avg_selling_price.max)) return false;
      }

      // 10. Last Sold Date
      if (itemReportColFilters.last_sold_at?.from) {
        if (!row.last_sold_at) return false;
        const rowDate = new Date(row.last_sold_at);
        const fromDate = new Date(`${itemReportColFilters.last_sold_at.from}T00:00:00`);
        if (rowDate < fromDate) return false;
      }
      if (itemReportColFilters.last_sold_at?.to) {
        if (!row.last_sold_at) return false;
        const rowDate = new Date(row.last_sold_at);
        const toDate = new Date(`${itemReportColFilters.last_sold_at.to}T23:59:59.999`);
        if (rowDate > toDate) return false;
      }

      return true;
    });
  }, [itemReportData, itemReportColFilters]);

  // Item Sales History Drawer/Modal
  const [selectedReportItem, setSelectedReportItem] = useState(null);
  const [itemHistoryModalOpen, setItemHistoryModalOpen] = useState(false);
  const [itemHistoryData, setItemHistoryData] = useState([]);
  const [loadingItemHistory, setLoadingItemHistory] = useState(false);

  // --- Stock & Inventory Report (Tab 5) States ---
  const [stockReportData, setStockReportData] = useState({ items: [], summary: { total_items: 0, in_stock_count: 0, low_stock_count: 0, out_of_stock_count: 0 } });
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [stockSearch, setStockSearch] = useState('');

  // Quick Stock Adjustment Dialog
  const [adjustStockModalOpen, setAdjustStockModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [adjustQuantity, setAdjustQuantity] = useState('10');
  const [adjustUnit, setAdjustUnit] = useState('pcs');
  const [adjustThreshold, setAdjustThreshold] = useState('10');
  const [adjustReason, setAdjustReason] = useState('Stock Replenishment');
  const [savingStockAdjust, setSavingStockAdjust] = useState(false);

  // Stock Audit Log Modal
  const [stockLogsModalOpen, setStockLogsModalOpen] = useState(false);
  const [selectedStockLogItem, setSelectedStockLogItem] = useState(null);
  const [stockLogsData, setStockLogsData] = useState([]);
  const [loadingStockLogs, setLoadingStockLogs] = useState(false);

  // Dialog configurations
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add_menu', 'edit_menu', 'add_printer', 'add_category'
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Form states
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [menuGst, setMenuGst] = useState('5');
  const [menuCategoryId, setMenuCategoryId] = useState('');
  const [menuVeg, setMenuVeg] = useState('1');
  const [menuSpicy, setMenuSpicy] = useState('0');
  const [menuAvailable, setMenuAvailable] = useState('1');
  const [menuBarcode, setMenuBarcode] = useState('');
  const [menuSku, setMenuSku] = useState('');
  const [menuDesc, setMenuDesc] = useState('');
  const [menuImageUrl, setMenuImageUrl] = useState('');
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuPrinterId, setMenuPrinterId] = useState('');
  const [menuIsWeightBased, setMenuIsWeightBased] = useState(false);
  const [menuPosUnitType, setMenuPosUnitType] = useState('PCS'); // 'PCS' | 'WEIGHT' | 'SERIAL'
  const [menuUnit, setMenuUnit] = useState('pcs');
  const [menuBarcodeImageUrl, setMenuBarcodeImageUrl] = useState('');

  // --- Petpooja Inventory & Accounting States ---
  const [menuGoodsOrService, setMenuGoodsOrService] = useState('Goods'); // 'Goods' | 'Service'
  const [menuItemCode, setMenuItemCode] = useState('');
  const [menuHsnCode, setMenuHsnCode] = useState('');
  const [menuPurchaseUnit, setMenuPurchaseUnit] = useState('pcs');
  const [menuSalesUnit, setMenuSalesUnit] = useState('pcs');
  const [menuBrand, setMenuBrand] = useState('');
  const [menuItemGroup, setMenuItemGroup] = useState('');
  const [menuTags, setMenuTags] = useState([]);
  const [menuTagInput, setMenuTagInput] = useState('');
  const [menuPurchasePrice, setMenuPurchasePrice] = useState('');
  const [menuWholesalePrice, setMenuWholesalePrice] = useState('');
  const [menuMrp, setMenuMrp] = useState('');
  const [menuIgstRate, setMenuIgstRate] = useState('5');
  const [menuDiscountType, setMenuDiscountType] = useState('percentage'); // 'percentage' | 'flat'
  const [menuDiscountValue, setMenuDiscountValue] = useState('');
  const [menuIsTrackable, setMenuIsTrackable] = useState(true);
  const [menuOpeningStock, setMenuOpeningStock] = useState('');
  const [menuCostPrice, setMenuCostPrice] = useState('');
  const [menuStockStartDate, setMenuStockStartDate] = useState(() => getISTDateString());
  const [menuAtParStock, setMenuAtParStock] = useState('');
  const [menuMinStock, setMenuMinStock] = useState('');
  const [menuLinkedSalesAccount, setMenuLinkedSalesAccount] = useState('Sales');
  const [menuLinkedPurchaseAccount, setMenuLinkedPurchaseAccount] = useState('Purchase');
  const [menuOpenQtyPopup, setMenuOpenQtyPopup] = useState(false);
  const [menuOpenPricePopup, setMenuOpenPricePopup] = useState(false);
  const [menuNotForSale, setMenuNotForSale] = useState(false);

  // --- Barcode Scanner Modal States ---
  const [barcodeScanModalOpen, setBarcodeScanModalOpen] = useState(false);
  const [barcodeScanStream, setBarcodeScanStream] = useState(null);
  const [barcodeScanError, setBarcodeScanError] = useState('');
  const [barcodeDuplicate, setBarcodeDuplicate] = useState(null); // { name, id } if duplicate
  const [barcodeCheckTimer, setBarcodeCheckTimer] = useState(null);
  const barcodeScanVideoRef = React.useRef(null);
  const barcodeScanCanvasRef = React.useRef(null);
  const barcodeReaderRef = React.useRef(null);

  const [printerName, setPrinterName] = useState('');
  const [printerType, setPrinterType] = useState('lan');
  const [printerIp, setPrinterIp] = useState('');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printerWidth, setPrinterWidth] = useState('80');
  const [printerRole, setPrinterRole] = useState('receipt');
  const [printerAutoCut, setPrinterAutoCut] = useState('1');
  const [printerCashDrawer, setPrinterCashDrawer] = useState('1');
  const [printerDefaultReceipt, setPrinterDefaultReceipt] = useState(false);
  const [printerDefaultKot, setPrinterDefaultKot] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('online');
  const [printerDeviceId, setPrinterDeviceId] = useState('');
  const [printerBluetoothAddress, setPrinterBluetoothAddress] = useState('');
  const [gatewayDevices, setGatewayDevices] = useState([]);
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [loadingSystemPrinters, setLoadingSystemPrinters] = useState(false);

  const handleRefreshSystemPrinters = async (showToast = false) => {
    if (window.electron && window.electron.getPrinters) {
      setLoadingSystemPrinters(true);
      try {
        const liveList = await window.electron.getPrinters();
        if (Array.isArray(liveList)) {
          setSystemPrinters(liveList);
          if (showToast) {
            notify.success(`Found ${liveList.length} Windows printer(s).`, 'Printers Refreshed');
          }
        }
      } catch (err) {
        console.warn('[AdminPanel] Failed to fetch system printers:', err);
        if (showToast) {
          notify.error('Could not query Windows printer list.', 'Printer Scan Error');
        }
      } finally {
        setLoadingSystemPrinters(false);
      }
    }
  };
  
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [draggedCategoryIdx, setDraggedCategoryIdx] = useState(null);

  const [profileLogoUrl, setProfileLogoUrl] = useState(user?.restaurant_logo_url || '');

  useEffect(() => {
    if (user?.restaurant_logo_url) {
      setProfileLogoUrl(user.restaurant_logo_url);
    }
  }, [user]);

  // Receipt & KOT Customization state
  const [receiptSettings, setReceiptSettings] = useState({
    restaurant_name: '',
    branch_name: 'Main Branch',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    gst_number: '',
    fssai_number: '',
    logo_url: '',
    qr_code_url: '',
    header_message: 'Welcome to Our Store!',
    footer_message: 'Visit us again soon.',
    thank_you_message: 'Thank You! Visit Again.',
    terms_conditions: 'Goods once sold cannot be returned.',
    paper_size: '80mm',
    print_engine: 'auto',
    default_printer_name: '',
    font_size: 'normal',
    header_alignment: 'center',
    show_logo: 1,
    show_qr_code: 1,
    show_customer_details: 1,
    show_cashier_name: 1,
    show_tax_details: 1,
    show_payment_details: 1,
    show_footer_notes: 1,
    kot_header: 'KITCHEN ORDER TICKET',
    kitchen_name: 'Main Kitchen',
    kot_footer_note: 'Prepare with priority',
    show_kot_order_notes: 1,
    show_kot_time: 1,
    cart_position: localStorage.getItem('ARISO_POS_CART_POSITION') || 'right'
  });

  const [receiptPreviewMode, setReceiptPreviewMode] = useState('receipt'); // 'receipt' or 'kot'
  const [savingReceiptSettings, setSavingReceiptSettings] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

  const [workflowDraft, setWorkflowDraft] = useState({
    print_stage1_mode: 'print_kot_receipt',
    print_stage2_mode: 'print_receipt_only',
    enable_stage2_popup: 1,
    stage1_popup_save_only: 1,
    stage1_popup_receipt_only: 1,
    stage1_popup_kot_only: 1,
    stage1_popup_kot_receipt: 1,
    stage2_popup_save_only: 1,
    stage2_popup_receipt_only: 1,
    stage2_popup_kot_only: 1,
    stage2_popup_kot_receipt: 1
  });
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Cashier Permissions & WhatsApp Share Draft state
  const [permissionsDraft, setPermissionsDraft] = useState({
    allow_cashier_view_all_reports: 0,
    enable_whatsapp_receipt: 0,
    whatsapp_business_phone: ''
  });
  const [savingPermissions, setSavingPermissions] = useState(false);

  const parseNumFlag = (val, defaultVal = 1) => {
    if (val === undefined || val === null) return defaultVal;
    if (val === true || val === 1 || val === '1' || val === 'true') return 1;
    if (val === false || val === 0 || val === '0' || val === 'false') return 0;
    return defaultVal;
  };

  // Helper: build workflowDraft from settings object (normalises mysql2 boolean coercion)
  const buildWorkflowDraft = (s) => {
    if (!s) return workflowDraft;
    return {
      print_stage1_mode:         s.print_stage1_mode         || 'print_kot_receipt',
      print_stage2_mode:         s.print_stage2_mode         || 'print_receipt_only',
      enable_stage2_popup:       parseNumFlag(s.enable_stage2_popup, 1),
      stage1_popup_save_only:    parseNumFlag(s.stage1_popup_save_only, 1),
      stage1_popup_receipt_only: parseNumFlag(s.stage1_popup_receipt_only, 1),
      stage1_popup_kot_only:     parseNumFlag(s.stage1_popup_kot_only, 1),
      stage1_popup_kot_receipt:  parseNumFlag(s.stage1_popup_kot_receipt, 1),
      stage2_popup_save_only:    parseNumFlag(s.stage2_popup_save_only, 1),
      stage2_popup_receipt_only: parseNumFlag(s.stage2_popup_receipt_only, 1),
      stage2_popup_kot_only:     parseNumFlag(s.stage2_popup_kot_only, 1),
      stage2_popup_kot_receipt:  parseNumFlag(s.stage2_popup_kot_receipt, 1)
    };
  };

  // Helper: build permissionsDraft from settings object
  const buildPermissionsDraft = (s) => {
    if (!s) return permissionsDraft;
    return {
      allow_cashier_view_all_reports: parseNumFlag(s.allow_cashier_view_all_reports, 0),
      enable_whatsapp_receipt:        parseNumFlag(s.enable_whatsapp_receipt, 0),
      whatsapp_business_phone:        s.whatsapp_business_phone || ''
    };
  };

  const handleSaveWorkflowSettings = async () => {
    setSavingWorkflow(true);
    try {
      const payload = {
        ...receiptSettings,
        print_stage1_mode:         workflowDraft.print_stage1_mode,
        print_stage2_mode:         workflowDraft.print_stage2_mode,
        enable_stage2_popup:       workflowDraft.enable_stage2_popup,
        stage1_popup_save_only:    workflowDraft.stage1_popup_save_only,
        stage1_popup_receipt_only: workflowDraft.stage1_popup_receipt_only,
        stage1_popup_kot_only:     workflowDraft.stage1_popup_kot_only,
        stage1_popup_kot_receipt:  workflowDraft.stage1_popup_kot_receipt,
        stage2_popup_save_only:    workflowDraft.stage2_popup_save_only,
        stage2_popup_receipt_only: workflowDraft.stage2_popup_receipt_only,
        stage2_popup_kot_only:     workflowDraft.stage2_popup_kot_only,
        stage2_popup_kot_receipt:  workflowDraft.stage2_popup_kot_receipt
      };

      const res = await apiFetch('/api/settings/receipt', {
        method: 'POST',
        body: payload
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.settings || data;
        setReceiptSettings(prev => ({ ...prev, ...updated }));
        setWorkflowDraft(buildWorkflowDraft(updated));
        setPermissionsDraft(buildPermissionsDraft(updated));
        notify.success('Print stage workflow settings saved successfully.', 'Settings Saved', 1000);
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save workflow settings.', 'Save Error');
      }
    } catch (err) {
      console.error(err);
      notify.error('Network error saving workflow settings.', 'Save Error');
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleSavePermissionsSettings = async () => {
    setSavingPermissions(true);
    try {
      const payload = {
        ...receiptSettings,
        allow_cashier_view_all_reports: permissionsDraft.allow_cashier_view_all_reports,
        enable_whatsapp_receipt:        permissionsDraft.enable_whatsapp_receipt,
        whatsapp_business_phone:        permissionsDraft.whatsapp_business_phone
      };

      const res = await apiFetch('/api/settings/receipt', {
        method: 'POST',
        body: payload
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.settings || data;
        setReceiptSettings(prev => ({ ...prev, ...updated }));
        setPermissionsDraft(buildPermissionsDraft(updated));
        notify.success('👍 Settings saved successfully.', 'Settings Saved', 1500);
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save settings.', 'Save Error');
      }
    } catch (err) {
      console.error(err);
      notify.error('Network error saving permissions settings.', 'Save Error');
    } finally {
      setSavingPermissions(false);
    }
  };

  const [savingGstSettings, setSavingGstSettings] = useState(false);

  const handleSaveGstSettings = async () => {
    setSavingGstSettings(true);
    try {
      const res = await apiFetch('/api/settings/receipt', {
        method: 'POST',
        body: receiptSettings
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.settings || data;
        setReceiptSettings(prev => ({ ...prev, ...updated }));
        notify.success('💸 GST Settings updated and saved successfully!', 'GST Settings Saved', 2000);
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save GST settings.', 'Save Error');
      }
    } catch (err) {
      console.error(err);
      notify.error('Network error saving GST settings.', 'Save Error');
    } finally {
      setSavingGstSettings(false);
    }
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: file type and max size (2MB)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      notify.error('Invalid file type. Please upload a JPG, PNG, or WEBP image.', 'Validation Error');
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeBytes) {
      notify.error('File size exceeds the 2MB limit.', 'Validation Error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    try {
      const res = await apiFetch('/api/settings/profile/logo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo image.');

      const formattedUrl = data.logo_url;
      setReceiptSettings(prev => ({ ...prev, logo_url: formattedUrl }));
      notify.success('Receipt logo uploaded successfully!', 'Logo Uploaded');
    } catch (err) {
      console.error('[Logo Upload Error]', err);
      notify.error(err.message || 'Failed to upload logo image.', 'Upload Error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setReceiptSettings(prev => ({ ...prev, logo_url: '' }));
    notify.success('Receipt logo removed.', 'Logo Removed');
  };

  const [uploadingQrCode, setUploadingQrCode] = useState(false);

  const handleQrCodeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      notify.error('Invalid file type. Please upload a JPG, PNG, or WEBP image.', 'Validation Error');
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeBytes) {
      notify.error('File size exceeds the 2MB limit.', 'Validation Error');
      return;
    }

    setUploadingQrCode(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;

      const formData = new FormData();
      formData.append('qr_image', file);
      formData.append('logo', file);

      try {
        const res = await apiFetch('/api/settings/profile/qr', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok && (data.qr_code_url || data.logo_url)) {
          const formattedUrl = data.qr_code_url || data.logo_url;
          setReceiptSettings(prev => ({ ...prev, qr_code_url: formattedUrl }));
        } else {
          setReceiptSettings(prev => ({ ...prev, qr_code_url: dataUrl }));
        }
        notify.success('QR/Barcode image uploaded successfully!', 'Image Uploaded');
      } catch (err) {
        setReceiptSettings(prev => ({ ...prev, qr_code_url: dataUrl }));
        notify.success('QR/Barcode image saved locally.', 'Image Loaded');
      } finally {
        setUploadingQrCode(false);
      }
    };
    reader.onerror = () => {
      notify.error('Failed to read image file.', 'Upload Error');
      setUploadingQrCode(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrCode = () => {
    setReceiptSettings(prev => ({ ...prev, qr_code_url: '' }));
    notify.success('QR/Barcode image removed.', 'Image Removed');
  };

  const handleProfileLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      notify.error('Invalid file type. Please upload a JPG, PNG, or WEBP image.', 'Validation Error');
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      notify.error('File size exceeds the 2MB limit.', 'Validation Error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    try {
      const res = await apiFetch('/api/settings/profile/logo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo image.');

      const formattedUrl = data.logo_url;
      setProfileLogoUrl(formattedUrl);
      
      try {
        const currentUser = JSON.parse(localStorage.getItem('ARISO_RETAIL_USER') || '{}');
        currentUser.restaurant_logo_url = formattedUrl;
        localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(currentUser));
        window.dispatchEvent(new CustomEvent('auth_token_refreshed', { detail: { user: currentUser } }));
      } catch (err) {
        console.error('[Logo Upload Session Sync Error]', err);
      }
      notify.success('Profile logo uploaded successfully!', 'Logo Uploaded');
    } catch (err) {
      console.error('[Logo Upload Error]', err);
      notify.error(err.message || 'Failed to upload logo image.', 'Upload Error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveProfileLogo = async () => {
    setProfileLogoUrl('');
    try {
      const currentUser = JSON.parse(localStorage.getItem('ARISO_RETAIL_USER') || '{}');
      currentUser.restaurant_logo_url = '';
      localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(currentUser));
      window.dispatchEvent(new CustomEvent('auth_token_refreshed', { detail: { user: currentUser } }));
    } catch (err) {
      console.error('[Logo Remove Session Sync Error]', err);
    }
    notify.success('Profile logo removed.', 'Logo Removed');
  };

  // Sales Reports presets & customs
  const [reportPreset, setReportPreset] = useState('30days');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // Order history sub-tab states
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyTotalRecords, setHistoryTotalRecords] = useState(0);
  const [historyPreset, setHistoryPreset] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyCashier, setHistoryCashier] = useState('all');
  const [historyPaymentMode, setHistoryPaymentMode] = useState('all');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyPriceType, setHistoryPriceType] = useState('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(20);
  
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
  const [historyOrderDetailOpen, setHistoryOrderDetailOpen] = useState(false);
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
  const [selectedOrderForCreditNote, setSelectedOrderForCreditNote] = useState(null);

  // --- Sales Orders Tab (Tab 11) & Party (Tab 12) States ---
  const [salesOrders, setSalesOrders] = useState([]);
  const [salesOrdersLoading, setSalesOrdersLoading] = useState(false);
  const [salesOrderSearch, setSalesOrderSearch] = useState('');
  const [salesOrderStatus, setSalesOrderStatus] = useState('all');
  const [salesOrderStaff, setSalesOrderStaff] = useState('all');
  const [salesOrderPreset, setSalesOrderPreset] = useState('all');
  const [salesOrderDateFrom, setSalesOrderDateFrom] = useState('');
  const [salesOrderDateTo, setSalesOrderDateTo] = useState('');
  const [salesOrderConfirmingId, setSalesOrderConfirmingId] = useState(null);
  const [salesOrderCancellingId, setSalesOrderCancellingId] = useState(null);
  const [salesOrderModalOpen, setSalesOrderModalOpen] = useState(false);
  const [salesOrderModalEditOrder, setSalesOrderModalEditOrder] = useState(null);
  const [salesOrderModalInitialParty, setSalesOrderModalInitialParty] = useState(null);
  const [salesOrderVoucherOpen, setSalesOrderVoucherOpen] = useState(false);
  const [salesOrderVoucherOrder, setSalesOrderVoucherOrder] = useState(null);
  const [salesOrderMenuAnchor, setSalesOrderMenuAnchor] = useState(null);
  const [salesOrderMenuOrder, setSalesOrderMenuOrder] = useState(null);
  const [salesOrderEmailDialogOpen, setSalesOrderEmailDialogOpen] = useState(false);
  const [salesOrderEmailRecipient, setSalesOrderEmailRecipient] = useState('');
  const [salesOrderEmailSending, setSalesOrderEmailSending] = useState(false);

  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(ord => {
      // Status & Type filter
      if (salesOrderStatus === 'estimate') {
        if (ord.is_estimate !== 1) return false;
      } else if (salesOrderStatus === 'pending') {
        if (ord.order_status !== 'pending' || ord.is_estimate === 1) return false;
      } else if (salesOrderStatus !== 'all') {
        if (ord.order_status !== salesOrderStatus) return false;
      }

      // Staff filter
      if (salesOrderStaff !== 'all') {
        if (String(ord.salesman_id) !== String(salesOrderStaff) && String(ord.cashier_id) !== String(salesOrderStaff)) {
          return false;
        }
      }

      // Search filter
      if (salesOrderSearch && salesOrderSearch.trim()) {
        const q = salesOrderSearch.trim().toLowerCase();
        const num = (ord.unique_order_number || ord.order_number || '').toLowerCase();
        const party = (ord.customer_name || ord.store_name || '').toLowerCase();
        const phone = (ord.customer_phone || '').toLowerCase();
        const ref = (ord.reference_number || '').toLowerCase();
        if (!num.includes(q) && !party.includes(q) && !phone.includes(q) && !ref.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [salesOrders, salesOrderStatus, salesOrderStaff, salesOrderSearch]);

  const isMobileOrTablet = useMediaQuery('(max-width:900px)');
  const isMobile = isMobileOrTablet;

  // Table search, filter, pagination, sorting & selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dietFilter, setDietFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'unavailable'
  const [sortField, setSortField] = useState('name'); // 'name', 'price', 'is_available', 'category_name'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const sortDirection = sortOrder;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stickerModalOpen, setStickerModalOpen] = useState(false);
  const [stickerModalItems, setStickerModalItems] = useState([]);
  const [stickerPreviewMode, setStickerPreviewMode] = useState('roll');

  const handleOpenStickersModal = (itemsToPrint) => {
    if (itemsToPrint && itemsToPrint.length > 0) {
      setStickerModalItems(itemsToPrint);
      setStickerPreviewMode(itemsToPrint.length === 1 ? 'single' : 'roll');
    } else if (selectedIds.length > 0) {
      const selected = menuItems.filter(m => selectedIds.includes(m.id));
      setStickerModalItems(selected.length > 0 ? selected : menuItems);
      setStickerPreviewMode('roll');
    } else if (menuItems && menuItems.length > 0) {
      setStickerModalItems(menuItems);
      setStickerPreviewMode('roll');
    } else {
      setStickerModalItems([]);
      setStickerPreviewMode('roll');
    }
    setStickerModalOpen(true);
  };

  const handleOpenStickerPreview = (item) => {
    setStickerModalItems([item]);
    setStickerPreviewMode('single');
    setStickerModalOpen(true);
  };

  const activeFilterCount = (searchTerm.trim() ? 1 : 0) + 
    (categoryFilter !== 'all' ? 1 : 0) + 
    (dietFilter !== 'all' ? 1 : 0) + 
    (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setDietFilter('all');
    setStatusFilter('all');
    setPage(0);
  };

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Memoized Filtered & Sorted items
  const processedItems = React.useMemo(() => {
    let result = [...menuItems];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category_id?.toString() === categoryFilter.toString());
    }

    if (dietFilter === 'veg') {
      result = result.filter(item => Number(item.is_veg) === 1);
    } else if (dietFilter === 'nonveg' || dietFilter === 'non-veg') {
      result = result.filter(item => Number(item.is_veg) === 0);
    }

    if (statusFilter === 'available') {
      result = result.filter(item => item.is_available === 1);
    } else if (statusFilter === 'unavailable') {
      result = result.filter(item => item.is_available === 0);
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'price') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [menuItems, debouncedSearch, categoryFilter, dietFilter, statusFilter, sortField, sortOrder]);

  // Paginated slice
  const paginatedItems = React.useMemo(() => {
    const start = page * rowsPerPage;
    return processedItems.slice(start, start + rowsPerPage);
  }, [processedItems, page, rowsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentPageIds = paginatedItems.map(item => item.id);
      const combined = Array.from(new Set([...selectedIds, ...currentPageIds]));
      if (combined.length > 20) {
        const capped = combined.slice(0, 20);
        setSelectedIds(capped);
        notify.warning('Maximum 20 items can be selected at a time. Selection capped at 20.', 'Selection Limit Reached');
      } else {
        setSelectedIds(combined);
      }
    } else {
      const pageIdsSet = new Set(paginatedItems.map(item => item.id));
      setSelectedIds(selectedIds.filter(id => !pageIdsSet.has(id)));
    }
  };

  const handleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 20) {
        notify.warning('Maximum 20 menu items can be selected at a time for bulk operations.', 'Selection Limit Reached');
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };
  const handleSelectRow = handleSelectItem;

  const handleBulkStatusChange = async (isAvailable) => {
    if (selectedIds.length === 0) return;
    if (selectedIds.length > 20) {
      notify.warning('Maximum 20 menu items can be selected at a time for bulk operations.', 'Selection Limit Reached');
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/menu/bulk-status', {
        method: 'POST',
        body: { ids: selectedIds, is_available: isAvailable ? 1 : 0 }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update menu items status.');

      notify.success(data.message || `Updated availability status for ${selectedIds.length} menu items.`, 'Bulk Update Complete');
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      notify.error(err.message || 'Failed to update status for selected items.', 'Bulk Operation Error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (selectedIds.length > 20) {
      notify.warning('Maximum 20 menu items can be selected at a time for bulk deletion.', 'Selection Limit Reached');
      return;
    }
    
    const isConfirmed = await confirmDialog({
      title: `Delete ${selectedIds.length} Menu Items`,
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected dishes? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.length} Items`,
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      setLoading(true);
      const res = await apiFetch('/api/menu/bulk-delete', {
        method: 'POST',
        body: { ids: selectedIds }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete selected menu items.');

      notify.success(data.message || `Deleted ${selectedIds.length} selected menu items.`, 'Bulk Delete Complete');
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      notify.error(err.message || 'Failed to delete selected items.', 'Bulk Delete Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, reportPreset, reportDateFrom, reportDateTo, historySearch, historyCashier, historyPaymentMode, historyStatus, historyPriceType, historyDateFrom, historyDateTo, historyPage, historyLimit, itemReportPreset, itemReportDateFrom, itemReportDateTo, itemReportCategory, itemReportSearch, itemReportSortBy, itemReportSortOrder, stockCategoryFilter, stockStatusFilter, stockSearch, salesOrderPreset, salesOrderDateFrom, salesOrderDateTo, salesOrderStatus, salesOrderStaff, salesOrderSearch]);

  // Re-fetch when server broadcasts a data change via SSE
  useEffect(() => {
    if (menuVersion > 0 || categoryVersion > 0 || stockVersion > 0 || orderVersion > 0 || inventoryVersion > 0) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuVersion, categoryVersion, stockVersion, orderVersion, inventoryVersion]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Always fetch latest receipt & GST settings from DB on mount/tab change to guarantee persistence
      try {
        const settingsRes = await apiFetch('/api/settings/receipt');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setReceiptSettings(settingsData);
          setWorkflowDraft(buildWorkflowDraft(settingsData));
          setPermissionsDraft(buildPermissionsDraft(settingsData));
          db.settings.put({ key: 'receipt_settings', value: settingsData }).catch(() => {});
        } else {
          const localRec = await db.settings.get('receipt_settings').catch(() => null);
          if (localRec?.value) {
            setReceiptSettings(localRec.value);
            setWorkflowDraft(buildWorkflowDraft(localRec.value));
            setPermissionsDraft(buildPermissionsDraft(localRec.value));
          }
        }
      } catch (_) {
        const localRec = await db.settings.get('receipt_settings').catch(() => null);
        if (localRec?.value) {
          setReceiptSettings(localRec.value);
          setWorkflowDraft(buildWorkflowDraft(localRec.value));
          setPermissionsDraft(buildPermissionsDraft(localRec.value));
        }
      }

      if (activeTab === 0) {
        try {
          const catRes = await apiFetch('/api/categories');
          if (catRes.ok) {
            const catData = await catRes.json();
            setCategories(Array.isArray(catData) ? catData : []);
          } else {
            const localCats = await db.categories.toArray().catch(() => []);
            setCategories(localCats);
          }
        } catch (_) {
          const localCats = await db.categories.toArray().catch(() => []);
          setCategories(localCats);
        }

        try {
          const menuRes = await apiFetch('/api/menu');
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            setMenuItems(Array.isArray(menuData) ? menuData : []);
          } else {
            const localItems = await db.menu_items.toArray().catch(() => []);
            setMenuItems(localItems);
          }
        } catch (_) {
          const localItems = await db.menu_items.toArray().catch(() => []);
          setMenuItems(localItems);
        }

        try {
          const printRes = await apiFetch('/api/printers');
          if (printRes.ok) {
            const printData = await printRes.json();
            setPrinters(Array.isArray(printData) ? printData : []);
          } else {
            const localPrns = await db.printers.toArray().catch(() => []);
            setPrinters(localPrns);
          }
        } catch (_) {
          const localPrns = await db.printers.toArray().catch(() => []);
          setPrinters(localPrns);
        }
      } else if (activeTab === 1) {
        try {
          const catRes = await apiFetch('/api/categories');
          if (catRes.ok) {
            const catData = await catRes.json();
            setCategories(Array.isArray(catData) ? catData : []);
          } else {
            const localCats = await db.categories.toArray().catch(() => []);
            setCategories(localCats);
          }
        } catch (_) {
          const localCats = await db.categories.toArray().catch(() => []);
          setCategories(localCats);
        }
      } else if (activeTab === 2) {
        try {
          const printRes = await apiFetch('/api/printers');
          if (printRes.ok) {
            const printData = await printRes.json();
            setPrinters(Array.isArray(printData) ? printData : []);
          } else {
            const localPrns = await db.printers.toArray().catch(() => []);
            setPrinters(localPrns);
          }
        } catch (_) {
          const localPrns = await db.printers.toArray().catch(() => []);
          setPrinters(localPrns);
        }

        const devRes = await apiFetch('/api/agent/devices');
        if (devRes.ok) {
          const devData = await devRes.json();
          setGatewayDevices(Array.isArray(devData) ? devData : []);
        } else {
          setGatewayDevices([]);
        }

        handleRefreshSystemPrinters(false);
      } else if (activeTab === 3) {
        let url = '/api/reports/admin';
        const params = [];
        const { from, to } = resolveDateRange(reportPreset, reportDateFrom, reportDateTo);
        
        if (from) params.push(`date_from=${encodeURIComponent(from)}`);
        if (to) params.push(`date_to=${encodeURIComponent(to)}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const repRes = await apiFetch(url);
        if (repRes.ok) {
          setReports(await repRes.json());
        } else {
          setReports(null);
          setError('Failed to fetch sales report summary.');
        }
      } else if (activeTab === 4) {
        // Item Sales Report
        let url = '/api/reports/item-wise';
        const params = [];
        const { from, to } = resolveDateRange(itemReportPreset, itemReportDateFrom, itemReportDateTo);

        if (from) params.push(`date_from=${encodeURIComponent(from)}`);
        if (to) params.push(`date_to=${encodeURIComponent(to)}`);
        if (itemReportCategory !== 'all') params.push(`category_id=${itemReportCategory}`);
        if (itemReportSearch) params.push(`search=${encodeURIComponent(itemReportSearch)}`);
        if (itemReportSortBy) params.push(`sort_by=${itemReportSortBy}`);
        if (itemReportSortOrder) params.push(`sort_order=${itemReportSortOrder}`);

        if (params.length > 0) url += `?${params.join('&')}`;

        const itemRes = await apiFetch(url);
        if (itemRes.ok) {
          setItemReportData(await itemRes.json());
        } else {
          setItemReportData([]);
        }

        if (categories.length === 0) {
          const catRes = await apiFetch('/api/categories');
          if (catRes.ok) setCategories(await catRes.json());
        }
      } else if (activeTab === 5) {
        // Stock & Inventory Report
        let url = '/api/inventory/report';
        const params = [];
        if (stockCategoryFilter !== 'all') params.push(`category_id=${stockCategoryFilter}`);
        if (stockStatusFilter !== 'all') params.push(`status=${stockStatusFilter}`);
        if (stockSearch) params.push(`search=${encodeURIComponent(stockSearch)}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const stockRes = await apiFetch(url);
        if (stockRes.ok) {
          setStockReportData(await stockRes.json());
        } else {
          setStockReportData({ items: [], summary: { total_items: 0, in_stock_count: 0, low_stock_count: 0, out_of_stock_count: 0 } });
        }

        if (categories.length === 0) {
          const catRes = await apiFetch('/api/categories');
          if (catRes.ok) setCategories(await catRes.json());
        }
      } else if (activeTab === 7) {
        handleRefreshSystemPrinters(false);
        try {
          const settingsRes = await apiFetch('/api/settings/receipt');
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            setReceiptSettings(settingsData);
            setWorkflowDraft(buildWorkflowDraft(settingsData));
            setPermissionsDraft(buildPermissionsDraft(settingsData));
            await db.settings.put({ key: 'receipt_settings', value: settingsData }).catch(() => {});
          } else {
            const local = await db.settings.get('receipt_settings').catch(() => null);
            if (local && local.value) {
              setReceiptSettings(local.value);
              setWorkflowDraft(buildWorkflowDraft(local.value));
              setPermissionsDraft(buildPermissionsDraft(local.value));
            }
          }
        } catch (_) {
          const local = await db.settings.get('receipt_settings').catch(() => null);
          if (local && local.value) {
            setReceiptSettings(local.value);
            setWorkflowDraft(buildWorkflowDraft(local.value));
            setPermissionsDraft(buildPermissionsDraft(local.value));
          }
        }
      } else if (activeTab === 9) {
        const usersRes = await apiFetch('/api/auth/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setStaffUsers(Array.isArray(usersData) ? usersData : []);
        } else {
          setStaffUsers([]);
        }
        try {
          const whRes = await apiFetch('/api/inventory/warehouses');
          if (whRes.ok) {
            setAvailableWarehouses(await whRes.json());
          }
        } catch (_) {}
      } else if (activeTab === 10) {
        const { from, to } = resolveDateRange(historyPreset, historyDateFrom, historyDateTo);

        let url = `/api/orders/history/list?page=${historyPage + 1}&limit=${historyLimit}&offset=${historyPage * historyLimit}`;
        if (historySearch) url += `&search=${encodeURIComponent(historySearch)}`;
        if (historyCashier !== 'all') url += `&cashier_id=${historyCashier}`;
        if (historyPaymentMode !== 'all') url += `&payment_mode=${historyPaymentMode}`;
        if (historyStatus !== 'all') url += `&order_status=${historyStatus}`;
        if (historyPriceType !== 'all') url += `&price_type=${historyPriceType}`;
        if (from) url += `&date_from=${encodeURIComponent(from)}`;
        if (to) url += `&date_to=${encodeURIComponent(to)}`;

        const orderRes = await apiFetch(url);
        if (orderRes.ok) {
          const resData = await orderRes.json();
          if (resData && Array.isArray(resData.orders)) {
            setHistoryOrders(resData.orders);
            setHistoryTotalRecords(resData.pagination?.totalRecords ?? resData.orders.length);
          } else if (Array.isArray(resData)) {
            setHistoryOrders(resData);
            setHistoryTotalRecords(resData.length);
          } else {
            setHistoryOrders([]);
            setHistoryTotalRecords(0);
          }
        } else {
          setHistoryOrders([]);
          setHistoryTotalRecords(0);
        }
        // Load staff users as well for history filter selector
        const usersRes = await apiFetch('/api/auth/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setStaffUsers(Array.isArray(usersData) ? usersData : []);
        }
      } else if (activeTab === 11) {
        setSalesOrdersLoading(true);
        try {
          const { from, to } = resolveDateRange(salesOrderPreset, salesOrderDateFrom, salesOrderDateTo);
          let url = `/api/orders?include_items=true`;
          if (from) url += `&date_from=${encodeURIComponent(from)}`;
          if (to) url += `&date_to=${encodeURIComponent(to)}`;

          const soRes = await apiFetch(url);
          if (soRes.ok) {
            const soData = await soRes.json();
            setSalesOrders(Array.isArray(soData) ? soData : []);
          } else {
            setSalesOrders([]);
          }

          if (staffUsers.length === 0) {
            const usersRes = await apiFetch('/api/auth/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setStaffUsers(Array.isArray(usersData) ? usersData : []);
            }
          }

          if (menuItems.length === 0) {
            const mRes = await apiFetch('/api/menu');
            if (mRes.ok) {
              const mData = await mRes.json();
              setMenuItems(Array.isArray(mData) ? mData : (mData.items || []));
            }
          }

          if (categories.length === 0) {
            const cRes = await apiFetch('/api/categories');
            if (cRes.ok) {
              const cData = await cRes.json();
              setCategories(Array.isArray(cData) ? cData : []);
            }
          }
        } catch (err) {
          console.error('[Sales Orders Fetch Error]:', err);
          setSalesOrders([]);
        } finally {
          setSalesOrdersLoading(false);
        }
      } else if (activeTab === 12) {
        if (staffUsers.length === 0) {
          const usersRes = await apiFetch('/api/auth/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setStaffUsers(Array.isArray(usersData) ? usersData : []);
          }
        }
        if (menuItems.length === 0) {
          const mRes = await apiFetch('/api/menu');
          if (mRes.ok) {
            const mData = await mRes.json();
            setMenuItems(Array.isArray(mData) ? mData : (mData.items || []));
          }
        }
        if (categories.length === 0) {
          const cRes = await apiFetch('/api/categories');
          if (cRes.ok) {
            const cData = await cRes.json();
            setCategories(Array.isArray(cData) ? cData : []);
          }
        }
      }
    } catch (err) {
      setError('Failed to fetch records.');
      setCategories([]);
      setMenuItems([]);
      setPrinters([]);
      setStaffUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Item Sales History Handler
  const handleOpenItemHistory = async (item) => {
    setSelectedReportItem(item);
    setItemHistoryModalOpen(true);
    setLoadingItemHistory(true);
    try {
      const { from, to } = resolveDateRange(itemReportPreset, itemReportDateFrom, itemReportDateTo);

      const res = await apiFetch(`/api/reports/item-wise/${item.item_id}/history?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`);
      if (res.ok) {
        setItemHistoryData(await res.json());
      } else {
        setItemHistoryData([]);
      }
    } catch (err) {
      notify.error('Failed to load item sales history.', 'Error');
    } finally {
      setLoadingItemHistory(false);
    }
  };

  // Stock Adjustment Handlers
  const handleOpenAdjustStock = (item) => {
    setSelectedStockItem(item);
    setAdjustmentType('add');
    setAdjustQuantity('10');
    setAdjustUnit(item.unit || 'pcs');
    setAdjustThreshold(item.low_stock_threshold !== undefined ? item.low_stock_threshold.toString() : '10');
    setAdjustReason('Stock Replenishment');
    setAdjustStockModalOpen(true);
  };

  const handleSaveStockAdjustment = async () => {
    if (!selectedStockItem || !adjustQuantity || isNaN(parseFloat(adjustQuantity))) {
      notify.error('Please enter a valid stock quantity.', 'Validation Error');
      return;
    }
    setSavingStockAdjust(true);
    try {
      const res = await apiFetch('/api/inventory/adjust', {
        method: 'POST',
        body: {
          menuItemId: selectedStockItem.id,
          adjustmentType,
          quantity: parseFloat(adjustQuantity),
          unit: adjustUnit,
          lowStockThreshold: parseFloat(adjustThreshold),
          reason: adjustReason
        }
      });
      if (res.ok) {
        notify.success(`Stock for "${selectedStockItem.name}" updated successfully.`, 'Stock Updated');
        setAdjustStockModalOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to adjust stock.', 'Error');
      }
    } catch (err) {
      notify.error('Failed to submit stock adjustment.', 'Error');
    } finally {
      setSavingStockAdjust(false);
    }
  };

  // Stock Audit Log Handler
  const handleOpenStockLogs = async (item = null) => {
    setSelectedStockLogItem(item);
    setStockLogsModalOpen(true);
    setLoadingStockLogs(true);
    try {
      let url = '/api/inventory/logs';
      if (item) url += `?menu_item_id=${item.id}`;
      const res = await apiFetch(url);
      if (res.ok) {
        setStockLogsData(await res.json());
      } else {
        setStockLogsData([]);
      }
    } catch (err) {
      notify.error('Failed to load stock audit logs.', 'Error');
    } finally {
      setLoadingStockLogs(false);
    }
  };

  // Staff User Management Functions
  const handleOpenAddStaff = () => {
    setSelectedStaff(null);
    setStaffName('');
    setStaffUsername('');
    setStaffEmail('');
    setStaffPassword('');
    setStaffRole('cashier');
    setStaffActive(true);
    setStaffWarehouseId('');
    setStaffPermissions(ROLE_DEFAULT_PERMISSIONS['cashier'] || []);
    setStaffDialogOpen(true);
  };

  const handleOpenEditStaff = (user) => {
    setSelectedStaff(user);
    setStaffName(user.name || '');
    setStaffUsername(user.username || '');
    setStaffEmail(user.email || '');
    setStaffPassword(''); // Leave empty unless resetting password
    const role = user.role || 'cashier';
    setStaffRole(role);
    setStaffActive(Boolean(user.is_active));
    setStaffWarehouseId(user.assigned_warehouse_id ? String(user.assigned_warehouse_id) : '');
    let perms = [];
    if (user.permissions) {
      try {
        perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch {
        perms = [];
      }
    } else {
      perms = ROLE_DEFAULT_PERMISSIONS[role] || [];
    }
    setStaffPermissions(Array.isArray(perms) ? perms : []);
    setStaffDialogOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffEmail || !staffEmail.trim()) {
      notify.error('Login ID is required.', 'Validation Error');
      return;
    }

    if (!selectedStaff && (!staffPassword || staffPassword.trim().length < 6)) {
      notify.error('Password must be at least 6 characters long.', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      const cleanLoginId = staffEmail.trim();
      const fallbackName = staffName?.trim() || staffUsername?.trim() || cleanLoginId.split('@')[0];
      const fallbackUsername = staffUsername?.trim() || (cleanLoginId.includes('@') ? cleanLoginId.split('@')[0] : cleanLoginId.toLowerCase().replace(/\s+/g, '_'));

      if (selectedStaff) {
        // Edit Staff User
        const payload = {
          name: fallbackName,
          email: cleanLoginId,
          role: staffRole,
          is_active: staffActive ? 1 : 0,
          assigned_warehouse_id: staffWarehouseId ? Number(staffWarehouseId) : null,
          permissions: staffPermissions
        };
        if (staffPassword) {
          payload.password = staffPassword;
        }

        const res = await apiFetch(`/api/auth/users/${selectedStaff.id}`, {
          method: 'PUT',
          body: payload
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update staff user.');

        notify.success('Staff user account updated successfully.', 'Staff Updated');
      } else {
        // Add New Staff User
        const res = await apiFetch('/api/auth/users', {
          method: 'POST',
          body: {
            name: fallbackName,
            username: fallbackUsername,
            email: cleanLoginId,
            password: staffPassword,
            role: staffRole,
            assigned_warehouse_id: staffWarehouseId ? Number(staffWarehouseId) : null,
            permissions: staffPermissions
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Failed to create staff user.');

        notify.success(`Staff user "${fallbackName}" created successfully. Credentials active.`, 'Staff Created');
      }

      setStaffDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Staff Action Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (user) => {
    const isConfirmed = await confirmDialog({
      title: `Delete Staff Account "${user.name}"`,
      message: `Are you sure you want to delete staff user "${user.name}" (${user.username})? They will no longer be able to log into the terminal.`,
      confirmText: 'Delete User Account',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`/api/auth/users/${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete staff user.');

      notify.success(`Staff user account "${user.name}" deleted.`, 'Staff Deleted');
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Delete Error');
    }
  };

  const handleDeletePrinter = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Printer',
      message: 'Are you sure you want to remove this printer configuration?',
      confirmText: 'Delete Printer',
      isDestructive: true
    });
    if (!isConfirmed) return;
    try {
      await apiFetch(`/api/printers/${id}`, { method: 'DELETE' });
    } catch (_) {}
    await db.printers.delete(id).catch(() => {});
    notify.success('Printer configuration removed.', 'Printer Deleted');
    fetchData();
  };

  const handleSaveReceiptSettings = async () => {
    setSavingReceiptSettings(true);
    try {
      const res = await apiFetch('/api/settings/receipt', {
        method: 'POST',
        body: {
          ...receiptSettings,
          ...workflowDraft,
          ...permissionsDraft
        }
      });

      // Sync profile details to /api/settings/profile (updates restaurants table & audit history)
      try {
        await apiFetch('/api/settings/profile', {
          method: 'PUT',
          body: {
            name: receiptSettings.restaurant_name,
            logo_url: profileLogoUrl,
            address: receiptSettings.address,
            phone: receiptSettings.phone,
            email: receiptSettings.email,
            gst_number: receiptSettings.gst_number
          }
        });
      } catch (pe) {
        console.warn('[Profile Sync Warning]', pe);
      }

      // Persist locally in Dexie IndexedDB & localStorage immediately for offline support
      await db.settings.put({ key: 'receipt_settings', value: receiptSettings }).catch(() => {});
      try {
        localStorage.setItem('receipt_settings', JSON.stringify(receiptSettings));
      } catch (_) {}

      if (res && res.ok) {
        const data = await res.json();
        const updated = data.settings || data;
        setReceiptSettings(updated);
        setWorkflowDraft(buildWorkflowDraft(updated));
        setPermissionsDraft(buildPermissionsDraft(updated));
        await db.settings.put({ key: 'receipt_settings', value: updated }).catch(() => {});
      }

      // Update local session & header identity
      const currentUser = JSON.parse(localStorage.getItem('ARISO_RETAIL_USER') || '{}');
      currentUser.restaurant_name = receiptSettings.restaurant_name;
      currentUser.restaurant_logo_url = profileLogoUrl;
      localStorage.setItem('ARISO_RETAIL_USER', JSON.stringify(currentUser));
      window.dispatchEvent(new CustomEvent('auth_token_refreshed', { detail: { user: currentUser } }));

      if (receiptSettings.cart_position) {
        localStorage.setItem('ARISO_POS_CART_POSITION', receiptSettings.cart_position);
        window.dispatchEvent(new CustomEvent('cart_position_changed', { detail: { cart_position: receiptSettings.cart_position } }));
      }

      notify.success('🏪 Retail Profile & Receipt settings saved successfully.', 'Settings Saved');
    } catch (err) {
      // Even if network fails, settings are already saved locally in IndexedDB
      notify.success('🏪 Receipt settings saved locally in offline mode.', 'Settings Saved (Offline)');
    } finally {
      setSavingReceiptSettings(false);
    }
  };

  const handleTestPrint = async (type = 'receipt') => {
    setTestingPrint(true);
    try {
      const isKot = String(type).toLowerCase() === 'kot';
      const sampleOrder = {
        unique_order_number: isKot ? 'TEST-KOT-01' : 'TEST-REC-01',
        cashier_name: user?.name || 'Admin Tester',
        customer_name: 'Test Customer (Walk-in)',
        subtotal: '250.00',
        discount_amount: '20.00',
        tax_amount: '11.50',
        total_amount: '241.50',
        payment_mode: 'CASH',
        table_number_or_takeaway: 'Counter #1',
        created_at: new Date().toISOString(),
        tax_type: 'intra'
      };

      const sampleItems = [
        { name: 'Ariso Premium Item 1', quantity: 2, price: '80.00', total_price: '160.00', sku: 'SKU-001' },
        { name: 'Organic Honey (500g)', quantity: 1, item_weight: '0.50', weight_unit: 'kg', is_weight_based: 1, price: '180.00', total_price: '90.00', sku: 'SKU-002' }
      ];

      const targetPrinterName = receiptSettings.default_printer_name || '';
      const paperSize = receiptSettings.paper_size || '80mm';
      const printEngine = receiptSettings.print_engine || 'auto';

      if (window.electron) {
        if (isKot) {
          const rawEscPos = generateLocalEscPosKot(sampleOrder, sampleItems, receiptSettings);
          const base64Payload = safeUtf8ToBase64(rawEscPos);

          if (window.electron.printThermalKot) {
            await window.electron.printThermalKot(targetPrinterName, sampleOrder, sampleItems, receiptSettings);
          } else if (window.electron.printWindowsRaw) {
            await window.electron.printWindowsRaw(targetPrinterName, base64Payload);
          } else {
            const htmlKot = generateLocalHtmlKot(sampleOrder, sampleItems, receiptSettings);
            await window.electron.printSystemSilent(htmlKot, targetPrinterName, { paperSize });
          }
        } else {
          const rawEscPos = generateLocalEscPosReceipt(sampleOrder, sampleItems, user || {}, receiptSettings);
          const base64Payload = safeUtf8ToBase64(rawEscPos);

          if (window.electron.printThermalReceipt) {
            await window.electron.printThermalReceipt(targetPrinterName, sampleOrder, sampleItems, user || {}, receiptSettings);
          } else if (window.electron.printWindowsRaw) {
            await window.electron.printWindowsRaw(targetPrinterName, base64Payload);
          } else {
            const htmlReceipt = generateLocalHtmlReceipt(sampleOrder, sampleItems, user || {}, receiptSettings);
            await window.electron.printSystemSilent(htmlReceipt, targetPrinterName, { paperSize });
          }
        }
        notify.success(`Test ${isKot ? 'KOT' : 'Receipt'} sent to "${targetPrinterName || 'Default Windows Printer'}" (${paperSize}).`, 'Test Print Successful', 4000);
      } else {
        // Fallback to backend socket or browser window
        try {
          const res = await apiFetch('/api/settings/receipt/test-print', {
            method: 'POST',
            body: { print_type: type }
          });
          const data = await res.json();
          if (res.ok) {
            notify.success(data.message, 'Test Print Successful', 4000);
          } else {
            throw new Error(data.error || 'Server socket offline');
          }
        } catch (apiErr) {
          const htmlContent = isKot ? generateLocalHtmlKot(sampleOrder, sampleItems, receiptSettings) : generateLocalHtmlReceipt(sampleOrder, sampleItems, user || {}, receiptSettings);
          printHtmlSilentlyViaIframe(htmlContent);
          notify.success(`Test ${isKot ? 'KOT' : 'Receipt'} preview opened.`, 'Browser Print');
        }
      }
    } catch (err) {
      console.error('[Admin Test Print Error]', err);
      notify.error(`Test Print Failed: ${err.message}`, 'Printer Error');
    } finally {
      setTestingPrint(false);
    }
  };

  const handleOpenAddMenu = () => {
    setDialogType('add_menu');
    setSelectedEntity(null);
    setMenuName('');
    setMenuPrice('');
    setMenuCategoryId(categories[0]?.id || '');
    setMenuVeg('1');
    setMenuSpicy('0');
    setMenuAvailable('1');
    setMenuBarcode('');
    setMenuSku('');
    setMenuDesc('');
    setMenuImageUrl('');
    setMenuImageFile(null);
    setMenuPrinterId('');
    setMenuGst('5');
    setMenuPosUnitType('PCS');
    setMenuIsWeightBased(false);
    setMenuUnit('pcs');
    setMenuBarcodeImageUrl('');
    setBarcodeDuplicate(null);

    // Reset Petpooja additions
    setMenuGoodsOrService('Goods');
    setMenuItemCode('');
    setMenuHsnCode('');
    setMenuPurchaseUnit('pcs');
    setMenuSalesUnit('pcs');
    setMenuBrand('');
    setMenuItemGroup('');
    setMenuTags([]);
    setMenuTagInput('');
    setMenuPurchasePrice('');
    setMenuWholesalePrice('');
    setMenuMrp('');
    setMenuIgstRate('5');
    setMenuDiscountType('percentage');
    setMenuDiscountValue('');
    setMenuIsTrackable(true);
    setMenuOpeningStock('');
    setMenuCostPrice('');
    setMenuStockStartDate(getISTDateString());
    setMenuAtParStock('');
    setMenuMinStock('');
    setMenuLinkedSalesAccount('Sales');
    setMenuLinkedPurchaseAccount('Purchase');
    setMenuOpenQtyPopup(false);
    setMenuOpenPricePopup(false);
    setMenuNotForSale(false);

    setDialogOpen(true);
  };

  const handleOpenEditMenu = (item) => {
    setDialogType('edit_menu');
    setSelectedEntity(item);
    setMenuName(item.name || '');
    setMenuPrice(item.price !== undefined ? item.price.toString() : '');
    setMenuCategoryId(item.category_id ? item.category_id.toString() : '');
    setMenuVeg(item.is_veg !== undefined ? item.is_veg.toString() : '1');
    setMenuSpicy(item.spicy_level !== undefined ? item.spicy_level.toString() : '0');
    setMenuAvailable(item.is_available !== undefined ? item.is_available.toString() : '1');
    setMenuBarcode(item.barcode || '');
    setMenuSku(item.sku || '');
    setMenuDesc(item.description || '');
    setMenuImageUrl(item.image_url || '');
    setMenuImageFile(null);
    setMenuPrinterId(item.printer_id ? item.printer_id.toString() : '');
    setMenuGst(item.gst_rate !== undefined && item.gst_rate !== null ? Math.round(parseFloat(item.gst_rate)).toString() : '5');

    // Strict Item Type & POS Unit Type resolution
    let resolvedUnitType = 'PCS';
    if (item.pos_unit_type) {
      const p = String(item.pos_unit_type).toUpperCase().trim();
      if (p === 'SERIAL' || p === 'SERIAL NUMBER' || p === 'SERIALIZED') resolvedUnitType = 'SERIAL';
      else if (p === 'WEIGHT') resolvedUnitType = 'WEIGHT';
      else resolvedUnitType = 'PCS';
    } else {
      const it = String(item.item_type || item.itemType || '').toUpperCase().trim();
      if (it === 'SERIAL' || it === 'SERIAL NUMBER' || it === 'SERIALIZED') {
        resolvedUnitType = 'SERIAL';
      } else if (it === 'WEIGHT' || item.is_weight_based === 1 || item.is_weight_based === true || item.is_weight_based === '1') {
        resolvedUnitType = 'WEIGHT';
      } else if (item.is_serial_tracked === 1 || item.is_serial_tracked === true || item.is_serial_tracked === '1') {
        if (item.sku === '122' || item.barcode === '122' || (item.name && item.name.toLowerCase().includes('hdmi'))) {
          resolvedUnitType = 'SERIAL';
        } else {
          resolvedUnitType = 'PCS';
        }
      } else {
        const storedUnit = (item.unit || item.base_unit || '').toLowerCase();
        if (['kg', 'gram', 'gm', 'g', 'litre', 'ltr', 'ml'].includes(storedUnit)) {
          resolvedUnitType = 'WEIGHT';
        } else {
          resolvedUnitType = 'PCS';
        }
      }
    }
    const isWeight = resolvedUnitType === 'WEIGHT';
    setMenuPosUnitType(resolvedUnitType);
    setMenuIsWeightBased(isWeight);

    const WEIGHT_UNITS = ['kg', 'gram', 'gm', 'g', 'litre', 'ltr', 'ml'];
    const PCS_UNITS = ['pcs', 'box', 'pack', 'bottle'];
    const storedUnit = (item.unit || item.base_unit || '').toLowerCase();
    let resolvedUnit = isWeight
      ? (WEIGHT_UNITS.includes(storedUnit) ? storedUnit : 'kg')
      : (PCS_UNITS.includes(storedUnit) ? storedUnit : 'pcs');
    setMenuUnit(resolvedUnit);

    setMenuBarcodeImageUrl(item.barcode_image_url || '');
    setBarcodeDuplicate(null);

    // Populate Petpooja additions
    setMenuGoodsOrService(item.goods_or_service || 'Goods');
    setMenuItemCode(item.item_code || '');
    setMenuHsnCode(item.hsn_code || '');
    setMenuPurchaseUnit(item.purchase_unit || 'pcs');
    setMenuSalesUnit(item.sales_unit || 'pcs');
    setMenuBrand(item.brand || '');
    setMenuItemGroup(item.item_group || '');

    // Parse tags safely
    let parsedTags = [];
    if (Array.isArray(item.tags)) {
      parsedTags = item.tags;
    } else if (typeof item.tags === 'string' && item.tags.trim()) {
      try {
        const json = JSON.parse(item.tags);
        parsedTags = Array.isArray(json) ? json : item.tags.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        parsedTags = item.tags.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    setMenuTags(parsedTags);
    setMenuTagInput('');

    setMenuPurchasePrice(item.purchase_price !== undefined && item.purchase_price !== null ? item.purchase_price.toString() : '');
    setMenuWholesalePrice(item.wholesale_price !== undefined && item.wholesale_price !== null ? item.wholesale_price.toString() : '');
    setMenuMrp(item.mrp !== undefined && item.mrp !== null ? item.mrp.toString() : '');
    setMenuIgstRate(item.igst_rate !== undefined && item.igst_rate !== null ? Math.round(parseFloat(item.igst_rate)).toString() : (item.gst_rate ? Math.round(parseFloat(item.gst_rate)).toString() : '5'));
    setMenuDiscountType(item.discount_type || 'percentage');
    setMenuDiscountValue(item.discount_value !== undefined && item.discount_value !== null ? item.discount_value.toString() : '');
    setMenuIsTrackable(item.is_trackable !== undefined ? Boolean(Number(item.is_trackable)) : true);
    setMenuOpeningStock(item.opening_stock !== undefined && item.opening_stock !== null ? item.opening_stock.toString() : '');
    setMenuCostPrice(item.cost_price !== undefined && item.cost_price !== null ? item.cost_price.toString() : '');

    let dateStr = '';
    if (item.stock_start_date) {
      dateStr = String(item.stock_start_date).split('T')[0];
    } else {
      dateStr = getISTDateString();
    }
    setMenuStockStartDate(dateStr);

    setMenuAtParStock(item.at_par_stock !== undefined && item.at_par_stock !== null ? item.at_par_stock.toString() : '');
    setMenuMinStock(item.min_stock !== undefined && item.min_stock !== null ? item.min_stock.toString() : (item.low_stock_threshold ? item.low_stock_threshold.toString() : ''));
    setMenuLinkedSalesAccount(item.linked_sales_account || 'Sales');
    setMenuLinkedPurchaseAccount(item.linked_purchase_account || 'Purchase');
    setMenuOpenQtyPopup(Boolean(Number(item.open_qty_popup)));
    setMenuOpenPricePopup(Boolean(Number(item.open_price_popup)));
    setMenuNotForSale(Boolean(Number(item.not_for_sale)));

    setDialogOpen(true);
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();

    // Enforce unit/is_weight_based consistency before sending:
    // menuIsWeightBased is the authoritative source of truth.
    const isWeightFinal = Boolean(menuIsWeightBased);
    const WEIGHT_UNITS = ['kg', 'gram', 'gm', 'g', 'litre', 'ltr', 'ml'];
    const PCS_UNITS = ['pcs', 'box', 'pack', 'bottle'];
    let unitFinal = menuUnit;
    if (isWeightFinal && !WEIGHT_UNITS.includes((unitFinal || '').toLowerCase())) {
      unitFinal = 'kg'; // Correct unit if it doesn't match item type
    } else if (!isWeightFinal && !PCS_UNITS.includes((unitFinal || '').toLowerCase())) {
      unitFinal = 'pcs'; // Correct unit if it doesn't match item type
    }

    const formData = new FormData();
    formData.append('name', menuName);
    formData.append('price', menuPrice);
    formData.append('gst_rate', menuGst);
    formData.append('category_id', menuCategoryId);
    formData.append('is_veg', menuVeg);
    formData.append('spicy_level', menuSpicy);
    formData.append('is_available', menuAvailable);
    formData.append('barcode', menuBarcode ? menuBarcode.trim() : '');
    formData.append('sku', menuSku ? menuSku.trim() : '');
    formData.append('description', menuDesc);
    formData.append('is_weight_based', isWeightFinal ? '1' : '0');
    formData.append('pos_unit_type', menuPosUnitType);
    formData.append('is_serial_tracked', menuPosUnitType === 'SERIAL' ? '1' : '0');
    formData.append('item_type', menuPosUnitType);
    formData.append('itemType', menuPosUnitType);
    formData.append('unit', unitFinal);
    formData.append('base_unit', unitFinal);
    if (menuPrinterId) formData.append('printer_id', menuPrinterId);
    if (menuBarcodeImageUrl) formData.append('barcode_image_url', menuBarcodeImageUrl);

    // Petpooja additions
    formData.append('goods_or_service', menuGoodsOrService);
    formData.append('item_code', menuItemCode);
    formData.append('hsn_code', menuHsnCode);
    formData.append('purchase_unit', menuPurchaseUnit);
    formData.append('sales_unit', menuSalesUnit);
    formData.append('brand', menuBrand);
    formData.append('item_group', menuItemGroup);
    formData.append('tags', JSON.stringify(menuTags));
    formData.append('purchase_price', menuPurchasePrice || '0');
    formData.append('wholesale_price', menuWholesalePrice || '');
    formData.append('mrp', menuMrp || '0');
    formData.append('igst_rate', menuIgstRate || menuGst);
    formData.append('discount_type', menuDiscountType);
    formData.append('discount_value', menuDiscountValue || '0');
    formData.append('is_trackable', '1');
    formData.append('opening_stock', menuOpeningStock || '0');
    formData.append('cost_price', menuCostPrice || '0');
    if (menuStockStartDate) formData.append('stock_start_date', menuStockStartDate);
    formData.append('at_par_stock', menuAtParStock || '0');
    formData.append('min_stock', menuMinStock || '0');
    formData.append('linked_sales_account', menuLinkedSalesAccount);
    formData.append('linked_purchase_account', menuLinkedPurchaseAccount);
    formData.append('open_qty_popup', menuOpenQtyPopup ? '1' : '0');
    formData.append('open_price_popup', menuOpenPricePopup ? '1' : '0');
    formData.append('not_for_sale', menuNotForSale ? '1' : '0');

    if (menuImageFile) {
      formData.append('image', menuImageFile);
    } else if (menuImageUrl) {
      formData.append('image_url', menuImageUrl);
    }

    try {
      const url = getApiUrl(dialogType === 'add_menu' ? '/api/menu' : `/api/menu/${selectedEntity.id}`);
      const method = dialogType === 'add_menu' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Save menu item failed.');
      notify.success('Menu item saved successfully.', 'Item Saved');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Save Error');
    }
  };

  const handleDeleteMenu = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Menu Item',
      message: 'Are you sure you want to delete this menu item? It will no longer appear on POS terminals.',
      confirmText: 'Delete Item',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const response = await apiFetch(`/api/menu/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete menu item.');
      }
      notify.success('Menu item deleted permanently from database.', 'Item Deleted');
      await fetchData();
    } catch (err) {
      notify.error(err.message || 'Failed to delete menu item.', 'Delete Error');
    }
  };

  // Category Sequence Reorder Functions
  const handleCategoryDragStart = (e, index) => {
    setDraggedCategoryIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedCategoryIdx === null || draggedCategoryIdx === dropIndex) return;

    const updatedCategories = [...categories];
    const [draggedItem] = updatedCategories.splice(draggedCategoryIdx, 1);
    updatedCategories.splice(dropIndex, 0, draggedItem);

    const reorderedWithSeq = updatedCategories.map((cat, idx) => ({
      ...cat,
      seq: idx + 1
    }));

    setCategories(reorderedWithSeq);
    setDraggedCategoryIdx(null);

    await saveCategorySequence(reorderedWithSeq);
  };

  const handleMoveCategory = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updatedCategories = [...categories];
    const temp = updatedCategories[index];
    updatedCategories[index] = updatedCategories[targetIndex];
    updatedCategories[targetIndex] = temp;

    const reorderedWithSeq = updatedCategories.map((cat, idx) => ({
      ...cat,
      seq: idx + 1
    }));

    setCategories(reorderedWithSeq);
    await saveCategorySequence(reorderedWithSeq);
  };

  const saveCategorySequence = async (reorderedList) => {
    try {
      const sequences = reorderedList.map((cat, idx) => ({
        id: cat.id,
        seq: idx + 1
      }));

      const res = await apiFetch('/api/categories/reorder', {
        method: 'POST',
        body: { sequences }
      });

      if (res.ok) {
        notify.success('Category sequence saved permanently.', 'Sequence Saved');
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save sequence.', 'Error');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to save category sequence.', 'Error');
      fetchData();
    }
  };

  const handleOpenAddPrinter = () => {
    setDialogType('add_printer');
    setSelectedEntity(null);
    setPrinterName('');
    setPrinterType(window.electron ? 'usb' : 'lan');
    setPrinterIp('');
    setPrinterPort('9100');
    setPrinterWidth('80');
    setPrinterRole('receipt');
    setPrinterAutoCut('1');
    setPrinterCashDrawer('1');
    setPrinterDefaultReceipt(false);
    setPrinterDefaultKot(false);
    setPrinterStatus('online');
    setPrinterDeviceId('');
    setPrinterBluetoothAddress('');
    handleRefreshSystemPrinters(false);
    setDialogOpen(true);
  };

  const handleOpenEditPrinter = (printer) => {
    setDialogType('edit_printer');
    setSelectedEntity(printer);
    setPrinterName(printer.name || '');
    setPrinterType(printer.type || (window.electron ? 'usb' : 'lan'));
    setPrinterIp(printer.ip_address || '');
    setPrinterBluetoothAddress(printer.bluetooth_address || '');
    setPrinterPort((printer.port || 9100).toString());
    setPrinterWidth((printer.paper_width || 80).toString());
    setPrinterRole(printer.role || 'receipt');
    setPrinterAutoCut(printer.auto_cut !== undefined ? printer.auto_cut.toString() : '1');
    setPrinterCashDrawer(printer.cash_drawer !== undefined ? printer.cash_drawer.toString() : '1');
    setPrinterDefaultReceipt(Boolean(printer.is_default_receipt));
    setPrinterDefaultKot(Boolean(printer.is_default_kot));
    setPrinterStatus(printer.status || 'online');
    setPrinterDeviceId(printer.device_id ? printer.device_id.toString() : '');
    handleRefreshSystemPrinters(false);
    setDialogOpen(true);
  };

  const handleTogglePrinterStatus = async (printer) => {
    const nextStatus = printer.status === 'offline' ? 'online' : 'offline';
    try {
      const res = await apiFetch(`/api/printers/${printer.id}/status`, {
        method: 'PUT',
        body: { status: nextStatus }
      });
      if (!res.ok) {
        await apiFetch(`/api/printers/${printer.id}`, {
          method: 'PUT',
          body: { ...printer, status: nextStatus }
        });
      }
      notify.success(`Printer "${printer.name}" is now ${nextStatus.toUpperCase()}.`, 'Printer Status Updated');
      fetchData();
    } catch (err) {
      notify.error('Failed to toggle printer status.', 'Error');
    }
  };

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    const isUsb = printerType === 'usb';
    const isBt = printerType === 'bluetooth';
    const payload = {
      name: printerName,
      type: printerType,
      ip_address: (isUsb || isBt) ? null : printerIp,
      bluetooth_address: isBt ? printerBluetoothAddress : null,
      port: (isUsb || isBt) ? null : parseInt(printerPort || 9100),
      paper_width: printerWidth,
      role: printerRole,
      auto_cut: parseInt(printerAutoCut),
      cash_drawer: parseInt(printerCashDrawer),
      is_default_receipt: printerDefaultReceipt,
      is_default_kot: printerDefaultKot,
      status: printerStatus,
      device_id: isBt ? null : (printerDeviceId ? parseInt(printerDeviceId) : null)
    };

    try {
      const isEdit = dialogType === 'edit_printer' && selectedEntity;
      const url = isEdit ? `/api/printers/${selectedEntity.id}` : '/api/printers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: payload
      });
      if (response && response.ok) {
        const resData = await response.json().catch(() => ({}));
        const savedPrinter = resData.printer || { ...payload, id: selectedEntity?.id || Date.now() };
        await db.printers.put(savedPrinter).catch(() => {});
      } else {
        const localRecord = { ...payload, id: selectedEntity?.id || Date.now() };
        await db.printers.put(localRecord).catch(() => {});
      }
      notify.success('Printer configuration saved successfully.', 'Printer Saved');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.warn('[AdminPanel] Saving printer in offline mode to local database:', err.message);
      const localRecord = { ...payload, id: selectedEntity?.id || Date.now() };
      await db.printers.put(localRecord).catch(() => {});
      notify.success('Printer configuration saved locally (Offline).', 'Printer Saved');
      setDialogOpen(false);
      fetchData();
    }
  };


  const handleTestPrinter = async (printer) => {
    if ((printer.type === 'usb' || !printer.ip_address) && window.electron) {
      try {
        const printerTarget = printer.name || '';
        
        // 1. Verify live Windows connection first if testPrinterConnection is available
        if (window.electron.testPrinterConnection) {
          const connCheck = await window.electron.testPrinterConnection(printerTarget);
          if (!connCheck || !connCheck.success) {
            notify.error(`Printer Connection Failed: ${connCheck?.error || 'Unable to open Windows printer handle.'}`, 'Printer Offline');
            return;
          }
        }

        // 2. Dispatch Test Receipt Print with High-Fidelity Silent HTML Engine
        const testOrder = {
          unique_order_number: 'TEST-001',
          subtotal: '100.00',
          discount_amount: '0.00',
          tax_amount: '5.00',
          total_amount: '105.00',
          payment_mode: 'TEST',
          cashier_name: user?.name || 'Admin',
          customer_name: 'Test Customer',
          created_at: new Date().toISOString(),
          tax_type: 'intra'
        };
        const testItems = [{ name: 'Test Receipt Print', quantity: 1, price: '100.00', total_price: '100.00' }];
        const paperSize = printer.paper_width ? `${printer.paper_width}mm` : (receiptSettings?.paper_width ? `${receiptSettings.paper_width}mm` : '80mm');
        
        const rawEscPos = generateLocalEscPosReceipt(testOrder, testItems, user || {}, receiptSettings);
        const base64Payload = safeUtf8ToBase64(rawEscPos);
        const htmlReceipt = generateLocalHtmlReceipt(testOrder, testItems, user || {}, receiptSettings);

        if (window.electron.printThermalReceipt) {
          await window.electron.printThermalReceipt(printerTarget, testOrder, testItems, user || {}, receiptSettings);
        } else if (window.electron.printWindowsRaw) {
          await window.electron.printWindowsRaw(printerTarget, base64Payload);
        } else if (window.electron.printSystemSilent) {
          await window.electron.printSystemSilent(htmlReceipt, printerTarget, { paperSize });
        }

        notify.success(`Connection Confirmed! Test receipt printed successfully on "${printerTarget}".`, '🖨️ Connection Successful');
      } catch (err) {
        notify.error(`USB Print Test Failed: ${err.message}`, 'Printer Error');
      }
      return;
    }

    try {
      const response = await apiFetch('/api/printers/test', {
        method: 'POST',
        body: { id: printer.id, ip_address: printer.ip_address, port: printer.port, paper_width: printer.paper_width, name: printer.name }
      });
      const data = await response.json();
      if (response.ok && (data.status === 'connected' || data.success)) {
        notify.success(`Printer "${printer.name}" (${printer.ip_address}:${printer.port || 9100}) is ONLINE and test receipt printed!`, 'Test Print Success');
        fetchData();
      } else {
        notify.error(`Connection Test Failed: ${data.error || 'Printer unreachable'}`, 'Socket Offline');
        fetchData();
      }
    } catch (err) {
      notify.error(`Failed to connect to printer TCP socket (${printer.ip_address}:${printer.port || 9100}).`, 'Network Error');
    }
  };

  const [discoveringLanPrinters, setDiscoveringLanPrinters] = useState(false);

  const handleAutoDetectLanPrinters = async () => {
    setDiscoveringLanPrinters(true);
    try {
      const response = await apiFetch('/api/printers/discover');
      const data = await response.json();
      if (response.ok && data.discovered && data.discovered.length > 0) {
        const found = data.discovered[0];
        notify.success(`Discovered LAN thermal printer "${found.name}" at ${found.ip}:${found.port}! Connected & synchronized.`, 'Printer Discovered');
        await fetchData();
      } else {
        notify.info('No LAN thermal printer responded on port 9100 on the local network. Please ensure the printer is turned on and connected to the same Wi-Fi/router.', 'Scan Completed');
      }
    } catch (err) {
      notify.error('Network auto-discovery failed: ' + err.message, 'Discovery Error');
    } finally {
      setDiscoveringLanPrinters(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: categoryName, description: categoryDesc })
      });
      if (!response.ok) throw new Error('Create category failed.');
      notify.success('Menu category created successfully.', 'Category Created');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Category Error');
    }
  };

  const handleDeleteCategory = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      confirmText: 'Delete Category',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      await fetch(getApiUrl(`/api/categories/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      notify.success('Category deleted successfully.', 'Category Deleted');
      fetchData();
    } catch (err) {
      notify.error('Failed to delete category.', 'Delete Error');
    }
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* Left Collapsible Sidebar Navigation */}
      <AdminSidebar
        activeTab={currentTabValue}
        onSelectTab={(tabVal) => setActiveTab(tabVal)}
        validTabValues={validTabValues}
        inventorySubTab={inventorySubTab}
        onSelectInventorySubTab={(subTabKey) => {
          setActiveTab(5);
          setInventorySubTab(subTabKey);
        }}
        gstSubTab={gstSubTab}
        onSelectGstSubTab={(subTabKey) => {
          setActiveTab(6);
          setGstSubTab(subTabKey);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            width: '100%',
            maxWidth: '1600px',
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4, xl: 6 },
            pt: { xs: 2, md: 3 },
            pb: { xs: 5, md: 8, xl: 10 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          {error && (
            <Box sx={{ bgcolor: 'error.light', color: 'error.contrastText', p: 1.5, borderRadius: 2, fontWeight: 600 }}>
              {error}
            </Box>
          )}

        {/* --- FOOD ITEMS SUB-TAB --- */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            {/* Header Section: Single compact 1-row layout on mobile */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Manage Food Menu Items
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Configure dish prices, GST levels, categories, and availability.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<Tag size={15} />}
                  onClick={() => handleOpenStickersModal()}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  title="Print dynamic barcode stickers on thermal rolls"
                >
                  {selectedIds.length > 0 ? `Print ${selectedIds.length} Stickers` : 'Print Stickers'}
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<FileSpreadsheet size={16} />}
                  onClick={() => setBulkImportOpen(true)}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  Bulk Import Menu
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Plus size={14} />}
                  onClick={handleOpenAddMenu}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2.5 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  Add Menu Item
                </Button>
              </Box>
            </Box>

            {/* SEARCH & FILTER TOOLBAR */}
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', width: '100%' }}>
              <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
                {/* Search Bar */}
                <Grid xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search dish name or SKU..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} style={{ color: '#64748b' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchTerm ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                              <X size={16} />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }
                    }}
                  />
                </Grid>

                {/* Category Filter */}
                <Grid xs={12} sm={6} md={3}>
                  <Select
                    fullWidth
                    size="small"
                    value={categoryFilter}
                    onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
                    displayEmpty
                  >
                    <MenuItem value="all">All Categories ({menuItems.length})</MenuItem>
                    {(categories || []).map(cat => (
                      <MenuItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>

                {/* Diet Filter */}
                <Grid xs={6} sm={4} md={2.5}>
                  <Select
                    fullWidth
                    size="small"
                    value={dietFilter}
                    onChange={e => { setDietFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="all">All Diets</MenuItem>
                    <MenuItem value="veg">Veg Only</MenuItem>
                    <MenuItem value="nonveg">Non-Veg Only</MenuItem>
                  </Select>
                </Grid>

                {/* Availability Filter */}
                <Grid xs={6} sm={4} md={2.5}>
                  <Select
                    fullWidth
                    size="small"
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="unavailable">Sold Out</MenuItem>
                  </Select>
                </Grid>
              </Grid>

              {/* Active Removable Filter Chips */}
              {activeFilterCount > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
                    Active Filters ({activeFilterCount}):
                  </Typography>

                  {searchTerm && (
                    <Chip
                      size="small"
                      label={`Search: "${searchTerm}"`}
                      onDelete={() => setSearchTerm('')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {categoryFilter !== 'all' && (
                    <Chip
                      size="small"
                      label={`Category: ${categories.find(c => c.id.toString() === categoryFilter)?.name || categoryFilter}`}
                      onDelete={() => setCategoryFilter('all')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {dietFilter !== 'all' && (
                    <Chip
                      size="small"
                      label={`Diet: ${dietFilter === 'veg' ? 'Veg Only' : 'Non-Veg Only'}`}
                      onDelete={() => setDietFilter('all')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {statusFilter !== 'all' && (
                    <Chip
                      size="small"
                      label={`Status: ${statusFilter === 'available' ? 'Available' : 'Sold Out'}`}
                      onDelete={() => setStatusFilter('all')}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  <Button
                    size="small"
                    onClick={clearAllFilters}
                    sx={{ fontSize: '11px', textTransform: 'none', fontWeight: 700, color: 'error.main', ml: 'auto' }}
                  >
                    Clear All Filters
                  </Button>
                </Box>
              )}
            </Paper>

            {/* BULK ACTION BAR */}
            {selectedIds.length > 0 && (
              <Paper
                elevation={4}
                sx={{
                  p: 1.5,
                  px: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  width: '100%'
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800, color: selectedIds.length >= 20 ? '#ef4444' : '#ffffff' }}>
                  {selectedIds.length} / 20 item(s) selected {selectedIds.length >= 20 ? '(Max Limit Reached)' : '(Max 20)'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleBulkStatusChange(true)}
                    sx={{ fontWeight: 700, fontSize: '12px' }}
                  >
                    Mark Available
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => handleBulkStatusChange(false)}
                    sx={{ fontWeight: 700, fontSize: '12px' }}
                  >
                    Mark Sold Out
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<Trash2 size={14} />}
                    onClick={handleBulkDelete}
                    sx={{ fontWeight: 700, fontSize: '12px' }}
                  >
                    Delete Selected
                  </Button>
                  <IconButton size="small" onClick={() => setSelectedIds([])} sx={{ color: '#94a3b8' }}>
                    <X size={16} />
                  </IconButton>
                </Box>
              </Paper>
            )}

            {/* DESKTOP TABLE VIEW */}
            {!isMobileOrTablet ? (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, maxHeight: '65vh', overflow: 'auto', width: '100%' }}>
                <Table stickyHeader sx={{ width: '100%' }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                        <Checkbox
                          size="small"
                          indeterminate={selectedIds.length > 0 && selectedIds.length < processedItems.length}
                          checked={processedItems.length > 0 && selectedIds.length === processedItems.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 60, bgcolor: '#f8fafc' }}>Item</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'name'}
                          direction={sortField === 'name' ? sortDirection : 'asc'}
                          onClick={() => handleSort('name')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Item Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'category_id'}
                          direction={sortField === 'category_id' ? sortDirection : 'asc'}
                          onClick={() => handleSort('category_id')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Category
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'price'}
                          direction={sortField === 'price' ? sortDirection : 'asc'}
                          onClick={() => handleSort('price')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Price (INR)
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'gst_rate'}
                          direction={sortField === 'gst_rate' ? sortDirection : 'asc'}
                          onClick={() => handleSort('gst_rate')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          GST Rate
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Diet</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc' }}>
                        <TableSortLabel
                          active={sortField === 'is_available'}
                          direction={sortField === 'is_available' ? sortDirection : 'asc'}
                          onClick={() => handleSort('is_available')}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Status
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', bgcolor: '#f8fafc' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            No menu items match your search & filter criteria.
                          </Typography>
                          <Button size="small" onClick={clearAllFilters} sx={{ mt: 1, fontWeight: 700 }}>
                            Reset Filters
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item, idx) => {
                        const isSelected = selectedIds.includes(item.id);
                        const cat = categories.find(c => c.id === item.category_id);
                        return (
                          <TableRow
                            key={item.id}
                            hover
                            selected={isSelected}
                            sx={{
                              bgcolor: idx % 2 === 1 ? 'action.hover' : 'background.paper',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                onChange={() => handleSelectRow(item.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {item.image_url ? (
                                <img
                                  src={resolveImageUrl(item.image_url)}
                                  alt={item.name}
                                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                                />
                              ) : (
                                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                                  <Package size={22} />
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                  {item.name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
                                  {item.item_code && (
                                    <Typography variant="caption" sx={{ bgcolor: '#f1f5f9', px: 0.75, py: 0.1, borderRadius: 1, fontWeight: 700, fontSize: '10px', color: '#475569' }}>
                                      Code: {item.item_code}
                                    </Typography>
                                  )}
                                  {item.barcode && (
                                    <Typography variant="caption" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', px: 0.75, py: 0.1, borderRadius: 1, fontWeight: 700, fontSize: '10px' }}>
                                      Barcode: {item.barcode}
                                    </Typography>
                                  )}
                                  {item.sku && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      SKU: {item.sku}
                                    </Typography>
                                  )}
                                  {item.brand && (
                                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '11px' }}>
                                      • {item.brand}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={cat ? cat.name : 'Uncategorized'}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                Rs. {parseFloat(item.price).toFixed(2)}
                              </Typography>
                              {item.mrp > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '10px' }}>
                                  MRP: Rs. {parseFloat(item.mrp).toFixed(2)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              {item.gst_rate !== undefined && item.gst_rate !== null ? `${Math.round(parseFloat(item.gst_rate))}%` : '5%'}
                            </TableCell>
                            <TableCell>
                              {item.is_veg === 1 ? (
                                <Chip label="🟢 Veg" size="small" color="success" sx={{ fontWeight: 700, fontSize: '11px' }} />
                              ) : (
                                <Chip label="🔴 Non-Veg" size="small" color="error" sx={{ fontWeight: 700, fontSize: '11px' }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.is_available ? 'Available' : 'Sold Out'}
                                color={item.is_available ? 'success' : 'default'}
                                size="small"
                                sx={{ fontWeight: 800, fontSize: '11px' }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                <Tooltip title="Preview Barcode Sticker">
                                  <IconButton onClick={() => handleOpenStickerPreview(item)} size="small" sx={{ color: 'primary.main' }}>
                                    <Eye size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Print Product Sticker">
                                  <IconButton onClick={() => handleOpenStickersModal([item])} size="small" sx={{ color: 'info.main' }}>
                                    <Tag size={16} />
                                  </IconButton>
                                </Tooltip>
                                <IconButton onClick={() => handleOpenEditMenu(item)} size="small" color="primary">
                                  <Edit2 size={16} />
                                </IconButton>
                                <IconButton onClick={() => handleDeleteMenu(item.id)} size="small" color="error">
                                  <Trash2 size={16} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* MOBILE RESPONSIVE STACKED CARDS VIEW */
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                {paginatedItems.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No items match your filter criteria.
                    </Typography>
                  </Paper>
                ) : (
                  paginatedItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const cat = categories.find(c => c.id === item.category_id);
                    return (
                      <Card
                        key={item.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          bgcolor: isSelected ? 'action.selected' : 'background.paper',
                          border: isSelected ? '2px solid #f97316' : '1px solid #e2e8f0',
                          width: '100%'
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.id)}
                            sx={{ p: 0, mt: 0.5 }}
                          />
                          {item.image_url ? (
                            <img
                              src={resolveImageUrl(item.image_url)}
                              alt={item.name}
                              style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }}
                            />
                          ) : (
                            <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                              <Package size={24} />
                            </Box>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {item.name}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                Rs. {parseFloat(item.price).toFixed(2)}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1, alignItems: 'center' }}>
                              <Chip label={cat ? cat.name : 'General'} size="small" variant="outlined" sx={{ fontSize: '10px', height: 22 }} />
                              {item.is_veg === 1 ? (
                                <Chip label="🟢 Veg" size="small" color="success" sx={{ fontSize: '10px', height: 22 }} />
                              ) : (
                                <Chip label="🔴 Non-Veg" size="small" color="error" sx={{ fontSize: '10px', height: 22 }} />
                              )}
                              <Chip
                                label={item.is_available ? 'Available' : 'Sold Out'}
                                color={item.is_available ? 'success' : 'default'}
                                size="small"
                                sx={{ fontSize: '10px', height: 22, fontWeight: 700 }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<Eye size={13} />}
                                onClick={() => handleOpenStickerPreview(item)}
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              >
                                Preview
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                startIcon={<Tag size={13} />}
                                onClick={() => handleOpenStickersModal([item])}
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              >
                                Sticker
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Edit2 size={14} />}
                                onClick={() => handleOpenEditMenu(item)}
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Trash2 size={14} />}
                                onClick={() => handleDeleteMenu(item.id)}
                                sx={{ fontWeight: 700, fontSize: '11px' }}
                              >
                                Delete
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Card>
                    );
                  })
                )}
              </Box>
            )}

            {/* PAGINATION CONTROLS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 1, width: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Showing {processedItems.length > 0 ? page * rowsPerPage + 1 : 0}–{Math.min((page + 1) * rowsPerPage, processedItems.length)} of {processedItems.length} items
              </Typography>
              <TablePagination
                component="div"
                count={processedItems.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{ border: 'none' }}
              />
            </Box>
          </Box>
        )}

        {/* --- CATEGORIES SUB-TAB --- */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Manage Menu Categories
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Define custom layout category filters & display sequences.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Plus size={14} />}
                onClick={() => { setDialogType('add_category'); setCategoryName(''); setCategoryDesc(''); setDialogOpen(true); }}
                sx={{
                  fontWeight: 800,
                  px: { xs: 1.25, sm: 2.5 },
                  py: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Add Category
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%' }}>
              <Table sx={{ width: '100%' }} size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: 40, px: 1 }}>Drag</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 80, display: { xs: 'none', md: 'table-cell' } }}>Move</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 50, px: 1 }}>Seq</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Category Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100%', minWidth: 180, display: { xs: 'none', sm: 'table-cell' } }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', minWidth: 70 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((cat, index) => (
                    <TableRow
                      key={cat.id}
                      draggable
                      onDragStart={(e) => handleCategoryDragStart(e, index)}
                      onDragOver={handleCategoryDragOver}
                      onDrop={(e) => handleCategoryDrop(e, index)}
                      onDragEnd={() => setDraggedCategoryIdx(null)}
                      sx={{
                        cursor: 'grab',
                        bgcolor: draggedCategoryIdx === index ? 'action.selected' : 'background.paper',
                        opacity: draggedCategoryIdx === index ? 0.5 : 1,
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell sx={{ px: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'text.secondary' }}>
                          <GripVertical size={18} />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Move Up">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                onClick={() => handleMoveCategory(index, -1)}
                                sx={{ p: 0.5 }}
                              >
                                <ArrowUp size={16} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move Down">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === categories.length - 1}
                                onClick={() => handleMoveCategory(index, 1)}
                                sx={{ p: 0.5 }}
                              >
                                <ArrowDown size={16} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{cat.seq || index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{cat.name}</TableCell>
                      <TableCell color="text.secondary">{cat.description || 'No description notes'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <IconButton onClick={() => handleDeleteCategory(cat.id)} size="small" color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* --- PRINTERS SUB-TAB --- */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Printers & Terminals
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Register dynamic USB thermal drivers, network LAN IP addresses & ESC/POS configurations.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                {window.electron && (
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={loadingSystemPrinters ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
                    onClick={() => {
                      handleRefreshSystemPrinters(true);
                      fetchData();
                    }}
                    disabled={loadingSystemPrinters}
                    sx={{
                      fontWeight: 800,
                      px: { xs: 1.25, sm: 2 },
                      py: { xs: 0.5, sm: 1 },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Refresh Printers
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={discoveringLanPrinters ? <CircularProgress size={14} color="inherit" /> : <Wifi size={14} />}
                  onClick={handleAutoDetectLanPrinters}
                  disabled={discoveringLanPrinters}
                  title="Scan current Wi-Fi / LAN subnet to automatically detect thermal printers"
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  {discoveringLanPrinters ? 'Detecting...' : 'Detect LAN Printers'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Plus size={14} />}
                  onClick={handleOpenAddPrinter}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2.5 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  Add Printer
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: { xs: '0.75rem', sm: '1.25rem' },
                width: '100%'
              }}
            >
              {printers.map(printer => (
                <Card variant="outlined" key={printer.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2.5 }}>
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: { xs: '0.9rem', sm: '1rem' } }}>{printer.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Tooltip title={`Click to set status to ${printer.status === 'offline' ? 'ONLINE' : 'OFFLINE'}`}>
                          <Chip
                            label={printer.status === 'offline' ? '🔴 Offline' : '🟢 Online'}
                            size="small"
                            color={printer.status === 'offline' ? 'error' : 'success'}
                            variant="outlined"
                            onClick={() => handleTogglePrinterStatus(printer)}
                            clickable
                            sx={{ fontWeight: 800, fontSize: '10px', height: 22, cursor: 'pointer' }}
                          />
                        </Tooltip>
                        <Chip label={printer.role} size="small" color="primary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', height: 22 }} />
                      </Box>
                    </Box>

                    {/* Compact 2-Column Key-Value Grid */}
                    <Box sx={{ fontSize: { xs: 12, sm: 13 }, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr' }, gap: 0.5, color: 'text.secondary', mt: 0.5 }}>
                      {printer.type === 'lan' || printer.type === 'network' ? (
                        <Box>IP: <b>{printer.ip_address}:{printer.port || 9100}</b></Box>
                      ) : printer.type === 'bluetooth' ? (
                        <Box>BT: <b>{printer.bluetooth_address || 'Paired Device'}</b></Box>
                      ) : (
                        <Box>Device: <b>{printer.name}</b></Box>
                      )}
                      <Box>Paper: <b>{printer.paper_width || 80}mm Thermal</b></Box>
                      <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>Type: <b>{(printer.type || 'lan').toUpperCase()}</b></Box>
                      {printer.is_default_receipt === 1 && <Chip label="⭐ Default Receipt" size="small" color="warning" sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700, fontSize: '10px', height: 22 }} />}
                      {printer.is_default_kot === 1 && <Chip label="👨‍🍳 Default KOT" size="small" color="secondary" sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700, fontSize: '10px', height: 22 }} />}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      {printer.type === 'lan' || printer.type === 'network' ? (
                        <Button onClick={() => handleTestPrinter(printer)} variant="outlined" size="small" sx={{ flex: 1, fontWeight: 700, fontSize: '0.75rem', py: 0.5 }}>Test Socket</Button>
                      ) : (
                        <Button onClick={() => handleTestPrinter(printer)} variant="outlined" size="small" sx={{ flex: 1, fontWeight: 700, fontSize: '0.75rem', py: 0.5 }}>Test Print</Button>
                      )}
                      <IconButton onClick={() => handleOpenEditPrinter(printer)} size="small" color="primary"><Edit2 size={16} /></IconButton>
                      <IconButton onClick={() => handleDeletePrinter(printer.id)} size="small" color="error"><Trash2 size={16} /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* --- TAB 3: REPORTS & BUSINESS INTELLIGENCE SUITE --- */}
        {activeTab === 3 && <ReportsSuite />}

        {/* --- TAB 4: ITEM-WISE SALES REPORT --- */}
        {activeTab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Item-Wise Sales Analytics
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Detailed performance, dish-level quantity, net sales, and pricing trends.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileSpreadsheet size={15} />}
                  onClick={async () => {
                    try {
                      const { from, to } = resolveDateRange(itemReportPreset, itemReportDateFrom, itemReportDateTo);
                      await downloadFile(
                        `/api/reports/item-wise/export-excel?preset=${itemReportPreset}&date_from=${from}&date_to=${to}&category_id=${itemReportCategory}&search=${encodeURIComponent(itemReportSearch)}&sort_by=${itemReportSortBy}&sort_order=${itemReportSortOrder}`,
                        `item_sales_report_${getISTDateString()}.xlsx`,
                        {
                          method: 'POST',
                          body: { items: filteredItemSales }
                        }
                      );
                      notify.success('Item Sales Excel report downloaded.', 'Export Complete');
                    } catch (err) {
                      notify.error(err.message || 'Failed to download Excel report.', 'Export Error');
                    }
                  }}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2 },
                    py: { xs: 0.5, sm: 0.8 },
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  Export Excel (.xlsx)
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Download size={14} />}
                  onClick={async () => {
                    try {
                      const { from, to } = resolveDateRange(itemReportPreset, itemReportDateFrom, itemReportDateTo);
                      await downloadFile(
                        `/api/reports/item-wise/export-csv?preset=${itemReportPreset}&date_from=${from}&date_to=${to}&category_id=${itemReportCategory}&search=${encodeURIComponent(itemReportSearch)}&sort_by=${itemReportSortBy}&sort_order=${itemReportSortOrder}`,
                        `item_sales_report_${getISTDateString()}.csv`,
                        {
                          method: 'POST',
                          body: { items: filteredItemSales }
                        }
                      );
                      notify.success('Item Sales CSV report downloaded.', 'Export Complete');
                    } catch (err) {
                      notify.error(err.message || 'Failed to download CSV report.', 'Export Error');
                    }
                  }}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.8 },
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  CSV
                </Button>
              </Box>
            </Box>

            {/* Filter & Toolbar Row */}
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', width: '100%' }}>
              <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
                {/* Reusable Date Range Picker */}
                <Grid size={{ xs: 12 }}>
                  <DateRangePicker
                    preset={itemReportPreset}
                    onPresetChange={setItemReportPreset}
                    dateFrom={itemReportDateFrom}
                    onDateFromChange={setItemReportDateFrom}
                    dateTo={itemReportDateTo}
                    onDateToChange={setItemReportDateTo}
                  />
                </Grid>

                {/* Search Input */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search dish or SKU..."
                    value={itemReportSearch}
                    onChange={e => setItemReportSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} style={{ color: '#64748b' }} />
                          </InputAdornment>
                        ),
                        endAdornment: itemReportSearch ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setItemReportSearch('')}>
                              <X size={16} />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }
                    }}
                  />
                </Grid>

                {/* Category Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={itemReportCategory}
                      label="Category"
                      onChange={e => setItemReportCategory(e.target.value)}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      {categories.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Sort By Dropdown */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={`${itemReportSortBy}_${itemReportSortOrder}`}
                      label="Sort By"
                      onChange={e => {
                        const [by, ord] = e.target.value.split('_');
                        setItemReportSortBy(by);
                        setItemReportSortOrder(ord);
                      }}
                    >
                      <MenuItem value="qtySold_DESC">Highest Qty Sold ↓</MenuItem>
                      <MenuItem value="qtySold_ASC">Lowest Qty Sold ↑</MenuItem>
                      <MenuItem value="netSales_DESC">Highest Net Sales ↓</MenuItem>
                      <MenuItem value="netSales_ASC">Lowest Net Sales ↑</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Item Sales Summary Cards (Reflects Filtered Rows) */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Items Sold</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                    {filteredItemSales.reduce((sum, i) => sum + parseInt(i.qty_sold || 0), 0)} pcs
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Gross Sales</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Rs. {filteredItemSales.reduce((sum, i) => sum + parseFloat(i.gross_sales || 0), 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Discounts</Typography>
                  <Typography variant="h6" color="warning.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Rs. {filteredItemSales.reduce((sum, i) => sum + parseFloat(i.discount_given || 0), 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net Revenue</Typography>
                  <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Rs. {filteredItemSales.reduce((sum, i) => sum + parseFloat(i.net_sales || 0), 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Table Filter Stats & Global Reset Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                Showing {filteredItemSales.length} {filteredItemSales.length === 1 ? 'item' : 'items'}
                {activeColFiltersCount > 0 && ` (filtered from ${itemReportData.length} total)`}
              </Typography>

              {activeColFiltersCount > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<RotateCcw size={13} />}
                  onClick={handleClearAllColumnFilters}
                  sx={{ fontWeight: 800, fontSize: '0.75rem', py: 0.35, px: 1.5, borderRadius: 2, textTransform: 'none' }}
                >
                  Clear All Column Filters ({activeColFiltersCount})
                </Button>
              )}
            </Box>

            {/* Main Data Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    {(() => {
                      const renderColHeader = (colKey, label, align = 'left', filterable = true) => {
                        const active = filterable && isColFilterActive(colKey);
                        return (
                          <TableCell
                            key={colKey}
                            align={align}
                            sx={{
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              userSelect: 'none',
                              bgcolor: active ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                            }}
                          >
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
                                gap: 0.5,
                                width: '100%'
                              }}
                            >
                              <span>{label}</span>
                              {filterable && (
                                <Tooltip title={active ? `Filter Active on ${label} (Click to edit)` : `Filter by ${label}`}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeFilterCol === colKey && Boolean(colFilterAnchorEl)) {
                                        setColFilterAnchorEl(null);
                                        setActiveFilterCol(null);
                                      } else {
                                        setColFilterAnchorEl(e.currentTarget);
                                        setActiveFilterCol(colKey);
                                      }
                                    }}
                                    sx={{
                                      p: 0.35,
                                      color: active ? 'primary.main' : 'text.disabled',
                                      bgcolor: active ? 'rgba(25, 118, 210, 0.15)' : 'transparent',
                                      '&:hover': {
                                        color: 'primary.main',
                                        bgcolor: active ? 'rgba(25, 118, 210, 0.25)' : 'action.hover'
                                      },
                                      borderRadius: 1
                                    }}
                                  >
                                    <Filter
                                      size={13}
                                      style={{
                                        fill: active ? 'currentColor' : 'none',
                                        strokeWidth: active ? 2.5 : 2
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        );
                      };

                      return [
                        renderColHeader('name', 'Item Name', 'left', true),
                        renderColHeader('category', 'Category', 'left', true),
                        renderColHeader('sku', 'SKU', 'left', true),
                        renderColHeader('qty_sold', 'Qty Sold', 'right', true),
                        renderColHeader('gross_sales', 'Gross Sales', 'right', true),
                        renderColHeader('discount_given', 'Discount', 'right', true),
                        renderColHeader('gst_collected', 'GST', 'right', true),
                        renderColHeader('net_sales', 'Net Sales', 'right', true),
                        renderColHeader('avg_selling_price', 'Avg Selling Price', 'right', true),
                        renderColHeader('last_sold_at', 'Last Sold', 'left', true),
                        renderColHeader('history', 'History', 'center', false)
                      ];
                    })()}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={30} />
                      </TableCell>
                    </TableRow>
                  ) : filteredItemSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {itemReportData.length > 0
                              ? 'No items match the active column filters.'
                              : 'No item sales data found for the selected filters.'}
                          </Typography>
                          {activeColFiltersCount > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              startIcon={<RotateCcw size={14} />}
                              onClick={handleClearAllColumnFilters}
                              sx={{ textTransform: 'none', fontWeight: 700, mt: 0.5 }}
                            >
                              Reset Column Filters
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItemSales.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Button
                            variant="text"
                            color="primary"
                            onClick={() => handleOpenItemHistory(row)}
                            sx={{ textTransform: 'none', p: 0, fontWeight: 800, minWidth: 'auto', textAlign: 'left' }}
                          >
                            {row.name}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.category_name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.sku || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>{row.qty_sold}</TableCell>
                        <TableCell align="right">Rs. {parseFloat(row.gross_sales || 0).toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main' }}>Rs. {parseFloat(row.discount_given || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">Rs. {parseFloat(row.gst_collected || 0).toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'secondary.main' }}>Rs. {parseFloat(row.net_sales || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">Rs. {parseFloat(row.avg_selling_price || 0).toFixed(2)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {row.last_sold_at ? new Date(row.last_sold_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="primary" onClick={() => handleOpenItemHistory(row)} title="View Sales History">
                            <FileText size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Lightweight Popover for Column-Wise Filtering */}
            <Popover
              open={Boolean(colFilterAnchorEl && activeFilterCol)}
              anchorEl={colFilterAnchorEl}
              onClose={() => {
                setColFilterAnchorEl(null);
                setActiveFilterCol(null);
              }}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: ['qty_sold', 'gross_sales', 'discount_given', 'gst_collected', 'net_sales', 'avg_selling_price'].includes(activeFilterCol) ? 'right' : 'left'
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: ['qty_sold', 'gross_sales', 'discount_given', 'gst_collected', 'net_sales', 'avg_selling_price'].includes(activeFilterCol) ? 'right' : 'left'
              }}
              slotProps={{
                paper: {
                  sx: {
                    p: 2,
                    width: activeFilterCol === 'category' ? 320 : 280,
                    maxWidth: '92vw',
                    borderRadius: 2.5,
                    boxShadow: 8,
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                  }
                }
              }}
            >
              {/* Popover Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Filter size={15} color="#1976d2" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {activeFilterCol === 'name' && 'Filter Item Name'}
                    {activeFilterCol === 'category' && 'Filter Category'}
                    {activeFilterCol === 'sku' && 'Filter SKU'}
                    {activeFilterCol === 'qty_sold' && 'Filter Qty Sold'}
                    {activeFilterCol === 'gross_sales' && 'Filter Gross Sales'}
                    {activeFilterCol === 'discount_given' && 'Filter Discount'}
                    {activeFilterCol === 'gst_collected' && 'Filter GST'}
                    {activeFilterCol === 'net_sales' && 'Filter Net Sales'}
                    {activeFilterCol === 'avg_selling_price' && 'Filter Avg Price'}
                    {activeFilterCol === 'last_sold_at' && 'Filter Last Sold'}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => { setColFilterAnchorEl(null); setActiveFilterCol(null); }}>
                  <X size={16} />
                </IconButton>
              </Box>

              <Divider />

              {/* Text Filter: Name & SKU */}
              {(activeFilterCol === 'name' || activeFilterCol === 'sku') && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={itemReportColFilters[activeFilterCol]?.mode || 'contains'}
                      label="Condition"
                      onChange={(e) => {
                        const mode = e.target.value;
                        setItemReportColFilters(prev => ({
                          ...prev,
                          [activeFilterCol]: { ...prev[activeFilterCol], mode }
                        }));
                      }}
                    >
                      <MenuItem value="contains">Contains</MenuItem>
                      <MenuItem value="starts_with">Starts with</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    autoFocus
                    placeholder={activeFilterCol === 'name' ? 'Filter item name...' : 'Filter SKU...'}
                    value={itemReportColFilters[activeFilterCol]?.value || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItemReportColFilters(prev => ({
                        ...prev,
                        [activeFilterCol]: { ...prev[activeFilterCol], value: val }
                      }));
                    }}
                  />
                </Box>
              )}

              {/* Category Multi-Select Filter */}
              {activeFilterCol === 'category' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {itemReportColFilters.category?.length || 0} of {itemReportCategoryOptions.length} selected
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        sx={{ fontSize: '0.7rem', py: 0.2, minWidth: 'auto', px: 0.8 }}
                        onClick={() => {
                          setItemReportColFilters(prev => ({
                            ...prev,
                            category: [...itemReportCategoryOptions]
                          }));
                        }}
                      >
                        All
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        sx={{ fontSize: '0.7rem', py: 0.2, minWidth: 'auto', px: 0.8 }}
                        onClick={() => {
                          setItemReportColFilters(prev => ({
                            ...prev,
                            category: []
                          }));
                        }}
                      >
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5, border: 1, borderColor: 'divider', borderRadius: 1.5, p: 0.5 }}>
                    {itemReportCategoryOptions.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ p: 1, textAlign: 'center' }}>No categories available</Typography>
                    ) : (
                      itemReportCategoryOptions.map((catName) => {
                        const isChecked = itemReportColFilters.category?.includes(catName);
                        return (
                          <Box
                            key={catName}
                            onClick={() => {
                              setItemReportColFilters(prev => {
                                const current = prev.category || [];
                                const next = current.includes(catName)
                                  ? current.filter(c => c !== catName)
                                  : [...current, catName];
                                return { ...prev, category: next };
                              });
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 0.5,
                              borderRadius: 1,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' },
                              bgcolor: isChecked ? 'action.selected' : 'transparent'
                            }}
                          >
                            <Checkbox size="small" checked={isChecked} sx={{ p: 0.25 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.825rem', fontWeight: isChecked ? 700 : 500 }}>
                              {catName}
                            </Typography>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>
              )}

              {/* Numeric Range Filter */}
              {['qty_sold', 'gross_sales', 'discount_given', 'gst_collected', 'net_sales', 'avg_selling_price'].includes(activeFilterCol) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {activeFilterCol === 'discount_given' && (
                    <Button
                      size="small"
                      variant={itemReportColFilters.discount_given?.min === '0.01' && !itemReportColFilters.discount_given?.max ? 'contained' : 'outlined'}
                      color="warning"
                      onClick={() => {
                        if (itemReportColFilters.discount_given?.min === '0.01' && !itemReportColFilters.discount_given?.max) {
                          setItemReportColFilters(prev => ({
                            ...prev,
                            discount_given: { min: '', max: '' }
                          }));
                        } else {
                          setItemReportColFilters(prev => ({
                            ...prev,
                            discount_given: { min: '0.01', max: '' }
                          }));
                        }
                      }}
                      sx={{ fontSize: '0.75rem', py: 0.3, textTransform: 'none', fontWeight: 700 }}
                    >
                      Quick: Discount &gt; 0
                    </Button>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Min"
                      placeholder="0"
                      value={itemReportColFilters[activeFilterCol]?.min ?? ''}
                      onChange={(e) => {
                        const min = e.target.value;
                        setItemReportColFilters(prev => ({
                          ...prev,
                          [activeFilterCol]: { ...prev[activeFilterCol], min }
                        }));
                      }}
                      slotProps={{ htmlInput: { step: 'any' } }}
                    />
                    <Typography variant="caption" color="text.secondary">to</Typography>
                    <TextField
                      size="small"
                      type="number"
                      label="Max"
                      placeholder="Max"
                      value={itemReportColFilters[activeFilterCol]?.max ?? ''}
                      onChange={(e) => {
                        const max = e.target.value;
                        setItemReportColFilters(prev => ({
                          ...prev,
                          [activeFilterCol]: { ...prev[activeFilterCol], max }
                        }));
                      }}
                      slotProps={{ htmlInput: { step: 'any' } }}
                    />
                  </Box>
                </Box>
              )}

              {/* Date Range Filter: Last Sold */}
              {activeFilterCol === 'last_sold_at' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    size="small"
                    type="date"
                    label="From Date"
                    value={itemReportColFilters.last_sold_at?.from || ''}
                    onChange={(e) => {
                      const from = e.target.value;
                      setItemReportColFilters(prev => ({
                        ...prev,
                        last_sold_at: { ...prev.last_sold_at, from }
                      }));
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="To Date"
                    value={itemReportColFilters.last_sold_at?.to || ''}
                    onChange={(e) => {
                      const to = e.target.value;
                      setItemReportColFilters(prev => ({
                        ...prev,
                        last_sold_at: { ...prev.last_sold_at, to }
                      }));
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                </Box>
              )}

              <Divider />

              {/* Popover Footer */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleClearColumnFilter(activeFilterCol)}
                  disabled={!isColFilterActive(activeFilterCol)}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                >
                  Clear
                </Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {activeColFiltersCount > 1 && (
                    <Button
                      size="small"
                      color="warning"
                      onClick={handleClearAllColumnFilters}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setColFilterAnchorEl(null);
                      setActiveFilterCol(null);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                  >
                    Done
                  </Button>
                </Box>
              </Box>
            </Popover>
          </Box>
        )}

        {/* --- TAB 5: INVENTORY & WAREHOUSE MANAGEMENT SUITE --- */}
        {activeTab === 5 && (
          <InventorySuite
            onOpenStickersModal={handleOpenStickersModal}
            categories={categories}
            menuItems={menuItems}
            currentUser={user}
            activeSubTab={inventorySubTab}
            onSubTabChange={setInventorySubTab}
            hideTabs={true}
          />
        )}

        {/* --- TAB 6: GST MANAGEMENT & COMPLIANCE SUITE --- */}
        {activeTab === 6 && (
          <GstDashboard
            activeTab={gstSubTab}
            onTabChange={setGstSubTab}
            hideTabs={true}
          />
        )}

        {/* --- TAB 7: RECEIPT & KOT CUSTOMIZATION --- */}
        {activeTab === 7 && (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 3 } }}>
            {/* Header Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Receipt & GST Settings
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Fully dynamic, database-driven templates. Changes immediately apply to thermal prints and POS previews.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleTestPrint('BOTH')}
                  disabled={testingPrint}
                  startIcon={<Printer size={14} />}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Test Thermal Print</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Test</Box>
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveReceiptSettings}
                  disabled={savingReceiptSettings}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 3 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  {savingReceiptSettings ? <CircularProgress size={18} color="inherit" /> : 'Save Settings'}
                </Button>
              </Box>
            </Box>

            {/* Main Split Grid: [ Form Controls 60% | Real-time Thermal Paper Preview 40% ] */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 7, xl: 8 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Card 1: Business Branding & Contact Details */}
                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🏪 Retail Branding & Licensing
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Retail Display Name"
                          size="small"
                          fullWidth
                          value={receiptSettings.restaurant_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, restaurant_name: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Branch Name / Outlet"
                          size="small"
                          fullWidth
                          value={receiptSettings.branch_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, branch_name: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
                        <TextField
                          label="Address"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={receiptSettings.address || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, address: e.target.value })}
                          sx={{ width: '100%', boxSizing: 'border-box', '& .MuiInputBase-root': { width: '100%', boxSizing: 'border-box' }, '& textarea': { width: '100%', boxSizing: 'border-box' } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Phone Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.phone || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, phone: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="WhatsApp Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.whatsapp || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, whatsapp: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Email Address"
                          size="small"
                          fullWidth
                          value={receiptSettings.email || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, email: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Website URL"
                          size="small"
                          fullWidth
                          value={receiptSettings.website || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, website: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="GSTIN Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.gst_number || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, gst_number: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="FSSAI License Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.fssai_number || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, fssai_number: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ImageIcon size={18} /> Retail Logo (Upload)
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            {receiptSettings.logo_url ? (
                              <Box
                                component="img"
                                src={resolveImageUrl(receiptSettings.logo_url)}
                                alt="Retail Logo"
                                sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'text.disabled' }}>
                                <Typography variant="caption" color="text.secondary">No Logo</Typography>
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                              <Button
                                variant="contained"
                                component="label"
                                size="small"
                                disabled={uploadingLogo}
                                startIcon={uploadingLogo ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
                                sx={{ fontWeight: 800, textTransform: 'none' }}
                              >
                                {uploadingLogo ? 'Uploading Logo...' : 'Upload Logo (JPG, PNG, WEBP)'}
                                <input
                                  type="file"
                                  hidden
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={handleLogoFileUpload}
                                />
                              </Button>

                              {receiptSettings.logo_url && (
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={handleRemoveLogo}
                                  sx={{ fontWeight: 800, textTransform: 'none' }}
                                >
                                  Remove Logo
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 2: Header & Footer Text Messages */}
                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      💬 Custom Messages & Notes
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Header Welcome Message"
                          size="small"
                          fullWidth
                          value={receiptSettings.header_message || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, header_message: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Thank You Message"
                          size="small"
                          fullWidth
                          value={receiptSettings.thank_you_message || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, thank_you_message: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Footer Message / Social Handle"
                          size="small"
                          fullWidth
                          value={receiptSettings.footer_message || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, footer_message: e.target.value })}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Terms & Conditions"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={receiptSettings.terms_conditions || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, terms_conditions: e.target.value })}
                          sx={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 3: Thermal Print Formatting Controls */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Printer size={18} /> Paper Layout & Thermal Printer Settings
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          onClick={() => handleTestPrint('receipt')}
                          disabled={testingPrint}
                          sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none' }}
                        >
                          {testingPrint ? <CircularProgress size={14} color="inherit" /> : '🖨️ Test Receipt Print'}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          onClick={() => handleTestPrint('kot')}
                          disabled={testingPrint}
                          sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none' }}
                        >
                          {testingPrint ? <CircularProgress size={14} color="inherit" /> : '👨‍🍳 Test KOT Print'}
                        </Button>
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Paper Width</InputLabel>
                          <Select
                            value={receiptSettings.paper_size || '80mm'}
                            label="Paper Width"
                            onChange={e => setReceiptSettings({ ...receiptSettings, paper_size: e.target.value })}
                          >
                            <MenuItem value="80mm">3-inch / 80mm (Standard)</MenuItem>
                            <MenuItem value="58mm">2-inch / 58mm (Compact)</MenuItem>
                            <MenuItem value="76mm">76mm (Dot Matrix / Wide)</MenuItem>
                            <MenuItem value="auto">Auto-Detect (Adaptive)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Print Engine Mode</InputLabel>
                          <Select
                            value={receiptSettings.print_engine || 'auto'}
                            label="Print Engine Mode"
                            onChange={e => setReceiptSettings({ ...receiptSettings, print_engine: e.target.value })}
                          >
                            <MenuItem value="auto">Auto (RAW + Driver HTML Failover)</MenuItem>
                            <MenuItem value="driver_html">Windows Driver Spooler (Silent HTML - 100% Universal)</MenuItem>
                            <MenuItem value="raw_escpos">Direct RAW Stream (ESC/POS Passthrough)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Font Scale</InputLabel>
                          <Select
                            value={receiptSettings.font_size || 'normal'}
                            label="Font Scale"
                            onChange={e => setReceiptSettings({ ...receiptSettings, font_size: e.target.value })}
                          >
                            <MenuItem value="small">Small (Dense)</MenuItem>
                            <MenuItem value="normal">Normal (Standard)</MenuItem>
                            <MenuItem value="large">Large (High-Visibility)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Header Alignment</InputLabel>
                          <Select
                            value={receiptSettings.header_alignment || 'center'}
                            label="Header Alignment"
                            onChange={e => setReceiptSettings({ ...receiptSettings, header_alignment: e.target.value })}
                          >
                            <MenuItem value="left">Left Aligned</MenuItem>
                            <MenuItem value="center">Centered</MenuItem>
                            <MenuItem value="right">Right Aligned</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Default Receipt Printer Selector */}
                      <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Target Thermal Receipt Printer</InputLabel>
                          <Select
                            value={receiptSettings.default_printer_name || ''}
                            label="Target Thermal Receipt Printer"
                            onChange={e => {
                              const val = e.target.value;
                              setReceiptSettings({ ...receiptSettings, default_printer_name: val });
                              if (val) {
                                const matched = systemPrinters.find(p => p.name === val) || printers.find(p => p.name === val);
                                const label = matched ? matched.name : val;
                                notify.success(`Connection Successful — ${label} is ready for printing.`, '🖨️ Printer Connected');
                              }
                            }}
                          >
                            <MenuItem value="">
                              <em>(Auto-Select Highest Scoring Connected Thermal Printer)</em>
                            </MenuItem>
                            {systemPrinters.map(p => (
                              <MenuItem key={p.name} value={p.name}>
                                🖨️ {p.name} {p.paperWidth ? `(${p.paperWidth}mm)` : ''} {p.isDefault ? '⭐ [Windows Default]' : ''} {p.isOnline ? '🟢 Online' : '⚪ Offline'}
                              </MenuItem>
                            ))}
                            {printers.map(p => (
                              <MenuItem key={`db_${p.id}`} value={p.name}>
                                📦 {p.name} ({p.paper_width || 80}mm - {p.type?.toUpperCase()})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 4: Toggle Display Elements */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🎛️ Receipt Display Feature Toggles
                    </Typography>

                    <Grid container spacing={1}>
                      {[
                        { key: 'show_logo', label: 'Show Retail Logo' },
                        { key: 'show_qr_code', label: 'Show QR Code' },
                        { key: 'show_customer_details', label: 'Show Customer Details' },
                        { key: 'show_cashier_name', label: 'Show Cashier Name' },
                        { key: 'show_tax_details', label: 'Show GST / Tax Breakup' },
                        { key: 'show_payment_details', label: 'Show Payment Mode' },
                        { key: 'show_footer_notes', label: 'Show Terms & Footer Notes' }
                      ].map(t => (
                        <Grid size={{ xs: 12, sm: 6 }} key={t.key}>
                          <Box
                            onClick={() => setReceiptSettings({ ...receiptSettings, [t.key]: receiptSettings[t.key] ? 0 : 1 })}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: receiptSettings[t.key] ? 'primary.main' : 'divider',
                              bgcolor: receiptSettings[t.key] ? 'rgba(249, 115, 22, 0.05)' : 'background.paper',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.label}</Typography>
                            {receiptSettings[t.key] ? <CheckCircle size={18} color="#f97316" /> : <XCircle size={18} color="#94a3b8" />}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {/* QR / Barcode Image Upload Section */}
                    <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <QrCode size={18} /> Upload QR / Barcode Image
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Upload any UPI payment QR, Instagram QR, or custom barcode image (JPG, PNG, WEBP) to display on printed receipts and previews when "Show QR Code" is enabled.
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {receiptSettings.qr_code_url ? (
                          <Box
                            component="img"
                            src={resolveImageUrl(receiptSettings.qr_code_url)}
                            alt="QR Code Preview"
                            sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'contain', border: '1px solid', borderColor: 'divider', bgcolor: '#fff', p: 0.5 }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'text.disabled' }}>
                            <Typography variant="caption" color="text.secondary">No QR</Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            component="label"
                            size="small"
                            disabled={uploadingQrCode}
                            startIcon={uploadingQrCode ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
                            sx={{ fontWeight: 800, textTransform: 'none' }}
                          >
                            {uploadingQrCode ? 'Uploading QR...' : 'Upload QR/Barcode (JPG, PNG, WEBP)'}
                            <input
                              type="file"
                              hidden
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleQrCodeFileUpload}
                            />
                          </Button>

                          {receiptSettings.qr_code_url && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={handleRemoveQrCode}
                              sx={{ fontWeight: 800, textTransform: 'none' }}
                            >
                              Remove QR
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>

                  {/* Card 5: KOT Template Customization */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2, borderColor: 'secondary.main', borderWidth: 1.5 }}>
                    <Typography variant="subtitle1" color="secondary.main" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      👨‍🍳 Kitchen Order Ticket (KOT) Template
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="KOT Header Title"
                          size="small"
                          fullWidth
                          value={receiptSettings.kot_header || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, kot_header: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Kitchen / Station Name"
                          size="small"
                          fullWidth
                          value={receiptSettings.kitchen_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, kitchen_name: e.target.value })}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="KOT Footer Instruction"
                          size="small"
                          fullWidth
                          value={receiptSettings.kot_footer_note || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, kot_footer_note: e.target.value })}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          onClick={() => setReceiptSettings({ ...receiptSettings, show_kot_order_notes: receiptSettings.show_kot_order_notes ? 0 : 1 })}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: receiptSettings.show_kot_order_notes ? 'secondary.main' : 'divider',
                            bgcolor: receiptSettings.show_kot_order_notes ? 'rgba(16, 185, 129, 0.05)' : 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Show Item / Order Notes</Typography>
                          {receiptSettings.show_kot_order_notes ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#94a3b8" />}
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          onClick={() => setReceiptSettings({ ...receiptSettings, show_kot_time: receiptSettings.show_kot_time ? 0 : 1 })}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: receiptSettings.show_kot_time ? 'secondary.main' : 'divider',
                            bgcolor: receiptSettings.show_kot_time ? 'rgba(16, 185, 129, 0.05)' : 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Show Order Timestamp</Typography>
                          {receiptSettings.show_kot_time ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#94a3b8" />}
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 6: GST Configuration */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        💸 GST Settings (Taxation System)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Number(receiptSettings.gst_enabled !== undefined ? receiptSettings.gst_enabled : 1) === 1}
                              onChange={e => setReceiptSettings({ ...receiptSettings, gst_enabled: e.target.checked ? 1 : 0 })}
                              color="primary"
                            />
                          }
                          label={
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {Number(receiptSettings.gst_enabled !== undefined ? receiptSettings.gst_enabled : 1) === 1 ? 'GST Billing Enabled' : 'GST Billing Disabled'}
                            </Typography>
                          }
                        />
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          disabled={savingGstSettings}
                          onClick={handleSaveGstSettings}
                          startIcon={savingGstSettings ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                          sx={{ fontWeight: 800, px: 2 }}
                        >
                          {savingGstSettings ? 'Saving...' : 'Save GST Settings'}
                        </Button>
                      </Box>
                    </Box>

                    {Number(receiptSettings.gst_enabled !== undefined ? receiptSettings.gst_enabled : 1) === 1 ? (
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label="GSTIN Number"
                            size="small"
                            fullWidth
                            value={receiptSettings.gst_number || ''}
                            onChange={e => setReceiptSettings({ ...receiptSettings, gst_number: e.target.value })}
                            placeholder="22AAAAA0000A1Z5"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>GST Mode</InputLabel>
                            <Select
                              value={receiptSettings.gst_mode || 'excluded'}
                              label="GST Mode"
                              onChange={e => setReceiptSettings({ ...receiptSettings, gst_mode: e.target.value })}
                            >
                              <MenuItem value="included">GST Included (Product price includes GST)</MenuItem>
                              <MenuItem value="excluded">GST Excluded (GST is added during checkout)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label="Default GST Rate (%)"
                            type="number"
                            size="small"
                            fullWidth
                            value={receiptSettings.default_gst_rate !== undefined ? receiptSettings.default_gst_rate : 5}
                            onChange={e => setReceiptSettings({ ...receiptSettings, default_gst_rate: parseFloat(e.target.value || 0) })}
                          />
                        </Grid>
                      </Grid>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        ℹ️ <strong>GST Billing System is Disabled</strong>. Taxes will not be calculated or displayed on bills, receipts, or reports. Billing will operate as a normal non-GST retail outlet.
                      </Alert>
                    )}
                  </Paper>

                  {/* Card 7: POS Printing Stages Workflow */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        ⚙️ Print Stage Workflows
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={handleSaveWorkflowSettings}
                        disabled={savingWorkflow}
                        sx={{ fontWeight: 800, px: 2 }}
                      >
                        {savingWorkflow ? 'Saving...' : 'Save Workflow Settings'}
                      </Button>
                    </Box>
                    <Grid container spacing={2}>
                      {/* Stage 1 Dropdown */}
                      <Grid size={{ xs: 12, sm: workflowDraft.print_stage1_mode === 'show_popup' ? 12 : 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Stage 1 (Confirm/Hold Order)</InputLabel>
                          <Select
                            value={workflowDraft.print_stage1_mode}
                            label="Stage 1 (Confirm/Hold Order)"
                            onChange={e => setWorkflowDraft(prev => ({ ...prev, print_stage1_mode: e.target.value }))}
                          >
                            <MenuItem value="save_only">Save Only</MenuItem>
                            <MenuItem value="print_receipt_only">Print Receipt Only</MenuItem>
                            <MenuItem value="print_kot_only">Print KOT Only</MenuItem>
                            <MenuItem value="print_kot_receipt">Print Receipt + KOT</MenuItem>
                            <MenuItem value="show_popup">Show Action Popup</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Stage 1 popup button visibility toggles */}
                      {workflowDraft.print_stage1_mode === 'show_popup' && (
                        <Grid size={12}>
                          <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                              Stage 1 Popup — Configure visible buttons:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                              {[
                                { key: 'stage1_popup_save_only',    label: 'Save Only' },
                                { key: 'stage1_popup_receipt_only', label: 'Print Receipt Only' },
                                { key: 'stage1_popup_kot_only',     label: 'Print KOT Only' },
                                { key: 'stage1_popup_kot_receipt',  label: 'Print Receipt + KOT' }
                              ].map(opt => (
                                <FormControlLabel
                                  key={opt.key}
                                  control={
                                    <Switch
                                      size="small"
                                      checked={Number(workflowDraft[opt.key]) === 1}
                                      onChange={e => setWorkflowDraft(prev => ({ ...prev, [opt.key]: e.target.checked ? 1 : 0 }))}
                                      color="primary"
                                    />
                                  }
                                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{opt.label}</Typography>}
                                />
                              ))}
                            </Box>
                          </Box>
                        </Grid>
                      )}

                      {/* Stage 2 Dropdown */}
                      <Grid size={{ xs: 12, sm: workflowDraft.print_stage2_mode === 'show_popup' ? 12 : 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Stage 2 (Complete Checkout/Pay)</InputLabel>
                          <Select
                            value={workflowDraft.print_stage2_mode}
                            label="Stage 2 (Complete Checkout/Pay)"
                            onChange={e => setWorkflowDraft(prev => ({ ...prev, print_stage2_mode: e.target.value }))}
                          >
                            <MenuItem value="save_only">Save Only</MenuItem>
                            <MenuItem value="print_receipt_only">Print Receipt Only</MenuItem>
                            <MenuItem value="print_kot_only">Print KOT Only</MenuItem>
                            <MenuItem value="print_kot_receipt">Print Receipt + KOT</MenuItem>
                            <MenuItem value="show_popup">Show Action Popup</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Stage 2 popup button visibility toggles */}
                      {workflowDraft.print_stage2_mode === 'show_popup' && (
                        <Grid size={12}>
                          <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                              Stage 2 Popup — Configure visible buttons:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                              {[
                                { key: 'stage2_popup_save_only',    label: 'Save Only' },
                                { key: 'stage2_popup_receipt_only', label: 'Print Receipt Only' },
                                { key: 'stage2_popup_kot_only',     label: 'Print KOT Only' },
                                { key: 'stage2_popup_kot_receipt',  label: 'Print Receipt + KOT' }
                              ].map(opt => (
                                <FormControlLabel
                                  key={opt.key}
                                  control={
                                    <Switch
                                      size="small"
                                      checked={Number(workflowDraft[opt.key]) === 1}
                                      onChange={e => setWorkflowDraft(prev => ({ ...prev, [opt.key]: e.target.checked ? 1 : 0 }))}
                                      color="primary"
                                    />
                                  }
                                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{opt.label}</Typography>}
                                />
                              ))}
                            </Box>
                          </Box>
                        </Grid>
                      )}

                      {/* Enable Stage 2 toggle */}
                      <Grid size={12} sx={{ mt: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Number(workflowDraft.enable_stage2_popup) === 1}
                              onChange={e => setWorkflowDraft(prev => ({ ...prev, enable_stage2_popup: e.target.checked ? 1 : 0 }))}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>Enable Stage 2 (Payment Method Popup)</Typography>
                              <Typography variant="caption" color="text.secondary">
                                If ON, cashiers must choose a payment method to close checkout. If OFF, orders are completed immediately using Stage 1 action.
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 8: Cashier Reports & WhatsApp Receipts */}
                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        📲 Cashier Permissions & Customer WhatsApp Share
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={handleSavePermissionsSettings}
                        disabled={savingPermissions}
                        sx={{ fontWeight: 800, px: 2, py: 0.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        {savingPermissions ? <CircularProgress size={16} color="inherit" /> : 'Save Settings'}
                      </Button>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={permissionsDraft.allow_cashier_view_all_reports === 1}
                              onChange={e => setPermissionsDraft({ ...permissionsDraft, allow_cashier_view_all_reports: e.target.checked ? 1 : 0 })}
                              color="primary"
                            />
                          }
                          label="Allow Cashiers to View Total Sales Reports"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={permissionsDraft.enable_whatsapp_receipt === 1}
                              onChange={e => setPermissionsDraft({ ...permissionsDraft, enable_whatsapp_receipt: e.target.checked ? 1 : 0 })}
                              color="primary"
                            />
                          }
                          label="Enable Customer WhatsApp Receipt Share"
                        />
                      </Grid>
                      {permissionsDraft.enable_whatsapp_receipt === 1 && (
                        <Grid size={12}>
                          <TextField
                            label="WhatsApp Business Phone"
                            size="small"
                            fullWidth
                            value={permissionsDraft.whatsapp_business_phone || ''}
                            onChange={e => setPermissionsDraft({ ...permissionsDraft, whatsapp_business_phone: e.target.value })}
                            placeholder="e.g. 919876543210"
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Paper>

                  {/* Card 9: POS Keyboard & Fast Entry Settings */}
                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        ⌨️ POS Keyboard & Barcode Workflow
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={handleSaveReceiptSettings}
                        disabled={savingReceiptSettings}
                        sx={{ fontWeight: 800, px: 2, py: 0.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        {savingReceiptSettings ? <CircularProgress size={16} color="inherit" /> : 'Save Settings'}
                      </Button>
                    </Box>

                    {/* Enter Key Setting */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: 1,
                        borderColor: (receiptSettings.enter_key_qty_popup !== undefined ? Number(receiptSettings.enter_key_qty_popup) : 1) === 1 ? 'primary.main' : 'divider',
                        bgcolor: (receiptSettings.enter_key_qty_popup !== undefined ? Number(receiptSettings.enter_key_qty_popup) : 1) === 1 ? 'rgba(249, 115, 22, 0.05)' : 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: '240px' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          Enter Key – Quantity Popup & Cart
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                          When ON, pressing Enter on search/scanned items opens the quantity popup, and pressing Enter again saves quantity & adds/updates the item in Sale Cart. Esc key is reserved to Clear All Items from Cart.
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={(receiptSettings.enter_key_qty_popup !== undefined ? Number(receiptSettings.enter_key_qty_popup) : 1) === 1}
                            onChange={e => setReceiptSettings({ ...receiptSettings, enter_key_qty_popup: e.target.checked ? 1 : 0 })}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {(receiptSettings.enter_key_qty_popup !== undefined ? Number(receiptSettings.enter_key_qty_popup) : 1) === 1 ? 'ON (Default)' : 'OFF'}
                          </Typography>
                        }
                      />
                    </Box>

                    {/* Sale Cart Position (Left / Right) Toggle */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: '240px' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          Sale Cart Panel Position (POS Screen Layout)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                          Choose whether the Sale Cart panel appears on the left or right side of the POS screen. When set to "Left", the Sale Cart moves to the left and the product catalog & sidebar shift to the right.
                        </Typography>
                      </Box>
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Cart Position</InputLabel>
                        <Select
                          value={receiptSettings.cart_position || (localStorage.getItem('ARISO_POS_CART_POSITION') || 'right')}
                          label="Cart Position"
                          onChange={e => {
                            const val = e.target.value;
                            setReceiptSettings(prev => ({ ...prev, cart_position: val }));
                            try {
                              localStorage.setItem('ARISO_POS_CART_POSITION', val);
                              window.dispatchEvent(new CustomEvent('cart_position_changed', { detail: { cart_position: val } }));
                            } catch (err) {}
                          }}
                        >
                          <MenuItem value="right">Right Side (Standard)</MenuItem>
                          <MenuItem value="left">Left Side</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>

                </Box>
              </Grid>

              {/* Live Side-by-Side Thermal Paper Preview Column */}
              <Grid size={{ xs: 12, lg: 5, xl: 4 }}>
                <Box
                  sx={{
                    position: 'sticky',
                    top: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  {/* Mode Selector Header */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 0.5,
                      borderRadius: 3,
                      display: 'flex',
                      width: '100%',
                      maxWidth: '340px'
                    }}
                  >
                    <Button
                      fullWidth
                      variant={receiptPreviewMode === 'receipt' ? 'contained' : 'text'}
                      color="primary"
                      size="small"
                      onClick={() => setReceiptPreviewMode('receipt')}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      Receipt Preview 🧾
                    </Button>
                    <Button
                      fullWidth
                      variant={receiptPreviewMode === 'kot' ? 'contained' : 'text'}
                      color="secondary"
                      size="small"
                      onClick={() => setReceiptPreviewMode('kot')}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      KOT Preview 👨‍🍳
                    </Button>
                  </Paper>

                  {/* Simulated Thermal Paper Strip */}
                  <Box
                    sx={{
                      width: receiptSettings.paper_size === '58mm' ? '260px' : (receiptSettings.paper_size === '76mm' ? '300px' : '330px'),
                      bgcolor: '#fffef9',
                      color: '#1e293b',
                      p: 2.5,
                      borderRadius: 1,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: receiptSettings.font_size === 'small' ? '11px' : (receiptSettings.font_size === 'large' ? '14px' : '12px'),
                      lineHeight: 1.4,
                      transition: 'all 0.3s ease',
                      wordBreak: 'break-word'
                    }}
                  >
                    {receiptPreviewMode === 'receipt' ? (
                      /* CUSTOMER RECEIPT PREVIEW */
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Logo */}
                        {Boolean(receiptSettings.show_logo) && receiptSettings.logo_url && (
                          <Box sx={{ textAlign: receiptSettings.header_alignment || 'center', mb: 0.5 }}>
                            <img src={resolveImageUrl(receiptSettings.logo_url)} alt="Logo" style={{ maxHeight: 40, objectFit: 'contain' }} />
                          </Box>
                        )}

                        {/* Header */}
                        <Box sx={{ textAlign: receiptSettings.header_alignment || 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'inherit', fontWeight: 800, textTransform: 'uppercase' }}>
                            {receiptSettings.restaurant_name || 'RETAIL POS'}
                          </Typography>
                          {receiptSettings.branch_name && <div>{receiptSettings.branch_name}</div>}
                          {receiptSettings.address && <div>{receiptSettings.address}</div>}
                          {receiptSettings.phone && <div>Ph: {receiptSettings.phone}</div>}
                          {receiptSettings.whatsapp && <div>WA: {receiptSettings.whatsapp}</div>}
                          {receiptSettings.email && <div>Email: {receiptSettings.email}</div>}
                          {receiptSettings.website && <div>Web: {receiptSettings.website}</div>}
                          {Number(receiptSettings.gst_enabled !== undefined ? receiptSettings.gst_enabled : 1) === 1 && receiptSettings.gst_number && <div>GSTIN: {receiptSettings.gst_number}</div>}
                          {receiptSettings.fssai_number && <div>FSSAI: {receiptSettings.fssai_number}</div>}
                          {receiptSettings.header_message && <div style={{ marginTop: 4, fontStyle: 'italic' }}>* {receiptSettings.header_message} *</div>}
                        </Box>

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {/* Order Info */}
                        <div>Bill No : #ORD-20260728-999</div>
                        {Boolean(receiptSettings.show_cashier_name) && <div>Cashier : Admin Tester</div>}
                        <div>Date    : {formatReceiptDateTime(new Date())}</div>
                        {Boolean(receiptSettings.show_customer_details) && <div>Customer: John Doe (9876543210)</div>}

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {/* Items Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>Item</span>
                          <span>Qty</span>
                          <span>Price</span>
                        </div>
                        <div style={{ borderBottom: '1px dashed #475569' }} />

                        {/* Sample Items */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Paneer Butter Masala</span>
                          <span>1</span>
                          <span>220.00</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>* Extra Gravy</div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Garlic Naan</span>
                          <span>2</span>
                          <span>80.00</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Mango Lassi</span>
                          <span>1</span>
                          <span>50.00</span>
                        </div>

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {/* Totals */}
                        <div style={{ fontSize: '11px', fontWeight: 'bold', margin: '2px 0' }}>
                          Total Items: 3 | Total Qty: 4
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Subtotal:</span>
                          <span>Rs. 350.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Discount:</span>
                          <span>-Rs. 25.00</span>
                        </div>
                        {Number(receiptSettings.gst_enabled !== undefined ? receiptSettings.gst_enabled : 1) === 1 && Boolean(receiptSettings.show_tax_details) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>GST Tax (5%):</span>
                            <span>Rs. 16.25</span>
                          </div>
                        )}

                        <div style={{ borderBottom: '2px solid #000', margin: '4px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1em' }}>
                          <span>TOTAL:</span>
                          <span>Rs. 341.25</span>
                        </div>

                        <div style={{ borderBottom: '2px solid #000', margin: '4px 0' }} />

                        {/* Footer */}
                        <Box sx={{ textAlign: 'center', mt: 1 }}>
                          {Boolean(receiptSettings.thank_you_message?.trim() || (!receiptSettings.thank_you_message && 'Thank You! Visit Again.')) && (
                            <div style={{ fontWeight: 'bold' }}>{receiptSettings.thank_you_message || 'Thank You! Visit Again.'}</div>
                          )}
                          {Boolean(receiptSettings.footer_message?.trim()) && (
                            <div style={{ marginTop: 2, whiteSpace: 'pre-line' }}>{receiptSettings.footer_message.trim()}</div>
                          )}
                          {Boolean((receiptSettings.terms_conditions || receiptSettings.terms_and_conditions)?.trim()) && (
                            <div style={{ fontSize: '9px', marginTop: 4, textAlign: 'left', borderTop: '1px dashed #475569', paddingTop: 2, whiteSpace: 'pre-line' }}>
                              <strong>T&C:</strong> {(receiptSettings.terms_conditions || receiptSettings.terms_and_conditions).trim()}
                            </div>
                          )}
                        </Box>

                        {/* Optional QR / Barcode graphic (only rendered if Show QR Code is ON and an image is uploaded) */}
                        {Boolean(receiptSettings.show_qr_code) && receiptSettings.qr_code_url && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                            <img
                              src={resolveImageUrl(receiptSettings.qr_code_url)}
                              alt="QR Code"
                              style={{ maxHeight: 85, maxWidth: 120, objectFit: 'contain' }}
                            />
                          </Box>
                        )}
                      </Box>
                    ) : (
                      /* KITCHEN ORDER TICKET (KOT) PREVIEW */
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'inherit', fontWeight: 800, textTransform: 'uppercase' }}>
                            {receiptSettings.kot_header || 'KITCHEN ORDER TICKET'}
                          </Typography>
                          {receiptSettings.kitchen_name && <div style={{ fontWeight: 'bold' }}>[ {receiptSettings.kitchen_name.toUpperCase()} ]</div>}
                          <div>Order #ORD-20260728-999 | Table #4</div>
                          {Boolean(receiptSettings.show_kot_time) && <div>Time: {new Date().toLocaleTimeString()}</div>}
                        </Box>

                        <div style={{ borderBottom: '2px solid #000', margin: '4px 0' }} />

                        <div style={{ fontWeight: 'bold' }}>
                          <div>1 x PANEER BUTTER MASALA</div>
                          <div style={{ marginLeft: 12, fontSize: '11px', color: '#15803d' }}>&gt;&gt;&gt; NOTE: EXTRA GRAVY</div>
                          <div style={{ marginTop: 4 }}>2 x GARLIC NAAN</div>
                          <div style={{ marginLeft: 12, fontSize: '11px', color: '#15803d' }}>&gt;&gt;&gt; NOTE: CRISPY</div>
                          <div style={{ marginTop: 4 }}>1 x MANGO LASSI</div>
                        </div>

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        {Boolean(receiptSettings.show_kot_order_notes) && (
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                            ORDER NOTE: CUSTOMER PREFERS MEDIUM SPICE
                          </div>
                        )}

                        <div style={{ borderBottom: '1px dashed #475569', margin: '4px 0' }} />

                        <Box sx={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', mt: 0.5 }}>
                          * {receiptSettings.kot_footer_note || 'Prepare with priority'} *
                          <div style={{ fontSize: '10px', marginTop: 4 }}>[ KOT END ]</div>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Test Print Action Buttons below preview */}
                  <Box sx={{ display: 'flex', gap: 1.5, width: '100%', maxWidth: '340px' }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={testingPrint ? <CircularProgress size={14} color="inherit" /> : <Printer size={15} />}
                      onClick={() => handleTestPrint(receiptPreviewMode)}
                      disabled={testingPrint}
                      sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', py: 0.8 }}
                    >
                      {testingPrint ? 'Sending Print Job...' : `Print Test ${receiptPreviewMode === 'kot' ? 'KOT' : 'Receipt'} 🖨️`}
                    </Button>
                  </Box>

                </Box>
              </Grid>
            </Grid>

          </Box>
        )}

        {/* --- RESTAURANT PROFILE SUB-TAB --- */}
        {activeTab === 8 && (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  🏪 Retail Profile & Branding Management
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Update your Retail Display Name, Logo Image, Address, Contact Info, and License Details.
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<Save size={16} />}
                onClick={handleSaveReceiptSettings}
                disabled={savingReceiptSettings}
                sx={{ fontWeight: 800, textTransform: 'none', px: 3, py: 1 }}
              >
                {savingReceiptSettings ? <CircularProgress size={18} color="inherit" /> : 'Save Retail Profile'}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Card 1: Retail Identity & Logo */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ImageIcon size={20} /> Retail Identity & Logo
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Retail Display Name"
                          size="small"
                          fullWidth
                          value={receiptSettings.restaurant_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, restaurant_name: e.target.value })}
                          required
                          helperText="This name appears on the POS navbar, receipts, and customer bills."
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Branch / Outlet Name"
                          size="small"
                          fullWidth
                          value={receiptSettings.branch_name || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, branch_name: e.target.value })}
                          placeholder="e.g. Main Outlet / Express Branch"
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            🖼️ Retail Logo Image
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                            {profileLogoUrl ? (
                              <Box
                                component="img"
                                src={resolveImageUrl(profileLogoUrl)}
                                alt="Retail Logo"
                                sx={{ width: 80, height: 80, borderRadius: 2.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider', bgcolor: '#fff', p: 0.5 }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ width: 80, height: 80, borderRadius: 2.5, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'text.disabled' }}>
                                <Typography variant="caption" color="text.secondary">No Logo</Typography>
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                              <Button
                                variant="contained"
                                component="label"
                                size="small"
                                disabled={uploadingLogo}
                                startIcon={uploadingLogo ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
                                sx={{ fontWeight: 800, textTransform: 'none' }}
                              >
                                {uploadingLogo ? 'Uploading Logo...' : 'Upload Logo (JPG, PNG, WEBP)'}
                                <input
                                  type="file"
                                  hidden
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={handleProfileLogoUpload}
                                />
                              </Button>

                              {profileLogoUrl && (
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={handleRemoveProfileLogo}
                                  sx={{ fontWeight: 800, textTransform: 'none' }}
                                >
                                  Remove Logo
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Card 2: Contact & Licensing */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      📍 Contact & Licensing Details
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Full Address"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={receiptSettings.address || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, address: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Phone Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.phone || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, phone: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="WhatsApp Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.whatsapp || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, whatsapp: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Email Address"
                          size="small"
                          fullWidth
                          value={receiptSettings.email || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, email: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="GSTIN Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.gst_number || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, gst_number: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="FSSAI License Number"
                          size="small"
                          fullWidth
                          value={receiptSettings.fssai_number || ''}
                          onChange={e => setReceiptSettings({ ...receiptSettings, fssai_number: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              </Grid>

              {/* Side Column: Brand Identity Preview */}
              <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    👀 Live Brand Identity Preview
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This is how your Retail Identity will appear across the POS Navbar Header, Mobile Application, and Digital Receipts.
                  </Typography>

                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    {receiptSettings.logo_url ? (
                      <Box
                        component="img"
                        src={resolveImageUrl(receiptSettings.logo_url)}
                        alt="Logo Preview"
                        sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                        {(receiptSettings.restaurant_name || 'R').charAt(0).toUpperCase()}
                      </Box>
                    )}

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {receiptSettings.restaurant_name || 'Retail POS'}
                      </Typography>
                      {receiptSettings.branch_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {receiptSettings.branch_name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* --- STAFF & CASHIERS SUB-TAB --- */}
        {activeTab === 9 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Manage Staff & Cashiers
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Create terminal login credentials for Cashiers, Managers, and Staff members.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<UserPlus size={14} />}
                onClick={handleOpenAddStaff}
                sx={{
                  fontWeight: 800,
                  px: { xs: 1.25, sm: 2.5 },
                  py: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Add Staff
              </Button>
            </Box>

            {/* Staff Table View - Visible on Mobile, Tablet & Desktop */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto', display: 'block' }}>
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Staff Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Login ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Account Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staffUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No staff users created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffUsers.map(user => (
                      <TableRow key={user.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>{user.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{user.username}</TableCell>
                        <TableCell color="text.secondary">{user.email || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(user.role || 'cashier').replace('_', ' ').toUpperCase()}
                            size="small"
                            color={
                              user.role === 'admin' ? 'primary' :
                              user.role === 'manager' ? 'secondary' :
                              user.role === 'salesman' ? 'info' :
                              user.role === 'warehouse_manager' ? 'warning' : 'default'
                            }
                            sx={{ fontWeight: 700 }}
                          />
                          {user.assigned_warehouse_name ? (
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, fontWeight: 700, fontSize: '0.75rem' }}>
                              🏬 {user.assigned_warehouse_name}
                            </Typography>
                          ) : (user.role === 'warehouse_manager' ? (
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, fontWeight: 700, fontSize: '0.75rem' }}>
                              🏬 All Warehouses (Unrestricted)
                            </Typography>
                          ) : null)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active === 1 ? 'Active' : 'Disabled'}
                            size="small"
                            color={user.is_active === 1 ? 'success' : 'error'}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => handleOpenEditStaff(user)} size="small" color="primary">
                            <Edit2 size={16} />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteStaff(user.id)} size="small" color="error">
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mobile Stacked Card View */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, width: '100%' }}>
              {staffUsers.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  No staff users created yet.
                </Paper>
              ) : (
                staffUsers.map(user => (
                  <Card key={user.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{user.name}</Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>@{user.username}</Typography>
                        {user.assigned_warehouse_name ? (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>
                            🏬 {user.assigned_warehouse_name}
                          </Typography>
                        ) : (user.role === 'warehouse_manager' ? (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>
                            🏬 All Warehouses
                          </Typography>
                        ) : null)}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Chip
                          label={(user.role || 'cashier').replace('_', ' ').toUpperCase()}
                          size="small"
                          color={
                            user.role === 'admin' ? 'primary' :
                            user.role === 'manager' ? 'secondary' :
                            user.role === 'salesman' ? 'info' :
                            user.role === 'warehouse_manager' ? 'warning' : 'default'
                          }
                          sx={{ fontWeight: 700, fontSize: '10px', height: 22 }}
                        />
                        <Chip
                          label={user.is_active === 1 ? 'Active' : 'Disabled'}
                          size="small"
                          color={user.is_active === 1 ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '10px', height: 22 }}
                        />
                      </Box>
                    </Box>
                    {user.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        ✉️ {user.email}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Button size="small" variant="outlined" startIcon={<Edit2 size={14} />} onClick={() => handleOpenEditStaff(user)} sx={{ fontSize: '0.75rem', py: 0.25 }}>
                        Edit
                      </Button>
                      <IconButton size="small" color="error" onClick={() => handleDeleteStaff(user.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                  </Card>
                ))
              )}
            </Box>
          </Box>
        )}

        {/* --- TAB 10: ORDER HISTORY --- */}
        {activeTab === 10 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  POS Order History
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Audit, reprint, and filter historical checkout bills.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileSpreadsheet size={15} />}
                  onClick={async () => {
                    try {
                      const { from, to } = resolveDateRange(historyPreset, historyDateFrom, historyDateTo);
                      await downloadFile(`/api/orders/history/export-excel?preset=${historyPreset}&order_status=${historyStatus}&payment_mode=${historyPaymentMode}&price_type=${historyPriceType}&cashier_id=${historyCashier}&date_from=${from}&date_to=${to}&search=${encodeURIComponent(historySearch)}`, `order_history_${getISTDateString()}.xlsx`);
                      notify.success('Order History Excel report downloaded.', 'Export Complete');
                    } catch (err) {
                      notify.error(err.message || 'Failed to download Order History Excel report.', 'Export Error');
                    }
                  }}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2 },
                    py: { xs: 0.5, sm: 0.8 },
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  Export Excel (.xlsx)
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Download size={14} />}
                  onClick={async () => {
                    try {
                      const { from, to } = resolveDateRange(historyPreset, historyDateFrom, historyDateTo);
                      await downloadFile(`/api/orders/history/export-csv?preset=${historyPreset}&order_status=${historyStatus}&payment_mode=${historyPaymentMode}&price_type=${historyPriceType}&cashier_id=${historyCashier}&date_from=${from}&date_to=${to}&search=${encodeURIComponent(historySearch)}`, `order_history_${getISTDateString()}.csv`);
                      notify.success('Order History CSV report downloaded.', 'Export Complete');
                    } catch (err) {
                      notify.error(err.message || 'Failed to download Order History CSV report.', 'Export Error');
                    }
                  }}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0.5, sm: 0.8 },
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  CSV
                </Button>
              </Box>
            </Box>

            {/* Filter Panel & Standardized Date Range */}
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', width: '100%' }}>
              <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
                {/* Reusable Date Range Picker */}
                <Grid size={{ xs: 12 }}>
                  <DateRangePicker
                    preset={historyPreset}
                    onPresetChange={(newP) => { setHistoryPreset(newP); setHistoryPage(0); }}
                    dateFrom={historyDateFrom}
                    onDateFromChange={(newF) => { setHistoryDateFrom(newF); setHistoryPage(0); }}
                    dateTo={historyDateTo}
                    onDateToChange={(newT) => { setHistoryDateTo(newT); setHistoryPage(0); }}
                    showAllTimeOption={true}
                  />
                </Grid>

                {/* Search Bar */}
                <Grid size={{ xs: 12, sm: 2.8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Order #, Customer, Item..."
                    value={historySearch}
                    onChange={e => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                  />
                </Grid>

                {/* Cashier Dropdown */}
                <Grid size={{ xs: 6, sm: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Cashier</InputLabel>
                    <Select
                      value={historyCashier}
                      label="Cashier"
                      onChange={e => { setHistoryCashier(e.target.value); setHistoryPage(0); }}
                    >
                      <MenuItem value="all">All Staff</MenuItem>
                      {staffUsers.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Payment Mode Dropdown */}
                <Grid size={{ xs: 6, sm: 1.8 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment</InputLabel>
                    <Select
                      value={historyPaymentMode}
                      label="Payment"
                      onChange={e => { setHistoryPaymentMode(e.target.value); setHistoryPage(0); }}
                    >
                      <MenuItem value="all">All Payments</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="upi">UPI Scan</MenuItem>
                      <MenuItem value="card">Credit Card</MenuItem>
                      <MenuItem value="wallet">Wallet</MenuItem>
                      <MenuItem value="split">Split Bill</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Status Dropdown */}
                <Grid size={{ xs: 6, sm: 1.8 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={historyStatus}
                      label="Status"
                      onChange={e => { setHistoryStatus(e.target.value); setHistoryPage(0); }}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="pending">Pending (Held)</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Price Type / Pricing Dropdown */}
                <Grid size={{ xs: 6, sm: 2.2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Pricing</InputLabel>
                    <Select
                      value={historyPriceType}
                      label="Pricing"
                      onChange={e => { setHistoryPriceType(e.target.value); setHistoryPage(0); }}
                    >
                      <MenuItem value="all">All Pricing</MenuItem>
                      <MenuItem value="retail">Retail Only</MenuItem>
                      <MenuItem value="wholesale">Wholesale Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Reset Button */}
                <Grid size={{ xs: 12, sm: 1.4 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    size="small"
                    onClick={() => {
                      setHistoryPreset('all');
                      setHistorySearch('');
                      setHistoryCashier('all');
                      setHistoryPaymentMode('all');
                      setHistoryStatus('all');
                      setHistoryPriceType('all');
                      setHistoryDateFrom('');
                      setHistoryDateTo('');
                      setHistoryPage(0);
                    }}
                    sx={{ fontWeight: 'bold', minHeight: 38 }}
                  >
                    Reset
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Orders Table View — Desktop/Tablet (md+) */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
              <Table size="small" sx={{ minWidth: 750 }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Price Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cashier</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Date / Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Customer Info</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Subtotal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Discount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tax</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Net Paid</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Payment</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 4, fontWeight: 700, color: 'text.secondary' }}>
                        No orders match filters in retention window.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyOrders.map(order => (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{order.unique_order_number}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {(order.price_list || '').toLowerCase() === 'wholesale' ? (
                            <Chip
                              label="Wholesale"
                              size="small"
                              sx={{
                                bgcolor: '#7c3aed',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                height: 22
                              }}
                            />
                          ) : (
                            <Chip
                              label="Retail"
                              size="small"
                              variant="outlined"
                              sx={{
                                color: '#ea580c',
                                borderColor: '#fdba74',
                                bgcolor: 'rgba(234, 88, 12, 0.06)',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                height: 22
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{order.cashier_name}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(order.created_at).toLocaleString()}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {order.customer_name ? (
                            <Box sx={{ fontSize: '12px' }}>
                              <b>{order.customer_name}</b> <br />
                              <span style={{ color: '#64748b' }}>{order.customer_phone}</span>
                            </Box>
                          ) : '-'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Rs. {parseFloat(order.subtotal).toFixed(2)}</TableCell>
                        <TableCell sx={{ color: 'warning.main', fontWeight: 600, whiteSpace: 'nowrap' }}>Rs. {parseFloat(order.discount_amount).toFixed(2)}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>Rs. {parseFloat(order.tax_amount).toFixed(2)}</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 800, whiteSpace: 'nowrap' }}>Rs. {parseFloat(order.total_amount).toFixed(2)}</TableCell>
                        <TableCell sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{order.payment_mode}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip
                            label={order.order_status}
                            size="small"
                            color={order.order_status === 'completed' ? 'success' : order.order_status === 'cancelled' ? 'error' : 'warning'}
                            sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="View Order Bill Details">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={async () => {
                                  try {
                                    const res = await apiFetch(`/api/orders/${order.id}`);
                                    if (res.ok) {
                                      setSelectedHistoryOrder(await res.json());
                                      setHistoryOrderDetailOpen(true);
                                    }
                                  } catch (err) {
                                    notify.error('Failed to load order details.', 'Error');
                                  }
                                }}
                                sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                              >
                                View
                              </Button>
                            </Tooltip>
                            <Tooltip title="Print Receipt Duplicate">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={async () => {
                                  try {
                                    const res = await apiFetch(`/api/orders/${order.id}/reprint`, { method: 'POST' });
                                    if (res.ok) {
                                      notify.success('Receipt duplicate enqueued to thermal printer.', 'Reprint Success');
                                    } else {
                                      const err = await res.json();
                                      notify.error(err.message || 'Reprint failed.', 'Reprint Error');
                                    }
                                  } catch (err) {
                                    notify.error('Failed to dispatch reprint.', 'Error');
                                  }
                                }}
                              >
                                <Printer size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF Receipt">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  window.open(`/api/orders/${order.id}/pdf?token=${localStorage.getItem('ARISO_RETAIL_TOKEN') || token}`, '_blank');
                                }}
                              >
                                <FileText size={16} />
                              </IconButton>
                            </Tooltip>
                            {order.order_status === 'completed' && (
                              <Tooltip title="Sales Return / Issue Credit Note">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/api/orders/${order.id}`);
                                      if (res.ok) {
                                        setSelectedOrderForCreditNote(await res.json());
                                        setCreditNoteModalOpen(true);
                                      }
                                    } catch (e) {
                                      notify.error('Failed to load order details for credit note');
                                    }
                                  }}
                                >
                                  <RotateCcw size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Orders Mobile Card View — xs/sm only */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {loading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : historyOrders.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontWeight: 600, borderRadius: 2.5 }}>
                  No orders match filters in retention window.
                </Paper>
              ) : (
                historyOrders.map(order => (
                  <Card key={order.id} variant="outlined" sx={{ borderRadius: 2.5, bgcolor: 'background.paper', overflow: 'hidden' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      {/* Row 1: Order # + Amount + Status */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                            #{order.unique_order_number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            🕒 {new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          {order.cashier_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              👤 {order.cashier_name}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 800, fontSize: '1rem' }}>
                            Rs. {parseFloat(order.total_amount).toFixed(2)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip
                              label={(order.price_list || '').toLowerCase() === 'wholesale' ? 'Wholesale' : 'Retail'}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '9px',
                                height: 18,
                                bgcolor: (order.price_list || '').toLowerCase() === 'wholesale' ? '#7c3aed' : 'rgba(234, 88, 12, 0.1)',
                                color: (order.price_list || '').toLowerCase() === 'wholesale' ? '#fff' : '#ea580c',
                                border: '1px solid',
                                borderColor: (order.price_list || '').toLowerCase() === 'wholesale' ? '#6d28d9' : '#fdba74'
                              }}
                            />
                            <Chip
                              label={order.order_status}
                              size="small"
                              color={order.order_status === 'completed' ? 'success' : order.order_status === 'cancelled' ? 'error' : 'warning'}
                              sx={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '10px', height: 20 }}
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Row 2: Breakdown row */}
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
                        <span>Sub: <b>Rs. {parseFloat(order.subtotal).toFixed(2)}</b></span>
                        {parseFloat(order.discount_amount) > 0 && (
                          <span style={{ color: '#f59e0b' }}>Disc: <b>-Rs. {parseFloat(order.discount_amount).toFixed(2)}</b></span>
                        )}
                        <span>Tax: <b>Rs. {parseFloat(order.tax_amount).toFixed(2)}</b></span>
                      </Box>

                      {/* Row 3: Customer + Payment + Actions */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.75, borderTop: 1, borderColor: 'divider' }}>
                        <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 0 }}>
                          {order.customer_name ? (
                            <span>📋 <b>{order.customer_name}</b>{order.customer_phone ? ` (${order.customer_phone})` : ''}</span>
                          ) : (
                            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>💳 {order.payment_mode}</span>
                          )}
                          {order.customer_name && (
                            <span style={{ marginLeft: 8, textTransform: 'uppercase', fontWeight: 700 }}>| {order.payment_mode}</span>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={async () => {
                              try {
                                const res = await apiFetch(`/api/orders/${order.id}`);
                                if (res.ok) {
                                  setSelectedHistoryOrder(await res.json());
                                  setHistoryOrderDetailOpen(true);
                                }
                              } catch (err) {
                                notify.error('Failed to load order details.', 'Error');
                              }
                            }}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', px: 1.25, py: 0.25 }}
                          >
                            View
                          </Button>
                          <IconButton
                            size="small"
                            color="warning"
                            title="Reprint Receipt"
                            onClick={async () => {
                              try {
                                const res = await apiFetch(`/api/orders/${order.id}/reprint`, { method: 'POST' });
                                if (res.ok) {
                                  notify.success('Receipt duplicate enqueued.', 'Reprint Success');
                                } else {
                                  const err = await res.json();
                                  notify.error(err.message || 'Reprint failed.', 'Reprint Error');
                                }
                              } catch (err) {
                                notify.error('Failed to dispatch reprint.', 'Error');
                              }
                            }}
                          >
                            <Printer size={15} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            title="Download PDF"
                            onClick={() => {
                              window.open(`/api/orders/${order.id}/pdf?token=${localStorage.getItem('ARISO_RETAIL_TOKEN') || token}`, '_blank');
                            }}
                          >
                            <FileText size={15} />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <TablePagination
                component="div"
                count={historyTotalRecords}
                page={historyPage}
                onPageChange={(e, newPage) => setHistoryPage(newPage)}
                rowsPerPage={historyLimit}
                onRowsPerPageChange={e => {
                  setHistoryLimit(parseInt(e.target.value, 10));
                  setHistoryPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
              />
            </Box>
          </Box>
        )}

        {/* --- TAB 11: SALES ORDERS & PENDING APPROVALS --- */}
        {activeTab === 11 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.1rem, 4vw, 1.4rem)', sm: '1.5rem' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ClipboardList size={22} color="#0284c7" /> Sales Orders & Pending Approvals
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  View and manage sales orders created by Admin and Salesmen. Confirming an order deducts reserved stock and finalizes the sale.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  startIcon={<Plus size={16} />}
                  onClick={() => {
                    setSalesOrderModalEditOrder(null);
                    setSalesOrderModalInitialParty(null);
                    setSalesOrderModalOpen(true);
                  }}
                  sx={{ fontWeight: 800, px: 2 }}
                >
                  + New Sales Order
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshCw size={14} className={salesOrdersLoading ? 'spin' : ''} />}
                  onClick={fetchData}
                  sx={{ fontWeight: 700 }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Summary Metrics Cards */}
            <Grid container spacing={{ xs: 1, sm: 2 }}>
              <Grid size={{ xs: 6, sm: 2.4 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setSalesOrderStatus('all')}
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    bgcolor: salesOrderStatus === 'all' ? '#e2e8f0' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderWidth: salesOrderStatus === 'all' ? 2 : 1,
                    borderColor: salesOrderStatus === 'all' ? '#64748b' : undefined,
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 }
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Documents
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {salesOrders.length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 2.4 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setSalesOrderStatus('estimate')}
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    bgcolor: salesOrderStatus === 'estimate' ? '#ede9fe' : '#F5F3FF',
                    borderColor: salesOrderStatus === 'estimate' ? '#7C3AED' : '#DDD6FE',
                    borderWidth: salesOrderStatus === 'estimate' ? 2 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 }
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#6D28D9', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <FileText size={12} /> Estimates / Quotes
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#7C3AED' }}>
                    {salesOrders.filter(o => o.is_estimate === 1).length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 2.4 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setSalesOrderStatus('pending')}
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    bgcolor: salesOrderStatus === 'pending' ? '#fef3c7' : '#FFFBEB',
                    borderColor: salesOrderStatus === 'pending' ? '#D97706' : '#FDE68A',
                    borderWidth: salesOrderStatus === 'pending' ? 2 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 }
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <Clock size={12} /> Pending (Reserved)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#D97706' }}>
                    {salesOrders.filter(o => o.order_status === 'pending' && !o.is_estimate).length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 2.4 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setSalesOrderStatus('partially_fulfilled')}
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    bgcolor: salesOrderStatus === 'partially_fulfilled' ? '#e0f2fe' : '#F0F9FF',
                    borderColor: salesOrderStatus === 'partially_fulfilled' ? '#0284C7' : '#BAE6FD',
                    borderWidth: salesOrderStatus === 'partially_fulfilled' ? 2 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 }
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <Truck size={12} /> Partially Fulfilled
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#0284C7' }}>
                    {salesOrders.filter(o => o.order_status === 'partially_fulfilled').length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 2.4 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setSalesOrderStatus('fulfilled')}
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    bgcolor: salesOrderStatus === 'fulfilled' ? '#dcfce7' : '#F0FDF4',
                    borderColor: salesOrderStatus === 'fulfilled' ? '#16A34A' : '#BBF7D0',
                    borderWidth: salesOrderStatus === 'fulfilled' ? 2 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 }
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <CheckCircle size={12} /> Fulfilled / Invoiced
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#16A34A' }}>
                    {salesOrders.filter(o => o.order_status === 'fulfilled' || o.order_status === 'completed').length}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Filter Bar */}
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', width: '100%' }}>
              <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12 }}>
                  <DateRangePicker
                    preset={salesOrderPreset}
                    onPresetChange={setSalesOrderPreset}
                    dateFrom={salesOrderDateFrom}
                    onDateFromChange={setSalesOrderDateFrom}
                    dateTo={salesOrderDateTo}
                    onDateToChange={setSalesOrderDateTo}
                    showAllTimeOption={true}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Order #, Customer, Store, Phone, Ref..."
                    value={salesOrderSearch}
                    onChange={e => setSalesOrderSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={16} />
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 3.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Order Status & Type</InputLabel>
                    <Select
                      value={salesOrderStatus}
                      label="Order Status & Type"
                      onChange={e => setSalesOrderStatus(e.target.value)}
                    >
                      <MenuItem value="all">All Statuses & Types</MenuItem>
                      <MenuItem value="pending">Pending (Reserved Stock)</MenuItem>
                      <MenuItem value="estimate">Estimates / Quotations</MenuItem>
                      <MenuItem value="partially_fulfilled">Partially Fulfilled</MenuItem>
                      <MenuItem value="fulfilled">Fulfilled / Invoiced</MenuItem>
                      <MenuItem value="completed">Completed / Confirmed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 6, sm: 3.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Staff / Salesman</InputLabel>
                    <Select
                      value={salesOrderStaff}
                      label="Staff / Salesman"
                      onChange={e => setSalesOrderStaff(e.target.value)}
                    >
                      <MenuItem value="all">All Sellers</MenuItem>
                      {staffUsers.map(u => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Orders Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 920 }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Delivery Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Order No.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Party Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sales By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSalesOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary', fontWeight: 600 }}>
                        {salesOrdersLoading ? 'Loading sales orders...' : 'No sales orders found matching selected filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSalesOrders.map((ord) => {
                      const isPending = ord.order_status === 'pending';
                      const sellerDisplay = ord.salesman_name || ord.cashier_name || 'Staff';
                      const custDisplay = ord.customer_name || ord.store_name || 'Walk-in Party';

                      return (
                        <TableRow key={ord.id} hover sx={{ bgcolor: isPending ? 'rgba(254, 243, 199, 0.25)' : 'inherit' }}>
                          {/* 1. Date */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ fontWeight: 700 }}>
                              {new Date(ord.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Box>
                            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              {new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </Box>
                          </TableCell>

                          {/* 2. Delivery Date */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {ord.delivery_date ? (
                              <Box sx={{ fontWeight: 800, color: '#d97706' }}>
                                {new Date(ord.delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            )}
                          </TableCell>

                          {/* 3. Order No. */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ fontWeight: 800, fontFamily: 'monospace', color: 'primary.main' }}>
                              {ord.unique_order_number || ord.order_number || `#${ord.id}`}
                            </Box>
                            {ord.reference_number && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Ref: {ord.reference_number}
                              </Typography>
                            )}
                          </TableCell>

                          {/* 4. Party Name */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ fontWeight: 700 }}>{custDisplay}</Box>
                            {ord.customer_phone && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                📞 {ord.customer_phone}
                              </Typography>
                            )}
                          </TableCell>

                          {/* 5. Sales By */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
                              <User size={14} color="#0284c7" /> {sellerDisplay}
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                              {ord.salesman_name ? 'Salesman' : 'Counter'}
                            </Typography>
                          </TableCell>

                          {/* 6. Status */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {ord.is_estimate === 1 ? (
                              <Chip
                                size="small"
                                label={ord.order_status === 'converted' ? 'ESTIMATE (CONVERTED)' : 'ESTIMATE / QUOTE'}
                                sx={{
                                  bgcolor: ord.order_status === 'converted' ? '#f1f5f9' : '#ede9fe',
                                  color: ord.order_status === 'converted' ? '#64748b' : '#7c3aed',
                                  fontWeight: 800,
                                  fontSize: '0.725rem'
                                }}
                              />
                            ) : ord.order_status === 'partially_fulfilled' ? (
                              <Chip
                                size="small"
                                label="PARTIALLY FULFILLED"
                                sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.725rem' }}
                              />
                            ) : ord.order_status === 'fulfilled' ? (
                              <Chip
                                size="small"
                                label="FULFILLED / INVOICED"
                                sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.725rem' }}
                              />
                            ) : isPending ? (
                              <Chip
                                size="small"
                                icon={<Clock size={12} />}
                                label="PENDING / RESERVED"
                                sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.725rem' }}
                              />
                            ) : ord.order_status === 'completed' ? (
                              <Chip
                                size="small"
                                icon={<CheckCircle size={12} />}
                                label="Completed"
                                color="success"
                                sx={{ fontWeight: 700, fontSize: '0.725rem' }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                icon={<XCircle size={12} />}
                                label={ord.order_status?.toUpperCase() || 'CANCELLED'}
                                color="error"
                                sx={{ fontWeight: 700, fontSize: '0.725rem' }}
                              />
                            )}
                          </TableCell>

                          {/* 7. Total */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ fontWeight: 900, color: 'text.primary' }}>
                              ₹{parseFloat(ord.total_amount || 0).toFixed(2)}
                            </Box>
                            {parseFloat(ord.invoiced_amount || 0) > 0 && parseFloat(ord.invoiced_amount) < parseFloat(ord.total_amount) && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#0284c7', fontWeight: 700, fontSize: '0.7rem' }}>
                                Inv: ₹{parseFloat(ord.invoiced_amount).toFixed(2)}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
                              {ord.payment_mode || 'Pending'}
                            </Typography>
                          </TableCell>

                          {/* 8. Actions */}
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* Quick Convert for Estimates */}
                              {ord.is_estimate === 1 && ord.order_status !== 'converted' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={async () => {
                                    if (!window.confirm(`Convert Estimate #${ord.unique_order_number || ord.id} to Sales Order?\nThis will reserve warehouse inventory and assign an official SO number.`)) return;
                                    try {
                                      const res = await apiFetch(`/api/orders/${ord.id}/convert-estimate`, { method: 'POST' });
                                      if (res.ok) {
                                        const d = await res.json();
                                        notify.success(`Converted to Sales Order #${d.salesOrderNumber}! Stock reserved.`, 'Success');
                                        fetchData();
                                      } else {
                                        const err = await res.json();
                                        notify.error(err.error || 'Failed to convert estimate.', 'Error');
                                      }
                                    } catch (err) {
                                      notify.error(err.message || 'Failed to convert estimate.', 'Error');
                                    }
                                  }}
                                  sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    px: 1,
                                    bgcolor: '#7c3aed',
                                    '&:hover': { bgcolor: '#6d28d9' }
                                  }}
                                >
                                  Convert
                                </Button>
                              )}

                              {/* View Voucher */}
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={async () => {
                                  try {
                                    const res = await apiFetch(`/api/orders/${ord.id}`);
                                    if (res.ok) {
                                      const fullOrder = await res.json();
                                      setSalesOrderVoucherOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
                                      setSalesOrderVoucherOpen(true);
                                    } else {
                                      setSalesOrderVoucherOrder(ord);
                                      setSalesOrderVoucherOpen(true);
                                    }
                                  } catch (e) {
                                    setSalesOrderVoucherOrder(ord);
                                    setSalesOrderVoucherOpen(true);
                                  }
                                }}
                                sx={{ fontWeight: 700, fontSize: '0.75rem', px: 1 }}
                              >
                                View
                              </Button>

                              {/* Edit Order (Pending only) */}
                              {isPending && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/api/orders/${ord.id}`);
                                      if (res.ok) {
                                        const fullOrder = await res.json();
                                        setSalesOrderModalEditOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
                                      } else {
                                        setSalesOrderModalEditOrder(ord);
                                      }
                                    } catch (e) {
                                      setSalesOrderModalEditOrder(ord);
                                    }
                                    setSalesOrderModalInitialParty(null);
                                    setSalesOrderModalOpen(true);
                                  }}
                                  sx={{ fontWeight: 700, fontSize: '0.75rem', px: 1 }}
                                >
                                  Edit
                                </Button>
                              )}

                              {/* Share WhatsApp */}
                              <Tooltip title="Share via WhatsApp">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/api/orders/${ord.id}`);
                                      if (res.ok) {
                                        const fullOrder = await res.json();
                                        setSalesOrderVoucherOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
                                      } else {
                                        setSalesOrderVoucherOrder(ord);
                                      }
                                    } catch (e) {
                                      setSalesOrderVoucherOrder(ord);
                                    }
                                    setSalesOrderVoucherOpen(true);
                                  }}
                                >
                                  <Share2 size={16} />
                                </IconButton>
                              </Tooltip>

                              {/* Download */}
                              <Tooltip title="Download Voucher">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/api/orders/${ord.id}`);
                                      if (res.ok) {
                                        const fullOrder = await res.json();
                                        setSalesOrderVoucherOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
                                      } else {
                                        setSalesOrderVoucherOrder(ord);
                                      }
                                    } catch (e) {
                                      setSalesOrderVoucherOrder(ord);
                                    }
                                    setSalesOrderVoucherOpen(true);
                                  }}
                                >
                                  <Download size={16} />
                                </IconButton>
                              </Tooltip>

                              {/* 3-Dot Action Menu */}
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setSalesOrderMenuAnchor(e.currentTarget);
                                  setSalesOrderMenuOrder(ord);
                                }}
                              >
                                <MoreVertical size={16} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* --- TAB 12: PARTIES --- */}
        {activeTab === 12 && (
          <PartyTab
            onCreateSalesOrder={(party) => {
              setSalesOrderModalEditOrder(null);
              setSalesOrderModalInitialParty(party);
              setSalesOrderModalOpen(true);
            }}
            onViewOrderVoucher={async (ord) => {
              try {
                const res = await apiFetch(`/api/orders/${ord.id}`);
                if (res.ok) {
                  const fullOrder = await res.json();
                  setSalesOrderVoucherOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
                } else {
                  setSalesOrderVoucherOrder(ord);
                }
              } catch (e) {
                setSalesOrderVoucherOrder(ord);
              }
              setSalesOrderVoucherOpen(true);
            }}
          />
        )}

        {/* --- TAB 13: BANK & FINANCIAL ACCOUNTS --- */}
        {activeTab === 13 && <FinancialAccountsSuite />}

        {/* --- TAB 14: EXPENSE MANAGEMENT SUITE --- */}
        {activeTab === 14 && <ExpenseManagementSuite />}

        {/* --- TAB 15: DAY END & CASH CLOSING SUITE --- */}
        {activeTab === 15 && <DayEndDashboard user={user} token={token} />}

        {/* --- TAB 16: PAYMENT RECONCILIATION SUITE --- */}
        {activeTab === 16 && (Boolean(user?.reconciliation_enabled) || isSuperAdmin) && <PaymentReconciliationSuite user={user} />}

        {/* --- TAB 17: SUPPLIER PAYABLES & OUTSTANDING SUITE --- */}
        {activeTab === 17 && <SupplierPayablesDashboard user={user} />}

        {/* --- TAB 18: PRODUCT SERIAL NUMBER TRACKING & PRINTING --- */}
        {activeTab === 18 && <SerialNumberSuite user={user} token={token} />}

      {/* --- CRUD FORM POPUP --- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        disableRestoreFocus
        maxWidth={dialogType.includes('menu') ? 'lg' : 'xs'}
        fullWidth
        slotProps={{
          paper: {
            sx: dialogType.includes('menu') ? { borderRadius: 3, maxHeight: '92vh' } : { borderRadius: 2 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              {dialogType === 'add_menu' && 'Add Item'}
              {dialogType === 'edit_menu' && 'Modify Item'}
              {dialogType === 'add_printer' && 'Add Printer'}
              {dialogType === 'add_category' && 'Add Category'}
            </Typography>
            {dialogType.includes('menu') && (
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Configure product identification, units, pricing, inventory tracking, and tax rates.
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <form onSubmit={
          dialogType.includes('menu') ? handleSaveMenu :
          dialogType.includes('printer') ? handleSavePrinter :
          handleSaveCategory
        }>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: dialogType.includes('menu') ? '#f8fafc' : 'background.paper', p: dialogType.includes('menu') ? 2.5 : 2 }}>
            {dialogType.includes('menu') && (
              <Grid container spacing={2.5}>
                {/* ══════════════ LEFT COLUMN: Basic Info, Inventory, Other Details ══════════════ */}
                <Grid size={{ xs: 12, md: 7.2 }}>
                  {/* 1. Basic Information Card */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                      Basic Information
                    </Typography>

                    {/* Item Type: Goods / Service */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 0.5 }}>
                        Item Type
                      </Typography>
                      <RadioGroup
                        row
                        value={menuGoodsOrService}
                        onChange={e => setMenuGoodsOrService(e.target.value)}
                      >
                        <FormControlLabel value="Goods" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Goods</Typography>} />
                        <FormControlLabel value="Service" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Service</Typography>} />
                      </RadioGroup>
                    </Box>

                    <Grid container spacing={2}>
                      {/* Item Name * */}
                      <Grid size={{ xs: 12, sm: 8 }}>
                        <TextField
                          label="Item Name"
                          size="small"
                          fullWidth
                          value={menuName}
                          onChange={e => setMenuName(e.target.value)}
                          required
                          placeholder="Enter item name"
                        />
                      </Grid>

                      {/* Item Code */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          label="Item Code"
                          size="small"
                          fullWidth
                          value={menuItemCode}
                          onChange={e => setMenuItemCode(e.target.value)}
                          placeholder="e.g. ITM-001"
                        />
                      </Grid>

                      {/* Barcode (Scan Target) */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ position: 'relative' }}>
                          <TextField
                            label="Barcode (Scan Target)"
                            size="small"
                            fullWidth
                            value={menuBarcode}
                            onChange={e => {
                              const val = e.target.value;
                              setMenuBarcode(val);
                              setBarcodeDuplicate(null);
                              if (barcodeCheckTimer) clearTimeout(barcodeCheckTimer);
                              if (val.trim()) {
                                const t = setTimeout(async () => {
                                  try {
                                    const excludeId = dialogType === 'edit_menu' && selectedEntity?.id ? selectedEntity.id : undefined;
                                    const qp = excludeId ? `?barcode=${encodeURIComponent(val)}&exclude_id=${excludeId}` : `?barcode=${encodeURIComponent(val)}`;
                                    const r = await apiFetch(`/api/menu/check-barcode${qp}`);
                                    const d = await r.json();
                                    if (d.duplicate) setBarcodeDuplicate(d.existing_item);
                                  } catch (_) {}
                                }, 600);
                                setBarcodeCheckTimer(t);
                              }
                            }}
                            error={!!barcodeDuplicate}
                            helperText={barcodeDuplicate ? `Already used by: ${barcodeDuplicate.name}` : 'Leave blank to auto-generate unique 8-digit barcode'}
                            placeholder="e.g. 8901030383748 (Auto-generates if blank)"
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Tooltip title="Scan Barcode with Camera">
                                      <IconButton
                                        size="small"
                                        onClick={() => setBarcodeScanModalOpen(true)}
                                        sx={{ color: 'primary.main' }}
                                        id="scan-barcode-btn"
                                      >
                                        <Camera size={16} />
                                      </IconButton>
                                    </Tooltip>
                                  </InputAdornment>
                                )
                              }
                            }}
                          />
                        </Box>
                        {menuBarcodeImageUrl && (
                          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <img src={menuBarcodeImageUrl} alt="Barcode" style={{ height: 28, maxWidth: 90, objectFit: 'contain', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                            <IconButton size="small" onClick={() => setMenuBarcodeImageUrl('')} sx={{ color: 'error.main', p: 0.25 }}>
                              <X size={12} />
                            </IconButton>
                          </Box>
                        )}
                      </Grid>

                      {/* SKU (Stock Keeping Unit) */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="SKU (Stock Keeping Unit)"
                          size="small"
                          fullWidth
                          value={menuSku}
                          onChange={e => setMenuSku(e.target.value)}
                          placeholder="e.g. SKU-RICE-001"
                          helperText="Internal inventory code (optional search term)"
                        />
                      </Grid>

                      {/* HSN */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          label="HSN"
                          size="small"
                          fullWidth
                          value={menuHsnCode}
                          onChange={e => setMenuHsnCode(e.target.value)}
                          placeholder="Enter HSN Number"
                        />
                      </Grid>

                      {/* Purchase Unit */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Purchase Unit</InputLabel>
                          <Select
                            value={menuPurchaseUnit}
                            label="Purchase Unit"
                            onChange={e => setMenuPurchaseUnit(e.target.value)}
                          >
                            <MenuItem value="pcs">Pcs (Piece)</MenuItem>
                            <MenuItem value="box">Box</MenuItem>
                            <MenuItem value="pack">Pack</MenuItem>
                            <MenuItem value="bottle">Bottle</MenuItem>
                            <MenuItem value="can">Can</MenuItem>
                            <MenuItem value="roll">Roll</MenuItem>
                            <MenuItem value="dozen">Dozen</MenuItem>
                            <MenuItem value="kg">Kg (Kilogram)</MenuItem>
                            <MenuItem value="gram">Gram</MenuItem>
                            <MenuItem value="litre">Litre</MenuItem>
                            <MenuItem value="ml">Ml</MenuItem>
                            <MenuItem value="meter">Meter</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Sales Unit */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Sales Unit</InputLabel>
                          <Select
                            value={menuSalesUnit}
                            label="Sales Unit"
                            onChange={e => setMenuSalesUnit(e.target.value)}
                          >
                            <MenuItem value="pcs">Pcs (Piece)</MenuItem>
                            <MenuItem value="box">Box</MenuItem>
                            <MenuItem value="pack">Pack</MenuItem>
                            <MenuItem value="bottle">Bottle</MenuItem>
                            <MenuItem value="can">Can</MenuItem>
                            <MenuItem value="roll">Roll</MenuItem>
                            <MenuItem value="dozen">Dozen</MenuItem>
                            <MenuItem value="kg">Kg (Kilogram)</MenuItem>
                            <MenuItem value="gram">Gram</MenuItem>
                            <MenuItem value="litre">Litre</MenuItem>
                            <MenuItem value="ml">Ml</MenuItem>
                            <MenuItem value="meter">Meter</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Brand */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Brand"
                          size="small"
                          fullWidth
                          value={menuBrand}
                          onChange={e => setMenuBrand(e.target.value)}
                          placeholder="Choose or enter Brand"
                        />
                      </Grid>

                      {/* Group */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Group"
                          size="small"
                          fullWidth
                          value={menuItemGroup}
                          onChange={e => setMenuItemGroup(e.target.value)}
                          placeholder="Choose or enter Group"
                        />
                      </Grid>

                      {/* Category * */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small" required>
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={menuCategoryId}
                            label="Category"
                            onChange={e => setMenuCategoryId(e.target.value)}
                          >
                            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Tag (Multi-tag input) */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box>
                          <TextField
                            label="Tag"
                            size="small"
                            fullWidth
                            value={menuTagInput}
                            onChange={e => setMenuTagInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = menuTagInput.trim();
                                if (val && !menuTags.includes(val)) {
                                  setMenuTags([...menuTags, val]);
                                  setMenuTagInput('');
                                }
                              }
                            }}
                            placeholder="Type tag & press Enter"
                          />
                          {menuTags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                              {menuTags.map((t, idx) => (
                                <Chip
                                  key={idx}
                                  label={t}
                                  size="small"
                                  onDelete={() => setMenuTags(menuTags.filter((_, i) => i !== idx))}
                                  sx={{ fontSize: '11px', fontWeight: 600 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Grid>

                      {/* Divider for POS unit & diet controls */}
                      <Grid size={12}>
                        <Divider sx={{ my: 0.5 }} />
                      </Grid>

                      {/* POS Item Type selector */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          POS Unit Type
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            type="button"
                            size="small"
                            variant={menuPosUnitType === 'PCS' ? 'contained' : 'outlined'}
                            color={menuPosUnitType === 'PCS' ? 'primary' : 'inherit'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuPosUnitType('PCS');
                              setMenuIsWeightBased(false);
                              setMenuUnit('pcs');
                            }}
                            sx={{ flex: 1, fontWeight: 800, fontSize: '11px', px: 0.5 }}
                          >
                            📦 Pcs
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            variant={menuPosUnitType === 'WEIGHT' ? 'contained' : 'outlined'}
                            color={menuPosUnitType === 'WEIGHT' ? 'success' : 'inherit'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuPosUnitType('WEIGHT');
                              setMenuIsWeightBased(true);
                              setMenuUnit('kg');
                            }}
                            sx={{ flex: 1, fontWeight: 800, fontSize: '11px', px: 0.5 }}
                          >
                            ⚖️ Weight
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            variant={menuPosUnitType === 'SERIAL' ? 'contained' : 'outlined'}
                            color={menuPosUnitType === 'SERIAL' ? 'secondary' : 'inherit'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuPosUnitType('SERIAL');
                              setMenuIsWeightBased(false);
                              setMenuUnit('pcs');
                            }}
                            sx={{ flex: 1.2, fontWeight: 800, fontSize: '11px', px: 0.5 }}
                          >
                            🔢 Serial Number
                          </Button>
                        </Box>
                      </Grid>

                      {/* Serving Unit selector (Preserved) */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Serving Unit
                        </Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={menuUnit}
                            onChange={e => {
                              const newUnit = e.target.value;
                              setMenuUnit(newUnit);
                              const isWeightUnit = ['kg', 'gram', 'gm', 'g', 'litre', 'ltr', 'ml'].includes(newUnit.toLowerCase());
                              setMenuIsWeightBased(isWeightUnit);
                            }}
                          >
                            {menuIsWeightBased
                              ? [
                                  <MenuItem key="kg" value="kg">Kg</MenuItem>,
                                  <MenuItem key="gram" value="gram">Gram</MenuItem>,
                                  <MenuItem key="litre" value="litre">Litre</MenuItem>,
                                  <MenuItem key="ml" value="ml">Ml</MenuItem>,
                                ]
                              : [
                                  <MenuItem key="pcs" value="pcs">Pcs</MenuItem>,
                                  <MenuItem key="box" value="box">Box</MenuItem>,
                                  <MenuItem key="pack" value="pack">Pack</MenuItem>,
                                  <MenuItem key="bottle" value="bottle">Bottle</MenuItem>,
                                ]
                            }
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Veg / Non-Veg (Preserved) */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Dietary Classification
                        </Typography>
                        <FormControl fullWidth size="small">
                          <Select value={menuVeg} onChange={e => setMenuVeg(e.target.value)}>
                            <MenuItem value="1">🟢 Veg</MenuItem>
                            <MenuItem value="0">🔴 Non-Veg</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* 2. Inventory Card */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                        Inventory
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      {/* Opening Stock Quantity */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Opening Stock Quantity"
                          type="number"
                          size="small"
                          fullWidth
                          value={menuOpeningStock}
                          onChange={e => setMenuOpeningStock(e.target.value)}
                          placeholder="0"
                        />
                      </Grid>

                      {/* Cost Price per Unit (Opening Stock) */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Cost Price per Unit (Opening Stock)"
                          type="number"
                          size="small"
                          fullWidth
                          value={menuCostPrice}
                          onChange={e => setMenuCostPrice(e.target.value)}
                          placeholder="0.00"
                        />
                      </Grid>

                      {/* Stock Availability Start Date */}
                      <Grid size={{ xs: 12, sm: 12 }}>
                        <TextField
                          label="Stock Availability Start Date"
                          type="date"
                          size="small"
                          fullWidth
                          value={menuStockStartDate}
                          onChange={e => setMenuStockStartDate(e.target.value)}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>

                      {/* At PAR Stock */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="At PAR Stock"
                          type="number"
                          size="small"
                          fullWidth
                          value={menuAtParStock}
                          onChange={e => setMenuAtParStock(e.target.value)}
                          placeholder="0"
                        />
                      </Grid>

                      {/* Minimum Stock */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Minimum Stock"
                          type="number"
                          size="small"
                          fullWidth
                          value={menuMinStock}
                          onChange={e => setMenuMinStock(e.target.value)}
                          placeholder="0"
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* 3. Other Details Card */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                      Other Details
                    </Typography>

                    <Grid container spacing={2}>
                      {/* Linked Sales Account */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Linked Sales Account</InputLabel>
                          <Select
                            value={menuLinkedSalesAccount}
                            label="Linked Sales Account"
                            onChange={e => setMenuLinkedSalesAccount(e.target.value)}
                          >
                            <MenuItem value="Sales">Sales Account</MenuItem>
                            <MenuItem value="General Sales">General Sales</MenuItem>
                            <MenuItem value="Retail Sales">Retail Sales</MenuItem>
                            <MenuItem value="Service Revenue">Service Revenue</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Linked Purchase Account */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Linked Purchase Account</InputLabel>
                          <Select
                            value={menuLinkedPurchaseAccount}
                            label="Linked Purchase Account"
                            onChange={e => setMenuLinkedPurchaseAccount(e.target.value)}
                          >
                            <MenuItem value="Purchase">Purchase Account</MenuItem>
                            <MenuItem value="Cost of Goods Sold">Cost of Goods Sold</MenuItem>
                            <MenuItem value="Raw Materials">Raw Materials Purchase</MenuItem>
                            <MenuItem value="Packaging Expenses">Packaging Expenses</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Toggles */}
                      <Grid size={12}>
                        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', pt: 1, borderTop: '1px solid #f1f5f9' }}>
                          <FormControlLabel
                            control={<Switch checked={menuOpenQtyPopup} onChange={e => setMenuOpenQtyPopup(e.target.checked)} size="small" />}
                            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Open Quantity Popup</Typography>}
                          />
                          <FormControlLabel
                            control={<Switch checked={menuOpenPricePopup} onChange={e => setMenuOpenPricePopup(e.target.checked)} size="small" />}
                            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Open Price Popup</Typography>}
                          />
                          <FormControlLabel
                            control={<Switch checked={menuNotForSale} onChange={e => setMenuNotForSale(e.target.checked)} size="small" color="error" />}
                            label={<Typography variant="body2" sx={{ fontWeight: 600, color: menuNotForSale ? 'error.main' : 'inherit' }}>Not For Sale</Typography>}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* ══════════════ RIGHT COLUMN: Pricing, Image, Description, Printer ══════════════ */}
                <Grid size={{ xs: 12, md: 4.8 }}>
                  {/* 1. Pricing Card */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                      Pricing
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Sales Price (Reused menuPrice) */}
                      <TextField
                        label="Sales Price"
                        type="number"
                        size="small"
                        fullWidth
                        value={menuPrice}
                        onChange={e => setMenuPrice(e.target.value)}
                        required
                        placeholder="Enter Sales Price"
                      />

                      {/* Wholesale Price (Optional) */}
                      <TextField
                        label="Wholesale Price"
                        type="number"
                        size="small"
                        fullWidth
                        value={menuWholesalePrice}
                        onChange={e => setMenuWholesalePrice(e.target.value)}
                        placeholder="Enter Wholesale Price (Optional)"
                        helperText="Optional — falls back to Sales Price if blank"
                      />

                      {/* Purchase Price */}
                      <TextField
                        label="Purchase Price"
                        type="number"
                        size="small"
                        fullWidth
                        value={menuPurchasePrice}
                        onChange={e => setMenuPurchasePrice(e.target.value)}
                        placeholder="Enter Purchase Price"
                      />

                      {/* MRP */}
                      <TextField
                        label="MRP"
                        type="number"
                        size="small"
                        fullWidth
                        value={menuMrp}
                        onChange={e => setMenuMrp(e.target.value)}
                        placeholder="Enter MRP"
                      />

                      {/* Taxes: Inter State (IGST) & Intra State (GST) */}
                      <Grid container spacing={1.5}>
                        <Grid size={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Inter State Tax</InputLabel>
                            <Select
                              value={menuIgstRate}
                              label="Inter State Tax"
                              onChange={e => setMenuIgstRate(e.target.value)}
                            >
                              <MenuItem value="0">IGST 0%</MenuItem>
                              <MenuItem value="5">IGST 5%</MenuItem>
                              <MenuItem value="12">IGST 12%</MenuItem>
                              <MenuItem value="18">IGST 18%</MenuItem>
                              <MenuItem value="28">IGST 28%</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Intra State Tax</InputLabel>
                            <Select
                              value={menuGst}
                              label="Intra State Tax"
                              onChange={e => {
                                const val = e.target.value;
                                setMenuGst(val);
                                setMenuIgstRate(val);
                              }}
                            >
                              <MenuItem value="0">GST 0%</MenuItem>
                              <MenuItem value="5">GST 5%</MenuItem>
                              <MenuItem value="12">GST 12%</MenuItem>
                              <MenuItem value="18">GST 18%</MenuItem>
                              <MenuItem value="28">GST 28%</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>

                      {/* Discount Type & Value */}
                      <Grid container spacing={1.5}>
                        <Grid size={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Discount Type</InputLabel>
                            <Select
                              value={menuDiscountType}
                              label="Discount Type"
                              onChange={e => setMenuDiscountType(e.target.value)}
                            >
                              <MenuItem value="percentage">% Percentage</MenuItem>
                              <MenuItem value="flat">Flat Amount (₹)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label={menuDiscountType === 'percentage' ? 'Discount %' : 'Discount ₹'}
                            type="number"
                            size="small"
                            fullWidth
                            value={menuDiscountValue}
                            onChange={e => setMenuDiscountValue(e.target.value)}
                            placeholder={menuDiscountType === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>

                  {/* 2. Image Upload Card */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                      Image
                    </Typography>

                    <Box sx={{ border: '2px dashed #cbd5e1', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', '&:hover': { borderColor: 'primary.main', bgcolor: '#f1f5f9' }, transition: 'all 0.2s' }}>
                      <Button variant="contained" component="label" size="small" sx={{ fontWeight: 'bold' }} startIcon={<Camera size={16} />}>
                        Select Image File
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setMenuImageFile(file);
                              setMenuImageUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </Button>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
                        Supports JPEG, PNG, GIF, WEBP, SVG
                      </Typography>

                      {menuImageUrl && (
                        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                          <img src={resolveImageUrl(menuImageUrl)} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                          <Button size="small" color="error" variant="outlined" onClick={() => { setMenuImageFile(null); setMenuImageUrl(''); }}>
                            Remove
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>

                  {/* 3. Description Card */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                      Description
                    </Typography>
                    <TextField
                      placeholder="Enter product description..."
                      size="small"
                      fullWidth
                      value={menuDesc}
                      onChange={e => setMenuDesc(e.target.value)}
                      multiline
                      rows={3}
                    />
                  </Paper>

                  {/* 4. Associated Kitchen / Bar Printer */}
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                      Printer Routing
                    </Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel>Associated Kitchen / Bar Printer</InputLabel>
                      <Select
                        value={menuPrinterId}
                        label="Associated Kitchen / Bar Printer"
                        onChange={e => setMenuPrinterId(e.target.value)}
                      >
                        <MenuItem value="">Default Kitchen Printer (Fallback)</MenuItem>
                        {printers.map(p => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} ({p.role ? p.role.toUpperCase() : 'PRINTER'})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {dialogType.includes('printer') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Printer Connection Type</InputLabel>
                  <Select
                    value={printerType}
                    label="Printer Connection Type"
                    onChange={e => {
                      const newType = e.target.value;
                      setPrinterType(newType);
                      if (newType === 'usb') {
                        handleRefreshSystemPrinters(false);
                      }
                    }}
                  >
                    <MenuItem value="usb">USB / Windows Installed Driver</MenuItem>
                    <MenuItem value="lan">LAN / Network (TCP Socket)</MenuItem>
                    <MenuItem value="bluetooth">Bluetooth (Mobile Direct)</MenuItem>
                    <MenuItem value="network">Network Socket</MenuItem>
                  </Select>
                </FormControl>

                {printerType === 'usb' ? (
                  <>
                    {window.electron && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Detected Windows Printer</InputLabel>
                          <Select
                            value={systemPrinters.some(p => p.name === printerName) ? printerName : ''}
                            label="Detected Windows Printer"
                            onChange={async (e) => {
                              const selectedVal = e.target.value;
                              if (selectedVal) {
                                setPrinterName(selectedVal);
                                const match = systemPrinters.find(p => p.name === selectedVal);
                                if (match && match.paperWidth) {
                                  setPrinterWidth(String(match.paperWidth));
                                }
                                if (window.electron?.testPrinterConnection) {
                                  try {
                                    const testRes = await window.electron.testPrinterConnection(selectedVal);
                                    if (testRes?.success) {
                                      notify.success(`Connection Successful — "${testRes.printerName}" (Driver: ${testRes.driverName || 'Generic'}, Port: ${testRes.portName || 'USB'}) is ready for printing.`, '🖨️ Printer Connected');
                                    } else {
                                      notify.error(`Printer Connection Warning: ${testRes?.error || 'Spooler handle check failed.'}`, 'Printer Offline');
                                    }
                                  } catch (err) {
                                    notify.success(`Connection Successful — ${selectedVal} is selected.`, '🖨️ Printer Connected');
                                  }
                                } else {
                                  notify.success(`Connection Successful — ${selectedVal} is selected.`, '🖨️ Printer Connected');
                                }
                              }
                            }}
                          >
                            <MenuItem value="">
                              <em>-- Select Detected Windows Printer --</em>
                            </MenuItem>
                            {systemPrinters.map((p, idx) => (
                              <MenuItem key={idx} value={p.name}>
                                {p.name} {p.isDefault ? '[Default]' : ''} {p.driverName ? `(Driver: ${p.driverName})` : ''} {p.portName ? `[${p.portName}]` : ''} {p.isOnline ? '(Online)' : p.isVirtual ? '(Virtual)' : '(Offline)'}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Tooltip title="Refresh Windows Printers">
                          <IconButton
                            color="primary"
                            onClick={() => handleRefreshSystemPrinters(true)}
                            disabled={loadingSystemPrinters}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1 }}
                          >
                            {loadingSystemPrinters ? <CircularProgress size={18} /> : <RefreshCw size={18} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}

                    <TextField
                      label="Printer Device Name"
                      size="small"
                      fullWidth
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      required
                      placeholder="e.g. Counter Thermal Printer, Receipt Printer"
                      helperText="Exact Windows system device name for driver queue printing."
                    />
                  </>
                ) : printerType === 'bluetooth' ? (
                  <>
                    <TextField
                      label="Printer Name / Location"
                      size="small"
                      fullWidth
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      required
                      placeholder="e.g. Mobile Kitchen Bluetooth Printer"
                    />
                    <TextField 
                      label="Bluetooth MAC Address / Identifier" 
                      size="small" 
                      fullWidth 
                      value={printerBluetoothAddress} 
                      onChange={e => setPrinterBluetoothAddress(e.target.value)} 
                      placeholder="e.g. 00:11:22:33:44:55 (Optional)" 
                      helperText="📱 Direct Bluetooth thermal printing is paired directly inside the Mobile POS app."
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      label="Printer Name / Location"
                      size="small"
                      fullWidth
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      required
                      placeholder="e.g. Counter Receipt Printer"
                    />
                    <Grid container spacing={2}>
                      <Grid size={8}>
                        <TextField label="IP Address / Host" size="small" fullWidth value={printerIp} onChange={e => setPrinterIp(e.target.value)} required placeholder="192.168.1.100" />
                      </Grid>
                      <Grid size={4}>
                        <TextField label="Port" size="small" fullWidth value={printerPort} onChange={e => setPrinterPort(e.target.value)} required placeholder="9100" />
                      </Grid>
                    </Grid>
                  </>
                )}

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Paper Width</InputLabel>
                      <Select
                        size="small"
                        fullWidth
                        label="Paper Width"
                        value={printerWidth}
                        onChange={e => setPrinterWidth(e.target.value)}
                      >
                        <MenuItem value="80">80mm Thermal (3-Inch)</MenuItem>
                        <MenuItem value="58">58mm Thermal (2-Inch)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Role / Purpose</InputLabel>
                      <Select
                        size="small"
                        fullWidth
                        label="Role / Purpose"
                        value={printerRole}
                        onChange={e => setPrinterRole(e.target.value)}
                      >
                        <MenuItem value="receipt">Receipt (Counter)</MenuItem>
                        <MenuItem value="kitchen">Kitchen (KOT)</MenuItem>
                        <MenuItem value="bar">Bar Printer</MenuItem>
                        <MenuItem value="dessert">Dessert Printer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControl fullWidth size="small">
                  <InputLabel>Assigned Print Gateway PC</InputLabel>
                  <Select
                    value={printerDeviceId}
                    label="Assigned Print Gateway PC"
                    onChange={e => setPrinterDeviceId(e.target.value)}
                  >
                    <MenuItem value="">Default / Auto-Assign Gateway</MenuItem>
                    {gatewayDevices.map(d => (
                      <MenuItem key={d.id} value={d.id.toString()}>
                        🖥️ {d.device_name} ({d.status === 'online' ? '🟢 Online' : '⚠️ Offline'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Online / Offline Status</InputLabel>
                  <Select
                    value={printerStatus}
                    label="Online / Offline Status"
                    onChange={e => setPrinterStatus(e.target.value)}
                  >
                    <MenuItem value="online">🟢 Online (Active & Ready to Print)</MenuItem>
                    <MenuItem value="offline">🔴 Offline (Disabled / Maintenance)</MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Select size="small" fullWidth value={printerAutoCut} onChange={e => setPrinterAutoCut(e.target.value)}>
                      <MenuItem value="1">✂️ Auto-Cutter ON</MenuItem>
                      <MenuItem value="0">Disabled</MenuItem>
                    </Select>
                  </Grid>
                  <Grid size={6}>
                    <Select size="small" fullWidth value={printerCashDrawer} onChange={e => setPrinterCashDrawer(e.target.value)}>
                      <MenuItem value="1">💵 Cash Drawer Pulse ON</MenuItem>
                      <MenuItem value="0">Disabled</MenuItem>
                    </Select>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
                  <Button
                    variant={printerDefaultReceipt ? 'contained' : 'outlined'}
                    color="warning"
                    size="small"
                    onClick={() => setPrinterDefaultReceipt(prev => !prev)}
                    sx={{ fontWeight: 800 }}
                  >
                    {printerDefaultReceipt ? '⭐ Set as Default Receipt Printer' : 'Set as Default Receipt Printer'}
                  </Button>
                  <Button
                    variant={printerDefaultKot ? 'contained' : 'outlined'}
                    color="secondary"
                    size="small"
                    onClick={() => setPrinterDefaultKot(prev => !prev)}
                    sx={{ fontWeight: 800 }}
                  >
                    {printerDefaultKot ? '👨‍🍳 Set as Default KOT Printer' : 'Set as Default KOT Printer'}
                  </Button>
                </Box>
              </Box>
            )}

            {dialogType.includes('category') && (
              <>
                <TextField label="Category Name" size="small" fullWidth value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
                <TextField label="Description" size="small" fullWidth value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- ADD / EDIT STAFF DIALOG --- */}
      <Dialog
        open={staffDialogOpen}
        onClose={() => setStaffDialogOpen(false)}
        disableRestoreFocus
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '92vh' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
          {selectedStaff
            ? `Edit Staff User: ${selectedStaff.name || selectedStaff.username}`
            : 'Add Cashier / Staff User'}
        </DialogTitle>
        <form onSubmit={handleSaveStaff}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 2.5 }}>
            {/* Basic Credentials Grid */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Staff Full Name"
                  size="small"
                  fullWidth
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Username"
                  size="small"
                  fullWidth
                  value={staffUsername}
                  onChange={e => setStaffUsername(e.target.value)}
                  placeholder="e.g. cashier1 or rahul_s"
                  disabled={Boolean(selectedStaff)}
                  helperText={selectedStaff ? 'Username cannot be modified after creation' : ''}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Login ID / Email"
                  size="small"
                  fullWidth
                  value={staffEmail}
                  onChange={e => setStaffEmail(e.target.value)}
                  placeholder="e.g. cashier1 or rahul@store.com"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={selectedStaff ? 'Reset Password (Leave blank to keep current)' : 'Password'}
                  type="password"
                  size="small"
                  fullWidth
                  value={staffPassword}
                  onChange={e => setStaffPassword(e.target.value)}
                  required={!selectedStaff}
                  placeholder="Min 6 characters"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={staffRole}
                    label="Role"
                    onChange={e => {
                      const newRole = e.target.value;
                      setStaffRole(newRole);
                      setStaffPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || []);
                    }}
                  >
                    <MenuItem value="cashier">Cashier (POS & Shift Control)</MenuItem>
                    <MenuItem value="salesman">Salesman (Sales Orders & Inventory)</MenuItem>
                    <MenuItem value="warehouse_manager">Warehouse Manager (Godown & Stock Operations)</MenuItem>
                    <MenuItem value="manager">Manager (Reports, Inventory & Finance)</MenuItem>
                    <MenuItem value="admin">Admin (Full Control)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {/* 1. Assigned Store / Warehouse for ALL roles */}
                <FormControl fullWidth size="small">
                  <InputLabel>Assigned Store / Warehouse</InputLabel>
                  <Select
                    value={staffWarehouseId}
                    label="Assigned Store / Warehouse"
                    onChange={e => setStaffWarehouseId(e.target.value)}
                  >
                    <MenuItem value="">🏢 All Outlets & Warehouses (Unrestricted)</MenuItem>
                    {availableWarehouses.map(w => (
                      <MenuItem key={w.id} value={String(w.id)}>
                        {w.name} {w.code ? `(${w.code})` : ''} {w.is_default ? '⭐ (Default)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              💡 <strong>Assigned Store / Warehouse:</strong> Restricting to a specific branch/warehouse enforces data isolation across POS billing, stock levels, orders, and reports.
            </Typography>

            <Divider sx={{ my: 0.5 }} />

            {/* 2. Module Access Checklist */}
            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, p: 2, bgcolor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                    Module & Tab Access Control
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Admin can check/uncheck permissions individually for this user ({staffPermissions.length} modules granted)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setStaffPermissions(ROLE_DEFAULT_PERMISSIONS[staffRole] || [])}
                    sx={{ fontSize: '0.72rem', py: 0.35, px: 1.2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Reset Role Defaults
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      const allKeys = ALL_ADMIN_MODULES.map(m => m.key);
                      setStaffPermissions(staffPermissions.length === allKeys.length ? [] : allKeys);
                    }}
                    sx={{ fontSize: '0.72rem', py: 0.35, px: 1.2, textTransform: 'none', fontWeight: 700 }}
                  >
                    {staffPermissions.length === ALL_ADMIN_MODULES.length ? 'Clear All' : 'Select All'}
                  </Button>
                </Box>
              </Box>

              {/* Categorized Permission Checklists */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {MODULE_CATEGORIES.map(cat => {
                  const catItems = ALL_ADMIN_MODULES.filter(m => m.category === cat.name);
                  if (catItems.length === 0) return null;
                  const enabledCount = catItems.filter(m => staffPermissions.includes(m.key)).length;

                  return (
                    <Box key={cat.name} sx={{ bgcolor: '#ffffff', p: 1.5, borderRadius: 2, border: '1px solid #edf2f7' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: cat.color, letterSpacing: 0.5 }}>
                          {cat.name}
                        </Typography>
                        <Chip
                          label={`${enabledCount}/${catItems.length}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: enabledCount > 0 ? `${cat.color}15` : '#edf2f7', color: enabledCount > 0 ? cat.color : '#a0aec0' }}
                        />
                      </Box>
                      <Grid container spacing={1}>
                        {catItems.map(item => {
                          const isChecked = staffPermissions.includes(item.key);
                          return (
                            <Grid size={{ xs: 12, sm: 6 }} key={item.key}>
                              <Paper
                                variant="outlined"
                                onClick={() => {
                                  if (isChecked) {
                                    setStaffPermissions(prev => prev.filter(k => k !== item.key));
                                  } else {
                                    setStaffPermissions(prev => [...prev, item.key]);
                                  }
                                }}
                                sx={{
                                  p: 1,
                                  borderRadius: 1.5,
                                  cursor: 'pointer',
                                  bgcolor: isChecked ? `${cat.color}08` : '#ffffff',
                                  borderColor: isChecked ? cat.color : '#e2e8f0',
                                  transition: 'all 0.15s ease',
                                  '&:hover': { borderColor: cat.color }
                                }}
                              >
                                <FormControlLabel
                                  sx={{ m: 0, width: '100%', alignItems: 'flex-start', pointerEvents: 'none' }}
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={isChecked}
                                      sx={{ p: 0.5, mr: 0.5, color: isChecked ? cat.color : undefined, '&.Mui-checked': { color: cat.color } }}
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                        {item.label}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block', lineHeight: 1.15, mt: 0.25 }}>
                                        {item.desc}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {selectedStaff && (
              <FormControlLabel
                control={
                  <Switch
                    checked={staffActive}
                    onChange={e => setStaffActive(e.target.checked)}
                    color="success"
                  />
                }
                label={staffActive ? 'Account Active' : 'Account Suspended'}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedStaff ? 'Save Changes' : 'Create Staff User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* HISTORY ORDER DETAIL DIALOG */}
      <Dialog
        open={historyOrderDetailOpen}
        onClose={() => setHistoryOrderDetailOpen(false)}
        disableRestoreFocus
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Order details: {selectedHistoryOrder?.order?.unique_order_number}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {selectedHistoryOrder && (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, fontSize: 13 }}>
                <Box>Cashier: <b>{selectedHistoryOrder.order.cashier_name}</b></Box>
                <Box>Date: <b>{new Date(selectedHistoryOrder.order.created_at).toLocaleString()}</b></Box>
                <Box>Payment: <b style={{ textTransform: 'uppercase' }}>{selectedHistoryOrder.order.payment_mode}</b></Box>
                <Box>Status: <b>{selectedHistoryOrder.order.order_status.toUpperCase()}</b></Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Items List:</Typography>
                {selectedHistoryOrder.items.map(it => (
                  <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 0.6, borderBottom: '1px dashed', borderColor: 'divider', fontSize: 13 }}>
                    <Box sx={{ pr: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.name} (GST {parseFloat(it.gst_rate || 0)}%) x {it.quantity}</Typography>
                      {it.serial_number && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#9333ea', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'rgba(147, 51, 234, 0.08)', border: '1px solid rgba(147, 51, 234, 0.25)', px: 0.75, py: 0.2, borderRadius: 1, mt: 0.3 }}>
                          <Tag size={11} /> SN: {it.serial_number}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Rs. {(parseFloat(it.price) * it.quantity).toFixed(2)}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2, mt: 1, fontSize: 13 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <span>Subtotal</span>
                  <b>Rs. {parseFloat(selectedHistoryOrder.order.subtotal).toFixed(2)}</b>
                </Box>
                {selectedHistoryOrder.order.tax_type === 'inter' ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <span>IGST</span>
                    <b>Rs. {parseFloat(selectedHistoryOrder.order.tax_amount).toFixed(2)}</b>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <span>CGST</span>
                      <b>Rs. {(parseFloat(selectedHistoryOrder.order.tax_amount || 0) / 2).toFixed(2)}</b>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <span>SGST</span>
                      <b>Rs. {(parseFloat(selectedHistoryOrder.order.tax_amount || 0) / 2).toFixed(2)}</b>
                    </Box>
                  </>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: 'warning.main' }}>
                  <span>Discount ({selectedHistoryOrder.order.discount_type === 'percentage' ? `${selectedHistoryOrder.order.discount_value}%` : 'Amt'})</span>
                  <b>-Rs. {parseFloat(selectedHistoryOrder.order.discount_amount).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed', borderColor: 'divider', color: 'primary.main', fontWeight: 'bold' }}>
                  <span>Total Amount Paid</span>
                  <b>Rs. {parseFloat(selectedHistoryOrder.order.total_amount).toFixed(2)}</b>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          {selectedHistoryOrder && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  try {
                    const htmlReceipt = generateLocalHtmlReceipt(selectedHistoryOrder.order, selectedHistoryOrder.items, user || {}, receiptSettings);
                    printHtmlSilentlyViaIframe(htmlReceipt);
                    notify.success('Bill receipt sent to printer.', 'Print Receipt');
                  } catch (err) {
                    notify.error('Failed to generate receipt.', 'Print Error');
                  }
                }}
                sx={{ fontWeight: 800, textTransform: 'none' }}
                startIcon={<Printer size={16} />}
              >
                Print Receipt
              </Button>
              <Button
                variant="outlined"
                color="success"
                onClick={() => {
                  const phone = selectedHistoryOrder.order.customer_phone || prompt('Enter customer 10-digit WhatsApp phone number:');
                  if (phone) {
                    openWhatsAppShare(selectedHistoryOrder, receiptSettings, phone);
                  }
                }}
                sx={{ fontWeight: 800, textTransform: 'none' }}
                startIcon={<Smartphone size={16} />}
              >
                Share via WhatsApp
              </Button>
            </Box>
          )}
          <Button onClick={() => setHistoryOrderDetailOpen(false)} variant="contained" color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* --- ITEM SALES HISTORY MODAL --- */}
      <Dialog open={itemHistoryModalOpen} onClose={() => setItemHistoryModalOpen(false)} disableRestoreFocus maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider' }}>
          Sales History: {selectedReportItem?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {loadingItemHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : itemHistoryData.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No sales transaction history found for this item in the selected period.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Cashier</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Payment</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Unit Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Item Total</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemHistoryData.map((order, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{order.unique_order_number}</TableCell>
                      <TableCell>{order.cashier_name || 'Cashier'}</TableCell>
                      <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>{order.payment_mode}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>{order.quantity}</TableCell>
                      <TableCell align="right">Rs. {parseFloat(order.price || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Rs. {parseFloat(order.total_item_amount || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setItemHistoryModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* --- ADJUST STOCK MODAL --- */}
      <Dialog open={adjustStockModalOpen} onClose={() => setAdjustStockModalOpen(false)} disableRestoreFocus maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider' }}>
          Adjust Stock: {selectedStockItem?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          {/* Barcode image thumbnail in Adjust Stock modal */}
          {selectedStockItem?.barcode_image_url && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <img
                src={selectedStockItem.barcode_image_url}
                alt="Barcode"
                style={{ height: 40, maxWidth: 100, objectFit: 'contain', borderRadius: 4 }}
              />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.secondary' }}>Barcode</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{selectedStockItem.sku || selectedStockItem.barcode || ''}</Typography>
              </Box>
            </Box>
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Adjustment Action</InputLabel>
            <Select
              value={adjustmentType}
              label="Adjustment Action"
              onChange={e => setAdjustmentType(e.target.value)}
            >
              <MenuItem value="add">Add Stock (+ Quantity)</MenuItem>
              <MenuItem value="reduce">Reduce Stock (- Quantity)</MenuItem>
              <MenuItem value="set">Set Exact Stock (= Quantity)</MenuItem>
            </Select>
          </FormControl>

          <Grid container spacing={1.5}>
            <Grid size={7}>
              <TextField
                label="Quantity"
                type="number"
                size="small"
                fullWidth
                value={adjustQuantity}
                onChange={e => setAdjustQuantity(e.target.value)}
              />
            </Grid>
            <Grid size={5}>
              <TextField
                label="Unit"
                size="small"
                fullWidth
                placeholder="pcs, kg, litre..."
                value={adjustUnit}
                onChange={e => setAdjustUnit(e.target.value)}
              />
            </Grid>
          </Grid>

          <TextField
            label="Low Stock Alert Threshold"
            type="number"
            size="small"
            fullWidth
            value={adjustThreshold}
            onChange={e => setAdjustThreshold(e.target.value)}
            helperText="Notify when current stock falls below this number."
          />

          <TextField
            label="Reason / Notes"
            size="small"
            fullWidth
            placeholder="e.g. Restock shipment, Damaged items, Audit..."
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdjustStockModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveStockAdjustment} disabled={savingStockAdjust} sx={{ fontWeight: 800 }}>
            {savingStockAdjust ? 'Saving...' : 'Save Stock Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- STOCK AUDIT LOG MODAL --- */}
      <Dialog open={stockLogsModalOpen} onClose={() => setStockLogsModalOpen(false)} disableRestoreFocus maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider' }}>
          Stock Adjustment Audit Trail {selectedStockLogItem ? `: ${selectedStockLogItem.name}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {loadingStockLogs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : stockLogsData.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No stock adjustment logs recorded yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Change Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Stock Transition</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Reason / Ref</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockLogsData.map((log, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{log.item_name}</TableCell>
                      <TableCell>
                        {log.adjustment_type === 'add' ? (
                          <Chip label="Add (+)" color="success" size="small" sx={{ fontWeight: 700 }} />
                        ) : log.adjustment_type === 'reduce' ? (
                          <Chip label="Reduce (-)" color="warning" size="small" sx={{ fontWeight: 700 }} />
                        ) : log.adjustment_type === 'set' ? (
                          <Chip label="Set (=)" color="info" size="small" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Chip label="Sale" color="default" size="small" sx={{ fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{log.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.85rem' }}>
                        {log.previous_stock} → <strong>{log.new_stock}</strong>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{log.reason || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{log.user_name || 'System'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStockLogsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Menu & Category Bulk Import Modal */}
      <MenuBulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => {
          fetchMenuItems();
          fetchCategories();
        }}
        token={token}
      />

      {/* Product Barcode Sticker Designer & Printing Modal */}
      <ProductStickerModal
        open={stickerModalOpen}
        onClose={() => setStickerModalOpen(false)}
        items={stickerModalItems}
        shopData={receiptSettings}
        initialPreviewMode={stickerPreviewMode}
      />

      {/* --- BARCODE SCANNER MODAL --- */}
      <Dialog
        open={barcodeScanModalOpen}
        onClose={() => {
          setBarcodeScanModalOpen(false);
          if (barcodeScanStream) {
            barcodeScanStream.getTracks().forEach(t => t.stop());
            setBarcodeScanStream(null);
          }
          if (barcodeReaderRef.current) {
            clearInterval(barcodeReaderRef.current);
            barcodeReaderRef.current = null;
          }
          setBarcodeScanError('');
        }}
        maxWidth="xs"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={20} /> Scan Barcode / QR Code</span>
          <IconButton onClick={() => {
            setBarcodeScanModalOpen(false);
            if (barcodeScanStream) { barcodeScanStream.getTracks().forEach(t => t.stop()); setBarcodeScanStream(null); }
            if (barcodeReaderRef.current) { clearInterval(barcodeReaderRef.current); barcodeReaderRef.current = null; }
            setBarcodeScanError('');
          }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {barcodeScanError && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>{barcodeScanError}</Alert>
          )}
          <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8rem' }}>
            Point the camera at the product barcode. Once detected, the code is auto-filled in the SKU field.
          </Alert>

          {/* Camera viewport */}
          <Box sx={{ position: 'relative', bgcolor: '#0f172a', borderRadius: 2, overflow: 'hidden', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={barcodeScanVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', borderRadius: 8, display: 'block', maxHeight: 280 }}
            />
            {/* scanning crosshair overlay */}
            <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 180, height: 80, border: '2px solid #22d3ee', borderRadius: 2,
              pointerEvents: 'none',
              '&::before, &::after': {
                content: '""', position: 'absolute', width: 20, height: 20
              }
            }} />
            <canvas ref={barcodeScanCanvasRef} style={{ display: 'none' }} />
          </Box>

          <Button
            variant="contained"
            fullWidth
            id="start-camera-scan-btn"
            sx={{ fontWeight: 800, borderRadius: 2 }}
            onClick={async () => {
              setBarcodeScanError('');
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setBarcodeScanStream(stream);
                if (barcodeScanVideoRef.current) {
                  barcodeScanVideoRef.current.srcObject = stream;
                  barcodeScanVideoRef.current.play();
                }

                // Use BarcodeDetector if available
                if ('BarcodeDetector' in window) {
                  const detector = new window.BarcodeDetector();
                  const intervalId = setInterval(async () => {
                    if (!barcodeScanVideoRef.current || barcodeScanVideoRef.current.readyState < 2) return;
                    try {
                      const barcodes = await detector.detect(barcodeScanVideoRef.current);
                      if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        clearInterval(intervalId);
                        barcodeReaderRef.current = null;
                        stream.getTracks().forEach(t => t.stop());
                        setBarcodeScanStream(null);

                        // Capture snapshot from video
                        const canvas = barcodeScanCanvasRef.current;
                        const video = barcodeScanVideoRef.current;
                        if (canvas && video) {
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                          canvas.getContext('2d').drawImage(video, 0, 0);
                          const imgDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                          setMenuBarcodeImageUrl(imgDataUrl);
                        }

                        setMenuBarcode(code);
                        setBarcodeScanModalOpen(false);

                        // Duplicate check after scan
                        try {
                          const excludeId = dialogType === 'edit_menu' && selectedEntity?.id ? selectedEntity.id : undefined;
                          const qp = excludeId ? `?barcode=${encodeURIComponent(code)}&exclude_id=${excludeId}` : `?barcode=${encodeURIComponent(code)}`;
                          const r = await apiFetch(`/api/menu/check-barcode${qp}`);
                          const d = await r.json();
                          if (d.duplicate) setBarcodeDuplicate(d.existing_item);
                        } catch (_) {}
                      }
                    } catch (_) {}
                  }, 300);
                  barcodeReaderRef.current = intervalId;
                } else {
                  setBarcodeScanError('Live barcode detection is not supported in this browser. Please type the code manually below.');
                }
              } catch (err) {
                setBarcodeScanError('Camera access denied or unavailable. Please allow camera permission and try again.');
              }
            }}
          >
            Start Camera
          </Button>

          <Divider><Typography variant="caption" color="text.secondary">OR ENTER MANUALLY</Typography></Divider>

          {/* Manual barcode entry */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Type or paste barcode"
              id="manual-barcode-input"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const code = e.target.value.trim();
                  setMenuBarcode(code);
                  setBarcodeScanModalOpen(false);
                  if (barcodeScanStream) { barcodeScanStream.getTracks().forEach(t => t.stop()); setBarcodeScanStream(null); }
                }
              }}
            />
            <Button
              variant="outlined"
              sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
              onClick={() => {
                const input = document.getElementById('manual-barcode-input');
                if (input && input.value.trim()) {
                  setMenuBarcode(input.value.trim());
                  setBarcodeScanModalOpen(false);
                  if (barcodeScanStream) { barcodeScanStream.getTracks().forEach(t => t.stop()); setBarcodeScanStream(null); }
                }
              }}
            >
              Use Code
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Sales Order Creation & Edit Modal */}
      <SalesOrderModal
        open={salesOrderModalOpen}
        onClose={() => {
          setSalesOrderModalOpen(false);
          setSalesOrderModalEditOrder(null);
          setSalesOrderModalInitialParty(null);
        }}
        onSaved={() => {
          fetchData();
        }}
        editOrder={salesOrderModalEditOrder}
        initialParty={salesOrderModalInitialParty}
        staffUsers={staffUsers}
        menuItems={menuItems}
        categories={categories}
      />

      {/* Sales Order Voucher Preview Modal */}
      <SalesOrderVoucherModal
        open={salesOrderVoucherOpen}
        onClose={() => {
          setSalesOrderVoucherOpen(false);
          setSalesOrderVoucherOrder(null);
        }}
        order={salesOrderVoucherOrder}
        onEdit={(ord) => {
          setSalesOrderVoucherOpen(false);
          setSalesOrderModalInitialParty(null);
          setSalesOrderModalEditOrder(ord);
          setSalesOrderModalOpen(true);
        }}
        onConverted={() => {
          fetchData();
        }}
        storeProfile={{
          store_name: receiptSettings?.restaurant_name || user?.restaurant_name || 'Ariso Retail',
          address: receiptSettings?.address || '',
          phone: receiptSettings?.phone || '',
          gst_number: receiptSettings?.gst_number || ''
        }}
      />

      {/* 3-Dot Actions Menu for Sales Order Row */}
      <Menu
        anchorEl={salesOrderMenuAnchor}
        open={Boolean(salesOrderMenuAnchor)}
        onClose={() => { setSalesOrderMenuAnchor(null); setSalesOrderMenuOrder(null); }}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 190 } } }}
      >
        {salesOrderMenuOrder?.is_estimate === 1 && (
          <MenuItem
            onClick={async () => {
              const targetOrder = salesOrderMenuOrder;
              setSalesOrderMenuAnchor(null);
              setSalesOrderMenuOrder(null);
              if (!window.confirm(`Convert Estimate #${targetOrder.unique_order_number || targetOrder.id} to Sales Order?\nThis will reserve warehouse inventory and assign an official SO number.`)) return;
              try {
                const res = await apiFetch(`/api/orders/${targetOrder.id}/convert-estimate`, { method: 'POST' });
                if (res.ok) {
                  const d = await res.json();
                  notify.success(`Converted to Sales Order #${d.salesOrderNumber}! Stock reserved.`, 'Success');
                  fetchData();
                } else {
                  const err = await res.json();
                  notify.error(err.error || 'Failed to convert estimate.', 'Error');
                }
              } catch (err) {
                notify.error(err.message || 'Failed to convert estimate.', 'Error');
              }
            }}
            sx={{ fontWeight: 700, color: '#7c3aed' }}
          >
            <ShoppingCart size={16} style={{ marginRight: 8 }} /> Convert to Sales Order
          </MenuItem>
        )}
        {salesOrderMenuOrder?.order_status === 'pending' && !salesOrderMenuOrder?.is_estimate && (
          <MenuItem
            onClick={async () => {
              const targetOrder = salesOrderMenuOrder;
              setSalesOrderMenuAnchor(null);
              setSalesOrderMenuOrder(null);
              try {
                const res = await apiFetch(`/api/orders/${targetOrder.id}`);
                if (res.ok) {
                  const fullOrder = await res.json();
                  setSalesOrderVoucherOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
                } else {
                  setSalesOrderVoucherOrder(targetOrder);
                }
              } catch (e) {
                setSalesOrderVoucherOrder(targetOrder);
              }
              setSalesOrderVoucherOpen(true);
            }}
            sx={{ fontWeight: 700, color: '#16a34a' }}
          >
            <CheckCircle size={16} style={{ marginRight: 8 }} /> Convert / Invoice Options
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const targetOrder = salesOrderMenuOrder;
            setSalesOrderMenuAnchor(null);
            setSalesOrderEmailRecipient(targetOrder?.customer_email || '');
            setSalesOrderEmailDialogOpen(true);
          }}
          sx={{ fontWeight: 600 }}
        >
          <Mail size={16} style={{ marginRight: 8 }} /> Share via Email
        </MenuItem>
        <MenuItem
          onClick={async () => {
            const targetOrder = salesOrderMenuOrder;
            setSalesOrderMenuAnchor(null);
            setSalesOrderMenuOrder(null);
            try {
              const res = await apiFetch(`/api/orders/${targetOrder.id}`);
              if (res.ok) {
                const fullOrder = await res.json();
                setSalesOrderVoucherOrder(fullOrder.order ? { ...fullOrder.order, items: fullOrder.items } : fullOrder);
              } else {
                setSalesOrderVoucherOrder(targetOrder);
              }
            } catch (e) {
              setSalesOrderVoucherOrder(targetOrder);
            }
            setSalesOrderVoucherOpen(true);
          }}
          sx={{ fontWeight: 600 }}
        >
          <Printer size={16} style={{ marginRight: 8 }} /> Print Voucher
        </MenuItem>
      </Menu>

      {/* Email Share Dialog */}
      <Dialog
        open={salesOrderEmailDialogOpen}
        onClose={() => setSalesOrderEmailDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Share Sales Order via Email</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Send Sales Order #{salesOrderMenuOrder?.unique_order_number || salesOrderMenuOrder?.id} voucher to recipient email.
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="email"
            label="Recipient Email *"
            placeholder="client@example.com"
            value={salesOrderEmailRecipient}
            onChange={e => setSalesOrderEmailRecipient(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSalesOrderEmailDialogOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            disabled={salesOrderEmailSending}
            onClick={async () => {
              if (!salesOrderEmailRecipient.trim() || !salesOrderEmailRecipient.includes('@')) {
                notify.error('Please enter a valid email address.', 'Validation');
                return;
              }
              setSalesOrderEmailSending(true);
              try {
                const res = await apiFetch(`/api/orders/${salesOrderMenuOrder.id}/send-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ recipient_email: salesOrderEmailRecipient.trim() })
                });
                if (res.ok) {
                  notify.success(`Voucher dispatched to ${salesOrderEmailRecipient.trim()}!`, 'Email Sent');
                  setSalesOrderEmailDialogOpen(false);
                  setSalesOrderEmailRecipient('');
                } else {
                  const err = await res.json();
                  notify.error(err.error || 'Failed to send email.', 'Error');
                }
              } catch (e) {
                notify.error(e.message || 'Failed to send email.', 'Error');
              } finally {
                setSalesOrderEmailSending(false);
              }
            }}
            sx={{ fontWeight: 700 }}
          >
            {salesOrderEmailSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GST Credit Note / Sales Return Modal */}
      <CreditNoteModal
        open={creditNoteModalOpen}
        onClose={() => {
          setCreditNoteModalOpen(false);
          setSelectedOrderForCreditNote(null);
        }}
        order={selectedOrderForCreditNote}
        onSuccess={() => {
          fetchHistoryOrders();
        }}
      />

        </Container>
      </Box>
    </Box>
  );
}
