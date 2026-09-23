import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tournamentService } from '../services/tournamentService';
import { getSocket } from '../services/socketClient';
import AdvertisementTop from '../components/tournament/AdvertisementTop';
import AdvertisementBottom from '../components/tournament/AdvertisementBottom';
import EventAnimationOverlay from '../components/tournament/EventAnimationOverlay';
import MatchGrid from '../components/tournament/MatchGrid';
import { Trophy, Radio, Clock, ShieldCheck, MapPin } from 'lucide-react';

export default function SignageTournamentPage() {
  const { id: idOrUuid } = useParams();
  const [tournament, setTournament] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  const fetchData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        tournamentService.getTournamentById(idOrUuid),
        tournamentService.getLiveMatches(idOrUuid)
      ]);
      if (tRes.data.success) setTournament(tRes.data.tournament);
      if (mRes.data.success) setLiveMatches(mRes.data.matches || []);
    } catch (err) {
      console.error('Signage data error:', err);
    }
  };

  useEffect(() => {
    fetchData();

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const socket = getSocket();
    socket.emit('join_tournament', idOrUuid);

    const handleUpdate = () => {
      fetchData();
    };

    socket.on('match:scoreUpdated', handleUpdate);
    socket.on('match:started', handleUpdate);
    socket.on('match:completed', handleUpdate);
    socket.on('tournament:matchStarted', handleUpdate);
    socket.on('tournament:matchCompleted', handleUpdate);

    return () => {
      clearInterval(timer);
      socket.emit('leave_tournament', idOrUuid);
      socket.off('match:scoreUpdated', handleUpdate);
      socket.off('match:started', handleUpdate);
      socket.off('match:completed', handleUpdate);
      socket.off('tournament:matchStarted', handleUpdate);
      socket.off('tournament:matchCompleted', handleUpdate);
    };
  }, [idOrUuid]);

  const realTournamentId = tournament ? tournament.id : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between select-none overflow-hidden pb-16 font-sans">
      {/* Event Animation Overlay for SIX, FOUR, OUT */}
      <EventAnimationOverlay tournamentId={realTournamentId || idOrUuid} />

      {/* Top Banner Advertisement */}
      <AdvertisementTop tournamentId={realTournamentId} />

      {/* Broadcast TV Stadium Signage Header */}
      <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-emerald-500/30 px-3 sm:px-6 lg:px-10 py-2 sm:py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 sm:gap-4 my-1">
        {/* Left Brand Badge */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 flex-shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-red-500">
                LIVE BROADCAST SIGNAGE
              </span>
            </div>
            <h1 className="font-black tracking-tight text-white uppercase drop-shadow" style={{ fontSize: 'clamp(1.1rem, 2vw, 2.1rem)', lineHeight: '1.2' }}>
              {tournament ? tournament.name : 'TOURNAMENT LIVE DISPLAY'}
            </h1>
          </div>
        </div>

        {/* Right Digital Clock & Live Counter */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl shadow-inner">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-slate-200 tracking-wider">
              {liveMatches.length} ACTIVE {liveMatches.length === 1 ? 'MATCH' : 'MATCHES'}
            </span>
          </div>

          <div className="bg-slate-900 border border-amber-500/40 px-3 sm:px-4 py-1 rounded-xl shadow-lg flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-black text-amber-400 font-mono tracking-widest" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.4rem)' }}>
              {currentTime}
            </span>
          </div>
        </div>
      </header>

      {/* Main Stadium Signage Arena (Dynamic Match Grid) */}
      <main className="flex-grow p-2 sm:p-4 lg:p-6 flex items-center justify-center">
        <div className="w-full max-w-[2200px] mx-auto">
          <MatchGrid matches={liveMatches} isSignageMode={true} />
        </div>
      </main>

      {/* Bottom Continuous Scrolling Marquee Advertisement */}
      <AdvertisementBottom tournamentId={realTournamentId} />
    </div>
  );
}
