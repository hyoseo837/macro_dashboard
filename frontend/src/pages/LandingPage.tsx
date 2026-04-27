import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Clock, LayoutGrid, Shield } from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-[var(--text-dim)]">
        INITIALIZING_SYSTEM...
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="page-title"><span>///</span>Macro</div>
        <div className="landing-nav-links">
          <Link to="/login" className="landing-btn-ghost">Log in</Link>
          <Link to="/register" className="landing-btn-primary">Get started</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <h1>Your markets.<br />Your layout.<br />Your dashboard.</h1>
        <p>
          Track assets, monitor time zones, and build the dashboard that fits how you think.
          Drag, resize, and customize — no noise, just signal.
        </p>
        <div className="landing-hero-cta">
          <Link to="/register" className="landing-btn-primary landing-btn-lg">Start building</Link>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-feature">
          <TrendingUp size={24} />
          <h3>Live prices</h3>
          <p>Real-time data from Yahoo Finance. Sparklines, day ranges, volume — all at a glance.</p>
        </div>
        <div className="landing-feature">
          <Clock size={24} />
          <h3>World clocks</h3>
          <p>Analog or digital. Any timezone. Know when markets open without doing the math.</p>
        </div>
        <div className="landing-feature">
          <LayoutGrid size={24} />
          <h3>Custom grid</h3>
          <p>Drag and drop. Resize freely. Your widgets, your layout — saved automatically.</p>
        </div>
        <div className="landing-feature">
          <Shield size={24} />
          <h3>Private</h3>
          <p>Your own account, your own dashboard. No ads, no tracking, no data selling.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Built by <strong>Hyoseo Lee</strong> — a personal tool for watching the macro picture.</p>
        <p className="landing-footer-dim">Invite-only beta &middot; v3.0.0</p>
      </footer>
    </div>
  );
}
