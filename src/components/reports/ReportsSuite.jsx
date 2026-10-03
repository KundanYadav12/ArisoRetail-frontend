import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Divider,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TableFooter
} from '@mui/material';
import {
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  ShoppingBag,
  DollarSign,
  Package,
  Truck,
  Users,
  CreditCard,
  Clock,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart,
  PlusCircle,
  Trash2,
  Landmark,
  Scale,
  LayoutTemplate,
  BookOpen,
  ArrowLeft,
  HelpCircle,
  Columns,
  Star,
  LayoutGrid,
  Table as TableIcon,
  ArrowRight
} from 'lucide-react';
import { apiFetch, downloadFile } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';
import FinancialStatementView from './FinancialStatementView';

export default function ReportsSuite({ onOpenOrderDetail = null }) {
  const { notify } = useNotify();

  // Navigation & Category Selection
  const [selectedDomain, setSelectedDomain] = useState('sales'); // 'bi' | 'sales' | 'purchase' | 'inventory' | 'gst' | 'payment' | 'customer' | 'staff' | 'custom'
  const [activeReportId, setActiveReportId] = useState('sales_daily');
  const [catalog, setCatalog] = useState([]);

  // Universal Filter State
  const [datePreset, setDatePreset] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');

  // Pagination & Sorting State
  const [page, setPage] = useState(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Data & Loading State
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState({ rows: [], summary: {}, dateRange: {} });
  const [financialViewMode, setFinancialViewMode] = useState('statement'); // 'statement' | 'table'
  const [biDashboardData, setBiDashboardData] = useState(null);
  const [dsrData, setDsrData] = useState(null);
  const [dsrDate, setDsrDate] = useState(() => getISTDateString());

  // Custom Report Builder State
  const [customSource, setCustomSource] = useState('sales');
  const [customFields, setCustomFields] = useState(['order_number', 'date', 'customer', 'total']);
  const [customReportName, setCustomReportName] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [savingCustomReport, setSavingCustomReport] = useState(false);

  // Inventory & Filter Specific State
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);

  // Cards Catalog & Favorite State
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [cardFilter, setCardFilter] = useState('all'); // 'all' | 'favorites'
  const [cardSearch, setCardSearch] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('ariso_favorite_reports');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleFavorite = (reportId, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId];
      try {
        localStorage.setItem('ariso_favorite_reports', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  // Initialize Catalog, Dates, and Warehouses/Categories
  useEffect(() => {
    fetchCatalog();
    handlePresetChange('month');
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [wRes, cRes] = await Promise.all([
        apiFetch('/api/inventory/warehouses'),
        apiFetch('/api/categories')
      ]);
      if (wRes.ok) {
        const wData = await wRes.json();
        setWarehouses(wData.warehouses || wData.data || (Array.isArray(wData) ? wData : []));
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCategories(cData.categories || cData.data || (Array.isArray(cData) ? cData : []));
      }
    } catch (e) {
      console.warn('Could not load warehouses or categories for filter options', e);
    }
  };

  // Fetch report data when activeReportId, filters, or pagination change
  useEffect(() => {
    if (selectedDomain === 'bi') {
      fetchBiDashboard();
    } else if (selectedDomain === 'dsr') {
      fetchDsrClosing();
    } else if (selectedDomain === 'custom') {
      fetchSavedReports();
    } else {
      fetchReportData();
    }
  }, [activeReportId, selectedDomain, datePreset, dateFrom, dateTo, page, rowsPerPage, paymentModeFilter, warehouseFilter, categoryFilter]);

  const fetchCatalog = async () => {
    try {
      const res = await apiFetch('/api/reports/catalog');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.catalog || []);
      }
    } catch (err) {
      console.error('[Reports Catalog Error]', err);
    }
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (preset === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (preset === 'yesterday') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      fromDate = new Date(now.setDate(diff));
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
    } else if (preset === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (preset === 'last_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (preset === 'this_quarter') {
      const currentQ = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), currentQ * 3, 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), (currentQ + 1) * 3, 0, 23, 59, 59);
    } else if (preset === 'this_fy') {
      const currentMonth = now.getMonth();
      const fyStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fromDate = new Date(fyStartYear, 3, 1, 0, 0, 0);
      toDate = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
    }

    if (preset !== 'custom') {
      const pad = (n) => String(n).padStart(2, '0');
      const fromStr = `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())} 00:00:00`;
      const toStr = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())} 23:59:59`;
      setDateFrom(fromStr);
      setDateTo(toStr);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/view/${activeReportId}?preset=${datePreset}&page=${page + 1}&limit=${rowsPerPage}`;
      if (datePreset === 'custom') {
        url += `&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
      }
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (paymentModeFilter !== 'all') url += `&payment_mode=${encodeURIComponent(paymentModeFilter)}`;
      if (warehouseFilter !== 'all') url += `&warehouse_id=${encodeURIComponent(warehouseFilter)}`;
      if (categoryFilter !== 'all') url += `&category_id=${encodeURIComponent(categoryFilter)}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData({
          rows: data.rows || [],
          summary: data.summary || {},
          dateRange: data.dateRange || {},
          reconciliation: data.reconciliation || null,
          structuredData: data.structuredData || null
        });
        setTotalCount(data.pagination?.totalCount || 0);
      } else {
        notify.error('Failed to load report data.', 'Error');
      }
    } catch (err) {
      console.error('[Fetch Report Error]', err);
      notify.error('Network error loading report.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBiDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/reports/bi/dashboard');
      if (res.ok) {
        const data = await res.json();
        setBiDashboardData(data);
      }
    } catch (err) {
      console.error('[BI Dashboard Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDsrClosing = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/bi/dsr?date=${encodeURIComponent(dsrDate)}`);
      if (res.ok) {
        const data = await res.json();
        setDsrData(data);
      }
    } catch (err) {
      console.error('[DSR Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedReports = async () => {
    try {
      const res = await apiFetch('/api/reports/custom/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      console.error('[Fetch Saved Reports Error]', err);
    }
  };

  const handleExport = async (format = 'excel') => {
    setExporting(true);
    try {
      let url = `/api/reports/export/${activeReportId}?format=${format}&preset=${datePreset}`;
      if (datePreset === 'custom') {
        url += `&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
      }
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (paymentModeFilter !== 'all') url += `&payment_mode=${encodeURIComponent(paymentModeFilter)}`;
      if (warehouseFilter !== 'all') url += `&warehouse_id=${encodeURIComponent(warehouseFilter)}`;
      if (categoryFilter !== 'all') url += `&category_id=${encodeURIComponent(categoryFilter)}`;

      const extension = format === 'csv' ? 'csv' : 'xlsx';
      await downloadFile(url, `${activeReportId}_${Date.now()}.${extension}`);
      notify.success(`${format.toUpperCase()} report downloaded successfully.`, 'Export Complete');
    } catch (err) {
      console.error('[Export Error]', err);
      notify.error(err.message || 'Export failed.', 'Error');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 15 Standard Inventory Reports in exact specification order
  const INVENTORY_REPORT_ORDER = [
    'inventory_valuation_summary',
    'inventory_godown_summary',
    'inventory_categorywise_summary',
    'inventory_category_mis',
    'inventory_groupwise_summary',
    'inventory_negative_stock',
    'inventory_fifo_lot_tracking',
    'inventory_stock_summary',
    'inventory_highest_selling',
    'inventory_least_selling',
    'inventory_batch_wise',
    'inventory_item_stock_levels',
    'inventory_reorder_suggestions',
    'inventory_reserved_stock',
    'inventory_challan_invoice_variance'
  ];

  // Find active report metadata
  const currentReportMeta = catalog.find(c => c.id === activeReportId) || {
    title: activeReportId.replace(/_/g, ' ').toUpperCase(),
    columns: []
  };

  // Reports categorized by domain (enforcing exact 15-report order for inventory)
  const rawDomainReports = catalog.filter(c => c.category === selectedDomain);
  const domainReports = selectedDomain === 'inventory'
    ? [...rawDomainReports].sort((a, b) => {
        const idxA = INVENTORY_REPORT_ORDER.indexOf(a.id);
        const idxB = INVENTORY_REPORT_ORDER.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      })
    : rawDomainReports;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Print CSS Stylesheet */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          aside, header, nav, .MuiTabs-root, .no-print, button, input, select {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: auto;
            margin: 12mm;
          }
        }
      `}</style>

      {/* Top Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Reports & Business Intelligence Suite
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enterprise-grade analytics, statutory sales audits, inventory ledgers, and CA-ready compliance reports.
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {selectedDomain !== 'bi' && selectedDomain !== 'dsr' && selectedDomain !== 'custom' && (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <FileSpreadsheet size={15} />}
                onClick={() => handleExport('excel')}
                disabled={exporting}
                sx={{ fontWeight: 800, textTransform: 'none' }}
              >
                Export Excel (.xlsx)
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<Download size={14} />}
                onClick={() => handleExport('csv')}
                disabled={exporting}
                sx={{ fontWeight: 800, textTransform: 'none' }}
              >
                CSV
              </Button>
            </>
          )}

          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<Printer size={14} />}
            onClick={handlePrint}
            sx={{ fontWeight: 800, textTransform: 'none' }}
          >
            Print
          </Button>

          {selectedDomain !== 'bi' && selectedDomain !== 'dsr' && selectedDomain !== 'custom' && currentReportMeta.columns?.length > 0 && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<Sliders size={14} />}
              onClick={() => setColumnDialogOpen(true)}
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              Manage Columns
            </Button>
          )}

          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              if (selectedDomain === 'bi') fetchBiDashboard();
              else if (selectedDomain === 'dsr') fetchDsrClosing();
              else fetchReportData();
            }}
          >
            <RefreshCw size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Main Navigation Tabs: 11 Report Domains */}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={selectedDomain}
          onChange={(e, val) => {
            setSelectedDomain(val);
            setPage(0);
            if (val === 'financial') {
              setActiveReportId('financial_pl_t');
              if (datePreset === 'month') {
                handlePresetChange('this_fy');
              }
            } else if (val === 'inventory') {
              setActiveReportId(INVENTORY_REPORT_ORDER[0]);
            } else {
              const firstInDomain = catalog.find(c => c.category === val);
              if (firstInDomain) setActiveReportId(firstInDomain.id);
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.85rem',
              minHeight: 48,
              px: 2
            }
          }}
        >
          <Tab icon={<Landmark size={15} />} iconPosition="start" label="Financial Statements & P&L" value="financial" />
          <Tab icon={<BarChart3 size={15} />} iconPosition="start" label="Executive BI" value="bi" />
          <Tab icon={<Clock size={15} />} iconPosition="start" label="Daily Closing (DSR)" value="dsr" />
          <Tab icon={<ShoppingBag size={15} />} iconPosition="start" label="Sales Reports" value="sales" />
          <Tab icon={<Truck size={15} />} iconPosition="start" label="Purchase Reports" value="purchase" />
          <Tab icon={<Package size={15} />} iconPosition="start" label="Inventory Reports" value="inventory" />
          <Tab icon={<FileText size={15} />} iconPosition="start" label="GST & Tax Reports" value="gst" />
          <Tab icon={<CreditCard size={15} />} iconPosition="start" label="Payment Reports" value="payment" />
          <Tab icon={<Users size={15} />} iconPosition="start" label="Customer / Party" value="customer" />
          <Tab icon={<TrendingUp size={15} />} iconPosition="start" label="Staff Performance" value="staff" />
          <Tab icon={<Layers size={15} />} iconPosition="start" label="Branch & Store" value="branch" />
          <Tab icon={<Sliders size={15} />} iconPosition="start" label="Custom Report Builder" value="custom" />
        </Tabs>
      </Paper>

      {/* --- VIEW 1: EXECUTIVE BI DASHBOARD --- */}
      {selectedDomain === 'bi' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && biDashboardData && (
            <>
              {/* Metric Cards Grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        Today's Gross Sales
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'primary.main' }}>
                        ₹{parseFloat(biDashboardData.today?.sales || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {biDashboardData.today?.bills || 0} Bills • Tax: ₹{parseFloat(biDashboardData.today?.tax || 0).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        Month-to-Date Revenue
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'success.main' }}>
                        ₹{parseFloat(biDashboardData.monthToDate?.revenue || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Excludes GST • {biDashboardData.monthToDate?.bills || 0} Total Orders
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        Average Bill Value
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'text.primary' }}>
                        ₹{parseFloat(biDashboardData.monthToDate?.avgBill || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Current Month Basket Size
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: biDashboardData.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'background.paper',
                      borderColor: biDashboardData.lowStockCount > 0 ? 'error.light' : 'divider'
                    }}
                  >
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        Low Stock Alerts
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: biDashboardData.lowStockCount > 0 ? 'error.main' : 'text.primary' }}>
                        {biDashboardData.lowStockCount} Products
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Below minimum reorder threshold
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Top Selling Items & Payment Methods Reflow Grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                      ⭐ Top Selling Products (Current Month)
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Qty Sold</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Revenue (₹)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {biDashboardData.topSellingItems && biDashboardData.topSellingItems.length > 0 ? (
                            biDashboardData.topSellingItems.map((item, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                                <TableCell align="right">{parseFloat(item.qty_sold || 0).toFixed(1)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                  ₹{parseFloat(item.revenue || 0).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No sales transactions recorded this month.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                      💳 Payment Collections Split
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Bills</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Total (₹)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {biDashboardData.paymentSplit && biDashboardData.paymentSplit.length > 0 ? (
                            biDashboardData.paymentSplit.map((p, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase' }}>{p.mode}</TableCell>
                                <TableCell align="right">{p.cnt}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                  ₹{parseFloat(p.amt || 0).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No payment settlements recorded.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      )}

      {/* --- VIEW 2: DAILY SALES CLOSING (DSR) --- */}
      {selectedDomain === 'dsr' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                type="date"
                size="small"
                label="Select DSR Closing Date"
                value={dsrDate}
                onChange={(e) => setDsrDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: 220 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={fetchDsrClosing}
                startIcon={<Search size={15} />}
                sx={{ fontWeight: 800 }}
              >
                Load Daily Closing
              </Button>
            </Box>
          </Paper>

          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && dsrData && dsrData.metrics && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={1.7}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>BILLS ISSUED</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{dsrData.metrics.totalBills}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={1.7}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>GROSS SALES</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>₹{dsrData.metrics.grossSales.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={1.7}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DISCOUNTS</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'warning.main' }}>
                        {dsrData.metrics.discounts > 0 ? `-₹${dsrData.metrics.discounts.toFixed(2)}` : '₹0.00'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={1.7}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>RETURNS</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'error.main' }}>
                        {dsrData.metrics.returns > 0 ? `-₹${dsrData.metrics.returns.toFixed(2)}` : '₹0.00'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={1.7}>
                  <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.9 }}>NET SALES</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>₹{dsrData.metrics.netSales.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={1.7}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>GST / TAX</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'info.main' }}>+₹{(dsrData.metrics.gstCollected || 0).toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={1.8}>
                  <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.9 }}>GRAND TOTAL</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>₹{dsrData.metrics.grandTotal.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Settlement Summary Table */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                  💵 End-of-Day Settlement & Payment Split
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Payment Method</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Transaction Count</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Collected Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dsrData.payments && dsrData.payments.map((p, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase' }}>{p.mode}</TableCell>
                          <TableCell align="right">{p.cnt}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>₹{parseFloat(p.total || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </Box>
      )}

      {/* --- VIEW 3: STANDARD REPORTS VIEW (SALES, PURCHASE, INVENTORY, GST, ETC.) --- */}
      {selectedDomain !== 'bi' && selectedDomain !== 'dsr' && selectedDomain !== 'custom' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Sub-report Navigation / View Mode Header Bar */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: viewMode === 'cards' ? 0 : 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'inline-flex', p: 0.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Button
                    size="small"
                    variant={viewMode === 'cards' ? 'contained' : 'text'}
                    color={viewMode === 'cards' ? 'primary' : 'inherit'}
                    startIcon={<LayoutGrid size={15} />}
                    onClick={() => setViewMode('cards')}
                    sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', px: 1.5, borderRadius: 1.5 }}
                  >
                    Report Cards Catalog ({domainReports.length})
                  </Button>
                  <Button
                    size="small"
                    variant={viewMode === 'table' ? 'contained' : 'text'}
                    color={viewMode === 'table' ? 'primary' : 'inherit'}
                    startIcon={<TableIcon size={15} />}
                    onClick={() => setViewMode('table')}
                    sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', px: 1.5, borderRadius: 1.5 }}
                  >
                    Table View
                  </Button>
                </Box>
                {selectedDomain === 'inventory' && (
                  <Chip
                    label="15 Standard Inventory Reports"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                  />
                )}
              </Box>

              {viewMode === 'cards' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Search report name / keywords..."
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 260 } }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={14} style={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                  <Button
                    size="small"
                    variant={cardFilter === 'favorites' ? 'contained' : 'outlined'}
                    color={cardFilter === 'favorites' ? 'warning' : 'inherit'}
                    startIcon={<Star size={14} fill={cardFilter === 'favorites' ? '#ffffff' : '#eab308'} color={cardFilter === 'favorites' ? '#ffffff' : '#eab308'} />}
                    onClick={() => setCardFilter(prev => prev === 'favorites' ? 'all' : 'favorites')}
                    sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Favorites ({domainReports.filter(r => favorites.includes(r.id)).length})
                  </Button>
                </Box>
              )}
            </Box>

            {/* In Table view: show horizontal scrolling pills for all domain reports */}
            {viewMode === 'table' && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: { xs: 'nowrap', md: 'wrap' },
                  gap: 1.25,
                  overflowX: 'auto',
                  pt: 0.5,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 }
                }}
              >
                {domainReports.map((rep, idx) => {
                  const isActive = activeReportId === rep.id;
                  const isFav = favorites.includes(rep.id);
                  return (
                    <Button
                      key={rep.id}
                      size="small"
                      variant={isActive ? 'contained' : 'outlined'}
                      color={isActive ? 'primary' : 'inherit'}
                      onClick={() => {
                        setActiveReportId(rep.id);
                        setPage(0);
                      }}
                      startIcon={
                        isFav ? (
                          <Star size={12} fill="#eab308" color="#eab308" />
                        ) : null
                      }
                      sx={{
                        fontWeight: isActive ? 800 : 700,
                        fontSize: '0.8125rem',
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        borderRadius: 6,
                        px: 2,
                        py: 0.75,
                        borderColor: isActive ? 'primary.main' : 'divider',
                        bgcolor: isActive ? 'primary.main' : 'background.paper',
                        color: isActive ? 'primary.contrastText' : 'text.secondary',
                        boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                        '&:hover': {
                          bgcolor: isActive ? 'primary.dark' : 'action.hover',
                          color: isActive ? 'primary.contrastText' : 'text.primary',
                          borderColor: isActive ? 'primary.dark' : 'text.secondary'
                        },
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {selectedDomain === 'inventory' ? `${idx + 1}. ${rep.title}` : rep.title}
                    </Button>
                  );
                })}
              </Box>
            )}
          </Paper>

          {/* Cards Catalog Grid (When viewMode === 'cards') */}
          {viewMode === 'cards' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                {domainReports
                  .filter(rep => {
                    if (cardFilter === 'favorites' && !favorites.includes(rep.id)) return false;
                    if (cardSearch.trim()) {
                      const term = cardSearch.toLowerCase();
                      return rep.title.toLowerCase().includes(term) || (rep.description || '').toLowerCase().includes(term);
                    }
                    return true;
                  })
                  .map((rep, idx) => {
                    const isFav = favorites.includes(rep.id);
                    const orderIndex = selectedDomain === 'inventory'
                      ? INVENTORY_REPORT_ORDER.indexOf(rep.id) + 1
                      : idx + 1;
                    const orderBadge = String(orderIndex > 0 ? orderIndex : idx + 1).padStart(2, '0');

                    return (
                      <Grid item xs={12} sm={6} md={4} key={rep.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            p: 2.25,
                            position: 'relative',
                            transition: 'all 0.15s ease',
                            borderColor: activeReportId === rep.id ? 'primary.main' : 'divider',
                            bgcolor: 'background.paper',
                            boxShadow: activeReportId === rep.id ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
                              borderColor: 'primary.light'
                            }
                          }}
                        >
                          <Box>
                            {/* Card Top: Order Badge, Category Tag, Favorite Star */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={`#${orderBadge}`}
                                  size="small"
                                  sx={{
                                    fontWeight: 900,
                                    fontSize: '0.75rem',
                                    bgcolor: 'primary.50',
                                    color: 'primary.main',
                                    border: '1px solid',
                                    borderColor: 'primary.200'
                                  }}
                                />
                                <Chip
                                  label={rep.category.toUpperCase()}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                />
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => toggleFavorite(rep.id, e)}
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                                sx={{
                                  color: isFav ? '#eab308' : 'text.disabled',
                                  '&:hover': { color: '#eab308', bgcolor: 'rgba(234, 179, 8, 0.1)' }
                                }}
                              >
                                <Star size={18} fill={isFav ? '#eab308' : 'none'} color={isFav ? '#eab308' : 'currentColor'} />
                              </IconButton>
                            </Box>

                            {/* Card Title & Description */}
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75, lineHeight: 1.3 }}>
                              {rep.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5, mb: 2 }}>
                              {rep.description || 'Dynamic operational reporting and statutory ledger audit.'}
                            </Typography>
                          </Box>

                          {/* Card Footer: Columns Count & View Report Button */}
                          <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {rep.columns?.length || 0} Columns
                            </Typography>
                            <Button
                              variant="contained"
                              size="small"
                              color="primary"
                              endIcon={<ArrowRight size={14} />}
                              onClick={() => {
                                setActiveReportId(rep.id);
                                setViewMode('table');
                                setPage(0);
                              }}
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                textTransform: 'none',
                                borderRadius: 2,
                                px: 2,
                                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                              }}
                            >
                              View Report
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
              </Grid>
            </Box>
          )}

          {/* Universal Filter Bar (When viewMode === 'table') */}
          {viewMode === 'table' && (
            <>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              {/* Date Presets */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Date Range Preset</InputLabel>
                  <Select
                    value={datePreset}
                    label="Date Range Preset"
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="yesterday">Yesterday</MenuItem>
                    <MenuItem value="this_week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="last_month">Last Month</MenuItem>
                    <MenuItem value="this_quarter">This Quarter</MenuItem>
                    <MenuItem value="this_fy">Financial Year (Apr - Mar)</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Custom Date Pickers */}
              {datePreset === 'custom' && (
                <>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField
                      size="small"
                      fullWidth
                      label="From Date"
                      type="date"
                      value={dateFrom ? dateFrom.slice(0, 10) : ''}
                      onChange={(e) => setDateFrom(`${e.target.value} 00:00:00`)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField
                      size="small"
                      fullWidth
                      label="To Date"
                      type="date"
                      value={dateTo ? dateTo.slice(0, 10) : ''}
                      onChange={(e) => setDateTo(`${e.target.value} 23:59:59`)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </>
              )}

              {/* Search Bar */}
              <Grid item xs={12} sm={datePreset === 'custom' ? 6 : 6} md={datePreset === 'custom' ? 3 : 4}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search invoice, customer, item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={15} style={{ marginRight: 4, color: '#94a3b8' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>

              {/* Payment Filter (for sales & payments) */}
              {(selectedDomain === 'sales' || selectedDomain === 'payment') && (
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Payment Mode</InputLabel>
                    <Select
                      value={paymentModeFilter}
                      label="Payment Mode"
                      onChange={(e) => setPaymentModeFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Modes</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="upi">UPI / QR</MenuItem>
                      <MenuItem value="card">Card Swipe</MenuItem>
                      <MenuItem value="credit">Credit / Due</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Warehouse Filter (for inventory reports) */}
              {selectedDomain === 'inventory' && warehouses.length > 0 && (
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Godown / Warehouse</InputLabel>
                    <Select
                      value={warehouseFilter}
                      label="Godown / Warehouse"
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Godowns</MenuItem>
                      {warehouses.map(w => (
                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Category Filter (for inventory reports) */}
              {selectedDomain === 'inventory' && categories.length > 0 && (
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={categoryFilter}
                      label="Category"
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      {categories.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Active Report Header & Metadata with Catalog Switch & Favorite Star */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<LayoutGrid size={14} />}
                onClick={() => setViewMode('cards')}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  borderRadius: 2,
                  px: 1.25,
                  py: 0.5,
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}
              >
                Cards Catalog
              </Button>
              <IconButton
                size="small"
                onClick={(e) => toggleFavorite(activeReportId, e)}
                title={favorites.includes(activeReportId) ? 'Remove from favorites' : 'Add to favorites'}
                sx={{
                  color: favorites.includes(activeReportId) ? '#eab308' : 'text.disabled',
                  '&:hover': { color: '#eab308', bgcolor: 'rgba(234, 179, 8, 0.1)' }
                }}
              >
                <Star size={20} fill={favorites.includes(activeReportId) ? '#eab308' : 'none'} color={favorites.includes(activeReportId) ? '#eab308' : 'currentColor'} />
              </IconButton>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {currentReportMeta.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentReportMeta.description}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {selectedDomain === 'financial' && (
                <Box sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 2, overflow: 'hidden', p: 0.25, bgcolor: '#f1f5f9' }}>
                  <Button
                    size="small"
                    variant={financialViewMode === 'statement' ? 'contained' : 'text'}
                    color={financialViewMode === 'statement' ? 'primary' : 'inherit'}
                    onClick={() => setFinancialViewMode('statement')}
                    startIcon={<BookOpen size={14} />}
                    sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', px: 1.5, py: 0.5 }}
                  >
                    Audited Statement
                  </Button>
                  <Button
                    size="small"
                    variant={financialViewMode === 'table' ? 'contained' : 'text'}
                    color={financialViewMode === 'table' ? 'primary' : 'inherit'}
                    onClick={() => setFinancialViewMode('table')}
                    startIcon={<LayoutTemplate size={14} />}
                    sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', px: 1.5, py: 0.5 }}
                  >
                    Ledger Grid
                  </Button>
                </Box>
              )}
              {reportData.dateRange?.label && (
                <Chip
                  label={`Period: ${reportData.dateRange.label}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                />
              )}
            </Box>
          </Box>

          {/* Summary Metric Ribbon (when available) */}
          {reportData.summary && Object.keys(reportData.summary).length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'action.hover' }}>
              <Grid container spacing={2}>
                {(reportData.summary.totalBills !== undefined || reportData.summary.totalOrders !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Bills</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {reportData.summary.totalBills ?? reportData.summary.totalOrders}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.grossSales !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Gross Sales</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>₹{reportData.summary.grossSales.toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.discounts !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Discounts</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>
                      {reportData.summary.discounts > 0 ? `-₹${reportData.summary.discounts.toFixed(2)}` : '₹0.00'}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.returns !== undefined && reportData.summary.returns > 0 && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Returns</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>
                      -₹{(parseFloat(reportData.summary.returns || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.netSales !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net Revenue</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>₹{(parseFloat(reportData.summary.netSales || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {(reportData.summary.gst !== undefined || reportData.summary.gstCollected !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>GST / Tax</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'info.main' }}>
                      +₹{((parseFloat(reportData.summary.gst ?? reportData.summary.gstCollected) || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.grandTotal !== undefined && (
                  <Grid item xs={6} sm={4} md={1.8}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Grand Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{(parseFloat(reportData.summary.grandTotal || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalStockValue !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Stock Value</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{(parseFloat(reportData.summary.totalStockValue || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.netGstPayable !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net GST Payable</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{(parseFloat(reportData.summary.netGstPayable || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.grossProfit !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Gross Profit</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: reportData.summary.grossProfit >= 0 ? 'success.main' : 'error.main' }}>
                      ₹{(parseFloat(reportData.summary.grossProfit || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.netProfit !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net Profit</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: reportData.summary.netProfit >= 0 ? 'success.main' : 'error.main' }}>
                      ₹{(parseFloat(reportData.summary.netProfit || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.totalAssets !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Assets</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      ₹{(parseFloat(reportData.summary.totalAssets || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.totalLiabilities !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Liabilities</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'info.main' }}>
                      ₹{(parseFloat(reportData.summary.totalLiabilities || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.closingBalance !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Closing Cash/Bank</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      ₹{(parseFloat(reportData.summary.closingBalance || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}

                {/* --- Inventory Report Metrics --- */}
                {reportData.summary.totalStockOnHand !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Stock On Hand</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{reportData.summary.totalStockOnHand}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalQuantity !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Quantity</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{reportData.summary.totalQuantity}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalItems !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Catalog Items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalItems}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalGodowns !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Godowns</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalGodowns}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalCategories !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Categories</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalCategories}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalGroups !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Item Groups</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalGroups}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalOpening !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Opening Stock</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalOpening}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalIn !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total IN</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>+{reportData.summary.totalIn}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalOut !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total OUT</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>-{reportData.summary.totalOut}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalClosing !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Closing Stock</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{reportData.summary.totalClosing}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalDifference !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Variance / Diff</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: reportData.summary.totalDifference !== 0 ? 'warning.main' : 'success.main' }}>
                      {reportData.summary.totalDifference}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.totalQuantitySold !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Quantity Sold</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>{reportData.summary.totalQuantitySold}</Typography>
                  </Grid>
                )}
                {reportData.summary.itemsRequiringReorder !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Reorder Needed</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>{reportData.summary.itemsRequiringReorder}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalSuggestedQuantity !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Suggested Reorder</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalSuggestedQuantity}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalEstimatedCost !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Estimated Cost</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{(parseFloat(reportData.summary.totalEstimatedCost || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalReorderValue !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Reorder Value</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>₹{(parseFloat(reportData.summary.totalReorderValue || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalStockShortfall !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Stock Shortfall</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>{reportData.summary.totalStockShortfall}</Typography>
                  </Grid>
                )}
                {reportData.summary.negativeItemsCount !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Negative Items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: reportData.summary.negativeItemsCount > 0 ? 'error.main' : 'success.main' }}>
                      {reportData.summary.negativeItemsCount}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.totalDeficitQuantity !== undefined && reportData.summary.totalDeficitQuantity !== 0 && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Deficit Qty</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>{reportData.summary.totalDeficitQuantity}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalDeficitValue !== undefined && reportData.summary.totalDeficitValue !== 0 && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Deficit Value</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>₹{(parseFloat(reportData.summary.totalDeficitValue || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalLots !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Tracked Lots</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalLots}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalRemainingQty !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Remaining Lot Qty</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{reportData.summary.totalRemainingQty}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalLotAssetValue !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Lot Asset Value</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{(parseFloat(reportData.summary.totalLotAssetValue || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalBatches !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Batches Tracked</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalBatches}</Typography>
                  </Grid>
                )}
                {reportData.summary.itemsWithReservations !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Reserved Items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>{reportData.summary.itemsWithReservations}</Typography>
                  </Grid>
                )}
                {(reportData.summary.totalReservedStock !== undefined || reportData.summary.totalReservedQuantity !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Reserved Stock</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>
                      {reportData.summary.totalReservedStock ?? reportData.summary.totalReservedQuantity}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.totalReservedValue !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Reserved Value</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>₹{(parseFloat(reportData.summary.totalReservedValue || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalAvailableStock !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Available Stock</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>{reportData.summary.totalAvailableStock}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalChallans !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Challans</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalChallans}</Typography>
                  </Grid>
                )}
                {(reportData.summary.totalChallanQuantity !== undefined || reportData.summary.totalChallanQty !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Challan Qty</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalChallanQuantity ?? reportData.summary.totalChallanQty}</Typography>
                  </Grid>
                )}
                {(reportData.summary.totalInvoicedQuantity !== undefined || reportData.summary.totalInvoicedQty !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Invoiced Qty</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalInvoicedQuantity ?? reportData.summary.totalInvoicedQty}</Typography>
                  </Grid>
                )}
                {(reportData.summary.totalVarianceQuantity !== undefined || reportData.summary.totalVarianceQty !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Variance Qty</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: (reportData.summary.totalVarianceQuantity ?? reportData.summary.totalVarianceQty) !== 0 ? 'warning.main' : 'success.main' }}>
                      {reportData.summary.totalVarianceQuantity ?? reportData.summary.totalVarianceQty}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.matchedCount !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Matched Challans</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>{reportData.summary.matchedCount}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalVarianceAmount !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Variance Amount</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: reportData.summary.totalVarianceAmount !== 0 ? 'warning.main' : 'success.main' }}>
                      ₹{(parseFloat(reportData.summary.totalVarianceAmount || 0)).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.totalPurchaseCost !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Purchase Cost</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>₹{(parseFloat(reportData.summary.totalPurchaseCost || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalSalesRevenue !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Sales Revenue</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>₹{(parseFloat(reportData.summary.totalSalesRevenue || 0)).toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalCatalogItems !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Catalog Items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{reportData.summary.totalCatalogItems}</Typography>
                  </Grid>
                )}
                {reportData.summary.zeroSalesItemsInBatch !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Zero Sales Items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>{reportData.summary.zeroSalesItemsInBatch}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Main Statement / Table Display Area */}
          <Box className="print-area">
            {selectedDomain === 'financial' && financialViewMode === 'statement' && reportData.structuredData ? (
              <FinancialStatementView
                reportId={activeReportId}
                structuredData={reportData.structuredData}
                rows={reportData.rows}
                summary={reportData.summary}
                reconciliation={reportData.reconciliation}
              />
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 600, overflowX: 'auto', '&::-webkit-scrollbar': { height: 7, width: 7 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 4 } }}>
                  <Table size="small" stickyHeader>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        {(() => {
                          const hiddenKeys = columnVisibility[activeReportId] || [];
                          const visibleCols = currentReportMeta.columns.filter(c => !hiddenKeys.includes(c.key));
                          return visibleCols.map((col) => (
                            <TableCell
                              key={col.key}
                              align={col.align || 'left'}
                              sx={{ fontWeight: 800, fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            >
                              <Tooltip title={col.header} arrow>
                                <span>{col.header}</span>
                              </Tooltip>
                            </TableCell>
                          ));
                        })()}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={currentReportMeta.columns.length || 6} align="center" sx={{ py: 6 }}>
                            <CircularProgress size={28} />
                          </TableCell>
                        </TableRow>
                      ) : reportData.rows && reportData.rows.length > 0 ? (
                        (() => {
                          const hiddenKeys = columnVisibility[activeReportId] || [];
                          const visibleCols = currentReportMeta.columns.filter(c => !hiddenKeys.includes(c.key));
                          return reportData.rows.map((row, rIdx) => (
                            <TableRow key={rIdx} hover>
                              {visibleCols.map((col) => {
                                const val = row[col.key];
                                const isCurrency = col.isCurrency;

                                return (
                                  <TableCell
                                    key={col.key}
                                    align={col.align || 'left'}
                                    sx={{
                                      fontWeight: col.isLink ? 800 : 500,
                                      color: col.isLink ? 'primary.main' : 'inherit',
                                      cursor: col.isLink ? 'pointer' : 'default',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onClick={() => {
                                      if (col.isLink && onOpenOrderDetail && row.order_id) {
                                        onOpenOrderDetail(row.order_id);
                                      }
                                    }}
                                  >
                                    {isCurrency && val !== undefined && val !== null ? (
                                      `₹${parseFloat(val || 0).toFixed(2)}`
                                    ) : col.key === 'stock_status' ? (
                                      <Chip
                                        label={val}
                                        size="small"
                                        color={val === 'Out of Stock' ? 'error' : val === 'Low Stock' ? 'warning' : 'success'}
                                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                      />
                                    ) : col.key === 'alert_level' ? (
                                      <Chip
                                        label={val}
                                        size="small"
                                        color={val === 'Critical' ? 'error' : val === 'Warning' ? 'warning' : 'default'}
                                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                      />
                                    ) : col.key === 'expiry_status' ? (
                                      <Chip
                                        label={val}
                                        size="small"
                                        color={val === 'Expired' ? 'error' : val === 'Near Expiry' ? 'warning' : 'success'}
                                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                      />
                                    ) : col.key === 'lot_status' ? (
                                      <Chip
                                        label={val}
                                        size="small"
                                        color={val === 'Fully Consumed' ? 'default' : val === 'Partially Consumed' ? 'warning' : 'success'}
                                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                      />
                                    ) : col.key === 'urgency' ? (
                                      <Chip
                                        label={val}
                                        size="small"
                                        color={val === 'Immediate' ? 'error' : 'warning'}
                                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                      />
                                    ) : col.key === 'variance_type' || col.key === 'variance_status' ? (
                                      <Chip
                                        label={val}
                                        size="small"
                                        color={val === 'Matched' || val === 'Fully Invoiced' ? 'success' : val === 'Over-invoiced' ? 'info' : 'warning'}
                                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                                      />
                                    ) : (
                                      val !== undefined && val !== null ? String(val) : '-'
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ));
                        })()
                      ) : (
                        <TableRow>
                          <TableCell colSpan={currentReportMeta.columns.length || 6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                            No results.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>

                    {/* Dynamic Total Row in Table Footer */}
                    {!loading && reportData.rows && (
                      <TableFooter sx={{ bgcolor: 'action.hover', borderTop: '2px solid', borderColor: 'divider' }}>
                        <TableRow>
                          {(() => {
                            const hiddenKeys = columnVisibility[activeReportId] || [];
                            const visibleCols = currentReportMeta.columns.filter(c => !hiddenKeys.includes(c.key));
                            const hasRows = reportData.rows.length > 0;

                            return visibleCols.map((col, idx) => {
                              const isNumeric = col.isCurrency || [
                                'quantity', 'stock_on_hand', 'inward_qty', 'consumed_qty', 'balance_qty', 'qty_sold',
                                'purchase_qty', 'sales_qty', 'challan_qty', 'invoiced_qty', 'variance_qty',
                                'current_stock', 'suggested_qty', 'suggested_order_qty', 'stock_shortfall',
                                'reserved_qty', 'dc_qty', 'opening', 'purchase', 'transfer_in', 'excess',
                                'total_in', 'sales', 'transfer_out', 'shortage', 'total_out', 'closing_stock',
                                'closing_summary', 'difference', 'item_count', 'orders_count', 'negative_stock_qty'
                              ].includes(col.key);

                              if (idx === 0) {
                                return (
                                  <TableCell key={col.key} align={col.align || 'left'} sx={{ fontWeight: 900, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                    {hasRows ? `Total (${reportData.rows.length} rows)` : 'Total'}
                                  </TableCell>
                                );
                              }

                              if (!hasRows || !isNumeric) {
                                return <TableCell key={col.key} align={col.align || 'left'} sx={{ fontWeight: 700 }} />;
                              }

                              const sum = reportData.rows.reduce((acc, row) => acc + (parseFloat(row[col.key]) || 0), 0);

                              return (
                                <TableCell
                                  key={col.key}
                                  align={col.align || 'left'}
                                  sx={{
                                    fontWeight: 900,
                                    fontSize: '0.82rem',
                                    whiteSpace: 'nowrap',
                                    color: sum < 0 ? 'error.main' : 'inherit'
                                  }}
                                >
                                  {col.isCurrency ? `₹${sum.toFixed(2)}` : parseFloat(sum.toFixed(2))}
                                </TableCell>
                              );
                            });
                          })()}
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </TableContainer>

                {/* Pagination Controls */}
                <TablePagination
                  rowsPerPageOptions={[15, 25, 50, 100]}
                  component="div"
                  count={totalCount}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </Paper>
            )}
          </Box>
            </>
          )}
          {/* Manage Columns Modal Dialog */}
          <Dialog open={columnDialogOpen} onClose={() => setColumnDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sliders size={18} /> Manage Columns — {currentReportMeta.title}
            </DialogTitle>
            <DialogContent dividers sx={{ maxHeight: 380, overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Button size="small" onClick={() => setColumnVisibility(prev => ({ ...prev, [activeReportId]: [] }))}>
                  Show All
                </Button>
                <Button
                  size="small"
                  color="secondary"
                  onClick={() => {
                    setColumnVisibility(prev => {
                      const next = { ...prev };
                      delete next[activeReportId];
                      return next;
                    });
                  }}
                >
                  Reset Defaults
                </Button>
              </Box>
              {currentReportMeta.columns.map(col => {
                const hiddenKeys = columnVisibility[activeReportId] || [];
                const isVisible = !hiddenKeys.includes(col.key);
                return (
                  <FormControlLabel
                    key={col.key}
                    control={
                      <Checkbox
                        checked={isVisible}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setColumnVisibility(prev => {
                            const curHidden = prev[activeReportId] || [];
                            const updated = checked
                              ? curHidden.filter(k => k !== col.key)
                              : [...curHidden, col.key];
                            return { ...prev, [activeReportId]: updated };
                          });
                        }}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{col.header}</Typography>}
                    sx={{ display: 'block', my: 0.25 }}
                  />
                );
              })}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setColumnDialogOpen(false)} variant="contained" size="small" sx={{ fontWeight: 700 }}>
                Done
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* --- VIEW 4: DYNAMIC CUSTOM REPORT BUILDER --- */}
      {selectedDomain === 'custom' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              ⚡ Safe Dynamic Report Builder
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Build customized multi-column reports across Sales, Purchases, or Inventory and save them for instant 1-click execution.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Data Source</InputLabel>
                  <Select
                    value={customSource}
                    label="Data Source"
                    onChange={(e) => setCustomSource(e.target.value)}
                  >
                    <MenuItem value="sales">Sales & Invoices</MenuItem>
                    <MenuItem value="purchase">Purchases & Vendors</MenuItem>
                    <MenuItem value="inventory">Inventory & Products</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Template Name (e.g., Monthly Wholesale Audit)"
                  value={customReportName}
                  onChange={(e) => setCustomReportName(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    if (!customReportName.trim()) {
                      notify.error('Please enter a name for the custom report template.', 'Validation Error');
                      return;
                    }
                    try {
                      const res = await apiFetch('/api/reports/custom/saved', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: customReportName.trim(),
                          data_source: customSource,
                          config: { selectedFields: customFields }
                        })
                      });
                      if (res.ok) {
                        notify.success('Custom report template saved successfully.', 'Saved');
                        setCustomReportName('');
                        fetchSavedReports();
                      }
                    } catch (err) {
                      notify.error('Failed to save report template.', 'Error');
                    }
                  }}
                  startIcon={<PlusCircle size={16} />}
                  sx={{ fontWeight: 800 }}
                >
                  Save Template
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Saved Templates List */}
          {savedReports && savedReports.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Saved Templates
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {savedReports.map((tmpl) => (
                  <Chip
                    key={tmpl.id}
                    label={tmpl.name}
                    color="primary"
                    variant="outlined"
                    onDelete={async () => {
                      try {
                        await apiFetch(`/api/reports/custom/saved/${tmpl.id}`, { method: 'DELETE' });
                        notify.success('Deleted saved template.', 'Deleted');
                        fetchSavedReports();
                      } catch (err) {
                        notify.error('Failed to delete template.', 'Error');
                      }
                    }}
                    sx={{ fontWeight: 700 }}
                  />
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
