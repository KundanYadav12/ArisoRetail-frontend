import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, FormControlLabel, Switch,
  Box, Typography, IconButton, MenuItem
} from '@mui/material';
import { X, Users } from 'lucide-react';

export default function SupplierModal({ open, onClose, onSave, supplier = null }) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setCompanyName(supplier.company_name || '');
      setMobile(supplier.mobile || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setCity(supplier.city || '');
      setState(supplier.state || '');
      setPincode(supplier.pincode || '');
      setGstNumber(supplier.gst_number || '');
      setPanNumber(supplier.pan_number || '');
      setOpeningBalance(supplier.opening_balance !== undefined ? String(supplier.opening_balance) : '0');
      setPaymentTerms(supplier.payment_terms || 'Net 30');
      setStatus(supplier.status || 'active');
      setNotes(supplier.notes || '');
    } else {
      setName('');
      setCompanyName('');
      setMobile('');
      setEmail('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setGstNumber('');
      setPanNumber('');
      setOpeningBalance('0');
      setPaymentTerms('Net 30');
      setStatus('active');
      setNotes('');
    }
  }, [supplier, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        company_name: companyName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gst_number: gstNumber.trim().toUpperCase(),
        pan_number: panNumber.trim().toUpperCase(),
        opening_balance: parseFloat(openingBalance) || 0,
        payment_terms: paymentTerms,
        status,
        notes: notes.trim()
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
          <Users size={20} color="#0d9488" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Supplier / Contact Name"
                fullWidth
                size="small"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Vendor or representative name"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Company / Firm Name"
                fullWidth
                size="small"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Metro Wholesale Traders"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Mobile Number"
                fullWidth
                size="small"
                required
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="10-digit mobile"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                size="small"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vendor@example.com"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="GSTIN"
                fullWidth
                size="small"
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value.toUpperCase())}
                placeholder="27AABCM1234F1Z1"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="PAN Number"
                fullWidth
                size="small"
                value={panNumber}
                onChange={e => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Billing / Store Address"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={address}
                onChange={e => setAddress(e.target.value)}
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Opening Balance (₹)"
                type="number"
                fullWidth
                size="small"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                disabled={Boolean(supplier)}
                helperText={supplier ? 'Opening balance is locked after creation' : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Payment Terms"
                select
                fullWidth
                size="small"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
              >
                <MenuItem value="Immediate">Immediate / Advance</MenuItem>
                <MenuItem value="Net 7">Net 7 Days</MenuItem>
                <MenuItem value="Net 15">Net 15 Days</MenuItem>
                <MenuItem value="Net 30">Net 30 Days</MenuItem>
                <MenuItem value="Net 45">Net 45 Days</MenuItem>
                <MenuItem value="Net 60">Net 60 Days</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Internal Notes"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Bank account details, special terms, etc."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={status === 'active'} onChange={e => setStatus(e.target.checked ? 'active' : 'inactive')} color="success" />}
                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Active Vendor</Typography>}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={submitting || !name.trim() || !mobile.trim()} sx={{ fontWeight: 700 }}>
            {submitting ? 'Saving...' : (supplier ? 'Update Supplier' : 'Create Supplier')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
