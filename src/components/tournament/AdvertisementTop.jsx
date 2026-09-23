import React, { useState, useEffect } from 'react';
import { advertisementService } from '../../services/advertisementService';
import { getSocket } from '../../services/socketClient';

export default function AdvertisementTop({ tournamentId, matchId, venueId }) {
  const [topAds, setTopAds] = useState([]);

  const fetchAds = async () => {
    try {
      const res = await advertisementService.getActiveAds({ tournamentId, matchId, venueId });
      if (res.data.success && res.data.topAds) {
        setTopAds(res.data.topAds);
      }
    } catch (err) {
      console.error('Failed to fetch top ads:', err);
    }
  };

  useEffect(() => {
    fetchAds();
    const socket = getSocket();

    const handleAdUpdate = () => {
      fetchAds();
    };

    socket.on('advertisement:updated', handleAdUpdate);
    return () => {
      socket.off('advertisement:updated', handleAdUpdate);
    };
  }, [tournamentId, matchId, venueId]);

  if (!topAds || topAds.length === 0) return null;

  const currentAd = topAds[0];

  return (
    <div style={{ width: '100%', padding: '0.75rem 1.5rem 0 1.5rem' }}>
      <div className="sponsor-banner-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-warning">
            SPONSORED
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            {currentAd.name}
          </span>
        </div>

        {currentAd.image_url && (
          <img
            src={currentAd.image_url}
            alt={currentAd.name}
            style={{
              height: '40px',
              maxWidth: '220px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}
          />
        )}
      </div>
    </div>
  );
}
