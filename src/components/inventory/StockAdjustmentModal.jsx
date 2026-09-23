import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert
} from '@mui/material';
import { X, Plus, Trash2, Sliders, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function StockAdjustmentModal({
  open,
  onClose,
  onCreated,
  warehouses = []
}) {
  const notify = useNotify();
  const [adjustmentDate, setAdjustmentDate] = useState(() => getISTDateString());
  const [warehouseId, setWarehouseId] = useState('');
  const [reason, setReason] = useState('Physical Count Discrepancy');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [warehouseStockMap, setWarehouseStockMap] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAdjustmentDate(getISTDateString());
      setReason('Physical Count Discrepancy');
      setNotes('');
      setItems([]);

      if (warehouses.length > 0) {
        const defaultWh = warehouses.find(w => w.is_default) || warehouses[0];
        setWarehouseId(defaultWh ? String(defaultWh.id) : '');
      }

      apiFetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(err => console.error(err));
    }
  }, [open, warehouses]);

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
      notify.error(`"${product.name}" is already added to this adjustment.`, 'Duplicate Item');
      return;
    }

    const curr = warehouseStockMap[product.id] !== undefined
      ? warehouseStockMap[product.id]
      : parseFloat(product.current_stock || 0);

    setItems([...items, {
      menu_item_id: product.id,
      item_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      previous_stock: curr,
      adjustment_type: 'add',
      quantity: 1,
      unit_cost: parseFloat(product.cost_price || product.purchase_price || 0)
    }]);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateNewStock = (row) => {
    const prev = parseFloat(row.previous_stock || 0);
    const qty = parseFloat(row.quantity || 0);
    if (row.adjustment_type === 'add') return prev + qty;
    if (row.adjustment_type === 'reduce') return Math.max(0, prev - qty);
    if (row.adjustment_type === 'set') return Math.max(0, qty);
    return prev;
  };

  const handleSubmit = async () => {
    if (!warehouseId) {
      notify.error('Please select a warehouse.', 'Validation');
      return;
    }
    if (!reason) {
      notify.error('Please select an adjustment reason.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one item to adjust.', 'Validation');
      return;
    }

    for (const it of items) {
      const qty = parseFloat(it.quantity || 0);
      if (isNaN(qty) || qty < 0) {
        notify.error(`Please enter a valid quantity for "${it.item_name}".`, 'Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        warehouse_id: parseInt(warehouseId),
        adjustment_date: adjustmentDate,
        reason,
        notes: notes.trim(),
        items: items.map(it => ({
          menu_item_id: it.menu_item_id,
          item_name: it.item_name,
          unit: it.unit,
          adjustment_type: it.adjustment_type,
          quantity: parseFloat(it.quantity),
          previous_stock: parseFloat(it.previous_stock || 0),
          new_stock: calculateNewStock(it),
          unit_cost: parseFloat(it.unit_cost || 0)
        }))
      };

      const res = await apiFetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply adjustment');

      notify.success('Stock adjustment applied and ledger updated.', 'Adjustment Recorded');
      if (onCreated) onCreated(data.adjustment);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Adjustment Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Sliders size={22} color="#0284c7" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Stock Adjustment / Reconciliation</Typography>
            <Typography variant="caption" color="text.secondary">
              Correct physical discrepancies, record damages, spoilage, or cycle count findings.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Warehouse / Outlet *"
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

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Adjustment Reason *"
                size="small"
                fullWidth
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="Physical Count Discrepancy">Physical Count Discrepancy</option>
                <option value="Damaged / Broken">Damaged / Broken in Warehouse</option>
                <option value="Expired Goods">Expired / Past Shelf Life</option>
                <option value="Theft / Lost">Theft / Unaccounted Loss</option>
                <option value="Opening Balance Correction">Opening Balance Correction</option>
                <option value="Other">Other Adjustment</option>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Adjustment Date *"
                type="date"
                size="small"
                fullWidth
                required
                value={adjustmentDate}
                onChange={e => setAdjustmentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
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
              label="Select Product to Adjust"
              size="small"
              placeholder="Search by name, SKU, or scan barcode..."
            />
          )}
          clearOnBlur
          value={null}
        />

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '30%' }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Current Stock</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Adjustment Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">New Stock</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    No items selected for adjustment. Search for an item above.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => {
                  const newStock = calculateNewStock(row);
                  return (
                    <TableRow key={row.menu_item_id || idx}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
                        {row.sku && <Typography variant="caption" sx={{ color: '#64748b' }}>SKU: {row.sku}</Typography>}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.unit} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>
                        {row.previous_stock}
                      </TableCell>
                      <TableCell align="center" sx={{ width: 140 }}>
                        <TextField
                          select
                          size="small"
                          value={row.adjustment_type}
                          onChange={e => handleUpdateItem(idx, 'adjustment_type', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="add">Add (+)</option>
                          <option value="reduce">Reduce (-)</option>
                          <option value="set">Set (=)</option>
                        </TextField>
                      </TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: row.unit === 'kg' ? '0.001' : '1' }}
                          value={row.quantity}
                          onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${newStock} ${row.unit}`}
                          sx={{
                            fontWeight: 700,
                            bgcolor: '#f0fdf4',
                            color: '#16a34a',
                            border: '1px solid #bbf7d0'
                          }}
                        />
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

        <TextField
          label="Adjustment Notes / Audit Memo"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Annual stock audit by inventory auditor; adjustments approved by Store GM."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Sliders size={16} />}
          disabled={submitting || items.length === 0}
          onClick={handleSubmit}
          sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
        >
          Apply Stock Adjustment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
