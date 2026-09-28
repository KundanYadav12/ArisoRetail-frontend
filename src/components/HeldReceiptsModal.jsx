import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  PauseCircle, 
  Search, 
  Clock, 
  User, 
  Phone, 
  ShoppingBag, 
  Play, 
  Trash2, 
  X, 
  AlertTriangle, 
  Check, 
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function HeldReceiptsModal({
  isOpen,
  onClose,
  heldReceipts = [],
  onResume,
  onCancelReceipt,
  currentCart = [],
  isDark = true,
  loading = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [resumeConflictTarget, setResumeConflictTarget] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const cardRefs = useRef([]);

  // Reset selection index & sub-dialogs when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setDeleteConfirmTarget(null);
      setResumeConflictTarget(null);
    }
  }, [isOpen]);

  // Reset selectedIndex when search filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Filter held receipts by search query
  const filteredReceipts = useMemo(() => {
    if (!Array.isArray(heldReceipts)) return [];
    if (!searchQuery.trim()) return heldReceipts;
    const q = searchQuery.toLowerCase().trim();
    return heldReceipts.filter(r => {
      const holdNum = (r.hold_number || '').toLowerCase();
      const custName = (r.customer_name || '').toLowerCase();
      const custPhone = (r.customer_phone || '').toLowerCase();
      const notes = (r.notes || '').toLowerCase();
      const cashier = (r.cashier_name || '').toLowerCase();
      return (
        holdNum.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        notes.includes(q) ||
        cashier.includes(q)
      );
    });
  }, [heldReceipts, searchQuery]);

  const colors = {
    bgModal: isDark ? '#1E293B' : '#FFFFFF',
    bgCard: isDark ? '#0F172A' : '#F8FAFC',
    bgCardHover: isDark ? '#1E3A5F' : '#EFF6FF',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderActive: '#F97316',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    accentOrange: '#F97316',
    accentEmerald: '#10B981',
    accentSky: isDark ? '#38BDF8' : '#0284C7',
    danger: '#EF4444'
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleResumeClick = (receipt) => {
    // If current cart has items, ask cashier what to do (prevent silent overwrite)
    if (currentCart && currentCart.length > 0) {
      setResumeConflictTarget(receipt);
    } else {
      onResume(receipt, 'normal');
      onClose();
    }
  };

  const handleConfirmResumeWithHoldCurrent = () => {
    if (resumeConflictTarget) {
      onResume(resumeConflictTarget, 'hold_current');
      setResumeConflictTarget(null);
      onClose();
    }
  };

  const handleConfirmResumeDiscardCurrent = () => {
    if (resumeConflictTarget) {
      onResume(resumeConflictTarget, 'discard_current');
      setResumeConflictTarget(null);
      onClose();
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmTarget) {
      onCancelReceipt(deleteConfirmTarget.id);
      setDeleteConfirmTarget(null);
    }
  };

  // Keep selection within bounds when filtered items change
  useEffect(() => {
    if (filteredReceipts.length > 0 && selectedIndex >= filteredReceipts.length) {
      setSelectedIndex(filteredReceipts.length - 1);
    }
  }, [filteredReceipts.length, selectedIndex]);

  // Auto-scroll selected card into view
  useEffect(() => {
    if (isOpen && cardRefs.current[selectedIndex]) {
      cardRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex, isOpen]);

  // Keyboard Navigation: Esc to close, Left/Right arrows to navigate cards, Enter to resume
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // 1. Esc key closes sub-dialog or the modal
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (deleteConfirmTarget) {
          setDeleteConfirmTarget(null);
        } else if (resumeConflictTarget) {
          setResumeConflictTarget(null);
        } else {
          onClose();
        }
        return;
      }

      // If a sub-dialog is open, do not trigger card navigation / resume
      if (deleteConfirmTarget || resumeConflictTarget) return;

      // 2. Left / Right Arrow navigation (and Up / Down for grid navigation)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (filteredReceipts.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.min(filteredReceipts.length - 1, prev + 1));
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (filteredReceipts.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
        }
        return;
      }

      // 3. Enter key: Resume currently highlighted held receipt
      if (e.key === 'Enter') {
        if (filteredReceipts.length > 0 && filteredReceipts[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          handleResumeClick(filteredReceipts[selectedIndex]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, filteredReceipts, selectedIndex, deleteConfirmTarget, resumeConflictTarget, onClose, currentCart]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{ ...styles.modalContainer, backgroundColor: colors.bgModal, borderColor: colors.borderColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ ...styles.header, borderColor: colors.borderColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(249, 115, 22, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.accentOrange
            }}>
              <PauseCircle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: colors.textPrimary }}>
                  Held Receipts / Parked Sales
                </h2>
                <span style={{
                  backgroundColor: colors.accentOrange,
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {heldReceipts.length}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                Resume an incomplete sale, switch customers, or discard parked bills
              </p>
            </div>
          </div>
          <button style={{ ...styles.closeBtn, color: colors.textSecondary }} onClick={onClose} title="Close (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div style={{ ...styles.searchRow, borderColor: colors.borderColor }}>
          <div style={{ ...styles.searchBox, backgroundColor: colors.bgCard, borderColor: colors.borderColor }}>
            <Search size={16} style={{ color: colors.textSecondary }} />
            <input
              type="text"
              placeholder="Search by Hold #, Customer, Phone, or Note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...styles.searchInput, color: colors.textPrimary }}
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* LIST BODY */}
        <div style={styles.listContainer}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textSecondary }}>
              <RotateCcw size={28} className="spin" style={{ color: colors.accentOrange, marginBottom: '10px' }} />
              <p style={{ fontSize: '14px', fontWeight: '600' }}>Loading held receipts...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: colors.textSecondary }}>
              <PauseCircle size={44} strokeWidth={1.4} style={{ color: colors.textSecondary, marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: colors.textPrimary }}>
                {searchQuery ? 'No matching held receipts' : 'No Held Receipts'}
              </h3>
              <p style={{ fontSize: '13px', margin: 0, maxWidth: '340px', marginInline: 'auto' }}>
                {searchQuery 
                  ? 'Try searching with another keyword or customer phone.' 
                  : 'To hold an incomplete sale, click the "Hold Receipt" button on the POS screen while items are in the cart.'}
              </p>
            </div>
          ) : (
            <div style={styles.cardsGrid}>
              {filteredReceipts.map((r, index) => {
                const isSelected = index === selectedIndex;
                let itemsList = [];
                try {
                  const parsed = typeof r.cart_data === 'string' ? JSON.parse(r.cart_data) : r.cart_data;
                  itemsList = Array.isArray(parsed) ? parsed : [];
                } catch {
                  itemsList = [];
                }

                const totalItemsCount = r.item_count || itemsList.reduce((acc, it) => acc + (parseFloat(it.quantity) || 1), 0);

                return (
                  <div
                    key={r.id}
                    ref={(el) => (cardRefs.current[index] = el)}
                    onClick={() => setSelectedIndex(index)}
                    style={{
                      ...styles.card,
                      backgroundColor: isSelected 
                        ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5') 
                        : colors.bgCard,
                      borderColor: isSelected ? colors.accentEmerald : colors.borderColor,
                      borderWidth: isSelected ? '2px' : '1px',
                      boxShadow: isSelected 
                        ? `0 0 0 1px ${colors.accentEmerald}, 0 8px 20px -4px rgba(16, 185, 129, 0.35)` 
                        : 'none',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Top Row: Hold Number & Time */}
                    <div style={styles.cardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={styles.holdBadge}>
                          #{r.hold_number}
                        </span>
                        {isSelected && (
                          <span style={{
                            backgroundColor: colors.accentEmerald,
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase'
                          }}>
                            Selected
                          </span>
                        )}
                        {r.is_offline && (
                          <span style={styles.offlineBadge}>Offline</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: colors.textSecondary }}>
                        <Clock size={13} />
                        <span>{formatTime(r.created_at)}</span>
                        {formatDate(r.created_at) && (
                          <span style={{ fontSize: '11px', opacity: 0.8 }}>({formatDate(r.created_at)})</span>
                        )}
                      </div>
                    </div>

                    {/* Customer & Cashier Info */}
                    <div style={styles.customerRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: colors.textPrimary }}>
                        <User size={15} style={{ color: colors.accentOrange }} />
                        <span>{r.customer_name || 'Walk-in Customer'}</span>
                      </div>
                      {r.customer_phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                          <Phone size={12} />
                          <span>{r.customer_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Cart Items Preview */}
                    <div style={{ ...styles.itemsPreview, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderColor: colors.borderColor }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: colors.textSecondary, marginBottom: '4px' }}>
                        <ShoppingBag size={12} />
                        <span>{totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''}:</span>
                      </div>
                      <div style={{ fontSize: '12px', color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {itemsList.length > 0 ? (
                          itemsList.map(item => `${item.name} × ${item.quantity || 1}`).join(', ')
                        ) : (
                          <span style={{ fontStyle: 'italic', color: colors.textSecondary }}>Items preserved</span>
                        )}
                      </div>
                    </div>

                    {/* Note if any */}
                    {r.notes && (
                      <div style={{ fontSize: '11px', color: colors.textSecondary, fontStyle: 'italic', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={11} /> {r.notes}
                      </div>
                    )}

                    {/* Bottom Row: Total & Action Buttons */}
                    <div style={{ ...styles.cardFooter, borderTopColor: colors.borderColor }}>
                      <div>
                        <div style={{ fontSize: '11px', color: colors.textSecondary }}>Total Amount</div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.accentEmerald }}>
                          ₹{parseFloat(r.total_amount || 0).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={{
                            ...styles.cancelBtn,
                            color: colors.danger,
                            borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmTarget(r);
                          }}
                          title="Discard/Cancel this held receipt"
                        >
                          <Trash2 size={14} />
                        </button>
                        
                        <button
                          style={{
                            ...styles.resumeBtn,
                            ...(isSelected ? {
                              boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 4px #10B981',
                            } : {})
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumeClick(r);
                          }}
                        >
                          <Play size={14} fill="#FFFFFF" />
                          <span>Resume Sale</span>
                          {isSelected && (
                            <span style={{
                              fontSize: '10px',
                              backgroundColor: 'rgba(0, 0, 0, 0.25)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              marginLeft: '4px',
                              fontWeight: '800',
                              letterSpacing: '0.5px'
                            }}>
                              ↵ Enter
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DIALOG: RESUME CONFLICT (Current cart is not empty) */}
        {resumeConflictTarget && (
          <div style={styles.dialogOverlay}>
            <div style={{ ...styles.dialogBox, backgroundColor: colors.bgModal, borderColor: colors.borderColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.accentOrange, marginBottom: '12px' }}>
                <AlertTriangle size={24} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: colors.textPrimary }}>
                  Current sale is not completed!
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0 0 16px 0', lineHeight: 1.5 }}>
                You have active items in the cart right now. To resume <strong>#{resumeConflictTarget.hold_number}</strong> ({resumeConflictTarget.customer_name || 'Walk-in'}), choose how to handle your active sale:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  style={styles.dialogHoldAndResumeBtn}
                  onClick={handleConfirmResumeWithHoldCurrent}
                >
                  <PauseCircle size={16} />
                  <span>Hold Current Sale & Resume #{resumeConflictTarget.hold_number}</span>
                </button>

                <button
                  style={{
                    ...styles.dialogDiscardBtn,
                    color: colors.danger,
                    borderColor: colors.borderColor,
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2'
                  }}
                  onClick={handleConfirmResumeDiscardCurrent}
                >
                  <Trash2 size={15} />
                  <span>Discard Current Cart & Resume</span>
                </button>

                <button
                  style={{ ...styles.dialogCancelBtn, color: colors.textSecondary, borderColor: colors.borderColor }}
                  onClick={() => setResumeConflictTarget(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG: DELETE CONFIRMATION */}
        {deleteConfirmTarget && (
          <div style={styles.dialogOverlay}>
            <div style={{ ...styles.dialogBox, backgroundColor: colors.bgModal, borderColor: colors.borderColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.danger, marginBottom: '12px' }}>
                <Trash2 size={24} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: colors.textPrimary }}>
                  Discard Held Receipt?
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Are you sure you want to discard <strong>#{deleteConfirmTarget.hold_number}</strong> for <strong>{deleteConfirmTarget.customer_name || 'Walk-in Customer'}</strong> (₹{parseFloat(deleteConfirmTarget.total_amount || 0).toFixed(2)})? This incomplete receipt will be cancelled.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  style={{ ...styles.dialogCancelBtn, color: colors.textSecondary, borderColor: colors.borderColor }}
                  onClick={() => setDeleteConfirmTarget(null)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.dialogDiscardBtn,
                    backgroundColor: colors.danger,
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px'
                  }}
                  onClick={handleConfirmDelete}
                >
                  Yes, Discard Receipt
                </button>
              </div>
            </div>
          </div>
        )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  },
  modalContainer: {
    width: '100%',
    maxWidth: '720px',
    maxHeight: '88vh',
    borderRadius: '16px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchRow: {
    padding: '12px 20px',
    borderBottom: '1px solid'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid'
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
    gap: '14px'
  },
  card: {
    borderRadius: '12px',
    border: '1px solid',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'transform 0.15s ease, border-color 0.15s ease'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  holdBadge: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '13px',
    padding: '3px 9px',
    borderRadius: '6px',
    letterSpacing: '0.3px'
  },
  offlineBadge: {
    backgroundColor: '#475569',
    color: '#E2E8F0',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  customerRow: {
    marginTop: '2px'
  },
  itemsPreview: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid'
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '10px',
    borderTop: '1px solid',
    marginTop: 'auto'
  },
  cancelBtn: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '7px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resumeBtn: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 14px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 10000
  },
  dialogBox: {
    width: '100%',
    maxWidth: '440px',
    padding: '22px',
    borderRadius: '14px',
    border: '1px solid',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
  },
  dialogHoldAndResumeBtn: {
    backgroundColor: '#F97316',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 14px',
    fontWeight: '700',
    fontSize: '13.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  dialogDiscardBtn: {
    borderRadius: '10px',
    border: '1px solid',
    padding: '10px 14px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  dialogCancelBtn: {
    background: 'none',
    border: '1px solid',
    borderRadius: '10px',
    padding: '9px 14px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
