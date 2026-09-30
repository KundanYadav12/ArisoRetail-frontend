import React, { useState, useEffect } from 'react';
import { Scale, ShoppingCart, X, AlertTriangle } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';

export default function WeightInputModal({ isOpen, product, initialWeightInKg = 0, onConfirm, onClose }) {
  const notify = useNotify();
  const [weightValue, setWeightValue] = useState('1.000');

  useEffect(() => {
    if (isOpen && product) {
      if (initialWeightInKg > 0) {
        setWeightValue(initialWeightInKg.toFixed(3));
      } else {
        setWeightValue('1.000');
      }
    }
  }, [isOpen, product, initialWeightInKg]);

  if (!isOpen || !product) return null;

  const pricePerBaseUnit = parseFloat(product.price || product.selling_price || 0);
  const weightInKg = parseFloat(weightValue || '0');
  const calculatedTotal = (weightInKg * pricePerBaseUnit).toFixed(2);

  // Stock inventory tracking checks
  const trackStock = product.track_inventory !== 0 && product.current_stock !== null && product.current_stock !== undefined;
  const physicalStock = parseFloat(product.current_stock || 0);
  const reservedStock = parseFloat(product.reserved_stock || 0);
  const availableStock = Math.max(0, physicalStock - reservedStock);
  const isOverStock = trackStock && (weightInKg > availableStock);

  const handlePresetSelect = (presetWeight) => {
    setWeightValue(presetWeight);
  };

  const isPresetActive = (val) => {
    return parseFloat(weightValue) === parseFloat(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (isNaN(weightInKg) || weightInKg <= 0) {
      notify?.warning('Please enter a valid weight greater than 0 kg.', 'Invalid Weight');
      return;
    }

    if (isOverStock) {
      notify?.warning(
        `Requested ${weightInKg.toFixed(3)} kg exceeds available stock (${availableStock.toFixed(3)} kg).`,
        'Stock Limit Exceeded',
        5000
      );
      notify?.alert({
        title: 'Insufficient Stock',
        message: `Cannot add "${product.name}" to cart.`,
        type: 'warning',
        buttonText: 'Understood (Enter / Esc)',
        details: {
          requested: `${weightInKg.toFixed(3)} kg`,
          available: `${availableStock.toFixed(3)} kg`,
          physical: `${physicalStock.toFixed(3)} kg`,
          reserved: `${reservedStock.toFixed(3)} kg`
        },
        subtitle: physicalStock <= 0
          ? 'This item is currently completely out of stock in your warehouse.'
          : 'Portions of this stock are reserved by other pending or held orders.'
      });
      return;
    }

    onConfirm({
      product,
      weightInKg,
      displayWeight: weightInKg,
      unit: 'kg',
      pricePerBaseUnit,
      calculatedTotal: parseFloat(calculatedTotal)
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.productName}>{product.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <p style={styles.priceSub}>₹{pricePerBaseUnit.toFixed(2)} per {(product.base_unit === 'pcs' || product.unit === 'pcs') ? 'kg' : (product.base_unit || product.unit || 'kg')}</p>
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
                  {availableStock <= 0 ? 'Out of Stock (0 kg)' : `Stock: ${availableStock.toFixed(3)} kg`}
                </span>
              )}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Input Section */}
        <div style={styles.inputSection}>
          <label style={styles.label}>Enter Weight (Kg) (F5):</label>
          <div style={styles.inputRow}>
            <input
              style={{
                ...styles.input,
                border: isOverStock ? '2px solid #ef4444' : '2px solid #F97316'
              }}
              type="number"
              step="any"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              placeholder="0.000"
              autoFocus
            />
          </div>
          {isOverStock && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: '700'
              }}
            >
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>Requested {weightInKg.toFixed(3)} kg exceeds available stock of {availableStock.toFixed(3)} kg</span>
            </div>
          )}
        </div>

        {/* Preset Quick Buttons */}
        <label style={styles.label}>QUICK WEIGHT PRESETS:</label>
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

        {/* Calculated Total Box */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Total Weight:</span>
            <span style={styles.summaryVal}>{weightInKg.toFixed(3)} KG ({weightInKg.toFixed(3)} Kg)</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Rate:</span>
            <span style={styles.summaryVal}>₹{pricePerBaseUnit.toFixed(2)} / {(product.base_unit === 'pcs' || product.unit === 'pcs') ? 'kg' : (product.base_unit || product.unit || 'kg')}</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>CALCULATED AMOUNT:</span>
            <span style={styles.totalVal}>₹{calculatedTotal}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel (Esc)</button>
          <button
            type="button"
            style={{
              ...styles.confirmBtn,
              ...(isOverStock ? { backgroundColor: '#dc2626' } : {}),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleConfirm}
          >
            {isOverStock ? (
              <><AlertTriangle size={16} /> Exceeds Stock ({availableStock.toFixed(3)} kg max)</>
            ) : initialWeightInKg > 0 ? (
              <><Scale size={16} /> Update Weight (₹{calculatedTotal})</>
            ) : (
              <><ShoppingCart size={16} /> Add to Cart (Enter)</>
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
    boxSizing: 'border-box',
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '460px',
    padding: '20px',
    border: '1px solid #334155',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    color: '#F8FAFC',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  productName: {
    fontSize: '20px',
    fontWeight: '800',
    margin: 0,
    color: '#F8FAFC',
  },
  priceSub: {
    fontSize: '13px',
    color: '#F97316',
    fontWeight: '700',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: '#334155',
    border: 'none',
    color: '#CBD5E1',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px',
  },
  inputSection: {
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#94A3B8',
    display: 'block',
    marginBottom: '6px',
    letterSpacing: '0.5px',
  },
  inputRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
  input: {
    flex: '1 1 140px',
    minWidth: '140px',
    backgroundColor: '#0F172A',
    border: '2px solid #F97316',
    borderRadius: '10px',
    color: '#F8FAFC',
    fontSize: '24px',
    fontWeight: '800',
    padding: '10px 14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  unitToggle: {
    display: 'flex',
    flex: '0 0 auto',
    backgroundColor: '#0F172A',
    borderRadius: '10px',
    padding: '4px',
    border: '1px solid #334155',
  },
  unitBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  unitActive: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    fontWeight: '900',
  },
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '18px',
  },
  presetBtn: {
    backgroundColor: '#334155',
    color: '#F8FAFC',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#475569',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  presetActive: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    borderColor: '#F97316',
    fontWeight: '900',
  },
  summaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid #334155',
    marginBottom: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '13px',
  },
  summaryLabel: {
    color: '#94A3B8',
  },
  summaryVal: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  divider: {
    height: '1px',
    backgroundColor: '#334155',
    margin: '8px 0',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: '13px',
  },
  totalVal: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: '22px',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
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
  },
};
