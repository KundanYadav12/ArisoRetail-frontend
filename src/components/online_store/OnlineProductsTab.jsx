import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  TextField,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Checkbox,
  Tooltip
} from '@mui/material';
import {
  Search,
  RefreshCw,
  Sparkles,
  Save,
  CheckSquare,
  Square,
  ExternalLink,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { apiFetch, resolveImageUrl } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function OnlineProductsTab({ token }) {
  const { notify } = useNotify();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchQuery.trim()) q.set('search', searchQuery.trim());

      const res = await apiFetch(`/api/merchant/store/products?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      notify.error(err.message, 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery]);

  const handleToggleOnline = async (product, checked) => {
    setSavingId(product.id);
    try {
      const res = await apiFetch(`/api/merchant/store/products/${product.id}`, {
        method: 'PUT',
        body: { available_online: checked ? 1 : 0 }
      });
      if (!res.ok) throw new Error('Update failed');

      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, available_online: checked } : p
      ));
      notify.success(`Product "${product.name}" is now ${checked ? 'VISIBLE' : 'HIDDEN'} online.`);
    } catch (err) {
      notify.error(err.message, 'Update Failed');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleFeatured = async (product, checked) => {
    setSavingId(product.id);
    try {
      const res = await apiFetch(`/api/merchant/store/products/${product.id}`, {
        method: 'PUT',
        body: { is_featured_online: checked ? 1 : 0 }
      });
      if (!res.ok) throw new Error('Update failed');

      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_featured_online: checked } : p
      ));
      notify.success(`Featured status updated for "${product.name}".`);
    } catch (err) {
      notify.error(err.message, 'Update Failed');
    } finally {
      setSavingId(null);
    }
  };

  const handlePriceBlur = async (product, newPrice) => {
    const parsed = newPrice === '' ? null : parseFloat(newPrice);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) return;

    setSavingId(product.id);
    try {
      await apiFetch(`/api/merchant/store/products/${product.id}`, {
        method: 'PUT',
        body: { online_price: parsed }
      });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, online_price: parsed } : p
      ));
    } catch (err) {
      notify.error(err.message, 'Failed to update online price');
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkToggle = async (enable) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await apiFetch('/api/merchant/store/products/bulk-toggle', {
        method: 'POST',
        body: { product_ids: selectedIds, available_online: enable }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk update failed');

      notify.success(data.message, 'Bulk Update Completed');
      fetchProducts();
      setSelectedIds([]);
    } catch (err) {
      notify.error(err.message, 'Bulk Action Failed');
    }
  };

  const onlineCount = products.filter(p => p.available_online).length;

  return (
    <Box>
      {/* 1. Header Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            Online Store Products Catalog
            <Chip
              label={`${onlineCount} Published Online`}
              size="small"
              sx={{ bgcolor: '#ecfdf5', color: '#16a34a', fontWeight: 800, height: 22 }}
            />
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Choose which catalog items appear on your public storefront and customize their online price
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search product or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#94A3B8" />
                  </InputAdornment>
                ),
                sx: { width: { xs: 200, sm: 260 }, height: 38, borderRadius: '8px', bgcolor: '#ffffff' }
              }
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={fetchProducts}
            startIcon={<RefreshCw size={14} />}
            sx={{ height: 38, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* 2. Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2.5,
            bgcolor: '#F8FAFC',
            borderRadius: '12px',
            border: '1.5px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B' }}>
            {selectedIds.length} product(s) selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => handleBulkToggle(true)}
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
            >
              Publish to Online Store
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleBulkToggle(false)}
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
            >
              Hide from Online Store
            </Button>
          </Box>
        </Paper>
      )}

      {/* 3. Products Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={products.length > 0 && selectedIds.length === products.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < products.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(products.map(p => p.id));
                    else setSelectedIds([]);
                  }}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Product Details</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Available Stock</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>POS Price</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Online Price (₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Featured</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Available Online</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const isSaving = savingId === product.id;

                return (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{
                      bgcolor: isSelected ? 'rgba(234, 88, 12, 0.04)' : undefined,
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(prev => [...prev, product.id]);
                          else setSelectedIds(prev => prev.filter(id => id !== product.id));
                        }}
                      />
                    </TableCell>

                    {/* Product Name & Image */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '6px',
                            bgcolor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {product.image_url ? (
                            <Box
                              component="img"
                              src={resolveImageUrl(product.image_url)}
                              alt={product.name}
                              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <ImageIcon size={18} color="#94A3B8" />
                          )}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {product.unit || 'pcs'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Chip
                        label={product.category_name || 'General'}
                        size="small"
                        sx={{ fontSize: '0.72rem', fontWeight: 600, height: 22 }}
                      />
                    </TableCell>

                    {/* Available Stock */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: product.available_stock > 10 ? '#16a34a' : (product.available_stock > 0 ? '#f59e0b' : '#ef4444')
                        }}
                      >
                        {product.track_inventory === 0 ? 'Unlimited' : `${product.available_stock} ${product.unit}`}
                      </Typography>
                      {parseFloat(product.reserved_stock || 0) > 0 && (
                        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                          ({product.reserved_stock} reserved in online orders)
                        </Typography>
                      )}
                    </TableCell>

                    {/* POS Price */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        ₹{parseFloat(product.price || 0).toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* Online Price override */}
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder={`Same as POS (₹${parseFloat(product.price || 0).toFixed(2)})`}
                        defaultValue={product.online_price !== null && product.online_price !== undefined ? product.online_price : ''}
                        onBlur={(e) => handlePriceBlur(product, e.target.value)}
                        sx={{
                          width: 130,
                          '& input': { py: 0.7, fontSize: '0.82rem', fontWeight: 700 }
                        }}
                      />
                    </TableCell>

                    {/* Featured Online */}
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        disabled={!product.available_online}
                        onClick={() => handleToggleFeatured(product, !product.is_featured_online)}
                        sx={{ color: product.is_featured_online ? '#ea580c' : '#CBD5E1' }}
                      >
                        <Sparkles size={18} />
                      </IconButton>
                    </TableCell>

                    {/* Available Online Switch */}
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={Boolean(product.available_online)}
                        disabled={isSaving}
                        onChange={(e) => handleToggleOnline(product, e.target.checked)}
                        sx={{
                          '& .Mui-checked': { color: '#16a34a' },
                          '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
