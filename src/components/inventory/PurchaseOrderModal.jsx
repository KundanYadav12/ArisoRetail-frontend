import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert
} from '@mui/material';
import { X, Plus, Trash2, FileText, ShoppingCart } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function PurchaseOrderModal({
  open,
  onClose,
  onCreated,
  warehouses = [],
  suppliers = []
}) {
  const notify = useNotify();
  const [orderDate, setOrderDate] = useState(() => getISTDateString());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setOrderDate(getISTDateString());
      setDeliveryDate('');
      setNotes('');
      setDiscountAmount(0);
      setItems([]);

      if (warehouses.length > 0) {
        const defaultWh = warehouses.find(w => w.is_default) || warehouses[0];
        setWarehouseId(defaultWh ? String(defaultWh.id) : '');
      }
      if (suppliers.length > 0) {
        setSupplierId(String(suppliers[0].id));
      }

      apiFetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(err => console.error(err));
    }
  }, [open, warehouses, suppliers]);

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already in this Purchase Order.`, 'Duplicate Item');
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
      total_amount: rate + taxAmt
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
  const grandTotal = Math.max(0, subtotal + totalTax - parseFloat(discountAmount || 0));

  const handleSubmit = async (status = 'pending') => {
    if (!supplierId) {
      notify.error('Please select a supplier.', 'Validation');
      return;
    }
    if (!warehouseId) {
      notify.error('Please select a destination warehouse.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one product to the Purchase Order.', 'Validation');
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
        supplier_id: parseInt(supplierId),
        warehouse_id: parseInt(warehouseId),
        order_date: orderDate,
        expected_delivery_date: deliveryDate || null,
        subtotal,
        tax_amount: totalTax,
        discount_amount: parseFloat(discountAmount || 0),
        total_amount: grandTotal,
        status,
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
          total_amount: parseFloat(it.total_amount || 0)
        }))
      };

      const res = await apiFetch('/api/inventory/purchases/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Purchase Order');

      notify.success('Purchase Order created successfully.', 'PO Created');
      if (onCreated) onCreated(data.purchase_order);
      onClose();
    } catch (err) {
      notify.error(err.message, 'PO Creation Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShoppingCart size={22} color="#0284c7" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Create Purchase Order (PO)</Typography>
            <Typography variant="caption" color="text.secondary">
              Record purchase orders sent to vendors. POs do not affect physical stock until goods are billed/received.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Vendor & Warehouse Info */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
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

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Destination Warehouse / Outlet *"
                size="small"
                fullWidth
                required
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">-- Select Destination --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                label="Order Date *"
                type="date"
                size="small"
                fullWidth
                required
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                label="Expected Delivery"
                type="date"
                size="small"
                fullWidth
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
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
              label="Add Product to Purchase Order"
              size="small"
              placeholder="Search by item name, SKU, or barcode..."
            />
          )}
          clearOnBlur
          value={null}
        />

        {/* PO Items Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '30%' }}>Item Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Purchase Rate (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">GST %</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tax (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Line Total (₹)</TableCell>
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
                    <TableCell align="right" sx={{ width: 120 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={row.rate}
                        onChange={e => handleUpdateItem(idx, 'rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, max: 100, step: '0.5' }}
                        value={row.tax_rate}
                        onChange={e => handleUpdateItem(idx, 'tax_rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b' }}>
                      ₹{row.tax_amount.toFixed(2)}
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

        {/* PO Footer Calculations & Notes */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField
              label="Purchase Terms & Vendor Notes"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Payment within 30 days of goods receipt. F.O.R Destination."
            />
          </Grid>
          <Grid item xs={12} sm={5}>
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
                <Typography variant="body2" color="text.secondary">Order Discount (₹):</Typography>
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
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0284c7' }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit('draft')}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FileText size={16} />}
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit('pending')}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
          >
            Create Purchase Order
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
