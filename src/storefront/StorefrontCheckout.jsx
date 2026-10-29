import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  TextField,
  Button,
  RadioGroup,
  Radio,
  FormControlLabel,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  ArrowLeft,
  Truck,
  Store,
  CreditCard,
  Banknote,
  CheckCircle,
  MapPin,
  Phone,
  User,
  Mail,
  ShieldCheck,
  Lock,
  Wallet,
  Smartphone
} from 'lucide-react';
import { submitStoreCheckout, verifyStorePayment, resolveImageUrl } from './storefrontApi';

// Helper to dynamically load external Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function StorefrontCheckout({
  store,
  subdomain,
  cart = [],
  onBackToShopping,
  onOrderSuccess
}) {
  const themeColor = store?.store_theme_color || '#ea580c';

  const [deliveryPreference, setDeliveryPreference] = useState(store?.delivery_enabled ? 'delivery' : 'pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Payment methods
  const isRazorpayAvailable = Boolean(store?.payment_methods?.razorpay);
  const isPaytmAvailable = Boolean(store?.payment_methods?.paytm);
  const isPhonePeAvailable = Boolean(store?.payment_methods?.phonepe);
  const isCodAvailable = Boolean(store?.payment_methods?.cod);
  const defaultGateway = store?.payment_methods?.default_online_gateway || 'razorpay';

  const getInitialPaymentMode = () => {
    if (defaultGateway === 'paytm' && isPaytmAvailable) return 'paytm';
    if (defaultGateway === 'phonepe' && isPhonePeAvailable) return 'phonepe';
    if (defaultGateway === 'razorpay' && isRazorpayAvailable) return 'razorpay';
    if (isRazorpayAvailable) return 'razorpay';
    if (isPaytmAvailable) return 'paytm';
    if (isPhonePeAvailable) return 'phonepe';
    return isCodAvailable ? 'cod' : 'cod';
  };

  const [paymentMode, setPaymentMode] = useState(getInitialPaymentMode);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalSavings = cart.reduce((sum, item) => sum + ((item.mrp - item.price) * item.quantity), 0);

  const deliveryCharge = parseFloat(store?.delivery_charge || 0);
  const freeDeliveryThreshold = parseFloat(store?.free_delivery_threshold || 0);
  const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;
  const deliveryFee = deliveryPreference === 'delivery' ? (isFreeDelivery ? 0 : deliveryCharge) : 0;

  const grandTotal = subtotal + deliveryFee;

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setError('');

    // Form Validations
    if (!customerName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (deliveryPreference === 'delivery') {
      if (!deliveryAddress.trim()) {
        setError('Please enter your full delivery address.');
        return;
      }
      if (!deliveryPincode.trim() || deliveryPincode.replace(/\D/g, '').length < 6) {
        setError('Please enter a valid 6-digit PIN code.');
        return;
      }
    }

    if (cart.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        customer_email: customerEmail.trim() || null,
        delivery_address: deliveryPreference === 'delivery' ? deliveryAddress.trim() : `Pickup from ${store.name}`,
        delivery_city: deliveryCity.trim() || null,
        delivery_state: deliveryState.trim() || null,
        delivery_pincode: deliveryPincode.trim() || null,
        delivery_instructions: deliveryInstructions.trim() || null,
        delivery_preference: deliveryPreference,
        payment_mode: paymentMode,
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          name: item.name
        }))
      };

      const res = await submitStoreCheckout(subdomain, orderPayload);

      // If Razorpay online payment selected:
      if (paymentMode === 'razorpay' && res.razorpay) {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
        }

        const options = {
          key: res.razorpay.key_id,
          amount: res.razorpay.amount,
          currency: res.razorpay.currency || 'INR',
          name: store.name,
          description: `Order #${res.order.order_number}`,
          image: resolveImageUrl(store.logo_url) || undefined,
          order_id: res.razorpay.order_id,
          prefill: {
            name: customerName,
            contact: cleanPhone,
            email: customerEmail || undefined
          },
          theme: {
            color: themeColor
          },
          handler: async function (response) {
            try {
              // Server-side cryptographic signature verification
              const verifyRes = await verifyStorePayment(subdomain, {
                order_id: res.order.id,
                order_number: res.order.order_number,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.verified) {
                onOrderSuccess({
                  ...res.order,
                  payment_status: 'paid',
                  items: cart
                });
              } else {
                setError('Payment verification failed on server.');
              }
            } catch (vErr) {
              setError(`Payment verification error: ${vErr.message}`);
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              setError('Payment was cancelled. You can retry payment or choose Cash on Delivery.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setError(`Payment failed: ${response.error?.description || 'Transaction unsuccessful'}`);
          setSubmitting(false);
        });
        rzp.open();
        return;
      }

      // 2. If Paytm online payment selected:
      if (paymentMode === 'paytm' && res.paytm?.payment_url) {
        window.location.href = res.paytm.payment_url;
        return;
      }

      // 3. If PhonePe online payment selected:
      if (paymentMode === 'phonepe' && res.phonepe?.payment_url) {
        window.location.href = res.phonepe.payment_url;
        return;
      }

      // If Cash On Delivery: order confirmed immediately!
      onOrderSuccess({
        ...res.order,
        items: cart
      });

    } catch (err) {
      console.error('[Checkout Error]:', err);
      setError(err.message || 'Failed to place order. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={onBackToShopping}
        sx={{
          color: '#64748B',
          fontWeight: 700,
          textTransform: 'none',
          mb: 2,
          '&:hover': { color: '#0F172A', bgcolor: 'transparent' }
        }}
      >
        Continue Shopping
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A', mb: 3 }}>
        Checkout & Delivery
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Side: Form */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 1. Delivery vs Pickup Preference */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>
                1. Order Preference
              </Typography>
              <RadioGroup
                row
                value={deliveryPreference}
                onChange={(e) => setDeliveryPreference(e.target.value)}
                sx={{ gap: 2 }}
              >
                {store?.delivery_enabled && (
                  <Paper
                    elevation={0}
                    onClick={() => setDeliveryPreference('delivery')}
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: deliveryPreference === 'delivery' ? themeColor : '#E2E8F0',
                      bgcolor: deliveryPreference === 'delivery' ? `${themeColor}08` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Radio value="delivery" checked={deliveryPreference === 'delivery'} sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Home Delivery</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>To your doorstep</Typography>
                    </Box>
                  </Paper>
                )}

                {store?.pickup_enabled && (
                  <Paper
                    elevation={0}
                    onClick={() => setDeliveryPreference('pickup')}
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: deliveryPreference === 'pickup' ? themeColor : '#E2E8F0',
                      bgcolor: deliveryPreference === 'pickup' ? `${themeColor}08` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Radio value="pickup" checked={deliveryPreference === 'pickup'} sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Store Pickup</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Pick up from store</Typography>
                    </Box>
                  </Paper>
                )}
              </RadioGroup>
            </Paper>

            {/* 2. Customer Contact Details */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                2. Contact Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Full Name"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Mobile Number (10 digits)"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 10 } }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Email Address (Optional, for order receipt)"
                    placeholder="e.g. yourname@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* 3. Delivery Address (if Delivery) */}
            {deliveryPreference === 'delivery' && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                  3. Delivery Address
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      required
                      multiline
                      rows={2}
                      label="Flat / House No. / Street / Area"
                      placeholder="e.g. Flat 402, Greenfield Apartments, Sector 14"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="City"
                      placeholder="e.g. Mumbai"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="State"
                      placeholder="e.g. Maharashtra"
                      value={deliveryState}
                      onChange={(e) => setDeliveryState(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      required
                      label="PIN Code (6 digits)"
                      placeholder="e.g. 400001"
                      value={deliveryPincode}
                      onChange={(e) => setDeliveryPincode(e.target.value)}
                      slotProps={{ htmlInput: { maxLength: 6 } }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Delivery Instructions / Landmark (Optional)"
                      placeholder="e.g. Near HDFC Bank ATM, please call before arriving"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* 4. Payment Method */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>
                {deliveryPreference === 'delivery' ? '4. Payment Method' : '3. Payment Method'}
              </Typography>
              <RadioGroup
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
              >
                {isCodAvailable && (
                  <Paper
                    elevation={0}
                    onClick={() => setPaymentMode('cod')}
                    sx={{
                      p: 1.75,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: paymentMode === 'cod' ? themeColor : '#E2E8F0',
                      bgcolor: paymentMode === 'cod' ? `${themeColor}08` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    <Radio value="cod" checked={paymentMode === 'cod'} sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }} />
                    <Banknote size={22} color="#16a34a" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Cash on Delivery (COD)</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Pay cash or UPI when your order arrives</Typography>
                    </Box>
                  </Paper>
                )}

                {isRazorpayAvailable && (
                  <Paper
                    elevation={0}
                    onClick={() => setPaymentMode('razorpay')}
                    sx={{
                      p: 1.75,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: paymentMode === 'razorpay' ? themeColor : '#E2E8F0',
                      bgcolor: paymentMode === 'razorpay' ? `${themeColor}08` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    <Radio value="razorpay" checked={paymentMode === 'razorpay'} sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }} />
                    <CreditCard size={22} color="#0284c7" />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Razorpay Online Payment</Typography>
                        <Chip label="UPI / Cards / NetBanking" size="small" sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Pay securely with Google Pay, Cards, UPI, or NetBanking</Typography>
                    </Box>
                  </Paper>
                )}

                {isPaytmAvailable && (
                  <Paper
                    elevation={0}
                    onClick={() => setPaymentMode('paytm')}
                    sx={{
                      p: 1.75,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: paymentMode === 'paytm' ? themeColor : '#E2E8F0',
                      bgcolor: paymentMode === 'paytm' ? `${themeColor}08` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    <Radio value="paytm" checked={paymentMode === 'paytm'} sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }} />
                    <Wallet size={22} color="#0284c7" />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Paytm Online Payment</Typography>
                        <Chip label="Paytm Wallet / UPI / Cards" size="small" sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Pay securely with Paytm Wallet, UPI, Cards, or NetBanking</Typography>
                    </Box>
                  </Paper>
                )}

                {isPhonePeAvailable && (
                  <Paper
                    elevation={0}
                    onClick={() => setPaymentMode('phonepe')}
                    sx={{
                      p: 1.75,
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: paymentMode === 'phonepe' ? themeColor : '#E2E8F0',
                      bgcolor: paymentMode === 'phonepe' ? `${themeColor}08` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    <Radio value="phonepe" checked={paymentMode === 'phonepe'} sx={{ color: themeColor, '&.Mui-checked': { color: themeColor } }} />
                    <Smartphone size={22} color="#673ab7" />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>PhonePe Payment Gateway</Typography>
                        <Chip label="PhonePe UPI / QR / Cards" size="small" sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Pay directly via PhonePe UPI, scan QR, or NetBanking</Typography>
                    </Box>
                  </Paper>
                )}
              </RadioGroup>
            </Paper>
          </Box>
        </Grid>

        {/* Right Side: Order Summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '20px',
              border: '1.5px solid #E2E8F0',
              bgcolor: '#ffffff',
              position: { md: 'sticky' },
              top: 90
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', mb: 2 }}>
              Order Summary
            </Typography>

            {/* Cart items list preview */}
            <Box sx={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2.5, pr: 0.5 }}>
              {cart.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '4px',
                        bgcolor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}
                    >
                      {item.quantity}x
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Price Calculations */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Items Subtotal</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Delivery Fee</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: isFreeDelivery || deliveryPreference === 'pickup' ? '#16a34a' : '#0F172A' }}>
                  {deliveryPreference === 'pickup' ? 'FREE (Pickup)' : (isFreeDelivery ? 'FREE' : `₹${deliveryFee.toFixed(2)}`)}
                </Typography>
              </Box>
              {totalSavings > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>Total Discount Savings</Typography>
                  <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>-₹{totalSavings.toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>Final Payable</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: themeColor }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* Place Order CTA */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting}
              onClick={handlePlaceOrder}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <ShieldCheck size={20} />}
              sx={{
                bgcolor: themeColor,
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.05rem',
                py: 1.4,
                borderRadius: '12px',
                textTransform: 'none',
                boxShadow: `0 4px 16px ${themeColor}40`,
                '&:hover': { bgcolor: themeColor, filter: 'brightness(0.92)' }
              }}
            >
              {submitting ? 'Processing Order...' : (paymentMode === 'razorpay' ? `Pay ₹${grandTotal.toFixed(2)} Securely` : 'Confirm & Place Order')}
            </Button>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, color: '#64748B' }}>
              <Lock size={14} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                256-bit Encrypted & Secure Checkout
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
