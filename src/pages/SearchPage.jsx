import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getVenuesApi, getSportsApi } from '../services/venueService';
import { Search, MapPin, Filter, Star, CheckCircle } from 'lucide-react';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);

  const city = searchParams.get('city') || 'Mumbai';
  const sport = searchParams.get('sport') || '';
  const query = searchParams.get('q') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => {
    fetchVenuesAndSports();
  }, [searchParams]);

  const fetchVenuesAndSports = async () => {
    try {
      setLoading(true);
      const sportsRes = await getSportsApi();
      if (sportsRes.success) setSports(sportsRes.data);

      const params = {};
      if (city) params.city = city;
      if (sport) params.sport = sport;
      if (query) params.search = query;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const venuesRes = await getVenuesApi(params);
      if (venuesRes.success) setVenues(venuesRes.data);
    } catch (err) {
      console.error('Failed to search venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Explore Sports Venues</h1>
        <p style={{ color: 'var(--text-muted)' }}>Found {venues.length} sports arenas in {city}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
        {/* Filters Sidebar */}
        <aside className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Filter size={18} color="#10b981" />
            <h3 style={{ fontSize: '1.1rem' }}>Filters</h3>
          </div>

          {/* City Selector */}
          <div className="form-group">
            <label className="form-label">City</label>
            <select
              value={city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="form-input"
            >
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Delhi NCR">Delhi NCR</option>
            </select>
          </div>

          {/* Sport Selector */}
          <div className="form-group">
            <label className="form-label">Sport Category</label>
            <select
              value={sport}
              onChange={(e) => handleFilterChange('sport', e.target.value)}
              className="form-input"
            >
              <option value="">All Sports</option>
              <option value="cricket">Cricket</option>
              <option value="football">Football</option>
              <option value="badminton">Badminton</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="form-group">
            <label className="form-label">Max Price / Hour (₹)</label>
            <input
              type="number"
              placeholder="e.g. 2000"
              value={maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="form-input"
            />
          </div>

          <button
            onClick={() => setSearchParams({ city: 'Mumbai' })}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Reset Filters
          </button>
        </aside>

        {/* Search Results Grid */}
        <main>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Searching available venues...</div>
          ) : venues.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <h3>No Venues Found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="venue-grid" style={{ marginTop: 0 }}>
              {venues.map((v) => (
                <div key={v.id} onClick={() => navigate(`/venue/${v.slug || v.id}`)} className="glass-panel venue-card" style={{ cursor: 'pointer' }}>
                  <div className="venue-card-image">
                    <img src={v.primaryImage} alt={v.name} />
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                      <span className="badge badge-success" style={{ backdropFilter: 'blur(10px)' }}>
                        <Star size={12} fill="#34d399" /> {v.rating} ({v.reviewCount})
                      </span>
                    </div>
                  </div>

                  <div className="venue-card-body">
                    <h3 className="venue-title">{v.name}</h3>
                    <div className="venue-location">
                      <MapPin size={14} color="#94a3b8" />
                      <span>{v.address}, {v.city}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      {v.sports?.map((s) => (
                        <span key={s.id} style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.name}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Starts from</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>₹{v.startingPrice}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/hr</span>
                      </div>

                      <button className="btn btn-primary btn-sm">
                        View Slots
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
