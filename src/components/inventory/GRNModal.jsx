import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, Typography, Box, Paper, Chip,
  Alert, CircularProgress, Divider, IconButton
} from '@mui/material';
import { X, PackageCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

/**
 * GRNModal — Goods Received Note
 *
 * Opens from a Purchase Order to receive goods.
 * Shows: PO items with Ordered Qty, Previously Received, and "Now Receiving" input.
 * Supports: accepted_qty, rejected_qty, damaged_qty per row.
 * Validates: total accepted+rejected+damaged = received, total received ≤ ordered.
 * On submit: POST /api/inventory/purchases/grns — increments warehouse stock (accepted_qty only).
 */
export default function GRNModal({ open, onClose, onCreated, purchaseOrder }) {
  const notify = useNotify();

  const [grnDate, setGrnDate] = useState(() => getISTDateString());
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPO, setLoadingPO] = useState(false);

  useEffect(() => {
    if (!open || !purchaseOrder) return;

    setGrnDate(getISTDateString());
    setVehicleNumber('');
    setDriverName('');
    setInvoiceNumber('');
    setNotes('');

    // Load full PO detail to get items with received_qty
    setLoadingPO(true);
    apiFetch(`/api/inventory/purchases/orders/${purchaseOrder.id}`)
      .then(r => r.json())
      .then(po => {
        const poItems = po.items || [];
        setRows(poItems.map(item => {
          const orderedQty = parseFloat(item.quantity || 0);
          const previouslyReceived = parseFloat(item.received_qty || 0);
          const pendingQty = Math.max(0, orderedQty - previouslyReceived);
          return {
            po_item_id: item.id,
            menu_item_id: item.menu_item_id,
            item_name: item.item_name,
            unit: item.unit || 'pcs',
            ordered_qty: orderedQty,
            previously_received: previouslyReceived,
            pending_qty: pendingQty,
            received_qty: pendingQty,       // default: full pending qty
            accepted_qty: pendingQty,       // default: all accepted
            rejected_qty: 0,
            damaged_qty: 0,
            rate: parseFloat(item.rate || 0),
            tax_rate: parseFloat(item.tax_rate || 0),
            batch_number: '',
            expiry_date: ''
          };
        }));
      })
      .catch(err => {
        console.error('Failed to load PO:', err);
        notify.error('Failed to load Purchase Order details.', 'Error');
      })
      .finally(() => setLoadingPO(false));
  }, [open, purchaseOrder]);

  const handleUpdateRow = (index, field, value) => {
    const updated = [...rows];
    const row = { ...updated[index], [field]: parseFloat(value) || 0 };

    // Auto-recalc accepted = received - rejected - damaged
    if (field === 'received_qty') {
      const recv = parseFloat(value) || 0;
      row.accepted_qty = Math.max(0, recv - row.rejected_qty - row.damaged_qty);
    } else if (field === 'rejected_qty' || field === 'damaged_qty') {
      row.accepted_qty = Math.max(0, row.received_qty - row.rejected_qty - row.damaged_qty);
    }

    updated[index] = row;
    setRows(updated);
  };

  const validateRows = () => {
    for (const row of rows) {
      if (row.received_qty < 0) return `Received qty cannot be negative for ${row.item_name}.`;
      if (row.received_qty > row.pending_qty + 0.001) {
        return `Over-receiving not allowed for "${row.item_name}". Pending: ${row.pending_qty} ${row.unit}, Now receiving: ${row.received_qty}.`;
      }
      if (row.accepted_qty < 0 || row.rejected_qty < 0 || row.damaged_qty < 0) {
        return `Accepted/Rejected/Damaged qty cannot be negative for "${row.item_name}".`;
      }
      const sumCheck = row.accepted_qty + row.rejected_qty + row.damaged_qty;
      if (Math.abs(sumCheck - row.received_qty) > 0.001) {
        return `For "${row.item_name}": Accepted (${row.accepted_qty}) + Rejected (${row.rejected_qty}) + Damaged (${row.damaged_qty}) must equal Received (${row.received_qty}).`;
      }
    }
    const anyReceiving = rows.some(r => r.received_qty > 0);
    if (!anyReceiving) return 'Please enter at least one received quantity.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateRows();
    if (validationError) {
      notify.error(validationError, 'Validation Error');
      return;
    }

    // Only include rows where we're actually receiving something
    const itemsToReceive = rows.filter(r => r.received_qty > 0).map(r => ({
      menu_item_id: r.menu_item_id,
      item_name: r.item_name,
      unit: r.unit,
      received_qty: r.received_qty,
      accepted_qty: r.accepted_qty,
      rejected_qty: r.rejected_qty,
      damaged_qty: r.damaged_qty,
      rate: r.rate,
      tax_rate: r.tax_rate,
      batch_number: r.batch_number || null,
      expiry_date: r.expiry_date || null
    }));

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/inventory/purchases/grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_order_id: purchaseOrder.id,
          grn_date: grnDate,
          vehicle_number: vehicleNumber || null,
          driver_name: driverName || null,
          invoice_number: invoiceNumber || null,
          notes: notes || null,
          items: itemsToReceive
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create GRN');

      notify.success(`GRN ${data.grn?.grn_number} created. Stock updated.`, 'Goods Received');
      onCreated && onCreated(data.grn);
      onClose();
    } catch (err) {
      notify.error(err.message, 'GRN Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!purchaseOrder) return null;

  const totalAccepted = rows.reduce((s, r) => s + r.accepted_qty, 0);
  const totalRejected = rows.reduce((s, r) => s + r.rejected_qty, 0);
  const totalDamaged = rows.reduce((s, r) => s + r.damaged_qty, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '95vh' } }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PackageCheck size={22} color="#0284c7" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Create Goods Received Note (GRN)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Against PO: <strong>{purchaseOrder.po_number}</strong> — Supplier: {purchaseOrder.supplier_name || purchaseOrder.supplier_company}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        {loadingPO ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* GRN Header Fields */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="GRN Date"
                  type="date"
                  value={grnDate}
                  onChange={e => setGrnDate(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Supplier Invoice No."
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Supplier's invoice reference"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Vehicle Number"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g. MH12AB1234"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Driver Name"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Notes / Remarks"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={1}
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <strong>Stock increases by Accepted Qty only.</strong> Rejected and Damaged quantities are recorded but do not enter inventory.
            </Alert>

            {/* Items Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 60 }}>Unit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 90 }}>Ordered</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 100 }}>Prev. Rcvd</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 90, color: '#f59e0b' }}>Pending</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 120, bgcolor: '#eff6ff' }}>Now Receiving</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 110, bgcolor: '#f0fdf4' }}>Accepted ✓</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 110, bgcolor: '#fef9c3' }}>Rejected ✗</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 110, bgcolor: '#fef2f2' }}>Damaged ⚠</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 110 }}>Batch No.</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Expiry</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={row.menu_item_id}
                      sx={{
                        bgcolor: row.pending_qty <= 0 ? '#f9f9f9' : 'inherit',
                        '&:hover': { bgcolor: '#f8fafc' }
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
                        <Typography variant="caption" color="text.secondary">₹{row.rate.toFixed(2)}/{row.unit}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.unit} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.ordered_qty}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={row.previously_received > 0 ? 'success.main' : 'text.secondary'}>
                          {row.previously_received}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: row.pending_qty > 0 ? '#f59e0b' : '#10b981' }}
                        >
                          {row.pending_qty <= 0 ? '✓ Full' : row.pending_qty}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#eff6ff' }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.received_qty}
                          onChange={e => handleUpdateRow(i, 'received_qty', e.target.value)}
                          inputProps={{ min: 0, max: row.pending_qty, step: 0.001 }}
                          disabled={row.pending_qty <= 0}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f0fdf4' }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.accepted_qty}
                          onChange={e => handleUpdateRow(i, 'accepted_qty', e.target.value)}
                          inputProps={{ min: 0, step: 0.001 }}
                          disabled={row.pending_qty <= 0}
                          sx={{ width: 95 }}
                        />
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#fef9c3' }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.rejected_qty}
                          onChange={e => handleUpdateRow(i, 'rejected_qty', e.target.value)}
                          inputProps={{ min: 0, step: 0.001 }}
                          disabled={row.pending_qty <= 0}
                          sx={{ width: 95 }}
                        />
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#fef2f2' }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.damaged_qty}
                          onChange={e => handleUpdateRow(i, 'damaged_qty', e.target.value)}
                          inputProps={{ min: 0, step: 0.001 }}
                          disabled={row.pending_qty <= 0}
                          sx={{ width: 95 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={row.batch_number}
                          onChange={e => {
                            const updated = [...rows];
                            updated[i] = { ...updated[i], batch_number: e.target.value };
                            setRows(updated);
                          }}
                          placeholder="Optional"
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={row.expiry_date}
                          onChange={e => {
                            const updated = [...rows];
                            updated[i] = { ...updated[i], expiry_date: e.target.value };
                            setRows(updated);
                          }}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Bar */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CheckCircle size={16} color="#10b981" />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>
                      Accepted: {totalAccepted.toFixed(3)} {rows[0]?.unit || ''}
                    </Typography>
                  </Box>
                </Grid>
                <Grid>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                    Rejected: {totalRejected.toFixed(3)}
                  </Typography>
                </Grid>
                <Grid>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>
                    Damaged: {totalDamaged.toFixed(3)}
                  </Typography>
                </Grid>
                <Grid>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Stock Increase: <strong>+{totalAccepted.toFixed(3)}</strong>
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={submitting}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || loadingPO || rows.length === 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <PackageCheck size={16} />}
          sx={{ fontWeight: 700, minWidth: 180 }}
        >
          {submitting ? 'Creating GRN...' : 'Confirm Receipt & Create GRN'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
