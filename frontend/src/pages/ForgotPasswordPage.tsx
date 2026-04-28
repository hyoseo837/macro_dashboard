import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-[var(--text-dim)]">
        INITIALIZING_SYSTEM...
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo"><span>///</span>Macro</Link>
        <h2>Reset password</h2>
        {sent ? (
          <div className="auth-success">
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            <p>Check your email and follow the link to set a new password.</p>
            <div className="auth-links" style={{ marginTop: 24 }}>
              <Link to="/login">Back to login</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="auth-hint">Enter your email and we'll send you a link to reset your password.</p>
            <form onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
            <div className="auth-links">
              <Link to="/login">Back to login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
