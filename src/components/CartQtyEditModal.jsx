import React, { useState, useEffect, useRef } from 'react';
import { Package, Check, X, AlertTriangle } from 'lucide-react';
import {
  sanitizePositiveNumberString,
  handlePositiveNumberKeyDown,
  handlePositiveNumberPaste,
  handleSelectAllOnFocus,
  handleSelectAllOnClick,
  handleSelectAllOnMouseUp
} from '../utils/numberInputUtils';

export default function CartQtyEditModal({ isOpen, item, onConfirm, onClose, onClearCart }) {
  const [qtyValue, setQtyValue] = useState('1');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && item) {
      setQtyValue(String(item.quantity || 1));
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  // Handle global F5 shortcut while modal is open to refocus & select input
  useEffect(() => {
    if (!isOpen) return;
    const handleF5 = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleF5, true);
    return () => window.removeEventListener('keydown', handleF5, true);
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const numericQty = parseFloat(qtyValue || '0');
  const isQtyEmptyOrZero = qtyValue === '' || qtyValue === '.' || isNaN(numericQty) || numericQty <= 0;
  const unitPrice = parseFloat(item.price || item.unit_price || 0);
  const calculatedTotal = isQtyEmptyOrZero ? '0.00' : (numericQty * unitPrice).toFixed(2);

  const handleQtyChange = (e) => {
    let raw = e.target.value;
    if (raw.startsWith('-') || parseFloat(raw) < 0) {
      raw = '0';
    }
    const clean = sanitizePositiveNumberString(raw, true);
    setQtyValue(clean);
  };

  const handlePaste = (e) => {
    handlePositiveNumberPaste(e, (cleaned) => {
      setQtyValue(cleaned);
    }, true);
  };

  const handleKeyDown = (e) => {
    handlePositiveNumberKeyDown(e, {
      allowDecimal: true,
      onLeadingDot: () => setQtyValue('0.'),
      onEnter: () => {
        if (!isQtyEmptyOrZero) {
          handleConfirm();
        }
      },
      onEscape: () => {
        if (typeof onClearCart === 'function') {
          onClearCart();
        } else {
          onClose();
        }
      },
      onF5: () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    });
  };

  const handleConfirm = () => {
    if (isQtyEmptyOrZero) {
      return;
    }
    onConfirm(numericQty);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={{ ...styles.productName, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} /> Enter Quantity
            </h2>
            <p style={styles.itemTitle}>{item.name}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={styles.inputSection}>
          <label style={styles.label}>QUANTITY (Press Enter to Add / Save):</label>
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={{
                ...styles.input,
                border: isQtyEmptyOrZero ? '2px solid #F59E0B' : '2px solid #3b82f6'
              }}
              type="number"
              min="0"
              step="any"
              value={qtyValue}
              onChange={handleQtyChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={handleSelectAllOnFocus}
              onClick={handleSelectAllOnClick}
              onMouseUp={handleSelectAllOnMouseUp}
              placeholder="0"
              autoFocus
            />
            <div style={styles.unitBadge}>
              {item.unit || item.base_unit || 'pcs'}
            </div>
          </div>
          {isQtyEmptyOrZero && (
            <div
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fcd34d',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '700'
              }}
            >
              <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
              <span>Please enter a quantity greater than 0 to save</span>
            </div>
          )}
        </div>

        {/* Quick Stepper Buttons */}
        <div style={styles.presetGrid}>
          {[1, 2, 3, 5, 10, 12, 24].map((num) => (
            <button
              key={num}
              type="button"
              style={styles.presetBtn}
              onClick={() => {
                setQtyValue(String(num));
                if (inputRef.current) {
                  inputRef.current.focus();
                  inputRef.current.select();
                }
              }}
            >
              {num} {item.unit || item.base_unit || 'pcs'}
            </button>
          ))}
        </div>

        {/* Calculated Amount Box */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Rate per unit:</span>
            <span style={styles.summaryVal}>₹{unitPrice.toFixed(2)}</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>CALCULATED TOTAL:</span>
            <span style={styles.totalVal}>₹{calculatedTotal}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button style={styles.cancelBtn} type="button" onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.confirmBtn,
              ...(isQtyEmptyOrZero ? { backgroundColor: '#475569', cursor: 'not-allowed', opacity: 0.6 } : {}),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            type="button"
            disabled={isQtyEmptyOrZero}
            onClick={handleConfirm}
          >
            <Check size={16} /> {isQtyEmptyOrZero ? 'Enter Quantity' : 'Save Quantity (Enter)'}
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
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '420px',
    padding: '24px',
    border: '1px solid #334155',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    color: '#F8FAFC',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  productName: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    color: '#F8FAFC',
  },
  itemTitle: {
    fontSize: '14px',
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
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    border: '2px solid #F97316',
    borderRadius: '10px',
    color: '#F8FAFC',
    fontSize: '24px',
    fontWeight: '800',
    padding: '10px 14px',
    outline: 'none',
  },
  unitBadge: {
    backgroundColor: '#0F172A',
    borderRadius: '10px',
    padding: '14px 18px',
    border: '1px solid #334155',
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: '14px',
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
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
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
