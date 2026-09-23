import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchService } from '../services/matchService';
import { getSocket } from '../services/socketClient';
import AdvertisementTop from '../components/tournament/AdvertisementTop';
import AdvertisementBottom from '../components/tournament/AdvertisementBottom';
import EventAnimationOverlay from '../components/tournament/EventAnimationOverlay';
import { ChevronLeft, Trophy, Activity, Edit3, Tv, MapPin, Clock } from 'lucide-react';

export default function SingleMatchLivePage() {
  const { id: matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMatchDetails = async () => {
    try {
      const res = await matchService.getMatchById(matchId);
      if (res.data.success) {
        setMatch(res.data.match);
      }
    } catch (err) {
      console.error('Failed to load match details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();

    const socket = getSocket();
    socket.emit('join_match', matchId);

    const handleScoreUpdate = () => {
      fetchMatchDetails();
    };

    socket.on('match:scoreUpdated', handleScoreUpdate);
    socket.on('match:completed', handleScoreUpdate);

    return () => {
      socket.emit('leave_match', matchId);
      socket.off('match:scoreUpdated', handleScoreUpdate);
      socket.off('match:completed', handleScoreUpdate);
    };
  }, [matchId]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 text-center">
        <p className="text-xl font-bold">Match Not Found</p>
        <Link to="/tournaments" className="mt-4 inline-block text-emerald-400 font-semibold underline">
          Return to Tournaments
        </Link>
      </div>
    );
  }

  const currentInnings = match.innings && match.innings.length > 0
    ? match.innings[match.innings.length - 1]
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between pb-16">
      <EventAnimationOverlay matchId={matchId} />
      <AdvertisementTop matchId={matchId} tournamentId={match.tournament_id} />

      <div className="max-w-5xl mx-auto px-4 py-6 w-full flex-grow">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <Link
              to={`/tournaments/${match.tournament_id}/live`}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                LIVE SCORECARD
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {match.team_a_name} vs {match.team_b_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to={`/scorer/matches/${matchId}`}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>SCORER PANEL</span>
            </Link>
            <Link
              to={`/display/match/${matchId}`}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs"
            >
              <Tv className="w-4 h-4" />
              <span>SIGNAGE</span>
            </Link>
          </div>
        </div>

        {/* Big Match Main Board */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl mb-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="bg-red-500/20 border border-red-500/50 text-red-400 font-extrabold text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {match.status}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {match.court_name || 'Main Court'} • {match.venue_name || 'Apex Arena'}
              </span>
            </div>
            <span className="text-xs font-extrabold text-amber-400 uppercase">
              T20 • {match.total_overs || 20} Overs
            </span>
          </div>

          {/* Teams Grid Scoreboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Team A */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-4">
                <img
                  src={match.team_a_logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=150&q=80'}
                  alt={match.team_a_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 shadow-md"
                />
                <div>
                  <h3 className="text-lg font-black text-white">{match.team_a_name}</h3>
                  <span className="text-xs text-slate-400 font-semibold">First Innings</span>
                </div>
              </div>
              <div className="text-right">
                {currentInnings && currentInnings.batting_team_id === match.team_a_id ? (
                  <>
                    <div className="text-3xl font-black text-amber-400">
                      {currentInnings.total_runs}/{currentInnings.total_wickets}
                    </div>
                    <div className="text-xs text-slate-400 font-bold">
                      {currentInnings.total_overs_bowled} Ov
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-500">Yet to Bat</span>
                )}
              </div>
            </div>

            {/* Team B */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-4">
                <img
                  src={match.team_b_logo || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=150&q=80'}
                  alt={match.team_b_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 shadow-md"
                />
                <div>
                  <h3 className="text-lg font-black text-white">{match.team_b_name}</h3>
                  <span className="text-xs text-slate-400 font-semibold">Chasing Team</span>
                </div>
              </div>
              <div className="text-right">
                {currentInnings && currentInnings.batting_team_id === match.team_b_id ? (
                  <>
                    <div className="text-3xl font-black text-amber-400">
                      {currentInnings.total_runs}/{currentInnings.total_wickets}
                    </div>
                    <div className="text-xs text-slate-400 font-bold">
                      {currentInnings.total_overs_bowled} Ov
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-500">Yet to Bat</span>
                )}
              </div>
            </div>
          </div>

          {/* Match Result / Target Banner */}
          {match.result_summary ? (
            <div className="mt-6 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 text-center">
              <span className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                RESULT: {match.result_summary}
              </span>
            </div>
          ) : match.target_runs ? (
            <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-around gap-4 text-center">
              <div>
                <span className="text-xs text-slate-400 block font-semibold">TARGET RUNS</span>
                <span className="text-xl font-black text-amber-400">{match.target_runs}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold">NEED</span>
                <span className="text-xl font-black text-emerald-400">
                  {Math.max(0, match.target_runs - (currentInnings ? currentInnings.total_runs : 0))} Runs
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Recent Score Events Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Recent Ball-by-Ball Events</span>
          </h3>

          {!match.scoreEvents || match.scoreEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events recorded yet for this match.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {match.scoreEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border shadow ${
                    ev.event_type === '6'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce-short'
                      : ev.event_type === '4'
                      ? 'bg-teal-500 text-slate-950 border-teal-400'
                      : ev.event_type === 'WICKET'
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  {ev.event_type}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdvertisementBottom matchId={matchId} tournamentId={match.tournament_id} />
    </div>
  );
}
