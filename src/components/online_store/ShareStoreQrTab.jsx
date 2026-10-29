import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  QrCode,
  Copy,
  Check,
  Share2,
  Download,
  Printer,
  ExternalLink,
  MessageCircle,
  Store,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch, resolveImageUrl } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

export default function ShareStoreQrTab({ token, restaurantId, storeSettings }) {
  const { notify } = useNotify();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const subdomain = storeSettings?.subdomain;
  const storeUrl = subdomain ? `https://${subdomain}.arisopos.in` : '';
  const storeName = storeSettings?.name || 'Retail Store';
  const themeColor = storeSettings?.store_theme_color || '#ea580c';

  const handleCopy = () => {
    if (!storeUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      notify.success('Store link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!storeUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: `Order fresh products online directly from ${storeName}:`,
          url: storeUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 1000;
    canvas.height = 1000;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 100, 100, 800, 800);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${subdomain || 'store'}_qr_code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      notify.success('QR Code downloaded successfully!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintStandee = () => {
    if (!storeUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const standeeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${storeName} — Store QR Standee</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #ffffff;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
          }
          .standee-card {
            width: 380px;
            border: 3px solid #0f172a;
            border-radius: 28px;
            padding: 36px 28px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          .store-logo {
            width: 72px;
            height: 72px;
            border-radius: 14px;
            object-fit: contain;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
          }
          .store-name {
            font-size: 24px;
            font-weight: 900;
            margin: 0 0 6px 0;
            color: #0f172a;
          }
          .tagline {
            font-size: 13px;
            color: #64748b;
            margin: 0 0 20px 0;
            font-weight: 600;
          }
          .qr-box {
            padding: 16px;
            border: 2px dashed #cbd5e1;
            border-radius: 20px;
            display: inline-block;
            background: #f8fafc;
            margin-bottom: 20px;
          }
          .scan-text {
            font-size: 16px;
            font-weight: 800;
            color: #ea580c;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0 0 6px 0;
          }
          .instructions {
            font-size: 12px;
            color: #475569;
            margin: 0 0 14px 0;
          }
          .url-pill {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <div class="standee-card">
          ${storeSettings?.logo_url ? `<img src="${resolveImageUrl(storeSettings.logo_url)}" class="store-logo" />` : ''}
          <h1 class="store-name">${storeName}</h1>
          <p class="tagline">${storeSettings?.store_tagline || 'Online Store & Home Delivery'}</p>

          <div class="qr-box">
            ${qrRef.current?.innerHTML || ''}
          </div>

          <div class="scan-text">Scan & Order Online</div>
          <p class="instructions">Open your mobile camera or scanner to browse our digital catalog, view prices, and order directly!</p>
          <div class="url-pill">${storeUrl}</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(standeeHtml);
    printWindow.document.close();
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Hello! You can now browse our catalog and order online directly from ${storeName}: ${storeUrl}`)}`;

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '20px', border: '1.5px solid #E2E8F0', mb: 3 }}>
        <Grid container spacing={4} alignItems="center">
          {/* Left: QR Code Preview */}
          <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              ref={qrRef}
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: '#ffffff',
                border: '2px solid #E2E8F0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                mb: 2,
                display: 'inline-block'
              }}
            >
              {storeUrl ? (
                <QRCodeSVG
                  value={storeUrl}
                  size={220}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <Box sx={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                  No subdomain assigned
                </Box>
              )}
            </Box>

            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textAlign: 'center', maxWidth: 260 }}>
              Customers scanning this QR code with any camera will open your storefront directly.
            </Typography>
          </Grid>

          {/* Right: Store Link & Share Actions */}
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Chip
                  icon={<Sparkles size={14} color="#ea580c" />}
                  label="Instant Online Presence"
                  size="small"
                  sx={{ bgcolor: '#fff7ed', color: '#ea580c', fontWeight: 800, mb: 1 }}
                />
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mb: 0.5 }}>
                  Share Your Store Link & QR Code
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  Share your personalized web link on WhatsApp, print the QR code on bills or counter standees, and receive customer orders directly.
                </Typography>
              </Box>

              {/* Public Store URL Box */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                    Storefront Public URL
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {storeUrl || 'Subdomain not assigned yet'}
                  </Typography>
                </Box>

                {storeUrl && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleCopy}
                    startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                    sx={{
                      bgcolor: copied ? '#16a34a' : '#0F172A',
                      color: '#ffffff',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 800,
                      flexShrink: 0,
                      '&:hover': { bgcolor: copied ? '#16a34a' : '#1E293B' }
                    }}
                  >
                    {copied ? 'Copied' : 'Copy Link'}
                  </Button>
                )}
              </Box>

              {/* Action Buttons Grid */}
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleNativeShare}
                    startIcon={<Share2 size={16} />}
                    sx={{
                      py: 1.2,
                      borderRadius: '10px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#CBD5E1',
                      color: '#334155'
                    }}
                  >
                    Share Website Link
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    component="a"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={whatsappShareUrl}
                    startIcon={<MessageCircle size={16} color="#16a34a" />}
                    sx={{
                      py: 1.2,
                      borderRadius: '10px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#16a34a',
                      color: '#16a34a',
                      '&:hover': { bgcolor: '#f0fdf4' }
                    }}
                  >
                    Share via WhatsApp
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleDownloadQr}
                    startIcon={<Download size={16} />}
                    sx={{
                      py: 1.2,
                      borderRadius: '10px',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#CBD5E1',
                      color: '#334155'
                    }}
                  >
                    Download QR (PNG)
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handlePrintStandee}
                    startIcon={<Printer size={16} />}
                    sx={{
                      py: 1.2,
                      borderRadius: '10px',
                      fontWeight: 800,
                      textTransform: 'none',
                      bgcolor: '#ea580c',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#c2410c' }
                    }}
                  >
                    Print Counter Standee
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
