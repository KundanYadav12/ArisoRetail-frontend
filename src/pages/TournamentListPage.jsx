import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { Trophy, Activity, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 9,
        status: status !== 'ALL' ? status : undefined,
        search: search.trim() || undefined
      };
      const res = await tournamentService.getAllTournaments(params);
      if (res.data.success) {
        setTournaments(res.data.items || res.data.tournaments || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [page, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTournaments();
  };

  return (
    <div className="tournaments-page-wrapper">
      <div className="tournaments-container">
        
        {/* Page Header */}
        <div className="tournaments-header-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span className="tournaments-breadcrumb">
              CHAMPIONSHIPS & LEAGUES
            </span>
            <h1 className="tournaments-title">
              <Trophy className="tournaments-title-icon" />
              <span>Tournaments Hub</span>
            </h1>
          </div>

          {/* Search & Status Filters */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search tournaments, venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 1rem 0.55rem 2.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-heading)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              />
            </div>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-heading)',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="LIVE">Live Now</option>
              <option value="PUBLISHED">Upcoming</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </form>
        </div>

        {/* Page Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid var(--accent-amber)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>No tournaments found matching your criteria.</p>
          </div>
        ) : (
          <>
            {/* Responsive Tournament Cards Grid */}
            <div className="tournaments-grid">
              {tournaments.map((t) => (
                <div key={t.id} className="tournament-card">
                  <div>
                    <div className="tournament-card-image-wrap">
                      <img
                        src={t.banner_url || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80'}
                        alt={t.name}
                        className="tournament-card-image"
                      />
                      <div className="tournament-card-overlay"></div>
                    </div>

                    <div className="tournament-card-body">
                      <div className="tournament-card-badge-row">
                        <span className="badge badge-info">
                          {t.sport_name || 'Cricket'}
                        </span>
                        <span className={`badge ${t.status === 'LIVE' ? 'badge-rose animate-pulse' : 'badge-success'}`}>
                          {t.status}
                        </span>
                      </div>

                      <h3 className="tournament-card-title">{t.name}</h3>
                      <p className="tournament-card-desc">{t.description}</p>
                    </div>
                  </div>

                  <div className="tournament-card-actions">
                    <Link
                      to={`/tournaments/${t.uuid || t.id}`}
                      className="btn-view-hub"
                    >
                      <Eye style={{ width: '16px', height: '16px' }} />
                      <span>VIEW HUB</span>
                    </Link>

                    <Link
                      to={`/tournaments/${t.uuid || t.id}/live`}
                      className="btn-watch-live"
                    >
                      <Activity style={{ width: '16px', height: '16px' }} />
                      <span>WATCH LIVE</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-action-glass"
                  style={{ opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} />
                  <span>PREVIOUS</span>
                </button>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  PAGE {pagination.page} OF {pagination.totalPages} ({pagination.total} TOTAL)
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="btn-action-glass"
                  style={{ opacity: page >= pagination.totalPages ? 0.5 : 1, cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <span>NEXT</span>
                  <ChevronRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
