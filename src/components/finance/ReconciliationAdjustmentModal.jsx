import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, TextField, MenuItem, Alert
} from '@mui/material';
import { ShieldAlert, Plus } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

const ADJUSTMENT_TYPES = [
  { value: 'FEE_DEDUCTION', label: 'Fee Deduction / MDR (Outflow)' },
  { value: 'SHORT_SETTLEMENT', label: 'Short Settlement / Shortfall (Outflow)' },
  { value: 'EXCESS_SETTLEMENT', label: 'Excess Settlement / Extra Inflow (Inflow)' },
  { value: 'ROUNDING_DIFFERENCE', label: 'Rounding Difference' },
  { value: 'CHARGEBACK', label: 'Customer Chargeback / Dispute (Outflow)' },
  { value: 'OTHER', label: 'Other Adjustment' }
];

export default function ReconciliationAdjustmentModal({
  open,
  onClose,
  accounts = [],
  onSuccess
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_id: accounts[0]?.id || '',
    adjustment_type: 'SHORT_SETTLEMENT',
    amount: '',
    reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.account_id) {
      notify?.('Please select an account', 'error');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      notify?.('Please enter a valid adjustment amount', 'error');
      return;
    }
    if (!formData.reason.trim()) {
      notify?.('Please provide an audited reason for the adjustment', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/payment-reconciliation/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: parseInt(formData.account_id, 10),
          adjustment_type: formData.adjustment_type,
          amount: parseFloat(formData.amount),
          reason: formData.reason.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create adjustment.');

      notify?.(`Adjustment #${json.data.adjustment_number} created successfully`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Adjustment error:', err);
      notify?.(err.message || 'Error creating adjustment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <ShieldAlert size={24} style={{ color: '#d97706' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Create Financial Adjustment</Typography>
            <Typography variant="caption" color="text.secondary">Audited ledger adjustment for reconciliation variance</Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Financial / Bank Account"
              size="small"
              fullWidth
              value={formData.account_id}
              onChange={e => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
              required
            >
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_name} ({a.bank_name || a.account_type})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Adjustment Type"
              size="small"
              fullWidth
              value={formData.adjustment_type}
              onChange={e => setFormData(prev => ({ ...prev, adjustment_type: e.target.value }))}
              required
            >
              {ADJUSTMENT_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              type="number"
              label="Adjustment Amount (₹)"
              size="small"
              fullWidth
              value={formData.amount}
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
              required
            />

            <TextField
              label="Mandatory Reason / Justification"
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="e.g. Unreconciled card settlement difference approved by manager"
              value={formData.reason}
              onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="warning"
            disabled={loading}
            startIcon={<Plus size={18} />}
            sx={{ fontWeight: 800 }}
          >
            {loading ? 'Creating...' : 'Create Adjustment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
