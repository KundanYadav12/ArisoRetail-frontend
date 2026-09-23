import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVenueDetailsApi } from '../services/venueService';
import { getCourtSlotsApi } from '../services/bookingService';
import { MapPin, Star, Calendar, Clock, ShieldCheck, CheckCircle, Info, ChevronRight, Award } from 'lucide-react';
import { getISTDateString } from '../utils/dateUtils';

const VenueDetailPage = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => getISTDateString());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    fetchVenueDetails();
  }, [idOrSlug]);

  useEffect(() => {
    if (selectedCourt) {
      fetchCourtSlots(selectedCourt.id, selectedDate);
    }
  }, [selectedCourt, selectedDate]);

  const fetchVenueDetails = async () => {
    try {
      setLoading(true);
      const res = await getVenueDetailsApi(idOrSlug);
      if (res.success) {
        setVenue(res.data);
        if (res.data.courts && res.data.courts.length > 0) {
          setSelectedCourt(res.data.courts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load venue details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourtSlots = async (courtId, date) => {
    try {
      setSlotsLoading(true);
      const res = await getCourtSlotsApi(courtId, date);
      if (res.success) setSlots(res.data);
    } catch (err) {
      console.error('Failed to fetch court slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Generate next 5 dates for date picker
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = getISTDateString(d);
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
      dates.push({ isoDate, label });
    }
    return dates;
  };

  if (loading || !venue) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading sports venue details...</div>;
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Venue Header Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span className="badge badge-success">
                <Star size={12} fill="#34d399" /> {venue.rating} ({venue.reviewCount} Reviews)
              </span>
              <span className="badge badge-info">Verified Turf Partner</span>
            </div>

            <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>{venue.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              <MapPin size={16} color="#10b981" />
              <span>{venue.address}</span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {venue.description}
            </p>

            {/* Amenities Badges */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {venue.amenities?.map((am) => (
                <div key={am.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: '#fff' }}>
                  <CheckCircle size={14} color="#34d399" />
                  <span>{am.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Venue Image */}
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '260px' }}>
            <img src={venue.images[0]} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      {/* Main Booking & Court Slot Grid Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
        <main>
          {/* 1. Court Selector Tabs */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Step 1: Select Court / Turf</h3>
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {venue.courts?.map((court) => (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourt(court)}
                  className="btn"
                  style={{
                    background: selectedCourt?.id === court.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                    color: selectedCourt?.id === court.id ? '#022c22' : '#ffffff',
                    border: selectedCourt?.id === court.id ? 'none' : '1px solid var(--border-color)',
                    padding: '0.75rem 1.25rem',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{court.name}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>₹{court.basePrice}/hr • {court.surfaceType}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Date Picker */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Step 2: Choose Playing Date</h3>
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
              {generateDates().map((d) => (
                <button
                  key={d.isoDate}
                  onClick={() => setSelectedDate(d.isoDate)}
                  className="btn"
                  style={{
                    background: selectedDate === d.isoDate ? 'var(--accent-primary-glow)' : 'rgba(255,255,255,0.03)',
                    border: selectedDate === d.isoDate ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    color: selectedDate === d.isoDate ? '#34d399' : 'var(--text-muted)',
                    padding: '0.6rem 1rem',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Interactive Slot Time Grid */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Step 3: Select Time Slot</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#34d399' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--slot-available-bg)', border: '1px solid var(--slot-available-border)', borderRadius: '2px' }}></span> Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fb7185' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--slot-booked-bg)', border: '1px solid var(--slot-booked-border)', borderRadius: '2px' }}></span> Booked
                </span>
              </div>
            </div>

            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating slot availability...</div>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No available slots for this court on the selected date.</div>
            ) : (
              <div className="slot-grid">
                {slots.map((slot, index) => {
                  const isAvailable = slot.status === 'AVAILABLE';
                  const isSelected = selectedSlot?.startTime === slot.startTime;

                  return (
                    <button
                      key={index}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`slot-btn ${isSelected ? 'selected' : isAvailable ? 'available' : 'booked'}`}
                    >
                      <div>{slot.startTime.substring(0, 5)}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.8 }}>₹{slot.price}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Sidebar Summary Widget */}
        <aside>
          <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '100px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Booking Summary
            </h3>

            {selectedCourt && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Court</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{selectedCourt.name}</p>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Date</span>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#34d399' }}>{selectedDate}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Selected Time Slot</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedSlot ? '#34d399' : 'var(--text-muted)' }}>
                {selectedSlot ? `${selectedSlot.startTime.substring(0, 5)} - ${selectedSlot.endTime.substring(0, 5)}` : 'Select a slot above'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: '#34d399' }}>₹{selectedSlot ? selectedSlot.price : selectedCourt?.basePrice || 0}</span>
              </div>
            </div>

            <button
              disabled={!selectedSlot}
              onClick={() => setIsCheckoutOpen(true)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Proceed to Checkout <ChevronRight size={18} />
            </button>
          </div>
        </aside>
      </div>

      {/* Checkout Drawer Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        court={selectedCourt}
        date={selectedDate}
        slot={selectedSlot}
        venue={venue}
        onSuccess={() => {
          fetchCourtSlots(selectedCourt.id, selectedDate);
        }}
      />
    </div>
  );
};

export default VenueDetailPage;
