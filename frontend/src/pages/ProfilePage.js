import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usersAPI, requestsAPI, messagesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─── STAR COMPONENT ─────────────────────────────────────────── */
const Stars = ({ rating, size = 14 }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ fontSize: size, letterSpacing: 1, color: '#f59e0b' }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
};

/* ─── SKILL TAG ──────────────────────────────────────────────── */
const SkillTag = ({ skill, isOwn, onDelete }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    background: skill.skill_type === 'offered' ? 'rgba(99,102,241,0.12)' : 'rgba(6,182,212,0.12)',
    color: skill.skill_type === 'offered' ? '#a5b4fc' : '#67e8f9',
    border: `1px solid ${skill.skill_type === 'offered' ? 'rgba(99,102,241,0.25)' : 'rgba(6,182,212,0.25)'}`,
  }}>
    {skill.skill_name}
    {skill.proficiency && <span style={{ fontSize: 10, opacity: 0.6 }}>· {skill.proficiency}</span>}
    {isOwn && (
      <button
        onClick={() => onDelete(skill.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'currentColor',
          opacity: 0.5,
          padding: 0,
          fontSize: 11,
          lineHeight: 1
        }}
      >
        ✕
      </button>
    )}
  </span>
);

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', avatar_url: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Skill modal
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillForm, setSkillForm] = useState({
    skill_name: '',
    skill_type: 'offered',
    category: '',
    proficiency: 'intermediate'
  });
  const [skillSaving, setSkillSaving] = useState(false);

  // Request modal
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    skill_required: '',
    title: '',
    description: '',
    credit_amount: '',
    deadline: ''
  });
  const [reqSaving, setReqSaving] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');

  // Portfolio modal
  const [showPortModal, setShowPortModal] = useState(false);
  const [portForm, setPortForm] = useState({
    title: '',
    description: '',
    image_url: '',
    project_url: '',
    tags: ''
  });

  /* ── Load Profile ── */
  const loadProfile = () => {
    const id = userId || currentUser?.id;
    if (!id) return;

    setLoading(true);
    usersAPI.getUser(id)
      .then(res => {
        setProfile(res.data.user);
        setReviews(res.data.reviews || []);
        if (isOwnProfile) {
          setEditForm({
            full_name: res.data.user.full_name,
            bio: res.data.user.bio || '',
            avatar_url: res.data.user.avatar_url || ''
          });
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [userId, currentUser?.id]);

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const offeredSkills = (profile?.skills || []).filter(s => s.skill_type === 'offered');
  const neededSkills = (profile?.skills || []).filter(s => s.skill_type === 'needed');
  const portfolio = profile?.portfolio || [];

  /* ── Handlers ── */
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      const res = await usersAPI.updateProfile(editForm);
      updateUser(res.data.user);
      setProfile(p => ({ ...p, ...res.data.user }));
      setEditMode(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Save failed');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!window.confirm('Remove this skill?')) return;
    try {
      await usersAPI.deleteSkill(skillId);
      setProfile(p => ({ ...p, skills: p.skills.filter(s => s.id !== skillId) }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    setSkillSaving(true);
    try {
      await usersAPI.addSkill(skillForm);
      setShowSkillModal(false);
      setSkillForm({
        skill_name: '',
        skill_type: 'offered',
        category: '',
        proficiency: 'intermediate'
      });
      loadProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    } finally {
      setSkillSaving(false);
    }
  };

  const handleAddPortfolio = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...portForm,
        tags: portForm.tags
          ? portForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : [],
      };

      await usersAPI.addPortfolioItem(payload);

      setShowPortModal(false);
      setPortForm({
        title: '',
        description: '',
        image_url: '',
        project_url: '',
        tags: '',
      });

      loadProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add portfolio item');
    }
  };

  const handleDeletePortfolio = async (itemId) => {
    if (!window.confirm('Delete this portfolio item?')) return;

    try {
      await usersAPI.deletePortfolioItem(itemId);
      setProfile(prev => ({
        ...prev,
        portfolio: (prev.portfolio || []).filter(item => item.id !== itemId),
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete portfolio item');
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setReqError('');
    setReqSaving(true);

    try {
      const skill =
        reqForm.skill_required === 'custom'
          ? reqForm._custom_skill
          : reqForm.skill_required;

      await requestsAPI.create({
        ...reqForm,
        skill_required: skill,
        provider_id: profile.id,
        credit_amount: parseInt(reqForm.credit_amount, 10)
      });

      setReqSuccess(`Request sent to ${profile.full_name}!`);
      setReqForm({
        skill_required: '',
        title: '',
        description: '',
        credit_amount: '',
        deadline: ''
      });

      setTimeout(() => {
        setShowReqModal(false);
        setReqSuccess('');
      }, 2000);
    } catch (err) {
      setReqError(err.response?.data?.message || 'Failed');
    } finally {
      setReqSaving(false);
    }
  };

  const handleStartChat = async () => {
    console.log('FUNCTION STARTED');

    try {
      if (!profile?.id) {
        alert('Profile not loaded yet');
        return;
      }

      console.log('Profile ID:', profile.id);

      const res = await messagesAPI.startConversation(profile.id);
      console.log('API RESPONSE:', res.data);

      const conversationId =
        res.data?.conversation?.id ||
        res.data?.conversationId ||
        res.data?.id;

      if (!conversationId) {
        console.error('No conversation ID returned:', res.data);
        alert('Conversation could not be started');
        return;
      }

      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error('ERROR:', error);
      alert(error.response?.data?.message || 'Could not start chat');
    }
  };

  /* ── Loading / Not Found ── */
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (!profile) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>Profile not found</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          This user doesn't exist or has been removed.
        </p>
        <Link to="/explore" className="btn btn-primary">← Back to Explore</Link>
      </div>
    );
  }

  const trustColor =
    profile.trust_score >= 80 ? '#10b981'
      : profile.trust_score >= 50 ? '#f59e0b'
        : '#ef4444';

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={s.headerGlow} />

        {editMode ? (
          <form onSubmit={handleSaveEdit} style={s.editForm}>
            <h2 style={s.editTitle}>✏ Edit Profile</h2>
            {editError && <div className="alert alert-error">{editError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={editForm.full_name}
                  required
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Avatar URL (optional)</label>
                <input
                  className="form-input"
                  value={editForm.avatar_url}
                  placeholder="https://..."
                  onChange={e => setEditForm({ ...editForm, avatar_url: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Tell the community about yourself and what you do..."
                value={editForm.bio}
                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditMode(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editSaving}>
                {editSaving ? 'Saving...' : '✓ Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div style={s.headerContent}>
            {/* Avatar */}
            <div style={s.avatarWrap}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} style={{ ...s.avatar, objectFit: 'cover' }} />
                : <div style={s.avatar}>{getInitials(profile.full_name)}</div>
              }
              {profile.is_premium && <span style={s.premiumBadge} title="Premium">⭐</span>}
              {profile.is_verified && <span style={s.verifiedBadge} title="Verified">✓</span>}
            </div>

            {/* Info */}
            <div style={s.headerInfo}>
              <div style={s.nameRow}>
                <h1 style={s.name}>{profile.full_name}</h1>
                {profile.is_premium && <span className="tag tag-amber" style={{ fontSize: 11 }}>Premium</span>}
              </div>
              <div style={s.statsRow}>
                <div style={s.statChip}><span style={{ color: '#f59e0b' }}>★</span><strong>{parseFloat(profile.rating || 0).toFixed(1)}</strong><span style={s.chipLabel}>rating</span></div>
                <div style={s.dividerV} />
                <div style={s.statChip}><span style={{ color: trustColor }}>◉</span><strong>{profile.trust_score || 50}</strong><span style={s.chipLabel}>trust</span></div>
                <div style={s.dividerV} />
                <div style={s.statChip}><span style={{ color: '#a5b4fc' }}>✓</span><strong>{profile.completed_projects || 0}</strong><span style={s.chipLabel}>projects</span></div>
                <div style={s.dividerV} />
                <div style={s.statChip}><span style={{ color: '#67e8f9' }}>💬</span><strong>{profile.total_reviews || 0}</strong><span style={s.chipLabel}>reviews</span></div>
              </div>
              <p style={s.bio}>{profile.bio || 'No bio provided yet.'}</p>
              {isOwnProfile && (
                <div style={s.creditChip}>
                  <span style={{ color: '#6366f1' }}>⟡</span>
                  <strong style={{ color: '#a5b4fc' }}>{profile.credit_balance}</strong>
                  <span style={{ color: '#64748b', fontSize: 12 }}>credits available</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={s.actions}>
              {isOwnProfile ? (
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditMode(true)}>
                    ✏ Edit Profile
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setSkillForm({
                        skill_name: '',
                        skill_type: 'offered',
                        category: '',
                        proficiency: 'intermediate'
                      });
                      setShowSkillModal(true);
                    }}
                  >
                    + Add Skill
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => setShowReqModal(true)}>
                    ⟡ Request Service
                  </button>

                  <button
                    className="btn btn-outline"
                    style={{ position: 'relative', zIndex: 30, pointerEvents: 'auto' }}
                    onClick={() => {
                      console.log('BUTTON CLICKED');
                      alert('clicked');
                      handleStartChat();
                    }}
                  >
                    💬 Message
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={s.tabs}>
        {[
          { key: 'overview', label: '👤 Overview' },
          { key: 'portfolio', label: '🗂 Portfolio' },
          { key: 'reviews', label: `★ Reviews${reviews.length ? ` (${reviews.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            style={{ ...s.tab, ...(activeTab === tab.key ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={s.panel}>
          <div>
            <div style={s.panelSectionHead}>
              <h3 style={s.panelTitle}>🎯 Skills Offered</h3>
              {isOwnProfile && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSkillForm({
                      skill_name: '',
                      skill_type: 'offered',
                      category: '',
                      proficiency: 'intermediate'
                    });
                    setShowSkillModal(true);
                  }}
                >
                  + Add
                </button>
              )}
            </div>

            {offeredSkills.length > 0
              ? <div style={s.tagRow}>{offeredSkills.map(sk => <SkillTag key={sk.id} skill={sk} isOwn={isOwnProfile} onDelete={handleDeleteSkill} />)}</div>
              : <p style={s.emptyTxt}>No skills offered yet.</p>}
          </div>

          <div style={s.hr} />

          <div>
            <div style={s.panelSectionHead}>
              <h3 style={s.panelTitle}>🔍 Skills Needed</h3>
              {isOwnProfile && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSkillForm({
                      skill_name: '',
                      skill_type: 'needed',
                      category: '',
                      proficiency: 'intermediate'
                    });
                    setShowSkillModal(true);
                  }}
                >
                  + Add
                </button>
              )}
            </div>

            {neededSkills.length > 0
              ? <div style={s.tagRow}>{neededSkills.map(sk => <SkillTag key={sk.id} skill={sk} isOwn={isOwnProfile} onDelete={handleDeleteSkill} />)}</div>
              : <p style={s.emptyTxt}>No skills needed listed yet.</p>}
          </div>

          {reviews.length > 0 && (
            <>
              <div style={s.hr} />
              <div>
                <h3 style={{ ...s.panelTitle, marginBottom: 16 }}>📊 Rating Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Professionalism', key: 'professionalism' },
                    { label: 'Quality of Work', key: 'quality' },
                    { label: 'Timeliness', key: 'timeliness' },
                  ].map(({ label, key }) => {
                    const vals = reviews.filter(r => r[key]);
                    const avg = vals.length ? vals.reduce((a, r) => a + r[key], 0) / vals.length : 0;

                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 160, fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(avg / 5) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#06b6d4)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ width: 32, fontSize: 13, fontWeight: 600, color: '#a5b4fc', textAlign: 'right' }}>{avg.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {activeTab === 'portfolio' && (
        <div style={s.panel}>
          <div style={s.panelSectionHead}>
            <h3 style={s.panelTitle}>🗂 Portfolio</h3>
            {isOwnProfile && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowPortModal(true)}>
                + Add Item
              </button>
            )}
          </div>

          {portfolio.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                gap: 16,
                marginTop: 16
              }}
            >
              {portfolio.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: '#0f0f1a',
                    border: '1px solid rgba(99,102,241,0.12)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      style={s.deletePortfolioBtn}
                      title="Delete portfolio item"
                    >
                      ✕
                    </button>
                  )}

                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 140,
                        background: 'rgba(99,102,241,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 32
                      }}
                    >
                      🖼
                    </div>
                  )}

                  <div style={{ padding: 14 }}>
                    <h4 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                      {item.title}
                    </h4>

                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 }}>
                      {item.description}
                    </p>

                    {item.tags?.length > 0 && (
                      <div style={s.tagRow}>
                        {item.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="tag tag-primary" style={{ fontSize: 10 }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.project_url && (
                      <a
                        href={item.project_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          color: '#6366f1',
                          display: 'block',
                          marginTop: 8
                        }}
                      >
                        View project →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>🗂</div>
              <p style={{ color: '#64748b', marginBottom: 16 }}>No portfolio items yet.</p>
              {isOwnProfile && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowPortModal(true)}>
                  Add Your First Item
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={s.panelTitle}>★ Reviews ({reviews.length})</h3>
            {reviews.length > 0 && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
                  {parseFloat(profile.rating || 0).toFixed(1)}
                </span>
                <div>
                  <Stars rating={parseFloat(profile.rating || 0)} size={16} />
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reviews.map(rev => (
                <div key={rev.id} style={{ background: '#0f0f1a', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 14, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'white' }}>
                        {getInitials(rev.reviewer_name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{rev.reviewer_name}</div>
                        <Stars rating={rev.rating} size={13} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: '#475569' }}>
                      {new Date(rev.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {rev.comment && (
                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 10 }}>
                      "{rev.comment}"
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {rev.professionalism && <span style={s.subRating}>Professionalism: <strong>{rev.professionalism}/5</strong></span>}
                    {rev.quality && <span style={s.subRating}>Quality: <strong>{rev.quality}/5</strong></span>}
                    {rev.timeliness && <span style={s.subRating}>Timeliness: <strong>{rev.timeliness}/5</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>⭐</div>
              <p style={{ color: '#64748b' }}>No reviews yet. Complete a project to get your first review!</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}

      {/* Request Service */}
      {showReqModal && (
        <div className="modal-overlay" onClick={() => setShowReqModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Request Service from {profile.full_name}</h2>
            {reqError && <div className="alert alert-error">{reqError}</div>}
            {reqSuccess && <div className="alert alert-success">{reqSuccess}</div>}
            <form onSubmit={handleSendRequest} style={s.form}>
              <div className="form-group">
                <label className="form-label">Skill Required</label>
                <select
                  className="form-input"
                  value={reqForm.skill_required}
                  required
                  onChange={e => setReqForm({ ...reqForm, skill_required: e.target.value })}
                >
                  <option value="">— Select a skill —</option>
                  {offeredSkills.map(sk => <option key={sk.id} value={sk.skill_name}>{sk.skill_name} ({sk.proficiency})</option>)}
                  <option value="custom">Other / Custom</option>
                </select>
              </div>

              {reqForm.skill_required === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Specify Skill</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Video Editing"
                    required
                    onChange={e => setReqForm({ ...reqForm, _custom_skill: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Request Title</label>
                <input
                  className="form-input"
                  required
                  placeholder="What do you need help with?"
                  value={reqForm.title}
                  onChange={e => setReqForm({ ...reqForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                  placeholder="Describe the work — scope, deliverables, references..."
                  value={reqForm.description}
                  onChange={e => setReqForm({ ...reqForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Credits to Offer</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    required
                    placeholder="e.g. 25"
                    value={reqForm.credit_amount}
                    onChange={e => setReqForm({ ...reqForm, credit_amount: e.target.value })}
                  />
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    You have {currentUser?.credit_balance} credits
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline (optional)</label>
                  <input
                    className="form-input"
                    type="date"
                    value={reqForm.deadline}
                    onChange={e => setReqForm({ ...reqForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReqModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={reqSaving}>
                  {reqSaving ? 'Sending...' : '⟡ Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Skill */}
      {showSkillModal && (
        <div className="modal-overlay" onClick={() => setShowSkillModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Add a Skill</h2>
            <form onSubmit={handleAddSkill} style={s.form}>
              <div className="form-group">
                <label className="form-label">Skill Name</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. React, Logo Design, Crochet"
                  value={skillForm.skill_name}
                  onChange={e => setSkillForm({ ...skillForm, skill_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={skillForm.skill_type}
                    onChange={e => setSkillForm({ ...skillForm, skill_type: e.target.value })}
                  >
                    <option value="offered">I Offer This</option>
                    <option value="needed">I Need This</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={skillForm.category}
                    onChange={e => setSkillForm({ ...skillForm, category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {['Development', 'Design', 'Media', 'AI/ML', 'Marketing', 'Writing', 'Music', 'Crafts', 'Education', 'Other'].map(c =>
                      <option key={c} value={c}>{c}</option>
                    )}
                  </select>
                </div>
              </div>

              {skillForm.skill_type === 'offered' && (
                <div className="form-group">
                  <label className="form-label">Proficiency</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['beginner', 'intermediate', 'expert'].map(lvl => (
                      <label
                        key={lvl}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '9px 4px',
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: 'pointer',
                          background: skillForm.proficiency === lvl ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${skillForm.proficiency === lvl ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)'}`,
                          color: skillForm.proficiency === lvl ? '#a5b4fc' : '#94a3b8',
                          transition: 'all 0.15s',
                          fontWeight: skillForm.proficiency === lvl ? 600 : 400
                        }}
                      >
                        <input
                          type="radio"
                          name="proficiency"
                          value={lvl}
                          checked={skillForm.proficiency === lvl}
                          onChange={() => setSkillForm({ ...skillForm, proficiency: lvl })}
                          style={{ display: 'none' }}
                        />
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSkillModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={skillSaving}>
                  {skillSaving ? 'Adding...' : '+ Add Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Add */}
      {showPortModal && (
        <div className="modal-overlay" onClick={() => setShowPortModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Add Portfolio Item</h2>
            <form style={s.form} onSubmit={handleAddPortfolio}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  required
                  placeholder="Project name"
                  value={portForm.title}
                  onChange={e => setPortForm({ ...portForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="What did you build or create?"
                  value={portForm.description}
                  onChange={e => setPortForm({ ...portForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://..."
                    value={portForm.image_url}
                    onChange={e => setPortForm({ ...portForm, image_url: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project URL</label>
                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://..."
                    value={portForm.project_url}
                    onChange={e => setPortForm({ ...portForm, project_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  className="form-input"
                  placeholder="React, UI Design, Mobile"
                  value={portForm.tags}
                  onChange={e => setPortForm({ ...portForm, tags: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowPortModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────── */
const s = {
  header: {
    position: 'relative',
    background: '#1a1a2e',
    border: '1px solid rgba(99,102,241,0.18)',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    overflow: 'hidden'
  },
  headerGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  headerContent: {
    position: 'relative',
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    zIndex: 2
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: 30,
    color: 'white',
    border: '3px solid rgba(99,102,241,0.3)'
  },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, fontSize: 20 },
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    background: '#10b981',
    color: 'white',
    borderRadius: '50%',
    width: 20,
    height: 20,
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    border: '2px solid #0f0f1a'
  },
  headerInfo: { flex: 1, minWidth: 200 },
  nameRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  name: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 },
  statsRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  statChip: { display: 'flex', gap: 4, alignItems: 'center', fontSize: 14 },
  chipLabel: { color: '#64748b', fontSize: 12 },
  dividerV: { width: 1, height: 14, background: 'rgba(255,255,255,0.1)' },
  bio: { color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 520 },
  creditChip: { display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 20, padding: '4px 12px' },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 160,
    flexShrink: 0,
    position: 'relative',
    zIndex: 20,
    pointerEvents: 'auto'
  },
  editForm: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 },
  editTitle: { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4 },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 14, padding: 4 },
  tab: { flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, background: 'transparent', color: '#64748b', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' },
  tabActive: { background: '#6366f1', color: 'white', fontWeight: 600 },
  panel: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 20, padding: 28 },
  panelSectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  panelTitle: { fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600 },
  tagRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  emptyTxt: { color: '#475569', fontSize: 13 },
  hr: { height: 1, background: 'rgba(99,102,241,0.08)', margin: '20px 0' },
  subRating: { fontSize: 12, color: '#64748b', background: 'rgba(99,102,241,0.06)', padding: '3px 10px', borderRadius: 20 },
  modalTitle: { fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  deletePortfolioBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(239,68,68,0.9)',
    color: 'white',
    fontSize: 14,
    fontWeight: 700,
  },
};