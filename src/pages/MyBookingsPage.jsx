import React, { useEffect, useState } from 'react';
import { getMyBookingsApi, cancelBookingApi } from '../services/bookingService';
import { Ticket, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import QRCode from 'qrcode.react';

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await getMyBookingsApi();
      if (res.success) setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this slot booking?')) return;
    try {
      const res = await cancelBookingApi(bookingId);
      if (res.success) {
        alert('Booking cancelled successfully.');
        fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'UPCOMING') return b.bookingStatus === 'CONFIRMED' && b.bookingDate >= todayStr;
    if (activeTab === 'COMPLETED') return b.bookingStatus === 'CONFIRMED' && b.bookingDate < todayStr;
    if (activeTab === 'CANCELLED') return b.bookingStatus === 'CANCELLED';
    return true;
  });

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Ticket color="#10b981" /> My Slot Bookings
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>View your active QR entry tickets and booking history</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        {['UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab ? '#022c22' : 'var(--text-muted)'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading your tickets...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={36} color="#64748b" style={{ marginBottom: '0.75rem' }} />
          <h3>No {activeTab.toLowerCase()} bookings found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Explore turfs and book your next match slot.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.75rem' }}>
          {filteredBookings.map((b) => (
            <div key={b.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Ticket ID</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{b.bookingNumber}</strong>
                </div>
                <span className={`badge ${b.bookingStatus === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}`}>
                  {b.bookingStatus}
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0', margin: '0.75rem 0' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{b.venueName}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{b.courtName}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: '#34d399' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} /> <span>Date: {b.bookingDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> <span>Time: {b.startTime.substring(0, 5)} - {b.endTime.substring(0, 5)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Amount Paid</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>₹{b.finalAmount}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {b.bookingStatus === 'CONFIRMED' && activeTab === 'UPCOMING' && (
                    <button onClick={() => handleCancel(b.id)} className="btn btn-danger btn-sm">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => setSelectedTicket(b)} className="btn btn-primary btn-sm">
                    View QR Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket QR Modal */}
      {selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Gate Entrance Ticket</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Booking: <strong>{selectedTicket.bookingNumber}</strong>
            </p>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', width: 'fit-content', margin: '0 auto 1.5rem auto' }}>
              <QRCode value={selectedTicket.qrCodeToken} size={180} />
            </div>

            <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#34d399', fontWeight: 700, marginBottom: '1.5rem' }}>
              {selectedTicket.venueName} • {selectedTicket.courtName}
            </div>

            <button onClick={() => setSelectedTicket(null)} className="btn btn-secondary" style={{ width: '100%' }}>
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
