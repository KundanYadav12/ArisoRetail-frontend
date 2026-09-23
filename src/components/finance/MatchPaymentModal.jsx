import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, TextField, Checkbox, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Alert, CircularProgress, MenuItem, Divider
} from '@mui/material';
import { ArrowRightLeft, Search, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

const DISCREPANCY_REASONS = [
  'MDR / Payment Gateway Charges',
  'Settlement Shortfall / Bank Fee',
  'Wrong Mode Recorded in POS',
  'Timing Delay / Next Batch Carryforward',
  'Chargeback / Customer Dispute',
  'Denomination / Rounding Difference',
  'Other (Explain in notes)'
];

export default function MatchPaymentModal({
  open,
  onClose,
  settlement,
  onSuccess
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [payments, setPayments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [varianceReason, setVarianceReason] = useState(DISCREPANCY_REASONS[0]);
  const [notes, setNotes] = useState('');

  // Fetch candidate unreconciled payments
  useEffect(() => {
    if (open && settlement) {
      setSelectedIds([]);
      setSearchTerm('');
      setNotes('');
      fetchCandidatePayments();
    }
  }, [open, settlement]);

  const fetchCandidatePayments = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        paymentMode: settlement.payment_mode || 'all',
        accountId: settlement.account_id ? String(settlement.account_id) : 'all',
        limit: '100'
      });
      const res = await apiFetch(`/api/payment-reconciliation/unreconciled-payments?${query.toString()}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setPayments(json.data.payments || []);
      }
    } catch (err) {
      console.error('Fetch unreconciled error:', err);
      notify?.('Failed to load candidate orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const unmatchedTarget = parseFloat(settlement?.unmatched_amount || settlement?.gross_amount || 0);

  const selectedPayments = payments.filter(p => selectedIds.includes(p.financial_transaction_id));
  const selectedSum = selectedPayments.reduce((acc, p) => acc + parseFloat(p.remaining_amount || p.expected_amount || 0), 0);
  const variance = parseFloat((unmatchedTarget - selectedSum).toFixed(2));
  const hasVariance = Math.abs(variance) > 0.01;

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredPayments.map(p => p.financial_transaction_id));
    } else {
      setSelectedIds([]);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.order_number || '').toLowerCase().includes(term) ||
      (p.customer_name || '').toLowerCase().includes(term) ||
      (p.customer_phone || '').includes(term)
    );
  });

  const handleConfirmMatch = async () => {
    if (selectedIds.length === 0) {
      notify?.('Please select at least one POS order to match', 'warning');
      return;
    }

    if (hasVariance && !varianceReason) {
      notify?.('Please select a reason for the discrepancy / variance', 'error');
      return;
    }

    setMatching(true);
    try {
      const matches = selectedPayments.map(p => ({
        financial_transaction_id: p.financial_transaction_id,
        expected_amount: parseFloat(p.remaining_amount || p.expected_amount || 0),
        settled_amount: parseFloat(p.remaining_amount || p.expected_amount || 0),
        variance_reason: hasVariance ? varianceReason : null
      }));

      const res = await apiFetch('/api/payment-reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: settlement.id,
          matches,
          varianceReason: hasVariance ? varianceReason : null,
          notes: notes || null
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to match settlement.');

      notify?.(`Successfully matched ${matches.length} payment(s)!`, 'success');
      onSuccess?.(json.data);
      onClose();
    } catch (err) {
      console.error('Match error:', err);
      notify?.(err.message || 'Error matching settlement', 'error');
    } finally {
      setMatching(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ArrowRightLeft size={24} style={{ color: '#4f46e5' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Match POS Orders to Settlement #{settlement?.settlement_number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select invoices settled by this bank/gateway transaction
            </Typography>
          </Box>
        </Box>
        <Chip
          label={(settlement?.payment_mode || 'UPI').toUpperCase()}
          color="primary"
          size="small"
          sx={{ fontWeight: 800 }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Settlement Banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Target Settlement Balance
            </Typography>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
              ₹{unmatchedTarget.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Date: {settlement?.settlement_date} • Ref: {settlement?.reference_number || 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Selected Orders Sum
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: hasVariance ? 'warning.main' : 'success.main' }}>
              ₹{selectedSum.toFixed(2)} ({selectedIds.length} orders)
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: hasVariance ? 'error.main' : 'success.main' }}>
              {variance > 0 ? `Short by ₹${variance.toFixed(2)}` : (variance < 0 ? `Over by ₹${Math.abs(variance).toFixed(2)}` : 'Exact Match (₹0.00 Difference)')}
            </Typography>
          </Box>
        </Paper>

        {/* Variance Warning & Reason Input */}
        {hasVariance && (
          <Alert severity="warning" icon={<AlertTriangle size={20} />} sx={{ mb: 2, fontWeight: 600 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Discrepancy of ₹{Math.abs(variance).toFixed(2)} detected between settlement and selected orders.
              </Typography>
              <TextField
                select
                size="small"
                label="Mandatory Discrepancy Reason"
                value={varianceReason}
                onChange={e => setVarianceReason(e.target.value)}
                fullWidth
                sx={{ bgcolor: 'background.paper', mt: 0.5 }}
              >
                {DISCREPANCY_REASONS.map(r => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </TextField>
            </Box>
          </Alert>
        )}

        {/* Search & Orders List */}
        <Box sx={{ mb: 1.5, display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search by Invoice #, Customer Name, Phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Search size={16} style={{ marginRight: 8, color: '#9ca3af' }} />
              }
            }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, borderRadius: 1.5 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredPayments.length}
                    checked={filteredPayments.length > 0 && selectedIds.length === filteredPayments.length}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Sale Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Expected (₹)</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Remaining (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No unreconciled orders found matching this payment mode.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map(p => {
                  const isSelected = selectedIds.includes(p.financial_transaction_id);
                  return (
                    <TableRow
                      key={p.financial_transaction_id}
                      hover
                      onClick={() => toggleSelect(p.financial_transaction_id)}
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {p.order_number}
                      </TableCell>
                      <TableCell variant="caption" color="text.secondary">
                        {p.sale_date ? new Date(p.sale_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.customer_name || 'Walk-in'}
                        </Typography>
                        {p.customer_phone && (
                          <Typography variant="caption" color="text.secondary">{p.customer_phone}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ₹{parseFloat(p.expected_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        ₹{parseFloat(p.remaining_amount || p.expected_amount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2 }}>
          <TextField
            label="Reconciliation Notes (Optional)"
            size="small"
            fullWidth
            placeholder="e.g. Matched with EDC terminal batch closure"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          {selectedIds.length} orders selected • Total: ₹{selectedSum.toFixed(2)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={matching || selectedIds.length === 0}
            onClick={handleConfirmMatch}
            startIcon={<CheckCircle2 size={18} />}
            sx={{ fontWeight: 800 }}
          >
            {matching ? 'Matching...' : `Confirm Match (₹${selectedSum.toFixed(2)})`}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
