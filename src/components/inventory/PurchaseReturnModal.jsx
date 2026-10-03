import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert
} from '@mui/material';
import { X, Plus, Trash2, Undo2, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function PurchaseReturnModal({
  open,
  onClose,
  onCreated,
  warehouses = [],
  suppliers = []
}) {
  const notify = useNotify();
  const [returnDate, setReturnDate] = useState(() => getISTDateString());
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [warehouseStockMap, setWarehouseStockMap] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReturnDate(getISTDateString());
      setReason('');
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

  useEffect(() => {
    if (warehouseId) {
      apiFetch(`/api/inventory/warehouses/${warehouseId}/stock`)
        .then(r => r.json())
        .then(data => {
          const map = {};
          if (data && data.items) {
            data.items.forEach(it => {
              map[it.menu_item_id] = parseFloat(it.available_stock || 0);
            });
          }
          setWarehouseStockMap(map);
        })
        .catch(err => console.error(err));
    }
  }, [warehouseId]);

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already in this return list.`, 'Duplicate Item');
      return;
    }

    const rate = parseFloat(product.purchase_price || product.cost_price || product.price || 0);
    const avail = warehouseStockMap[product.id] !== undefined ? warehouseStockMap[product.id] : 0;

    setItems([...items, {
      menu_item_id: product.id,
      item_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      available_qty: avail,
      quantity: 1,
      rate,
      total_amount: rate
    }]);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };
    const qty = parseFloat(row.quantity || 0);
    const rate = parseFloat(row.rate || 0);
    row.total_amount = qty * rate;
    updated[index] = row;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((acc, it) => acc + parseFloat(it.total_amount || 0), 0);

  const handleSubmit = async () => {
    if (!supplierId) {
      notify.error('Please select a supplier.', 'Validation');
      return;
    }
    if (!warehouseId) {
      notify.error('Please select warehouse returning the stock.', 'Validation');
      return;
    }
    if (!reason.trim()) {
      notify.error('Please provide a reason for the return (e.g. Defective, Expired).', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one item to return.', 'Validation');
      return;
    }

    for (const it of items) {
      const qty = parseFloat(it.quantity || 0);
      const avail = warehouseStockMap[it.menu_item_id] !== undefined ? warehouseStockMap[it.menu_item_id] : 0;
      if (qty <= 0) {
        notify.error(`Please enter a valid quantity for "${it.item_name}".`, 'Validation');
        return;
      }
      if (qty > avail) {
        notify.error(`Cannot return ${qty} ${it.unit} of "${it.item_name}". Available stock in warehouse is only ${avail}.`, 'Insufficient Stock');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: parseInt(supplierId),
        warehouse_id: parseInt(warehouseId),
        return_date: returnDate,
        reason: reason.trim(),
        total_amount: grandTotal,
        items: items.map(it => ({
          menu_item_id: it.menu_item_id,
          item_name: it.item_name,
          unit: it.unit,
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          total_amount: parseFloat(it.total_amount)
        }))
      };

      const res = await apiFetch('/api/inventory/purchases/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process purchase return');

      notify.success('Purchase return recorded! Stock reduced and supplier credited.', 'Return Processed');
      if (onCreated) onCreated(data.purchase_return);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Return Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Undo2 size={22} color="#dc2626" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Record Purchase Return (Debit Note)</Typography>
            <Typography variant="caption" color="text.secondary">
              Return damaged, expired, or excess goods to supplier.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.82rem' }}>
          <strong>Inventory Outflow:</strong> Goods returned will be immediately deducted from the selected warehouse, and recorded in the Stock Ledger under <strong>PURCHASE_RETURN</strong>.
        </Alert>

        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Supplier / Vendor *"
                size="small"
                fullWidth
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                slotProps={{ select: { native: true } }}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.company_name || s.mobile})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Source Warehouse *"
                size="small"
                fullWidth
                required
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                slotProps={{ select: { native: true } }}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Return Date *"
                type="date"
                size="small"
                fullWidth
                required
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Return Reason *"
                size="small"
                fullWidth
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Expired batch delivered / Broken packaging / Wrong item sent"
              />
            </Grid>
          </Grid>
        </Paper>

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
              label="Select Product to Return"
              size="small"
              placeholder="Search product name or SKU..."
            />
          )}
          clearOnBlur
          value={null}
        />

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Warehouse Stock</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Return Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Rate (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Total (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    No items added to return yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => {
                  const avail = warehouseStockMap[row.menu_item_id] !== undefined
                    ? warehouseStockMap[row.menu_item_id]
                    : 0;
                  const isInsufficient = parseFloat(row.quantity || 0) > avail;

                  return (
                    <TableRow key={row.menu_item_id || idx}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
                        {row.sku && <Typography variant="caption" sx={{ color: '#64748b' }}>SKU: {row.sku}</Typography>}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.unit} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${avail} ${row.unit}`}
                          sx={{
                            fontWeight: 700,
                            bgcolor: isInsufficient ? '#fee2e2' : '#f8fafc',
                            color: isInsufficient ? '#dc2626' : '#334155'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>
                        <TextField
                          size="small"
                          type="number"
                          error={isInsufficient}
                          inputProps={{ min: 0.001, max: avail, step: row.unit === 'kg' ? '0.001' : '1' }}
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
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>
                        ₹{parseFloat(row.total_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Total Return Value: <span style={{ color: '#dc2626' }}>₹{parseFloat(grandTotal || 0).toFixed(2)}</span>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<Undo2 size={16} />}
          disabled={submitting || items.length === 0}
          onClick={handleSubmit}
          sx={{ fontWeight: 700 }}
        >
          Confirm Return & Deduct Stock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
