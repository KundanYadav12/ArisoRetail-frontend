import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Button, Card, CardContent, Chip,
  TextField, Alert, CircularProgress, Tooltip, Divider
} from '@mui/material';
import { Palette, Check, RotateCcw, Save, Sparkles, Eye, ShieldAlert } from 'lucide-react';
import { PRESET_THEMES, DEFAULT_THEME_COLORS, applyThemeToCssVariables } from '../utils/themePresets';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function SuperAdminThemeManager({ token, onThemeUpdated }) {
  const { notify, confirmDialog } = useNotify();

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_THEME_COLORS.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_THEME_COLORS.secondary_color);
  const [dangerColor, setDangerColor] = useState(DEFAULT_THEME_COLORS.danger_color);
  const [infoColor, setInfoColor] = useState(DEFAULT_THEME_COLORS.info_color);
  const [presetName, setPresetName] = useState(DEFAULT_THEME_COLORS.preset_name);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchActiveTheme();
  }, []);

  const fetchActiveTheme = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/theme/config');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.primary_color) {
        setPrimaryColor(data.primary_color);
        setSecondaryColor(data.secondary_color || DEFAULT_THEME_COLORS.secondary_color);
        setDangerColor(data.danger_color || DEFAULT_THEME_COLORS.danger_color);
        setInfoColor(data.info_color || DEFAULT_THEME_COLORS.info_color);
        setPresetName(data.preset_name || 'Custom');
        applyThemeToCssVariables(data.primary_color, data.secondary_color);
      }
    } catch (err) {
      console.error('[Fetch Active Theme Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setDangerColor(preset.danger);
    setInfoColor(preset.info);
    setPresetName(preset.name);
    applyThemeToCssVariables(preset.primary, preset.secondary);
  };

  const handleCustomPrimaryChange = (val) => {
    setPrimaryColor(val);
    setPresetName('Custom');
    applyThemeToCssVariables(val, secondaryColor);
  };

  const handleCustomSecondaryChange = (val) => {
    setSecondaryColor(val);
    setPresetName('Custom');
    applyThemeToCssVariables(primaryColor, val);
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/superadmin/theme', {
        method: 'PUT',
        body: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          danger_color: dangerColor,
          info_color: infoColor,
          preset_name: presetName
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save theme settings.');

      applyThemeToCssVariables(primaryColor, secondaryColor);
      window.dispatchEvent(new CustomEvent('theme_changed', { detail: data.theme }));
      if (onThemeUpdated) onThemeUpdated(data.theme);

      notify.success('Global theme branding colors updated successfully!', 'Theme Saved');
    } catch (err) {
      notify.error(err.message || 'Failed to save theme settings.', 'Theme Error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetTheme = async () => {
    const confirmed = await confirmDialog({
      title: 'Reset Theme to Default?',
      message: 'Are you sure you want to reset the primary brand color back to Orange (#f97316) & Emerald Green (#10b981)?',
      confirmText: 'Reset to Default',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await apiFetch('/api/superadmin/theme/reset', {
        method: 'POST'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset theme settings.');

      setPrimaryColor(DEFAULT_THEME_COLORS.primary_color);
      setSecondaryColor(DEFAULT_THEME_COLORS.secondary_color);
      setDangerColor(DEFAULT_THEME_COLORS.danger_color);
      setInfoColor(DEFAULT_THEME_COLORS.info_color);
      setPresetName(DEFAULT_THEME_COLORS.preset_name);

      applyThemeToCssVariables(DEFAULT_THEME_COLORS.primary_color, DEFAULT_THEME_COLORS.secondary_color);
      window.dispatchEvent(new CustomEvent('theme_changed', { detail: data.theme }));
      if (onThemeUpdated) onThemeUpdated(data.theme);

      notify.success('Theme reset to default Orange branding!', 'Theme Reset');
    } catch (err) {
      notify.error(err.message || 'Failed to reset theme.', 'Reset Error');
    } finally {
      setResetting(false);
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
      {/* Header Banner */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', borderLeft: '6px solid', borderColor: primaryColor }}>
        <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Palette size={24} style={{ color: primaryColor }} /> Dynamic Theme & Branding Color Manager
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Super Admin feature to customize the application's <strong>Primary Brand Theme Color</strong> and <strong>Secondary & Action Accent Colors</strong> in real-time across all user dashboards without changing source code.
        </Typography>
      </Paper>

      {/* Preset Swatches (12 Modern Themes) */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sparkles size={18} style={{ color: primaryColor }} /> Preset Theme Palette (12 Modern Colors)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
          Click any preset color to immediately preview the brand palette across buttons, badges, tabs, and headers.
        </Typography>

        <Grid container spacing={2}>
          {PRESET_THEMES.map((preset) => {
            const isSelected = primaryColor.toLowerCase() === preset.primary.toLowerCase() && presetName === preset.name;
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={preset.name}>
                <Card
                  variant="outlined"
                  onClick={() => handleSelectPreset(preset)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? primaryColor : 'divider',
                    boxShadow: isSelected ? `0 0 12px ${primaryColor}40` : 'none',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                        {preset.name}
                      </Typography>
                      {isSelected && <Check size={16} style={{ color: primaryColor }} />}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                      <Tooltip title={`Primary: ${preset.primary}`}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: preset.primary, border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                      </Tooltip>
                      <Tooltip title={`Secondary: ${preset.secondary}`}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: preset.secondary, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Custom Color Pickers & Live Preview */}
      <Grid container spacing={3}>
        {/* Color Pickers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              🎨 Custom Color Picker
            </Typography>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                PRIMARY BRAND THEME COLOR
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleCustomPrimaryChange(e.target.value)}
                  style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                />
                <TextField
                  size="small"
                  value={primaryColor}
                  onChange={(e) => handleCustomPrimaryChange(e.target.value)}
                  placeholder="#f97316"
                  sx={{ width: 140 }}
                  slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontWeight: 700 } } }}
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                SECONDARY & ACTION ACCENT COLOR (Success / Active)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => handleCustomSecondaryChange(e.target.value)}
                  style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                />
                <TextField
                  size="small"
                  value={secondaryColor}
                  onChange={(e) => handleCustomSecondaryChange(e.target.value)}
                  placeholder="#10b981"
                  sx={{ width: 140 }}
                  slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontWeight: 700 } } }}
                />
              </Box>
            </Box>

            <Alert severity="info" sx={{ borderRadius: 2, mt: 'auto' }}>
              Selected Preset: <strong>{presetName}</strong>
            </Alert>
          </Paper>
        </Grid>

        {/* Live Interactive Preview Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Eye size={18} /> Live UI Preview
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Real-time demonstration of how buttons, badges, and headers render with your chosen colors.
            </Typography>

            <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: primaryColor, color: '#fff', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Restaurant POS Header</Typography>
                <Chip label="ONLINE" size="small" sx={{ bgcolor: secondaryColor, color: '#fff', fontWeight: 800, height: 22 }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Button variant="contained" sx={{ bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor }, textTransform: 'none', fontWeight: 800 }}>
                  Primary Action
                </Button>
                <Button variant="contained" sx={{ bgcolor: secondaryColor, '&:hover': { bgcolor: secondaryColor }, textTransform: 'none', fontWeight: 800 }}>
                  Checkout (Secondary)
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label="Active Theme" sx={{ bgcolor: `${primaryColor}20`, color: primaryColor, fontWeight: 800 }} />
                <Chip label="Secondary Tag" sx={{ bgcolor: `${secondaryColor}20`, color: secondaryColor, fontWeight: 800 }} />
              </Box>
            </Card>
          </Paper>
        </Grid>
      </Grid>

      {/* Action Buttons Footer */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
        <Button
          variant="outlined"
          color="error"
          disabled={resetting || saving}
          onClick={handleResetTheme}
          startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : <RotateCcw size={16} />}
          sx={{ fontWeight: 800, textTransform: 'none' }}
        >
          Reset to Default Theme
        </Button>

        <Button
          variant="contained"
          disabled={saving || resetting}
          onClick={handleSaveTheme}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
          sx={{ bgcolor: primaryColor, '&:hover': { bgcolor: primaryColor }, fontWeight: 800, textTransform: 'none', px: 3, py: 1 }}
        >
          {saving ? 'Saving Theme...' : 'Save & Apply Theme Globally'}
        </Button>
      </Paper>
    </Box>
  );
}
