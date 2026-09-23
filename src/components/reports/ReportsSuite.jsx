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
  InputAdornment
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
  ExternalLink
} from 'lucide-react';
import { apiFetch, downloadFile } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

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
  const [biDashboardData, setBiDashboardData] = useState(null);
  const [dsrData, setDsrData] = useState(null);
  const [dsrDate, setDsrDate] = useState(() => getISTDateString());

  // Custom Report Builder State
  const [customSource, setCustomSource] = useState('sales');
  const [customFields, setCustomFields] = useState(['order_number', 'date', 'customer', 'total']);
  const [customReportName, setCustomReportName] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [savingCustomReport, setSavingCustomReport] = useState(false);

  // Initialize Catalog and Dates
  useEffect(() => {
    fetchCatalog();
    handlePresetChange('month');
  }, []);

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
  }, [activeReportId, selectedDomain, datePreset, dateFrom, dateTo, page, rowsPerPage, paymentModeFilter]);

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

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData({
          rows: data.rows || [],
          summary: data.summary || {},
          dateRange: data.dateRange || {}
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

  // Find active report metadata
  const currentReportMeta = catalog.find(c => c.id === activeReportId) || {
    title: activeReportId.replace(/_/g, ' ').toUpperCase(),
    columns: []
  };

  // Reports categorized by domain
  const domainReports = catalog.filter(c => c.category === selectedDomain);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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

      {/* Main Navigation Tabs: 10 Report Domains */}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={selectedDomain}
          onChange={(e, val) => {
            setSelectedDomain(val);
            setPage(0);
            const firstInDomain = catalog.find(c => c.category === val);
            if (firstInDomain) setActiveReportId(firstInDomain.id);
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
          {/* Sub-report selector buttons within chosen domain: Clean, non-overlapping responsive pills */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper', borderColor: 'divider' }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: { xs: 'nowrap', md: 'wrap' },
                gap: 1.25,
                overflowX: 'auto',
                py: 0.5,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 }
              }}
            >
              {domainReports.map((rep) => {
                const isActive = activeReportId === rep.id;
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
                    {rep.title}
                  </Button>
                );
              })}
            </Box>
          </Paper>

          {/* Universal Filter Bar */}
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

              {/* Payment Filter */}
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
            </Grid>
          </Paper>

          {/* Active Report Header & Metadata */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {currentReportMeta.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentReportMeta.description}
              </Typography>
            </Box>
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
                      -₹{reportData.summary.returns.toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.netSales !== undefined && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net Revenue</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>₹{reportData.summary.netSales.toFixed(2)}</Typography>
                  </Grid>
                )}
                {(reportData.summary.gst !== undefined || reportData.summary.gstCollected !== undefined) && (
                  <Grid item xs={6} sm={4} md={1.7}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>GST / Tax</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'info.main' }}>
                      +₹{((reportData.summary.gst ?? reportData.summary.gstCollected) || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                )}
                {reportData.summary.grandTotal !== undefined && (
                  <Grid item xs={6} sm={4} md={1.8}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Grand Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{reportData.summary.grandTotal.toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.totalStockValue !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Stock Value</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{reportData.summary.totalStockValue.toFixed(2)}</Typography>
                  </Grid>
                )}
                {reportData.summary.netGstPayable !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Net GST Payable</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{reportData.summary.netGstPayable.toFixed(2)}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Interactive Report Data Table */}
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    {currentReportMeta.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        align={col.align || 'left'}
                        sx={{ fontWeight: 800, fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        {col.header}
                      </TableCell>
                    ))}
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
                    reportData.rows.map((row, rIdx) => (
                      <TableRow key={rIdx} hover>
                        {currentReportMeta.columns.map((col) => {
                          const val = row[col.key];
                          const isCurrency = col.isCurrency;

                          return (
                            <TableCell
                              key={col.key}
                              align={col.align || 'left'}
                              sx={{
                                fontWeight: col.isLink ? 800 : 500,
                                color: col.isLink ? 'primary.main' : 'inherit',
                                cursor: col.isLink ? 'pointer' : 'default'
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
                              ) : (
                                val !== undefined && val !== null ? String(val) : '-'
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={currentReportMeta.columns.length || 6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No records found for the selected reporting parameters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
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
