import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';

export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
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

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Link to="/" className="auth-logo"><span>///</span>Macro</Link>
          <h2>Invalid link</h2>
          <p className="auth-hint">This reset link is missing a token. Please request a new one.</p>
          <div className="auth-links" style={{ marginTop: 24 }}>
            <Link to="/forgot-password">Request new link</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Reset failed. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo"><span>///</span>Macro</Link>
        <h2>Set new password</h2>
        {done ? (
          <div className="auth-success">
            <p>Your password has been reset successfully.</p>
            <div className="auth-links" style={{ marginTop: 24 }}>
              <Link to="/login">Log in with new password</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
                placeholder="Min. 8 characters"
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
