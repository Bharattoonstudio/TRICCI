import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, RefreshCw, Loader2, ChevronLeft, ShieldAlert } from 'lucide-react';

interface AuditEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  actorRole: string | null;
  actorName: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ENTITY_TYPES = ['', 'job', 'application', 'submission'];

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setForbidden(false);
    const params = new URLSearchParams();
    if (entityType) params.set('entityType', entityType);
    if (entityId) params.set('entityId', entityId);
    fetch(`/api/admin/audit-log?${params.toString()}`)
      .then(async r => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then(data => { if (data?.entries) setEntries(data.entries); })
      .catch(() => { /* leave list as-is */ })
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Audit Log — Admin — TRICCI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={15} /> Admin Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <ClipboardList size={22} className="text-primary" /> Audit Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Who did what, and when — job creation, status changes, and note additions.</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {forbidden ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <ShieldAlert size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-foreground font-semibold">Admin access required</p>
            <p className="text-sm text-muted-foreground mt-1">You need to be signed in as an admin to view this page.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select value={entityType} onChange={e => setEntityType(e.target.value)}
                className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary">
                {ENTITY_TYPES.map(t => (
                  <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All entity types'}</option>
                ))}
              </select>
              <input
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                placeholder="Filter by entity ID…"
                className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center text-sm text-muted-foreground">
                No audit entries found.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">When</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Who</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Entity</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {e.actorName ?? 'System'}
                          {e.actorRole && <span className="text-muted-foreground"> ({e.actorRole})</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-primary">{e.action}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.entityType} #{e.entityId}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {e.metadata ? JSON.stringify(e.metadata) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
