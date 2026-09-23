import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, Chip, Menu, MenuItem, Tooltip, TextField,
  CircularProgress
} from '@mui/material';
import {
  X, Printer, Download, Share2, Mail, CheckCircle,
  Clock, Edit2, MoreVertical, Building, Phone, MapPin,
  Calendar, FileText, Send, Truck, Receipt, ShoppingCart, ChevronRight
} from 'lucide-react';
import { apiFetch, confirmPendingOrder } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import DeliveryChallanModal from './DeliveryChallanModal';
import DeliveryChallanVoucherModal from './DeliveryChallanVoucherModal';
import ConvertToInvoiceModal from './ConvertToInvoiceModal';

export default function SalesOrderVoucherModal({
  open,
  onClose,
  order,
  onEdit,
  onConverted,
  storeProfile = {}
}) {
  const { notify } = useNotify();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [converting, setConverting] = useState(false);

  // Timeline & Sub-modal States
  const [timeline, setTimeline] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [activeChallanVoucher, setActiveChallanVoucher] = useState(null);
  const [challanVoucherOpen, setChallanVoucherOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [convertingEstimate, setConvertingEstimate] = useState(false);

  // 3-dot Menu state
  const [menuAnchor, setMenuAnchor] = useState(null);

  useEffect(() => {
    if (open && order?.id) {
      loadTimeline();
    }
  }, [open, order?.id]);

  const loadTimeline = async () => {
    if (!order?.id) return;
    setLoadingTimeline(true);
    try {
      const res = await apiFetch(`/api/orders/${order.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data);
      }
    } catch (e) {
      console.warn('Failed to load order timeline:', e);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleConvertEstimate = async () => {
    if (!window.confirm(`Convert Estimate #${orderNumber} to Sales Order?\nThis will reserve warehouse inventory and assign an official SO number.`)) return;
    setConvertingEstimate(true);
    try {
      const res = await apiFetch(`/api/orders/${order.id}/convert-estimate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        notify.success(`Estimate converted to Sales Order #${data.salesOrderNumber}! Stock reserved.`, 'Success');
        onConverted && onConverted(data);
        onClose();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to convert estimate.', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to convert estimate.', 'Error');
    } finally {
      setConvertingEstimate(false);
    }
  };

  if (!order) return null;

  const isPending = order.order_status === 'pending';
  const orderNumber = order.unique_order_number || order.order_number || `#${order.id}`;
  const storeName = storeProfile?.store_name || storeProfile?.name || 'Ariso Retail';
  const storeAddress = storeProfile?.address || storeProfile?.store_address || '';
  const storePhone = storeProfile?.phone || storeProfile?.store_phone || '';
  const storeGst = storeProfile?.gst_number || storeProfile?.gstin || '';

  // Parse additional charges
  let additionalCharges = [];
  try {
    additionalCharges = typeof order.additional_charges === 'string'
      ? JSON.parse(order.additional_charges)
      : (order.additional_charges || []);
  } catch (e) {
    additionalCharges = [];
  }

  // Print Voucher
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const itemsText = (order.items || []).map((it, idx) => {
      const qtyStr = it.item_weight ? `${parseFloat(it.item_weight)} ${it.weight_unit || 'KG'}` : `${it.quantity} ${it.unit || 'PCS'}`;
      const priceStr = parseFloat(it.price || it.unit_price || 0).toFixed(2);
      return `${idx + 1}. ${it.name || it.item_name} (${qtyStr}) - ₹${priceStr}`;
    }).join('\n');

    const chargesText = (additionalCharges || []).map(ch => `• ${ch.name}: ₹${parseFloat(ch.amount || 0).toFixed(2)}`).join('\n');

    const message = `*SALES ORDER VOUCHER*\n*${storeName}*\n--------------------------------\n` +
      `*Order #:* ${orderNumber}\n` +
      `*Date:* ${new Date(order.created_at).toLocaleDateString()}\n` +
      (order.delivery_date ? `*Delivery Date:* ${new Date(order.delivery_date).toLocaleDateString()}\n` : '') +
      `*Party:* ${order.customer_name || 'Customer'}\n` +
      (order.reference_number ? `*Ref #:* ${order.reference_number}\n` : '') +
      `--------------------------------\n*ITEMS:*\n${itemsText}\n` +
      (chargesText ? `--------------------------------\n*CHARGES:*\n${chargesText}\n` : '') +
      `--------------------------------\n` +
      `*Subtotal:* ₹${parseFloat(order.subtotal || 0).toFixed(2)}\n` +
      (parseFloat(order.discount_amount || 0) > 0 ? `*Discount:* -₹${parseFloat(order.discount_amount || 0).toFixed(2)}\n` : '') +
      `*Tax (GST):* ₹${parseFloat(order.tax_amount || 0).toFixed(2)}\n` +
      `*GRAND TOTAL:* ₹${parseFloat(order.total_amount || 0).toFixed(2)}\n` +
      `*Status:* ${order.order_status?.toUpperCase()}\n` +
      `--------------------------------\nThank you for doing business with us!`;

    const phone = (order.customer_phone || '').replace(/[^0-9]/g, '');
    const url = phone.length >= 10
      ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  // Download Voucher
  const handleDownload = () => {
    const voucherContent = document.getElementById('sales-order-voucher-print-area');
    if (!voucherContent) return;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Order Voucher - ${orderNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
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
    a.download = `SalesOrder_${orderNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success('Voucher downloaded successfully.', 'Download');
  };

  // Convert to Invoice
  const handleConvertToInvoice = async () => {
    setMenuAnchor(null);
    if (!window.confirm(`Convert Sales Order #${orderNumber} to Invoice?\nThis will switch status to Confirmed/Completed and deduct reserved stock from physical inventory.`)) {
      return;
    }

    setConverting(true);
    try {
      await confirmPendingOrder(order.id);
      notify.success(`Order #${orderNumber} converted to Invoice successfully! Physical stock deducted.`, 'Success');
      onConverted && onConverted(order.id);
      onClose();
    } catch (err) {
      notify.error(err.message || 'Failed to convert order to invoice.', 'Conversion Error');
    } finally {
      setConverting(false);
    }
  };

  // Send Voucher via Email
  const handleSendEmail = async () => {
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      notify.error('Please enter a valid recipient email address.', 'Validation');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await apiFetch(`/api/orders/${order.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: recipientEmail.trim() })
      });

      if (res.ok) {
        notify.success(`Voucher dispatched to ${recipientEmail.trim()}!`, 'Email Sent');
        setEmailModalOpen(false);
        setRecipientEmail('');
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to send email.', 'Error');
      }
    } catch (e) {
      notify.error(e.message || 'Failed to send email.', 'Error');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, maxHeight: '92vh', overflowY: 'auto' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: isPending ? '#fef3c7' : '#dcfce7', p: 1, borderRadius: 2, display: 'flex' }}>
              <FileText size={20} color={isPending ? '#b45309' : '#15803d'} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Sales Order Voucher
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Order #{orderNumber} &bull; Created {new Date(order.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isPending && onEdit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit2 size={14} />}
                onClick={() => {
                  onClose();
                  onEdit(order);
                }}
                sx={{ fontWeight: 700 }}
              >
                Edit Order
              </Button>
            )}

            {/* 3-Dot Menu */}
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertical size={18} />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
            >
              {isPending && (
                <MenuItem onClick={handleConvertToInvoice} sx={{ fontWeight: 700, color: '#16a34a' }}>
                  <CheckCircle size={16} style={{ marginRight: 8 }} /> Convert to Invoice
                </MenuItem>
              )}
              <MenuItem onClick={() => { setMenuAnchor(null); setEmailModalOpen(true); }} sx={{ fontWeight: 600 }}>
                <Mail size={16} style={{ marginRight: 8 }} /> Share via Email
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); handlePrint(); }} sx={{ fontWeight: 600 }}>
                <Printer size={16} style={{ marginRight: 8 }} /> Print Voucher
              </MenuItem>
            </Menu>

            <IconButton onClick={onClose} size="small">
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Petpooja-style Order Lifecycle Progression */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Order Lifecycle Flow (Estimate ➔ Sales Order ➔ Delivery Challan ➔ Invoice ➔ Payment)
              </Typography>
              {loadingTimeline && <CircularProgress size={14} />}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {/* Stage 1: Estimate */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  size="small"
                  icon={<FileText size={13} />}
                  label={timeline?.estimate ? `Estimate: ${timeline.estimate.unique_order_number}` : (order.is_estimate ? `Estimate: ${orderNumber}` : 'Estimate (Optional)')}
                  sx={{
                    fontWeight: 700,
                    bgcolor: (timeline?.estimate || order.is_estimate) ? '#ede9fe' : '#f1f5f9',
                    color: (timeline?.estimate || order.is_estimate) ? '#6d28d9' : '#94a3b8'
                  }}
                />
                <ChevronRight size={16} color="#94a3b8" />
              </Box>

              {/* Stage 2: Sales Order */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  size="small"
                  icon={<ShoppingCart size={13} />}
                  label={order.is_estimate ? 'Sales Order' : `Sales Order: ${orderNumber}`}
                  sx={{
                    fontWeight: 800,
                    bgcolor: !order.is_estimate ? '#eff6ff' : '#f1f5f9',
                    color: !order.is_estimate ? '#1d4ed8' : '#94a3b8',
                    border: !order.is_estimate ? '1px solid #bfdbfe' : 'none'
                  }}
                />
                <ChevronRight size={16} color="#94a3b8" />
              </Box>

              {/* Stage 3: Delivery Challans */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  size="small"
                  icon={<Truck size={13} />}
                  label={timeline?.deliveryChallans?.length > 0 ? `Challans (${timeline.deliveryChallans.length})` : 'Delivery Challan'}
                  clickable={timeline?.deliveryChallans?.length > 0}
                  onClick={() => {
                    if (timeline?.deliveryChallans?.length > 0) {
                      setActiveChallanVoucher(timeline.deliveryChallans[0]);
                      setChallanVoucherOpen(true);
                    }
                  }}
                  sx={{
                    fontWeight: 700,
                    bgcolor: timeline?.deliveryChallans?.length > 0 ? '#fef3c7' : '#f1f5f9',
                    color: timeline?.deliveryChallans?.length > 0 ? '#b45309' : '#94a3b8'
                  }}
                />
                <ChevronRight size={16} color="#94a3b8" />
              </Box>

              {/* Stage 4: Invoices */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  size="small"
                  icon={<CheckCircle size={13} />}
                  label={timeline?.invoices?.length > 0 ? `Invoiced (${timeline.invoices.length})` : (order.order_status === 'completed' ? 'Invoiced' : 'Invoice')}
                  sx={{
                    fontWeight: 700,
                    bgcolor: (timeline?.invoices?.length > 0 || order.order_status === 'completed') ? '#dcfce7' : '#f1f5f9',
                    color: (timeline?.invoices?.length > 0 || order.order_status === 'completed') ? '#15803d' : '#94a3b8'
                  }}
                />
                <ChevronRight size={16} color="#94a3b8" />
              </Box>

              {/* Stage 5: Payment */}
              <Chip
                size="small"
                icon={<Receipt size={13} />}
                label={order.payment_mode && order.payment_mode !== 'pending' && order.payment_mode !== 'due' ? `Paid (${order.payment_mode.toUpperCase()})` : 'Payment'}
                sx={{
                  fontWeight: 700,
                  bgcolor: order.payment_mode && order.payment_mode !== 'pending' && order.payment_mode !== 'due' ? '#dcfce7' : '#f1f5f9',
                  color: order.payment_mode && order.payment_mode !== 'pending' && order.payment_mode !== 'due' ? '#15803d' : '#94a3b8'
                }}
              />
            </Box>

            {/* Linked Challans & Invoices pills if any */}
            {timeline?.deliveryChallans?.length > 0 && (
              <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>Linked Challans:</Typography>
                {timeline.deliveryChallans.map(ch => (
                  <Chip
                    key={ch.id}
                    size="small"
                    label={`${ch.challan_number} (${ch.status})`}
                    onClick={() => {
                      setActiveChallanVoucher(ch);
                      setChallanVoucherOpen(true);
                    }}
                    variant="outlined"
                    color="warning"
                    sx={{ fontWeight: 700, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}

            {timeline?.invoices?.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>Linked Invoices:</Typography>
                {timeline.invoices.map(inv => (
                  <Chip
                    key={inv.id}
                    size="small"
                    label={`${inv.unique_order_number || inv.id} (₹${parseFloat(inv.total_amount).toFixed(2)})`}
                    variant="outlined"
                    color="success"
                    sx={{ fontWeight: 700 }}
                  />
                ))}
              </Box>
            )}
          </Paper>

          {/* Printable Voucher Area */}
          <Box id="sales-order-voucher-print-area" sx={{ bgcolor: '#fff', p: 3, border: '1px solid #e2e8f0', borderRadius: 2 }}>
            {/* Voucher Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563eb', pb: 2, mb: 2.5 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e40af' }}>
                  {storeName}
                </Typography>
                {storeAddress && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {storeAddress}
                  </Typography>
                )}
                {storePhone && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Tel: {storePhone}
                  </Typography>
                )}
                {storeGst && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    GSTIN: {storeGst}
                  </Typography>
                )}
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 1, color: order.is_estimate ? '#7c3aed' : '#334155' }}>
                  {order.is_estimate ? 'ESTIMATE / QUOTATION' : 'SALES ORDER'}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                  #{orderNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Date: {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Typography>
                {order.delivery_date && (
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#d97706' }}>
                    {order.is_estimate ? 'Valid Until:' : 'Delivery Date:'} {new Date(order.delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  {order.is_estimate ? (
                    <Chip size="small" label="ESTIMATE / QUOTATION" sx={{ bgcolor: '#ede9fe', color: '#7c3aed', fontWeight: 800 }} />
                  ) : isPending ? (
                    <Chip size="small" icon={<Clock size={12} />} label="PENDING / RESERVED" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800 }} />
                  ) : order.order_status === 'completed' ? (
                    <Chip size="small" icon={<CheckCircle size={12} />} label="CONFIRMED / COMPLETED" color="success" sx={{ fontWeight: 800 }} />
                  ) : (
                    <Chip size="small" label={order.order_status?.toUpperCase()} color="error" sx={{ fontWeight: 800 }} />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Party & Supply Info Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Party (Billed To)
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.25 }}>
                  {order.customer_name || 'Walk-in Party'}
                </Typography>
                {order.customer_phone && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Phone: {order.customer_phone}
                  </Typography>
                )}
                {order.billing_address && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    <b>Billing Address:</b> {order.billing_address}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Shipping & Supply Details
                </Typography>
                {order.shipping_address ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    <b>Ship To:</b> {order.shipping_address}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    <b>Ship To:</b> Same as billing address
                  </Typography>
                )}
                {order.place_of_supply && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    <b>Place of Supply:</b> {order.place_of_supply}
                  </Typography>
                )}
                {order.reference_number && (
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#0284c7', mt: 0.5 }}>
                    Ref / PO #: {order.reference_number}
                  </Typography>
                )}
                {order.salesman_name && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Sales By: {order.salesman_name}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Order Items Table */}
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '4%' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Item Description</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Ordered</TableCell>
                    {!order.is_estimate && <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Delivered</TableCell>}
                    {!order.is_estimate && <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Invoiced</TableCell>}
                    {!order.is_estimate && <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Pending</TableCell>}
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Price (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Disc (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Tax %</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Total (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(order.items || []).map((it, idx) => {
                    const qty = it.item_weight ? parseFloat(it.item_weight) : parseInt(it.quantity || 1);
                    const unitStr = it.weight_unit || it.unit || (it.item_weight ? 'KG' : 'PCS');
                    const price = parseFloat(it.price || it.unit_price || 0);
                    const discount = parseFloat(it.discount_amount || 0);
                    const taxRate = parseFloat(it.gst_rate || 0);
                    const lineTotal = ((price * qty) - discount + parseFloat(it.tax_amount || 0)).toFixed(2);
                    const delivered = parseFloat(it.delivered_qty || 0);
                    const invoiced = parseFloat(it.invoiced_qty || 0);
                    const pending = Math.max(0, qty - invoiced);

                    return (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {it.name || it.item_name}
                          </Typography>
                          {it.notes && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {it.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                          {qty} {unitStr}
                        </TableCell>
                        {!order.is_estimate && (
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: delivered > 0 ? '#0284c7' : 'inherit' }}>
                            {delivered} {unitStr}
                          </TableCell>
                        )}
                        {!order.is_estimate && (
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: invoiced > 0 ? '#16a34a' : 'inherit' }}>
                            {invoiced} {unitStr}
                          </TableCell>
                        )}
                        {!order.is_estimate && (
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: pending > 0 ? '#d97706' : '#94a3b8' }}>
                            {pending} {unitStr}
                          </TableCell>
                        )}
                        <TableCell sx={{ textAlign: 'right' }}>
                          ₹{price.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', color: discount > 0 ? '#16a34a' : 'inherit' }}>
                          {discount > 0 ? `₹${discount.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {taxRate}%
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 800 }}>
                          ₹{lineTotal}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Calculations & Summary */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Box sx={{ width: { xs: '100%', sm: '320px' }, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{parseFloat(order.subtotal || 0).toFixed(2)}</Typography>
                </Box>

                {parseFloat(order.discount_amount || 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <Typography variant="body2">Discount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>-₹{parseFloat(order.discount_amount || 0).toFixed(2)}</Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tax (GST):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{parseFloat(order.tax_amount || 0).toFixed(2)}</Typography>
                </Box>

                {/* Additional Charges */}
                {(additionalCharges || []).map((ch, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7' }}>
                    <Typography variant="body2">{ch.name}:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>+₹{parseFloat(ch.amount || 0).toFixed(2)}</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Grand Total:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e40af' }}>
                    ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Notes Footer */}
            {order.notes && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #cbd5e1' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>
                  Terms & Notes:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  {order.notes}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Close
          </Button>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<Share2 size={16} />}
              onClick={handleShareWhatsApp}
              sx={{ fontWeight: 700 }}
            >
              WhatsApp
            </Button>

            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              onClick={handleDownload}
              sx={{ fontWeight: 700 }}
            >
              Download
            </Button>

            <Button
              variant="contained"
              startIcon={<Printer size={16} />}
              onClick={handlePrint}
              sx={{ fontWeight: 700 }}
            >
              Print Voucher
            </Button>

            {/* Estimate to Sales Order */}
            {order.is_estimate === 1 && (
              <Button
                variant="contained"
                onClick={handleConvertEstimate}
                disabled={convertingEstimate}
                startIcon={convertingEstimate ? <CircularProgress size={16} color="inherit" /> : <ShoppingCart size={16} />}
                sx={{ fontWeight: 800, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
              >
                {convertingEstimate ? 'Converting...' : 'Convert to Sales Order'}
              </Button>
            )}

            {/* Sales Order: Delivery Challan & Invoicing */}
            {!order.is_estimate && isPending && (
              <>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Truck size={16} />}
                  onClick={() => setChallanModalOpen(true)}
                  sx={{ fontWeight: 800 }}
                >
                  + Create Delivery Challan
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Receipt size={16} />}
                  onClick={() => setInvoiceModalOpen(true)}
                  sx={{ fontWeight: 800 }}
                >
                  Convert to Invoice
                </Button>
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Sub-modals for Challans & Invoices */}
      {challanModalOpen && (
        <DeliveryChallanModal
          open={challanModalOpen}
          onClose={() => setChallanModalOpen(false)}
          salesOrder={order}
          onCreated={(created) => {
            loadTimeline();
            onConverted && onConverted();
            notify.success(`Delivery Challan #${created.challanNumber} created!`, 'Success');
          }}
        />
      )}

      {challanVoucherOpen && activeChallanVoucher && (
        <DeliveryChallanVoucherModal
          open={challanVoucherOpen}
          onClose={() => {
            setChallanVoucherOpen(false);
            setActiveChallanVoucher(null);
          }}
          challan={activeChallanVoucher}
          storeProfile={storeProfile}
        />
      )}

      {invoiceModalOpen && (
        <ConvertToInvoiceModal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          salesOrder={order}
          onInvoiced={(invData) => {
            loadTimeline();
            onConverted && onConverted(invData);
            onClose();
          }}
        />
      )}

      {/* Share Email Dialog */}
      <Dialog
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Share Voucher via Email</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Send the complete sales order voucher HTML to customer or internal staff.
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="email"
            label="Recipient Email Address *"
            placeholder="client@company.com"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEmailModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleSendEmail}
            variant="contained"
            disabled={sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={14} color="inherit" /> : <Send size={14} />}
            sx={{ fontWeight: 700 }}
          >
            {sendingEmail ? 'Sending...' : 'Send Voucher'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
