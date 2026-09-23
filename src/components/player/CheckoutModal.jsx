import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { createBookingApi, applyCouponApi } from '../../services/bookingService';
import { X, CheckCircle2, Ticket, CreditCard, ShieldCheck, Zap } from 'lucide-react';
import QRCode from 'qrcode.react';

const CheckoutModal = ({ isOpen, onClose, court, date, slot, venue, onSuccess }) => {
  const { user } = useSelector((state) => state.auth);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  if (!isOpen || !slot || !court) return null;

  const basePrice = slot.price || court.basePrice;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalAmount = Math.max(0, basePrice - discountAmount);

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;
    try {
      const res = await applyCouponApi({
        code: couponCode,
        bookingAmount: basePrice,
        venueId: venue.id
      });
      if (res.success) {
        setAppliedCoupon(res.data);
      } else {
        setCouponError(res.message);
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Failed to apply coupon.');
    }
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      alert('Please login to complete your booking.');
      return;
    }

    try {
      setLoading(true);
      const res = await createBookingApi({
        venueId: venue.id,
        courtId: court.id,
        sportId: court.sportId || 1,
        bookingDate: date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        notes: `Online Booking via ${paymentMethod}`
      });

      if (res.success) {
        setBookingSuccessData(res.data);
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed. Slot may have been taken by another player.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: 'var(--text-muted)' }}
        >
          <X size={22} />
        </button>

        {bookingSuccessData ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle2 size={36} color="#34d399" />
            </div>

            <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginBottom: '0.35rem' }}>Slot Confirmed!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Booking ID: <strong style={{ color: '#fff' }}>{bookingSuccessData.bookingNumber}</strong>
            </p>

            <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ margin: '0 auto 1rem auto', padding: '1rem', background: '#fff', width: 'fit-content', borderRadius: '12px' }}>
                <QRCode value={bookingSuccessData.qrCodeToken} size={140} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Show this QR code ticket at the venue gate for entrance.</p>
            </div>

            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
              Done / View My Bookings
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket color="#10b981" /> Confirm Slot Booking
            </h2>

            {/* Summary Card */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
              <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>{venue.name}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{court.name} ({court.surfaceType})</p>
              
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>
                <span>📅 {date}</span>
                <span>⏰ {slot.startTime.substring(0,5)} - {slot.endTime.substring(0,5)}</span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Apply Offer / Coupon Code</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="e.g. WELCOME20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="form-input"
                  style={{ textTransform: 'uppercase' }}
                />
                <button onClick={handleApplyCoupon} className="btn btn-outline btn-sm" type="button">
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <span style={{ color: '#34d399', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                  ✓ Code '{appliedCoupon.code}' applied (-₹{appliedCoupon.discountAmount})
                </span>
              )}
              {couponError && (
                <span style={{ color: '#fb7185', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                  {couponError}
                </span>
              )}
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Select Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {['UPI', 'CARD'].map((method) => (
                  <div
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: paymentMethod === method ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: paymentMethod === method ? 'var(--accent-primary-glow)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <CreditCard size={16} color="#10b981" />
                    <span>{method === 'UPI' ? 'Instant UPI / QR' : 'Debit / Credit Card'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <span>Slot Subtotal</span>
                <span>₹{basePrice}</span>
              </div>
              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#34d399', marginBottom: '0.35rem' }}>
                  <span>Coupon Discount</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem' }}>
                <span>Total Amount</span>
                <span style={{ color: '#34d399' }}>₹{finalAmount}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem' }}
            >
              {loading ? 'Securing Slot Lock...' : `Pay ₹${finalAmount} & Lock Slot`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
