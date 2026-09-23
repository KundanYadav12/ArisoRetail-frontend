import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Grid, Button,
  Divider, Paper, Chip, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  Select, FormControl, InputLabel, Tooltip, IconButton, Tabs, Tab
} from '@mui/material';
import {
  RefreshCw,
  Printer,
  Lock,
  Unlock,
  Calculator,
  FileText,
  CheckCircle,
  History,
  Save,
  AlertTriangle
} from 'lucide-react';

import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import CashDenominationModal from './CashDenominationModal';
import XReportModal from './XReportModal';
import { getISTDateString } from '../../utils/dateUtils';
import ZReportModal from './ZReportModal';

const VARIANCE_REASONS = [
  'Cash Shortage (Cashier error)',
  'Cash Excess (Tips / Unclaimed float)',
  'Wrong Payment Mode recorded in POS',
  'Unrecorded cash expense voucher',
  'Cash refund without system ticket',
  'EDC machine batch settlement mismatch',
  'Bank / UPI settlement timing delay',
  'Counting or denomination error',
  'Float discrepancy at shift handover',
  'Other (See notes)'
];

export default function DayEndDashboard({ user, token }) {
  const { notify, confirmDialog } = useNotify();

  const [activeTab, setActiveTab] = useState(0); // 0 = Current Day End, 1 = Past History
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => getISTDateString());

  // Reconciliation inputs
  const [actualCash, setActualCash] = useState('');
  const [cashVarianceReason, setCashVarianceReason] = useState('');
  const [paymentActuals, setPaymentActuals] = useState({});
  const [paymentReasons, setPaymentReasons] = useState({});
  const [closingNotes, setClosingNotes] = useState('');
  const [cashCounts, setCashCounts] = useState(null);

  // Modals
  const [denominationModalOpen, setDenominationModalOpen] = useState(false);
  const [xReportModalOpen, setXReportModalOpen] = useState(false);
  const [xReportData, setXReportData] = useState(null);
  const [xReportLoading, setXReportLoading] = useState(false);
  const [zReportModalOpen, setZReportModalOpen] = useState(false);
  const [zReportData, setZReportData] = useState(null);
  const [zReportLoading, setZReportLoading] = useState(false);

  // Open Day modal
  const [openDayModalOpen, setOpenDayModalOpen] = useState(false);
  const [openFloatInput, setOpenFloatInput] = useState('2000');
  const [openDayNotes, setOpenDayNotes] = useState('');

  // Reopen Day modal
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // History states
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isManagerOrAdmin = ['admin', 'super_admin', 'manager'].includes((user?.role || '').toLowerCase());

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/day-end/summary?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);

        // Prepopulate actual cash from existing draft/closed or expected cash
        if (data.existing_day_end && data.existing_day_end.actual_cash !== undefined) {
          setActualCash(String(data.existing_day_end.actual_cash));
          setCashVarianceReason(data.existing_day_end.cash_variance_reason || '');
          setClosingNotes(data.existing_day_end.closing_notes || '');
        } else {
          setActualCash(String(data.cash_reconciliation?.expected_cash || 0));
        }

        // Initialize payment actuals
        const pActs = {};
        for (const m of (data.payment_modes || [])) {
          pActs[m.payment_mode] = m.expected_amount || 0;
        }
        setPaymentActuals(pActs);
      } else {
        let errMsg = 'Failed to load day end summary.';
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch (_) {}
        notify?.error?.(errMsg);
      }
    } catch (e) {
      console.error(e);
      notify?.error?.('Network error loading day end summary.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch('/api/day-end/history?limit=30');
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenXReport = async () => {
    setXReportLoading(true);
    setXReportModalOpen(true);
    try {
      const res = await apiFetch(`/api/day-end/x-report?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setXReportData(data);
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to fetch X Report.');
      }
    } catch (e) {
      notify.error('Network error fetching X Report.');
    } finally {
      setXReportLoading(false);
    }
  };

  const handleOpenZReport = async (dayEndId = null) => {
    const targetId = dayEndId || summaryData?.existing_day_end?.id;
    if (!targetId) {
      notify.info('No closed Z-Report exists for this business day yet.');
      return;
    }
    setZReportLoading(true);
    setZReportModalOpen(true);
    try {
      const res = await apiFetch(`/api/day-end/z-report/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setZReportData(data);
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to fetch Z Report.');
      }
    } catch (e) {
      notify.error('Network error fetching Z Report.');
    } finally {
      setZReportLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!summaryData?.business_day?.id) return;
    try {
      const payload = {
        business_day_id: summaryData.business_day.id,
        actual_cash: parseFloat(actualCash || 0),
        cash_variance_reason: cashVarianceReason,
        closing_notes: closingNotes,
        payment_reconciliations: Object.entries(paymentActuals).map(([mode, amt]) => ({
          payment_mode: mode,
          actual_amount: parseFloat(amt || 0),
          variance_reason: paymentReasons[mode] || null
        }))
      };

      const res = await apiFetch('/api/day-end/draft', {
        method: 'POST',
        body: payload
      });

      if (res.ok) {
        notify.success('Reconciliation draft saved successfully.');
        fetchSummary();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to save draft.');
      }
    } catch (e) {
      notify.error('Network error saving draft.');
    }
  };

  const handleCloseDay = async () => {
    if (!summaryData?.business_day?.id) return;

    const expCash = summaryData.cash_reconciliation?.expected_cash || 0;
    const actCash = parseFloat(actualCash || 0);
    const variance = actCash - expCash;

    if (variance !== 0 && !cashVarianceReason.trim()) {
      notify.error(`Cash variance of ₹${variance.toFixed(2)} requires a mandatory variance reason.`);
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Confirm Final Day Close',
      message: `Are you sure you want to CLOSE the business day for ${summaryData.business_day.business_date}? This will generate the official Z-Report and lock transactions for this day.`,
      confirmText: 'Yes, Close Business Day',
      isDestructive: false
    });

    if (!confirmed) return;

    try {
      const payload = {
        business_day_id: summaryData.business_day.id,
        actual_cash: actCash,
        cash_variance_reason: cashVarianceReason,
        closing_notes: closingNotes,
        cash_count: cashCounts,
        payment_reconciliations: Object.entries(paymentActuals).map(([mode, amt]) => ({
          payment_mode: mode,
          actual_amount: parseFloat(amt || 0),
          variance_reason: paymentReasons[mode] || null
        }))
      };

      const res = await apiFetch('/api/day-end/close', {
        method: 'POST',
        body: payload
      });

      if (res.ok) {
        const data = await res.json();
        notify.success(`Business day closed successfully! Z-Report #${data.day_end?.z_report_number || ''}`);
        fetchSummary();
        // Automatically open the Z-Report modal
        if (data.day_end?.id) {
          handleOpenZReport(data.day_end.id);
        }
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to close business day.');
      }
    } catch (e) {
      notify.error('Network error closing business day.');
    }
  };

  const handleOpenDaySubmit = async () => {
    try {
      const res = await apiFetch('/api/day-end/open-day', {
        method: 'POST',
        body: {
          businessDate: selectedDate,
          openingFloat: parseFloat(openFloatInput || 0),
          notes: openDayNotes
        }
      });
      if (res.ok) {
        notify.success('Business day opened successfully.');
        setOpenDayModalOpen(false);
        fetchSummary();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to open business day.');
      }
    } catch (e) {
      notify.error('Network error opening business day.');
    }
  };

  const handleReopenSubmit = async () => {
    if (!reopenReason.trim()) {
      notify.error('A reason is mandatory to reopen a closed day.');
      return;
    }
    try {
      const res = await apiFetch('/api/day-end/reopen', {
        method: 'POST',
        body: {
          business_day_id: summaryData.business_day.id,
          reason: reopenReason.trim()
        }
      });
      if (res.ok) {
        notify.success('Business day reopened for correction.');
        setReopenModalOpen(false);
        fetchSummary();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to reopen business day.');
      }
    } catch (e) {
      notify.error('Network error reopening day.');
    }
  };

  const handleApplyCashCounts = ({ counts, total }) => {
    setCashCounts(counts);
    setActualCash(String(total));
    notify.info(`Physical cash count of ₹${total.toFixed(2)} applied.`);
  };

  const bDay = summaryData?.business_day || {};
  const sales = summaryData?.sales_summary || {};
  const cash = summaryData?.cash_reconciliation || {};
  const exp = summaryData?.expense_summary || {};
  const modes = summaryData?.payment_modes || [];
  const warnings = summaryData?.warnings || [];

  const isClosed = bDay.status === 'CLOSED';
  const expectedCashVal = cash.expected_cash || 0;
  const currentActualCashVal = parseFloat(actualCash || 0);
  const currentCashVariance = parseFloat((currentActualCashVal - expectedCashVal).toFixed(2));

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 3 } }}>
        {/* Header Ribbon */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircle size={28} style={{ color: '#4f46e5' }} /> Day End & Cash Closing
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Petpooja-Style Daily Sales, Payment Modes & Cash Drawer Reconciliation
            </Typography>
          </Box>

          {/* Quick Date and Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="date"
              label="Business Date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />

            <Button
              variant="outlined"
              startIcon={<RefreshCw size={18} />}
              onClick={fetchSummary}
              sx={{ fontWeight: 700 }}
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<FileText size={18} />}
              onClick={handleOpenXReport}
              sx={{ fontWeight: 800 }}
            >
              X Report (Live)
            </Button>

            {isClosed && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Printer size={18} />}
                onClick={() => handleOpenZReport()}
                sx={{ fontWeight: 800 }}
              >
                Z Report
              </Button>
            )}

            {!isClosed && isManagerOrAdmin && (
              <Button
                variant="outlined"
                color="info"
                startIcon={<Unlock size={18} />}
                onClick={() => { setOpenFloatInput(String(bDay.opening_cash_float || 2000)); setOpenDayModalOpen(true); }}
                sx={{ fontWeight: 700 }}
              >
                {bDay.id ? 'Edit Float' : 'Open Day'}
              </Button>
            )}

            {isClosed && isManagerOrAdmin && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<Unlock size={18} />}
                onClick={() => setReopenModalOpen(true)}
                sx={{ fontWeight: 800 }}
              >
                Reopen for Correction
              </Button>
            )}
          </Box>
        </Box>

        {/* Tab Strip */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
            <Tab label="📋 Daily Reconciliation" sx={{ fontWeight: 800, textTransform: 'none' }} />
            <Tab label="📜 Closed Day End History" icon={<History size={18} />} iconPosition="start" sx={{ fontWeight: 800, textTransform: 'none' }} />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Status & Warning Banners */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={`STATUS: ${bDay.status || 'UNOPENED'}`}
                  color={isClosed ? 'default' : (bDay.status === 'REOPENED_FOR_CORRECTION' ? 'secondary' : 'success')}
                  sx={{ fontWeight: 800, px: 1 }}
                />
                <Chip
                  label={`Opening Float: ₹${(bDay.opening_cash_float || 0).toFixed(2)}`}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                {bDay.opened_by_name && (
                  <Chip
                    label={`Opened by: ${bDay.opened_by_name}`}
                    variant="outlined"
                    size="small"
                  />
                )}
                {summaryData?.existing_day_end?.z_report_number && (
                  <Chip
                    label={`Z-Report: ${summaryData.existing_day_end.z_report_number}`}
                    color="success"
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Box>

              {warnings.map((w, idx) => (
                <Alert key={idx} severity="warning" icon={<AlertTriangle size={20} />} sx={{ fontWeight: 600 }}>
                  {w.message}
                </Alert>
              ))}

              {/* 1. SALES SUMMARY CARDS */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📊 Sales Summary (Existing POS Invoices)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>GROSS SALES</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>₹{(sales.gross_sales || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DISCOUNTS</Typography>
                        <Typography variant="h6" color="error.main" sx={{ fontWeight: 800 }}>- ₹{(sales.total_discount || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL GST / TAX</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>₹{(sales.total_tax || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: 'rgba(249, 115, 22, 0.05)', borderColor: 'primary.light' }}>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>NET SALES ({sales.total_bills || 0} Bills)</Typography>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>₹{(sales.net_sales || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2.4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CREDIT / OUTSTANDING</Typography>
                        <Typography variant="h6" color="info.main" sx={{ fontWeight: 800 }}>₹{(sales.credit_amount || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* 2. PAYMENT MODE SUMMARY */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                    💳 Collections by Payment Mode (Multi-Split Reconciled)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Multi-payment invoices are split proportionally. Credit bills are tracked in party ledger without bank inflows.
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>Payment Mode</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Mapped Account</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Expected Collection</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: 180 }}>Actual Verified</TableCell>
                          <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Variance</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: 200 }}>Variance Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modes.map(m => {
                          const expAmt = m.expected_amount || 0;
                          const actAmt = paymentActuals[m.payment_mode] !== undefined ? parseFloat(paymentActuals[m.payment_mode]) : expAmt;
                          const varAmt = parseFloat((actAmt - expAmt).toFixed(2));
                          return (
                            <TableRow key={m.payment_mode} hover>
                              <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                                {m.payment_mode}
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {m.account_name || (m.is_credit ? 'Customer Ledger' : 'Main Cash Drawer')}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                                ₹{expAmt.toFixed(2)}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'right' }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  disabled={isClosed}
                                  value={actAmt}
                                  onChange={e => setPaymentActuals(prev => ({ ...prev, [m.payment_mode]: e.target.value }))}
                                  slotProps={{ htmlInput: { style: { textAlign: 'right', fontWeight: 'bold' } } }}
                                  sx={{ width: 140 }}
                                />
                              </TableCell>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: varAmt < 0 ? 'error.main' : (varAmt > 0 ? 'success.main' : 'text.secondary') }}>
                                {varAmt < 0 ? `-₹${Math.abs(varAmt).toFixed(2)}` : (varAmt > 0 ? `+₹${varAmt.toFixed(2)}` : '₹0.00')}
                              </TableCell>
                              <TableCell>
                                {varAmt !== 0 ? (
                                  <TextField
                                    size="small"
                                    placeholder="Reason for diff"
                                    disabled={isClosed}
                                    value={paymentReasons[m.payment_mode] || ''}
                                    onChange={e => setPaymentReasons(prev => ({ ...prev, [m.payment_mode]: e.target.value }))}
                                    fullWidth
                                  />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">—</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* 3. CASH RECONCILIATION CARD (The most important section) */}
              <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '5px solid #10b981' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        💵 Cash Drawer Reconciliation
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Formula: Opening Float + Cash Sales + Cash In - Cash Expenses - Payouts - Refunds = Expected Cash
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Calculator size={18} />}
                      onClick={() => setDenominationModalOpen(true)}
                      disabled={isClosed}
                      sx={{ fontWeight: 800 }}
                    >
                      Physical Denomination Count
                    </Button>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Left: Step-by-Step Mathematical Calculation */}
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                          Step-by-Step Breakdown
                        </Typography>
                        <Divider sx={{ mb: 1.5 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.9rem' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Opening Cash Float:</span>
                            <b>+ ₹{(cash.opening_float || 0).toFixed(2)}</b>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Cash Sales (POS Bills):</span>
                            <b>+ ₹{(cash.cash_sales || 0).toFixed(2)}</b>
                          </Box>
                          {cash.other_cash_in > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Other Cash In (Float add):</span>
                              <b>+ ₹{(cash.other_cash_in || 0).toFixed(2)}</b>
                            </Box>
                          )}
                          {cash.cash_transfers_in > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Bank Contra Inflow:</span>
                              <b>+ ₹{(cash.cash_transfers_in || 0).toFixed(2)}</b>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                            <span>Cash Expenses (Recorded):</span>
                            <b>- ₹{(cash.cash_expenses || 0).toFixed(2)}</b>
                          </Box>
                          {cash.cash_withdrawals > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                              <span>Cash Withdrawals / Payouts:</span>
                              <b>- ₹{(cash.cash_withdrawals || 0).toFixed(2)}</b>
                            </Box>
                          )}
                          {cash.cash_transfers_out > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                              <span>Bank Contra Deposit Out:</span>
                              <b>- ₹{(cash.cash_transfers_out || 0).toFixed(2)}</b>
                            </Box>
                          )}
                          {cash.refunds_from_cash > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                              <span>Cash Refunds Paid:</span>
                              <b>- ₹{(cash.refunds_from_cash || 0).toFixed(2)}</b>
                            </Box>
                          )}
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                            <span>Expected Cash in Drawer:</span>
                            <span style={{ color: '#10b981' }}>₹{expectedCashVal.toFixed(2)}</span>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Right: Actual Input and Variance Analysis */}
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          label="Actual Physical Cash Counted (₹)"
                          type="number"
                          value={actualCash}
                          disabled={isClosed}
                          onChange={e => setActualCash(e.target.value)}
                          slotProps={{
                            htmlInput: { style: { fontSize: '1.3rem', fontWeight: 'bold' } }
                          }}
                          fullWidth
                          helperText="Use the Denomination Counter or enter physical total"
                        />

                        {/* Variance Card */}
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: currentCashVariance < 0 ? 'error.light' : (currentCashVariance > 0 ? 'warning.light' : 'success.light'),
                            color: currentCashVariance < 0 ? 'error.contrastText' : (currentCashVariance > 0 ? 'warning.contrastText' : 'success.contrastText')
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Cash Variance
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800 }}>
                            {currentCashVariance < 0
                              ? `-₹${Math.abs(currentCashVariance).toFixed(2)} (Cash Shortage)`
                              : (currentCashVariance > 0
                                ? `+₹${currentCashVariance.toFixed(2)} (Cash Excess)`
                                : '₹0.00 (Balanced)')}
                          </Typography>
                        </Paper>

                        {/* Variance Reason Selection */}
                        {currentCashVariance !== 0 && (
                          <FormControl fullWidth size="small" required>
                            <InputLabel>Variance Reason</InputLabel>
                            <Select
                              value={cashVarianceReason}
                              label="Variance Reason"
                              disabled={isClosed}
                              onChange={e => setCashVarianceReason(e.target.value)}
                            >
                              {VARIANCE_REASONS.map(r => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}

                        <TextField
                          size="small"
                          label="Closing Notes / Remarks"
                          multiline
                          rows={2}
                          disabled={isClosed}
                          value={closingNotes}
                          onChange={e => setClosingNotes(e.target.value)}
                          placeholder="Optional audit notes for this business day..."
                          fullWidth
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* 4. EXPENSE SUMMARY */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                    🧾 Expense Integration (Automated from Expenses Module)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">CASH EXPENSES (DEDUCTED)</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>₹{(exp.cash_expenses || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">BANK / DIGITAL EXPENSES</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>₹{(exp.bank_expenses || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">TOTAL DAILY EXPENSES</Typography>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>₹{(exp.total_expenses || 0).toFixed(2)}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Bottom Action Footer */}
              {!isClosed ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Ready to Close Day?</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ensures atomic commit, generates Z-Report, and locks historical sales from tampering.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Save size={18} />}
                      onClick={handleSaveDraft}
                      sx={{ fontWeight: 700 }}
                    >
                      Save Draft
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Lock size={18} />}
                      onClick={handleCloseDay}
                      sx={{ fontWeight: 800, px: 3 }}
                    >
                      Close Business Day
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    🔒 This Business Day is CLOSED and committed to financial records.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordinary cashiers cannot modify closed data. Managers may use "Reopen for Correction" if an audit adjustment is required.
                  </Typography>
                </Paper>
              )}
            </Box>
          )
        )}

        {/* Tab 1: Past Day End History */}
        {activeTab === 1 && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                📜 Closed Business Days & Z-Reports
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Z-Report #</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Net Sales</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Expected Cash</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actual Cash</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Variance</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Closed By</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                    ) : historyRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={9} align="center">No past day ends recorded.</TableCell></TableRow>
                    ) : (
                      historyRecords.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{String(r.business_date).slice(0, 10)}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{r.z_report_number || '—'}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>₹{parseFloat(r.net_sales || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{parseFloat(r.expected_cash || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>₹{parseFloat(r.actual_cash || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: parseFloat(r.cash_variance || 0) < 0 ? 'error.main' : (parseFloat(r.cash_variance || 0) > 0 ? 'success.main' : 'text.secondary') }}>
                            {parseFloat(r.cash_variance || 0) < 0 ? `-₹${Math.abs(r.cash_variance).toFixed(2)}` : (parseFloat(r.cash_variance || 0) > 0 ? `+₹${r.cash_variance.toFixed(2)}` : '₹0.00')}
                          </TableCell>
                          <TableCell>{r.closed_by_name || 'Staff'}</TableCell>
                          <TableCell>
                            <Chip label={r.status} size="small" color={r.status === 'CLOSED' ? 'success' : 'default'} sx={{ fontWeight: 800 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Printer size={18} />}
                              onClick={() => handleOpenZReport(r.id)}
                              sx={{ fontWeight: 700 }}
                            >
                              Z Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <CashDenominationModal
          open={denominationModalOpen}
          onClose={() => setDenominationModalOpen(false)}
          onApply={handleApplyCashCounts}
          initialCounts={cashCounts}
          expectedCash={expectedCashVal}
        />

        <XReportModal
          open={xReportModalOpen}
          onClose={() => setXReportModalOpen(false)}
          reportData={xReportData}
          loading={xReportLoading}
        />

        <ZReportModal
          open={zReportModalOpen}
          onClose={() => setZReportModalOpen(false)}
          reportData={zReportData}
          loading={zReportLoading}
        />

        {/* Open Day Dialog */}
        <Dialog open={openDayModalOpen} onClose={() => setOpenDayModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Open Business Day</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Set the opening cash float for {selectedDate}. Float is not counted as sales revenue.
            </Typography>
            <TextField
              label="Opening Cash Float (₹)"
              type="number"
              value={openFloatInput}
              onChange={e => setOpenFloatInput(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Opening Notes"
              value={openDayNotes}
              onChange={e => setOpenDayNotes(e.target.value)}
              placeholder="e.g. Morning shift float"
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDayModalOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleOpenDaySubmit} sx={{ fontWeight: 800 }}>
              Save Opening Float
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reopen Day Dialog */}
        <Dialog open={reopenModalOpen} onClose={() => setReopenModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: 'secondary.main' }}>
            Reopen Closed Day for Correction
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="warning">
              Reopening a closed day is audited. You must provide a valid justification.
            </Alert>
            <TextField
              label="Correction Reason (Mandatory)"
              multiline
              rows={3}
              required
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="Explain why this closed business day requires correction..."
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setReopenModalOpen(false)}>Cancel</Button>
            <Button variant="contained" color="secondary" onClick={handleReopenSubmit} sx={{ fontWeight: 800 }}>
              Confirm Reopen
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
