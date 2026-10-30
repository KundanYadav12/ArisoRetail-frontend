import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PackagePlus,
  X,
  AlertTriangle,
  Check,
  Tag,
  Percent,
  Search,
  Link as LinkIcon,
  HelpCircle,
  Hash
} from 'lucide-react';
import {
  sanitizePositiveNumberString,
  handleSelectAllOnFocus,
  handleSelectAllOnClick,
  handleSelectAllOnMouseUp
} from '../utils/numberInputUtils';

export default function OpenItemModal({
  isOpen,
  initialItem = null,
  menuItems = [],
  receiptSettings = null,
  onConfirm,
  onClose
}) {
  const descRef = useRef(null);
  const priceRef = useRef(null);
  const mrpRef = useRef(null);
  const qtyRef = useRef(null);
  const unitRef = useRef(null);
  const customGstRef = useRef(null);
  const hsnRef = useRef(null);
  const discRef = useRef(null);
  const stockSearchRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Default Tax Settings
  const defaultGstRate = useMemo(() => {
    if (receiptSettings && receiptSettings.gst_enabled === false) return 0;
    const rate = parseFloat(receiptSettings?.default_gst_rate);
    return !isNaN(rate) ? rate : 5;
  }, [receiptSettings]);

  const gstMode = receiptSettings?.gst_mode || 'excluded';

  // Form States
  const [description, setDescription] = useState('General Item');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [selectedGstRate, setSelectedGstRate] = useState(defaultGstRate);
  const [customGstRate, setCustomGstRate] = useState('');
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [hsnCode, setHsnCode] = useState('');
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percentage'
  const [discountValue, setDiscountValue] = useState('');

  // Link to Stock-Managed Product
  const [linkToStock, setLinkToStock] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState(null);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [stockSelectedIndex, setStockSelectedIndex] = useState(-1);

  // Validation Error
  const [error, setError] = useState('');

  // Reset or Populate form on open
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setDescription(initialItem.name || 'General Item');
        setPrice(String(initialItem.price !== undefined ? initialItem.price : initialItem.unit_price || ''));
        setMrp(initialItem.mrp !== undefined && initialItem.mrp !== null ? String(initialItem.mrp) : '');
        setQuantity(String(initialItem.quantity || '1'));
        setUnit(initialItem.unit || 'pcs');

        const rate = parseFloat(initialItem.gst_rate !== undefined ? initialItem.gst_rate : 5);
        if ([0, 5, 12, 18, 28].includes(rate)) {
          setSelectedGstRate(rate);
          setCustomGstRate('');
        } else {
          setSelectedGstRate(-1);
          setCustomGstRate(String(rate));
        }

        setIsTaxExempt(Boolean(initialItem.is_tax_exempt) || rate === 0);
        setHsnCode(initialItem.hsn_code || initialItem.hsnCode || '');

        setDiscountType(initialItem.discount_type || 'amount');
        setDiscountValue(
          initialItem.discount_value !== undefined && initialItem.discount_value > 0
            ? String(initialItem.discount_value)
            : (initialItem.discount_amount ? String(initialItem.discount_amount) : '')
        );

        if (initialItem.is_stock_linked && (initialItem.product_id || initialItem.menu_item_id)) {
          setLinkToStock(true);
          const matched = menuItems.find(
            (p) => (p.id || p.menu_item_id) === (initialItem.product_id || initialItem.menu_item_id)
          );
          setLinkedProduct(matched || {
            id: initialItem.product_id || initialItem.menu_item_id,
            name: initialItem.linked_product_name || 'Linked Product',
            unit: initialItem.unit || 'pcs',
            mrp: initialItem.mrp || null
          });
          if (matched?.mrp && (!initialItem.mrp || initialItem.mrp === initialItem.price)) {
            setMrp(String(matched.mrp));
          }
        } else {
          setLinkToStock(false);
          setLinkedProduct(null);
        }
      } else {
        // New Open Item defaults
        setDescription('General Item');
        setPrice('');
        setMrp('');
        setQuantity('1');
        setUnit('pcs');
        setSelectedGstRate(defaultGstRate);
        setCustomGstRate('');
        setIsTaxExempt(defaultGstRate === 0);
        setHsnCode('');
        setDiscountType('amount');
        setDiscountValue('');
        setLinkToStock(false);
        setLinkedProduct(null);
      }

      setError('');
      setStockSearchTerm('');
      setShowStockDropdown(false);
      setStockSelectedIndex(-1);

      // Focus first input with small delay for modal animation
      const timer = setTimeout(() => {
        if (descRef.current) {
          descRef.current.focus();
          descRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialItem, defaultGstRate, menuItems]);

  if (!isOpen) return null;

  // Filtered products for stock linking search
  const filteredStockProducts = (menuItems || []).filter((p) => {
    if (!stockSearchTerm.trim()) return true;
    const term = stockSearchTerm.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const barcode = (p.barcode || '').toLowerCase();
    return name.includes(term) || sku.includes(term) || barcode.includes(term);
  }).slice(0, 8);

  // Live Calculations
  const numericPrice = parseFloat(price || '0');
  const numericQty = parseFloat(quantity || '1');
  const grossAmount = Math.max(0, numericPrice * (isNaN(numericQty) || numericQty <= 0 ? 1 : numericQty));

  const numericMrpRaw = parseFloat(mrp);
  const hasValidMrp = !isNaN(numericMrpRaw) && String(mrp).trim() !== '' && numericMrpRaw >= 0;
  const isMrpLowerThanPrice = hasValidMrp && numericMrpRaw < numericPrice;
  // If MRP is empty or lower than the Unit Price, treat the MRP as equal to the Unit Price (no saving)
  const effectiveMrp = (hasValidMrp && numericMrpRaw >= numericPrice) ? numericMrpRaw : numericPrice;
  const unitSaving = Math.max(0, effectiveMrp - numericPrice);
  const totalSaved = unitSaving * (isNaN(numericQty) || numericQty <= 0 ? 1 : numericQty);

  const numericDiscount = parseFloat(discountValue || '0');
  let discountAmount = 0;
  if (!isNaN(numericDiscount) && numericDiscount > 0) {
    if (discountType === 'percentage') {
      discountAmount = (grossAmount * Math.min(100, numericDiscount)) / 100;
    } else {
      discountAmount = Math.min(grossAmount, numericDiscount);
    }
  }

  const taxableAmount = Math.max(0, grossAmount - discountAmount);

  const effectiveGstRate = isTaxExempt
    ? 0
    : (selectedGstRate === -1 ? (parseFloat(customGstRate) || 0) : selectedGstRate);

  let taxAmount = 0;
  let finalLineTotal = 0;

  if (effectiveGstRate > 0) {
    if (gstMode === 'included') {
      const baseTaxable = taxableAmount / (1 + effectiveGstRate / 100);
      taxAmount = taxableAmount - baseTaxable;
      finalLineTotal = taxableAmount;
    } else {
      taxAmount = taxableAmount * (effectiveGstRate / 100);
      finalLineTotal = taxableAmount + taxAmount;
    }
  } else {
    taxAmount = 0;
    finalLineTotal = taxableAmount;
  }

  // Stock check for linked product
  const trackInventory = linkedProduct && linkedProduct.track_inventory !== 0 && linkedProduct.current_stock !== null && linkedProduct.current_stock !== undefined;
  const availableStock = trackInventory
    ? Math.max(0, parseFloat(linkedProduct.current_stock || 0) - parseFloat(linkedProduct.reserved_stock || 0))
    : null;
  const isOverStock = trackInventory && numericQty > availableStock;

  // Form Validation
  const validateForm = () => {
    // If the cashier clears the field and leaves it empty, use "General Item" on add.
    if (!description.trim()) {
      setDescription('General Item');
    }
    if (price === '' || isNaN(numericPrice) || numericPrice < 0) {
      setError('Please enter a valid price (≥ 0)');
      priceRef.current?.focus();
      return false;
    }
    if (quantity === '' || isNaN(numericQty) || numericQty <= 0) {
      setError('Please enter a valid quantity (> 0)');
      qtyRef.current?.focus();
      return false;
    }
    if (linkToStock && !linkedProduct) {
      setError('Please select an inventory product to link, or uncheck "Link to Inventory Product"');
      stockSearchRef.current?.focus();
      return false;
    }
    if (isOverStock) {
      setError(`Quantity (${numericQty}) exceeds available stock (${availableStock} ${linkedProduct.unit || 'pcs'})`);
      qtyRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;
    const finalDesc = description.trim() || 'General Item';

    onConfirm({
      name: finalDesc,
      price: numericPrice,
      mrp: effectiveMrp,
      quantity: numericQty,
      unit: unit.trim() || (linkedProduct?.unit || 'pcs'),
      gst_rate: effectiveGstRate,
      is_tax_exempt: isTaxExempt || effectiveGstRate === 0,
      hsn_code: hsnCode.trim() || (linkedProduct?.hsn_code || null),
      discount_amount: discountAmount,
      discount_type: discountType,
      discount_value: numericDiscount,
      linked_product: linkToStock ? linkedProduct : null,
      total_price: finalLineTotal
    });
  };

  const handleSelectLinkedProduct = (p) => {
    setLinkedProduct(p);
    setShowStockDropdown(false);
    setStockSelectedIndex(-1);
    // Pre-fill MRP from product if available
    if (p.mrp !== undefined && p.mrp !== null && parseFloat(p.mrp) > 0) {
      setMrp(String(p.mrp));
    }
    // Pre-fill unit or HSN if empty
    if (!unit || unit === 'pcs') {
      setUnit(p.unit || p.base_unit || 'pcs');
    }
    if (!hsnCode && p.hsn_code) {
      setHsnCode(p.hsn_code);
    }
    confirmBtnRef.current?.focus();
  };

  // Keyboard navigation & Shortcuts inside modal
  const handleKeyDown = (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const active = document.activeElement;

    // 1. Ctrl+Enter anywhere submits
    if (e.key === 'Enter' && isCtrl) {
      e.preventDefault();
      handleConfirm();
      return;
    }

    // 2. Esc closes dropdown if open, otherwise closes modal
    if (e.key === 'Escape') {
      e.preventDefault();
      if (showStockDropdown) {
        setShowStockDropdown(false);
        setStockSelectedIndex(-1);
        return;
      }
      onClose();
      return;
    }

    // 3. Tab Focus Trapping
    if (e.key === 'Tab') {
      if (!e.shiftKey && active === confirmBtnRef.current) {
        e.preventDefault();
        descRef.current?.focus();
        descRef.current?.select();
        return;
      } else if (e.shiftKey && active === descRef.current) {
        e.preventDefault();
        confirmBtnRef.current?.focus();
        return;
      }
    }

    // 4. Alt / Ctrl Hotkeys for rapid field navigation & tax/discount control
    if (isAlt) {
      const lowerKey = e.key.toLowerCase();
      if (lowerKey === 'm') {
        e.preventDefault();
        mrpRef.current?.focus();
        mrpRef.current?.select();
        return;
      } else if (lowerKey === '0') {
        e.preventDefault();
        setSelectedGstRate(0);
        setIsTaxExempt(true);
        return;
      } else if (lowerKey === '5') {
        e.preventDefault();
        setSelectedGstRate(5);
        setIsTaxExempt(false);
        return;
      } else if (lowerKey === '1') {
        e.preventDefault();
        setSelectedGstRate(12);
        setIsTaxExempt(false);
        return;
      } else if (lowerKey === '8') {
        e.preventDefault();
        setSelectedGstRate(18);
        setIsTaxExempt(false);
        return;
      } else if (lowerKey === '2') {
        e.preventDefault();
        setSelectedGstRate(28);
        setIsTaxExempt(false);
        return;
      } else if (lowerKey === 'c') {
        e.preventDefault();
        setSelectedGstRate(-1);
        setIsTaxExempt(false);
        setTimeout(() => {
          customGstRef.current?.focus();
          customGstRef.current?.select();
        }, 50);
        return;
      } else if (lowerKey === 'd') {
        e.preventDefault();
        discRef.current?.focus();
        discRef.current?.select();
        return;
      } else if (lowerKey === 'f') {
        e.preventDefault();
        setDiscountType('amount');
        discRef.current?.focus();
        discRef.current?.select();
        return;
      } else if (lowerKey === 'p') {
        e.preventDefault();
        setDiscountType('percentage');
        discRef.current?.focus();
        discRef.current?.select();
        return;
      } else if (lowerKey === 'u') {
        e.preventDefault();
        unitRef.current?.focus();
        return;
      } else if (lowerKey === 'h') {
        e.preventDefault();
        hsnRef.current?.focus();
        hsnRef.current?.select();
        return;
      } else if (lowerKey === 'l') {
        e.preventDefault();
        setLinkToStock((prev) => {
          const next = !prev;
          if (next) {
            setShowStockDropdown(true);
            setTimeout(() => stockSearchRef.current?.focus(), 50);
          } else {
            setLinkedProduct(null);
            setShowStockDropdown(false);
          }
          return next;
        });
        return;
      }
    }

    // 5. Stock Search Dropdown Arrow Keys & Enter Selection
    if (active === stockSearchRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setShowStockDropdown(true);
        setStockSelectedIndex((prev) => Math.min(filteredStockProducts.length - 1, prev + 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setStockSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (showStockDropdown && stockSelectedIndex >= 0 && filteredStockProducts[stockSelectedIndex]) {
          handleSelectLinkedProduct(filteredStockProducts[stockSelectedIndex]);
        } else if (filteredStockProducts.length > 0) {
          handleSelectLinkedProduct(filteredStockProducts[0]);
        } else {
          confirmBtnRef.current?.focus();
        }
        return;
      }
    }

    // 6. Enter progression between fields: Name → Unit Price → MRP → Quantity → Add
    if (e.key === 'Enter') {
      if (active === descRef.current) {
        e.preventDefault();
        if (!description.trim()) setDescription('General Item');
        priceRef.current?.focus();
        priceRef.current?.select();
      } else if (active === priceRef.current) {
        e.preventDefault();
        mrpRef.current?.focus();
        mrpRef.current?.select();
      } else if (active === mrpRef.current) {
        e.preventDefault();
        qtyRef.current?.focus();
        qtyRef.current?.select();
      } else if (active === qtyRef.current) {
        if (price !== '') {
          e.preventDefault();
          handleConfirm();
        }
      } else if (active === unitRef.current) {
        e.preventDefault();
        discRef.current?.focus();
        discRef.current?.select();
      } else if (active === customGstRef.current) {
        e.preventDefault();
        hsnRef.current?.focus();
        hsnRef.current?.select();
      } else if (active === hsnRef.current) {
        e.preventDefault();
        discRef.current?.focus();
        discRef.current?.select();
      } else if (active === discRef.current) {
        e.preventDefault();
        handleConfirm();
      }
      return;
    }

    // 7. Arrow Up / Down navigation across main inputs
    if (e.key === 'ArrowDown') {
      if (active === descRef.current) {
        e.preventDefault();
        priceRef.current?.focus();
        priceRef.current?.select();
      } else if (active === priceRef.current) {
        e.preventDefault();
        mrpRef.current?.focus();
        mrpRef.current?.select();
      } else if (active === mrpRef.current) {
        e.preventDefault();
        qtyRef.current?.focus();
        qtyRef.current?.select();
      } else if (active === qtyRef.current) {
        e.preventDefault();
        unitRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (active === priceRef.current) {
        e.preventDefault();
        descRef.current?.focus();
        descRef.current?.select();
      } else if (active === mrpRef.current) {
        e.preventDefault();
        priceRef.current?.focus();
        priceRef.current?.select();
      } else if (active === qtyRef.current) {
        e.preventDefault();
        mrpRef.current?.focus();
        mrpRef.current?.select();
      } else if (active === discRef.current) {
        e.preventDefault();
        qtyRef.current?.focus();
        qtyRef.current?.select();
      }
    }
  };

  const gstPresets = [0, 5, 12, 18, 28];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.iconCircle}>
              <PackagePlus size={20} color="#F97316" />
            </div>
            <div>
              <h2 style={styles.title}>
                {initialItem ? 'Edit Open / Custom Item' : 'Add Open / Custom Item'}
              </h2>
              <p style={styles.subTitle}>
                Directly bill ad-hoc items, custom services, or uncatalogued products • <strong>F1 / Ctrl+O</strong>
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)" tabIndex={-1}>
            <X size={18} />
          </button>
        </div>

        {/* Keyboard navigation quick banner */}
        <div style={styles.kbdBanner}>
          <span style={styles.kbdTag}>Enter ↵</span> Advance / Add
          <span style={{ color: '#475569' }}>•</span>
          <span style={styles.kbdTag}>Ctrl+Enter</span> Add from anywhere
          <span style={{ color: '#475569' }}>•</span>
          <span style={styles.kbdTag}>Alt+M</span> MRP
          <span style={{ color: '#475569' }}>•</span>
          <span style={styles.kbdTag}>Alt+D</span> Discount
          <span style={{ color: '#475569' }}>•</span>
          <span style={styles.kbdTag}>Alt+0/5/1/8/2</span> Tax
          <span style={{ color: '#475569' }}>•</span>
          <span style={styles.kbdTag}>Esc</span> Cancel
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertTriangle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={styles.formBody}>
          {/* 1. Item Description */}
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={styles.label}>
                Item Description / Name <span style={{ color: '#EF4444' }}>*</span>:
              </label>
              <span style={styles.fieldHint}>Enter ↵ to Price</span>
            </div>
            <input
              ref={descRef}
              type="text"
              placeholder="e.g. Custom Service, Gift Wrapping, Repair Labor..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError('');
              }}
              onFocus={handleSelectAllOnFocus}
              onClick={handleSelectAllOnClick}
              onMouseUp={handleSelectAllOnMouseUp}
              style={styles.textInput}
              autoFocus
            />
          </div>

          {/* 2. Price, MRP & Quantity (3-col row: Unit Price | MRP | Quantity) */}
          <div style={styles.threeColRow}>
            {/* Price */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '4px' }}>
                <label style={styles.label}>
                  Unit Price (₹) <span style={{ color: '#EF4444' }}>*</span>:
                </label>
                <span style={styles.fieldHint}>↵ MRP</span>
              </div>
              <div style={styles.inputWithBadge}>
                <span style={styles.leftBadge}>₹</span>
                <input
                  ref={priceRef}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => {
                    setPrice(sanitizePositiveNumberString(e.target.value, true));
                    if (error) setError('');
                  }}
                  onFocus={handleSelectAllOnFocus}
                  onClick={handleSelectAllOnClick}
                  onMouseUp={handleSelectAllOnMouseUp}
                  style={styles.numberInput}
                />
              </div>
            </div>

            {/* MRP */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '4px' }}>
                <label style={styles.label}>
                  MRP (₹):
                  <span style={styles.shortcutTag}>Alt+M</span>
                </label>
                <span style={styles.fieldHint}>↵ Qty</span>
              </div>
              <div style={styles.inputWithBadge}>
                <span style={styles.leftBadge}>₹</span>
                <input
                  ref={mrpRef}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={mrp}
                  onChange={(e) => {
                    setMrp(sanitizePositiveNumberString(e.target.value, true));
                    if (error) setError('');
                  }}
                  onFocus={handleSelectAllOnFocus}
                  onClick={handleSelectAllOnClick}
                  onMouseUp={handleSelectAllOnMouseUp}
                  style={styles.numberInput}
                />
              </div>
              {isMrpLowerThanPrice && (
                <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '3px', lineHeight: 1.2 }}>
                  MRP &lt; Price: treated as ₹{numericPrice.toFixed(2)}
                </div>
              )}
            </div>

            {/* Quantity & Unit */}
            <div style={{ flex: '1.2 1 0', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '4px' }}>
                <label style={styles.label}>
                  Quantity <span style={{ color: '#EF4444' }}>*</span>:
                </label>
                <span style={styles.fieldHint}>↵ Add</span>
              </div>
              <div style={styles.inputWithBadge}>
                <input
                  ref={qtyRef}
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(sanitizePositiveNumberString(e.target.value, true));
                    if (error) setError('');
                  }}
                  onFocus={handleSelectAllOnFocus}
                  onClick={handleSelectAllOnClick}
                  onMouseUp={handleSelectAllOnMouseUp}
                  style={styles.numberInput}
                />
                <select
                  ref={unitRef}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={styles.unitSelect}
                  title="Unit of Measurement (Alt+U)"
                >
                  <option value="pcs">PCS</option>
                  <option value="nos">NOS</option>
                  <option value="unit">UNIT</option>
                  <option value="kg">KG</option>
                  <option value="gm">GM</option>
                  <option value="mtr">MTR</option>
                  <option value="box">BOX</option>
                  <option value="set">SET</option>
                  <option value="hrs">HRS</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Tax / GST Rate & HSN Code */}
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={styles.label}>
                Tax / GST Rate: <span style={styles.shortcutTag}>Alt+0/5/1/8/2/C</span>
              </label>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Mode: <strong>{gstMode.toUpperCase()}</strong>
              </span>
            </div>

            <div style={styles.presetGrid}>
              {gstPresets.map((rate) => {
                const isActive = !isTaxExempt && selectedGstRate === rate;
                const altHint = rate === 0 ? 'Alt+0' : (rate === 5 ? 'Alt+5' : (rate === 12 ? 'Alt+1' : (rate === 18 ? 'Alt+8' : 'Alt+2')));
                return (
                  <button
                    key={rate}
                    type="button"
                    style={{
                      ...styles.presetBtn,
                      ...(isActive ? styles.presetActive : {})
                    }}
                    onClick={() => {
                      setSelectedGstRate(rate);
                      setIsTaxExempt(rate === 0);
                    }}
                    title={`${rate}% GST (${altHint})`}
                  >
                    {rate === 0 ? '0% (Exempt)' : `${rate}%`}
                    <span style={styles.subBtnHint}>{altHint}</span>
                  </button>
                );
              })}
              <button
                type="button"
                style={{
                  ...styles.presetBtn,
                  ...(selectedGstRate === -1 ? styles.presetActive : {})
                }}
                onClick={() => {
                  setSelectedGstRate(-1);
                  setIsTaxExempt(false);
                  setTimeout(() => customGstRef.current?.focus(), 50);
                }}
                title="Custom GST Rate (Alt+C)"
              >
                Custom %
                <span style={styles.subBtnHint}>Alt+C</span>
              </button>
            </div>

            {selectedGstRate === -1 && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  ref={customGstRef}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Enter GST %"
                  value={customGstRate}
                  onChange={(e) => setCustomGstRate(sanitizePositiveNumberString(e.target.value, true))}
                  style={{ ...styles.textInput, maxWidth: '140px' }}
                />
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>% GST rate (Enter ↵ to HSN)</span>
              </div>
            )}

            {/* Optional HSN / SAC Code */}
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94A3B8' }}>
                <Hash size={13} />
                <span>HSN / SAC:</span>
                <span style={styles.shortcutTag}>Alt+H</span>
              </div>
              <input
                ref={hsnRef}
                type="text"
                placeholder="e.g. 9983 (Optional)"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                style={{ ...styles.textInput, maxWidth: '180px', padding: '6px 10px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* 4. Optional Item Discount */}
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={styles.label}>
                Item Discount (Optional): <span style={styles.shortcutTag}>Alt+D</span>
              </label>
              {discountAmount > 0 && (
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                  Discount: -₹{discountAmount.toFixed(2)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                <button
                  type="button"
                  style={{
                    ...styles.typeBtn,
                    backgroundColor: discountType === 'amount' ? '#F97316' : '#0F172A',
                    color: discountType === 'amount' ? '#FFFFFF' : '#94A3B8'
                  }}
                  onClick={() => setDiscountType('amount')}
                  title="Flat Amount Discount (Alt+F)"
                >
                  ₹ Flat (Alt+F)
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.typeBtn,
                    backgroundColor: discountType === 'percentage' ? '#F97316' : '#0F172A',
                    color: discountType === 'percentage' ? '#FFFFFF' : '#94A3B8'
                  }}
                  onClick={() => setDiscountType('percentage')}
                  title="Percentage Discount (Alt+P)"
                >
                  % Pct (Alt+P)
                </button>
              </div>

              <input
                ref={discRef}
                type="number"
                min="0"
                step="0.01"
                placeholder={discountType === 'percentage' ? '0%' : '₹0.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(sanitizePositiveNumberString(e.target.value, true))}
                onFocus={handleSelectAllOnFocus}
                onClick={handleSelectAllOnClick}
                onMouseUp={handleSelectAllOnMouseUp}
                style={{ ...styles.textInput, flex: 1 }}
              />
            </div>
          </div>

          {/* 5. Link to Inventory Product (Optional Stock Management) */}
          <div style={styles.stockLinkSection}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={linkToStock}
                onChange={(e) => {
                  setLinkToStock(e.target.checked);
                  if (!e.target.checked) {
                    setLinkedProduct(null);
                    setShowStockDropdown(false);
                    setStockSelectedIndex(-1);
                  } else {
                    setShowStockDropdown(true);
                    setTimeout(() => stockSearchRef.current?.focus(), 50);
                  }
                }}
                style={{ width: '16px', height: '16px', accentColor: '#F97316', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '700', fontSize: '13px', color: '#F8FAFC' }}>
                Link to Inventory Product (Deduct Stock on Sale)
              </span>
              <span style={styles.shortcutTag}>Alt+L</span>
            </label>

            {!linkToStock ? (
              <p style={{ margin: '4px 0 0 22px', fontSize: '11px', color: '#64748B' }}>
                Unlinked: Pure custom item / service. No inventory stock will be impacted.
              </p>
            ) : (
              <div style={{ marginTop: '10px', paddingLeft: '22px' }}>
                {linkedProduct ? (
                  <div style={styles.selectedProductCard}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#38BDF8', fontSize: '13px' }}>
                        {linkedProduct.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        SKU: {linkedProduct.sku || 'N/A'} • Available Stock:{' '}
                        <strong style={{ color: availableStock <= 0 ? '#EF4444' : '#10B981' }}>
                          {availableStock !== null ? `${availableStock} ${linkedProduct.unit || 'pcs'}` : 'Not Tracked'}
                        </strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={styles.changeProductBtn}
                      onClick={() => {
                        setLinkedProduct(null);
                        setShowStockDropdown(true);
                        setTimeout(() => stockSearchRef.current?.focus(), 50);
                      }}
                    >
                      Change (Alt+L)
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={stockSearchRef}
                        type="text"
                        placeholder="Type product name/barcode (Use ↑↓ arrows & Enter)..."
                        value={stockSearchTerm}
                        onChange={(e) => {
                          setStockSearchTerm(e.target.value);
                          setShowStockDropdown(true);
                          setStockSelectedIndex(0);
                        }}
                        onFocus={() => setShowStockDropdown(true)}
                        style={styles.textInput}
                      />
                      <Search size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '12px' }} />
                    </div>

                    {showStockDropdown && (
                      <div style={styles.dropdownList}>
                        {filteredStockProducts.length === 0 ? (
                          <div style={{ padding: '10px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
                            No matching products found
                          </div>
                        ) : (
                          filteredStockProducts.map((p, idx) => {
                            const pStock = p.current_stock !== null && p.current_stock !== undefined
                              ? Math.max(0, parseFloat(p.current_stock || 0) - parseFloat(p.reserved_stock || 0))
                              : null;
                            const isHighlighted = idx === stockSelectedIndex;
                            return (
                              <div
                                key={p.id || p.menu_item_id}
                                style={{
                                  ...styles.dropdownItem,
                                  backgroundColor: isHighlighted ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                                  borderLeft: isHighlighted ? '3px solid #F97316' : '3px solid transparent'
                                }}
                                onMouseEnter={() => setStockSelectedIndex(idx)}
                                onClick={() => handleSelectLinkedProduct(p)}
                              >
                                <div>
                                  <div style={{ fontWeight: '700', color: isHighlighted ? '#FDBA74' : '#F8FAFC', fontSize: '12px' }}>
                                    {p.name}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                                    SKU: {p.sku || 'N/A'} • Price: ₹{parseFloat(p.price || 0).toFixed(2)}
                                  </div>
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: pStock <= 0 ? '#EF4444' : '#10B981' }}>
                                  {pStock !== null ? `${pStock} ${p.unit || 'pcs'}` : 'Untracked'}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Live Totals Summary Card */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Gross Subtotal:</span>
              <span style={styles.summaryVal}>₹{grossAmount.toFixed(2)}</span>
            </div>
            {totalSaved > 0 && (
              <div style={styles.summaryRow}>
                <span style={{ ...styles.summaryLabel, color: '#10B981', fontWeight: '700' }}>You Save:</span>
                <span style={{ ...styles.summaryVal, color: '#10B981', fontWeight: '700' }}>₹{totalSaved.toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div style={styles.summaryRow}>
                <span style={{ ...styles.summaryLabel, color: '#F59E0B' }}>Item Discount:</span>
                <span style={{ ...styles.summaryVal, color: '#F59E0B' }}>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Taxable Amount:</span>
              <span style={styles.summaryVal}>₹{taxableAmount.toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>GST ({effectiveGstRate}%):</span>
              <span style={styles.summaryVal}>
                ₹{taxAmount.toFixed(2)} {gstMode === 'included' ? '(Inc)' : '(Add)'}
              </span>
            </div>

            <div style={styles.divider} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={styles.totalLabel}>NET LINE TOTAL:</span>
              <span style={styles.totalValue}>₹{finalLineTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div style={styles.actionRow}>
          <button ref={cancelBtnRef} type="button" style={styles.cancelBtn} onClick={onClose} title="Cancel and close (Esc)">
            Cancel (Esc)
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            style={styles.confirmBtn}
            onClick={handleConfirm}
            title="Confirm item (Enter or Ctrl+Enter)"
          >
            <Check size={16} />
            <span>{initialItem ? 'Update Item (Enter ↵)' : 'Add to Cart (Enter ↵)'} • ₹{finalLineTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    backdropFilter: 'blur(3px)'
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    width: '580px',
    maxWidth: '96vw',
    maxHeight: '92vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #334155',
    color: '#F8FAFC',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    borderBottom: '1px solid #334155',
    paddingBottom: '12px'
  },
  iconCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 1.2
  },
  subTitle: {
    margin: '3px 0 0 0',
    fontSize: '11.5px',
    color: '#94A3B8'
  },
  kbdBanner: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '11px',
    color: '#94A3B8',
    marginBottom: '12px'
  },
  kbdTag: {
    backgroundColor: '#1E293B',
    border: '1px solid #475569',
    borderRadius: '4px',
    padding: '1px 5px',
    fontSize: '10px',
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: 'monospace'
  },
  fieldHint: {
    fontSize: '10.5px',
    color: '#64748B',
    fontWeight: '600'
  },
  shortcutTag: {
    marginLeft: '6px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    padding: '1px 5px',
    borderRadius: '4px'
  },
  subBtnHint: {
    display: 'block',
    fontSize: '9px',
    color: '#64748B',
    marginTop: '2px',
    fontWeight: '600'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#F87171',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    marginBottom: '12px'
  },
  formBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  twoColRow: {
    display: 'flex',
    gap: '12px'
  },
  threeColRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    width: '100%',
    boxSizing: 'border-box'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: '5px'
  },
  textInput: {
    width: '100%',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '13px',
    color: '#F8FAFC',
    outline: 'none',
    boxSizing: 'border-box'
  },
  inputWithBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box'
  },
  leftBadge: {
    padding: '0 10px',
    fontSize: '13px',
    fontWeight: '800',
    color: '#F97316'
  },
  numberInput: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '9px 8px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#F8FAFC',
    outline: 'none',
    boxSizing: 'border-box'
  },
  unitSelect: {
    backgroundColor: '#1E293B',
    border: 'none',
    borderLeft: '1px solid #334155',
    color: '#38BDF8',
    padding: '0 6px',
    height: '36px',
    fontSize: '11px',
    fontWeight: '800',
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px'
  },
  presetBtn: {
    padding: '6px 4px',
    borderRadius: '6px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    color: '#CBD5E1',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center'
  },
  presetActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
    color: '#FFFFFF'
  },
  typeBtn: {
    padding: '6px 12px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer'
  },
  stockLinkSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px dashed #334155',
    borderRadius: '10px',
    padding: '10px 12px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  selectedProductCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    border: '1px solid #38BDF8',
    borderRadius: '8px',
    padding: '8px 12px'
  },
  changeProductBtn: {
    backgroundColor: '#334155',
    border: 'none',
    color: '#F8FAFC',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  dropdownList: {
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    maxHeight: '140px',
    overflowY: 'auto',
    marginTop: '4px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
  },
  dropdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #1E293B',
    cursor: 'pointer'
  },
  summaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #334155'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '4px'
  },
  summaryLabel: {
    color: '#94A3B8'
  },
  summaryVal: {
    fontWeight: '700',
    color: '#F8FAFC'
  },
  divider: {
    height: '1px',
    backgroundColor: '#334155',
    margin: '8px 0'
  },
  totalLabel: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#CBD5E1'
  },
  totalValue: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#10B981'
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #334155'
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: '#334155',
    color: '#CBD5E1',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
  },
  confirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
  }
};
