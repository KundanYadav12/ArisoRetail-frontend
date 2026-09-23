import React, { useState, useEffect } from 'react';
import { Scale, ShoppingCart, X } from 'lucide-react';

export default function WeightInputModal({ isOpen, product, initialWeightInKg = 0, onConfirm, onClose }) {
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
      alert('Please enter a valid weight.');
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
            <p style={styles.priceSub}>₹{pricePerBaseUnit.toFixed(2)} per {(product.base_unit === 'pcs' || product.unit === 'pcs') ? 'kg' : (product.base_unit || product.unit || 'kg')}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Input Section */}
        <div style={styles.inputSection}>
          <label style={styles.label}>Enter Weight (Kg) (F5):</label>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type="number"
              step="any"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              placeholder="0.000"
              autoFocus
            />
          </div>
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
          <button type="button" style={{ ...styles.confirmBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleConfirm}>
            {initialWeightInKg > 0 ? (
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
    border: '1px solid #475569',
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
