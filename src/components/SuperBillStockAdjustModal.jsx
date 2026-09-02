import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, IconButton, Chip
} from '@mui/material';
import { apiFetch } from '../utils/api';

export default function SuperBillStockAdjustModal({ open, item, onClose, onSuccess }) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const handleAdjust = async (type) => {
    if (!qty || isNaN(parseFloat(qty)) || parseFloat(qty) <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/superbill/stock-adjust', {
        method: 'POST',
        body: {
          item_id: item.id,
          adjustment_type: type,
          quantity: parseFloat(qty),
          reason: reason.trim() || `Manual Stock ${type.toUpperCase()}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock.');

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        Stock In / Stock Out Quick Panel
      </DialogTitle>

      <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>{item.name}</Typography>
          <Chip label={`Unit: ${item.base_unit || item.unit || 'PCS'}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 1 }}>
          <IconButton
            color="error"
            onClick={() => setQty(Math.max(0.5, parseFloat(qty || 1) - 1))}
            sx={{ border: '2px solid', borderColor: 'error.main', width: 44, height: 44 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 900 }}>−</Typography>
          </IconButton>

          <TextField
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputProps={{ style: { textAlign: 'center', fontSize: 22, fontWeight: 900 } }}
            sx={{ width: 120 }}
          />

          <IconButton
            color="success"
            onClick={() => setQty(parseFloat(qty || 0) + 1)}
            sx={{ border: '2px solid', borderColor: 'success.main', width: 44, height: 44 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 900 }}>+</Typography>
          </IconButton>
        </Box>

        <TextField
          label="Reason / Note (Optional)"
          size="small"
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Received new stock / Damaged"
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0, display: 'flex', gap: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          color="success"
          disabled={loading}
          onClick={() => handleAdjust('in')}
          sx={{ fontWeight: 800, py: 1.2 }}
        >
          ↓ Stock In (+{qty})
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="error"
          disabled={loading}
          onClick={() => handleAdjust('out')}
          sx={{ fontWeight: 800, py: 1.2 }}
        >
          ↑ Stock Out (-{qty})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
