import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip
} from '@mui/material';
import { X, Plus, Trash2, ArrowRight, ClipboardList } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function StockRequestModal({ open, onClose, onCreated, warehouses = [] }) {
  const notify = useNotify();
  const [requestDate, setRequestDate] = useState(() => getISTDateString());
  const [requestingWhId, setRequestingWhId] = useState('');
  const [sourceWhId, setSourceWhId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [sourceStockMap, setSourceStockMap] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize warehouses
  useEffect(() => {
    if (open) {
      setRequestDate(getISTDateString());
      setNotes('');
      setItems([]);

      if (warehouses.length > 0) {
        const defaultWh = warehouses.find(w => w.is_default) || warehouses[0];
        const secondary = warehouses.find(w => !w.is_default) || warehouses[0];
        setSourceWhId(defaultWh ? String(defaultWh.id) : '');
        setRequestingWhId(secondary ? String(secondary.id) : '');
      }

      // Fetch products
      apiFetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(err => console.error(err));
    }
  }, [open, warehouses]);

  // When source warehouse changes, fetch live warehouse stock for source
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
    }
  }, [sourceWhId]);

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already added to this request.`, 'Duplicate Item');
      return;
    }

    const avail = sourceStockMap[product.id] !== undefined ? sourceStockMap[product.id] : parseFloat(product.current_stock || 0);

    setItems([...items, {
      menu_item_id: product.id,
      name: product.name,
      sku: product.sku || product.item_code || '',
      unit: product.unit || 'pcs',
      is_weight_based: product.is_weight_based,
      available_qty: avail,
      requested_qty: 1,
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

  const handleSubmit = async (isDraft = false) => {
    if (!requestingWhId || !sourceWhId) {
      notify.error('Please select both Requesting Outlet and Source Warehouse.', 'Validation');
      return;
    }
    if (requestingWhId === sourceWhId) {
      notify.error('Requesting warehouse and source warehouse cannot be the same.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one product to the stock request.', 'Validation');
      return;
    }

    for (const it of items) {
      if (!it.requested_qty || parseFloat(it.requested_qty) <= 0) {
        notify.error(`Please enter a valid requested quantity for "${it.name}".`, 'Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/inventory/stock-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_date: requestDate,
          requesting_warehouse_id: parseInt(requestingWhId),
          source_warehouse_id: parseInt(sourceWhId),
          notes,
          is_draft: isDraft,
          items: items.map(i => ({
            menu_item_id: i.menu_item_id,
            item_name: i.name,
            unit: i.unit,
            requested_qty: parseFloat(i.requested_qty),
            notes: i.notes
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit stock request.');
      }

      const data = await res.json();
      notify.success(`Stock Request ${data.request?.request_number || ''} submitted successfully!`, 'Request Created');
      onCreated();
      onClose();
    } catch (err) {
      notify.error(err.message, 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClipboardList size={22} color="#0284c7" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Create Stock Request</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Header Locations */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                label="Requesting Outlet (Destination)"
                select
                fullWidth
                size="small"
                required
                value={requestingWhId}
                onChange={e => setRequestingWhId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">Select Destination...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={1} sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center' }}>
              <ArrowRight size={20} color="#64748b" />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Request To (Source Warehouse)"
                select
                fullWidth
                size="small"
                required
                value={sourceWhId}
                onChange={e => setSourceWhId(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">Select Source Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="Request Date"
                type="date"
                fullWidth
                size="small"
                value={requestDate}
                onChange={e => setRequestDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Product Search & Line Items */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Add Requested Items
          </Typography>

          <Autocomplete
            options={availableProducts}
            getOptionKey={p => typeof p === 'string' ? p : (p.id ? `product-${p.id}` : `${p.name}-${p.sku || ''}`)}
            getOptionLabel={(p) => `${p.name} ${p.sku ? `(${p.sku})` : ''} — Live Stock: ${sourceStockMap[p.id] !== undefined ? sourceStockMap[p.id] : p.current_stock} ${p.unit || 'pcs'}`}
            onChange={(_, val) => handleAddItem(val)}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li key={option.id ? `product-opt-${option.id}` : key} {...rest}>
                  {option.name} {option.sku ? `(${option.sku})` : ''} — Live Stock: {sourceStockMap[option.id] !== undefined ? sourceStockMap[option.id] : option.current_stock} {option.unit || 'pcs'}
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Search product by name or SKU to add..."
                fullWidth
              />
            )}
            sx={{ mb: 2 }}
          />

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Available at Source</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }} align="right">Requested Qty *</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                  <TableCell align="center" sx={{ width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No items added yet. Search and select products above.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 600 }}>{it.name}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>{it.sku || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip label={it.unit} size="small" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: it.available_qty > 0 ? 'success.main' : 'error.main' }}>
                        {it.available_qty} {it.unit}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={it.requested_qty}
                          onChange={e => handleUpdateItem(idx, 'requested_qty', e.target.value)}
                          inputProps={{ min: 0.001, step: it.is_weight_based ? '0.001' : '1' }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Line note"
                          value={it.notes}
                          onChange={e => handleUpdateItem(idx, 'notes', e.target.value)}
                          fullWidth
                        />
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
        </Box>

        {/* General Notes */}
        <TextField
          label="Purpose / Request Notes"
          multiline
          rows={2}
          fullWidth
          size="small"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Stock requirement for upcoming festival weekend."
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit(true)}
            sx={{ fontWeight: 700 }}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit(false)}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
