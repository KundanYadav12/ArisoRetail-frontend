import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ArrowLeft,
  RefreshCw,
  Phone,
  MessageCircle,
  Truck,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';
import { trackStoreOrder } from './storefrontApi';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Order received by store' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Merchant accepted order' },
  { key: 'preparing', label: 'Preparing', desc: 'Packing & preparing items' },
  { key: 'ready_or_dispatched', label: 'Out for Delivery / Ready', desc: 'Dispatched to your address' },
  { key: 'completed', label: 'Delivered', desc: 'Order completed' }
];

export default function StorefrontOrderTracking({
  store,
  subdomain,
  orderNumber,
  orderAccessToken,
  customerPhone,
  onBackToShopping
}) {
  const themeColor = store?.store_theme_color || '#ea580c';

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTracking = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await trackStoreOrder(subdomain, orderNumber, {
        token: orderAccessToken,
        phone: customerPhone
      });
      setOrderData(data.order);
    } catch (err) {
      setError(err.message || 'Order tracking not found.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // Auto-poll status every 15 seconds while open
    const interval = setInterval(() => {
      fetchTracking(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [orderNumber, orderAccessToken]);

  const currentStatus = orderData?.online_order_status || 'pending';
  const isRejected = currentStatus === 'rejected';
  const isCancelled = currentStatus === 'cancelled';

  const getActiveStep = () => {
    switch (currentStatus) {
      case 'pending': return 0;
      case 'confirmed': return 1;
      case 'preparing': return 2;
      case 'ready':
      case 'dispatched': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress sx={{ color: themeColor, mb: 2 }} />
        <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600 }}>
          Locating order #{orderNumber}...
        </Typography>
      </Container>
    );
  }

  if (error || !orderData) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: '20px', border: '1.5px solid #E2E8F0', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#0F172A' }}>
            Order Lookup Failed
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
            {error || 'Unable to load order details. Please check the order reference or contact the store directly.'}
          </Typography>
          <Button
            variant="contained"
            onClick={onBackToShopping}
            sx={{ bgcolor: themeColor, color: '#ffffff', fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            Back to Store
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={onBackToShopping}
          sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}
        >
          Back to Store
        </Button>
        <Button
          size="small"
          onClick={() => fetchTracking(true)}
          startIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
          sx={{ color: themeColor, fontWeight: 700, textTransform: 'none' }}
        >
          Refresh Status
        </Button>
      </Box>

      {/* Main Order Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          mb: 3
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
              Order Tracking
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A' }}>
              #{orderData.unique_order_number}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>
              Placed on {new Date(orderData.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={orderData.payment_status === 'paid' ? 'Paid Online' : 'Cash on Delivery'}
              size="small"
              sx={{
                bgcolor: orderData.payment_status === 'paid' ? '#dcfce7' : '#fef3c7',
                color: orderData.payment_status === 'paid' ? '#16a34a' : '#b45309',
                fontWeight: 800
              }}
            />
            <Chip
              label={orderData.delivery_preference === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
              size="small"
              icon={orderData.delivery_preference === 'pickup' ? <Store size={14} /> : <Truck size={14} />}
              sx={{ bgcolor: '#F1F5F9', fontWeight: 800 }}
            />
          </Box>
        </Box>

        {/* Status Alert if Cancelled or Rejected */}
        {(isRejected || isCancelled) ? (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Order {isRejected ? 'Rejected by Store' : 'Cancelled'}
            </Typography>
            {orderData.rejection_reason && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Reason: <strong>{orderData.rejection_reason}</strong>
              </Typography>
            )}
            {orderData.payment_status === 'refund_pending' && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                A refund of ₹{parseFloat(orderData.total_amount).toFixed(2)} has been queued and will be credited to your original payment method within 5-7 business days.
              </Typography>
            )}
          </Alert>
        ) : (
          /* Live Stepper */
          <Box sx={{ my: 4 }}>
            <Stepper activeStep={getActiveStep()} alternativeLabel>
              {ORDER_STEPS.map((step, idx) => (
                <Step key={step.key}>
                  <StepLabel
                    slotProps={{
                      stepIcon: {
                        sx: {
                          '&.Mui-active': { color: themeColor },
                          '&.Mui-completed': { color: '#16a34a' }
                        }
                      }
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: { xs: '0.74rem', sm: '0.84rem' } }}>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.68rem', display: { xs: 'none', sm: 'block' } }}>
                      {step.desc}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Order Details & Items Grid */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Items in Order ({orderData.items?.length || 0})
          </Typography>

          <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '14px', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {orderData.items?.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', minWidth: 24 }}>
                    {item.quantity}x
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {item.item_name}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  ₹{parseFloat(item.total_price).toFixed(2)}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{parseFloat(orderData.subtotal).toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Delivery Fee</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {parseFloat(orderData.delivery_fee) > 0 ? `₹${parseFloat(orderData.delivery_fee).toFixed(2)}` : 'FREE'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Total Paid / Due</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: themeColor }}>
                ₹{parseFloat(orderData.total_amount).toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Delivery Address Box */}
          {orderData.delivery_preference === 'delivery' && orderData.shipping_address && (
            <Box sx={{ mt: 1, p: 2, borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Delivery Address
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mt: 0.5 }}>
                {orderData.customer_name} ({orderData.customer_phone})
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                {orderData.shipping_address}
                {orderData.delivery_city ? `, ${orderData.delivery_city}` : ''}
                {orderData.delivery_pincode ? ` - ${orderData.delivery_pincode}` : ''}
              </Typography>
              {orderData.delivery_instructions && (
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                  Note: {orderData.delivery_instructions}
                </Typography>
              )}
            </Box>
          )}

          {/* Contact Store Actions */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {store?.contact?.phone && (
              <Button
                variant="outlined"
                component="a"
                href={`tel:${store.contact.phone}`}
                startIcon={<Phone size={16} />}
                sx={{
                  flex: 1,
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: '#CBD5E1',
                  color: '#334155'
                }}
              >
                Call Store ({store.contact.phone})
              </Button>
            )}

            {store?.contact?.whatsapp && (
              <Button
                variant="outlined"
                component="a"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/91${store.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I am inquiring about my order #${orderData.unique_order_number}`)}`}
                startIcon={<MessageCircle size={16} color="#16a34a" />}
                sx={{
                  flex: 1,
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: '#16a34a',
                  color: '#16a34a',
                  '&:hover': { bgcolor: '#f0fdf4' }
                }}
              >
                WhatsApp Store
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
