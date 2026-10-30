import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Container,
  Button,
  Divider,
  Paper,
  Slide
} from '@mui/material';
import {
  ShoppingBag,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Store,
  ShieldCheck,
  Lock
} from 'lucide-react';
import StorefrontNavbar from './StorefrontNavbar';
import StorefrontHome from './StorefrontHome';
import StorefrontCartDrawer from './StorefrontCartDrawer';
import StorefrontProductModal from './StorefrontProductModal';
import StorefrontCheckout from './StorefrontCheckout';
import StorefrontOrderConfirmation from './StorefrontOrderConfirmation';
import StorefrontOrderTracking from './StorefrontOrderTracking';
import StorefrontNotFound from './StorefrontNotFound';
import { resolveStorefront, fetchStoreCatalog, resolveImageUrl } from './storefrontApi';

export default function StorefrontApp({
  subdomain,
  onOpenStaffLogin
}) {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  // Views: 'home', 'checkout', 'confirmation', 'tracking'
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      if (window.location.hash.includes('/order-status/')) return 'tracking';
    }
    return 'home';
  });

  // Tracking state if tracking directly from URL
  const [trackingOrderNumber, setTrackingOrderNumber] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/\/order-status\/([^\?\&]+)/);
      if (match && match[1]) return match[1];
    }
    return '';
  });

  const [trackingToken, setTrackingToken] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/token=([^\&]+)/);
      if (match && match[1]) return match[1];
    }
    return '';
  });

  // Confirmed Order object for confirmation screen
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Cart State (Scoped to current merchant subdomain)
  const cartStorageKey = `ariso_store_cart_${subdomain || 'default'}`;
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save cart to local storage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch (_) {}
  }, [cart, cartStorageKey]);

  // Cart Drawer & Modals
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial load: resolve store profile & catalog
  useEffect(() => {
    let isMounted = true;

    async function loadStorefront() {
      setLoading(true);
      setError(null);

      try {
        const storeRes = await resolveStorefront(subdomain);
        if (!isMounted) return;
        setStore(storeRes.store);

        // Fetch catalog
        const catalogRes = await fetchStoreCatalog(subdomain);
        if (!isMounted) return;
        setCategories(catalogRes.categories || []);
        setProducts(catalogRes.products || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('[Storefront Load Error]:', err);
        setError(err.message || 'Failed to load store.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (subdomain) {
      loadStorefront();
    } else {
      setError('No store subdomain specified.');
      setLoading(false);
    }

    return () => { isMounted = false; };
  }, [subdomain]);

  // Cart handlers
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        unit: product.unit,
        image_url: product.image_url,
        available_stock: product.available_stock,
        quantity: 1
      }];
    });
  };

  const handleUpdateQuantity = (product, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(product.id);
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === product.id
        ? { ...item, quantity: Math.min(newQty, product.available_stock || 999) }
        : item
    ));
  };

  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // View transitions
  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSuccess = (orderData) => {
    setConfirmedOrder(orderData);
    setCart([]); // Clear cart
    try {
      localStorage.removeItem(cartStorageKey);
    } catch (_) {}
    setCurrentView('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackOrder = (orderNum, token) => {
    setTrackingOrderNumber(orderNum);
    setTrackingToken(token);
    setCurrentView('tracking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, bgcolor: '#F8FAFC' }}>
        <CircularProgress sx={{ color: '#ea580c' }} size={42} />
        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 700 }}>
          Opening storefront...
        </Typography>
      </Box>
    );
  }

  if (error || !store) {
    return (
      <StorefrontNotFound
        subdomain={subdomain}
        message={error}
        onBackToLogin={onOpenStaffLogin}
      />
    );
  }

  const themeColor = store.store_theme_color || '#ea580c';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', color: '#0F172A' }}>
      {/* 1. Header Navbar */}
      <StorefrontNavbar
        store={store}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setCartDrawerOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenStaffLogin={onOpenStaffLogin}
      />

      {/* 2. Main Content Views */}
      <Box sx={{ flex: 1 }}>
        {currentView === 'home' && (
          <StorefrontHome
            store={store}
            categories={categories}
            products={products}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onSelectProduct={(p) => setSelectedProduct(p)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {currentView === 'checkout' && (
          <StorefrontCheckout
            store={store}
            subdomain={subdomain}
            cart={cart}
            onBackToShopping={() => setCurrentView('home')}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {currentView === 'confirmation' && confirmedOrder && (
          <StorefrontOrderConfirmation
            store={store}
            subdomain={subdomain}
            order={confirmedOrder}
            onTrackOrder={handleTrackOrder}
            onContinueShopping={() => setCurrentView('home')}
          />
        )}

        {currentView === 'tracking' && (
          <StorefrontOrderTracking
            store={store}
            subdomain={subdomain}
            orderNumber={trackingOrderNumber}
            orderAccessToken={trackingToken}
            onBackToShopping={() => setCurrentView('home')}
          />
        )}
      </Box>

      {/* 3. Floating Mobile Sticky Cart Bar */}
      {cartCount > 0 && currentView === 'home' && (
        <Slide direction="up" in={cartCount > 0} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 16,
              right: 16,
              zIndex: 1050,
              display: { xs: 'block', sm: 'none' }
            }}
          >
            <Paper
              elevation={6}
              onClick={() => setCartDrawerOpen(true)}
              sx={{
                bgcolor: themeColor,
                color: '#ffffff',
                p: 1.5,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: `0 8px 24px ${themeColor}60`,
                cursor: 'pointer'
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>
                  {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  ₹{cartTotal.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 900, fontSize: '0.92rem' }}>
                <span>View Cart</span>
                <ArrowRight size={18} />
              </Box>
            </Paper>
          </Box>
        </Slide>
      )}

      {/* 4. Cart Drawer */}
      <StorefrontCartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cart={cart}
        store={store}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* 5. Product Detail Modal */}
      <StorefrontProductModal
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        quantityInCart={selectedProduct ? (cart.find(c => c.id === selectedProduct.id)?.quantity || 0) : 0}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateQuantity}
        themeColor={themeColor}
      />

      {/* 6. Footer */}
      <Box sx={{ bgcolor: '#0F172A', color: '#94A3B8', pt: 6, pb: 4, mt: 'auto', borderTop: '1px solid #1E293B' }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, mb: 4 }}>
            {/* Store Information */}
            <Box sx={{ maxWidth: 360 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', mb: 1 }}>
                {store.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, lineHeight: 1.6 }}>
                {store.store_about || store.store_tagline || 'Thank you for shopping with us! Fresh, quality goods packed with care.'}
              </Typography>

              {store.address && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <MapPin size={16} style={{ marginTop: 3, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                    {store.address}
                  </Typography>
                </Box>
              )}

              {store.contact?.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone size={16} />
                  <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                    {store.contact.phone}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Quick Links & Staff Access */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FFFFFF', mb: 0.5 }}>
                Quick Links
              </Typography>
              <Typography
                variant="caption"
                onClick={() => { setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                sx={{ color: '#CBD5E1', cursor: 'pointer', '&:hover': { color: '#ffffff' } }}
              >
                Storefront Home
              </Typography>
              {cartCount > 0 && (
                <Typography
                  variant="caption"
                  onClick={() => setCartDrawerOpen(true)}
                  sx={{ color: '#CBD5E1', cursor: 'pointer', '&:hover': { color: '#ffffff' } }}
                >
                  Shopping Cart ({cartCount})
                </Typography>
              )}
              <Divider sx={{ my: 1, borderColor: '#334155' }} />
              <Button
                variant="outlined"
                size="small"
                onClick={onOpenStaffLogin}
                startIcon={<Lock size={14} />}
                sx={{
                  borderColor: '#334155',
                  color: '#94A3B8',
                  fontSize: '0.72rem',
                  textTransform: 'none',
                  borderRadius: '6px',
                  '&:hover': { borderColor: '#475569', color: '#ffffff', bgcolor: 'transparent' }
                }}
              >
                Merchant Staff Login
              </Button>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#1E293B', mb: 3 }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              © {new Date().getFullYear()} {store.name}. All rights reserved. Powered by <strong>Ariso Retail Ecommerce</strong>.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B' }}>
              <ShieldCheck size={16} />
              <Typography variant="caption">100% Safe & Secure Online Ordering</Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
