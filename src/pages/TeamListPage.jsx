import React, { useState, useEffect } from 'react';
import { teamService } from '../services/teamService';
import { Users, Plus, Shield, Mail, Trash2 } from 'lucide-react';

export default function TeamListPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await teamService.getMyTeams();
      if (res.data.success) {
        setTeams(res.data.teams || []);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName) return;
    try {
      setSubmitting(true);
      await teamService.createTeam({ name: newTeamName, description: newTeamDesc });
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateModal(false);
      await fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="teams-page-wrapper">
      {/* Centered Container with max-width */}
      <div className="teams-container">
        
        {/* Page Header & Top Toolbar Row */}
        <div className="teams-header-row">
          <div className="teams-header-title-group">
            <span className="teams-breadcrumb">
              TEAM MANAGEMENT & ROSTER
            </span>
            <h1 className="teams-title">
              <Users className="teams-title-icon" />
              <span>My Teams</span>
            </h1>
          </div>

          <div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-create-team"
            >
              <Plus />
              <span>CREATE NEW TEAM</span>
            </button>
          </div>
        </div>

        {/* Page Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid var(--accent-primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : teams.length === 0 ? (
          /* Empty State Block Wrapped in Panel Card */
          <div className="teams-empty-card">
            <div className="teams-empty-icon-wrap">
              <Users style={{ width: '2rem', height: '2rem' }} />
            </div>

            <div>
              <h3 className="teams-empty-title">No Teams Created Yet</h3>
              <p className="teams-empty-desc">
                Create a team to enter corporate cricket tournaments and manage your playing roster!
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-create-team"
            >
              <Plus />
              <span>CREATE FIRST TEAM</span>
            </button>
          </div>
        ) : (
          /* Team Cards Grid */
          <div className="teams-grid">
            {teams.map((t) => (
              <div key={t.id} className="team-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <img
                      src={t.logo_url || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=150&q=80'}
                      alt={t.name}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--border-color)'
                      }}
                    />
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t.name}</h3>
                      <span className="badge badge-info" style={{ marginTop: '0.2rem' }}>Role: {t.user_role}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {t.description || 'No description provided.'}
                  </p>
                </div>

                <div style={{
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-dim)',
                  fontWeight: 600
                }}>
                  <span>{t.member_count || 1} Members</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Captain: {t.captain_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            padding: '1rem'
          }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-heading)' }}>
                Create New Team
              </h3>

              <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">TEAM NAME</label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Kundan Warriors"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">DESCRIPTION</label>
                  <textarea
                    rows="3"
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    placeholder="Corporate squad details..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyRight: 'flex-end', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-sm"
                  >
                    SAVE TEAM
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
