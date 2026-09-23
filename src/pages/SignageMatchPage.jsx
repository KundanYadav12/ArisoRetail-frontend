import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../features/theme/themeSlice';
import { matchService } from '../services/matchService';
import { getSocket } from '../services/socketClient';
import AdvertisementTop from '../components/tournament/AdvertisementTop';
import AdvertisementBottom from '../components/tournament/AdvertisementBottom';
import EventAnimationOverlay from '../components/tournament/EventAnimationOverlay';
import { Trophy, Sun, Moon } from 'lucide-react';

export default function SignageMatchPage() {
  const { id: matchId } = useParams();
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);
  const [match, setMatch] = useState(null);

  const fetchMatch = async () => {
    try {
      const res = await matchService.getMatchById(matchId);
      if (res.data.success) setMatch(res.data.match);
    } catch (err) {
      console.error('Signage match error:', err);
    }
  };

  useEffect(() => {
    fetchMatch();
    const socket = getSocket();
    socket.emit('join_match', matchId);

    const handleUpdate = () => {
      fetchMatch();
    };

    socket.on('match:scoreUpdated', handleUpdate);
    socket.on('match:completed', handleUpdate);

    return () => {
      socket.emit('leave_match', matchId);
      socket.off('match:scoreUpdated', handleUpdate);
      socket.off('match:completed', handleUpdate);
    };
  }, [matchId]);

  if (!match) return null;

  const currentInnings = match.innings && match.innings.length > 0
    ? match.innings[match.innings.length - 1]
    : null;

  return (
    <div className="signage-page-container font-sans">
      <EventAnimationOverlay matchId={matchId} />
      <AdvertisementTop matchId={matchId} tournamentId={match.tournament_id} />

      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '1100px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <span className="live-badge">
              <span className="live-dot"></span>
              <span>LIVE MATCH SIGNAGE</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-amber)' }}>
                {match.court_name || 'TURF PITCH 1'}
              </span>
              <button
                onClick={() => dispatch(toggleTheme())}
                className="signage-theme-toggle-btn"
                title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {mode === 'dark' ? (
                  <Sun style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                ) : (
                  <Moon style={{ width: '18px', height: '18px', color: '#059669' }} />
                )}
              </button>
            </div>
          </div>

          {/* Huge Scoreboard Display */}
          <div className="teams-flex-row">
            {/* Team A */}
            <div className="team-score-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="team-logo-container" style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px' }}>
                  <img
                    src={match.team_a_logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=200&q=80'}
                    alt={match.team_a_name}
                    className="team-logo"
                  />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-heading)' }}>{match.team_a_name}</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                {currentInnings && currentInnings.batting_team_id === match.team_a_id ? (
                  <>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                      {currentInnings.total_runs}/{currentInnings.total_wickets}
                    </div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      ({currentInnings.total_overs_bowled} Overs)
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dim)' }}>Yet to Bat</span>
                )}
              </div>
            </div>

            {/* Team B */}
            <div className="team-score-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="team-logo-container" style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px' }}>
                  <img
                    src={match.team_b_logo || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=200&q=80'}
                    alt={match.team_b_name}
                    className="team-logo"
                  />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-heading)' }}>{match.team_b_name}</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                {currentInnings && currentInnings.batting_team_id === match.team_b_id ? (
                  <>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                      {currentInnings.total_runs}/{currentInnings.total_wickets}
                    </div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      ({currentInnings.total_overs_bowled} Overs)
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dim)' }}>Yet to Bat</span>
                )}
              </div>
            </div>
          </div>

          {match.target_runs && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                TARGET: {match.target_runs} RUNS
              </span>
            </div>
          )}
        </div>
      </main>

      <AdvertisementBottom matchId={matchId} tournamentId={match.tournament_id} />
    </div>
  );
}
