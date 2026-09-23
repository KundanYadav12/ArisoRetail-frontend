import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Tabs, Tab, Chip,
  Grid, TextField, InputAdornment, IconButton, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Alert, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Boxes, Building2, ClipboardList, Truck, Users, Receipt,
  Sliders, FileText, Search, Plus, Download, FileSpreadsheet,
  AlertTriangle, XCircle, CheckCircle, RefreshCw, X, ArrowRight,
  PackageCheck, Undo2, ShoppingCart, ShieldCheck, Edit2, Tag,
  MapPin, Barcode
} from 'lucide-react';
import { apiFetch, downloadFile } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

// Import Modular Modals
import WarehouseModal from './WarehouseModal';
import SupplierModal from './SupplierModal';
import StockRequestModal from './StockRequestModal';
import StockRequestApprovalModal from './StockRequestApprovalModal';
import StockTransferModal from './StockTransferModal';
import StockReceivingModal from './StockReceivingModal';
import PurchaseOrderModal from './PurchaseOrderModal';
import PurchaseBillModal from './PurchaseBillModal';
import PurchaseReturnModal from './PurchaseReturnModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import GRNModal from './GRNModal';
import SupplierLedgerModal from './SupplierLedgerModal';
import SupplierPaymentModal from '../finance/SupplierPaymentModal';
import WarehouseRacksTab from './WarehouseRacksTab';
import StockCountingSuite from './StockCountingSuite';
import ProductLocationModal from './ProductLocationModal';

export default function InventorySuite({
  onOpenStickersModal,
  categories = [],
  menuItems = []
}) {
  const notify = useNotify();

  // Active Sub-Tab: overview, catalog, warehouses, requests, transfers, suppliers, purchases, adjustments, ledger
  const [subTab, setSubTab] = useState('overview');

  // Shared Data States
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Stock Catalog State (Preserves & enhances original Tab 5)
  const [stockReportData, setStockReportData] = useState({ summary: {}, items: [] });
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  // Stock Requests State
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');

  // Transfers State
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferStatusFilter, setTransferStatusFilter] = useState('all');

  // Suppliers State
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Purchases State (Sub-segmented: orders, grns, bills, returns)
  const [purchaseSegment, setPurchaseSegment] = useState('orders');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseGRNs, setPurchaseGRNs] = useState([]);
  const [purchaseBills, setPurchaseBills] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // GRN Modal
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [grnPO, setGrnPO] = useState(null);

  // Supplier Ledger Modal
  const [supplierLedgerOpen, setSupplierLedgerOpen] = useState(false);
  const [ledgerSupplier, setLedgerSupplier] = useState(null);

  // Supplier Payment Modal
  const [supplierPaymentModalOpen, setSupplierPaymentModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState(null);

  // PO action state
  const [poActionLoading, setPoActionLoading] = useState(null);

  // Adjustments State
  const [adjustments, setAdjustments] = useState([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  // Ledger Audit Trail State
  const [ledgerData, setLedgerData] = useState({ transactions: [], pagination: {} });
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
  const [ledgerWarehouseFilter, setLedgerWarehouseFilter] = useState('all');
  const [ledgerPage, setLedgerPage] = useState(1);

  // Modal Control States
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [stockRequestModalOpen, setStockRequestModalOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState(null);

  const [stockTransferModalOpen, setStockTransferModalOpen] = useState(false);
  const [prefilledRequestForTransfer, setPrefilledRequestForTransfer] = useState(null);
  const [receivingTransferId, setReceivingTransferId] = useState(null);

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [prefilledPOForBill, setPrefilledPOForBill] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);

  // Exact Location Tracking Modal
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocationProduct, setSelectedLocationProduct] = useState(null);

  // Legacy Single Item Adjust & Stock Logs Modals
  const [singleAdjustItem, setSingleAdjustItem] = useState(null);
  const [singleAdjustOpen, setSingleAdjustOpen] = useState(false);
  const [singleAdjustType, setSingleAdjustType] = useState('add');
  const [singleAdjustQty, setSingleAdjustQty] = useState('');
  const [singleAdjustReason, setSingleAdjustReason] = useState('');
  const [savingSingleAdjust, setSavingSingleAdjust] = useState(false);

  const [logsItem, setLogsItem] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [itemLogs, setItemLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  /* -------------------------------------------------------------------------
     FETCH DATA HANDLERS
     ------------------------------------------------------------------------- */
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await apiFetch('/api/inventory/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    }
  }, []);

  const fetchDashboardMetrics = useCallback(async (whId = selectedWarehouseFilter) => {
    setLoadingMetrics(true);
    try {
      const query = whId && whId !== 'all' ? `?warehouse_id=${whId}` : '';
      const res = await apiFetch(`/api/inventory/dashboard-metrics${query}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [selectedWarehouseFilter]);

  const fetchCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      let url = `/api/inventory/report?category_id=${stockCategoryFilter}&status=${stockStatusFilter}&search=${encodeURIComponent(stockSearch)}`;
      if (selectedWarehouseFilter !== 'all') {
        url = `/api/inventory/warehouses/${selectedWarehouseFilter}/stock?category_id=${stockCategoryFilter}&status=${stockStatusFilter}&search=${encodeURIComponent(stockSearch)}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setStockReportData(data);
      }
    } catch (err) {
      console.error('Failed to fetch stock catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [stockCategoryFilter, stockStatusFilter, stockSearch, selectedWarehouseFilter]);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const q = requestStatusFilter !== 'all' ? `?status=${requestStatusFilter}` : '';
      const res = await apiFetch(`/api/inventory/stock-requests${q}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [requestStatusFilter]);

  const fetchTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    try {
      const q = transferStatusFilter !== 'all' ? `?status=${transferStatusFilter}` : '';
      const res = await apiFetch(`/api/inventory/stock-transfers${q}`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data);
      }
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    } finally {
      setLoadingTransfers(false);
    }
  }, [transferStatusFilter]);

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const q = supplierSearch ? `?search=${encodeURIComponent(supplierSearch)}` : '';
      const res = await apiFetch(`/api/inventory/suppliers${q}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierSearch]);

  const fetchPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      if (purchaseSegment === 'orders') {
        const res = await apiFetch('/api/inventory/purchases/orders');
        if (res.ok) setPurchaseOrders(await res.json());
      } else if (purchaseSegment === 'grns') {
        const res = await apiFetch('/api/inventory/purchases/grns');
        if (res.ok) setPurchaseGRNs(await res.json());
      } else if (purchaseSegment === 'bills') {
        const res = await apiFetch('/api/inventory/purchases/bills');
        if (res.ok) setPurchaseBills(await res.json());
      } else if (purchaseSegment === 'returns') {
        const res = await apiFetch('/api/inventory/purchases/returns');
        if (res.ok) setPurchaseReturns(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  }, [purchaseSegment]);

  const handleApprovePO = async (poId) => {
    setPoActionLoading(poId + '_approve');
    try {
      const res = await apiFetch(`/api/inventory/purchases/orders/${poId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve PO');
      notify.success(`Purchase Order approved.`, 'Approved');
      fetchPurchases();
    } catch (err) {
      notify.error(err.message, 'Approval Failed');
    } finally {
      setPoActionLoading(null);
    }
  };

  const handleCancelPO = async (poId) => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed Escape
    setPoActionLoading(poId + '_cancel');
    try {
      const res = await apiFetch(`/api/inventory/purchases/orders/${poId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel PO');
      notify.success(`Purchase Order cancelled.`, 'Cancelled');
      fetchPurchases();
    } catch (err) {
      notify.error(err.message, 'Cancel Failed');
    } finally {
      setPoActionLoading(null);
    }
  };

  const fetchAdjustments = useCallback(async () => {
    setLoadingAdjustments(true);
    try {
      const res = await apiFetch('/api/inventory/adjustments');
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data);
      }
    } catch (err) {
      console.error('Failed to fetch adjustments:', err);
    } finally {
      setLoadingAdjustments(false);
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      let q = `?page=${ledgerPage}&limit=50`;
      if (ledgerTypeFilter !== 'all') q += `&transaction_type=${ledgerTypeFilter}`;
      if (ledgerWarehouseFilter !== 'all') q += `&warehouse_id=${ledgerWarehouseFilter}`;
      const res = await apiFetch(`/api/inventory/ledger${q}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  }, [ledgerPage, ledgerTypeFilter, ledgerWarehouseFilter]);

  // Initial Load
  useEffect(() => {
    fetchWarehouses();
    fetchDashboardMetrics();
    fetchSuppliers();
  }, [fetchWarehouses, fetchDashboardMetrics, fetchSuppliers]);

  // Trigger Sub-Tab Data Refresh
  useEffect(() => {
    if (subTab === 'overview') fetchDashboardMetrics();
    else if (subTab === 'catalog') fetchCatalog();
    else if (subTab === 'warehouses') fetchWarehouses();
    else if (subTab === 'requests') fetchRequests();
    else if (subTab === 'transfers') fetchTransfers();
    else if (subTab === 'suppliers') fetchSuppliers();
    else if (subTab === 'purchases') fetchPurchases();
    else if (subTab === 'adjustments') fetchAdjustments();
    else if (subTab === 'ledger') fetchLedger();
  }, [subTab, fetchDashboardMetrics, fetchCatalog, fetchWarehouses, fetchRequests, fetchTransfers, fetchSuppliers, fetchPurchases, fetchAdjustments, fetchLedger]);

  /* -------------------------------------------------------------------------
     LEGACY SINGLE ITEM ADJUST & LOGS HANDLERS
     ------------------------------------------------------------------------- */
  const handleOpenSingleAdjust = (item) => {
    setSingleAdjustItem(item);
    setSingleAdjustType('add');
    setSingleAdjustQty('');
    setSingleAdjustReason('');
    setSingleAdjustOpen(true);
  };

  const handleSaveSingleAdjust = async () => {
    if (!singleAdjustQty || parseFloat(singleAdjustQty) <= 0) {
      notify.error('Please enter a valid adjustment quantity.', 'Validation');
      return;
    }

    setSavingSingleAdjust(true);
    try {
      const res = await apiFetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: singleAdjustItem.id || singleAdjustItem.menu_item_id,
          adjustment_type: singleAdjustType,
          quantity: parseFloat(singleAdjustQty),
          reason: singleAdjustReason.trim() || 'Manual adjustment'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      notify.success('Stock adjusted successfully.', 'Updated');
      setSingleAdjustOpen(false);
      fetchCatalog();
      fetchDashboardMetrics();
    } catch (err) {
      notify.error(err.message, 'Adjustment Failed');
    } finally {
      setSavingSingleAdjust(false);
    }
  };

  const handleOpenItemLogs = async (item) => {
    setLogsItem(item);
    setLogsModalOpen(true);
    setLoadingLogs(true);
    try {
      const itemId = item ? (item.id || item.menu_item_id) : '';
      const q = itemId ? `?menu_item_id=${itemId}&limit=100` : `?limit=100`;
      const res = await apiFetch(`/api/inventory/logs${q}`);
      if (res.ok) {
        setItemLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  /* -------------------------------------------------------------------------
     SAVE WAREHOUSE & SUPPLIER HANDLERS
     ------------------------------------------------------------------------- */
  const handleSaveWarehouse = async (data) => {
    const url = editingWarehouse ? `/api/inventory/warehouses/${editingWarehouse.id}` : '/api/inventory/warehouses';
    const method = editingWarehouse ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to save warehouse');

    notify.success(editingWarehouse ? 'Warehouse updated successfully.' : 'New warehouse created.', 'Success');
    fetchWarehouses();
    fetchDashboardMetrics();
  };

  const handleSaveSupplier = async (data) => {
    const url = editingSupplier ? `/api/inventory/suppliers/${editingSupplier.id}` : '/api/inventory/suppliers';
    const method = editingSupplier ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to save supplier');

    notify.success(editingSupplier ? 'Supplier updated successfully.' : 'New supplier created.', 'Success');
    fetchSuppliers();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
      {/* 1. Header Bar with Global Warehouse Filter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Boxes size={26} color="#0284c7" />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Inventory & Warehouse Management
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Multi-outlet inventory, stock requests, approvals, transfer & receiving, purchasing, and audit ledger.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Global Warehouse Filter */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Active Warehouse / Outlet</InputLabel>
            <Select
              value={selectedWarehouseFilter}
              label="Active Warehouse / Outlet"
              onChange={e => {
                setSelectedWarehouseFilter(e.target.value);
                if (subTab === 'overview') fetchDashboardMetrics(e.target.value);
              }}
            >
              <MenuItem value="all">🏢 All Outlets & Warehouses</MenuItem>
              {warehouses.map(w => (
                <MenuItem key={w.id} value={String(w.id)}>
                  {w.name} {w.is_default ? '⭐ (Main)' : `(${w.code})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw size={14} />}
            onClick={() => {
              fetchWarehouses();
              fetchDashboardMetrics();
              if (subTab === 'catalog') fetchCatalog();
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* 2. Sub-Navigation Tabs */}
      <Paper elevation={0} sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: '#ffffff', borderRadius: 2 }}>
        <Tabs
          value={subTab}
          onChange={(e, val) => setSubTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              minHeight: 46,
              py: 1
            }
          }}
        >
          <Tab icon={<Boxes size={16} />} iconPosition="start" label="Executive Overview" value="overview" />
          <Tab icon={<FileSpreadsheet size={16} />} iconPosition="start" label="Stock Catalog & Levels" value="catalog" />
          <Tab icon={<Building2 size={16} />} iconPosition="start" label={`Warehouses (${warehouses.length})`} value="warehouses" />
          <Tab icon={<MapPin size={16} />} iconPosition="start" label="Racks & Locations" value="racks" />
          <Tab icon={<Barcode size={16} />} iconPosition="start" label="Stock Counting Suite" value="stock_counting" />
          <Tab icon={<ClipboardList size={16} />} iconPosition="start" label="Stock Requests" value="requests" />
          <Tab icon={<Truck size={16} />} iconPosition="start" label="Transfers & Receiving" value="transfers" />
          <Tab icon={<Users size={16} />} iconPosition="start" label="Suppliers / Vendors" value="suppliers" />
          <Tab icon={<Receipt size={16} />} iconPosition="start" label="Purchases & Bills" value="purchases" />
          <Tab icon={<Sliders size={16} />} iconPosition="start" label="Stock Adjustments" value="adjustments" />
          <Tab icon={<FileText size={16} />} iconPosition="start" label="Stock Ledger Audit" value="ledger" />
        </Tabs>
      </Paper>

      {/* -------------------------------------------------------------------
          SUB-TAB 1: EXECUTIVE OVERVIEW / DASHBOARD
          ------------------------------------------------------------------- */}
      {subTab === 'overview' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* KPI Summary Cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: '4px solid #0284c7' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Inventory Valuation
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#0284c7' }}>
                  ₹{(dashboardMetrics?.valuation?.total_inventory_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on purchase cost price
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderLeft: '4px solid #10b981' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Tracked Catalog Items
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#10b981' }}>
                  {dashboardMetrics?.valuation?.total_tracked_items || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {warehouses.length} active warehouse(s)
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                onClick={() => { setStockStatusFilter('low_stock'); setSubTab('catalog'); }}
                sx={{ p: 2, borderRadius: 2.5, borderLeft: '4px solid #f59e0b', cursor: 'pointer', '&:hover': { bgcolor: '#fffbeb' } }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                    Low Stock Alerts
                  </Typography>
                  <AlertTriangle size={16} color="#d97706" />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#d97706' }}>
                  {dashboardMetrics?.stock_health?.low_stock_count || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click to filter low stock catalog
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                onClick={() => { setStockStatusFilter('out_of_stock'); setSubTab('catalog'); }}
                sx={{ p: 2, borderRadius: 2.5, borderLeft: '4px solid #ef4444', cursor: 'pointer', '&:hover': { bgcolor: '#fef2f2' } }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                    Out of Stock
                  </Typography>
                  <XCircle size={16} color="#ef4444" />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#ef4444' }}>
                  {dashboardMetrics?.stock_health?.out_of_stock_count || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Items requiring immediate reorder
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Workflow Status Bar: Requests, In-Transit, POs */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ClipboardList size={18} color="#0284c7" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Stock Requests</Typography>
                  </Box>
                  <Button size="small" onClick={() => setSubTab('requests')}>View All</Button>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Pending Approvals:</Typography>
                  <Chip label={dashboardMetrics?.workflow?.pending_requests || 0} size="small" color="warning" sx={{ fontWeight: 700 }} />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<Plus size={14} />}
                  onClick={() => setStockRequestModalOpen(true)}
                  sx={{ mt: 1.5, fontWeight: 700 }}
                >
                  Raise Stock Request
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Truck size={18} color="#16a34a" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Stock Transfers</Typography>
                  </Box>
                  <Button size="small" onClick={() => setSubTab('transfers')}>View All</Button>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">In-Transit Shipments:</Typography>
                  <Chip label={dashboardMetrics?.workflow?.in_transit_transfers || 0} size="small" color="info" sx={{ fontWeight: 700 }} />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<Truck size={14} />}
                  onClick={() => { setPrefilledRequestForTransfer(null); setStockTransferModalOpen(true); }}
                  sx={{ mt: 1.5, fontWeight: 700 }}
                >
                  Initiate Transfer
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt size={18} color="#9333ea" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Purchase Management</Typography>
                  </Box>
                  <Button size="small" onClick={() => setSubTab('purchases')}>View All</Button>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Pending Vendor POs:</Typography>
                  <Chip label={dashboardMetrics?.workflow?.pending_purchase_orders || 0} size="small" sx={{ fontWeight: 700 }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<Plus size={14} />}
                    onClick={() => setPoModalOpen(true)}
                    sx={{ fontWeight: 700 }}
                  >
                    New PO
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    startIcon={<Receipt size={14} />}
                    onClick={() => { setPrefilledPOForBill(null); setBillModalOpen(true); }}
                    sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
                  >
                    Inward Bill
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB 2: STOCK CATALOG & LEVELS (ENHANCED ORIGINAL TAB 5)
          ------------------------------------------------------------------- */}
      {subTab === 'catalog' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Action Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<FileSpreadsheet size={15} />}
                onClick={async () => {
                  try {
                    await downloadFile(
                      `/api/inventory/report/export-excel?category_id=${stockCategoryFilter}&status=${stockStatusFilter}&search=${encodeURIComponent(stockSearch)}`,
                      `stock_report_${getISTDateString()}.xlsx`
                    );
                    notify.success('Stock Inventory Excel report downloaded.', 'Export Complete');
                  } catch (err) {
                    notify.error(err.message || 'Export error', 'Error');
                  }
                }}
                sx={{ fontWeight: 700 }}
              >
                Export Excel (.xlsx)
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<Download size={14} />}
                onClick={async () => {
                  try {
                    await downloadFile(
                      `/api/inventory/report/export-csv?category_id=${stockCategoryFilter}&status=${stockStatusFilter}&search=${encodeURIComponent(stockSearch)}`,
                      `stock_report_${getISTDateString()}.csv`
                    );
                    notify.success('Stock Inventory CSV downloaded.', 'Export Complete');
                  } catch (err) {
                    notify.error(err.message || 'Export error', 'Error');
                  }
                }}
                sx={{ fontWeight: 700 }}
              >
                CSV
              </Button>

              {onOpenStickersModal && (
                <Button
                  variant="outlined"
                  color="info"
                  size="small"
                  startIcon={<Tag size={14} />}
                  onClick={() => onOpenStickersModal(stockReportData.items?.length > 0 ? stockReportData.items : menuItems)}
                  sx={{ fontWeight: 700 }}
                >
                  Print Stickers
                </Button>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<FileText size={14} />}
                onClick={() => handleOpenItemLogs(null)}
                sx={{ fontWeight: 700 }}
              >
                Stock Logs
              </Button>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<Sliders size={15} />}
              onClick={() => setAdjustmentModalOpen(true)}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              Batch Stock Adjustment
            </Button>
          </Box>

          {/* Filter Bar */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search product, SKU, barcode..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} color="#64748b" />
                      </InputAdornment>
                    ),
                    endAdornment: stockSearch ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setStockSearch('')}><X size={14} /></IconButton>
                      </InputAdornment>
                    ) : null
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
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

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stock Status</InputLabel>
                  <Select
                    value={stockStatusFilter}
                    label="Stock Status"
                    onChange={e => setStockStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Stock Statuses</MenuItem>
                    <MenuItem value="in_stock">In Stock Only</MenuItem>
                    <MenuItem value="low_stock">Low Stock Alerts Only</MenuItem>
                    <MenuItem value="out_of_stock">Out of Stock Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Inventory Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Physical Stock</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.main' }}>Reserved</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>Available to Sell</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Unit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Low Threshold</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingCatalog ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : (stockReportData.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No inventory records match the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  (stockReportData.items || []).map(row => {
                    const curStock = parseFloat(row.current_stock || 0);
                    const resStock = parseFloat(row.reserved_stock || 0);
                    const availStock = Math.max(0, curStock - resStock);
                    const lowThresh = parseFloat(row.low_stock_threshold || row.min_stock || 10);
                    const isOutOfStock = availStock <= 0;
                    const isLowStock = !isOutOfStock && availStock <= lowThresh;
                    const isWeight = row.is_weight_based === 1 || row.unit === 'kg';
                    const decimals = isWeight ? 3 : (curStock % 1 !== 0 ? 2 : 0);

                    return (
                      <TableRow key={row.id || row.menu_item_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name || row.item_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.category_name || 'General'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {row.sku || row.barcode || '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {curStock.toFixed(decimals)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: resStock > 0 ? 'warning.main' : 'text.secondary', fontWeight: 600 }}>
                          {resStock > 0 ? resStock.toFixed(decimals) : '0'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: isOutOfStock ? 'error.main' : isLowStock ? 'warning.main' : 'success.main', fontSize: '0.95rem' }}>
                          {availStock.toFixed(decimals)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={row.unit || 'pcs'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{lowThresh.toFixed(decimals)}</TableCell>
                        <TableCell align="center">
                          {isOutOfStock ? (
                            <Chip icon={<XCircle size={13} />} label="Out of Stock" color="error" size="small" sx={{ fontWeight: 700 }} />
                          ) : isLowStock ? (
                            <Chip icon={<AlertTriangle size={13} />} label="Low Stock" color="warning" size="small" sx={{ fontWeight: 700 }} />
                          ) : (
                            <Chip icon={<CheckCircle size={13} />} label="In Stock" color="success" size="small" sx={{ fontWeight: 700 }} />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="View Exact Rack Locations & Movement Timeline">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedLocationProduct({
                                    id: row.id || row.menu_item_id,
                                    name: row.name || row.item_name,
                                    sku: row.sku,
                                    barcode: row.barcode,
                                    current_stock: curStock,
                                    unit: row.unit
                                  });
                                  setLocationModalOpen(true);
                                }}
                              >
                                <MapPin size={15} />
                              </IconButton>
                            </Tooltip>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleOpenSingleAdjust(row)}
                              sx={{ fontSize: '0.75rem', px: 1, py: 0.25, fontWeight: 700 }}
                            >
                              Adjust
                            </Button>
                            <IconButton size="small" onClick={() => handleOpenItemLogs(row)} title="Audit Logs">
                              <FileText size={15} />
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

      {/* -------------------------------------------------------------------
          SUB-TAB 3: WAREHOUSES & OUTLETS
          ------------------------------------------------------------------- */}
      {subTab === 'warehouses' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Warehouses & Outlets</Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => { setEditingWarehouse(null); setWarehouseModalOpen(true); }}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              Add Warehouse / Outlet
            </Button>
          </Box>

          <Grid container spacing={2}>
            {warehouses.map(w => (
              <Grid item xs={12} sm={6} md={4} key={w.id}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{w.name}</Typography>
                        {Boolean(w.is_default) && (
                          <Chip label="Primary" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Code: {w.code} | Status: <span style={{ color: w.status === 'active' ? '#16a34a' : '#ef4444' }}>{w.status}</span>
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => { setEditingWarehouse(w); setWarehouseModalOpen(true); }}>
                      <Edit2 size={16} />
                    </IconButton>
                  </Box>

                  {w.address && (
                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem' }}>
                      📍 {w.address}{w.city ? `, ${w.city}` : ''}{w.pincode ? ` - ${w.pincode}` : ''}
                    </Typography>
                  )}

                  {w.contact_person && (
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      👤 Contact: {w.contact_person} {w.contact_number ? `(${w.contact_number})` : ''}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid #e2e8f0', mt: 'auto' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        setSelectedWarehouseFilter(String(w.id));
                        setSubTab('catalog');
                      }}
                      sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      View Stock
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      onClick={() => {
                        setPrefilledRequestForTransfer(null);
                        setStockTransferModalOpen(true);
                      }}
                      sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      Transfer Stock
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB: WAREHOUSE RACKS & LOCATIONS
          ------------------------------------------------------------------- */}
      {subTab === 'racks' && (
        <WarehouseRacksTab
          warehouses={warehouses}
          defaultWarehouseId={selectedWarehouseFilter !== 'all' ? selectedWarehouseFilter : null}
        />
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB: STOCK COUNTING SUITE
          ------------------------------------------------------------------- */}
      {subTab === 'stock_counting' && (
        <StockCountingSuite
          warehouses={warehouses}
          menuItems={menuItems}
          defaultWarehouseId={selectedWarehouseFilter !== 'all' ? selectedWarehouseFilter : null}
        />
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB 4: STOCK REQUESTS & APPROVALS
          ------------------------------------------------------------------- */}
      {subTab === 'requests' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Stock Requests</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={requestStatusFilter}
                  onChange={e => setRequestStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending Approval</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="transferred">Transferred</MenuItem>
                  <MenuItem value="received">Received</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setStockRequestModalOpen(true)}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              Create Stock Request
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Request #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Requesting Outlet</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Source Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Requested By</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Items</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRequests ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No stock requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map(req => (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{req.request_number}</TableCell>
                      <TableCell>{req.request_date ? new Date(req.request_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{req.requesting_warehouse_name}</TableCell>
                      <TableCell sx={{ color: '#0284c7', fontWeight: 600 }}>{req.source_warehouse_name}</TableCell>
                      <TableCell>{req.requested_by_name || 'Staff'}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${req.item_count || 0} items`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={(req.status || 'pending').toUpperCase()}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: req.status === 'approved' ? '#dcfce7' : req.status === 'transferred' ? '#e0f2fe' : req.status === 'received' ? '#d1fae5' : req.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                            color: req.status === 'approved' ? '#15803d' : req.status === 'transferred' ? '#0369a1' : req.status === 'received' ? '#065f46' : req.status === 'rejected' ? '#b91c1c' : '#a16207'
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant={req.status === 'pending' ? 'contained' : 'outlined'}
                            color="primary"
                            onClick={() => setReviewRequestId(req.id)}
                            sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {req.status === 'pending' ? 'Review & Approve' : 'View Details'}
                          </Button>

                          {(req.status === 'approved' || req.status === 'partially_approved') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Truck size={14} />}
                              onClick={() => {
                                setPrefilledRequestForTransfer(req);
                                setStockTransferModalOpen(true);
                              }}
                              sx={{ fontSize: '0.75rem', fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
                            >
                              Dispatch Transfer
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB 5: TRANSFERS & RECEIVING
          ------------------------------------------------------------------- */}
      {subTab === 'transfers' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Stock Transfers & Consignments</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={transferStatusFilter}
                  onChange={e => setTransferStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="in_transit">In Transit (Dispatched)</MenuItem>
                  <MenuItem value="received">Received</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => { setPrefilledRequestForTransfer(null); setStockTransferModalOpen(true); }}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              New Direct Transfer
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Transfer #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Source Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Destination Warehouse</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Total Items</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Dispatched By</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingTransfers ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                  </TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No transfers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map(tr => (
                    <TableRow key={tr.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{tr.transfer_number}</TableCell>
                      <TableCell>{tr.transfer_date ? new Date(tr.transfer_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{tr.source_warehouse_name}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#16a34a' }}>{tr.destination_warehouse_name}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${tr.item_count || 0} items`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={(tr.status || 'in_transit').toUpperCase()}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: tr.status === 'received' ? '#dcfce7' : tr.status === 'in_transit' ? '#e0f2fe' : '#f1f5f9',
                            color: tr.status === 'received' ? '#15803d' : tr.status === 'in_transit' ? '#0369a1' : '#475569'
                          }}
                        />
                      </TableCell>
                      <TableCell>{tr.created_by_name || 'Staff'}</TableCell>
                      <TableCell align="center">
                        {tr.status === 'in_transit' ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<PackageCheck size={14} />}
                            onClick={() => setReceivingTransferId(tr.id)}
                            sx={{ fontSize: '0.75rem', fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
                          >
                            Receive Stock
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setReceivingTransferId(tr.id)}
                            sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            View Receipt
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB 6: SUPPLIERS / VENDORS
          ------------------------------------------------------------------- */}
      {subTab === 'suppliers' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Suppliers & Vendors</Typography>
              <TextField
                size="small"
                placeholder="Search vendor name, GSTIN, mobile..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={15} color="#64748b" />
                    </InputAdornment>
                  )
                }}
                sx={{ width: 280 }}
              />
            </Box>

            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => { setEditingSupplier(null); setSupplierModalOpen(true); }}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              Add New Supplier
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Supplier / Company</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact Person</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mobile / Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>GSTIN</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding Balance (₹)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingSuppliers ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No suppliers found. Click "Add New Supplier" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map(s => {
                    const balance = parseFloat(s.current_balance || 0);
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                          {s.company_name && (
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              {s.company_name}
                            </Typography>
                          )}
                          {s.supplier_code && (
                            <Chip label={s.supplier_code} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace', mt: 0.2 }} />
                          )}
                        </TableCell>
                        <TableCell>{s.contact_person || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.mobile}</Typography>
                          {s.email && <Typography variant="caption" sx={{ color: '#64748b' }}>{s.email}</Typography>}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.gst_number || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: balance > 0 ? '#b91c1c' : '#16a34a' }}>
                          ₹{balance.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={(s.status || 'active').toUpperCase()}
                            size="small"
                            color={s.status === 'active' ? 'success' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => { setPayingSupplier(s); setSupplierPaymentModalOpen(true); }}
                              sx={{ fontSize: '0.7rem', fontWeight: 800, px: 1 }}
                            >
                              Pay
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              onClick={() => { setLedgerSupplier(s); setSupplierLedgerOpen(true); }}
                              sx={{ fontSize: '0.7rem', fontWeight: 700 }}
                            >
                              Ledger
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Edit2 size={13} />}
                              onClick={() => { setEditingSupplier(s); setSupplierModalOpen(true); }}
                              sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              Edit
                            </Button>
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

      {/* -------------------------------------------------------------------
          SUB-TAB 7: PURCHASES & BILLS (POs, BILLS, RETURNS)
          ------------------------------------------------------------------- */}
      {subTab === 'purchases' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Segment Toggle & Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant={purchaseSegment === 'orders' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setPurchaseSegment('orders')}
                sx={{ fontWeight: 700 }}
              >
                Purchase Orders (POs)
              </Button>
              <Button
                variant={purchaseSegment === 'grns' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setPurchaseSegment('grns')}
                sx={{ fontWeight: 700, ...(purchaseSegment === 'grns' ? { bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } } : {}) }}
              >
                GRN (Goods Received)
              </Button>
              <Button
                variant={purchaseSegment === 'bills' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setPurchaseSegment('bills')}
                sx={{ fontWeight: 700 }}
              >
                Purchase Bills
              </Button>
              <Button
                variant={purchaseSegment === 'returns' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setPurchaseSegment('returns')}
                sx={{ fontWeight: 700 }}
              >
                Purchase Returns
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {purchaseSegment === 'orders' && (
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => setPoModalOpen(true)}
                  sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
                >
                  Create Purchase Order
                </Button>
              )}
              {purchaseSegment === 'grns' && (
                <Button
                  variant="contained"
                  startIcon={<PackageCheck size={16} />}
                  onClick={() => { setPurchaseSegment('orders'); }}
                  sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, fontWeight: 700 }}
                >
                  ← Go to Orders to Create GRN
                </Button>
              )}
              {purchaseSegment === 'bills' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Plus size={16} />}
                  onClick={() => { setPrefilledPOForBill(null); setBillModalOpen(true); }}
                  sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
                >
                  Record Purchase Bill
                </Button>
              )}
              {purchaseSegment === 'returns' && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Undo2 size={16} />}
                  onClick={() => setReturnModalOpen(true)}
                  sx={{ fontWeight: 700 }}
                >
                  Record Purchase Return
                </Button>
              )}
            </Box>
          </Box>

          {/* Section 1: Purchase Bills Table */}
          {purchaseSegment === 'bills' && (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Internal Ref #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Vendor Bill #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Receiving Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Bill Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount (₹)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingPurchases ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : purchaseBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No purchase bills recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseBills.map(b => (
                      <TableRow key={b.id} hover>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{b.internal_bill_number}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{b.bill_number}</TableCell>
                        <TableCell>{b.supplier_name}</TableCell>
                        <TableCell>{b.warehouse_name}</TableCell>
                        <TableCell>{b.bill_date ? new Date(b.bill_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a' }}>
                          ₹{parseFloat(b.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={(b.payment_status || 'unpaid').toUpperCase()}
                            size="small"
                            color={b.payment_status === 'paid' ? 'success' : b.payment_status === 'partially_paid' ? 'warning' : 'error'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>{b.created_by_name || 'Staff'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Section 2: Purchase Orders Table */}
          {purchaseSegment === 'orders' && (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>PO #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Order Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Expected Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, minWidth: 250 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingPurchases ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No Purchase Orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map(po => (
                      <TableRow key={po.id} hover sx={{ opacity: po.status === 'cancelled' ? 0.6 : 1 }}>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{po.po_number}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{po.supplier_name}</TableCell>
                        <TableCell>{po.warehouse_name}</TableCell>
                        <TableCell>{po.order_date ? new Date(po.order_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          ₹{parseFloat(po.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={(po.status || 'pending').replace('_', ' ').toUpperCase()}
                            size="small"
                            color={
                              po.status === 'received' ? 'success' :
                              po.status === 'cancelled' ? 'default' :
                              po.status === 'approved' ? 'primary' :
                              po.status === 'partially_received' ? 'info' : 'warning'
                            }
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {/* Approve: only on pending */}
                            {po.status === 'pending' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                disabled={poActionLoading === po.id + '_approve'}
                                onClick={() => handleApprovePO(po.id)}
                                sx={{ fontSize: '0.7rem', fontWeight: 700, minWidth: 70 }}
                              >
                                {poActionLoading === po.id + '_approve' ? '...' : 'Approve'}
                              </Button>
                            )}
                            {/* Create GRN: approved or partially_received */}
                            {(po.status === 'approved' || po.status === 'partially_received') && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => { setGrnPO(po); setGrnModalOpen(true); }}
                                sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, minWidth: 80 }}
                              >
                                + GRN
                              </Button>
                            )}
                            {/* Create Bill: approved/partially_received/received */}
                            {!['cancelled', 'pending'].includes(po.status) && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => { setPrefilledPOForBill(po); setBillModalOpen(true); }}
                                sx={{ fontSize: '0.7rem', fontWeight: 700, minWidth: 70 }}
                              >
                                Bill
                              </Button>
                            )}
                            {/* Cancel: only pending/approved (no GRNs) */}
                            {['pending', 'approved'].includes(po.status) && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={poActionLoading === po.id + '_cancel'}
                                onClick={() => handleCancelPO(po.id)}
                                sx={{ fontSize: '0.7rem', fontWeight: 700, minWidth: 60 }}
                              >
                                {poActionLoading === po.id + '_cancel' ? '...' : 'Cancel'}
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Section 2b: GRN List */}
          {purchaseSegment === 'grns' && (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>GRN #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>PO #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>GRN Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Accepted Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Rejected</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingPurchases ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : purchaseGRNs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No Goods Received Notes found. Create a GRN from the Purchase Orders tab.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseGRNs.map(grn => (
                      <TableRow key={grn.id} hover>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#7c3aed' }}>{grn.grn_number}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', color: '#0284c7' }}>{grn.po_number}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{grn.supplier_name}</TableCell>
                        <TableCell>{grn.warehouse_name}</TableCell>
                        <TableCell>{grn.grn_date ? new Date(grn.grn_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#10b981' }}>
                          {parseFloat(grn.total_accepted_qty || 0).toFixed(3)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: grn.total_rejected_qty > 0 ? '#f59e0b' : 'text.secondary' }}>
                          {parseFloat(grn.total_rejected_qty || 0).toFixed(3)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={(grn.status || 'confirmed').toUpperCase()}
                            size="small"
                            color={grn.status === 'cancelled' ? 'default' : 'success'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {grn.status !== 'cancelled' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => {
                                setBillModalOpen(true);
                                setPrefilledPOForBill({ ...grn, _grn_id: grn.id, items: [] });
                              }}
                              sx={{ fontSize: '0.7rem', fontWeight: 700 }}
                            >
                              → Create Bill
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Section 3: Purchase Returns Table */}
          {purchaseSegment === 'returns' && (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Return #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Source Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Debit Total (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingPurchases ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : purchaseReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No purchase returns recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseReturns.map(ret => (
                      <TableRow key={ret.id} hover>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#dc2626' }}>{ret.return_number}</TableCell>
                        <TableCell>{ret.return_date ? new Date(ret.return_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{ret.supplier_name}</TableCell>
                        <TableCell>{ret.warehouse_name}</TableCell>
                        <TableCell>{ret.reason || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626' }}>
                          ₹{parseFloat(ret.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{ret.created_by_name || 'Staff'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB 8: STOCK ADJUSTMENTS
          ------------------------------------------------------------------- */}
      {subTab === 'adjustments' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Stock Adjustments & Reconciliation</Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setAdjustmentModalOpen(true)}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              New Stock Adjustment
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Adjustment #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Items Adjusted</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Adjusted By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingAdjustments ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                  </TableRow>
                ) : adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No stock adjustments recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map(adj => (
                    <TableRow key={adj.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{adj.adjustment_number}</TableCell>
                      <TableCell>{adj.adjustment_date ? new Date(adj.adjustment_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{adj.warehouse_name}</TableCell>
                      <TableCell>
                        <Chip label={adj.reason} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${adj.item_count || 0} lines`} size="small" />
                      </TableCell>
                      <TableCell>{adj.created_by_name || 'Staff'}</TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>{adj.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* -------------------------------------------------------------------
          SUB-TAB 9: STOCK LEDGER AUDIT TRAIL
          ------------------------------------------------------------------- */}
      {subTab === 'ledger' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Filters Bar */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Transaction Type</InputLabel>
                  <Select
                    value={ledgerTypeFilter}
                    label="Transaction Type"
                    onChange={e => { setLedgerTypeFilter(e.target.value); setLedgerPage(1); }}
                  >
                    <MenuItem value="all">All Movements</MenuItem>
                    <MenuItem value="PURCHASE">PURCHASE (Goods Inward)</MenuItem>
                    <MenuItem value="SALE">SALE (POS & Orders)</MenuItem>
                    <MenuItem value="SALES_RETURN">SALES_RETURN (Order Cancel)</MenuItem>
                    <MenuItem value="TRANSFER_IN">TRANSFER_IN (Received)</MenuItem>
                    <MenuItem value="TRANSFER_OUT">TRANSFER_OUT (Dispatched)</MenuItem>
                    <MenuItem value="DAMAGE">DAMAGE</MenuItem>
                    <MenuItem value="EXPIRED">EXPIRED</MenuItem>
                    <MenuItem value="ADJUSTMENT_IN">ADJUSTMENT_IN (+)</MenuItem>
                    <MenuItem value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (-)</MenuItem>
                    <MenuItem value="STOCK_CORRECTION">STOCK_CORRECTION</MenuItem>
                    <MenuItem value="OPENING_STOCK">OPENING_STOCK</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={ledgerWarehouseFilter}
                    label="Warehouse"
                    onChange={e => { setLedgerWarehouseFilter(e.target.value); setLedgerPage(1); }}
                  >
                    <MenuItem value="all">All Warehouses</MenuItem>
                    {warehouses.map(w => (
                      <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download size={14} />}
                  onClick={async () => {
                    try {
                      let csv = 'Timestamp,Warehouse,Item Name,Type,Quantity,Previous Stock,New Stock,Ref Type,Ref Number,User,Notes\r\n';
                      (ledgerData.transactions || []).forEach(tx => {
                        csv += `"${tx.created_at}","${tx.warehouse_name || ''}","${tx.item_name || ''}","${tx.transaction_type}","${tx.quantity}","${tx.previous_stock}","${tx.new_stock}","${tx.reference_type || ''}","${tx.reference_number || ''}","${tx.user_name || ''}","${(tx.notes || '').replace(/"/g, '""')}"\r\n`;
                      });
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `stock_ledger_${getISTDateString()}.csv`;
                      a.click();
                      notify.success('Ledger exported to CSV.', 'Exported');
                    } catch (err) {
                      notify.error('Failed to export ledger.', 'Export Error');
                    }
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  Export Ledger (CSV)
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Ledger Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Movement Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Qty Changed</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Stock Transition</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingLedger ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell>
                  </TableRow>
                ) : (ledgerData.transactions || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No ledger transactions found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerData.transactions.map(tx => {
                    const isPositive = ['PURCHASE', 'TRANSFER_IN', 'SALES_RETURN', 'ADJUSTMENT_IN', 'OPENING_STOCK'].includes(tx.transaction_type);
                    return (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{tx.warehouse_name}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{tx.item_name}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={tx.transaction_type}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              bgcolor: isPositive ? '#dcfce7' : '#fee2e2',
                              color: isPositive ? '#15803d' : '#b91c1c'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: isPositive ? '#16a34a' : '#dc2626' }}>
                          {isPositive ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {tx.previous_stock} → <strong>{tx.new_stock}</strong>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {tx.reference_number ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tx.reference_number}</span>
                          ) : tx.reference_type || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{tx.user_name || 'System'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* -------------------------------------------------------------------
          MODALS & DIALOGS
          ------------------------------------------------------------------- */}
      {/* 1. Add / Edit Warehouse */}
      <WarehouseModal
        open={warehouseModalOpen}
        warehouse={editingWarehouse}
        onClose={() => setWarehouseModalOpen(false)}
        onSave={handleSaveWarehouse}
      />

      {/* 2. Add / Edit Supplier */}
      <SupplierModal
        open={supplierModalOpen}
        supplier={editingSupplier}
        onClose={() => setSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
      />

      {/* 3. Create Stock Request */}
      <StockRequestModal
        open={stockRequestModalOpen}
        warehouses={warehouses}
        onClose={() => setStockRequestModalOpen(false)}
        onCreated={() => { fetchRequests(); fetchDashboardMetrics(); }}
      />

      {/* 4. Review & Approve Stock Request */}
      <StockRequestApprovalModal
        open={Boolean(reviewRequestId)}
        requestId={reviewRequestId}
        onClose={() => setReviewRequestId(null)}
        onUpdated={() => { fetchRequests(); fetchDashboardMetrics(); }}
      />

      {/* 5. Initiate Stock Transfer */}
      <StockTransferModal
        open={stockTransferModalOpen}
        warehouses={warehouses}
        prefilledRequest={prefilledRequestForTransfer}
        onClose={() => setStockTransferModalOpen(false)}
        onCreated={() => { fetchTransfers(); fetchDashboardMetrics(); }}
      />

      {/* 6. Receive Goods Transfer */}
      <StockReceivingModal
        open={Boolean(receivingTransferId)}
        transferId={receivingTransferId}
        onClose={() => setReceivingTransferId(null)}
        onReceived={() => { fetchTransfers(); fetchCatalog(); fetchDashboardMetrics(); }}
      />

      {/* 7. Purchase Order Modal */}
      <PurchaseOrderModal
        open={poModalOpen}
        warehouses={warehouses}
        suppliers={suppliers}
        onClose={() => setPoModalOpen(false)}
        onCreated={() => { fetchPurchases(); fetchDashboardMetrics(); }}
      />

      {/* 8. Purchase Bill (Goods Inward) Modal */}
      <PurchaseBillModal
        open={billModalOpen}
        warehouses={warehouses}
        suppliers={suppliers}
        prefilledPO={prefilledPOForBill}
        onClose={() => setBillModalOpen(false)}
        onCreated={() => { fetchPurchases(); fetchCatalog(); fetchDashboardMetrics(); }}
      />

      {/* 9. Purchase Return Modal */}
      <PurchaseReturnModal
        open={returnModalOpen}
        warehouses={warehouses}
        suppliers={suppliers}
        onClose={() => setReturnModalOpen(false)}
        onCreated={() => { fetchPurchases(); fetchCatalog(); fetchDashboardMetrics(); }}
      />

      {/* 10. Multi-Line Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={adjustmentModalOpen}
        warehouses={warehouses}
        onClose={() => setAdjustmentModalOpen(false)}
        onCreated={() => { fetchAdjustments(); fetchCatalog(); fetchDashboardMetrics(); }}
      />

      {/* 11. Legacy Single Item Stock Adjust Modal */}
      <Dialog open={singleAdjustOpen} onClose={() => setSingleAdjustOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Adjust Stock: {singleAdjustItem?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Adjustment Action</InputLabel>
            <Select
              value={singleAdjustType}
              label="Adjustment Action"
              onChange={e => setSingleAdjustType(e.target.value)}
            >
              <MenuItem value="add">Add Stock (+ Quantity)</MenuItem>
              <MenuItem value="reduce">Reduce Stock (- Quantity)</MenuItem>
              <MenuItem value="set">Set Exact Stock (= Quantity)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Quantity"
            type="number"
            size="small"
            fullWidth
            value={singleAdjustQty}
            onChange={e => setSingleAdjustQty(e.target.value)}
          />

          <TextField
            label="Reason / Notes"
            size="small"
            fullWidth
            placeholder="e.g. Restock shipment, damaged..."
            value={singleAdjustReason}
            onChange={e => setSingleAdjustReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSingleAdjustOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingSingleAdjust}
            onClick={handleSaveSingleAdjust}
            sx={{ fontWeight: 800 }}
          >
            {savingSingleAdjust ? 'Saving...' : 'Save Stock Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 12. Single Item Stock Logs Modal */}
      <Dialog open={logsModalOpen} onClose={() => setLogsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider' }}>
          Stock Adjustment Audit Trail {logsItem ? `: ${logsItem.name}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {loadingLogs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : itemLogs.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No stock logs recorded.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Change Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Stock Transition</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemLogs.map((log, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{log.item_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.adjustment_type || 'set'}
                          size="small"
                          color={log.adjustment_type === 'add' ? 'success' : log.adjustment_type === 'reduce' ? 'warning' : 'info'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{log.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.85rem' }}>
                        {log.previous_stock} → <strong>{log.new_stock}</strong>
                      </TableCell>
                      <TableCell>{log.reason || '-'}</TableCell>
                      <TableCell>{log.user_name || 'System'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
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
          <Button onClick={() => setLogsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* 13. GRN Modal — Goods Received Note */}
      <GRNModal
        open={grnModalOpen}
        onClose={() => { setGrnModalOpen(false); setGrnPO(null); }}
        purchaseOrder={grnPO}
        onCreated={() => {
          fetchPurchases();
          fetchDashboardMetrics();
          setPurchaseSegment('grns');
        }}
      />

      {/* 14. Supplier Ledger Modal */}
      <SupplierLedgerModal
        open={supplierLedgerOpen}
        onClose={() => { setSupplierLedgerOpen(false); setLedgerSupplier(null); }}
        supplier={ledgerSupplier}
        onPaymentRecorded={() => fetchSuppliers()}
      />

      {/* 15. Supplier Payment Modal */}
      <SupplierPaymentModal
        open={supplierPaymentModalOpen}
        onClose={() => { setSupplierPaymentModalOpen(false); setPayingSupplier(null); }}
        supplier={payingSupplier}
        onPaymentSuccess={() => fetchSuppliers()}
      />

      {/* 16. Product Location Distribution & Movement Timeline Modal */}
      <ProductLocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        product={selectedLocationProduct}
      />
    </Box>
  );
}
