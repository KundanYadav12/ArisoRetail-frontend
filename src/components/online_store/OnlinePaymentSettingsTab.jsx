import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  MenuItem
} from '@mui/material';
import {
  Save,
  CreditCard,
  Banknote,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Smartphone,
  Wallet
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function OnlinePaymentSettingsTab({ token, restaurantId, subdomain }) {
  const { notify } = useNotify();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Razorpay
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // 2. Paytm
  const [paytmEnabled, setPaytmEnabled] = useState(false);
  const [paytmMid, setPaytmMid] = useState('');
  const [paytmMerchantKey, setPaytmMerchantKey] = useState('');
  const [paytmWebsite, setPaytmWebsite] = useState('DEFAULT');
  const [paytmMode, setPaytmMode] = useState('sandbox');
  const [showPaytmKey, setShowPaytmKey] = useState(false);

  // 3. PhonePe
  const [phonepeEnabled, setPhonepeEnabled] = useState(false);
  const [phonepeMerchantId, setPhonepeMerchantId] = useState('');
  const [phonepeSaltKey, setPhonepeSaltKey] = useState('');
  const [phonepeSaltIndex, setPhonepeSaltIndex] = useState(1);
  const [phonepeMode, setPhonepeMode] = useState('sandbox');
  const [showPhonepeKey, setShowPhonepeKey] = useState(false);

  // 4. Default Gateway
  const [defaultOnlineGateway, setDefaultOnlineGateway] = useState('razorpay');

  // 5. COD & UPI
  const [codEnabled, setCodEnabled] = useState(true);
  const [upiQrEnabled, setUpiQrEnabled] = useState(false);
  const [upiId, setUpiId] = useState('');

  // 6. Settlement Details
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = subdomain
    ? `https://${subdomain}.arisopos.in/api/store/payment/webhook/${restaurantId}`
    : `https://retail.arisopos.in/api/store/payment/webhook/${restaurantId}`;

  const fetchPaymentSettings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/merchant/store/payment-settings');
      if (res.ok) {
        const data = await res.json();
        const p = data.payment_settings || {};
        
        // Razorpay
        setRazorpayEnabled(Boolean(p.razorpay_enabled));
        setRazorpayKeyId(p.razorpay_key_id || '');
        setRazorpayKeySecret(p.razorpay_key_secret || '');
        setRazorpayWebhookSecret(p.razorpay_webhook_secret || '');

        // Paytm
        setPaytmEnabled(Boolean(p.paytm_enabled));
        setPaytmMid(p.paytm_mid || '');
        setPaytmMerchantKey(p.paytm_merchant_key || '');
        setPaytmWebsite(p.paytm_website || 'DEFAULT');
        setPaytmMode(p.paytm_mode || 'sandbox');

        // PhonePe
        setPhonepeEnabled(Boolean(p.phonepe_enabled));
        setPhonepeMerchantId(p.phonepe_merchant_id || '');
        setPhonepeSaltKey(p.phonepe_salt_key || '');
        setPhonepeSaltIndex(p.phonepe_salt_index || 1);
        setPhonepeMode(p.phonepe_mode || 'sandbox');

        // Default
        setDefaultOnlineGateway(p.default_online_gateway || 'razorpay');

        // Offline & Bank
        setCodEnabled(Boolean(p.cod_enabled));
        setUpiQrEnabled(Boolean(p.upi_qr_enabled));
        setUpiId(p.upi_id || '');
        setAccountHolder(p.account_holder_name || '');
        setBankName(p.bank_name || '');
        setAccountNumber(p.account_number || '');
        setIfscCode(p.ifsc_code || '');
        setSettlementNotes(p.settlement_notes || '');
      }
    } catch (err) {
      notify.error(err.message, 'Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        // Razorpay
        razorpay_enabled: razorpayEnabled,
        razorpay_key_id: razorpayKeyId.trim() || null,
        razorpay_key_secret: razorpayKeySecret.trim() || null,
        razorpay_webhook_secret: razorpayWebhookSecret.trim() || null,

        // Paytm
        paytm_enabled: paytmEnabled,
        paytm_mid: paytmMid.trim() || null,
        paytm_merchant_key: paytmMerchantKey.trim() || null,
        paytm_website: paytmWebsite.trim() || 'DEFAULT',
        paytm_mode: paytmMode,

        // PhonePe
        phonepe_enabled: phonepeEnabled,
        phonepe_merchant_id: phonepeMerchantId.trim() || null,
        phonepe_salt_key: phonepeSaltKey.trim() || null,
        phonepe_salt_index: parseInt(phonepeSaltIndex, 10) || 1,
        phonepe_mode: phonepeMode,

        // Default
        default_online_gateway: defaultOnlineGateway,

        // COD & Settlement
        cod_enabled: codEnabled,
        upi_qr_enabled: upiQrEnabled,
        upi_id: upiId.trim() || null,
        account_holder_name: accountHolder.trim() || null,
        bank_name: bankName.trim() || null,
        account_number: accountNumber.trim() || null,
        ifsc_code: ifscCode.trim() || null,
        settlement_notes: settlementNotes.trim() || null
      };

      const res = await apiFetch('/api/merchant/store/payment-settings', {
        method: 'PUT',
        body: payload
      });

      if (!res.ok) throw new Error('Failed to update payment settings');
      notify.success('Merchant payment configuration saved securely.', 'Payment Settings Saved');
      fetchPaymentSettings();
    } catch (err) {
      notify.error(err.message, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" sx={{ mt: 1, color: '#64748B' }}>Loading payment accounts...</Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSave}>
      {/* Informational Direct Settlement Alert */}
      <Alert
        severity="info"
        icon={<ShieldCheck size={20} />}
        sx={{
          mb: 3,
          borderRadius: '16px',
          bgcolor: '#eff6ff',
          color: '#1e3a8a',
          '& .MuiAlert-icon': { color: '#2563eb' }
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Direct Merchant Settlement & Multi-Gateway Support (Razorpay, Paytm, PhonePe)
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.82rem', lineHeight: 1.5 }}>
          Online payments made by your customers settle directly into your own merchant account. Enable one or more payment providers and configure your isolated credentials. All API keys and secrets are securely masked and stored on the backend.
        </Typography>
      </Alert>

      {/* Default Online Gateway Selector */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Preferred Default Payment Gateway
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Select which online provider appears as the primary/default selection for online shoppers:
            </Typography>
          </Box>
          <RadioGroup
            row
            value={defaultOnlineGateway}
            onChange={(e) => setDefaultOnlineGateway(e.target.value)}
          >
            <FormControlLabel
              value="razorpay"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Razorpay</Typography>}
            />
            <FormControlLabel
              value="paytm"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Paytm</Typography>}
            />
            <FormControlLabel
              value="phonepe"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>PhonePe</Typography>}
            />
          </RadioGroup>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* 1. Razorpay Gateway Setup */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCard size={20} color="#0284c7" />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                  Razorpay Payment Gateway
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={razorpayEnabled}
                    onChange={(e) => setRazorpayEnabled(e.target.checked)}
                    sx={{ '& .Mui-checked': { color: '#0284c7' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#0284c7' } }}
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {razorpayEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              Standard Razorpay Checkout for Cards, UPI, Netbanking & Wallets.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Razorpay Key ID"
                placeholder="rzp_live_xxxxxxxxxxxxxxxx"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                disabled={!razorpayEnabled}
              />

              <TextField
                fullWidth
                size="small"
                type={showSecret ? 'text' : 'password'}
                label="Razorpay Key Secret"
                placeholder="Enter new secret or leave masked"
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                disabled={!razorpayEnabled}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowSecret(!showSecret)}
                          disabled={!razorpayEnabled}
                        >
                          {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <TextField
                fullWidth
                size="small"
                type={showWebhookSecret ? 'text' : 'password'}
                label="Razorpay Webhook Secret (Optional)"
                placeholder="Secret configured in your Razorpay Webhook settings"
                value={razorpayWebhookSecret}
                onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                disabled={!razorpayEnabled}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          disabled={!razorpayEnabled}
                        >
                          {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              {/* Webhook Endpoint Display */}
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  Webhook URL
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', wordBreak: 'break-all', flex: 1 }}>
                    {webhookUrl}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleCopyWebhookUrl}
                    startIcon={copiedWebhook ? <Check size={12} /> : <Copy size={12} />}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '6px', fontSize: '0.72rem', py: 0.2 }}
                  >
                    {copiedWebhook ? 'Copied' : 'Copy'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 2. Paytm Gateway Setup */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Wallet size={20} color="#0284c7" />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                  Paytm Payment Gateway
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={paytmEnabled}
                    onChange={(e) => setPaytmEnabled(e.target.checked)}
                    sx={{ '& .Mui-checked': { color: '#0284c7' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#0284c7' } }}
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {paytmEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              Official Paytm Merchant Gateway (Initiate Transaction & Server-Side Verification).
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Paytm Merchant ID (MID)"
                placeholder="e.g. YOUR_PAYTM_MID_HERE"
                value={paytmMid}
                onChange={(e) => setPaytmMid(e.target.value)}
                disabled={!paytmEnabled}
              />

              <TextField
                fullWidth
                size="small"
                type={showPaytmKey ? 'text' : 'password'}
                label="Paytm Merchant Key"
                placeholder="Enter new key or leave masked"
                value={paytmMerchantKey}
                onChange={(e) => setPaytmMerchantKey(e.target.value)}
                disabled={!paytmEnabled}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPaytmKey(!showPaytmKey)}
                          disabled={!paytmEnabled}
                        >
                          {showPaytmKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Environment Mode"
                    value={paytmMode}
                    onChange={(e) => setPaytmMode(e.target.value)}
                    disabled={!paytmEnabled}
                  >
                    <MenuItem value="sandbox">Sandbox / Staging</MenuItem>
                    <MenuItem value="production">Production (Live)</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Website Name"
                    placeholder="DEFAULT or WEBSTAGING"
                    value={paytmWebsite}
                    onChange={(e) => setPaytmWebsite(e.target.value)}
                    disabled={!paytmEnabled}
                  />
                </Grid>
              </Grid>

              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                  Checksum & transaction signatures are computed using HMAC-SHA256 according to official Paytm API standards.
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 3. PhonePe Gateway Setup */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Smartphone size={20} color="#673ab7" />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                  PhonePe Payment Gateway
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={phonepeEnabled}
                    onChange={(e) => setPhonepeEnabled(e.target.checked)}
                    sx={{ '& .Mui-checked': { color: '#673ab7' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#673ab7' } }}
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {phonepeEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              Official PhonePe Standard Checkout (/pg/v1/pay) with SHA256 X-VERIFY.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="PhonePe Merchant ID"
                placeholder="e.g. PGTESTPAYUAT or LIVE_MID"
                value={phonepeMerchantId}
                onChange={(e) => setPhonepeMerchantId(e.target.value)}
                disabled={!phonepeEnabled}
              />

              <TextField
                fullWidth
                size="small"
                type={showPhonepeKey ? 'text' : 'password'}
                label="PhonePe Salt Key"
                placeholder="Enter new salt key or leave masked"
                value={phonepeSaltKey}
                onChange={(e) => setPhonepeSaltKey(e.target.value)}
                disabled={!phonepeEnabled}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPhonepeKey(!showPhonepeKey)}
                          disabled={!phonepeEnabled}
                        >
                          {showPhonepeKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Environment Mode"
                    value={phonepeMode}
                    onChange={(e) => setPhonepeMode(e.target.value)}
                    disabled={!phonepeEnabled}
                  >
                    <MenuItem value="sandbox">Sandbox / UAT</MenuItem>
                    <MenuItem value="production">Production (Live)</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Salt Index"
                    value={phonepeSaltIndex}
                    onChange={(e) => setPhonepeSaltIndex(e.target.value)}
                    disabled={!phonepeEnabled}
                  />
                </Grid>
              </Grid>

              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                  X-VERIFY headers and callback responses are verified against PhonePe's latest API standards.
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 4. Cash on Delivery & UPI Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            {/* Cash on Delivery */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Banknote size={20} color="#16a34a" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                    Cash on Delivery (COD)
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={codEnabled}
                      onChange={(e) => setCodEnabled(e.target.checked)}
                      sx={{ '& .Mui-checked': { color: '#16a34a' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' } }}
                    />
                  }
                  label={
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {codEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Allow customers to place orders online and pay cash / scan UPI on arrival.
              </Typography>
            </Paper>

            {/* Direct UPI ID */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', mb: 0.5 }}>
                Store UPI ID (For Direct Scanning)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
                Optionally display your UPI VPA on the order confirmation page.
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="UPI ID / VPA"
                placeholder="e.g. merchant@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* Save Button Bar */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
          sx={{
            bgcolor: '#ea580c',
            color: '#fff',
            fontWeight: 800,
            borderRadius: '10px',
            px: 4,
            py: 1.25,
            textTransform: 'none',
            '&:hover': { bgcolor: '#c2410c' }
          }}
        >
          {saving ? 'Saving...' : 'Save Payment Configuration'}
        </Button>
      </Box>
    </Box>
  );
}
