import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  Box, Button, LinearProgress, Chip, Alert, IconButton
} from '@mui/material';
import { Rocket, Download, RefreshCw, CheckCircle2, ShieldAlert, X, AlertTriangle } from 'lucide-react';

export default function AppUpdateModal({ open, updateInfo, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // { percent, receivedBytes, totalBytes }
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.onUpdateProgress) {
      window.electronAPI.onUpdateProgress((progress) => {
        setDownloadProgress(progress);
      });
    }
  }, []);

  if (!updateInfo) return null;

  const isDesktop = Boolean(window.electronAPI?.isDesktop);
  const isMandatory = Boolean(updateInfo.is_mandatory);

  const handleUpdateNow = async () => {
    setError('');

    // If native Electron Desktop app
    if (isDesktop && window.electronAPI?.downloadAppUpdate) {
      setDownloading(true);
      setDownloadProgress({ percent: 5, receivedBytes: 0, totalBytes: updateInfo.file_size || 0 });

      try {
        const result = await window.electronAPI.downloadAppUpdate(updateInfo);
        if (result && result.success) {
          setDownloading(false);
          setReadyToInstall(true);
        } else {
          setDownloading(false);
          setError(result?.error || 'Failed to download application update.');
        }
      } catch (err) {
        setDownloading(false);
        setError(err.message || 'Error occurred while downloading update package.');
      }
    } else {
      // Browser or web mode: direct download / open URL
      const targetUrl = updateInfo.direct_api_url || updateInfo.download_url;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      }
    }
  };

  const handleInstallAndRestart = async () => {
    setInstalling(true);
    try {
      if (window.electronAPI?.installAppUpdate) {
        await window.electronAPI.installAppUpdate();
      }
    } catch (err) {
      setInstalling(false);
      setError(`Installation failed: ${err.message}`);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog
      open={open}
      onClose={isMandatory ? undefined : onClose}
      disableEscapeKeyDown={isMandatory}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#0F172A',
          backgroundImage: 'none',
          border: '1px solid',
          borderColor: isMandatory ? 'error.main' : 'rgba(255, 255, 255, 0.12)',
          boxShadow: isMandatory ? '0 10px 40px rgba(239, 68, 68, 0.3)' : '0 10px 40px rgba(0, 0, 0, 0.6)'
        }
      }}
    >
      {/* Title Bar */}
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1.2, bgcolor: isMandatory ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)', borderRadius: 2, color: isMandatory ? '#EF4444' : '#F97316' }}>
            <Rocket size={24} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
              New Update Available!
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              A new version of Ariso Retail POS is available.
            </Typography>
          </Box>
        </Box>
        {!isMandatory && !downloading && !readyToInstall && (
          <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8' }}>
            <X size={18} />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Version comparison and tags */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(30, 41, 59, 0.6)', p: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
              Installed: <strong style={{ color: '#CBD5E1' }}>v{updateInfo.current_version || '1.0.0'}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#F97316', fontWeight: 800 }}>➔</Typography>
            <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 800 }}>
              Latest: <strong style={{ color: '#34D399', fontSize: '1.05rem' }}>v{updateInfo.latest_version}</strong>
            </Typography>
          </Box>
          <Chip
            size="small"
            label={isMandatory ? 'Mandatory Update' : 'Recommended'}
            color={isMandatory ? 'error' : 'primary'}
            sx={{ fontWeight: 800 }}
          />
        </Box>

        {/* Mandatory Warning Banner */}
        {isMandatory && (
          <Alert severity="error" icon={<AlertTriangle size={20} />} sx={{ borderRadius: 2, fontWeight: 600 }}>
            This is a required update. You must update Ariso Retail POS before continuing sales operations.
          </Alert>
        )}

        {/* Release Notes */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#CBD5E1', mb: 1 }}>
            Release Notes:
          </Typography>
          <Box sx={{ bgcolor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 2, maxHeight: 180, overflowY: 'auto' }}>
            {updateInfo.release_notes ? (
              updateInfo.release_notes.split('\n').map((line, idx) => (
                <Typography key={idx} variant="body2" sx={{ color: '#E2E8F0', mb: 0.5, lineHeight: 1.5 }}>
                  {line}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                • General stability and speed improvements.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Progress or Download Status */}
        {downloading && downloadProgress && (
          <Box sx={{ bgcolor: 'rgba(30, 41, 59, 0.8)', p: 2, borderRadius: 2, border: '1px solid rgba(249, 115, 22, 0.3)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                Downloading Update Package...
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#F97316' }}>
                {downloadProgress.percent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={downloadProgress.percent}
              sx={{ height: 8, borderRadius: 4, mb: 1, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#F97316' } }}
            />
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {formatBytes(downloadProgress.receivedBytes)} of {formatBytes(downloadProgress.totalBytes)}
            </Typography>
          </Box>
        )}

        {readyToInstall && (
          <Alert severity="success" icon={<CheckCircle2 size={20} />} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Update successfully downloaded and verified (SHA-256 integrity confirmed). Click below to install and restart!
          </Alert>
        )}

        {installing && (
          <Alert severity="info" icon={<RefreshCw size={20} className="animate-spin" />} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Installing update and restarting Ariso Retail POS. Your local database, login session, and settings are safely preserved.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2, fontWeight: 600 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: 'rgba(30, 41, 59, 0.4)', borderTop: '1px solid rgba(255,255,255,0.06)', gap: 1 }}>
        {!isMandatory && !downloading && !readyToInstall && (
          <Button
            onClick={onClose}
            sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'none' }}
          >
            Later
          </Button>
        )}

        {!readyToInstall ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateNow}
            disabled={downloading || installing}
            startIcon={downloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
            sx={{ fontWeight: 800, textTransform: 'none', px: 3, borderRadius: 2 }}
          >
            {downloading ? `Downloading (${downloadProgress?.percent || 0}%)...` : 'Update Now'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleInstallAndRestart}
            disabled={installing}
            startIcon={<RefreshCw size={18} />}
            sx={{ fontWeight: 800, textTransform: 'none', px: 3, borderRadius: 2 }}
          >
            {installing ? 'Restarting...' : 'Restart & Install'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
