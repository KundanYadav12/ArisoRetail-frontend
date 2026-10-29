import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { resolveImageUrl } from './storefrontApi';

export default function StorefrontCartDrawer({
  open,
  onClose,
  cart = [],
  store,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) {
  const themeColor = store?.store_theme_color || '#ea580c';

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalSavings = cart.reduce((sum, item) => sum + ((item.mrp - item.price) * item.quantity), 0);

  const minOrderValue = parseFloat(store?.min_order_value || 0);
  const deliveryCharge = parseFloat(store?.delivery_charge || 0);
  const freeDeliveryThreshold = parseFloat(store?.free_delivery_threshold || 0);

  const meetsMinOrder = subtotal >= minOrderValue;
  const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : deliveryCharge;

  // Free delivery progress
  const freeDeliveryRemaining = freeDeliveryThreshold > 0 ? Math.max(0, freeDeliveryThreshold - subtotal) : 0;
  const freeDeliveryProgress = freeDeliveryThreshold > 0 ? Math.min(100, (subtotal / freeDeliveryThreshold) * 100) : 100;

  const totalPayable = subtotal + deliveryFee;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            maxWidth: '100vw',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#FAFAFA'
          }
        }
      }}
    >
      {/* 1. Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: '#ffffff',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingBag size={20} color={themeColor} />
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A' }}>
            My Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.75 }}>
          <X size={18} />
        </IconButton>
      </Box>

      {/* 2. Free Delivery Banner / Progress */}
      {freeDeliveryThreshold > 0 && (
        <Box sx={{ bgcolor: isFreeDelivery ? '#ecfdf5' : '#fffbeb', p: 1.5, borderBottom: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <Truck size={16} color={isFreeDelivery ? '#16a34a' : '#d97706'} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: isFreeDelivery ? '#16a34a' : '#b45309' }}>
              {isFreeDelivery
                ? '🎉 Congratulations! You have unlocked FREE Delivery.'
                : `Add ₹${freeDeliveryRemaining.toFixed(2)} more to get FREE Delivery!`}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={freeDeliveryProgress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': {
                bgcolor: isFreeDelivery ? '#16a34a' : themeColor,
                borderRadius: 3
              }
            }}
          />
        </Box>
      )}

      {/* 3. Items List */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {cart.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Box sx={{ color: '#CBD5E1', mb: 2 }}>
              <ShoppingBag size={64} style={{ margin: '0 auto' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155', mb: 1 }}>
              Your cart is empty
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
              Explore our fresh products and add them to your cart!
            </Typography>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                borderColor: themeColor,
                color: themeColor,
                fontWeight: 800,
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              Browse Catalog
            </Button>
          </Box>
        ) : (
          cart.map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 1.5,
                bgcolor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                gap: 1.5,
                alignItems: 'center'
              }}
            >
              {/* Product Thumbnail */}
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: '8px',
                  bgcolor: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  p: 0.5
                }}
              >
                {item.image_url ? (
                  <Box
                    component="img"
                    src={resolveImageUrl(item.image_url)}
                    alt={item.name}
                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Box sx={{ color: '#94A3B8', fontWeight: 800, fontSize: '0.9rem' }}>
                    {item.name.charAt(0)}
                  </Box>
                )}
              </Box>

              {/* Item Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}
                >
                  {item.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                  ₹{item.price.toFixed(2)} / {item.unit}
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.88rem' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              {/* Stepper */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#F1F5F9',
                  borderRadius: '8px',
                  p: '2px'
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => onUpdateQuantity(item, item.quantity - 1)}
                  sx={{ p: 0.5, width: 24, height: 24, color: '#334155' }}
                >
                  {item.quantity === 1 ? <Trash2 size={13} color="#ef4444" /> : <Minus size={13} />}
                </IconButton>
                <Typography sx={{ px: 1, fontWeight: 900, fontSize: '0.8rem', minWidth: 18, textAlign: 'center' }}>
                  {item.quantity}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onUpdateQuantity(item, item.quantity + 1)}
                  disabled={item.quantity >= item.available_stock}
                  sx={{ p: 0.5, width: 24, height: 24, color: '#334155' }}
                >
                  <Plus size={13} />
                </IconButton>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* 4. Footer & Bill Summary */}
      {cart.length > 0 && (
        <Box
          sx={{
            p: 2,
            bgcolor: '#ffffff',
            borderTop: '1px solid #E2E8F0',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.04)'
          }}
        >
          {/* Minimum Order Warning */}
          {!meetsMinOrder && (
            <Box
              sx={{
                mb: 1.5,
                p: 1.2,
                borderRadius: '8px',
                bgcolor: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <AlertCircle size={16} color="#dc2626" />
              <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 700 }}>
                Minimum order amount is ₹{minOrderValue.toFixed(2)}. Add ₹{(minOrderValue - subtotal).toFixed(2)} more to checkout.
              </Typography>
            </Box>
          )}

          {/* Bill breakdown */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Items Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>₹{subtotal.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Delivery Fee</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: isFreeDelivery ? '#16a34a' : '#0F172A' }}>
                {isFreeDelivery ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
              </Typography>
            </Box>
            {totalSavings > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>Total Savings</Typography>
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>-₹{totalSavings.toFixed(2)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>Grand Total</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: themeColor }}>
                ₹{totalPayable.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Checkout CTA */}
          <Button
            variant="contained"
            fullWidth
            disabled={!meetsMinOrder}
            onClick={() => {
              onClose();
              onProceedToCheckout();
            }}
            endIcon={<ArrowRight size={18} />}
            sx={{
              bgcolor: themeColor,
              color: '#ffffff',
              py: 1.3,
              fontWeight: 900,
              fontSize: '0.96rem',
              borderRadius: '12px',
              textTransform: 'none',
              boxShadow: `0 4px 14px ${themeColor}40`,
              '&:hover': { bgcolor: themeColor, filter: 'brightness(0.92)' }
            }}
          >
            Proceed to Checkout
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
