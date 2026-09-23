import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MapPin } from 'lucide-react';

export default function MatchCard({ match, isSignageMode = false }) {
  const navigate = useNavigate();

  const currentInnings = match.innings && match.innings.length > 0
    ? match.innings[match.innings.length - 1]
    : null;

  const totalRuns = currentInnings ? currentInnings.total_runs : 0;
  const totalWickets = currentInnings ? currentInnings.total_wickets : 0;
  const oversBowled = currentInnings ? currentInnings.total_overs_bowled : 0.0;

  const isTeamABatting = currentInnings && currentInnings.batting_team_id === match.team_a_id;
  const isTeamBBatting = currentInnings && currentInnings.batting_team_id === match.team_b_id;

  return (
    <div
      onClick={() => !isSignageMode && navigate(`/matches/${match.uuid || match.id}/live`)}
      className="live-match-card"
    >
      {/* Top Header Row */}
      <div className="live-match-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {match.status === 'LIVE' ? (
            <span className="live-badge">
              <span className="live-dot"></span>
              <span>LIVE</span>
            </span>
          ) : (
            <span className="badge badge-info">{match.status}</span>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin style={{ width: '13px', height: '13px', color: 'var(--accent-primary)' }} />
            {match.court_name || 'Main Pitch'}
          </span>
        </div>

        <span className="badge badge-warning">
          Match #{match.match_number || match.id}
        </span>
      </div>

      {/* Teams & Scores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Team A */}
        <div className={`team-row ${isTeamABatting ? 'team-row-active' : ''}`}>
          <div className="team-info">
            <div className="team-logo-container">
              <img
                src={match.team_a_logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=100&q=80'}
                alt={match.team_a_name}
                className="team-logo"
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
              <span className="team-name">{match.team_a_name}</span>
              {isTeamABatting && (
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  BATTING NOW
                </span>
              )}
            </div>
          </div>

          {isTeamABatting ? (
            <div style={{ textAlign: 'right' }}>
              <span className="team-score">{totalRuns}/{totalWickets}</span>
              <span className="team-overs" style={{ display: 'block' }}>({oversBowled} Ov)</span>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Yet to Bat</span>
          )}
        </div>

        {/* Centered VS Divider */}
        <div className="vs-divider">
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>VS</span>
        </div>

        {/* Team B */}
        <div className={`team-row ${isTeamBBatting ? 'team-row-active' : ''}`}>
          <div className="team-info">
            <div className="team-logo-container">
              <img
                src={match.team_b_logo || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=100&q=80'}
                alt={match.team_b_name}
                className="team-logo"
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
              <span className="team-name">{match.team_b_name}</span>
              {isTeamBBatting && (
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  BATTING NOW
                </span>
              )}
            </div>
          </div>

          {isTeamBBatting ? (
            <div style={{ textAlign: 'right' }}>
              <span className="team-score">{totalRuns}/{totalWickets}</span>
              <span className="team-overs" style={{ display: 'block' }}>({oversBowled} Ov)</span>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Yet to Bat</span>
          )}
        </div>
      </div>

      {/* Target Info Subtitle */}
      {match.result_summary ? (
        <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tag)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
          {match.result_summary}
        </div>
      ) : match.target_runs ? (
        <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tag)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
          TARGET: {match.target_runs} RUNS
        </div>
      ) : null}

      {/* Action Footer */}
      {!isSignageMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary btn-sm">
            <Eye style={{ width: '14px', height: '14px' }} />
            <span>FULL VIEW</span>
          </button>
        </div>
      )}
    </div>
  );
}

      ) : null}

      {/* Footer / Action */}
      {!isSignageMode && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Click card for scorecard</span>
          <button className="flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs px-3.5 py-1.5 rounded-xl transition-colors">
            <Eye className="w-3.5 h-3.5" />
            <span>FULL VIEW</span>
          </button>
        </div>
      )}
    </div>
  );
}
