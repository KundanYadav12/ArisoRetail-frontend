import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Tabs, Tab, TextField, InputAdornment,
  Grid, Card, CardContent, CardMedia, Chip, IconButton, Fab, Button,
  Paper, CircularProgress
} from '@mui/material';
import { apiFetch } from '../utils/api';
import SuperBillAddItemModal from '../components/SuperBillAddItemModal';
import SuperBillStockAdjustModal from '../components/SuperBillStockAdjustModal';

export default function SuperBillItems({ token: propToken }) {
  const [tabIndex, setTabIndex] = useState(0); // 0: Items, 1: Categories
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/superbill/items?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenAdjust = (item) => {
    setSelectedItemForAdjust(item);
    setAdjustModalOpen(true);
  };

  return (
    <Box sx={{ pb: 10, pt: 2, px: 2, minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Container maxWidth="lg">
        {/* Header Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} textColor="primary" indicatorColor="primary">
            <Tab label={`Items (${items.length})`} sx={{ fontWeight: 800, fontSize: 16 }} />
            <Tab label={`Categories (${categories.length})`} sx={{ fontWeight: 800, fontSize: 16 }} />
          </Tabs>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search Item Name or Code / Barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
                sx: { borderRadius: 3, bgcolor: '#ffffff' }
              }
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : tabIndex === 0 ? (
          /* ITEMS GRID */
          <Grid container spacing={2}>
            {items.map((item) => {
              const isService = item.is_veg === 3;
              const stockVal = parseFloat(item.stock || 0);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' }}>
                    <Box sx={{ display: 'flex', p: 2, gap: 2 }}>
                      {item.image_url ? (
                        <CardMedia
                          component="img"
                          sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', bgcolor: '#f1f5f9' }}
                          image={item.image_url}
                          alt={item.name}
                        />
                      ) : (
                        <Box sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 32 }}>📦</Typography>
                        </Box>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, truncate: true }}>
                            {item.name}
                          </Typography>
                          <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 900 }}>
                            ₹{parseFloat(item.price).toFixed(2)}
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Purchase Price: {item.purchase_price ? `₹${parseFloat(item.purchase_price).toFixed(2)}` : 'None'}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                          <Chip
                            label={isService ? 'Service' : 'Product'}
                            size="small"
                            color={isService ? 'info' : 'secondary'}
                            sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                          />
                          {!isService && (
                            <Chip
                              label={`In Stock: ${stockVal} ${item.base_unit || 'PCS'}`}
                              size="small"
                              color={stockVal > 0 ? 'success' : 'error'}
                              sx={{ fontWeight: 800, height: 22, fontSize: 11 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Footer Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, bgcolor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.secondary' }}>
                        📷 {item.barcode || 'No Barcode'}
                      </Typography>
                      {!isService && (
                        <Button size="small" variant="outlined" color="primary" onClick={() => handleOpenAdjust(item)} sx={{ fontWeight: 800 }}>
                          ± Stock In / Out
                        </Button>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          /* CATEGORIES GRID */
          <Grid container spacing={2}>
            {categories.map((cat) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
                <Paper sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>📁 {cat.name}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Add Item Button */}
        <Fab
          color="primary"
          onClick={() => setAddItemOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, width: 64, height: 64 }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>+</Typography>
        </Fab>

        {/* Modals */}
        <SuperBillAddItemModal
          open={addItemOpen}
          categories={categories}
          onClose={() => setAddItemOpen(false)}
          onSuccess={() => fetchData()}
        />

        <SuperBillStockAdjustModal
          open={adjustModalOpen}
          item={selectedItemForAdjust}
          onClose={() => setAdjustModalOpen(false)}
          onSuccess={() => fetchData()}
        />
      </Container>
    </Box>
  );
}
