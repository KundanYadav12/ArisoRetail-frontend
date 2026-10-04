import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Button, TextField, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useMediaQuery, IconButton, CircularProgress, Chip, Tooltip, Tabs, Tab, Switch, Alert } from '@mui/material';
import { Plus, ToggleLeft, ToggleRight, Database, RefreshCw, Users, ShieldAlert, BarChart, Server, Calendar, CheckCircle, Edit2, Trash2, Mail, Send, Key, Palette, Cpu, History, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import SuperAdminThemeManager from '../components/SuperAdminThemeManager';
import SuperAdminAiConfigManager from '../components/SuperAdminAiConfigManager';

export default function SuperAdminPanel({ token }) {
  const { notify, confirmDialog } = useNotify();
  const isMobile = useMediaQuery('(max-width:960px)');
  const isSmall = useMediaQuery('(max-width:600px)');
  const [saTab, setSaTab] = useState(() => {
    try {
      const saved = localStorage.getItem('ariso_sa_tab');
      return saved !== null && !isNaN(Number(saved)) ? Number(saved) : 0;
    } catch (_) {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ariso_sa_tab', String(saTab));
    } catch (_) {}
  }, [saTab]);
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog fields for Provisioning
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restName, setRestName] = useState('');
  const [restLogoUrl, setRestLogoUrl] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [restDomain, setRestDomain] = useState('');
  const [durationMonths, setDurationMonths] = useState('12');
  const [maxUserLimit, setMaxUserLimit] = useState('5');
  const [planId, setPlanId] = useState('1');

  // Edit Tenant Modal
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState(null);

  // Subscription Renewal Modal
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [renewMonths, setRenewMonths] = useState('12');
  const [supportContact, setSupportContact] = useState('');

  useEffect(() => {
    fetchSaaSData();
  }, []);

  const fetchSaaSData = async () => {
    setLoading(true);
    setError('');
    try {
      const statsRes = await apiFetch('/api/superadmin/dashboard');
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      const restRes = await apiFetch('/api/superadmin/restaurants');
      if (restRes.ok) {
        const restData = await restRes.json();
        setRestaurants(Array.isArray(restData) ? restData : []);
      } else {
        setRestaurants([]);
      }

      try {
        const scRes = await apiFetch('/api/superadmin/support-contact');
        if (scRes.ok) {
          const scData = await scRes.json();
          setSupportContact(scData.support_contact_number || '');
        }
      } catch (_) {}

      const logsRes = await apiFetch('/api/superadmin/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(Array.isArray(logsData) ? logsData : []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      setError('Failed to fetch SaaS records.');
      setRestaurants([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    const payload = {
      name: restName,
      logo_url: restLogoUrl,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_mobile: ownerMobile,
      domain: restDomain,
      duration_months: parseInt(durationMonths),
      max_user_limit: parseInt(maxUserLimit),
      subscription_plan_id: parseInt(planId)
    };

    try {
      const response = await apiFetch('/api/superadmin/restaurants', {
        method: 'POST',
        body: payload
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to provision tenant.');

      notify.success(data.message || 'Tenant created and verification OTP sent.', 'Tenant Provisioned');
      setDialogOpen(false);
      fetchSaaSData();
    } catch (err) {
      notify.error(err.message, 'Provisioning Error');
    }
  };

  const handleSaveSupportContact = async () => {
    try {
      const response = await apiFetch('/api/superadmin/support-contact', {
        method: 'PUT',
        body: { support_contact_number: supportContact }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save support contact number.');
      setSupportContact(data.support_contact_number || '');
      notify.success(data.message || 'Support contact number updated.', 'Support Contact');
    } catch (err) {
      notify.error(err.message, 'Support Contact Error');
    }
  };

  const formatDateForInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const getExpiryAlertInfo = (expiryDate) => {
    if (!expiryDate) return { isExpired: false, isNearExpiry: false, daysRemaining: null, label: null };
    const str = String(expiryDate).trim();
    const isoStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
    const exp = new Date(isoStr);
    if (isNaN(exp.getTime())) return { isExpired: false, isNearExpiry: false, daysRemaining: null, label: null };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(exp);
    target.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        isExpired: true,
        isNearExpiry: false,
        daysRemaining: diffDays,
        label: `Expired ${Math.abs(diffDays)}d ago`
      };
    }
    if (diffDays === 0) {
      return {
        isExpired: false,
        isNearExpiry: true,
        daysRemaining: 0,
        label: 'Expires today'
      };
    }
    if (diffDays > 0 && diffDays <= 10) {
      return {
        isExpired: false,
        isNearExpiry: true,
        daysRemaining: diffDays,
        label: `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`
      };
    }
    return {
      isExpired: false,
      isNearExpiry: false,
      daysRemaining: diffDays,
      label: null
    };
  };

  const handleOpenEditModal = (tenant) => {
    setEditTenant({
      id: tenant.id,
      name: tenant.name || '',
      logo_url: tenant.logo_url || '',
      owner_name: tenant.owner_name || '',
      owner_email: tenant.owner_email || tenant.email || '',
      owner_mobile: tenant.owner_mobile || tenant.phone || '',
      domain: tenant.domain || '',
      max_user_limit: tenant.max_user_limit || 5,
      subscription_status: tenant.subscription_status || 'active',
      subscription_plan_id: tenant.subscription_plan_id || 1,
      subscription_start_date: formatDateForInput(tenant.subscription_start_date || tenant.created_at),
      subscription_expires_at: formatDateForInput(tenant.subscription_expires_at),
      feature_serial_numbers: tenant.feature_serial_numbers !== undefined ? Boolean(tenant.feature_serial_numbers) : true
    });
    setEditDialogOpen(true);
  };

  const handleUpdateRestaurant = async (e) => {
    e.preventDefault();
    if (!editTenant) return;

    if (editTenant.subscription_start_date && editTenant.subscription_expires_at) {
      const start = new Date(editTenant.subscription_start_date);
      const expiry = new Date(editTenant.subscription_expires_at);
      if (expiry <= start) {
        notify.error('Expiry Date must be after Start Date.', 'Validation Error');
        return;
      }
    }

    try {
      const response = await apiFetch(`/api/superadmin/restaurants/${editTenant.id}`, {
        method: 'PUT',
        body: editTenant
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update restaurant.');

      notify.success(data.message || 'Restaurant tenant updated successfully.', 'Tenant Updated');
      setEditDialogOpen(false);
      fetchSaaSData();
    } catch (err) {
      notify.error(err.message, 'Update Error');
    }
  };

  const handleDeleteRestaurant = async (tenant) => {
    const isConfirmed = await confirmDialog({
      title: `Delete Tenant "${tenant.name}"`,
      message: `Are you sure you want to permanently delete "${tenant.name}"? This will permanently remove all orders, staff accounts, printers, and settings associated with this restaurant. This action cannot be undone.`,
      confirmText: 'Permanently Delete',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const response = await apiFetch(`/api/superadmin/restaurants/${tenant.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete restaurant tenant.');

      notify.success(data.message || `Restaurant "${tenant.name}" deleted successfully.`, 'Tenant Deleted');
      fetchSaaSData();
    } catch (err) {
      notify.error(err.message, 'Delete Error');
    }
  };

  const handleResendOTP = async (tenant) => {
    try {
      const response = await apiFetch(`/api/superadmin/restaurants/${tenant.id}/resend-otp`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to resend OTP.');

      notify.success(data.message || `Verification OTP resent to ${tenant.owner_email || tenant.email}.`, 'OTP Resent');
    } catch (err) {
      notify.error(err.message, 'Resend OTP Error');
    }
  };

  const handleOpenRenewModal = (tenant) => {
    setSelectedTenant(tenant);
    setRenewMonths('12');
    setRenewDialogOpen(true);
  };

  const handleRenewSubscription = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      const response = await apiFetch(`/api/superadmin/restaurants/${selectedTenant.id}/renew`, {
        method: 'POST',
        body: { duration_months: parseInt(renewMonths) }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Subscription renewal failed.');

      notify.success(data.message || 'Subscription renewed successfully.', 'Subscription Renewed');
      setRenewDialogOpen(false);
      fetchSaaSData();
    } catch (err) {
      notify.error(err.message, 'Renewal Error');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    const isConfirmed = await confirmDialog({
      title: `${nextStatus === 'suspended' ? 'Suspend' : 'Activate'} Tenant Account`,
      message: `Are you sure you want to change the subscription status to ${nextStatus.toUpperCase()}? ${nextStatus === 'suspended' ? 'All terminal logins and order creation will be blocked immediately.' : 'Access will be restored.'}`,
      confirmText: nextStatus === 'suspended' ? 'Suspend Tenant' : 'Reactivate Tenant',
      isDestructive: nextStatus === 'suspended'
    });

    if (!isConfirmed) return;

    try {
      await apiFetch(`/api/superadmin/restaurants/${id}/status`, {
        method: 'PUT',
        body: { status: nextStatus }
      });
      notify.success(`Restaurant subscription status changed to ${nextStatus.toUpperCase()}.`, 'Tenant Status Updated');
      fetchSaaSData();
    } catch (err) {
      notify.error('Failed to update tenant status.', 'Operation Failed');
    }
  };

  const handleToggleSuperBill = async (id, currentVal) => {
    const nextVal = !currentVal;
    try {
      await apiFetch(`/api/superadmin/restaurants/${id}/toggle-superbill`, {
        method: 'PATCH',
        body: { enabled: nextVal }
      });
      notify.success(`SuperBill feature permission ${nextVal ? 'ENABLED' : 'DISABLED'} for this store.`, 'Store Feature Permission');
      fetchSaaSData();
    } catch (err) {
      notify.error('Failed to toggle SuperBill feature permission.', 'Toggle Failed');
    }
  };

  const handleToggleBarcodeScanner = async (id, currentVal) => {
    const nextVal = !currentVal;
    try {
      await apiFetch(`/api/superadmin/restaurants/${id}/toggle-barcode-scanner`, {
        method: 'PATCH',
        body: { enabled: nextVal }
      });
      notify.success(`Barcode Scanner permission ${nextVal ? 'ENABLED' : 'DISABLED'} for this store.`, 'Barcode Scanner Permission');
      fetchSaaSData();
    } catch (err) {
      notify.error('Failed to toggle Barcode Scanner permission.', 'Toggle Failed');
    }
  };

  const handleToggleSerialNumbers = async (id, currentVal) => {
    const nextVal = !currentVal;
    try {
      await apiFetch(`/api/superadmin/restaurants/${id}/toggle-serial-numbers`, {
        method: 'PATCH',
        body: { enabled: nextVal }
      });
      notify.success(`Serial Numbers feature permission ${nextVal ? 'ENABLED' : 'DISABLED'} for this store.`, 'Serial Numbers Permission');
      fetchSaaSData();
    } catch (err) {
      notify.error('Failed to toggle Serial Numbers permission.', 'Toggle Failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">Loading SaaS metrics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          width: '100%',
          maxWidth: '1600px',
          mx: 'auto',
          px: { xs: 1.5, sm: 2.5, md: 4, xl: 6 },
          pt: { xs: 1.5, sm: 2.5, md: 4 },
          pb: { xs: 4, md: 8, xl: 10 }
        }}
      >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%', overflowX: 'auto' }}>
          <Tabs
            value={saTab}
            onChange={(e, val) => setSaTab(val)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-scroller': {
                overflowX: 'auto !important'
              },
              '& .MuiTab-root': {
                fontWeight: 800,
                textTransform: 'none',
                minHeight: { xs: 46, sm: 48 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
                whiteSpace: 'nowrap'
              }
            }}
          >
            <Tab icon={<Server size={18} />} iconPosition="start" label="Tenants & Subscriptions" />
            <Tab icon={<History size={18} />} iconPosition="start" label="📜 Version & Profile History" />
            <Tab icon={<Palette size={18} />} iconPosition="start" label="🎨 Global Theme Customization" />
            <Tab icon={<Cpu size={18} />} iconPosition="start" label="🤖 Google AI Configuration" />
            <Tab icon={<Users size={18} />} iconPosition="start" label="Distributors" />
            <Tab icon={<Key size={18} />} iconPosition="start" label="Licenses" />
          </Tabs>
        </Box>

        {saTab === 1 ? (
          /* VERSION HISTORY & AUDIT TRAIL TAB */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  📜 Restaurant Profile Version History & Audit Trail
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Complete historical record of Restaurant Name changes, Logo updates, and Tenant Creations across the platform.
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={14} />}
                onClick={fetchSaaSData}
                sx={{ fontWeight: 800, textTransform: 'none', width: { xs: '100%', sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'auto' } }}
              >
                Refresh Log History
              </Button>
            </Box>

            {isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {logs.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2.5 }}>
                    <Typography variant="body2" color="text.secondary">No version history logs recorded yet.</Typography>
                  </Paper>
                ) : (
                  logs.map(log => {
                    const isProfileUpdate = log.action === 'RESTAURANT_PROFILE_UPDATED' || log.action === 'TENANT_UPDATE';
                    const isCreation = log.action === 'RESTAURANT_CREATED' || log.action === 'TENANT_CREATE';
                    return (
                      <Card key={log.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            label={isProfileUpdate ? 'Profile Updated' : isCreation ? 'Restaurant Created' : log.action}
                            color={isCreation ? 'success' : isProfileUpdate ? 'info' : 'default'}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: 11 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                        <CardContent sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 1.75 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {(log.current_restaurant_logo || log.new_logo) && (
                              <Box component="img" src={log.current_restaurant_logo || log.new_logo} alt="Logo" sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {log.current_restaurant_name || log.restaurant_name || log.new_name || `Tenant #${log.restaurant_id || ''}`}
                            </Typography>
                          </Box>
                          {(log.prev_name || log.new_name) && (
                            <Box sx={{ fontSize: 12 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>NAME CHANGES:</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', textDecoration: 'line-through' }}>{log.prev_name || 'N/A'}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800 }}>➔</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>{log.new_name || 'N/A'}</Typography>
                              </Box>
                            </Box>
                          )}
                          {(log.prev_logo || log.new_logo) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>LOGO CHANGES:</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {log.prev_logo && (
                                  <Box component="img" src={log.prev_logo} alt="Old Logo" sx={{ width: 24, height: 24, borderRadius: 1, opacity: 0.5, border: '1px solid #ccc' }} />
                                )}
                                {log.prev_logo && log.new_logo && <Typography variant="caption">➔</Typography>}
                                {log.new_logo ? (
                                  <Box component="img" src={log.new_logo} alt="New Logo" sx={{ width: 28, height: 28, borderRadius: 1, border: '1px solid #3b82f6' }} />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">{log.prev_logo ? 'Cleared' : 'No Logo'}</Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.75, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              By: {log.user_name || log.username || log.fallback_user_name || 'System / Admin'}
                            </Typography>
                            <Chip
                              label={(log.user_role || log.fallback_user_role || 'admin').toUpperCase()}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 10, fontWeight: 800, height: 20 }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Event / Action</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Restaurant / Tenant</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name Changes</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Logo Changes</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Changed By</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No version history logs recorded yet.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map(log => {
                        const isProfileUpdate = log.action === 'RESTAURANT_PROFILE_UPDATED' || log.action === 'TENANT_UPDATE';
                        const isCreation = log.action === 'RESTAURANT_CREATED' || log.action === 'TENANT_CREATE';

                        return (
                          <TableRow key={log.id} hover>
                            <TableCell>
                              <Chip
                                label={isProfileUpdate ? 'Profile Updated' : isCreation ? 'Restaurant Created' : log.action}
                                color={isCreation ? 'success' : isProfileUpdate ? 'info' : 'default'}
                                size="small"
                                sx={{ fontWeight: 800 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {(log.current_restaurant_logo || log.new_logo) && (
                                  <Box component="img" src={log.current_restaurant_logo || log.new_logo} alt="Logo" sx={{ width: 26, height: 26, borderRadius: 1, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                  {log.current_restaurant_name || log.restaurant_name || log.new_name || `Tenant #${log.restaurant_id || ''}`}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {log.prev_name || log.new_name ? (
                                <Box sx={{ fontSize: 13 }}>
                                  {log.prev_name && (
                                    <Typography variant="caption" sx={{ color: 'text.secondary', textDecoration: 'line-through', mr: 1 }}>
                                      {log.prev_name}
                                    </Typography>
                                  )}
                                  {log.new_name && (
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                      ➔ {log.new_name}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary">{log.description || 'N/A'}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {log.prev_logo && (
                                  <Box component="img" src={log.prev_logo} alt="Old Logo" sx={{ width: 24, height: 24, borderRadius: 1, opacity: 0.5, border: '1px solid #ccc' }} />
                                )}
                                {log.prev_logo && log.new_logo && <Typography variant="caption">➔</Typography>}
                                {log.new_logo ? (
                                  <Box component="img" src={log.new_logo} alt="New Logo" sx={{ width: 28, height: 28, borderRadius: 1, border: '1px solid #3b82f6' }} />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">{log.prev_logo ? 'Cleared' : 'No Logo'}</Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>
                              {log.user_name || log.username || log.fallback_user_name || 'System / Admin'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={(log.user_role || log.fallback_user_role || 'admin').toUpperCase()}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 10, fontWeight: 800 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : saTab === 2 ? (
          <SuperAdminThemeManager token={token} />
        ) : saTab === 3 ? (
          <SuperAdminAiConfigManager token={token} />
        ) : saTab === 4 ? (
          <SuperAdminDistributors token={token} />
        ) : saTab === 5 ? (
          <SuperAdminLicenses token={token} />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Global SaaS Stats Cards */}
        {stats && (
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.main', flexShrink: 0 }}>
                    <Server size={24} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>TOTAL TENANTS</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{stats.totalRestaurants}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 2, color: 'success.main', flexShrink: 0 }}>
                    <Users size={24} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>ACTIVE SUBSCRIPTIONS</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{stats.subscriptions?.active || 0}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.main', flexShrink: 0 }}>
                    <BarChart size={24} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>TOTAL ORDERS</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{stats.totalOrders}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: 2, color: 'info.main', flexShrink: 0 }}>
                    <Database size={24} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>PLATFORM REVENUE</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Rs. {stats.totalRevenue.toFixed(2)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Header Bar with Action Button */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              🏢 Restaurant Tenants & Subscriptions
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Manage SaaS restaurant accounts, plan limits, active subscriptions, and user access.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setRestName('');
              setRestLogoUrl('');
              setOwnerName('');
              setOwnerEmail('');
              setOwnerMobile('');
              setRestDomain('');
              setDurationMonths('12');
              setMaxUserLimit('5');
              setPlanId('1');
              setDialogOpen(true);
            }}
            sx={{ fontWeight: 800, textTransform: 'none', px: 2.5, py: 1, width: { xs: '100%', sm: 'auto' } }}
          >
            + Provision New Restaurant / Tenant
          </Button>
        </Box>

        {/* Platform-wide Support Contact Number (shown in tenants' expired-account banner) */}
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>Support Contact Number</Typography>
            <Typography variant="caption" color="text.secondary">
              Platform-wide. Shown to expired tenants in the account-expired banner.
            </Typography>
          </Box>
          <TextField
            size="small"
            label="Support Contact Number"
            placeholder="+91 98765 43210"
            value={supportContact}
            onChange={e => setSupportContact(e.target.value)}
            sx={{ minWidth: { sm: 240 } }}
          />
          <Button variant="contained" onClick={handleSaveSupportContact} sx={{ fontWeight: 800, textTransform: 'none' }}>
            Save Number
          </Button>
        </Paper>

        {/* Tenant List: Mobile Stacked Card View or Desktop Scrollable Table */}
        {isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {restaurants.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2.5 }}>
                <Typography variant="body2" color="text.secondary">No restaurant tenants found.</Typography>
              </Paper>
            ) : (
              restaurants.map(rest => (
                <Card key={rest.id} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                  {/* Card Header */}
                  <Box sx={{ p: 1.75, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      {rest.logo_url ? (
                        <Box component="img" src={rest.logo_url} alt="Logo" sx={{ width: 38, height: 38, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{rest.name ? rest.name.charAt(0).toUpperCase() : 'T'}</Typography>
                        </Box>
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{rest.name}</Typography>
                        {rest.domain && <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600 }}>{rest.domain}</Typography>}
                      </Box>
                    </Box>
                    <Chip
                      label={rest.subscription_status.toUpperCase()}
                      color={rest.subscription_status === 'active' ? 'success' : (rest.subscription_status === 'suspended' || rest.subscription_status === 'expired') ? 'error' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 800, flexShrink: 0 }}
                    />
                  </Box>

                  {/* Feature Permissions Toggles Row */}
                  <Box sx={{ px: 1.75, py: 1.25, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mr: 0.5 }}>PERMISSIONS:</Typography>
                    <Chip
                      label={`SuperBill: ${rest.feature_superbill ? 'ON' : 'OFF'}`}
                      color={rest.feature_superbill ? 'secondary' : 'default'}
                      size="small"
                      onClick={() => handleToggleSuperBill(rest.id, rest.feature_superbill)}
                      sx={{ fontWeight: 800, cursor: 'pointer', height: 24, fontSize: '0.72rem' }}
                    />
                    <Chip
                      label={`Scanner: ${rest.barcode_scanner_enabled ? 'ON' : 'OFF'}`}
                      color={rest.barcode_scanner_enabled ? 'success' : 'default'}
                      size="small"
                      onClick={() => handleToggleBarcodeScanner(rest.id, rest.barcode_scanner_enabled)}
                      sx={{ fontWeight: 800, cursor: 'pointer', height: 24, fontSize: '0.72rem' }}
                      title="Toggle Barcode Scanner Permission"
                    />
                    <Chip
                      label={`Serial No: ${rest.feature_serial_numbers ? 'ON' : 'OFF'}`}
                      color={rest.feature_serial_numbers ? 'secondary' : 'default'}
                      size="small"
                      onClick={() => handleToggleSerialNumbers(rest.id, rest.feature_serial_numbers)}
                      sx={{ fontWeight: 800, cursor: 'pointer', height: 24, fontSize: '0.72rem' }}
                      title="Toggle Serial Numbers Permission"
                    />
                  </Box>

                  {/* Metadata Fields (2-column grid) */}
                  <CardContent sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>DISTRIBUTOR</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{rest.distributor_name || 'N/A'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>LICENSE ID</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                          {rest.license_code || 'Direct Provision'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>OWNER DETAILS</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{rest.owner_name || 'Owner'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{rest.owner_email || rest.email}</Typography>
                        {rest.owner_mobile && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{rest.owner_mobile}</Typography>}
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>START DATE</Typography>
                        <Typography variant="body2">
                          {rest.subscription_start_date ? new Date(rest.subscription_start_date).toLocaleDateString() : (rest.created_at ? new Date(rest.created_at).toLocaleDateString() : 'N/A')}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>EXPIRY DATE</Typography>
                        {(() => {
                          if (!rest.subscription_expires_at) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>N/A (Trial)</Typography>;
                          const expDateStr = new Date(rest.subscription_expires_at).toLocaleDateString();
                          const alertInfo = getExpiryAlertInfo(rest.subscription_expires_at);
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{expDateStr}</Typography>
                              {alertInfo.isExpired && (
                                <Chip label={alertInfo.label || 'Expired'} color="error" size="small" sx={{ fontWeight: 800, height: 18, fontSize: '0.62rem' }} />
                              )}
                              {alertInfo.isNearExpiry && (
                                <Chip icon={<AlertTriangle size={10} />} label={alertInfo.label} color="warning" size="small" sx={{ fontWeight: 800, height: 18, fontSize: '0.62rem' }} />
                              )}
                            </Box>
                          );
                        })()}
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>CURRENT YR PRICE</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {rest.current_year_pricing !== undefined && rest.current_year_pricing !== null ? `₹${parseFloat(rest.current_year_pricing).toFixed(2)}` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>NEXT YR PRICE</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {rest.next_year_pricing !== undefined && rest.next_year_pricing !== null ? `₹${parseFloat(rest.next_year_pricing).toFixed(2)}` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>TOTAL SALES</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                            Rs. {parseFloat(rest.totalRevenue || 0).toFixed(2)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>

                  {/* Card Action Buttons Bar */}
                  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      <Tooltip title="Edit Tenant Details">
                        <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(rest)} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Edit2 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Resend Owner Invitation OTP">
                        <IconButton size="small" color="secondary" onClick={() => handleResendOTP(rest)} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Mail size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Renew / Extend Subscription">
                        <IconButton size="small" color="info" onClick={() => handleOpenRenewModal(rest)} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Calendar size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color={rest.subscription_status === 'suspended' ? 'success' : 'warning'}
                        startIcon={rest.subscription_status === 'suspended' ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                        onClick={() => handleToggleStatus(rest.id, rest.subscription_status)}
                        sx={{ fontWeight: 800, textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        {rest.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </Button>
                      <Tooltip title="Delete Tenant Permanently">
                        <IconButton size="small" color="error" onClick={() => handleDeleteRestaurant(rest)} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              ))
            )}
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1250 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Store Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Distributor Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>License ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Owner / User Details</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>SuperBill Mode</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Barcode Scanner</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Serial Numbers</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Current Yr Price</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Next Yr Price</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total Sales</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {restaurants.map(rest => (
                  <TableRow key={rest.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {rest.logo_url ? (
                          <Box component="img" src={rest.logo_url} alt="Logo" sx={{ width: 32, height: 32, borderRadius: 1.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>{rest.name.charAt(0).toUpperCase()}</Typography>
                          </Box>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{rest.name}</Typography>
                          {rest.domain && <Typography variant="caption" color="primary">{rest.domain}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>
                      {rest.distributor_name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                      {rest.license_code || 'Direct Provision'}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{rest.owner_name || 'Owner'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{rest.owner_email || rest.email}</Typography>
                        {rest.owner_mobile && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{rest.owner_mobile}</Typography>}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rest.subscription_status.toUpperCase()}
                        color={rest.subscription_status === 'active' ? 'success' : (rest.subscription_status === 'suspended' || rest.subscription_status === 'expired') ? 'error' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rest.feature_superbill ? 'ENABLED' : 'DISABLED'}
                        color={rest.feature_superbill ? 'secondary' : 'default'}
                        size="small"
                        onClick={() => handleToggleSuperBill(rest.id, rest.feature_superbill)}
                        sx={{ fontWeight: 800, cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rest.barcode_scanner_enabled ? 'ON' : 'OFF'}
                        color={rest.barcode_scanner_enabled ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleBarcodeScanner(rest.id, rest.barcode_scanner_enabled)}
                        sx={{ fontWeight: 800, cursor: 'pointer' }}
                        title="Toggle Barcode Scanner Permission (Super Admin Only)"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rest.feature_serial_numbers ? 'ENABLED' : 'DISABLED'}
                        color={rest.feature_serial_numbers ? 'secondary' : 'default'}
                        size="small"
                        onClick={() => handleToggleSerialNumbers(rest.id, rest.feature_serial_numbers)}
                        sx={{ fontWeight: 800, cursor: 'pointer' }}
                        title="Toggle Serial Numbers Permission (Super Admin Only)"
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {rest.subscription_start_date ? new Date(rest.subscription_start_date).toLocaleDateString() : (rest.created_at ? new Date(rest.created_at).toLocaleDateString() : 'N/A')}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {(() => {
                        if (!rest.subscription_expires_at) return <Typography variant="caption" sx={{ color: 'text.secondary' }}>N/A (Trial)</Typography>;
                        const expDateStr = new Date(rest.subscription_expires_at).toLocaleDateString();
                        const alertInfo = getExpiryAlertInfo(rest.subscription_expires_at);
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontSize: 13 }}>{expDateStr}</Typography>
                            {alertInfo.isExpired && (
                              <Chip
                                label={alertInfo.label || 'Expired'}
                                color="error"
                                size="small"
                                sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                              />
                            )}
                            {alertInfo.isNearExpiry && (
                              <Chip
                                icon={<AlertTriangle size={11} />}
                                label={alertInfo.label}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 'bold' }}>
                      {rest.current_year_pricing !== undefined && rest.current_year_pricing !== null ? `₹${parseFloat(rest.current_year_pricing).toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 'bold' }}>
                      {rest.next_year_pricing !== undefined && rest.next_year_pricing !== null ? `₹${parseFloat(rest.next_year_pricing).toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rs. {parseFloat(rest.totalRevenue || 0).toFixed(2)}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Tooltip title="Edit Tenant Details">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(rest)}>
                            <Edit2 size={16} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Resend Owner Invitation OTP">
                          <IconButton size="small" color="secondary" onClick={() => handleResendOTP(rest)}>
                            <Mail size={16} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Renew / Extend Subscription">
                          <IconButton size="small" color="info" onClick={() => handleOpenRenewModal(rest)}>
                            <Calendar size={16} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={rest.subscription_status === 'suspended' ? 'Reactivate Tenant' : 'Suspend Tenant'}>
                          <IconButton size="small" onClick={() => handleToggleStatus(rest.id, rest.subscription_status)} color={rest.subscription_status === 'suspended' ? 'success' : 'warning'}>
                            {rest.subscription_status === 'suspended' ? <ToggleLeft size={20} /> : <ToggleRight size={20} />}
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Tenant Permanently">
                          <IconButton size="small" color="error" onClick={() => handleDeleteRestaurant(rest)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* System Audit logs summary */}
        <Card variant="outlined">
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
              Global SaaS Security logs & Audits
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflowY: 'auto', fontSize: 12, pb: 2, pr: 0.5 }}>
              {(logs || []).map(log => (
                <Box key={log.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', mr: 1 }}>[{log.action}]</Typography>
                    <Typography variant="caption" sx={{ color: 'text.primary' }}>{log.description}</Typography>
                    {log.current_restaurant_name && <Typography variant="caption" color="secondary" sx={{ ml: 1, fontWeight: 'bold' }}>({log.current_restaurant_name})</Typography>}
                  </Box>
                  <Typography variant="caption" color="text.secondary">IP: {log.ip_address} | {new Date(log.created_at).toLocaleTimeString()}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

          </Box>
        )}

      {/* TENANT PROVISIONING DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Provision Tenant & Send OTP</DialogTitle>
        <form onSubmit={handleCreateRestaurant}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Restaurant Name" size="small" fullWidth value={restName} onChange={e => setRestName(e.target.value)} required />
            <TextField label="Logo Image URL (Optional)" size="small" fullWidth placeholder="https://example.com/logo.png" value={restLogoUrl} onChange={e => setRestLogoUrl(e.target.value)} />
            <TextField label="Owner Full Name" size="small" fullWidth value={ownerName} onChange={e => setOwnerName(e.target.value)} required />
            <TextField label="Owner Email (Receives OTP)" type="email" size="small" fullWidth value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} required />
            <TextField label="Owner Mobile" size="small" fullWidth value={ownerMobile} onChange={e => setOwnerMobile(e.target.value)} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Select size="small" fullWidth value={planId} onChange={e => setPlanId(e.target.value)}>
                  <MenuItem value="1">Starter (5 Users)</MenuItem>
                  <MenuItem value="2">Business (15 Users)</MenuItem>
                  <MenuItem value="3">Enterprise (100 Users)</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={6}>
                <Select size="small" fullWidth value={durationMonths} onChange={e => setDurationMonths(e.target.value)}>
                  <MenuItem value="3">3 Months</MenuItem>
                  <MenuItem value="6">6 Months</MenuItem>
                  <MenuItem value="12">12 Months (1 Yr)</MenuItem>
                </Select>
              </Grid>
            </Grid>

            <TextField label="Max Staff User Limit" type="number" size="small" fullWidth value={maxUserLimit} onChange={e => setMaxUserLimit(e.target.value)} required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Provision & Send OTP</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT TENANT DIALOG */}
      {editTenant && (
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Edit Restaurant Tenant</DialogTitle>
          <form onSubmit={handleUpdateRestaurant}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Pre-expiry or Expired Alert Banner */}
              {(() => {
                if (!editTenant.subscription_expires_at) return null;
                const alertInfo = getExpiryAlertInfo(editTenant.subscription_expires_at);
                if (alertInfo.isExpired) {
                  return (
                    <Alert severity="error" sx={{ fontWeight: 600, fontSize: 13, py: 0.5 }}>
                      This tenant's subscription has expired ({alertInfo.label}). Normal store operations are restricted.
                    </Alert>
                  );
                }
                if (alertInfo.isNearExpiry) {
                  return (
                    <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ fontWeight: 600, fontSize: 13, py: 0.5 }}>
                      Subscription Alert: This tenant's subscription {alertInfo.daysRemaining === 0 ? 'expires today' : `expires in ${alertInfo.daysRemaining} day${alertInfo.daysRemaining > 1 ? 's' : ''}`}.
                    </Alert>
                  );
                }
                return null;
              })()}

              <TextField
                label="Restaurant Name"
                size="small"
                fullWidth
                value={editTenant.name}
                onChange={e => setEditTenant({ ...editTenant, name: e.target.value })}
                required
              />
              <TextField
                label="Logo Image URL"
                size="small"
                fullWidth
                placeholder="https://example.com/logo.png"
                value={editTenant.logo_url}
                onChange={e => setEditTenant({ ...editTenant, logo_url: e.target.value })}
              />
              <TextField
                label="Owner Full Name"
                size="small"
                fullWidth
                value={editTenant.owner_name}
                onChange={e => setEditTenant({ ...editTenant, owner_name: e.target.value })}
                required
              />
              <TextField
                label="Owner Email Address"
                type="email"
                size="small"
                fullWidth
                value={editTenant.owner_email}
                onChange={e => setEditTenant({ ...editTenant, owner_email: e.target.value })}
                required
              />
              <TextField
                label="Owner Mobile"
                size="small"
                fullWidth
                value={editTenant.owner_mobile}
                onChange={e => setEditTenant({ ...editTenant, owner_mobile: e.target.value })}
              />
              <TextField
                label="Subdomain / Domain"
                size="small"
                fullWidth
                value={editTenant.domain}
                onChange={e => setEditTenant({ ...editTenant, domain: e.target.value })}
              />
              <Select
                size="small"
                fullWidth
                value={editTenant.subscription_status}
                onChange={e => {
                  const newStatus = e.target.value;
                  const updates = { subscription_status: newStatus };
                  if (newStatus === 'expired') {
                    updates.feature_serial_numbers = false;
                  }
                  setEditTenant({ ...editTenant, ...updates });
                }}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
              <TextField
                label="Max Staff User Limit"
                type="number"
                size="small"
                fullWidth
                value={editTenant.max_user_limit}
                onChange={e => setEditTenant({ ...editTenant, max_user_limit: parseInt(e.target.value || 0) })}
                required
              />

              {/* Start Date and Expiry Date Fields */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Subscription Start Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={editTenant.subscription_start_date || ''}
                    onChange={e => setEditTenant({ ...editTenant, subscription_start_date: e.target.value })}
                    helperText="Subscription activation date"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Subscription Expiry Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={editTenant.subscription_expires_at || ''}
                    onChange={e => {
                      const newExpiry = e.target.value;
                      const updates = { subscription_expires_at: newExpiry };
                      if (newExpiry) {
                        const expDate = new Date(newExpiry);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (expDate < today) {
                          updates.subscription_status = 'expired';
                          updates.feature_serial_numbers = false;
                        } else if (editTenant.subscription_status === 'expired') {
                          updates.subscription_status = 'active';
                        }
                      }
                      setEditTenant({ ...editTenant, ...updates });
                    }}
                    helperText="Must be after Start Date"
                    error={Boolean(
                      editTenant.subscription_start_date &&
                      editTenant.subscription_expires_at &&
                      new Date(editTenant.subscription_expires_at) <= new Date(editTenant.subscription_start_date)
                    )}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Serial Numbers Tracking</Typography>
                  <Typography variant="caption" color="text.secondary">Allow store users to access Product Serial Numbers</Typography>
                </Box>
                <Switch
                  checked={Boolean(editTenant.feature_serial_numbers)}
                  onChange={e => setEditTenant({ ...editTenant, feature_serial_numbers: e.target.checked })}
                  color="secondary"
                  disabled={editTenant.subscription_status === 'expired'}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save Changes</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* SUBSCRIPTION RENEWAL MODAL */}
      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Extend Tenant Subscription</DialogTitle>
        <form onSubmit={handleRenewSubscription}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Extending subscription for <b>{selectedTenant?.name}</b>.
            </Typography>
            <Select size="small" fullWidth value={renewMonths} onChange={e => setRenewMonths(e.target.value)}>
              <MenuItem value="3">Extend 3 Months</MenuItem>
              <MenuItem value="6">Extend 6 Months</MenuItem>
              <MenuItem value="12">Extend 12 Months (1 Year)</MenuItem>
              <MenuItem value="24">Extend 24 Months (2 Years)</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Renew Subscription</Button>
          </DialogActions>
        </form>
      </Dialog>
        </Box>
      </Container>
    </Box>
  );
}

function SuperAdminDistributors({ token }) {
  const { notify, confirmDialog } = useNotify();
  const isMobile = useMediaQuery('(max-width:960px)');
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [distName, setDistName] = useState('');
  const [editingDist, setEditingDist] = useState(null);

  // License inventory popup states
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedDist, setSelectedDist] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  // Nested dialog states for generating more licenses
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genQuantity, setGenQuantity] = useState('5');
  const [genPriceCurrent, setGenPriceCurrent] = useState('1500');
  const [genPriceNext, setGenPriceNext] = useState('2000');

  // Nested dialog states for editing license pricing
  const [editPriceOpen, setEditPriceOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [editPriceCurrent, setEditPriceCurrent] = useState('');
  const [editPriceNext, setEditPriceNext] = useState('');

  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/superadmin/distributors');
      if (res.ok) {
        setDistributors(await res.json());
      }
    } catch (err) {
      notify.error('Failed to load distributors.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenses = async (distId) => {
    setLoadingLicenses(true);
    try {
      const res = await apiFetch(`/api/superadmin/licenses?distributor_id=${distId}`);
      if (res.ok) {
        setLicenses(await res.json());
      }
    } catch (err) {
      notify.error('Failed to load license inventory.');
    } finally {
      setLoadingLicenses(false);
    }
  };

  const handleOpenInventory = (dist) => {
    setSelectedDist(dist);
    setInventoryOpen(true);
    fetchLicenses(dist.id);
  };

  const handleExportExcel = () => {
    if (!selectedDist) return;
    notify.info('Generating Excel file, please wait...');
    apiFetch(`/api/superadmin/distributors/${selectedDist.id}/export-licenses`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to export Excel.');
        }
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const filename = `${selectedDist.name.replace(/\s+/g, '_')}_Distributor_License_Inventory.xlsx`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        notify.success('Excel export downloaded successfully.');
      })
      .catch((err) => {
        notify.error(err.message || 'Error exporting Excel file.');
      });
  };

  const handleGenerateMoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDist) return;
    try {
      const res = await apiFetch('/api/superadmin/licenses/generate', {
        method: 'POST',
        body: {
          distributor_id: selectedDist.id,
          quantity: parseInt(genQuantity),
          current_year_pricing: parseFloat(genPriceCurrent),
          next_year_pricing: parseFloat(genPriceNext)
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate licenses.');

      notify.success(data.message || `Successfully generated ${genQuantity} licenses.`);
      setGenerateOpen(false);
      fetchLicenses(selectedDist.id);
      fetchDistributors();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleUpdatePriceSubmit = async (e) => {
    e.preventDefault();
    if (!editingLicense || !selectedDist) return;
    try {
      const res = await apiFetch(`/api/superadmin/licenses/${editingLicense.id}`, {
        method: 'PUT',
        body: {
          current_year_pricing: parseFloat(editPriceCurrent),
          next_year_pricing: parseFloat(editPriceNext)
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pricing.');

      notify.success('License pricing updated successfully.');
      setEditPriceOpen(false);
      setEditingLicense(null);
      fetchLicenses(selectedDist.id);
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!distName.trim()) return;

    try {
      let url = '/api/superadmin/distributors';
      let method = 'POST';
      if (editingDist) {
        url = `/api/superadmin/distributors/${editingDist.id}`;
        method = 'PUT';
      }

      const res = await apiFetch(url, {
        method,
        body: { name: distName.trim() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');

      notify.success(data.message || 'Saved successfully.');
      setDialogOpen(false);
      setDistName('');
      setEditingDist(null);
      fetchDistributors();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleDelete = async (dist) => {
    const isConfirmed = await confirmDialog({
      title: `Delete Distributor "${dist.name}"`,
      message: `Are you sure you want to delete this distributor? All associated licenses will be permanently deleted as well.`,
      confirmText: 'Delete',
      isDestructive: true
    });
    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`/api/superadmin/distributors/${dist.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete.');

      notify.success('Distributor deleted successfully.');
      fetchDistributors();
    } catch (err) {
      notify.error(err.message);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>Distributor Management</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>Create and manage license distributors</Typography>
        </Box>
        <Button variant="contained" onClick={() => { setEditingDist(null); setDistName(''); setDialogOpen(true); }} sx={{ fontWeight: 800, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}>
          + Add Distributor
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {distributors.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2.5 }}>
              <Typography variant="body2" color="text.secondary">No distributors found.</Typography>
            </Paper>
          ) : (
            distributors.map(d => (
              <Card key={d.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <Box sx={{ p: 1.75, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{d.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View License Inventory">
                      <IconButton size="small" onClick={() => handleOpenInventory(d)} color="secondary" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Key size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Distributor">
                      <IconButton size="small" onClick={() => { setEditingDist(d); setDistName(d.name); setDialogOpen(true); }} color="primary" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Distributor">
                      <IconButton size="small" onClick={() => handleDelete(d)} color="error" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>TOTAL</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800 }}>{d.totalLicenses || 0}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>USED</Typography>
                      <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 800 }}>{d.usedLicenses || 0}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>AVAILABLE</Typography>
                      <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 800 }}>{d.availableLicenses || 0}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Distributor Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Total Licenses</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Used / Activated</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Available</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {distributors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No distributors found.</TableCell>
                </TableRow>
              ) : (
                distributors.map(d => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{d.name}</TableCell>
                    <TableCell>{d.totalLicenses || 0}</TableCell>
                    <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>{d.usedLicenses || 0}</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>{d.availableLicenses || 0}</TableCell>
                    <TableCell align="right" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="View License Inventory">
                        <IconButton onClick={() => handleOpenInventory(d)} color="secondary">
                          <Key size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Distributor">
                        <IconButton onClick={() => { setEditingDist(d); setDistName(d.name); setDialogOpen(true); }} color="primary">
                          <Edit2 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Distributor">
                        <IconButton onClick={() => handleDelete(d)} color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit/Add Distributor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingDist ? 'Edit Distributor' : 'Add Distributor'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              label="Distributor Name"
              size="small"
              fullWidth
              value={distName}
              onChange={e => setDistName(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* License Inventory Dialog */}
      <Dialog open={inventoryOpen} onClose={() => setInventoryOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <Box>
            🔑 License Inventory - {selectedDist?.name}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 'normal' }}>
              Manage keys, generate additional licenses, edit pricing, or download full inventories.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
            <Button variant="outlined" color="primary" size="small" onClick={handleExportExcel} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              📥 Export Excel
            </Button>
            <Button variant="contained" color="primary" size="small" onClick={() => { setGenQuantity('5'); setGenPriceCurrent('1500'); setGenPriceNext('2000'); setGenerateOpen(true); }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              + Generate More Licenses
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingLicenses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 1000 }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>License ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Generated Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Activation Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Store Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>User Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Sub Start Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Sub Expiry Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Current Yr Price</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Next Yr Price</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {licenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center" sx={{ py: 4 }}>No licenses generated for this distributor.</TableCell>
                    </TableRow>
                  ) : (
                    licenses.map(lic => (
                      <TableRow key={lic.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 13 }}>{lic.license_code}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={(lic.status || 'AVAILABLE').toUpperCase()}
                            color={lic.status === 'activated' ? 'success' : (lic.status === 'inactive' ? 'warning' : (lic.status === 'expired' ? 'error' : 'default'))}
                            sx={{ fontWeight: 'bold', fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>{lic.created_at ? new Date(lic.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{lic.store_name || 'N/A'}</TableCell>
                        <TableCell>{lic.owner_name || 'N/A'}</TableCell>
                        <TableCell>{lic.owner_email || 'N/A'}</TableCell>
                        <TableCell>{lic.owner_mobile || 'N/A'}</TableCell>
                        <TableCell>{lic.subscription_start_date ? new Date(lic.subscription_start_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{lic.subscription_expires_at ? new Date(lic.subscription_expires_at).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>₹{parseFloat(lic.current_year_pricing || 0).toFixed(2)}</TableCell>
                        <TableCell>₹{parseFloat(lic.next_year_pricing || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">
                          {(!lic.status || lic.status === 'available') && (
                            <Tooltip title="Edit License Pricing">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingLicense(lic);
                                  setEditPriceCurrent(lic.current_year_pricing.toString());
                                  setEditPriceNext(lic.next_year_pricing.toString());
                                  setEditPriceOpen(true);
                                }}
                                color="primary"
                              >
                                <Edit2 size={14} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInventoryOpen(false)} variant="outlined">Close Inventory</Button>
        </DialogActions>
      </Dialog>

      {/* Generate More Licenses Dialog */}
      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>➕ Generate More Licenses</DialogTitle>
        <form onSubmit={handleGenerateMoreSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Generate additional license keys for <strong>{selectedDist?.name}</strong>.
            </Typography>
            <TextField
              label="Quantity to Generate"
              size="small"
              type="number"
              fullWidth
              value={genQuantity}
              onChange={e => setGenQuantity(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 1, max: 100 } }}
            />
            <TextField
              label="Current Year Price (₹)"
              size="small"
              type="number"
              fullWidth
              value={genPriceCurrent}
              onChange={e => setGenPriceCurrent(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Next Year Price (₹)"
              size="small"
              type="number"
              fullWidth
              value={genPriceNext}
              onChange={e => setGenPriceNext(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Generate</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit License Pricing Dialog */}
      <Dialog open={editPriceOpen} onClose={() => setEditPriceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>✏️ Edit License Pricing</DialogTitle>
        <form onSubmit={handleUpdatePriceSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Update pricing details for License ID: <strong>{editingLicense?.license_code}</strong>.
            </Typography>
            <TextField
              label="Current Year Price (₹)"
              size="small"
              type="number"
              fullWidth
              value={editPriceCurrent}
              onChange={e => setEditPriceCurrent(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Next Year Price (₹)"
              size="small"
              type="number"
              fullWidth
              value={editPriceNext}
              onChange={e => setEditPriceNext(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditPriceOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

function SuperAdminLicenses({ token }) {
  const { notify } = useNotify();
  const isMobile = useMediaQuery('(max-width:960px)');
  const [licenses, setLicenses] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Generator Fields
  const [selectedDist, setSelectedDist] = useState('');
  const [qty, setQty] = useState('10');
  const [currPrice, setCurrPrice] = useState('1500');
  const [nextPrice, setNextPrice] = useState('2000');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchLicensesAndDistributors();
  }, []);

  const fetchLicensesAndDistributors = async () => {
    setLoading(true);
    try {
      const [licRes, distRes] = await Promise.all([
        apiFetch('/api/superadmin/licenses'),
        apiFetch('/api/superadmin/distributors')
      ]);

      if (licRes.ok) setLicenses(await licRes.json());
      if (distRes.ok) setDistributors(await distRes.json());
    } catch (err) {
      notify.error('Failed to load license details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedDist || !qty) return;

    try {
      const res = await apiFetch('/api/superadmin/licenses/generate', {
        method: 'POST',
        body: {
          distributor_id: parseInt(selectedDist),
          quantity: parseInt(qty),
          current_year_pricing: parseFloat(currPrice),
          next_year_pricing: parseFloat(nextPrice)
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate.');

      notify.success(data.message || 'Licenses generated successfully!');
      setDialogOpen(false);
      fetchLicensesAndDistributors();
    } catch (err) {
      notify.error(err.message);
    }
  };

  // Filtered licenses logic
  const filteredLicenses = licenses.filter(lic => {
    const codeMatch = lic.license_code.includes(searchQuery);
    const storeMatch = lic.store_name && lic.store_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuery = searchQuery === '' || codeMatch || storeMatch;

    const matchesStatus = statusFilter === 'all' || lic.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>License Key Management</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>Generate unique 12-digit store activation keys</Typography>
        </Box>
        <Button variant="contained" onClick={() => { if (distributors.length > 0) setSelectedDist(distributors[0].id.toString()); setDialogOpen(true); }} sx={{ fontWeight: 800, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}>
          🔑 Generate Licenses
        </Button>
      </Box>

      {/* Filter Row */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', sm: 'center' }, width: '100%' }}>
        <TextField
          label="Search by License ID or Store"
          size="small"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value.replace(/\D/g, ''))}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
        <Select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: { xs: '100%', sm: 180 } }}>
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="available">🟢 Available</MenuItem>
          <MenuItem value="activated">🔴 Activated</MenuItem>
          <MenuItem value="expired">🟡 Expired</MenuItem>
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredLicenses.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2.5 }}>
              <Typography variant="body2" color="text.secondary">No licenses matching the filters.</Typography>
            </Paper>
          ) : (
            filteredLicenses.map(lic => (
              <Card key={lic.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <Box sx={{ p: 1.75, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'primary.main', fontSize: '0.95rem' }}>
                    {lic.license_code}
                  </Typography>
                  <Chip
                    label={lic.status.toUpperCase()}
                    color={lic.status === 'activated' ? 'error' : lic.status === 'available' ? 'success' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                </Box>
                <CardContent sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1.25, '&:last-child': { pb: 1.75 } }}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>DISTRIBUTOR</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{lic.distributor_name || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>ACTIVATED STORE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{lic.store_name || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>OWNER DETAILS</Typography>
                      <Typography variant="body2">{lic.owner_name || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>CURRENT PRICING</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{parseFloat(lic.current_year_pricing).toFixed(2)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>NEXT YR PRICING</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{parseFloat(lic.next_year_pricing).toFixed(2)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>ACTIVATED DATE</Typography>
                      <Typography variant="body2">
                        {lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>License ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Distributor</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Activated Store</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Owner Details</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Current Pricing</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Next Yr Pricing</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Activated Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>No licenses matching the filters.</TableCell>
                </TableRow>
              ) : (
                filteredLicenses.map(lic => (
                  <TableRow key={lic.id} hover>
                    <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13, color: 'primary.main' }}>
                      {lic.license_code}
                    </TableCell>
                    <TableCell>{lic.distributor_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={lic.status.toUpperCase()}
                        color={lic.status === 'activated' ? 'error' : lic.status === 'available' ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{lic.store_name || 'N/A'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{lic.owner_name || 'N/A'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>₹{parseFloat(lic.current_year_pricing).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>₹{parseFloat(lic.next_year_pricing).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* GENERATOR DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Generate License Keys</DialogTitle>
        <form onSubmit={handleGenerate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>SELECT DISTRIBUTOR</Typography>
              <Select
                size="small"
                fullWidth
                value={selectedDist}
                onChange={e => setSelectedDist(e.target.value)}
                required
              >
                {distributors.map(d => (
                  <MenuItem key={d.id} value={d.id.toString()}>{d.name}</MenuItem>
                ))}
              </Select>
            </Box>

            <TextField
              label="Licenses Quantity to Generate"
              type="number"
              size="small"
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
            />

            <TextField
              label="Current Year Pricing (₹)"
              type="number"
              size="small"
              value={currPrice}
              onChange={e => setCurrPrice(e.target.value)}
              required
            />

            <TextField
              label="Next Year Pricing (₹)"
              type="number"
              size="small"
              value={nextPrice}
              onChange={e => setNextPrice(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Generate Keys</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
