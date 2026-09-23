import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Paper, Chip,
  CircularProgress, IconButton, TextField, Grid,
  FormControl, InputLabel, Select, MenuItem, Checkbox,
  Alert, Tooltip
} from '@mui/material';
import { X, DollarSign, ArrowRight, CheckCircle2, AlertTriangle, Building2, Sparkles, Printer } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

const PAYMENT_MODES = [
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Cash',
  'Card',
  'Net Banking',
  'Other'
];

export default function SupplierPaymentModal({ open, onClose, supplier: initialSupplier, onPaymentSuccess }) {
  const notify = useNotify();

  const [suppliersList, setSuppliersList] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplier?.id || '');
  const [payableDetails, setPayableDetails] = useState(null);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment Form Fields
  const [paymentDate, setPaymentDate] = useState(() => getISTDateString());
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [accountId, setAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Bill Allocations: Map of billId -> allocated amount
  const [allocations, setAllocations] = useState({});

  // Reset or load initial data when modal opens
  useEffect(() => {
    if (open) {
      setPaymentDate(getISTDateString());
      setPaymentMode('Bank Transfer');
      setReferenceNumber('');
      setNotes('');
      setTotalPaymentAmount('');
      setAllocations({});

      // Fetch financial accounts
      fetchAccounts();

      if (initialSupplier?.id) {
        setSelectedSupplierId(initialSupplier.id);
        fetchSupplierDetails(initialSupplier.id);
      } else {
        fetchSuppliers();
      }
    }
  }, [open, initialSupplier]);

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch('/api/finance/accounts');
      if (res.ok) {
        const data = await res.json();
        setFinancialAccounts(data.filter(a => a.is_active));
        // Default to first active bank/cash account
        const def = data.find(a => a.is_default) || data[0];
        if (def) setAccountId(def.id);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiFetch('/api/inventory/suppliers?status=active');
      if (res.ok) {
        const data = await res.json();
        setSuppliersList(data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchSupplierDetails = async (suppId) => {
    if (!suppId) return;
    setLoadingDetails(true);
    try {
      const res = await apiFetch(`/api/inventory/suppliers/${suppId}/payables`);
      if (res.ok) {
        const data = await res.json();
        setPayableDetails(data);
        // Pre-fill total payment amount with total outstanding if empty
        if (!totalPaymentAmount && data.summary.total_outstanding > 0) {
          setTotalPaymentAmount(data.summary.total_outstanding.toFixed(2));
        }
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to load supplier payables', 'Error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSupplierChange = (e) => {
    const sId = e.target.value;
    setSelectedSupplierId(sId);
    setAllocations({});
    setTotalPaymentAmount('');
    fetchSupplierDetails(sId);
  };

  // Live Calculations
  const parsedTotalPayment = parseFloat(totalPaymentAmount) || 0;

  const totalAllocated = useMemo(() => {
    let sum = 0;
    for (const val of Object.values(allocations)) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) sum += num;
    }
    return parseFloat(sum.toFixed(2));
  }, [allocations]);

  const advanceAmount = useMemo(() => {
    if (parsedTotalPayment > totalAllocated) {
      return parseFloat((parsedTotalPayment - totalAllocated).toFixed(2));
    }
    return 0;
  }, [parsedTotalPayment, totalAllocated]);

  const isAllocationOverPayment = totalAllocated > parsedTotalPayment + 0.01;

  // Handle single bill allocation change
  const handleAllocationChange = (billId, value, maxAllowed) => {
    const rawVal = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    if (rawVal !== '' && rawVal > maxAllowed) {
      setAllocations(prev => ({ ...prev, [billId]: maxAllowed }));
    } else {
      setAllocations(prev => ({ ...prev, [billId]: rawVal }));
    }
  };

  // Toggle bill selection
  const handleToggleBill = (bill) => {
    const current = allocations[bill.id];
    if (current && current > 0) {
      // Remove allocation
      setAllocations(prev => {
        const next = { ...prev };
        delete next[bill.id];
        return next;
      });
    } else {
      // Allocate either full outstanding or remaining payment amount
      const remainingPayable = Math.max(0, parsedTotalPayment - totalAllocated);
      const allocAmt = remainingPayable > 0
        ? Math.min(bill.outstanding_amount, remainingPayable)
        : bill.outstanding_amount;
      setAllocations(prev => ({ ...prev, [bill.id]: allocAmt }));
    }
  };

  // Auto Allocate FIFO (Oldest Bill First)
  const handleAutoAllocate = () => {
    if (!payableDetails?.unpaid_bills || parsedTotalPayment <= 0) {
      notify.warning('Please enter a valid payment amount first.', 'Notice');
      return;
    }

    let remainingFunds = parsedTotalPayment;
    const newAllocations = {};

    for (const bill of payableDetails.unpaid_bills) {
      if (remainingFunds <= 0) break;
      const alloc = Math.min(bill.outstanding_amount, remainingFunds);
      newAllocations[bill.id] = alloc;
      remainingFunds -= alloc;
    }

    setAllocations(newAllocations);
    notify.success('Auto-allocated funds across bills in chronological order (FIFO).', 'Auto-Allocated');
  };

  // Submit Payment
  const handleSubmitPayment = async () => {
    if (!selectedSupplierId) {
      notify.error('Please select a supplier.', 'Validation');
      return;
    }
    if (parsedTotalPayment <= 0) {
      notify.error('Payment amount must be greater than 0.', 'Validation');
      return;
    }
    if (isAllocationOverPayment) {
      notify.error('Total allocated amount exceeds payment amount.', 'Validation');
      return;
    }

    const allocArray = [];
    for (const [bId, val] of Object.entries(allocations)) {
      const amt = parseFloat(val);
      if (!isNaN(amt) && amt > 0) {
        allocArray.push({
          purchase_bill_id: parseInt(bId, 10),
          allocated_amount: amt
        });
      }
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/inventory/suppliers/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: parseInt(selectedSupplierId, 10),
          payment_date: paymentDate,
          amount: parsedTotalPayment,
          payment_mode: paymentMode,
          account_id: accountId ? parseInt(accountId, 10) : null,
          reference_number: referenceNumber || null,
          notes: notes || null,
          allocations: allocArray
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      notify.success(
        `Payment ${data.payment.payment_number} of ₹${parsedTotalPayment.toLocaleString('en-IN')} recorded successfully!`,
        'Payment Successful'
      );

      if (onPaymentSuccess) onPaymentSuccess(data.payment);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Payment Error');
    } finally {
      setSubmitting(false);
    }
  };

  const supplier = payableDetails?.supplier;
  const unpaidBills = payableDetails?.unpaid_bills || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '92vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#ecfdf5', color: '#059669' }}>
              <DollarSign size={22} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Record Supplier Payment
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Settle multiple purchase bills and credit excess as supplier advances
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><X size={18} /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Supplier Selector / Header Strip */}
        {!initialSupplier && (
          <FormControl fullWidth size="small">
            <InputLabel>Select Supplier</InputLabel>
            <Select
              value={selectedSupplierId}
              label="Select Supplier"
              onChange={handleSupplierChange}
            >
              {suppliersList.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} {s.company_name ? `(${s.company_name})` : ''} — Outstanding: ₹{parseFloat(s.current_balance || 0).toFixed(2)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {loadingDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : supplier ? (
          <>
            {/* Supplier Stats Banner */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Supplier
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {supplier.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {supplier.supplier_code} • {supplier.mobile || 'No phone'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Outstanding
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: supplier.current_balance > 0 ? '#dc2626' : '#16a34a' }}>
                    ₹{parseFloat(supplier.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Typography>
                  {payableDetails?.summary.total_overdue > 0 && (
                    <Chip
                      label={`₹${payableDetails.summary.total_overdue.toFixed(2)} Overdue`}
                      size="small"
                      color="error"
                      sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Available Advance
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#059669' }}>
                    ₹{parseFloat(supplier.advance_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Can be adjusted against future bills
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Payment Details Form */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#334155' }}>
                Payment Parameters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Total Payment Amount (₹)"
                    type="number"
                    value={totalPaymentAmount}
                    onChange={e => setTotalPaymentAmount(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    inputProps={{ min: 0.01, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Mode</InputLabel>
                    <Select
                      value={paymentMode}
                      label="Payment Mode"
                      onChange={e => setPaymentMode(e.target.value)}
                    >
                      {PAYMENT_MODES.map(m => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Account (Paid From)</InputLabel>
                    <Select
                      value={accountId}
                      label="Account (Paid From)"
                      onChange={e => setAccountId(e.target.value)}
                    >
                      <MenuItem value="">Auto-Resolve by Mode</MenuItem>
                      {financialAccounts.map(acc => (
                        <MenuItem key={acc.id} value={acc.id}>
                          {acc.account_name} (₹{parseFloat(acc.current_balance || 0).toFixed(2)})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Reference / UTR / Cheque Number"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g. UTR12345678 or Cheque #4421"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Notes & Remarks"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Optional notes"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Bill Allocation Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Allocate Payment to Purchase Bills ({unpaidBills.length} pending)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Select bills and enter allocation amounts, or click "Auto Allocate (FIFO)"
                  </Typography>
                </Box>
                {unpaidBills.length > 0 && parsedTotalPayment > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Sparkles size={14} />}
                    onClick={handleAutoAllocate}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  >
                    Auto Allocate (FIFO)
                  </Button>
                )}
              </Box>

              {unpaidBills.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  This supplier has no outstanding purchase bills. Any payment recorded will become a <strong>Supplier Advance</strong>.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 260 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={unpaidBills.length > 0 && unpaidBills.every(b => (allocations[b.id] || 0) > 0)}
                            indeterminate={unpaidBills.some(b => (allocations[b.id] || 0) > 0) && !unpaidBills.every(b => (allocations[b.id] || 0) > 0)}
                            onChange={(e) => {
                              if (e.target.checked) handleAutoAllocate();
                              else setAllocations({});
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Bill #</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Bill Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Bill Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Paid</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>Allocate (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unpaidBills.map(b => {
                        const isAllocated = (allocations[b.id] || 0) > 0;
                        return (
                          <TableRow key={b.id} hover selected={isAllocated}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isAllocated}
                                onChange={() => handleToggleBill(b)}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {b.internal_bill_number}
                              {b.bill_number && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                  Ref: {b.bill_number}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {new Date(b.bill_date).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN') : '—'}
                              {b.is_overdue && (
                                <Chip
                                  label={`${b.days_overdue}d Overdue`}
                                  color="error"
                                  size="small"
                                  sx={{ ml: 0.5, height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">₹{b.total_amount.toFixed(2)}</TableCell>
                            <TableCell align="right">₹{b.paid_amount.toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#dc2626' }}>
                              ₹{b.outstanding_amount.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={allocations[b.id] !== undefined ? allocations[b.id] : ''}
                                onChange={e => handleAllocationChange(b.id, e.target.value, b.outstanding_amount)}
                                placeholder="0.00"
                                inputProps={{
                                  min: 0,
                                  max: b.outstanding_amount,
                                  step: 0.01,
                                  style: { textAlign: 'right', fontWeight: 700, padding: '4px 8px' }
                                }}
                                sx={{ width: 120 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Allocation Live Summary Bar */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isAllocationOverPayment ? '#fef2f2' : (advanceAmount > 0 ? '#f0fdf4' : '#f8fafc'),
                borderColor: isAllocationOverPayment ? '#ef4444' : (advanceAmount > 0 ? '#10b981' : '#cbd5e1')
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Total Payment</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    ₹{parsedTotalPayment.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Total Allocated</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isAllocationOverPayment ? '#ef4444' : '#0284c7' }}>
                    ₹{totalAllocated.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  {isAllocationOverPayment ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#dc2626' }}>
                      <AlertTriangle size={18} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Allocation exceeds payment by ₹{(totalAllocated - parsedTotalPayment).toFixed(2)}!
                      </Typography>
                    </Box>
                  ) : advanceAmount > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#059669' }}>
                      <CheckCircle2 size={18} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ₹{advanceAmount.toFixed(2)} will be credited as Supplier Advance.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748b' }}>
                      <CheckCircle2 size={18} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Payment fully allocated across bills.
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmitPayment}
          disabled={submitting || !selectedSupplierId || parsedTotalPayment <= 0 || isAllocationOverPayment}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <DollarSign size={16} />}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {submitting ? 'Recording...' : `Confirm & Pay ₹${parsedTotalPayment.toFixed(2)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
