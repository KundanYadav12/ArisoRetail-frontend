import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { getSocket } from '../services/socketClient';
import AdvertisementTop from '../components/tournament/AdvertisementTop';
import AdvertisementBottom from '../components/tournament/AdvertisementBottom';
import EventAnimationOverlay from '../components/tournament/EventAnimationOverlay';
import MatchGrid from '../components/tournament/MatchGrid';
import { Trophy, Tv, ChevronLeft, RefreshCw } from 'lucide-react';

export default function TournamentMultiMatchLivePage() {
  const { id: tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        tournamentService.getTournamentById(tournamentId),
        tournamentService.getLiveMatches(tournamentId)
      ]);

      if (tRes.data.success) {
        setTournament(tRes.data.tournament);
      }
      if (mRes.data.success) {
        setLiveMatches(mRes.data.matches || []);
      }
    } catch (err) {
      console.error('Failed to load tournament live matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    socket.emit('join_tournament', tournamentId);

    const handleScoreUpdate = () => {
      fetchData();
    };

    const handleMatchStatus = () => {
      fetchData();
    };

    socket.on('match:scoreUpdated', handleScoreUpdate);
    socket.on('match:started', handleMatchStatus);
    socket.on('match:completed', handleMatchStatus);
    socket.on('tournament:matchStarted', handleMatchStatus);
    socket.on('tournament:matchCompleted', handleMatchStatus);

    return () => {
      socket.emit('leave_tournament', tournamentId);
      socket.off('match:scoreUpdated', handleScoreUpdate);
      socket.off('match:started', handleMatchStatus);
      socket.off('match:completed', handleMatchStatus);
      socket.off('tournament:matchStarted', handleMatchStatus);
      socket.off('tournament:matchCompleted', handleMatchStatus);
    };
  }, [tournamentId]);

  return (
    <div className="tournaments-page-wrapper" style={{ padding: '1.5rem 0 3rem 0' }}>
      {/* Event Animation Overlay */}
      <EventAnimationOverlay tournamentId={tournamentId} />

      {/* Top Sponsor Banner */}
      <AdvertisementTop tournamentId={tournamentId} />

      {/* Main Centered Content Container */}
      <div className="tournaments-container" style={{ marginTop: '1rem' }}>
        
        {/* Header Navigation Toolbar */}
        <div className="tournaments-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link
              to={`/tournaments/${tournament?.uuid || tournamentId}`}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.5rem' }}
            >
              <ChevronLeft style={{ width: '18px', height: '18px' }} />
            </Link>
            <div>
              <span className="tournaments-breadcrumb">
                LIVE TOURNAMENT ECOSYSTEM
              </span>
              <h1 className="tournaments-title">
                <Trophy className="tournaments-title-icon" />
                <span>{tournament ? tournament.name : 'Tournament Live Matches'}</span>
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={fetchData}
              className="btn btn-secondary btn-sm"
              title="Refresh"
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
            </button>

            <Link
              to={`/display/tournament/${tournament?.uuid || tournamentId}`}
              className="btn btn-primary btn-sm"
            >
              <Tv style={{ width: '16px', height: '16px' }} />
              <span>TV SIGNAGE MODE</span>
            </Link>
          </div>
        </div>

        {/* Live Matches Count Banner Summary */}
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="live-dot"></span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              {liveMatches.length} Simultaneous Live Matches
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
            Real-Time Socket Sync Active
          </span>
        </div>

        {/* Dynamic Responsive Match Cards Grid */}
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
        ) : (
          <MatchGrid matches={liveMatches} />
        )}

      </div>

      {/* Bottom Sponsor Banner */}
      <AdvertisementBottom tournamentId={tournamentId} />
    </div>
  );
}
