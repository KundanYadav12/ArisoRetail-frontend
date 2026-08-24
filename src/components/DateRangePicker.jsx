import React from 'react';
import { Box, Paper, Grid, Typography, Button, TextField } from '@mui/material';

/**
 * Standardized DateRangePicker Component
 * Renders date preset pills and expandable From/To date inputs.
 * Uses explicit block-level labels ABOVE type="date" inputs to prevent
 * floating label collisions with native browser date placeholders (dd-mm-yyyy).
 */
export const DateRangePicker = ({
  preset,
  onPresetChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  showAllTimeOption = false,
  customPresets = null
}) => {
  const defaultPresets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: '7 Days' },
    { id: '15days', label: '15 Days' },
    { id: '30days', label: '30 Days' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const presetsList = customPresets || (
    showAllTimeOption
      ? [{ id: 'all', label: 'All Time' }, ...defaultPresets]
      : defaultPresets
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%' }}>
      {/* Scrollable Preset Pills */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1 },
          p: { xs: 0.75, sm: 1 },
          bgcolor: 'action.hover',
          borderRadius: 2.5,
          border: 1,
          borderColor: 'divider',
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            mr: 0.5,
            fontSize: { xs: '0.75rem', sm: '0.85rem' }
          }}
        >
          Date Range:
        </Typography>
        {presetsList.map((p) => (
          <Button
            key={p.id}
            variant={preset === p.id ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onPresetChange(p.id)}
            sx={{
              fontWeight: 'bold',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              px: { xs: 1.25, sm: 2 },
              py: { xs: 0.4, sm: 0.5 },
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              minHeight: { xs: 32, sm: 36 }
            }}
          >
            {p.label}
          </Button>
        ))}
      </Box>

      {/* Custom Range Expandable Inputs */}
      {preset === 'custom' && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: 'background.paper',
            width: '100%',
            borderColor: 'divider'
          }}
        >
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            {/* From Date Input Block */}
            <Grid size={{ xs: 6, sm: 6 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                <Typography
                  component="label"
                  htmlFor="from-date-picker-input"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6B7280',
                    lineHeight: 1,
                    mb: 0.25,
                    display: 'block'
                  }}
                >
                  From Date
                </Typography>
                <TextField
                  id="from-date-picker-input"
                  fullWidth
                  type="date"
                  size="small"
                  value={dateFrom ? dateFrom.slice(0, 10) : ''}
                  onChange={(e) =>
                    onDateFromChange(e.target.value ? `${e.target.value} 00:00:00` : '')
                  }
                  slotProps={{
                    input: {
                      sx: {
                        minHeight: 44,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        borderRadius: '8px',
                        bgcolor: 'background.paper',
                        '& fieldset': { borderColor: '#D1D5DB' },
                        '&:hover fieldset': { borderColor: 'primary.main' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '2px' }
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            {/* To Date Input Block */}
            <Grid size={{ xs: 6, sm: 6 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                <Typography
                  component="label"
                  htmlFor="to-date-picker-input"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6B7280',
                    lineHeight: 1,
                    mb: 0.25,
                    display: 'block'
                  }}
                >
                  To Date
                </Typography>
                <TextField
                  id="to-date-picker-input"
                  fullWidth
                  type="date"
                  size="small"
                  value={dateTo ? dateTo.slice(0, 10) : ''}
                  onChange={(e) =>
                    onDateToChange(e.target.value ? `${e.target.value} 23:59:59` : '')
                  }
                  slotProps={{
                    input: {
                      sx: {
                        minHeight: 44,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        borderRadius: '8px',
                        bgcolor: 'background.paper',
                        '& fieldset': { borderColor: '#D1D5DB' },
                        '&:hover fieldset': { borderColor: 'primary.main' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '2px' }
                      }
                    }
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default DateRangePicker;
