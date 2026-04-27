import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        birth_date: birthDate || undefined,
        invite_code: inviteCode,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg: string }> } } })?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail[0]?.msg || 'Registration failed');
      } else {
        setError('Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo"><span>///</span>Macro</Link>
        <h2>Create account</h2>
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
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>
          <label>
            Birth date <span className="auth-optional">(optional)</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label>
            Invite code
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
}
