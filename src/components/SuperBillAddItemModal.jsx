import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, ToggleButtonGroup, ToggleButton,
  MenuItem, Select, InputLabel, FormControl, InputAdornment, IconButton
} from '@mui/material';
import { apiFetch } from '../utils/api';

import WebBarcodeScannerModal from './WebBarcodeScannerModal';

const STANDARD_UOMS = [
  'PCS', 'KG', 'LTR', 'MTR', 'ML', 'NOS', 'PAC', 'PRS', 'QTL', 'ROL', 'SQF', 'SQM', 'BAG', 'BOX', 'CTN', 'DOZ', 'GM'
];

export default function SuperBillAddItemModal({ open, categories = [], onClose, onSuccess }) {
  const [itemType, setItemType] = useState('product'); // product | service
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [categoryId, setCategoryId] = useState('');
  const [openingStock, setOpeningStock] = useState('0');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateBarcode = async () => {
    try {
      const res = await apiFetch('/api/superbill/generate-barcode', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.barcode) {
        setBarcode(data.barcode);
      }
    } catch (err) {
      // Fallback
      setBarcode(`890${Date.now()}`.slice(0, 13));
    }
  };

  const handleScanBarcode = (scannedCode) => {
    if (scannedCode) {
      setBarcode(scannedCode.trim());
      setScannerOpen(false);
      return { success: true, message: `Captured barcode: ${scannedCode}` };
    }
    return { success: false, message: 'No barcode detected' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Item name is required.');
    if (!price || isNaN(parseFloat(price))) return alert('Valid sale price is required.');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('item_type', itemType);
      formData.append('barcode', barcode.trim());
      formData.append('price', price);
      formData.append('purchase_price', purchasePrice || '0');
      formData.append('unit', unit);
      formData.append('category_id', categoryId || '');
      formData.append('opening_stock', openingStock || '0');
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await apiFetch('/api/superbill/items', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item.');

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Add New Item</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Segmented Control Product / Service */}
          <ToggleButtonGroup
            value={itemType}
            exclusive
            onChange={(e, val) => val && setItemType(val)}
            fullWidth
            color="primary"
          >
            <ToggleButton value="product" sx={{ fontWeight: 800 }}>📦 Product</ToggleButton>
            <ToggleButton value="service" sx={{ fontWeight: 800 }}>🛠️ Service</ToggleButton>
          </ToggleButtonGroup>

          {/* Image Picker */}
          <Box sx={{ border: '2px dashed #cbd5e1', borderRadius: 3, p: 2, textAlign: 'center', bgcolor: 'action.hover' }}>
            {imagePreview ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <img src={imagePreview} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                <Button size="small" component="label">
                  Change Photo
                  <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </Button>
              </Box>
            ) : (
              <Button component="label" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1 }}>
                <Typography variant="h6">📷 Add item image here</Typography>
                <Typography variant="caption" color="text.secondary">Tap to upload photo from camera or library</Typography>
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
            )}
          </Box>

          <TextField
            label="Item Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              fullWidth
              placeholder="e.g. 8901262200196"
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setScannerOpen(true)}
              sx={{ fontWeight: 800, whiteSpace: 'nowrap', textTransform: 'none' }}
            >
              📷 Scan
            </Button>
            <Button variant="outlined" onClick={handleGenerateBarcode} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
              Create
            </Button>
          </Box>

          <WebBarcodeScannerModal
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={handleScanBarcode}
            continuous={false}
            title="📷 Scan Product Barcode"
            subtitle="Point camera at barcode to auto-fill barcode code"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Sale Price (₹) *"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
            <TextField
              label="Purchase Price (₹)"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Unit (UOM)</InputLabel>
              <Select value={unit} label="Select Unit (UOM)" onChange={(e) => setUnit(e.target.value)}>
                {STANDARD_UOMS.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={categoryId} label="Category" onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {itemType === 'product' && (
            <TextField
              label="Opening Stock"
              type="number"
              value={openingStock}
              onChange={(e) => setOpeningStock(e.target.value)}
              fullWidth
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 800 }}>
            Save Item
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
