import React from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Divider,
  Chip
} from '@mui/material';
import {
  CheckCircle2,
  Copy,
  Clock,
  ArrowRight,
  ShoppingBag,
  Share2,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function StorefrontOrderConfirmation({
  store,
  subdomain,
  order,
  onTrackOrder,
  onContinueShopping
}) {
  const themeColor = store?.store_theme_color || '#ea580c';
  const [copied, setCopied] = React.useState(false);

  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/order-status/${order.order_number}?token=${order.order_access_token}`
    : `https://${subdomain}.arisopos.in/#/order-status/${order.order_number}?token=${order.order_access_token}`;

  const handleCopyOrderNumber = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: '24px',
          border: '1.5px solid #E2E8F0',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}
      >
        {/* Animated Checkmark Badge */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
          }}
        >
          <CheckCircle2 size={42} strokeWidth={2.5} />
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.8rem' } }}>
          Order Confirmed!
        </Typography>

        <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 380, mx: 'auto', mb: 3 }}>
          Thank you for ordering with <strong>{store?.name}</strong>. Your order has been placed and is being reviewed by the store merchant.
        </Typography>

        {/* Order Info Card */}
        <Box
          sx={{
            bgcolor: '#F8FAFC',
            p: 2.5,
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            mb: 3
          }}
        >
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
            Unique Order Reference
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', letterSpacing: '0.04em' }}>
              #{order.order_number}
            </Typography>
            <Button
              size="small"
              onClick={handleCopyOrderNumber}
              startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
              sx={{
                minWidth: 'auto',
                py: 0.4,
                px: 1,
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'none',
                color: copied ? '#16a34a' : '#64748B'
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={order.payment_status === 'paid' ? 'Paid Online' : 'Cash on Delivery (Pending)'}
              size="small"
              sx={{
                bgcolor: order.payment_status === 'paid' ? '#dcfce7' : '#fef3c7',
                color: order.payment_status === 'paid' ? '#16a34a' : '#b45309',
                fontWeight: 800,
                fontSize: '0.72rem'
              }}
            />
            <Chip
              label={`Amount: ₹${order.total_amount.toFixed(2)}`}
              size="small"
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #E2E8F0',
                fontWeight: 800,
                fontSize: '0.72rem'
              }}
            />
          </Box>
        </Box>

        {/* Live Tracking QR Code */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '12px',
              bgcolor: '#ffffff',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              mb: 1
            }}
          >
            <QRCodeSVG value={trackingUrl} size={130} level="M" />
          </Box>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            Scan with your mobile camera to track live status anytime
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => onTrackOrder(order.order_number, order.order_access_token)}
            endIcon={<ArrowRight size={18} />}
            sx={{
              bgcolor: themeColor,
              color: '#ffffff',
              fontWeight: 800,
              py: 1.3,
              borderRadius: '12px',
              textTransform: 'none',
              boxShadow: `0 4px 14px ${themeColor}40`,
              '&:hover': { bgcolor: themeColor, filter: 'brightness(0.92)' }
            }}
          >
            Track Live Order Status
          </Button>

          <Button
            variant="outlined"
            onClick={onContinueShopping}
            startIcon={<ShoppingBag size={18} />}
            sx={{
              borderColor: '#CBD5E1',
              color: '#334155',
              fontWeight: 700,
              py: 1.1,
              borderRadius: '12px',
              textTransform: 'none',
              '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' }
            }}
          >
            Continue Shopping
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
