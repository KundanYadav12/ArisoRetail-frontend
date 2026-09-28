import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, Box, Typography,
  Divider, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Paper, IconButton, Tooltip, TextField, Alert,
  LinearProgress
} from '@mui/material';
import {
  X, Download, Mail, Printer, Edit2, Building2, MapPin,
  FileText, CheckCircle, Clock, AlertCircle, Send, ArrowLeft
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  return parseFloat(n || 0).toFixed(decimals);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).split('T')[0];
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function numberToWords(num) {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function h(n) {
    let s = '';
    if (n >= 100) { s += units[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n >= 20) { s += tens[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) s += units[n] + ' ';
    return s.trim();
  }
  const n = Math.round(Math.abs(num));
  if (n === 0) return 'Zero';
  let r = '';
  if (n >= 10000000) { r += h(Math.floor(n / 10000000)) + ' Crore '; }
  const r1 = n % 10000000;
  if (r1 >= 100000) { r += h(Math.floor(r1 / 100000)) + ' Lakh '; }
  const r2 = r1 % 100000;
  if (r2 >= 1000)  { r += h(Math.floor(r2 / 1000)) + ' Thousand '; }
  r += h(r2 % 1000);
  return r.trim();
}

function amountInWords(total) {
  const rupees = Math.floor(total);
  const paise  = Math.round((total - rupees) * 100);
  let w = numberToWords(rupees) + ' Rupees';
  if (paise > 0) w += ' and ' + numberToWords(paise) + ' Paise';
  return w + ' Only';
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    paid: { label: 'PAID', color: '#16a34a', bg: '#dcfce7' },
    partially_paid: { label: 'PARTIAL', color: '#d97706', bg: '#fef3c7' },
    unpaid: { label: 'UNPAID', color: '#dc2626', bg: '#fee2e2' }
  };
  const s = map[status] || map.unpaid;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.5, py: 0.4, borderRadius: 1.5,
      bgcolor: s.bg, border: `1px solid ${s.color}30`
    }}>
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.color }} />
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: s.color, letterSpacing: 1 }}>
        {s.label}
      </Typography>
    </Box>
  );
}

// ── Email Dialog ──────────────────────────────────────────────────────────

function EmailDialog({ open, bill, branding, onClose, onSent }) {
  const notify = useNotify();
  const [to, setTo]           = useState('');
  const [subject, setSubject] = useState('');
  const [msg, setMsg]         = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && bill) {
      setTo(bill.supplier_email || '');
      setSubject(`Purchase Bill ${bill.internal_bill_number}`);
      setMsg(
        `Dear ${bill.supplier_company || bill.supplier_name || 'Vendor'},\n\n` +
        `Please find the attached Purchase Bill ${bill.internal_bill_number} ` +
        `dated ${fmtDate(bill.bill_date)} for ₹${fmt(bill.total_amount)}.\n\n` +
        `Thank you for your business.\n\n` +
        `Regards,\n${branding?.restaurant_name || ''}`
      );
    }
  }, [open, bill, branding]);

  const handleSend = async () => {
    if (!to.trim()) { notify.error('Recipient email is required.'); return; }
    setSending(true);
    try {
      const res = await apiFetch(`/api/inventory/purchases/bills/${bill.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject, message: msg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      notify.success(data.message || `Email sent to ${to}.`, 'Email Sent');
      onSent();
    } catch (err) {
      notify.error(err.message, 'Email Error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Mail size={20} color="#EA580C" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Share via Email</Typography>
          <IconButton onClick={onClose} sx={{ ml: 'auto' }}><X size={18} /></IconButton>
        </Box>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
          The purchase bill PDF will be attached automatically.
        </Alert>
      </Box>
      <DialogContent sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="To *" size="small" fullWidth value={to} onChange={e => setTo(e.target.value)} type="email" />
          <TextField label="Subject" size="small" fullWidth value={subject} onChange={e => setSubject(e.target.value)} />
          <TextField label="Message" size="small" fullWidth multiline rows={5} value={msg} onChange={e => setMsg(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained" startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
          onClick={handleSend} disabled={sending}
          sx={{ bgcolor: '#EA580C', '&:hover': { bgcolor: '#C2410C' }, fontWeight: 700 }}
        >
          {sending ? 'Sending…' : 'Send Bill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function PurchaseBillViewModal({
  open,
  billId,
  onClose,
  onEdit,        // callback(bill) → opens edit form
  onRefresh      // callback after actions that may change data
}) {
  const notify    = useNotify();
  const printRef  = useRef(null);

  const [bill,     setBill]     = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen]     = useState(false);

  const load = useCallback(async () => {
    if (!billId) return;
    setLoading(true);
    try {
      const [billRes, settingsRes] = await Promise.all([
        apiFetch(`/api/inventory/purchases/bills/${billId}`),
        apiFetch('/api/settings/receipt')
      ]);
      const billData = await billRes.json();
      const settData = await settingsRes.json();
      if (!billRes.ok) throw new Error(billData.error || 'Failed to load bill');
      setBill(billData);
      setBranding(settData);
    } catch (err) {
      notify.error(err.message, 'Load Error');
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    if (open && billId) load();
    if (!open) { setBill(null); setBranding(null); }
  }, [open, billId, load]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/api/inventory/purchases/bills/${billId}/pdf`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'PDF download failed');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Purchase-Bill-${bill?.internal_bill_number || billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success('PDF downloaded successfully.', 'Download Complete');
    } catch (err) {
      notify.error(err.message, 'Download Error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Bill - ${bill?.internal_bill_number}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; padding: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 10px; }
          th { background: #0f172a; color: #fff; }
          .no-print { display: none; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  if (!open) return null;

  const isIGST = (bill?.tax_type || 'intra').toLowerCase() === 'inter';
  const subtotal   = parseFloat(bill?.subtotal || 0);
  const disc       = parseFloat(bill?.discount_amount || 0);
  const addChg     = parseFloat(bill?.additional_charges || 0);
  const taxable    = subtotal - disc;
  const tax        = parseFloat(bill?.tax_amount || 0);
  const grandTotal = parseFloat(bill?.total_amount || 0);
  const paid       = parseFloat(bill?.paid_amount || 0);
  const balance    = Math.max(0, grandTotal - paid);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, maxHeight: '96vh', display: 'flex', flexDirection: 'column' }
          }
        }}
      >
        {/* ── Action bar ── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 3, py: 1.5,
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#0f172a'
        }}>
          <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
            <ArrowLeft size={18} />
          </IconButton>
          <Typography sx={{ fontWeight: 800, color: '#fff', flex: 1, fontSize: '0.95rem' }}>
            Purchase Bill
            {bill && (
              <Typography component="span" sx={{ color: '#94a3b8', fontWeight: 400, ml: 1, fontSize: '0.82rem' }}>
                {bill.internal_bill_number}
              </Typography>
            )}
          </Typography>

          {bill && !loading && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Print">
                <Button
                  size="small" startIcon={<Printer size={15} />}
                  onClick={handlePrint}
                  sx={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, '&:hover': { color: '#fff', bgcolor: '#1e293b' } }}
                >Print</Button>
              </Tooltip>
              <Tooltip title="Share via Email">
                <Button
                  size="small" startIcon={<Mail size={15} />}
                  onClick={() => setEmailOpen(true)}
                  sx={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, '&:hover': { color: '#fff', bgcolor: '#1e293b' } }}
                >Email</Button>
              </Tooltip>
              <Button
                size="small" variant="outlined"
                startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <Download size={15} />}
                onClick={handleDownloadPDF} disabled={downloading}
                sx={{ borderColor: '#EA580C', color: '#EA580C', fontWeight: 700, fontSize: '0.78rem', '&:hover': { bgcolor: '#EA580C20' } }}
              >
                {downloading ? 'Generating…' : 'Download PDF'}
              </Button>
              {onEdit && (
                <Button
                  size="small" variant="contained"
                  startIcon={<Edit2 size={15} />}
                  onClick={() => onEdit(bill)}
                  sx={{ bgcolor: '#EA580C', fontWeight: 700, fontSize: '0.78rem', '&:hover': { bgcolor: '#C2410C' } }}
                >
                  Edit Bill
                </Button>
              )}
            </Box>
          )}

          <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
            <X size={18} />
          </IconButton>
        </Box>

        {loading && <LinearProgress sx={{ height: 3 }} />}

        <DialogContent sx={{ p: 0, overflowY: 'auto', bgcolor: '#f1f5f9' }}>
          {!loading && !bill && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Typography color="text.secondary">Bill not found or failed to load.</Typography>
            </Box>
          )}

          {bill && (
            <Box ref={printRef} sx={{ maxWidth: 900, mx: 'auto', my: 3, px: 2 }}>
              {/* ── Document ── */}
              <Paper elevation={2} sx={{ borderRadius: 2.5, overflow: 'hidden' }}>

                {/* ─── HEADER ─── */}
                <Box sx={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  px: 3.5, py: 2.5,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
                }}>
                  <Box>
                    {branding?.logo_url && (
                      <Box
                        component="img"
                        src={branding.logo_url.startsWith('/') ? `http://localhost:5005${branding.logo_url}` : branding.logo_url}
                        alt="logo"
                        sx={{ height: 48, mb: 1, objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: '1.25rem', lineHeight: 1.2 }}>
                      {branding?.restaurant_name || 'Business'}
                    </Typography>
                    {branding?.branch_name && (
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>{branding.branch_name}</Typography>
                    )}
                    <Typography sx={{ color: '#64748b', fontSize: '0.74rem', mt: 0.5, maxWidth: 300 }}>
                      {[branding?.address, branding?.phone, branding?.email].filter(Boolean).join(' · ')}
                    </Typography>
                    {branding?.gst_number && (
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', mt: 0.3 }}>
                        GSTIN: {branding.gst_number}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Box sx={{
                      bgcolor: '#EA580C', px: 2.5, py: 1, borderRadius: 1.5, mb: 1.5
                    }}>
                      <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: '1rem', letterSpacing: 1.5 }}>
                        PURCHASE BILL
                      </Typography>
                    </Box>
                    <StatusBadge status={bill.payment_status} />
                  </Box>
                </Box>

                {/* ─── META STRIP ─── */}
                <Box sx={{
                  bgcolor: '#1e293b',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  borderBottom: '2px solid #EA580C'
                }}>
                  {[
                    { label: 'Internal Ref', value: bill.internal_bill_number },
                    { label: 'Vendor Invoice #', value: bill.bill_number },
                    { label: 'Bill Date', value: fmtDate(bill.bill_date) },
                    { label: 'Due Date', value: fmtDate(bill.due_date) },
                    { label: 'Purchase Order', value: bill.po_number || '—' },
                    { label: 'Place of Supply', value: bill.place_of_supply || '—' }
                  ].map((m, i) => (
                    <Box key={i} sx={{ px: 1.5, py: 1.2, borderRight: i < 5 ? '1px solid #334155' : 'none' }}>
                      <Typography sx={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {m.label}
                      </Typography>
                      <Typography sx={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 700, mt: 0.2 }}>
                        {m.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* ─── PARTIES ─── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #e2e8f0' }}>
                  {/* Bill From */}
                  <Box sx={{ px: 3, py: 2, borderRight: '1px solid #e2e8f0', bgcolor: '#fff7ed' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                      <Building2 size={13} color="#EA580C" />
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Bill From (Vendor)
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {bill.supplier_company || bill.supplier_name || '—'}
                    </Typography>
                    {bill.supplier_name && bill.supplier_company && (
                      <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{bill.supplier_name}</Typography>
                    )}
                    <Typography sx={{ fontSize: '0.78rem', color: '#475569', mt: 0.5 }}>
                      {[bill.supplier_address, bill.supplier_city, bill.supplier_state].filter(Boolean).join(', ') || '—'}
                    </Typography>
                    {bill.supplier_gst && (
                      <Typography sx={{ fontSize: '0.76rem', color: '#0f172a', mt: 0.5, fontWeight: 600 }}>
                        GSTIN: {bill.supplier_gst}
                      </Typography>
                    )}
                    {bill.supplier_mobile && (
                      <Typography sx={{ fontSize: '0.74rem', color: '#64748b' }}>Ph: {bill.supplier_mobile}</Typography>
                    )}
                    {bill.supplier_email && (
                      <Typography sx={{ fontSize: '0.74rem', color: '#64748b' }}>{bill.supplier_email}</Typography>
                    )}
                  </Box>

                  {/* Ship To */}
                  <Box sx={{ px: 3, py: 2, bgcolor: '#f0fdf4' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                      <MapPin size={13} color="#16a34a" />
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Receiving Warehouse
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {bill.warehouse_name || '—'}
                    </Typography>
                    {bill.warehouse_code && (
                      <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>Code: {bill.warehouse_code}</Typography>
                    )}
                    {bill.warehouse_address && (
                      <Typography sx={{ fontSize: '0.78rem', color: '#475569', mt: 0.5 }}>{bill.warehouse_address}</Typography>
                    )}
                    <Typography sx={{ fontSize: '0.74rem', color: '#64748b', mt: 0.5 }}>
                      Created by: {bill.created_by_name || 'Staff'}
                    </Typography>
                  </Box>
                </Box>

                {/* ─── ITEMS TABLE ─── */}
                <Box sx={{ px: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#0f172a' }}>
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', width: 32 }}>#</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}>Item / Description</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'center' }}>HSN</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>Qty</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'center' }}>Unit</TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>Rate (₹)</TableCell>
                        {isIGST ? (
                          <>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>IGST %</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>IGST (₹)</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>CGST %</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>CGST (₹)</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>SGST %</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>SGST (₹)</TableCell>
                          </>
                        )}
                        <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'right' }}>Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(bill.items || []).map((it, idx) => {
                        const hsn = it.hsn_code || it.mi_hsn || '—';
                        return (
                          <TableRow key={it.id || idx} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#f8fafc', '&:hover': { bgcolor: '#f1f5f9' } }}>
                            <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{idx + 1}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                                {it.item_name}
                              </Typography>
                              {it.sku && <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>SKU: {it.sku}</Typography>}
                              {it.batch_number && <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>Batch: {it.batch_number}</Typography>}
                              {it.expiry_date && <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>Expiry: {fmtDate(it.expiry_date)}</Typography>}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.78rem', textAlign: 'center', color: '#475569' }}>{hsn}</TableCell>
                            <TableCell sx={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: 600 }}>{fmt(it.quantity)}</TableCell>
                            <TableCell sx={{ fontSize: '0.78rem', textAlign: 'center', color: '#475569' }}>
                              <Chip label={it.unit || 'pcs'} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: 600 }}>{fmt(it.rate)}</TableCell>
                            {isIGST ? (
                              <>
                                <TableCell sx={{ fontSize: '0.78rem', textAlign: 'right', color: '#475569' }}>{fmt(it.igst_rate, 1)}%</TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', textAlign: 'right' }}>{fmt(it.igst_amount)}</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell sx={{ fontSize: '0.78rem', textAlign: 'right', color: '#475569' }}>{fmt(it.cgst_rate, 1)}%</TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', textAlign: 'right' }}>{fmt(it.cgst_amount)}</TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', textAlign: 'right', color: '#475569' }}>{fmt(it.sgst_rate, 1)}%</TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', textAlign: 'right' }}>{fmt(it.sgst_amount)}</TableCell>
                              </>
                            )}
                            <TableCell sx={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              ₹{fmt(it.total_amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Subtotal Row */}
                      <TableRow sx={{ bgcolor: '#eff6ff' }}>
                        <TableCell colSpan={isIGST ? 7 : 9} sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                          SUBTOTAL
                          <Typography component="span" sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 400, ml: 1 }}>
                            ({(bill.items || []).reduce((s, it) => s + parseFloat(it.quantity || 0), 0).toFixed(2)} total units)
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.88rem', textAlign: 'right', color: '#0f172a' }}>
                          ₹{fmt(subtotal)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>

                {/* ─── TOTALS + AMOUNT IN WORDS ─── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0, borderTop: '1px solid #e2e8f0' }}>
                  {/* Amount in words + notes */}
                  <Box sx={{ px: 3, py: 2.5, borderRight: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', mb: 0.5 }}>
                      Amount in Words
                    </Typography>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', fontStyle: 'italic', mb: 2 }}>
                      {amountInWords(grandTotal)}
                    </Typography>

                    {/* Payment status strip */}
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 1,
                      px: 2, py: 0.8, borderRadius: 1.5, mb: 1.5,
                      bgcolor: bill.payment_status === 'paid' ? '#dcfce7' : bill.payment_status === 'partially_paid' ? '#fef3c7' : '#fee2e2',
                      border: `1px solid ${bill.payment_status === 'paid' ? '#16a34a30' : bill.payment_status === 'partially_paid' ? '#d9770630' : '#dc262630'}`
                    }}>
                      {bill.payment_status === 'paid'
                        ? <CheckCircle size={14} color="#16a34a" />
                        : bill.payment_status === 'partially_paid'
                        ? <Clock size={14} color="#d97706" />
                        : <AlertCircle size={14} color="#dc2626" />}
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: bill.payment_status === 'paid' ? '#16a34a' : bill.payment_status === 'partially_paid' ? '#d97706' : '#dc2626' }}>
                        {(bill.payment_status || 'unpaid').replace('_', ' ').toUpperCase()}
                        {bill.payment_mode ? ` · ${bill.payment_mode}` : ''}
                      </Typography>
                    </Box>

                    {bill.notes && (
                      <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5, px: 1.5, py: 1 }}>
                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', mb: 0.3 }}>NOTES</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#475569' }}>{bill.notes}</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Totals block */}
                  <Box sx={{ px: 2.5, py: 2 }}>
                    {[
                      { label: 'Subtotal', value: `₹${fmt(subtotal)}` },
                      disc > 0 && { label: 'Discount', value: `- ₹${fmt(disc)}`, color: '#16a34a' },
                      addChg > 0 && { label: 'Additional Charges', value: `+ ₹${fmt(addChg)}` },
                      { label: 'Taxable Amount', value: `₹${fmt(taxable)}` },
                      isIGST
                        ? { label: 'IGST', value: `₹${fmt(bill.igst_amount || 0)}`, color: '#7c3aed' }
                        : null,
                      !isIGST && parseFloat(bill.cgst_amount || 0) > 0
                        ? { label: `CGST`, value: `₹${fmt(bill.cgst_amount || 0)}`, color: '#7c3aed' }
                        : null,
                      !isIGST && parseFloat(bill.sgst_amount || 0) > 0
                        ? { label: `SGST`, value: `₹${fmt(bill.sgst_amount || 0)}`, color: '#7c3aed' }
                        : null,
                      { label: 'Grand Total', value: `₹${fmt(grandTotal)}`, bold: true, big: true },
                      { label: 'Amount Paid', value: `₹${fmt(paid)}`, color: '#16a34a' },
                      balance > 0 && { label: 'Balance Due', value: `₹${fmt(balance)}`, color: '#dc2626', bold: true }
                    ].filter(Boolean).map((row, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          py: row.big ? 1 : 0.5,
                          px: 1,
                          mb: 0.2,
                          borderRadius: 1,
                          bgcolor: row.big ? '#0f172a' : 'transparent',
                          borderTop: row.big ? 'none' : 'none'
                        }}
                      >
                        <Typography sx={{
                          fontSize: row.big ? '0.88rem' : '0.78rem',
                          fontWeight: row.bold ? 800 : 500,
                          color: row.big ? '#94a3b8' : '#475569'
                        }}>
                          {row.label}
                        </Typography>
                        <Typography sx={{
                          fontSize: row.big ? '1rem' : '0.82rem',
                          fontWeight: row.bold ? 900 : 600,
                          color: row.big ? '#fff' : (row.color || '#0f172a')
                        }}>
                          {row.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* ─── FOOTER ─── */}
                <Box sx={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 0, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc'
                }}>
                  {/* Bank details */}
                  <Box sx={{ px: 2.5, py: 2, borderRight: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', mb: 0.8 }}>
                      Bank Details
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#475569', whiteSpace: 'pre-line' }}>
                      {branding?.bank_name || 'Contact us for payment details.'}
                    </Typography>
                  </Box>

                  {/* Terms */}
                  <Box sx={{ px: 2.5, py: 2, borderRight: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', mb: 0.8 }}>
                      Terms & Conditions
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#475569', whiteSpace: 'pre-line' }}>
                      {branding?.terms_conditions || 'Payment as per agreed terms.'}
                    </Typography>
                  </Box>

                  {/* Signature */}
                  <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', mb: 3 }}>
                      Authorised Signatory
                    </Typography>
                    <Divider sx={{ width: '100%', mb: 0.5, borderColor: '#0f172a' }} />
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                      {branding?.restaurant_name || ''}
                    </Typography>
                  </Box>
                </Box>

                {/* Computer generated */}
                <Box sx={{
                  textAlign: 'center', py: 1, bgcolor: '#0f172a'
                }}>
                  <Typography sx={{ fontSize: '0.68rem', color: '#475569' }}>
                    This is a computer generated bill.
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <EmailDialog
        open={emailOpen}
        bill={bill}
        branding={branding}
        onClose={() => setEmailOpen(false)}
        onSent={() => { setEmailOpen(false); if (onRefresh) onRefresh(); }}
      />
    </>
  );
}
