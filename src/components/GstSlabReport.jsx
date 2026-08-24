import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel,
  Chip, CircularProgress, Tooltip, Alert
} from '@mui/material';
import { Download, RefreshCw, FileSpreadsheet, Calendar, Filter, ShieldCheck, DollarSign, Receipt } from 'lucide-react';
import { apiFetch, downloadFile } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import DateRangePicker from './DateRangePicker';

export default function GstSlabReport() {
  const { notify } = useNotify();

  // Filters state
  const [datePreset, setDatePreset] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMode, setPaymentMode] = useState('all');

  // Report Data
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [isGstEnabled, setIsGstEnabled] = useState(true);

  // Set default dates & fetch GST status on initial mount
  useEffect(() => {
    handlePresetChange('month');
    fetchGstStatus();
  }, []);

  const fetchGstStatus = async () => {
    try {
      const res = await apiFetch('/api/settings/receipt');
      if (res.ok) {
        const data = await res.json();
        if (data && data.gst_enabled !== undefined) {
          setIsGstEnabled(Boolean(Number(data.gst_enabled)));
        }
      }
    } catch (err) {
      console.error('[GST Status Check Error]', err);
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
    } else if (preset === 'week') {
      const day = now.getDay() || 7;
      fromDate = new Date(now.setDate(now.getDate() - day + 1));
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
    } else if (preset === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (preset === 'last_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }

    if (preset !== 'custom') {
      const fromStr = fromDate.toISOString().slice(0, 10) + ' 00:00:00';
      const toStr = toDate.toISOString().slice(0, 10) + ' 23:59:59';
      setDateFrom(fromStr);
      setDateTo(toStr);
    }
  };

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchGstReport();
    }
  }, [dateFrom, dateTo, paymentMode]);

  const fetchGstReport = async () => {
    setLoading(true);
    try {
      const query = `?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}&payment_mode=${encodeURIComponent(paymentMode)}`;
      const res = await apiFetch(`/api/reports/gst-slab${query}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        notify.error('Failed to load GST Slab report data.');
      }
    } catch (err) {
      console.error('GST Report fetch error:', err);
      notify.error('Network error fetching GST report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const query = `?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}&payment_mode=${encodeURIComponent(paymentMode)}`;
      const fileName = `GST_Slab_CA_Report_${dateFrom.slice(0, 10)}_to_${dateTo.slice(0, 10)}.xlsx`;
      await downloadFile(`/api/reports/gst-slab/export-excel${query}`, fileName);
      notify.success('CA-Ready GST Excel Report downloaded successfully!');
    } catch (err) {
      console.error('Download error:', err);
      notify.error(err?.message || 'Failed to download Excel report.');
    } finally {
      setDownloading(false);
    }
  };

  // Compute Grand Totals
  const slabs = reportData?.slabs || [];
  const totTaxable = slabs.reduce((acc, s) => acc + (s.taxable_amount || 0), 0);
  const totCgst = slabs.reduce((acc, s) => acc + (s.cgst_amount || 0), 0);
  const totSgst = slabs.reduce((acc, s) => acc + (s.sgst_amount || 0), 0);
  const totIgst = slabs.reduce((acc, s) => acc + (s.igst_amount || 0), 0);
  const totTax = slabs.reduce((acc, s) => acc + (s.total_gst || 0), 0);
  const totTurnover = slabs.reduce((acc, s) => acc + (s.invoice_value || 0), 0);
  const totInvoices = reportData?.total_invoices_count || 0;

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      
      {/* Header Banner */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileSpreadsheet color="#10b981" size={28} /> CA-Ready GST Slab Sales Report
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Grouped GST sales breakdown (0%, 5%, 12%, 18%, 28%) with CGST & SGST distribution for direct GST/GSTR-1 filing.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleDownloadExcel}
              disabled={downloading || loading}
              startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <Download size={20} />}
              sx={{
                bgcolor: '#10b981',
                color: '#ffffff',
                fontWeight: 700,
                px: 3,
                py: 1.2,
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                '&:hover': { bgcolor: '#059669' }
              }}
            >
              {downloading ? 'Generating Excel...' : 'Download CA-Ready Excel (.xlsx)'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* GST Disabled Warning Banner */}
      {!isGstEnabled && (
        <Alert severity="info" sx={{ borderRadius: 3, mb: 3, fontWeight: 700 }}>
          ℹ️ <strong>GST System is currently Disabled for your restaurant.</strong> Tax calculation is disabled on bills, receipts, and checkout.
        </Alert>
      )}

      {/* Filter Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range Preset</InputLabel>
              <Select
                value={datePreset}
                label="Date Range Preset"
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="yesterday">Yesterday</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="last_month">Last Month</MenuItem>
                <MenuItem value="custom">Custom Date Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {datePreset === 'custom' && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DateRangePicker
                startDate={dateFrom.slice(0, 10)}
                endDate={dateTo.slice(0, 10)}
                onChange={({ startDate, endDate }) => {
                  setDateFrom(startDate ? `${startDate} 00:00:00` : '');
                  setDateTo(endDate ? `${endDate} 23:59:59` : '');
                }}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Mode Filter</InputLabel>
              <Select
                value={paymentMode}
                label="Payment Mode Filter"
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <MenuItem value="all">All Payment Modes</MenuItem>
                <MenuItem value="cash">Cash Only</MenuItem>
                <MenuItem value="upi">UPI / Online QR</MenuItem>
                <MenuItem value="card">Card (Credit/Debit)</MenuItem>
                <MenuItem value="wallet">Wallet</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={fetchGstReport}
              startIcon={<RefreshCw size={16} />}
              sx={{ fontWeight: 600, height: 40 }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Metric Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderLeft: '5px solid #3b82f6', borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Taxable Sales
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mt: 0.5 }}>
                ₹{totTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderLeft: '5px solid #10b981', borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Central GST (CGST)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                ₹{totCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderLeft: '5px solid #f59e0b', borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                State GST (SGST)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#d97706', mt: 0.5 }}>
                ₹{totSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderLeft: '5px solid #8b5cf6', borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Total GST Collected
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#7c3aed', mt: 0.5 }}>
                ₹{totTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ borderLeft: '5px solid #f97316', borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Gross Sales (Turnover)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ea580c', mt: 0.5 }}>
                ₹{totTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main GST Slab Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 2, color: '#64748b' }}>Calculating GST Slab breakdown for CA report...</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1e293b' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>GST Slab Rate</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>Taxable Amount (₹)</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 700 }}>CGST %</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>CGST Amount (₹)</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 700 }}>SGST %</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>SGST Amount (₹)</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 700 }}>IGST %</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>IGST Amount (₹)</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>Total Tax (₹)</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>Total Invoice Value (₹)</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 700 }}>Invoices</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slabs.map((slab) => (
                <TableRow key={slab.gst_rate} hover sx={{ '&:nth-of-type(odd)': { bgcolor: '#f8fafc' } }}>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <Chip label={`${slab.gst_rate}% GST`} size="small" color={slab.gst_rate === 5 ? 'primary' : slab.gst_rate === 12 ? 'secondary' : 'default'} sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ₹{slab.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="center" sx={{ color: '#64748b' }}>{slab.cgst_rate}%</TableCell>
                  <TableCell align="right">₹{slab.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="center" sx={{ color: '#64748b' }}>{slab.sgst_rate}%</TableCell>
                  <TableCell align="right">₹{slab.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="center" sx={{ color: '#64748b' }}>0%</TableCell>
                  <TableCell align="right">₹0.00</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                    ₹{slab.total_gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    ₹{slab.invoice_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{slab.invoice_count}</TableCell>
                </TableRow>
              ))}

              {/* Summary Row */}
              <TableRow sx={{ bgcolor: '#e2e8f0', borderTop: '2px solid #94a3b8' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>TOTAL SUMMARY</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  ₹{totTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="center">-</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>
                  ₹{totCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="center">-</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#d97706' }}>
                  ₹{totSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="center">-</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>₹0.00</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.95rem' }}>
                  ₹{totTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                  ₹{totTurnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>{totInvoices}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Info Alert Box */}
      <Alert severity="info" sx={{ mt: 3, borderRadius: 2, '& .MuiAlert-icon': { color: '#3b82f6' } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>CA Audit Ready Format</Typography>
        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
          This GST report is formatted according to Indian GST Return (GSTR-1 B2C) filing standards. Downloading the Excel file provides both the <b>GST Slab Summary Sheet</b> and the itemized <b>B2C Invoice Register Sheet</b>.
        </Typography>
      </Alert>

    </Box>
  );
}
