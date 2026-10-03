import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, CircularProgress, Alert, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Divider, TablePagination, InputAdornment,
  Autocomplete, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  Tag, Search, QrCode, Printer, CheckCircle2, XCircle, Package,
  Calendar, Receipt, Truck, User, ArrowRight, RefreshCw, Plus,
  ShieldCheck, AlertTriangle, Eye, Sparkles, Layers, Building2,
  Copy, Check, Volume2, Camera, ShieldAlert, Shield, Clock
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { db } from '../../utils/offlineDb';
import { useNotify } from '../../context/NotificationContext';
import { generateCode128Svg, STICKER_SIZES, printStickers } from '../../utils/stickerGenerator';

// Synthesized audio feedback for barcode scanning
const playBeep = (isSuccess = true) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 note
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
};

export default function SerialNumberSuite({ user, token }) {
  const notify = useNotify();
  const searchInputRef = useRef(null);

  // Search & Lookup State
  const [searchInput, setSearchInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [copied, setCopied] = useState(false);

  // List & Stats State
  const [stats, setStats] = useState({ total_serials: 0, in_stock: 0, sold: 0, generated_today: 0 });
  const [serialsList, setSerialsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Print Dialog State
  const [printDialogVisible, setPrintDialogVisible] = useState(false);
  const [selectedSerialForPrint, setSelectedSerialForPrint] = useState(null);
  const [printSize, setPrintSize] = useState('50x25');
  const [printCopies, setPrintCopies] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Manual Generate / Register Dialog State
  const [generateDialogVisible, setGenerateDialogVisible] = useState(false);
  const [generateMode, setGenerateMode] = useState('auto'); // 'auto' | 'manual'
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [generateQty, setGenerateQty] = useState(1);
  const [manualSerialNumber, setManualSerialNumber] = useState('');
  const [manualSerialError, setManualSerialError] = useState('');
  const [validatingManualSerial, setValidatingManualSerial] = useState(false);
  const [manualSerialValid, setManualSerialValid] = useState(false);
  const [warrantyDurationValue, setWarrantyDurationValue] = useState('');
  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState('months');
  const [generatePoInvoice, setGeneratePoInvoice] = useState('');
  const [generateSupplierName, setGenerateSupplierName] = useState('');
  const [generating, setGenerating] = useState(false);

  // ESC/POS Printers list
  const [printers, setPrinters] = useState([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState('');

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    fetchStats();
    fetchSerials();
    fetchPrinters();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (generateDialogVisible && menuItems.length === 0) {
      fetchMenuItems();
    }
  }, [generateDialogVisible]);

  const fetchStats = async () => {
    try {
      const res = await apiFetch('/api/serial-numbers/stats');
      if (res.ok) {
        const data = await res.json();
        const s = data.stats || data;
        setStats({
          total_serials: Number(s.total_serials ?? s.total ?? 0),
          in_stock: Number(s.in_stock ?? 0),
          sold: Number(s.sold ?? 0),
          generated_today: Number(s.generated_today ?? 0)
        });
      }
    } catch (e) {
      console.warn('Could not load serial stats:', e);
    }
  };

  const fetchSerials = async (
    customPage = page,
    customFilter = statusFilter,
    customQuery = tableSearch,
    customProduct = selectedProductFilter
  ) => {
    setLoadingList(true);
    try {
      const qParams = new URLSearchParams({
        page: customPage + 1,
        limit: rowsPerPage,
        status: customFilter,
        query: customQuery,
        search: customQuery
      });
      if (customProduct && customProduct !== 'all') {
        qParams.append('menu_item_id', customProduct);
      }
      const res = await apiFetch(`/api/serial-numbers?${qParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSerialsList(data.serial_numbers || []);
        setTotalCount(data.pagination?.total ?? data.total ?? 0);
      }
    } catch (err) {
      console.error('Error fetching serials list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      const res = await apiFetch('/api/printers');
      if (res.ok) {
        const data = await res.json();
        setPrinters(data.printers || []);
        if (data.printers?.length > 0) {
          const thermal = data.printers.find(p => p.printer_type === 'escpos' || p.printer_type === 'label' || p.is_default);
          setSelectedPrinterId(thermal ? thermal.id : data.printers[0].id);
        }
      }
    } catch (e) {
      console.warn('Could not load printers list:', e);
    }
  };

  const fetchMenuItems = async () => {
    setLoadingMenuItems(true);
    try {
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await apiFetch('/api/menu', { headers: authHeader });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : (data.menu_items || data.items || data.data || []);
        setMenuItems(items);
        if (items.length > 0 && !selectedProductId) {
          setSelectedProductId(String(items[0].id));
        }
      } else {
        // Fallback to offline indexedDb
        try {
          const localItems = await db.menu_items.toArray();
          if (localItems && localItems.length > 0) {
            setMenuItems(localItems);
            if (!selectedProductId) setSelectedProductId(String(localItems[0].id));
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Could not load menu items:', e);
      try {
        const localItems = await db.menu_items.toArray();
        if (localItems && localItems.length > 0) {
          setMenuItems(localItems);
          if (!selectedProductId) setSelectedProductId(String(localItems[0].id));
        }
      } catch (_) {}
    } finally {
      setLoadingMenuItems(false);
    }
  };

  // Perform 8-digit Serial Number Lookup
  const handleLookup = async (serialQuery) => {
    const clean = String(serialQuery || searchInput).trim();
    if (!clean) {
      notify?.error('Please enter or scan an 8-digit serial number.', 'Validation');
      return;
    }

    setLookingUp(true);
    setLookupError('');
    try {
      const res = await apiFetch(`/api/serial-numbers/lookup?sn=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        playBeep(false);
        setLookupResult(null);
        setLookupError(data.error || `Serial Number "${clean}" not found.`);
        return;
      }

      playBeep(true);
      setLookupResult(data.data);
      setLookupError('');
      // Scroll to lookup details smoothly
      setTimeout(() => {
        const el = document.getElementById('serial-lookup-details-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      playBeep(false);
      setLookupResult(null);
      setLookupError(err.message || 'Failed to lookup serial number.');
    } finally {
      setLookingUp(false);
    }
  };

  // Handle Search Input Keypress (Enter from Handheld USB Scanner or Keyboard)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  // Open Print Modal for a given serial record
  const handleOpenPrint = (serialRecord) => {
    setSelectedSerialForPrint(serialRecord);
    setPrintCopies(1);
    setPrintDialogVisible(true);
  };

  // Execute Thermal Label Sticker Print
  const handlePrintLabel = async () => {
    if (!selectedSerialForPrint) return;
    setIsPrinting(true);
    try {
      const product = selectedSerialForPrint.product || {
        name: selectedSerialForPrint.product_name,
        sku: selectedSerialForPrint.product_sku,
        selling_price: selectedSerialForPrint.selling_price
      };

      const stickerItems = Array(parseInt(printCopies, 10) || 1).fill({
        id: product.id,
        name: product.name,
        sku: product.sku || '',
        barcode: selectedSerialForPrint.serial_number, // The 8-digit serial number as barcode
        selling_price: product.selling_price || product.price || 0,
        mrp: product.mrp || product.selling_price || 0,
        serial_number: selectedSerialForPrint.serial_number,
        customLabel: `SN: ${selectedSerialForPrint.serial_number}`
      });

      const stickerConfig = {
        size: printSize,
        rows: 1,
        spacingMm: 3,
        showShopName: true,
        showProductName: true,
        showBarcode: true,
        showSellingPrice: true,
        showMrp: true,
        showMfgDate: false
      };

      const storeName = user?.restaurant_name || 'ARISO RETAIL';
      await printStickers(stickerItems, stickerConfig, { name: storeName, address: '' });
      notify?.success(`Printed ${printCopies} barcode sticker(s) for Serial #${selectedSerialForPrint.serial_number}`, 'Sticker Print Sent');
      setPrintDialogVisible(false);
    } catch (err) {
      console.error('Print sticker error:', err);
      notify?.error('Failed to dispatch sticker print: ' + err.message, 'Print Error');
    } finally {
      setIsPrinting(false);
    }
  };

  // Execute Thermal ESC/POS Barcode Print through Connected Receipt Machine
  const handlePrintEscpos = async () => {
    if (!selectedSerialForPrint) return;
    setIsPrinting(true);
    try {
      const res = await apiFetch('/api/serial-numbers/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: selectedSerialForPrint.serial_number,
          printer_id: selectedPrinterId || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch to thermal printer.');

      notify?.success(data.message || 'Barcode dispatched to printer machine.', 'ESC/POS Print Sent');
      setPrintDialogVisible(false);
    } catch (err) {
      notify?.error(err.message || 'Thermal printing failed.', 'Print Error');
    } finally {
      setIsPrinting(false);
    }
  };

  // Validate manual serial number on blur / change
  const handleValidateManualSerial = async (serialToTest) => {
    const val = String(serialToTest !== undefined ? serialToTest : manualSerialNumber).trim();
    if (!val) {
      setManualSerialError('');
      setManualSerialValid(false);
      return;
    }
    if (!/^\d{8}$/.test(val)) {
      setManualSerialError('Serial number must be exactly 8 digits (e.g. 12345678).');
      setManualSerialValid(false);
      return;
    }
    setValidatingManualSerial(true);
    try {
      const res = await apiFetch(`/api/serial-numbers/check-availability?sn=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (res.ok && data.available) {
        setManualSerialError('');
        setManualSerialValid(true);
      } else {
        setManualSerialError(data.error || `Serial number "${val}" already exists in the system.`);
        setManualSerialValid(false);
      }
    } catch (e) {
      setManualSerialError('Failed to verify serial number uniqueness.');
      setManualSerialValid(false);
    } finally {
      setValidatingManualSerial(false);
    }
  };

  // Generate or Register Serial Numbers Manually
  const handleGenerateSerials = async () => {
    if (!selectedProductId) {
      notify?.error('Please select a target product.', 'Validation');
      return;
    }

    const isManual = generateMode === 'manual';
    let qty = 1;
    let cleanManualSerial = '';

    if (isManual) {
      cleanManualSerial = String(manualSerialNumber).trim();
      if (!cleanManualSerial) {
        notify?.error('Please enter an 8-digit serial number.', 'Validation');
        setManualSerialError('Please enter an 8-digit serial number.');
        return;
      }
      if (!/^\d{8}$/.test(cleanManualSerial)) {
        notify?.error('Serial number must be exactly 8 digits.', 'Validation');
        setManualSerialError('Serial number must be exactly 8 digits.');
        return;
      }
    } else {
      qty = parseInt(generateQty, 10);
      if (!qty || qty < 1 || qty > 500) {
        notify?.error('Quantity must be between 1 and 500.', 'Validation');
        return;
      }
    }

    let parsedWarranty = null;
    if (warrantyDurationValue && String(warrantyDurationValue).trim() !== '') {
      parsedWarranty = parseInt(warrantyDurationValue, 10);
      if (isNaN(parsedWarranty) || parsedWarranty <= 0) {
        notify?.error('Warranty period must be a positive number.', 'Validation');
        return;
      }
    }

    setGenerating(true);
    try {
      const res = await apiFetch('/api/serial-numbers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: parseInt(selectedProductId, 10),
          quantity: isManual ? 1 : qty,
          mode: isManual ? 'manual' : 'auto',
          serial_number: isManual ? cleanManualSerial : undefined,
          warranty_duration_value: parsedWarranty,
          warranty_duration_unit: warrantyDurationUnit || 'months',
          purchase_invoice_number: generatePoInvoice.trim() || undefined,
          supplier_name: generateSupplierName.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate / register serial numbers.');

      const count = data.created_count || data.data?.quantity || data.data?.serial_numbers?.length || (isManual ? 1 : qty);
      const serials = data.serial_numbers || data.data?.serial_numbers || (isManual ? [cleanManualSerial] : []);

      if (isManual) {
        notify?.success(`Serial #${cleanManualSerial} successfully registered!`, 'Registration Successful');
      } else {
        notify?.success(`Generated ${count} unique 8-digit serial numbers!`, 'Generation Successful');
      }
      setGenerateDialogVisible(false);
      fetchStats();
      fetchSerials(0);

      // Auto-lookup the registered / generated serial for quick inspection
      if (serials && serials.length > 0) {
        setSearchInput(serials[0]);
        handleLookup(serials[0]);
      }
    } catch (err) {
      notify?.error(err.message || 'Operation failed.', 'Error');
      if (isManual && (err.message.includes('already exists') || err.message.includes('already registered'))) {
        setManualSerialError(err.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* --- HEADER TITLE & PERMISSION BADGE --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              p: 1.25,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)'
            }}>
              <Tag size={24} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1 }}>
                Product Serial Number Tracking & Printing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                8-Digit Unique Unit Traceability, Manufacturer Inward & Customer Sale History
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<ShieldCheck size={16} />}
            label="Super Admin Permission Protected"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setGenerateMode('auto');
              setManualSerialNumber('');
              setManualSerialError('');
              setManualSerialValid(false);
              setWarrantyDurationValue('');
              setWarrantyDurationUnit('months');
              setGenerateDialogVisible(true);
              fetchMenuItems();
            }}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5 }}
          >
            Generate Serials
          </Button>
          <IconButton
            onClick={() => { fetchStats(); fetchSerials(); }}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* --- KPI STATS CARDS --- */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Tracked Units
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                  {stats.total_serials.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', color: 'info.main' }}>
                <Layers size={24} />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2, bgcolor: 'background.paper', borderColor: 'success.light' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, textTransform: 'uppercase' }}>
                  In Stock (Available)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.dark' }}>
                  {stats.in_stock.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', color: 'success.main' }}>
                <Package size={24} />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2, bgcolor: 'background.paper', borderColor: 'primary.light' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase' }}>
                  Sold To Customers
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.dark' }}>
                  {stats.sold.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(249, 115, 22, 0.1)', color: 'primary.main' }}>
                <CheckCircle2 size={24} />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Today's Inward Serials
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main' }}>
                  {stats.generated_today.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(168, 85, 247, 0.1)', color: 'secondary.main' }}>
                <Sparkles size={24} />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* --- SCANNER & SEARCH INPUT SECTION --- */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          p: 3,
          bgcolor: 'background.paper',
          border: '2px solid',
          borderColor: 'primary.light',
          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.08)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCode size={22} color="#f97316" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Serial Number Scanner & Lookup
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Volume2 size={14} /> Scan with handheld USB/Bluetooth scanner or enter 8-digit number & press Enter
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              autoFocus
              variant="outlined"
              placeholder="Scan barcode or enter 8-digit serial number (e.g. 12345678)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={22} color="#6b7280" />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearchInput(''); setLookupResult(null); setLookupError(''); searchInputRef.current?.focus(); }}>
                        <XCircle size={18} />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 2.5,
                    fontSize: '1.15rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    bgcolor: 'background.default'
                  }
                }
              }}
            />

            <Button
              variant="contained"
              size="large"
              onClick={() => handleLookup()}
              disabled={lookingUp || !searchInput.trim()}
              startIcon={lookingUp ? <CircularProgress size={20} color="inherit" /> : <Search size={20} />}
              sx={{
                height: 56,
                px: 4,
                borderRadius: 2.5,
                fontWeight: 800,
                fontSize: '1rem',
                textTransform: 'none',
                flexShrink: 0
              }}
            >
              {lookingUp ? 'Searching...' : 'Lookup Unit'}
            </Button>
          </Box>

          {lookupError && (
            <Alert severity="error" sx={{ borderRadius: 2, fontWeight: 600 }}>
              {lookupError}
            </Alert>
          )}
        </Box>
      </Card>

      {/* --- LOOKUP RESULT DETAILS CARD (EXACT CRITERIA) --- */}
      {/* --- LOOKUP RESULT DETAILS CARD (EXACT CRITERIA) --- */}
      {lookupResult && (() => {
        const isDetailWarrantyExpired = Boolean(lookupResult.is_warranty_expired || lookupResult.warranty?.is_warranty_expired);
        const hasDetailWarranty = Boolean(lookupResult.warranty_duration_value || lookupResult.warranty?.has_warranty);
        const detailWarrantyDurationText = lookupResult.warranty_duration_text || lookupResult.warranty?.warranty_duration_text || (lookupResult.warranty_duration_value ? `${lookupResult.warranty_duration_value} ${lookupResult.warranty_duration_unit || 'months'}` : null);
        const detailWarrantyStart = lookupResult.warranty_start_date_formatted || lookupResult.warranty?.warranty_start_date_formatted || lookupResult.sale?.date;
        const detailWarrantyEnd = lookupResult.warranty_end_date_formatted || lookupResult.warranty?.warranty_end_date_formatted;

        return (
          <Card
            id="serial-lookup-details-card"
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
              bgcolor: isDetailWarrantyExpired
                ? (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.06)' : '#fffbfb'
                : 'background.paper',
              border: '2px solid',
              borderColor: isDetailWarrantyExpired
                ? '#ef4444'
                : (lookupResult.is_sold ? 'primary.main' : 'success.main'),
              boxShadow: isDetailWarrantyExpired
                ? '0 10px 30px rgba(239, 68, 68, 0.15)'
                : '0 10px 30px rgba(0,0,0,0.06)'
            }}
          >
            {/* Header Block: Serial Number + Status Badge + Barcode Preview */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              pb: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.1em' }}>
                    Serial Number
                  </Typography>
                  <Chip
                    label={lookupResult.is_sold ? 'SOLD TO CUSTOMER' : 'IN STOCK (NOT SOLD)'}
                    color={lookupResult.is_sold ? 'primary' : 'success'}
                    sx={{ fontWeight: 800, borderRadius: 1.5, px: 1 }}
                  />
                  {isDetailWarrantyExpired ? (
                    <Chip
                      icon={<ShieldAlert size={14} />}
                      label="WARRANTY EXPIRED"
                      color="error"
                      sx={{ fontWeight: 800, borderRadius: 1.5, px: 1 }}
                    />
                  ) : hasDetailWarranty && lookupResult.is_sold ? (
                    <Chip
                      icon={<ShieldCheck size={14} />}
                      label="WARRANTY ACTIVE"
                      color="success"
                      sx={{ fontWeight: 800, borderRadius: 1.5, px: 1 }}
                    />
                  ) : hasDetailWarranty && !lookupResult.is_sold ? (
                    <Chip
                      icon={<Shield size={14} />}
                      label={`WARRANTY: ${detailWarrantyDurationText}`}
                      color="info"
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: 1.5 }}
                    />
                  ) : null}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                  <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em', color: 'text.primary' }}>
                    {lookupResult.serial_number}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy Serial Number'}>
                    <IconButton size="small" onClick={() => copyToClipboard(lookupResult.serial_number)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                      {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mt: 0.5 }}>
                  {lookupResult.product?.name}
                  {lookupResult.product?.sku && (
                    <Box component="span" sx={{ ml: 1, fontSize: '0.9rem', color: 'primary.main', fontWeight: 700 }}>
                      (SKU: {lookupResult.product.sku})
                    </Box>
                  )}
                </Typography>
              </Box>

              {/* Live Barcode Rendering & Dedicated Print Action */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'flex-start', md: 'flex-end' },
                gap: 1.5
              }}>
                <Box
                  sx={{
                    bgcolor: '#ffffff',
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    minWidth: 200,
                    textAlign: 'center'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: generateCode128Svg(lookupResult.serial_number, {
                      width: 1.6,
                      height: 38,
                      fontSize: 10,
                      text: `SN: ${lookupResult.serial_number}`
                    })
                  }}
                />

                <Button
                  variant="contained"
                  color="secondary"
                  size="medium"
                  startIcon={<Printer size={18} />}
                  onClick={() => handleOpenPrint(lookupResult)}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 3,
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)'
                  }}
                >
                  Serial Number Print
                </Button>
              </Box>
            </Box>

            {/* Expired Warranty Highlight Banner */}
            {isDetailWarrantyExpired && (
              <Alert
                severity="error"
                icon={<ShieldAlert size={20} />}
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  fontWeight: 700,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                  border: '1px solid #fecaca'
                }}
              >
                Warranty Expired on {detailWarrantyEnd || 'N/A'} (Duration: {detailWarrantyDurationText || 'N/A'}, Sold on {lookupResult.sale?.date || 'N/A'})
              </Alert>
            )}

            {/* Traceability Grid: Manufacturer Purchase & Customer Sale */}
            <Grid container spacing={3} sx={{ mt: 1 }}>

              {/* 1. Manufacturer Purchase Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderRadius: 2.5,
                    bgcolor: 'rgba(59, 130, 246, 0.02)',
                    borderColor: 'rgba(59, 130, 246, 0.25)',
                    p: 2.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(59, 130, 246, 0.12)', color: 'info.main' }}>
                      <Truck size={20} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'info.dark' }}>
                      Purchased From Manufacturer
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Purchase Date:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: 'monospace' }}>
                        {lookupResult.purchase?.date || 'N/A'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Purchase Invoice:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>
                        {lookupResult.purchase?.invoice || 'N/A'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Supplier / Manufacturer:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {lookupResult.purchase?.supplier_name || 'Direct / Stock Inward'}
                      </Typography>
                    </Box>

                    {lookupResult.warehouse?.name && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Inward Warehouse:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {lookupResult.warehouse.name}
                        </Typography>
                      </Box>
                    )}

                    {lookupResult.purchase?.purchase_cost > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Unit Inward Rate:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          Rs. {lookupResult.purchase.purchase_cost.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Grid>

              {/* 2. Customer Sale Card */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderRadius: 2.5,
                    bgcolor: isDetailWarrantyExpired
                      ? (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(254, 226, 226, 0.45)'
                      : (lookupResult.is_sold ? 'rgba(249, 115, 22, 0.02)' : 'rgba(34, 197, 94, 0.02)'),
                    borderColor: isDetailWarrantyExpired
                      ? 'rgba(239, 68, 68, 0.4)'
                      : (lookupResult.is_sold ? 'rgba(249, 115, 22, 0.25)' : 'rgba(34, 197, 94, 0.3)'),
                    p: 2.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: isDetailWarrantyExpired
                        ? 'rgba(239, 68, 68, 0.15)'
                        : (lookupResult.is_sold ? 'rgba(249, 115, 22, 0.12)' : 'rgba(34, 197, 94, 0.12)'),
                      color: isDetailWarrantyExpired
                        ? 'error.main'
                        : (lookupResult.is_sold ? 'primary.main' : 'success.main')
                    }}>
                      <User size={20} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDetailWarrantyExpired ? 'error.dark' : (lookupResult.is_sold ? 'primary.dark' : 'success.dark') }}>
                      Sold To Customer
                    </Typography>
                  </Box>

                  {lookupResult.is_sold ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Customer Sale Date:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: 'monospace' }}>
                          {lookupResult.sale?.date || 'N/A'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Sales Invoice:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>
                          {lookupResult.sale?.invoice || 'N/A'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Customer Name:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {lookupResult.sale?.customer_name || 'Walk-in Customer'}
                          {lookupResult.sale?.customer_phone && ` (${lookupResult.sale.customer_phone})`}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Payment Mode:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                          {lookupResult.sale?.payment_mode || 'Cash'}
                        </Typography>
                      </Box>

                      {/* Warranty Details in Customer Sale block */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Warranty Coverage:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: hasDetailWarranty ? 'text.primary' : 'text.secondary' }}>
                          {hasDetailWarranty ? detailWarrantyDurationText : 'No Warranty'}
                        </Typography>
                      </Box>

                      {hasDetailWarranty && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              Warranty Start Date:
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: 'monospace' }}>
                              {detailWarrantyStart || lookupResult.sale?.date || 'N/A'}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', pb: 1 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              Warranty End Date:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 800, color: isDetailWarrantyExpired ? 'error.main' : 'text.primary', fontFamily: 'monospace' }}>
                                {detailWarrantyEnd || 'N/A'}
                              </Typography>
                              {isDetailWarrantyExpired ? (
                                <Chip label="Expired" color="error" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                              ) : (
                                <Chip label="Active" color="success" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                              )}
                            </Box>
                          </Box>
                        </>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Billed Price:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'success.dark' }}>
                          Rs. {(lookupResult.sale?.sale_price || lookupResult.product?.selling_price || 0).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    /* Prominently Styled 'Not Sold' Section */
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 3,
                      textAlign: 'center',
                      bgcolor: 'rgba(34, 197, 94, 0.04)',
                      borderRadius: 2,
                      border: '1.5px dashed rgba(34, 197, 94, 0.4)'
                    }}>
                      <CheckCircle2 size={40} color="#16a34a" />
                      <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.main', mt: 1, letterSpacing: '0.02em' }}>
                        Not Sold
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360 }}>
                        This product unit is currently in stock, active in inventory, and available for retail POS billing.
                      </Typography>
                      <Chip
                        label="Available for Checkout"
                        color="success"
                        size="small"
                        sx={{ mt: 1.5, fontWeight: 700 }}
                      />

                      {hasDetailWarranty && (
                        <Box sx={{
                          mt: 2,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'rgba(59, 130, 246, 0.08)',
                          border: '1px dashed rgba(59, 130, 246, 0.3)',
                          width: '100%',
                          maxWidth: 360,
                          textAlign: 'left'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ShieldCheck size={15} /> Warranty Configured: {detailWarrantyDurationText}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                            Clock has not started. Warranty will commence on customer sale date upon POS billing.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Card>
              </Grid>
            </Grid>
          </Card>
        );
      })()}

      {/* --- MASTER SERIAL NUMBERS AUDIT TABLE --- */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Box sx={{
          p: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Master Serial Number Inventory
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Perpetual ledger of all generated 8-digit serials, purchase provenance & retail sales
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Status Filter Chips with Live Counts */}
            <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'action.hover', p: 0.5, borderRadius: 2 }}>
              <Chip
                label={`All (${stats.total_serials || totalCount || 0})`}
                clickable
                color={statusFilter === 'all' ? 'primary' : 'default'}
                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => {
                  setStatusFilter('all');
                  setPage(0);
                  fetchSerials(0, 'all', tableSearch, selectedProductFilter);
                }}
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`In Stock (${stats.in_stock || 0})`}
                clickable
                color={statusFilter === 'in_stock' ? 'success' : 'default'}
                variant={statusFilter === 'in_stock' ? 'filled' : 'outlined'}
                onClick={() => {
                  setStatusFilter('in_stock');
                  setPage(0);
                  fetchSerials(0, 'in_stock', tableSearch, selectedProductFilter);
                }}
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`Sold (${stats.sold || 0})`}
                clickable
                color={statusFilter === 'sold' ? 'info' : 'default'}
                variant={statusFilter === 'sold' ? 'filled' : 'outlined'}
                onClick={() => {
                  setStatusFilter('sold');
                  setPage(0);
                  fetchSerials(0, 'sold', tableSearch, selectedProductFilter);
                }}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            {/* Product Filter Dropdown */}
            <FormControl size="small" sx={{ minWidth: 200, maxWidth: 260 }}>
              <InputLabel id="product-filter-label" sx={{ fontSize: '0.85rem' }}>Filter Product</InputLabel>
              <Select
                labelId="product-filter-label"
                value={selectedProductFilter}
                label="Filter Product"
                onChange={(e) => {
                  const newProduct = e.target.value;
                  setSelectedProductFilter(newProduct);
                  setPage(0);
                  fetchSerials(0, statusFilter, tableSearch, newProduct);
                }}
                sx={{ borderRadius: 2, height: 38, fontSize: '0.85rem' }}
              >
                <MenuItem value="all">
                  <em>All Products ({stats.total_serials || totalCount})</em>
                </MenuItem>
                {menuItems.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.name} {item.sku ? `(${item.sku})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quick Filter Search */}
            <TextField
              size="small"
              placeholder="Search serial, product, invoice..."
              value={tableSearch}
              onChange={(e) => {
                const val = e.target.value;
                setTableSearch(val);
                setPage(0);
                fetchSerials(0, statusFilter, val, selectedProductFilter);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#9ca3af" />
                    </InputAdornment>
                  ),
                  endAdornment: tableSearch && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setTableSearch('');
                          setPage(0);
                          fetchSerials(0, statusFilter, '', selectedProductFilter);
                        }}
                      >
                        <XCircle size={15} />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, minWidth: 220 }
                }
              }}
            />

            {/* Refresh Button */}
            <Tooltip title="Refresh serial inventory table">
              <IconButton
                size="small"
                onClick={() => {
                  fetchStats();
                  fetchSerials(page, statusFilter, tableSearch, selectedProductFilter);
                }}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.9 }}
              >
                <RefreshCw size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    fontWeight: 800,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc',
                    color: (theme) => theme.palette.mode === 'dark' ? '#f8fafc' : '#1e293b',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    whiteSpace: 'nowrap',
                    zIndex: 3
                  }
                }}
              >
                <TableCell>Serial # (8-Digit)</TableCell>
                <TableCell>Product Item</TableCell>
                <TableCell>SKU / Barcode</TableCell>
                <TableCell>Purchase Date</TableCell>
                <TableCell>Purchase Invoice</TableCell>
                <TableCell>Sale Date</TableCell>
                <TableCell>Sales Invoice</TableCell>
                <TableCell>Current Status</TableCell>
                <TableCell>Warranty Start</TableCell>
                <TableCell>Warranty End</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>Loading serial inventory...</Typography>
                  </TableCell>
                </TableRow>
              ) : serialsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Tag size={36} color="#9ca3af" />
                    <Typography variant="body1" sx={{ mt: 1, fontWeight: 700 }}>No serial numbers found</Typography>
                    <Typography variant="caption">Receive stock via Purchase Bills / GRN or click "Generate Serials" above.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                serialsList.map((row) => {
                  const isSold = row.status === 'sold' || Boolean(row.order_id);
                  const hasWarranty = Boolean(row.warranty_duration_value || row.warranty?.has_warranty);
                  const isWarrantyExpired = Boolean(row.is_warranty_expired || row.warranty?.is_warranty_expired);

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        bgcolor: isWarrantyExpired
                          ? (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(254, 226, 226, 0.45)'
                          : 'inherit',
                        borderLeft: isWarrantyExpired ? '4px solid #ef4444' : 'none',
                        '&:hover': {
                          bgcolor: isWarrantyExpired
                            ? (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.20)' : 'rgba(254, 226, 226, 0.70)'
                            : undefined
                        }
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main', fontSize: '0.95rem' }}>
                        {row.serial_number}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.product_name}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {row.product_sku || row.product_barcode || '-'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {row.purchase_date_formatted || row.purchase_date || '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'info.main' }}>
                        {row.purchase_invoice_number || row.purchase_invoice || '-'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {isSold ? (row.sale_date_formatted || row.sale_date || '-') : '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: isSold ? 'secondary.main' : 'text.disabled' }}>
                        {isSold ? (row.sales_invoice_number || row.sales_invoice || row.unique_order_number || '-') : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isSold ? 'Sold' : 'Not Sold'}
                          color={isSold ? 'primary' : 'success'}
                          size="small"
                          sx={{ fontWeight: 700, borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {!hasWarranty ? (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                        ) : !isSold ? (
                          <Chip
                            label="Not Started"
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', borderColor: 'divider' }}
                          />
                        ) : (
                          row.warranty_start_date_formatted || row.warranty_start_date || row.sale_date_formatted || row.sale_date || '—'
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {!hasWarranty ? (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                        ) : !isSold ? (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {row.warranty_duration_text || `${row.warranty_duration_value} ${row.warranty_duration_unit || 'mo'}`} (On Sale)
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box component="span" sx={{ fontWeight: isWarrantyExpired ? 700 : 500, color: isWarrantyExpired ? 'error.main' : 'inherit' }}>
                              {row.warranty_end_date_formatted || row.warranty_end_date || '—'}
                            </Box>
                            {isWarrantyExpired ? (
                              <Chip
                                label="Expired"
                                size="small"
                                color="error"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, px: 0.5 }}
                              />
                            ) : (
                              <Chip
                                label="Active"
                                size="small"
                                color="success"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, px: 0.5 }}
                              />
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="View Complete Traceability">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSearchInput(row.serial_number);
                              handleLookup(row.serial_number);
                            }}
                          >
                            <Eye size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print Barcode">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleOpenPrint({
                              ...row,
                              product: {
                                id: row.menu_item_id,
                                name: row.product_name,
                                sku: row.product_sku,
                                selling_price: row.product_price
                              }
                            })}
                          >
                            <Printer size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, 200]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => {
            setPage(newPage);
            fetchSerials(newPage, statusFilter, tableSearch, selectedProductFilter);
          }}
          onRowsPerPageChange={(e) => {
            const newL = parseInt(e.target.value, 10);
            setRowsPerPage(newL);
            setPage(0);
            fetchSerials(0, statusFilter, tableSearch, selectedProductFilter);
          }}
        />
      </Card>

      {/* --- DEDICATED SERIAL NUMBER PRINT DIALOG --- */}
      <Dialog
        open={printDialogVisible}
        onClose={() => setPrintDialogVisible(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Printer size={22} color="#9333ea" />
          Print Serial Number Barcode
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {selectedSerialForPrint && (
            <Box>
              {/* Barcode Sticker Live Preview */}
              <Box sx={{
                p: 2.5,
                bgcolor: '#f8fafc',
                borderRadius: 2.5,
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                  {user?.restaurant_name || 'ARISO RETAIL'}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5, maxWidth: 280 }}>
                  {selectedSerialForPrint.product?.name || selectedSerialForPrint.product_name}
                </Typography>

                <Box
                  sx={{ my: 1, p: 1, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px solid #e2e8f0' }}
                  dangerouslySetInnerHTML={{
                    __html: generateCode128Svg(selectedSerialForPrint.serial_number, {
                      width: 1.5,
                      height: 38,
                      fontSize: 10,
                      text: `SN: ${selectedSerialForPrint.serial_number}`
                    })
                  }}
                />

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    Rs. {(selectedSerialForPrint.product?.selling_price || selectedSerialForPrint.product_price || 0).toFixed(2)}
                  </Typography>
                  {selectedSerialForPrint.purchase?.invoice && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Inv: {selectedSerialForPrint.purchase.invoice}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Print Config Form */}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sticker Size</InputLabel>
                    <Select
                      value={printSize}
                      label="Sticker Size"
                      onChange={(e) => setPrintSize(e.target.value)}
                    >
                      <MenuItem value="50x25">50 × 25 mm (Shelf/Barcode Label)</MenuItem>
                      <MenuItem value="38x38">38 × 38 mm (Square Retail Label)</MenuItem>
                      <MenuItem value="38x50">38 × 50 mm (Portrait Product Label)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Copies"
                    value={printCopies}
                    onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    slotProps={{ htmlInput: { min: 1, max: 50 } }}
                  />
                </Grid>
                {printers.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Connected Thermal Machine</InputLabel>
                      <Select
                        value={selectedPrinterId}
                        label="Connected Thermal Machine"
                        onChange={(e) => setSelectedPrinterId(e.target.value)}
                      >
                        {printers.map(p => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} ({p.printer_type || 'ESC/POS'}) - {p.ip_address || p.interface || 'Local'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setPrintDialogVisible(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          {printers.length > 0 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={handlePrintEscpos}
              disabled={isPrinting}
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
            >
              Print ESC/POS Machine
            </Button>
          )}
          <Button
            variant="contained"
            color="secondary"
            onClick={handlePrintLabel}
            disabled={isPrinting}
            startIcon={isPrinting ? <CircularProgress size={18} color="inherit" /> : <Printer size={18} />}
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, px: 2.5 }}
          >
            {isPrinting ? 'Printing...' : 'Print Sticker Label'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MANUAL SERIAL GENERATION DIALOG --- */}
      <Dialog
        open={generateDialogVisible}
        onClose={() => setGenerateDialogVisible(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Plus size={22} color="#f97316" />
          Generate 8-Digit Serial Numbers
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
            Automatically creates guaranteed unique 8-digit serial numbers permanently linked to the selected product and ready for barcode printing.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
              Target Product Selection
            </Typography>
            <Button
              size="small"
              onClick={fetchMenuItems}
              disabled={loadingMenuItems}
              startIcon={<RefreshCw size={13} />}
              sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}
            >
              {loadingMenuItems ? 'Refreshing...' : 'Reload Catalog'}
            </Button>
          </Box>

          <Autocomplete
            options={menuItems}
            loading={loadingMenuItems}
            openOnFocus
            selectOnFocus
            clearOnBlur={false}
            slotProps={{
              popper: {
                sx: { zIndex: 1400 }
              }
            }}
            getOptionKey={(opt) => (opt && opt.id ? `product-${opt.id}` : String(opt))}
            getOptionLabel={(opt) => {
              if (!opt) return '';
              const parts = [opt.name || 'Unnamed Product'];
              if (opt.sku) parts.push(`(SKU: ${opt.sku})`);
              else if (opt.barcode) parts.push(`(Barcode: ${opt.barcode})`);
              if (opt.price !== undefined) parts.push(`₹${parseFloat(opt.price || 0).toFixed(2)}`);
              return parts.join(' - ');
            }}
            filterOptions={(options, state) => {
              const q = (state.inputValue || '').toLowerCase().trim();
              if (!q) return options;
              return options.filter(opt => {
                const name = (opt.name || '').toLowerCase();
                const sku = (opt.sku || '').toLowerCase();
                const barcode = (opt.barcode || '').toLowerCase();
                return name.includes(q) || sku.includes(q) || barcode.includes(q);
              });
            }}
            value={menuItems.find(m => String(m.id) === String(selectedProductId)) || null}
            onChange={(e, newVal) => setSelectedProductId(newVal ? String(newVal.id) : '')}
            isOptionEqualToValue={(option, val) => String(option?.id) === String(val?.id)}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li
                  key={option.id ? `product-opt-${option.id}` : key}
                  {...rest}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 14px',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', pointerEvents: 'none' }}>
                    {option.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', pointerEvents: 'none' }}>
                    {option.sku && (
                      <Chip
                        label={`SKU: ${option.sku}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, pointerEvents: 'none' }}
                      />
                    )}
                    {option.barcode && !option.sku && (
                      <Chip
                        label={`Barcode: ${option.barcode}`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, pointerEvents: 'none' }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, pointerEvents: 'none' }}>
                      ₹{parseFloat(option.price || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Target Product / Menu Item *"
                size="small"
                placeholder={loadingMenuItems ? "Loading products..." : "Click to select or search product..."}
                helperText={
                  loadingMenuItems
                    ? "Fetching products catalog..."
                    : menuItems.length === 0
                      ? "No products found. Please add products in Menu Management first."
                      : `${menuItems.length} products available for serial generation`
                }
              />
            )}
            noOptionsText={loadingMenuItems ? "Loading products..." : "No matching products found"}
          />

          {selectedProductId && (() => {
            const prod = menuItems.find(m => String(m.id) === String(selectedProductId));
            if (!prod) return null;
            return (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                  borderColor: 'primary.light',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {prod.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {prod.sku ? `SKU: ${prod.sku}` : ''} {prod.barcode ? `• Barcode: ${prod.barcode}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                    ₹{parseFloat(prod.price || 0).toFixed(2)}
                  </Typography>
                  {prod.current_stock !== undefined && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Stock: {prod.current_stock}
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })()}

          {/* Alternate Mode Toggle: Auto-Generate vs Enter Manually */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
              Entry Mode
            </Typography>
            <ToggleButtonGroup
              value={generateMode}
              exclusive
              onChange={(e, val) => {
                if (val) {
                  setGenerateMode(val);
                  setManualSerialError('');
                }
              }}
              size="small"
              fullWidth
              sx={{ bgcolor: 'action.hover', p: 0.5, borderRadius: 2 }}
            >
              <ToggleButton
                value="auto"
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  gap: 1,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }
                }}
              >
                <Sparkles size={16} />
                Auto-Generate
              </ToggleButton>
              <ToggleButton
                value="manual"
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  gap: 1,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }
                }}
              >
                <Tag size={16} />
                Enter Manually
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Mode-specific Input */}
          {generateMode === 'auto' ? (
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Quantity of Serial Numbers to Generate *"
              value={generateQty}
              onChange={(e) => setGenerateQty(e.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 500 } }}
              helperText="1 unit = 1 unique 8-digit serial number"
            />
          ) : (
            <TextField
              fullWidth
              size="small"
              label="Serial Number (8 Digits) *"
              placeholder="e.g. 96106332 (Pre-printed on product)"
              value={manualSerialNumber}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 8);
                setManualSerialNumber(clean);
                if (clean.length === 8) {
                  handleValidateManualSerial(clean);
                } else if (clean.length > 0) {
                  setManualSerialError('Serial number must be exactly 8 digits.');
                  setManualSerialValid(false);
                } else {
                  setManualSerialError('');
                  setManualSerialValid(false);
                }
              }}
              onBlur={() => {
                if (manualSerialNumber.length > 0) {
                  handleValidateManualSerial(manualSerialNumber);
                }
              }}
              error={Boolean(manualSerialError)}
              helperText={
                manualSerialError || (manualSerialValid
                  ? '✅ Valid and unique 8-digit serial number ready for registration'
                  : 'Enter the exact 8-digit serial number printed on the product or packaging')
              }
              slotProps={{
                input: {
                  endAdornment: validatingManualSerial ? (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : manualSerialValid ? (
                    <InputAdornment position="end">
                      <CheckCircle2 size={18} color="#16a34a" />
                    </InputAdornment>
                  ) : null,
                  sx: { fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }
                }
              }}
            />
          )}

          {/* Warranty Duration Field (Optional) */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldCheck size={16} color="#0284c7" />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                Warranty Period (Optional)
              </Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 7, sm: 8 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Warranty Duration"
                  placeholder="e.g. 12 or 1"
                  value={warrantyDurationValue}
                  onChange={(e) => setWarrantyDurationValue(e.target.value)}
                  slotProps={{ htmlInput: { min: 1, max: 120 } }}
                  helperText="Leave blank for no warranty. Clock starts upon customer sale date."
                />
              </Grid>
              <Grid size={{ xs: 5, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={warrantyDurationUnit}
                    label="Unit"
                    onChange={(e) => setWarrantyDurationUnit(e.target.value)}
                  >
                    <MenuItem value="months">Months</MenuItem>
                    <MenuItem value="years">Years</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <TextField
            fullWidth
            size="small"
            label="Purchase Invoice / Bill Number (Optional)"
            placeholder="e.g. PUR-10245"
            value={generatePoInvoice}
            onChange={(e) => setGeneratePoInvoice(e.target.value)}
          />

          <TextField
            fullWidth
            size="small"
            label="Manufacturer / Supplier Name (Optional)"
            placeholder="e.g. Apex Electronics Ltd"
            value={generateSupplierName}
            onChange={(e) => setGenerateSupplierName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setGenerateDialogVisible(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateSerials}
            disabled={
              generating ||
              !selectedProductId ||
              (generateMode === 'manual' && (!manualSerialNumber || manualSerialNumber.length !== 8 || Boolean(manualSerialError)))
            }
            startIcon={
              generating ? (
                <CircularProgress size={18} color="inherit" />
              ) : generateMode === 'manual' ? (
                <Tag size={18} />
              ) : (
                <Sparkles size={18} />
              )
            }
            sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2, px: 3 }}
          >
            {generating
              ? generateMode === 'manual' ? 'Registering...' : 'Generating...'
              : generateMode === 'manual' ? 'Register Serial Number' : 'Generate 8-Digit Serials'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
