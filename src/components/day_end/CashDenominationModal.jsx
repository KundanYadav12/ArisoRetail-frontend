import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, TextField, Divider, Paper, Grid
} from '@mui/material';
import { Calculator, CheckCircle2, RotateCcw } from 'lucide-react';

const DENOMINATIONS = [
  { key: 'c500', value: 500, label: '₹500 Note' },
  { key: 'c200', value: 200, label: '₹200 Note' },
  { key: 'c100', value: 100, label: '₹100 Note' },
  { key: 'c50',  value: 50,  label: '₹50 Note' },
  { key: 'c20',  value: 20,  label: '₹20 Note' },
  { key: 'c10',  value: 10,  label: '₹10 Note' },
  { key: 'c5',   value: 5,   label: '₹5 Note / Coin' },
  { key: 'c2',   value: 2,   label: '₹2 Coin' },
  { key: 'c1',   value: 1,   label: '₹1 Coin' }
];

export default function CashDenominationModal({
  open,
  onClose,
  onApply,
  initialCounts = null,
  expectedCash = 0
}) {
  const [counts, setCounts] = useState({
    c500: 0,
    c200: 0,
    c100: 0,
    c50: 0,
    c20: 0,
    c10: 0,
    c5: 0,
    c2: 0,
    c1: 0,
    coins_total: 0
  });

  useEffect(() => {
    if (open) {
      if (initialCounts && typeof initialCounts === 'object') {
        setCounts({
          c500: parseInt(initialCounts.c500 || 0, 10),
          c200: parseInt(initialCounts.c200 || 0, 10),
          c100: parseInt(initialCounts.c100 || 0, 10),
          c50: parseInt(initialCounts.c50 || 0, 10),
          c20: parseInt(initialCounts.c20 || 0, 10),
          c10: parseInt(initialCounts.c10 || 0, 10),
          c5: parseInt(initialCounts.c5 || 0, 10),
          c2: parseInt(initialCounts.c2 || 0, 10),
          c1: parseInt(initialCounts.c1 || 0, 10),
          coins_total: parseFloat(initialCounts.coins_total || 0)
        });
      } else {
        handleReset();
      }
    }
  }, [open, initialCounts]);

  const handleCountChange = (key, val) => {
    const parsed = parseInt(val, 10);
    setCounts(prev => ({
      ...prev,
      [key]: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const handleCoinsChange = (val) => {
    const parsed = parseFloat(val);
    setCounts(prev => ({
      ...prev,
      coins_total: isNaN(parsed) || parsed < 0 ? 0 : parsed
    }));
  };

  const handleReset = () => {
    setCounts({
      c500: 0,
      c200: 0,
      c100: 0,
      c50: 0,
      c20: 0,
      c10: 0,
      c5: 0,
      c2: 0,
      c1: 0,
      coins_total: 0
    });
  };

  // Calculate grand total physical cash
  const totalPhysical = DENOMINATIONS.reduce((acc, d) => {
    return acc + ((counts[d.key] || 0) * d.value);
  }, 0) + (counts.coins_total || 0);

  const variance = totalPhysical - expectedCash;

  const handleConfirm = () => {
    onApply({
      counts,
      total: totalPhysical
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Calculator size={24} style={{ color: '#4f46e5' }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Physical Cash Denomination Counter</Typography>
          <Typography variant="caption" color="text.secondary">Enter physical cash counts in drawer</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Total Summary Banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            bgcolor: 'action.hover',
            borderRadius: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Physical Cash Count
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
              ₹{totalPhysical.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
              Expected: ₹{expectedCash.toFixed(2)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: variance < 0 ? 'error.main' : (variance > 0 ? 'success.main' : 'text.secondary')
              }}
            >
              Variance: {variance < 0 ? `-₹${Math.abs(variance).toFixed(2)} (Short)` : (variance > 0 ? `+₹${variance.toFixed(2)} (Excess)` : '₹0.00 (Balanced)')}
            </Typography>
          </Box>
        </Paper>

        {/* Denominations Grid */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {DENOMINATIONS.map(d => {
            const qty = counts[d.key] || 0;
            const subtotal = qty * d.value;
            return (
              <Box
                key={d.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 1,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: qty > 0 ? 'action.selected' : 'background.paper'
                }}
              >
                <Typography sx={{ fontWeight: 700, width: 140, fontSize: '0.9rem' }}>
                  {d.label}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">×</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={qty || ''}
                    placeholder="0"
                    onChange={e => handleCountChange(d.key, e.target.value)}
                    slotProps={{
                      htmlInput: { min: 0, style: { textAlign: 'center', fontWeight: 'bold' } }
                    }}
                    sx={{ width: 90 }}
                  />
                </Box>

                <Typography sx={{ fontWeight: 800, width: 110, textAlign: 'right', fontSize: '0.95rem' }}>
                  = ₹{subtotal.toFixed(2)}
                </Typography>
              </Box>
            );
          })}

          {/* Lump sum coins */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              p: 1,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography sx={{ fontWeight: 700, width: 140, fontSize: '0.9rem' }}>
              Other Loose Coins
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">₹</Typography>
              <TextField
                size="small"
                type="number"
                value={counts.coins_total || ''}
                placeholder="0.00"
                onChange={e => handleCoinsChange(e.target.value)}
                slotProps={{
                  htmlInput: { min: 0, step: '0.5', style: { textAlign: 'center', fontWeight: 'bold' } }
                }}
                sx={{ width: 90 }}
              />
            </Box>
            <Typography sx={{ fontWeight: 800, width: 110, textAlign: 'right', fontSize: '0.95rem' }}>
              = ₹{(counts.coins_total || 0).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          startIcon={<RotateCcw size={18} />}
          onClick={handleReset}
          color="inherit"
          sx={{ fontWeight: 700 }}
        >
          Reset All
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircle2 size={18} />}
            onClick={handleConfirm}
            sx={{ fontWeight: 800 }}
          >
            Apply ₹{totalPhysical.toFixed(2)}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
