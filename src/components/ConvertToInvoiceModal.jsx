import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, IconButton, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Grid, Select, MenuItem, FormControl, InputLabel,
  Divider, Chip, CircularProgress, Alert
} from '@mui/material';
import { X, CheckCircle, FileText, DollarSign, CreditCard, User, Building, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function ConvertToInvoiceModal({
  open,
  onClose,
  salesOrder,
  onConverted
}) {
  const { notify } = useNotify();

  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && salesOrder) {
      setPaymentMode('cash');
      setNotes(`Invoice for Sales Order #${salesOrder.unique_order_number || salesOrder.id}`);

      const orderItems = salesOrder.items || [];
      const initialized = orderItems.map(oi => {
        const ordered = oi.item_weight !== null ? parseFloat(oi.item_weight) : parseFloat(oi.quantity);
        const invoiced = parseFloat(oi.invoiced_qty || 0);
        const pending = Math.max(0, ordered - invoiced);
        const unitPrice = parseFloat(oi.price || oi.unit_price || 0);
        const gstRate = parseFloat(oi.gst_rate || 0);

        return {
          order_item_id: oi.id,
          menu_item_id: oi.menu_item_id,
          name: oi.name || oi.item_name,
          unit: oi.weight_unit || oi.unit || (oi.item_weight !== null ? 'KG' : 'PCS'),
          price: unitPrice,
          gst_rate: gstRate,
          ordered_qty: ordered,
          already_invoiced_qty: invoiced,
          pending_qty: pending,
          invoicing_qty: pending > 0 ? pending : 0,
          discount_amount: parseFloat(oi.discount_amount || 0)
        };
      });
      setItems(initialized);
    }
  }, [open, salesOrder]);

  if (!salesOrder) return null;

  const handleQtyChange = (index, val) => {
    const parsed = parseFloat(val);
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        invoicing_qty: isNaN(parsed) ? '' : parsed
      };
      return copy;
    });
  };

  const handleSetMax = (index) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], invoicing_qty: copy[index].pending_qty };
      return copy;
    });
  };

  // Compute Invoice Summary
  const invoiceSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach(it => {
      const qty = parseFloat(it.invoicing_qty) || 0;
      if (qty <= 0) return;
      const base = it.price * qty;
      const disc = it.ordered_qty > 0 ? (it.discount_amount / it.ordered_qty) * qty : 0;
      const taxable = Math.max(0, base - disc);
      const tax = (taxable * it.gst_rate) / 100;

      subtotal += base;
      totalDiscount += disc;
      totalTax += tax;
    });

    const grandTotal = parseFloat((subtotal - totalDiscount + totalTax).toFixed(2));
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      grandTotal
    };
  }, [items]);

  const handleSubmit = async () => {
    const itemsToInvoice = items.filter(it => parseFloat(it.invoicing_qty) > 0);

    if (itemsToInvoice.length === 0) {
      notify.error('At least one item must have an invoicing quantity > 0.', 'Validation');
      return;
    }

    for (const it of itemsToInvoice) {
      const qty = parseFloat(it.invoicing_qty);
      if (qty > it.pending_qty + 0.001) {
        notify.error(`Cannot invoice ${qty} ${it.unit} of "${it.name}". Maximum pending is ${it.pending_qty}.`, 'Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_data: {
          payment_mode: paymentMode,
          notes: notes.trim() || null
        },
        items: itemsToInvoice.map(it => ({
          order_item_id: it.order_item_id,
          invoicing_qty: parseFloat(it.invoicing_qty)
        }))
      };

      const res = await apiFetch(`/api/orders/${salesOrder.id}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        notify.success(`Invoice #${data.invoiceNumber} (₹${data.grandTotal}) created successfully! Physical stock deducted.`, 'Invoice Generated');
        onConverted && onConverted(data);
        onClose();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to convert order to invoice.', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'An error occurred while converting to invoice.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: '#dcfce7', p: 1, borderRadius: 2, display: 'flex' }}>
            <FileText size={22} color="#15803d" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Convert to Invoice</Typography>
            <Typography variant="caption" color="text.secondary">
              Sales Order #{salesOrder.unique_order_number || salesOrder.id} • Party: {salesOrder.customer_name || 'Customer'}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Information Banner */}
          <Alert severity="info" sx={{ borderRadius: 2, fontWeight: 600 }}>
            Converting will generate a formal Tax Invoice and deduct physical inventory stock. Uninvoiced items remain pending for future invoices.
          </Alert>

          {/* Line Items Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: '4%' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: '32%' }}>Item Description</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: '12%' }}>Unit Price</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '10%' }}>Ordered</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '12%' }}>Invoiced</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '12%' }}>Pending</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: '18%' }}>Invoice Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it, idx) => {
                  const isFullyInvoiced = it.pending_qty <= 0;
                  return (
                    <TableRow key={it.order_item_id} hover sx={{ bgcolor: isFullyInvoiced ? '#f8fafc' : 'inherit' }}>
                      <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{it.name}</Typography>
                        <Typography variant="caption" color="text.secondary">GST: {it.gst_rate}% • Unit: {it.unit}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{it.price.toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{it.ordered_qty} {it.unit}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>{it.already_invoiced_qty} {it.unit}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: it.pending_qty > 0 ? '#d97706' : '#64748b', fontWeight: 700 }}>
                          {it.pending_qty} {it.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {isFullyInvoiced ? (
                          <Chip size="small" label="Fully Invoiced" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ min: 0, max: it.pending_qty, step: 'any' }}
                              value={it.invoicing_qty}
                              onChange={e => handleQtyChange(idx, e.target.value)}
                              sx={{ width: 90 }}
                            />
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleSetMax(idx)}
                              sx={{ minWidth: 36, px: 0.5, fontSize: '0.7rem', fontWeight: 700 }}
                            >
                              Max
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Payment & Summary Grid */}
          <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Mode *</InputLabel>
                  <Select
                    value={paymentMode}
                    label="Payment Mode *"
                    onChange={e => setPaymentMode(e.target.value)}
                  >
                    <MenuItem value="cash">Cash Payment</MenuItem>
                    <MenuItem value="upi">UPI / GPay / PhonePe</MenuItem>
                    <MenuItem value="card">Card (Credit/Debit)</MenuItem>
                    <MenuItem value="credit">Credit / Pay Later (Party Ledger)</MenuItem>
                    <MenuItem value="wallet">Wallet</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Invoice Notes / Reference"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{invoiceSummary.subtotal.toFixed(2)}</Typography>
                  </Box>
                  {invoiceSummary.totalDiscount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <Typography variant="body2">Discount:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>-₹{invoiceSummary.totalDiscount.toFixed(2)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Tax (GST):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{invoiceSummary.totalTax.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Invoice Total:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803d' }}>
                      ₹{invoiceSummary.grandTotal.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={submitting || invoiceSummary.grandTotal <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {submitting ? 'Generating Invoice...' : `Generate Invoice (₹${invoiceSummary.grandTotal.toFixed(2)})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
