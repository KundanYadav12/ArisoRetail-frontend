import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert,
  FormControl, Select, MenuItem
} from '@mui/material';
import { X, Plus, Trash2, ArrowRight, Truck, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function StockTransferModal({
  open,
  onClose,
  onCreated,
  warehouses = [],
  prefilledRequest = null
}) {
  const notify = useNotify();
  const [transferDate, setTransferDate] = useState(() => getISTDateString());
  const [sourceWhId, setSourceWhId] = useState('');
  const [destinationWhId, setDestinationWhId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [sourceStockMap, setSourceStockMap] = useState({});
  const [sourceRacks, setSourceRacks] = useState([]);
  const [destRacks, setDestRacks] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTransferDate(getISTDateString());
      setNotes('');

      if (prefilledRequest) {
        setSourceWhId(String(prefilledRequest.source_warehouse_id));
        setDestinationWhId(String(prefilledRequest.requesting_warehouse_id));
        setNotes(`Transfer for Stock Request ${prefilledRequest.request_number}`);
        if (prefilledRequest.items) {
          setItems(prefilledRequest.items
            .filter(it => parseFloat(it.approved_qty || it.requested_qty || 0) > 0)
            .map(it => ({
              menu_item_id: it.menu_item_id,
              name: it.item_name || it.name,
              sku: it.sku || '',
              unit: it.unit || 'pcs',
              sent_qty: parseFloat(it.approved_qty || it.requested_qty || 0),
              unit_cost: parseFloat(it.cost_price || it.purchase_price || 0),
              batch_number: '',
              expiry_date: '',
              notes: ''
            }))
          );
        }
      } else {
        setItems([]);
        if (warehouses.length > 0) {
          const defaultWh = warehouses.find(w => w.is_default) || warehouses[0];
          const secondary = warehouses.find(w => !w.is_default) || warehouses[0];
          setSourceWhId(defaultWh ? String(defaultWh.id) : '');
          setDestinationWhId(secondary ? String(secondary.id) : '');
        }
      }

      // Fetch products list
      apiFetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(err => console.error(err));
    }
  }, [open, prefilledRequest, warehouses]);

  // Fetch source warehouse live stock
  useEffect(() => {
    if (sourceWhId) {
      apiFetch(`/api/inventory/warehouses/${sourceWhId}/stock`)
        .then(r => r.json())
        .then(data => {
          const map = {};
          if (data && data.items) {
            data.items.forEach(it => {
              map[it.menu_item_id] = parseFloat(it.available_stock || 0);
            });
          }
          setSourceStockMap(map);
        })
        .catch(err => console.error(err));

      apiFetch(`/api/inventory/racks?warehouse_id=${sourceWhId}`)
        .then(res => res.json())
        .then(data => Array.isArray(data) && setSourceRacks(data))
        .catch(console.error);
    } else {
      setSourceRacks([]);
    }
  }, [sourceWhId]);

  useEffect(() => {
    if (destinationWhId) {
      apiFetch(`/api/inventory/racks?warehouse_id=${destinationWhId}`)
        .then(res => res.json())
        .then(data => Array.isArray(data) && setDestRacks(data))
        .catch(console.error);
    } else {
      setDestRacks([]);
    }
  }, [destinationWhId]);

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already in this transfer.`, 'Duplicate Item');
      return;
    }

    setItems([...items, {
      menu_item_id: product.id,
      name: product.name,
      sku: product.sku || product.item_code || '',
      unit: product.unit || 'pcs',
      sent_qty: 1,
      unit_cost: parseFloat(product.purchase_price || product.cost_price || product.price || 0),
      source_rack_id: sourceRacks[0]?.id ? String(sourceRacks[0].id) : '',
      destination_rack_id: destRacks[0]?.id ? String(destRacks[0].id) : '',
      batch_number: '',
      expiry_date: '',
      notes: ''
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

  const handleSubmit = async (status = 'in_transit') => {
    if (!sourceWhId || !destinationWhId) {
      notify.error('Please select both Source and Destination Warehouses.', 'Validation');
      return;
    }
    if (sourceWhId === destinationWhId) {
      notify.error('Source and Destination Warehouses cannot be the same.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one item to transfer.', 'Validation');
      return;
    }

    // Validate quantities against source stock
    for (const it of items) {
      const sentQty = parseFloat(it.sent_qty || 0);
      if (sentQty <= 0) {
        notify.error(`Please specify a valid quantity for "${it.name}".`, 'Validation');
        return;
      }
      const avail = sourceStockMap[it.menu_item_id] !== undefined ? sourceStockMap[it.menu_item_id] : Infinity;
      if (status === 'in_transit' && sentQty > avail) {
        notify.error(
          `Cannot dispatch ${sentQty} ${it.unit} of "${it.name}". Available stock at source is only ${avail} ${it.unit}.`,
          'Insufficient Stock'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        transfer_date: transferDate,
        source_warehouse_id: parseInt(sourceWhId),
        destination_warehouse_id: parseInt(destinationWhId),
        stock_request_id: prefilledRequest ? prefilledRequest.id : null,
        status,
        notes: notes.trim(),
        items: items.map(it => ({
          menu_item_id: it.menu_item_id,
          item_name: it.name || it.item_name || '',
          unit: it.unit || 'pcs',
          sent_qty: parseFloat(it.sent_qty),
          unit_cost: parseFloat(it.unit_cost || 0),
          source_rack_id: it.source_rack_id ? parseInt(it.source_rack_id, 10) : null,
          destination_rack_id: it.destination_rack_id ? parseInt(it.destination_rack_id, 10) : null,
          batch_number: it.batch_number && it.batch_number.trim() !== '' ? it.batch_number.trim() : null,
          expiry_date: it.expiry_date && it.expiry_date.trim() !== '' ? it.expiry_date.trim() : null,
          notes: it.notes && it.notes.trim() !== '' ? it.notes.trim() : null
        }))
      };

      const res = await apiFetch('/api/inventory/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate transfer');

      notify.success(
        status === 'in_transit'
          ? `Stock transfer dispatched successfully. Source warehouse stock has been deducted.`
          : `Stock transfer saved as draft.`,
        'Transfer Created'
      );
      if (onCreated) onCreated(data.transfer);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Transfer Error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = items.reduce((acc, it) => acc + (parseFloat(it.sent_qty) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Truck size={22} color="#0284c7" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {prefilledRequest ? `Dispatch Transfer for Request ${prefilledRequest.request_number}` : 'New Stock Transfer'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Transfer physical inventory between outlets or central store.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Source & Destination Selection */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Transfer Date"
                type="date"
                size="small"
                fullWidth
                required
                value={transferDate}
                onChange={e => setTransferDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Source Warehouse (From)"
                size="small"
                fullWidth
                required
                value={sourceWhId}
                onChange={e => setSourceWhId(e.target.value)}
                disabled={Boolean(prefilledRequest)}
                slotProps={{ select: { native: true } }}
              >
                <option value="">-- Select Source --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 1 }} sx={{ display: 'flex', justifyContent: 'center' }}>
              <ArrowRight size={20} color="#64748b" />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Destination Warehouse (To)"
                size="small"
                fullWidth
                required
                value={destinationWhId}
                onChange={e => setDestinationWhId(e.target.value)}
                disabled={Boolean(prefilledRequest)}
                slotProps={{ select: { native: true } }}
              >
                <option value="">-- Select Destination --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Informational Alert */}
        <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.8rem' }}>
          <strong>Physical Stock Impact:</strong> When dispatched (In-Transit), stock is immediately deducted from the <strong>Source Warehouse</strong>. Stock will be added to the <strong>Destination Warehouse</strong> only when the receiving team inspects and accepts the delivery.
        </Alert>

        {/* Product Picker */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                label="Search & Add Product to Transfer"
                size="small"
                placeholder="Type item name, SKU, or scan barcode..."
              />
            )}
            sx={{ flex: 1 }}
            clearOnBlur
            value={null}
          />
        </Box>

        {/* Transfer Items Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '25%' }}>Item Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Source Avail.</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Sent Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Source Rack</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dest. Rack</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    No items added yet. Search for a product above to add to this transfer.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => {
                  const avail = sourceStockMap[row.menu_item_id] !== undefined
                    ? sourceStockMap[row.menu_item_id]
                    : '—';
                  const isInsufficient = typeof avail === 'number' && parseFloat(row.sent_qty || 0) > avail;

                  return (
                    <TableRow key={row.menu_item_id || idx}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                        {row.sku && <Typography variant="caption" sx={{ color: '#64748b' }}>SKU: {row.sku}</Typography>}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.unit || 'pcs'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${avail} ${row.unit}`}
                          sx={{
                            fontWeight: 700,
                            bgcolor: isInsufficient ? '#fee2e2' : '#f0fdf4',
                            color: isInsufficient ? '#dc2626' : '#16a34a'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ width: 110 }}>
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: row.unit === 'kg' ? '0.001' : '1' }}
                          value={row.sent_qty}
                          error={isInsufficient}
                          onChange={e => handleUpdateItem(idx, 'sent_qty', e.target.value)}
                        />
                      </TableCell>
                      <TableCell sx={{ width: 150 }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={row.source_rack_id || ''}
                            onChange={e => handleUpdateItem(idx, 'source_rack_id', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">Floor / General</MenuItem>
                            {sourceRacks.map(r => (
                              <MenuItem key={r.id} value={String(r.id)}>{r.rack_code}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell sx={{ width: 150 }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={row.destination_rack_id || ''}
                            onChange={e => handleUpdateItem(idx, 'destination_rack_id', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">Floor / General</MenuItem>
                            {destRacks.map(r => (
                              <MenuItem key={r.id} value={String(r.id)}>{r.rack_code}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
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

        {/* Transfer Notes / Transporter Info */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Transfer Notes / Transporter Details / Vehicle No."
              size="small"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Dispatched via Express Logistics Van MH-04-AB-1234, Driver Contact: 9876543210"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>TRANSFER SUMMARY</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2">Unique Items:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{items.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2">Total Units:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0284c7' }}>{totalUnits.toFixed(3)}</Typography>
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
            Save as Draft
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Truck size={16} />}
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit('in_transit')}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
          >
            Dispatch & Deduct Source Stock
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
