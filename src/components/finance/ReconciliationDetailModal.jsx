import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, IconButton, Alert
} from '@mui/material';
import { Landmark, CheckCircle2, RotateCcw, X, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function ReconciliationDetailModal({
  open,
  onClose,
  settlement,
  onUpdated
}) {
  const notify = useNotify();
  const [unmatchingId, setUnmatchingId] = useState(null);

  if (!settlement) return null;

  const handleUnmatch = async (itemId) => {
    if (!window.confirm('Are you sure you want to unmatch this payment from the settlement? The order will be restored to unreconciled state.')) {
      return;
    }

    setUnmatchingId(itemId);
    try {
      const res = await apiFetch(`/api/payment-reconciliation/unmatch/${itemId}`, {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to unmatch.');

      notify?.('Payment unmatched successfully', 'success');
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('Unmatch error:', err);
      notify?.(err.message || 'Error unmatching item', 'error');
    } finally {
      setUnmatchingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SETTLED':
      case 'MATCHED': return 'success';
      case 'PARTIALLY_MATCHED': return 'warning';
      case 'DISCREPANCY': return 'error';
      case 'UNMATCHED': return 'default';
      default: return 'default';
    }
  };

  const items = settlement.items || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Landmark size={24} style={{ color: '#4f46e5' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Settlement Batch #{settlement.settlement_number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bank / Gateway Payout Audit Record
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={settlement.status}
            color={getStatusColor(settlement.status)}
            size="small"
            sx={{ fontWeight: 800 }}
          />
          <IconButton onClick={onClose} size="small"><X size={20} /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Settlement Metrics */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PAYMENT MODE</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>{(settlement.payment_mode || '').toUpperCase()}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DEPOSIT ACCOUNT</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>{settlement.account_name || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>SETTLEMENT DATE</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>{settlement.settlement_date}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>UTR / REFERENCE</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>{settlement.reference_number || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>GROSS AMOUNT</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>₹{parseFloat(settlement.gross_amount || 0).toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>FEES & TAX</Typography>
              <Typography variant="h6" color="error.main" sx={{ fontWeight: 800 }}>
                -₹{(parseFloat(settlement.fee_amount || 0) + parseFloat(settlement.tax_on_fee || 0)).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>NET SETTLEMENT</Typography>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
                ₹{parseFloat(settlement.net_amount || 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>UNMATCHED BALANCE</Typography>
              <Typography variant="h6" color="warning.main" sx={{ fontWeight: 800 }}>
                ₹{parseFloat(settlement.unmatched_amount || 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Matched Orders Breakdown */}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Matched POS Orders ({items.length})
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 300 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Sale Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Expected (₹)</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Settled (₹)</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Match Type</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No POS orders matched yet. Status is UNMATCHED.
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{item.order_number}</TableCell>
                    <TableCell variant="caption" color="text.secondary">
                      {item.sale_date ? new Date(item.sale_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{item.party_name || 'Walk-in'}</TableCell>
                    <TableCell align="right">₹{parseFloat(item.expected_amount || 0).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                      ₹{parseFloat(item.settled_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip label={item.match_type} size="small" sx={{ fontSize: '0.7rem' }} />
                      {item.variance_reason && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', fontWeight: 600 }}>
                          Reason: {item.variance_reason}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={unmatchingId === item.id}
                        onClick={() => handleUnmatch(item.id)}
                        startIcon={<RotateCcw size={14} />}
                        sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Unmatch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {settlement.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>NOTES</Typography>
            <Typography variant="body2">{settlement.notes}</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
