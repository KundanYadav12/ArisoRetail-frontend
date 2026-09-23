import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { teamService } from '../services/teamService';
import { getSocket } from '../services/socketClient';
import { Trophy, Calendar, MapPin, Activity, Tv, Plus, Zap, CheckSquare, Square, Trash2, Clock, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TournamentHubPage() {
  const { id: tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, teams, matches, standings
  const [matchStatusFilter, setMatchStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAutoFixtureModal, setShowAutoFixtureModal] = useState(false);

  // Manual Schedule Form State
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [courtId, setCourtId] = useState('');

  // Auto Fixture Form State
  const [fixtureMode, setFixtureMode] = useState('LEAGUE');

  const fetchTournamentData = async () => {
    try {
      const res = await tournamentService.getTournamentById(tournamentId);
      if (res.data.success) {
        setTournament(res.data.tournament);
      }

      // Fetch logged in owner's teams for selection
      try {
        const teamRes = await teamService.getMyTeams();
        if (teamRes.data.success) {
          setMyTeams(teamRes.data.teams || []);
        }
      } catch (e) {
        // Not logged in or no teams
      }
    } catch (err) {
      console.error('Failed to load tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  useEffect(() => {
    const socket = getSocket();
    if (tournamentId) {
      socket.emit('join_tournament', tournamentId);
      socket.emit('joinRoom', `tournament:${tournamentId}`);
    }

    const handleTournamentUpdate = () => {
      fetchTournamentData();
    };

    socket.on('tournament:updated', handleTournamentUpdate);
    socket.on('match_score_updated', handleTournamentUpdate);

    return () => {
      socket.off('tournament:updated', handleTournamentUpdate);
      socket.off('match_score_updated', handleTournamentUpdate);
    };
  }, [tournamentId]);

  const toggleTeamSelection = (teamId) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const handleAddSelectedTeams = async () => {
    if (selectedTeamIds.length === 0) {
      toast.error('Please select at least one team to add');
      return;
    }
    try {
      setSubmitting(true);
      for (const teamId of selectedTeamIds) {
        await tournamentService.registerTeam(tournamentId, teamId);
      }
      toast.success('Teams added to tournament successfully!');
      setSelectedTeamIds([]);
      await fetchTournamentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add teams');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to remove this team from the tournament?')) return;
    try {
      await tournamentService.removeTeam(tournamentId, teamId);
      toast.success('Team removed from tournament');
      await fetchTournamentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove team');
    }
  };

  const handleCreateManualMatch = async (e) => {
    e.preventDefault();
    if (!teamAId || !teamBId || !matchDate || !startTime) {
      toast.error('Please fill in Team 1, Team 2, Date, and Start Time');
      return;
    }
    if (teamAId === teamBId) {
      toast.error('Invalid Matchup: A team cannot play against itself!');
      return;
    }

    try {
      setSubmitting(true);
      await tournamentService.scheduleMatch(tournamentId, {
        team_a_id: teamAId,
        team_b_id: teamBId,
        match_date: matchDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
        court_id: courtId || null,
        venue_id: tournament.venue_id || null
      });
      toast.success('Match scheduled successfully!');
      setShowScheduleModal(false);
      setTeamAId('');
      setTeamBId('');
      await fetchTournamentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Schedule conflict error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateFixtures = async () => {
    try {
      setSubmitting(true);
      const res = await tournamentService.generateFixtures(tournamentId, {
        mode: fixtureMode,
        startDate: tournament.start_date
      });
      toast.success(res.data?.message || 'Fixtures generated successfully!');
      setShowAutoFixtureModal(false);
      await fetchTournamentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fixture generation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--accent-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ minHeight: '70vh', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-heading)' }}>Tournament Not Found</p>
      </div>
    );
  }

  const registeredTeams = tournament.teams || [];
  const matches = tournament.matches || [];
  const filteredMatches = matches.filter(m => matchStatusFilter === 'ALL' || m.status === matchStatusFilter);
  const pointsTable = tournament.pointsTable || [];

  return (
    <div className="tourney-hub-container font-sans">
      {/* Hero Banner Header */}
      <div className="tourney-hero-banner">
        <img
          src={tournament.banner_url || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80'}
          alt={tournament.name}
          className="tourney-hero-image"
        />
        <div className="tourney-hero-overlay">
          <div className="tourney-hero-content">
            <div>
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}>
                {tournament.sport_name || 'Cricket'} • {tournament.format}
              </span>
              <h1 className="tourney-hero-title">{tournament.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                <span>📍 {tournament.venue_name || 'Apex Arena'}</span>
                <span>📅 {tournament.start_date} to {tournament.end_date}</span>
                <span>🛡️ {registeredTeams.length} Registered Teams</span>
              </div>
            </div>

            <Link to={`/tournaments/${tournament.uuid || tournament.id}/live`} className="btn-watch-live">
              <Tv style={{ width: '18px', height: '18px' }} />
              <span>WATCH MULTI-MATCH SIGNAGE</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="tourney-tabs-bar">
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'teams', label: `Teams (${registeredTeams.length})` },
            { id: 'matches', label: `Fixtures (${matches.length})` },
            { id: 'standings', label: 'Points Table' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tourney-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div style={{ marginTop: '1.5rem' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-heading)' }}>
                Tournament Information
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                {tournament.description || 'Official sports tournament hosted on TurfSpot platform.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                <div><strong style={{ color: 'var(--text-muted)' }}>Format:</strong> {tournament.format}</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Entry Fee:</strong> ₹{tournament.entry_fee || '0'}</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Max Teams:</strong> {tournament.max_teams || 16}</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Registration Deadline:</strong> {tournament.registration_deadline}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-heading)' }}>
                Organizer & Rules
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <p><strong>Organizer:</strong> {tournament.organizer_name || 'Turf Owner'}</p>
                <p style={{ marginTop: '0.75rem' }}><strong>Rules:</strong> {tournament.rules || 'Standard tournament rules apply.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TEAMS TAB (Select & Add Owner Teams) ── */}
        {activeTab === 'teams' && (
          <div>
            {/* Owner Team Selector Section */}
            {myTeams.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
                  Add My Teams to Tournament
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Select from your authorized teams below to add them directly to this tournament.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {myTeams.map(team => {
                    const isAlreadyAdded = registeredTeams.some(rt => rt.team_id === team.id);
                    const isSelected = selectedTeamIds.includes(team.id);

                    return (
                      <div
                        key={team.id}
                        onClick={() => !isAlreadyAdded && toggleTeamSelection(team.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          background: isAlreadyAdded ? 'rgba(255,255,255,0.03)' : (isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)'),
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                          opacity: isAlreadyAdded ? 0.5 : 1
                        }}
                      >
                        {isAlreadyAdded ? (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>ADDED</span>
                        ) : isSelected ? (
                          <CheckSquare style={{ width: '18px', height: '18px', color: 'var(--accent-primary)' }} />
                        ) : (
                          <Square style={{ width: '18px', height: '18px', color: 'var(--text-dim)' }} />
                        )}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)' }}>{team.name}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleAddSelectedTeams}
                  disabled={submitting || selectedTeamIds.length === 0}
                  className="btn btn-primary btn-sm"
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  <span>ADD SELECTED TEAMS ({selectedTeamIds.length})</span>
                </button>
              </div>
            )}

            {/* Registered Teams Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {registeredTeams.map(t => (
                <div key={t.id} className="team-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <img
                      src={t.logo_url || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=150&q=80'}
                      alt={t.name}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-heading)' }}>{t.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Captain: {t.captain_name || 'Captain'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveTeam(t.team_id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px' }}
                    title="Remove team"
                  >
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FIXTURES / MATCHES TAB ── */}
        {activeTab === 'matches' && (
          <div>
            {/* Toolbar: Schedule Match & Auto Generate Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                {['ALL', 'SCHEDULED', 'LIVE', 'COMPLETED'].map(status => (
                  <button
                    key={status}
                    onClick={() => setMatchStatusFilter(status)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      background: matchStatusFilter === status ? 'var(--accent-amber)' : 'transparent',
                      color: matchStatusFilter === status ? '#000000' : 'var(--text-muted)'
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button onClick={() => setShowAutoFixtureModal(true)} className="btn btn-secondary btn-sm">
                  <Zap style={{ width: '15px', height: '15px', color: 'var(--accent-amber)' }} />
                  <span>AUTO FIXTURES</span>
                </button>
                <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary btn-sm">
                  <Plus style={{ width: '15px', height: '15px' }} />
                  <span>CREATE MATCH</span>
                </button>
              </div>
            </div>

            {/* Match Cards List */}
            {filteredMatches.length === 0 ? (
              <div className="teams-empty-card">
                <Calendar style={{ width: '2rem', height: '2rem', color: 'var(--text-muted)' }} />
                <h3 className="teams-empty-title">No Fixtures Created Yet</h3>
                <p className="teams-empty-desc">
                  Schedule manual matchups or click "Auto Fixtures" to generate round robin matches automatically!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {filteredMatches.map(m => (
                  <div key={m.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${m.status === 'LIVE' ? 'var(--accent-rose)' : 'var(--accent-primary)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <span className={`badge ${m.status === 'LIVE' ? 'badge-danger' : m.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                        {m.status === 'LIVE' ? '🔴 LIVE NOW' : m.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                        {m.match_date} • {m.start_time?.slice(0, 5)}
                      </span>
                    </div>

                    {/* Team A vs Team B Display */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                        <img
                          src={m.team_a_logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=100&q=80'}
                          alt={m.team_a_name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>{m.team_a_name}</span>
                      </div>

                      <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent-amber)', padding: '0 0.5rem' }}>VS</span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)', textAlign: 'right' }}>{m.team_b_name}</span>
                        <img
                          src={m.team_b_logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=100&q=80'}
                          alt={m.team_b_name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>🏟️ {m.court_name || 'Court 1'} ({m.venue_name || 'Main Venue'})</span>
                      <Link to={`/tournaments/${tournament.uuid || tournament.id}/live`} style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
                        SCORED LIVE →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STANDINGS TAB ── */}
        {activeTab === 'standings' && (
          <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>TEAM</th>
                  <th style={{ padding: '0.75rem' }}>P</th>
                  <th style={{ padding: '0.75rem' }}>W</th>
                  <th style={{ padding: '0.75rem' }}>L</th>
                  <th style={{ padding: '0.75rem' }}>NRR</th>
                  <th style={{ padding: '0.75rem', fontWeight: 900, color: 'var(--accent-amber)' }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((row, i) => (
                  <tr key={row.team_id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>{row.team_name}</td>
                    <td style={{ padding: '0.75rem' }}>{row.played || 0}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-primary)' }}>{row.won || 0}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-rose)' }}>{row.lost || 0}</td>
                    <td style={{ padding: '0.75rem' }}>{row.net_run_rate || '0.00'}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 900, color: 'var(--accent-amber)' }}>{row.points || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Manual Match Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-heading)' }}>
              Create & Schedule Match
            </h3>

            <form onSubmit={handleCreateManualMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">TEAM 1 (HOME)</label>
                <select
                  required
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Select Team 1 --</option>
                  {registeredTeams.map(t => (
                    <option key={t.team_id} value={t.team_id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">TEAM 2 (AWAY)</label>
                <select
                  required
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Select Team 2 --</option>
                  {registeredTeams.map(t => (
                    <option key={t.team_id} value={t.team_id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">MATCH DATE *</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">START TIME *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-secondary btn-sm">CANCEL</button>
                <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">SCHEDULE MATCH</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Fixtures Generator Modal */}
      {showAutoFixtureModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-heading)' }}>
              Auto Fixture Generator
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">FIXTURE MODE</label>
                <select
                  value={fixtureMode}
                  onChange={(e) => setFixtureMode(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  <option value="LEAGUE">Round Robin League (All Teams Play Each Other)</option>
                  <option value="KNOCKOUT">Single Elimination Knockout Bracket</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAutoFixtureModal(false)} className="btn btn-secondary btn-sm">CANCEL</button>
                <button type="button" onClick={handleGenerateFixtures} disabled={submitting} className="btn btn-primary btn-sm">GENERATE FIXTURES</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
