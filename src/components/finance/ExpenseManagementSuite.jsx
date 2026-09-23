import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField, Select,
  MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs,
  Tab, IconButton, CircularProgress, Tooltip, FormControl, InputLabel,
  Switch, FormControlLabel, Divider, Alert, InputAdornment, TablePagination,
  LinearProgress
} from '@mui/material';
import {
  Receipt, Plus, Search, Filter, CheckCircle2, XCircle, Calendar,
  Download, RefreshCw, Edit2, Building2, TrendingDown, ArrowRightLeft,
  FileSpreadsheet, ShieldAlert, Check, AlertCircle, Eye, Upload, FileText,
  Trash2, UserCheck, Clock, ArrowUpRight, DollarSign, Wallet, Landmark,
  Printer
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export default function ExpenseManagementSuite() {
  const notify = useNotify();

  // Active Main SubTab: 0 = Expense Register, 1 = Categories Manager, 2 = Employee Claims, 3 = Analytics
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Summary Metrics State
  const [summary, setSummary] = useState({
    total_count: 0,
    total_amount: 0,
    total_taxable: 0,
    total_tax: 0,
    cash_expenses: 0,
    bank_expenses: 0,
    pending_claims_count: 0,
    pending_claims_amount: 0
  });

  // -----------------------------------------------------------------
  // 1. EXPENSES REGISTER STATE
  // -----------------------------------------------------------------
  const [expenses, setExpenses] = useState([]);
  const [expenseTotalCount, setExpenseTotalCount] = useState(0);
  const [expensePage, setExpensePage] = useState(0);
  const [expenseRowsPerPage, setExpenseRowsPerPage] = useState(25);

  // Filter criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // -----------------------------------------------------------------
  // 2. CATEGORIES STATE
  // -----------------------------------------------------------------
  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    is_active: 1
  });

  // -----------------------------------------------------------------
  // 3. FINANCIAL ACCOUNTS (FOR DISBURSEMENT & LINKING)
  // -----------------------------------------------------------------
  const [accounts, setAccounts] = useState([]);

  // -----------------------------------------------------------------
  // 4. RECORD EXPENSE MODAL STATE
  // -----------------------------------------------------------------
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    categoryName: '',
    amount: '',
    gstRate: 0,
    taxInclusive: false,
    isInterState: false,
    paymentMode: 'cash',
    accountId: '',
    expenseDate: getISTDateString(),
    payee: '',
    employeeName: '',
    referenceNumber: '',
    notes: '',
    attachmentUrl: '',
    attachmentName: '',
    attachmentType: ''
  });

  // Computed tax values for modal preview
  const [calculatedTax, setCalculatedTax] = useState({
    taxable_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    tax_amount: 0,
    total_amount: 0
  });

  // -----------------------------------------------------------------
  // 5. CANCELLATION DIALOG STATE
  // -----------------------------------------------------------------
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingExpense, setCancellingExpense] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // -----------------------------------------------------------------
  // 6. VOUCHER VIEW DIALOG STATE
  // -----------------------------------------------------------------
  const [viewVoucherOpen, setViewVoucherOpen] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState(null);

  // -----------------------------------------------------------------
  // 7. EMPLOYEE REIMBURSEMENT CLAIMS STATE
  // -----------------------------------------------------------------
  const [claims, setClaims] = useState([]);
  const [claimTotalCount, setClaimTotalCount] = useState(0);
  const [claimPage, setClaimPage] = useState(0);
  const [claimRowsPerPage, setClaimRowsPerPage] = useState(25);
  const [claimFilterStatus, setClaimFilterStatus] = useState('');

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    employeeName: '',
    expenseDate: getISTDateString(),
    categoryId: '',
    amount: '',
    taxAmount: '0',
    description: '',
    proofAttachmentUrl: '',
    proofAttachmentName: ''
  });

  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [disbursingClaim, setDisbursingClaim] = useState(null);
  const [disburseAccount, setDisburseAccount] = useState('');
  const [disburseMode, setDisburseMode] = useState('bank_transfer');

  // Format currency helper
  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  // -----------------------------------------------------------------
  // DATA FETCHING HOOKS
  // -----------------------------------------------------------------
  const fetchSummary = useCallback(async () => {
    try {
      let url = '/api/expenses/summary';
      const params = new URLSearchParams();
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const tot = data.summary?.totals || {};
        const pend = data.summary?.pendingClaims || {};
        setSummary({
          total_count: parseInt(tot.total_count || 0, 10),
          total_amount: parseFloat(tot.total_amount || 0),
          total_taxable: parseFloat(tot.total_taxable || 0),
          total_tax: parseFloat(tot.total_tax || 0),
          cash_expenses: parseFloat(tot.cash_expenses || 0),
          bank_expenses: parseFloat(tot.bank_expenses || 0),
          pending_claims_count: parseInt(pend.pending_claims_count || 0, 10),
          pending_claims_amount: parseFloat(pend.pending_claims_amount || 0)
        });
      }
    } catch (err) {
      console.error('Failed to fetch expense summary:', err);
    }
  }, [filterDateFrom, filterDateTo]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiFetch('/api/expenses/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/accounts?activeOnly=true');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(expensePage + 1));
      params.append('limit', String(expenseRowsPerPage));
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (filterCategoryId) params.append('categoryId', filterCategoryId);
      if (filterPaymentMode) params.append('paymentMode', filterPaymentMode);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDateFrom) params.append('dateFrom', filterDateFrom);
      if (filterDateTo) params.append('dateTo', filterDateTo);

      const res = await apiFetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setExpenseTotalCount(data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      notify?.('Failed to fetch expenses list', 'error');
    } finally {
      setLoading(false);
    }
  }, [expensePage, expenseRowsPerPage, searchQuery, filterCategoryId, filterPaymentMode, filterStatus, filterDateFrom, filterDateTo, notify]);

  const fetchClaims = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(claimPage + 1));
      params.append('limit', String(claimRowsPerPage));
      if (claimFilterStatus) params.append('status', claimFilterStatus);

      const res = await apiFetch(`/api/expenses/claims/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
        setClaimTotalCount(data.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    }
  }, [claimPage, claimRowsPerPage, claimFilterStatus]);

  // Initial load
  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchSummary();
  }, [fetchCategories, fetchAccounts, fetchSummary]);

  // Tab-dependent load
  useEffect(() => {
    if (subTab === 0) {
      fetchExpenses();
      fetchSummary();
    } else if (subTab === 1) {
      fetchCategories();
    } else if (subTab === 2) {
      fetchClaims();
    } else if (subTab === 3) {
      fetchSummary();
    }
  }, [subTab, fetchExpenses, fetchCategories, fetchClaims, fetchSummary]);

  // Recalculate tax breakdown when expenseForm inputs change
  useEffect(() => {
    const rawAmt = parseFloat(expenseForm.amount || 0);
    const rate = parseFloat(expenseForm.gstRate || 0);
    if (rawAmt <= 0) {
      setCalculatedTax({
        taxable_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        tax_amount: 0,
        total_amount: 0
      });
      return;
    }

    let taxable, tax, total;
    if (expenseForm.taxInclusive) {
      total = rawAmt;
      taxable = Math.round((rawAmt / (1 + (rate / 100))) * 100) / 100;
      tax = Math.round((total - taxable) * 100) / 100;
    } else {
      taxable = rawAmt;
      tax = Math.round((taxable * (rate / 100)) * 100) / 100;
      total = Math.round((taxable + tax) * 100) / 100;
    }

    let cgst = 0, sgst = 0, igst = 0;
    if (expenseForm.isInterState) {
      igst = tax;
    } else {
      cgst = Math.round((tax / 2) * 100) / 100;
      sgst = Math.round((tax - cgst) * 100) / 100;
    }

    setCalculatedTax({
      taxable_amount: taxable,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      tax_amount: tax,
      total_amount: total
    });
  }, [expenseForm.amount, expenseForm.gstRate, expenseForm.taxInclusive, expenseForm.isInterState]);

  // -----------------------------------------------------------------
  // FILE UPLOAD HANDLER
  // -----------------------------------------------------------------
  const handleFileUpload = async (e, target = 'expense') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      notify?.('File size exceeds 5MB limit', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);
    try {
      const res = await apiFetch('/api/expenses/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        notify?.('Receipt uploaded successfully', 'success');
        if (target === 'expense') {
          setExpenseForm(prev => ({
            ...prev,
            attachmentUrl: data.url,
            attachmentName: data.originalName,
            attachmentType: data.mimetype
          }));
        } else if (target === 'claim') {
          setClaimForm(prev => ({
            ...prev,
            proofAttachmentUrl: data.url,
            proofAttachmentName: data.originalName
          }));
        }
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to upload receipt file', 'error');
      }
    } catch (err) {
      notify?.('Upload failed due to network error', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // -----------------------------------------------------------------
  // EXPENSE CRUD HANDLERS
  // -----------------------------------------------------------------
  const handleOpenRecordExpense = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        categoryId: expense.category_id || '',
        categoryName: expense.category || '',
        amount: String(expense.taxable_amount || expense.amount || ''),
        gstRate: expense.gst_rate || 0,
        taxInclusive: expense.tax_inclusive === 1,
        isInterState: parseFloat(expense.igst_amount || 0) > 0,
        paymentMode: expense.payment_mode || 'cash',
        accountId: expense.account_id || '',
        expenseDate: expense.expense_date ? expense.expense_date.slice(0, 10) : getISTDateString(),
        payee: expense.payee || '',
        employeeName: expense.employee_name || '',
        referenceNumber: expense.reference_number || '',
        notes: expense.notes || '',
        attachmentUrl: expense.attachment_url || '',
        attachmentName: expense.attachment_name || '',
        attachmentType: expense.attachment_type || ''
      });
    } else {
      setEditingExpense(null);
      // Auto select default cash account if available
      const defaultCash = accounts.find(a => a.account_type === 'cash' && a.is_default) || accounts.find(a => a.account_type === 'cash');
      setExpenseForm({
        categoryId: categories.length > 0 ? categories[0].id : '',
        categoryName: '',
        amount: '',
        gstRate: 0,
        taxInclusive: false,
        isInterState: false,
        paymentMode: 'cash',
        accountId: defaultCash ? defaultCash.id : '',
        expenseDate: getISTDateString(),
        payee: '',
        employeeName: '',
        referenceNumber: '',
        notes: '',
        attachmentUrl: '',
        attachmentName: '',
        attachmentType: ''
      });
    }
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      notify?.('Please enter a valid expense amount', 'warning');
      return;
    }
    if (!expenseForm.categoryId && !expenseForm.categoryName.trim()) {
      notify?.('Please select or specify an expense category', 'warning');
      return;
    }

    try {
      const payload = {
        categoryId: expenseForm.categoryId || null,
        categoryName: expenseForm.categoryName || null,
        amount: parseFloat(expenseForm.amount),
        gstRate: parseFloat(expenseForm.gstRate || 0),
        taxInclusive: expenseForm.taxInclusive,
        isInterState: expenseForm.isInterState,
        paymentMode: expenseForm.paymentMode,
        accountId: expenseForm.accountId || null,
        expenseDate: expenseForm.expenseDate,
        payee: expenseForm.payee.trim() || null,
        employeeName: expenseForm.employeeName.trim() || null,
        referenceNumber: expenseForm.referenceNumber.trim() || null,
        notes: expenseForm.notes.trim() || null,
        attachmentUrl: expenseForm.attachmentUrl || null,
        attachmentName: expenseForm.attachmentName || null,
        attachmentType: expenseForm.attachmentType || null
      };

      let res;
      if (editingExpense) {
        res = await apiFetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        res = await apiFetch('/api/expenses', {
          method: 'POST',
          body: payload
        });
      }

      if (res.ok) {
        const data = await res.json();
        notify?.(editingExpense ? 'Expense updated successfully' : 'Business expense recorded and account debited', 'success');
        setExpenseModalOpen(false);
        fetchExpenses();
        fetchSummary();
        fetchAccounts();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to save expense', 'error');
      }
    } catch (err) {
      notify?.('Error connecting to server', 'error');
    }
  };

  const handleConfirmCancelExpense = async () => {
    if (!cancellingExpense) return;
    try {
      const res = await apiFetch(`/api/expenses/${cancellingExpense.id}/cancel`, {
        method: 'POST',
        body: { cancelledReason: cancelReason || 'Cancelled by user' }
      });

      if (res.ok) {
        notify?.('Expense cancelled and account balance compensated', 'success');
        setCancelDialogOpen(false);
        setCancellingExpense(null);
        setCancelReason('');
        fetchExpenses();
        fetchSummary();
        fetchAccounts();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to cancel expense', 'error');
      }
    } catch (err) {
      notify?.('Error cancelling expense', 'error');
    }
  };

  // -----------------------------------------------------------------
  // CATEGORIES CRUD HANDLERS
  // -----------------------------------------------------------------
  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({
        name: cat.name || '',
        code: cat.code || '',
        description: cat.description || '',
        is_active: cat.is_active !== undefined ? cat.is_active : 1
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        code: '',
        description: '',
        is_active: 1
      });
    }
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      notify?.('Category name is required', 'warning');
      return;
    }

    try {
      let res;
      if (editingCategory) {
        res = await apiFetch(`/api/expenses/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: categoryForm
        });
      } else {
        res = await apiFetch('/api/expenses/categories', {
          method: 'POST',
          body: categoryForm
        });
      }

      if (res.ok) {
        notify?.(editingCategory ? 'Category updated' : 'Category created', 'success');
        setCategoryModalOpen(false);
        fetchCategories();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to save category', 'error');
      }
    } catch (err) {
      notify?.('Error saving category', 'error');
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await apiFetch(`/api/expenses/categories/${cat.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        notify?.('Category deleted', 'success');
        fetchCategories();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Cannot delete category in use', 'error');
      }
    } catch (err) {
      notify?.('Error deleting category', 'error');
    }
  };

  // -----------------------------------------------------------------
  // CLAIMS WORKFLOW HANDLERS
  // -----------------------------------------------------------------
  const handleSubmitClaim = async () => {
    if (!claimForm.employeeName.trim()) {
      notify?.('Employee name is required', 'warning');
      return;
    }
    if (!claimForm.amount || parseFloat(claimForm.amount) <= 0) {
      notify?.('Please enter a valid claim amount', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/expenses/claims', {
        method: 'POST',
        body: {
          employeeName: claimForm.employeeName.trim(),
          expenseDate: claimForm.expenseDate,
          categoryId: claimForm.categoryId || null,
          amount: parseFloat(claimForm.amount),
          taxAmount: parseFloat(claimForm.taxAmount || 0),
          description: claimForm.description.trim(),
          proofAttachmentUrl: claimForm.proofAttachmentUrl,
          proofAttachmentName: claimForm.proofAttachmentName
        }
      });

      if (res.ok) {
        notify?.('Reimbursement claim submitted successfully', 'success');
        setClaimModalOpen(false);
        setClaimForm({
          employeeName: '',
          expenseDate: getISTDateString(),
          categoryId: '',
          amount: '',
          taxAmount: '0',
          description: '',
          proofAttachmentUrl: '',
          proofAttachmentName: ''
        });
        fetchClaims();
        fetchSummary();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to submit claim', 'error');
      }
    } catch (err) {
      notify?.('Error submitting claim', 'error');
    }
  };

  const handleReviewClaim = async (claimId) => {
    try {
      const res = await apiFetch(`/api/expenses/claims/${claimId}/review`, { method: 'POST' });
      if (res.ok) {
        notify?.('Claim marked as reviewed', 'success');
        fetchClaims();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to review claim', 'error');
      }
    } catch (err) {
      notify?.('Error reviewing claim', 'error');
    }
  };

  const handleApproveClaim = async (claimId) => {
    try {
      const res = await apiFetch(`/api/expenses/claims/${claimId}/approve`, { method: 'POST' });
      if (res.ok) {
        notify?.('Claim approved for reimbursement', 'success');
        fetchClaims();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to approve claim', 'error');
      }
    } catch (err) {
      notify?.('Error approving claim', 'error');
    }
  };

  const handleRejectClaim = async (claimId) => {
    const reason = window.prompt('Please provide a reason for rejecting this claim:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await apiFetch(`/api/expenses/claims/${claimId}/reject`, {
        method: 'POST',
        body: { rejectionReason: reason.trim() }
      });
      if (res.ok) {
        notify?.('Claim rejected', 'info');
        fetchClaims();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Failed to reject claim', 'error');
      }
    } catch (err) {
      notify?.('Error rejecting claim', 'error');
    }
  };

  const handleOpenDisburse = (claim) => {
    setDisbursingClaim(claim);
    const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
    setDisburseAccount(defaultAcc ? defaultAcc.id : '');
    setDisburseMode('bank_transfer');
    setDisburseModalOpen(true);
  };

  const handleConfirmDisbursement = async () => {
    if (!disbursingClaim || !disburseAccount) {
      notify?.('Please select a payment account', 'warning');
      return;
    }

    try {
      const res = await apiFetch(`/api/expenses/claims/${disbursingClaim.id}/reimburse`, {
        method: 'POST',
        body: {
          accountId: disburseAccount,
          paymentMode: disburseMode
        }
      });

      if (res.ok) {
        notify?.('Claim reimbursed and business account debited', 'success');
        setDisburseModalOpen(false);
        setDisbursingClaim(null);
        fetchClaims();
        fetchSummary();
        fetchAccounts();
      } else {
        const err = await res.json();
        notify?.(err.error || 'Disbursement failed', 'error');
      }
    } catch (err) {
      notify?.('Error processing reimbursement', 'error');
    }
  };

  // -----------------------------------------------------------------
  // EXPORT REGISTER TO CSV
  // -----------------------------------------------------------------
  const handleExportExpensesCsv = () => {
    if (expenses.length === 0) {
      notify?.('No expenses available to export', 'warning');
      return;
    }

    let csvContent = 'Expense #,Date,Category,Payee / Vendor,Payment Mode,Paid Account,Taxable (INR),GST Tax (INR),Total (INR),Status,Notes\n';
    expenses.forEach(e => {
      const num = e.expense_number || '';
      const d = e.expense_date ? e.expense_date.slice(0, 10) : '';
      const cat = (e.category_title || e.category || '').replace(/,/g, ' ');
      const payee = (e.payee || e.employee_name || e.supplier_name || '—').replace(/,/g, ' ');
      const mode = (e.payment_mode || '').toUpperCase();
      const acc = (e.account_name || 'Cash').replace(/,/g, ' ');
      const taxable = e.taxable_amount || e.amount || 0;
      const tax = e.tax_amount || 0;
      const total = e.total_amount || 0;
      const status = e.status || '';
      const notes = (e.notes || '').replace(/,/g, ' ');
      csvContent += `"${num}","${d}","${cat}","${payee}","${mode}","${acc}",${taxable},${tax},${total},"${status}","${notes}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expenses_Register_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify?.('Expenses exported successfully', 'success');
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      {/* 1. Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Receipt size={26} color="#2563eb" />
            Expense Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Business expenditure, GST input tax credits, payment bank accounts, and employee claims
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => handleOpenCategoryModal()}
          >
            New Category
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<FileText size={16} />}
            onClick={() => setClaimModalOpen(true)}
          >
            Claim Reimbursement
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => handleOpenRecordExpense()}
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
          >
            Record Expense
          </Button>
        </Box>
      </Box>

      {/* 2. Top Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Total Expenses
                </Typography>
                <TrendingDown size={18} color="#ef4444" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {formatCurrency(summary.total_amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.total_count} posted transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Cash vs Bank Outflow
                </Typography>
                <Wallet size={18} color="#10b981" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#047857' }}>
                  💵 {formatCurrency(summary.cash_expenses)}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#2563eb' }}>
                  🏦 {formatCurrency(summary.bank_expenses)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Cash Drawer vs Bank Accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #6366f1' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  GST Input Tax Credit (ITC)
                </Typography>
                <Landmark size={18} color="#6366f1" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                {formatCurrency(summary.total_tax)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Eligible tax deduction on expenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Pending Staff Claims
                </Typography>
                <Clock size={18} color="#f59e0b" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#b45309' }}>
                {formatCurrency(summary.pending_claims_amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.pending_claims_count} claims awaiting payout
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
          <Tab icon={<Receipt size={18} />} iconPosition="start" label="Expenses Register" />
          <Tab icon={<Building2 size={18} />} iconPosition="start" label="Categories & Expense Heads" />
          <Tab
            icon={<UserCheck size={18} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Reimbursement Claims</span>
                {summary.pending_claims_count > 0 && (
                  <Chip size="small" label={summary.pending_claims_count} color="warning" sx={{ height: 20, fontSize: '0.75rem' }} />
                )}
              </Box>
            }
          />
          <Tab icon={<FileSpreadsheet size={18} />} iconPosition="start" label="Analytics & Breakdown" />
        </Tabs>
      </Paper>

      {/* ================================================================= */}
      {/* TAB 0: EXPENSES REGISTER */}
      {/* ================================================================= */}
      {subTab === 0 && (
        <Box>
          {/* Filters Bar */}
          <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search expense #, payee, staff, notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setExpensePage(0);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} color="#64748b" />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategoryId}
                    label="Category"
                    onChange={(e) => {
                      setFilterCategoryId(e.target.value);
                      setExpensePage(0);
                    }}
                  >
                    <MenuItem value=""><em>All Categories</em></MenuItem>
                    {categories.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    value={filterPaymentMode}
                    label="Payment Mode"
                    onChange={(e) => {
                      setFilterPaymentMode(e.target.value);
                      setExpensePage(0);
                    }}
                  >
                    <MenuItem value=""><em>All Modes</em></MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Status"
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setExpensePage(0);
                    }}
                  >
                    <MenuItem value=""><em>All Status</em></MenuItem>
                    <MenuItem value="POSTED">Posted</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={1.75}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setExpensePage(0);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid item xs={6} sm={3} md={1.75}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setExpensePage(0);
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5, gap: 1 }}>
              {(searchQuery || filterCategoryId || filterPaymentMode || filterStatus || filterDateFrom || filterDateTo) && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategoryId('');
                    setFilterPaymentMode('');
                    setFilterStatus('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setExpensePage(0);
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={15} />}
                onClick={handleExportExpensesCsv}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={15} />}
                onClick={() => {
                  fetchExpenses();
                  fetchSummary();
                }}
              >
                Refresh
              </Button>
            </Box>
          </Paper>

          {/* Expenses Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            {loading && <LinearProgress />}
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Expense #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Payee / Party</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Account / Mode</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Taxable (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>GST Tax (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Receipt</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No expenses recorded yet matching your filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map(exp => {
                    const isCancelled = exp.status === 'CANCELLED';
                    return (
                      <TableRow key={exp.id} hover sx={{ opacity: isCancelled ? 0.6 : 1, bgcolor: isCancelled ? '#fff1f2' : 'inherit' }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: isCancelled ? '#991b1b' : '#2563eb' }}>
                          {exp.expense_number}
                        </TableCell>
                        <TableCell>
                          {exp.expense_date ? exp.expense_date.slice(0, 10) : ''}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {exp.category_title || exp.category || 'General'}
                        </TableCell>
                        <TableCell>
                          {exp.payee || exp.employee_name || exp.supplier_name || '—'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              {exp.account_name || 'Cash Account'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                              {exp.payment_mode || 'cash'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(exp.taxable_amount || exp.amount)}
                        </TableCell>
                        <TableCell align="right">
                          {parseFloat(exp.tax_amount || 0) > 0 ? (
                            <Tooltip title={`CGST: ₹${exp.cgst_amount || 0} | SGST: ₹${exp.sgst_amount || 0} | IGST: ₹${exp.igst_amount || 0}`}>
                              <Typography variant="body2" sx={{ color: '#4f46e5', fontWeight: 600, cursor: 'help' }}>
                                {formatCurrency(exp.tax_amount)} ({exp.gst_rate}%)
                              </Typography>
                            </Tooltip>
                          ) : (
                            '₹0.00'
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: isCancelled ? '#991b1b' : '#0f172a' }}>
                          {formatCurrency(exp.total_amount)}
                        </TableCell>
                        <TableCell>
                          {exp.attachment_url ? (
                            <Button
                              size="small"
                              variant="text"
                              href={exp.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              startIcon={<FileText size={14} />}
                              sx={{ textTransform: 'none', py: 0.2 }}
                            >
                              View
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {isCancelled ? (
                            <Tooltip title={`Cancelled: ${exp.cancelled_reason || 'No reason specified'}`}>
                              <Chip size="small" label="Cancelled" color="error" variant="outlined" />
                            </Tooltip>
                          ) : (
                            <Chip size="small" label="Posted" color="success" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="View Voucher">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setActiveVoucher(exp);
                                  setViewVoucherOpen(true);
                                }}
                              >
                                <Eye size={16} color="#2563eb" />
                              </IconButton>
                            </Tooltip>

                            {!isCancelled && (
                              <>
                                <Tooltip title="Edit Expense">
                                  <IconButton size="small" onClick={() => handleOpenRecordExpense(exp)}>
                                    <Edit2 size={16} color="#64748b" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel / Reverse Expense">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setCancellingExpense(exp);
                                      setCancelReason('');
                                      setCancelDialogOpen(true);
                                    }}
                                  >
                                    <XCircle size={16} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={expenseTotalCount}
              rowsPerPage={expenseRowsPerPage}
              page={expensePage}
              onPageChange={(e, p) => setExpensePage(p)}
              onRowsPerPageChange={(e) => {
                setExpenseRowsPerPage(parseInt(e.target.value, 10));
                setExpensePage(0);
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* ================================================================= */}
      {/* TAB 1: CATEGORIES & EXPENSE HEADS */}
      {/* ================================================================= */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Organize expenditures into standard heads (Rent, Salaries, Utilities, Packaging, etc.) with automated deletion safety guards.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => handleOpenCategoryModal()}
            >
              Add Category
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Category Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Expenses Recorded</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Spent</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No categories found. Click "Add Category" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {cat.name}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                        {cat.code || '—'}
                      </TableCell>
                      <TableCell color="text.secondary">
                        {cat.description || '—'}
                      </TableCell>
                      <TableCell align="right">
                        {cat.expense_count || 0}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(cat.total_spent)}
                      </TableCell>
                      <TableCell>
                        {cat.is_active ? (
                          <Chip size="small" label="Active" color="success" variant="outlined" />
                        ) : (
                          <Chip size="small" label="Inactive" color="default" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Edit Category">
                            <IconButton size="small" onClick={() => handleOpenCategoryModal(cat)}>
                              <Edit2 size={16} color="#64748b" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Category">
                            <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ================================================================= */}
      {/* TAB 2: EMPLOYEE REIMBURSEMENT CLAIMS */}
      {/* ================================================================= */}
      {subTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ width: 180 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={claimFilterStatus}
                  label="Status"
                  onChange={(e) => {
                    setClaimFilterStatus(e.target.value);
                    setClaimPage(0);
                  }}
                >
                  <MenuItem value=""><em>All Claims</em></MenuItem>
                  <MenuItem value="SUBMITTED">Submitted</MenuItem>
                  <MenuItem value="REVIEWED">Reviewed</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="REIMBURSED">Reimbursed</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                Claims do not deduct business accounts until manager/admin disburses payout.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => setClaimModalOpen(true)}
            >
              Submit New Claim
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Claim #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Receipt Proof</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Workflow Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No employee reimbursement claims found.
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map(clm => {
                    let statusColor = 'default';
                    if (clm.status === 'SUBMITTED') statusColor = 'warning';
                    if (clm.status === 'REVIEWED') statusColor = 'info';
                    if (clm.status === 'APPROVED') statusColor = 'primary';
                    if (clm.status === 'REIMBURSED') statusColor = 'success';
                    if (clm.status === 'REJECTED') statusColor = 'error';

                    return (
                      <TableRow key={clm.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {clm.claim_number}
                        </TableCell>
                        <TableCell>{clm.expense_date ? clm.expense_date.slice(0, 10) : ''}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{clm.employee_name}</TableCell>
                        <TableCell>{clm.category_title || clm.category_name || 'General'}</TableCell>
                        <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clm.description || '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {formatCurrency(clm.total_amount)}
                        </TableCell>
                        <TableCell>
                          {clm.proof_attachment_url ? (
                            <Button
                              size="small"
                              variant="text"
                              href={clm.proof_attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              startIcon={<FileText size={14} />}
                              sx={{ textTransform: 'none', py: 0.2 }}
                            >
                              Proof
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={clm.status} color={statusColor} variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {clm.status === 'SUBMITTED' && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  sx={{ textTransform: 'none', px: 1, py: 0.2, fontSize: '0.75rem' }}
                                  onClick={() => handleReviewClaim(clm.id)}
                                >
                                  Review
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  sx={{ textTransform: 'none', px: 1, py: 0.2, fontSize: '0.75rem' }}
                                  onClick={() => handleApproveClaim(clm.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ textTransform: 'none', px: 1, py: 0.2, fontSize: '0.75rem' }}
                                  onClick={() => handleRejectClaim(clm.id)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {clm.status === 'REVIEWED' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  sx={{ textTransform: 'none', px: 1, py: 0.2, fontSize: '0.75rem' }}
                                  onClick={() => handleApproveClaim(clm.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ textTransform: 'none', px: 1, py: 0.2, fontSize: '0.75rem' }}
                                  onClick={() => handleRejectClaim(clm.id)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {clm.status === 'APPROVED' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<DollarSign size={14} />}
                                sx={{ textTransform: 'none', px: 1.5, py: 0.2, fontSize: '0.75rem' }}
                                onClick={() => handleOpenDisburse(clm)}
                              >
                                Disburse
                              </Button>
                            )}

                            {clm.status === 'REIMBURSED' && (
                              <Typography variant="caption" color="text.secondary">
                                Paid on {clm.reimbursed_at ? clm.reimbursed_at.slice(0, 10) : 'Done'}
                              </Typography>
                            )}

                            {clm.status === 'REJECTED' && (
                              <Tooltip title={clm.rejection_reason || 'Rejected'}>
                                <Typography variant="caption" color="error">
                                  Reason: {clm.rejection_reason || 'Rejected'}
                                </Typography>
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
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={claimTotalCount}
              rowsPerPage={claimRowsPerPage}
              page={claimPage}
              onPageChange={(e, p) => setClaimPage(p)}
              onRowsPerPageChange={(e) => {
                setClaimRowsPerPage(parseInt(e.target.value, 10));
                setClaimPage(0);
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* ================================================================= */}
      {/* TAB 3: EXPENSE ANALYTICS & BREAKDOWN */}
      {/* ================================================================= */}
      {subTab === 3 && (
        <Box>
          <Grid container spacing={3}>
            {/* Payment Mode Share */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Wallet size={18} color="#2563eb" />
                  Payment Outflow Mode Breakdown
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Cash Drawer Outflow</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(summary.cash_expenses)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={summary.total_amount > 0 ? (summary.cash_expenses / summary.total_amount) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Bank & Digital Transfers</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(summary.bank_expenses)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={summary.total_amount > 0 ? (summary.bank_expenses / summary.total_amount) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' } }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  Cash drawer expenses automatically reduce expected closing cash during Day-End shift reconciliation.
                </Typography>
              </Paper>
            </Grid>

            {/* Tax / ITC Summary */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Landmark size={18} color="#6366f1" />
                  Tax Analysis & ITC Claim
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" color="text.secondary">Net Taxable Expenditure:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(summary.total_taxable)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" color="text.secondary">Input GST Tax (CGST + SGST + IGST):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#4f46e5' }}>{formatCurrency(summary.total_tax)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Gross Business Expenses:</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ef4444' }}>{formatCurrency(summary.total_amount)}</Typography>
                </Box>

                <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
                  Operating expenses are integrated with the Profit & Loss statement to report accurate Net Profit after Cost of Goods Sold (COGS).
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ================================================================= */}
      {/* MODAL: RECORD / EDIT BUSINESS EXPENSE */}
      {/* ================================================================= */}
      <Dialog open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          {editingExpense ? `Edit Expense #${editingExpense.expense_number}` : 'Record Business Expense'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            {/* Category */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Expense Category / Head *</InputLabel>
                <Select
                  value={expenseForm.categoryId}
                  label="Expense Category / Head *"
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setExpenseForm({
                      ...expenseForm,
                      categoryId: e.target.value,
                      categoryName: cat ? cat.name : ''
                    });
                  }}
                >
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Expense Date *"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Amount */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Amount (₹) *"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }
                }}
              />
            </Grid>

            {/* GST Rate */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>GST Rate (%)</InputLabel>
                <Select
                  value={expenseForm.gstRate}
                  label="GST Rate (%)"
                  onChange={(e) => setExpenseForm({ ...expenseForm, gstRate: parseFloat(e.target.value) })}
                >
                  <MenuItem value={0}>0% (Tax Exempt)</MenuItem>
                  <MenuItem value={5}>5% GST</MenuItem>
                  <MenuItem value={12}>12% GST</MenuItem>
                  <MenuItem value={18}>18% GST (Standard)</MenuItem>
                  <MenuItem value={28}>28% GST</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Tax Options (Inclusive & Inter-State) */}
            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={expenseForm.taxInclusive}
                    onChange={(e) => setExpenseForm({ ...expenseForm, taxInclusive: e.target.checked })}
                  />
                }
                label={<Typography variant="caption" sx={{ fontWeight: 600 }}>Tax Inclusive</Typography>}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={expenseForm.isInterState}
                    onChange={(e) => setExpenseForm({ ...expenseForm, isInterState: e.target.checked })}
                  />
                }
                label={<Typography variant="caption" sx={{ fontWeight: 600 }}>IGST (Inter-State)</Typography>}
              />
            </Grid>

            {/* Tax Calculation Live Preview Box */}
            <Grid item xs={12}>
              <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                <Grid container spacing={1}>
                  <Grid item xs={4} sm={2.4}>
                    <Typography variant="caption" color="text.secondary">Taxable Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(calculatedTax.taxable_amount)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2.4}>
                    <Typography variant="caption" color="text.secondary">CGST ({(expenseForm.gstRate / 2).toFixed(1)}%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(calculatedTax.cgst_amount)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2.4}>
                    <Typography variant="caption" color="text.secondary">SGST ({(expenseForm.gstRate / 2).toFixed(1)}%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(calculatedTax.sgst_amount)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2.4}>
                    <Typography variant="caption" color="text.secondary">IGST ({expenseForm.gstRate}%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(calculatedTax.igst_amount)}</Typography>
                  </Grid>
                  <Grid item xs={8} sm={2.4}>
                    <Typography variant="caption" color="text.secondary">Total Payment Outflow:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#ef4444' }}>{formatCurrency(calculatedTax.total_amount)}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Payment Mode */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode *</InputLabel>
                <Select
                  value={expenseForm.paymentMode}
                  label="Payment Mode *"
                  onChange={(e) => {
                    const mode = e.target.value;
                    let targetAcc = expenseForm.accountId;
                    if (mode === 'cash') {
                      const cashAcc = accounts.find(a => a.account_type === 'cash');
                      if (cashAcc) targetAcc = cashAcc.id;
                    } else {
                      const bankAcc = accounts.find(a => a.account_type !== 'cash');
                      if (bankAcc) targetAcc = bankAcc.id;
                    }
                    setExpenseForm({
                      ...expenseForm,
                      paymentMode: mode,
                      accountId: targetAcc
                    });
                  }}
                >
                  <MenuItem value="cash">Cash Drawer</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                  <MenuItem value="upi">UPI / QR Code</MenuItem>
                  <MenuItem value="card">Debit / Credit Card</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Paying Account */}
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth size="small">
                <InputLabel>Paid From Financial Account *</InputLabel>
                <Select
                  value={expenseForm.accountId}
                  label="Paid From Financial Account *"
                  onChange={(e) => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                >
                  {accounts.map(acc => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.account_type.toUpperCase()}) — Balance: {formatCurrency(acc.current_balance)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Payee / Party */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Payee / Vendor Name"
                placeholder="e.g. Landlord, Reliance Jio, ABC Stationery"
                value={expenseForm.payee}
                onChange={(e) => setExpenseForm({ ...expenseForm, payee: e.target.value })}
              />
            </Grid>

            {/* Incurred By Staff (Optional) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Incurred By / Staff Name"
                placeholder="e.g. Ramesh Cashier, Store Manager"
                value={expenseForm.employeeName}
                onChange={(e) => setExpenseForm({ ...expenseForm, employeeName: e.target.value })}
              />
            </Grid>

            {/* Invoice / Reference Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Invoice / Bill / Reference #"
                placeholder="e.g. INV-2026-8921 or UTR90128"
                value={expenseForm.referenceNumber}
                onChange={(e) => setExpenseForm({ ...expenseForm, referenceNumber: e.target.value })}
              />
            </Grid>

            {/* File Upload (Receipt / Invoice / Bill) */}
            <Grid item xs={12} sm={6}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,application/pdf"
                onChange={(e) => handleFileUpload(e, 'expense')}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={uploadingFile ? <CircularProgress size={14} /> : <Upload size={16} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? 'Uploading...' : 'Attach Receipt (Image/PDF)'}
                </Button>
                {expenseForm.attachmentUrl && (
                  <Chip
                    size="small"
                    icon={<CheckCircle2 size={14} />}
                    label={expenseForm.attachmentName || 'Receipt Attached'}
                    color="success"
                    onDelete={() => setExpenseForm({
                      ...expenseForm,
                      attachmentUrl: '',
                      attachmentName: '',
                      attachmentType: ''
                    })}
                  />
                )}
              </Box>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Notes / Purpose of Expense"
                placeholder="Additional notes for bookkeeper and audit trail..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveExpense}>
            {editingExpense ? 'Update Expense' : 'Confirm & Post Expense'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: CATEGORY ADD / EDIT */}
      {/* ================================================================= */}
      <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingCategory ? 'Edit Expense Category' : 'New Expense Category'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Category Name *"
                placeholder="e.g. Store Rent, Staff Welfare, Packaging"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Category Code (Optional)"
                placeholder="e.g. EXP-RENT"
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={categoryForm.is_active === 1}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked ? 1 : 0 })}
                  />
                }
                label="Active Category"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory}>
            Save Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: SUBMIT EMPLOYEE REIMBURSEMENT CLAIM */}
      {/* ================================================================= */}
      <Dialog open={claimModalOpen} onClose={() => setClaimModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Submit Reimbursement Claim
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Employee Name *"
                value={claimForm.employeeName}
                onChange={(e) => setClaimForm({ ...claimForm, employeeName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Expense Date *"
                value={claimForm.expenseDate}
                onChange={(e) => setClaimForm({ ...claimForm, expenseDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={claimForm.categoryId}
                  label="Category"
                  onChange={(e) => setClaimForm({ ...claimForm, categoryId: e.target.value })}
                >
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Claim Amount (₹) *"
                value={claimForm.amount}
                onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Description & Purpose"
                placeholder="e.g. Travel auto fare for visiting vendor warehouse"
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Attach proof receipt or bill (Image/PDF):
              </Typography>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileUpload(e, 'claim')}
              />
              {claimForm.proofAttachmentUrl && (
                <Chip
                  size="small"
                  icon={<CheckCircle2 size={14} />}
                  label="Proof Attached"
                  color="success"
                  sx={{ ml: 1 }}
                />
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setClaimModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleSubmitClaim}>
            Submit Claim
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: DISBURSE / REIMBURSE APPROVED CLAIM */}
      {/* ================================================================= */}
      <Dialog open={disburseModalOpen} onClose={() => setDisburseModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Disburse Employee Reimbursement
        </DialogTitle>
        <DialogContent dividers>
          {disbursingClaim && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Reimbursing <strong>{disbursingClaim.employee_name}</strong> for Claim <strong>#{disbursingClaim.claim_number}</strong>.
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ef4444', mb: 2 }}>
                Payout Amount: {formatCurrency(disbursingClaim.total_amount)}
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Disburse From Account *</InputLabel>
                <Select
                  value={disburseAccount}
                  label="Disburse From Account *"
                  onChange={(e) => setDisburseAccount(e.target.value)}
                >
                  {accounts.map(acc => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({formatCurrency(acc.current_balance)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode *</InputLabel>
                <Select
                  value={disburseMode}
                  label="Payment Mode *"
                  onChange={(e) => setDisburseMode(e.target.value)}
                >
                  <MenuItem value="bank_transfer">Bank Transfer / IMPS</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDisburseModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleConfirmDisbursement}>
            Confirm Payout & Debit Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: CANCEL / REVERSE EXPENSE */}
      {/* ================================================================= */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#991b1b' }}>
          Cancel Business Expense
        </DialogTitle>
        <DialogContent dividers>
          {cancellingExpense && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Cancelling Expense <strong>#{cancellingExpense.expense_number}</strong> will immediately compensate and credit back <strong>{formatCurrency(cancellingExpense.total_amount)}</strong> into <strong>{cancellingExpense.account_name || 'the paying account'}</strong>.
              </Alert>

              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Reason for Cancellation *"
                placeholder="e.g. Duplicate voucher entered, invoice rejected by audit..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Expense</Button>
          <Button variant="contained" color="error" onClick={handleConfirmCancelExpense}>
            Confirm Reversal
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: VIEW EXPENSE VOUCHER */}
      {/* ================================================================= */}
      <Dialog open={viewVoucherOpen} onClose={() => setViewVoucherOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Expense Payment Voucher</span>
          <Button size="small" startIcon={<Printer size={16} />} onClick={() => window.print()}>
            Print
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {activeVoucher && (
            <Box sx={{ p: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {activeVoucher.expense_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Date: {activeVoucher.expense_date ? activeVoucher.expense_date.slice(0, 10) : ''}
                  </Typography>
                </Box>
                <Chip
                  label={activeVoucher.status}
                  color={activeVoucher.status === 'POSTED' ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Category / Head:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {activeVoucher.category_title || activeVoucher.category || 'General'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Payee / Party:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {activeVoucher.payee || activeVoucher.employee_name || activeVoucher.supplier_name || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Payment Account:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {activeVoucher.account_name || 'Cash Drawer'} ({activeVoucher.payment_mode})
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Reference / Invoice #:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {activeVoucher.reference_number || '—'}
                  </Typography>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Taxable Amount:</Typography>
                  <Typography variant="body2">{formatCurrency(activeVoucher.taxable_amount || activeVoucher.amount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">GST Tax ({activeVoucher.gst_rate || 0}%):</Typography>
                  <Typography variant="body2">{formatCurrency(activeVoucher.tax_amount)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total Paid:</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ef4444' }}>
                    {formatCurrency(activeVoucher.total_amount)}
                  </Typography>
                </Box>
              </Paper>

              {activeVoucher.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Notes:</Typography>
                  <Typography variant="body2">{activeVoucher.notes}</Typography>
                </Box>
              )}

              {activeVoucher.attachment_url && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Attached Receipt / Voucher Proof:
                  </Typography>
                  {activeVoucher.attachment_type === 'application/pdf' ? (
                    <Button
                      variant="outlined"
                      size="small"
                      href={activeVoucher.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      startIcon={<FileText size={16} />}
                    >
                      Open PDF Attachment
                    </Button>
                  ) : (
                    <Box
                      component="img"
                      src={activeVoucher.attachment_url}
                      alt="Receipt"
                      sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 1.5, border: '1px solid #e2e8f0' }}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setViewVoucherOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
