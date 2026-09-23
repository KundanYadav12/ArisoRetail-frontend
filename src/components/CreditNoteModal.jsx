import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import { RotateCcw, AlertTriangle, CheckCircle, Search, DollarSign } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import { calculateLineItemTax, round2 } from '../utils/gstCalculator';

export default function CreditNoteModal({ open, onClose, order: initialOrder = null, onSuccess }) {
  const { notify } = useNotify();

  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(initialOrder);

  const [selectedItems, setSelectedItems] = useState({}); // { [order_item_id]: { selected: bool, returnQty: number } }
  const [reason, setReason] = useState('customer_return');
  const [remarks, setRemarks] = useState('');
  const [returnToStock, setReturnToStock] = useState(true);
  const [adjustCustomerLedger, setAdjustCustomerLedger] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset or initialize state when modal opens or initialOrder changes
  useEffect(() => {
    if (open) {
      setErrorMsg('');
      if (initialOrder) {
        setActiveOrder(initialOrder);
        initItemSelections(initialOrder);
      } else {
        setActiveOrder(null);
        setSelectedItems({});
      }
    }
  }, [open, initialOrder]);

  const initItemSelections = (ord) => {
    if (!ord || !ord.items) return;
    const initialSelections = {};
    ord.items.forEach(item => {
      const maxQty = parseFloat(item.quantity || item.item_weight || 1);
      initialSelections[item.id] = {
        selected: true,
        returnQty: maxQty
      };
    });
    setSelectedItems(initialSelections);
  };

  const handleSearchOrder = async () => {
    if (!orderSearchQuery.trim()) return;
    setSearchingOrder(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/orders?search=${encodeURIComponent(orderSearchQuery.trim())}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const orders = data.orders || data;
        if (Array.isArray(orders) && orders.length > 0) {
          const detailRes = await apiFetch(`/api/orders/${orders[0].id}`);
          if (detailRes.ok) {
            const fullOrder = await detailRes.json();
            setActiveOrder(fullOrder);
            initItemSelections(fullOrder);
          } else {
            setActiveOrder(orders[0]);
            initItemSelections(orders[0]);
          }
        } else {
          setErrorMsg(`No order found matching "${orderSearchQuery}"`);
        }
      } else {
        setErrorMsg('Failed to search order. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error searching order');
    } finally {
      setSearchingOrder(false);
    }
  };

  const handleToggleItem = (itemId) => {
    setSelectedItems(prev => {
      const cur = prev[itemId] || { selected: false, returnQty: 1 };
      return {
        ...prev,
        [itemId]: {
          ...cur,
          selected: !cur.selected
        }
      };
    });
  };

  const handleQtyChange = (itemId, maxQty, val) => {
    const num = Math.max(0.01, Math.min(parseFloat(val) || 0, maxQty));
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        selected: num > 0,
        returnQty: num
      }
    }));
  };

  // Compute calculated totals for the credit note
  const orderItems = activeOrder?.items || [];
  const taxType = activeOrder?.tax_type || 'intra';

  let totalReturnItemsCount = 0;
  let totalTaxableRefund = 0;
  let totalCgstRefund = 0;
  let totalSgstRefund = 0;
  let totalIgstRefund = 0;
  let totalTaxRefund = 0;
  let totalCreditAmount = 0;

  const returnPayloadItems = [];

  orderItems.forEach(item => {
    const sel = selectedItems[item.id];
    if (sel && sel.selected && sel.returnQty > 0) {
      const qty = sel.returnQty;
      const unitPrice = parseFloat(item.price || item.unit_price || 0);
      const gstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);

      const calc = calculateLineItemTax({
        price: unitPrice,
        quantity: qty,
        discountAmount: 0,
        gstRate,
        gstMode: 'excluded',
        taxType,
        isTaxExempt: Boolean(item.is_tax_exempt),
        hsnCode: item.hsn_code
      });

      totalReturnItemsCount += 1;
      totalTaxableRefund += calc.taxableAmount;
      totalCgstRefund += calc.cgstAmount;
      totalSgstRefund += calc.sgstAmount;
      totalIgstRefund += calc.igstAmount;
      totalTaxRefund += calc.totalTax;
      totalCreditAmount += calc.lineTotal;

      returnPayloadItems.push({
        order_item_id: item.id,
        menu_item_id: item.menu_item_id || item.product_id,
        name: item.name,
        quantity: qty,
        unit_price: unitPrice,
        hsn_code: item.hsn_code || null,
        taxable_amount: calc.taxableAmount,
        gst_rate: gstRate,
        cgst_rate: calc.cgstRate,
        cgst_amount: calc.cgstAmount,
        sgst_rate: calc.sgstRate,
        sgst_amount: calc.sgstAmount,
        igst_rate: calc.igstRate,
        igst_amount: calc.igstAmount,
        total_amount: calc.lineTotal
      });
    }
  });

  const handleSubmitCreditNote = async () => {
    if (!activeOrder) {
      setErrorMsg('Please select an order to issue a credit note against.');
      return;
    }
    if (returnPayloadItems.length === 0) {
      setErrorMsg('Please select at least one item and specify return quantity.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        order_id: activeOrder.id,
        customer_id: activeOrder.customer_id || null,
        customer_name: activeOrder.customer_name || 'Walk-in Customer',
        customer_gstin: activeOrder.gst_number || activeOrder.customer_gstin || null,
        reason,
        remarks,
        return_to_stock: returnToStock,
        adjust_customer_ledger: adjustCustomerLedger,
        items: returnPayloadItems
      };

      const res = await apiFetch('/api/gst/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        notify.success(
          `Credit Note #${created.credit_note_number} generated successfully for ₹${parseFloat(created.total_amount || totalCreditAmount).toFixed(2)}`,
          'Credit Note Issued'
        );
        if (onSuccess) onSuccess(created);
        onClose();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to issue credit note');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error while issuing credit note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RotateCcw size={22} color="#f97316" />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Issue Sales Return / Credit Note (GST Compliant)
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Order Selection / Lookup */}
        {!initialOrder && (
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              size="small"
              fullWidth
              label="Enter Invoice Number or Order ID"
              placeholder="e.g. RET-123456 or 104"
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
            />
            <Button
              variant="contained"
              onClick={handleSearchOrder}
              disabled={searchingOrder || !orderSearchQuery.trim()}
              startIcon={searchingOrder ? <CircularProgress size={16} color="inherit" /> : <Search size={16} />}
              sx={{ minWidth: 120, fontWeight: 700 }}
            >
              Lookup
            </Button>
          </Box>
        )}

        {activeOrder ? (
          <Box>
            {/* Header info */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: 'background.default', borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    ORIGINAL INVOICE
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    #{activeOrder.unique_order_number || activeOrder.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activeOrder.created_at ? new Date(activeOrder.created_at).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    CUSTOMER
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {activeOrder.customer_name || 'Walk-in Customer'}
                  </Typography>
                  {activeOrder.gst_number && (
                    <Chip label={`GSTIN: ${activeOrder.gst_number}`} size="small" sx={{ mt: 0.5, fontWeight: 600, fontSize: '0.75rem' }} />
                  )}
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    TAX TYPE / POS
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                    {taxType === 'inter' ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Invoiced: ₹{parseFloat(activeOrder.total_amount || 0).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Items Table for Return Selection */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              Select Items & Return Quantity:
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>HSN</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Original Qty</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center" width={120}>Return Qty</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Unit Rate</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">GST %</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Refund Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map(item => {
                    const maxQty = parseFloat(item.quantity || item.item_weight || 1);
                    const sel = selectedItems[item.id] || { selected: false, returnQty: maxQty };
                    const unitPrice = parseFloat(item.price || item.unit_price || 0);
                    const gstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);
                    const lineRefund = round2(sel.returnQty * unitPrice * (1 + gstRate / 100));

                    return (
                      <TableRow key={item.id} hover selected={sel.selected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={sel.selected}
                            onChange={() => handleToggleItem(item.id)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{item.hsn_code || '-'}</TableCell>
                        <TableCell align="right">{maxQty}</TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0.1, max: maxQty, step: 0.1, style: { textAlign: 'center', padding: '4px 6px' } }}
                            value={sel.returnQty}
                            disabled={!sel.selected}
                            onChange={(e) => handleQtyChange(item.id, maxQty, e.target.value)}
                            sx={{ width: 85 }}
                          />
                        </TableCell>
                        <TableCell align="right">₹{unitPrice.toFixed(2)}</TableCell>
                        <TableCell align="right">{gstRate}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: sel.selected ? 'primary.main' : 'text.disabled' }}>
                          ₹{lineRefund.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Credit Note Options */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Reason for Return</InputLabel>
                  <Select
                    value={reason}
                    label="Reason for Return"
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <MenuItem value="customer_return">Customer Return / Exchange</MenuItem>
                    <MenuItem value="defective">Defective / Damaged Goods</MenuItem>
                    <MenuItem value="wrong_item">Wrong Item Delivered</MenuItem>
                    <MenuItem value="deficiency_in_service">Deficiency in Service</MenuItem>
                    <MenuItem value="post_sale_discount">Post-Sale Discount / Price Adjustment</MenuItem>
                    <MenuItem value="other">Other / General Return</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Remarks / Notes (Optional)"
                  placeholder="e.g. Sealed pack returned in good condition"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Actions checkboxes */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={returnToStock}
                    onChange={(e) => setReturnToStock(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Restock items back into inventory (Audit Movement: SALES_RETURN)
                  </Typography>
                }
              />

              {activeOrder.customer_id && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={adjustCustomerLedger}
                      onChange={(e) => setAdjustCustomerLedger(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Credit to Customer Ledger Balance
                    </Typography>
                  }
                />
              )}
            </Box>

            {/* Summary Box */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(249, 115, 22, 0.04)', borderColor: 'rgba(249, 115, 22, 0.3)', borderRadius: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Taxable Refund</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>₹{totalTaxableRefund.toFixed(2)}</Typography>
                </Grid>
                {taxType === 'inter' ? (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Reversed IGST</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>₹{totalIgstRefund.toFixed(2)}</Typography>
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Reversed CGST</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>₹{totalCgstRefund.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Reversed SGST</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>₹{totalSgstRefund.toFixed(2)}</Typography>
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={3} sx={{ textAlign: { sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary">Total Credit Note Value</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{totalCreditAmount.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Search and select an order to begin processing the sales return.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitCreditNote}
          disabled={submitting || !activeOrder || totalCreditAmount <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <RotateCcw size={16} />}
          sx={{ fontWeight: 800, minWidth: 160 }}
        >
          {submitting ? 'Generating...' : `Issue Credit Note (₹${totalCreditAmount.toFixed(2)})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
