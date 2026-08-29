import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  CircularProgress,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { Close as CloseIcon, FlashOn as FlashOnIcon, FlashOff as FlashOffIcon, Cameraswitch as CameraSwitchIcon } from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Audio feedback synthesizers using Web Audio API
const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Quick high chirp
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
};

const playNotFoundSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // Low warning buzz
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
};

export default function WebBarcodeScannerModal({
  open,
  onClose,
  onScan,
  continuous = true,
  title = '📷 Barcode Camera Scanner',
  subtitle = 'Point camera at any barcode to scan'
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentScan, setRecentScan] = useState(null); // { code, message, success: boolean }

  const html5QrCodeRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const lastScannedTimeRef = useRef({});
  const containerId = 'ariso-barcode-reader-viewport';

  // Get cameras list
  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setRecentScan(null);
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            setCameras(devices);
            // Default to back camera (environment) if available
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') || 
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[devices.length - 1].id);
          } else {
            setErrorMsg('No camera found on this device.');
          }
        })
        .catch((err) => {
          setErrorMsg('Camera permission denied or camera not accessible.');
        });
    }
  }, [open]);

  // Start scanner when camera is selected
  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (!open || !selectedCameraId) return;

      try {
        // Stop any running instance
        if (html5QrCodeRef.current && isScannerRunningRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            isScannerRunningRef.current = false;
          } catch (_) {}
        }

        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF
          ],
          verbose: false
        });
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 20,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333333
        };

        await scanner.start(
          selectedCameraId,
          config,
          (decodedText) => {
            if (!mounted) return;
            handleDecodedBarcode(decodedText);
          },
          () => {
            // Scanner frame scan ignore
          }
        );

        if (mounted) {
          isScannerRunningRef.current = true;
          setScanning(true);
          setErrorMsg('');

          // Check torch capability
          try {
            const capabilities = scanner.getRunningTrackCapabilities();
            if (capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          } catch (_) {}
        }
      } catch (err) {
        if (mounted) {
          console.error('[WebBarcodeScanner] Start failed:', err);
          setErrorMsg(err?.message || 'Could not start camera scanner. Check camera permissions.');
          setScanning(false);
        }
      }
    };

    if (open && selectedCameraId) {
      // Short delay to ensure DOM element is rendered
      const timer = setTimeout(startScanner, 150);
      return () => {
        mounted = false;
        clearTimeout(timer);
        stopScanner();
      };
    }

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [open, selectedCameraId]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScannerRunningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (_) {}
      isScannerRunningRef.current = false;
      setScanning(false);
    }
  };

  const handleDecodedBarcode = (rawCode) => {
    if (!rawCode) return;
    const cleanCode = rawCode.trim();
    const now = Date.now();

    // Debounce scan of same barcode (1.5 seconds cooldown per identical code)
    const lastTime = lastScannedTimeRef.current[cleanCode] || 0;
    if (now - lastTime < 1500) {
      return;
    }
    lastScannedTimeRef.current[cleanCode] = now;

    if (onScan) {
      const result = onScan(cleanCode);
      // Result can return { success: true/false, message: string }
      if (result && result.success !== undefined) {
        if (result.success) {
          playSuccessSound();
        } else {
          playNotFoundSound();
        }
        setRecentScan({
          code: cleanCode,
          message: result.message || (result.success ? `Scanned: ${cleanCode}` : `Item Not Found: ${cleanCode}`),
          success: result.success
        });
      } else {
        playSuccessSound();
        setRecentScan({
          code: cleanCode,
          message: `Scanned: ${cleanCode}`,
          success: true
        });
      }
    }

    if (!continuous) {
      onClose();
    }
  };

  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScannerRunningRef.current) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (_) {}
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  const handleCloseDialog = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: '#0F172A',
          color: '#F8FAFC',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            {subtitle} {continuous ? '• Continuous Mode Active' : ''}
          </Typography>
        </Box>
        <IconButton onClick={handleCloseDialog} sx={{ color: '#94A3B8', '&:hover': { color: '#F8FAFC', bgcolor: '#1E293B' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#0F172A' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ width: '100%', mb: 2, bgcolor: '#450a0a', color: '#fca5a5' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Viewport Container */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 380,
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: '#000000',
            position: 'relative',
            border: '2px solid #38BDF8',
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div id={containerId} style={{ width: '100%' }} />

          {!scanning && !errorMsg && (
            <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={36} sx={{ color: '#38BDF8' }} />
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>Starting camera...</Typography>
            </Box>
          )}

          {/* Target Overlay Laser Effect */}
          {scanning && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: '78%',
                  height: '55%',
                  border: '2px dashed #38BDF8',
                  borderRadius: 2,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                  position: 'relative'
                }}
              >
                {/* Center red laser bar */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: 2,
                    bgcolor: '#EF4444',
                    boxShadow: '0 0 8px #EF4444'
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Status / Last Scanned Toast Banner */}
        {recentScan && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              width: '100%',
              borderRadius: 2,
              bgcolor: recentScan.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${recentScan.success ? '#10B981' : '#EF4444'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 20 }}>{recentScan.success ? '✅' : '⚠️'}</Typography>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: recentScan.success ? '#34D399' : '#FCA5A5' }}>
                  {recentScan.message}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Barcode: {recentScan.code}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Controls Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2, width: '100%' }}>
          {cameras.length > 1 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CameraSwitchIcon />}
              onClick={handleSwitchCamera}
              sx={{ color: '#F8FAFC', borderColor: '#334155', textTransform: 'none' }}
            >
              Switch Cam
            </Button>
          )}

          {hasTorch && (
            <Button
              variant="outlined"
              size="small"
              startIcon={torchOn ? <FlashOffIcon /> : <FlashOnIcon />}
              onClick={handleToggleTorch}
              sx={{ color: torchOn ? '#FBBF24' : '#F8FAFC', borderColor: '#334155', textTransform: 'none' }}
            >
              {torchOn ? 'Flash Off' : 'Flash On'}
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseDialog}
            sx={{ fontWeight: 800, px: 3, textTransform: 'none', borderRadius: 2 }}
          >
            Done Scanning
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
