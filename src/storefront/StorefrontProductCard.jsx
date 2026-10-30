import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Chip
} from '@mui/material';
import { Plus, Minus, Image as ImageIcon } from 'lucide-react';
import { resolveImageUrl } from './storefrontApi';

export default function StorefrontProductCard({
  product,
  quantityInCart = 0,
  onAddToCart,
  onUpdateQuantity,
  onSelectProduct,
  themeColor = '#ea580c'
}) {
  const isOutOfStock = !product.in_stock;
  const hasSavings = product.savings > 0;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: '1.5px solid #F1F5F9',
        bgcolor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#CBD5E1',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      {/* Badges Overlay */}
      <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {hasSavings && (
          <Chip
            label={`${product.discount_percentage}% OFF`}
            size="small"
            sx={{
              bgcolor: '#16a34a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.66rem',
              height: 20,
              borderRadius: '4px'
            }}
          />
        )}
      </Box>

      {/* Veg indicator badge */}
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            border: `1.5px solid ${product.is_veg ? '#16a34a' : '#dc2626'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            bgcolor: '#ffffff',
            p: '2px'
          }}
          title={product.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
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

      {/* Product Image */}
      <Box
        sx={{
          width: '100%',
          height: { xs: 125, sm: 140 },
          bgcolor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}
        onClick={() => onSelectProduct(product)}
      >
        {product.image_url ? (
          <Box
            component="img"
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            sx={{
              maxWidth: '85%',
              maxHeight: '85%',
              objectFit: 'contain',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.05)' }
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;color:#94a3b8;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`;
            }}
          />
        ) : (
          <Box sx={{ color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <ImageIcon size={34} />
          </Box>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(1px)'
            }}
          >
            <Chip
              label="OUT OF STOCK"
              size="small"
              sx={{
                bgcolor: '#ef4444',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.7rem'
              }}
            />
          </Box>
        )}
      </Box>

      {/* Content */}
      <CardContent
        sx={{
          p: { xs: '10px', sm: '12px' },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          boxSizing: 'border-box',
          '&:last-child': {
            pb: { xs: '10px', sm: '12px' }
          },
          '@media (max-width: 360px)': {
            p: '8px',
            '&:last-child': { pb: '8px' }
          }
        }}
      >
        {/* Product Details Header */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#64748B',
              fontSize: { xs: '0.66rem', sm: '0.72rem' },
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              display: 'block',
              lineHeight: 1.2,
              mb: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {product.category_name}
          </Typography>

          <Typography
            variant="subtitle2"
            onClick={() => onSelectProduct(product)}
            title={product.name}
            sx={{
              fontWeight: 800,
              fontSize: { xs: '0.82rem', sm: '0.88rem' },
              color: '#0F172A',
              lineHeight: 1.25,
              m: '2px 0',
              cursor: 'pointer',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              '&:hover': { color: themeColor }
            }}
          >
            {product.name}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: '#94A3B8',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              fontWeight: 600,
              mt: '2px',
              mb: 0,
              display: 'block',
              lineHeight: 1.2
            }}
          >
            {product.unit}
          </Typography>
        </Box>

        {/* Pricing & Add Button Footer */}
        <Box
          sx={{
            mt: 'auto',
            pt: 1,
            borderTop: '1px dashed #F1F5F9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px 8px',
            minWidth: 0,
            '@media (max-width: 360px)': {
              gap: '4px 6px'
            }
          }}
        >
          {/* Price Block */}
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            {/* Price + MRP row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: '2px 4px',
                minWidth: 0
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontWeight: 900,
                  fontSize: 'clamp(0.82rem, 3.2vw, 0.95rem)',
                  color: '#0F172A',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap'
                }}
              >
                ₹{product.price.toFixed(2)}
              </Typography>
              {hasSavings && (
                <Typography
                  component="span"
                  sx={{
                    textDecoration: 'line-through',
                    color: '#94A3B8',
                    fontSize: 'clamp(0.66rem, 2.5vw, 0.74rem)',
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap'
                  }}
                >
                  ₹{product.mrp.toFixed(2)}
                </Typography>
              )}
            </Box>

            {/* Save text (only when discounted) */}
            {hasSavings && (
              <Typography
                component="span"
                sx={{
                  color: '#16a34a',
                  fontSize: 'clamp(0.62rem, 2.2vw, 0.68rem)',
                  fontWeight: 700,
                  display: 'block',
                  mt: '2px',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Save ₹{product.savings.toFixed(2)}
              </Typography>
            )}
          </Box>

          {/* Stepper or Add Button */}
          {quantityInCart > 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: themeColor,
                color: '#ffffff',
                borderRadius: '8px',
                p: '2px',
                flex: '0 0 auto',
                flexShrink: 0,
                boxShadow: `0 2px 8px ${themeColor}40`,
                boxSizing: 'border-box'
              }}
            >
              <IconButton
                size="small"
                onClick={() => onUpdateQuantity(product, quantityInCart - 1)}
                sx={{
                  color: '#ffffff',
                  p: 0.5,
                  width: { xs: 24, sm: 26 },
                  height: { xs: 24, sm: 26 }
                }}
              >
                <Minus size={13} />
              </IconButton>
              <Typography
                sx={{
                  px: { xs: 0.5, sm: 0.75 },
                  fontWeight: 900,
                  fontSize: { xs: '0.75rem', sm: '0.82rem' },
                  minWidth: 18,
                  textAlign: 'center',
                  userSelect: 'none'
                }}
              >
                {quantityInCart}
              </Typography>
              <IconButton
                size="small"
                onClick={() => onUpdateQuantity(product, quantityInCart + 1)}
                disabled={quantityInCart >= product.available_stock}
                sx={{
                  color: '#ffffff',
                  p: 0.5,
                  width: { xs: 24, sm: 26 },
                  height: { xs: 24, sm: 26 },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' }
                }}
              >
                <Plus size={13} />
              </IconButton>
            </Box>
          ) : (
            <Button
              variant="outlined"
              size="small"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(product)}
              startIcon={<Plus size={14} style={{ flexShrink: 0 }} />}
              sx={{
                flex: '0 0 auto',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                borderColor: themeColor,
                color: themeColor,
                fontWeight: 800,
                fontSize: '12px',
                borderRadius: '8px',
                px: '12px',
                py: '6px',
                minWidth: 'auto',
                lineHeight: 1.2,
                textTransform: 'none',
                boxSizing: 'border-box',
                '&:hover': {
                  bgcolor: `${themeColor}12`,
                  borderColor: themeColor
                },
                '@media (max-width: 360px)': {
                  px: '8px',
                  py: '5px',
                  fontSize: '11px'
                }
              }}
            >
              ADD
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
