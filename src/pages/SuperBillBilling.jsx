import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment, Grid, Card,
  CardMedia, Button, Chip, IconButton, Paper, Badge, Alert, CircularProgress
} from '@mui/material';
import SuperBillCartSummary from './SuperBillCartSummary';
import WebBarcodeScannerModal from '../components/WebBarcodeScannerModal';

// Success beep — Web Audio API
function playSuccessBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (_) {}
}

// Not-found beep — lower double blip
function playNotFoundBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.12);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.12);
    });
  } catch (_) {}
}

export default function SuperBillBilling({ user }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [openCartSummary, setOpenCartSummary] = useState(false);

  // Barcode scanner states
  const barcodeScannerEnabled = !!(user?.barcode_scanner_enabled);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);  // { code, status: 'found' | 'not_found', item }
  const [lastScannedTimer, setLastScannedTimer] = useState(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('ariso_retail_token') || sessionStorage.getItem('ariso_retail_token');
      const res = await fetch(`/api/superbill/items?search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lastScannedTimer) clearTimeout(lastScannedTimer);
    };
  }, []);

  // Handle a detected barcode code
  const handleBarcodeScan = (code) => {
    if (!code) return;

    const clean = code.trim().toLowerCase();
    const matched = items.find(
      (p) => (p.barcode || '').toLowerCase() === clean ||
              (p.sku || '').toLowerCase() === clean
    );

    if (matched) {
      playSuccessBeep();
      handleAddToCart(matched);
      setLastScanned({ code, status: 'found', item: matched, ts: Date.now() });
      if (lastScannedTimer) clearTimeout(lastScannedTimer);
      setLastScannedTimer(setTimeout(() => setLastScanned(null), 3000));
      return { success: true, message: `${matched.name} added to cart` };
    } else {
      playNotFoundBeep();
      setLastScanned({ code, status: 'not_found', item: null, ts: Date.now() });
      if (lastScannedTimer) clearTimeout(lastScannedTimer);
      setLastScannedTimer(setTimeout(() => setLastScanned(null), 3000));
      return { success: false, message: `No item found for barcode "${code}"` };
    }
  };

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === item.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity = (updated[existingIdx].quantity || 1) + 1;
        return updated;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleRemoveOneFromCart = (item) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === item.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        if (updated[existingIdx].quantity > 1) {
          updated[existingIdx].quantity -= 1;
          return updated;
        } else {
          return updated.filter((i) => i.id !== item.id);
        }
      }
      return prev;
    });
  };

  const getItemCartQty = (itemId) => {
    const found = cart.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
  };

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const filteredItems = items.filter((item) => {
    if (selectedCat !== 'all' && item.category_id !== parseInt(selectedCat)) {
      return false;
    }
    return true;
  });

  return (
    <Box sx={{ pb: 12, pt: 2, px: 2, minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Container maxWidth="lg">

        {/* Last Scan Status Banner */}
        {lastScanned && (
          <Alert
            severity={lastScanned.status === 'found' ? 'success' : 'warning'}
            sx={{ mb: 2, borderRadius: 3, fontWeight: 700 }}
          >
            {lastScanned.status === 'found'
              ? `✅ Barcode "${lastScanned.code}" matched — ${lastScanned.item.name} added to cart`
              : `⚠️ Barcode "${lastScanned.code}" not found in this store's inventory`
            }
          </Alert>
        )}

        {/* Scanner Panel (only when permission is enabled) */}
        {barcodeScannerEnabled && (
          <Paper
            elevation={0}
            sx={{
              p: 2, mb: 2, borderRadius: 3, bgcolor: '#0f172a', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                📷
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Camera Barcode Scanner</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Click below to open live camera — auto-adds items as you scan</Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', px: 3 }}
              onClick={() => setScannerModalOpen(true)}
            >
              📷 Open Barcode Scanner
            </Button>
          </Paper>
        )}

        {/* WebBarcodeScannerModal - Continuous Billing Mode */}
        <WebBarcodeScannerModal
          open={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onScan={handleBarcodeScan}
          continuous={true}
          title="📷 SuperBill Barcode Scanner"
          subtitle="Point camera at product barcode to auto-add to cart"
        />

        {/* Search Bar */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search item name, barcode or short code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                handleBarcodeScan(search);
              }
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
              sx: { borderRadius: 3, bgcolor: '#ffffff' }
            }}
          />
        </Box>

        {/* Category Chips */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 3 }}>
          <Chip
            label="All Items"
            color={selectedCat === 'all' ? 'primary' : 'default'}
            onClick={() => setSelectedCat('all')}
            sx={{ fontWeight: 800 }}
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              color={selectedCat === cat.id.toString() ? 'primary' : 'default'}
              onClick={() => setSelectedCat(cat.id.toString())}
              sx={{ fontWeight: 800 }}
            />
          ))}
        </Box>

        {/* Item Grid */}
        <Grid container spacing={2}>
          {filteredItems.map((item) => {
            const qty = getItemCartQty(item.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Box sx={{ display: 'flex', p: 1.5, gap: 1.5 }}>
                    <CardMedia
                      component="img"
                      sx={{ width: 70, height: 70, borderRadius: 2, objectFit: 'cover', bgcolor: '#f1f5f9' }}
                      image={item.image_url || 'https://via.placeholder.com/70?text=Item'}
                      alt={item.name}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, truncate: true }}>
                        {item.name}
                      </Typography>
                      <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 900, mt: 0.5 }}>
                        ₹{parseFloat(item.price).toFixed(2)} / per {item.base_unit || item.unit || 'PCS'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Inline Stepper */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, bgcolor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {item.barcode_image_url ? (
                        <img
                          src={item.barcode_image_url}
                          alt="barcode"
                          style={{ height: 20, maxWidth: 60, objectFit: 'contain', borderRadius: 2 }}
                          title={item.sku || item.barcode}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          #{item.barcode || item.sku || 'Code'}
                        </Typography>
                      )}
                    </Box>

                    {qty > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', borderRadius: 2, px: 1, py: 0.25 }}>
                        <IconButton size="small" onClick={() => handleRemoveOneFromCart(item)} sx={{ color: '#ffffff' }}>
                          <Typography variant="body1" sx={{ fontWeight: 900 }}>−</Typography>
                        </IconButton>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#ffffff', px: 0.5 }}>
                          {qty}
                        </Typography>
                        <IconButton size="small" onClick={() => handleAddToCart(item)} sx={{ color: '#ffffff' }}>
                          <Typography variant="body1" sx={{ fontWeight: 900 }}>+</Typography>
                        </IconButton>
                      </Box>
                    ) : (
                      <Button size="small" variant="outlined" color="primary" onClick={() => handleAddToCart(item)} sx={{ fontWeight: 800 }}>
                        + Add
                      </Button>
                    )}
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Sticky Bottom Bar CTA */}
        {totalCartCount > 0 && (
          <Paper
            elevation={6}
            sx={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: 600,
              p: 1.5,
              borderRadius: 4,
              bgcolor: '#1e1b4b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
              <Badge badgeContent={totalCartCount} color="error">
                <Typography variant="h5">🛒</Typography>
              </Badge>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {totalCartCount} Items in Cart
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              onClick={() => setOpenCartSummary(true)}
              sx={{ fontWeight: 900, px: 3, py: 1, borderRadius: 3, fontSize: 16 }}
            >
              Go to Cart →
            </Button>
          </Paper>
        )}

        {/* Cart Summary Modal / Screen */}
        <SuperBillCartSummary
          open={openCartSummary}
          cart={cart}
          onUpdateCart={setCart}
          onClose={() => setOpenCartSummary(false)}
        />
      </Container>
    </Box>
  );
}
