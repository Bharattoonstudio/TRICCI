/**
 * JoiningTracker — bridges the gap between "offer accepted" (Phase F)
 * and "payment due" (Phase 6): background verification status, a
 * documents checklist, induction completion, and final joining
 * confirmation for every candidate who has accepted an offer.
 */
import { useState, useEffect } from 'react';
import { Loader2, UserCheck, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface DocItem { label: string; received: boolean; }
interface JoiningPlacement {
  id: number;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  joiningDate: string | null;
  bgvStatus: string;
  documentsChecklist: DocItem[];
  inductionCompleted: boolean;
  actualJoiningConfirmed: boolean;
}

const BGV_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'BGV Pending', color: '#94a3b8', icon: Clock },
  in_progress: { label: 'BGV In Progress', color: '#eab308', icon: Clock },
  cleared: { label: 'BGV Cleared', color: '#22c55e', icon: CheckCircle2 },
  flagged: { label: 'BGV Flagged', color: '#ef4444', icon: AlertTriangle },
};

export default function JoiningTracker() {
  const [placements, setPlacements] = useState<JoiningPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState<Set<number>>(new Set());

  function load() {
    fetch('/api/employer/placements/joining-pipeline')
      .then(r => r.json())
      .then((d: { placements?: JoiningPlacement[] }) => setPlacements(d.placements ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function updatePlacement(id: number, body: Record<string, unknown>) {
    setSaving(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/employer/placements/${id}/joining`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      load();
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function toggleDoc(p: JoiningPlacement, index: number) {
    const updated = p.documentsChecklist.map((d, i) => i === index ? { ...d, received: !d.received } : d);
    updatePlacement(p.id, { documentsChecklist: updated });
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  if (placements.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl py-16 text-center">
        <UserCheck size={32} className="mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm font-semibold text-foreground">No one in the joining pipeline yet</p>
        <p className="text-xs text-muted-foreground mt-1">Once a candidate accepts an offer, they'll show up here for BGV, document, and joining tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {placements.map(p => {
        const bgv = BGV_LABELS[p.bgvStatus] ?? BGV_LABELS.pending;
        const BgvIcon = bgv.icon;
        const docsReceived = p.documentsChecklist.filter(d => d.received).length;
        const isExpanded = expandedId === p.id;
        const isSaving = saving.has(p.id);

        return (
          <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
              <div>
                <p className="text-sm font-bold text-foreground">{p.candidateName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.jobTitle} · {p.companyName}</p>
                {p.joiningDate && <p className="text-xs text-muted-foreground mt-0.5">Joining: {new Date(p.joiningDate).toLocaleDateString('en-IN')}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.actualJoiningConfirmed ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 size={13} /> Joined</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: bgv.color }}><BgvIcon size={13} /> {bgv.label}</span>
                    <span className="text-xs text-muted-foreground">{docsReceived}/{p.documentsChecklist.length} docs</span>
                  </>
                )}
                {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                {/* BGV status */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Background Verification</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(BGV_LABELS).map(([key, v]) => (
                      <button
                        key={key}
                        disabled={isSaving}
                        onClick={() => updatePlacement(p.id, { bgvStatus: key })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          p.bgvStatus === key ? 'text-white' : 'bg-muted text-muted-foreground border-border'
                        }`}
                        style={p.bgvStatus === key ? { backgroundColor: v.color, borderColor: v.color } : undefined}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Documents checklist */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Documents Checklist</label>
                  <div className="space-y-1.5">
                    {p.documentsChecklist.map((doc, i) => (
                      <label key={doc.label} className="flex items-center gap-2.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={doc.received} disabled={isSaving} onChange={() => toggleDoc(p, i)} className="w-4 h-4 rounded border-border" />
                        <span className={doc.received ? 'text-foreground' : 'text-muted-foreground'}>{doc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Induction */}
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={p.inductionCompleted} disabled={isSaving} onChange={() => updatePlacement(p.id, { inductionCompleted: !p.inductionCompleted })} className="w-4 h-4 rounded border-border" />
                  <span className="text-foreground font-medium">Induction completed</span>
                </label>

                {/* Confirm joining */}
                {!p.actualJoiningConfirmed && (
                  <button
                    disabled={isSaving}
                    onClick={() => updatePlacement(p.id, { actualJoiningConfirmed: true })}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-500 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Confirm Candidate Has Joined
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
