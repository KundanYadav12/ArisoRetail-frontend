import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Button,
  InputBase,
  Paper,
  Container,
  Chip
} from '@mui/material';
import {
  ShoppingCart,
  Search,
  X,
  Phone,
  MapPin,
  Clock,
  ArrowLeft,
  Truck,
  Store,
  ExternalLink
} from 'lucide-react';
import { resolveImageUrl } from './storefrontApi';

export default function StorefrontNavbar({
  store,
  cartCount = 0,
  cartTotal = 0,
  onOpenCart,
  searchQuery,
  onSearchChange,
  currentView,
  onNavigate,
  onOpenStaffLogin
}) {
  const themeColor = store?.store_theme_color || '#ea580c';

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      {/* 1. Top Announcement Bar */}
      {store?.store_announcement && (
        <Box
          sx={{
            bgcolor: themeColor,
            color: '#ffffff',
            py: 0.6,
            px: 2,
            textAlign: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <span>✨ {store.store_announcement}</span>
        </Box>
      )}

      {/* 2. Main Navbar */}
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: { xs: 62, sm: 70 },
            gap: { xs: 1, sm: 2 }
          }}
        >
          {/* Left: Brand Logo & Title */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              cursor: 'pointer',
              minWidth: 0,
              userSelect: 'none'
            }}
            onClick={() => onNavigate('home')}
          >
            {store?.logo_url ? (
              <Box
                component="img"
                src={resolveImageUrl(store.logo_url)}
                alt={store.name}
                sx={{
                  width: { xs: 38, sm: 44 },
                  height: { xs: 38, sm: 44 },
                  borderRadius: '10px',
                  objectFit: 'contain',
                  border: '1.5px solid #F1F5F9',
                  p: 0.25,
                  bgcolor: '#ffffff'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Box
                sx={{
                  width: { xs: 38, sm: 44 },
                  height: { xs: 38, sm: 44 },
                  borderRadius: '10px',
                  bgcolor: themeColor,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}
              >
                {store?.name ? store.name.charAt(0).toUpperCase() : 'S'}
              </Box>
            )}

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '0.98rem', sm: '1.15rem' },
                  color: '#0F172A',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {store?.name || 'Online Store'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748B',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: { xs: 'none', sm: 'block' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {store?.store_tagline || 'Online Storefront'}
              </Typography>
            </Box>
          </Box>

          {/* Center: Search Bar (Desktop/Tablet) */}
          {currentView !== 'checkout' && currentView !== 'confirmation' && (
            <Paper
              elevation={0}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                flex: 1,
                maxWidth: 420,
                mx: 2,
                px: 1.5,
                py: 0.5,
                borderRadius: '50px',
                border: '1.5px solid #E2E8F0',
                bgcolor: '#F8FAFC',
                '&:focus-within': { borderColor: themeColor, bgcolor: '#ffffff', boxShadow: `0 0 0 3px ${themeColor}22` }
              }}
            >
              <Search size={18} color="#94A3B8" />
              <InputBase
                sx={{ ml: 1, flex: 1, fontSize: '0.88rem' }}
                placeholder="Search products, grocery items, brands..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <IconButton size="small" onClick={() => onSearchChange('')} sx={{ p: 0.25 }}>
                  <X size={15} color="#94A3B8" />
                </IconButton>
              )}
            </Paper>
          )}

          {/* Right: Delivery badge, Cart Button, Staff Login */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
            {/* Delivery time pill */}
            {store?.estimated_delivery_time && (
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '20px',
                  bgcolor: '#F1F5F9',
                  color: '#334155'
                }}
              >
                <Clock size={14} color="#64748B" />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.74rem' }}>
                  {store.estimated_delivery_time}
                </Typography>
              </Box>
            )}

            {/* Shopping Cart Button */}
            <Button
              variant="contained"
              onClick={onOpenCart}
              startIcon={
                <Badge badgeContent={cartCount} color="error" max={99}>
                  <ShoppingCart size={19} />
                </Badge>
              }
              sx={{
                bgcolor: themeColor,
                color: '#ffffff',
                fontWeight: 800,
                borderRadius: '50px',
                px: { xs: 1.75, sm: 2.25 },
                py: { xs: 0.8, sm: 0.9 },
                fontSize: { xs: '0.8rem', sm: '0.88rem' },
                textTransform: 'none',
                boxShadow: `0 4px 14px ${themeColor}40`,
                '&:hover': { bgcolor: themeColor, filter: 'brightness(0.92)' }
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline-flex' }, alignItems: 'center', gap: 0.5 }}>
                <span>Cart</span>
                {cartTotal > 0 && <span>• ₹{cartTotal.toFixed(2)}</span>}
              </Box>
              <Box sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
                {cartTotal > 0 ? `₹${Math.round(cartTotal)}` : 'Cart'}
              </Box>
            </Button>
          </Box>
        </Box>

        {/* Mobile Search Bar Row */}
        {currentView !== 'checkout' && currentView !== 'confirmation' && (
          <Box sx={{ display: { xs: 'block', md: 'none' }, pb: 1.25 }}>
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                borderRadius: '50px',
                border: '1.5px solid #E2E8F0',
                bgcolor: '#F8FAFC'
              }}
            >
              <Search size={16} color="#94A3B8" />
              <InputBase
                sx={{ ml: 1, flex: 1, fontSize: '0.84rem' }}
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <IconButton size="small" onClick={() => onSearchChange('')} sx={{ p: 0.25 }}>
                  <X size={14} color="#94A3B8" />
                </IconButton>
              )}
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
}
