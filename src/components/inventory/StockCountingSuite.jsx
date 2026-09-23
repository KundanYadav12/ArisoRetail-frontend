import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Tabs, Tab, Chip,
  Grid, TextField, InputAdornment, IconButton, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Alert, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, Autocomplete
} from '@mui/material';
import {
  Barcode, Smartphone, ClipboardCheck, Plus, CheckCircle,
  XCircle, Search, RefreshCw, Trash2, Edit2, Play, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import StockCountingScreen from './StockCountingScreen';

export default function StockCountingSuite({
  warehouses = [],
  menuItems = [],
  defaultWarehouseId = null
}) {
  const notify = useNotify();

  const [activeTab, setActiveTab] = useState(0); // 0: Sessions, 1: Devices, 2: Assignments
  const [terminalMode, setTerminalMode] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [sessionWarehouseFilter, setSessionWarehouseFilter] = useState(defaultWarehouseId || 'all');
  const [sessionSearch, setSessionSearch] = useState('');

  // Devices State
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Assignments State
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Modals
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceFormData, setDeviceFormData] = useState({
    device_code: '',
    device_name: '',
    warehouse_id: '',
    notes: ''
  });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignDeviceId, setAssignDeviceId] = useState('');
  const [assignWarehouseId, setAssignWarehouseId] = useState('');
  const [assignRackId, setAssignRackId] = useState('');
  const [assignRacks, setAssignRacks] = useState([]);
  const [selectedProductsToAssign, setSelectedProductsToAssign] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // Approval / Rejection Dialog
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    session: null,
    action: 'approve', // 'approve' or 'reject'
    notes: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch Sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      let url = '/api/inventory/stock-counting/sessions?';
      if (sessionWarehouseFilter && sessionWarehouseFilter !== 'all') url += `warehouse_id=${sessionWarehouseFilter}&`;
      if (sessionStatusFilter && sessionStatusFilter !== 'all') url += `status=${sessionStatusFilter}&`;
      if (sessionSearch.trim()) url += `search=${encodeURIComponent(sessionSearch.trim())}&`;

      const res = await apiFetch(url);
      if (Array.isArray(res)) setSessions(res);
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionWarehouseFilter, sessionStatusFilter, sessionSearch]);

  // 2. Fetch Devices
  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const res = await apiFetch('/api/inventory/stock-counting/devices');
      if (Array.isArray(res)) setDevices(res);
    } catch (err) {
      console.error('Fetch devices error:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // 3. Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      const res = await apiFetch('/api/inventory/stock-counting/assignments');
      if (Array.isArray(res)) setAssignments(res);
    } catch (err) {
      console.error('Fetch assignments error:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchSessions();
    else if (activeTab === 1) fetchDevices();
    else if (activeTab === 2) fetchAssignments();
  }, [activeTab, fetchSessions, fetchDevices, fetchAssignments]);

  // Load racks for assignment modal
  useEffect(() => {
    if (assignWarehouseId) {
      apiFetch(`/api/inventory/racks?warehouse_id=${assignWarehouseId}`)
        .then(res => Array.isArray(res) && setAssignRacks(res))
        .catch(console.error);
    } else {
      setAssignRacks([]);
    }
  }, [assignWarehouseId]);

  // Handlers for Device Create/Edit
  const handleSaveDevice = async (e) => {
    e.preventDefault();
    try {
      const url = editingDevice ? `/api/inventory/stock-counting/devices/${editingDevice.id}` : '/api/inventory/stock-counting/devices';
      const method = editingDevice ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(deviceFormData)
      });
      if (res.error) throw new Error(res.error);

      notify?.(editingDevice ? 'Device updated' : 'Device registered', 'success');
      setDeviceModalOpen(false);
      fetchDevices();
    } catch (err) {
      notify?.(err.message || 'Device operation failed', 'error');
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this counting device?')) return;
    try {
      const res = await apiFetch(`/api/inventory/stock-counting/devices/${id}`, { method: 'DELETE' });
      if (res.error) throw new Error(res.error);
      notify?.('Device deleted', 'success');
      fetchDevices();
    } catch (err) {
      notify?.(err.message || 'Failed to delete device', 'error');
    }
  };

  // Handlers for Product Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignDeviceId || !assignWarehouseId || selectedProductsToAssign.length === 0) {
      notify?.('Please select device, warehouse, and at least one product.', 'warning');
      return;
    }

    try {
      setAssigning(true);
      const res = await apiFetch('/api/inventory/stock-counting/assignments', {
        method: 'POST',
        body: JSON.stringify({
          device_id: parseInt(assignDeviceId, 10),
          warehouse_id: parseInt(assignWarehouseId, 10),
          rack_id: assignRackId ? parseInt(assignRackId, 10) : null,
          product_ids: selectedProductsToAssign.map(p => p.id)
        })
      });
      if (res.error) throw new Error(res.error);

      notify?.(`Assigned ${res.count} product(s) to device!`, 'success');
      setAssignModalOpen(false);
      setSelectedProductsToAssign([]);
      fetchAssignments();
      fetchDevices();
    } catch (err) {
      notify?.(err.message || 'Assignment failed', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (id) => {
    try {
      const res = await apiFetch(`/api/inventory/stock-counting/assignments/${id}`, { method: 'DELETE' });
      if (res.error) throw new Error(res.error);
      notify?.('Product assignment removed', 'success');
      fetchAssignments();
      fetchDevices();
    } catch (err) {
      notify?.(err.message || 'Failed to remove assignment', 'error');
    }
  };

  // Handlers for Session Review / Approval
  const handleReviewAction = async () => {
    const { session, action, notes } = reviewDialog;
    if (!session) return;

    try {
      setActionLoading(true);
      const url = `/api/inventory/stock-counting/sessions/${session.id}/${action}`;
      const payload = action === 'approve' ? { notes } : { reason: notes };

      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.error) throw new Error(res.error);

      notify?.(
        action === 'approve'
          ? `Session ${session.session_number} approved! Stock adjusted successfully.`
          : `Session ${session.session_number} rejected.`,
        'success'
      );
      setReviewDialog({ open: false, session: null, action: 'approve', notes: '' });
      fetchSessions();
    } catch (err) {
      notify?.(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (terminalMode) {
    return (
      <StockCountingScreen
        onBack={() => {
          setTerminalMode(false);
          fetchSessions();
        }}
        warehouses={warehouses}
        defaultWarehouseId={defaultWarehouseId}
      />
    );
  }

  return (
    <Box>
      {/* Top Banner & Launch Terminal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Stock Counting & Barcode Audit Suite
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Product-restricted physical counting, live variance verification, and manager approval
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Play size={18} />}
            onClick={() => setTerminalMode(true)}
            sx={{ fontWeight: 'bold' }}
          >
            Launch Handheld Counting Terminal
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<ClipboardCheck size={18} />} iconPosition="start" label="Count Sessions & Approvals" />
          <Tab icon={<Smartphone size={18} />} iconPosition="start" label="Device Terminals" />
          <Tab icon={<Barcode size={18} />} iconPosition="start" label="Product Assignments" />
        </Tabs>
      </Paper>

      {/* TAB 0: COUNT SESSIONS */}
      {activeTab === 0 && (
        <Box>
          {/* Filters Bar */}
          <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by session #, product, staff..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={sessionWarehouseFilter}
                    label="Warehouse"
                    onChange={(e) => setSessionWarehouseFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Warehouses</MenuItem>
                    {warehouses.map(w => (
                      <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={sessionStatusFilter}
                    label="Status"
                    onChange={(e) => setSessionStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="submitted">Submitted (Pending Review)</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="adjusted">Adjusted (Variance Applied)</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshCw size={16} />}
                  onClick={fetchSessions}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Sessions Table */}
          {loadingSessions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : sessions.length === 0 ? (
            <Alert severity="info">No counting sessions found.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Session #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">System Stock</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Counted</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Variance</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Counted By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map(s => {
                    const variance = parseFloat(s.variance || 0);
                    return (
                      <TableRow key={s.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                            {s.session_number}
                          </Typography>
                          {s.adjustment_number && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Adj: {s.adjustment_number}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2">
                            {new Date(s.created_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {s.product_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {s.sku || 'N/A'} • Barcode: {s.barcode || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {s.warehouse_name}
                          </Typography>
                          {s.rack_code ? (
                            <Chip label={s.rack_code} size="small" variant="outlined" color="primary" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Floor</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {parseFloat(s.system_stock).toLocaleString()} {s.unit || 'pcs'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {parseFloat(s.counted_stock).toLocaleString()} {s.unit || 'pcs'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={variance === 0 ? 'success.main' : variance < 0 ? 'error.main' : 'info.main'}
                          >
                            {variance > 0 ? `+${variance}` : variance}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.status.toUpperCase()}
                            size="small"
                            color={
                              s.status === 'approved' || s.status === 'adjusted'
                                ? 'success'
                                : s.status === 'submitted'
                                ? 'warning'
                                : s.status === 'rejected'
                                ? 'error'
                                : 'default'
                            }
                            variant={s.status === 'submitted' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.counted_by_name}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {s.status === 'submitted' ? (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle size={14} />}
                                onClick={() => setReviewDialog({ open: true, session: s, action: 'approve', notes: '' })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<XCircle size={14} />}
                                onClick={() => setReviewDialog({ open: true, session: s, action: 'reject', notes: '' })}
                              >
                                Reject
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Reviewed by {s.approved_by_name || 'Manager'}
                            </Typography>
                          )}
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

      {/* TAB 1: DEVICES */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => {
                setEditingDevice(null);
                setDeviceFormData({
                  device_code: `HHT-${Date.now().toString().slice(-4)}`,
                  device_name: '',
                  warehouse_id: defaultWarehouseId || (warehouses[0]?.id || ''),
                  notes: ''
                });
                setDeviceModalOpen(true);
              }}
            >
              Register New Counting Device
            </Button>
          </Box>

          {loadingDevices ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : devices.length === 0 ? (
            <Alert severity="info">No counting devices registered yet.</Alert>
          ) : (
            <Grid container spacing={2}>
              {devices.map(d => (
                <Grid item xs={12} sm={6} md={4} key={d.id}>
                  <Card elevation={2} sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Smartphone size={20} />
                          <Typography variant="h6" fontWeight="bold">
                            {d.device_name}
                          </Typography>
                        </Box>
                        <Chip
                          label={d.status.toUpperCase()}
                          size="small"
                          color={d.status === 'active' ? 'success' : 'default'}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ mb: 1 }}>
                        Code: <strong>{d.device_code}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        Warehouse: <strong>{d.warehouse_name || `WH #${d.warehouse_id}`}</strong>
                      </Typography>

                      <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Assigned Items</Typography>
                        <Chip
                          label={`${d.active_assignments_count || 0} Products`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setAssignDeviceId(d.id);
                            setAssignWarehouseId(d.warehouse_id);
                            setSelectedProductsToAssign([]);
                            setAssignModalOpen(true);
                          }}
                        >
                          Assign Products
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDevice(d.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* TAB 2: PRODUCT ASSIGNMENTS */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Product-to-Device Restriction Matrix
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => {
                setAssignDeviceId(devices[0]?.id || '');
                setAssignWarehouseId(devices[0]?.warehouse_id || '');
                setSelectedProductsToAssign([]);
                setAssignModalOpen(true);
              }}
            >
              Assign Products to Device
            </Button>
          </Box>

          {loadingAssignments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : assignments.length === 0 ? (
            <Alert severity="info">
              No product assignments found. Assign products to devices to restrict barcode scanning.
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Device Terminal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Warehouse & Rack</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">System Stock</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {a.device_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                          {a.device_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {a.product_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          SKU: {a.sku || 'N/A'} • Barcode: {a.barcode || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{a.warehouse_name}</Typography>
                        {a.rack_code && (
                          <Chip label={a.rack_code} size="small" variant="outlined" color="primary" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {parseFloat(a.system_stock || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={a.status.toUpperCase()} size="small" color={a.status === 'assigned' ? 'info' : 'success'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(a.assigned_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleRemoveAssignment(a.id)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* DIALOG: REVIEW / APPROVE SESSION */}
      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, session: null, action: 'approve', notes: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {reviewDialog.action === 'approve' ? 'Approve Count Session' : 'Reject Count Session'}
        </DialogTitle>
        <DialogContent dividers>
          {reviewDialog.session && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Session: <strong>{reviewDialog.session.session_number}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Product: <strong>{reviewDialog.session.product_name}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Counted Stock: <strong>{reviewDialog.session.counted_stock}</strong> (System: {reviewDialog.session.system_stock})
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Variance: <strong style={{ color: parseFloat(reviewDialog.session.variance) < 0 ? 'red' : 'green' }}>
                  {reviewDialog.session.variance}
                </strong>
              </Typography>

              {reviewDialog.action === 'approve' && parseFloat(reviewDialog.session.variance) !== 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Approving this count will automatically create a formal Stock Adjustment and update the stock ledger.
                </Alert>
              )}

              <TextField
                fullWidth
                size="small"
                label={reviewDialog.action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason'}
                value={reviewDialog.notes}
                onChange={(e) => setReviewDialog(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setReviewDialog({ open: false, session: null, action: 'approve', notes: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleReviewAction}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={18} color="inherit" /> : reviewDialog.action === 'approve' ? 'Confirm & Apply' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: REGISTER DEVICE */}
      <Dialog open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingDevice ? 'Edit Device Terminal' : 'Register Counting Device'}
        </DialogTitle>
        <form onSubmit={handleSaveDevice}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  required
                  label="Device Code"
                  value={deviceFormData.device_code}
                  onChange={(e) => setDeviceFormData(prev => ({ ...prev, device_code: e.target.value.toUpperCase() }))}
                  helperText="Unique terminal code (e.g. HHT-01)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  required
                  label="Device Name"
                  placeholder="e.g. Warehouse Handheld Scanner 01"
                  value={deviceFormData.device_name}
                  onChange={(e) => setDeviceFormData(prev => ({ ...prev, device_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={deviceFormData.warehouse_id}
                    label="Warehouse"
                    onChange={(e) => setDeviceFormData(prev => ({ ...prev, warehouse_id: e.target.value }))}
                  >
                    {warehouses.map(w => (
                      <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  value={deviceFormData.notes}
                  onChange={(e) => setDeviceFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={() => setDeviceModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Device</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG: ASSIGN PRODUCTS TO DEVICE */}
      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Assign Products to Counting Device
        </DialogTitle>
        <form onSubmit={handleAssignSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Device Terminal</InputLabel>
                  <Select
                    value={assignDeviceId}
                    label="Device Terminal"
                    onChange={(e) => {
                      setAssignDeviceId(e.target.value);
                      const dev = devices.find(d => String(d.id) === String(e.target.value));
                      if (dev) setAssignWarehouseId(dev.warehouse_id);
                    }}
                  >
                    {devices.map(d => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.device_name} ({d.device_code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={assignWarehouseId}
                    label="Warehouse"
                    onChange={(e) => setAssignWarehouseId(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Rack (Optional)</InputLabel>
                  <Select
                    value={assignRackId}
                    label="Target Rack (Optional)"
                    onChange={(e) => setAssignRackId(e.target.value)}
                  >
                    <MenuItem value="">Any Rack / Floor</MenuItem>
                    {assignRacks.map(r => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.rack_code} — {r.rack_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={menuItems}
                  getOptionKey={(option) => typeof option === 'string' ? option : (option.id ? `item-${option.id}` : `${option.name}-${option.barcode || ''}`)}
                  getOptionLabel={(option) => `${option.name} (SKU: ${option.sku || 'N/A'}, Barcode: ${option.barcode || 'N/A'})`}
                  value={selectedProductsToAssign}
                  onChange={(event, newValue) => setSelectedProductsToAssign(newValue)}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    return (
                      <li key={option.id ? `item-opt-${option.id}` : key} {...rest}>
                        {option.name} (SKU: {option.sku || 'N/A'}, Barcode: {option.barcode || 'N/A'})
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      size="small"
                      label="Select Products to Assign"
                      placeholder="Search items by name, barcode..."
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={assigning || selectedProductsToAssign.length === 0}
            >
              {assigning ? <CircularProgress size={18} color="inherit" /> : 'Assign Products'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
