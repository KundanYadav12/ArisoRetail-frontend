import React, { useState } from 'react';
import { createOfflineBookingApi } from '../../services/ownerService';
import { X, UserPlus, Calendar, Clock } from 'lucide-react';
import { getISTDateString } from '../../utils/dateUtils';

const WalkinModal = ({ isOpen, onClose, venueId, courts, onSuccess }) => {
  const [selectedCourtId, setSelectedCourtId] = useState(courts && courts.length > 0 ? courts[0].id : '');
  const [bookingDate, setBookingDate] = useState(() => getISTDateString());
  const [startTime, setStartTime] = useState('18:00:00');
  const [endTime, setEndTime] = useState('19:00:00');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await createOfflineBookingApi({
        venueId: venueId,
        courtId: parseInt(selectedCourtId || courts[0]?.id),
        sportId: 1,
        bookingDate,
        startTime,
        endTime,
        customerName,
        customerPhone,
        notes
      });

      if (res.success) {
        alert('Offline walk-in booking created and slot blocked online!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create offline booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: 'var(--text-muted)' }}>
          <X size={22} />
        </button>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus color="#10b981" /> Record Offline / Walk-in Booking
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Creates offline record and instantly locks online availability to prevent double bookings.
        </p>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Target Court</label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="form-input"
            >
              {courts?.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#0f172a' }}>
                  {c.name} (₹{c.basePrice}/hr)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Date</label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Time</label>
              <input
                type="text"
                required
                placeholder="18:00:00"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>End Time</label>
              <input
                type="text"
                required
                placeholder="19:00:00"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Customer Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Verma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
            {loading ? 'Locking Slot...' : 'Save & Block Slot'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WalkinModal;
