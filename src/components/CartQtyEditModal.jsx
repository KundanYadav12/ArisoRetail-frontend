import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Check, X, AlertTriangle, RotateCcw, Lock, Tag } from 'lucide-react';
import {
  sanitizePositiveNumberString,
  handlePositiveNumberKeyDown,
  handlePositiveNumberPaste,
  handleSelectAllOnFocus,
  handleSelectAllOnClick,
  handleSelectAllOnMouseUp
} from '../utils/numberInputUtils';

export default function CartQtyEditModal({
  isOpen,
  item,
  pricingMode = 'retail',
  user = null,
  receiptSettings = null,
  onConfirm,
  onClose,
  onClearCart
}) {
  const qtyInputRef = useRef(null);
  const rateInputRef = useRef(null);
  const amountInputRef = useRef(null);

  const [qtyValue, setQtyValue] = useState('1');
  const [rateValue, setRateValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [lastEditedField, setLastEditedField] = useState('qty');
  const [rateError, setRateError] = useState('');

  // 1. Resolve Master / Catalog Menu Rate
  const isWholesale = pricingMode === 'wholesale';
  const menuRate = useMemo(() => {
    if (!item) return 0;
    if (item.original_rate !== undefined && item.original_rate !== null && !isNaN(parseFloat(item.original_rate))) {
      return parseFloat(item.original_rate);
    }
    if (isWholesale && item.wholesale_price && parseFloat(item.wholesale_price) > 0) {
      return parseFloat(item.wholesale_price);
    }
    return parseFloat(item.price || item.unit_price || item.selling_price || 0);
  }, [item, isWholesale]);

  // 2. Permission check: Can cashier edit rate?
  const canEditRate = useMemo(() => {
    const userRole = user?.role || 'cashier';
    if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager') return true;

    if (Array.isArray(user?.permissions)) {
      if (user.permissions.includes('edit_rate_at_billing') || user.permissions.includes('all')) return true;
      if (user.permissions.includes('no_edit_rate')) return false;
    }

    if (receiptSettings?.allow_edit_rate_at_billing === 0 || receiptSettings?.allow_edit_rate_at_billing === false || receiptSettings?.allow_edit_rate_at_billing === '0') {
      return false;
    }

    const allowedRoles = (receiptSettings?.edit_rate_allowed_roles || 'admin,manager,cashier')
      .split(',')
      .map(r => r.trim());
    return allowedRoles.includes(userRole);
  }, [user, receiptSettings]);

  // 3. Cost Price check for lower limit warning
  const costPrice = useMemo(() => {
    if (!item) return 0;
    return parseFloat(item.cost_price || item.purchase_price || 0);
  }, [item]);

  const isSerialItem = Boolean(item?.serial_number);

  useEffect(() => {
    if (isOpen && item) {
      const q = isSerialItem ? '1' : String(item.quantity || 1);
      setQtyValue(q);

      // Current rate from item if previously overridden, or default to menu rate
      const activeRate = (item.price !== undefined && item.price !== null && !isNaN(parseFloat(item.price)))
        ? parseFloat(item.price)
        : (item.unit_price !== undefined && item.unit_price !== null && !isNaN(parseFloat(item.unit_price)))
        ? parseFloat(item.unit_price)
        : menuRate;

      const rateStr = activeRate.toFixed(2);
      setRateValue(rateStr);

      const numQ = parseFloat(q || '0');
      setAmountValue((numQ * activeRate).toFixed(2));
      setLastEditedField('qty');
      setRateError('');

      const timer = setTimeout(() => {
        if (isSerialItem && canEditRate && rateInputRef.current) {
          rateInputRef.current.focus();
          rateInputRef.current.select();
        } else if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item, menuRate, isSerialItem, canEditRate]);

  // Keyboard navigation shortcuts inside modal (F5 for Qty, F6 for Rate)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyNav = (e) => {
      if (e.key === 'F5' && !isSerialItem) {
        e.preventDefault();
        e.stopPropagation();
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      } else if (e.key === 'F6' && canEditRate) {
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
  }, [isOpen, canEditRate, isSerialItem]);

  if (!isOpen || !item) return null;

  const numericQty = parseFloat(qtyValue || '0');
  const isQtyEmptyOrZero = qtyValue === '' || qtyValue === '.' || isNaN(numericQty) || numericQty <= 0;
  const effectiveQty = isQtyEmptyOrZero ? 0 : numericQty;

  const numericRate = parseFloat(rateValue || '0');
  const isRateEmptyOrZero = rateValue === '' || rateValue === '.' || isNaN(numericRate) || numericRate < 0;
  const effectiveRate = isRateEmptyOrZero ? 0 : numericRate;

  const isRateOverridden = Math.abs(effectiveRate - menuRate) > 0.005;
  const calculatedTotal = (effectiveQty * effectiveRate).toFixed(2);

  const isBelowCost = costPrice > 0 && effectiveRate > 0 && effectiveRate < costPrice;
  const rateLimitMode = receiptSettings?.rate_limit_mode || 'warning';

  const validateRate = (valStr) => {
    if (valStr === '' || valStr === '.') return 'Rate cannot be empty';
    const n = parseFloat(valStr);
    if (isNaN(n) || n < 0) return 'Rate must be a positive number (≥ 0)';
    const decParts = valStr.split('.');
    if (decParts.length > 1 && decParts[1].length > 2) {
      return 'Rate can have a maximum of 2 decimal places';
    }
    return '';
  };

  const handleQtyChange = (e) => {
    if (isSerialItem) return;
    let raw = e.target.value;
    if (raw.startsWith('-') || parseFloat(raw) < 0) raw = '0';
    const clean = sanitizePositiveNumberString(raw, true);
    setQtyValue(clean);
    setLastEditedField('qty');

    const q = parseFloat(clean || '0');
    if (!isNaN(q) && q > 0 && !isRateEmptyOrZero) {
      setAmountValue((q * effectiveRate).toFixed(2));
    } else {
      setAmountValue('0.00');
    }
  };

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
      setAmountValue((effectiveQty * r).toFixed(2));
    }
  };

  const handleAmountChange = (e) => {
    let raw = e.target.value;
    if (raw.startsWith('-')) raw = '0';
    const clean = sanitizePositiveNumberString(raw, true);
    setAmountValue(clean);
    setLastEditedField('amount');

    const a = parseFloat(clean || '0');
    if (!isNaN(a) && a >= 0 && effectiveQty > 0) {
      const backCalcRate = (a / effectiveQty).toFixed(2);
      setRateValue(backCalcRate);
      setRateError(validateRate(backCalcRate));
    }
  };

  const handleResetRate = () => {
    const defaultStr = menuRate.toFixed(2);
    setRateValue(defaultStr);
    setRateError('');
    setLastEditedField('rate');
    setAmountValue((effectiveQty * menuRate).toFixed(2));
    if (rateInputRef.current) {
      rateInputRef.current.focus();
      rateInputRef.current.select();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!isQtyEmptyOrZero && !rateError && !isRateEmptyOrZero) {
        handleConfirm();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onClearCart === 'function') {
        onClearCart();
      } else {
        onClose();
      }
      return;
    }

    if (e.key === 'F5' && !isSerialItem) {
      e.preventDefault();
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
      return;
    }

    if (e.key === 'F6' && canEditRate) {
      e.preventDefault();
      if (rateInputRef.current) {
        rateInputRef.current.focus();
        rateInputRef.current.select();
      }
      return;
    }
  };

  const handleConfirm = () => {
    if (isQtyEmptyOrZero) return;

    const err = validateRate(rateValue);
    if (err) {
      setRateError(err);
      if (rateInputRef.current) rateInputRef.current.focus();
      return;
    }

    const finalRate = parseFloat(rateValue);
    const finalTotal = parseFloat(calculatedTotal);

    onConfirm({
      quantity: effectiveQty,
      rate: finalRate,
      unitPrice: finalRate,
      price: finalRate,
      originalRate: menuRate,
      original_rate: menuRate,
      unit_rate: finalRate,
      rateOverridden: isRateOverridden,
      rate_overridden: isRateOverridden,
      calculatedTotal: finalTotal
    });

    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const isFormValid = !isQtyEmptyOrZero && !isRateEmptyOrZero && !rateError;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ ...styles.productName, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} color="#38BDF8" /> {isSerialItem ? 'Serial Item Rate & Details' : 'Enter Quantity & Rate'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <p style={styles.itemTitle}>{item.name}</p>
              {isSerialItem && (
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#3B0764', color: '#D8B4FE', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={11} /> SN: {item.serial_number}
                </span>
              )}
            </div>
            <p style={styles.menuRateText}>
              Menu Rate: <strong>₹{menuRate.toFixed(2)}</strong> per {item.unit || item.base_unit || 'pcs'}
              {pricingMode === 'wholesale' && (
                <span style={{ marginLeft: 6, fontSize: '10px', backgroundColor: '#38BDF8', color: '#0F172A', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                  WHOLESALE
                </span>
              )}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)"><X size={18} /></button>
        </div>

        {/* Section 1: Quantity */}
        <div style={styles.inputSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={styles.label}>
              {isSerialItem ? 'QUANTITY (Serial Unit Fixed = 1):' : 'QUANTITY (F5):'}
            </label>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
              Unit: {item.unit || item.base_unit || 'pcs'}
            </span>
          </div>

          <div style={styles.inputRow}>
            <input
              ref={qtyInputRef}
              style={{
                ...styles.input,
                backgroundColor: isSerialItem ? '#1E293B' : '#0F172A',
                cursor: isSerialItem ? 'not-allowed' : 'text',
                border: isQtyEmptyOrZero ? '2px solid #F59E0B' : '2px solid #3b82f6'
              }}
              type="number"
              min="0"
              step="any"
              readOnly={isSerialItem}
              value={qtyValue}
              onChange={handleQtyChange}
              onFocus={handleSelectAllOnFocus}
              onClick={handleSelectAllOnClick}
              onMouseUp={handleSelectAllOnMouseUp}
              placeholder="0"
              autoFocus={!isSerialItem}
            />
            <div style={styles.unitBadge}>
              {item.unit || item.base_unit || 'pcs'}
            </div>
          </div>

          {isQtyEmptyOrZero && (
            <div style={styles.validationWarningBox}>
              <AlertTriangle size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
              <span>Please enter a quantity greater than 0</span>
            </div>
          )}
        </div>

        {/* Quick Stepper Buttons for PCS items */}
        {!isSerialItem && (
          <div style={{ marginBottom: '14px' }}>
            <label style={styles.smallLabel}>QUICK PRESETS:</label>
            <div style={styles.presetGrid}>
              {[1, 2, 3, 5, 10, 12, 24].map((num) => (
                <button
                  key={num}
                  type="button"
                  style={{
                    ...styles.presetBtn,
                    ...(parseFloat(qtyValue) === num ? styles.presetActive : {})
                  }}
                  onClick={() => {
                    setQtyValue(String(num));
                    setAmountValue((num * effectiveRate).toFixed(2));
                    if (qtyInputRef.current) {
                      qtyInputRef.current.focus();
                      qtyInputRef.current.select();
                    }
                  }}
                >
                  {num} {item.unit || item.base_unit || 'pcs'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Rate per unit (Current Bill Line Only) */}
        <div style={styles.inputSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={styles.label}>
              Rate per unit (₹) {canEditRate ? '(F6):' : '(Read-only):'}
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
              autoFocus={isSerialItem}
            />
            <div style={styles.unitBadge}>
              {canEditRate ? '₹ / UNIT' : <Lock size={14} color="#94A3B8" />}
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

        {/* Calculated Amount Box with Two-Way Live Back-Calculation */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Rate per unit:</span>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={styles.totalLabel}>CALCULATED TOTAL (₹):</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>₹</span>
              <input
                ref={amountInputRef}
                type="number"
                min="0"
                step="0.01"
                disabled={!canEditRate || isQtyEmptyOrZero}
                value={amountValue}
                onChange={handleAmountChange}
                onFocus={handleSelectAllOnFocus}
                onClick={handleSelectAllOnClick}
                onMouseUp={handleSelectAllOnMouseUp}
                placeholder="0.00"
                style={{
                  ...styles.amountInput,
                  cursor: canEditRate && !isQtyEmptyOrZero ? 'text' : 'default'
                }}
                title={canEditRate ? 'Edit amount directly to back-calculate rate' : 'Calculated total'}
              />
            </div>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '4px', textAlign: 'right' }}>
            total = qty × rate (rate back-calculates if amount is typed)
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button style={styles.cancelBtn} type="button" onClick={onClose}>
            Cancel (Esc)
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              ...(!isFormValid ? { backgroundColor: '#475569', cursor: 'not-allowed', opacity: 0.6 } : {}),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            type="button"
            disabled={!isFormValid}
            onClick={handleConfirm}
          >
            <Check size={16} />
            {isQtyEmptyOrZero
              ? 'Enter Quantity'
              : rateError
              ? 'Fix Invalid Rate'
              : `Save Quantity (Enter) • ₹${calculatedTotal}`}
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
    width: '450px',
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
    color: '#F8FAFC'
  },
  itemTitle: {
    margin: 0,
    fontSize: '13px',
    color: '#CBD5E1',
    fontWeight: '700'
  },
  menuRateText: {
    margin: '3px 0 0 0',
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
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    borderColor: '#3B82F6'
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
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontWeight: '900',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px'
  }
};
