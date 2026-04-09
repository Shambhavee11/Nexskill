import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─── SHARED AUTH LAYOUT ───────────────────────────────────── */
function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={s.page}>
      <div style={s.bg} />
      <div style={s.card}>
        <Link to="/" style={s.logo}>
          <span style={s.logoIcon}>⟡</span>
          <span style={s.logoText}>NEXSKILL</span>
        </Link>
        <h1 style={s.title}>{title}</h1>
        <p style={s.subtitle}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

/* ─── REGISTER PAGE ────────────────────────────────────────── */
export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=account, 2=skills
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      navigate('/verify-otp', { state: { userId: res.data.userId, email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join NexSkill and start exchanging skills today">
      {/* Step indicator */}
      <div style={s.steps}>
        {['Account', 'Verify'].map((label, i) => (
          <React.Fragment key={label}>
            <div style={{ ...s.stepDot, ...(i === 0 ? s.stepActive : s.stepInactive) }}>
              <span style={s.stepNum}>{i + 1}</span>
            </div>
            <span style={{ ...s.stepLabel, ...(i === 0 ? s.stepLabelActive : {}) }}>{label}</span>
            {i < 1 && <div style={s.stepLine} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} style={s.form}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input name="full_name" value={form.full_name} onChange={handleChange}
            className="form-input" placeholder="John Doe" required />
        </div>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="form-input" placeholder="you@example.com" required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input name="password" type="password" value={form.password} onChange={handleChange}
            className="form-input" placeholder="At least 6 characters" required minLength={6} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
          {loading ? 'Creating account...' : 'Next →'}
        </button>
      </form>

      <p style={s.switchText}>
        Already have an account? <Link to="/login" style={s.switchLink}>Log in</Link>
      </p>
    </AuthLayout>
  );
}

/* ─── LOGIN PAGE ───────────────────────────────────────────── */
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        navigate('/verify-otp', { state: { userId: data.userId, email: form.email } });
      } else {
        setError(data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your NexSkill account">
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} style={s.form}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="form-input" placeholder="you@example.com" required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input name="password" type="password" value={form.password} onChange={handleChange}
            className="form-input" placeholder="Your password" required />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p style={s.switchText}>
        Don't have an account? <Link to="/register" style={s.switchLink}>Sign up</Link>
      </p>
    </AuthLayout>
  );
}

/* ─── OTP PAGE ─────────────────────────────────────────────── */
export function OTPPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = require('react-router-dom').useLocation();
  const { userId, email } = location.state || {};
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP({ userId, otp });
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Set user in context
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendOTP(userId);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {}
  };

  return (
    <AuthLayout title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email || 'your email'}`}>
      {error && <div className="alert alert-error">{error}</div>}
      {resent && <div className="alert alert-success">OTP resent successfully!</div>}

      <form onSubmit={handleSubmit} style={s.form}>
        <div className="form-group">
          <label className="form-label">One-Time Password</label>
          <input
            value={otp} onChange={(e) => setOtp(e.target.value)}
            className="form-input" placeholder="000000" maxLength={6}
            style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center', fontFamily: 'Syne, sans-serif' }}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <p style={s.switchText}>
        Didn't receive it?{' '}
        <button onClick={handleResend} style={{ ...s.switchLink, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
          Resend OTP
        </button>
      </p>
    </AuthLayout>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' },
  card: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 },
  logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 28, justifyContent: 'center' },
  logoIcon: { fontSize: 24, color: '#6366f1' },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, background: 'linear-gradient(135deg,#a5b4fc,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  title: { fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#f1f5f9', textAlign: 'center' },
  subtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 28 },
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stepActive: { background: '#6366f1' },
  stepInactive: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(99,102,241,0.2)' },
  stepNum: { fontSize: 12, fontWeight: 700, color: 'white', fontFamily: 'Syne, sans-serif' },
  stepLabel: { fontSize: 12, color: '#64748b' },
  stepLabelActive: { color: '#a5b4fc' },
  stepLine: { flex: 1, height: 1, background: 'rgba(99,102,241,0.2)', maxWidth: 40 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  switchText: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' },
  switchLink: { color: '#6366f1', textDecoration: 'none', fontWeight: 500 },
};