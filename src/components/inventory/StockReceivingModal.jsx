import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Typography, Box,
  Chip, Alert, CircularProgress, Paper
} from '@mui/material';
import { X, PackageCheck, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function StockReceivingModal({ open, onClose, onReceived, transferId }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const [items, setItems] = useState([]);
  const [receivingNotes, setReceivingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && transferId) {
      setLoading(true);
      setReceivingNotes('');
      apiFetch(`/api/inventory/stock-transfers/${transferId}`)
        .then(r => r.json())
        .then(data => {
          setTransfer(data);
          if (data && data.items) {
            setItems(data.items.map(it => ({
              ...it,
              received_qty: it.received_qty !== undefined && parseFloat(it.received_qty) > 0
                ? it.received_qty
                : it.sent_qty,
              damaged_qty: it.damaged_qty || 0,
              line_notes: it.notes || ''
            })));
          }
        })
        .catch(err => {
          console.error(err);
          notify.error('Failed to load transfer details.', 'Error');
        })
        .finally(() => setLoading(false));
    }
  }, [open, transferId]);

  const handleUpdateQty = (index, field, val) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  const handleReceive = async () => {
    if (items.length === 0) return;

    for (const it of items) {
      const rec = parseFloat(it.received_qty || 0);
      const dmg = parseFloat(it.damaged_qty || 0);
      const sent = parseFloat(it.sent_qty || 0);

      if (rec < 0 || dmg < 0) {
        notify.error(`Quantities cannot be negative for "${it.item_name}".`, 'Validation');
        return;
      }
      if (rec + dmg > sent) {
        notify.error(`Total received + damaged (${rec + dmg}) cannot exceed sent quantity (${sent}) for "${it.item_name}".`, 'Discrepancy');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        receiving_notes: receivingNotes.trim(),
        items: items.map(it => ({
          item_id: it.id,
          received_qty: parseFloat(it.received_qty || 0),
          damaged_qty: parseFloat(it.damaged_qty || 0),
          notes: it.line_notes || ''
        }))
      };

      const res = await apiFetch(`/api/inventory/stock-transfers/${transferId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete receiving');

      notify.success('Goods received successfully! Destination warehouse stock updated.', 'Stock Received');
      if (onReceived) onReceived(data.transfer);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Receiving Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PackageCheck size={22} color="#16a34a" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Receive Stock Transfer {transfer?.transfer_number ? `— ${transfer.transfer_number}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Inspect delivered goods, verify quantities, and log any damages or transit loss.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : !transfer ? (
          <Alert severity="error">Transfer details could not be found.</Alert>
        ) : (
          <>
            {/* Header Route Card */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>TRANSFER ROUTE</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b' }}>
                      {transfer.source_warehouse_name}
                    </Typography>
                    <ArrowRight size={16} color="#64748b" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      {transfer.destination_warehouse_name}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>DISPATCH DATE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>DISPATCHED BY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {transfer.created_by_name || 'Staff'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>STATUS</Typography>
                  <Chip
                    label={(transfer.status || 'in_transit').toUpperCase()}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: transfer.status === 'received' ? '#dcfce7' : '#e0f2fe',
                      color: transfer.status === 'received' ? '#15803d' : '#0369a1'
                    }}
                  />
                </Box>
              </Box>

              {transfer.notes && (
                <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Dispatch Notes / Transporter: </Typography>
                  <Typography variant="body2" sx={{ display: 'inline', color: '#334155' }}>{transfer.notes}</Typography>
                </Box>
              )}
            </Box>

            {/* Explanatory Banner */}
            <Alert severity="success" icon={<ShieldCheck size={20} />} sx={{ py: 0.5, fontSize: '0.82rem' }}>
              <strong>Stock Inflow:</strong> Accepted quantity will immediately increase inventory in <strong>{transfer.destination_warehouse_name}</strong>. Damaged items will be recorded in the Stock Ledger under <strong>DAMAGE</strong> for accounting.
            </Alert>

            {/* Receiving Inspection Table */}
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Sent Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Received Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Damaged Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Discrepancy / Inspection Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row, idx) => {
                    const sent = parseFloat(row.sent_qty || 0);
                    const rec = parseFloat(row.received_qty || 0);
                    const dmg = parseFloat(row.damaged_qty || 0);
                    const isDiscrepancy = (rec + dmg) < sent;

                    return (
                      <TableRow key={row.id || idx}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
                          {row.batch_number && (
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              Batch: {row.batch_number}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={row.unit || 'pcs'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>
                          {sent}
                        </TableCell>
                        <TableCell align="right" sx={{ width: 130 }}>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, max: sent, step: row.unit === 'kg' ? '0.001' : '1' }}
                            value={row.received_qty}
                            disabled={transfer.status === 'received'}
                            onChange={e => handleUpdateQty(idx, 'received_qty', e.target.value)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ width: 130 }}>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, max: sent, step: row.unit === 'kg' ? '0.001' : '1' }}
                            value={row.damaged_qty}
                            disabled={transfer.status === 'received'}
                            onChange={e => handleUpdateQty(idx, 'damaged_qty', e.target.value)}
                            sx={{ width: 100 }}
                            error={dmg > 0}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder={isDiscrepancy ? "Reason for shortfall..." : "Optional condition note"}
                            value={row.line_notes}
                            disabled={transfer.status === 'received'}
                            onChange={e => handleUpdateQty(idx, 'line_notes', e.target.value)}
                            inputProps={{ style: { fontSize: '0.8rem', padding: '4px 8px' } }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>

            {/* Receiving Notes */}
            {transfer.status !== 'received' && (
              <TextField
                label="Overall Goods Receiving Notes / Receiver Signature"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={receivingNotes}
                onChange={e => setReceivingNotes(e.target.value)}
                placeholder="e.g. Consignment arrived in good physical condition. Verified seal and barcode tags."
              />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Close</Button>
        {transfer?.status !== 'received' && (
          <Button
            variant="contained"
            color="success"
            startIcon={<PackageCheck size={18} />}
            disabled={submitting || items.length === 0}
            onClick={handleReceive}
            sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
          >
            Confirm Goods Receiving
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
