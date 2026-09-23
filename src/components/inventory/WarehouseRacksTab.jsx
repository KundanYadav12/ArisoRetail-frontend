import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Grid, TextField,
  InputAdornment, IconButton, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, CircularProgress,
  Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Tooltip, Card, CardContent
} from '@mui/material';
import {
  MapPin, Plus, ArrowRightLeft, Search, RefreshCw, CheckCircle2,
  AlertTriangle, Edit2, Trash2, Package, ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import RackManagementModal from './RackManagementModal';
import RackTransferModal from './RackTransferModal';

export default function WarehouseRacksTab({
  warehouses = [],
  defaultWarehouseId = null
}) {
  const notify = useNotify();

  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(defaultWarehouseId || 'all');
  const [search, setSearch] = useState('');

  // Modals
  const [rackModalOpen, setRackModalOpen] = useState(false);
  const [editingRack, setEditingRack] = useState(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceRackId, setTransferSourceRackId] = useState(null);

  // Products in Rack Inspection Modal
  const [inspectRack, setInspectRack] = useState(null);
  const [inspectProducts, setInspectProducts] = useState([]);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Stock Tally Validation Modal
  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [tallyData, setTallyData] = useState(null);
  const [loadingTally, setLoadingTally] = useState(false);

  const fetchRacks = useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedWarehouseId && selectedWarehouseId !== 'all'
        ? `/api/inventory/racks?warehouse_id=${selectedWarehouseId}`
        : '/api/inventory/racks';
      const res = await apiFetch(url);
      if (Array.isArray(res)) setRacks(res);
    } catch (err) {
      console.error('Fetch racks error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    fetchRacks();
  }, [fetchRacks]);

  const handleDeleteRack = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rack? This is only allowed if no stock is currently assigned.')) {
      return;
    }
    try {
      const res = await apiFetch(`/api/inventory/racks/${id}`, { method: 'DELETE' });
      if (res.error) throw new Error(res.error);
      notify?.('Rack deleted successfully', 'success');
      fetchRacks();
    } catch (err) {
      notify?.(err.message || 'Failed to delete rack', 'error');
    }
  };

  const handleInspectRack = async (rack) => {
    setInspectRack(rack);
    try {
      setLoadingInspect(true);
      const res = await apiFetch(`/api/inventory/racks/${rack.id}/products`);
      if (Array.isArray(res)) setInspectProducts(res);
    } catch (err) {
      console.error('Inspect rack error:', err);
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleRunTallyValidation = async () => {
    setTallyModalOpen(true);
    try {
      setLoadingTally(true);
      const url = selectedWarehouseId && selectedWarehouseId !== 'all'
        ? `/api/inventory/stock-tally?warehouse_id=${selectedWarehouseId}`
        : '/api/inventory/stock-tally';
      const res = await apiFetch(url);
      setTallyData(res);
    } catch (err) {
      console.error('Tally error:', err);
    } finally {
      setLoadingTally(false);
    }
  };

  const filteredRacks = racks.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.rack_code && r.rack_code.toLowerCase().includes(s)) ||
      (r.rack_name && r.rack_name.toLowerCase().includes(s)) ||
      (r.zone && r.zone.toLowerCase().includes(s)) ||
      (r.shelf && r.shelf.toLowerCase().includes(s)) ||
      (r.bin && r.bin.toLowerCase().includes(s)) ||
      (r.warehouse_name && r.warehouse_name.toLowerCase().includes(s))
    );
  });

  return (
    <Box>
      {/* Top Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Warehouse Racks & Exact Stock Locations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage physical shelves, bins, internal rack transfers, and stock tally consistency
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="success"
            startIcon={<ShieldCheck size={18} />}
            onClick={handleRunTallyValidation}
          >
            Verify Stock Tally
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowRightLeft size={18} />}
            onClick={() => {
              setTransferSourceRackId(null);
              setTransferModalOpen(true);
            }}
          >
            Rack Transfer
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setEditingRack(null);
              setRackModalOpen(true);
            }}
          >
            Add Rack
          </Button>
        </Box>
      </Box>

      {/* Filters Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by rack code, name, zone, shelf, bin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Warehouse</InputLabel>
              <Select
                value={selectedWarehouseId}
                label="Filter by Warehouse"
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                <MenuItem value="all">All Warehouses</MenuItem>
                {warehouses.map(w => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={fetchRacks}
            >
              Refresh Racks
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Racks Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredRacks.length === 0 ? (
        <Alert severity="info">
          No warehouse racks found. Create one or select another warehouse.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Rack Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Rack Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Zone / Shelf / Bin</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Stored Items</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Units</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRacks.map(rack => (
                <TableRow key={rack.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MapPin size={16} color="#6366f1" />
                      <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                        {rack.rack_code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {rack.rack_name}
                    </Typography>
                    {rack.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {rack.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {rack.warehouse_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {[rack.zone, rack.shelf, rack.bin].filter(Boolean).join(' • ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleInspectRack(rack)}
                      sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                      {rack.total_products_count || 0} Products
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {parseFloat(rack.total_units_stored || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rack.status.toUpperCase()}
                      size="small"
                      color={rack.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Move Stock from this Rack">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setTransferSourceRackId(rack.id);
                            setTransferModalOpen(true);
                          }}
                        >
                          <ArrowRightLeft size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Rack">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingRack(rack);
                            setRackModalOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Rack">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteRack(rack.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* INSPECT RACK PRODUCTS MODAL */}
      <Dialog open={Boolean(inspectRack)} onClose={() => setInspectRack(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Products in Rack: {inspectRack?.rack_code} ({inspectRack?.rack_name})
        </DialogTitle>
        <DialogContent dividers>
          {loadingInspect ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : inspectProducts.length === 0 ? (
            <Alert severity="info">No products currently stored in this rack location.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Current Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inspectProducts.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{p.product_name}</TableCell>
                      <TableCell>{p.sku || 'N/A'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {parseFloat(p.current_stock).toLocaleString()} {p.unit || 'pcs'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setInspectRack(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* STOCK TALLY VERIFICATION MODAL */}
      <Dialog open={tallyModalOpen} onClose={() => setTallyModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 'bold' }}>
          <ShieldCheck size={22} color="#10b981" />
          Stock Tally & Reconciliation Verification
        </DialogTitle>
        <DialogContent dividers>
          {loadingTally ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Auditing SUM(Rack Stock) == SUM(Warehouse Stock) == Total Stock...
              </Typography>
            </Box>
          ) : tallyData ? (
            <Box>
              <Alert
                severity={tallyData.is_valid ? 'success' : 'error'}
                icon={tallyData.is_valid ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                sx={{ mb: 3 }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {tallyData.is_valid
                    ? '100% Stock Tally Match Verified'
                    : 'Stock Discrepancies Detected'}
                </Typography>
                <Typography variant="body2">
                  {tallyData.is_valid
                    ? `Checked ${tallyData.total_items_checked} catalog products across ${tallyData.total_warehouse_records_checked} warehouse storage records. Every rack stock perfectly equals warehouse stock.`
                    : `Found ${tallyData.rack_discrepancies_count} rack discrepancy(s) and ${tallyData.global_discrepancies_count} global warehouse discrepancy(s).`}
                </Typography>
              </Alert>

              {tallyData.rack_discrepancies && tallyData.rack_discrepancies.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'error.main' }}>
                    Warehouse vs Rack Stock Discrepancies:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Warehouse Stock</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Rack Sum Stock</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Discrepancy</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tallyData.rack_discrepancies.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell>{d.warehouse_name}</TableCell>
                            <TableCell>{d.product_name}</TableCell>
                            <TableCell align="right">{d.warehouse_stock}</TableCell>
                            <TableCell align="right">{d.rack_sum_stock}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                              {d.discrepancy}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setTallyModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* MODALS */}
      <RackManagementModal
        open={rackModalOpen}
        onClose={() => setRackModalOpen(false)}
        onSuccess={fetchRacks}
        rack={editingRack}
        warehouses={warehouses}
        defaultWarehouseId={selectedWarehouseId !== 'all' ? selectedWarehouseId : (warehouses[0]?.id || '')}
      />

      <RackTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={fetchRacks}
        warehouses={warehouses}
        defaultWarehouseId={selectedWarehouseId !== 'all' ? selectedWarehouseId : (warehouses[0]?.id || '')}
        initialSourceRackId={transferSourceRackId}
      />
    </Box>
  );
}
