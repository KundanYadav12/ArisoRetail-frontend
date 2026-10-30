import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Switch,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Alert,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Divider,
  Grid
} from '@mui/material';
import {
  Store,
  ExternalLink,
  Edit2,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Copy,
  Check,
  Globe,
  Download,
  ShieldCheck,
  AlertCircle,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function SuperAdminStorefrontManager({ token }) {
  const { notify, confirmDialog } = useNotify();

  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Subdomain Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState(null);
  const [submittingSubdomain, setSubmittingSubdomain] = useState(false);

  // Custom Domain Management Modal
  const [customDomainModalOpen, setCustomDomainModalOpen] = useState(false);
  const [domainMerchant, setDomainMerchant] = useState(null);
  const [customDomainData, setCustomDomainData] = useState(null);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [includeWww, setIncludeWww] = useState(true);
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // QR Code Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrMerchant, setQrMerchant] = useState(null);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/superadmin/merchant-stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores || []);
      }
    } catch (err) {
      notify.error(err.message, 'Failed to load merchant stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Debounced real-time subdomain availability check
  useEffect(() => {
    if (!subdomainInput || !assignModalOpen) {
      setSubdomainStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const res = await apiFetch(`/api/superadmin/merchant-stores/check-subdomain?subdomain=${encodeURIComponent(subdomainInput)}&restaurant_id=${selectedMerchant?.id || ''}`);
        if (res.ok) {
          const data = await res.json();
          setSubdomainStatus(data);
        }
      } catch (_) {
        setSubdomainStatus({ available: false, reason: 'Network error checking subdomain' });
      } finally {
        setCheckingSubdomain(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [subdomainInput, assignModalOpen, selectedMerchant]);

  const handleOpenAssignModal = (merchant) => {
    setSelectedMerchant(merchant);
    setSubdomainInput(merchant.subdomain || '');
    setSubdomainStatus(null);
    setAssignModalOpen(true);
  };

  const handleSaveSubdomain = async () => {
    if (!subdomainStatus?.available) return;

    const isConfirmed = await confirmDialog({
      title: 'Confirm Subdomain Assignment',
      message: `Are you sure you want to assign "https://${subdomainStatus.subdomain}.arisopos.in" to ${selectedMerchant.name}? Any previous subdomain will be replaced.`,
      confirmText: 'Assign Subdomain'
    });

    if (!isConfirmed) return;

    setSubmittingSubdomain(true);
    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${selectedMerchant.id}/subdomain`, {
        method: 'PUT',
        body: { subdomain: subdomainStatus.subdomain }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to assign subdomain');

      notify.success(data.message || 'Subdomain assigned successfully.', 'Subdomain Updated');
      setAssignModalOpen(false);
      fetchStores();
    } catch (err) {
      notify.error(err.message, 'Assignment Failed');
    } finally {
      setSubmittingSubdomain(false);
    }
  };

  const handleOpenDomainModal = async (merchant) => {
    setDomainMerchant(merchant);
    setCustomDomainInput(merchant.custom_domain?.domain || '');
    setIncludeWww(merchant.custom_domain?.include_www ?? true);
    setVerificationResult(null);
    setCustomDomainModalOpen(true);
    setLoadingDomain(true);
    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${merchant.id}/custom-domain`);
      if (res.ok) {
        const data = await res.json();
        setCustomDomainData(data.custom_domain);
        if (data.custom_domain?.domain) {
          setCustomDomainInput(data.custom_domain.domain);
          setIncludeWww(Boolean(data.custom_domain.include_www));
        }
      }
    } catch (err) {
      notify.error(err.message, 'Failed to fetch custom domain data');
    } finally {
      setLoadingDomain(false);
    }
  };

  const handleSaveCustomDomain = async () => {
    if (!customDomainInput.trim()) {
      notify.warning('Please enter a valid domain name (e.g. parkashstore.com)');
      return;
    }

    setSavingDomain(true);
    setVerificationResult(null);
    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${domainMerchant.id}/custom-domain`, {
        method: 'POST',
        body: {
          domain: customDomainInput.trim(),
          include_www: includeWww
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign custom domain');

      notify.success(data.message, 'Custom Domain Assigned');
      setCustomDomainData(data.custom_domain);
      fetchStores();
    } catch (err) {
      notify.error(err.message, 'Assignment Failed');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyCustomDomain = async () => {
    setVerifyingDomain(true);
    setVerificationResult(null);
    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${domainMerchant.id}/custom-domain/verify`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Domain verification check failed');

      setVerificationResult(data.result);
      if (data.verified) {
        notify.success(data.message, 'Domain Verified & Active!');
      } else {
        notify.warning(data.message, 'DNS Verification Pending');
      }
      setCustomDomainData(data.result?.domain || null);
      fetchStores();
    } catch (err) {
      notify.error(err.message, 'Verification Check Failed');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleToggleCustomDomain = async (currentStatus) => {
    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${domainMerchant.id}/custom-domain/toggle`, {
        method: 'PATCH',
        body: { is_active: !currentStatus }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle domain status');

      notify.success(data.message);
      setCustomDomainData(prev => ({ ...prev, is_active: data.is_active }));
      fetchStores();
    } catch (err) {
      notify.error(err.message, 'Toggle Failed');
    }
  };

  const handleDeleteCustomDomain = async () => {
    const isConfirmed = await confirmDialog({
      title: 'Remove Custom Domain',
      message: `Are you sure you want to remove the custom domain "${customDomainData?.domain}" from ${domainMerchant.name}? Customers will still be able to access the store via their subdomain.`,
      confirmText: 'Remove Domain',
      confirmColor: 'error'
    });
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${domainMerchant.id}/custom-domain`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove domain');

      notify.success(data.message, 'Custom Domain Removed');
      setCustomDomainData(null);
      setCustomDomainInput('');
      setVerificationResult(null);
      fetchStores();
    } catch (err) {
      notify.error(err.message, 'Removal Failed');
    }
  };

  const handleToggleStoreStatus = async (merchant, currentStatus) => {
    const nextStatus = !currentStatus;
    try {
      const res = await apiFetch(`/api/superadmin/merchant-stores/${merchant.id}/toggle-status`, {
        method: 'PATCH',
        body: { enabled: nextStatus }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      notify.success(`Storefront for "${merchant.name}" is now ${nextStatus ? 'ENABLED' : 'DISABLED'}.`);
      setStores(prev => prev.map(s => s.id === merchant.id ? { ...s, online_store_enabled: nextStatus } : s));
    } catch (err) {
      notify.error(err.message, 'Toggle Failed');
    }
  };

  const copyToClipboard = (text, key) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const filteredStores = stores.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.subdomain && s.subdomain.toLowerCase().includes(q)) ||
      (s.custom_domain?.domain && s.custom_domain.domain.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  });

  return (
    <Box>
      {/* 1. Header Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Globe size={22} color="#4f46e5" />
            Merchant Storefront & Custom Domain Management
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Assign subdomains (*.arisopos.in) or custom domains (e.g. parkashstore.com), manage DNS records, and monitor ecommerce status
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search Merchant or Domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#94A3B8" />
                  </InputAdornment>
                ),
                sx: { width: { xs: 200, sm: 260 }, height: 38, borderRadius: '8px', bgcolor: '#ffffff' }
              }
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={fetchStores}
            startIcon={<RefreshCw size={14} />}
            sx={{ height: 38, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* 2. Merchant Stores Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Merchant / Store</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Subdomain</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Custom Domain</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Store URL</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Products Online</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Orders Received</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Store Active</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                  No merchant stores found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStores.map((merchant) => {
                const hasSubdomain = Boolean(merchant.subdomain);
                const hasCustomDomain = Boolean(merchant.custom_domain?.domain);
                const storeUrl = merchant.custom_domain?.is_active && merchant.custom_domain?.verification_status === 'verified'
                  ? `https://${merchant.custom_domain.domain}`
                  : merchant.store_url;

                return (
                  <TableRow key={merchant.id} hover>
                    {/* Merchant Details */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                        {merchant.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        ID #{merchant.id} • {merchant.phone || merchant.email || 'No contact'}
                      </Typography>
                    </TableCell>

                    {/* Subdomain */}
                    <TableCell>
                      {hasSubdomain ? (
                        <Chip
                          label={merchant.subdomain}
                          size="small"
                          sx={{ bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 800, fontSize: '0.78rem' }}
                        />
                      ) : (
                        <Chip
                          label="Not Assigned"
                          size="small"
                          sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      )}
                    </TableCell>

                    {/* Custom Domain */}
                    <TableCell>
                      {hasCustomDomain ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                              {merchant.custom_domain.domain}
                            </Typography>
                            {merchant.custom_domain.include_www && (
                              <Chip label="+www" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {merchant.custom_domain.verification_status === 'verified' ? (
                              <Chip
                                icon={<CheckCircle2 size={12} color="#16a34a" />}
                                label="DNS Verified"
                                size="small"
                                sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                              />
                            ) : (
                              <Chip
                                icon={<AlertTriangle size={12} color="#d97706" />}
                                label={merchant.custom_domain.verification_status === 'failed' ? 'DNS Failed' : 'Pending DNS'}
                                size="small"
                                sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                              />
                            )}
                            {merchant.custom_domain.is_active ? (
                              <Chip label="Active" size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                            ) : (
                              <Chip label="Inactive" size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: '0.68rem', height: 20 }} />
                            )}
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>None</Typography>
                      )}
                    </TableCell>

                    {/* Store URL */}
                    <TableCell>
                      {storeUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography
                            component="a"
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {storeUrl}
                          </Typography>
                          <ExternalLink size={13} color="#0284c7" />
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>
                      )}
                    </TableCell>

                    {/* Products Online */}
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {merchant.online_product_count}
                      </Typography>
                    </TableCell>

                    {/* Orders Received */}
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: merchant.online_order_count > 0 ? '#16a34a' : '#64748B' }}>
                        {merchant.online_order_count}
                      </Typography>
                    </TableCell>

                    {/* Store Active Toggle */}
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={Boolean(merchant.online_store_enabled)}
                        disabled={!hasSubdomain && !hasCustomDomain}
                        onChange={() => handleToggleStoreStatus(merchant, merchant.online_store_enabled)}
                        sx={{
                          '& .Mui-checked': { color: '#16a34a' },
                          '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' }
                        }}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenAssignModal(merchant)}
                          startIcon={<Edit2 size={13} />}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '6px', py: 0.3 }}
                        >
                          {hasSubdomain ? 'Subdomain' : 'Assign'}
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDomainModal(merchant)}
                          startIcon={<Globe size={13} />}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '6px',
                            py: 0.3,
                            color: hasCustomDomain ? '#4f46e5' : '#475569',
                            borderColor: hasCustomDomain ? '#4f46e5' : '#cbd5e1'
                          }}
                        >
                          Domain
                        </Button>

                        {hasSubdomain && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setQrMerchant(merchant);
                              setQrModalOpen(true);
                            }}
                            title="View Store QR Code"
                            sx={{ color: '#4f46e5' }}
                          >
                            <QrCode size={18} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 3. Subdomain Assignment Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 0.5 }}>
          Assign Subdomain to Store
        </DialogTitle>
        <Typography variant="caption" sx={{ px: 3, color: '#64748B', display: 'block', mb: 2 }}>
          {selectedMerchant?.name} (ID #{selectedMerchant?.id})
        </Typography>

        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Subdomain"
            value={subdomainInput}
            onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="e.g. rampal, parkash, apanabazar"
            helperText="3-30 chars, lowercase letters, numbers, and hyphens only"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748B' }}>
                      .arisopos.in
                    </Typography>
                  </InputAdornment>
                )
              }
            }}
          />

          {/* Validation Feedback */}
          <Box sx={{ mt: 1.5, minHeight: 32 }}>
            {checkingSubdomain ? (
              <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={12} /> Checking availability...
              </Typography>
            ) : subdomainStatus ? (
              subdomainStatus.available ? (
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle2 size={14} /> Subdomain "{subdomainStatus.subdomain}.arisopos.in" is valid & available!
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <XCircle size={14} /> {subdomainStatus.reason}
                </Typography>
              )
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignModalOpen(false)} sx={{ fontWeight: 700, color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!subdomainStatus?.available || submittingSubdomain}
            onClick={handleSaveSubdomain}
            sx={{ bgcolor: '#4f46e5', color: '#fff', fontWeight: 800, borderRadius: '8px', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {submittingSubdomain ? 'Saving...' : 'Save Subdomain'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. Custom Domain Modal */}
      <Dialog
        open={customDomainModalOpen}
        onClose={() => setCustomDomainModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Globe size={22} color="#4f46e5" />
            Custom Merchant Domain — {domainMerchant?.name}
          </Box>
          {customDomainData?.is_active && (
            <Chip
              icon={<ShieldCheck size={14} color="#16a34a" />}
              label="HTTPS Active"
              size="small"
              sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 800 }}
            />
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {loadingDomain ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '0.85rem' }}>
                Merchants can use their own custom apex domain (e.g. <strong>parkashstore.com</strong>) or subdomain (e.g. <strong>nimal.in</strong>, <strong>sham.store</strong>). Both custom domains and subdomains (<strong>*.arisopos.in</strong>) remain fully operational simultaneously.
              </Alert>

              {/* Domain Input Form */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px', bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#1E293B' }}>
                  Domain Assignment
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Custom Domain Name"
                      placeholder="e.g. parkashstore.com, nimal.in, sham.store"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim())}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                                https://
                              </Typography>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSaveCustomDomain}
                      disabled={savingDomain || !customDomainInput.trim()}
                      sx={{ bgcolor: '#4f46e5', fontWeight: 800, borderRadius: '8px', textTransform: 'none', height: 40 }}
                    >
                      {savingDomain ? 'Saving...' : (customDomainData ? 'Update Domain' : 'Save Domain')}
                    </Button>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={includeWww}
                        onChange={(e) => setIncludeWww(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                        Include `www` alias (e.g., support both <strong>{customDomainInput || 'domain.com'}</strong> and <strong>www.{customDomainInput || 'domain.com'}</strong>)
                      </Typography>
                    }
                  />
                </Box>
              </Paper>

              {/* Status and DNS Instructions */}
              {customDomainData && (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 2, bgcolor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Configured Domain</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>
                          https://{customDomainData.domain}
                        </Typography>
                        <IconButton
                          size="small"
                          href={`https://${customDomainData.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: '#0284c7' }}
                        >
                          <ExternalLink size={16} />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Routing Status</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: customDomainData.is_active ? '#16a34a' : '#64748B' }}>
                            {customDomainData.is_active ? 'Active' : 'Disabled'}
                          </Typography>
                          <Switch
                            size="small"
                            checked={Boolean(customDomainData.is_active)}
                            disabled={customDomainData.verification_status !== 'verified'}
                            onChange={() => handleToggleCustomDomain(customDomainData.is_active)}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Verification Error Banner */}
                  {customDomainData.verification_error && (
                    <Alert severity="error" sx={{ borderRadius: '12px' }}>
                      <strong>DNS Verification Notice:</strong> {customDomainData.verification_error}
                    </Alert>
                  )}

                  {/* DNS Instructions Table */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HelpCircle size={16} color="#6366f1" />
                      Required Merchant DNS Records
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5 }}>
                      The merchant must add the following records into their domain registrar (GoDaddy, Namecheap, Cloudflare, BigRock, etc.):
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Host Name</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569' }}>Target / Value</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>Copy</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customDomainData.dns_records?.records?.map((rec, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>
                                <Chip label={rec.type} size="small" sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: '#EEF2FF', color: '#4338CA' }} />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>
                                {rec.host}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#0F172A', wordBreak: 'break-all' }}>
                                {rec.value}
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(rec.value, `rec_${idx}`)}
                                  title="Copy Value"
                                >
                                  {copiedKey === `rec_${idx}` ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Verification Check Action */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Trash2 size={14} />}
                      onClick={handleDeleteCustomDomain}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                    >
                      Remove Custom Domain
                    </Button>

                    <Button
                      variant="contained"
                      onClick={handleVerifyCustomDomain}
                      disabled={verifyingDomain}
                      startIcon={verifyingDomain ? <CircularProgress size={14} color="inherit" /> : <ShieldCheck size={16} />}
                      sx={{ bgcolor: '#16a34a', fontWeight: 800, borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: '#15803d' } }}
                    >
                      {verifyingDomain ? 'Checking DNS Records...' : 'Verify DNS Configuration'}
                    </Button>
                  </Box>

                  {/* Verification Results Feedback */}
                  {verificationResult && (
                    <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: verificationResult.verified ? '#F0FDF4' : '#FFFBEB', border: '1px solid', borderColor: verificationResult.verified ? '#BBF7D0' : '#FDE68A' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: verificationResult.verified ? '#166534' : '#92400E', mb: 1 }}>
                        {verificationResult.verified ? '✅ DNS Configuration Verified Successfully' : '⚠️ DNS Lookup Incomplete'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#475569' }}>
                        Apex A Record: <strong>{verificationResult.checks?.a_record?.status}</strong> ({verificationResult.checks?.a_record?.detected?.join(', ') || 'None'})<br />
                        Verification TXT Record: <strong>{verificationResult.checks?.txt_record?.status}</strong><br />
                        {verificationResult.checks?.cname_record && (
                          <>WWW CNAME Record: <strong>{verificationResult.checks.cname_record.status}</strong> ({verificationResult.checks.cname_record.detected?.join(', ') || 'None'})<br /></>
                        )}
                      </Typography>
                    </Paper>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCustomDomainModalOpen(false)} sx={{ fontWeight: 700, color: '#64748B' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. Store QR Code Modal */}
      <Dialog
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 2, textAlign: 'center' } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 0.5 }}>
          {qrMerchant?.name} — Storefront QR
        </DialogTitle>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
          {qrMerchant?.store_url}
        </Typography>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
          {qrMerchant?.store_url && (
            <Box sx={{ p: 2, bgcolor: '#ffffff', border: '2px solid #E2E8F0', borderRadius: '16px', mb: 2 }}>
              <QRCodeSVG value={qrMerchant.store_url} size={220} level="H" />
            </Box>
          )}
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            Customers scanning this QR code open the public store directly.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', p: 1 }}>
          <Button onClick={() => setQrModalOpen(false)} sx={{ fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
