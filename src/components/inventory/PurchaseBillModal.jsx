import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert, MenuItem,
  LinearProgress, InputAdornment, CircularProgress, Tooltip, TableContainer
} from '@mui/material';
import { X, Plus, Trash2, Receipt, ArrowRight, CheckCircle, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';

export function calculateDueDateFromTerms(terms, billDateStr) {
  if (!terms || typeof terms !== 'string') return '';
  const trimmed = terms.trim().toLowerCase();
  if (trimmed === 'immediate') {
    return billDateStr || getISTDateString();
  }
  const match = trimmed.match(/(\d+)/);
  if (match) {
    const days = parseInt(match[1], 10);
    if (!isNaN(days) && days >= 0) {
      const base = billDateStr ? new Date(billDateStr + 'T00:00:00') : new Date();
      base.setDate(base.getDate() + days);
      const y = base.getFullYear();
      const m = String(base.getMonth() + 1).padStart(2, '0');
      const d = String(base.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return '';
}

export function mapSourceItemsToBillItems(sourceItems, fullData) {
  if (!Array.isArray(sourceItems)) return [];
  const isGrn = Boolean(fullData?._grn_id || fullData?.grn_number);
  const hasGRNs = (fullData?.grns && fullData.grns.length > 0) || isGrn;

  // Flatten any GRN items
  const allGrnItems = [];
  if (fullData?.grns && Array.isArray(fullData.grns)) {
    for (const g of fullData.grns) {
      if (Array.isArray(g.items)) allGrnItems.push(...g.items);
    }
  }
  if (isGrn) {
    allGrnItems.push(...sourceItems);
  }

  return sourceItems.map(it => {
    let qtyReceived;
    if (isGrn) {
      qtyReceived = parseFloat(it.accepted_qty !== undefined ? it.accepted_qty : (it.received_qty !== undefined ? it.received_qty : it.quantity || 0));
    } else if (hasGRNs) {
      const recv = parseFloat(it.received_qty || 0);
      qtyReceived = recv > 0 ? recv : parseFloat(it.quantity || 0);
    } else {
      qtyReceived = parseFloat(it.quantity || 0);
    }

    const billedQty = parseFloat(it.billed_qty || 0);
    const remainingQty = Math.max(0, qtyReceived - billedQty);
    // Use remaining unbilled qty if partial billing; if remaining is 0 and was already billed, keep qtyReceived so user can adjust
    const finalQty = (billedQty > 0 && remainingQty === 0) ? qtyReceived : (billedQty > 0 ? remainingQty : qtyReceived);

    const rate = parseFloat(it.rate || it.purchase_price || it.cost_price || 0);
    const taxRate = parseFloat(it.tax_rate || it.gst_rate || 0);
    const disc = parseFloat(it.discount_amount || 0);
    const base = Math.max(0, (finalQty * rate) - disc);
    const taxAmt = base * (taxRate / 100);

    let batchNo = it.batch_number || '';
    let expDate = it.expiry_date ? String(it.expiry_date).split('T')[0] : '';
    if (!batchNo || !expDate) {
      const matchingGi = allGrnItems.find(gi => (gi.menu_item_id === (it.menu_item_id || it.id) || gi.purchase_order_item_id === it.id) && (gi.batch_number || gi.expiry_date));
      if (matchingGi) {
        if (!batchNo && matchingGi.batch_number) batchNo = matchingGi.batch_number;
        if (!expDate && matchingGi.expiry_date) expDate = String(matchingGi.expiry_date).split('T')[0];
      }
    }

    return {
      menu_item_id: it.menu_item_id || it.id,
      item_name: it.item_name || it.name,
      sku: it.sku || '',
      unit: it.unit || 'pcs',
      quantity: finalQty,
      rate: rate,
      tax_rate: taxRate,
      tax_amount: taxAmt,
      discount_amount: disc,
      total_amount: base + taxAmt,
      batch_number: batchNo,
      expiry_date: expDate
    };
  });
}

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid (Credit)', color: '#64748b' },
  { value: 'partially_paid', label: 'Partially Paid', color: '#d97706' },
  { value: 'paid', label: 'Fully Paid', color: '#16a34a' },
];

const PAYMENT_MODE_OPTIONS = [
  { value: 'Bank Transfer', label: 'Bank Transfer / NEFT' },
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI / QR' },
  { value: 'Cheque', label: 'Cheque' },
];

const CustomDropdownPaper = React.forwardRef(function CustomDropdownPaper(props, ref) {
  const { children, ...other } = props;
  return (
    <Paper
      ref={ref}
      {...other}
      sx={{
        ...other?.sx,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        border: '1px solid #cbd5e1',
        borderRadius: 2,
        zIndex: 1500,
        '& .MuiAutocomplete-option': {
          px: 2,
          py: 1.25,
          '&:hover, &.Mui-focused': {
            bgcolor: 'rgba(234, 88, 12, 0.06)'
          },
          '&[aria-selected="true"]': {
            bgcolor: 'rgba(234, 88, 12, 0.10)'
          }
        }
      }}
    >
      <Box sx={{ flex: '1 1 auto', overflowY: 'auto', maxHeight: 250, '& .MuiAutocomplete-listbox': { maxHeight: 'none' } }}>
        {children}
      </Box>
    </Paper>
  );
});

export default function PurchaseBillModal({
  open,
  onClose,
  onCreated,
  warehouses = [],
  suppliers = [],
  prefilledPO = null
}) {
  const notify = useNotify();
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(() => getISTDateString());
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [loadingPOData, setLoadingPOData] = useState(false);
  const [existingBills, setExistingBills] = useState([]);
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);
  const lastInitKeyRef = React.useRef(null);
  const isAutoGeneratedRef = React.useRef(true);
  const initialAutoNumberRef = React.useRef('');

  const fetchNextBillNumber = async (dateStr = null) => {
    try {
      setLoadingNextNumber(true);
      const d = dateStr || billDate || getISTDateString();
      const res = await apiFetch(`/api/inventory/purchases/bills/next-number?bill_date=${d}`);
      if (res.ok) {
        const data = await res.json();
        const nextNum = data.next_bill_number || data.nextNumber || data.bill_number;
        if (nextNum) {
          setBillNumber(nextNum);
          initialAutoNumberRef.current = nextNum;
          isAutoGeneratedRef.current = true;
        }
      }
    } catch (err) {
      console.warn('Could not auto-generate purchase bill number:', err);
    } finally {
      setLoadingNextNumber(false);
    }
  };

  useEffect(() => {
    if (open) {
      const editFlag = prefilledPO?._edit_mode ? 'edit' : 'new';
      const initKey = `${prefilledPO?.id || 'new'}_${prefilledPO?._grn_id || ''}_${prefilledPO?.po_number || prefilledPO?.internal_bill_number || ''}_${prefilledPO?.items?.length || 0}_${editFlag}`;
      if (lastInitKeyRef.current !== initKey) {
        lastInitKeyRef.current = initKey;
        const today = getISTDateString();

        if (prefilledPO?._edit_mode) {
          // ── Edit Mode: restore a saved bill's full data ──
          setBillNumber(prefilledPO.bill_number || '');
          initialAutoNumberRef.current = prefilledPO.bill_number || '';
          isAutoGeneratedRef.current = false;
          setBillDate(prefilledPO.bill_date ? String(prefilledPO.bill_date).split('T')[0] : today);
          setDueDate(prefilledPO.due_date ? String(prefilledPO.due_date).split('T')[0] : '');
          setSupplierId(String(prefilledPO.supplier_id || ''));
          setWarehouseId(String(prefilledPO.warehouse_id || ''));
          setPaymentStatus(prefilledPO.payment_status || 'unpaid');
          setPaidAmount(parseFloat(prefilledPO.paid_amount || 0));
          setPaymentMode(prefilledPO.payment_mode || 'Bank Transfer');
          setAdditionalCharges(parseFloat(prefilledPO.additional_charges || 0));
          setDiscountAmount(parseFloat(prefilledPO.discount_amount || 0));
          setNotes(prefilledPO.notes || '');
          setExistingBills([]);
          setItems(Array.isArray(prefilledPO.items) ? prefilledPO.items : []);
        } else {
          // ── New Bill Mode: auto-fetch next bill number & reset fields ──
          setBillNumber('');
          initialAutoNumberRef.current = '';
          isAutoGeneratedRef.current = true;
          fetchNextBillNumber(today);
          setBillDate(today);
          setDueDate('');
          setPaymentStatus('unpaid');
          setPaidAmount(0);
          setPaymentMode('Bank Transfer');
          setAdditionalCharges(0);
          setDiscountAmount(0);
          setNotes('');
          setExistingBills([]);

          if (prefilledPO) {
            const sId = String(prefilledPO.supplier_id || '');
            const wId = String(prefilledPO.warehouse_id || '');
            setSupplierId(sId);
            setWarehouseId(wId);

            const supp = suppliers.find(s => String(s.id) === sId);
            const creditTerms = supp?.payment_terms || prefilledPO.supplier_payment_terms || '';
            setDueDate(calculateDueDateFromTerms(creditTerms, today));

            setAdditionalCharges(parseFloat(prefilledPO.additional_charges || 0));
            setDiscountAmount(parseFloat(prefilledPO.discount_amount || 0));

            const isGrn = Boolean(prefilledPO._grn_id || prefilledPO.grn_number);
            if (isGrn) {
              setNotes(`Created against GRN #${prefilledPO.grn_number || prefilledPO._grn_id}${prefilledPO.po_number ? ` (PO #${prefilledPO.po_number})` : ''}`);
            } else {
              setNotes(`Created against Purchase Order #${prefilledPO.po_number || ''}`);
            }

            if (Array.isArray(prefilledPO.items) && prefilledPO.items.length > 0) {
              const targetPOId = prefilledPO.purchase_order_id || prefilledPO.id;
              const rawBills = prefilledPO.bills || prefilledPO.related_bills || [];
              const matchingBills = targetPOId
                ? rawBills.filter(b => b && b.purchase_order_id && String(b.purchase_order_id) === String(targetPOId))
                : [];
              const seen = new Set();
              const dedupedBills = matchingBills.filter(b => {
                const k = b.id || b.internal_bill_number || b.bill_number;
                if (!k || seen.has(k)) return false;
                seen.add(k);
                return true;
              });
              setExistingBills(dedupedBills);
              setItems(mapSourceItemsToBillItems(prefilledPO.items, prefilledPO));
            } else {
              setLoadingPOData(true);
              const endpoint = isGrn
                ? `/api/inventory/purchases/grns/${prefilledPO._grn_id || prefilledPO.id}`
                : `/api/inventory/purchases/orders/${prefilledPO.id}`;

              apiFetch(endpoint)
                .then(r => r.json())
                .then(fullData => {
                  if (fullData && !fullData.error) {
                    const targetId = fullData.id;
                    const raw = fullData.bills || fullData.related_bills || [];
                    const matching = targetId
                      ? raw.filter(b => b && b.purchase_order_id && String(b.purchase_order_id) === String(targetId))
                      : [];
                    const seen = new Set();
                    const deduped = matching.filter(b => {
                      const k = b.id || b.internal_bill_number || b.bill_number;
                      if (!k || seen.has(k)) return false;
                      seen.add(k);
                      return true;
                    });
                    setExistingBills(deduped);
                    if (Array.isArray(fullData.items)) {
                      setItems(mapSourceItemsToBillItems(fullData.items, fullData));
                    }
                    if (fullData.discount_amount) {
                      setDiscountAmount(parseFloat(fullData.discount_amount || 0));
                    }
                    if (fullData.additional_charges) {
                      setAdditionalCharges(parseFloat(fullData.additional_charges || 0));
                    }
                  }
                })
                .catch(err => {
                  console.error('Failed to load full PO/GRN for bill:', err);
                  notify.error('Failed to load item details.', 'Load Error');
                })
                .finally(() => setLoadingPOData(false));
            }
          } else {
            setItems([]);
            setSupplierId('');
            setWarehouseId('');
            if (warehouses.length > 0) {
              const defaultWh = warehouses.find(w => w.is_default) || warehouses[0];
              setWarehouseId(defaultWh ? String(defaultWh.id) : '');
            }
            if (suppliers.length > 0) {
              const defSupp = suppliers[0];
              const defId = String(defSupp.id);
              setSupplierId(defId);
              if (defSupp.payment_terms) {
                setDueDate(calculateDueDateFromTerms(defSupp.payment_terms, today));
              }
            }
          }
        }

        apiFetch('/api/menu')
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) setAvailableProducts(data);
          })
          .catch(err => console.error(err));
      }
    } else {
      lastInitKeyRef.current = null;
    }
  }, [open, prefilledPO, suppliers, warehouses]);


  const handleSupplierChange = (e) => {
    const newId = e.target.value;
    setSupplierId(newId);
    const supp = suppliers.find(s => String(s.id) === String(newId));
    if (supp?.payment_terms) {
      setDueDate(calculateDueDateFromTerms(supp.payment_terms, billDate));
    }
  };

  const handleBillDateChange = (e) => {
    const newDate = e.target.value;
    setBillDate(newDate);
    const supp = suppliers.find(s => String(s.id) === String(supplierId));
    if (supp?.payment_terms) {
      setDueDate(calculateDueDateFromTerms(supp.payment_terms, newDate));
    }
  };

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already in this bill.`, 'Duplicate Item');
      return;
    }

    const rate = parseFloat(product.purchase_price || product.cost_price || product.price || 0);
    const taxRate = parseFloat(product.gst_rate || 0);
    const taxAmt = rate * (taxRate / 100);

    setItems([...items, {
      menu_item_id: product.id,
      item_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      quantity: 1,
      rate,
      tax_rate: taxRate,
      tax_amount: taxAmt,
      discount_amount: 0,
      total_amount: rate + taxAmt,
      batch_number: '',
      expiry_date: ''
    }]);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    const qty = parseFloat(row.quantity || 0);
    const rate = parseFloat(row.rate || 0);
    const taxRate = parseFloat(row.tax_rate || 0);
    const disc = parseFloat(row.discount_amount || 0);

    const base = Math.max(0, (qty * rate) - disc);
    const taxAmt = base * (taxRate / 100);
    row.tax_amount = taxAmt;
    row.total_amount = base + taxAmt;

    updated[index] = row;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, it) => acc + ((parseFloat(it.quantity || 0) * parseFloat(it.rate || 0)) - parseFloat(it.discount_amount || 0)), 0);
  const totalTax = items.reduce((acc, it) => acc + parseFloat(it.tax_amount || 0), 0);
  const grandTotal = Math.max(0, subtotal + totalTax + parseFloat(additionalCharges || 0) - parseFloat(discountAmount || 0));
  const parsedPaid = parseFloat(paidAmount) || 0;
  const balanceDue = paymentStatus === 'unpaid' ? grandTotal : paymentStatus === 'paid' ? 0 : Math.max(0, grandTotal - parsedPaid);

  // Automatically adjust paid amount if marked fully paid or recalculate when grandTotal changes
  const handlePaymentStatusChange = (newStatus) => {
    setPaymentStatus(newStatus);
    if (newStatus === 'paid') {
      setPaidAmount(grandTotal);
      if (!paymentMode) setPaymentMode('Bank Transfer');
    } else if (newStatus === 'unpaid') {
      setPaidAmount(0);
    } else if (newStatus === 'partially_paid') {
      const cur = parseFloat(paidAmount) || 0;
      if (cur <= 0 || cur >= grandTotal) {
        setPaidAmount('');
      }
      if (!paymentMode) setPaymentMode('Bank Transfer');
    }
  };

  useEffect(() => {
    if (paymentStatus === 'paid') {
      setPaidAmount(grandTotal);
    } else if (paymentStatus === 'unpaid') {
      setPaidAmount(0);
    } else if (paymentStatus === 'partially_paid') {
      if (paidAmount !== '' && parseFloat(paidAmount) >= grandTotal && grandTotal > 0) {
        setPaidAmount(Math.max(0, grandTotal - 1));
      }
    }
  }, [paymentStatus, grandTotal]);

  const handleSubmit = async () => {
    const finalBillNo = billNumber.trim();
    if (!finalBillNo && !isAutoGeneratedRef.current) {
      notify.error('Please enter a Bill / Invoice Number.', 'Validation');
      return;
    }
    if (!supplierId) {
      notify.error('Please select a supplier.', 'Validation');
      return;
    }
    if (!warehouseId) {
      notify.error('Please select a receiving warehouse.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one item to this purchase bill.', 'Validation');
      return;
    }

    for (const it of items) {
      if (!it.quantity || parseFloat(it.quantity) <= 0) {
        notify.error(`Please enter a valid quantity for "${it.item_name}".`, 'Validation');
        return;
      }
    }

    // Payment validations
    if (paymentStatus === 'partially_paid') {
      const paidVal = parseFloat(paidAmount);
      if (isNaN(paidVal) || paidVal <= 0) {
        notify.error('Please enter an Amount Paid greater than ₹0 for partial payment.', 'Payment Validation');
        return;
      }
      if (paidVal >= grandTotal) {
        notify.error(
          `Amount Paid (₹${paidVal.toFixed(2)}) cannot equal or exceed Grand Total (₹${grandTotal.toFixed(2)}) for partial payment. Please select "Fully Paid" instead.`,
          'Payment Validation'
        );
        return;
      }
      if (!paymentMode) {
        notify.error('Please select a Payment Mode for partial payment.', 'Payment Validation');
        return;
      }
    } else if (paymentStatus === 'paid') {
      if (grandTotal > 0 && (!paidAmount || parseFloat(paidAmount) <= 0)) {
        notify.error('Grand Total must be greater than ₹0 for full payment.', 'Payment Validation');
        return;
      }
      if (!paymentMode) {
        notify.error('Please select a Payment Mode for full payment.', 'Payment Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const isGrnSource = Boolean(prefilledPO?._grn_id || prefilledPO?.grn_number);
      const poId = prefilledPO
        ? (prefilledPO.purchase_order_id || (isGrnSource ? null : prefilledPO.id))
        : null;
      const grnId = prefilledPO
        ? (prefilledPO._grn_id || (isGrnSource ? prefilledPO.id : (prefilledPO.grns?.[0]?.id || null)))
        : null;

      const payload = {
        bill_number: finalBillNo,
        is_auto_generated: isAutoGeneratedRef.current || !finalBillNo,
        purchase_order_id: poId,
        grn_id: grnId,
        supplier_id: parseInt(supplierId),
        warehouse_id: parseInt(warehouseId),
        bill_date: billDate,
        due_date: dueDate || null,
        subtotal,
        tax_amount: totalTax,
        discount_amount: parseFloat(discountAmount || 0),
        additional_charges: parseFloat(additionalCharges || 0),
        total_amount: grandTotal,
        paid_amount: paymentStatus === 'unpaid' ? 0 : parseFloat(paidAmount || 0),
        payment_status: paymentStatus,
        payment_mode: paymentStatus === 'unpaid' ? null : paymentMode,
        notes: notes.trim(),
        items: items.map(it => ({
          menu_item_id: it.menu_item_id,
          item_name: it.item_name,
          unit: it.unit,
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          tax_rate: parseFloat(it.tax_rate || 0),
          tax_amount: parseFloat(it.tax_amount || 0),
          discount_amount: parseFloat(it.discount_amount || 0),
          total_amount: parseFloat(it.total_amount || 0),
          batch_number: it.batch_number || null,
          expiry_date: it.expiry_date || null
        }))
      };

      const res = await apiFetch('/api/inventory/purchases/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Purchase Bill');

      notify.success('Purchase bill saved! Stock has been added to warehouse.', 'Goods Inward Completed');
      if (onCreated) onCreated(data.bill);
      onClose();
    } catch (err) {
      notify.error(err.message, 'Purchase Bill Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ '& .MuiDialog-paper': { width: '100%', maxWidth: 1180, borderRadius: 2.5 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Receipt size={22} color={prefilledPO?._edit_mode ? '#7c3aed' : '#16a34a'} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {prefilledPO?._edit_mode ? 'Edit Purchase Bill' : 'Record Purchase Bill (Goods Inward)'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {prefilledPO?._edit_mode
                ? `Editing ${prefilledPO.internal_bill_number || ''} — changes will be saved as a new bill revision.`
                : 'Directly records goods inward from vendor, updates warehouse stock, and logs purchase ledger.'}
            </Typography>

          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Real-time stock impact notice */}
        <Alert severity="success" sx={{ py: 0.5, fontSize: '0.82rem' }}>
          <strong>Instant Stock Inflow:</strong> Saving this bill immediately increases inventory in the selected warehouse and credits the supplier balance.
        </Alert>

        {/* Existing Bill Notice (if any) */}
        {existingBills && existingBills.length > 0 && (
          <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.82rem' }}>
            <strong>Notice:</strong> A purchase bill already exists for this {prefilledPO?._grn_id ? 'GRN' : 'Purchase Order'}{' '}
            ({existingBills.map(b => b.bill_number || b.internal_bill_number).join(', ')}).
            Line items have been prefilled with remaining unbilled quantities.
          </Alert>
        )}

        {/* Loading PO Details Indicator */}
        {loadingPOData && (
          <Box sx={{ width: '100%', py: 1 }}>
            <LinearProgress color="success" />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
              Loading line items and pricing from {prefilledPO?._grn_id ? 'GRN' : 'Purchase Order'}...
            </Typography>
          </Box>
        )}

        {/* Vendor & Warehouse Info */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Vendor Invoice / Bill No."
                size="small"
                fullWidth
                value={billNumber}
                onChange={e => {
                  setBillNumber(e.target.value);
                  isAutoGeneratedRef.current = (e.target.value.trim() === initialAutoNumberRef.current);
                }}
                placeholder="e.g. PB-20260928-0001 or INV-904"
                helperText={
                  loadingNextNumber
                    ? 'Generating sequential bill number...'
                    : isAutoGeneratedRef.current
                    ? "Auto-generated internal bill number. You can edit or enter vendor's invoice #"
                    : 'Custom invoice number entered'
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        {loadingNextNumber ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Tooltip title="Generate next sequential bill number">
                            <IconButton
                              size="small"
                              onClick={() => fetchNextBillNumber(billDate)}
                              edge="end"
                              sx={{ color: '#64748b', '&:hover': { color: '#0f172a' } }}
                            >
                              <RefreshCw size={15} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                label="Supplier / Vendor *"
                size="small"
                fullWidth
                required
                value={supplierId}
                onChange={handleSupplierChange}
                slotProps={{ select: { native: true } }}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.company_name || s.mobile})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                label="Receiving Warehouse *"
                size="small"
                fullWidth
                required
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                slotProps={{ select: { native: true } }}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 1.5 }}>
              <TextField
                label="Bill Date *"
                type="date"
                size="small"
                fullWidth
                required
                value={billDate}
                onChange={handleBillDateChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 1.5 }}>
              <TextField
                label="Due Date"
                type="date"
                size="small"
                fullWidth
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Product Autocomplete */}
        <Autocomplete
          options={availableProducts}
          getOptionKey={opt => typeof opt === 'string' ? opt : (opt.id ? `product-${opt.id}` : `${opt.name}-${opt.sku || opt.barcode || ''}`)}
          getOptionLabel={opt => `${opt.name} (${opt.sku || opt.barcode || opt.unit})`}
          onChange={(e, val) => handleAddItem(val)}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <li key={option.id ? `product-opt-${option.id}` : key} {...rest}>
                {option.name} ({option.sku || option.barcode || option.unit})
              </li>
            );
          }}
          renderInput={params => (
            <TextField
              {...params}
              label="Add Received Product to Bill"
              size="small"
              placeholder="Search by name, SKU, or scan barcode..."
            />
          )}
          clearOnBlur
          value={null}
        />

        {/* Bill Items Table */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            width: '100%',
            flexShrink: 0,
            maxHeight: 400,
            minHeight: items.length === 0 ? 110 : (items.length === 1 ? 130 : 160),
            overflowX: 'auto',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '7px',
              height: '7px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#cbd5e1',
              borderRadius: '4px'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: '#94a3b8'
            }
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 170, bgcolor: '#f8fafc' }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 70, bgcolor: '#f8fafc' }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110, bgcolor: '#f8fafc' }} align="right">Qty Received</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110, bgcolor: '#f8fafc' }} align="right">Rate (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 85, bgcolor: '#f8fafc' }} align="right">GST %</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 190, bgcolor: '#f8fafc' }} align="center">Batch / Expiry</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100, bgcolor: '#f8fafc' }} align="right">Total (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 50, bgcolor: '#f8fafc' }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    No products added yet. Select a product above.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={row.menu_item_id || idx}>
                    <TableCell sx={{ minWidth: 170 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
                      {row.sku && <Typography variant="caption" sx={{ color: '#64748b' }}>SKU: {row.sku}</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={row.unit} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0.001, step: row.unit === 'kg' ? '0.001' : '1' } }}
                        value={row.quantity}
                        onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        value={row.rate}
                        onChange={e => handleUpdateItem(idx, 'rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 85 }}>
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, max: 100, step: '0.5' } }}
                        value={row.tax_rate}
                        onChange={e => handleUpdateItem(idx, 'tax_rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ width: 190 }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <TextField
                          size="small"
                          placeholder="Batch"
                          value={row.batch_number || ''}
                          onChange={e => handleUpdateItem(idx, 'batch_number', e.target.value)}
                          slotProps={{ htmlInput: { style: { fontSize: '0.75rem', padding: '4px 6px' } } }}
                        />
                        <TextField
                          size="small"
                          type="date"
                          value={row.expiry_date || ''}
                          onChange={e => handleUpdateItem(idx, 'expiry_date', e.target.value)}
                          slotProps={{ htmlInput: { style: { fontSize: '0.75rem', padding: '4px 6px' } } }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a', width: 100 }}>
                      ₹{row.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={{ width: 50 }}>
                      <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Bill Payment & Totals */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 1.5 }}>
                PAYMENT DETAILS
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    label="Payment Status *"
                    size="small"
                    fullWidth
                    value={paymentStatus}
                    onChange={e => handlePaymentStatusChange(e.target.value)}
                    slotProps={{
                      select: {
                        MenuProps: {
                          slotProps: {
                            paper: {
                              sx: {
                                borderRadius: 2,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                border: '1px solid #cbd5e1',
                                zIndex: 1500,
                                mt: 0.5,
                                '& .MuiMenuItem-root': {
                                  px: 2,
                                  py: 1.25,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  '&:hover': {
                                    bgcolor: 'rgba(234, 88, 12, 0.06)'
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: 'rgba(234, 88, 12, 0.10)',
                                    '&:hover': {
                                      bgcolor: 'rgba(234, 88, 12, 0.14)'
                                    }
                                  }
                                }
                              }
                            }
                          }
                        },
                        renderValue: (val) => {
                          const opt = PAYMENT_STATUS_OPTIONS.find(o => o.value === val) || PAYMENT_STATUS_OPTIONS[0];
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: opt.color,
                                  flexShrink: 0
                                }}
                              />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {opt.label}
                              </Typography>
                            </Box>
                          );
                        }
                      }
                    }}
                  >
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              bgcolor: opt.color,
                              flexShrink: 0
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: paymentStatus === opt.value ? 700 : 500,
                              color: paymentStatus === opt.value ? '#ea580c' : '#1e293b'
                            }}
                          >
                            {opt.label}
                          </Typography>
                        </Box>
                        {paymentStatus === opt.value && <Check size={16} color="#ea580c" />}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Amount Paid (₹) *"
                    size="small"
                    type="number"
                    fullWidth
                    value={paidAmount}
                    disabled={paymentStatus !== 'partially_paid'}
                    onChange={e => setPaidAmount(e.target.value)}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: grandTotal,
                        step: '0.01'
                      }
                    }}
                    error={
                      paymentStatus === 'partially_paid' &&
                      paidAmount !== '' &&
                      (parseFloat(paidAmount) <= 0 || parseFloat(paidAmount) >= grandTotal)
                    }
                    helperText={
                      paymentStatus === 'unpaid'
                        ? 'Credit purchase (₹0 upfront)'
                        : paymentStatus === 'paid'
                        ? 'Auto-settled in full'
                        : (paidAmount !== '' && parseFloat(paidAmount) >= grandTotal)
                        ? 'Partial amount must be < total'
                        : 'Enter amount > 0 and < total'
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    label="Payment Mode *"
                    size="small"
                    fullWidth
                    disabled={paymentStatus === 'unpaid'}
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    helperText={paymentStatus === 'unpaid' ? 'Not applicable for credit' : 'Required'}
                    slotProps={{
                      select: {
                        MenuProps: {
                          slotProps: {
                            paper: {
                              sx: {
                                borderRadius: 2,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                border: '1px solid #cbd5e1',
                                zIndex: 1500,
                                mt: 0.5,
                                '& .MuiMenuItem-root': {
                                  px: 2,
                                  py: 1.25,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  '&:hover': {
                                    bgcolor: 'rgba(234, 88, 12, 0.06)'
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: 'rgba(234, 88, 12, 0.10)',
                                    '&:hover': {
                                      bgcolor: 'rgba(234, 88, 12, 0.14)'
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }}
                  >
                    {PAYMENT_MODE_OPTIONS.map((mode) => (
                      <MenuItem key={mode.value} value={mode.value}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: paymentMode === mode.value ? 700 : 500,
                            color: paymentMode === mode.value ? '#ea580c' : '#1e293b'
                          }}
                        >
                          {mode.label}
                        </Typography>
                        {paymentMode === mode.value && <Check size={16} color="#ea580c" />}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Inline Payment Status Feedback */}
                <Grid size={{ xs: 12 }}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor:
                        paymentStatus === 'paid'
                          ? 'rgba(22, 163, 74, 0.08)'
                          : paymentStatus === 'partially_paid'
                          ? 'rgba(217, 119, 6, 0.08)'
                          : 'rgba(100, 116, 139, 0.08)',
                      border:
                        paymentStatus === 'paid'
                          ? '1px solid rgba(22, 163, 74, 0.25)'
                          : paymentStatus === 'partially_paid'
                          ? '1px solid rgba(217, 119, 6, 0.25)'
                          : '1px solid rgba(100, 116, 139, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color:
                          paymentStatus === 'paid'
                            ? '#15803d'
                            : paymentStatus === 'partially_paid'
                            ? '#b45309'
                            : '#475569'
                      }}
                    >
                      {paymentStatus === 'unpaid' && (
                        <>💳 Full credit purchase: ₹{grandTotal.toFixed(2)} will be credited to vendor payable ledger.</>
                      )}
                      {paymentStatus === 'partially_paid' && (
                        <>
                          ⚠️ Partial payment: ₹{(parseFloat(paidAmount) || 0).toFixed(2)} paid upfront via {paymentMode || 'selected mode'}. Remaining ₹{balanceDue.toFixed(2)} credited.
                        </>
                      )}
                      {paymentStatus === 'paid' && (
                        <>✅ Fully settled: ₹{grandTotal.toFixed(2)} paid upfront via {paymentMode || 'selected mode'}. No outstanding balance.</>
                      )}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Bill Notes"
                    size="small"
                    fullWidth
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional remarks, transporter receipt number, etc."
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 5 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Taxable Subtotal:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total GST / Tax:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>₹{totalTax.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Freight / Charges (₹):</Typography>
                <TextField
                  size="small"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: '1' } }}
                  value={additionalCharges}
                  onChange={e => setAdditionalCharges(e.target.value)}
                  sx={{ width: 100 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Discount (₹):</Typography>
                <TextField
                  size="small"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: '1' } }}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  sx={{ width: 100 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '2px solid #cbd5e1' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Grand Total:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#16a34a' }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Amount Paid:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                  ₹{(parseFloat(paidAmount) || 0).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Balance Due:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: balanceDue > 0 ? '#b91c1c' : '#16a34a' }}>
                  ₹{balanceDue.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle size={16} />}
          disabled={submitting || items.length === 0}
          onClick={handleSubmit}
          sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
        >
          Save Bill & Inward Stock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
