import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper, Chip,
  CircularProgress, IconButton, Grid, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import {
  X, BookOpen, Printer, Download, DollarSign,
  ArrowRightLeft, Filter, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
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
      entry.debit ? entry.debit.toFixed(2) : '0.00',
      entry.credit ? entry.credit.toFixed(2) : '0.00',
      entry.balance_after.toFixed(2)
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
                <td class="text-right ${row.debit ? 'debit' : ''}">${row.debit ? '₹' + row.debit.toFixed(2) : '—'}</td>
                <td class="text-right ${row.credit ? 'credit' : ''}">${row.credit ? '₹' + row.credit.toFixed(2) : '—'}</td>
                <td class="text-right" style="font-weight: 800;">₹${row.balance_after.toFixed(2)}</td>
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
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '95vh' } }}
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
              <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Summary KPI Strip */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Opening Balance
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ₹{summary.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Invoiced (Debit)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#dc2626' }}>
                  +₹{summary.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Settled (Credit)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a' }}>
                  -₹{summary.total_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
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
            <Grid item xs={12} sm={2.4}>
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
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  label="From Date"
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="To Date"
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
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
              <Grid item xs={12} sm={3}>
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
                        {entry.debit ? (
                          <Typography sx={{ fontWeight: 700, color: '#dc2626' }}>
                            +₹{entry.debit.toFixed(2)}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {entry.credit ? (
                          <Typography sx={{ fontWeight: 700, color: '#16a34a' }}>
                            -₹{entry.credit.toFixed(2)}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        ₹{entry.balance_after.toFixed(2)}
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
    </>
  );
}
