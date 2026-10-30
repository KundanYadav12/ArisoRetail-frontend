import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Scale, ShoppingCart, X, AlertTriangle, RotateCcw, Lock } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';
import {
  sanitizePositiveNumberString,
  handlePositiveNumberKeyDown,
  handlePositiveNumberPaste,
  handleSelectAllOnFocus,
  handleSelectAllOnClick,
  handleSelectAllOnMouseUp
} from '../utils/numberInputUtils';

export default function WeightInputModal({
  isOpen,
  product,
  initialWeightInKg = 0,
  initialRate = null,
  pricingMode: propPricingMode,
  user = null,
  receiptSettings = null,
  isPcs = false,
  showPrice = false,
  onConfirm,
  onClose
}) {
  const notify = useNotify();
  const weightInputRef = useRef(null);
  const rateInputRef = useRef(null);
  const amountInputRef = useRef(null);
  const enterDebounceRef = useRef(0);

  const [weightValue, setWeightValue] = useState(isPcs ? '1' : '1.000');
  const [rateValue, setRateValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [lastEditedField, setLastEditedField] = useState('weight'); // 'weight' | 'rate' | 'amount'
  const [rateError, setRateError] = useState('');

  // 1. Resolve Master / Catalog Menu Rate (never modified in DB)
  const currentPricingMode = propPricingMode || (() => {
    try {
      return localStorage.getItem('ariso_pricing_mode') || 'retail';
    } catch {
      return 'retail';
    }
  })();

  const menuRate = useMemo(() => {
    if (!product) return 0;
    if (product.original_rate !== undefined && product.original_rate !== null && !isNaN(parseFloat(product.original_rate))) {
      return parseFloat(product.original_rate);
    }
    if (currentPricingMode === 'wholesale' && product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
      return parseFloat(product.wholesale_price);
    }
    return parseFloat(product.price || product.selling_price || 0);
  }, [product, currentPricingMode]);

  // 2. Permission check: Can current cashier/user edit rate at billing?
  const canEditRate = useMemo(() => {
    const userRole = user?.role || 'cashier';
    if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') return true;

    // User-specific permissions array override
    if (Array.isArray(user?.permissions)) {
      if (user.permissions.includes('edit_rate_at_billing') || user.permissions.includes('all')) return true;
      if (user.permissions.includes('no_edit_rate')) return false;
    }

    // Store-level receipt_settings configuration
    if (receiptSettings?.allow_edit_rate_at_billing === 0 || receiptSettings?.allow_edit_rate_at_billing === false || receiptSettings?.allow_edit_rate_at_billing === '0') {
      return false;
    }

    const allowedRoles = (receiptSettings?.edit_rate_allowed_roles || 'admin,manager,cashier')
      .split(',')
      .map(r => r.trim());
    return allowedRoles.includes(userRole);
  }, [user, receiptSettings]);

  // 3. Purchase cost / lower limit threshold check
  const costPrice = useMemo(() => {
    if (!product) return 0;
    return parseFloat(product.cost_price || product.purchase_price || 0);
  }, [product]);

  // Reset state whenever modal opens or product changes
  useEffect(() => {
    if (isOpen && product) {
      const initW = isPcs
        ? (initialWeightInKg > 0 ? String(Math.round(initialWeightInKg)) : '1')
        : (initialWeightInKg > 0 ? initialWeightInKg.toFixed(3) : '1.000');
      setWeightValue(initW);

      const effectiveRate = (initialRate !== null && initialRate !== undefined && !isNaN(parseFloat(initialRate)))
        ? parseFloat(initialRate)
        : menuRate;

      const rateStr = effectiveRate.toFixed(2);
      setRateValue(rateStr);

      const numW = parseFloat(initW || '0');
      const initTotal = (numW * effectiveRate).toFixed(2);
      setAmountValue(initTotal);

      setLastEditedField('weight');
      setRateError('');
      enterDebounceRef.current = Date.now();

      const timer = setTimeout(() => {
        if (weightInputRef.current) {
          weightInputRef.current.focus();
          weightInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, product, initialWeightInKg, initialRate, menuRate, isPcs]);

  // Handle global F5 and F6 shortcuts inside modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyNav = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        if (weightInputRef.current) {
          weightInputRef.current.focus();
          weightInputRef.current.select();
        }
      } else if (e.key === 'F6' && (showPrice || canEditRate)) {
        e.preventDefault();
        e.stopPropagation();
        if (rateInputRef.current) {
          rateInputRef.current.focus();
          rateInputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyNav, true);
    return () => window.removeEventListener('keydown', handleKeyNav, true);
  }, [isOpen, canEditRate, showPrice]);

  if (!isOpen || !product) return null;

  // Numerical parsers
  const numericWeight = parseFloat(weightValue || '0');
  const isWeightEmptyOrZero = weightValue === '' || weightValue === '.' || isNaN(numericWeight) || numericWeight <= 0;
  const weightInKg = isWeightEmptyOrZero ? 0 : numericWeight;

  const numericRate = parseFloat(rateValue || '0');
  const isRateEmptyOrZero = rateValue === '' || rateValue === '.' || isNaN(numericRate) || numericRate < 0;
  const effectiveRate = isRateEmptyOrZero ? 0 : numericRate;

  // Rate override flag
  const isRateOverridden = Math.abs(effectiveRate - menuRate) > 0.005;

  // Live amount calculation
  const calculatedTotal = (weightInKg * effectiveRate).toFixed(2);

  // Stock inventory tracking checks
  const trackStock = product.track_inventory !== 0 && product.current_stock !== null && product.current_stock !== undefined;
  const physicalStock = parseFloat(product.current_stock || 0);
  const reservedStock = parseFloat(product.reserved_stock || 0);
  const availableStock = Math.max(0, physicalStock - reservedStock);
  const isOverStock = trackStock && !isWeightEmptyOrZero && (weightInKg > availableStock);

  // Lower limit below-cost warning
  const isBelowCost = costPrice > 0 && effectiveRate > 0 && effectiveRate < costPrice;
  const rateLimitMode = receiptSettings?.rate_limit_mode || 'warning';

  // Rate input validation helper
  const validateRate = (valStr) => {
    if (valStr === '' || valStr === '.') {
      return 'Rate cannot be empty';
    }
    const n = parseFloat(valStr);
    if (isNaN(n) || n < 0) {
      return 'Rate must be a positive number (≥ 0)';
    }
    const decParts = valStr.split('.');
    if (decParts.length > 1 && decParts[1].length > 2) {
      return 'Rate can have a maximum of 2 decimal places';
    }
    return '';
  };

  // Preset weight selection
  const handlePresetSelect = (presetWeight) => {
    setWeightValue(presetWeight);
    setLastEditedField('weight');
    const w = parseFloat(presetWeight);
    const amt = (w * effectiveRate).toFixed(2);
    setAmountValue(amt);
    if (weightInputRef.current) {
      weightInputRef.current.focus();
      weightInputRef.current.select();
    }
  };

  const isPresetActive = (val) => {
    return parseFloat(weightValue) === parseFloat(val);
  };

  // Weight / Quantity input handler
  const handleWeightChange = (e) => {
    let raw = e.target.value;
    if (raw.startsWith('-') || parseFloat(raw) < 0) raw = '0';
    let clean = '';
    if (isPcs) {
      clean = raw.replace(/[^0-9]/g, '');
    } else {
      clean = sanitizePositiveNumberString(raw, true);
    }
    setWeightValue(clean);
    setLastEditedField('weight');

    const w = parseFloat(clean || '0');
    if (!isNaN(w) && w > 0 && !isRateEmptyOrZero) {
      setAmountValue((w * effectiveRate).toFixed(2));
    } else {
      setAmountValue('0.00');
    }
  };

  // Rate input handler
  const handleRateChange = (e) => {
    let raw = e.target.value;
    if (raw.startsWith('-')) raw = '0';
    const clean = sanitizePositiveNumberString(raw, true);
    setRateValue(clean);
    setLastEditedField('rate');

    const err = validateRate(clean);
    setRateError(err);

    if (!err && clean !== '') {
      const r = parseFloat(clean);
      setAmountValue((weightInKg * r).toFixed(2));
    }
  };

  // Direct Amount / Calculated Total input handler (two-way live back-calculation)
  const handleAmountChange = (e) => {
    let raw = e.target.value;
    if (raw.startsWith('-')) raw = '0';
    const clean = sanitizePositiveNumberString(raw, true);
    setAmountValue(clean);
    setLastEditedField('amount');

    const a = parseFloat(clean || '0');
    if (!isNaN(a) && a >= 0 && weightInKg > 0) {
      const backCalcRate = (a / weightInKg).toFixed(2);
      setRateValue(backCalcRate);
      setRateError(validateRate(backCalcRate));
    }
  };

  // Reset to Menu Rate handler
  const handleResetRate = () => {
    const defaultStr = menuRate.toFixed(2);
    setRateValue(defaultStr);
    setRateError('');
    setLastEditedField('rate');
    setAmountValue((weightInKg * menuRate).toFixed(2));
    if (rateInputRef.current) {
      rateInputRef.current.focus();
      rateInputRef.current.select();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      // Debounce protection against rapid double Enter
      if (Date.now() - enterDebounceRef.current < 150) {
        return;
      }

      // Check if quantity/weight is empty, zero or invalid
      if (isWeightEmptyOrZero) {
        notify?.warning(
          isPcs ? 'Please enter a valid quantity greater than 0.' : 'Please enter a valid weight greater than 0 kg.',
          'Invalid Value'
        );
        if (weightInputRef.current) {
          weightInputRef.current.focus();
          weightInputRef.current.select();
        }
        return;
      }

      if (isOverStock) {
        notify?.warning(
          isPcs
            ? `Requested ${numericWeight} ${product.unit || 'pcs'} exceeds available stock (${availableStock} ${product.unit || 'pcs'}).`
            : `Requested ${weightInKg.toFixed(3)} kg exceeds available stock (${availableStock.toFixed(3)} kg).`,
          'Stock Limit Exceeded',
          5000
        );
        return;
      }

      const activeEl = document.activeElement;
      const isFocusedInRate = activeEl === rateInputRef.current || e.target === rateInputRef.current;

      // In Q+P flow (showPrice=true):
      if (showPrice) {
        if (!isFocusedInRate) {
          // 1st Enter: Move focus to the price/rate input (selected)
          enterDebounceRef.current = Date.now();
          if (rateInputRef.current) {
            rateInputRef.current.focus();
            rateInputRef.current.select();
          }
          return;
        } else {
          // 2nd Enter (while focused in price/rate): Validate rate and add to cart
          const err = validateRate(rateValue);
          if (err || isRateEmptyOrZero) {
            setRateError(err || 'Rate cannot be empty');
            notify?.warning(err || 'Rate cannot be empty', 'Invalid Rate');
            if (rateInputRef.current) {
              rateInputRef.current.focus();
              rateInputRef.current.select();
            }
            return;
          }
          handleConfirm();
          return;
        }
      } else {
        // In Q only flow (showPrice=false): Single Enter adds item to cart with menu price
        handleConfirm();
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'F5') {
      e.preventDefault();
      if (weightInputRef.current) {
        weightInputRef.current.focus();
        weightInputRef.current.select();
      }
      return;
    }

    if (e.key === 'F6' && showPrice) {
      e.preventDefault();
      if (rateInputRef.current) {
        rateInputRef.current.focus();
        rateInputRef.current.select();
      }
      return;
    }
  };

  const handleConfirm = () => {
    if (isWeightEmptyOrZero) {
      notify?.warning(
        isPcs ? 'Please enter a valid quantity greater than 0.' : 'Please enter a valid weight greater than 0 kg.',
        'Invalid Value'
      );
      if (weightInputRef.current) {
        weightInputRef.current.focus();
        weightInputRef.current.select();
      }
      return;
    }

    if (showPrice) {
      const err = validateRate(rateValue);
      if (err || isRateEmptyOrZero) {
        setRateError(err || 'Rate cannot be empty');
        notify?.warning(err || 'Rate cannot be empty', 'Invalid Rate');
        if (rateInputRef.current) {
          rateInputRef.current.focus();
          rateInputRef.current.select();
        }
        return;
      }
    }

    if (isOverStock) {
      notify?.warning(
        isPcs
          ? `Requested ${numericWeight} ${product.unit || 'pcs'} exceeds available stock (${availableStock} ${product.unit || 'pcs'}).`
          : `Requested ${weightInKg.toFixed(3)} kg exceeds available stock (${availableStock.toFixed(3)} kg).`,
        'Stock Limit Exceeded',
        5000
      );
      return;
    }

    const finalRate = showPrice ? parseFloat(rateValue) : menuRate;
    const finalAmount = parseFloat(calculatedTotal);
    const finalQty = isPcs ? numericWeight : weightInKg;

    onConfirm({
      product,
      weightInKg: isPcs ? 0 : weightInKg,
      displayWeight: finalQty,
      quantity: finalQty,
      unit: isPcs ? (product.unit || product.base_unit || 'pcs') : (product.base_unit || product.unit || 'kg'),
      pricePerBaseUnit: finalRate,
      price: finalRate,
      unit_price: finalRate,
      original_rate: menuRate,
      unit_rate: finalRate,
      rate_overridden: isRateOverridden,
      calculatedTotal: finalAmount,
      isPcs
    });

    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const isFormValid = !isWeightEmptyOrZero && !isOverStock && (!showPrice || (!isRateEmptyOrZero && !rateError));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.productName}>{product.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <p style={styles.priceSub}>
                Menu Rate: <strong>₹{menuRate.toFixed(2)}</strong> per {isPcs ? (product.unit || 'pcs') : (product.base_unit || product.unit || 'kg')}
                {currentPricingMode === 'wholesale' && (
                  <span style={{ marginLeft: 6, fontSize: '10px', backgroundColor: '#38BDF8', color: '#0F172A', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                    WHOLESALE
                  </span>
                )}
              </p>
              {trackStock && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: availableStock <= 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                    color: availableStock <= 0 ? '#ef4444' : '#10b981',
                    border: `1px solid ${availableStock <= 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}
                >
                  {availableStock <= 0
                    ? (isPcs ? 'Out of Stock (0)' : 'Out of Stock (0 kg)')
                    : (isPcs ? `Stock: ${Math.floor(availableStock)} ${product.unit || 'pcs'}` : `Stock: ${availableStock.toFixed(3)} kg`)}
                </span>
              )}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)"><X size={18} /></button>
        </div>

        {/* Input Section 1: Weight or Quantity Input */}
        <div style={styles.inputSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={styles.label}>{isPcs ? 'Enter Quantity (F5):' : 'Enter Weight (Kg) (F5):'}</label>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{isPcs ? `Unit: ${product.unit || 'pcs'}` : 'Scale unit: kg'}</span>
          </div>
          <div style={styles.inputRow}>
            <input
              ref={weightInputRef}
              style={{
                ...styles.input,
                border: isOverStock
                  ? '2px solid #ef4444'
                  : isWeightEmptyOrZero
                  ? '2px solid #F59E0B'
                  : '2px solid #F97316'
              }}
              type="number"
              min="0"
              step={isPcs ? "1" : "any"}
              value={weightValue}
              onChange={handleWeightChange}
              onFocus={handleSelectAllOnFocus}
              onClick={handleSelectAllOnClick}
              onMouseUp={handleSelectAllOnMouseUp}
              placeholder={isPcs ? "1" : "0.000"}
              autoFocus
            />
            <div style={styles.unitBadge}>{isPcs ? (product.unit || 'PCS').toUpperCase() : 'KG'}</div>
          </div>

          {isOverStock && (
            <div style={styles.stockWarningBox}>
              <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>
                {isPcs
                  ? `Requested ${numericWeight} ${product.unit || 'pcs'} exceeds available stock of ${availableStock} ${product.unit || 'pcs'}`
                  : `Requested ${weightInKg.toFixed(3)} kg exceeds available stock of ${availableStock.toFixed(3)} kg`}
              </span>
            </div>
          )}
          {isWeightEmptyOrZero && !isOverStock && (
            <div style={styles.validationWarningBox}>
              <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
              <span>{isPcs ? 'Please enter a valid quantity greater than 0' : 'Please enter a weight greater than 0 kg to add to cart'}</span>
            </div>
          )}
        </div>

        {/* Preset Quick Weight Buttons (Only for Weight Items) */}
        {!isPcs && (
          <div style={{ marginBottom: '14px' }}>
            <label style={styles.smallLabel}>QUICK WEIGHT PRESETS:</label>
            <div style={styles.presetGrid}>
              {[
                { val: '0.250', label: '250 g' },
                { val: '0.500', label: '500 g' },
                { val: '0.750', label: '750 g' },
                { val: '1.000', label: '1 kg' },
                { val: '1.250', label: '1.25 kg' },
                { val: '2.500', label: '2.5 kg' },
                { val: '5.000', label: '5 kg' },
              ].map((p) => {
                const active = isPresetActive(p.val);
                return (
                  <button
                    key={p.label}
                    type="button"
                    style={{
                      ...styles.presetBtn,
                      ...(active ? styles.presetActive : {})
                    }}
                    onClick={() => handlePresetSelect(p.val)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Section 2: Rate (Only when showPrice is true) */}
        {showPrice && (
          <div style={styles.inputSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={styles.label}>
                Rate (₹ / {isPcs ? (product.unit || 'unit') : 'kg'}) {canEditRate ? '(F6):' : '(Read-only):'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isRateOverridden && (
                  <span style={styles.rateEditedBadge}>
                    Rate edited (Orig: ₹{menuRate.toFixed(2)})
                  </span>
                )}
                {canEditRate && isRateOverridden && (
                  <button
                    type="button"
                    style={styles.resetRateBtn}
                    onClick={handleResetRate}
                    title="Reset rate back to current menu rate"
                  >
                    <RotateCcw size={12} /> Reset to menu rate
                  </button>
                )}
              </div>
            </div>

            <div style={styles.inputRow}>
              <input
                ref={rateInputRef}
                style={{
                  ...styles.input,
                  backgroundColor: canEditRate ? '#0F172A' : '#1E293B',
                  cursor: canEditRate ? 'text' : 'not-allowed',
                  border: rateError
                    ? '2px solid #EF4444'
                    : isRateOverridden
                    ? '2px solid #F59E0B'
                    : '2px solid #334155'
                }}
                type="number"
                min="0"
                step="0.01"
                readOnly={!canEditRate}
                value={rateValue}
                onChange={handleRateChange}
                onFocus={handleSelectAllOnFocus}
                onClick={handleSelectAllOnClick}
                onMouseUp={handleSelectAllOnMouseUp}
                placeholder="0.00"
              />
              <div style={styles.unitBadge}>
                {canEditRate ? `₹ / ${isPcs ? (product.unit || 'UNIT').toUpperCase() : 'KG'}` : <Lock size={14} color="#94A3B8" />}
              </div>
            </div>

            {rateError && (
              <div style={styles.errorBox}>
                <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
                <span>{rateError}</span>
              </div>
            )}

            {isBelowCost && !rateError && (
              <div style={styles.belowCostWarningBox}>
                <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span>
                  Rate (₹{effectiveRate.toFixed(2)}) is below purchase cost (₹{costPrice.toFixed(2)}).
                  {rateLimitMode === 'warning' ? ' (Warning only)' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Calculated Amount Box */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>{isPcs ? 'Total Quantity:' : 'Total Weight:'}</span>
            <span style={styles.summaryVal}>{isPcs ? `${numericWeight} ${product.unit || 'pcs'}` : `${weightInKg.toFixed(3)} KG`}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Rate per {isPcs ? (product.unit || 'unit') : 'kg'}:</span>
            <span style={styles.summaryVal}>
              ₹{effectiveRate.toFixed(2)}
              {isRateOverridden && (
                <span style={{ fontSize: '11px', color: '#F59E0B', marginLeft: '6px' }}>
                  (Orig: ₹{menuRate.toFixed(2)})
                </span>
              )}
            </span>
          </div>

          <div style={styles.divider} />

          {showPrice ? (
            <>
              {/* Amount input row allows direct editing to back-calculate rate */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.totalLabel}>CALCULATED AMOUNT (₹):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>₹</span>
                  <input
                    ref={amountInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!canEditRate || isWeightEmptyOrZero}
                    value={amountValue}
                    onChange={handleAmountChange}
                    onFocus={handleSelectAllOnFocus}
                    onClick={handleSelectAllOnClick}
                    onMouseUp={handleSelectAllOnMouseUp}
                    placeholder="0.00"
                    style={{
                      ...styles.amountInput,
                      cursor: canEditRate && !isWeightEmptyOrZero ? 'text' : 'default'
                    }}
                    title={canEditRate ? 'Edit amount directly to back-calculate rate' : 'Calculated amount'}
                  />
                </div>
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '4px', textAlign: 'right' }}>
                amount = {isPcs ? 'qty' : 'weight'} × rate (rate back-calculates if amount is typed)
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={styles.totalLabel}>TOTAL AMOUNT:</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>₹{calculatedTotal}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button type="button" style={styles.cancelBtn} onClick={onClose}>
            Cancel (Esc)
          </button>
          <button
            type="button"
            disabled={!isFormValid}
            style={{
              ...styles.confirmBtn,
              ...(!isFormValid ? { backgroundColor: '#475569', cursor: 'not-allowed', opacity: 0.6 } : {}),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleConfirm}
          >
            {isOverStock ? (
              <><AlertTriangle size={16} /> Exceeds Stock ({isPcs ? `${availableStock} max` : `${availableStock.toFixed(3)} kg max`})</>
            ) : isWeightEmptyOrZero ? (
              <><ShoppingCart size={16} /> {isPcs ? 'Enter Quantity' : 'Enter Weight (Kg)'}</>
            ) : (showPrice && rateError) ? (
              <><AlertTriangle size={16} /> Fix Invalid Rate</>
            ) : initialWeightInKg > 0 ? (
              <><Scale size={16} /> {isPcs ? `Update Quantity (₹${calculatedTotal})` : `Update Weight (₹${calculatedTotal})`}</>
            ) : (
              <><ShoppingCart size={16} /> Add to Cart (Enter) • ₹{calculatedTotal}</>
            )}
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
    width: '460px',
    maxWidth: '95vw',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #334155',
    color: '#F8FAFC'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    borderBottom: '1px solid #334155',
    paddingBottom: '12px'
  },
  productName: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 1.3
  },
  priceSub: {
    margin: 0,
    fontSize: '12px',
    color: '#94A3B8'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  inputSection: {
    marginBottom: '14px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: '0.3px'
  },
  smallLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: '6px'
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    fontSize: '18px',
    fontWeight: '800',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #334155',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  amountInput: {
    backgroundColor: '#0F172A',
    color: '#10B981',
    fontSize: '20px',
    fontWeight: '900',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #059669',
    outline: 'none',
    width: '130px',
    textAlign: 'right'
  },
  unitBadge: {
    padding: '10px 14px',
    backgroundColor: '#334155',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '12px',
    color: '#E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  rateEditedBadge: {
    fontSize: '10.5px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#FCD34D',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    fontWeight: '800'
  },
  resetRateBtn: {
    background: 'none',
    border: '1px solid #475569',
    color: '#38BDF8',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '10.5px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px'
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px'
  },
  presetBtn: {
    backgroundColor: '#0F172A',
    color: '#CBD5E1',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '7px 4px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  presetActive: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    borderColor: '#F97316'
  },
  summaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid #334155',
    marginBottom: '16px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#94A3B8',
    fontWeight: '600'
  },
  summaryVal: {
    fontSize: '12px',
    color: '#F8FAFC',
    fontWeight: '700'
  },
  divider: {
    height: '1px',
    backgroundColor: '#334155',
    margin: '8px 0'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: '12.5px'
  },
  totalVal: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: '20px'
  },
  stockWarningBox: {
    marginTop: '6px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    fontWeight: '700'
  },
  validationWarningBox: {
    marginTop: '6px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#fcd34d',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    fontWeight: '700'
  },
  errorBox: {
    marginTop: '6px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    fontWeight: '700'
  },
  belowCostWarningBox: {
    marginTop: '6px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#fcd34d',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    fontWeight: '700'
  },
  actionRow: {
    display: 'flex',
    gap: '10px'
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    color: '#CBD5E1',
    fontWeight: '700',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px'
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    fontWeight: '900',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px'
  }
};
