import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
  Cameraswitch as CameraSwitchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { CheckCircle2, AlertTriangle, Keyboard, Camera as CameraIcon } from 'lucide-react';
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
  title = 'Barcode Camera Scanner',
  subtitle = 'Point camera at any barcode or serial number to scan'
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState(null); // { type, title, text }
  const [recentScan, setRecentScan] = useState(null); // { code, message, success: boolean }
  const [manualCode, setManualCode] = useState('');
  const manualInputRef = useRef(null);

  const html5QrCodeRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const lastScannedTimeRef = useRef({});
  const containerId = 'ariso-barcode-reader-viewport';

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isScannerRunningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (_) {}
      isScannerRunningRef.current = false;
      setScanning(false);
      setTorchOn(false);
      setHasTorch(false);
    }
  }, []);

  const handleCameraError = useCallback((err) => {
    const errName = err?.name || '';
    const errMsg = err?.message || String(err);
    console.warn('[WebBarcodeScanner] Camera Error:', errName, errMsg);

    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errMsg.toLowerCase().includes('permission denied') ||
      errMsg.toLowerCase().includes('not allowed')
    ) {
      setCameraError({
        type: 'blocked',
        title: 'Camera Access Blocked',
        text: 'Camera permission is blocked in your browser. Please click the lock or camera icon in the browser address bar, set Camera to "Allow", and click "Retry Camera".'
      });
    } else if (
      errName === 'NotFoundError' ||
      errName === 'DevicesNotFoundError' ||
      errMsg.toLowerCase().includes('not found') ||
      errMsg.toLowerCase().includes('no video input') ||
      errMsg.toLowerCase().includes('requested device not found')
    ) {
      setCameraError({
        type: 'not_found',
        title: 'No Camera Device Detected',
        text: 'No camera hardware was detected on this device. You can connect a USB webcam or use the manual entry field below with keyboard or barcode gun.'
      });
    } else if (
      errName === 'NotReadableError' ||
      errName === 'TrackStartError' ||
      errMsg.toLowerCase().includes('in use') ||
      errMsg.toLowerCase().includes('could not start')
    ) {
      setCameraError({
        type: 'in_use',
        title: 'Camera In Use',
        text: 'The camera may be in use by another application (Zoom, Teams, or another tab). Close other camera apps and click "Retry Camera".'
      });
    } else if (errName === 'OverconstrainedError') {
      setCameraError({
        type: 'constraint',
        title: 'Camera Setting Mismatch',
        text: 'The camera lens or resolution requested is unavailable. Click "Retry Camera" to launch with default settings.'
      });
    } else {
      setCameraError({
        type: 'general',
        title: 'Camera Inaccessible',
        text: errMsg || 'Unable to access camera. You can click "Retry Camera" or enter barcodes/serials manually below.'
      });
    }
    setScanning(false);
  }, []);

  const startCameraScanner = useCallback(async (forcedCameraId = null) => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop any existing scanner
    await stopScanner();

    // 1. Check browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError({
        type: 'unsupported',
        title: 'Camera API Not Supported',
        text: 'Your current browser or connection does not support the HTML5 Camera API. Please use Google Chrome, Microsoft Edge, or enter codes manually below.'
      });
      setIsInitializing(false);
      return;
    }

    // 2. Request user permission probe via getUserMedia
    let probeStream = null;
    try {
      probeStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
    } catch (envErr) {
      console.warn('[WebBarcodeScanner] Environment constraint failed, falling back to basic video constraint:', envErr);
      try {
        probeStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (basicErr) {
        console.warn('[WebBarcodeScanner] getUserMedia basic probe failed:', basicErr);
        handleCameraError(basicErr);
        setIsInitializing(false);
        return;
      }
    }

    // Stop probe stream immediately so tracks are free for Html5Qrcode
    if (probeStream) {
      probeStream.getTracks().forEach((track) => {
        try { track.stop(); } catch (_) {}
      });
    }

    // 3. Enumerate camera devices
    let availableDevices = [];
    try {
      availableDevices = await Html5Qrcode.getCameras();
      if (availableDevices && availableDevices.length > 0) {
        setCameras(availableDevices);
      }
    } catch (enumErr) {
      console.warn('[WebBarcodeScanner] getCameras failed:', enumErr);
    }

    // 4. Determine camera target
    let targetCamera = forcedCameraId || selectedCameraId;
    if (!targetCamera && availableDevices.length > 0) {
      const backCam = availableDevices.find((d) =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      targetCamera = backCam ? backCam.id : availableDevices[0].id;
      setSelectedCameraId(targetCamera);
    }
    if (!targetCamera) {
      targetCamera = { facingMode: 'environment' };
    }

    // 5. Initialize Html5Qrcode
    try {
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

      try {
        await scanner.start(
          targetCamera,
          config,
          (decodedText) => handleDecodedBarcode(decodedText),
          () => {}
        );
      } catch (firstStartErr) {
        console.warn('[WebBarcodeScanner] Start failed with targetCamera, trying fallback { facingMode: "user" }...', firstStartErr);
        try {
          await scanner.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleDecodedBarcode(decodedText),
            () => {}
          );
        } catch (secStartErr) {
          console.warn('[WebBarcodeScanner] Second start attempt failed, trying basic video constraints...', secStartErr);
          try {
            await scanner.start(
              {},
              config,
              (decodedText) => handleDecodedBarcode(decodedText),
              () => {}
            );
          } catch (thirdErr) {
            handleCameraError(thirdErr);
            setIsInitializing(false);
            return;
          }
        }
      }

      isScannerRunningRef.current = true;
      setScanning(true);
      setCameraError(null);
      setIsInitializing(false);

      // Check torch capability
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch (_) {}
    } catch (initErr) {
      console.error('[WebBarcodeScanner] Html5Qrcode constructor or start error:', initErr);
      handleCameraError(initErr);
      setIsInitializing(false);
    }
  }, [selectedCameraId, stopScanner, handleCameraError]);

  // Launch camera and setup on dialog open
  useEffect(() => {
    if (open) {
      setCameraError(null);
      setRecentScan(null);
      setManualCode('');
      lastScannedTimeRef.current = {};

      // Auto-focus manual entry field
      const focusTimer = setTimeout(() => {
        if (manualInputRef.current) {
          manualInputRef.current.focus();
        }
      }, 150);

      // Start camera
      const camTimer = setTimeout(() => {
        startCameraScanner();
      }, 200);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(camTimer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [open, startCameraScanner, stopScanner]);

  const handleDecodedBarcode = (rawCode) => {
    if (!rawCode) return;
    const cleanCode = String(rawCode).trim();
    if (!cleanCode) return;

    const now = Date.now();

    // Debounce scan of same barcode (1.5 seconds cooldown per identical code)
    const lastTime = lastScannedTimeRef.current[cleanCode] || 0;
    if (now - lastTime < 1500) {
      return;
    }
    lastScannedTimeRef.current[cleanCode] = now;

    if (onScan) {
      Promise.resolve(onScan(cleanCode))
        .then((result) => {
          if (result && result.success !== undefined) {
            if (result.success) {
              playSuccessSound();
            } else {
              playNotFoundSound();
            }
            setRecentScan({
              code: cleanCode,
              message: result.message || (result.success ? `Added: ${cleanCode}` : `Item Not Found: ${cleanCode}`),
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
          if (!continuous) {
            handleCloseDialog();
          }
        })
        .catch((err) => {
          playNotFoundSound();
          setRecentScan({
            code: cleanCode,
            message: err?.message || `Scan error: ${cleanCode}`,
            success: false
          });
        });
      return;
    }

    if (!continuous) {
      handleCloseDialog();
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
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setSelectedCameraId(nextCamId);
    startCameraScanner(nextCamId);
  };

  const handleCloseDialog = async () => {
    await stopScanner();
    onClose();
  };

  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    handleDecodedBarcode(clean);
    setManualCode('');
    if (manualInputRef.current) {
      manualInputRef.current.focus();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            bgcolor: '#0F172A',
            color: '#F8FAFC',
            border: '1px solid #334155',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraIcon size={20} color="#38BDF8" /> {title}
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
        {/* Actionable Error Alert Banner */}
        {cameraError && (
          <Box
            sx={{
              width: '100%',
              maxWidth: 400,
              mb: 2,
              p: 1.75,
              borderRadius: 2.5,
              bgcolor: cameraError.type === 'blocked' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${cameraError.type === 'blocked' ? '#EF4444' : '#F59E0B'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertTriangle size={18} color={cameraError.type === 'blocked' ? '#EF4444' : '#F59E0B'} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: cameraError.type === 'blocked' ? '#FCA5A5' : '#FCD34D' }}>
                  {cameraError.title}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => startCameraScanner()}
                startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                sx={{
                  color: '#38BDF8',
                  borderColor: '#38BDF8',
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  px: 1.25,
                  py: 0.25,
                  '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.12)', borderColor: '#38BDF8' }
                }}
              >
                Retry Camera
              </Button>
            </Box>
            <Typography variant="body2" sx={{ color: '#E2E8F0', fontSize: '0.78rem', lineHeight: 1.45 }}>
              {cameraError.text}
            </Typography>
          </Box>
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
            border: scanning ? '2px solid #10B981' : cameraError ? '2px solid #64748B' : '2px solid #38BDF8',
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div id={containerId} style={{ width: '100%' }} />

          {/* Loader or Camera Status Placeholder */}
          {!scanning && (
            <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, p: 2, textAlign: 'center' }}>
              {isInitializing ? (
                <>
                  <CircularProgress size={36} sx={{ color: '#38BDF8' }} />
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>Requesting camera access...</Typography>
                </>
              ) : (
                <>
                  <CameraSwitchIcon sx={{ fontSize: 42, color: '#475569' }} />
                  <Typography variant="caption" sx={{ color: '#94A3B8', maxWidth: 280, lineHeight: 1.4 }}>
                    Camera feed paused or unavailable. You can use the manual input field below to type or scan with a barcode gun.
                  </Typography>
                </>
              )}
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
              maxWidth: 380,
              borderRadius: 2,
              bgcolor: recentScan.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${recentScan.success ? '#10B981' : '#EF4444'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {recentScan.success ? (
                  <CheckCircle2 size={22} color="#10B981" />
                ) : (
                  <AlertTriangle size={22} color="#EF4444" />
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: recentScan.success ? '#34D399' : '#FCA5A5' }}>
                  {recentScan.message}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Code: {recentScan.code}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Manual Serial Number & Barcode Entry Option */}
        <Box
          component="form"
          onSubmit={handleManualSubmit}
          sx={{
            width: '100%',
            maxWidth: 380,
            mt: 2,
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: '#1E293B',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.72rem' }}>
              <Keyboard size={14} color="#38BDF8" /> Enter Serial Number / Barcode Manually
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.68rem', fontWeight: 600 }}>
              Press Enter ↵
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <input
              ref={manualInputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 8-digit Serial (11905666) or Barcode..."
              autoComplete="off"
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                border: '1px solid #475569',
                color: '#F8FAFC',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#38BDF8'}
              onBlur={(e) => e.target.style.borderColor = '#475569'}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!manualCode.trim()}
              sx={{
                bgcolor: '#0284C7',
                '&:hover': { bgcolor: '#0369A1' },
                '&.Mui-disabled': { bgcolor: '#334155', color: '#64748B' },
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                textTransform: 'none',
                px: 2,
                borderRadius: 2,
                whiteSpace: 'nowrap'
              }}
            >
              Add Item
            </Button>
          </Box>
        </Box>

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
