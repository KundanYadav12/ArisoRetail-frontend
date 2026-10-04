import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  TextField, Button, Chip, IconButton, CircularProgress, Alert, Tooltip,
  InputAdornment, Paper
} from '@mui/material';
import {
  Tag, Search, QrCode, X, Check, ShoppingCart, Calendar, Receipt,
  Building2, AlertTriangle, Sparkles, CheckCircle2, CornerDownLeft
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function SerialSelectionModal({
  isOpen,
  product,
  alreadyInCartSerials = [],
  pricingMode = 'retail',
  onConfirm,
  onClose
}) {
  const notify = useNotify();
  const inputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [selectedSerials, setSelectedSerials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const prodId = product?.id || product?.menu_item_id || product?.product_id;

  // Resolve price
  const isWholesale = pricingMode === 'wholesale';
  const unitPrice = (isWholesale && product?.wholesale_price && parseFloat(product.wholesale_price) > 0)
    ? parseFloat(product.wholesale_price)
    : parseFloat(product?.price || product?.selling_price || 0);

  // Fetch available serial numbers whenever modal opens
  useEffect(() => {
    if (isOpen && prodId) {
      setSelectedSerials([]);
      setSearchQuery('');
      setErrorMessage('');
      fetchAvailableSerials(prodId);

      // Auto-focus the scanner input after opening
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, prodId]);

  const fetchAvailableSerials = async (menuItemId) => {
    setLoading(true);
    setErrorMessage('');
    try {
      // First try dedicated available endpoint
      const res = await apiFetch(`/api/serial-numbers/available?menu_item_id=${menuItemId}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.serial_numbers || data.data || [];
        setAvailableSerials(list);
      } else {
        // Fallback to list endpoint with status=in_stock
        const fbRes = await apiFetch(`/api/serial-numbers?status=in_stock&menu_item_id=${menuItemId}&limit=500`);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setAvailableSerials(fbData.serial_numbers || []);
        } else {
          setErrorMessage('Could not load available serial numbers for this product.');
        }
      }
    } catch (err) {
      console.warn('Error fetching available serials:', err);
      setErrorMessage('Failed to connect to server. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Filter available serials based on search input
  const filteredSerials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableSerials;
    return availableSerials.filter(s => {
      const sn = String(s.serial_number || '').toLowerCase();
      const inv = String(s.purchase_invoice || s.purchase_invoice_number || '').toLowerCase();
      const wh = String(s.warehouse_name || '').toLowerCase();
      return sn.includes(q) || inv.includes(q) || wh.includes(q);
    });
  }, [availableSerials, searchQuery]);

  // Set of serials already in cart
  const cartSerialsSet = useMemo(() => {
    const set = new Set();
    (alreadyInCartSerials || []).forEach(sn => {
      if (sn) set.add(String(sn).trim());
    });
    return set;
  }, [alreadyInCartSerials]);

  // Toggle selection of a serial number
  const toggleSelectSerial = (sn) => {
    const clean = String(sn).trim();
    if (cartSerialsSet.has(clean)) {
      notify?.warning(`Serial #${clean} is already added in the cart.`, 'Already In Cart');
      return;
    }

    setSelectedSerials(prev => {
      if (prev.includes(clean)) {
        return prev.filter(s => s !== clean);
      } else {
        return [...prev, clean];
      }
    });
  };

  // Confirm selection & add to cart
  const handleConfirm = (serialsToSubmit = selectedSerials) => {
    if (!serialsToSubmit || serialsToSubmit.length === 0) {
      notify?.warning('Please scan or select at least one serial number.', 'Selection Required');
      return;
    }

    if (onConfirm) {
      onConfirm(serialsToSubmit, product);
    }
    if (onClose) {
      onClose();
    }
  };

  // KeyDown handler for scanner & instant confirm
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const candidate = searchQuery.trim();

      // Case 1: Cashier scanned/typed a candidate serial into the input
      if (candidate) {
        // Look for match in available serials
        const exactMatch = availableSerials.find(
          s => String(s.serial_number).trim() === candidate
        );

        if (exactMatch) {
          const matchSerial = String(exactMatch.serial_number).trim();
          if (cartSerialsSet.has(matchSerial)) {
            notify?.error(`Serial #${matchSerial} is already in the cart.`, 'Already In Cart');
            setSearchQuery('');
            return;
          }

          // If not yet in selected list, add it
          let nextSelected = selectedSerials;
          if (!selectedSerials.includes(matchSerial)) {
            nextSelected = [...selectedSerials, matchSerial];
          }

          // Instant add & close on Enter!
          handleConfirm(nextSelected);
          return;
        } else {
          // If no match in available list
          if (cartSerialsSet.has(candidate)) {
            notify?.error(`Serial #${candidate} is already in the cart.`, 'Already In Cart');
          } else {
            notify?.error(`Serial #${candidate} not found in available in-stock inventory for this product.`, 'Not Available');
          }
          setSearchQuery('');
          return;
        }
      }

      // Case 2: Input is empty, but items were selected via click -> confirm and close!
      if (selectedSerials.length > 0) {
        handleConfirm(selectedSerials);
      } else {
        notify?.warning('Scan or select a serial number first.', 'No Serial Selected');
      }
    } else if (e.key === 'Escape') {
      if (onClose) onClose();
    }
  };

  // Select all visible / clear all
  const handleSelectAllVisible = () => {
    const validVisible = filteredSerials
      .map(s => String(s.serial_number).trim())
      .filter(sn => !cartSerialsSet.has(sn));

    setSelectedSerials(validVisible);
  };

  const handleClearSelection = () => {
    setSelectedSerials([]);
  };

  if (!isOpen || !product) return null;

  const totalCalculated = (selectedSerials.length * unitPrice).toFixed(2);
  const inStockCount = availableSerials.length;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            maxHeight: '90vh'
          }
        }
      }}
    >
      {/* ── Dialog Header ── */}
      <DialogTitle
        sx={{
          p: 2.2,
          pb: 1.8,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e1b4b' : '#faf5ff',
          borderBottom: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark' ? '#312e81' : '#f3e8ff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: '#9333ea',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(147, 51, 234, 0.35)'
            }}
          >
            <Tag size={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'text.primary', lineHeight: 1.2 }}>
                {product.name}
              </Typography>
              <Chip
                label="SERIAL NUMBER TRACKED"
                size="small"
                sx={{
                  bgcolor: '#9333ea',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '9.5px',
                  height: 20,
                  letterSpacing: 0.5
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <span>SKU: <strong>{product.sku || product.barcode || '—'}</strong></span>
              <span>•</span>
              <span>Rate: <strong style={{ color: '#9333ea' }}>Rs. {unitPrice.toFixed(2)}</strong></span>
              <span>•</span>
              <span style={{ color: inStockCount > 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                {inStockCount} in stock
              </span>
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      {/* ── Dialog Content ── */}
      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Scanner & Quick Search Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            border: '2px solid',
            borderColor: '#9333ea',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#18181b' : '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#9333ea', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Scan Barcode or Search 8-Digit Serial
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600 }}>
              Press <kbd style={{ padding: '1px 5px', borderRadius: 4, background: '#e2e8f0', border: '1px solid #cbd5e1', fontSize: '10px' }}>Enter ↵</kbd> to add instantly
            </Typography>
          </Box>

          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            placeholder="Scan barcode with handheld scanner or type 8-digit serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCode size={18} color="#9333ea" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : (
                  <InputAdornment position="end">
                    <Chip
                      label="Scanner Ready"
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '10px', fontWeight: 700 }}
                    />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  bgcolor: 'background.paper'
                }
              }
            }}
          />
        </Paper>

        {errorMessage && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Action Controls & Multi-Select Counts */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Available In-Stock Serials ({filteredSerials.length})
            </Typography>
            {selectedSerials.length > 0 && (
              <Chip
                label={`${selectedSerials.length} selected`}
                color="secondary"
                size="small"
                sx={{ fontWeight: 800, fontSize: '11px' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={handleSelectAllVisible}
              disabled={filteredSerials.length === 0}
              sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'none' }}
            >
              Select All Visible
            </Button>
            {selectedSerials.length > 0 && (
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={handleClearSelection}
                sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'none' }}
              >
                Clear Selection
              </Button>
            )}
          </Box>
        </Box>

        {/* Serials Grid List */}
        <Box
          sx={{
            minHeight: 220,
            maxHeight: 360,
            overflowY: 'auto',
            p: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2.5,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#09090b' : '#f8fafc'
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: '#9333ea' }} />
              <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                Loading in-stock serial numbers...
              </Typography>
            </Box>
          ) : filteredSerials.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
              <Tag size={40} color="#9ca3af" />
              <Typography variant="body1" sx={{ mt: 1, fontWeight: 700 }}>
                {searchQuery ? `No serial matching "${searchQuery}"` : 'No in-stock serial numbers available'}
              </Typography>
              <Typography variant="caption" sx={{ mt: 0.5, maxWidth: 360, textAlign: 'center' }}>
                {searchQuery
                  ? 'Verify the scanned 8-digit number or check if it was already sold in another invoice.'
                  : 'All units of this product have already been sold or none were generated yet in Master Serial Number Inventory.'}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 1.25
              }}
            >
              {filteredSerials.map((s) => {
                const sn = String(s.serial_number).trim();
                const isSelected = selectedSerials.includes(sn);
                const isInCart = cartSerialsSet.has(sn);

                return (
                  <Paper
                    key={s.id || sn}
                    variant="outlined"
                    onClick={() => !isInCart && toggleSelectSerial(sn)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: isInCart ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      border: '2px solid',
                      borderColor: isInCart
                        ? 'divider'
                        : isSelected
                        ? '#9333ea'
                        : 'divider',
                      bgcolor: isInCart
                        ? (theme) => theme.palette.mode === 'dark' ? '#18181b' : '#f1f5f9'
                        : isSelected
                        ? (theme) => theme.palette.mode === 'dark' ? '#2e1065' : '#faf5ff'
                        : 'background.paper',
                      opacity: isInCart ? 0.6 : 1,
                      boxShadow: isSelected ? '0 4px 12px rgba(147, 51, 234, 0.2)' : 'none',
                      '&:hover': isInCart ? {} : {
                        borderColor: '#9333ea',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Tag size={15} color="#9333ea" />
                        <Typography
                          variant="body1"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            letterSpacing: 1,
                            color: isSelected ? '#9333ea' : 'text.primary'
                          }}
                        >
                          {sn}
                        </Typography>
                      </Box>
                      {isInCart ? (
                        <Chip
                          label="In Cart"
                          size="small"
                          color="warning"
                          sx={{ height: 20, fontSize: '10px', fontWeight: 800 }}
                        />
                      ) : isSelected ? (
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: '#9333ea',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={14} strokeWidth={3} />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: 'text.disabled'
                          }}
                        />
                      )}
                    </Box>

                    {/* Metadata Provenance */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, fontSize: '11px', color: 'text.secondary' }}>
                      {(s.purchase_date || s.purchase_date_formatted) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Calendar size={12} />
                          <span>Inward: {s.purchase_date_formatted || s.purchase_date}</span>
                        </Box>
                      )}
                      {(s.purchase_invoice || s.purchase_invoice_number) && s.purchase_invoice !== 'N/A' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Receipt size={12} />
                          <span style={{ fontFamily: 'monospace' }}>Inv: {s.purchase_invoice || s.purchase_invoice_number}</span>
                        </Box>
                      )}
                      {s.warehouse_name && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Building2 size={12} />
                          <span>{s.warehouse_name}</span>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* ── Dialog Actions ── */}
      <DialogActions
        sx={{
          p: 2,
          px: 2.5,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#18181b' : '#f8fafc',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            Selected: <span style={{ color: '#9333ea', fontSize: '1.1rem' }}>{selectedSerials.length}</span> unit{selectedSerials.length !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Total: <strong>Rs. {totalCalculated}</strong> ({selectedSerials.length} × Rs. {unitPrice.toFixed(2)})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Cancel (Esc)
          </Button>
          <Button
            variant="contained"
            onClick={() => handleConfirm()}
            disabled={selectedSerials.length === 0}
            startIcon={<ShoppingCart size={18} />}
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              px: 3,
              bgcolor: '#9333ea',
              '&:hover': { bgcolor: '#7e22ce' },
              boxShadow: '0 4px 12px rgba(147, 51, 234, 0.35)'
            }}
          >
            Add to Cart ({selectedSerials.length}) ↵
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
