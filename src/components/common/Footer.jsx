import React from 'react';
import { Trophy, ShieldCheck, Heart, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ background: '#060911', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '4rem 0 2rem 0', marginTop: '5rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div className="brand-logo" style={{ marginBottom: '1rem' }}>
              <Trophy size={26} color="#10b981" />
              <span>TurfSpot</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
              The complete sports booking, turf management, team organizing, and match scoring SaaS platform.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', color: '#ffffff' }}>Active Sports</h4>
            <ul style={{ listStyle: 'none', color: '#94a3b8', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>🏏 Cricket Turfs & Box Pits</li>
              <li>⚽ Football Pitches (5v5 & 7v7)</li>
              <li>🏸 Synthetic Badminton Courts</li>
              <li>🎾 Tennis (Coming Soon)</li>
              <li>🏀 Basketball (Coming Soon)</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', color: '#ffffff' }}>Popular Cities</h4>
            <ul style={{ listStyle: 'none', color: '#94a3b8', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>Mumbai</li>
              <li>Bengaluru</li>
              <li>Delhi NCR</li>
              <li>Hyderabad</li>
              <li>Pune</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', color: '#ffffff' }}>For Venue Owners</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
              List your turf/courts, automate slot bookings, manage walk-in customers, and maximize revenue.
            </p>
            <a href="/register" className="btn btn-outline btn-sm">
              <Sparkles size={14} /> Partner With Us
            </a>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          © {new Date().getFullYear()} TurfSpot Platform. All rights reserved. Built with precision SaaS architecture.
        </div>
      </div>
    </footer>
  );
};

export default Footer;


        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.5rem',
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.85rem'
        }}>
          © {new Date().getFullYear()} TurfSpot Platform. All rights reserved. Built with precision SaaS architecture.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
