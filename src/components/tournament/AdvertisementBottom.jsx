import React, { useState, useEffect } from 'react';
import { advertisementService } from '../../services/advertisementService';
import { getSocket } from '../../services/socketClient';

export default function AdvertisementBottom({ tournamentId, matchId, venueId }) {
  const [bottomAds, setBottomAds] = useState([]);

  const fetchAds = async () => {
    try {
      const res = await advertisementService.getActiveAds({ tournamentId, matchId, venueId });
      if (res.data.success && res.data.bottomAds) {
        setBottomAds(res.data.bottomAds);
      }
    } catch (err) {
      console.error('Failed to fetch bottom ads:', err);
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

  if (!bottomAds || bottomAds.length === 0) return null;

  // Single sponsor item to fix side-by-side duplication bug
  const currentAd = bottomAds[0];

  return (
    <div style={{ width: '100%', padding: '0 1.5rem 1.5rem 1.5rem', marginTop: '1rem' }}>
      <div className="sponsor-banner-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-success">
            OFFICIAL SPONSOR
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
              objectFit: 'contain',
              borderRadius: 'var(--radius-sm)'
            }}
          />
        )}
      </div>
    </div>
  );
}

          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
