import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, FormControlLabel, Switch,
  Box, Typography, IconButton
} from '@mui/material';
import { X, Building2 } from 'lucide-react';

export default function WarehouseModal({ open, onClose, onSave, warehouse = null }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name || '');
      setCode(warehouse.code || '');
      setAddress(warehouse.address || '');
      setCity(warehouse.city || '');
      setState(warehouse.state || '');
      setPincode(warehouse.pincode || '');
      setContactPerson(warehouse.contact_person || '');
      setContactNumber(warehouse.contact_number || '');
      setEmail(warehouse.email || '');
      setIsDefault(Boolean(warehouse.is_default));
      setStatus(warehouse.status || 'active');
    } else {
      setName('');
      setCode('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setContactPerson('');
      setContactNumber('');
      setEmail('');
      setIsDefault(false);
      setStatus('active');
    }
  }, [warehouse, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        code: (code || name.substring(0, 4).toUpperCase()).trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        contact_person: contactPerson.trim(),
        contact_number: contactNumber.trim(),
        email: email.trim(),
        is_default: isDefault ? 1 : 0,
        status
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ zIndex: 1400 }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Building2 size={20} color="#0284c7" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {warehouse ? 'Edit Warehouse / Outlet' : 'Add New Warehouse / Outlet'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Warehouse / Branch Name"
                fullWidth
                size="small"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Kandivali Retail Outlet"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Code"
                fullWidth
                size="small"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="WH-KAND"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Contact Person"
                fullWidth
                size="small"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="Manager name"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Contact Phone"
                fullWidth
                size="small"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="9820012345"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                size="small"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="outlet@example.com"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Premises / Address"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street address, shop number, area"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="City"
                fullWidth
                size="small"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="State"
                fullWidth
                size="small"
                value={state}
                onChange={e => setState(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Pincode"
                fullWidth
                size="small"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
              <FormControlLabel
                control={<Switch checked={isDefault} onChange={e => setIsDefault(e.target.checked)} color="primary" />}
                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Set as Primary / Default Warehouse</Typography>}
              />
              <FormControlLabel
                control={<Switch checked={status === 'active'} onChange={e => setStatus(e.target.checked ? 'active' : 'inactive')} color="success" />}
                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active</Typography>}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting || !name.trim()} sx={{ fontWeight: 700 }}>
            {submitting ? 'Saving...' : (warehouse ? 'Update Warehouse' : 'Create Warehouse')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
