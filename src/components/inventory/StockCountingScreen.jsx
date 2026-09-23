import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Paper, TextField, IconButton,
  Grid, Card, CardContent, Chip, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Divider
} from '@mui/material';
import {
  Scan, Barcode, Plus, Minus, CheckCircle, AlertTriangle,
  XCircle, ArrowLeft, RefreshCw, Send, ShieldAlert, Package, MapPin
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function StockCountingScreen({
  onBack,
  warehouses = [],
  defaultWarehouseId = null
}) {
  const notify = useNotify();
  const scanInputRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(defaultWarehouseId || '');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // Validated product assignment data
  const [scanError, setScanError] = useState(null);

  // Counting state
  const [countedQty, setCountedQty] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Load devices on mount
  useEffect(() => {
    fetchDevices();
  }, [selectedWarehouseId]);

  const fetchDevices = async () => {
    try {
      const url = selectedWarehouseId ? `/api/inventory/stock-counting/devices?warehouse_id=${selectedWarehouseId}` : '/api/inventory/stock-counting/devices';
      const res = await apiFetch(url);
      if (Array.isArray(res)) {
        setDevices(res);
        if (res.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(res[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch devices error:', err);
    }
  };

  const selectedDevice = devices.find(d => String(d.id) === String(selectedDeviceId));

  // Focus scan input on ready
  useEffect(() => {
    if (!scanResult) {
      scanInputRef.current?.focus();
    }
  }, [scanResult, submitSuccess]);

  const handleScanSubmit = async (e) => {
    e?.preventDefault();
    if (!barcodeInput.trim()) return;

    if (!selectedDevice) {
      setScanError('Please select a counting device terminal first.');
      return;
    }

    try {
      setScanning(true);
      setScanError(null);
      setSubmitSuccess(null);

      const res = await apiFetch('/api/inventory/stock-counting/scan', {
        method: 'POST',
        body: JSON.stringify({
          device_code: selectedDevice.device_code,
          barcode: barcodeInput.trim(),
          warehouse_id: selectedWarehouseId || selectedDevice.warehouse_id
        })
      });

      if (!res.success) {
        setScanError(res.message || 'No Data / Product Not Assigned to this Device');
        setScanResult(null);
        return;
      }

      setScanResult(res);
      setCountedQty(parseFloat(res.system_stock || 0));
      setNotes('');
      setBarcodeInput('');
    } catch (err) {
      setScanError(err.message || 'Scan validation failed.');
      setScanResult(null);
    } finally {
      setScanning(false);
    }
  };

  const handleCountStep = (delta) => {
    setCountedQty(prev => Math.max(0, parseFloat((prev + delta).toFixed(3))));
  };

  const handleSubmitCount = async () => {
    if (!scanResult) return;

    try {
      setSubmitting(true);
      setScanError(null);

      const res = await apiFetch('/api/inventory/stock-counting/sessions', {
        method: 'POST',
        body: JSON.stringify({
          warehouse_id: scanResult.warehouse_id,
          rack_id: scanResult.rack_id || null,
          device_id: scanResult.device?.id || selectedDevice?.id,
          menu_item_id: scanResult.product.id,
          counted_stock: countedQty,
          notes: notes || null
        })
      });

      if (res.error) throw new Error(res.error);

      setSubmitSuccess({
        sessionNumber: res.session_number,
        productName: scanResult.product.name,
        counted: countedQty,
        variance: res.variance
      });

      notify?.(`Count session ${res.session_number} submitted for review!`, 'success');
      setScanResult(null);
      setBarcodeInput('');
    } catch (err) {
      setScanError(err.message || 'Failed to submit count.');
    } finally {
      setSubmitting(false);
    }
  };

  const systemStock = scanResult ? parseFloat(scanResult.system_stock || 0) : 0;
  const variance = parseFloat((countedQty - systemStock).toFixed(3));

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1.5, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={onBack}
          variant="outlined"
          size="small"
        >
          Back to Inventory
        </Button>
        <Typography variant="h6" fontWeight="bold">
          Stock Counting Terminal
        </Typography>
        <Chip
          icon={<Barcode size={16} />}
          label="Barcode Restricted"
          color="primary"
          variant="outlined"
          size="small"
        />
      </Box>

      {/* Device & Warehouse Selector */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Active Counting Device</InputLabel>
              <Select
                value={selectedDeviceId}
                label="Active Counting Device"
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setScanResult(null);
                  setScanError(null);
                }}
              >
                {devices.map(d => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.device_name} ({d.device_code}) — {d.warehouse_name || `WH #${d.warehouse_id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            {selectedDevice ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={selectedDevice.status.toUpperCase()}
                  size="small"
                  color={selectedDevice.status === 'active' ? 'success' : 'error'}
                />
                <Typography variant="caption" color="text.secondary">
                  Terminal: {selectedDevice.device_code}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="error">
                No active device registered. Create one in Device Manager.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Barcode Scanner Input */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '2px solid', borderColor: 'primary.light' }}>
        <form onSubmit={handleScanSubmit}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Scan size={18} />
            Scan Product Barcode
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              inputRef={scanInputRef}
              fullWidth
              size="medium"
              placeholder="Scan barcode with handheld scanner or type barcode/SKU..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              disabled={scanning}
              autoFocus
              sx={{ bgcolor: 'background.paper' }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={scanning || !barcodeInput.trim()}
              sx={{ minWidth: 100 }}
            >
              {scanning ? <CircularProgress size={20} color="inherit" /> : 'Scan'}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>
            Hardware barcode scanners: Pull the trigger to scan. Enter key is auto-submitted.
          </Typography>
        </form>
      </Paper>

      {/* Scan Error / Security Block Banner */}
      {scanError && (
        <Alert
          severity="error"
          variant="filled"
          icon={<ShieldAlert size={22} />}
          sx={{ mb: 3, borderRadius: 2, fontWeight: 'medium' }}
          action={
            <Button color="inherit" size="small" onClick={() => setScanError(null)}>
              Dismiss
            </Button>
          }
        >
          {scanError}
        </Alert>
      )}

      {/* Success Banner */}
      {submitSuccess && (
        <Alert
          severity="success"
          icon={<CheckCircle size={22} />}
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setSubmitSuccess(null)}>
              Dismiss
            </Button>
          }
        >
          Session <strong>{submitSuccess.sessionNumber}</strong> submitted: {submitSuccess.productName} counted as {submitSuccess.counted} (Variance: {submitSuccess.variance > 0 ? `+${submitSuccess.variance}` : submitSuccess.variance}). Pending manager review.
        </Alert>
      )}

      {/* Active Product Counting Card */}
      {scanResult && (
        <Card elevation={3} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            {/* Product Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {scanResult.product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  SKU: {scanResult.product.sku || 'N/A'} • Barcode: {scanResult.product.barcode || 'N/A'}
                </Typography>
              </Box>
              <Chip
                label="Product Verified"
                color="success"
                icon={<CheckCircle size={16} />}
                size="small"
              />
            </Box>

            {/* Location Specs */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3, p: 1.5, bgcolor: 'background.default', borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MapPin size={16} />
                <Typography variant="body2" fontWeight="bold">
                  {scanResult.rack_code ? `${scanResult.rack_code} (${scanResult.rack_name})` : 'General Floor Location'}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="text.secondary">
                Expected System Stock: <strong>{systemStock} {scanResult.product.unit || 'pcs'}</strong>
              </Typography>
            </Box>

            {/* Stepper Counting Controls */}
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                PHYSICAL COUNTED QUANTITY
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <IconButton
                  color="primary"
                  onClick={() => handleCountStep(-1)}
                  disabled={countedQty <= 0}
                  sx={{
                    width: 56,
                    height: 56,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }}
                >
                  <Minus size={28} />
                </IconButton>

                <TextField
                  type="number"
                  inputProps={{ min: '0', step: 'any', style: { textAlign: 'center', fontSize: '2.2rem', fontWeight: 'bold' } }}
                  value={countedQty}
                  onChange={(e) => setCountedQty(Math.max(0, parseFloat(e.target.value) || 0))}
                  sx={{ width: 180 }}
                />

                <IconButton
                  color="primary"
                  onClick={() => handleCountStep(1)}
                  sx={{
                    width: 56,
                    height: 56,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }}
                >
                  <Plus size={28} />
                </IconButton>
              </Box>

              {/* Quick Stepper Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                {[5, 10, 25, 50].map(step => (
                  <Button
                    key={step}
                    size="small"
                    variant="outlined"
                    onClick={() => handleCountStep(step)}
                  >
                    +{step}
                  </Button>
                ))}
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={() => setCountedQty(systemStock)}
                >
                  Match System ({systemStock})
                </Button>
              </Box>

              {/* Variance Display */}
              <Box sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: variance === 0 ? 'success.light' : variance < 0 ? 'error.light' : 'info.light',
                color: variance === 0 ? 'success.dark' : variance < 0 ? 'error.dark' : 'info.dark',
                display: 'inline-block',
                minWidth: 260,
                mb: 3
              }}>
                <Typography variant="caption" fontWeight="bold" display="block">
                  LIVE STOCK VARIANCE
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {variance > 0 ? `+${variance}` : variance} {scanResult.product.unit || 'pcs'}
                </Typography>
                <Typography variant="caption">
                  {variance === 0 ? 'Exact count match' : variance < 0 ? 'Physical shortage' : 'Physical surplus'}
                </Typography>
              </Box>

              {/* Non-destructive Notice */}
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <strong>Non-destructive counting:</strong> Clicking +/- or submitting will NOT change live inventory. It creates a verified count session for Warehouse Manager review and approval.
              </Alert>

              {/* Notes */}
              <TextField
                fullWidth
                size="small"
                label="Counter Notes / Observation"
                placeholder="e.g. Found 2 damaged boxes behind shelf..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ mb: 3 }}
              />

              {/* Submit Button */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setScanResult(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmitCount}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send size={20} />}
                  sx={{ px: 4, py: 1.2, fontWeight: 'bold' }}
                >
                  Submit Physical Count
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
