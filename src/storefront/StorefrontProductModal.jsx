import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import { X, Plus, Minus, ShoppingCart, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { resolveImageUrl } from './storefrontApi';

export default function StorefrontProductModal({
  product,
  open,
  onClose,
  quantityInCart = 0,
  onAddToCart,
  onUpdateQuantity,
  themeColor = '#ea580c'
}) {
  if (!product) return null;

  const hasSavings = product.savings > 0;
  const isOutOfStock = !product.in_stock;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            p: 0
          }
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Close Button */}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 10,
            bgcolor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': { bgcolor: '#F8FAFC' }
          }}
        >
          <X size={18} />
        </IconButton>

        {/* Product Image Stage */}
        <Box
          sx={{
            height: 280,
            bgcolor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3
          }}
        >
          {product.image_url ? (
            <Box
              component="img"
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              sx={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <Box sx={{ color: '#CBD5E1', fontSize: '3rem', fontWeight: 900 }}>
              {product.name.charAt(0)}
            </Box>
          )}
        </Box>

        {/* Details Content */}
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={product.category_name}
              size="small"
              sx={{
                bgcolor: '#F1F5F9',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.72rem'
              }}
            />
            {product.is_featured && (
              <Chip
                icon={<Sparkles size={12} />}
                label="Featured"
                size="small"
                sx={{
                  bgcolor: `${themeColor}15`,
                  color: themeColor,
                  fontWeight: 800,
                  fontSize: '0.72rem'
                }}
              />
            )}
            <Box
              sx={{
                width: 16,
                height: 16,
                border: `1.5px solid ${product.is_veg ? '#16a34a' : '#dc2626'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
                ml: 'auto'
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: product.is_veg ? '#16a34a' : '#dc2626'
                }}
              />
            </Box>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mb: 0.5, lineHeight: 1.25 }}>
            {product.name}
          </Typography>

          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600, mb: 2 }}>
            Pack size / Unit: <strong>{product.unit}</strong>
          </Typography>

          {/* Pricing Box */}
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2.5
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.6rem' }}>
                  ₹{product.price.toFixed(2)}
                </Typography>
                {hasSavings && (
                  <Typography variant="body1" sx={{ textDecoration: 'line-through', color: '#94A3B8', fontWeight: 600 }}>
                    ₹{product.mrp.toFixed(2)}
                  </Typography>
                )}
              </Box>
              {hasSavings && (
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>
                  You save ₹{product.savings.toFixed(2)} ({product.discount_percentage}% OFF)
                </Typography>
              )}
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 800,
                  color: isOutOfStock ? '#ef4444' : '#16a34a'
                }}
              >
                {isOutOfStock ? '● Out of Stock' : '● Available in Stock'}
              </Typography>
            </Box>
          </Box>

          {/* Description */}
          {product.description && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 0.5 }}>
                Product Description
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {product.description}
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 2.5 }} />

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {quantityInCart > 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: themeColor,
                  color: '#ffffff',
                  borderRadius: '12px',
                  p: 0.5,
                  flex: 1,
                  justifyContent: 'space-between'
                }}
              >
                <IconButton
                  size="medium"
                  onClick={() => onUpdateQuantity(product, quantityInCart - 1)}
                  sx={{ color: '#ffffff' }}
                >
                  <Minus size={18} />
                </IconButton>
                <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
                  {quantityInCart} {product.unit}
                </Typography>
                <IconButton
                  size="medium"
                  onClick={() => onUpdateQuantity(product, quantityInCart + 1)}
                  disabled={quantityInCart >= product.available_stock}
                  sx={{ color: '#ffffff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' } }}
                >
                  <Plus size={18} />
                </IconButton>
              </Box>
            ) : (
              <Button
                variant="contained"
                fullWidth
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart(product);
                }}
                startIcon={<ShoppingCart size={18} />}
                sx={{
                  bgcolor: themeColor,
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  py: 1.25,
                  borderRadius: '12px',
                  textTransform: 'none',
                  boxShadow: `0 4px 14px ${themeColor}40`,
                  '&:hover': { bgcolor: themeColor, filter: 'brightness(0.92)' }
                }}
              >
                {isOutOfStock ? 'Currently Unavailable' : 'Add to Cart'}
              </Button>
            )}
          </Box>
        </DialogContent>
      </Box>
    </Dialog>
  );
}
