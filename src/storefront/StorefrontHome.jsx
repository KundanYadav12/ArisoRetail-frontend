import React, { useState, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  CheckCircle,
  Clock,
  Truck,
  Store,
  ChevronRight,
  Search
} from 'lucide-react';
import StorefrontProductCard from './StorefrontProductCard';
import { resolveImageUrl } from './storefrontApi';

export default function StorefrontHome({
  store,
  categories = [],
  products = [],
  cart = [],
  onAddToCart,
  onUpdateQuantity,
  onSelectProduct,
  searchQuery,
  onSearchChange
}) {
  const themeColor = store?.store_theme_color || '#ea580c';

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  // Filter & Sort products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== 'all' && String(p.category_id) !== String(selectedCategory)) {
        return false;
      }
      // Veg only
      if (vegOnly && !p.is_veg) {
        return false;
      }
      // Search
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const catMatch = (p.category_name || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [products, selectedCategory, vegOnly, searchQuery, sortBy]);

  const featuredProducts = useMemo(() => {
    return products.filter(p => p.is_featured);
  }, [products]);

  // Cart quantity lookup helper
  const getQuantityInCart = (productId) => {
    const item = cart.find(c => c.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <Box sx={{ pb: 10 }}>
      {/* 1. Hero Store Banner */}
      <Box
        sx={{
          bgcolor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: store?.store_banner_url
            ? `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.75)), url(${resolveImageUrl(store.store_banner_url)})`
            : `linear-gradient(135deg, ${themeColor} 0%, #1e293b 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#ffffff',
          py: { xs: 4, sm: 6 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 640 }}>
            <Chip
              icon={<Store size={14} color="#ffffff" />}
              label="Official Online Store"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.74rem',
                mb: 1.5
              }}
            />
            <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.75rem', sm: '2.5rem' }, mb: 1, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {store?.name}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.9rem', sm: '1.05rem' }, fontWeight: 500, mb: 2 }}>
              {store?.store_tagline || 'Order fresh quality products online with fast doorstep delivery!'}
            </Typography>

            {/* Quick badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
              {store?.delivery_enabled && (
                <Chip
                  icon={<Truck size={14} color="#ffffff" />}
                  label={`Delivery: ₹${store.delivery_charge ? store.delivery_charge.toFixed(2) : '0'}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 700 }}
                />
              )}
              {store?.free_delivery_threshold > 0 && (
                <Chip
                  icon={<Sparkles size={14} color="#ffffff" />}
                  label={`Free delivery on ₹${store.free_delivery_threshold}+`}
                  size="small"
                  sx={{ bgcolor: '#16a34a', color: '#ffffff', fontWeight: 800 }}
                />
              )}
              {store?.min_order_value > 0 && (
                <Chip
                  label={`Min Order: ₹${store.min_order_value}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 3, px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* 2. Category Filter Pills */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 1.25, letterSpacing: '0.04em' }}>
            Categories
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 2 }
            }}
          >
            <Chip
              label="All Products"
              clickable
              onClick={() => setSelectedCategory('all')}
              sx={{
                fontWeight: 800,
                fontSize: '0.84rem',
                py: 2.2,
                px: 1.5,
                borderRadius: '50px',
                bgcolor: selectedCategory === 'all' ? themeColor : '#ffffff',
                color: selectedCategory === 'all' ? '#ffffff' : '#334155',
                border: '1.5px solid',
                borderColor: selectedCategory === 'all' ? themeColor : '#E2E8F0',
                '&:hover': { bgcolor: selectedCategory === 'all' ? themeColor : '#F8FAFC' }
              }}
            />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                clickable
                onClick={() => setSelectedCategory(String(cat.id))}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  py: 2.2,
                  px: 1.5,
                  borderRadius: '50px',
                  bgcolor: selectedCategory === String(cat.id) ? themeColor : '#ffffff',
                  color: selectedCategory === String(cat.id) ? '#ffffff' : '#334155',
                  border: '1.5px solid',
                  borderColor: selectedCategory === String(cat.id) ? themeColor : '#E2E8F0',
                  '&:hover': { bgcolor: selectedCategory === String(cat.id) ? themeColor : '#F8FAFC' }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* 3. Featured Products Section (if any & not searching) */}
        {!searchQuery && selectedCategory === 'all' && featuredProducts.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Sparkles size={20} color={themeColor} />
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.3rem' }}>
                Featured Deals
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {featuredProducts.slice(0, 4).map((product) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`featured-${product.id}`}>
                  <StorefrontProductCard
                    product={product}
                    quantityInCart={getQuantityInCart(product.id)}
                    onAddToCart={onAddToCart}
                    onUpdateQuantity={onUpdateQuantity}
                    onSelectProduct={onSelectProduct}
                    themeColor={themeColor}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* 4. Filter & Sort Toolbar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 2.5,
            pb: 1.5,
            borderBottom: '1px solid #E2E8F0'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.2rem' }}>
              {selectedCategory === 'all'
                ? (searchQuery ? `Search Results for "${searchQuery}"` : 'All Products')
                : (categories.find(c => String(c.id) === selectedCategory)?.name || 'Products')}
              <Typography component="span" variant="caption" sx={{ ml: 1, color: '#64748B', fontWeight: 600 }}>
                ({filteredProducts.length} items)
              </Typography>
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={vegOnly}
                  onChange={(e) => setVegOnly(e.target.checked)}
                  size="small"
                  sx={{ '& .Mui-checked': { color: '#16a34a' } }}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 700, color: vegOnly ? '#16a34a' : '#64748B' }}>
                  🥦 Veg Only
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
              Sort by:
            </Typography>
            <Select
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{
                fontSize: '0.82rem',
                borderRadius: '8px',
                height: 34,
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#E2E8F0' }
              }}
            >
              <MenuItem value="featured" sx={{ fontSize: '0.82rem' }}>Featured First</MenuItem>
              <MenuItem value="price_asc" sx={{ fontSize: '0.82rem' }}>Price: Low to High</MenuItem>
              <MenuItem value="price_desc" sx={{ fontSize: '0.82rem' }}>Price: High to Low</MenuItem>
              <MenuItem value="name" sx={{ fontSize: '0.82rem' }}>Name (A-Z)</MenuItem>
            </Select>
          </Box>
        </Box>

        {/* 5. Products Grid */}
        {filteredProducts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Search size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155', mb: 0.5 }}>
              No products found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
              Try adjusting your search query, clearing filters, or choosing a different category.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                onSearchChange('');
                setSelectedCategory('all');
                setVegOnly(false);
              }}
              sx={{ borderColor: themeColor, color: themeColor, fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
            >
              Reset Filters
            </Button>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
            {filteredProducts.map((product) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
                <StorefrontProductCard
                  product={product}
                  quantityInCart={getQuantityInCart(product.id)}
                  onAddToCart={onAddToCart}
                  onUpdateQuantity={onUpdateQuantity}
                  onSelectProduct={onSelectProduct}
                  themeColor={themeColor}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
