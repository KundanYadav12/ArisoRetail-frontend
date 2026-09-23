import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getSportsApi, getVenuesApi } from '../services/venueService';
import { setVenues, setSelectedSport, setSelectedCity } from '../features/venue/venueSlice';
import { Search, MapPin, Calendar, Star, ChevronRight, ShieldCheck, Zap, Award, Sparkles, CheckCircle2 } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { venues, selectedSport, selectedCity } = useSelector((state) => state.auth || state.venue);
  const [sports, setSports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const sportsRes = await getSportsApi();
      if (sportsRes.success) setSports(sportsRes.data);

      const venuesRes = await getVenuesApi({ city: 'Mumbai' });
      if (venuesRes.success) {
        setFeaturedVenues(venuesRes.data);
        dispatch(setVenues(venuesRes.data));
      }
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/search?city=${selectedCity || 'Mumbai'}&sport=${selectedSport}&q=${searchQuery}`);
  };

  return (
    <div>
      {/* Hero Banner Section */}
      <section className="hero-section">
        <div className="container">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', color: '#34d399', fontWeight: 700, marginBottom: '1.5rem' }}>
            <Sparkles size={16} /> Instant Slot Booking & Sports Management Platform
          </div>

          <h1 className="hero-title">
            Book Premier <span className="hero-highlight">Turfs & Courts</span> <br /> Near You Instantly
          </h1>

          <p className="hero-subtitle">
            Find FIFA-standard football turfs, box cricket pitches, and synthetic badminton courts. Real-time availability with zero double-booking guarantee.
          </p>

          {/* Interactive Search Bar */}
          <form onSubmit={handleSearchSubmit} className="glass-panel search-bar-card">
            <div style={{ position: 'relative' }}>
              <label className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Location</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#10b981" />
                <select
                  value={selectedCity || 'Mumbai'}
                  onChange={(e) => dispatch(setSelectedCity(e.target.value))}
                  className="form-input"
                  style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '1rem', fontWeight: '700' }}
                >
                  <option value="Mumbai" style={{ background: '#0f172a' }}>Mumbai</option>
                  <option value="Bengaluru" style={{ background: '#0f172a' }}>Bengaluru</option>
                  <option value="Delhi NCR" style={{ background: '#0f172a' }}>Delhi NCR</option>
                </select>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <label className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Select Sport</label>
              <select
                value={selectedSport}
                onChange={(e) => dispatch(setSelectedSport(e.target.value))}
                className="form-input"
                style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '1rem', fontWeight: '700' }}
              >
                <option value="" style={{ background: '#0f172a' }}>All Sports</option>
                <option value="cricket" style={{ background: '#0f172a' }}>Cricket</option>
                <option value="football" style={{ background: '#0f172a' }}>Football</option>
                <option value="badminton" style={{ background: '#0f172a' }}>Badminton</option>
              </select>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <label className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Venue Name / Area</label>
              <input
                type="text"
                placeholder="Search venue or locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '0', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ height: '100%' }}>
              <Search size={20} /> Search Slots
            </button>
          </form>
        </div>
      </section>

      {/* Sports Categories Bar */}
      <section className="container" style={{ margin: '3rem auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2>Explore Sports</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a sport to filter venues</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
          {[
            { id: 1, name: 'Cricket', icon: '🏏', slug: 'cricket', active: true, count: '12+ Turfs' },
            { id: 2, name: 'Football', icon: '⚽', slug: 'football', active: true, count: '8+ Grounds' },
            { id: 3, name: 'Badminton', icon: '🏸', slug: 'badminton', active: true, count: '15+ Courts' },
            { id: 4, name: 'Tennis', icon: '🎾', slug: 'tennis', active: false, count: 'Coming Soon' },
            { id: 5, name: 'Basketball', icon: '🏀', slug: 'basketball', active: false, count: 'Coming Soon' }
          ].map((sp) => (
            <div
              key={sp.id}
              onClick={() => {
                if (sp.active) {
                  dispatch(setSelectedSport(sp.slug));
                  navigate(`/search?sport=${sp.slug}`);
                }
              }}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                cursor: sp.active ? 'pointer' : 'not-allowed',
                border: selectedSport === sp.slug ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                opacity: sp.active ? 1 : 0.5,
                transition: 'var(--transition-fast)'
              }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{sp.icon}</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{sp.name}</h3>
              <span style={{ fontSize: '0.8rem', color: sp.active ? '#34d399' : 'var(--text-dim)' }}>
                {sp.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Venues Grid */}
      <section className="container" style={{ margin: '4rem auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2>Popular Sports Venues</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Top-rated turfs with verified floodlights & facilities</p>
          </div>
          <button onClick={() => navigate('/search')} className="btn btn-outline btn-sm">
            View All Venues <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading sports arenas...</div>
        ) : (
          <div className="venue-grid">
            {featuredVenues.map((v) => (
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
                      Book Slot
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Platform Features Banner */}
      <section className="container" style={{ margin: '5rem auto 2rem auto' }}>
        <div className="glass-panel" style={{ padding: '3rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            <div>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Zap size={24} color="#34d399" />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Instant Slot Confirmation</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time concurrency engine locks slots instantly. Zero risk of double bookings.</p>
            </div>

            <div>
              <div style={{ background: 'rgba(6, 182, 212, 0.2)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <ShieldCheck size={24} color="#38bdf8" />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Verified Venues & Turf Quality</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>High-lux floodlights, FIFA-grade turf grass, and clean changing amenities.</p>
            </div>

            <div>
              <div style={{ background: 'rgba(139, 92, 246, 0.2)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Award size={24} color="#a78bfa" />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>SaaS Venue Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Venue owners manage online + offline walk-in bookings with live slot grids.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
