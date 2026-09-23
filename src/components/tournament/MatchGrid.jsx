import React, { useState, useEffect } from 'react';
import MatchCard from './MatchCard';
import { Layers } from 'lucide-react';

export default function MatchGrid({ matches = [], isSignageMode = false }) {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth || window.innerWidth < 800);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3 matches per page in portrait mode for optimal screen density without overflow
  const pageSize = isPortrait ? 3 : 4;
  const totalPages = Math.ceil(matches.length / pageSize);

  // Auto-rotate matches every 7 seconds in signage mode when matches exceed pageSize
  useEffect(() => {
    if (!isSignageMode || matches.length <= pageSize) return;

    const timer = setInterval(() => {
      setActivePageIndex((prev) => (prev + 1) % totalPages);
    }, 7000);

    return () => clearInterval(timer);
  }, [isSignageMode, matches.length, pageSize, totalPages]);

  if (!matches || matches.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          No Live Matches Active Right Now
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Scheduled tournament matches will appear here automatically in real time when started.
        </p>
      </div>
    );
  }

  // Calculate visible matches for carousel rotation in signage mode if matches exceed pageSize
  const shouldCarousel = isSignageMode && matches.length > pageSize;
  const visibleMatches = shouldCarousel
    ? matches.slice(activePageIndex * pageSize, (activePageIndex + 1) * pageSize)
    : matches;

  const matchCount = matches.length;
  const gridClass = isSignageMode
    ? `signage-match-grid count-${matchCount} ${isPortrait ? 'portrait-stack' : 'landscape-grid'}`
    : 'tournaments-grid';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Auto-Rotating Signage Carousel Badge Indicator */}
      {shouldCarousel && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.3rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          marginBottom: '0.75rem'
        }}>
          <Layers style={{ width: '14px', height: '14px', color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
            AUTO-ROTATING BROADCAST • PAGE {activePageIndex + 1} OF {totalPages} ({matches.length} MATCHES)
          </span>
        </div>
      )}

      <div className={gridClass}>
        {visibleMatches.map((match) => (
          <MatchCard key={match.id} match={match} isSignageMode={isSignageMode} />
        ))}
      </div>

      {/* Large High-Contrast Page Indicator Dots */}
      {shouldCarousel && totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '1rem',
          marginBottom: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === activePageIndex ? '36px' : '12px',
                height: '12px',
                borderRadius: '6px',
                backgroundColor: idx === activePageIndex ? '#f59e0b' : '#475569',
                boxShadow: idx === activePageIndex ? '0 0 12px rgba(245, 158, 11, 0.7)' : 'none',
                border: idx === activePageIndex ? '1px solid #fbbf24' : '1px solid #64748b',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
