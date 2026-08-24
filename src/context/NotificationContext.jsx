import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ShieldAlert, ThumbsUp } from 'lucide-react';
import { Box, Typography, Button, IconButton, Paper, Portal, useMediaQuery } from '@mui/material';

const NotificationContext = createContext(null);

export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotify must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const isMobile = useMediaQuery('(max-width:600px)');

  // Helper to add toast
  const addToast = (type, message, title = '', duration = undefined) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const resolvedDuration = duration !== undefined ? duration : (type === 'success' ? 2000 : 4500);
    setToasts(prev => [
      { id, type, message, title, createdAt: Date.now(), duration: resolvedDuration },
      ...prev
    ]);
  };

  const notify = {
    success: (message, title, duration) => addToast('success', message, title, duration),
    error: (message, title, duration) => addToast('error', message, title, duration),
    warning: (message, title, duration) => addToast('warning', message, title, duration),
    info: (message, title, duration) => addToast('info', message, title, duration)
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Helper for confirm dialogs replacing window.confirm
  const confirmDialog = ({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = true, onConfirm }) => {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        confirmText,
        cancelText,
        isDestructive,
        onConfirm: async () => {
          setConfirmState(null);
          if (onConfirm) await onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        }
      });
    });
  };

  // Handle ESC key for confirm dialog
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && confirmState) {
        confirmState.onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState]);

  return (
    <NotificationContext.Provider value={{ notify, confirmDialog }}>
      {children}

      {/* PORTAL FOR TOAST NOTIFICATIONS */}
      <Portal>
        <Box
          sx={{
            position: 'fixed',
            top: isMobile ? '1rem' : '1.5rem',
            right: isMobile ? '50%' : '1.5rem',
            transform: isMobile ? 'translateX(50%)' : 'none',
            width: isMobile ? 'calc(100% - 2rem)' : 'auto',
            maxWidth: 'min(400px, calc(100vw - 2rem))',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.2,
            pointerEvents: 'none'
          }}
        >
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </Box>
      </Portal>

      {/* PORTAL FOR CUSTOM CONFIRMATION MODAL */}
      {confirmState && (
        <Portal>
          <Box
            onClick={confirmState.onCancel}
            sx={{
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <Paper
              onClick={e => e.stopPropagation()}
              variant="outlined"
              sx={{
                width: '100%',
                maxWidth: 420,
                borderRadius: 4,
                p: 3,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                '@keyframes scaleIn': {
                  '0%': { transform: 'scale(0.95)', opacity: 0 },
                  '100%': { transform: 'scale(1)', opacity: 1 }
                }
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: confirmState.isDestructive ? '#fef2f2' : '#eff6ff',
                    color: confirmState.isDestructive ? '#ef4444' : '#3b82f6',
                    flexShrink: 0
                  }}
                >
                  <ShieldAlert size={28} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                    {confirmState.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                    {confirmState.message}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Button
                  variant="outlined"
                  onClick={confirmState.onCancel}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2.5 }}
                >
                  {confirmState.cancelText}
                </Button>
                <Button
                  variant="contained"
                  color={confirmState.isDestructive ? 'error' : 'primary'}
                  onClick={confirmState.onConfirm}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2.5, boxShadow: 'none' }}
                >
                  {confirmState.confirmText}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Portal>
      )}
    </NotificationContext.Provider>
  );
}

// INDIVIDUAL TOAST NOTIFICATION ITEM COMPONENT
function ToastItem({ toast, onClose }) {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(toast.duration);
  const timerRef = useRef(null);

  const getVariantStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          borderColor: '#22c55e',
          iconBg: '#dcfce7',
          iconColor: '#16a34a',
          IconComponent: ThumbsUp,
          defaultTitle: 'Success'
        };
      case 'error':
        return {
          borderColor: '#ef4444',
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          IconComponent: AlertCircle,
          defaultTitle: 'Error'
        };
      case 'warning':
        return {
          borderColor: '#f59e0b',
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          IconComponent: AlertTriangle,
          defaultTitle: 'Warning'
        };
      default:
        return {
          borderColor: '#3b82f6',
          iconBg: '#dbeafe',
          iconColor: '#2563eb',
          IconComponent: Info,
          defaultTitle: 'Notice'
        };
    }
  };

  const styles = getVariantStyles();
  const Icon = styles.IconComponent;

  useEffect(() => {
    if (progress <= 0) {
      onClose();
    }
  }, [progress, onClose]);

  useEffect(() => {
    if (isHovered || progress <= 0) return;

    const interval = 50;
    const step = (interval / toast.duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [isHovered, toast.duration, progress]);

  return (
    <Paper
      elevation={6}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 'min(300px, calc(100vw - 3rem))',
        bgcolor: '#ffffff',
        borderRadius: '14px',
        borderLeft: `5px solid ${styles.borderColor}`,
        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
        p: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes slideIn': {
          '0%': { transform: 'translateY(-20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        }
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: styles.iconBg,
          color: styles.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Icon size={20} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
          {toast.title || styles.defaultTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontSize: '13px', lineHeight: 1.4, mt: 0.2 }}>
          {toast.message}
        </Typography>
      </Box>

      <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8', p: 0.5 }}>
        <X size={16} />
      </IconButton>

      {/* Countdown progress bar at bottom edge */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          width: `${progress}%`,
          bgcolor: styles.borderColor,
          transition: 'width 0.05s linear'
        }}
      />
    </Paper>
  );
}
