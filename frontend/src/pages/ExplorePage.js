import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, requestsAPI } from '../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersAPI.explore({ limit: 4 }),
      requestsAPI.getAll({ type: 'all' }),
    ]).then(([creatorsRes, reqRes]) => {
      setCreators(creatorsRes.data.creators || []);
      setRequests(reqRes.data.requests || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const activeRequests = requests.filter(r => ['pending','accepted','in_progress'].includes(r.status)).length;

  const stats = [
    { icon: '⟡', label: 'Credit Balance', value: user?.credit_balance ?? 0, color: '#6366f1' },
    { icon: '✓', label: 'Completed Projects', value: user?.completed_projects ?? 0, color: '#10b981' },
    { icon: '★', label: 'Rating', value: user?.rating ?? '0.0', color: '#f59e0b' },
    { icon: '◎', label: 'Active Requests', value: activeRequests, color: '#06b6d4' },
  ];

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const getOfferedSkills = (skills) => (skills || []).filter(s => s.skill_type === 'offered').slice(0, 3);

  const statusColor = { pending: '#f59e0b', accepted: '#10b981', in_progress: '#06b6d4', completed: '#6ee7b7', cancelled: '#ef4444' };

  return (
    <div className="page">
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.welcome}>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p style={s.sub}>Here's what's happening on your account.</p>
        </div>
        <button style={s.bonusBtn} className="btn btn-outline btn-sm">
          ⟡ Claim +20 Bonus Credits
        </button>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        {stats.map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ ...s.statIcon, color: stat.color }}>{stat.icon}</div>
            <div style={s.statValue}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recommended Creators */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Recommended For You</h2>
          <Link to="/explore" style={s.seeAll}>See all →</Link>
        </div>
        {loading ? (
          <div style={s.loadingRow}>{[1,2,3,4].map(i => <div key={i} style={s.skeleton} />)}</div>
        ) : (
          <div style={s.creatorsGrid}>
            {creators.map(creator => (
              <div key={creator.id} style={s.creatorCard}>
                <div style={s.creatorAvatar}>{getInitials(creator.full_name)}</div>
                <h3 style={s.creatorName}>{creator.full_name}</h3>
                <div style={s.creatorMeta}>
                  <span style={{ color: '#f59e0b' }}>★ {creator.rating}</span>
                  <span style={s.dot}>·</span>
                  <span style={{ color: '#64748b' }}>{creator.completed_projects} projects</span>
                </div>
                <div style={s.skillTags}>
                  {getOfferedSkills(creator.skills).map(sk => (
                    <span key={sk.skill_name} className="tag tag-primary" style={{ fontSize: 11 }}>{sk.skill_name}</span>
                  ))}
                </div>
                <p style={s.creatorBio}>{creator.bio?.slice(0, 70)}{creator.bio?.length > 70 ? '...' : ''}</p>
                <button
                  style={s.requestBtn}
                  onClick={() => navigate(`/profile/${creator.id}`)}
                  className="btn btn-primary btn-sm"
                >
                  Request Service
                </button>
              </div>
            ))}
            {creators.length === 0 && (
              <div style={s.empty}>
                <p style={{ color: '#64748b' }}>No creators found yet. Be the first to explore!</p>
                <Link to="/explore" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Explore Creators</Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Recent Requests */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Recent Requests</h2>
          <Link to="/requests" style={s.seeAll}>View all →</Link>
        </div>
        <div style={s.requestsList}>
          {requests.slice(0, 3).map(req => (
            <div key={req.id} style={s.requestItem}>
              <div style={s.requestLeft}>
                <span style={{ ...s.reqStatus, color: statusColor[req.status] || '#94a3b8' }}>
                  ● {req.status}
                </span>
                <h4 style={s.reqTitle}>{req.title}</h4>
                <p style={s.reqMeta}>
                  {req.requester_id === user?.id ? `To: ${req.provider_name || 'Open'}` : `From: ${req.requester_name}`}
                  {' · '}<span style={{ color: '#6366f1' }}>{req.credit_amount} credits</span>
                </p>
                <p style={s.reqDesc}>{req.description?.slice(0, 80)}...</p>
              </div>
              {req.status === 'pending' && req.provider_id === user?.id && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => requestsAPI.accept(req.id).then(() => window.location.reload())}
                >
                  Mark as accepted
                </button>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <div style={s.empty}>
              <p style={{ color: '#64748b' }}>No requests yet. Create your first service request!</p>
              <Link to="/requests" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>New Request</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 12 },
  welcome: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 15 },
  bonusBtn: { whiteSpace: 'nowrap' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 40 },
  statCard: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: '20px', textAlign: 'center' },
  statIcon: { fontSize: 24, marginBottom: 8, display: 'block' },
  statValue: { fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 40 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 },
  seeAll: { color: '#6366f1', fontSize: 14, textDecoration: 'none' },
  creatorsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  loadingRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 },
  skeleton: { height: 220, background: 'rgba(99,102,241,0.05)', borderRadius: 16, animation: 'pulse 1.5s ease infinite' },
  creatorCard: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  creatorAvatar: { width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'white' },
  creatorName: { fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 600 },
  creatorMeta: { display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' },
  dot: { color: '#475569' },
  skillTags: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  creatorBio: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5, flex: 1 },
  requestBtn: { alignSelf: 'stretch' },
  requestsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  requestItem: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  requestLeft: { flex: 1 },
  reqStatus: { fontSize: 12, fontWeight: 600, textTransform: 'capitalize' },
  reqTitle: { fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 600, margin: '4px 0' },
  reqMeta: { fontSize: 13, color: '#94a3b8' },
  reqDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  empty: { textAlign: 'center', padding: 40, background: '#1a1a2e', borderRadius: 16, border: '1px dashed rgba(99,102,241,0.2)' },
};