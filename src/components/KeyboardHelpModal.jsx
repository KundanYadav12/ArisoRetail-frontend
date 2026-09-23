import React from 'react';
import { Keyboard, X } from 'lucide-react';

export default function KeyboardHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutList = [
    { key: 'F2 / Ctrl+F', label: 'Focus Product Search' },
    { key: 'F3', label: 'Focus Shopping Cart' },
    { key: 'F4', label: 'Customer Search & Selection' },
    { key: 'F5', label: 'Manual Weight Input Modal' },
    { key: 'F6', label: 'Read Weight from Bluetooth Scale' },
    { key: 'F7', label: 'Apply Discount' },
    { key: 'F8', label: 'Open Checkout / Payment Screen' },
    { key: 'F9', label: 'Select Cash Payment' },
    { key: 'F10', label: 'Select UPI / QR Payment' },
    { key: 'F11', label: 'Select Card Payment' },
    { key: 'F12', label: 'Complete Sale & Print Receipt' },
    { key: 'Esc', label: 'Close Active Modal / Cancel' },
    { key: 'Delete', label: 'Remove Selected Cart Item' },
    { key: '+ / -', label: 'Increase / Decrease Quantity' },
    { key: 'Arrow Up/Down', label: 'Navigate Products / Cart' },
    { key: 'Enter', label: 'Confirm / Add Product' },
    { key: '? / Ctrl+/', label: 'Toggle Keyboard Shortcuts Guide' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ ...styles.title, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={20} /> POS Keyboard Shortcuts Guide
          </h2>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <p style={styles.subTitle}>Operate Ariso Retail POS fast without touching the mouse!</p>

        <div style={styles.grid}>
          {shortcutList.map((item, idx) => (
            <div key={idx} style={styles.card}>
              <span style={styles.badge}>{item.key}</span>
              <span style={styles.label}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <button style={styles.confirmBtn} onClick={onClose}>Got It (Esc)</button>
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
    maxWidth: '680px',
    padding: '24px',
    border: '1px solid #334155',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    color: '#F8FAFC',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '800',
    margin: 0,
    color: '#F8FAFC',
  },
  subTitle: {
    fontSize: '13px',
    color: '#94A3B8',
    marginBottom: '20px',
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
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto',
    marginBottom: '20px',
    paddingRight: '6px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #334155',
  },
  badge: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
    marginRight: '12px',
    minWidth: '70px',
    textAlign: 'center',
  },
  label: {
    fontSize: '13px',
    color: '#CBD5E1',
    fontWeight: '600',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  confirmBtn: {
    backgroundColor: '#38BDF8',
    color: '#0F172A',
    fontWeight: '800',
    fontSize: '14px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
};
