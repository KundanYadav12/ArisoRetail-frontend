import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Chip, Paper, IconButton, FormControlLabel, Checkbox,
  Grid, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { apiFetch, createOrder } from '../utils/api';
import { calculateDocumentTax } from '../utils/gstCalculator';

export default function SuperBillCartSummary({
  open,
  cart = [],
  onUpdateCart,
  onClose,
  user,
  token,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  paymentMode,
  setPaymentMode,
  taxType,
  setTaxType,
  receiptSettings,
  setReceiptSettings
}) {
  const [loading, setLoading] = useState(false);
  const [successBill, setSuccessBill] = useState(null);
  const [notes, setNotes] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);

  // 1. Math matching POS.jsx exactly via central GST calculator
  const subtotal = cart.reduce((acc, item) => acc + parseFloat(item.total_price || 0), 0);
  const numDiscVal = parseFloat(discountValue || 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (Math.min(numDiscVal, 100) / 100);
  } else {
    discountAmount = Math.min(numDiscVal, subtotal);
  }

  const isGstEnabled = receiptSettings ? (receiptSettings.gst_enabled === 1 || receiptSettings.gst_enabled === true || receiptSettings.gst_enabled === 'true') : true;
  const gstMode = receiptSettings?.gst_mode || 'excluded';
  const isComposition = receiptSettings?.gst_registration_type === 'composition';

  const docTax = calculateDocumentTax({
    items: cart.map(item => ({
      ...item,
      price: parseFloat(item.price || 0),
      quantity: item.is_weight_based ? (parseFloat(item.item_weight) || 1) : (parseFloat(item.quantity) || 1),
      gst_rate: isGstEnabled ? (parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5)) : 0,
      is_tax_exempt: Boolean(item.is_tax_exempt),
      hsn_code: item.hsn_code || item.hsnCode || null
    })),
    orderDiscountType: discountType,
    orderDiscountValue: numDiscVal,
    gstMode,
    taxType,
    additionalCharges: 0,
    isComposition,
    storeStateCode: receiptSettings?.state_code || '27'
  });

  const cartWithTax = docTax.items.map(item => ({
    ...item,
    discount_amount: item.discountAmount,
    tax_amount: item.totalTax
  }));

  const taxAmount = docTax.totalTax;
  const taxableAmount = docTax.taxableAmount;
  const grandTotal = docTax.grandTotal;
  const roundOff = docTax.roundOff;
  const taxInvoiceType = docTax.taxInvoiceType;

  // Qty Increment/Decrement
  const handleIncrement = (idx) => {
    onUpdateCart((prev) => {
      const updated = [...prev];
      const newQty = (updated[idx].quantity || 1) + 1;
      updated[idx] = {
        ...updated[idx],
        quantity: newQty,
        total_price: (newQty * parseFloat(updated[idx].price)).toFixed(2)
      };
      return updated;
    });
  };

  const handleDecrement = (idx) => {
    onUpdateCart((prev) => {
      const updated = [...prev];
      const newQty = (updated[idx].quantity || 1) - 1;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx] = {
        ...updated[idx],
        quantity: newQty,
        total_price: (newQty * parseFloat(updated[idx].price)).toFixed(2)
      };
      return updated;
    });
  };

  const handlePresetDiscountClick = (pct) => {
    setDiscountType('percentage');
    setDiscountValue(pct.toString());
  };

  const handleCustomDiscountChange = (val) => {
    setDiscountValue(val);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty.');

    setLoading(true);
    try {
      const activeToken = token || localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('ariso_retail_token');

      // Construct identical orderPayload for POS checkout compatibility
      const orderPayload = {
        items: cartWithTax.map((i) => ({
          menu_item_id: i.product_id || i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity || 1,
          item_weight: null,
          weight_unit: i.unit || 'pcs',
          is_weight_based: 0,
          total_price: i.total_price || (parseFloat(i.price) * (parseFloat(i.quantity) || 1)),
          gst_rate: i.gstRate !== undefined ? i.gstRate : (parseFloat(i.gst_rate) || 0),
          hsn_code: i.hsnCode || i.hsn_code || null,
          taxable_amount: i.taxableAmount !== undefined ? i.taxableAmount : 0,
          cgst_rate: i.cgstRate || 0,
          cgst_amount: i.cgstAmount || 0,
          sgst_rate: i.sgstRate || 0,
          sgst_amount: i.sgstAmount || 0,
          igst_rate: i.igstRate || 0,
          igst_amount: i.igstAmount || 0,
          tax_amount: parseFloat(i.totalTax !== undefined ? i.totalTax : (i.tax_amount || 0)).toFixed(2),
          discount_amount: parseFloat(i.discountAmount !== undefined ? i.discountAmount : (i.discount_amount || 0)).toFixed(2),
          notes: i.notes || ''
        })),
        subtotal: docTax.subtotal.toFixed(2),
        discount_amount: docTax.discountAmount.toFixed(2),
        taxable_amount: docTax.taxableAmount.toFixed(2),
        cgst_amount: docTax.cgstAmount.toFixed(2),
        sgst_amount: docTax.sgstAmount.toFixed(2),
        igst_amount: docTax.igstAmount.toFixed(2),
        tax_amount: docTax.totalTax.toFixed(2),
        round_off: docTax.roundOff.toFixed(2),
        tax_invoice_type: docTax.taxInvoiceType,
        total_amount: docTax.grandTotal.toFixed(2),
        payment_mode: paymentMode,
        cashier_name: user?.name || 'SuperBill Cashier',
        customer_name: 'Walk-in Customer',
        customer_phone: '',
        customer_address: '',
        tax_type: docTax.taxType || taxType,
        notes: notes
      };

      const data = await createOrder(activeToken, orderPayload);

      setSuccessBill({
        ...orderPayload,
        orderNumber: data.orderNumber || data.orderId,
        id: data.orderId,
        store_header: {
          name: receiptSettings?.restaurant_name || user?.restaurant_name || 'Ariso Retail Store',
          phone: receiptSettings?.phone || '',
          address: receiptSettings?.address || '',
          gst: receiptSettings?.gst_number || ''
        }
      });

      if (onUpdateCart) onUpdateCart([]);
      setDiscountValue('0');
      setNotes('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const presets = [0, 2, 5, 10, 15, 25];

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
              ₹{parseFloat(successBill.total_amount).toFixed(2)}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Receipt No. #{successBill.orderNumber} • Mode: {successBill.payment_mode.toUpperCase()}
            </Typography>

            {/* Simulated ESC/POS Thermal Receipt Paper */}
            <Paper elevation={0} sx={{ p: 2, my: 3, bgcolor: '#fffbeb', border: '1px dashed #d97706', fontFamily: 'monospace', textAlign: 'left' }}>
              <Typography variant="subtitle2" align="center" sx={{ fontWeight: 800 }}>{successBill.store_header?.name}</Typography>
              {successBill.store_header?.address && <Typography variant="caption" align="center" display="block">{successBill.store_header?.address}</Typography>}
              {successBill.store_header?.phone && <Typography variant="caption" align="center" display="block">Ph: {successBill.store_header?.phone}</Typography>}
              {successBill.store_header?.gst && <Typography variant="caption" align="center" display="block">GSTIN: {successBill.store_header?.gst}</Typography>}
              <Typography variant="caption" display="block" sx={{ my: 1 }}>--------------------------------</Typography>

              {successBill.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">{item.name} x{item.quantity}</Typography>
                  <Typography variant="caption">₹{parseFloat(item.total_price).toFixed(2)}</Typography>
                </Box>
              ))}

              <Typography variant="caption" display="block" sx={{ my: 1 }}>--------------------------------</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>Subtotal:</Typography>
                <Typography variant="caption">₹{parseFloat(successBill.subtotal).toFixed(2)}</Typography>
              </Box>
              {parseFloat(successBill.discount_amount) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>Discount:</Typography>
                  <Typography variant="caption">-₹{parseFloat(successBill.discount_amount).toFixed(2)}</Typography>
                </Box>
              )}
              {isGstEnabled && parseFloat(successBill.tax_amount) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>GST Tax ({gstMode}):</Typography>
                  <Typography variant="caption">₹{parseFloat(successBill.tax_amount).toFixed(2)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>TOTAL:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>₹{parseFloat(successBill.total_amount).toFixed(2)}</Typography>
              </Box>
              <Typography variant="caption" display="block" sx={{ my: 1 }}>--------------------------------</Typography>
              <Typography variant="caption" align="center" display="block">Thanks for visiting, Powered by SuperBill</Typography>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button fullWidth variant="outlined" onClick={() => {
                  if (successBill.id) {
                    window.open(`/api/orders/${successBill.id}/pdf?token=${activeToken}`, '_blank');
                  } else {
                    alert('PDF not available (Missing Order ID)');
                  }
                }}>
                  📄 Download PDF
                </Button>
                <Button fullWidth variant="outlined" onClick={() => window.print()}>
                  🖨️ Print Receipt
                </Button>
              </Box>
              <Button fullWidth variant="contained" onClick={() => { setSuccessBill(null); onClose(); }}>
                Done
              </Button>
            </Box>
          </Box>
        ) : (
          /* CART BREAKDOWN FORM */
          <>
            {/* Line Items List with - Qty + Stepper Controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
              {cart.map((item, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  onClick={() => setSelectedIdx(idx === selectedIdx ? null : idx)}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderColor: selectedIdx === idx ? '#6366f1' : undefined,
                    bgcolor: selectedIdx === idx ? 'rgba(99,102,241,0.07)' : undefined,
                    boxShadow: selectedIdx === idx ? '0 0 0 2px rgba(99,102,241,0.18)' : undefined,
                    '&:hover': {
                      bgcolor: selectedIdx === idx ? 'rgba(99,102,241,0.09)' : 'rgba(0,0,0,0.03)',
                      borderColor: selectedIdx === idx ? '#6366f1' : '#94a3b8'
                    }
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedIdx === idx ? '#6366f1' : undefined }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{parseFloat(item.price).toFixed(2)} / per {item.unit || 'pcs'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 2, overflow: 'hidden' }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDecrement(idx); }} sx={{ borderRadius: 0, p: 0.5, px: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>−</Typography>
                      </IconButton>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 1 }}>
                        {item.quantity}
                      </Typography>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleIncrement(idx); }} sx={{ borderRadius: 0, p: 0.5, px: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>+</Typography>
                      </IconButton>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: selectedIdx === idx ? '#6366f1' : 'primary.main', minWidth: 70, textAlign: 'right' }}>
                      ₹{parseFloat(item.total_price || (item.price * item.quantity)).toFixed(2)}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* Calculations & Quick Discounts */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Sub Total</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>₹{subtotal.toFixed(2)}</Typography>
              </Box>

              {/* Place of Supply (GST Type) */}
              <Box sx={{ mb: 1.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Place of Supply (GST Type)</InputLabel>
                  <Select
                    value={taxType}
                    label="Place of Supply (GST Type)"
                    onChange={(e) => setTaxType(e.target.value)}
                  >
                    <MenuItem value="intra">Intra-State (CGST + SGST split)</MenuItem>
                    <MenuItem value="inter">Inter-State (IGST)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                QUICK DISCOUNT (%)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                {presets.map((pct) => (
                  <Chip
                    key={pct}
                    label={`${pct}%`}
                    color={discountType === 'percentage' && parseFloat(discountValue) === pct ? 'primary' : 'default'}
                    onClick={() => handlePresetDiscountClick(pct)}
                    sx={{ fontWeight: 800 }}
                  />
                ))}
              </Box>

              {/* Numeric Manual Discount Input */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label={`Discount (${discountType === 'percentage' ? '%' : '₹'})`}
                  value={discountValue === '0' ? '' : discountValue}
                  onChange={(e) => handleCustomDiscountChange(e.target.value)}
                  type="number"
                  placeholder="Enter manual discount"
                  fullWidth
                />
                <Box sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 1 }}>
                  <Button
                    size="small"
                    variant={discountType === 'percentage' ? 'contained' : 'text'}
                    onClick={() => setDiscountType('percentage')}
                    sx={{ minWidth: 40, p: 0.5 }}
                  >
                    %
                  </Button>
                  <Button
                    size="small"
                    variant={discountType === 'flat' ? 'contained' : 'text'}
                    onClick={() => setDiscountType('flat')}
                    sx={{ minWidth: 40, p: 0.5 }}
                  >
                    ₹
                  </Button>
                </Box>
              </Box>

              {/* Proportional GST calculations breakdown */}
              {isGstEnabled && taxAmount > 0 && (
                <Box sx={{ py: 1, borderTop: '1px dashed #cbd5e1', mb: 1 }}>
                  {taxType === 'inter' ? (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">IGST Tax</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{taxAmount.toFixed(2)}</Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">CGST Tax</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{(taxAmount / 2).toFixed(2)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">SGST Tax</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{(taxAmount / 2).toFixed(2)}</Typography>
                      </Box>
                    </>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Amount</Typography>
                <Typography variant="h5" color="success.main" sx={{ fontWeight: 900 }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            {/* Payment Mode Selection — dynamically matched POS.jsx */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                PAYMENT MODE
              </Typography>
              <Grid container spacing={1}>
                {[
                  { value: 'cash', label: 'Cash', icon: '💵' },
                  { value: 'upi', label: 'UPI', icon: '📱' },
                  { value: 'card', label: 'Card', icon: '💳' },
                  { value: 'due', label: 'Due', icon: '📝' }
                ].map((mode) => (
                  <Grid item xs={3} key={mode.value}>
                    <Button
                      fullWidth
                      variant={paymentMode === mode.value ? 'contained' : 'outlined'}
                      onClick={() => setPaymentMode(mode.value)}
                      sx={{ fontWeight: 800, py: 1, textTransform: 'none', minWidth: 0, fontSize: 13 }}
                    >
                      {mode.icon} {mode.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <TextField
              label="Add Notes"
              size="small"
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Walk-in transaction details"
            />
          </>
        )}
      </DialogContent>

      {!successBill && (
        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            size="large"
            disabled={loading || cart.length === 0}
            onClick={handleCheckout}
            sx={{ fontWeight: 900, py: 1.5, fontSize: 18 }}
          >
            {loading ? 'Processing...' : `Save & Print Bill (₹${grandTotal.toFixed(2)})`}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
