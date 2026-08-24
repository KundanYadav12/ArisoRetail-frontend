import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Switch, FormControlLabel,
  Alert, CircularProgress, Chip, Select, MenuItem, InputAdornment, IconButton
} from '@mui/material';
import { Sparkles, Key, CheckCircle, AlertCircle, Save, Eye, EyeOff, Send, Cpu, Trash2 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function SuperAdminAiConfigManager({ token }) {
  const { notify } = useNotify();

  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [isEnabled, setIsEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchAiConfig();
  }, []);

  const fetchAiConfig = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/superadmin/ai-config');
      if (res.ok) {
        const data = await res.json();
        setMaskedKey(data.masked_key || '');
        setHasKey(data.has_key);
        setModelName(data.model_name || 'gemini-2.5-flash');
        setIsEnabled(data.is_enabled);
      }
    } catch (err) {
      console.error('[Fetch AI Config Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const keyToTest = apiKey.trim() || maskedKey;
      const res = await apiFetch('/api/superadmin/ai-config/test', {
        method: 'POST',
        body: { api_key: keyToTest }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection test failed.');

      setTestResult({ success: true, message: data.message });
      notify.success(data.message, 'Gemini 2.5 Flash Connected');
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      notify.error(err.message, 'Connection Error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        model_name: modelName,
        is_enabled: isEnabled
      };

      // Only send API key if updated
      if (apiKey.trim() !== '' && !apiKey.includes('••••')) {
        payload.api_key = apiKey.trim();
      }

      const res = await apiFetch('/api/superadmin/ai-config', {
        method: 'PUT',
        body: payload
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update AI configuration.');

      setMaskedKey(data.config.masked_key || '');
      setHasKey(data.config.has_key);
      setApiKey('');
      setShowKey(false);
      notify.success('Google AI Studio Gemini configuration saved successfully!', 'Settings Saved');
    } catch (err) {
      notify.error(err.message, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!hasKey) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/superadmin/ai-config', {
        method: 'PUT',
        body: {
          api_key: '',
          model_name: modelName,
          is_enabled: isEnabled
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove API key.');

      setMaskedKey('');
      setHasKey(false);
      setApiKey('');
      setTestResult(null);
      notify.success('Google Gemini API Key removed successfully from database.', 'Key Erased');
    } catch (err) {
      notify.error(err.message, 'Remove Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top Banner */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', borderLeft: '6px solid #8b5cf6' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Cpu size={24} style={{ color: '#8b5cf6' }} /> Google AI Studio Gemini Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Configure <strong>Google AI Studio Gemini 2.5 Flash</strong> API credentials for automated AI Menu Image & PDF parsing.
            </Typography>
          </Box>
          <Chip
            icon={isEnabled ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            label={isEnabled ? 'AI Service Enabled' : 'AI Service Disabled'}
            color={isEnabled ? 'success' : 'default'}
            sx={{ fontWeight: 800, px: 1 }}
          />
        </Box>
      </Paper>

      {/* Main Settings Form */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Key size={18} style={{ color: '#8b5cf6' }} /> Gemini API Key Credentials
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
            GOOGLE AI STUDIO GEMINI API KEY
          </Typography>
          <TextField
            fullWidth
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={maskedKey ? `Configured (${maskedKey}) - Enter new key to replace` : 'Paste Google AI Studio API Key (AIzaSy...)'}
            helperText="Stored securely in database. Never exposed to public or tenant frontend."
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowKey(!showKey)} edge="end">
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
              AI MODEL SELECTION
            </Typography>
            <Select fullWidth size="small" value={modelName} onChange={(e) => setModelName(e.target.value)}>
              <MenuItem value="gemini-flash-latest">Gemini Flash Latest (Recommended - Auto-Updating Free Tier)</MenuItem>
              <MenuItem value="gemini-flash-lite-latest">Gemini Flash Lite Latest (Ultra Fast & Compact)</MenuItem>
              <MenuItem value="gemini-pro-latest">Gemini Pro Latest (High Accuracy)</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', pt: 2.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Enable AI Menu Import Service</Typography>}
            />
          </Box>
        </Box>

        {testResult && (
          <Alert severity={testResult.success ? 'success' : 'error'} icon={testResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />} sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{testResult.message}</Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="secondary"
              disabled={testing || saving}
              onClick={handleTestConnection}
              startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              {testing ? 'Testing Gemini API Connection...' : '⚡ Test API Connection'}
            </Button>

            {hasKey && (
              <Button
                variant="outlined"
                color="error"
                disabled={saving || testing}
                onClick={handleRemoveKey}
                startIcon={<Trash2 size={16} />}
                sx={{ fontWeight: 800, textTransform: 'none' }}
              >
                Remove API Key
              </Button>
            )}
          </Box>

          <Button
            variant="contained"
            disabled={saving || testing}
            onClick={handleSaveConfig}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
            sx={{ fontWeight: 800, textTransform: 'none', px: 3 }}
          >
            {saving ? 'Saving Settings...' : 'Save AI Configuration'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
