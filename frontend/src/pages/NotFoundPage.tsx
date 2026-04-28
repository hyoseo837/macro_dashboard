import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <Link to="/" className="auth-logo"><span>///</span>Macro</Link>
        <h2>404</h2>
        <p className="auth-hint">This page doesn't exist.</p>
        <div className="auth-links" style={{ marginTop: 8 }}>
          <Link to="/">Go home</Link>
          <span>&middot;</span>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
