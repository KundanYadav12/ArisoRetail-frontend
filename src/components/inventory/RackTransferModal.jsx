import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Grid, Box, Typography, Alert, CircularProgress
} from '@mui/material';
import { ArrowRightLeft, X, CheckCircle, Package } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function RackTransferModal({
  open,
  onClose,
  onSuccess,
  warehouses = [],
  defaultWarehouseId = '',
  initialSourceRackId = null,
  initialProductId = null
}) {
  const { notify } = useNotify();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState(null);

  const [warehouseId, setWarehouseId] = useState('');
  const [racks, setRacks] = useState([]);
  const [sourceRackId, setSourceRackId] = useState('');
  const [destinationRackId, setDestinationRackId] = useState('');
  const [rackProducts, setRackProducts] = useState([]);
  const [menuItemId, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // 1. Initialize warehouse
  useEffect(() => {
    if (open) {
      const whId = defaultWarehouseId || (warehouses[0]?.id ? String(warehouses[0].id) : '');
      setWarehouseId(whId);
      setError(null);
      setQuantity('');
      setNotes('');
    }
  }, [open, defaultWarehouseId, warehouses]);

  // 2. Load racks when warehouse changes
  useEffect(() => {
    if (!warehouseId) {
      setRacks([]);
      return;
    }
    const fetchRacks = async () => {
      try {
        const res = await apiFetch(`/api/inventory/racks?warehouse_id=${warehouseId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setRacks(data);
            if (initialSourceRackId && data.some(r => String(r.id) === String(initialSourceRackId))) {
              setSourceRackId(String(initialSourceRackId));
            } else if (data.length > 0) {
              setSourceRackId(String(data[0].id));
            }
          }
        }
      } catch (err) {
        console.error('Fetch racks error:', err);
      }
    };
    fetchRacks();
  }, [warehouseId, initialSourceRackId]);

  // 3. Load products present in source rack
  useEffect(() => {
    if (!sourceRackId) {
      setRackProducts([]);
      setMenuItemId('');
      return;
    }
    const fetchProductsInRack = async () => {
      try {
        setLoadingProducts(true);
        const res = await apiFetch(`/api/inventory/racks/${sourceRackId}/products`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setRackProducts(data);
            if (initialProductId && data.some(p => String(p.menu_item_id) === String(initialProductId))) {
              setMenuItemId(String(initialProductId));
            } else if (data.length > 0) {
              setMenuItemId(String(data[0].menu_item_id));
            } else {
              setMenuItemId('');
            }
          }
        }
      } catch (err) {
        console.error('Fetch rack products error:', err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProductsInRack();
  }, [sourceRackId, initialProductId]);

  const selectedProduct = rackProducts.find(p => String(p.menu_item_id) === String(menuItemId));
  const maxAvailableStock = selectedProduct ? parseFloat(selectedProduct.current_stock || 0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!warehouseId) {
      setError('Please select a warehouse.');
      return;
    }
    if (!sourceRackId) {
      setError('Please select a source rack.');
      return;
    }
    if (!destinationRackId) {
      setError('Please select a destination rack.');
      return;
    }
    if (sourceRackId === destinationRackId) {
      setError('Source and destination rack cannot be the same.');
      return;
    }
    if (!menuItemId) {
      setError('Please select a product to transfer.');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid transfer quantity greater than 0.');
      return;
    }
    if (qty > maxAvailableStock) {
      setError(`Cannot transfer ${qty} units. Maximum stock available in source rack is ${maxAvailableStock}.`);
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/inventory/racks/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: parseInt(warehouseId, 10),
          source_rack_id: parseInt(sourceRackId, 10),
          destination_rack_id: parseInt(destinationRackId, 10),
          menu_item_id: parseInt(menuItemId, 10),
          quantity: qty,
          notes: notes || 'Internal Rack Transfer'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Transfer failed.');
      }

      notify.success(`Moved ${qty} unit(s) successfully! Total warehouse stock unchanged.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.main', display: 'flex' }}>
            <ArrowRightLeft size={22} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Internal Rack-to-Rack Transfer
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Relocate inventory inside the warehouse without affecting total stock
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} size="small" sx={{ minWidth: 36, p: 0.5 }}>
          <X size={20} />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Warehouse</InputLabel>
                <Select
                  value={warehouseId}
                  label="Warehouse"
                  onChange={(e) => setWarehouseId(e.target.value)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={String(w.id)}>
                      {w.name} ({w.code || `WH-${w.id}`})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Source Rack</InputLabel>
                <Select
                  value={sourceRackId}
                  label="Source Rack"
                  onChange={(e) => setSourceRackId(e.target.value)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
                >
                  {racks.map(r => (
                    <MenuItem key={r.id} value={String(r.id)}>
                      {r.rack_code} — {r.rack_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Destination Rack</InputLabel>
                <Select
                  value={destinationRackId}
                  label="Destination Rack"
                  onChange={(e) => setDestinationRackId(e.target.value)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
                >
                  {racks
                    .filter(r => String(r.id) !== String(sourceRackId))
                    .map(r => (
                      <MenuItem key={r.id} value={String(r.id)}>
                        {r.rack_code} — {r.rack_name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              {loadingProducts ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Loading items in selected source rack...
                  </Typography>
                </Box>
              ) : rackProducts.length === 0 ? (
                <Alert severity="warning">
                  No products with positive stock currently found in this source rack.
                </Alert>
              ) : (
                <FormControl fullWidth size="small" required>
                  <InputLabel>Product to Move</InputLabel>
                  <Select
                    value={menuItemId}
                    label="Product to Move"
                    onChange={(e) => setMenuItemId(e.target.value)}
                    MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
                  >
                    {rackProducts.map(p => (
                      <MenuItem key={p.menu_item_id} value={String(p.menu_item_id)}>
                        {p.product_name} ({p.current_stock} {p.unit || 'pcs'} available)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                required
                type="number"
                slotProps={{ htmlInput: { min: '0.001', step: 'any', max: maxAvailableStock } }}
                label="Transfer Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                helperText={selectedProduct ? `Available in source rack: ${maxAvailableStock} ${selectedProduct.unit || 'pcs'}` : ''}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Audit Verification:
                </Typography>
                <Typography variant="body2" fontWeight="medium" color="success.main">
                  Total Warehouse Stock will remain constant.
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Transfer Reason / Notes"
                placeholder="e.g. Shelf consolidation, seasonal re-slotting..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || rackProducts.length === 0 || !quantity}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowRightLeft size={18} />}
          >
            Move Stock
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
