import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../features/theme/themeSlice';
import { matchService } from '../services/matchService';
import { ChevronLeft, Play, RefreshCw, Sun, Moon, Zap, ShieldAlert } from 'lucide-react';

export default function ScorerMatchPage() {
  const { id: matchId } = useParams();
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState('');

  const fetchMatch = async () => {
    try {
      const res = await matchService.getMatchById(matchId);
      if (res.data.success) setMatch(res.data.match);
    } catch (err) {
      console.error('Failed to load scorer match data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const handleStartMatch = async () => {
    try {
      setSubmitting(true);
      await matchService.startMatch(matchId);
      setLastActionMessage('Match Started & Live!');
      await fetchMatch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScoreAction = async (action) => {
    try {
      setSubmitting(true);
      const res = await matchService.recordScoreEvent(matchId, action);
      if (res.data.success) {
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!match) return null;

  const currentInnings = match.innings && match.innings.length > 0
    ? match.innings[match.innings.length - 1]
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <Link
            to={`/matches/${matchId}/live`}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              OFFICIAL SCORER CONTROL PANEL
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {match.team_a_name} vs {match.team_b_name}
            </h1>
          </div>
        </div>

        <button
          onClick={fetchMatch}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Match Status & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase">MATCH STATUS</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="bg-amber-500/20 text-amber-400 font-extrabold text-xs px-3 py-1 rounded-full border border-amber-500/40">
              {match.status}
            </span>
            {currentInnings && (
              <span className="text-sm font-bold text-white">
                Innings {currentInnings.innings_number}: {currentInnings.total_runs}/{currentInnings.total_wickets} ({currentInnings.total_overs_bowled} Ov)
              </span>
            )}
          </div>
        </div>

        {match.status === 'SCHEDULED' && (
          <button
            onClick={handleStartMatch}
            disabled={submitting}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START MATCH LIVE</span>
          </button>
        )}
      </div>

      {lastActionMessage && (
        <div className="mb-6 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-bold px-4 py-2.5 rounded-xl text-center">
          {lastActionMessage}
        </div>
      )}

      {/* Big Touch Buttons Grid for Scoring */}
      {match.status === 'LIVE' ? (
        <div className="space-y-6">
          {/* Main Runs Buttons */}
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">
              RUNS SCORED
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {['0', '1', '2', '3', '4', '6'].map((val) => (
                <button
                  key={val}
                  disabled={submitting}
                  onClick={() => handleScoreAction(val)}
                  className={`h-20 sm:h-24 rounded-2xl font-black text-2xl sm:text-3xl transition-transform active:scale-95 shadow-xl border ${
                    val === '6'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-900/30'
                      : val === '4'
                      ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-400 shadow-teal-900/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Extras Buttons */}
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">
              EXTRAS & ILLEGAL BALLS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'].map((ext) => (
                <button
                  key={ext}
                  disabled={submitting}
                  onClick={() => handleScoreAction(ext)}
                  className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-extrabold text-sm sm:text-base text-sky-400 transition-transform active:scale-95 shadow-md"
                >
                  {ext.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Wicket Button */}
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">
              WICKET / OUT
            </h3>
            <button
              disabled={submitting}
              onClick={() => handleScoreAction('WICKET')}
              className="w-full h-20 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-2xl tracking-widest border border-rose-500 shadow-xl shadow-rose-950/40 transition-transform active:scale-95"
            >
              OUT / WICKET 🔴
            </button>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <p className="text-slate-400 font-semibold">
            {match.status === 'COMPLETED'
              ? 'Match has ended. Scorecard is locked.'
              : 'Click "START MATCH LIVE" above to activate the scoring touch panel.'}
          </p>
        </div>
      )}
    </div>
  );
}
