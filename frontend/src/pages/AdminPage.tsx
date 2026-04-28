import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as adminApi from '../api/admin';
import { Trash2, Plus, ArrowLeft, Shield, Users, Ticket } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['invite-codes'],
    queryFn: adminApi.getInviteCodes,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
  });

  const [newCode, setNewCode] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: adminApi.createInviteCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      setNewCode('');
      setMaxUses('');
      setError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to create invite code');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteInviteCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
    },
  });

  const handleCreateCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    createMutation.mutate({
      code: newCode.trim(),
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
    });
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setNewCode(code);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <Link to="/dashboard" className="admin-back">
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
          <h1><Shield size={18} /> Admin Panel</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-user">{user?.email}</span>
        </div>
      </div>

      <div className="admin-content">
        {/* Invite Codes Section */}
        <section className="admin-section">
          <h2><Ticket size={16} /> Invite Codes</h2>

          <form className="admin-create-form" onSubmit={handleCreateCode}>
            <div className="admin-form-row">
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Code"
                required
              />
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Max uses (unlimited)"
                min={1}
                style={{ width: 180 }}
              />
              <button type="button" className="admin-btn secondary" onClick={generateRandomCode}>
                Generate
              </button>
              <button type="submit" className="admin-btn primary" disabled={createMutation.isPending}>
                <Plus size={14} />
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
            {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
          </form>

          {codesLoading ? (
            <p className="admin-loading">Loading...</p>
          ) : codes.length === 0 ? (
            <p className="admin-empty">No invite codes yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Uses</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id}>
                      <td className="admin-code-cell">{code.code}</td>
                      <td>{code.use_count}{code.max_uses !== null ? ` / ${code.max_uses}` : ''}</td>
                      <td>{formatDate(code.created_at)}</td>
                      <td>
                        <button
                          className="admin-btn danger small"
                          onClick={() => deleteMutation.mutate(code.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Users Section */}
        <section className="admin-section">
          <h2><Users size={16} /> Users</h2>

          {usersLoading ? (
            <p className="admin-loading">Loading...</p>
          ) : users.length === 0 ? (
            <p className="admin-empty">No users yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Widgets</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>
                        {u.is_admin ? (
                          <span className="admin-badge">admin</span>
                        ) : (
                          <span className="user-badge">user</span>
                        )}
                      </td>
                      <td>{u.widget_count}</td>
                      <td>{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
