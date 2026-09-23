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
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton
} from '@mui/material';
import {
  ShieldCheck,
  FileSpreadsheet,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Truck,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  Search,
  ExternalLink,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { apiFetch, downloadFile } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import { GST_STATE_CODES, validateGstin } from '../utils/gstCalculator';
import CreditNoteModal from './CreditNoteModal';

export default function GstDashboard() {
  const { notify } = useNotify();

  // Navigation tab within GST suite
  const [activeGstTab, setActiveGstTab] = useState(0);

  // Date Range Filters
  const [datePreset, setDatePreset] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Loading & State
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Summary & Reports State
  const [summaryData, setSummaryData] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr2Data, setGstr2Data] = useState(null);
  const [hsnData, setHsnData] = useState(null);
  const [creditNotes, setCreditNotes] = useState([]);
  const [gstSettings, setGstSettings] = useState({
    legal_name: '',
    trade_name: '',
    gst_number: '',
    state: 'Maharashtra',
    state_code: '27',
    gst_registration_type: 'regular',
    composition_tax_rate: 1.0,
    default_hsn_code: '',
    invoice_prefix: 'INV-',
    einvoice_enabled: 0,
    eway_bill_enabled: 0
  });

  // Credit Note Modal State
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);

  // E-Way Bill Modal State
  const [ewayModalOpen, setEwayModalOpen] = useState(false);
  const [selectedOrderForEway, setSelectedOrderForEway] = useState(null);
  const [transporterId, setTransporterId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [distanceKm, setDistanceKm] = useState(50);
  const [generatingEway, setGeneratingEway] = useState(false);

  // Cancel Document Dialog State
  const [cancelDialog, setCancelDialog] = useState({
    open: false,
    orderId: null,
    docType: 'einvoice', // 'einvoice' | 'ewaybill'
    reason: '1',
    remarks: ''
  });

  // Initial Date Setup
  useEffect(() => {
    handlePresetChange('month');
    fetchSettings();
  }, []);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (preset === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (preset === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (preset === 'last_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (preset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
    } else if (preset === 'year') {
      fromDate = new Date(now.getFullYear(), 3, 1, 0, 0, 0); // April 1st of current FY
      toDate = new Date(now.getFullYear() + 1, 2, 31, 23, 59, 59); // March 31st
    }

    if (preset !== 'custom') {
      const pad = (n) => String(n).padStart(2, '0');
      const fromStr = `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())} 00:00:00`;
      const toStr = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())} 23:59:59`;
      setDateFrom(fromStr);
      setDateTo(toStr);
    }
  };

  // Fetch active tab data
  useEffect(() => {
    if (dateFrom && dateTo) {
      if (activeGstTab === 0) fetchSummary();
      else if (activeGstTab === 1) fetchGstr1();
      else if (activeGstTab === 2) fetchGstr2();
      else if (activeGstTab === 3) fetchHsnSummary();
      else if (activeGstTab === 4) fetchGstr1(); // E-Invoice Hub uses B2B orders from GSTR-1
      else if (activeGstTab === 5) fetchCreditNotes();
    }
  }, [activeGstTab, dateFrom, dateTo]);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/gst/settings');
      if (res.ok) {
        const data = await res.json();
        setGstSettings({
          legal_name: data.legal_name || '',
          trade_name: data.trade_name || data.restaurant_name || '',
          gst_number: data.gst_number || '',
          state: data.state || 'Maharashtra',
          state_code: data.state_code || '27',
          gst_registration_type: data.gst_registration_type || 'regular',
          composition_tax_rate: parseFloat(data.composition_tax_rate || 1.0),
          default_hsn_code: data.default_hsn_code || '',
          invoice_prefix: data.invoice_prefix || 'INV-',
          einvoice_enabled: Number(data.einvoice_enabled) === 1 ? 1 : 0,
          eway_bill_enabled: Number(data.eway_bill_enabled) === 1 ? 1 : 0
        });
      }
    } catch (err) {
      console.error('[GST Settings Fetch Error]', err);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/gst/dashboard?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`);
      if (res.ok) {
        setSummaryData(await res.json());
      }
    } catch (err) {
      notify.error('Failed to load GST liability summary', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGstr1 = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/gst/gstr-1?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`);
      if (res.ok) {
        setGstr1Data(await res.json());
      }
    } catch (err) {
      notify.error('Failed to load GSTR-1 report', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGstr2 = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/gst/gstr-2?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`);
      if (res.ok) {
        setGstr2Data(await res.json());
      }
    } catch (err) {
      notify.error('Failed to load GSTR-2 report', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHsnSummary = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/gst/hsn-summary?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`);
      if (res.ok) {
        setHsnData(await res.json());
      }
    } catch (err) {
      notify.error('Failed to load HSN summary', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/gst/credit-notes?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`);
      if (res.ok) {
        const data = await res.json();
        setCreditNotes(Array.isArray(data) ? data : data.credit_notes || []);
      }
    } catch (err) {
      notify.error('Failed to load Credit Notes', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportGstr1Excel = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `/api/gst/gstr-1/export-excel?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`,
        `GSTR1_Report_${Date.now()}.xlsx`
      );
      notify.success('GSTR-1 Excel downloaded successfully.', 'Export Complete');
    } catch (err) {
      notify.error(err.message || 'Failed to export GSTR-1 Excel', 'Export Error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportGstr2Excel = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `/api/gst/gstr-2/export-excel?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`,
        `GSTR2_Report_${Date.now()}.xlsx`
      );
      notify.success('GSTR-2 Excel downloaded successfully.', 'Export Complete');
    } catch (err) {
      notify.error(err.message || 'Failed to export GSTR-2 Excel', 'Export Error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await apiFetch('/api/gst/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gstSettings)
      });
      if (res.ok) {
        notify.success('GST compliance settings saved successfully!', 'Saved');
      } else {
        const err = await res.json();
        notify.error(err.message || 'Failed to update GST settings', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'Network error saving settings', 'Error');
    }
  };

  // E-Invoice Generation Handler
  const handleGenerateEInvoice = async (orderId) => {
    try {
      notify.info('Initiating E-Invoice generation...', 'Processing');
      const res = await apiFetch(`/api/gst/orders/${orderId}/einvoice`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        notify.success(`IRN Generated: ${data.irn ? data.irn.substring(0, 16) + '...' : 'Success'}`, 'E-Invoice Active');
        fetchGstr1();
      } else {
        notify.error(data.message || 'Failed to generate E-Invoice', 'E-Invoice Error');
      }
    } catch (err) {
      notify.error(err.message || 'Error generating E-Invoice', 'Error');
    }
  };

  // E-Way Bill Generation Submit
  const handleGenerateEWayBill = async () => {
    if (!selectedOrderForEway) return;
    setGeneratingEway(true);
    try {
      const res = await apiFetch(`/api/gst/orders/${selectedOrderForEway.id}/ewaybill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporter_id: transporterId,
          vehicle_number: vehicleNumber,
          distance_km: distanceKm
        })
      });
      const data = await res.json();
      if (res.ok) {
        notify.success(`E-Way Bill #${data.eway_bill_number} generated successfully!`, 'E-Way Bill Active');
        setEwayModalOpen(false);
        fetchGstr1();
      } else {
        notify.error(data.message || 'Failed to generate E-Way Bill', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'Error generating E-Way Bill', 'Error');
    } finally {
      setGeneratingEway(false);
    }
  };

  // Document Cancellation Handler
  const handleConfirmCancel = async () => {
    const { orderId, docType, reason, remarks } = cancelDialog;
    if (!orderId) return;

    try {
      const endpoint = docType === 'einvoice'
        ? `/api/gst/orders/${orderId}/einvoice/cancel`
        : `/api/gst/orders/${orderId}/ewaybill/cancel`;

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancel_reason: reason,
          cancel_remarks: remarks
        })
      });

      const data = await res.json();
      if (res.ok) {
        notify.success(`${docType === 'einvoice' ? 'IRN' : 'E-Way Bill'} cancelled successfully.`, 'Cancelled');
        setCancelDialog({ open: false, orderId: null, docType: 'einvoice', reason: '1', remarks: '' });
        fetchGstr1();
      } else {
        notify.error(data.message || 'Cancellation failed', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'Network error during cancellation', 'Error');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
      {/* Top Banner & Profile Overview */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
          borderColor: 'rgba(249, 115, 22, 0.25)'
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <ShieldCheck size={26} color="#f97316" />
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.5px' }}>
                GST Management & Compliance Suite
              </Typography>
              <Chip
                label={gstSettings.gst_registration_type === 'composition' ? 'Composition Scheme' : 'Regular Taxpayer'}
                color={gstSettings.gst_registration_type === 'composition' ? 'secondary' : 'primary'}
                size="small"
                sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Authoritative GSTR-1, GSTR-2, Net Liability, Credit Notes & E-Invoice / E-Way Bill portal.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RotateCcw size={16} />}
              onClick={() => setCreditNoteModalOpen(true)}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              Issue Credit Note
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RefreshCw size={16} />}
              onClick={() => {
                if (activeGstTab === 0) fetchSummary();
                else if (activeGstTab === 1) fetchGstr1();
                else if (activeGstTab === 2) fetchGstr2();
                else if (activeGstTab === 3) fetchHsnSummary();
                else if (activeGstTab === 5) fetchCreditNotes();
              }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Store GSTIN Details Bar */}
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={2} sx={{ fontSize: '0.85rem' }}>
          <Grid item xs={12} sm={3}>
            <span style={{ color: '#64748b' }}>Legal Name: </span>
            <b>{gstSettings.legal_name || gstSettings.trade_name || 'N/A'}</b>
          </Grid>
          <Grid item xs={12} sm={3}>
            <span style={{ color: '#64748b' }}>GSTIN: </span>
            <b>{gstSettings.gst_number || 'Not Configured'}</b>
          </Grid>
          <Grid item xs={12} sm={3}>
            <span style={{ color: '#64748b' }}>State (Code): </span>
            <b>{gstSettings.state} ({gstSettings.state_code})</b>
          </Grid>
          <Grid item xs={12} sm={3}>
            <span style={{ color: '#64748b' }}>Place of Supply Rule: </span>
            <b>Store Code ({gstSettings.state_code})</b>
          </Grid>
        </Grid>
      </Paper>

      {/* Date Range Selector Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range Preset</InputLabel>
              <Select
                value={datePreset}
                label="Date Range Preset"
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="month">Current Month</MenuItem>
                <MenuItem value="last_month">Last Month</MenuItem>
                <MenuItem value="quarter">Current Quarter (3M)</MenuItem>
                <MenuItem value="year">Current Financial Year</MenuItem>
                <MenuItem value="custom">Custom Date Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              size="small"
              fullWidth
              label="From Date"
              type="datetime-local"
              value={dateFrom ? dateFrom.replace(' ', 'T').slice(0, 16) : ''}
              onChange={(e) => {
                setDatePreset('custom');
                setDateFrom(e.target.value ? e.target.value.replace('T', ' ') + ':00' : '');
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              size="small"
              fullWidth
              label="To Date"
              type="datetime-local"
              value={dateTo ? dateTo.replace(' ', 'T').slice(0, 16) : ''}
              onChange={(e) => {
                setDatePreset('custom');
                setDateTo(e.target.value ? e.target.value.replace('T', ' ') + ':59' : '');
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {activeGstTab === 1 && (
              <Button
                variant="contained"
                color="success"
                startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
                onClick={handleExportGstr1Excel}
                disabled={exporting}
                sx={{ fontWeight: 800 }}
              >
                Export GSTR-1
              </Button>
            )}
            {activeGstTab === 2 && (
              <Button
                variant="contained"
                color="success"
                startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
                onClick={handleExportGstr2Excel}
                disabled={exporting}
                sx={{ fontWeight: 800 }}
              >
                Export GSTR-2
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeGstTab}
          onChange={(e, val) => setActiveGstTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '0.9rem',
              minHeight: 48,
              px: 2.5
            }
          }}
        >
          <Tab icon={<TrendingUp size={16} />} iconPosition="start" label="Net GST Liability" value={0} />
          <Tab icon={<FileText size={16} />} iconPosition="start" label="GSTR-1 (Sales)" value={1} />
          <Tab icon={<FileSpreadsheet size={16} />} iconPosition="start" label="GSTR-2 (Purchases / ITC)" value={2} />
          <Tab icon={<HelpCircle size={16} />} iconPosition="start" label="HSN / SAC Summary" value={3} />
          <Tab icon={<Truck size={16} />} iconPosition="start" label="E-Invoice & E-Way Bill" value={4} />
          <Tab icon={<RotateCcw size={16} />} iconPosition="start" label="Credit Notes Register" value={5} />
          <Tab icon={<Settings size={16} />} iconPosition="start" label="GST Profile Settings" value={6} />
        </Tabs>
      </Box>

      {/* --- TAB 0: NET GST LIABILITY DASHBOARD --- */}
      {activeGstTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && summaryData && (
            <>
              {/* Metric Cards Grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Gross Output GST (Sales)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'text.primary' }}>
                        ₹{parseFloat(summaryData.outputGst?.totalOutputTax || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Taxable: ₹{parseFloat(summaryData.outputGst?.totalTaxableAmount || 0).toFixed(2)} ({summaryData.outputGst?.totalInvoices || 0} Invoices)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Credit Notes (Returns Reversal)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'error.main' }}>
                        -₹{parseFloat(summaryData.creditNotes?.totalReversedTax || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {summaryData.creditNotes?.totalCount || 0} Credit Notes Reversed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Input Tax Credit (ITC - Purchases)
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'success.main' }}>
                        ₹{parseFloat(summaryData.inputTaxCredit?.totalItc || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        From {summaryData.inputTaxCredit?.totalBills || 0} Purchase Bills
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: parseFloat(summaryData.netGstPayable || 0) >= 0 ? 'rgba(249, 115, 22, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                      borderColor: parseFloat(summaryData.netGstPayable || 0) >= 0 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <CardContent sx={{ pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        {parseFloat(summaryData.netGstPayable || 0) >= 0 ? 'Net GST Payable' : 'Net ITC Credit Balance'}
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 900,
                          mt: 0.5,
                          color: parseFloat(summaryData.netGstPayable || 0) >= 0 ? 'primary.main' : 'success.main'
                        }}
                      >
                        ₹{Math.abs(parseFloat(summaryData.netGstPayable || 0)).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Net Output GST - Net ITC)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Rate-Wise Slab Breakdown Table */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Rate-Wise Tax Breakdown (Slab Summary)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Tax Rate</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Taxable Value</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">CGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">SGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">IGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Total Tax</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summaryData.rateBreakdown && Object.keys(summaryData.rateBreakdown).length > 0 ? (
                        Object.entries(summaryData.rateBreakdown).map(([rateKey, slab]) => (
                          <TableRow key={rateKey} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{rateKey}</TableCell>
                            <TableCell align="right">₹{parseFloat(slab.taxableAmount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(slab.cgstAmount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(slab.sgstAmount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(slab.igstAmount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                              ₹{parseFloat(slab.totalTax || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No tax transactions found for the selected period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </Box>
      )}

      {/* --- TAB 1: GSTR-1 (SALES) --- */}
      {activeGstTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && gstr1Data && (
            <>
              {/* Table 4: B2B Invoices */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Table 4: Taxable Outward Supplies to Registered Persons (B2B)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Receiver GSTIN</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Place of Supply</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Taxable Value</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">IGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">CGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">SGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Invoice Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gstr1Data.b2b && gstr1Data.b2b.length > 0 ? (
                        gstr1Data.b2b.map((inv, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{inv.gstin_uin_of_recipient || '-'}</TableCell>
                            <TableCell>{inv.receiver_name}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{inv.invoice_number}</TableCell>
                            <TableCell>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                            <TableCell>{inv.place_of_supply}</TableCell>
                            <TableCell align="right">₹{parseFloat(inv.taxable_value || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(inv.integrated_tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(inv.central_tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(inv.state_ut_tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              ₹{parseFloat(inv.invoice_value || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No B2B sales invoices recorded in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Table 7: B2C Small Supplies */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Table 7: Taxable Outward Supplies to Consumers (B2C Small)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Place of Supply</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Rate</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Taxable Value</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">CGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">SGST</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">IGST</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gstr1Data.b2c && gstr1Data.b2c.length > 0 ? (
                        gstr1Data.b2c.map((row, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 700 }}>B2C</TableCell>
                            <TableCell>{row.place_of_supply}</TableCell>
                            <TableCell align="right">{row.rate}%</TableCell>
                            <TableCell align="right">₹{parseFloat(row.taxable_value || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(row.central_tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(row.state_ut_tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell align="right">₹{parseFloat(row.integrated_tax_amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No B2C transactions in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </Box>
      )}

      {/* --- TAB 2: GSTR-2 (PURCHASES / ITC) --- */}
      {activeGstTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && gstr2Data && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Inward Supplies Received from Registered Persons (GSTR-2 ITC)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Supplier GSTIN</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Supplier Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Bill #</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Bill Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Taxable Value</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">CGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">SGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">IGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Total Value</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>ITC Eligibility</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gstr2Data.inwardSupplies && gstr2Data.inwardSupplies.length > 0 ? (
                      gstr2Data.inwardSupplies.map((bill, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>{bill.supplier_gstin || '-'}</TableCell>
                          <TableCell>{bill.supplier_name}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{bill.bill_number}</TableCell>
                          <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                          <TableCell align="right">₹{parseFloat(bill.taxable_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(bill.cgst_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(bill.sgst_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(bill.igst_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            ₹{parseFloat(bill.total_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip label="Inputs" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No inward purchase bills recorded in this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}

      {/* --- TAB 3: HSN SUMMARY --- */}
      {activeGstTab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && hsnData && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Table 12: HSN Summary of Outward Supplies
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>HSN Code</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Total Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Taxable Value</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">CGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">SGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">IGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Total Tax</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hsnData.hsnSummary && hsnData.hsnSummary.length > 0 ? (
                      hsnData.hsnSummary.map((hsn, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>{hsn.hsn_code || 'Unclassified'}</TableCell>
                          <TableCell>{hsn.description || '-'}</TableCell>
                          <TableCell align="right">{parseFloat(hsn.total_quantity || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(hsn.taxable_value || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(hsn.central_tax_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(hsn.state_ut_tax_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(hsn.integrated_tax_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            ₹{parseFloat(hsn.total_tax || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No HSN items recorded in this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}

      {/* --- TAB 4: E-INVOICE & E-WAY BILL HUB --- */}
      {activeGstTab === 4 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  B2B Tax Invoices — E-Invoice (IRN) & E-Way Bill Management
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Compliant with NIC Schema v1.03. IRNs are generated for B2B registered customers.
                </Typography>
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Buyer GSTIN</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>IRN Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>E-Way Bill</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gstr1Data?.b2b && gstr1Data.b2b.length > 0 ? (
                    gstr1Data.b2b.map((inv) => (
                      <TableRow key={inv.order_id || inv.invoice_number} hover>
                        <TableCell sx={{ fontWeight: 800 }}>{inv.invoice_number}</TableCell>
                        <TableCell>{inv.receiver_name}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{inv.gstin_uin_of_recipient}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          ₹{parseFloat(inv.invoice_value || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inv.irn ? 'IRN Active' : 'Not Generated'}
                            color={inv.irn ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inv.eway_bill_number ? `#${inv.eway_bill_number}` : 'None'}
                            color={inv.eway_bill_number ? 'primary' : 'default'}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            {!inv.irn ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleGenerateEInvoice(inv.order_id)}
                                sx={{ fontSize: '0.72rem', fontWeight: 800, py: 0.3 }}
                              >
                                Generate IRN
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => setCancelDialog({
                                  open: true,
                                  orderId: inv.order_id,
                                  docType: 'einvoice',
                                  reason: '1',
                                  remarks: ''
                                })}
                                sx={{ fontSize: '0.72rem', fontWeight: 700, py: 0.3 }}
                              >
                                Cancel IRN
                              </Button>
                            )}

                            {!inv.eway_bill_number ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                onClick={() => {
                                  setSelectedOrderForEway(inv);
                                  setEwayModalOpen(true);
                                }}
                                sx={{ fontSize: '0.72rem', fontWeight: 700, py: 0.3 }}
                              >
                                E-Way Bill
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => setCancelDialog({
                                  open: true,
                                  orderId: inv.order_id,
                                  docType: 'ewaybill',
                                  reason: '1',
                                  remarks: ''
                                })}
                                sx={{ fontSize: '0.72rem', fontWeight: 700, py: 0.3 }}
                              >
                                Cancel EWB
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No B2B invoices eligible for E-Invoice found in this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* --- TAB 5: CREDIT NOTES REGISTER --- */}
      {activeGstTab === 5 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

          {!loading && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Credit Notes / Sales Returns Register (Table 9)
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PlusCircle size={16} />}
                  onClick={() => setCreditNoteModalOpen(true)}
                  sx={{ fontWeight: 800 }}
                >
                  Issue New Credit Note
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>CN Number</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Original Invoice #</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Return Reason</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Taxable Reversed</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">CGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">SGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">IGST</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Total Credit</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {creditNotes.length > 0 ? (
                      creditNotes.map((cn) => (
                        <TableRow key={cn.id} hover>
                          <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>
                            {cn.credit_note_number}
                          </TableCell>
                          <TableCell>{new Date(cn.created_at).toLocaleDateString()}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{cn.original_invoice_number}</TableCell>
                          <TableCell>{cn.customer_name || 'Walk-in'}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>
                            {String(cn.reason || '').replace('_', ' ')}
                          </TableCell>
                          <TableCell align="right">₹{parseFloat(cn.taxable_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(cn.cgst_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(cn.sgst_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right">₹{parseFloat(cn.igst_amount || 0).toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>
                            ₹{parseFloat(cn.total_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip label="ISSUED" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No credit notes issued in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}

      {/* --- TAB 6: GST PROFILE SETTINGS --- */}
      {activeGstTab === 6 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              GST Compliance & Business Registration Profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure legal business credentials used in Tax Invoices, Bills of Supply, E-Invoices, and GSTR reporting.
            </Typography>

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Legal Name of Business (As per GST Certificate)"
                  value={gstSettings.legal_name}
                  onChange={(e) => setGstSettings({ ...gstSettings, legal_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Trade Name / Brand Name"
                  value={gstSettings.trade_name}
                  onChange={(e) => setGstSettings({ ...gstSettings, trade_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="15-Digit Indian GSTIN"
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={gstSettings.gst_number}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase();
                    const stateCode = clean.length >= 2 ? clean.substring(0, 2) : gstSettings.state_code;
                    const stateName = GST_STATE_CODES[stateCode] || gstSettings.state;
                    setGstSettings({
                      ...gstSettings,
                      gst_number: clean,
                      state_code: stateCode,
                      state: stateName
                    });
                  }}
                  helperText="First 2 digits represent your Home State Code."
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Home State</InputLabel>
                  <Select
                    value={gstSettings.state_code}
                    label="Home State"
                    onChange={(e) => {
                      const code = e.target.value;
                      setGstSettings({
                        ...gstSettings,
                        state_code: code,
                        state: GST_STATE_CODES[code] || ''
                      });
                    }}
                  >
                    {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                      <MenuItem key={code} value={code}>
                        {code} - {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  disabled
                  label="State Code"
                  value={gstSettings.state_code}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>GST Registration Type</InputLabel>
                  <Select
                    value={gstSettings.gst_registration_type}
                    label="GST Registration Type"
                    onChange={(e) => setGstSettings({ ...gstSettings, gst_registration_type: e.target.value })}
                  >
                    <MenuItem value="regular">Regular Taxpayer (Tax Invoices with CGST/SGST/IGST)</MenuItem>
                    <MenuItem value="composition">Composition Dealer (Bills of Supply, No Tax Collected)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {gstSettings.gst_registration_type === 'composition' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Composition Flat Tax Rate (%)"
                    value={gstSettings.composition_tax_rate}
                    onChange={(e) => setGstSettings({ ...gstSettings, composition_tax_rate: parseFloat(e.target.value) || 0 })}
                    helperText="Typically 1% for traders / manufacturers or 5% for restaurants."
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Default 4/6/8-Digit HSN Code (Optional)"
                  placeholder="e.g. 2106"
                  value={gstSettings.default_hsn_code}
                  onChange={(e) => setGstSettings({ ...gstSettings, default_hsn_code: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Invoice Number Prefix"
                  value={gstSettings.invoice_prefix}
                  onChange={(e) => setGstSettings({ ...gstSettings, invoice_prefix: e.target.value })}
                  helperText="Prefix for sequential tax invoices, e.g. INV- or RET-"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Automated Gateway Integrations (E-Invoice & E-Way Bill)
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(gstSettings.einvoice_enabled)}
                      onChange={(e) => setGstSettings({ ...gstSettings, einvoice_enabled: e.target.checked ? 1 : 0 })}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Enable E-Invoice Generation (IRN)</Typography>
                      <Typography variant="caption" color="text.secondary">Automatically prepares NIC v1.03 schema for B2B invoices</Typography>
                    </Box>
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(gstSettings.eway_bill_enabled)}
                      onChange={(e) => setGstSettings({ ...gstSettings, eway_bill_enabled: e.target.checked ? 1 : 0 })}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Enable E-Way Bill Generation</Typography>
                      <Typography variant="caption" color="text.secondary">Enables consignment generation for consignments &gt; ₹50,000</Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSaveSettings}
                sx={{ fontWeight: 800, px: 4 }}
              >
                Save GST Profile Settings
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Credit Note Modal */}
      <CreditNoteModal
        open={creditNoteModalOpen}
        onClose={() => setCreditNoteModalOpen(false)}
        onSuccess={() => {
          if (activeGstTab === 5) fetchCreditNotes();
          if (activeGstTab === 0) fetchSummary();
        }}
      />

      {/* Generate E-Way Bill Dialog */}
      <Dialog open={ewayModalOpen} onClose={() => setEwayModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Truck size={20} color="#f97316" /> Generate E-Way Bill Consignment
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {selectedOrderForEway && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2">
                Generating E-Way Bill for Invoice <b>#{selectedOrderForEway.invoice_number}</b> (₹{parseFloat(selectedOrderForEway.invoice_value || 0).toFixed(2)})
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Transporter GSTIN / ID (Optional)"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={transporterId}
                onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
              />
              <TextField
                fullWidth
                size="small"
                label="Vehicle Number"
                placeholder="e.g. MH12AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Approx Distance (in KM)"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 1)}
                helperText="Used to calculate validity duration (1 day per 200 km)."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEwayModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGenerateEWayBill}
            disabled={generatingEway}
            startIcon={generatingEway ? <CircularProgress size={16} color="inherit" /> : <Truck size={16} />}
            sx={{ fontWeight: 800 }}
          >
            {generatingEway ? 'Generating...' : 'Generate E-Way Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Document Dialog */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ ...cancelDialog, open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertCircle size={20} /> Cancel {cancelDialog.docType === 'einvoice' ? 'E-Invoice IRN' : 'E-Way Bill'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Note: Under GST rules, IRNs can only be cancelled within 24 hours of generation.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Cancellation Reason</InputLabel>
              <Select
                value={cancelDialog.reason}
                label="Cancellation Reason"
                onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
              >
                <MenuItem value="1">Duplicate</MenuItem>
                <MenuItem value="2">Data Entry Mistake</MenuItem>
                <MenuItem value="3">Order Cancelled</MenuItem>
                <MenuItem value="4">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Remarks"
              placeholder="Provide reason for cancellation"
              value={cancelDialog.remarks}
              onChange={(e) => setCancelDialog({ ...cancelDialog, remarks: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelDialog({ ...cancelDialog, open: false })} color="inherit">Close</Button>
          <Button variant="contained" color="error" onClick={handleConfirmCancel} sx={{ fontWeight: 800 }}>
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
