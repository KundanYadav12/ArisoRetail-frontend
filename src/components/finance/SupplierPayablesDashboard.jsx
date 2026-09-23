import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Paper, Grid, Table,
  TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip, CircularProgress, IconButton, TextField, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, Pagination, Tooltip
} from '@mui/material';
import {
  Search, RefreshCw, Download, Printer, DollarSign,
  BookOpen, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Building2, Calendar, Filter, Clock, CheckCircle2,
  TrendingDown, TrendingUp, Sparkles, ArrowRightLeft
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import SupplierPaymentModal from './SupplierPaymentModal';
import AdjustSupplierAdvanceModal from './AdjustSupplierAdvanceModal';
import SupplierLedgerModal from '../inventory/SupplierLedgerModal';
import { getISTDateString } from '../../utils/dateUtils';

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Outstanding', value: 'outstanding', color: 'error' },
  { label: 'Overdue', value: 'overdue', color: 'error' },
  { label: 'Due Today', value: 'due_today', color: 'warning' },
  { label: 'Due This Week', value: 'due_week', color: 'warning' },
  { label: 'Partially Paid', value: 'partially_paid', color: 'info' },
  { label: 'Advances', value: 'advance', color: 'success' },
  { label: 'Paid', value: 'paid', color: 'default' }
];

export default function SupplierPayablesDashboard() {
  const notify = useNotify();

  // State
  const [data, setData] = useState({
    summary: {
      total_payables: 0,
      total_overdue: 0,
      total_paid: 0,
      total_advances: 0,
      total_suppliers: 0,
      overdue_suppliers_count: 0
    },
    pagination: { total: 0, page: 1, limit: 25, pages: 1 },
    suppliers: []
  });

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('highest_outstanding');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Sub-Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState(null);

  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState(null);

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [selectedSupplierForAdvance, setSelectedSupplierForAdvance] = useState(null);

  // Debounced search
  const debounceTimer = useRef(null);

  const fetchDashboard = useCallback(async (customPage = page) => {
    setLoading(true);
    try {
      const q = [
        `page=${customPage}`,
        `limit=${limit}`,
        `sort_by=${sortBy}`,
        `status=${statusFilter}`
      ];
      if (search.trim()) q.push(`search=${encodeURIComponent(search.trim())}`);

      const res = await apiFetch(`/api/inventory/suppliers/outstanding?${q.join('&')}`);
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to load supplier payables', 'Error');
      }
    } catch (err) {
      console.error(err);
      notify.error('Network error loading supplier payables', 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, statusFilter, search, notify]);

  useEffect(() => {
    fetchDashboard(1);
    setPage(1);
  }, [statusFilter, sortBy, limit]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchDashboard(1);
    }, 350);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    fetchDashboard(value);
  };

  // CSV Export of Outstanding List
  const handleExportCSV = () => {
    if (!data.suppliers || data.suppliers.length === 0) {
      notify.warning('No supplier records to export.', 'Notice');
      return;
    }

    const headers = [
      'Supplier Code', 'Supplier Name', 'Company Name', 'Mobile', 'GSTIN',
      'Total Purchases', 'Total Billed (INR)', 'Total Paid (INR)',
      'Outstanding Balance (INR)', 'Overdue (INR)', 'Advance Balance (INR)',
      'Last Purchase Date', 'Last Payment Date', 'Status'
    ];

    const rows = data.suppliers.map(s => [
      `"${s.supplier_code}"`,
      `"${s.name}"`,
      `"${s.company_name || ''}"`,
      `"${s.mobile || ''}"`,
      `"${s.gst_number || ''}"`,
      s.total_purchases,
      s.total_billed_amount.toFixed(2),
      s.total_paid.toFixed(2),
      s.outstanding_amount.toFixed(2),
      s.overdue_amount.toFixed(2),
      s.advance_amount.toFixed(2),
      `"${s.last_purchase_date ? new Date(s.last_purchase_date).toLocaleDateString('en-IN') : 'N/A'}"`,
      `"${s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString('en-IN') : 'N/A'}"`,
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Supplier_Outstanding_Report_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success('Supplier outstanding report exported to CSV.', 'Exported');
  };

  // Print Outstanding Report
  const handlePrintReport = () => {
    const printWin = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Outstanding Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .title { font-size: 20px; font-weight: 800; }
          .kpi-row { display: flex; gap: 15px; margin-bottom: 20px; }
          .kpi { flex: 1; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: #f8fafc; }
          .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-val { font-size: 18px; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-red { color: #dc2626; font-weight: 700; }
          .text-green { color: #16a34a; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SUPPLIER PAYABLES & OUTSTANDING REPORT</div>
            <div style="font-size: 12px; color: #64748b;">Generated on ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString()}</div>
          </div>
          <div style="text-align: right; font-size: 12px;">
            <strong>Ariso Retail POS</strong><br>
            Filter: ${statusFilter.toUpperCase()} | Total Vendors: ${data.summary.total_suppliers}
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi">
            <div class="kpi-title">Total Payables</div>
            <div class="kpi-val" style="color: #dc2626;">₹${data.summary.total_payables.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Total Overdue</div>
            <div class="kpi-val" style="color: #ef4444;">₹${data.summary.total_overdue.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Total Settled</div>
            <div class="kpi-val" style="color: #16a34a;">₹${data.summary.total_paid.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-title">Total Advances</div>
            <div class="kpi-val" style="color: #059669;">₹${data.summary.total_advances.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Supplier Name</th>
              <th>Phone</th>
              <th class="text-right">Billed (₹)</th>
              <th class="text-right">Paid (₹)</th>
              <th class="text-right">Outstanding (₹)</th>
              <th class="text-right">Overdue (₹)</th>
              <th class="text-right">Advance (₹)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.suppliers.map(s => `
              <tr>
                <td>${s.supplier_code}</td>
                <td><strong>${s.name}</strong> ${s.company_name ? `(${s.company_name})` : ''}</td>
                <td>${s.mobile || '—'}</td>
                <td class="text-right">₹${s.total_billed_amount.toFixed(2)}</td>
                <td class="text-right">₹${s.total_paid.toFixed(2)}</td>
                <td class="text-right ${s.outstanding_amount > 0 ? 'text-red' : 'text-green'}">₹${s.outstanding_amount.toFixed(2)}</td>
                <td class="text-right ${s.overdue_amount > 0 ? 'text-red' : ''}">${s.overdue_amount > 0 ? '₹' + s.overdue_amount.toFixed(2) : '—'}</td>
                <td class="text-right ${s.advance_amount > 0 ? 'text-green' : ''}">${s.advance_amount > 0 ? '₹' + s.advance_amount.toFixed(2) : '—'}</td>
                <td>${s.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
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

  const statusBadge = (st) => {
    switch (st) {
      case 'Overdue':
        return <Chip label="OVERDUE" size="small" color="error" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />;
      case 'Outstanding':
        return <Chip label="OUTSTANDING" size="small" sx={{ bgcolor: '#fed7aa', color: '#9a3412', fontWeight: 800, fontSize: '0.65rem' }} />;
      case 'Partially Paid':
        return <Chip label="PARTIALLY PAID" size="small" color="info" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />;
      case 'Advance':
        return <Chip label="ADVANCE CREDIT" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />;
      case 'Paid':
        return <Chip label="PAID" size="small" sx={{ bgcolor: '#e2e8f0', color: '#475569', fontWeight: 800, fontSize: '0.65rem' }} />;
      default:
        return <Chip label={st} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
      {/* Top Header & Quick Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#ecfdf5', color: '#059669' }}>
              <Building2 size={24} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                Supplier Payables & Outstanding
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Petpooja-style vendor ledger, multi-bill payment allocation, overdue aging & advance management
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Printer size={15} />}
            onClick={handlePrintReport}
            sx={{ fontWeight: 700 }}
          >
            Print Report
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={15} />}
            onClick={handleExportCSV}
            sx={{ fontWeight: 700 }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<DollarSign size={16} />}
            onClick={() => {
              setSelectedSupplierForPayment(null);
              setPaymentModalOpen(true);
            }}
            sx={{ fontWeight: 800, px: 2.5 }}
          >
            Pay Supplier
          </Button>
        </Box>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              borderLeft: '5px solid #dc2626',
              bgcolor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Payables
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#dc2626', mt: 0.5 }}>
              ₹{data.summary.total_payables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Net liability across {data.summary.total_suppliers} active suppliers
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              borderLeft: '5px solid #ef4444',
              bgcolor: data.summary.total_overdue > 0 ? '#fef2f2' : '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Overdue
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#ef4444', mt: 0.5 }}>
              ₹{data.summary.total_overdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: data.summary.overdue_suppliers_count > 0 ? '#dc2626' : 'text.secondary', fontWeight: 600 }}>
              {data.summary.overdue_suppliers_count} supplier(s) past due date
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              borderLeft: '5px solid #16a34a',
              bgcolor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Paid
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.5 }}>
              ₹{data.summary.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Settled against purchase bills & advances
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              borderLeft: '5px solid #059669',
              bgcolor: '#ecfdf5',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Total Advances
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#059669', mt: 0.5 }}>
              ₹{data.summary.total_advances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Available advance credit with suppliers
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f8fafc' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Quick Status Filter Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', mr: 0.5, textTransform: 'uppercase' }}>
              Status:
            </Typography>
            {STATUS_TABS.map(tab => {
              const isSelected = statusFilter === tab.value;
              return (
                <Chip
                  key={tab.value}
                  label={tab.label}
                  clickable
                  color={isSelected ? (tab.color || 'primary') : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  onClick={() => setStatusFilter(tab.value)}
                  sx={{
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.8rem',
                    borderRadius: 2
                  }}
                />
              );
            })}
          </Box>

          {/* Search, Sort, Limit Toolbar */}
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={5} md={5}>
              <TextField
                size="small"
                placeholder="Search by supplier, company, code, phone, GSTIN..."
                value={search}
                onChange={handleSearchChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#94a3b8" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={6} sm={3.5} md={3.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={e => setSortBy(e.target.value)}
                >
                  <MenuItem value="highest_outstanding">Highest Outstanding</MenuItem>
                  <MenuItem value="lowest_outstanding">Lowest Outstanding</MenuItem>
                  <MenuItem value="overdue">Highest Overdue</MenuItem>
                  <MenuItem value="latest_txn">Latest Transaction</MenuItem>
                  <MenuItem value="oldest_txn">Oldest Transaction</MenuItem>
                  <MenuItem value="name">Supplier Name (A-Z)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={4} sm={2} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Rows</InputLabel>
                <Select
                  value={limit}
                  label="Rows"
                  onChange={e => setLimit(e.target.value)}
                >
                  <MenuItem value={10}>10 rows</MenuItem>
                  <MenuItem value={25}>25 rows</MenuItem>
                  <MenuItem value={50}>50 rows</MenuItem>
                  <MenuItem value={100}>100 rows</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={2} sm={1.5} md={1.5}>
              <Button
                variant="outlined"
                onClick={() => fetchDashboard(page)}
                fullWidth
                size="small"
                startIcon={<RefreshCw size={14} />}
                sx={{ height: 40, fontWeight: 700 }}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Supplier Outstanding Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Supplier / Vendor</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Contact Details</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Purchases</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Total Billed</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Total Paid</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Outstanding (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Overdue (₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Advance (₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, minWidth: 190 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading supplier payables...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : data.suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                  No supplier records found matching the active filters.
                </TableCell>
              </TableRow>
            ) : (
              data.suppliers.map(s => {
                const isOverdue = s.overdue_amount > 0;
                const hasAdvance = s.advance_amount > 0;
                const hasOutstanding = s.outstanding_amount > 0;

                return (
                  <TableRow key={s.id} hover sx={{ '&:hover': { bgcolor: '#fbfcfd' } }}>
                    {/* Supplier Name & Code */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {s.name}
                          </Typography>
                          {s.company_name && (
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              {s.company_name}
                            </Typography>
                          )}
                          <Chip
                            label={s.supplier_code}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              mt: 0.2
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Contact & GSTIN */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {s.mobile || '—'}
                      </Typography>
                      {s.gst_number && (
                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', display: 'block' }}>
                          GST: {s.gst_number}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Total Purchases */}
                    <TableCell align="center">
                      <Chip
                        label={`${s.total_purchases} bills`}
                        size="small"
                        sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    {/* Billed */}
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ₹{s.total_billed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Paid */}
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#16a34a' }}>
                      ₹{s.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Outstanding */}
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 900, color: hasOutstanding ? '#dc2626' : '#16a34a' }}>
                        ₹{s.outstanding_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>

                    {/* Overdue */}
                    <TableCell align="right">
                      {isOverdue ? (
                        <Typography sx={{ fontWeight: 800, color: '#ef4444' }}>
                          ₹{s.overdue_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>

                    {/* Advance */}
                    <TableCell align="right">
                      {hasAdvance ? (
                        <Typography sx={{ fontWeight: 800, color: '#059669' }}>
                          ₹{s.advance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell align="center">
                      {statusBadge(s.status)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => {
                            setSelectedSupplierForPayment(s);
                            setPaymentModalOpen(true);
                          }}
                          sx={{ fontSize: '0.7rem', fontWeight: 800, px: 1 }}
                        >
                          Pay
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          onClick={() => {
                            setSelectedSupplierForLedger(s);
                            setLedgerModalOpen(true);
                          }}
                          sx={{ fontSize: '0.7rem', fontWeight: 700, px: 1 }}
                        >
                          Ledger
                        </Button>

                        {hasAdvance && hasOutstanding && (
                          <Tooltip title="Adjust advance balance against unpaid bills">
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              onClick={() => {
                                setSelectedSupplierForAdvance(s);
                                setAdvanceModalOpen(true);
                              }}
                              sx={{ fontSize: '0.7rem', fontWeight: 700, px: 0.8 }}
                            >
                              Offset
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Footer */}
      {data.pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Showing {data.suppliers.length} of {data.pagination.total} suppliers
          </Typography>
          <Pagination
            count={data.pagination.pages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Box>
      )}

      {/* Pay Supplier Modal */}
      {paymentModalOpen && (
        <SupplierPaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          supplier={selectedSupplierForPayment}
          onPaymentSuccess={() => fetchDashboard(page)}
        />
      )}

      {/* Detailed Supplier Ledger Modal */}
      {ledgerModalOpen && (
        <SupplierLedgerModal
          open={ledgerModalOpen}
          onClose={() => setLedgerModalOpen(false)}
          supplier={selectedSupplierForLedger}
          onPaymentRecorded={() => fetchDashboard(page)}
        />
      )}

      {/* Adjust Advance Modal */}
      {advanceModalOpen && (
        <AdjustSupplierAdvanceModal
          open={advanceModalOpen}
          onClose={() => setAdvanceModalOpen(false)}
          supplier={selectedSupplierForAdvance}
          onAdvanceAdjusted={() => fetchDashboard(page)}
        />
      )}
    </Box>
  );
}
