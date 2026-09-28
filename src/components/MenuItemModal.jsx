import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Paper, Chip, Switch, FormControlLabel, RadioGroup, Radio,
  Divider, InputAdornment, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import { X, Package, Camera, Plus } from 'lucide-react';
import { apiFetch, getApiUrl } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function MenuItemModal({
  open,
  onClose,
  onSuccess,
  initialName = '',
  categories: propCategories = []
}) {
  const notify = useNotify();

  const [categories, setCategories] = useState(propCategories);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Basic Information States
  const [goodsOrService, setGoodsOrService] = useState('Goods');
  const [name, setName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [sku, setSku] = useState('');
  const [barcodeSkuDuplicate, setBarcodeSkuDuplicate] = useState(null);
  const [barcodeCheckTimer, setBarcodeCheckTimer] = useState(null);
  const [hsnCode, setHsnCode] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('pcs');
  const [salesUnit, setSalesUnit] = useState('pcs');
  const [brand, setBrand] = useState('');
  const [itemGroup, setItemGroup] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isWeightBased, setIsWeightBased] = useState(false);
  const [unit, setUnit] = useState('pcs');
  const [isVeg, setIsVeg] = useState('1');

  // Inventory States
  const [isTrackable, setIsTrackable] = useState(true);
  const [openingStock, setOpeningStock] = useState('0');
  const [costPrice, setCostPrice] = useState('');
  const [stockStartDate, setStockStartDate] = useState('');
  const [atParStock, setAtParStock] = useState('');
  const [minStock, setMinStock] = useState('10');

  // Other Details
  const [linkedSalesAccount, setLinkedSalesAccount] = useState('Sales');
  const [linkedPurchaseAccount, setLinkedPurchaseAccount] = useState('Purchase');
  const [openQtyPopup, setOpenQtyPopup] = useState(false);
  const [openPricePopup, setOpenPricePopup] = useState(false);
  const [notForSale, setNotForSale] = useState(false);

  // Pricing & Tax
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [igstRate, setIgstRate] = useState('5');
  const [gstRate, setGstRate] = useState('5');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');

  // Image Upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load categories if not provided
  useEffect(() => {
    if (open) {
      if (propCategories && propCategories.length > 0) {
        setCategories(propCategories);
        setCategoryId(propCategories[0]?.id || '');
      } else {
        setLoadingCategories(true);
        apiFetch('/api/categories')
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              setCategories(data);
              setCategoryId(data[0]?.id || '');
            }
          })
          .catch(err => console.error('Failed to load categories', err))
          .finally(() => setLoadingCategories(false));
      }

      // Reset form or populate with initialName
      setName(initialName || '');
      setGoodsOrService('Goods');
      setItemCode('');
      setSku('');
      setBarcodeSkuDuplicate(null);
      setHsnCode('');
      setPurchaseUnit('pcs');
      setSalesUnit('pcs');
      setBrand('');
      setItemGroup('');
      setTagInput('');
      setTags([]);
      setIsWeightBased(false);
      setUnit('pcs');
      setIsVeg('1');
      setIsTrackable(true);
      setOpeningStock('0');
      setCostPrice('');
      setStockStartDate('');
      setAtParStock('');
      setMinStock('10');
      setLinkedSalesAccount('Sales');
      setLinkedPurchaseAccount('Purchase');
      setOpenQtyPopup(false);
      setOpenPricePopup(false);
      setNotForSale(false);
      setPrice('');
      setPurchasePrice('');
      setMrp('');
      setIgstRate('5');
      setGstRate('5');
      setDiscountType('percentage');
      setDiscountValue('');
      setImageFile(null);
      setImagePreview('');
    }
  }, [open, initialName, propCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notify.error('Item name is required.', 'Validation');
      return;
    }

    if (!categoryId) {
      notify.error('Please select or create a category.', 'Validation');
      return;
    }

    const salePriceNum = parseFloat(price || purchasePrice || 0);
    if (isNaN(salePriceNum) || salePriceNum < 0) {
      notify.error('Please enter a valid price.', 'Validation');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category_id', categoryId);
      formData.append('price', String(price ? parseFloat(price) : parseFloat(purchasePrice || 0)));
      formData.append('purchase_price', purchasePrice ? String(parseFloat(purchasePrice)) : '0');
      formData.append('mrp', mrp ? String(parseFloat(mrp)) : '0');
      formData.append('sku', sku.trim());
      formData.append('barcode', sku.trim());
      formData.append('hsn_code', hsnCode.trim());
      formData.append('item_code', itemCode.trim());
      formData.append('goods_or_service', goodsOrService);
      formData.append('purchase_unit', purchaseUnit);
      formData.append('sales_unit', salesUnit);
      formData.append('unit', unit);
      formData.append('base_unit', unit);
      formData.append('is_weight_based', isWeightBased ? '1' : '0');
      formData.append('is_veg', isVeg);
      formData.append('brand', brand.trim());
      formData.append('item_group', itemGroup.trim());
      formData.append('tags', JSON.stringify(tags));
      formData.append('gst_rate', gstRate);
      formData.append('igst_rate', igstRate || gstRate);
      formData.append('discount_type', discountType);
      formData.append('discount_value', discountValue || '0');
      formData.append('is_trackable', isTrackable ? '1' : '0');
      formData.append('opening_stock', openingStock || '0');
      formData.append('cost_price', costPrice || '0');
      if (stockStartDate) formData.append('stock_start_date', stockStartDate);
      formData.append('at_par_stock', atParStock || '0');
      formData.append('min_stock', minStock || '0');
      formData.append('linked_sales_account', linkedSalesAccount);
      formData.append('linked_purchase_account', linkedPurchaseAccount);
      formData.append('open_qty_popup', openQtyPopup ? '1' : '0');
      formData.append('open_price_popup', openPricePopup ? '1' : '0');
      formData.append('not_for_sale', notForSale ? '1' : '0');
      formData.append('is_available', '1');

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await apiFetch('/api/menu', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product.');

      notify.success(`Product "${name.trim()}" created successfully.`, 'Product Created');

      // Fetch the full newly created item
      let createdProduct = null;
      if (data.id) {
        try {
          const itemRes = await apiFetch(`/api/menu/${data.id}`);
          if (itemRes.ok) {
            createdProduct = await itemRes.json();
          }
        } catch (_) {}
      }

      if (!createdProduct) {
        createdProduct = {
          id: data.id,
          name: name.trim(),
          sku: sku.trim(),
          barcode: sku.trim(),
          price: parseFloat(price || purchasePrice || 0),
          purchase_price: parseFloat(purchasePrice || 0),
          gst_rate: parseFloat(gstRate || 0),
          unit,
          category_id: categoryId
        };
      }

      if (onSuccess) onSuccess(createdProduct);
      onClose();
    } catch (err) {
      notify.error(err.message || 'Failed to save product.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 1400 }}
      slotProps={{
        paper: {
          sx: { borderRadius: 3, maxHeight: '92vh' }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Package size={22} color="#ea580c" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Add New Product / Menu Item
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Configure product details, purchase price, tax slab, and units.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#f8fafc', p: 2.5 }}>
          <Grid container spacing={2.5}>
            {/* ══════════════ LEFT COLUMN: Basic Info, Inventory, Other Details ══════════════ */}
            <Grid size={{ xs: 12, md: 7.2 }}>
              {/* 1. Basic Information Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                  Basic Information
                </Typography>

                {/* Item Type: Goods / Service */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 0.5 }}>
                    Item Type
                  </Typography>
                  <RadioGroup
                    row
                    value={goodsOrService}
                    onChange={e => setGoodsOrService(e.target.value)}
                  >
                    <FormControlLabel value="Goods" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Goods</Typography>} />
                    <FormControlLabel value="Service" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Service</Typography>} />
                  </RadioGroup>
                </Box>

                <Grid container spacing={2}>
                  {/* Item Name * */}
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      label="Item Name *"
                      size="small"
                      fullWidth
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder="Enter product or item name"
                      autoFocus
                    />
                  </Grid>

                  {/* Item Code */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Item Code"
                      size="small"
                      fullWidth
                      value={itemCode}
                      onChange={e => setItemCode(e.target.value)}
                      placeholder="e.g. ITM-001"
                    />
                  </Grid>

                  {/* Barcode / SKU */}
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      label="Barcode / SKU"
                      size="small"
                      fullWidth
                      value={sku}
                      onChange={e => {
                        const val = e.target.value;
                        setSku(val);
                        setBarcodeSkuDuplicate(null);
                        if (barcodeCheckTimer) clearTimeout(barcodeCheckTimer);
                        if (val.trim()) {
                          const t = setTimeout(async () => {
                            try {
                              const r = await apiFetch(`/api/menu/check-barcode?sku=${encodeURIComponent(val)}`);
                              const d = await r.json();
                              if (d.duplicate) setBarcodeSkuDuplicate(d.existing_item);
                            } catch (_) {}
                          }, 600);
                          setBarcodeCheckTimer(t);
                        }
                      }}
                      error={!!barcodeSkuDuplicate}
                      helperText={barcodeSkuDuplicate ? `Already used by: ${barcodeSkuDuplicate.name}` : ''}
                      placeholder="Barcode number or SKU"
                    />
                  </Grid>

                  {/* HSN */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="HSN Code"
                      size="small"
                      fullWidth
                      value={hsnCode}
                      onChange={e => setHsnCode(e.target.value)}
                      placeholder="e.g. 1905"
                    />
                  </Grid>

                  {/* Category * */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Category *</InputLabel>
                      <Select
                        value={categoryId}
                        label="Category *"
                        onChange={e => setCategoryId(e.target.value)}
                        disabled={loadingCategories}
                      >
                        {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Purchase Unit */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Purchase Unit</InputLabel>
                      <Select
                        value={purchaseUnit}
                        label="Purchase Unit"
                        onChange={e => {
                          setPurchaseUnit(e.target.value);
                          setUnit(e.target.value);
                        }}
                      >
                        <MenuItem value="pcs">Pcs (Piece)</MenuItem>
                        <MenuItem value="box">Box</MenuItem>
                        <MenuItem value="pack">Pack</MenuItem>
                        <MenuItem value="bottle">Bottle</MenuItem>
                        <MenuItem value="can">Can</MenuItem>
                        <MenuItem value="roll">Roll</MenuItem>
                        <MenuItem value="dozen">Dozen</MenuItem>
                        <MenuItem value="kg">Kg (Kilogram)</MenuItem>
                        <MenuItem value="gram">Gram</MenuItem>
                        <MenuItem value="litre">Litre</MenuItem>
                        <MenuItem value="ml">Ml</MenuItem>
                        <MenuItem value="meter">Meter</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Brand */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Brand"
                      size="small"
                      fullWidth
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      placeholder="Brand name"
                    />
                  </Grid>

                  {/* Group */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Group"
                      size="small"
                      fullWidth
                      value={itemGroup}
                      onChange={e => setItemGroup(e.target.value)}
                      placeholder="Item group"
                    />
                  </Grid>

                  {/* Tags */}
                  <Grid size={12}>
                    <Box>
                      <TextField
                        label="Tags"
                        size="small"
                        fullWidth
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = tagInput.trim();
                            if (val && !tags.includes(val)) {
                              setTags([...tags, val]);
                              setTagInput('');
                            }
                          }
                        }}
                        placeholder="Type tag & press Enter"
                      />
                      {tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                          {tags.map((t, idx) => (
                            <Chip
                              key={idx}
                              label={t}
                              size="small"
                              onDelete={() => setTags(tags.filter((_, i) => i !== idx))}
                              sx={{ fontSize: '11px', fontWeight: 600 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  <Grid size={12}>
                    <Divider sx={{ my: 0.5 }} />
                  </Grid>

                  {/* POS Unit Type */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      POS Unit Type
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        type="button"
                        size="small"
                        variant={!isWeightBased ? 'contained' : 'outlined'}
                        color={!isWeightBased ? 'primary' : 'inherit'}
                        onClick={() => {
                          setIsWeightBased(false);
                          setUnit('pcs');
                        }}
                        sx={{ flex: 1, fontWeight: 800, fontSize: '11px', px: 1 }}
                      >
                        📦 Pcs
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant={isWeightBased ? 'contained' : 'outlined'}
                        color={isWeightBased ? 'success' : 'inherit'}
                        onClick={() => {
                          setIsWeightBased(true);
                          setUnit('kg');
                        }}
                        sx={{ flex: 1, fontWeight: 800, fontSize: '11px', px: 1 }}
                      >
                        ⚖️ Weight
                      </Button>
                    </Box>
                  </Grid>

                  {/* Dietary Classification */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      Dietary Classification
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select value={isVeg} onChange={e => setIsVeg(e.target.value)}>
                        <MenuItem value="1">🟢 Veg</MenuItem>
                        <MenuItem value="0">🔴 Non-Veg</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {/* 2. Inventory Settings Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                    Inventory Settings
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={isTrackable} onChange={e => setIsTrackable(e.target.checked)} size="small" color="primary" />}
                    label={<Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>Track Stock?</Typography>}
                    labelPlacement="start"
                    sx={{ m: 0 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Opening Stock"
                      type="number"
                      size="small"
                      fullWidth
                      value={openingStock}
                      onChange={e => setOpeningStock(e.target.value)}
                      placeholder="0"
                      disabled={!isTrackable}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Min Stock Alert"
                      type="number"
                      size="small"
                      fullWidth
                      value={minStock}
                      onChange={e => setMinStock(e.target.value)}
                      placeholder="10"
                      disabled={!isTrackable}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* ══════════════ RIGHT COLUMN: Pricing & Tax ══════════════ */}
            <Grid size={{ xs: 12, md: 4.8 }}>
              {/* Pricing Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, mb: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                  Pricing & Tax
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Purchase Price (Important for Purchase Orders) */}
                  <TextField
                    label="Purchase Price (Cost) *"
                    type="number"
                    size="small"
                    fullWidth
                    required
                    value={purchasePrice}
                    onChange={e => {
                      const val = e.target.value;
                      setPurchasePrice(val);
                      if (!price) setPrice(val);
                    }}
                    placeholder="Enter vendor rate (₹)"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }
                    }}
                  />

                  {/* Selling Price */}
                  <TextField
                    label="Selling Price (POS)"
                    type="number"
                    size="small"
                    fullWidth
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="Enter retail selling price"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }
                    }}
                  />

                  {/* MRP */}
                  <TextField
                    label="MRP"
                    type="number"
                    size="small"
                    fullWidth
                    value={mrp}
                    onChange={e => setMrp(e.target.value)}
                    placeholder="Maximum Retail Price"
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }
                    }}
                  />

                  {/* Taxes: GST / IGST */}
                  <Grid container spacing={1.5}>
                    <Grid size={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>GST Tax Slab *</InputLabel>
                        <Select
                          value={gstRate}
                          label="GST Tax Slab *"
                          onChange={e => {
                            const val = e.target.value;
                            setGstRate(val);
                            setIgstRate(val);
                          }}
                        >
                          <MenuItem value="0">GST 0% (Nil / Exempt)</MenuItem>
                          <MenuItem value="5">GST 5% (Food & Essentials)</MenuItem>
                          <MenuItem value="12">GST 12% (Standard S)</MenuItem>
                          <MenuItem value="18">GST 18% (Standard Rate)</MenuItem>
                          <MenuItem value="28">GST 28% (Luxury / Aerated)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>

              {/* Image Upload Card */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '12px' }}>
                  Product Image
                </Typography>

                <Box sx={{ border: '2px dashed #cbd5e1', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', '&:hover': { borderColor: 'primary.main', bgcolor: '#f1f5f9' }, transition: 'all 0.2s' }}>
                  <Button variant="contained" component="label" size="small" sx={{ fontWeight: 'bold' }} startIcon={<Camera size={16} />}>
                    Select Image File
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </Button>
                  {imagePreview && (
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                      <img src={imagePreview} alt="Preview" style={{ height: 80, borderRadius: 6, objectFit: 'cover' }} />
                      <IconButton
                        size="small"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                        }}
                        sx={{ position: 'absolute', top: -6, right: '35%', bgcolor: '#ef4444', color: '#fff', '&:hover': { bgcolor: '#dc2626' }, p: 0.25 }}
                      >
                        <X size={12} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
          <Button onClick={onClose} disabled={submitting} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />}
            sx={{ fontWeight: 800, px: 3, bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' } }}
          >
            {submitting ? 'Saving Product...' : 'Save Product'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
