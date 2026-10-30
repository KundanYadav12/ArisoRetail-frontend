import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Chip
} from '@mui/material';
import {
  Store,
  ShoppingBag,
  ListOrdered,
  CreditCard,
  QrCode,
  ExternalLink
} from 'lucide-react';
import OnlineOrdersTab from './OnlineOrdersTab';
import OnlineProductsTab from './OnlineProductsTab';
import OnlineStoreSettingsTab from './OnlineStoreSettingsTab';
import OnlinePaymentSettingsTab from './OnlinePaymentSettingsTab';
import ShareStoreQrTab from './ShareStoreQrTab';
import { apiFetch } from '../../utils/api';

export default function OnlineStoreManager({ token, user, initialSubTab = 0 }) {
  const [subTab, setSubTab] = useState(initialSubTab);
  const [storeSettings, setStoreSettings] = useState(null);

  const fetchStoreSettings = async () => {
    try {
      const res = await apiFetch('/api/merchant/store/settings');
      if (res.ok) {
        const data = await res.json();
        setStoreSettings(data.settings);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const handlePreviewStore = (subdomain) => {
    if (subdomain) {
      const url = `${window.location.origin}/?store=${subdomain}`;
      window.open(url, '_blank');
    }
  };

  const subdomain = storeSettings?.subdomain || user?.subdomain || '';
  const restaurantId = user?.restaurant_id || 1;

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      {/* Module Title & Sub-tabs */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Store size={24} color="#ea580c" />
              Online Store & Ecommerce
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Sell your products online through a personalized storefront, accept online orders, and configure payments
            </Typography>
          </Box>

          {subdomain && (
            <Chip
              icon={<ExternalLink size={13} />}
              label={`https://${subdomain}.arisopos.in`}
              clickable
              onClick={() => handlePreviewStore(subdomain)}
              sx={{
                bgcolor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontWeight: 700,
                fontSize: '0.74rem',
                color: '#334155',
                display: { xs: 'none', sm: 'inline-flex' }
              }}
            />
          )}
        </Box>

        {/* Sub-tabs */}
        <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
          <Tabs
            value={subTab}
            onChange={(e, val) => setSubTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 800,
                fontSize: '0.84rem',
                textTransform: 'none',
                minHeight: 46,
                px: 2
              }
            }}
          >
            <Tab icon={<Store size={16} />} iconPosition="start" label="Store Settings & Branding" />
            <Tab icon={<ShoppingBag size={16} />} iconPosition="start" label="Store Products Catalog" />
            <Tab icon={<ListOrdered size={16} />} iconPosition="start" label="Online Orders" />
            <Tab icon={<CreditCard size={16} />} iconPosition="start" label="Payment Settings" />
            <Tab icon={<QrCode size={16} />} iconPosition="start" label="Share Store & QR Code" />
          </Tabs>
        </Paper>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ pt: 1 }}>
        {subTab === 0 && (
          <OnlineStoreSettingsTab
            token={token}
            onPreviewStore={handlePreviewStore}
          />
        )}

        {subTab === 1 && (
          <OnlineProductsTab
            token={token}
          />
        )}

        {subTab === 2 && (
          <OnlineOrdersTab
            token={token}
            restaurantId={restaurantId}
          />
        )}

        {subTab === 3 && (
          <OnlinePaymentSettingsTab
            token={token}
            restaurantId={restaurantId}
            subdomain={subdomain}
          />
        )}

        {subTab === 4 && (
          <ShareStoreQrTab
            token={token}
            restaurantId={restaurantId}
            storeSettings={storeSettings}
          />
        )}
      </Box>
    </Box>
  );
}
