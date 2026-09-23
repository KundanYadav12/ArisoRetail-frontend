import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Typography, Box,
  Chip, Alert, CircularProgress
} from '@mui/material';
import { X, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function StockRequestApprovalModal({ open, onClose, onUpdated, requestId }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && requestId) {
      setLoading(true);
      setShowRejectBox(false);
      setRejectReason('');
      setNotes('');
      apiFetch(`/api/inventory/stock-requests/${requestId}`)
        .then(r => r.json())
        .then(data => {
          setRequest(data);
          if (data && data.items) {
            setItems(data.items.map(it => ({
              ...it,
              approved_qty: it.approved_qty !== undefined && parseFloat(it.approved_qty) > 0
                ? it.approved_qty
                : Math.min(parseFloat(it.requested_qty || 0), parseFloat(it.available_qty || 0)),
              is_rejected: false
            })));
          }
        })
        .catch(err => {
          console.error(err);
          notify.error('Failed to load stock request details.', 'Error');
        })
        .finally(() => setLoading(false));
    }
  }, [open, requestId]);

  const handleUpdateApprovedQty = (index, val) => {
    const updated = [...items];
    updated[index].approved_qty = val;
    setItems(updated);
  };

  const handleToggleRejectItem = (index) => {
    const updated = [...items];
    updated[index].is_rejected = !updated[index].is_rejected;
    if (updated[index].is_rejected) {
      updated[index].approved_qty = 0;
    } else {
      updated[index].approved_qty = Math.min(
        parseFloat(updated[index].requested_qty || 0),
        parseFloat(updated[index].available_qty || 0)
      );
    }
    setItems(updated);
  };

  const handleApprove = async () => {
    if (items.length === 0) return;

    // Validate quantities
    const approvedPayload = items.map(it => ({
      item_id: it.id,
      menu_item_id: it.menu_item_id,
      approved_qty: it.is_rejected ? 0 : Math.max(0, parseFloat(it.approved_qty || 0)),
      notes: it.notes || ''
    }));

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/inventory/stock-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim(),
          items: approvedPayload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve request');

      notify.success(data.message || 'Stock request approved successfully.', 'Approved');
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify.error(err.message, 'Approval Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectAll = async () => {
    if (!rejectReason.trim()) {
      notify.error('Please enter a reason for rejecting this request.', 'Validation');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/inventory/stock-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject request');

      notify.info('Stock request rejected.', 'Rejected');
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify.error(err.message, 'Rejection Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Review Stock Request {request?.request_number ? `— ${request.request_number}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Approve or adjust requested quantities before dispatching stock.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : !request ? (
          <Alert severity="error">Stock request details could not be found.</Alert>
        ) : (
          <>
            {/* Header Info Card */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>REQUEST ROUTE</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {request.requesting_warehouse_name}
                    </Typography>
                    <ArrowRight size={16} color="#64748b" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                      {request.source_warehouse_name}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>REQUEST DATE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {request.request_date ? new Date(request.request_date).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>REQUESTED BY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    {request.requested_by_name || 'Staff'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>CURRENT STATUS</Typography>
                  <Chip
                    label={(request.status || 'pending').toUpperCase()}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: request.status === 'approved' ? '#dcfce7' : request.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                      color: request.status === 'approved' ? '#15803d' : request.status === 'rejected' ? '#b91c1c' : '#a16207'
                    }}
                  />
                </Box>
              </Box>

              {request.notes && (
                <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Requester Notes: </Typography>
                  <Typography variant="body2" sx={{ display: 'inline', color: '#334155' }}>{request.notes}</Typography>
                </Box>
              )}
            </Box>

            {/* Note on zero physical deduction */}
            <Alert severity="info" sx={{ py: 0.5, fontSize: '0.8rem' }}>
              <strong>Zero Premature Deduction:</strong> Approving this request records the approved quantities. Source warehouse stock will be deducted only when a transfer is dispatched.
            </Alert>

            {/* Items Table */}
            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Requested</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Source Available</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Approved Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row, idx) => {
                    const avail = parseFloat(row.available_qty || 0);
                    const reqQty = parseFloat(row.requested_qty || 0);
                    const isShort = avail < reqQty;

                    return (
                      <TableRow key={row.id || idx} sx={{ opacity: row.is_rejected ? 0.5 : 1 }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: row.is_rejected ? '#94a3b8' : '#0f172a' }}>
                            {row.item_name}
                          </Typography>
                          {row.sku && <Typography variant="caption" sx={{ color: '#64748b' }}>SKU: {row.sku}</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={row.unit || 'pcs'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {reqQty}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={`${avail} ${row.unit || 'pcs'}`}
                            sx={{
                              fontWeight: 700,
                              bgcolor: isShort ? '#fef2f2' : '#f0fdf4',
                              color: isShort ? '#dc2626' : '#16a34a',
                              border: isShort ? '1px solid #fecaca' : '1px solid #bbf7d0'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ width: 140 }}>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: row.unit === 'kg' ? '0.001' : '1' }}
                            value={row.approved_qty}
                            disabled={row.is_rejected || request.status !== 'pending'}
                            onChange={e => handleUpdateApprovedQty(idx, e.target.value)}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {request.status === 'pending' && (
                            <Button
                              size="small"
                              variant={row.is_rejected ? "outlined" : "text"}
                              color={row.is_rejected ? "primary" : "error"}
                              onClick={() => handleToggleRejectItem(idx)}
                              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                            >
                              {row.is_rejected ? 'Restore' : 'Reject Line'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            {/* Approval Notes */}
            {request.status === 'pending' && (
              <TextField
                label="Reviewer Approval / Discrepancy Notes"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Approved 40 pcs due to current Central Warehouse safety stock threshold."
              />
            )}

            {/* Rejection box if triggered */}
            {showRejectBox && (
              <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fca5a5' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#991b1b', mb: 1 }}>
                  Confirm Rejection of Entire Request
                </Typography>
                <TextField
                  label="Reason for Rejection *"
                  size="small"
                  fullWidth
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Stock reserved for upcoming promo; please re-request next week."
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={() => setShowRejectBox(false)}>Cancel</Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    disabled={submitting || !rejectReason.trim()}
                    onClick={handleRejectAll}
                  >
                    Confirm Reject
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Close</Button>
        {request?.status === 'pending' && !showRejectBox && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<XCircle size={16} />}
              onClick={() => setShowRejectBox(true)}
            >
              Reject Request
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircle size={16} />}
              disabled={submitting}
              onClick={handleApprove}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              Approve Request
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
