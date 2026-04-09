import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (user) {
      notificationsAPI.getAll().then(res => setNotifications(res.data.notifications)).catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/explore', label: 'Explore' },
    { to: '/requests', label: 'Requests' },
    { to: '/chat', label: 'Chat' },
    { to: '/history', label: 'History' },
  ];

  const isActive = (path) => location.pathname === path;

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/dashboard" style={styles.logo}>
          <span style={styles.logoIcon}>⟡</span>
          <span style={styles.logoText}>NEXSKILL</span>
        </Link>

        {/* Nav links */}
        <div style={styles.links}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{ ...styles.link, ...(isActive(link.to) ? styles.linkActive : {}) }}
            >
              {link.label}
              {isActive(link.to) && <span style={styles.linkDot} />}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={styles.right}>
          {/* Credits */}
          <div style={styles.credits}>
            <span style={styles.creditsIcon}>⟡</span>
            <span style={styles.creditsNum}>{user?.credit_balance ?? 0}</span>
            <span style={styles.creditsLabel}>credits</span>
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button style={styles.iconBtn} onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false); }}>
              🔔
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </button>
            {showNotifs && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>Notifications</div>
                {notifications.length === 0
                  ? <div style={styles.dropdownEmpty}>No notifications</div>
                  : notifications.slice(0, 5).map(n => (
                    <div key={n.id} style={{ ...styles.notifItem, ...(n.is_read ? {} : styles.notifUnread) }}>
                      <div style={styles.notifTitle}>{n.title}</div>
                      <div style={styles.notifMsg}>{n.message}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Avatar menu */}
          <div style={{ position: 'relative' }}>
            <button style={styles.avatarBtn} onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}>
              <div style={styles.avatar}>{getInitials(user?.full_name)}</div>
            </button>
            {showMenu && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>{user?.full_name}</div>
                <Link to="/profile" style={styles.dropdownItem} onClick={() => setShowMenu(false)}>👤 My Profile</Link>
                <button style={{ ...styles.dropdownItem, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }} onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      {(showNotifs || showMenu) && (
        <div style={styles.overlay} onClick={() => { setShowNotifs(false); setShowMenu(false); }} />
      )}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
    background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(99,102,241,0.15)', height: 64,
  },
  inner: {
    maxWidth: 1200, margin: '0 auto', padding: '0 24px',
    height: '100%', display: 'flex', alignItems: 'center', gap: 32,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  logoIcon: { fontSize: 22, color: '#6366f1' },
  logoText: {
    fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18,
    background: 'linear-gradient(135deg, #a5b4fc, #06b6d4)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  links: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 },
  link: {
    position: 'relative', padding: '6px 12px', borderRadius: 8,
    fontSize: 14, fontWeight: 500, color: '#94a3b8',
    textDecoration: 'none', transition: 'color 0.2s',
  },
  linkActive: { color: '#a5b4fc' },
  linkDot: {
    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: 4, height: 4, borderRadius: '50%', background: '#6366f1',
  },
  right: { display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' },
  credits: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 20, padding: '6px 14px',
  },
  creditsIcon: { fontSize: 14, color: '#6366f1' },
  creditsNum: { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#a5b4fc' },
  creditsLabel: { fontSize: 12, color: '#64748b' },
  iconBtn: {
    position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.15)',
    borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontSize: 16,
  },
  badge: {
    position: 'absolute', top: -4, right: -4, background: '#ef4444',
    color: 'white', borderRadius: '50%', width: 18, height: 18,
    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
  },
  avatarBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  avatar: {
    width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'white',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1001,
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#64748b',
    borderBottom: '1px solid rgba(99,102,241,0.1)',
  },
  dropdownEmpty: { padding: '16px', fontSize: 13, color: '#64748b', textAlign: 'center' },
  dropdownItem: {
    display: 'block', padding: '10px 16px', fontSize: 14, color: '#f1f5f9',
    textDecoration: 'none', transition: 'background 0.15s',
  },
  notifItem: { padding: '10px 16px', borderBottom: '1px solid rgba(99,102,241,0.08)', cursor: 'pointer' },
  notifUnread: { background: 'rgba(99,102,241,0.05)' },
  notifTitle: { fontSize: 13, fontWeight: 600, color: '#f1f5f9' },
  notifMsg: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  overlay: { position: 'fixed', inset: 0, zIndex: 999 },
};