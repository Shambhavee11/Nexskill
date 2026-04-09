import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo}><span style={s.logoIcon}>⟡</span><span style={s.logoText}>NEXSKILL</span></div>
          <div style={s.navLinks}>
            <Link to="/login" style={s.navLink}>Log in</Link>
            <Link to="/register" style={s.navBtn}>Sign up</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroBg} />
        <div style={s.heroContent}>
          <div style={s.heroBadge}>✦ The future of skill exchange</div>
          <h1 style={s.heroTitle}>
            Trade Skills,<br />
            <span style={s.heroAccent}>Not Money</span>
          </h1>
          <p style={s.heroSub}>
            NexSkill connects talented people who want to exchange skills using a credit-based system. No cash needed — just talent.
          </p>
          <div style={s.heroCtas}>
            <Link to="/register" style={s.ctaPrimary}>Start Exchanging Skills →</Link>
            <Link to="/login" style={s.ctaSecondary}>Log in</Link>
          </div>
        </div>
        {/* Floating cards */}
        <div style={s.floatCard1}><span style={s.floatIcon}>🎨</span> UI Design · 25 credits</div>
        <div style={s.floatCard2}><span style={s.floatIcon}>⚡</span> React Dev · 40 credits</div>
        <div style={s.floatCard3}><span style={s.floatIcon}>📸</span> Photography · 30 credits</div>
      </section>

      {/* For Everyone */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>For Everyone</h2>
        <p style={s.sectionSub}>NexSkill is built for a diverse community of creators, professionals, and learners.</p>
        <div style={s.grid}>
          {[
            { icon: '🎨', title: 'Freelancers & Creators', desc: 'Build your portfolio and exchange services with other professionals without paying fees.' },
            { icon: '🎓', title: 'Students', desc: 'Learn new skills from experienced professionals while teaching what you know.' },
            { icon: '🏪', title: 'Small Business Owners', desc: 'Get support for your business by exchanging services with specialists.' },
            { icon: '🪡', title: 'Artists & Designers', desc: 'Collaborate, grow, and explore new opportunities within our creative community.' },
            { icon: '🚀', title: 'Aspiring Professionals', desc: 'Gain real experience and build credibility while helping others in your field.' },
            { icon: '🔄', title: 'Career Switchers', desc: 'Learn new skills from mentors while offering your existing expertise.' },
          ].map(item => (
            <div key={item.title} style={s.card}>
              <div style={s.cardIcon}>{item.icon}</div>
              <h3 style={s.cardTitle}>{item.title}</h3>
              <p style={s.cardDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...s.section, background: 'rgba(99,102,241,0.03)', borderRadius: 24, margin: '0 24px' }}>
        <h2 style={s.sectionTitle}>How It Works</h2>
        <div style={s.steps}>
          {[
            { num: '01', title: 'Create Your Profile', desc: 'Sign up and list your skills — both what you offer and what you need.' },
            { num: '02', title: 'Discover & Connect', desc: 'Browse recommended creators or search by skill, rating, and category.' },
            { num: '03', title: 'Exchange & Grow', desc: 'Request services, transfer credits on completion, and leave reviews.' },
          ].map(step => (
            <div key={step.num} style={s.step}>
              <div style={s.stepNum}>{step.num}</div>
              <div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={s.ctaSection}>
        <h2 style={s.ctaTitle}>Ready to start exchanging?</h2>
        <p style={s.ctaSub}>Join thousands of creators building their network without financial barriers.</p>
        <Link to="/register" style={s.ctaPrimary}>Get Started Free →</Link>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.logo}><span style={s.logoIcon}>⟡</span><span style={s.logoText}>NEXSKILL</span></div>
          <p style={s.footerTagline}>Exchange skills, earn credits, grow together.</p>
          <div style={s.footerLinks}>
            <span style={s.footerLink}>Platform</span>
            <span style={s.footerLink}>About</span>
            <span style={s.footerLink}>Privacy Policy</span>
            <span style={s.footerLink}>Terms of Service</span>
          </div>
          <p style={s.footerCopy}>© 2026 NexSkill. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const s = {
  page: { background: '#0f0f1a', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'DM Sans, sans-serif', overflowX: 'hidden' },
  nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(99,102,241,0.15)', height: 64 },
  navInner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { fontSize: 22, color: '#6366f1' },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg,#a5b4fc,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 12 },
  navLink: { color: '#94a3b8', fontSize: 14, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' },
  navBtn: { background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', fontSize: 14, padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 500 },
  hero: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64, overflow: 'hidden' },
  heroBg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' },
  heroContent: { textAlign: 'center', maxWidth: 680, padding: '0 24px', position: 'relative', zIndex: 1 },
  heroBadge: { display: 'inline-block', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#a5b4fc', marginBottom: 24 },
  heroTitle: { fontFamily: 'Syne, sans-serif', fontSize: 'clamp(48px,8vw,80px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 },
  heroAccent: { background: 'linear-gradient(135deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSub: { fontSize: 18, color: '#94a3b8', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' },
  heroCtas: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  ctaPrimary: { background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' },
  ctaSecondary: { background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', fontSize: 15, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' },
  floatCard1: { position: 'absolute', top: '25%', left: '8%', background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#a5b4fc', backdropFilter: 'blur(8px)', animation: 'float1 3s ease-in-out infinite' },
  floatCard2: { position: 'absolute', top: '45%', right: '6%', background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#67e8f9', backdropFilter: 'blur(8px)', animation: 'float2 4s ease-in-out infinite' },
  floatCard3: { position: 'absolute', bottom: '25%', left: '10%', background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#6ee7b7', backdropFilter: 'blur(8px)', animation: 'float3 3.5s ease-in-out infinite' },
  floatIcon: { marginRight: 6 },
  section: { maxWidth: 1200, margin: '80px auto', padding: '60px 24px' },
  sectionTitle: { fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, textAlign: 'center', marginBottom: 12 },
  sectionSub: { color: '#94a3b8', textAlign: 'center', fontSize: 16, marginBottom: 48 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  card: { background: 'rgba(26,26,46,0.8)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 24 },
  cardIcon: { fontSize: 28, marginBottom: 12 },
  cardTitle: { fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#94a3b8', lineHeight: 1.6 },
  steps: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' },
  step: { display: 'flex', gap: 20, alignItems: 'flex-start', background: 'rgba(26,26,46,0.5)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 14, padding: 20 },
  stepNum: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: '#6366f1', minWidth: 50 },
  stepTitle: { fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, marginBottom: 6 },
  stepDesc: { fontSize: 14, color: '#94a3b8', lineHeight: 1.6 },
  ctaSection: { textAlign: 'center', padding: '80px 24px', maxWidth: 600, margin: '0 auto' },
  ctaTitle: { fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, marginBottom: 12 },
  ctaSub: { color: '#94a3b8', fontSize: 16, marginBottom: 32 },
  footer: { background: 'rgba(26,26,46,0.5)', borderTop: '1px solid rgba(99,102,241,0.1)', padding: '40px 24px' },
  footerInner: { maxWidth: 1200, margin: '0 auto', textAlign: 'center' },
  footerTagline: { color: '#64748b', fontSize: 14, margin: '8px 0 20px' },
  footerLinks: { display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' },
  footerLink: { fontSize: 13, color: '#64748b', cursor: 'pointer' },
  footerCopy: { fontSize: 12, color: '#475569' },
};