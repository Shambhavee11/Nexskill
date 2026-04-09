import React, { useState, useEffect } from 'react';
import { requestsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = { pending: '#f59e0b', accepted: '#10b981', in_progress: '#06b6d4', completed: '#6ee7b7', cancelled: '#ef4444' };
const STATUS_LABELS = { pending: '⏳ Pending', accepted: '✅ Accepted', in_progress: '🔄 In Progress', completed: '✓ Completed', cancelled: '✗ Cancelled' };

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [form, setForm] = useState({ skill_required: '', title: '', description: '', credit_amount: '', deadline: '' });
  const [review, setReview] = useState({ rating: 5, comment: '', professionalism: 5, timeliness: 5, quality: 5 });
  const [formError, setFormError] = useState('');

  const fetchRequests = () => {
    setLoading(true);
    requestsAPI.getAll({ type: filter })
      .then(res => setRequests(res.data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await requestsAPI.create({ ...form, credit_amount: parseInt(form.credit_amount) });
      setShowModal(false);
      setForm({ skill_required: '', title: '', description: '', credit_amount: '', deadline: '' });
      fetchRequests();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create request');
    }
  };

  const handleAccept = async (id) => {
    setActionLoading(id);
    try { await requestsAPI.accept(id); fetchRequests(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleComplete = async (id) => {
    setActionLoading(id);
    try { await requestsAPI.complete(id); fetchRequests(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await requestsAPI.review(showReviewModal, review);
      setShowReviewModal(null);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <div className="page">
      <div style={s.header}>
        <h1 style={s.title}>Service Requests</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Request</button>
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {['all', 'sent', 'received'].map(tab => (
          <button key={tab} style={{ ...s.tab, ...(filter === tab ? s.tabActive : {}) }} onClick={() => setFilter(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div style={s.loadingList}>{Array(3).fill(0).map((_, i) => <div key={i} style={s.skeleton} />)}</div>
      ) : (
        <div style={s.list}>
          {requests.map(req => (
            <div key={req.id} style={s.card}>
              <div style={s.cardLeft}>
                <div style={s.cardTop}>
                  <span style={{ ...s.status, color: STATUS_COLORS[req.status] || '#94a3b8' }}>
                    {STATUS_LABELS[req.status] || req.status}
                  </span>
                  <span className="tag tag-primary" style={{ fontSize: 11 }}>{req.skill_required}</span>
                  <span style={s.credits}>⟡ {req.credit_amount} credits</span>
                </div>
                <h3 style={s.cardTitle}>{req.title}</h3>
                <p style={s.cardMeta}>
                  {req.requester_id === user?.id
                    ? `To: ${req.provider_name || 'Open for anyone'}`
                    : `From: ${req.requester_name}`}
                  {req.deadline && <span style={{ marginLeft: 8, color: '#64748b' }}>· Due: {new Date(req.deadline).toLocaleDateString()}</span>}
                </p>
                <p style={s.cardDesc}>{req.description}</p>
              </div>
              <div style={s.cardActions}>
                {req.status === 'pending' && req.provider_id === user?.id && (
                  <button className="btn btn-primary btn-sm" disabled={actionLoading === req.id}
                    onClick={() => handleAccept(req.id)}>
                    {actionLoading === req.id ? '...' : 'Accept'}
                  </button>
                )}
                {(req.status === 'accepted' || req.status === 'in_progress') && req.requester_id === user?.id && (
                  <button className="btn btn-primary btn-sm" disabled={actionLoading === req.id}
                    onClick={() => handleComplete(req.id)}>
                    {actionLoading === req.id ? '...' : 'Mark Complete'}
                  </button>
                )}
                {req.status === 'completed' && (
                  <button className="btn btn-outline btn-sm" onClick={() => setShowReviewModal(req.id)}>
                    Leave Review
                  </button>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div style={s.empty}>
              <p style={{ color: '#64748b' }}>No requests found. Create your first service request!</p>
            </div>
          )}
        </div>
      )}

      {/* Create Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>New Service Request</h2>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleCreate} style={s.form}>
              <div className="form-group">
                <label className="form-label">Skill Required</label>
                <input className="form-input" placeholder="e.g. React Development, Logo Design" required
                  value={form.skill_required} onChange={e => setForm({ ...form, skill_required: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Request Title</label>
                <input className="form-input" placeholder="Brief title for your request" required
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} placeholder="Describe what you need in detail" required
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Credits to Offer</label>
                  <input className="form-input" type="number" min={1} placeholder="e.g. 25" required
                    value={form.credit_amount} onChange={e => setForm({ ...form, credit_amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline (optional)</label>
                  <input className="form-input" type="date"
                    value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Leave a Review</h2>
            <form onSubmit={handleReview} style={s.form}>
              {['rating', 'professionalism', 'timeliness', 'quality'].map(field => (
                <div key={field} className="form-group">
                  <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)} (1-5)</label>
                  <input className="form-input" type="number" min={1} max={5} required
                    value={review[field]} onChange={e => setReview({ ...review, [field]: parseInt(e.target.value) })} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea className="form-input" rows={3} placeholder="Share your experience..."
                  value={review.comment} onChange={e => setReview({ ...review, comment: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReviewModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700 },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' },
  tab: { padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, background: 'transparent', color: '#94a3b8', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' },
  tabActive: { background: '#6366f1', color: 'white' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  loadingList: { display: 'flex', flexDirection: 'column', gap: 12 },
  skeleton: { height: 120, background: 'rgba(99,102,241,0.05)', borderRadius: 14 },
  card: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  cardLeft: { flex: 1 },
  cardTop: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  status: { fontSize: 12, fontWeight: 600 },
  credits: { marginLeft: 'auto', color: '#a5b4fc', fontWeight: 600, fontSize: 13 },
  cardTitle: { fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#94a3b8', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.5 },
  cardActions: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 },
  empty: { textAlign: 'center', padding: '60px 40px', background: '#1a1a2e', borderRadius: 14, border: '1px dashed rgba(99,102,241,0.2)' },
  modalTitle: { fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
};