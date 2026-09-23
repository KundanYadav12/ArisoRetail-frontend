import React, { useEffect, useState } from 'react';
import { getAdminDashboardApi, getUsersApi, updateUserStatusApi, getVenuesAdminApi, updateVenueStatusApi } from '../services/adminService';
import { Shield, Users, Building, DollarSign, Award, CheckCircle, XCircle } from 'lucide-react';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const dashRes = await getAdminDashboardApi();
      if (dashRes.success) setStats(dashRes.data);

      const usersRes = await getUsersApi();
      if (usersRes.success) setUsers(usersRes.data);

      const venuesRes = await getVenuesAdminApi();
      if (venuesRes.success) setVenues(venuesRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await updateUserStatusApi(userId, newStatus);
      if (res.success) fetchAdminData();
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  const handleToggleVenueStatus = async (venueId, currentStatus) => {
    const newStatus = currentStatus === 'APPROVED' ? 'REJECTED' : 'APPROVED';
    try {
      const res = await updateVenueStatusApi(venueId, newStatus);
      if (res.success) fetchAdminData();
    } catch (err) {
      alert('Failed to update venue status.');
    }
  };

  if (loading || !stats) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Super Admin Portal...</div>;
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield color="#10b981" /> Super Admin Management Portal
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Platform-wide monitoring, commission revenue tracking, user & venue approvals</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Platform Volume</span>
          <h2 style={{ fontSize: '2rem', color: '#fff', marginTop: '0.35rem' }}>₹{stats.totalVolume}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Platform Commission (10%)</span>
          <h2 style={{ fontSize: '2rem', color: '#34d399', marginTop: '0.35rem' }}>₹{stats.totalCommission}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Users</span>
          <h2 style={{ fontSize: '2rem', color: '#fff', marginTop: '0.35rem' }}>{stats.totalUsers}</h2>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Listed Venues</span>
          <h2 style={{ fontSize: '2rem', color: '#fff', marginTop: '0.35rem' }}>{stats.totalVenues}</h2>
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        {['OVERVIEW', 'USERS', 'VENUES'].map((tab) => (
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

      {/* Tab Contents */}
      {activeTab === 'OVERVIEW' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Platform Recent Bookings</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Booking Number</th>
                  <th style={{ padding: '0.75rem' }}>User</th>
                  <th style={{ padding: '0.75rem' }}>Venue</th>
                  <th style={{ padding: '0.75rem' }}>Court</th>
                  <th style={{ padding: '0.75rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem' }}>Commission</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#fff' }}>{b.bookingNumber}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{b.userName}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{b.venueName}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{b.courtName}</td>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700 }}>₹{b.finalAmount}</td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#34d399', fontWeight: 700 }}>₹{b.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>User Management</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Full Name</th>
                  <th style={{ padding: '0.75rem' }}>Email</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#fff' }}>{u.fullName}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{u.email}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className="badge badge-info">{u.role}</span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                        className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'VENUES' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Venue Approvals & Listings</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Venue Name</th>
                  <th style={{ padding: '0.75rem' }}>City</th>
                  <th style={{ padding: '0.75rem' }}>Owner Name</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#fff' }}>{v.name}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{v.city}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>{v.ownerName} ({v.ownerEmail})</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span className={`badge ${v.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <button
                        onClick={() => handleToggleVenueStatus(v.id, v.status)}
                        className={`btn btn-sm ${v.status === 'APPROVED' ? 'btn-danger' : 'btn-primary'}`}
                      >
                        {v.status === 'APPROVED' ? 'Reject / Revoke' : 'Approve Venue'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
