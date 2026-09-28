import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Autocomplete, Table,
  TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Paper, Chip, Alert
} from '@mui/material';
import { X, Plus, PlusCircle, Trash2, FileText, ShoppingCart, UserPlus, PackagePlus } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { getISTDateString } from '../../utils/dateUtils';
import SupplierModal from './SupplierModal';
import WarehouseModal from './WarehouseModal';
import MenuItemModal from '../MenuItemModal';

const CustomDropdownPaper = React.forwardRef(function CustomDropdownPaper(props, ref) {
  const { children, onAddNew, addNewLabel, ...other } = props;
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
        borderRadius: 2
      }}
    >
      <Box sx={{ flex: '1 1 auto', overflowY: 'auto', maxHeight: 250, '& .MuiAutocomplete-listbox': { maxHeight: 'none' } }}>
        {children}
      </Box>
      {onAddNew && (
        <Box
          sx={{
            p: 1,
            borderTop: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            flexShrink: 0
          }}
        >
          <Button
            fullWidth
            variant="contained"
            startIcon={<PlusCircle size={18} />}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onAddNew();
            }}
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#ffffff',
              bgcolor: '#1e40af', // Deep navy/royal blue matching screenshot
              justifyContent: 'center',
              py: 0.9,
              px: 2,
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#1d4ed8',
                boxShadow: '0 2px 6px rgba(30, 64, 175, 0.25)'
              }
            }}
          >
            {addNewLabel || 'Add New'}
          </Button>
        </Box>
      )}
    </Paper>
  );
});

export default function PurchaseOrderModal({
  open,
  onClose,
  onCreated,
  onWarehouseCreated,
  onSupplierCreated,
  warehouses = [],
  suppliers = [],
  categories = []
}) {
  const notify = useNotify();
  const [orderDate, setOrderDate] = useState(() => getISTDateString());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [localSuppliers, setLocalSuppliers] = useState(suppliers || []);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSearchInput, setSupplierSearchInput] = useState('');

  const [localWarehouses, setLocalWarehouses] = useState(warehouses || []);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [warehouseSearchInput, setWarehouseSearchInput] = useState('');

  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [productSearchInput, setProductSearchInput] = useState('');

  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      setLocalSuppliers(suppliers);
    }
  }, [suppliers]);

  useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      setLocalWarehouses(warehouses);
    }
  }, [warehouses]);

  useEffect(() => {
    if (open) {
      setOrderDate(getISTDateString());
      setDeliveryDate('');
      setNotes('');
      setDiscountAmount(0);
      setItems([]);
      setProductSearchInput('');
      setSupplierSearchInput('');
      setWarehouseSearchInput('');

      const activeWarehouses = warehouses && warehouses.length > 0 ? warehouses : localWarehouses;
      if (activeWarehouses.length > 0) {
        const defaultWh = activeWarehouses.find(w => w.is_default) || activeWarehouses[0];
        setWarehouseId(defaultWh ? String(defaultWh.id) : '');
      }
      if (localSuppliers.length > 0) {
        setSupplierId(String(localSuppliers[0].id));
      } else if (suppliers.length > 0) {
        setLocalSuppliers(suppliers);
        setSupplierId(String(suppliers[0].id));
      }

      apiFetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(err => console.error(err));
    }
  }, [open, warehouses, suppliers]);

  const handleSaveNewSupplier = async (supplierData) => {
    const res = await apiFetch('/api/inventory/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplierData)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to save supplier');
    notify.success('New supplier created successfully.', 'Supplier Created');

    const newSupplier = resData.supplier;
    if (newSupplier) {
      setLocalSuppliers(prev => [newSupplier, ...prev]);
      setSupplierId(String(newSupplier.id));
      setSupplierSearchInput('');
      if (onSupplierCreated) onSupplierCreated(newSupplier);
    }
  };

  const handleSaveNewWarehouse = async (warehouseData) => {
    const res = await apiFetch('/api/inventory/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(warehouseData)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to save warehouse');
    notify.success('New warehouse created successfully.', 'Warehouse Created');

    const newWarehouse = resData.warehouse;
    if (newWarehouse) {
      setLocalWarehouses(prev => [newWarehouse, ...prev]);
      setWarehouseId(String(newWarehouse.id));
      setWarehouseSearchInput('');
      if (onWarehouseCreated) onWarehouseCreated(newWarehouse);
    }
  };

  const handleProductCreated = (newProduct) => {
    if (newProduct) {
      setAvailableProducts(prev => {
        const exists = prev.some(p => p.id === newProduct.id);
        return exists ? prev : [newProduct, ...prev];
      });
      handleAddItem(newProduct);
      setProductSearchInput('');
    }
  };

  const handleAddItem = (product) => {
    if (!product) return;
    if (items.some(i => i.menu_item_id === product.id)) {
      notify.error(`"${product.name}" is already in this Purchase Order.`, 'Duplicate Item');
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
      total_amount: rate + taxAmt
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
  const grandTotal = Math.max(0, subtotal + totalTax - parseFloat(discountAmount || 0));

  const handleSubmit = async (status = 'pending') => {
    if (!supplierId) {
      notify.error('Please select a supplier.', 'Validation');
      return;
    }
    if (!warehouseId) {
      notify.error('Please select a destination warehouse.', 'Validation');
      return;
    }
    if (items.length === 0) {
      notify.error('Please add at least one product to the Purchase Order.', 'Validation');
      return;
    }

    for (const it of items) {
      if (!it.quantity || parseFloat(it.quantity) <= 0) {
        notify.error(`Please enter a valid quantity for "${it.item_name}".`, 'Validation');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: parseInt(supplierId),
        warehouse_id: parseInt(warehouseId),
        order_date: orderDate,
        expected_delivery_date: deliveryDate || null,
        subtotal,
        tax_amount: totalTax,
        discount_amount: parseFloat(discountAmount || 0),
        total_amount: grandTotal,
        status,
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
          total_amount: parseFloat(it.total_amount || 0)
        }))
      };

      const res = await apiFetch('/api/inventory/purchases/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Purchase Order');

      notify.success('Purchase Order created successfully.', 'PO Created');
      if (onCreated) onCreated(data.purchase_order);
      onClose();
    } catch (err) {
      notify.error(err.message, 'PO Creation Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShoppingCart size={22} color="#0284c7" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Create Purchase Order (PO)</Typography>
            <Typography variant="caption" color="text.secondary">
              Record purchase orders sent to vendors. POs do not affect physical stock until goods are billed/received.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Vendor & Warehouse Info */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                options={localSuppliers}
                value={localSuppliers.find(s => String(s.id) === String(supplierId)) || null}
                onChange={(e, val) => {
                  setSupplierId(val ? String(val.id) : '');
                }}
                onInputChange={(e, val) => setSupplierSearchInput(val)}
                getOptionKey={opt => (opt && opt.id ? `supplier-${opt.id}` : `supplier-${Math.random()}`)}
                getOptionLabel={opt => {
                  if (!opt) return '';
                  return `${opt.name}${opt.company_name ? ` (${opt.company_name})` : (opt.mobile ? ` (${opt.mobile})` : '')}`;
                }}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={option.id ? `supplier-opt-${option.id}` : key} {...rest} style={{ padding: '9px 14px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {option.name}
                        </Typography>
                        {option.mobile && (
                          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, bgcolor: '#f1f5f9', px: 1, py: 0.25, borderRadius: 1 }}>
                            [{option.mobile}]
                          </Typography>
                        )}
                        {!option.mobile && option.company_name && (
                          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, bgcolor: '#f1f5f9', px: 1, py: 0.25, borderRadius: 1 }}>
                            [{option.company_name}]
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                slots={{ paper: CustomDropdownPaper }}
                slotProps={{
                  paper: {
                    onAddNew: () => setSupplierModalOpen(true),
                    addNewLabel: 'Add New'
                  }
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Party / Supplier Name"
                    size="small"
                    required={!supplierId}
                    placeholder="Choose Party..."
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                options={localWarehouses}
                value={localWarehouses.find(w => String(w.id) === String(warehouseId)) || null}
                onChange={(e, val) => {
                  setWarehouseId(val ? String(val.id) : '');
                }}
                onInputChange={(e, val) => setWarehouseSearchInput(val)}
                getOptionKey={opt => (opt && opt.id ? `warehouse-${opt.id}` : `warehouse-${Math.random()}`)}
                getOptionLabel={opt => {
                  if (!opt) return '';
                  return `${opt.name}${opt.code ? ` (${opt.code})` : ''}`;
                }}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={option.id ? `wh-opt-${option.id}` : key} {...rest} style={{ padding: '9px 14px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {option.name}
                        </Typography>
                        {option.code && (
                          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, bgcolor: '#f1f5f9', px: 1, py: 0.25, borderRadius: 1 }}>
                            [{option.code}]
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                slots={{ paper: CustomDropdownPaper }}
                slotProps={{
                  paper: {
                    onAddNew: () => setWarehouseModalOpen(true),
                    addNewLabel: 'Add New'
                  }
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Destination Warehouse / Outlet"
                    size="small"
                    required={!warehouseId}
                    placeholder="Choose Destination..."
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField
                label="Order Date"
                type="date"
                size="small"
                fullWidth
                required
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField
                label="Expected Delivery"
                type="date"
                size="small"
                fullWidth
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Product Autocomplete */}
        <Autocomplete
          options={availableProducts}
          inputValue={productSearchInput}
          onInputChange={(e, val) => setProductSearchInput(val)}
          getOptionKey={opt => typeof opt === 'string' ? opt : (opt.id ? `product-${opt.id}` : `${opt.name}-${opt.sku || opt.barcode || ''}`)}
          getOptionLabel={opt => opt ? `${opt.name} (${opt.sku || opt.barcode || opt.unit || 'pcs'})` : ''}
          onChange={(e, val) => {
            if (val) {
              handleAddItem(val);
              setProductSearchInput('');
            }
          }}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <li key={option.id ? `product-opt-${option.id}` : key} {...rest}>
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    SKU: {option.sku || 'N/A'} • Rate: ₹{option.purchase_price || option.price || 0} • GST: {option.gst_rate || 0}%
                  </Typography>
                </Box>
              </li>
            );
          }}
          slots={{ paper: CustomDropdownPaper }}
          slotProps={{
            paper: {
              onAddNew: () => setAddItemModalOpen(true),
              addNewLabel: productSearchInput.trim() ? `Add New "${productSearchInput.trim()}"` : 'Add New'
            }
          }}
          renderInput={params => (
            <TextField
              {...params}
              label="Add Product to Purchase Order"
              size="small"
              placeholder="Search or choose product to add..."
            />
          )}
          clearOnBlur
          value={null}
        />

        {/* PO Items Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '30%' }}>Item Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Purchase Rate (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">GST %</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tax (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Line Total (₹)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
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
                    <TableCell>
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
                        inputProps={{ min: 0.001, step: row.unit === 'kg' ? '0.001' : '1' }}
                        value={row.quantity}
                        onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={row.rate}
                        onChange={e => handleUpdateItem(idx, 'rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, max: 100, step: '0.5' }}
                        value={row.tax_rate}
                        onChange={e => handleUpdateItem(idx, 'tax_rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b' }}>
                      ₹{row.tax_amount.toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      ₹{row.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* PO Footer Calculations & Notes */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              label="Purchase Terms & Vendor Notes"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Payment within 30 days of goods receipt. F.O.R Destination."
            />
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
                <Typography variant="body2" color="text.secondary">Order Discount (₹):</Typography>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 0, step: '1' }}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  sx={{ width: 100 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '2px solid #cbd5e1' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Grand Total:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0284c7' }}>
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit('draft')}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FileText size={16} />}
            disabled={submitting || items.length === 0}
            onClick={() => handleSubmit('pending')}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
          >
            Create Purchase Order
          </Button>
        </Box>
      </DialogActions>
    </Dialog>

    {/* Nested Modal: Add New Supplier */}
    <SupplierModal
      open={supplierModalOpen}
      onClose={() => setSupplierModalOpen(false)}
      onSave={handleSaveNewSupplier}
      supplier={supplierSearchInput.trim() ? { name: supplierSearchInput.trim() } : null}
    />

    {/* Nested Modal: Add New Warehouse */}
    <WarehouseModal
      open={warehouseModalOpen}
      onClose={() => setWarehouseModalOpen(false)}
      onSave={handleSaveNewWarehouse}
      warehouse={warehouseSearchInput.trim() ? { name: warehouseSearchInput.trim() } : null}
    />

    {/* Nested Modal: Add New Product / Menu Item */}
    <MenuItemModal
      open={addItemModalOpen}
      onClose={() => setAddItemModalOpen(false)}
      onSuccess={handleProductCreated}
      initialName={productSearchInput.trim()}
      categories={categories}
    />
    </>
  );
}
