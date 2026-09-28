import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, IconButton, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Grid, Chip, Divider, CircularProgress, Alert
} from '@mui/material';
import { X, Truck, Calendar, User, Phone, MapPin, CheckCircle, Package } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import { getISTDateString } from '../utils/dateUtils';

export default function DeliveryChallanModal({
  open,
  onClose,
  salesOrder,
  onCreated
}) {
  const { notify } = useNotify();

  const [challanDate, setChallanDate] = useState(() => getISTDateString());
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && salesOrder) {
      setChallanDate(getISTDateString());
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      setDeliveryAddress(salesOrder.shipping_address || salesOrder.billing_address || salesOrder.customer_address || '');
      setNotes(`Delivery Challan for SO #${salesOrder.unique_order_number || salesOrder.id}`);

      // Initialize line items with pending delivery quantity
      const orderItems = salesOrder.items || [];
      const initialized = orderItems.map(oi => {
        const ordered = oi.item_weight !== null ? parseFloat(oi.item_weight) : parseFloat(oi.quantity);
        const delivered = parseFloat(oi.delivered_qty || 0);
        const pending = Math.max(0, ordered - delivered);
        return {
          order_item_id: oi.id,
          menu_item_id: oi.menu_item_id,
          name: oi.name || oi.item_name,
          unit: oi.weight_unit || oi.unit || (oi.item_weight !== null ? 'KG' : 'PCS'),
          ordered_qty: ordered,
          already_delivered_qty: delivered,
          pending_qty: pending,
          delivery_qty: pending > 0 ? pending : 0,
          notes: ''
        };
      });
      setItems(initialized);
    }
  }, [open, salesOrder]);

  if (!salesOrder) return null;

  const handleQtyChange = (index, val) => {
    const parsed = parseFloat(val);
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        delivery_qty: isNaN(parsed) ? '' : parsed
      };
      return copy;
    });
  };

  const handleSetMax = (index) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        delivery_qty: copy[index].pending_qty
      };
      return copy;
    });
  };

  const handleSetZero = (index) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        delivery_qty: 0
      };
      return copy;
    });
  };

  const handleSubmit = async () => {
    // Validate delivery quantities
    const itemsToDeliver = items.filter(it => parseFloat(it.delivery_qty) > 0);

    if (itemsToDeliver.length === 0) {
      notify.error('At least one item must have a delivery quantity > 0.', 'Validation');
      return;
    }

    for (const it of itemsToDeliver) {
      const qty = parseFloat(it.delivery_qty);
      if (qty > it.pending_qty + 0.001) {
        notify.error(`Cannot deliver ${qty} ${it.unit} of "${it.name}". Maximum pending is ${it.pending_qty}.`, 'Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        challan_data: {
          sales_order_id: salesOrder.id,
          warehouse_id: salesOrder.warehouse_id || null,
          party_id: salesOrder.customer_id || null,
          party_name: salesOrder.customer_name || 'Customer',
          party_phone: salesOrder.customer_phone || null,
          delivery_address: deliveryAddress.trim() || null,
          challan_date: challanDate,
          vehicle_number: vehicleNumber.trim() || null,
          driver_name: driverName.trim() || null,
          driver_phone: driverPhone.trim() || null,
          notes: notes.trim() || null
        },
        items: itemsToDeliver.map(it => ({
          order_item_id: it.order_item_id,
          delivered_qty: parseFloat(it.delivery_qty),
          notes: it.notes || null
        }))
      };

      const res = await apiFetch('/api/delivery-challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        notify.success(`Delivery Challan #${data.challanNumber} generated successfully!`, 'Goods Dispatched');
        onCreated && onCreated(data);
        onClose();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to create Delivery Challan.', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'An error occurred while creating Delivery Challan.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDelivering = items.reduce((acc, it) => acc + (parseFloat(it.delivery_qty) || 0), 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '92vh' } } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: '#eff6ff', p: 1, borderRadius: 2, display: 'flex' }}>
            <Truck size={22} color="#2563eb" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Create Delivery Challan</Typography>
            <Typography variant="caption" color="text.secondary">
              For Sales Order #{salesOrder.unique_order_number || salesOrder.id} • Party: {salesOrder.customer_name || 'Customer'}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Dispatch Details Header */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Challan Date *"
                  value={challanDate}
                  onChange={e => setChallanDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Vehicle / Transport No."
                  placeholder="e.g. MH-12-AB-1234"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Driver / Carrier Name"
                  placeholder="e.g. Ramesh Singh"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Driver Phone"
                  placeholder="10-digit mobile number"
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Delivery / Shipping Address"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Dispatch Notes / Instructions"
                  placeholder="e.g. Handle with care, deliver before 5 PM..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Items to Dispatch Table */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Package size={16} color="#0284c7" /> Dispatched Items (Partial Quantity Supported)
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Total Delivering: <b style={{ color: '#2563eb' }}>{totalDelivering.toFixed(2)}</b>
              </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '4%' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '36%' }}>Item Description</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '15%' }}>Ordered</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '15%' }}>Delivered</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '15%' }}>Pending</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: '15%' }}>Deliver Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it, idx) => {
                    const isFullyDelivered = it.pending_qty <= 0;
                    return (
                      <TableRow key={it.order_item_id} hover sx={{ bgcolor: isFullyDelivered ? '#f8fafc' : 'inherit' }}>
                        <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{it.name}</Typography>
                          <Typography variant="caption" color="text.secondary">Unit: {it.unit}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.ordered_qty} {it.unit}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>{it.already_delivered_qty} {it.unit}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: it.pending_qty > 0 ? '#d97706' : '#64748b', fontWeight: 700 }}>
                            {it.pending_qty} {it.unit}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {isFullyDelivered ? (
                            <Chip size="small" label="Delivered" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                              <TextField
                                size="small"
                                type="number"
                                slotProps={{ htmlInput: { min: 0, max: it.pending_qty, step: 'any' } }}
                                value={it.delivery_qty}
                                onChange={e => handleQtyChange(idx, e.target.value)}
                                sx={{ width: 100 }}
                              />
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleSetMax(idx)}
                                sx={{ minWidth: 40, px: 0.5, fontSize: '0.7rem', fontWeight: 700 }}
                              >
                                Max
                              </Button>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting || totalDelivering <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Truck size={16} />}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {submitting ? 'Generating Challan...' : `Dispatch & Create Challan (${totalDelivering.toFixed(2)} Items)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
