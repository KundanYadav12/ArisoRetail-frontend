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
  Alert
} from '@mui/material';
import {
  Save,
  Store,
  ExternalLink,
  Sparkles,
  Truck,
  Phone,
  Mail,
  Palette,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

const PRESET_COLORS = [
  '#ea580c', // Orange (Default Ariso)
  '#16a34a', // Emerald Green
  '#0284c7', // Sky Blue
  '#7e22ce', // Purple
  '#e11d48', // Rose Red
  '#0f172a'  // Slate Dark
];

export default function OnlineStoreSettingsTab({ token, onPreviewStore }) {
  const { notify } = useNotify();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form fields
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [storeTagline, setStoreTagline] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');
  const [storeThemeColor, setStoreThemeColor] = useState('#ea580c');
  const [storeAbout, setStoreAbout] = useState('');
  const [storeAnnouncement, setStoreAnnouncement] = useState('');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [minOrderValue, setMinOrderValue] = useState('0');
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('0');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('30-45 mins');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [storeContactEmail, setStoreContactEmail] = useState('');
  const [storeContactPhone, setStoreContactPhone] = useState('');
  const [storeContactWhatsapp, setStoreContactWhatsapp] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/merchant/store/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setSettings(s);
        setOnlineEnabled(Boolean(s.online_store_enabled));
        setStoreTagline(s.store_tagline || '');
        setStoreBannerUrl(s.store_banner_url || '');
        setStoreThemeColor(s.store_theme_color || '#ea580c');
        setStoreAbout(s.store_about || '');
        setStoreAnnouncement(s.store_announcement || '');
        setDeliveryEnabled(s.delivery_enabled !== 0);
        setPickupEnabled(s.pickup_enabled !== 0);
        setMinOrderValue(String(s.min_order_value || 0));
        setDeliveryCharge(String(s.delivery_charge || 0));
        setFreeDeliveryThreshold(String(s.free_delivery_threshold || 0));
        setEstimatedDeliveryTime(s.estimated_delivery_time || '30-45 mins');
        setDeliveryInstructions(s.delivery_instructions || '');
        setStoreContactEmail(s.store_contact_email || '');
        setStoreContactPhone(s.store_contact_phone || '');
        setStoreContactWhatsapp(s.store_contact_whatsapp || '');
      }
    } catch (err) {
      notify.error(err.message, 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        online_store_enabled: onlineEnabled ? 1 : 0,
        store_tagline: storeTagline.trim(),
        store_banner_url: storeBannerUrl.trim() || null,
        store_theme_color: storeThemeColor,
        store_about: storeAbout.trim(),
        store_announcement: storeAnnouncement.trim(),
        delivery_enabled: deliveryEnabled ? 1 : 0,
        pickup_enabled: pickupEnabled ? 1 : 0,
        min_order_value: parseFloat(minOrderValue) || 0,
        delivery_charge: parseFloat(deliveryCharge) || 0,
        free_delivery_threshold: parseFloat(freeDeliveryThreshold) || 0,
        estimated_delivery_time: estimatedDeliveryTime.trim(),
        delivery_instructions: deliveryInstructions.trim(),
        store_contact_email: storeContactEmail.trim() || null,
        store_contact_phone: storeContactPhone.trim() || null,
        store_contact_whatsapp: storeContactWhatsapp.trim() || null
      };

      const res = await apiFetch('/api/merchant/store/settings', {
        method: 'PUT',
        body: payload
      });

      if (!res.ok) throw new Error('Failed to update storefront settings');
      notify.success('Online Storefront settings saved successfully.', 'Settings Saved');
    } catch (err) {
      notify.error(err.message, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = () => {
    if (settings?.store_url && navigator.clipboard) {
      navigator.clipboard.writeText(settings.store_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" sx={{ mt: 1, color: '#64748B' }}>Loading storefront settings...</Typography>
      </Box>
    );
  }

  const storeUrl = settings?.store_url || (settings?.subdomain ? `https://${settings.subdomain}.arisopos.in` : 'Subdomain not assigned yet');

  return (
    <Box component="form" onSubmit={handleSave}>
      {/* 1. Header & Live Store Link Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: '16px',
          border: '1.5px solid #E2E8F0',
          bgcolor: '#F8FAFC',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
              Storefront Status:
            </Typography>
            <Chip
              label={onlineEnabled ? 'ONLINE & ACTIVE' : 'OFFLINE / DISABLED'}
              size="small"
              sx={{
                bgcolor: onlineEnabled ? '#dcfce7' : '#fee2e2',
                color: onlineEnabled ? '#16a34a' : '#b91c1c',
                fontWeight: 900
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            Public Store URL: <strong>{storeUrl}</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {settings?.subdomain && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCopyUrl}
                startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
              >
                {copied ? 'Link Copied' : 'Copy Link'}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => onPreviewStore(settings.subdomain)}
                startIcon={<ExternalLink size={14} />}
                sx={{ bgcolor: '#0F172A', color: '#fff', borderRadius: '8px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#1E293B' } }}
              >
                Preview Storefront
              </Button>
            </>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={onlineEnabled}
                onChange={(e) => setOnlineEnabled(e.target.checked)}
                sx={{ '& .Mui-checked': { color: '#16a34a' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' } }}
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {onlineEnabled ? 'Store Active' : 'Store Disabled'}
              </Typography>
            }
            sx={{ m: 0, ml: 1 }}
          />
        </Box>
      </Paper>

      {/* 2. Main Settings Grid */}
      <Grid container spacing={3}>
        {/* Left Column: Branding & Appearance */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette size={18} color="#ea580c" />
              Storefront Branding & Appearance
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Store Tagline"
                placeholder="e.g. Fresh Daily Groceries at Best Prices"
                value={storeTagline}
                onChange={(e) => setStoreTagline(e.target.value)}
              />

              <TextField
                fullWidth
                label="Announcement Banner Text"
                placeholder="e.g. Free delivery on all orders above ₹499 this week!"
                value={storeAnnouncement}
                onChange={(e) => setStoreAnnouncement(e.target.value)}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="About Store / Welcome Message"
                placeholder="Brief introduction about your retail store, specialties, and quality promise..."
                value={storeAbout}
                onChange={(e) => setStoreAbout(e.target.value)}
              />

              <TextField
                fullWidth
                label="Store Banner Image URL"
                placeholder="https://... (or leave blank for modern color gradient)"
                value={storeBannerUrl}
                onChange={(e) => setStoreBannerUrl(e.target.value)}
              />

              {/* Theme Color Picker */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 1 }}>
                  Storefront Primary Theme Color:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {PRESET_COLORS.map((col) => (
                    <Box
                      key={col}
                      onClick={() => setStoreThemeColor(col)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: col,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: storeThemeColor === col ? '3px solid #0F172A' : '2px solid transparent',
                        transition: 'transform 0.15s ease',
                        '&:hover': { transform: 'scale(1.15)' }
                      }}
                    >
                      {storeThemeColor === col && <Check size={16} color="#ffffff" />}
                    </Box>
                  ))}
                  <TextField
                    size="small"
                    value={storeThemeColor}
                    onChange={(e) => setStoreThemeColor(e.target.value)}
                    sx={{ width: 110, ml: 1, '& input': { py: 0.6, fontSize: '0.8rem', fontWeight: 700 } }}
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Delivery & Fulfillment */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1.5px solid #E2E8F0', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Truck size={18} color="#16a34a" />
              Delivery & Fulfillment Settings
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Home Delivery</Typography>}
                />
                <FormControlLabel
                  control={<Switch checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Store Pickup</Typography>}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Order Value (₹)"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Standard Delivery Charge (₹)"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Free Delivery Threshold (₹)"
                    helperText="Set to 0 if no free delivery"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estimated Delivery Time"
                    placeholder="e.g. 30-45 mins"
                    value={estimatedDeliveryTime}
                    onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Delivery Instructions / Supported Areas"
                placeholder="e.g. Delivering within 5 km of MG Road. Orders placed after 9 PM will be delivered next morning."
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
              />

              <Divider sx={{ my: 0.5 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155' }}>
                Storefront Contact & Support Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Customer Support Phone"
                    placeholder="e.g. 9876543210"
                    value={storeContactPhone}
                    onChange={(e) => setStoreContactPhone(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Store WhatsApp Number"
                    placeholder="e.g. 9876543210"
                    value={storeContactWhatsapp}
                    onChange={(e) => setStoreContactWhatsapp(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Support Email"
                    placeholder="e.g. contact@yourstore.com"
                    value={storeContactEmail}
                    onChange={(e) => setStoreContactEmail(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
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
          {saving ? 'Saving Settings...' : 'Save Storefront Settings'}
        </Button>
      </Box>
    </Box>
  );
}
