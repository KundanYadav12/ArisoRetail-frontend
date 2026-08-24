import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Button, TextField, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, useMediaQuery, IconButton, CircularProgress, Checkbox, TablePagination, InputAdornment, TableSortLabel, Tooltip, FormControl, InputLabel, Badge, Switch, FormControlLabel, Divider, Alert } from '@mui/material';
import { Plus, Edit2, Trash2, Shield, Settings, FileText, Wifi, List, RefreshCw, Download, Layers, GripVertical, Search, X, Filter, ArrowUpDown, CheckSquare, Square, Utensils, CheckCircle, XCircle, Printer, Users, UserPlus, Key, ArrowUp, ArrowDown, Boxes, Package, AlertTriangle, TrendingUp, History, FileSpreadsheet, Save, Upload, Image as ImageIcon, Store } from 'lucide-react';
import { apiFetch, getApiUrl, downloadFile } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import DateRangePicker from '../components/DateRangePicker';
import GstSlabReport from '../components/GstSlabReport';
import MenuBulkImportModal from '../components/MenuBulkImportModal';
import { openWhatsAppShare } from '../utils/whatsappHelper';

export default function AdminPanel({ token }) {
  const { notify, confirmDialog } = useNotify();
  const [activeTab, setActiveTab] = useState(0); // 0 = menu, 1 = categories, 2 = printers, 3 = reports, 4 = receipt settings, 5 = staff
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
  const [menuSku, setMenuSku] = useState('');
  const [menuDesc, setMenuDesc] = useState('');
  const [menuImageUrl, setMenuImageUrl] = useState('');
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuPrinterId, setMenuPrinterId] = useState('');

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
  
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [draggedCategoryIdx, setDraggedCategoryIdx] = useState(null);

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
    header_message: 'Welcome to Our Restaurant!',
    footer_message: 'Visit us again soon.',
    thank_you_message: 'Thank You! Visit Again.',
    terms_conditions: 'Goods once sold cannot be returned.',
    paper_size: '80mm',
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
    show_kot_time: 1
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

      const formattedUrl = data.logo_url ? getApiUrl(data.logo_url) : data.logo_url;
      setReceiptSettings(prev => ({ ...prev, logo_url: formattedUrl }));
      notify.success('Restaurant logo uploaded successfully!', 'Logo Uploaded');
    } catch (err) {
      console.error('[Logo Upload Error]', err);
      notify.error(err.message || 'Failed to upload logo image.', 'Upload Error');
    } finally {
      setUploadingLogo(false);
    }
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
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(20);
  
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
  const [historyOrderDetailOpen, setHistoryOrderDetailOpen] = useState(false);

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
  }, [activeTab, reportPreset, reportDateFrom, reportDateTo, historySearch, historyCashier, historyPaymentMode, historyStatus, historyDateFrom, historyDateTo, historyPage, historyLimit, itemReportPreset, itemReportDateFrom, itemReportDateTo, itemReportCategory, itemReportSearch, itemReportSortBy, itemReportSortOrder, stockCategoryFilter, stockStatusFilter, stockSearch]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Always fetch latest receipt & GST settings from DB on mount/tab change to guarantee persistence
      const settingsRes = await apiFetch('/api/settings/receipt');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setReceiptSettings(settingsData);
        setWorkflowDraft(buildWorkflowDraft(settingsData));
        setPermissionsDraft(buildPermissionsDraft(settingsData));
      }

      if (activeTab === 0) {
        const catRes = await apiFetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData : []);
        } else {
          setCategories([]);
        }

        const menuRes = await apiFetch('/api/menu');
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenuItems(Array.isArray(menuData) ? menuData : []);
        } else {
          const menuErr = await menuRes.json();
          setError(menuErr.error || 'Failed to fetch menu items.');
          setMenuItems([]);
        }

        const printRes = await apiFetch('/api/printers');
        if (printRes.ok) {
          const printData = await printRes.json();
          setPrinters(Array.isArray(printData) ? printData : []);
        } else {
          setPrinters([]);
        }
      } else if (activeTab === 1) {
        const catRes = await apiFetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData : []);
        } else {
          setCategories([]);
        }
      } else if (activeTab === 2) {
        const printRes = await apiFetch('/api/printers');
        if (printRes.ok) {
          const printData = await printRes.json();
          setPrinters(Array.isArray(printData) ? printData : []);
        } else {
          setPrinters([]);
        }

        const devRes = await apiFetch('/api/agent/devices');
        if (devRes.ok) {
          const devData = await devRes.json();
          setGatewayDevices(Array.isArray(devData) ? devData : []);
        } else {
          setGatewayDevices([]);
        }
      } else if (activeTab === 3) {
        let url = '/api/reports/admin';
        const params = [];
        let from = reportDateFrom;
        let to = reportDateTo;
        
        if (reportPreset === 'today') {
          const d = new Date().toISOString().slice(0, 10);
          from = `${d} 00:00:00`;
          to = `${d} 23:59:59`;
        } else if (reportPreset === 'yesterday') {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          const dStr = d.toISOString().slice(0, 10);
          from = `${dStr} 00:00:00`;
          to = `${dStr} 23:59:59`;
        } else if (reportPreset === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else if (reportPreset === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        
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
        let from = itemReportDateFrom;
        let to = itemReportDateTo;

        if (itemReportPreset === 'today') {
          const d = new Date().toISOString().slice(0, 10);
          from = `${d} 00:00:00`;
          to = `${d} 23:59:59`;
        } else if (itemReportPreset === 'yesterday') {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          const dStr = d.toISOString().slice(0, 10);
          from = `${dStr} 00:00:00`;
          to = `${dStr} 23:59:59`;
        } else if (itemReportPreset === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else if (itemReportPreset === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

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
      } else if (activeTab === 6) {
        const settingsRes = await apiFetch('/api/settings/receipt');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setReceiptSettings(settingsData);
          setWorkflowDraft(buildWorkflowDraft(settingsData));
          setPermissionsDraft(buildPermissionsDraft(settingsData));
        }
      } else if (activeTab === 7) {
        const usersRes = await apiFetch('/api/auth/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setStaffUsers(Array.isArray(usersData) ? usersData : []);
        } else {
          setStaffUsers([]);
        }
      } else if (activeTab === 8) {
        let from = historyDateFrom;
        let to = historyDateTo;

        if (historyPreset === 'today') {
          const d = new Date().toISOString().slice(0, 10);
          from = `${d} 00:00:00`;
          to = `${d} 23:59:59`;
        } else if (historyPreset === 'yesterday') {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          const dStr = d.toISOString().slice(0, 10);
          from = `${dStr} 00:00:00`;
          to = `${dStr} 23:59:59`;
        } else if (historyPreset === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else if (historyPreset === '15days') {
          const d = new Date();
          d.setDate(d.getDate() - 15);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else if (historyPreset === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          from = d.toISOString().slice(0, 19).replace('T', ' ');
          to = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        let url = `/api/orders/history/list?page=${historyPage + 1}&limit=${historyLimit}&offset=${historyPage * historyLimit}`;
        if (historySearch) url += `&search=${encodeURIComponent(historySearch)}`;
        if (historyCashier !== 'all') url += `&cashier_id=${historyCashier}`;
        if (historyPaymentMode !== 'all') url += `&payment_mode=${historyPaymentMode}`;
        if (historyStatus !== 'all') url += `&order_status=${historyStatus}`;
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
      let from = itemReportDateFrom;
      let to = itemReportDateTo;
      if (itemReportPreset === 'today') {
        const d = new Date().toISOString().slice(0, 10);
        from = `${d} 00:00:00`;
        to = `${d} 23:59:59`;
      } else if (itemReportPreset === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const dStr = d.toISOString().slice(0, 10);
        from = `${dStr} 00:00:00`;
        to = `${dStr} 23:59:59`;
      } else if (itemReportPreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        from = d.toISOString().slice(0, 19).replace('T', ' ');
        to = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

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
    setStaffDialogOpen(true);
  };

  const handleOpenEditStaff = (user) => {
    setSelectedStaff(user);
    setStaffName(user.name || '');
    setStaffUsername(user.username || '');
    setStaffEmail(user.email || '');
    setStaffPassword(''); // Leave empty unless resetting password
    setStaffRole(user.role || 'cashier');
    setStaffActive(Boolean(user.is_active));
    setStaffDialogOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffUsername) {
      notify.error('Name and Username are required.', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      if (selectedStaff) {
        // Edit Staff User
        const payload = {
          name: staffName,
          email: staffEmail,
          role: staffRole,
          is_active: staffActive ? 1 : 0
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
        if (!staffPassword || staffPassword.length < 6) {
          notify.error('Password must be at least 6 characters long.', 'Validation Error');
          setLoading(false);
          return;
        }

        const res = await apiFetch('/api/auth/users', {
          method: 'POST',
          body: {
            name: staffName,
            username: staffUsername,
            email: staffEmail,
            password: staffPassword,
            role: staffRole
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Failed to create staff user.');

        notify.success(`Staff user "${staffName}" created successfully. Credentials active.`, 'Staff Created');
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
            logo_url: receiptSettings.logo_url,
            address: receiptSettings.address,
            phone: receiptSettings.phone,
            email: receiptSettings.email,
            gst_number: receiptSettings.gst_number
          }
        });
      } catch (pe) {
        console.warn('[Profile Sync Warning]', pe);
      }

      if (res.ok) {
        const data = await res.json();
        const updated = data.settings || data;
        setReceiptSettings(updated);
        setWorkflowDraft(buildWorkflowDraft(updated));
        setPermissionsDraft(buildPermissionsDraft(updated));

        // Update local session & header identity
        const currentUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
        currentUser.restaurant_name = receiptSettings.restaurant_name;
        currentUser.restaurant_logo_url = receiptSettings.logo_url;
        localStorage.setItem('pos_user', JSON.stringify(currentUser));
        window.dispatchEvent(new CustomEvent('auth_token_refreshed', { detail: { user: currentUser } }));

        notify.success('🏪 Restaurant Profile & Receipt settings saved successfully.', 'Settings Saved');
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save settings.', 'Error');
      }
    } catch (err) {
      notify.error('Failed to save receipt settings.', 'Error');
    } finally {
      setSavingReceiptSettings(false);
    }
  };

  const handleTestPrint = async (type) => {
    setTestingPrint(true);
    try {
      const res = await apiFetch('/api/settings/receipt/test-print', {
        method: 'POST',
        body: { print_type: type }
      });
      const data = await res.json();
      if (res.ok) {
        notify.success(data.message, 'Test Print Successful', 4000);
      } else {
        notify.error(data.error || 'Failed to execute test print.', 'Printer Error');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to execute test print.', 'Printer Error');
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
    setMenuSku('');
    setMenuDesc('');
    setMenuImageUrl('');
    setMenuImageFile(null);
    setMenuPrinterId('');
    setDialogOpen(true);
  };

  const handleOpenEditMenu = (item) => {
    setDialogType('edit_menu');
    setSelectedEntity(item);
    setMenuName(item.name);
    setMenuPrice(item.price);
    setMenuCategoryId(item.category_id.toString());
    setMenuVeg(item.is_veg.toString());
    setMenuSpicy(item.spicy_level.toString());
    setMenuAvailable(item.is_available.toString());
    setMenuSku(item.sku || '');
    setMenuDesc(item.description || '');
    setMenuImageUrl(item.image_url || '');
    setMenuImageFile(null);
    setMenuPrinterId(item.printer_id ? item.printer_id.toString() : '');
    setDialogOpen(true);
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', menuName);
    formData.append('price', menuPrice);
    formData.append('gst_rate', menuGst);
    formData.append('category_id', menuCategoryId);
    formData.append('is_veg', menuVeg);
    formData.append('spicy_level', menuSpicy);
    formData.append('is_available', menuAvailable);
    formData.append('sku', menuSku);
    formData.append('description', menuDesc);
    if (menuPrinterId) formData.append('printer_id', menuPrinterId);

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
    setPrinterType('lan');
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
    setDialogOpen(true);
  };

  const handleOpenEditPrinter = (printer) => {
    setDialogType('edit_printer');
    setSelectedEntity(printer);
    setPrinterName(printer.name || '');
    setPrinterType(printer.type || 'lan');
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
    const payload = {
      name: printerName,
      type: printerType,
      ip_address: printerType === 'bluetooth' ? null : printerIp,
      bluetooth_address: printerType === 'bluetooth' ? printerBluetoothAddress : null,
      port: printerType === 'bluetooth' ? null : parseInt(printerPort || 9100),
      paper_width: printerWidth,
      role: printerRole,
      auto_cut: parseInt(printerAutoCut),
      cash_drawer: parseInt(printerCashDrawer),
      is_default_receipt: printerDefaultReceipt,
      is_default_kot: printerDefaultKot,
      status: printerStatus,
      device_id: printerType === 'bluetooth' ? null : (printerDeviceId ? parseInt(printerDeviceId) : null)
    };

    try {
      const isEdit = dialogType === 'edit_printer' && selectedEntity;
      const url = isEdit ? `/api/printers/${selectedEntity.id}` : '/api/printers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: payload
      });
      if (!response.ok) throw new Error('Save printer configuration failed.');
      notify.success('Printer configuration saved successfully.', 'Printer Saved');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      notify.error(err.message, 'Printer Error');
    }
  };

  const handleDeletePrinter = async (id) => {
    const isConfirmed = await confirmDialog({
      title: 'Delete Printer Configuration',
      message: 'Are you sure you want to delete this thermal printer setup?',
      confirmText: 'Delete Printer',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      await apiFetch(`/api/printers/${id}`, {
        method: 'DELETE'
      });
      notify.success('Printer configuration deleted.', 'Printer Removed');
      fetchData();
    } catch (err) {
      notify.error('Failed to delete printer configuration.', 'Delete Error');
    }
  };

  const handleTestPrinter = async (printer) => {
    try {
      const response = await apiFetch('/api/printers/test', {
        method: 'POST',
        body: { ip_address: printer.ip_address, port: printer.port }
      });
      const data = await response.json();
      if (response.ok) {
        notify.success(`Printer "${printer.name}" socket (${printer.ip_address}:${printer.port}) is ONLINE and ready.`, 'Socket Test Success');
      } else {
        notify.error(`Connection Test Failed: ${data.error}`, 'Socket Offline');
      }
    } catch (err) {
      notify.error('Failed to connect to printer TCP socket.', 'Network Error');
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
    <Box ref={scrollRef} onScroll={handleScroll} sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
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
        {/* Sticky Unified Horizontal Tab Navigation Bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: 'background.paper',
            width: '100%',
            pt: { xs: 1, md: 1.5 },
            pb: 0.5,
            boxShadow: isScrolled ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
            transition: 'box-shadow 0.2s ease-in-out',
            borderBottom: 1,
            borderColor: 'divider',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: { xs: 24, md: 0 },
              pointerEvents: 'none',
              background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.95))',
              zIndex: 2
            }
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTabs-scrollableX': {
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x proximity'
              },
              '& .MuiTab-root': {
                fontWeight: 800,
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                textTransform: 'none',
                minHeight: 48,
                px: { xs: 2, md: 3 },
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: 'rgba(249, 115, 22, 0.04)'
                }
              }
            }}
          >
            <Tab icon={<List size={18} />} iconPosition="start" label="Menu Items" />
            <Tab icon={<Layers size={18} />} iconPosition="start" label="Categories" />
            <Tab icon={<Wifi size={18} />} iconPosition="start" label="Printers" />
            <Tab icon={<FileText size={18} />} iconPosition="start" label="Sales Reports" />
            <Tab icon={<Utensils size={18} />} iconPosition="start" label="Item Sales Report" />
            <Tab icon={<Boxes size={18} />} iconPosition="start" label="Stock Report" />
            <Tab icon={<FileSpreadsheet size={18} />} iconPosition="start" label="GST Slab Report (CA)" />
            <Tab icon={<Settings size={18} />} iconPosition="start" label="Receipt & KOT Settings" />
            <Tab icon={<Store size={18} />} iconPosition="start" label="Restaurant Profile" />
            <Tab icon={<Users size={18} />} iconPosition="start" label="Staff & Cashiers" />
            <Tab icon={<History size={18} />} iconPosition="start" label="Order History" />
          </Tabs>
        </Box>

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
                    <MenuItem value="all">📁 All Categories ({menuItems.length})</MenuItem>
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
                    <MenuItem value="all">🥗 All Diets</MenuItem>
                    <MenuItem value="veg">🟢 Veg Only</MenuItem>
                    <MenuItem value="nonveg">🔴 Non-Veg Only</MenuItem>
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
                    <MenuItem value="all">⚡ All Statuses</MenuItem>
                    <MenuItem value="available">✅ Available</MenuItem>
                    <MenuItem value="unavailable">❌ Sold Out</MenuItem>
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
                                  src={item.image_url}
                                  alt={item.name}
                                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                                />
                              ) : (
                                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                  {item.is_veg === 1 ? '🥗' : '🍖'}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                  {item.name}
                                </Typography>
                                {item.sku && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    SKU: {item.sku}
                                  </Typography>
                                )}
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
                              Rs. {parseFloat(item.price).toFixed(2)}
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
                              src={item.image_url}
                              alt={item.name}
                              style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }}
                            />
                          ) : (
                            <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                              {item.is_veg === 1 ? '🥗' : '🍖'}
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
                  Register hardware LAN IP addresses & dynamic ESC/POS configurations.
                </Typography>
              </Box>
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

                    {/* Compact 2-Column Key-Value Grid on Mobile */}
                    <Box sx={{ fontSize: { xs: 12, sm: 13 }, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr' }, gap: 0.5, color: 'text.secondary', mt: 0.5 }}>
                      <Box>IP: <b>{printer.ip_address}:{printer.port || 9100}</b></Box>
                      <Box>Paper: <b>{printer.paper_width || 80}mm Thermal</b></Box>
                      <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>Type: <b>{(printer.type || 'lan').toUpperCase()}</b></Box>
                      {printer.is_default_receipt === 1 && <Chip label="⭐ Default Receipt" size="small" color="warning" sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700, fontSize: '10px', height: 22 }} />}
                      {printer.is_default_kot === 1 && <Chip label="👨‍🍳 Default KOT" size="small" color="secondary" sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700, fontSize: '10px', height: 22 }} />}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button onClick={() => handleTestPrinter(printer)} variant="outlined" size="small" sx={{ flex: 1, fontWeight: 700, fontSize: '0.75rem', py: 0.5 }}>Test Socket</Button>
                      <IconButton onClick={() => handleOpenEditPrinter(printer)} size="small" color="primary"><Edit2 size={16} /></IconButton>
                      <IconButton onClick={() => handleDeletePrinter(printer.id)} size="small" color="error"><Trash2 size={16} /></IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* --- REPORTS SUB-TAB --- */}
        {activeTab === 3 && reports && reports.summary && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5, md: 4 }, width: '100%' }}>
            {/* Header Section: Single compact 1-row layout on mobile */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.1rem, 4.2vw, 1.375rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Sales Dashboard Overview
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  View aggregates, revenue metrics, and tax summaries.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileSpreadsheet size={15} />}
                  onClick={async () => {
                    try {
                      await downloadFile(`/api/reports/export/sales-excel?preset=${reportPreset}&date_from=${reportDateFrom}&date_to=${reportDateTo}`, `sales_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                      notify.success('Excel report downloaded successfully.', 'Export Complete');
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
                      await downloadFile(`/api/reports/export/sales-csv?preset=${reportPreset}&date_from=${reportDateFrom}&date_to=${reportDateTo}`, `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
                      notify.success('CSV report downloaded successfully.', 'Export Complete');
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

            {/* Date Preset Filter Bar & Custom Range */}
            <DateRangePicker
              preset={reportPreset}
              onPresetChange={setReportPreset}
              dateFrom={reportDateFrom}
              onDateFromChange={setReportDateFrom}
              dateTo={reportDateTo}
              onDateToChange={setReportDateTo}
            />

            {/* Aggregates Reflow 2-Column Grid on Mobile / 4-Column on Desktop */}
            <Grid container spacing={{ xs: 1, sm: 2, md: 2.5 }} sx={{ width: '100%' }}>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Gross Revenue</Typography>
                  <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.05rem, 4.5vw, 1.3rem)', sm: '1.4rem', md: '1.5rem' } }}>Rs. {reports.summary.totalRevenue.toFixed(2)}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Tax Collected</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.05rem, 4.5vw, 1.3rem)', sm: '1.4rem', md: '1.5rem' } }}>Rs. {reports.summary.totalTax.toFixed(2)}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Discounts Applied</Typography>
                  <Typography variant="h5" color="warning.main" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.05rem, 4.5vw, 1.3rem)', sm: '1.4rem', md: '1.5rem' } }}>Rs. {reports.summary.totalDiscount.toFixed(2)}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 }, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Total Orders</Typography>
                  <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.05rem, 4.5vw, 1.3rem)', sm: '1.4rem', md: '1.5rem' } }}>{reports.summary.totalOrders}</Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Payment Method Collections Breakdown */}
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2, md: 3 }, borderRadius: 2.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: { xs: 1, sm: 2 }, fontSize: { xs: '0.9rem', sm: '1rem' } }}>💳 Payment Method Collections Breakdown</Typography>
              <Divider sx={{ mb: { xs: 1, sm: 2 } }} />
              
              <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                {[
                  { id: 'cash', label: 'Cash Collection', icon: '💵' },
                  { id: 'upi', label: 'UPI QR Collections', icon: '📱' },
                  { id: 'card', label: 'Card Swipe Collections', icon: '💳' },
                  { id: 'wallet', label: 'Digital Wallet Collections', icon: '👛' },
                  { id: 'other', label: 'Other Payment Collections', icon: '⚙️' }
                ].map(mode => {
                  let amount = 0;
                  if (reports.payments && Array.isArray(reports.payments)) {
                    if (mode.id === 'upi') {
                      amount = reports.payments
                        .filter(p => ['upi', 'gpay', 'phonepe', 'paytm'].includes((p.payment_mode || '').toLowerCase()))
                        .reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
                    } else if (mode.id === 'card') {
                      amount = reports.payments
                        .filter(p => ['card', 'credit', 'debit'].includes((p.payment_mode || '').toLowerCase()))
                        .reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
                    } else {
                      amount = reports.payments
                        .filter(p => (p.payment_mode || '').toLowerCase() === mode.id)
                        .reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
                    }
                  }
                  
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={mode.id}>
                      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, textAlign: 'center', bgcolor: 'action.hover', borderRadius: '10px' }}>
                        <span style={{ fontSize: 18 }}>{mode.icon}</span>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold', mt: 0.25, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                          {mode.label}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(0.85rem, 3.8vw, 1.15rem)', sm: '1.1rem', md: '1.25rem' } }}>
                          Rs. {amount.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Box>
        )}

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
                      await downloadFile(`/api/reports/item-wise/export-excel?preset=${itemReportPreset}&date_from=${itemReportDateFrom}&date_to=${itemReportDateTo}&category_id=${itemReportCategory}&search=${encodeURIComponent(itemReportSearch)}&sort_by=${itemReportSortBy}&sort_order=${itemReportSortOrder}`, `item_sales_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
                      await downloadFile(`/api/reports/item-wise/export-csv?preset=${itemReportPreset}&date_from=${itemReportDateFrom}&date_to=${itemReportDateTo}&category_id=${itemReportCategory}&search=${encodeURIComponent(itemReportSearch)}&sort_by=${itemReportSortBy}&sort_order=${itemReportSortOrder}`, `item_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
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

            {/* Item Sales Summary Cards */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Items Sold</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                    {itemReportData.reduce((sum, i) => sum + parseInt(i.qty_sold || 0), 0)} pcs
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Gross Sales</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Rs. {itemReportData.reduce((sum, i) => sum + parseFloat(i.gross_sales || 0), 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Discounts</Typography>
                  <Typography variant="h6" color="warning.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Rs. {itemReportData.reduce((sum, i) => sum + parseFloat(i.discount_given || 0), 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net Revenue</Typography>
                  <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Rs. {itemReportData.reduce((sum, i) => sum + parseFloat(i.net_sales || 0), 0).toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Main Data Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>SKU</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Qty Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Gross Sales</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Discount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>GST</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Net Sales</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Avg Selling Price</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Last Sold</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>History</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={30} />
                      </TableCell>
                    </TableRow>
                  ) : itemReportData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No item sales data found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemReportData.map((row, idx) => (
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
          </Box>
        )}

        {/* --- TAB 5: STOCK & INVENTORY REPORT --- */}
        {activeTab === 5 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2.5 }, width: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Stock & Inventory Management
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Real-time inventory levels, low stock alerts, manual adjustments, and audit trail.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileSpreadsheet size={15} />}
                  onClick={async () => {
                    try {
                      await downloadFile(`/api/inventory/report/export-excel?category_id=${stockCategoryFilter}&status=${stockStatusFilter}&search=${encodeURIComponent(stockSearch)}`, `stock_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                      notify.success('Stock Inventory Excel report downloaded.', 'Export Complete');
                    } catch (err) {
                      notify.error(err.message || 'Failed to download Stock Excel report.', 'Export Error');
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
                      await downloadFile(`/api/inventory/report/export-csv?category_id=${stockCategoryFilter}&status=${stockStatusFilter}&search=${encodeURIComponent(stockSearch)}`, `stock_report_${new Date().toISOString().slice(0, 10)}.csv`);
                      notify.success('Stock Inventory CSV report downloaded.', 'Export Complete');
                    } catch (err) {
                      notify.error(err.message || 'Failed to download Stock CSV report.', 'Export Error');
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

                <Button
                  variant="outlined"
                  startIcon={<FileText size={14} />}
                  onClick={() => handleOpenStockLogs(null)}
                  sx={{
                    fontWeight: 800,
                    px: { xs: 1.25, sm: 2.5 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  Stock<Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}> Audit Logs</Box>
                </Button>
              </Box>
            </Box>

            {/* Summary Dashboard Alert Metric Cards - 2-Column Grid on Mobile */}
            <Grid container spacing={{ xs: 1, sm: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', borderLeft: '4px solid #3b82f6' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>Total Items</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.1rem, 4.5vw, 1.4rem)', sm: '1.5rem' } }}>{stockReportData.summary?.total_items || 0}</Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', borderLeft: '4px solid #10b981' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>In Stock</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', mt: 0.25, fontSize: { xs: 'clamp(1.1rem, 4.5vw, 1.4rem)', sm: '1.5rem' } }}>
                    {stockReportData.summary?.in_stock_count || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setStockStatusFilter('low_stock')}
                  sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2.5, bgcolor: stockReportData.summary?.low_stock_count > 0 ? 'rgba(245, 158, 11, 0.08)' : 'background.paper', borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}
                >
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    <AlertTriangle size={12} /> Low Stock
                  </Typography>
                  <Typography variant="h5" color="warning.main" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.1rem, 4.5vw, 1.4rem)', sm: '1.5rem' } }}>
                    {stockReportData.summary?.low_stock_count || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setStockStatusFilter('out_of_stock')}
                  sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2.5, bgcolor: stockReportData.summary?.out_of_stock_count > 0 ? 'rgba(239, 68, 68, 0.08)' : 'background.paper', borderLeft: '4px solid #ef4444', cursor: 'pointer' }}
                >
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    <XCircle size={12} /> Out of Stock
                  </Typography>
                  <Typography variant="h5" color="error.main" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: 'clamp(1.1rem, 4.5vw, 1.4rem)', sm: '1.5rem' } }}>
                    {stockReportData.summary?.out_of_stock_count || 0}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Filter Toolbar */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.paper', width: '100%' }}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search dish or SKU..."
                    value={stockSearch}
                    onChange={e => setStockSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} style={{ color: '#64748b' }} />
                          </InputAdornment>
                        ),
                        endAdornment: stockSearch ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setStockSearch('')}>
                              <X size={16} />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={stockCategoryFilter}
                      label="Category"
                      onChange={e => setStockCategoryFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      {categories.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Stock Status Filter</InputLabel>
                    <Select
                      value={stockStatusFilter}
                      label="Stock Status Filter"
                      onChange={e => setStockStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Stock Statuses</MenuItem>
                      <MenuItem value="in_stock">In Stock Only</MenuItem>
                      <MenuItem value="low_stock">⚠️ Low Stock Alerts Only</MenuItem>
                      <MenuItem value="out_of_stock">🚨 Out of Stock Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Inventory Data Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>SKU</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Current Stock</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Unit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Low Stock Threshold</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Stock Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Last Updated</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={30} />
                      </TableCell>
                    </TableRow>
                  ) : (stockReportData.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No stock inventory records match the selected criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (stockReportData.items || []).map(row => {
                      const curStock = parseFloat(row.current_stock || 0);
                      const lowThresh = parseFloat(row.low_stock_threshold || 10);
                      const isOutOfStock = curStock <= 0;
                      const isLowStock = !isOutOfStock && curStock <= lowThresh;

                      return (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{
                            bgcolor: isOutOfStock ? 'rgba(239, 68, 68, 0.04)' : isLowStock ? 'rgba(245, 158, 11, 0.04)' : 'inherit'
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                          <TableCell>
                            <Chip label={row.category_name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.sku || '-'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', color: isOutOfStock ? 'error.main' : isLowStock ? 'warning.main' : 'success.main' }}>
                            {curStock}
                          </TableCell>
                          <TableCell align="center" sx={{ textTransform: 'lowercase', color: 'text.secondary' }}>{row.unit || 'pcs'}</TableCell>
                          <TableCell align="right">{lowThresh}</TableCell>
                          <TableCell align="center">
                            {isOutOfStock ? (
                              <Chip label="🚨 Out of Stock" color="error" size="small" sx={{ fontWeight: 800 }} />
                            ) : isLowStock ? (
                              <Chip label="⚠️ Low Stock" color="warning" size="small" sx={{ fontWeight: 800 }} />
                            ) : (
                              <Chip label="✅ In Stock" color="success" size="small" sx={{ fontWeight: 800 }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleOpenAdjustStock(row)}
                                sx={{ fontWeight: 800, fontSize: '0.75rem', px: 1.5, py: 0.5 }}
                              >
                                Adjust Stock
                              </Button>
                              <IconButton size="small" onClick={() => handleOpenStockLogs(row)} title="Stock Logs">
                                <FileText size={16} />
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

        {/* --- TAB 6: CA-READY GST SLAB REPORT --- */}
        {activeTab === 6 && <GstSlabReport />}

        {/* --- TAB 7: RECEIPT & KOT CUSTOMIZATION --- */}
        {activeTab === 7 && (
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 3 } }}>
            {/* Header Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 1, width: '100%' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Receipt & KOT Settings
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
                      🏪 Restaurant Branding & Licensing
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Restaurant Display Name"
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
                            <ImageIcon size={18} /> Restaurant Logo (Upload or Link)
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            {receiptSettings.logo_url ? (
                              <Box
                                component="img"
                                src={receiptSettings.logo_url}
                                alt="Restaurant Logo"
                                sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'text.disabled' }}>
                                <Typography variant="caption" color="text.secondary">No Logo</Typography>
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 220 }}>
                              <Button
                                variant="contained"
                                component="label"
                                size="small"
                                disabled={uploadingLogo}
                                startIcon={uploadingLogo ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
                                sx={{ fontWeight: 800, width: 'fit-content', textTransform: 'none' }}
                              >
                                {uploadingLogo ? 'Uploading Logo...' : 'Upload Logo File (JPG, PNG, WEBP, SVG)'}
                                <input
                                  type="file"
                                  hidden
                                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/gif"
                                  onChange={handleLogoFileUpload}
                                />
                              </Button>

                              <TextField
                                label="Logo Image URL (Or Paste Public Image Link)"
                                size="small"
                                fullWidth
                                value={receiptSettings.logo_url || ''}
                                onChange={e => setReceiptSettings({ ...receiptSettings, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png or /uploads/logos/logo_1.png"
                                sx={{ width: '100%' }}
                              />
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🖨️ Paper Layout & Formatting
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Paper Width</InputLabel>
                          <Select
                            value={receiptSettings.paper_size || '80mm'}
                            label="Paper Width"
                            onChange={e => setReceiptSettings({ ...receiptSettings, paper_size: e.target.value })}
                          >
                            <MenuItem value="80mm">80mm (Standard)</MenuItem>
                            <MenuItem value="58mm">58mm (Compact)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
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

                      <Grid size={{ xs: 12, sm: 4 }}>
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
                    </Grid>
                  </Paper>

                  {/* Card 4: Toggle Display Elements */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                      🎛️ Receipt Display Feature Toggles
                    </Typography>

                    <Grid container spacing={1}>
                      {[
                        { key: 'show_logo', label: 'Show Restaurant Logo' },
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
                        ℹ️ <strong>GST Billing System is Disabled</strong>. Taxes will not be calculated or displayed on bills, receipts, or reports. Billing will operate as a normal non-GST restaurant.
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
                      width: receiptSettings.paper_size === '58mm' ? '260px' : '330px',
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
                            <img src={receiptSettings.logo_url} alt="Logo" style={{ maxHeight: 40, objectFit: 'contain' }} />
                          </Box>
                        )}

                        {/* Header */}
                        <Box sx={{ textAlign: receiptSettings.header_alignment || 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'inherit', fontWeight: 800, textTransform: 'uppercase' }}>
                            {receiptSettings.restaurant_name || 'RESTAURANT POS'}
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
                        <div>Date    : {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                        {Boolean(receiptSettings.show_payment_details) && <div>Payment : CASH | Table #4</div>}
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
                          <div style={{ fontWeight: 'bold' }}>{receiptSettings.thank_you_message || 'Thank You! Visit Again.'}</div>
                          {receiptSettings.footer_message && <div>{receiptSettings.footer_message}</div>}
                          {Boolean(receiptSettings.show_footer_notes) && receiptSettings.terms_conditions && (
                            <div style={{ fontSize: '9px', marginTop: 4 }}>T&C: {receiptSettings.terms_conditions}</div>
                          )}
                        </Box>

                        {/* Optional QR Code graphic */}
                        {Boolean(receiptSettings.show_qr_code) && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                            <Box sx={{ border: '2px solid #000', p: 0.5, borderRadius: 1, textAlign: 'center', fontSize: '9px' }}>
                              [ QR Code Digital Payment ]
                            </Box>
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
                  🏪 Restaurant Profile & Branding Management
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Update your Restaurant Display Name, Logo Image, Address, Contact Info, and License Details.
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
                {savingReceiptSettings ? <CircularProgress size={18} color="inherit" /> : 'Save Restaurant Profile'}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Card 1: Restaurant Identity & Logo */}
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ImageIcon size={20} /> Restaurant Identity & Logo
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Restaurant Display Name"
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
                            🖼️ Restaurant Logo Image
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                            {receiptSettings.logo_url ? (
                              <Box
                                component="img"
                                src={receiptSettings.logo_url}
                                alt="Restaurant Logo"
                                sx={{ width: 80, height: 80, borderRadius: 2.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider', bgcolor: '#fff', p: 0.5 }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Box sx={{ width: 80, height: 80, borderRadius: 2.5, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'text.disabled' }}>
                                <Typography variant="caption" color="text.secondary">No Logo</Typography>
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1, minWidth: 240 }}>
                              <Button
                                variant="contained"
                                component="label"
                                size="small"
                                disabled={uploadingLogo}
                                startIcon={uploadingLogo ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
                                sx={{ fontWeight: 800, width: 'fit-content', textTransform: 'none' }}
                              >
                                {uploadingLogo ? 'Uploading Image...' : 'Upload Logo File (JPG, PNG, WEBP, SVG)'}
                                <input
                                  type="file"
                                  hidden
                                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/gif"
                                  onChange={handleLogoFileUpload}
                                />
                              </Button>

                              <TextField
                                label="Logo Image URL (Or Direct Image Link)"
                                size="small"
                                fullWidth
                                value={receiptSettings.logo_url || ''}
                                onChange={e => setReceiptSettings({ ...receiptSettings, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                              />
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
                    This is how your Restaurant Identity will appear across the POS Navbar Header, Mobile Application, and Digital Receipts.
                  </Typography>

                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    {receiptSettings.logo_url ? (
                      <Box
                        component="img"
                        src={receiptSettings.logo_url}
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
                        {receiptSettings.restaurant_name || 'Restaurant POS'}
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
                            label={(user.role || 'cashier').toUpperCase()}
                            size="small"
                            color={user.role === 'admin' ? 'primary' : user.role === 'manager' ? 'secondary' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
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
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Chip
                          label={(user.role || 'cashier').toUpperCase()}
                          size="small"
                          color={user.role === 'admin' ? 'primary' : user.role === 'manager' ? 'secondary' : 'default'}
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
                      await downloadFile(`/api/orders/history/export-excel?preset=${historyPreset}&order_status=${historyStatus}&payment_mode=${historyPaymentMode}&cashier_id=${historyCashier}&date_from=${historyDateFrom}&date_to=${historyDateTo}&search=${encodeURIComponent(historySearch)}`, `order_history_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
                      await downloadFile(`/api/orders/history/export-csv?preset=${historyPreset}&order_status=${historyStatus}&payment_mode=${historyPaymentMode}&cashier_id=${historyCashier}&date_from=${historyDateFrom}&date_to=${historyDateTo}&search=${encodeURIComponent(historySearch)}`, `order_history_${new Date().toISOString().slice(0, 10)}.csv`);
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
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Order #, Customer, Item..."
                    value={historySearch}
                    onChange={e => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                  />
                </Grid>

                {/* Cashier Dropdown */}
                <Grid size={{ xs: 6, sm: 2.4 }}>
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
                <Grid size={{ xs: 6, sm: 2.4 }}>
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
                <Grid size={{ xs: 6, sm: 1.6 }}>
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

                {/* Reset Button */}
                <Grid size={{ xs: 6, sm: 1.6 }}>
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
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Order #</TableCell>
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
                      <TableCell colSpan={11} align="center" sx={{ py: 4, fontWeight: 700, color: 'text.secondary' }}>
                        No orders match filters in retention window.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyOrders.map(order => (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{order.unique_order_number}</TableCell>
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
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 800, fontSize: '1rem' }}>
                            Rs. {parseFloat(order.total_amount).toFixed(2)}
                          </Typography>
                          <Chip
                            label={order.order_status}
                            size="small"
                            color={order.order_status === 'completed' ? 'success' : order.order_status === 'cancelled' ? 'error' : 'warning'}
                            sx={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '10px', height: 20, mt: 0.25 }}
                          />
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

      {/* --- CRUD FORM POPUP --- */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} disableRestoreFocus maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogType === 'add_menu' && 'Add Menu Item'}
          {dialogType === 'edit_menu' && 'Modify Menu Item'}
          {dialogType === 'add_printer' && 'Add Printer'}
          {dialogType === 'add_category' && 'Add Category'}
        </DialogTitle>

        <form onSubmit={
          dialogType.includes('menu') ? handleSaveMenu :
          dialogType.includes('printer') ? handleSavePrinter :
          handleSaveCategory
        }>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialogType.includes('menu') && (
              <>
                <TextField label="Item Name" size="small" fullWidth value={menuName} onChange={e => setMenuName(e.target.value)} required />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField label="Price (INR)" type="number" size="small" fullWidth value={menuPrice} onChange={e => setMenuPrice(e.target.value)} required />
                  </Grid>
                  <Grid size={6}>
                    <Select size="small" fullWidth value={menuCategoryId} onChange={e => setMenuCategoryId(e.target.value)}>
                      {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Select size="small" fullWidth value={menuVeg} onChange={e => setMenuVeg(e.target.value)}>
                      <MenuItem value="1">🟢 Veg</MenuItem>
                      <MenuItem value="0">🔴 Non-Veg</MenuItem>
                    </Select>
                  </Grid>
                  <Grid size={6}>
                    <TextField label="SKU / Barcode" size="small" fullWidth value={menuSku} onChange={e => setMenuSku(e.target.value)} />
                  </Grid>
                </Grid>

                <TextField label="Description" size="small" fullWidth value={menuDesc} onChange={e => setMenuDesc(e.target.value)} multiline rows={2} />
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

                {/* File Upload Control */}
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                    Food Image File Upload
                  </Typography>
                  
                  <Button variant="contained" component="label" size="small" sx={{ fontWeight: 'bold' }}>
                    📷 Select Image File
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

                  {menuImageUrl && (
                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                      <img src={menuImageUrl} alt="Preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                      <Button size="small" color="error" onClick={() => { setMenuImageFile(null); setMenuImageUrl(''); }}>
                        Remove
                      </Button>
                    </Box>
                  )}
                </Box>
              </>
            )}

            {dialogType.includes('printer') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Printer Name / Location" size="small" fullWidth value={printerName} onChange={e => setPrinterName(e.target.value)} required placeholder="e.g. Mobile Kitchen Bluetooth Printer" />
                
                {printerType === 'bluetooth' ? (
                  <TextField 
                    label="Bluetooth MAC Address / Identifier" 
                    size="small" 
                    fullWidth 
                    value={printerBluetoothAddress} 
                    onChange={e => setPrinterBluetoothAddress(e.target.value)} 
                    placeholder="e.g. 00:11:22:33:44:55 (Optional)" 
                    helperText="📱 Direct Bluetooth thermal printing is paired directly inside the Mobile POS app."
                  />
                ) : (
                  <>
                    <TextField label="IP Address / Host" size="small" fullWidth value={printerIp} onChange={e => setPrinterIp(e.target.value)} required placeholder="192.168.1.100" />
                    <TextField label="Port" size="small" fullWidth value={printerPort} onChange={e => setPrinterPort(e.target.value)} required placeholder="9100" />
                  </>
                )}

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Select size="small" fullWidth value={printerType} onChange={e => setPrinterType(e.target.value)}>
                      <MenuItem value="lan">LAN / Network (TCP)</MenuItem>
                      <MenuItem value="usb">USB</MenuItem>
                      <MenuItem value="bluetooth">Bluetooth (Mobile Direct)</MenuItem>
                      <MenuItem value="network">Network Socket</MenuItem>
                    </Select>
                  </Grid>
                  <Grid size={6}>
                    <Select size="small" fullWidth value={printerWidth} onChange={e => setPrinterWidth(e.target.value)}>
                      <MenuItem value="80">80mm Thermal</MenuItem>
                      <MenuItem value="58">58mm Thermal</MenuItem>
                    </Select>
                  </Grid>
                </Grid>

                <Select size="small" fullWidth value={printerRole} onChange={e => setPrinterRole(e.target.value)}>
                  <MenuItem value="receipt">Receipt (Counter)</MenuItem>
                  <MenuItem value="kitchen">Kitchen (KOT)</MenuItem>
                  <MenuItem value="bar">Bar Printer</MenuItem>
                  <MenuItem value="dessert">Dessert Printer</MenuItem>
                </Select>

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
      <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)} disableRestoreFocus maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedStaff ? 'Edit Staff User Credentials' : 'Add Cashier / Staff User'}
        </DialogTitle>
        <form onSubmit={handleSaveStaff}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Staff Full Name"
              size="small"
              fullWidth
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
            <TextField
              label="Username"
              size="small"
              fullWidth
              value={staffUsername}
              onChange={e => setStaffUsername(e.target.value)}
              placeholder="e.g. cashier1"
              disabled={Boolean(selectedStaff)}
              required
            />
            <TextField
              label="Login ID"
              type="email"
              size="small"
              fullWidth
              value={staffEmail}
              onChange={e => setStaffEmail(e.target.value)}
              placeholder="rahul@example.com"
            />
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
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={staffRole}
                label="Role"
                onChange={e => setStaffRole(e.target.value)}
              >
                <MenuItem value="cashier">Cashier (POS & Shift Control)</MenuItem>
                <MenuItem value="manager">Manager (Reports & Refunds)</MenuItem>
                <MenuItem value="admin">Admin (Full Control)</MenuItem>
              </Select>
            </FormControl>

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
                  <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, fontSize: 13 }}>
                    <Typography variant="body2">{it.name} x {it.quantity}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Rs. {(parseFloat(it.price) * it.quantity).toFixed(2)}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2, mt: 1, fontSize: 13 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <span>Subtotal</span>
                  <b>Rs. {parseFloat(selectedHistoryOrder.order.subtotal).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <span>GST Tax</span>
                  <b>Rs. {parseFloat(selectedHistoryOrder.order.tax_amount).toFixed(2)}</b>
                </Box>
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
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          {selectedHistoryOrder && (
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
            >
              📱 Share via WhatsApp
            </Button>
          )}
          <Button onClick={() => setHistoryOrderDetailOpen(false)} variant="contained">Close</Button>
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
          <FormControl fullWidth size="small">
            <InputLabel>Adjustment Action</InputLabel>
            <Select
              value={adjustmentType}
              label="Adjustment Action"
              onChange={e => setAdjustmentType(e.target.value)}
            >
              <MenuItem value="add">➕ Add Stock (+ Quantity)</MenuItem>
              <MenuItem value="reduce">➖ Reduce Stock (- Quantity)</MenuItem>
              <MenuItem value="set">🎯 Set Exact Stock (= Quantity)</MenuItem>
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
                          <Chip label="➕ Add" color="success" size="small" sx={{ fontWeight: 700 }} />
                        ) : log.adjustment_type === 'reduce' ? (
                          <Chip label="➖ Reduce" color="warning" size="small" sx={{ fontWeight: 700 }} />
                        ) : log.adjustment_type === 'set' ? (
                          <Chip label="🎯 Set" color="info" size="small" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Chip label="🛒 Sale" color="default" size="small" sx={{ fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{log.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.85rem' }}>
                        {log.previous_stock} ➔ <strong>{log.new_stock}</strong>
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
    </Container>
  </Box>
);
}
