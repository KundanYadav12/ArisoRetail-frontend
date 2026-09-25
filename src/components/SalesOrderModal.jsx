import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, IconButton, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Autocomplete, InputAdornment, Chip, Divider,
  CircularProgress, Tooltip
} from '@mui/material';
import {
  X, Plus, Trash2, Calendar, User, Truck, FileText,
  DollarSign, Percent, AlertCircle, ShoppingCart, Check, Tag
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';
import { getISTDateString } from '../utils/dateUtils';

const INDIAN_STATES = [
  '01-Jammu & Kashmir', '02-Himachal Pradesh', '03-Punjab', '04-Chandigarh',
  '05-Uttarakhand', '06-Haryana', '07-Delhi', '08-Rajasthan', '09-Uttar Pradesh',
  '10-Bihar', '11-Sikkim', '12-Arunachal Pradesh', '13-Nagaland', '14-Manipur',
  '15-Mizoram', '16-Tripura', '17-Meghalaya', '18-Assam', '19-West Bengal',
  '20-Jharkhand', '21-Odisha', '22-Chhattisgarh', '23-Madhya Pradesh', '24-Gujarat',
  '27-Maharashtra', '29-Karnataka', '30-Goa', '32-Kerala', '33-Tamil Nadu',
  '36-Telangana', '37-Andhra Pradesh'
];

const GST_SLABS = [0, 5, 12, 18, 28];
const UNITS = ['PCS', 'KG', 'GM', 'LTR', 'ML', 'BOX', 'PACK', 'DOZEN'];

export default function SalesOrderModal({
  open,
  onClose,
  onSaved,
  editOrder = null,
  initialParty = null,
  staffUsers = [],
  menuItems = [],
  categories = []
}) {
  const { notify } = useNotify();
  const isEditing = Boolean(editOrder);

  // Document Type & Warehouse State
  const [docType, setDocType] = useState('sales_order'); // 'sales_order' | 'estimate'
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Form State
  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearchText, setPartySearchText] = useState('');

  // Order Details
  const [orderDate, setOrderDate] = useState(() => getISTDateString());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('27-Maharashtra');
  const [salesBy, setSalesBy] = useState('');
  const [salesByName, setSalesByName] = useState('');
  const [priceList, setPriceList] = useState('standard');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState([
    {
      menu_item_id: null,
      name: '',
      category_id: '',
      category_name: '',
      description: '',
      quantity: 1,
      unit: 'PCS',
      price: 0,
      discount_type: 'percent', // 'percent' or 'amount'
      discount_value: 0,
      gst_rate: 0
    }
  ]);

  // Additional Charges State
  const [chargePresets, setChargePresets] = useState([]);
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [showAddChargePreset, setShowAddChargePreset] = useState(false);

  // Quick Party Modal State
  const [quickPartyOpen, setQuickPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState('');
  const [quickPartyPhone, setQuickPartyPhone] = useState('');
  const [quickPartyGst, setQuickPartyGst] = useState('');
  const [quickPartyAddress, setQuickPartyAddress] = useState('');
  const [quickPartySaving, setQuickPartySaving] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Load parties and warehouses on open
  useEffect(() => {
    if (open) {
      loadParties();
      loadChargePresets();
      loadWarehouses();
    }
  }, [open]);

  // Handle editOrder or initialParty initialization
  useEffect(() => {
    if (!open) return;

    if (editOrder) {
      setDocType(editOrder.is_estimate === 1 ? 'estimate' : 'sales_order');
      setSelectedWarehouseId(editOrder.warehouse_id || '');
      setOrderDate(editOrder.created_at ? editOrder.created_at.split('T')[0] : getISTDateString());
      setDeliveryDate(editOrder.delivery_date ? editOrder.delivery_date.split('T')[0] : '');
      setBillingAddress(editOrder.billing_address || editOrder.customer_address || '');
      setShippingAddress(editOrder.shipping_address || '');
      setPlaceOfSupply(editOrder.place_of_supply || '27-Maharashtra');
      setSalesBy(editOrder.salesman_id || '');
      setSalesByName(editOrder.salesman_name || '');
      setPriceList(editOrder.price_list || 'standard');
      setReferenceNumber(editOrder.reference_number || '');
      setNotes(editOrder.notes || '');

      // Parse additional charges
      try {
        const parsedCharges = typeof editOrder.additional_charges === 'string'
          ? JSON.parse(editOrder.additional_charges)
          : (editOrder.additional_charges || []);
        setAdditionalCharges(Array.isArray(parsedCharges) ? parsedCharges : []);
      } catch (e) {
        setAdditionalCharges([]);
      }

      // Map existing items
      if (Array.isArray(editOrder.items) && editOrder.items.length > 0) {
        setItems(editOrder.items.map(it => ({
          menu_item_id: it.menu_item_id || it.id,
          name: it.name || it.item_name || '',
          category_id: it.category_id || '',
          category_name: it.category_name || '',
          description: it.notes || '',
          quantity: it.item_weight !== null && it.item_weight !== undefined ? parseFloat(it.item_weight) : (parseInt(it.quantity) || 1),
          unit: it.weight_unit || it.unit || (it.item_weight ? 'KG' : 'PCS'),
          price: parseFloat(it.price || it.unit_price || 0),
          discount_type: 'amount',
          discount_value: parseFloat(it.discount_amount || 0),
          gst_rate: parseFloat(it.gst_rate || 0)
        })));
      }
    } else if (initialParty) {
      setDocType('sales_order');
      setSelectedParty(initialParty);
      setBillingAddress(initialParty.address || initialParty.billing_address || '');
      setShippingAddress(initialParty.shipping_address || initialParty.address || '');
      setPlaceOfSupply(initialParty.place_of_supply || '27-Maharashtra');
    } else {
      resetForm();
    }
  }, [open, editOrder, initialParty]);

  const resetForm = () => {
    setDocType('sales_order');
    setOrderDate(getISTDateString());
    setDeliveryDate('');
    setBillingAddress('');
    setShippingAddress('');
    setPlaceOfSupply('27-Maharashtra');
    setSalesBy('');
    setSalesByName('');
    setPriceList('standard');
    setReferenceNumber('');
    setNotes('');
    setSelectedParty(null);
    setAdditionalCharges([]);
    setItems([
      {
        menu_item_id: null,
        name: '',
        category_id: '',
        category_name: '',
        description: '',
        quantity: 1,
        unit: 'PCS',
        price: 0,
        discount_type: 'percent',
        discount_value: 0,
        gst_rate: 0
      }
    ]);
  };

  const loadWarehouses = async () => {
    try {
      const res = await apiFetch('/api/inventory/warehouses');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.warehouses || []);
        setWarehouses(list);
        if (!selectedWarehouseId && list.length > 0) {
          const def = list.find(w => w.is_default === 1) || list[0];
          setSelectedWarehouseId(def.id);
        }
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const loadParties = async () => {
    setLoadingParties(true);
    try {
      const res = await apiFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.customers || []);
        // Deduplicate customers by name + phone to prevent duplicate options in dropdown
        const seen = new Set();
        const uniqueList = [];
        for (const p of list) {
          const key = `${(p.name || '').trim().toLowerCase()}_${(p.phone || '').trim()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueList.push(p);
          }
        }
        setParties(uniqueList);

        // If editing and have customer_id or customer_name
        if (editOrder) {
          const matched = list.find(p => p.id === editOrder.customer_id || p.name === editOrder.customer_name);
          if (matched) {
            setSelectedParty(matched);
          } else if (editOrder.customer_name) {
            setSelectedParty({
              id: editOrder.customer_id,
              name: editOrder.customer_name,
              phone: editOrder.customer_phone,
              address: editOrder.billing_address
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  const loadChargePresets = async () => {
    try {
      const res = await apiFetch('/api/customers/charge-presets/list');
      if (res.ok) {
        const data = await res.json();
        setChargePresets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load charge presets:', err);
    }
  };

  const handlePartyChange = (party) => {
    setSelectedParty(party);
    if (party) {
      setBillingAddress(party.address || party.billing_address || '');
      setShippingAddress(party.shipping_address || party.address || party.billing_address || '');
      if (party.place_of_supply) {
        setPlaceOfSupply(party.place_of_supply);
      }
    }
  };

  // Quick Party Creation
  const handleSaveQuickParty = async () => {
    if (!quickPartyName.trim()) {
      notify.error('Party Name is required.', 'Validation');
      return;
    }
    setQuickPartySaving(true);
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickPartyName.trim(),
          phone: quickPartyPhone.trim(),
          gst_number: quickPartyGst.trim(),
          address: quickPartyAddress.trim(),
          billing_address: quickPartyAddress.trim(),
          shipping_address: quickPartyAddress.trim(),
          place_of_supply: placeOfSupply
        })
      });
      if (res.ok) {
        const created = await res.json();
        notify.success('Party added successfully.', 'Success');
        setQuickPartyOpen(false);
        setQuickPartyName('');
        setQuickPartyPhone('');
        setQuickPartyGst('');
        setQuickPartyAddress('');
        await loadParties();
        handlePartyChange(created);
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save party.', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to save party.', 'Error');
    } finally {
      setQuickPartySaving(false);
    }
  };

  // Item Management
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        menu_item_id: null,
        name: '',
        category_id: '',
        category_name: '',
        description: '',
        quantity: 1,
        unit: 'PCS',
        price: 0,
        discount_type: 'percent',
        discount_value: 0,
        gst_rate: 0
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      notify.warning('At least one item is required in the sales order.', 'Notice');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProductSelect = (index, product) => {
    setItems(prev => {
      const updated = [...prev];
      if (product) {
        const cat = categories.find(c => c.id === product.category_id);
        const isWeight = product.is_weight_based === 1 || product.unit === 'KG' || product.unit === 'GM';
        updated[index] = {
          ...updated[index],
          menu_item_id: product.id,
          name: product.name,
          category_id: product.category_id || '',
          category_name: cat ? cat.name : (product.category_name || ''),
          price: parseFloat(product.price || 0),
          unit: product.unit || (isWeight ? 'KG' : 'PCS'),
          gst_rate: parseFloat(product.gst_rate || 0),
          quantity: updated[index].quantity || 1
        };
      } else {
        updated[index] = {
          ...updated[index],
          menu_item_id: null,
          name: '',
          category_id: '',
          category_name: '',
          price: 0,
          gst_rate: 0
        };
      }
      return updated;
    });
  };

  // Calculations per row
  const calculateRow = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const baseTotal = qty * price;

    let discount = 0;
    if (item.discount_type === 'percent') {
      discount = (baseTotal * (parseFloat(item.discount_value) || 0)) / 100;
    } else {
      discount = parseFloat(item.discount_value) || 0;
    }
    discount = Math.min(discount, baseTotal);

    const taxable = Math.max(0, baseTotal - discount);
    const taxRate = parseFloat(item.gst_rate) || 0;
    const tax = parseFloat(((taxable * taxRate) / 100).toFixed(2));
    const total = parseFloat((taxable + tax).toFixed(2));

    return { baseTotal, discount, taxable, tax, total };
  };

  // Additional Charges Handlers
  const handleAddChargeFromPreset = (preset) => {
    if (!preset) return;
    setAdditionalCharges(prev => [
      ...prev,
      { name: preset.name, amount: parseFloat(preset.default_amount || 0) }
    ]);
  };

  const handleAddNewChargePreset = async () => {
    if (!newChargeName.trim()) {
      notify.error('Charge name is required.', 'Validation');
      return;
    }
    const amount = parseFloat(newChargeAmount) || 0;
    try {
      const res = await apiFetch('/api/customers/charge-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChargeName.trim(), default_amount: amount })
      });
      if (res.ok) {
        notify.success(`Preset "${newChargeName}" added.`, 'Success');
        setAdditionalCharges(prev => [...prev, { name: newChargeName.trim(), amount }]);
        setNewChargeName('');
        setNewChargeAmount('');
        setShowAddChargePreset(false);
        loadChargePresets();
      } else {
        const err = await res.json();
        notify.error(err.error || 'Failed to add charge preset.', 'Error');
      }
    } catch (e) {
      notify.error(e.message || 'Failed to add charge preset.', 'Error');
    }
  };

  const handleChargeAmountChange = (index, value) => {
    let cleanVal = String(value ?? '');
    // If user types numbers after default 0 (e.g. '012'), strip leading zero to get '12'
    if (/^0[0-9]+/.test(cleanVal)) {
      cleanVal = cleanVal.replace(/^0+/, '') || '0';
    }
    setAdditionalCharges(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        amount: cleanVal === '' ? '' : (isNaN(Number(cleanVal)) ? 0 : Number(cleanVal))
      };
      return copy;
    });
  };

  const handleRemoveCharge = (index) => {
    setAdditionalCharges(prev => prev.filter((_, i) => i !== index));
  };

  // Summary Totals
  const summary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalTax = 0;

    items.forEach(it => {
      const row = calculateRow(it);
      subtotal += row.baseTotal;
      totalDiscount += row.discount;
      totalTaxable += row.taxable;
      totalTax += row.tax;
    });

    const totalAdditionalCharges = additionalCharges.reduce((acc, ch) => acc + (parseFloat(ch.amount) || 0), 0);
    const grandTotal = parseFloat((totalTaxable + totalTax + totalAdditionalCharges).toFixed(2));

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalTaxable: parseFloat(totalTaxable.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      totalAdditionalCharges: parseFloat(totalAdditionalCharges.toFixed(2)),
      grandTotal
    };
  }, [items, additionalCharges]);

  // Submit Handler
  const handleSubmit = async () => {
    if (!selectedParty && !partySearchText.trim()) {
      notify.error('Please select or specify a Party / Customer.', 'Validation');
      return;
    }

    const invalidItems = items.filter(it => !it.name.trim() || !(parseFloat(it.quantity) > 0) || !(parseFloat(it.price) >= 0));
    if (invalidItems.length > 0) {
      notify.error('Please ensure all items have a valid name, quantity > 0, and price >= 0.', 'Validation');
      return;
    }

    setSubmitting(true);
    try {
      const formattedItems = items.map(it => {
        const row = calculateRow(it);
        const isWeight = ['KG', 'GM', 'LTR', 'ML'].includes(it.unit);
        return {
          menu_item_id: it.menu_item_id || null,
          name: it.name.trim(),
          category_id: it.category_id || null,
          unit_price: parseFloat(it.price),
          price: parseFloat(it.price),
          quantity: isWeight ? 1 : Math.round(parseFloat(it.quantity)),
          item_weight: isWeight ? parseFloat(it.quantity) : null,
          weight_unit: it.unit,
          unit: it.unit,
          discount_amount: row.discount,
          gst_rate: parseFloat(it.gst_rate || 0),
          tax_amount: row.tax,
          notes: it.description || null
        };
      });

      const partyName = selectedParty ? selectedParty.name : partySearchText.trim();
      const partyPhone = selectedParty ? selectedParty.phone : null;
      const partyId = selectedParty ? selectedParty.id : null;

      const isEst = docType === 'estimate';
      const payload = {
        items: formattedItems,
        customer_id: partyId,
        customer_name: partyName,
        customer_phone: partyPhone,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        place_of_supply: placeOfSupply,
        salesman_id: salesBy || null,
        salesman_name: salesByName || null,
        price_list: priceList,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        delivery_date: deliveryDate || null,
        additional_charges: additionalCharges,
        subtotal: summary.subtotal,
        discount_amount: summary.totalDiscount,
        tax_amount: summary.totalTax,
        total_amount: summary.grandTotal,
        payment_mode: 'pending',
        status: 'pending',
        order_status: 'pending',
        is_sales_order: isEst ? 0 : 1,
        is_estimate: isEst ? 1 : 0,
        warehouse_id: selectedWarehouseId || null
      };

      let res;
      if (isEditing) {
        res = await apiFetch(`/api/orders/${editOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        notify.success(
          isEditing
            ? `${isEst ? 'Estimate' : 'Sales Order'} #${editOrder.unique_order_number || editOrder.id} updated successfully!`
            : `${isEst ? 'Estimate' : 'Sales Order'} #${data.orderNumber || data.orderId} created successfully! ${isEst ? '(Quotation saved)' : '(Stock reserved)'}`,
          'Success'
        );
        onSaved && onSaved(data);
        onClose();
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save document.', 'Error');
      }
    } catch (err) {
      console.error('Save sales order error:', err);
      notify.error(err.message || 'An unexpected error occurred.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const isEst = docType === 'estimate';

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, maxHeight: '92vh', overflowY: 'auto' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: isEst ? '#ede9fe' : 'primary.light', p: 1, borderRadius: 2, display: 'flex', color: isEst ? '#7c3aed' : 'primary.dark' }}>
              <ShoppingCart size={22} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {isEditing
                  ? (isEst ? `Edit Estimate #${editOrder.unique_order_number || editOrder.id}` : `Edit Sales Order #${editOrder.unique_order_number || editOrder.id}`)
                  : (isEst ? 'Create New Estimate / Quotation' : 'Create New Sales Order')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isEst
                  ? 'Draft a customer quotation. Stock is NOT reserved until converted to Sales Order.'
                  : 'Draft a custom sales order with delivery date, items & additional charges. Stock is reserved.'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Document Type Selector Toggle */}
            {!isEditing && (
              <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2, gap: 0.5 }}>
                <Button
                  size="small"
                  variant={docType === 'sales_order' ? 'contained' : 'text'}
                  color="primary"
                  onClick={() => setDocType('sales_order')}
                  sx={{ fontWeight: 800, fontSize: '0.725rem', px: 1.5, py: 0.4, textTransform: 'none' }}
                >
                  📦 Sales Order
                </Button>
                <Button
                  size="small"
                  variant={docType === 'estimate' ? 'contained' : 'text'}
                  onClick={() => setDocType('estimate')}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.725rem',
                    px: 1.5,
                    py: 0.4,
                    textTransform: 'none',
                    bgcolor: docType === 'estimate' ? '#7c3aed' : 'transparent',
                    color: docType === 'estimate' ? '#fff' : '#64748b',
                    '&:hover': { bgcolor: docType === 'estimate' ? '#6d28d9' : '#e2e8f0' }
                  }}
                >
                  📋 Estimate
                </Button>
              </Box>
            )}

            <IconButton onClick={onClose} size="small">
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Section 1: Party & Order Metadata */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Party & Order Details
            </Typography>

            <Grid container spacing={2}>
              {/* Party Autocomplete */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={parties}
                    getOptionKey={(opt) => typeof opt === 'string' ? opt : (opt.id ? `party-${opt.id}` : `${opt.name}-${opt.phone || ''}`)}
                    getOptionLabel={opt => typeof opt === 'string' ? opt : (opt?.name ? `${opt.name}${opt.phone ? ` (${opt.phone})` : ''}` : '')}
                    isOptionEqualToValue={(opt, val) => !val || !opt ? false : (opt.id === val.id || opt.name === val.name)}
                    value={selectedParty}
                    onChange={(e, val) => handlePartyChange(val)}
                    onInputChange={(e, val) => setPartySearchText(val)}
                    loading={loadingParties}
                    renderOption={(props, option) => {
                      const { key, ...restProps } = props;
                      return (
                        <li key={option.id ? `party-opt-${option.id}` : key} {...restProps}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {option.name}{option.phone ? ` (${option.phone})` : ''}
                            </Typography>
                            {option.gst_number && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                GST: {option.gst_number}
                              </Typography>
                            )}
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Party / Customer Name *"
                        placeholder="Search existing customer or enter name..."
                        required
                      />
                    )}
                  />
                  <Tooltip title="Add New Party">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setQuickPartyOpen(true)}
                      sx={{ whiteSpace: 'nowrap', minWidth: 42, px: 1.5, height: 40, fontWeight: 700 }}
                    >
                      <Plus size={16} /> + New
                    </Button>
                  </Tooltip>
                </Box>
              </Grid>

              {/* Fulfilling Warehouse */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Fulfilling Warehouse / Branch</InputLabel>
                  <Select
                    value={selectedWarehouseId}
                    label="Fulfilling Warehouse / Branch"
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                  >
                    <MenuItem value="">-- Default Branch Warehouse --</MenuItem>
                    {warehouses.map(w => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ''} {w.is_default ? '★ Default' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Order Date */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#475569',
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    {isEst ? "Estimate Date" : "Order Date"}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                  />
                </Box>
              </Grid>

              {/* Delivery Date / Expiry Date */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#475569',
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    {isEst ? "Valid Until Date" : "Delivery Date *"}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    required={!isEst}
                  />
                </Box>
              </Grid>

              {/* Billing Address */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Billing Address"
                  placeholder="Street, City, Pincode..."
                  value={billingAddress}
                  onChange={e => setBillingAddress(e.target.value)}
                />
              </Grid>

              {/* Shipping Address */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Shipping Address"
                  placeholder="Delivery address if different from billing..."
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                />
              </Grid>

              {/* Place of Supply */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Place of Supply</InputLabel>
                  <Select
                    value={placeOfSupply}
                    label="Place of Supply"
                    onChange={e => setPlaceOfSupply(e.target.value)}
                  >
                    {INDIAN_STATES.map(st => (
                      <MenuItem key={st} value={st}>{st}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sales By */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sales By</InputLabel>
                  <Select
                    value={salesBy}
                    label="Sales By"
                    onChange={e => {
                      setSalesBy(e.target.value);
                      const found = staffUsers.find(u => u.id === e.target.value);
                      setSalesByName(found ? found.name : '');
                    }}
                  >
                    <MenuItem value="">Direct / Admin</MenuItem>
                    {staffUsers.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Price List */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Price List</InputLabel>
                  <Select
                    value={priceList}
                    label="Price List"
                    onChange={e => setPriceList(e.target.value)}
                  >
                    <MenuItem value="standard">Standard Retail</MenuItem>
                    <MenuItem value="wholesale">Wholesale</MenuItem>
                    <MenuItem value="dealer">Dealer Price</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Reference Number */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reference Number"
                  placeholder="PO # / Client Ref"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Section 2: Order Items Table */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                2. Order Items Table
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Plus size={14} />}
                onClick={handleAddItem}
                sx={{ fontWeight: 700 }}
              >
                Add Item
              </Button>
            </Box>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '22%' }}>Item *</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '15%' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '10%' }}>Qty *</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '11%' }}>Unit</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '12%' }}>Price (₹) *</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '11%' }}>Discount</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '9%' }}>Tax %</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: '10%', textAlign: 'right' }}>Total (₹)</TableCell>
                    <TableCell sx={{ width: '40px' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it, idx) => {
                    const rowCalc = calculateRow(it);
                    return (
                      <TableRow key={idx}>
                        {/* Item Selection / Autocomplete */}
                        <TableCell>
                          <Autocomplete
                            size="small"
                            freeSolo
                            options={menuItems}
                            getOptionKey={(opt) => typeof opt === 'string' ? opt : (opt.id ? `item-${opt.id}` : (opt.name || ''))}
                            getOptionLabel={opt => typeof opt === 'string' ? opt : (opt.name || '')}
                            value={it.name}
                            onChange={(e, val) => {
                              if (typeof val === 'string') {
                                handleItemFieldChange(idx, 'name', val);
                              } else if (val) {
                                handleProductSelect(idx, val);
                              }
                            }}
                            onInputChange={(e, val) => handleItemFieldChange(idx, 'name', val)}
                            renderOption={(props, option) => {
                              const { key, ...restProps } = props;
                              return (
                                <li key={typeof option === 'string' ? option : (option.id ? `item-opt-${option.id}` : key)} {...restProps}>
                                  {typeof option === 'string' ? option : option.name}
                                </li>
                              );
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Select or type item name..."
                                required
                                size="small"
                              />
                            )}
                          />
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={it.category_id || ''}
                              onChange={e => {
                                const cId = e.target.value;
                                const catObj = categories.find(c => c.id === cId);
                                handleItemFieldChange(idx, 'category_id', cId);
                                handleItemFieldChange(idx, 'category_name', catObj ? catObj.name : '');
                              }}
                            >
                              <MenuItem value="">General</MenuItem>
                              {categories.map(c => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>

                        {/* Qty */}
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0.001, step: 'any' }}
                            value={it.quantity}
                            onChange={e => handleItemFieldChange(idx, 'quantity', e.target.value)}
                          />
                        </TableCell>

                        {/* Unit (PCS / KG / Weight) */}
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={it.unit || 'PCS'}
                              onChange={e => handleItemFieldChange(idx, 'unit', e.target.value)}
                            >
                              {UNITS.map(u => (
                                <MenuItem key={u} value={u}>{u}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>

                        {/* Price per Unit */}
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: '0.01' }}
                            value={it.price}
                            onChange={e => handleItemFieldChange(idx, 'price', e.target.value)}
                          />
                        </TableCell>

                        {/* Discount */}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ min: 0, step: 'any' }}
                              value={it.discount_value}
                              onChange={e => handleItemFieldChange(idx, 'discount_value', e.target.value)}
                              sx={{ width: 65 }}
                            />
                            <Select
                              size="small"
                              value={it.discount_type}
                              onChange={e => handleItemFieldChange(idx, 'discount_type', e.target.value)}
                              sx={{ width: 55, fontSize: '0.75rem' }}
                            >
                              <MenuItem value="percent">%</MenuItem>
                              <MenuItem value="amount">₹</MenuItem>
                            </Select>
                          </Box>
                        </TableCell>

                        {/* GST Slab Tax */}
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={it.gst_rate}
                              onChange={e => handleItemFieldChange(idx, 'gst_rate', e.target.value)}
                            >
                              {GST_SLABS.map(s => (
                                <MenuItem key={s} value={s}>{s}%</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>

                        {/* Total */}
                        <TableCell sx={{ textAlign: 'right', fontWeight: 800 }}>
                          ₹{rowCalc.total.toFixed(2)}
                        </TableCell>

                        {/* Delete Row */}
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Section 3: Additional Charges & Notes */}
          <Grid container spacing={2}>
            {/* Left: Additional Charges & Presets */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    3. Additional Charges
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<Plus size={14} />}
                    onClick={() => setShowAddChargePreset(prev => !prev)}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  >
                    + Add New Charge Option
                  </Button>
                </Box>

                {/* New Charge Option Form */}
                {showAddChargePreset && (
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px dashed #93c5fd' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: '#1e40af' }}>
                      Create New Charge Preset
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Charge Name (e.g. Loading Fee)"
                        value={newChargeName}
                        onChange={e => setNewChargeName(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        size="small"
                        placeholder="Default ₹"
                        type="number"
                        value={newChargeAmount}
                        onChange={e => {
                          let val = String(e.target.value ?? '');
                          if (/^0[0-9]+/.test(val)) val = val.replace(/^0+/, '');
                          setNewChargeAmount(val);
                        }}
                        onFocus={e => e.target.select()}
                        inputProps={{ min: 0, step: 'any' }}
                        sx={{ width: 100 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleAddNewChargePreset}
                        sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                      >
                        Save
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Preset Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {chargePresets.map((pr, idx) => (
                    <Chip
                      key={idx}
                      label={`+ ${pr.name} (₹${pr.default_amount})`}
                      onClick={() => handleAddChargeFromPreset(pr)}
                      clickable
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Box>

                {/* Active Charges List */}
                {additionalCharges.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1 }}>
                    No additional charges added yet. Click above presets to add Delivery, Packing, etc.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {additionalCharges.map((ch, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f8fafc', p: 1, borderRadius: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
                          {ch.name}
                        </Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={ch.amount}
                          onChange={e => handleChargeAmountChange(idx, e.target.value)}
                          onFocus={e => e.target.select()}
                          onBlur={() => {
                            if (ch.amount === '' || isNaN(ch.amount)) {
                              handleChargeAmountChange(idx, 0);
                            }
                          }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>
                          }}
                          inputProps={{ min: 0, step: 'any' }}
                          sx={{ width: 120 }}
                        />
                        <IconButton size="small" color="error" onClick={() => handleRemoveCharge(idx)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="Order Notes / Terms"
                  placeholder="Special instructions or delivery notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Paper>
            </Grid>

            {/* Right: Summary Box */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  4. Order Summary
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal (Gross):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{summary.subtotal.toFixed(2)}</Typography>
                  </Box>

                  {summary.totalDiscount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <Typography variant="body2">Total Discount:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>-₹{summary.totalDiscount.toFixed(2)}</Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Taxable Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{summary.totalTaxable.toFixed(2)}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total GST Tax:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{summary.totalTax.toFixed(2)}</Typography>
                  </Box>

                  {summary.totalAdditionalCharges > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7' }}>
                      <Typography variant="body2">Additional Charges:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>+₹{summary.totalAdditionalCharges.toFixed(2)}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Grand Total:</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      ₹{summary.grandTotal.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fde68a' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AlertCircle size={14} /> Inventory Notice:
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#78350f', display: 'block', mt: 0.25 }}>
                    Submitting this sales order places it in <b>Pending</b> status and automatically reserves stock, preventing overselling. Stock will be physically deducted upon conversion to Invoice.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ fontWeight: 700 }}>
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Check size={18} />}
            sx={{ fontWeight: 800, px: 3 }}
          >
            {submitting ? 'Saving Order...' : (isEditing ? 'Update Sales Order' : 'Create Sales Order')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Party Inline Modal */}
      <Dialog
        open={quickPartyOpen}
        onClose={() => setQuickPartyOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Quick Add Party</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Party / Customer Name *"
            value={quickPartyName}
            onChange={e => setQuickPartyName(e.target.value)}
            required
            autoFocus
          />
          <TextField
            fullWidth
            size="small"
            label="Phone Number"
            value={quickPartyPhone}
            onChange={e => setQuickPartyPhone(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="GSTIN / Tax ID"
            value={quickPartyGst}
            onChange={e => setQuickPartyGst(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="Address"
            value={quickPartyAddress}
            onChange={e => setQuickPartyAddress(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuickPartyOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleSaveQuickParty}
            variant="contained"
            disabled={quickPartySaving}
            sx={{ fontWeight: 700 }}
          >
            {quickPartySaving ? 'Saving...' : 'Add Party'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
