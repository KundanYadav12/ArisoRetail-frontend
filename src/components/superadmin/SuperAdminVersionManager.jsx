import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Select,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, CircularProgress, Chip, Tooltip, Switch, Alert, Tabs, Tab,
  LinearProgress, Grid
} from '@mui/material';
import {
  Monitor, Smartphone, Plus, RefreshCw, Upload, CheckCircle,
  AlertTriangle, ShieldAlert, Download, Copy, Trash2, Edit2,
  ExternalLink, FileCode, Clock, Tag
} from 'lucide-react';
import { apiFetch, getApiUrl } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function SuperAdminVersionManager({ token }) {
  const { notify, confirmDialog } = useNotify();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ versions: [], active: { windows: null, mobile: null }, summary: [] });
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Publish / New Version Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formPlatform, setFormPlatform] = useState('windows');
  const [formVersion, setFormVersion] = useState('');
  const [formMinVersion, setFormMinVersion] = useState('1.0.0');
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('• Improved POS checkout speed.\n• Fixed duplicate printing issues.\n• Enhanced inventory sync stability.');
  const [formInstructions, setFormInstructions] = useState('');
  const [formIsMandatory, setFormIsMandatory] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [packageSourceTab, setPackageSourceTab] = useState(0); // 0: Upload File, 1: External/Store URL
  const [selectedFile, setSelectedFile] = useState(null);
  const [formDownloadUrl, setFormDownloadUrl] = useState('');
  const [formChecksum, setFormChecksum] = useState('');
  const [formPackageType, setFormPackageType] = useState('installer_exe');

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Set Latest Active Version Modal State
  const [setLatestOpen, setSetLatestOpen] = useState(false);
  const [setLatestPlatform, setSetLatestPlatform] = useState('windows');
  const [selectedTargetVersionId, setSelectedTargetVersionId] = useState('');

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/superadmin/app-versions');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        notify('Failed to load application version records.', 'error');
      }
    } catch (err) {
      notify(`Version fetch error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (targetPlatform = 'windows') => {
    setFormPlatform(targetPlatform);
    setFormVersion('');
    setFormMinVersion(data.active[targetPlatform]?.version || '1.0.0');
    setFormTitle(`Ariso Retail POS (${targetPlatform === 'windows' ? 'Windows' : 'Mobile'})`);
    setFormNotes('• Improved application performance.\n• Resolved reported UI & print spooler issues.\n• Added new stability enhancements.');
    setFormInstructions('');
    setFormIsMandatory(false);
    setFormIsActive(true);
    setPackageSourceTab(0);
    setSelectedFile(null);
    setFormDownloadUrl('');
    setFormChecksum('');
    setFormPackageType(targetPlatform === 'windows' ? 'installer_exe' : 'apk');
    setUploadProgress(0);
    setCreateOpen(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!formTitle || formTitle.includes('Ariso Retail POS')) {
        setFormTitle(`Ariso Retail POS v${formVersion || '1.0.x'} (${formPlatform === 'windows' ? 'Windows' : 'Mobile'})`);
      }
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formVersion.trim()) {
      notify('Please enter a valid version number (e.g., 1.0.6)', 'warning');
      return;
    }

    if (packageSourceTab === 0 && !selectedFile) {
      notify('Please select an update package file (.exe or .apk) to upload, or switch to External URL tab.', 'warning');
      return;
    }

    if (packageSourceTab === 1 && !formDownloadUrl.trim()) {
      notify('Please provide a valid download package or app store URL.', 'warning');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('platform', formPlatform);
      formData.append('version', formVersion.trim());
      formData.append('min_supported_version', formMinVersion.trim() || '1.0.0');
      formData.append('title', formTitle.trim());
      formData.append('release_notes', formNotes.trim());
      formData.append('update_instructions', formInstructions.trim());
      formData.append('is_mandatory', formIsMandatory ? '1' : '0');
      formData.append('is_active', formIsActive ? '1' : '0');
      formData.append('package_type', formPackageType);

      if (packageSourceTab === 0 && selectedFile) {
        formData.append('package', selectedFile);

        // Upload using XMLHttpRequest for real-time progress events and unrestricted payload upload time
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const targetUrl = getApiUrl('/api/superadmin/app-versions');
          const token = localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token') || sessionStorage.getItem('token');

          xhr.open('POST', targetUrl, true);
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
              const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            let resJson = {};
            try {
              resJson = JSON.parse(xhr.responseText || '{}');
            } catch (_) {}

            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(100);
              notify(resJson.message || 'Version published successfully!', 'success');
              setCreateOpen(false);
              fetchVersions();
              resolve(resJson);
            } else {
              const errMsg = resJson.error || resJson.message ||
                (xhr.status === 413 ? 'Package file too large for server. Check server upload limits.' : `Server error: ${xhr.status}`);
              reject(new Error(errMsg));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error during file upload. Please verify server connection and reverse-proxy upload limits.'));
          };

          xhr.send(formData);
        });
      } else {
        formData.append('download_url', formDownloadUrl.trim());
        if (formChecksum.trim()) {
          formData.append('checksum_sha256', formChecksum.trim());
        }

        setUploadProgress(50);
        const res = await apiFetch('/api/superadmin/app-versions', {
          method: 'POST',
          body: formData,
          timeout: 60000
        });

        setUploadProgress(100);
        const resJson = await res.json();

        if (res.ok) {
          notify(resJson.message || 'Version published successfully!', 'success');
          setCreateOpen(false);
          fetchVersions();
        } else {
          notify(resJson.error || 'Failed to create application version.', 'error');
        }
      }
    } catch (err) {
      notify(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await apiFetch(`/api/superadmin/app-versions/${item.id}/publish`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const json = await res.json();
        notify(json.message, 'success');
        fetchVersions();
      } else {
        notify('Failed to toggle status.', 'error');
      }
    } catch (err) {
      notify(`Error: ${err.message}`, 'error');
    }
  };

  const handleToggleMandatory = async (item) => {
    try {
      const res = await apiFetch(`/api/superadmin/app-versions/${item.id}/toggle-mandatory`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const json = await res.json();
        notify(json.message, 'success');
        fetchVersions();
      } else {
        notify('Failed to toggle mandatory flag.', 'error');
      }
    } catch (err) {
      notify(`Error: ${err.message}`, 'error');
    }
  };

  const handleSetLatestVersion = async (item) => {
    try {
      const res = await apiFetch(`/api/superadmin/app-versions/${item.id}/set-latest`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const json = await res.json();
        notify(json.message || `v${item.version} is now the active latest version!`, 'success');
        fetchVersions();
      } else {
        const errJson = await res.json();
        notify(errJson.error || 'Failed to set latest version.', 'error');
      }
    } catch (err) {
      notify(`Error: ${err.message}`, 'error');
    }
  };

  const handleOpenSetLatest = (targetPlatform = 'windows') => {
    setSetLatestPlatform(targetPlatform);
    const active = targetPlatform === 'windows' ? data.active?.windows : data.active?.mobile;
    const available = data.versions.filter(v => v.platform === targetPlatform);
    setSelectedTargetVersionId(active?.id || (available[0]?.id || ''));
    setSetLatestOpen(true);
  };

  const handleApplySetLatest = async () => {
    if (!selectedTargetVersionId) {
      notify('Please select a target version to activate.', 'warning');
      return;
    }
    const item = data.versions.find(v => v.id === Number(selectedTargetVersionId));
    if (item) {
      await handleSetLatestVersion(item);
      setSetLatestOpen(false);
    }
  };

  const handleDelete = async (item) => {
    confirmDialog({
      title: 'Delete Application Version?',
      message: `Are you sure you want to delete v${item.version} for ${item.platform.toUpperCase()}? If uploaded to local server, the package file will also be permanently deleted.`,
      confirmText: 'Delete Version',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/superadmin/app-versions/${item.id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            notify(`Version v${item.version} deleted.`, 'success');
            fetchVersions();
          } else {
            notify('Failed to delete version.', 'error');
          }
        } catch (err) {
          notify(`Delete error: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleOpenEdit = (item) => {
    setEditItem({ ...item });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
      const res = await apiFetch(`/api/superadmin/app-versions/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editItem.title,
          release_notes: editItem.release_notes,
          update_instructions: editItem.update_instructions,
          min_supported_version: editItem.min_supported_version,
          download_url: editItem.download_url,
          is_mandatory: editItem.is_mandatory,
          is_active: editItem.is_active,
          package_type: editItem.package_type
        })
      });

      if (res.ok) {
        notify('Version updated successfully.', 'success');
        setEditOpen(false);
        fetchVersions();
      } else {
        const errJson = await res.json();
        notify(errJson.error || 'Failed to update version.', 'error');
      }
    } catch (err) {
      notify(`Save error: ${err.message}`, 'error');
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    notify(`${label} copied to clipboard!`, 'info');
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filteredVersions = data.versions.filter(v => {
    if (filterPlatform === 'all') return true;
    return v.platform === filterPlatform;
  });

  const activeWin = data.active.windows;
  const activeMob = data.active.mobile;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tag size={24} color="#F97316" />
            Centralized Application Version Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage, publish, and configure auto-updates for Windows Desktop and Mobile applications independently.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={fetchVersions}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={() => handleOpenCreate('windows')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
          >
            Publish New Version
          </Button>
        </Box>
      </Box>

      {/* Side-by-Side Platform Matrix Cards */}
      <Grid container spacing={2.5}>
        {/* Windows Desktop Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#EFF6FF', borderRadius: 2.5, color: '#2563EB' }}>
                    <Monitor size={28} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Windows Desktop Application
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Electron Native Thermal POS Client
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={activeWin ? `Latest: v${activeWin.version}` : 'No Active Release'}
                  color={activeWin ? 'primary' : 'default'}
                  sx={{ fontWeight: 800, fontSize: '0.85rem' }}
                />
              </Box>

              {activeWin ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Update Status:</Typography>
                    <Chip
                      size="small"
                      label={activeWin.is_active === 1 ? 'Published (Live)' : 'Disabled'}
                      color={activeWin.is_active === 1 ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Update Type:</Typography>
                    <Chip
                      size="small"
                      label={activeWin.is_mandatory === 1 ? 'Mandatory Update' : 'Optional (Recommended)'}
                      color={activeWin.is_mandatory === 1 ? 'error' : 'info'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Min Supported Version:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>v{activeWin.min_supported_version}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Installer Package:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{activeWin.file_name || 'Windows Installer'} ({formatFileSize(activeWin.file_size)})</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">Total Downloads:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>{activeWin.download_count} downloads</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      onClick={() => handleOpenSetLatest('windows')}
                      sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', flex: 1 }}
                    >
                      Set Latest Version
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Upload size={14} />}
                      onClick={() => handleOpenCreate('windows')}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', flex: 1 }}
                    >
                      Publish New
                    </Button>
                    {activeWin.download_url && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        startIcon={<Download size={14} />}
                        onClick={() => window.open(activeWin.download_url, '_blank')}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                      >
                        Download
                      </Button>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No published Windows version available.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={() => handleOpenCreate('windows')}
                  >
                    Publish Windows Version
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Mobile Application Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#ECFDF5', borderRadius: 2.5, color: '#059669' }}>
                    <Smartphone size={28} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      Mobile Application (Android & iOS)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      React Native Handheld POS & Bluetooth Client
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={activeMob ? `Latest: v${activeMob.version}` : 'No Active Release'}
                  color={activeMob ? 'success' : 'default'}
                  sx={{ fontWeight: 800, fontSize: '0.85rem' }}
                />
              </Box>

              {activeMob ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Update Status:</Typography>
                    <Chip
                      size="small"
                      label={activeMob.is_active === 1 ? 'Published (Live)' : 'Disabled'}
                      color={activeMob.is_active === 1 ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Update Type:</Typography>
                    <Chip
                      size="small"
                      label={activeMob.is_mandatory === 1 ? 'Mandatory Update' : 'Optional (Recommended)'}
                      color={activeMob.is_mandatory === 1 ? 'error' : 'info'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Min Supported Version:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>v{activeMob.min_supported_version}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Distribution Package:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {activeMob.package_type === 'store_redirect' ? 'Google Play / App Store' : `${activeMob.file_name || 'APK Package'} (${formatFileSize(activeMob.file_size)})`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">Total Downloads:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>{activeMob.download_count} downloads</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={() => handleOpenSetLatest('mobile')}
                      sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', flex: 1 }}
                    >
                      Set Latest Version
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Upload size={14} />}
                      onClick={() => handleOpenCreate('mobile')}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', flex: 1 }}
                    >
                      Publish New
                    </Button>
                    {activeMob.download_url && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        startIcon={<Download size={14} />}
                        onClick={() => window.open(activeMob.download_url, '_blank')}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                      >
                        Download
                      </Button>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No published Mobile version available.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<Plus size={16} />}
                    onClick={() => handleOpenCreate('mobile')}
                  >
                    Publish Mobile Version
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Comparative Specification Matrix Table */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper', borderColor: 'divider' }}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Current Platform Version Comparison Matrix
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Setting / Parameter</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>🪟 Windows Desktop</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'success.main' }}>📱 Mobile Application</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Current Latest Version</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1rem' }}>{activeWin ? `v${activeWin.version}` : 'None'}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'success.main', fontSize: '1rem' }}>{activeMob ? `v${activeMob.version}` : 'None'}</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>New Version (Latest Release)</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {data.newest?.windows ? `v${data.newest.windows.version}` : (activeWin ? `v${activeWin.version}` : 'None')}
                  {data.newest?.windows && activeWin && data.newest.windows.version !== activeWin.version && (
                    <Chip size="small" label="Newer Draft" color="warning" sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {data.newest?.mobile ? `v${data.newest.mobile.version}` : (activeMob ? `v${activeMob.version}` : 'None')}
                  {data.newest?.mobile && activeMob && data.newest.mobile.version !== activeMob.version && (
                    <Chip size="small" label="Newer Draft" color="warning" sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                  )}
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Update Status</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={activeWin && activeWin.is_active === 1 ? 'Published' : 'Disabled'}
                    color={activeWin && activeWin.is_active === 1 ? 'success' : 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={activeMob && activeMob.is_active === 1 ? 'Published' : 'Disabled'}
                    color={activeMob && activeMob.is_active === 1 ? 'success' : 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Update Type</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={activeWin && activeWin.is_mandatory === 1 ? 'Mandatory' : 'Optional'}
                    color={activeWin && activeWin.is_mandatory === 1 ? 'error' : 'info'}
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={activeMob && activeMob.is_mandatory === 1 ? 'Mandatory' : 'Optional'}
                    color={activeMob && activeMob.is_mandatory === 1 ? 'error' : 'info'}
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Min Supported Version</TableCell>
                <TableCell>{activeWin ? `v${activeWin.min_supported_version}` : '-'}</TableCell>
                <TableCell>{activeMob ? `v${activeMob.min_supported_version}` : '-'}</TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Quick Actions</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" onClick={() => handleOpenSetLatest('windows')} sx={{ textTransform: 'none', fontWeight: 700, py: 0.25, fontSize: '0.75rem' }}>
                      Set Latest Version
                    </Button>
                    <Button size="small" variant="contained" onClick={() => handleOpenCreate('windows')} sx={{ textTransform: 'none', fontWeight: 700, py: 0.25, fontSize: '0.75rem' }}>
                      Publish New
                    </Button>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" color="success" onClick={() => handleOpenSetLatest('mobile')} sx={{ textTransform: 'none', fontWeight: 700, py: 0.25, fontSize: '0.75rem' }}>
                      Set Latest Version
                    </Button>
                    <Button size="small" variant="contained" color="success" onClick={() => handleOpenCreate('mobile')} sx={{ textTransform: 'none', fontWeight: 700, py: 0.25, fontSize: '0.75rem' }}>
                      Publish New
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Platform Isolation Rule</TableCell>
                <TableCell colSpan={2} sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  🔒 Strict Independence: Publishing or altering Windows version <strong>never</strong> modifies Mobile version, and vice-versa.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Release History & Version Management Table */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Release History & Package Repository
            </Typography>
            <Chip label={`${data.versions.length} total releases`} size="small" sx={{ fontWeight: 700 }} />
          </Box>
          <Tabs
            value={filterPlatform}
            onChange={(e, val) => setFilterPlatform(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 2, fontWeight: 700, textTransform: 'none' }
            }}
          >
            <Tab value="all" label="All Releases" />
            <Tab value="windows" icon={<Monitor size={14} />} iconPosition="start" label="Windows Desktop" />
            <Tab value="mobile" icon={<Smartphone size={14} />} iconPosition="start" label="Mobile App" />
          </Tabs>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Platform</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Min Version</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Package / Size</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Release Notes</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Downloads</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Published</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Loading version repository...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredVersions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No release versions found for this filter.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVersions.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={item.platform === 'windows' ? <Monitor size={14} /> : <Smartphone size={14} />}
                        label={item.platform === 'windows' ? 'Windows' : 'Mobile'}
                        color={item.platform === 'windows' ? 'primary' : 'success'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      v{item.version}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Click to toggle publication status">
                        <Chip
                          size="small"
                          label={item.is_active === 1 ? 'Published' : 'Disabled'}
                          color={item.is_active === 1 ? 'success' : 'default'}
                          onClick={() => handleToggleStatus(item)}
                          sx={{ fontWeight: 700, cursor: 'pointer' }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Click to toggle Mandatory vs Optional">
                        <Chip
                          size="small"
                          label={item.is_mandatory === 1 ? 'Mandatory' : 'Optional'}
                          color={item.is_mandatory === 1 ? 'error' : 'info'}
                          onClick={() => handleToggleMandatory(item)}
                          sx={{ fontWeight: 700, cursor: 'pointer' }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      v{item.min_supported_version}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.file_name || (item.package_type === 'store_redirect' ? 'Store Link' : 'Package File')}
                        </Typography>
                        {item.file_size > 0 && (
                          <Chip size="small" label={formatFileSize(item.file_size)} sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                        {item.download_url && (
                          <IconButton
                            size="small"
                            onClick={() => window.open(item.download_url, '_blank')}
                            sx={{ p: 0.5 }}
                          >
                            <Download size={14} />
                          </IconButton>
                        )}
                        {item.checksum_sha256 && (
                          <Tooltip title={`SHA256: ${item.checksum_sha256} (Click to copy)`}>
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(item.checksum_sha256, 'SHA256 Checksum')}
                              sx={{ p: 0.5 }}
                            >
                              <Copy size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.3
                        }}
                      >
                        {item.release_notes || 'No release notes.'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.download_count}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {item.published_at ? new Date(item.published_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                        {item.is_active !== 1 || (item.platform === 'windows' ? activeWin?.id !== item.id : activeMob?.id !== item.id) ? (
                          <Tooltip title="Set as Current Latest Live Version">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleSetLatestVersion(item)}
                            >
                              <CheckCircle size={16} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Chip size="small" label="LATEST" color="success" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, mr: 0.5 }} />
                        )}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Publish New Version Modal */}
      <Dialog
        open={createOpen}
        onClose={() => !uploading && setCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: '#1E293B', backgroundImage: 'none' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Upload size={22} color="#F97316" />
          Publish New Application Release
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {uploading && (
            <Box sx={{ width: '100%', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Uploading & Verifying Update Package... ({uploadProgress}%)
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          )}

          {/* Platform Selection */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
              TARGET APPLICATION PLATFORM
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Box
                  onClick={() => setFormPlatform('windows')}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: '2px solid',
                    borderColor: formPlatform === 'windows' ? 'primary.main' : 'divider',
                    bgcolor: formPlatform === 'windows' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  <Monitor size={24} color={formPlatform === 'windows' ? '#F97316' : '#94A3B8'} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>Windows Desktop</Typography>
                    <Typography variant="caption" color="text.secondary">NSIS .exe Installer</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box
                  onClick={() => setFormPlatform('mobile')}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: '2px solid',
                    borderColor: formPlatform === 'mobile' ? 'success.main' : 'divider',
                    bgcolor: formPlatform === 'mobile' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  <Smartphone size={24} color={formPlatform === 'mobile' ? '#10B981' : '#94A3B8'} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>Mobile Application</Typography>
                    <Typography variant="caption" color="text.secondary">Android APK / App Store</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Version Inputs */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="New Version Number *"
                placeholder="e.g. 1.0.6"
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                helperText="Standard SemVer format (Major.Minor.Patch)"
                disabled={uploading}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Minimum Supported Version"
                placeholder="e.g. 1.0.0"
                value={formMinVersion}
                onChange={(e) => setFormMinVersion(e.target.value)}
                helperText="Clients below this version will be forced to update"
                disabled={uploading}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Release Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            disabled={uploading}
          />

          {/* Release Notes */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Release Notes & Changelog *"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            helperText="Users will see these bullet points in their update popup"
            disabled={uploading}
          />

          {/* Package Source Selection */}
          <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2.5, p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
              Package Distribution Method
            </Typography>
            <Tabs
              value={packageSourceTab}
              onChange={(e, val) => setPackageSourceTab(val)}
              sx={{ minHeight: 36, mb: 2 }}
            >
              <Tab label="Direct File Upload (.exe / .apk)" sx={{ textTransform: 'none', fontWeight: 700 }} />
              <Tab label="External Package or Store URL" sx={{ textTransform: 'none', fontWeight: 700 }} />
            </Tabs>

            {packageSourceTab === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <input
                  type="file"
                  id="package-file-input"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept={formPlatform === 'windows' ? '.exe,.msi,.zip' : '.apk,.aab'}
                  disabled={uploading}
                />
                <label htmlFor="package-file-input">
                  <Box
                    sx={{
                      border: '2px dashed rgba(249, 115, 22, 0.4)',
                      borderRadius: 2.5,
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'rgba(249, 115, 22, 0.04)',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(249, 115, 22, 0.08)' }
                    }}
                  >
                    <Upload size={32} color="#F97316" style={{ margin: '0 auto 8px' }} />
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>
                      {selectedFile ? selectedFile.name : `Click or Drag ${formPlatform === 'windows' ? 'Windows Setup (.exe)' : 'Android APK (.apk)'} here`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedFile ? `Size: ${formatFileSize(selectedFile.size)} • SHA256 integrity hash will be auto-calculated` : 'Up to 350 MB supported'}
                    </Typography>
                  </Box>
                </label>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Download / Store URL *"
                  placeholder={formPlatform === 'windows' ? 'https://.../Ariso_Retail_POS_Setup.exe' : 'https://play.google.com/store/apps/details?id=com.arisoretail.pos'}
                  value={formDownloadUrl}
                  onChange={(e) => setFormDownloadUrl(e.target.value)}
                  disabled={uploading}
                />
                <TextField
                  fullWidth
                  label="SHA-256 Package Checksum (Optional for security)"
                  placeholder="e.g. 34c8357f14bb228e796367b02af3fcfcde1e6bfbfd957ce151311700af62b0f8"
                  value={formChecksum}
                  onChange={(e) => setFormChecksum(e.target.value)}
                  disabled={uploading}
                />
                <Select
                  value={formPackageType}
                  onChange={(e) => setFormPackageType(e.target.value)}
                  size="small"
                  disabled={uploading}
                >
                  <MenuItem value="installer_exe">Windows NSIS Installer (.exe)</MenuItem>
                  <MenuItem value="apk">Android Standalone Package (.apk)</MenuItem>
                  <MenuItem value="store_redirect">Official Store Redirect (Google Play / App Store)</MenuItem>
                  <MenuItem value="zip">Portable Zip Archive</MenuItem>
                </Select>
              </Box>
            )}
          </Box>

          {/* Mandatory & Active Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Mandatory Update Requirement
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  If enabled, users cannot dismiss or skip the update popup and must update before using POS.
                </Typography>
              </Box>
              <Switch
                checked={formIsMandatory}
                onChange={(e) => setFormIsMandatory(e.target.checked)}
                color="error"
                disabled={uploading}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Publish Immediately
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Make this version active and broadcast update notifications to connected apps immediately.
                </Typography>
              </Box>
              <Switch
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                color="success"
                disabled={uploading}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={uploading}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitCreate}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <CheckCircle size={18} />}
            sx={{ fontWeight: 800, textTransform: 'none', px: 3, borderRadius: 2 }}
          >
            {uploading ? 'Uploading...' : 'Publish Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Version Metadata Modal */}
      {editItem && (
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, bgcolor: '#1E293B', backgroundImage: 'none' } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            Edit Release v{editItem.version} ({editItem.platform.toUpperCase()})
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={editItem.title || ''}
              onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Release Notes"
              value={editItem.release_notes || ''}
              onChange={(e) => setEditItem({ ...editItem, release_notes: e.target.value })}
            />
            <TextField
              fullWidth
              label="Minimum Supported Version"
              value={editItem.min_supported_version || ''}
              onChange={(e) => setEditItem({ ...editItem, min_supported_version: e.target.value })}
            />
            <TextField
              fullWidth
              label="Download / Store URL"
              value={editItem.download_url || ''}
              onChange={(e) => setEditItem({ ...editItem, download_url: e.target.value })}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Mandatory Update</Typography>
              <Switch
                checked={editItem.is_mandatory === 1}
                onChange={(e) => setEditItem({ ...editItem, is_mandatory: e.target.checked ? 1 : 0 })}
                color="error"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Published / Active</Typography>
              <Switch
                checked={editItem.is_active === 1}
                onChange={(e) => setEditItem({ ...editItem, is_active: e.target.checked ? 1 : 0 })}
                color="success"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditOpen(false)} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveEdit} sx={{ fontWeight: 800 }}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Set Latest Active Version Quick Modal */}
      <Dialog
        open={setLatestOpen}
        onClose={() => setSetLatestOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, bgcolor: '#1E293B', backgroundImage: 'none' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tag size={20} color="#F97316" />
          Set Latest {setLatestPlatform === 'windows' ? 'Windows Desktop' : 'Mobile Application'} Version
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Designate which version is the current live standard for {setLatestPlatform === 'windows' ? 'Windows POS' : 'Mobile POS'}. Connected terminals will compare against this version and show update notifications.
          </Typography>

          <Select
            fullWidth
            value={selectedTargetVersionId}
            onChange={(e) => setSelectedTargetVersionId(e.target.value)}
            size="small"
          >
            {data.versions
              .filter(v => v.platform === setLatestPlatform)
              .map(v => (
                <MenuItem key={v.id} value={v.id}>
                  v{v.version} — {v.is_mandatory === 1 ? 'Mandatory' : 'Optional'} ({v.is_active === 1 ? 'Published' : 'Disabled'})
                </MenuItem>
              ))
            }
          </Select>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSetLatestOpen(false)} sx={{ fontWeight: 700, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleApplySetLatest} sx={{ fontWeight: 800, textTransform: 'none' }}>
            Set as Latest
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
