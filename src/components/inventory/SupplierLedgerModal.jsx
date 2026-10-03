import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper, Chip,
  CircularProgress, IconButton, Grid, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert,
  Divider, Tooltip
} from '@mui/material';
import {
  X, BookOpen, Printer, Download, DollarSign,
  ArrowRightLeft, Filter, RefreshCw, Share2, Mail,
  Send, FileText, FileSpreadsheet, MessageSquare, ExternalLink
} from 'lucide-react';
import { apiFetch, downloadFile } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import SupplierPaymentModal from '../finance/SupplierPaymentModal';
import { getISTDateString, getFirstDayOfCurrentMonthIST, getPastISTDateString } from '../../utils/dateUtils';
import AdjustSupplierAdvanceModal from '../finance/AdjustSupplierAdvanceModal';

function txTypeChip(type) {
  const map = {
    PURCHASE_BILL:      { label: 'Purchase Bill', color: 'error' },
    PAYMENT:            { label: 'Payment',       color: 'success' },
    PURCHASE_RETURN:    { label: 'Return',        color: 'warning' },
    OPENING_BALANCE:    { label: 'Opening Bal',   color: 'default' },
    SUPPLIER_ADVANCE:   { label: 'Advance Paid',  color: 'info' },
    ADVANCE_ADJUSTMENT: { label: 'Advance Offset',color: 'secondary' },
    ADJUSTMENT:         { label: 'Adjustment',    color: 'default' }
  };
  const m = map[type] || { label: type, color: 'default' };
  return <Chip label={m.label} color={m.color} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />;
}

export default function SupplierLedgerModal({ open, onClose, supplier: propSupplier, onPaymentRecorded }) {
  const notify = useNotify();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');

  // Sub-Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  // Share Statement States
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState('pdf'); // 'pdf' | 'excel'
  const [shareChannel, setShareChannel] = useState('email'); // 'email' | 'whatsapp'
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingDownload, setGeneratingDownload] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!propSupplier?.id) return;
    setLoading(true);
    try {
      let q = [];
      if (dateFrom) q.push(`date_from=${dateFrom}`);
      if (dateTo) q.push(`date_to=${dateTo}`);
      if (txTypeFilter && txTypeFilter !== 'all') q.push(`transaction_type=${txTypeFilter}`);
      const qs = q.length > 0 ? `?${q.join('&')}` : '';

      const res = await apiFetch(`/api/inventory/suppliers/${propSupplier.id}/ledger-statement${qs}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to load ledger', 'Error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [propSupplier, dateFrom, dateTo, txTypeFilter, notify]);

  useEffect(() => {
    if (open && propSupplier?.id) {
      setDateFrom('');
      setDateTo('');
      setTxTypeFilter('all');
      loadLedger();
    }
  }, [open, propSupplier]);

  // Quick Date Preset
  const handlePreset = (preset) => {
    if (preset === 'month') {
      setDateFrom(getFirstDayOfCurrentMonthIST());
      setDateTo(getISTDateString());
    } else if (preset === '30days') {
      setDateFrom(getPastISTDateString(30));
      setDateTo(getISTDateString());
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!ledgerData?.ledger || ledgerData.ledger.length === 0) {
      notify.warning('No ledger entries to export.', 'Notice');
      return;
    }

    const headers = ['Date', 'Type', 'Reference', 'Payment Mode', 'Notes', 'Debit (+)', 'Credit (-)', 'Balance After'];
    const rows = ledgerData.ledger.map(entry => [
      `"${new Date(entry.created_at).toLocaleDateString('en-IN')}"`,
      `"${entry.transaction_type}"`,
      `"${entry.reference_number || ''}"`,
      `"${entry.payment_mode || ''}"`,
      `"${(entry.notes || '').replace(/"/g, '""')}"`,
      parseFloat(entry.debit || 0) ? parseFloat(entry.debit).toFixed(2) : '0.00',
      parseFloat(entry.credit || 0) ? parseFloat(entry.credit).toFixed(2) : '0.00',
      parseFloat(entry.balance_after || 0).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Supplier_Ledger_${propSupplier.name}_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success('Supplier statement exported to CSV.', 'Exported');
  };

  // Helper to compile active filter query params
  const getFilterQueryString = () => {
    let q = [];
    if (dateFrom) q.push(`date_from=${encodeURIComponent(dateFrom)}`);
    if (dateTo) q.push(`date_to=${encodeURIComponent(dateTo)}`);
    if (txTypeFilter && txTypeFilter !== 'all') q.push(`transaction_type=${encodeURIComponent(txTypeFilter)}`);
    return q.length > 0 ? `?${q.join('&')}` : '';
  };

  // Open Share Dialog with pre-filled supplier contact details
  const handleOpenShareModal = () => {
    const supp = ledgerData?.supplier || propSupplier || {};
    const sum = ledgerData?.summary || { closing_balance: 0 };
    setShareFormat('pdf');
    setShareChannel('email');
    setRecipientEmail(supp.email || '');
    setRecipientPhone(supp.mobile || '');
    setEmailSubject(`Supplier Statement of Account - ${supp.name || 'Vendor'}`);
    setEmailMessage(
      `Dear ${supp.name || 'Vendor'},\n\nPlease find attached your Statement of Account for the period ${dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN') : 'Inception'} to ${dateTo ? new Date(dateTo).toLocaleDateString('en-IN') : 'Present'}.\n\nClosing Balance: ₹${parseFloat(sum.closing_balance || 0).toFixed(2)}\n\nThank you for your business.\n\nRegards,\nAriso Retail`
    );
    setShareModalOpen(true);
  };

  // Download PDF or Excel directly respecting current active filters
  const handleDownloadStatement = async (format = shareFormat) => {
    if (!propSupplier?.id) return false;
    setGeneratingDownload(true);
    try {
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const endpoint = `/api/inventory/suppliers/${propSupplier.id}/ledger-statement/${format === 'excel' ? 'excel' : 'pdf'}${getFilterQueryString()}`;
      const filename = `Supplier_Statement_${(propSupplier.name || 'Account').replace(/[^a-zA-Z0-9_-]/g, '_')}_${getISTDateString()}.${ext}`;
      await downloadFile(endpoint, filename);
      notify.success(`Supplier statement downloaded as ${ext.toUpperCase()}.`, 'Download Complete');
      return true;
    } catch (err) {
      notify.error(err.message || 'Failed to download statement.', 'Download Error');
      return false;
    } finally {
      setGeneratingDownload(false);
    }
  };

  // Send Email with attached statement (PDF/Excel)
  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      notify.error('Recipient email address is required.', 'Email Required');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await apiFetch(`/api/inventory/suppliers/${propSupplier.id}/ledger-statement/email${getFilterQueryString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail.trim(),
          subject: emailSubject,
          message: emailMessage,
          format: shareFormat
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send statement email');
      notify.success(data.message || `Statement emailed successfully to ${recipientEmail}.`, 'Email Sent');
      setShareModalOpen(false);
    } catch (err) {
      notify.error(err.message, 'Email Error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Open default mail client (mailto:) with pre-filled subject/body after downloading file
  const handleOpenMailto = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      notify.error('Recipient email address is required.', 'Email Required');
      return;
    }
    await handleDownloadStatement(shareFormat);
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`;
    window.location.href = mailtoUrl;
    notify.info('Statement file downloaded. Mail client opened with pre-filled details — please attach the downloaded file.', 'Mail App Opened');
  };

  // WhatsApp Share with pre-filled summary and downloaded attachment ready
  const handleShareWhatsApp = async () => {
    const supp = ledgerData?.supplier || propSupplier || {};
    const sum = ledgerData?.summary || { opening_balance: 0, total_debit: 0, total_credit: 0, closing_balance: 0, advance_balance: 0 };
    const entriesCount = ledgerData?.ledger?.length || 0;

    await handleDownloadStatement(shareFormat);

    const periodStr = `${dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN') : 'Inception'} to ${dateTo ? new Date(dateTo).toLocaleDateString('en-IN') : 'Present'}`;
    const filterStr = txTypeFilter && txTypeFilter !== 'all' ? `\n*Transaction Type:* ${txTypeFilter.replace(/_/g, ' ')}` : '';

    const lines = [
      `*SUPPLIER STATEMENT OF ACCOUNT*`,
      `*Ariso Retail POS*`,
      `--------------------------------`,
      `*Supplier:* ${supp.name} ${supp.company_name ? `(${supp.company_name})` : ''}`,
      `*Code:* ${supp.supplier_code || `SUPP-${supp.id}`}`,
      `*Period:* ${periodStr}${filterStr}`,
      `--------------------------------`,
      `*Opening Balance:* ₹${parseFloat(sum.opening_balance || 0).toFixed(2)}`,
      `*Total Invoiced (Debit):* +₹${parseFloat(sum.total_debit || 0).toFixed(2)}`,
      `*Total Settled (Credit):* -₹${parseFloat(sum.total_credit || 0).toFixed(2)}`,
      `*Closing Outstanding:* ₹${parseFloat(sum.closing_balance || 0).toFixed(2)}`,
      `*Available Advance:* ₹${parseFloat(sum.advance_balance || 0).toFixed(2)}`,
      `--------------------------------`,
      `*Transactions:* ${entriesCount} recorded`,
      entriesCount === 0 ? `_No transactions recorded for this supplier matching the selected filters._\n` : '',
      `_The complete statement document (${shareFormat.toUpperCase()}) has been downloaded to attach._`
    ].filter(Boolean);

    const message = lines.join('\n');
    const cleanPhone = (recipientPhone || '').replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    const waUrl = targetPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    notify.success('Statement file downloaded. WhatsApp chat opened with pre-filled summary.', 'WhatsApp Share Ready');
    setShareModalOpen(false);
  };

  // Print Supplier Statement
  const handlePrintStatement = () => {
    if (!ledgerData?.ledger) return;

    const supp = ledgerData.supplier;
    const summary = ledgerData.summary;

    const printWin = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Statement - ${supp.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; }
          .summary-grid { display: flex; gap: 15px; margin-bottom: 20px; }
          .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .card-val { font-size: 18px; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .debit { color: #dc2626; font-weight: 700; }
          .credit { color: #16a34a; font-weight: 700; }
          .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SUPPLIER STATEMENT OF ACCOUNT</div>
            <div style="font-size: 15px; font-weight: 700; margin-top: 5px;">${supp.name} ${supp.company_name ? `(${supp.company_name})` : ''}</div>
            <div style="font-size: 12px; color: #64748b;">Code: ${supp.supplier_code} | GSTIN: ${supp.gst_number || 'N/A'} | Mobile: ${supp.mobile || 'N/A'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 14px;">Ariso Retail POS</div>
            <div style="font-size: 12px; color: #64748b;">Statement Date: ${new Date().toLocaleDateString('en-IN')}</div>
            <div style="font-size: 12px; color: #64748b;">Period: ${dateFrom || 'Inception'} to ${dateTo || 'Present'}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-title">Opening Balance</div>
            <div class="card-val">₹${summary.opening_balance.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Invoiced (Debit)</div>
            <div class="card-val" style="color: #dc2626;">+₹${summary.total_debit.toFixed(2)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Settled (Credit)</div>
            <div class="card-val" style="color: #16a34a;">-₹${summary.total_credit.toFixed(2)}</div>
          </div>
          <div class="card" style="border-left: 4px solid #dc2626;">
            <div class="card-title">Closing Outstanding</div>
            <div class="card-val" style="color: ${summary.closing_balance > 0 ? '#dc2626' : '#16a34a'};">
              ₹${summary.closing_balance.toFixed(2)}
            </div>
          </div>
          <div class="card" style="border-left: 4px solid #10b981;">
            <div class="card-title">Supplier Advance</div>
            <div class="card-val" style="color: #059669;">₹${summary.advance_balance.toFixed(2)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction</th>
              <th>Reference</th>
              <th>Mode</th>
              <th>Notes</th>
              <th class="text-right">Debit (+)</th>
              <th class="text-right">Credit (-)</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerData.ledger.map(row => `
              <tr>
                <td>${new Date(row.created_at).toLocaleDateString('en-IN')}</td>
                <td><strong>${row.transaction_type.replace(/_/g, ' ')}</strong></td>
                <td>${row.reference_number || '—'}</td>
                <td>${row.payment_mode || '—'}</td>
                <td>${row.notes || '—'}</td>
                <td class="text-right ${row.debit ? 'debit' : ''}">${parseFloat(row.debit || 0) ? '₹' + parseFloat(row.debit).toFixed(2) : '—'}</td>
                <td class="text-right ${row.credit ? 'credit' : ''}">${parseFloat(row.credit || 0) ? '₹' + parseFloat(row.credit).toFixed(2) : '—'}</td>
                <td class="text-right" style="font-weight: 800;">₹${parseFloat(row.balance_after || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Ariso Retail Management System.
        </div>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  if (!propSupplier) return null;

  const supplier = ledgerData?.supplier || propSupplier;
  const summary = ledgerData?.summary || {
    opening_balance: parseFloat(supplier.opening_balance || 0),
    total_debit: 0,
    total_credit: 0,
    closing_balance: parseFloat(supplier.current_balance || 0),
    advance_balance: parseFloat(supplier.advance_balance || 0)
  };
  const entries = ledgerData?.ledger || [];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '95vh' } } }}
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#e0f2fe', color: '#0284c7' }}>
                <BookOpen size={22} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Supplier Statement of Account
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {supplier.name} {supplier.company_name ? `(${supplier.company_name})` : ''} • Code: {supplier.supplier_code || `SUPP-${supplier.id}`}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Printer size={14} />}
                onClick={handlePrintStatement}
                sx={{ fontWeight: 700 }}
              >
                Print
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={14} />}
                onClick={handleExportCSV}
                sx={{ fontWeight: 700 }}
              >
                CSV
              </Button>
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={<Share2 size={14} />}
                onClick={handleOpenShareModal}
                sx={{ fontWeight: 700, px: 1.5 }}
              >
                Share
              </Button>
              <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Summary KPI Strip */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Opening Balance
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ₹{summary.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Invoiced (Debit)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#dc2626' }}>
                  +₹{summary.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Settled (Credit)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a' }}>
                  -₹{summary.total_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 2.4 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: summary.closing_balance > 0 ? '#fef2f2' : '#f0fdf4',
                  borderColor: summary.closing_balance > 0 ? '#fca5a5' : '#86efac'
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Closing Outstanding
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: summary.closing_balance > 0 ? '#dc2626' : '#16a34a' }}>
                  ₹{summary.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 2.4 }}>
              <Paper
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#86efac' }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Available Advance
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
                  ₹{summary.advance_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Filter Toolbar */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  label="From Date"
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  label="To Date"
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Transaction Type</InputLabel>
                  <Select
                    value={txTypeFilter}
                    label="Transaction Type"
                    onChange={e => setTxTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Transactions</MenuItem>
                    <MenuItem value="PURCHASE_BILL">Purchase Bills</MenuItem>
                    <MenuItem value="PAYMENT">Payments</MenuItem>
                    <MenuItem value="PURCHASE_RETURN">Returns</MenuItem>
                    <MenuItem value="SUPPLIER_ADVANCE">Advances</MenuItem>
                    <MenuItem value="ADVANCE_ADJUSTMENT">Advance Offsets</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={loadLedger}
                    startIcon={<RefreshCw size={14} />}
                    sx={{ fontWeight: 700 }}
                  >
                    Apply
                  </Button>
                  <Button size="small" variant="text" onClick={() => handlePreset('30days')}>
                    30D
                  </Button>
                  <Button size="small" variant="text" onClick={() => handlePreset('month')}>
                    Month
                  </Button>
                  <Button size="small" variant="text" onClick={() => handlePreset('all')}>
                    All
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Ledger Journal Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : entries.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No transactions recorded for this supplier matching the selected filters.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Transaction Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mode / User</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>
                      Debit (+ Payable)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      Credit (- Paid)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Balance (₹)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow key={entry.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>{txTypeChip(entry.transaction_type)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {entry.reference_number || '—'}
                      </TableCell>
                      <TableCell>
                        {entry.payment_mode ? (
                          <Chip label={entry.payment_mode} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {entry.notes || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(entry.debit || 0) ? (
                          <Typography sx={{ fontWeight: 700, color: '#dc2626' }}>
                            +₹{parseFloat(entry.debit).toFixed(2)}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(entry.credit || 0) ? (
                          <Typography sx={{ fontWeight: 700, color: '#16a34a' }}>
                            -₹{parseFloat(entry.credit).toFixed(2)}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        ₹{parseFloat(entry.balance_after || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', gap: 1 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>

          {summary.advance_balance > 0 && summary.closing_balance > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ArrowRightLeft size={16} />}
              onClick={() => setAdvanceModalOpen(true)}
              sx={{ fontWeight: 700 }}
            >
              Adjust Advance
            </Button>
          )}

          <Button
            variant="contained"
            color="success"
            startIcon={<DollarSign size={16} />}
            onClick={() => setPaymentModalOpen(true)}
            sx={{ fontWeight: 800 }}
          >
            Pay Supplier
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Supplier Modal */}
      {paymentModalOpen && (
        <SupplierPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          supplier={supplier}
          onPaymentSuccess={(p) => {
            loadLedger();
            if (onPaymentRecorded) onPaymentRecorded(p);
          }}
        />
      )}

      {/* Adjust Advance Modal */}
      {advanceModalOpen && (
        <AdjustSupplierAdvanceModal
          open={advanceModalOpen}
          onClose={() => setAdvanceModalOpen(false)}
          supplier={supplier}
          onAdvanceAdjusted={() => {
            loadLedger();
            if (onPaymentRecorded) onPaymentRecorded();
          }}
        />
      )}

      {/* Share Statement Modal */}
      <Dialog
        open={shareModalOpen}
        onClose={() => !sendingEmail && !generatingDownload && setShareModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Share2 size={20} color="var(--mui-palette-primary-main, #1976d2)" />
              Share Statement of Account
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {supplier.name} {supplier.company_name ? `(${supplier.company_name})` : ''} • Filters:{' '}
              {dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN') : 'All'} to{' '}
              {dateTo ? new Date(dateTo).toLocaleDateString('en-IN') : 'All'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setShareModalOpen(false)}
            disabled={sendingEmail || generatingDownload}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Step 1: Format Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.2 }}>
              1. Select Document Format
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setShareFormat('pdf')}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderWidth: 2,
                    borderColor: shareFormat === 'pdf' ? 'primary.main' : 'divider',
                    bgcolor: shareFormat === 'pdf' ? 'action.selected' : 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { borderColor: 'primary.light' }
                  }}
                >
                  <FileText size={28} color={shareFormat === 'pdf' ? '#d32f2f' : '#757575'} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      PDF Statement
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                      Branded document with summary cards & table
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Paper
                  variant="outlined"
                  onClick={() => setShareFormat('excel')}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderWidth: 2,
                    borderColor: shareFormat === 'excel' ? 'primary.main' : 'divider',
                    bgcolor: shareFormat === 'excel' ? 'action.selected' : 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { borderColor: 'primary.light' }
                  }}
                >
                  <FileSpreadsheet size={28} color={shareFormat === 'excel' ? '#2e7d32' : '#757575'} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Excel (.xlsx)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                      Spreadsheet workbook matching CSV data
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Step 2: Channel Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.2 }}>
              2. Select Sharing Channel
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant={shareChannel === 'email' ? 'contained' : 'outlined'}
                color="primary"
                startIcon={<Mail size={16} />}
                onClick={() => setShareChannel('email')}
                sx={{ flex: 1, py: 1, borderRadius: 2, fontWeight: 700 }}
              >
                Email
              </Button>
              <Button
                variant={shareChannel === 'whatsapp' ? 'contained' : 'outlined'}
                color="success"
                startIcon={<MessageSquare size={16} />}
                onClick={() => setShareChannel('whatsapp')}
                sx={{ flex: 1, py: 1, borderRadius: 2, fontWeight: 700 }}
              >
                WhatsApp
              </Button>
            </Box>
          </Box>

          {/* Channel Form Details */}
          {shareChannel === 'email' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Recipient Email Address"
                size="small"
                fullWidth
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="supplier@example.com"
                helperText={
                  supplier.email
                    ? `Pre-filled from supplier profile (${supplier.email})`
                    : 'No email on file. Please enter recipient email.'
                }
              />
              <TextField
                label="Email Subject"
                size="small"
                fullWidth
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <TextField
                label="Email Message / Note"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
              <Alert severity="info" sx={{ py: 0.5, fontSize: '0.8rem' }}>
                The statement will be attached as a <strong>.{shareFormat === 'excel' ? 'xlsx' : 'pdf'}</strong> file. You can send it directly through the application or launch your system mail client.
              </Alert>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Supplier WhatsApp Number"
                size="small"
                fullWidth
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                helperText={
                  supplier.mobile
                    ? `Pre-filled from supplier profile (${supplier.mobile})`
                    : 'No phone on file. Please enter 10-digit mobile number.'
                }
              />
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  WhatsApp Message Preview:
                </Typography>
                <Typography variant="caption" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace', color: 'success.main' }}>
                  {`*SUPPLIER STATEMENT OF ACCOUNT*\nSupplier: ${supplier.name}\nPeriod: ${dateFrom || 'Inception'} to ${dateTo || 'Present'}\nClosing Outstanding: ₹${(summary?.closing_balance || 0).toFixed(2)}\n\n_Statement (${shareFormat.toUpperCase()}) will be downloaded to attach in chat._`}
                </Typography>
              </Paper>
              <Alert severity="success" sx={{ py: 0.5, fontSize: '0.8rem' }}>
                Clicking <strong>Share on WhatsApp</strong> will automatically download the <strong>.{shareFormat === 'excel' ? 'xlsx' : 'pdf'}</strong> file and open WhatsApp with your recipient and message pre-filled.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="text"
            size="small"
            onClick={() => handleDownloadStatement(shareFormat)}
            disabled={generatingDownload || sendingEmail}
            startIcon={<Download size={14} />}
          >
            {generatingDownload ? 'Downloading...' : `Download ${shareFormat.toUpperCase()} Only`}
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShareModalOpen(false)}
              disabled={sendingEmail || generatingDownload}
            >
              Cancel
            </Button>

            {shareChannel === 'email' ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenMailto}
                  disabled={sendingEmail || generatingDownload}
                  startIcon={<ExternalLink size={14} />}
                >
                  Mail App
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  onClick={handleSendEmail}
                  disabled={sendingEmail || generatingDownload}
                  startIcon={sendingEmail ? <CircularProgress size={14} color="inherit" /> : <Send size={14} />}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                size="small"
                color="success"
                onClick={handleShareWhatsApp}
                disabled={generatingDownload}
                startIcon={generatingDownload ? <CircularProgress size={14} color="inherit" /> : <MessageSquare size={14} />}
              >
                {generatingDownload ? 'Preparing File...' : 'Share on WhatsApp'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}
