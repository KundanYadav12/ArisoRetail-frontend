import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, Chip
} from '@mui/material';
import { X, Printer, Download, Share2, Truck, Calendar, User, Phone, MapPin, CheckCircle } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';

export default function DeliveryChallanVoucherModal({
  open,
  onClose,
  challan,
  storeProfile = {}
}) {
  const { notify } = useNotify();

  if (!challan) return null;

  const challanNumber = challan.challan_number || `#DC-${challan.id}`;
  const storeName = storeProfile?.store_name || storeProfile?.name || 'Ariso Retail';
  const storeAddress = storeProfile?.address || storeProfile?.store_address || '';
  const storePhone = storeProfile?.phone || storeProfile?.store_phone || '';
  const storeGst = storeProfile?.gst_number || storeProfile?.gstin || '';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const itemsText = (challan.items || []).map((it, idx) => {
      return `${idx + 1}. *${it.item_name}* - ${parseFloat(it.delivered_qty)} ${it.unit || 'PCS'}`;
    }).join('\n');

    const message = `*DELIVERY CHALLAN / DISPATCH VOUCHER*\n*${storeName}*\n--------------------------------\n` +
      `*Challan #:* ${challanNumber}\n` +
      `*Date:* ${new Date(challan.challan_date || challan.created_at).toLocaleDateString()}\n` +
      (challan.sales_order_number ? `*Ref Order #:* ${challan.sales_order_number}\n` : '') +
      (challan.vehicle_number ? `*Vehicle #:* ${challan.vehicle_number}\n` : '') +
      (challan.driver_name ? `*Driver:* ${challan.driver_name} (${challan.driver_phone || 'No phone'})\n` : '') +
      `*Consignee:* ${challan.party_name || 'Customer'}\n` +
      `*Delivery Address:* ${challan.delivery_address || 'Same as billing'}\n` +
      `--------------------------------\n*DISPATCHED ITEMS:*\n${itemsText}\n` +
      `--------------------------------\n` +
      (challan.notes ? `*Notes:* ${challan.notes}\n--------------------------------\n` : '') +
      `Dispatched by ${storeName}. Goods received in good condition.`;

    const phone = (challan.party_phone || '').replace(/[^0-9]/g, '');
    const url = phone.length >= 10
      ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  const handleDownload = () => {
    const voucherContent = document.getElementById('delivery-challan-voucher-print-area');
    if (!voucherContent) return;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challan - ${challanNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 25px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; }
            .sign-box { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
          </style>
        </head>
        <body>
          ${voucherContent.innerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([printHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeliveryChallan_${challanNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success('Delivery Challan downloaded.', 'Download');
  };

  const totalDeliveredQty = (challan.items || []).reduce((acc, it) => acc + (parseFloat(it.delivered_qty) || 0), 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh', overflowY: 'auto' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: '#eff6ff', p: 1, borderRadius: 2, display: 'flex' }}>
            <Truck size={22} color="#0284c7" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Delivery Challan</Typography>
            <Typography variant="caption" color="text.secondary">
              Challan #{challanNumber} • Ref: {challan.sales_order_number || `#${challan.sales_order_id}`}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box id="delivery-challan-voucher-print-area" sx={{ bgcolor: '#fff', p: 3, border: '1px solid #e2e8f0', borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', pb: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0369a1' }}>{storeName}</Typography>
              {storeAddress && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{storeAddress}</Typography>}
              {storePhone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Tel: {storePhone}</Typography>}
              {storeGst && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>GSTIN: {storeGst}</Typography>}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 1, color: '#1e293b' }}>
                DELIVERY CHALLAN
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                #{challanNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Date: {new Date(challan.challan_date || challan.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={challan.status ? challan.status.toUpperCase() : 'DISPATCHED'}
                  color={challan.status === 'delivered' ? 'success' : (challan.status === 'cancelled' ? 'error' : 'primary')}
                  sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                />
              </Box>
            </Box>
          </Box>

          {/* Consignee & Transport Meta */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Consignee / Deliver To
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.25 }}>
                {challan.party_name || 'Walk-in Party'}
              </Typography>
              {challan.party_phone && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Phone: {challan.party_phone}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                <b>Delivery Address:</b> {challan.delivery_address || 'Same as billing address'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Transport & Order Details
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, fontWeight: 700, color: '#0369a1' }}>
                Sales Order Ref: {challan.sales_order_number || `#${challan.sales_order_id}`}
              </Typography>
              {challan.vehicle_number && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  <b>Vehicle No:</b> {challan.vehicle_number}
                </Typography>
              )}
              {challan.driver_name && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  <b>Driver:</b> {challan.driver_name} {challan.driver_phone ? `(${challan.driver_phone})` : ''}
                </Typography>
              )}
              {challan.warehouse_name && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  <b>Dispatched From:</b> {challan.warehouse_name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Items Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: '6%' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: '44%' }}>Item Description</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center', width: '20%' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: '30%' }}>Dispatched Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(challan.items || []).map((it, idx) => (
                  <TableRow key={it.id || idx}>
                    <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{it.item_name}</Typography>
                      {it.notes && <Typography variant="caption" color="text.secondary">{it.notes}</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{it.unit || 'PCS'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#0369a1' }}>
                        {parseFloat(it.delivered_qty || 0)} {it.unit || 'PCS'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Total Dispatched Summary */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Total Line Items: <b>{(challan.items || []).length}</b>
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Total Quantity Dispatched: <b style={{ color: '#0369a1' }}>{totalDeliveredQty.toFixed(2)}</b>
            </Typography>
          </Box>

          {challan.notes && (
            <Box sx={{ mb: 4, pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>Remarks / Delivery Instructions:</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{challan.notes}</Typography>
            </Box>
          )}

          {/* Signature Blocks */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 5, pt: 3, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ textAlign: 'center', width: '220px' }}>
              <Box sx={{ height: '40px', borderBottom: '1px dashed #94a3b8', mb: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Authorized Signatory ({storeName})
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', width: '220px' }}>
              <Box sx={{ height: '40px', borderBottom: '1px dashed #94a3b8', mb: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Receiver's Signature & Date
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Close</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="success" startIcon={<Share2 size={16} />} onClick={handleShareWhatsApp} sx={{ fontWeight: 700 }}>
            WhatsApp
          </Button>
          <Button variant="outlined" startIcon={<Download size={16} />} onClick={handleDownload} sx={{ fontWeight: 700 }}>
            Download
          </Button>
          <Button variant="contained" startIcon={<Printer size={16} />} onClick={handlePrint} sx={{ fontWeight: 800 }}>
            Print Challan
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
