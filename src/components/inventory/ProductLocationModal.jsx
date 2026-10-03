import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper, Chip,
  CircularProgress, Alert, Tabs, Tab, TextField, InputAdornment,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  MapPin, X, History, Package, Search, Plus, Edit2,
  Trash2, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function ProductLocationModal({
  open,
  onClose,
  product = null,
  warehouses = [],
  onLocationUpdated = null
}) {
  const { notify } = useNotify();

  const [activeTab, setActiveTab] = useState(0); // 0: Storage Locations, 1: Movement Timeline
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineSearch, setTimelineSearch] = useState('');

  // Warehouse list state (uses prop or fetches active warehouses)
  const [internalWarehouses, setInternalWarehouses] = useState([]);

  // Assign / Edit Dialog State
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [assignWarehouseId, setAssignWarehouseId] = useState('');
  const [assignRackId, setAssignRackId] = useState('');
  const [assignQuantity, setAssignQuantity] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignError, setAssignError] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Available racks for the selected warehouse in assign dialog
  const [availableRacks, setAvailableRacks] = useState([]);
  const [loadingRacks, setLoadingRacks] = useState(false);

  // Remove confirmation dialog state
  const [removingLoc, setRemovingLoc] = useState(null);
  const [savingRemove, setSavingRemove] = useState(false);

  // Effective warehouses list
  const warehousesList = useMemo(() => {
    if (warehouses && warehouses.length > 0) {
      return warehouses.filter(w => !w.status || w.status === 'active');
    }
    return internalWarehouses.filter(w => !w.status || w.status === 'active');
  }, [warehouses, internalWarehouses]);

  // Load product timeline and locations
  const fetchProductTimeline = useCallback(async () => {
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
  }, [product?.id]);

  // Load warehouses if not provided
  useEffect(() => {
    if (open && (!warehouses || warehouses.length === 0)) {
      apiFetch('/api/inventory/warehouses?status=active')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setInternalWarehouses(data);
        })
        .catch(err => console.error('Failed to load warehouses:', err));
    }
  }, [open, warehouses]);

  useEffect(() => {
    if (open && product?.id) {
      fetchProductTimeline();
      setActiveTab(0);
    } else {
      setTimelineData(null);
      setError(null);
      setAssignDialogOpen(false);
      setRemovingLoc(null);
    }
  }, [open, product?.id, fetchProductTimeline]);

  // Data references
  const locations = timelineData?.current_locations || [];
  const transactions = timelineData?.transactions || [];
  const totalSystemStock = parseFloat(timelineData?.product?.current_stock ?? product?.current_stock ?? 0);
  const unit = timelineData?.product?.unit || product?.unit || 'pcs';

  // Calculate total stock currently assigned across racks
  const totalRackStock = useMemo(() => {
    return locations.reduce((acc, loc) => acc + parseFloat(loc.current_stock || 0), 0);
  }, [locations]);

  // Fetch racks when warehouse selection changes in assign dialog
  const fetchRacksForWarehouse = useCallback(async (whId) => {
    if (!whId) {
      setAvailableRacks([]);
      return;
    }
    try {
      setLoadingRacks(true);
      const res = await apiFetch(`/api/inventory/racks?warehouse_id=${whId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const activeOnly = data.filter(r => !r.status || r.status === 'active');
          setAvailableRacks(activeOnly);
        }
      }
    } catch (err) {
      console.error('Failed to fetch racks:', err);
    } finally {
      setLoadingRacks(false);
    }
  }, []);

  // Compute other racks total excluding current target rack (for max assignable validation)
  const otherRacksTotal = useMemo(() => {
    if (!locations || locations.length === 0) return 0;
    return locations
      .filter(l => !(String(l.warehouse_id) === String(assignWarehouseId) && String(l.rack_id) === String(assignRackId)))
      .reduce((acc, l) => acc + parseFloat(l.current_stock || 0), 0);
  }, [locations, assignWarehouseId, assignRackId]);

  const maxAssignable = useMemo(() => {
    const diff = (parseFloat(totalSystemStock || 0) - parseFloat(otherRacksTotal || 0));
    return Math.max(0, parseFloat(diff.toFixed(3)));
  }, [totalSystemStock, otherRacksTotal]);

  // Open Assign dialog for a NEW rack assignment
  const handleOpenAssignDialog = () => {
    setIsEditing(false);
    setAssignError('');
    setAssignNotes('');

    // Pre-select warehouse
    let initWhId = '';
    if (warehousesList.length > 0) {
      initWhId = String(warehousesList[0].id);
    }
    setAssignWarehouseId(initWhId);
    setAssignRackId('');
    setAssignQuantity('');
    if (initWhId) {
      fetchRacksForWarehouse(initWhId);
    }
    setAssignDialogOpen(true);
  };

  // Open Edit dialog for an EXISTING rack assignment
  const handleOpenEditDialog = (loc) => {
    setIsEditing(true);
    setAssignError('');
    setAssignNotes('');
    setAssignWarehouseId(String(loc.warehouse_id));
    setAssignRackId(String(loc.rack_id));
    setAssignQuantity(String(loc.current_stock));
    fetchRacksForWarehouse(loc.warehouse_id);
    setAssignDialogOpen(true);
  };

  // Warehouse selection handler in Assign dialog
  const handleWarehouseChange = (newWhId) => {
    setAssignWarehouseId(newWhId);
    setAssignRackId('');
    setAssignQuantity('');
    setAssignError('');
    fetchRacksForWarehouse(newWhId);
  };

  // Rack selection handler in Assign dialog (auto-detects existing assignment)
  const handleRackChange = (newRackId) => {
    setAssignRackId(newRackId);
    setAssignError('');
    // If this rack already has stock for this product, prefill its quantity
    const existing = locations.find(
      l => String(l.rack_id) === String(newRackId) && String(l.warehouse_id) === String(assignWarehouseId)
    );
    if (existing) {
      setAssignQuantity(String(existing.current_stock));
    }
  };

  // Save rack assignment / update
  const handleSaveAssignment = async () => {
    if (!assignWarehouseId) {
      setAssignError('Please select a warehouse.');
      return;
    }
    if (!assignRackId) {
      setAssignError('Please select a rack location.');
      return;
    }
    const qty = parseFloat(assignQuantity);
    if (isNaN(qty) || qty <= 0) {
      setAssignError('Please enter a valid quantity greater than zero.');
      return;
    }
    if (qty > maxAssignable) {
      setAssignError(`Total assigned stock across racks cannot exceed Total System Stock (${totalSystemStock} ${unit}). Maximum assignable for this rack is ${maxAssignable} ${unit}.`);
      return;
    }

    try {
      setSavingAssignment(true);
      setAssignError('');

      const res = await apiFetch('/api/inventory/racks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: product.id,
          warehouse_id: parseInt(assignWarehouseId, 10),
          rack_id: parseInt(assignRackId, 10),
          quantity: qty,
          notes: assignNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign stock to rack.');
      }

      notify.success(
        isEditing
          ? `Rack ${data.rack_code || ''} stock updated to ${qty} ${unit}.`
          : `Assigned ${qty} ${unit} to Rack ${data.rack_code || ''}.`
      );

      setAssignDialogOpen(false);
      await fetchProductTimeline();
      if (onLocationUpdated) onLocationUpdated();
    } catch (err) {
      setAssignError(err.message || 'Failed to save rack assignment.');
    } finally {
      setSavingAssignment(false);
    }
  };

  // Open Remove confirmation
  const handleOpenRemoveDialog = (loc) => {
    setRemovingLoc(loc);
  };

  // Execute Remove rack assignment
  const handleExecuteRemove = async () => {
    if (!removingLoc) return;

    try {
      setSavingRemove(true);
      const res = await apiFetch('/api/inventory/racks/assign', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: product.id,
          warehouse_id: removingLoc.warehouse_id,
          rack_id: removingLoc.rack_id,
          notes: `Removed assignment from Rack ${removingLoc.rack_code}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove rack assignment.');
      }

      notify.success(`Removed assignment from Rack ${removingLoc.rack_code}.`);
      setRemovingLoc(null);
      await fetchProductTimeline();
      if (onLocationUpdated) onLocationUpdated();
    } catch (err) {
      notify.error(err.message || 'Failed to remove rack assignment.');
    } finally {
      setSavingRemove(false);
    }
  };

  // Filtered transactions for timeline tab
  const filteredTransactions = transactions.filter(t => {
    if (!timelineSearch.trim()) return true;
    const s = timelineSearch.toLowerCase();
    return (
      (t.transaction_type && t.transaction_type.toLowerCase().includes(s)) ||
      (t.reference_number && t.reference_number.toLowerCase().includes(s)) ||
      (t.source_rack_code && t.source_rack_code.toLowerCase().includes(s)) ||
      (t.dest_rack_code_resolved && t.dest_rack_code_resolved.toLowerCase().includes(s)) ||
      (t.notes && t.notes.toLowerCase().includes(s)) ||
      (t.user_name && t.user_name.toLowerCase().includes(s))
    );
  });

  return (
    <>
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
                SKU: {product?.sku || 'N/A'} • Barcode: {product?.barcode || 'N/A'} • Total System Stock: {totalSystemStock.toLocaleString()} {unit}
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

        <DialogContent dividers sx={{ p: 2.5 }}>
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
              {/* Summary Header with Action Button */}
              <Box sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5
              }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="600">
                    Total Stock Stored Across Racks
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      {totalRackStock.toLocaleString()} <Typography component="span" variant="body2">{unit}</Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (of {totalSystemStock.toLocaleString()} {unit} system total)
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Chip
                    label={locations.length > 0 ? `${locations.length} Rack Location(s)` : 'No Rack Assigned'}
                    color={locations.length > 0 ? 'success' : 'default'}
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={handleOpenAssignDialog}
                    disabled={totalSystemStock <= 0}
                    sx={{ fontWeight: 'bold' }}
                  >
                    + Assign to Rack
                  </Button>
                </Box>
              </Box>

              {/* Locations List or Actionable Empty State */}
              {locations.length === 0 ? (
                <Alert
                  severity="info"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 2.5,
                    borderRadius: 2,
                    '& .MuiAlert-message': { width: '100%' }
                  }}
                >
                  <Typography variant="body2">
                    This item is not yet assigned to any warehouse rack or has zero stock.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={handleOpenAssignDialog}
                    disabled={totalSystemStock <= 0}
                    sx={{ mt: 1, fontWeight: 'bold' }}
                  >
                    + Assign to Rack
                  </Button>
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Rack / Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">% of Total</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {locations.map((loc, idx) => {
                        const qty = parseFloat(loc.current_stock || 0);
                        const pct = totalRackStock > 0 ? (parseFloat((qty / totalRackStock) * 100) || 0).toFixed(1) : '0';
                        return (
                          <TableRow key={loc.rack_stock_id || `${loc.warehouse_id}-${loc.rack_id}` || idx} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={loc.rack_code}
                                  size="small"
                                  color="primary"
                                  variant="filled"
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Typography variant="body2" fontWeight="medium">
                                  {loc.rack_name}
                                </Typography>
                              </Box>
                              {(loc.zone || loc.shelf || loc.bin) && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                  {[
                                    loc.zone ? `Zone: ${loc.zone}` : null,
                                    loc.shelf ? `Shelf: ${loc.shelf}` : null,
                                    loc.bin ? `Bin: ${loc.bin}` : null
                                  ].filter(Boolean).join(' • ')}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {loc.warehouse_name}
                              </Typography>
                              {loc.warehouse_code && (
                                <Typography variant="caption" color="text.secondary">
                                  [{loc.warehouse_code}]
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {qty.toLocaleString()} {unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="text.secondary">
                                {pct}%
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <Tooltip title="Edit Assigned Quantity">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleOpenEditDialog(loc)}
                                  >
                                    <Edit2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove Rack Assignment">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleOpenRemoveDialog(loc)}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
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
              {/* Movement Timeline Filter */}
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

      {/* Assign / Edit Rack Sub-Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => !savingAssignment && setAssignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {isEditing ? 'Edit Rack Assignment' : 'Assign Product to Rack'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Stock Context Box */}
          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold">
              STOCK AVAILABILITY
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Total System Stock:</Typography>
              <Typography variant="body2" fontWeight="bold">{totalSystemStock} {unit}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Stored on other racks:</Typography>
              <Typography variant="body2" fontWeight="bold">{otherRacksTotal} {unit}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', pt: 0.5, mt: 0.5 }}>
              <Typography variant="body2" fontWeight="600" color="primary.main">Max Assignable for this Rack:</Typography>
              <Typography variant="body2" fontWeight="bold" color="primary.main">{maxAssignable} {unit}</Typography>
            </Box>
          </Box>

          {assignError && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {assignError}
            </Alert>
          )}

          {/* Warehouse Selector */}
          <FormControl fullWidth size="small" disabled={isEditing || warehousesList.length <= 1}>
            <InputLabel id="assign-wh-select-label">Warehouse *</InputLabel>
            <Select
              labelId="assign-wh-select-label"
              value={assignWarehouseId}
              label="Warehouse *"
              onChange={e => handleWarehouseChange(e.target.value)}
            >
              {warehousesList.map(w => (
                <MenuItem key={w.id} value={String(w.id)}>
                  {w.name} {w.code ? `[${w.code}]` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Rack Location Selector */}
          <FormControl fullWidth size="small" disabled={isEditing || loadingRacks}>
            <InputLabel id="assign-rack-select-label">Rack / Location *</InputLabel>
            <Select
              labelId="assign-rack-select-label"
              value={assignRackId}
              label="Rack / Location *"
              onChange={e => handleRackChange(e.target.value)}
            >
              {loadingRacks ? (
                <MenuItem value="" disabled>Loading racks...</MenuItem>
              ) : availableRacks.length === 0 ? (
                <MenuItem value="" disabled>No active racks found in this warehouse</MenuItem>
              ) : (
                availableRacks.map(r => {
                  const existingAssigned = locations.find(
                    l => String(l.rack_id) === String(r.id) && String(l.warehouse_id) === String(assignWarehouseId)
                  );
                  const hint = existingAssigned ? ` (Current: ${parseFloat(existingAssigned.current_stock)} ${unit})` : '';
                  return (
                    <MenuItem key={r.id} value={String(r.id)}>
                      {r.rack_code} — {r.rack_name}{hint}
                    </MenuItem>
                  );
                })
              )}
            </Select>
          </FormControl>

          {/* Quantity Input */}
          <TextField
            label={`Quantity (${unit}) *`}
            type="number"
            size="small"
            fullWidth
            required
            value={assignQuantity}
            onChange={e => {
              setAssignQuantity(e.target.value);
              setAssignError('');
            }}
            slotProps={{
              htmlInput: {
                min: 0.001,
                max: maxAssignable,
                step: unit === 'kg' ? '0.001' : '1'
              }
            }}
            helperText={`Enter quantity to assign to this rack (up to ${maxAssignable} ${unit})`}
          />

          {/* Optional Notes */}
          <TextField
            label="Notes / Reason (Optional)"
            size="small"
            fullWidth
            placeholder="e.g. Aisle replenishment, layout re-org..."
            value={assignNotes}
            onChange={e => setAssignNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={savingAssignment}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAssignment}
            disabled={
              savingAssignment ||
              !assignWarehouseId ||
              !assignRackId ||
              !assignQuantity ||
              parseFloat(assignQuantity) <= 0 ||
              parseFloat(assignQuantity) > maxAssignable
            }
            sx={{ fontWeight: 'bold' }}
          >
            {savingAssignment ? 'Saving...' : isEditing ? 'Update Quantity' : 'Save Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={Boolean(removingLoc)}
        onClose={() => !savingRemove && setRemovingLoc(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: 'error.main' }}>
          Remove Rack Assignment
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2">
            Are you sure you want to remove the assignment of{' '}
            <strong>{parseFloat(removingLoc?.current_stock || 0)} {unit}</strong> from{' '}
            <strong>Rack {removingLoc?.rack_code}</strong> ({removingLoc?.warehouse_name})?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            This stock will remain part of total system stock but will no longer be tracked under this specific rack.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemovingLoc(null)} disabled={savingRemove}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleExecuteRemove}
            disabled={savingRemove}
            sx={{ fontWeight: 'bold' }}
          >
            {savingRemove ? 'Removing...' : 'Confirm Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
