import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField, Select,
  MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs,
  Tab, IconButton, CircularProgress, Tooltip, FormControl, InputLabel,
  Switch, FormControlLabel, Divider, Alert, InputAdornment, TablePagination
} from '@mui/material';
import {
  Landmark, Wallet, CreditCard, ArrowRightLeft, Receipt, Plus, Search,
  Filter, CheckCircle, CheckCircle2, XCircle, Calendar, Download, RefreshCw,
  Edit2, Building2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  FileSpreadsheet, ShieldAlert, Check, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import ExpenseManagementSuite from './ExpenseManagementSuite';
import { getISTDateString } from '../../utils/dateUtils';

export default function FinancialAccountsSuite() {
  const notify = useNotify();

  // Tab State: 0 = Accounts, 1 = Ledger & Reconciliation, 2 = Payment Mappings, 3 = Contra Transfers, 4 = Expenses
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState({
    total_accounts: 0,
    cash_balance: 0,
    bank_balance: 0,
    total_balance: 0,
    total_inflow: 0,
    total_outflow: 0,
    today_inflow: 0,
    today_outflow: 0
  });

  // Accounts State
  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    account_type: 'bank',
    ifsc_code: '',
    branch_name: '',
    opening_balance: '0',
    opening_balance_date: getISTDateString(),
    is_active: 1,
    notes: ''
  });

  // Payment Mappings State
  const [mappings, setMappings] = useState([]);
  const [savingMapping, setSavingMapping] = useState(null);

  // Ledger & Statement Reconciliation State
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState('');
  const [ledgerData, setLedgerData] = useState({ transactions: [], summary: {} });
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerPaymentMode, setLedgerPaymentMode] = useState('');
  const [ledgerReconciledFilter, setLedgerReconciledFilter] = useState('');
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState(25);
  const [statementBalanceInput, setStatementBalanceInput] = useState('');

  // Contra Transfers State
  const [transfers, setTransfers] = useState([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    transfer_date: getISTDateString(),
    reference_number: '',
    notes: ''
  });

  // Expenses State
  const [expenses, setExpenses] = useState([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    category: 'Rent',
    amount: '',
    account_id: '',
    payment_mode: 'cash',
    expense_date: getISTDateString(),
    payee: '',
    reference_number: '',
    notes: ''
  });

  // Formatting helpers
  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Fetch Dashboard Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('[FinancialAccountsSuite.fetchSummary error]:', err);
    }
  }, []);

  // 2. Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/finance/accounts?search=${encodeURIComponent(accountSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('[FinancialAccountsSuite.fetchAccounts error]:', err);
      notify?.('Failed to load financial accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [accountSearch, notify]);

  // 3. Fetch Payment Mappings
  const fetchMappings = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/mappings');
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings || []);
      }
    } catch (err) {
      console.error('[FinancialAccountsSuite.fetchMappings error]:', err);
    }
  }, []);

  // 4. Fetch Ledger
  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/finance/ledger?limit=${ledgerRowsPerPage}&offset=${ledgerPage * ledgerRowsPerPage}`;
      if (selectedLedgerAccountId) url += `&account_id=${selectedLedgerAccountId}`;
      if (ledgerDateFrom) url += `&dateFrom=${ledgerDateFrom} 00:00:00`;
      if (ledgerDateTo) url += `&dateTo=${ledgerDateTo} 23:59:59`;
      if (ledgerType) url += `&transactionType=${ledgerType}`;
      if (ledgerPaymentMode) url += `&paymentMode=${ledgerPaymentMode}`;
      if (ledgerReconciledFilter !== '') url += `&reconciled=${ledgerReconciledFilter}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
      }
    } catch (err) {
      console.error('[FinancialAccountsSuite.fetchLedger error]:', err);
      notify?.('Failed to load transaction ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedLedgerAccountId, ledgerDateFrom, ledgerDateTo, ledgerType, ledgerPaymentMode, ledgerReconciledFilter, ledgerPage, ledgerRowsPerPage, notify]);

  // 5. Fetch Transfers
  const fetchTransfers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/transfers?limit=50');
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error('[FinancialAccountsSuite.fetchTransfers error]:', err);
    }
  }, []);

  // 6. Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    try {
      let url = '/api/finance/expenses?limit=50';
      if (expenseCategoryFilter) url += `&category=${encodeURIComponent(expenseCategoryFilter)}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error('[FinancialAccountsSuite.fetchExpenses error]:', err);
    }
  }, [expenseCategoryFilter]);

  // Initial Load
  useEffect(() => {
    fetchSummary();
    fetchAccounts();
    fetchMappings();
  }, [fetchSummary, fetchAccounts, fetchMappings]);

  // Tab Change Handler
  useEffect(() => {
    if (subTab === 0) fetchAccounts();
    if (subTab === 1) fetchLedger();
    if (subTab === 2) fetchMappings();
    if (subTab === 3) fetchTransfers();
    if (subTab === 4) fetchExpenses();
  }, [subTab, fetchAccounts, fetchLedger, fetchMappings, fetchTransfers, fetchExpenses]);

  // Account Modal Open/Close
  const handleOpenAccountModal = (acc = null) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountForm({
        account_name: acc.account_name || '',
        bank_name: acc.bank_name || '',
        account_number: acc.account_number || '',
        account_type: acc.account_type || 'bank',
        ifsc_code: acc.ifsc_code || '',
        branch_name: acc.branch_name || '',
        opening_balance: String(acc.opening_balance || 0),
        opening_balance_date: acc.opening_balance_date ? acc.opening_balance_date.slice(0, 10) : getISTDateString(),
        is_active: acc.is_active ? 1 : 0,
        notes: acc.notes || ''
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        account_name: '',
        bank_name: '',
        account_number: '',
        account_type: 'bank',
        ifsc_code: '',
        branch_name: '',
        opening_balance: '0',
        opening_balance_date: getISTDateString(),
        is_active: 1,
        notes: ''
      });
    }
    setAccountModalOpen(true);
  };

  // Save Account Handler
  const handleSaveAccount = async () => {
    if (!accountForm.account_name.trim()) {
      notify?.('Please provide an Account Name', 'warning');
      return;
    }

    try {
      let res;
      if (editingAccount) {
        res = await apiFetch(`/api/finance/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountForm)
        });
      } else {
        res = await apiFetch('/api/finance/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountForm)
        });
      }

      if (res.ok) {
        notify?.(editingAccount ? 'Account updated successfully' : 'Account created successfully', 'success');
        setAccountModalOpen(false);
        fetchAccounts();
        fetchSummary();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to save account', 'error');
      }
    } catch (err) {
      notify?.('Error saving account', 'error');
    }
  };

  // Toggle Account Active/Inactive
  const handleToggleAccount = async (acc) => {
    try {
      const res = await apiFetch(`/api/finance/accounts/${acc.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: acc.is_active ? 0 : 1 })
      });
      if (res.ok) {
        notify?.(`Account ${acc.is_active ? 'deactivated' : 'activated'} successfully`, 'success');
        fetchAccounts();
      }
    } catch (err) {
      notify?.('Failed to toggle account status', 'error');
    }
  };

  // Save Payment Mode Mapping
  const handleSaveMapping = async (mode, accountId) => {
    setSavingMapping(mode);
    try {
      const res = await apiFetch('/api/finance/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: mode, account_id: accountId })
      });
      if (res.ok) {
        notify?.(`Mapped "${mode}" to account successfully`, 'success');
        fetchMappings();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to save mapping', 'error');
      }
    } catch (err) {
      notify?.('Error updating mapping', 'error');
    } finally {
      setSavingMapping(null);
    }
  };

  // Reconcile Transaction Toggle
  const handleReconcileToggle = async (tx) => {
    try {
      const newStatus = !tx.reconciled;
      const res = await apiFetch(`/api/finance/transactions/${tx.id}/reconcile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reconciled: newStatus,
          reconciliation_ref: newStatus ? 'Verified Statement' : null
        })
      });
      if (res.ok) {
        notify?.(`Transaction ${newStatus ? 'marked Reconciled' : 'unmarked Reconciliation'}`, 'success');
        fetchLedger();
      }
    } catch (err) {
      notify?.('Failed to update reconciliation', 'error');
    }
  };

  // Save Contra Transfer Handler
  const handleSaveTransfer = async () => {
    if (!transferForm.from_account_id || !transferForm.to_account_id) {
      notify?.('Please select both From Account and To Account', 'warning');
      return;
    }
    if (transferForm.from_account_id === transferForm.to_account_id) {
      notify?.('Source and Destination accounts must be different', 'warning');
      return;
    }
    const amt = parseFloat(transferForm.amount);
    if (!amt || amt <= 0) {
      notify?.('Please enter a valid transfer amount > 0', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/finance/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferForm)
      });
      if (res.ok) {
        notify?.('Contra transfer executed successfully', 'success');
        setTransferModalOpen(false);
        setTransferForm({
          from_account_id: '',
          to_account_id: '',
          amount: '',
          transfer_date: getISTDateString(),
          reference_number: '',
          notes: ''
        });
        fetchTransfers();
        fetchAccounts();
        fetchSummary();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to execute transfer', 'error');
      }
    } catch (err) {
      notify?.('Error completing transfer', 'error');
    }
  };

  // Save Expense Handler
  const handleSaveExpense = async () => {
    const amt = parseFloat(expenseForm.amount);
    if (!amt || amt <= 0) {
      notify?.('Please enter a valid expense amount > 0', 'warning');
      return;
    }
    if (!expenseForm.category.trim()) {
      notify?.('Please choose an expense category', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      if (res.ok) {
        notify?.('Expense recorded successfully', 'success');
        setExpenseModalOpen(false);
        setExpenseForm({
          category: 'Rent',
          amount: '',
          account_id: '',
          payment_mode: 'cash',
          expense_date: getISTDateString(),
          payee: '',
          reference_number: '',
          notes: ''
        });
        fetchExpenses();
        fetchAccounts();
        fetchSummary();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to record expense', 'error');
      }
    } catch (err) {
      notify?.('Error recording expense', 'error');
    }
  };

  // Export Ledger to CSV
  const handleExportCsv = () => {
    const rows = ledgerData.transactions || [];
    if (rows.length === 0) {
      notify?.('No transactions to export', 'warning');
      return;
    }

    let csvContent = 'Date,Transaction Type,Reference Number,Payment Mode,Party,Description,Debit (Outflow),Credit (Inflow),Balance After,Reconciled\n';
    rows.forEach(r => {
      const d = r.created_at ? new Date(r.created_at).toLocaleString() : '';
      const type = r.transaction_type || '';
      const ref = r.reference_number || '';
      const mode = r.payment_mode || '';
      const party = (r.party_name || '').replace(/,/g, ' ');
      const desc = (r.description || '').replace(/,/g, ' ');
      const debit = r.amount_out || 0;
      const credit = r.amount_in || 0;
      const bal = r.balance_after || 0;
      const recon = r.reconciled ? 'Reconciled' : 'Unreconciled';
      csvContent += `"${d}","${type}","${ref}","${mode}","${party}","${desc}",${debit},${credit},${bal},"${recon}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Account_Ledger_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify?.('Ledger exported successfully', 'success');
  };

  // Selected Account in Ledger (if any)
  const currentLedgerAccount = accounts.find(a => a.id === parseInt(selectedLedgerAccountId, 10));
  const statementDiff = statementBalanceInput !== ''
    ? parseFloat(statementBalanceInput || 0) - (currentLedgerAccount?.current_balance || 0)
    : null;

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* 1. Header & Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, color: '#1e293b' }}>
            <Landmark size={28} color="#2563eb" />
            Bank & Financial Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage cash drawers, bank accounts, payment mappings, transactions ledger, and reconciliation.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => { fetchSummary(); fetchAccounts(); if (subTab === 1) fetchLedger(); }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={16} />}
            onClick={() => handleOpenAccountModal()}
          >
            Add Account
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ArrowRightLeft size={16} />}
            onClick={() => setTransferModalOpen(true)}
          >
            Contra Transfer
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Receipt size={16} />}
            onClick={() => setExpenseModalOpen(true)}
          >
            Record Expense
          </Button>
        </Box>
      </Box>

      {/* 2. Top Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '4px solid #2563eb' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Total Balance
                </Typography>
                <Landmark size={18} color="#2563eb" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(summary.total_balance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across {summary.total_accounts} active accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '4px solid #10b981' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Cash In Hand
                </Typography>
                <Wallet size={18} color="#10b981" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#047857' }}>
                {formatCurrency(summary.cash_balance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                In physical cash drawers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '4px solid #6366f1' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Bank Balance
                </Typography>
                <Building2 size={18} color="#6366f1" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#4338ca' }}>
                {formatCurrency(summary.bank_balance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current & Savings accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '4px solid #f59e0b' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Today's Activity
                </Typography>
                <TrendingUp size={18} color="#f59e0b" />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center' }}>
                  <ArrowDownLeft size={14} /> {formatCurrency(summary.today_inflow)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#b91c1c', display: 'flex', alignItems: 'center' }}>
                  <ArrowUpRight size={14} /> {formatCurrency(summary.today_outflow)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Inflow vs Outflow today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Sub-Navigation Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={subTab}
          onChange={(e, val) => setSubTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Landmark size={18} />} iconPosition="start" label="Bank & Cash Accounts" />
          <Tab icon={<FileSpreadsheet size={18} />} iconPosition="start" label="Ledger & Reconciliation" />
          <Tab icon={<CreditCard size={18} />} iconPosition="start" label="Payment Mode Mappings" />
          <Tab icon={<ArrowRightLeft size={18} />} iconPosition="start" label="Contra Transfers" />
          <Tab icon={<Receipt size={18} />} iconPosition="start" label="Expense Tracker" />
        </Tabs>
      </Paper>

      {/* 4. Tab 0: Bank & Cash Accounts */}
      {subTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="Search account name, bank, or number..."
              size="small"
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="#64748b" />
                    </InputAdornment>
                  )
                }
              }}
              sx={{ width: { xs: '100%', sm: 350 } }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={36} />
            </Box>
          ) : accounts.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No financial accounts found. Click "Add Account" to configure your first Cash or Bank account.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {accounts.map((acc) => (
                <Grid item xs={12} sm={6} md={4} key={acc.id}>
                  <Card sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.09)' }
                  }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{
                            p: 1.2,
                            borderRadius: 2,
                            backgroundColor: acc.account_type === 'cash' ? '#ecfdf5' : '#eff6ff',
                            color: acc.account_type === 'cash' ? '#059669' : '#2563eb'
                          }}>
                            {acc.account_type === 'cash' ? <Wallet size={24} /> : <Building2 size={24} />}
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                              {acc.account_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {acc.bank_name || (acc.account_type === 'cash' ? 'Cash Drawer' : 'Bank Account')}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={acc.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={acc.is_active ? 'success' : 'default'}
                          variant={acc.is_active ? 'filled' : 'outlined'}
                        />
                      </Box>

                      {/* Masked Account Number & Details */}
                      {acc.account_type !== 'cash' && (
                        <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, mb: 2 }}>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                            ACCOUNT NUMBER
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                            {acc.account_number_masked || '••••••••••••'}
                          </Typography>
                          {acc.ifsc_code && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              IFSC: <strong>{acc.ifsc_code}</strong> {acc.branch_name ? `• ${acc.branch_name}` : ''}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Current Balance */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 1, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">Current Balance</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: acc.current_balance >= 0 ? '#047857' : '#b91c1c' }}>
                          {formatCurrency(acc.current_balance)}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Card Action Buttons */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FileSpreadsheet size={14} />}
                          onClick={() => {
                            setSelectedLedgerAccountId(String(acc.id));
                            setSubTab(1);
                          }}
                        >
                          Ledger
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Account">
                            <IconButton size="small" onClick={() => handleOpenAccountModal(acc)}>
                              <Edit2 size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={acc.is_active ? 'Deactivate' : 'Activate'}>
                            <Switch
                              size="small"
                              checked={Boolean(acc.is_active)}
                              onChange={() => handleToggleAccount(acc)}
                            />
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* 5. Tab 1: Transaction Ledger & Reconciliation */}
      {subTab === 1 && (
        <Box>
          {/* Ledger Filter Bar */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account</InputLabel>
                  <Select
                    value={selectedLedgerAccountId}
                    label="Account"
                    onChange={(e) => {
                      setSelectedLedgerAccountId(e.target.value);
                      setLedgerPage(0);
                    }}
                  >
                    <MenuItem value=""><em>All Accounts</em></MenuItem>
                    {accounts.map(acc => (
                      <MenuItem key={acc.id} value={String(acc.id)}>
                        {acc.account_name} ({formatCurrency(acc.current_balance)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="From Date"
                  type="date"
                  value={ledgerDateFrom}
                  onChange={(e) => setLedgerDateFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="To Date"
                  type="date"
                  value={ledgerDateTo}
                  onChange={(e) => setLedgerDateTo(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={ledgerType}
                    label="Type"
                    onChange={(e) => setLedgerType(e.target.value)}
                  >
                    <MenuItem value=""><em>All Types</em></MenuItem>
                    <MenuItem value="SALE_RECEIPT">Sale Receipt</MenuItem>
                    <MenuItem value="CUSTOMER_PAYMENT">Customer Payment</MenuItem>
                    <MenuItem value="SUPPLIER_PAYMENT">Supplier Payment</MenuItem>
                    <MenuItem value="ACCOUNT_TRANSFER">Contra Transfer</MenuItem>
                    <MenuItem value="EXPENSE_PAYMENT">Expense Payment</MenuItem>
                    <MenuItem value="OPENING_BALANCE">Opening Balance</MenuItem>
                    <MenuItem value="REFUND">Refund</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Reconciled</InputLabel>
                  <Select
                    value={ledgerReconciledFilter}
                    label="Reconciled"
                    onChange={(e) => setLedgerReconciledFilter(e.target.value)}
                  >
                    <MenuItem value=""><em>All</em></MenuItem>
                    <MenuItem value="1">Reconciled</MenuItem>
                    <MenuItem value="0">Unreconciled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={12} md={1.5} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  onClick={handleExportCsv}
                  disabled={!ledgerData.transactions || ledgerData.transactions.length === 0}
                >
                  Export
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Statement Reconciliation Banner */}
          {currentLedgerAccount && currentLedgerAccount.account_type !== 'cash' && (
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Statement Reconciliation for {currentLedgerAccount.account_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Compare bank statement balance against system ledger balance to discover variances.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">System Ledger Balance</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#2563eb' }}>
                      {formatCurrency(currentLedgerAccount.current_balance)}
                    </Typography>
                  </Box>

                  <TextField
                    size="small"
                    placeholder="Enter statement balance"
                    type="number"
                    value={statementBalanceInput}
                    onChange={(e) => setStatementBalanceInput(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }
                    }}
                    sx={{ width: 220 }}
                  />

                  {statementDiff !== null && (
                    <Chip
                      icon={Math.abs(statementDiff) < 0.01 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      label={Math.abs(statementDiff) < 0.01 ? 'Balanced (Zero Discrepancy)' : `Variance: ${formatCurrency(statementDiff)}`}
                      color={Math.abs(statementDiff) < 0.01 ? 'success' : 'error'}
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Box>
            </Paper>
          )}

          {/* Ledger Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Party / Payee</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#b91c1c' }}>Outflow (-)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#047857' }}>Inflow (+)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Balance After</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Reconciled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : !ledgerData.transactions || ledgerData.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No transactions recorded in this ledger period.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerData.transactions.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{tx.account_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={tx.transaction_type.replace(/_/g, ' ')}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            bgcolor: tx.amount_in > 0 ? '#ecfdf5' : '#fef2f2',
                            color: tx.amount_in > 0 ? '#047857' : '#b91c1c',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {tx.reference_number || `#${tx.id}`}
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        {tx.payment_mode || '—'}
                      </TableCell>
                      <TableCell>{tx.party_name || '—'}</TableCell>
                      <TableCell align="right" sx={{ color: '#b91c1c', fontWeight: 600 }}>
                        {tx.amount_out > 0 ? formatCurrency(tx.amount_out) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#047857', fontWeight: 600 }}>
                        {tx.amount_in > 0 ? formatCurrency(tx.amount_in) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(tx.balance_after)}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={tx.reconciled ? `Reconciled: ${tx.reconciliation_ref || 'Matched'}` : 'Click to reconcile'}>
                          <IconButton
                            size="small"
                            color={tx.reconciled ? 'success' : 'default'}
                            onClick={() => handleReconcileToggle(tx)}
                          >
                            {tx.reconciled ? <CheckCircle size={18} /> : <XCircle size={18} color="#94a3b8" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={ledgerData.summary?.total_count || 0}
              rowsPerPage={ledgerRowsPerPage}
              page={ledgerPage}
              onPageChange={(e, newPage) => setLedgerPage(newPage)}
              onRowsPerPageChange={(e) => {
                setLedgerRowsPerPage(parseInt(e.target.value, 10));
                setLedgerPage(0);
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* 6. Tab 2: Payment Mode Mappings */}
      {subTab === 2 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Map every payment mode configured in Ariso POS to its destination financial account. All POS sales, split payments, and refunds will route automatically into the mapped accounts.
          </Typography>

          <TableContainer component={Paper} sx={{ borderRadius: 2, maxWidth: 800 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Payment Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mapped Financial Account</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {['cash', 'upi', 'card', 'bank_transfer', 'wallet', 'cheque'].map((mode) => {
                  const existing = mappings.find(m => m.payment_mode === mode);
                  return (
                    <TableRow key={mode} hover>
                      <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        {mode.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={existing ? String(existing.account_id) : ''}
                            displayEmpty
                            onChange={(e) => handleSaveMapping(mode, parseInt(e.target.value, 10))}
                            disabled={savingMapping === mode}
                          >
                            <MenuItem value="" disabled><em>Select target account</em></MenuItem>
                            {accounts.filter(a => a.is_active).map(acc => (
                              <MenuItem key={acc.id} value={String(acc.id)}>
                                {acc.account_name} ({acc.account_type.toUpperCase()})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="center">
                        {savingMapping === mode ? (
                          <CircularProgress size={18} />
                        ) : existing ? (
                          <Chip size="small" icon={<Check size={14} />} label="Mapped" color="success" variant="outlined" />
                        ) : (
                          <Chip size="small" label="Unmapped" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* 7. Tab 3: Contra Transfers */}
      {subTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Transfers between the business's own accounts (e.g. Cash Deposit to Bank, or Inter-Bank Transfer). These transactions have zero effect on Sales, Revenue, GST, or Party balances.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setTransferModalOpen(true)}
            >
              New Transfer
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Transfer Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>From Account</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>To Account</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No contra transfers recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((trf) => (
                    <TableRow key={trf.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {trf.transfer_number}
                      </TableCell>
                      <TableCell>{trf.transfer_date ? trf.transfer_date.slice(0, 10) : ''}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#b91c1c' }}>
                        {trf.from_account_name}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#047857' }}>
                        {trf.to_account_name}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(trf.amount)}
                      </TableCell>
                      <TableCell>{trf.reference_number || '—'}</TableCell>
                      <TableCell>{trf.created_by_name || 'Admin'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* 8. Tab 4: Comprehensive Expense Management Suite */}
      {subTab === 4 && (
        <ExpenseManagementSuite />
      )}

      {/* 9. Modal: Add / Edit Account */}
      <Dialog open={accountModalOpen} onClose={() => setAccountModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingAccount ? 'Edit Financial Account' : 'Add Financial Account'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Account Name *"
                value={accountForm.account_name}
                onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                placeholder="e.g. HDFC Current A/C, Cash Drawer"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={accountForm.account_type}
                  label="Account Type"
                  onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                >
                  <MenuItem value="cash">Cash Account</MenuItem>
                  <MenuItem value="bank">Bank Account</MenuItem>
                  <MenuItem value="current">Current Account</MenuItem>
                  <MenuItem value="savings">Savings Account</MenuItem>
                  <MenuItem value="wallet">Wallet Account</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {accountForm.account_type !== 'cash' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bank Name"
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Account Number"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    placeholder="e.g. 50200012345678"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="IFSC Code"
                    value={accountForm.ifsc_code}
                    onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Branch Name"
                    value={accountForm.branch_name}
                    onChange={(e) => setAccountForm({ ...accountForm, branch_name: e.target.value })}
                    placeholder="e.g. Andheri East, Mumbai"
                  />
                </Grid>
              </>
            )}

            {!editingAccount && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Opening Balance"
                    type="number"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Opening Balance Date"
                    type="date"
                    value={accountForm.opening_balance_date}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance_date: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes / Description"
                multiline
                rows={2}
                value={accountForm.notes}
                onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAccountModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAccount}>
            {editingAccount ? 'Update Account' : 'Save Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 10. Modal: Contra Transfer */}
      <Dialog open={transferModalOpen} onClose={() => setTransferModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          New Inter-Account Contra Transfer
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>From Account (Debit) *</InputLabel>
                <Select
                  value={transferForm.from_account_id}
                  label="From Account (Debit) *"
                  onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                >
                  {accounts.filter(a => a.is_active).map(acc => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({formatCurrency(acc.current_balance)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>To Account (Credit) *</InputLabel>
                <Select
                  value={transferForm.to_account_id}
                  label="To Account (Credit) *"
                  onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                >
                  {accounts.filter(a => a.is_active).map(acc => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({formatCurrency(acc.current_balance)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Transfer Amount *"
                type="number"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Transfer Date"
                type="date"
                value={transferForm.transfer_date}
                onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Reference / Cheque Number"
                value={transferForm.reference_number}
                onChange={(e) => setTransferForm({ ...transferForm, reference_number: e.target.value })}
                placeholder="e.g. Cheque #458291 or Bank Ref #UTR123456"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                rows={2}
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTransferModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveTransfer}>
            Execute Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* 11. Modal: Record Expense */}
      <Dialog open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Record Business Expense
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Category *</InputLabel>
                <Select
                  value={expenseForm.category}
                  label="Category *"
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <MenuItem value="Rent">Rent</MenuItem>
                  <MenuItem value="Electricity">Electricity</MenuItem>
                  <MenuItem value="Salaries">Salaries</MenuItem>
                  <MenuItem value="Packaging">Packaging</MenuItem>
                  <MenuItem value="Tea & Snacks">Tea & Snacks</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Miscellaneous">Miscellaneous</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Amount *"
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Paid From Account</InputLabel>
                <Select
                  value={expenseForm.account_id}
                  label="Paid From Account"
                  onChange={(e) => setExpenseForm({ ...expenseForm, account_id: e.target.value })}
                >
                  <MenuItem value=""><em>Auto-detect from Mode</em></MenuItem>
                  {accounts.filter(a => a.is_active).map(acc => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({formatCurrency(acc.current_balance)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  value={expenseForm.payment_mode}
                  label="Payment Mode"
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI / GPay</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Expense Date"
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Payee / Vendor Name"
                value={expenseForm.payee}
                onChange={(e) => setExpenseForm({ ...expenseForm, payee: e.target.value })}
                placeholder="e.g. Landlord, Electricity Board"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Bill / Reference Number"
                value={expenseForm.reference_number}
                onChange={(e) => setExpenseForm({ ...expenseForm, reference_number: e.target.value })}
                placeholder="e.g. Bill #5920 or Receipt #12"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                rows={2}
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveExpense}>
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
