import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Alert, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function ChangePasswordModal({ open, onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: { new_password: newPassword }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      // Update local storage user state
      const savedUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
      savedUser.must_change_password = false;
      localStorage.setItem('pos_user', JSON.stringify(savedUser));

      if (onPasswordChanged) {
        onPasswordChanged(savedUser);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
        <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '16px', bgcolor: 'primary.light', color: 'primary.main', mb: 1 }}>
          <ShieldCheck size={32} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Security Action Required
        </Typography>
        <Typography variant="caption" color="text.secondary">
          First Login: Please set a new secure password for your restaurant owner account.
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="New Secure Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
              placeholder="Min 6 characters"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            <TextField
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              placeholder="Re-enter password"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
            sx={{
              py: 1.2,
              borderRadius: 2.5,
              fontWeight: 800,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Password & Continue'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
