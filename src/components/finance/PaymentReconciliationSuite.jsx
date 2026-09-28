import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Tabs, Tab, IconButton, CircularProgress,
  Divider, Tooltip, InputAdornment, TablePagination
} from '@mui/material';
import {
  ArrowRightLeft, Landmark, RefreshCw, Plus, Search,
  Download, CheckCircle2, AlertTriangle, FileText,
  Clock, ShieldAlert, Check, Eye
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import RecordSettlementModal from './RecordSettlementModal';
import MatchPaymentModal from './MatchPaymentModal';
import ReconciliationDetailModal from './ReconciliationDetailModal';
import ReconciliationAdjustmentModal from './ReconciliationAdjustmentModal';
import { getISTDateString } from '../../utils/dateUtils';

export default function PaymentReconciliationSuite({ user }) {
  const { notify } = useNotify();

  // Active SubTab: 0 = Settlement Batches, 1 = Unreconciled POS Payments
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);

  // Accounts & Mappings
  const [accounts, setAccounts] = useState([]);
  const [paymentModes, setPaymentModes] = useState(['upi', 'card', 'bank_transfer', 'online', 'wallet']);

  // Summary Metrics
  const [summary, setSummary] = useState({
    expected_collection: 0,
    actual_settlement: 0,
    matched_amount: 0,
    unreconciled_amount: 0,
    discrepancy_amount: 0,
    charges_fees: 0,
    net_settlement: 0,
    unreconciled_count: 0,
    unmatched_settlements_count: 0,
    total_settlements_count: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    paymentMode: 'all',
    accountId: 'all',
    status: 'all',
    search: ''
  });

  // Settlements Data
  const [settlements, setSettlements] = useState([]);
  const [settlementPage, setSettlementPage] = useState(0);
  const [settlementRowsPerPage, setSettlementRowsPerPage] = useState(25);
  const [totalSettlements, setTotalSettlements] = useState(0);

  // Unreconciled Payments Data
  const [unreconciledList, setUnreconciledList] = useState([]);
  const [unreconciledPage, setUnreconciledPage] = useState(0);
  const [unreconciledRowsPerPage, setUnreconciledRowsPerPage] = useState(25);
  const [totalUnreconciled, setTotalUnreconciled] = useState(0);

  // Modals
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [matchingSettlement, setMatchingSettlement] = useState(null);
  const [detailSettlement, setDetailSettlement] = useState(null);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);

  // 1. Fetch Accounts on Mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch('/api/finance/accounts?activeOnly=1');
      const json = await res.json();
      if (res.ok && json.data) {
        setAccounts(json.data);
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    }
  };

  // 2. Fetch Data according to filters & active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
      if (filters.paymentMode !== 'all') queryParams.set('paymentMode', filters.paymentMode);
      if (filters.accountId !== 'all') queryParams.set('accountId', filters.accountId);
      if (filters.status !== 'all') queryParams.set('status', filters.status);
      if (filters.search) queryParams.set('search', filters.search);

      // Fetch Summary Metrics
      const overviewRes = await apiFetch(`/api/payment-reconciliation/overview?${queryParams.toString()}`);
      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        if (overviewJson.data) {
          setSummary(overviewJson.data.summary || {});
        }
      }

      if (subTab === 0) {
        // Fetch Settlement Batches
        queryParams.set('limit', String(settlementRowsPerPage));
        queryParams.set('offset', String(settlementPage * settlementRowsPerPage));
        const sRes = await apiFetch(`/api/payment-reconciliation/settlements?${queryParams.toString()}`);
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson.data) {
            setSettlements(sJson.data.settlements || []);
            setTotalSettlements(sJson.data.total || 0);
          }
        }
      } else {
        // Fetch Unreconciled Payments
        queryParams.set('limit', String(unreconciledRowsPerPage));
        queryParams.set('offset', String(unreconciledPage * unreconciledRowsPerPage));
        const uRes = await apiFetch(`/api/payment-reconciliation/unreconciled-payments?${queryParams.toString()}`);
        if (uRes.ok) {
          const uJson = await uRes.json();
          if (uJson.data) {
            setUnreconciledList(uJson.data.payments || []);
            setTotalUnreconciled(uJson.data.total || 0);
          }
        }
      }
    } catch (err) {
      console.error('Fetch reconciliation error:', err);
      notify?.error?.('Error loading reconciliation data');
    } finally {
      setLoading(false);
    }
  }, [filters, subTab, settlementPage, settlementRowsPerPage, unreconciledPage, unreconciledRowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run Auto-Matching
  const handleRunAutoMatch = async () => {
    setAutoMatching(true);
    try {
      const res = await apiFetch('/api/payment-reconciliation/auto-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (res.ok) {
        notify?.(`Auto-matching completed: ${json.data?.matched || 0} payment(s) matched`, 'success');
        fetchData();
      } else {
        throw new Error(json.error || 'Failed to run auto-match');
      }
    } catch (err) {
      console.error('Auto match error:', err);
      notify?.(err.message || 'Auto-match failed', 'error');
    } finally {
      setAutoMatching(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (subTab === 0) {
      if (settlements.length === 0) {
        notify?.('No settlement records to export', 'warning');
        return;
      }
      let csv = 'Settlement #,Date,Payment Mode,Account,Gross Amount,Fees,Net Amount,Matched Amount,Unmatched Amount,Status,Reference\n';
      settlements.forEach(s => {
        csv += `"${s.settlement_number}","${s.settlement_date}","${(s.payment_mode || '').toUpperCase()}","${(s.account_name || '').replace(/"/g, '""')}",${s.gross_amount},${parseFloat(s.fee_amount || 0) + parseFloat(s.tax_on_fee || 0)},${s.net_amount},${s.matched_amount},${s.unmatched_amount},"${s.status}","${s.reference_number || ''}"\n`;
      });
      downloadFile(csv, `Settlements_${getISTDateString()}.csv`);
    } else {
      if (unreconciledList.length === 0) {
        notify?.('No unreconciled records to export', 'warning');
        return;
      }
      let csv = 'Invoice #,Sale Date,Payment Mode,Customer,Expected Amount,Already Settled,Remaining Balance,Account\n';
      unreconciledList.forEach(u => {
        csv += `"${u.order_number}","${u.sale_date}","${(u.payment_mode || '').toUpperCase()}","${(u.customer_name || 'Walk-in').replace(/"/g, '""')}",${u.expected_amount},${u.already_settled_amount},${u.remaining_amount},"${(u.account_name || '').replace(/"/g, '""')}"\n`;
      });
      downloadFile(csv, `Unreconciled_Payments_${getISTDateString()}.csv`);
    }
  };

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify?.('CSV downloaded successfully', 'success');
  };

  const getStatusChip = (status) => {
    let color = 'default';
    if (status === 'SETTLED' || status === 'MATCHED') color = 'success';
    else if (status === 'PARTIALLY_MATCHED') color = 'warning';
    else if (status === 'DISCREPANCY') color = 'error';
    else if (status === 'UNMATCHED') color = 'default';

    return <Chip label={status} color={color} size="small" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />;
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      {/* 1. Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ArrowRightLeft size={28} style={{ color: '#4f46e5' }} /> Payment Reconciliation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reconcile POS Collections vs Bank, UPI & Payment Gateway Settlements
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={fetchData}
            disabled={loading}
            sx={{ fontWeight: 700 }}
          >
            Refresh
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<CheckCircle2 size={18} />}
            onClick={handleRunAutoMatch}
            disabled={autoMatching || loading}
            sx={{ fontWeight: 700 }}
          >
            {autoMatching ? 'Matching...' : 'Run Auto-Match'}
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<ShieldAlert size={18} />}
            onClick={() => setAdjustmentModalOpen(true)}
            sx={{ fontWeight: 700 }}
          >
            Adjustment
          </Button>

          <Button
            variant="outlined"
            color="info"
            startIcon={<Download size={18} />}
            onClick={handleExportCSV}
            sx={{ fontWeight: 700 }}
          >
            Export CSV
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={() => setRecordModalOpen(true)}
            sx={{ fontWeight: 800 }}
          >
            Record Settlement
          </Button>
        </Box>
      </Box>

      {/* 2. Top Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Expected POS Collections
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#4f46e5' }}>
                ₹{(summary.expected_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">Digital POS sales recorded</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Actual Bank Settlements
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                ₹{(summary.actual_settlement || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">Gross received in banks</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Matched & Settled
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                ₹{(summary.matched_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">Reconciled to POS invoices</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Unreconciled Awaiting Settlement
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
                ₹{(summary.unreconciled_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">{summary.unreconciled_count || 0} orders pending payout</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'action.hover' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                MDR & Gateway Fees Deducted
              </Typography>
              <Typography variant="h6" color="error.main" sx={{ fontWeight: 800 }}>
                -₹{(summary.charges_fees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">Ledger fee deductions</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'action.hover' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Net Deposited in Bank
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
                ₹{(summary.net_settlement || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">Gross minus fees & tax</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'action.hover' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Discrepancy / Variances
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: summary.discrepancy_amount > 0 ? 'error.main' : 'text.secondary' }}>
                ₹{(summary.discrepancy_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary">Shortages or unexplained variances</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              label="Date From"
              size="small"
              fullWidth
              value={filters.dateFrom}
              onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              label="Date To"
              size="small"
              fullWidth
              value={filters.dateTo}
              onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              label="Payment Mode"
              size="small"
              fullWidth
              value={filters.paymentMode}
              onChange={e => setFilters(prev => ({ ...prev, paymentMode: e.target.value }))}
            >
              <MenuItem value="all">All Modes</MenuItem>
              {paymentModes.map(m => (
                <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              label="Financial Account"
              size="small"
              fullWidth
              value={filters.accountId}
              onChange={e => setFilters(prev => ({ ...prev, accountId: e.target.value }))}
            >
              <MenuItem value="all">All Accounts</MenuItem>
              {accounts.map(a => (
                <MenuItem key={a.id} value={String(a.id)}>
                  {a.account_name} ({a.bank_name || a.account_type})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <TextField
              select
              label="Status"
              size="small"
              fullWidth
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="UNMATCHED">UNMATCHED</MenuItem>
              <MenuItem value="PARTIALLY_MATCHED">PARTIALLY MATCHED</MenuItem>
              <MenuItem value="SETTLED">SETTLED</MenuItem>
              <MenuItem value="DISCREPANCY">DISCREPANCY</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search reference, invoice..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              slotProps={{
                input: {
                  startAdornment: <Search size={16} style={{ marginRight: 6, color: '#9ca3af' }} />
                }
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 4. Sub-Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} textColor="primary" indicatorColor="primary">
          <Tab
            label={`🏦 Settlement Batches (${totalSettlements})`}
            sx={{ fontWeight: 800, textTransform: 'none' }}
          />
          <Tab
            label={`⏳ Unreconciled POS Payments (${totalUnreconciled})`}
            sx={{ fontWeight: 800, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* SUBTAB 0: Settlements List */}
      {subTab === 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <TableContainer sx={{ minHeight: 350 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Settlement #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Deposit Account</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>UTR / Reference</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Gross (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Fees (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Net (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Matched (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : settlements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No settlement batches found. Click "Record Settlement" to input a bank or gateway payout.
                    </TableCell>
                  </TableRow>
                ) : (
                  settlements.map(s => {
                    const feeTotal = parseFloat(s.fee_amount || 0) + parseFloat(s.tax_on_fee || 0);
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>
                          {s.settlement_number}
                        </TableCell>
                        <TableCell>{s.settlement_date}</TableCell>
                        <TableCell>
                          <Chip label={(s.payment_mode || '').toUpperCase()} size="small" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{s.account_name || 'N/A'}</TableCell>
                        <TableCell variant="caption" color="text.secondary">{s.reference_number || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>₹{parseFloat(s.gross_amount || 0).toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {feeTotal > 0 ? `-₹${feeTotal.toFixed(2)}` : '₹0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          ₹{parseFloat(s.net_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                          ₹{parseFloat(s.matched_amount || 0).toFixed(2)}
                          {s.matched_orders_count > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              ({s.matched_orders_count} orders)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">{getStatusChip(s.status)}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {s.status !== 'SETTLED' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<ArrowRightLeft size={14} />}
                                onClick={() => setMatchingSettlement(s)}
                                sx={{ fontSize: '0.75rem', fontWeight: 800 }}
                              >
                                Match
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Eye size={14} />}
                              onClick={async () => {
                                const full = await apiFetch(`/api/payment-reconciliation/settlements/${s.id}`).then(r => r.json());
                                setDetailSettlement(full.data);
                              }}
                              sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              Details
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
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalSettlements}
            rowsPerPage={settlementRowsPerPage}
            page={settlementPage}
            onPageChange={(e, p) => setSettlementPage(p)}
            onRowsPerPageChange={e => {
              setSettlementRowsPerPage(parseInt(e.target.value, 10));
              setSettlementPage(0);
            }}
          />
        </Paper>
      )}

      {/* SUBTAB 1: Unreconciled POS Payments List */}
      {subTab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <TableContainer sx={{ minHeight: 350 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Sale Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Mapped Account</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Expected (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Already Settled (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Remaining Balance (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : unreconciledList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      All POS sales are fully reconciled! No pending settlements awaiting payout.
                    </TableCell>
                  </TableRow>
                ) : (
                  unreconciledList.map(u => (
                    <TableRow key={u.financial_transaction_id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{u.order_number}</TableCell>
                      <TableCell>{u.sale_date ? new Date(u.sale_date).toLocaleString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.customer_name || 'Walk-in'}</Typography>
                        {u.customer_phone && <Typography variant="caption" color="text.secondary">{u.customer_phone}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip label={(u.payment_mode || '').toUpperCase()} size="small" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>{u.account_name || 'N/A'}</TableCell>
                      <TableCell align="right">₹{parseFloat(u.expected_amount || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        ₹{parseFloat(u.already_settled_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.main' }}>
                        ₹{parseFloat(u.remaining_amount || u.expected_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={parseFloat(u.already_settled_amount || 0) > 0 ? 'PARTIALLY_SETTLED' : 'UNRECONCILED'}
                          color={parseFloat(u.already_settled_amount || 0) > 0 ? 'warning' : 'default'}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalUnreconciled}
            rowsPerPage={unreconciledRowsPerPage}
            page={unreconciledPage}
            onPageChange={(e, p) => setUnreconciledPage(p)}
            onRowsPerPageChange={e => {
              setUnreconciledRowsPerPage(parseInt(e.target.value, 10));
              setUnreconciledPage(0);
            }}
          />
        </Paper>
      )}

      {/* Modals */}
      <RecordSettlementModal
        open={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        accounts={accounts}
        paymentModes={paymentModes}
        onSuccess={() => fetchData()}
      />

      {matchingSettlement && (
        <MatchPaymentModal
          open={Boolean(matchingSettlement)}
          settlement={matchingSettlement}
          onClose={() => setMatchingSettlement(null)}
          onSuccess={() => fetchData()}
        />
      )}

      {detailSettlement && (
        <ReconciliationDetailModal
          open={Boolean(detailSettlement)}
          settlement={detailSettlement}
          onClose={() => setDetailSettlement(null)}
          onUpdated={() => fetchData()}
        />
      )}

      <ReconciliationAdjustmentModal
        open={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        accounts={accounts}
        onSuccess={() => fetchData()}
      />
    </Box>
  );
}
