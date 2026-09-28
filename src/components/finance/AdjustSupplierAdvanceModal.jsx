import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Paper, TextField, Grid,
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, IconButton, Alert
} from '@mui/material';
import { X, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function AdjustSupplierAdvanceModal({ open, onClose, supplier, onAdvanceAdjusted }) {
  const notify = useNotify();

  const [bills, setBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingBills, setLoadingBills] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const advanceBalance = parseFloat(supplier?.advance_balance || 0);

  useEffect(() => {
    if (open && supplier?.id) {
      setSelectedBillId('');
      setAdjustAmount('');
      setNotes('');
      fetchUnpaidBills();
    }
  }, [open, supplier]);

  const fetchUnpaidBills = async () => {
    setLoadingBills(true);
    try {
      const res = await apiFetch(`/api/inventory/suppliers/${supplier.id}/payables`);
      if (res.ok) {
        const data = await res.json();
        setBills(data.unpaid_bills || []);
        if (data.unpaid_bills?.length > 0) {
          const firstBill = data.unpaid_bills[0];
          setSelectedBillId(firstBill.id);
          const maxPossible = Math.min(advanceBalance, firstBill.outstanding_amount);
          setAdjustAmount(maxPossible > 0 ? maxPossible.toFixed(2) : '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBills(false);
    }
  };

  const selectedBill = bills.find(b => b.id === parseInt(selectedBillId, 10));
  const billDue = selectedBill ? parseFloat(selectedBill.outstanding_amount || 0) : 0;
  const maxAdjustable = Math.min(advanceBalance, billDue);
  const parsedAdjustAmt = parseFloat(adjustAmount) || 0;

  const handleBillSelect = (e) => {
    const bId = e.target.value;
    setSelectedBillId(bId);
    const b = bills.find(x => x.id === parseInt(bId, 10));
    if (b) {
      const maxPossible = Math.min(advanceBalance, b.outstanding_amount);
      setAdjustAmount(maxPossible > 0 ? maxPossible.toFixed(2) : '');
    }
  };

  const handleSubmit = async () => {
    if (!selectedBillId) {
      notify.error('Please select a purchase bill to adjust against.', 'Validation');
      return;
    }
    if (parsedAdjustAmt <= 0) {
      notify.error('Please enter a valid adjustment amount.', 'Validation');
      return;
    }
    if (parsedAdjustAmt > maxAdjustable + 0.01) {
      notify.error(`Adjustment amount cannot exceed ₹${maxAdjustable.toFixed(2)}.`, 'Validation');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/inventory/suppliers/adjust-advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplier.id,
          purchase_bill_id: parseInt(selectedBillId, 10),
          advance_amount: parsedAdjustAmt,
          notes: notes || `Advance offset against bill ${selectedBill?.internal_bill_number}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adjustment failed');

      notify.success(
        `Adjusted ₹${parsedAdjustAmt.toFixed(2)} against bill ${selectedBill?.internal_bill_number}!`,
        'Advance Adjusted'
      );

      if (onAdvanceAdjusted) onAdvanceAdjusted(data.result);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Adjustment Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f0fdf4', color: '#16a34a' }}>
              <ArrowRightLeft size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Adjust Supplier Advance
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {supplier.name} • Available Advance: ₹{advanceBalance.toFixed(2)}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Advance Balance Card */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#86efac' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
            Available Advance Balance
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a' }}>
            ₹{advanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Credit available with this supplier from past excess payments.
          </Typography>
        </Paper>

        {loadingBills ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : bills.length === 0 ? (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            This supplier currently has no outstanding purchase bills to adjust against.
          </Alert>
        ) : (
          <>
            <FormControl fullWidth size="small">
              <InputLabel>Purchase Bill to Settle</InputLabel>
              <Select
                value={selectedBillId}
                label="Purchase Bill to Settle"
                onChange={handleBillSelect}
              >
                {bills.map(b => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.internal_bill_number} (Due: ₹{b.outstanding_amount.toFixed(2)} | Date: {new Date(b.bill_date).toLocaleDateString('en-IN')})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedBill && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Bill Outstanding</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#dc2626' }}>
                      ₹{selectedBill.outstanding_amount.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Max Adjustable</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      ₹{maxAdjustable.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <TextField
              label="Adjustment Amount (₹)"
              type="number"
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
              fullWidth
              size="small"
              required
              slotProps={{ htmlInput: { min: 0.01, max: maxAdjustable, step: 0.01 } }}
              helperText={`Maximum adjustable: ₹${maxAdjustable.toFixed(2)}`}
            />

            <TextField
              label="Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              fullWidth
              size="small"
              placeholder="Optional reference notes"
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={submitting || bills.length === 0 || parsedAdjustAmt <= 0 || parsedAdjustAmt > maxAdjustable}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={16} />}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {submitting ? 'Adjusting...' : `Confirm Offset ₹${parsedAdjustAmt.toFixed(2)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
