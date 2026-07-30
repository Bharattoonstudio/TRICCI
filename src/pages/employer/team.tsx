// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/pages/employer/team.tsx
// (This same file also works for consultants — role checks are
//  server-side, so no separate consultant/team.tsx is needed. If you
//  want it at /consultant/team too, just register the same component
//  at a second route in routes.tsx — see deployment guide.)
// ═══════════════════════════════════════════════════════════════════
import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Plus, Trash2, KeyRound, Mail, Loader2, X, Shield, Eye, UserCog } from 'lucide-react';

interface Member {
  id: number;
  email: string;
  role: 'owner' | 'recruiter' | 'viewer';
  status: 'pending' | 'active' | 'removed';
  invitedAt: string;
  joinedAt: string | null;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    owner: { label: 'Admin', className: 'bg-primary/15 text-primary border-primary/30', icon: Shield },
    recruiter: { label: 'Recruiter', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: UserCog },
    viewer: { label: 'Viewer', className: 'bg-muted text-muted-foreground border-border', icon: Eye },
  };
  const r = map[role] ?? map.viewer;
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${r.className}`}>
      <Icon size={12} /> {r.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Invite Pending</span>;
  }
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">Active</span>;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'recruiter' | 'viewer'>('recruiter');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  async function loadMembers() {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/members');
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members || []);
      } else {
        setError(data.error || 'Failed to load team');
      }
    } catch {
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInviting(true);
    try {
      const res = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowInvite(false);
        setInviteEmail('');
        setInviteRole('recruiter');
        loadMembers();
      } else {
        setError(data.error || 'Failed to send invite');
      }
    } catch {
      setError('Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(member: Member) {
    if (!confirm(`Remove ${member.email} from your team? They will lose access immediately.`)) return;
    try {
      const res = await fetch(`/api/organization/members/${member.id}`, { method: 'DELETE' });
      if (res.ok) {
        loadMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch {
      alert('Failed to remove member');
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/organization/members/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Password reset for ${resetTarget.email}. Share the new password with them securely.`);
        setResetTarget(null);
        setNewPassword('');
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch {
      alert('Failed to reset password');
    } finally {
      setResetting(false);
    }
  }

  const activeCount = members.filter((m) => m.status !== 'removed').length;
  const canInviteMore = activeCount < 5;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Team Members | TRICCI</title></Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users size={24} className="text-primary" /> Team Members
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {activeCount} of 5 logins used. Only you (Admin) can manage the team.
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            disabled={!canInviteMore}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} /> Invite Member
          </button>
        </div>

        {!canInviteMore && (
          <div className="mb-6 text-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg px-4 py-3">
            You've reached the maximum of 5 logins (1 Admin + 4 team members). Remove someone to invite a new person.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {members.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">No team members yet.</div>
            ) : (
              members.map((m, i) => (
                <div key={m.id} className={`flex items-center justify-between px-5 py-4 ${i !== members.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                      {m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={m.role} />
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  </div>

                  {m.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      {m.status === 'active' && (
                        <button
                          onClick={() => setResetTarget(m)}
                          title="Reset password"
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                        >
                          <KeyRound size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(m)}
                        title="Remove member"
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><Mail size={18} /> Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  type="email" required value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Role</label>
                <select
                  value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'recruiter' | 'viewer')}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="recruiter">Recruiter — can post jobs & manage applications</option>
                  <option value="viewer">Viewer — read-only access</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit" disabled={inviting}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {inviting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><KeyRound size={18} /> Reset Password</h2>
              <button onClick={() => { setResetTarget(null); setNewPassword(''); }}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Setting a new password for <b className="text-foreground">{resetTarget.email}</b>. This locks them out of their old password immediately.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">New Password</label>
                <input
                  type="text" required minLength={8} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                type="submit" disabled={resetting}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {resetting ? 'Resetting...' : 'Set New Password'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
