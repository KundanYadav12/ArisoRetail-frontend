import React from 'react';
import { Container, Paper, Typography, Box, Button } from '@mui/material';
import { Store, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function StorefrontNotFound({ subdomain, message, onBackToLogin }) {
  return (
    <Container maxWidth="sm" sx={{ py: 10, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          border: '1.5px solid #E2E8F0',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5
          }}
        >
          <Store size={38} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mb: 1 }}>
          Storefront Not Found or Offline
        </Typography>

        <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 420, mx: 'auto', mb: 3, lineHeight: 1.6 }}>
          {message || `The online store for "${subdomain}" is not currently configured, enabled, or accessible.`}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 280, mx: 'auto' }}>
          <Button
            variant="contained"
            onClick={onBackToLogin}
            startIcon={<ArrowLeft size={16} />}
            sx={{
              bgcolor: '#0F172A',
              color: '#ffffff',
              fontWeight: 800,
              py: 1.2,
              borderRadius: '10px',
              textTransform: 'none',
              '&:hover': { bgcolor: '#1E293B' }
            }}
          >
            Go to Staff Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
