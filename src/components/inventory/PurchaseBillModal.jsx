import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert
} from '@mui/material';
import { X, Plus, Trash2, Receipt, ArrowRight, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function PurchaseBillModal({
  open,
  onClose,
  onCreated,
  warehouses = [],
  suppliers = [],
  prefilledPO = null
}) {
  const notify = useNotify();
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(() => getISTDateString());
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setBillNumber('');
      setBillDate(getISTDateString());
      setDueDate('');
      setPaymentStatus('unpaid');
      setPaidAmount(0);
      setPaymentMode('Bank Transfer');
      setAdditionalCharges(0);
      setDiscountAmount(0);
      setNotes('');

      if (prefilledPO) {
        setSupplierId(String(prefilledPO.supplier_id));
        setWarehouseId(String(prefilledPO.warehouse_id));
        setNotes(`Created against Purchase Order #${prefilledPO.po_number}`);
        if (prefilledPO.items) {
          setItems(prefilledPO.items.map(it => ({
            menu_item_id: it.menu_item_id,
            item_name: it.item_name,
            sku: it.sku || '',
            unit: it.unit || 'pcs',
            quantity: parseFloat(it.quantity || 0),
            rate: parseFloat(it.rate || 0),
            tax_rate: parseFloat(it.tax_rate || 0),
            tax_amount: parseFloat(it.tax_amount || 0),
            discount_amount: parseFloat(it.discount_amount || 0),
            total_amount: parseFloat(it.total_amount || 0),
            batch_number: '',
            expiry_date: ''
          })));
        }
      } else {
        setItems([]);
        if (warehouses.length > 0) {
          const defaultWh = warehouses.find(w => w.is_default) || warehouses[0];
          setWarehouseId(defaultWh ? String(defaultWh.id) : '');
        }
        if (suppliers.length > 0) {
          setSupplierId(String(suppliers[0].id));
        }
      }

      apiFetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(err => console.error(err));
    }
  }, [open, prefilledPO, warehouses, suppliers]);

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already in this bill.`, 'Duplicate Item');
      return;
    }

    const rate = parseFloat(product.purchase_price || product.cost_price || product.price || 0);
    const taxRate = parseFloat(product.gst_rate || 0);
    const taxAmt = rate * (taxRate / 100);

    setItems([...items, {
      menu_item_id: product.id,
      item_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      quantity: 1,
      rate,
      tax_rate: taxRate,
      tax_amount: taxAmt,
      discount_amount: 0,
      total_amount: rate + taxAmt,
      batch_number: '',
      expiry_date: ''
    }]);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    const qty = parseFloat(row.quantity || 0);
    const rate = parseFloat(row.rate || 0);
    const taxRate = parseFloat(row.tax_rate || 0);
    const disc = parseFloat(row.discount_amount || 0);

    const base = Math.max(0, (qty * rate) - disc);
    const taxAmt = base * (taxRate / 100);
    row.tax_amount = taxAmt;
    row.total_amount = base + taxAmt;

    updated[index] = row;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, it) => acc + ((parseFloat(it.quantity || 0) * parseFloat(it.rate || 0)) - parseFloat(it.discount_amount || 0)), 0);
  const totalTax = items.reduce((acc, it) => acc + parseFloat(it.tax_amount || 0), 0);
  const grandTotal = Math.max(0, subtotal + totalTax + parseFloat(additionalCharges || 0) - parseFloat(discountAmount || 0));

  // Automatically adjust paid amount if marked fully paid
  const handlePaymentStatusChange = (newStatus) => {
    setPaymentStatus(newStatus);
    if (newStatus === 'paid') {
      setPaidAmount(grandTotal);
    } else if (newStatus === 'unpaid') {
      setPaidAmount(0);
    }
  };

  const handleSubmit = async () => {
    if (!billNumber.trim()) {
      notify.error('Please enter the Vendor Bill / Invoice Number.', 'Validation');
      return;
    }
    if (!supplierId) {
      notify.error('Please select a supplier.', 'Validation');
      return;
    }
    if (!warehouseId) {
      notify.error('Please select a receiving warehouse.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one item to this purchase bill.', 'Validation');
      return;
    }

    for (const it of items) {
      if (!it.quantity || parseFloat(it.quantity) <= 0) {
        notify.error(`Please enter a valid quantity for "${it.item_name}".`, 'Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        bill_number: billNumber.trim(),
        purchase_order_id: prefilledPO ? prefilledPO.id : null,
        supplier_id: parseInt(supplierId),
        warehouse_id: parseInt(warehouseId),
        bill_date: billDate,
        due_date: dueDate || null,
        subtotal,
        tax_amount: totalTax,
        discount_amount: parseFloat(discountAmount || 0),
        additional_charges: parseFloat(additionalCharges || 0),
        total_amount: grandTotal,
        paid_amount: parseFloat(paidAmount || 0),
        payment_status: paymentStatus,
        payment_mode: paymentMode,
        notes: notes.trim(),
        items: items.map(it => ({
          menu_item_id: it.menu_item_id,
          item_name: it.item_name,
          unit: it.unit,
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          tax_rate: parseFloat(it.tax_rate || 0),
          tax_amount: parseFloat(it.tax_amount || 0),
          discount_amount: parseFloat(it.discount_amount || 0),
          total_amount: parseFloat(it.total_amount || 0),
          batch_number: it.batch_number || null,
          expiry_date: it.expiry_date || null
        }))
      };

      const res = await apiFetch('/api/inventory/purchases/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Purchase Bill');

      notify.success('Purchase bill saved! Stock has been added to warehouse.', 'Goods Inward Completed');
      if (onCreated) onCreated(data.bill);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Purchase Bill Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Receipt size={22} color="#16a34a" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Record Purchase Bill (Goods Inward)</Typography>
            <Typography variant="caption" color="text.secondary">
              Directly records goods inward from vendor, updates warehouse stock, and logs purchase ledger.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Real-time stock impact notice */}
        <Alert severity="success" sx={{ py: 0.5, fontSize: '0.82rem' }}>
          <strong>Instant Stock Inflow:</strong> Saving this bill immediately increases inventory in the selected warehouse and credits the supplier balance.
        </Alert>

        {/* Vendor & Warehouse Info */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Vendor Invoice / Bill No. *"
                size="small"
                fullWidth
                required
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="e.g. INV-2024-904"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                label="Supplier / Vendor *"
                size="small"
                fullWidth
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.company_name || s.mobile})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                label="Receiving Warehouse *"
                size="small"
                fullWidth
                required
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 1.5 }}>
              <TextField
                label="Bill Date *"
                type="date"
                size="small"
                fullWidth
                required
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 1.5 }}>
              <TextField
                label="Due Date"
                type="date"
                size="small"
                fullWidth
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Product Autocomplete */}
        <Autocomplete
          options={availableProducts}
          getOptionKey={opt => typeof opt === 'string' ? opt : (opt.id ? `product-${opt.id}` : `${opt.name}-${opt.sku || opt.barcode || ''}`)}
          getOptionLabel={opt => `${opt.name} (${opt.sku || opt.barcode || opt.unit})`}
          onChange={(e, val) => handleAddItem(val)}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <li key={option.id ? `product-opt-${option.id}` : key} {...rest}>
                {option.name} ({option.sku || option.barcode || option.unit})
              </li>
            );
          }}
          renderInput={params => (
            <TextField
              {...params}
              label="Add Received Product to Bill"
              size="small"
              placeholder="Search by name, SKU, or scan barcode..."
            />
          )}
          clearOnBlur
          value={null}
        />

        {/* Bill Items Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '25%' }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Qty Received</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Rate (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">GST %</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Batch / Expiry</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Total (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    No products added yet. Select a product above.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={row.menu_item_id || idx}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
                      {row.sku && <Typography variant="caption" sx={{ color: '#64748b' }}>SKU: {row.sku}</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={row.unit} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0.001, step: row.unit === 'kg' ? '0.001' : '1' }}
                        value={row.quantity}
                        onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={row.rate}
                        onChange={e => handleUpdateItem(idx, 'rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 85 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, max: 100, step: '0.5' }}
                        value={row.tax_rate}
                        onChange={e => handleUpdateItem(idx, 'tax_rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: 180 }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <TextField
                          size="small"
                          placeholder="Batch"
                          value={row.batch_number || ''}
                          onChange={e => handleUpdateItem(idx, 'batch_number', e.target.value)}
                          inputProps={{ style: { fontSize: '0.75rem', padding: '4px 6px' } }}
                        />
                        <TextField
                          size="small"
                          type="date"
                          value={row.expiry_date || ''}
                          onChange={e => handleUpdateItem(idx, 'expiry_date', e.target.value)}
                          inputProps={{ style: { fontSize: '0.75rem', padding: '4px 6px' } }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      ₹{row.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* Bill Payment & Totals */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 1.5 }}>
                PAYMENT DETAILS
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    label="Payment Status"
                    size="small"
                    fullWidth
                    value={paymentStatus}
                    onChange={e => handlePaymentStatusChange(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="unpaid">Unpaid (Credit)</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Paid</option>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Amount Paid (₹)"
                    size="small"
                    type="number"
                    fullWidth
                    value={paidAmount}
                    disabled={paymentStatus === 'unpaid'}
                    onChange={e => setPaidAmount(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    label="Payment Mode"
                    size="small"
                    fullWidth
                    disabled={paymentStatus === 'unpaid'}
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Bill Notes"
                    size="small"
                    fullWidth
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional remarks, transporter receipt number, etc."
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 5 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Taxable Subtotal:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total GST / Tax:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>₹{totalTax.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Freight / Charges (₹):</Typography>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 0, step: '1' }}
                  value={additionalCharges}
                  onChange={e => setAdditionalCharges(e.target.value)}
                  sx={{ width: 100 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Discount (₹):</Typography>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 0, step: '1' }}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  sx={{ width: 100 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '2px solid #cbd5e1' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Grand Total:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#16a34a' }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Balance Due:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#b91c1c' }}>
                  ₹{Math.max(0, grandTotal - parseFloat(paidAmount || 0)).toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle size={16} />}
          disabled={submitting || items.length === 0}
          onClick={handleSubmit}
          sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
        >
          Save Bill & Inward Stock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
