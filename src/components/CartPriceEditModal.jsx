import React, { useState, useEffect, useRef } from 'react';
import { IndianRupee, Check, X, AlertTriangle } from 'lucide-react';
import {
  sanitizePositiveNumberString,
  handlePositiveNumberKeyDown,
  handlePositiveNumberPaste,
  handleSelectAllOnFocus,
  handleSelectAllOnClick,
  handleSelectAllOnMouseUp
} from '../utils/numberInputUtils';

export default function CartPriceEditModal({ isOpen, item, onConfirm, onClose }) {
  const [priceValue, setPriceValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && item) {
      setPriceValue(String(item.price !== undefined && item.price !== null ? item.price : (item.unit_price || '')));
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const numericPrice = parseFloat(priceValue || '0');
  const isPriceInvalid = priceValue === '' || isNaN(numericPrice) || numericPrice < 0;

  const handlePriceChange = (e) => {
    let raw = e.target.value;
    if (raw.startsWith('-') || parseFloat(raw) < 0) {
      raw = '0';
    }
    const clean = sanitizePositiveNumberString(raw, true);
    setPriceValue(clean);
  };

  const handlePaste = (e) => {
    handlePositiveNumberPaste(e, (cleaned) => {
      setPriceValue(cleaned);
    }, true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
    handlePositiveNumberKeyDown(e, {
      allowDecimal: true,
      onLeadingDot: () => setPriceValue('0.'),
      onEnter: () => {
        if (!isPriceInvalid) {
          handleConfirm();
        }
      },
      onEscape: () => {
        onClose();
      }
    });
  };

  const handleConfirm = () => {
    if (isPriceInvalid) return;
    onConfirm(numericPrice);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div style={styles.header}>
          <div>
            <h2 style={{ ...styles.productName, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IndianRupee size={20} /> Enter Unit Price
            </h2>
            <p style={styles.itemTitle}>{item.name}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={styles.inputSection}>
          <label style={styles.label}>UNIT PRICE (₹) (Press Enter to Save):</label>
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={{
                ...styles.input,
                border: isPriceInvalid ? '2px solid #F59E0B' : '2px solid #10B981'
              }}
              type="number"
              min="0"
              step="any"
              value={priceValue}
              onChange={handlePriceChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={handleSelectAllOnFocus}
              onClick={handleSelectAllOnClick}
              onMouseUp={handleSelectAllOnMouseUp}
              placeholder="0.00"
              autoFocus
            />
            <div style={styles.unitBadge}>
              ₹ / {item.unit || item.base_unit || 'pcs'}
            </div>
          </div>
          {isPriceInvalid && (
            <div style={styles.alertBox}>
              <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
              <span>Please enter a valid price greater than or equal to 0</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button style={styles.cancelBtn} type="button" onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.confirmBtn,
              ...(isPriceInvalid ? { backgroundColor: '#475569', cursor: 'not-allowed', opacity: 0.6 } : {})
            }}
            type="button"
            disabled={isPriceInvalid}
            onClick={handleConfirm}
          >
            <Check size={16} /> Save Price (Enter)
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
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  productName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '800',
    color: '#10B981',
  },
  itemTitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#94A3B8',
    fontWeight: '600',
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
    justifyContent: 'center',
  },
  inputSection: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '22px',
    fontWeight: '800',
    outline: 'none',
    boxSizing: 'border-box',
  },
  unitBadge: {
    backgroundColor: '#334155',
    color: '#E2E8F0',
    borderRadius: '10px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '700',
    fontSize: '14px',
  },
  alertBox: {
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
    fontWeight: '700',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    color: '#E2E8F0',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
};
