import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Grid, Box, Typography, Alert, CircularProgress
} from '@mui/material';
import { MapPin, X, Save } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function RackManagementModal({
  open,
  onClose,
  onSuccess,
  rack = null,
  warehouses = [],
  defaultWarehouseId = ''
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    warehouse_id: '',
    rack_code: '',
    rack_name: '',
    zone: '',
    shelf: '',
    bin: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (rack) {
      setFormData({
        warehouse_id: rack.warehouse_id || '',
        rack_code: rack.rack_code || '',
        rack_name: rack.rack_name || '',
        zone: rack.zone || '',
        shelf: rack.shelf || '',
        bin: rack.bin || '',
        status: rack.status || 'active',
        notes: rack.notes || ''
      });
    } else {
      setFormData({
        warehouse_id: defaultWarehouseId || (warehouses[0]?.id || ''),
        rack_code: '',
        rack_name: '',
        zone: '',
        shelf: '',
        bin: '',
        status: 'active',
        notes: ''
      });
    }
    setError(null);
  }, [rack, defaultWarehouseId, warehouses, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.warehouse_id) {
      setError('Please select a warehouse.');
      return;
    }
    if (!formData.rack_code.trim()) {
      setError('Rack code is required (e.g. RCK-A01).');
      return;
    }
    if (!formData.rack_name.trim()) {
      setError('Rack name is required.');
      return;
    }

    try {
      setLoading(true);
      const url = rack ? `/api/inventory/racks/${rack.id}` : '/api/inventory/racks';
      const method = rack ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.error) throw new Error(res.error);

      notify?.(rack ? 'Rack updated successfully' : 'Rack created successfully', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save rack.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', display: 'flex' }}>
            <MapPin size={22} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {rack ? 'Edit Warehouse Rack' : 'Add New Warehouse Rack'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure shelf, zone, and bin for exact location tracking
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
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Warehouse</InputLabel>
                <Select
                  value={formData.warehouse_id}
                  label="Warehouse"
                  onChange={(e) => handleChange('warehouse_id', e.target.value)}
                  disabled={Boolean(rack)}
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code || `WH-${w.id}`})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                required
                label="Rack Code"
                placeholder="e.g. RCK-A01"
                value={formData.rack_code}
                onChange={(e) => handleChange('rack_code', e.target.value.toUpperCase())}
                helperText="Unique code within this warehouse"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                required
                label="Rack Name"
                placeholder="e.g. Aisle 1 - Dry Goods"
                value={formData.rack_name}
                onChange={(e) => handleChange('rack_name', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Zone"
                placeholder="e.g. Zone A"
                value={formData.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Shelf"
                placeholder="e.g. Shelf 2"
                value={formData.shelf}
                onChange={(e) => handleChange('shelf', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Bin"
                placeholder="e.g. Bin B04"
                value={formData.bin}
                onChange={(e) => handleChange('bin', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Notes / Location Guidelines"
                placeholder="Specific instructions, max capacity, or item category guidelines..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
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
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
          >
            {rack ? 'Update Rack' : 'Create Rack'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
