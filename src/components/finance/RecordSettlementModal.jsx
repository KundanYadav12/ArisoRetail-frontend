import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, TextField, MenuItem,
  Grid, Paper, Divider, FormControlLabel, Checkbox
} from '@mui/material';
import { Landmark, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function RecordSettlementModal({
  open,
  onClose,
  onSuccess,
  accounts = [],
  paymentModes = ['upi', 'card', 'bank_transfer', 'online', 'wallet']
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    account_id: '',
    payment_mode: 'upi',
    settlement_date: getISTDateString(),
    gross_amount: '',
    fee_amount: '0',
    tax_on_fee: '0',
    reference_number: '',
    notes: '',
    auto_match: true
  });

  useEffect(() => {
    if (open) {
      const defaultAcc = accounts.find(a => a.is_default || a.account_type === 'bank' || a.account_type === 'current') || accounts[0];
      setFormData({
        account_id: defaultAcc?.id || '',
        payment_mode: 'upi',
        settlement_date: getISTDateString(),
        gross_amount: '',
        fee_amount: '0',
        tax_on_fee: '0',
        reference_number: '',
        notes: '',
        auto_match: true
      });
    }
  }, [open, accounts]);

  const gross = parseFloat(formData.gross_amount || 0);
  const fee = parseFloat(formData.fee_amount || 0);
  const tax = parseFloat(formData.tax_on_fee || 0);
  const net = Math.max(0, parseFloat((gross - fee - tax).toFixed(2)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.account_id) {
      notify?.('Please select a financial / bank account', 'error');
      return;
    }
    if (!formData.gross_amount || parseFloat(formData.gross_amount) <= 0) {
      notify?.('Please enter a valid gross settlement amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/payment-reconciliation/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: parseInt(formData.account_id, 10),
          payment_mode: formData.payment_mode,
          settlement_date: formData.settlement_date,
          gross_amount: gross,
          fee_amount: fee,
          tax_on_fee: tax,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
          auto_match: formData.auto_match
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to record settlement.');

      notify?.(`Settlement #${json.data.settlement_number} recorded successfully`, 'success');
      onSuccess?.(json.data);
      onClose();
    } catch (err) {
      console.error('Record settlement error:', err);
      notify?.(err.message || 'Error recording settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Landmark size={24} style={{ color: '#4f46e5' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Record Settlement Batch</Typography>
            <Typography variant="caption" color="text.secondary">Enter bank deposit / payment gateway payout</Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          {/* Summary Box */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              bgcolor: 'action.hover',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Net Deposited in Bank
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                ₹{net.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Gross: ₹{gross.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                Fees & Tax: -₹{(fee + tax).toFixed(2)}
              </Typography>
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField
                select
                label="Deposit Bank / Financial Account"
                fullWidth
                size="small"
                value={formData.account_id}
                onChange={e => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                required
              >
                {accounts.map(a => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.account_name} {a.bank_name ? `(${a.bank_name})` : ''} - ₹{parseFloat(a.current_balance || 0).toFixed(2)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Payment Mode"
                sx={{ minWidth: 150 }}
                size="small"
                value={formData.payment_mode}
                onChange={e => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                required
              >
                {paymentModes.map(m => (
                  <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField
                type="date"
                label="Settlement Date"
                size="small"
                fullWidth
                value={formData.settlement_date}
                onChange={e => setFormData(prev => ({ ...prev, settlement_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />

              <TextField
                label="UTR / Settlement Reference"
                size="small"
                fullWidth
                placeholder="e.g. UTR12345678 or PAYOUT-99"
                value={formData.reference_number}
                onChange={e => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="number"
                label="Gross Amount (₹)"
                size="small"
                fullWidth
                value={formData.gross_amount}
                onChange={e => setFormData(prev => ({ ...prev, gross_amount: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                required
              />

              <TextField
                type="number"
                label="MDR / Gateway Fee (₹)"
                size="small"
                fullWidth
                value={formData.fee_amount}
                onChange={e => setFormData(prev => ({ ...prev, fee_amount: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />

              <TextField
                type="number"
                label="GST on Fee (₹)"
                size="small"
                fullWidth
                value={formData.tax_on_fee}
                onChange={e => setFormData(prev => ({ ...prev, tax_on_fee: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            </Box>

            <TextField
              label="Settlement Notes / Remarks"
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="e.g. Batch settlement for weekend card & UPI transactions"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.auto_match}
                  onChange={e => setFormData(prev => ({ ...prev, auto_match: e.target.checked }))}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Automatically match unambiguous POS orders by UTR / amount
                </Typography>
              }
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={<ArrowRightLeft size={18} />}
            sx={{ fontWeight: 800 }}
          >
            {loading ? 'Recording...' : 'Record Settlement'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
