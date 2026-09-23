





























import React from 'react';
import { Box, Container, Typography, Button, Chip, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import retailLogo from '../assets/retail-logo.png';

export default function PrivacyPolicy({ onBack }) {
  const theme = useTheme();

  const handlePrint = () => {
    window.print();
  };

  const handleBackToApp = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a', py: { xs: 3, md: 6 }, px: { xs: 2, sm: 3 } }}>
      <Container maxWidth="md">
        {/* Navigation & Header Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToApp}
            variant="outlined"
            sx={{
              color: '#f8fafc',
              borderColor: '#334155',
              bgcolor: '#1e293b',
              '&:hover': { bgcolor: '#334155', borderColor: '#475569' },
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Back to App
          </Button>
          <Button
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            variant="contained"
            sx={{
              bgcolor: '#f97316',
              '&:hover': { bgcolor: '#ea580c' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2
            }}
          >
            Print / PDF
          </Button>
        </Box>

        {/* Main Content Card */}
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            bgcolor: '#ffffff',
            color: '#1e293b',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box
                component="img"
                src={retailLogo}
                alt="Ariso POS Logo"
                onError={(e) => { e.target.style.display = 'none'; }}
                sx={{ width: 44, height: 44, borderRadius: 2, objectFit: 'contain' }}
              />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                Ariso POS
              </Typography>
            </Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#f97316', mb: 1 }}>
              Privacy Policy
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              <Chip label="Application: Ariso POS" size="small" sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }} />
              <Chip label="Package: com.ariso.pos" size="small" sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }} />
              <Chip label="Effective Date: August 29, 2026" size="small" color="primary" sx={{ fontWeight: 600 }} />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Section 1: Introduction */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              1. Introduction
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              Welcome to <strong>Ariso POS</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), provided by <strong>Restro Captain / Ariso Technologies</strong>. Ariso POS (Android Package: <code>com.ariso.pos</code>) is a cloud-connected point-of-sale and restaurant billing management application designed for food outlets, restaurants, cafes, and retail hospitality merchants.
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7, mt: 1.5 }}>
              We are committed to protecting your privacy and ensuring the security of your business and transactional information. This Privacy Policy explains what information we collect, how it is used, how it is stored securely, and your rights regarding your data.
            </Typography>
          </Box>

          {/* Section 2: Information We Collect */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              2. Information We Collect
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7, mb: 1.5 }}>
              We collect information that is strictly necessary to provide point-of-sale, order billing, inventory tracking, and printing functionalities:
            </Typography>
            <List sx={{ pl: 1 }}>
              <ListItem alignItems="flex-start" sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  <CheckCircleOutlineIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={<strong>Account &amp; Store Information</strong>}
                  secondary="Store/restaurant name, business address, contact email address, phone number, GSTIN/tax numbers, and authorized user credentials (cashier/manager usernames and encrypted passwords)."
                />
              </ListItem>
              <ListItem alignItems="flex-start" sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  <CheckCircleOutlineIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={<strong>Product &amp; Menu Catalog</strong>}
                  secondary="Menu item names, categories, pricing, tax/GST rates, item descriptions, and inventory quantities managed by your business."
                />
              </ListItem>
              <ListItem alignItems="flex-start" sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  <CheckCircleOutlineIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={<strong>Sales &amp; Transaction Records</strong>}
                  secondary="Order items, order types (Dine-In, Takeaway, Delivery), table numbers, timestamps, invoice numbers, discount amounts, tax totals, and chosen payment methods (Cash, UPI, Card)."
                />
              </ListItem>
              <ListItem alignItems="flex-start" sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  <CheckCircleOutlineIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={<strong>Optional Delivery Customer Details</strong>}
                  secondary="When creating home delivery orders, cashiers may optionally record the customer's name, phone number, and delivery address to facilitate order fulfillment."
                />
              </ListItem>
            </List>
          </Box>

          {/* Section 3: Android Device Permissions */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              3. Android Device Permissions &amp; Hardware Usage
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7, mb: 2 }}>
              Ariso POS requests only the Android permissions necessary for point-of-sale operational hardware:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', borderColor: '#e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BluetoothIcon color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Bluetooth &amp; Nearby Devices
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    <code>BLUETOOTH</code>, <code>BLUETOOTH_CONNECT</code>, <code>BLUETOOTH_SCAN</code>: Used solely to discover, connect to, and send ESC/POS print commands to wireless 58mm/80mm thermal receipt printers and Bluetooth weighing scales.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', borderColor: '#e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CameraAltIcon color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Camera Access
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    <code>CAMERA</code>: Used on-demand to scan product barcodes and QR codes for quick cart entry. Video or photographic images are never saved, recorded, or transmitted to any server.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', borderColor: '#e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOnIcon color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Location (Bluetooth Discovery)
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    <code>ACCESS_FINE_LOCATION</code>: Required by the Android OS (Android 11 and lower) to perform Bluetooth Low Energy device discovery. Ariso POS does not collect, record, or track your physical GPS location.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', borderColor: '#e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WifiIcon color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Internet &amp; Network
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    <code>INTERNET</code>, <code>ACCESS_NETWORK_STATE</code>: Used to securely synchronize business records with your dedicated tenant cloud backend and authenticate authorized staff.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* Section 4: Offline Operation & Data Storage */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              4. Offline Operation &amp; Data Storage
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              Ariso POS is built with an offline-first architecture. When an internet connection is unavailable, shift operations, menu lookup, bill generation, and thermal printing continue uninterrupted by storing data locally on your device in secure storage (AsyncStorage / local cache). As soon as an active internet connection is restored, pending offline transactions are automatically synchronized with your secure cloud account.
            </Typography>
          </Box>

          {/* Section 5: Data Security & Protection */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              5. Data Security &amp; Protection
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7, mb: 1.5 }}>
              We employ robust administrative and technical safeguards to keep your store information safe:
            </Typography>
            <List sx={{ pl: 1 }}>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SecurityIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText secondary="All data in transit is encrypted using industry-standard TLS 1.3 / HTTPS protocols." />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SecurityIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText secondary="User passwords and sensitive authentication tokens are hashed and securely protected against unauthorized access." />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SecurityIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText secondary="Strict multi-tenant isolation ensures your store data cannot be accessed by other businesses or merchants." />
              </ListItem>
            </List>
          </Box>

          {/* Section 6: Third-Party Sharing */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              6. Third-Party Sharing &amp; Disclosure
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              <strong>We do NOT sell, rent, monetize, or trade your personal or business data to any third parties or advertisers.</strong> Data is only processed through our secure cloud infrastructure to provide the core point-of-sale service. We do not use third-party advertising SDKs or unauthorized analytics trackers.
            </Typography>
          </Box>

          {/* Section 7: Account Deletion & Data Retention */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              7. Account Deletion &amp; Data Rights
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              You retain full ownership of your store data. If you wish to delete your account, remove your store records, or request a complete copy of your business data, you can submit a deletion request by contacting us at:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, my: 1.5, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  <a href="mailto:support@restrocaptain.online" style={{ color: '#2563eb', textDecoration: 'none' }}>
                    support@restrocaptain.online
                  </a>
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                Account deletion requests are reviewed and fulfilled within 30 days upon identity verification.
              </Typography>
            </Paper>
          </Box>

          {/* Section 8: Children's Privacy */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              8. Children&apos;s Privacy
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              Ariso POS is a business management tool intended for commercial use by retail and restaurant staff. It is not directed to children under the age of 13, and we do not knowingly collect personal information from children.
            </Typography>
          </Box>

          {/* Section 9: Updates to this Policy */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              9. Changes to This Privacy Policy
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              We may update this Privacy Policy periodically to reflect new app features or legal requirements. The updated version will always be posted with a revised effective date at <code>https://restrocaptain.online/privacy-policy</code>.
            </Typography>
          </Box>

          {/* Section 10: Contact Us */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
              10. Contact Us
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.7 }}>
              If you have any questions or concerns regarding this Privacy Policy or our privacy practices, please contact us:
            </Typography>
            <Box sx={{ mt: 1.5, p: 2, bgcolor: '#f1f5f9', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Restro Captain / Ariso Technologies
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                Email: <a href="mailto:support@restrocaptain.online" style={{ color: '#2563eb', fontWeight: 600 }}>support@restrocaptain.online</a>
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                Website: <a href="https://restrocaptain.online" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>https://restrocaptain.online</a>
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Footer info */}
        <Box sx={{ textAlign: 'center', mt: 3, color: '#94a3b8' }}>
          <Typography variant="caption">
            &copy; {new Date().getFullYear()} Ariso POS / Restro Captain. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
