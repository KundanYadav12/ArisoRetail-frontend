import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOwnerDashboardApi } from '../services/ownerService';
import WalkinModal from '../components/owner/WalkinModal';
import { LayoutDashboard, Calendar, DollarSign, Users, PlusCircle, CheckCircle, Clock } from 'lucide-react';

const OwnerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getOwnerDashboardApi();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Failed to load owner dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Owner Console...</div>;
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LayoutDashboard color="#10b981" /> Venue Owner Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage turfs, court schedules, revenue, and offline walk-ins</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/owner/calendar" className="btn btn-secondary btn-sm">
            <Calendar size={16} /> Interactive Slot Calendar
          </Link>
          <button onClick={() => setIsWalkinOpen(true)} className="btn btn-primary btn-sm">
            <PlusCircle size={16} /> + Offline Walk-in Booking
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Today's Bookings</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#34d399" />
            </div>
          </div>
          <h2 style={{ fontSize: '2.2rem', color: '#fff' }}>{stats.todayBookingsCount}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Today's Revenue</span>
            <div style={{ background: 'rgba(6, 182, 212, 0.2)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color="#38bdf8" />
            </div>
          </div>
          <h2 style={{ fontSize: '2.2rem', color: '#34d399' }}>₹{stats.todayRevenue}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Managed Venues</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.2)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#a78bfa" />
            </div>
          </div>
          <h2 style={{ fontSize: '2.2rem', color: '#fff' }}>{stats.totalVenues}</h2>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Recent Venue Bookings</h3>

        {stats.recentBookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent bookings recorded.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Booking ID</th>
                  <th style={{ padding: '0.75rem' }}>Customer / User</th>
                  <th style={{ padding: '0.75rem' }}>Court Name</th>
                  <th style={{ padding: '0.75rem' }}>Date & Slot</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#fff' }}>{b.bookingNumber}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{b.userName}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{b.courtName}</td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#34d399' }}>{b.bookingDate} ({b.startTime.substring(0,5)})</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className={`badge ${b.bookingType === 'ONLINE' ? 'badge-info' : 'badge-warning'}`}>
                        {b.bookingType}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700 }}>₹{b.finalAmount}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className={`badge ${b.bookingStatus === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}`}>
                        {b.bookingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WalkinModal
        isOpen={isWalkinOpen}
        onClose={() => setIsWalkinOpen(false)}
        venueId={1}
        courts={[{ id: 1, name: 'Cricket Turf 1', basePrice: 1400 }]}
        onSuccess={fetchStats}
      />
    </div>
  );
};

export default OwnerDashboardPage;
