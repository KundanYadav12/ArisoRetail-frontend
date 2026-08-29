import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Chip, Paper, IconButton, FormControlLabel, Checkbox
} from '@mui/material';

export default function SuperBillCartSummary({ open, cart = [], onUpdateCart, onClose }) {
  const [discountPct, setDiscountPct] = useState(0);
  const [customDiscount, setCustomDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // cash | upi
  const [markFullyPaid, setMarkFullyPaid] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [successBill, setSuccessBill] = useState(null);

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
  const discountAmount = (subtotal * discountPct) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleApplyCustomDiscount = () => {
    const val = parseFloat(customDiscount);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setDiscountPct(val);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty.');

    setLoading(true);
    try {
      const token = localStorage.getItem('ariso_retail_token') || sessionStorage.getItem('ariso_retail_token');
      const res = await fetch('/api/superbill/bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart,
          discount_percentage: discountPct,
          payment_mode: paymentMode,
          mark_fully_paid: markFullyPaid,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete bill.');

      setSuccessBill(data);
      if (onUpdateCart) onUpdateCart([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Billing Summary</Typography>
        <Button size="small" onClick={onClose} sx={{ fontWeight: 800 }}>
          + Add More Items
        </Button>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {successBill ? (
          /* PAYMENT SUCCESS & THERMAL RECEIPT VIEW */
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h1" sx={{ color: 'success.main', mb: 1 }}>✅</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.main' }}>
              Payment Successfully Completed
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, my: 1 }}>
              ₹{successBill.total_amount}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Receipt No. #{successBill.receipt_no} • Mode: {successBill.payment_mode.toUpperCase()}
            </Typography>

            {/* Simulated ESC/POS Thermal Receipt Paper */}
            <Paper elevation={0} sx={{ p: 2, my: 3, bgcolor: '#fffbeb', border: '1px dashed #d97706', fontFamily: 'monospace', textAlign: 'left' }}>
              <Typography variant="subtitle2" align="center" sx={{ fontWeight: 800 }}>{successBill.store_header?.name || 'Store'}</Typography>
              <Typography variant="caption" align="center" display="block">{successBill.store_header?.address}</Typography>
              <Typography variant="caption" align="center" display="block">Ph: {successBill.store_header?.phone}</Typography>
              <Typography variant="caption" align="center" display="block">GSTIN: {successBill.store_header?.gst}</Typography>
              <Typography variant="caption" display="block" sx={{ my: 1 }}>--------------------------------</Typography>

              {successBill.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">{item.name} x{item.quantity}</Typography>
                  <Typography variant="caption">₹{parseFloat(item.total).toFixed(2)}</Typography>
                </Box>
              ))}

              <Typography variant="caption" display="block" sx={{ my: 1 }}>--------------------------------</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>Subtotal:</Typography>
                <Typography variant="caption">₹{successBill.subtotal}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>Discount ({successBill.discount_percentage}%):</Typography>
                <Typography variant="caption">-₹{successBill.discount_amount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>TOTAL:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>₹{successBill.total_amount}</Typography>
              </Box>
              <Typography variant="caption" display="block" sx={{ my: 1 }}>--------------------------------</Typography>
              <Typography variant="caption" align="center" display="block">Thanks for visiting, Powered by SuperBill</Typography>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => window.print()}>
                🖨️ Print Receipt
              </Button>
              <Button fullWidth variant="contained" onClick={() => { setSuccessBill(null); onClose(); }}>
                Done
              </Button>
            </Box>
          </Box>
        ) : (
          /* CART BREAKDOWN FORM */
          <>
            {/* Line Items List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 200, overflowY: 'auto' }}>
              {cart.map((item, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{parseFloat(item.price).toFixed(2)} x {item.quantity} {item.base_unit || item.unit || 'PCS'}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* Calculations & Quick Discounts */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Sub Total</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>₹{subtotal.toFixed(2)}</Typography>
              </Box>

              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                QUICK DISCOUNT (%)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                {[0, 2, 5, 10, 15, 25].map((pct) => (
                  <Chip
                    key={pct}
                    label={`${pct}%`}
                    color={discountPct === pct ? 'primary' : 'default'}
                    onClick={() => setDiscountPct(pct)}
                    sx={{ fontWeight: 800 }}
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Custom %"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                  type="number"
                />
                <Button size="small" variant="outlined" onClick={handleApplyCustomDiscount}>
                  Apply
                </Button>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Amount</Typography>
                <Typography variant="h5" color="success.main" sx={{ fontWeight: 900 }}>
                  ₹{totalAmount.toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            {/* Payment Mode Selection */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                PAYMENT MODE
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  fullWidth
                  variant={paymentMode === 'cash' ? 'contained' : 'outlined'}
                  onClick={() => setPaymentMode('cash')}
                  sx={{ fontWeight: 800, py: 1.2 }}
                >
                  💵 Cash
                </Button>
                <Button
                  fullWidth
                  variant={paymentMode === 'upi' ? 'contained' : 'outlined'}
                  onClick={() => setPaymentMode('upi')}
                  sx={{ fontWeight: 800, py: 1.2 }}
                >
                  📱 UPI
                </Button>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={markFullyPaid}
                  onChange={(e) => setMarkFullyPaid(e.target.checked)}
                  color="success"
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Mark As Fully Paid (Balance Due: ₹0.00)</Typography>}
            />

            <TextField
              label="Add Notes"
              size="small"
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer requested extra bag"
            />
          </>
        )}
      </DialogContent>

      {!successBill && (
        <DialogActions sx={{ p: 2 }}>
          <Button fullWidth variant="contained" color="success" size="large" disabled={loading || cart.length === 0} onClick={handleCheckout} sx={{ fontWeight: 900, py: 1.5, fontSize: 18 }}>
            Save & Print Bill (₹{totalAmount.toFixed(2)})
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
