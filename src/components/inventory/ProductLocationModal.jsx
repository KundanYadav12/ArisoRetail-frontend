import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper, Chip,
  CircularProgress, Alert, Tabs, Tab, TextField, InputAdornment
} from '@mui/material';
import { MapPin, X, History, Package, Search, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function ProductLocationModal({
  open,
  onClose,
  product = null
}) {
  const [activeTab, setActiveTab] = useState(0); // 0: Locations, 1: Audit Timeline
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineSearch, setTimelineSearch] = useState('');

  useEffect(() => {
    if (open && product?.id) {
      fetchProductTimeline();
    } else {
      setTimelineData(null);
    }
  }, [open, product]);

  const fetchProductTimeline = async () => {
    if (!product?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/inventory/products/${product.id}/timeline`);
      if (res.error) throw new Error(res.error);
      setTimelineData(res);
    } catch (err) {
      console.error('Fetch product locations/timeline error:', err);
      setError(err.message || 'Failed to retrieve location details.');
    } finally {
      setLoading(false);
    }
  };

  const locations = timelineData?.current_locations || [];
  const transactions = timelineData?.transactions || [];

  const filteredTransactions = transactions.filter(t => {
    if (!timelineSearch.trim()) return true;
    const s = timelineSearch.toLowerCase();
    return (
      (t.transaction_type && t.transaction_type.toLowerCase().includes(s)) ||
      (t.reference_number && t.reference_number.toLowerCase().includes(s)) ||
      (t.source_rack_code && t.source_rack_code.toLowerCase().includes(s)) ||
      (t.dest_rack_code_resolved && t.dest_rack_code_resolved.toLowerCase().includes(s)) ||
      (t.user_name && t.user_name.toLowerCase().includes(s))
    );
  });

  const totalRackStock = locations.reduce((acc, loc) => acc + parseFloat(loc.current_stock || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', display: 'flex' }}>
            <MapPin size={22} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {product?.name || 'Product Stock Locations'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              SKU: {product?.sku || 'N/A'} • Barcode: {product?.barcode || 'N/A'} • Total System Stock: {product?.current_stock ?? '0'} {product?.unit || 'pcs'}
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} size="small" sx={{ minWidth: 36, p: 0.5 }}>
          <X size={20} />
        </Button>
      </DialogTitle>

      <Box sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab
            icon={<MapPin size={16} />}
            iconPosition="start"
            label={`Storage Locations (${locations.length})`}
          />
          <Tab
            icon={<History size={16} />}
            iconPosition="start"
            label={`Movement Timeline (${transactions.length})`}
          />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1.5 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Retrieving exact locations and movement ledger...
            </Typography>
          </Box>
        ) : activeTab === 0 ? (
          <Box>
            {/* Summary Header */}
            <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Stock Stored Across Racks</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  {totalRackStock.toLocaleString()} <Typography component="span" variant="body2">{product?.unit || 'pcs'}</Typography>
                </Typography>
              </Box>
              <Chip
                label={locations.length > 0 ? `${locations.length} Rack Location(s)` : 'No Rack Assigned'}
                color={locations.length > 0 ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>

            {locations.length === 0 ? (
              <Alert severity="info">
                This item is not yet assigned to any warehouse rack or has zero stock. Use "Stock Transfer" or "Purchase Receiving" to assign it to a rack.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Rack Code</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Rack / Shelf Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Units on Rack</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">% of Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locations.map((loc, idx) => {
                      const qty = parseFloat(loc.current_stock || 0);
                      const pct = totalRackStock > 0 ? ((qty / totalRackStock) * 100).toFixed(1) : 0;
                      return (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {loc.warehouse_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={loc.rack_code} size="small" color="primary" variant="filled" sx={{ fontWeight: 'bold' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{loc.rack_name}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {qty.toLocaleString()} {product?.unit || 'pcs'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {pct}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : (
          <Box>
            {/* Timeline Filter */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search transactions by reference, rack code, user..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Box>

            {filteredTransactions.length === 0 ? (
              <Alert severity="info">No transactions found matching criteria.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Rack Location</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Handled By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions.map((tx, idx) => {
                      const qty = parseFloat(tx.quantity || 0);
                      const isPositive = qty > 0;
                      return (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={tx.transaction_type}
                              size="small"
                              color={
                                tx.transaction_type.includes('IN') || tx.transaction_type === 'PURCHASE'
                                  ? 'success'
                                  : tx.transaction_type.includes('OUT') || tx.transaction_type === 'DAMAGE'
                                  ? 'error'
                                  : 'default'
                              }
                              variant="outlined"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {tx.reference_number || 'N/A'}
                            </Typography>
                            {tx.notes && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {tx.notes}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.source_rack_code ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip label={tx.source_rack_code} size="small" variant="outlined" />
                                {tx.dest_rack_code_resolved && (
                                  <>
                                    <span>→</span>
                                    <Chip label={tx.dest_rack_code_resolved} size="small" color="primary" />
                                  </>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">General Floor</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={isPositive ? 'success.main' : qty < 0 ? 'error.main' : 'text.primary'}
                            >
                              {isPositive ? `+${qty}` : qty}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{tx.user_name || 'System'}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="primary" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
