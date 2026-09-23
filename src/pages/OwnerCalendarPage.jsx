import React, { useEffect, useState } from 'react';
import { getOwnerCalendarApi, toggleBlockSlotApi } from '../services/ownerService';
import WalkinModal from '../components/owner/WalkinModal';
import { Calendar as CalendarIcon, Shield, Lock, Unlock, PlusCircle, RefreshCw } from 'lucide-react';

const OwnerCalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [activeVenue, setActiveVenue] = useState(null);

  useEffect(() => {
    fetchCalendar();
  }, [selectedDate]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const res = await getOwnerCalendarApi(selectedDate);
      if (res.success) {
        setCalendarData(res.data);
        if (res.data.length > 0) setActiveVenue(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load owner calendar grid:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (courtId, slot) => {
    const isCurrentlyBlocked = slot.status === 'BLOCKED';
    const action = isCurrentlyBlocked ? 'unblock' : 'block';

    if (!window.confirm(`Are you sure you want to ${action} slot ${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)}?`)) return;

    try {
      const res = await toggleBlockSlotApi(courtId, {
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBlocked: !isCurrentlyBlocked
      });

      if (res.success) {
        fetchCalendar();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update slot status.');
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarIcon color="#10b981" /> Multi-Court Booking Calendar
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Visual slot status matrix for your venue courts</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
            style={{ width: 'auto' }}
          />

          <button onClick={() => setIsWalkinOpen(true)} className="btn btn-primary btn-sm">
            <PlusCircle size={16} /> + Offline Walk-in
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading visual calendar grid...</div>
      ) : calendarData.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>No Venues Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Register a venue to manage court slot schedules.</p>
        </div>
      ) : (
        <div>
          {calendarData.map((venueData) => (
            <div key={venueData.venueId} className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>{venueData.venueName}</h2>

              {venueData.courts?.map((court) => (
                <div key={court.courtId} style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#34d399' }}>{court.courtName}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Base Price: ₹{court.basePrice}/hr</span>
                  </div>

                  <div className="slot-grid">
                    {court.slots?.map((slot, sIdx) => {
                      const isAvailable = slot.status === 'AVAILABLE';
                      const isBooked = slot.status === 'BOOKED' || slot.status === 'OFFLINE_BOOKED';
                      const isBlocked = slot.status === 'BLOCKED';

                      return (
                        <div
                          key={sIdx}
                          onClick={() => {
                            if (!isBooked) handleToggleBlock(court.courtId, slot);
                          }}
                          className={`slot-btn ${isAvailable ? 'available' : isBooked ? 'booked' : 'blocked'}`}
                          style={{ cursor: isBooked ? 'not-allowed' : 'pointer' }}
                          title={isBooked ? 'Booked Slot' : isBlocked ? 'Blocked Slot (Click to Unblock)' : 'Available (Click to Block)'}
                        >
                          <div>{slot.startTime.substring(0, 5)}</div>
                          <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                            {slot.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeVenue && (
        <WalkinModal
          isOpen={isWalkinOpen}
          onClose={() => setIsWalkinOpen(false)}
          venueId={activeVenue.venueId}
          courts={activeVenue.courts?.map(c => ({ id: c.courtId, name: c.courtName, basePrice: c.basePrice }))}
          onSuccess={fetchCalendar}
        />
      )}
    </div>
  );
};

export default OwnerCalendarPage;
