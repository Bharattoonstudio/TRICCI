/**
 * PipelineBoard — click-to-advance Kanban view of a job's candidates,
 * combining consultant submissions and direct applications into one
 * unified stage board: Submitted → Shortlisted → Interview → Selected,
 * with Rejected as a separate column. Chosen over full drag-and-drop for
 * reliability on mobile and lower interaction risk.
 *
 * NOTE: direct (candidate self-apply) applications currently only support
 * shortlisted/rejected/placed as valid statuses server-side — there's no
 * "interview" stage for them yet (that only exists for consultant
 * submissions). Cards for direct applicants are shown in whichever column
 * matches their real status, but can only be advanced to stages the
 * backend actually supports; this is flagged inline rather than silently
 * offering a button that would just fail.
 */
import { useState } from 'react';
import { FileText, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';

export interface PipelineCard {
  id: number;
  source: 'direct' | 'consultant';
  candidateName: string;
  status: string;
  cvUrl: string | null;
  consultantName?: string;
}

interface PipelineBoardProps {
  cards: PipelineCard[];
  onAdvance: (card: PipelineCard, nextStatus: string) => void;
  onReject: (card: PipelineCard) => void;
  onManageOffer?: (card: PipelineCard) => void;
  actioningIds: Set<number>;
}

// Unified stage columns. Direct applications skip 'interview' (not supported
// server-side for that channel yet) and jump straight from shortlisted to selected.
const STAGES = [
  { key: 'submitted', label: 'Submitted', match: (s: string) => ['pending', 'applied', 'review'].includes(s) },
  { key: 'shortlisted', label: 'Shortlisted', match: (s: string) => s === 'shortlisted' },
  { key: 'interview', label: 'Interview', match: (s: string) => s === 'interview' },
  { key: 'selected', label: 'Selected / Placed', match: (s: string) => ['selected', 'offered', 'placed', 'payment_processed', 'payment_done'].includes(s) },
  { key: 'rejected', label: 'Rejected', match: (s: string) => s === 'rejected' },
];

function nextStageFor(card: PipelineCard): { key: string; label: string } | null {
  if (card.status === 'rejected') return null;
  if (['pending', 'applied', 'review'].includes(card.status)) return { key: 'shortlisted', label: 'Shortlist' };
  if (card.status === 'shortlisted') {
    return card.source === 'consultant' ? { key: 'interview', label: 'Move to Interview' } : { key: 'placed', label: 'Mark Selected' };
  }
  if (card.status === 'interview') return { key: 'selected', label: 'Mark Selected' };
  return null;
}

export default function PipelineBoard({ cards, onAdvance, onReject, onManageOffer, actioningIds }: PipelineBoardProps) {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'direct' | 'consultant'>('all');

  const filtered = sourceFilter === 'all' ? cards : cards.filter(c => c.source === sourceFilter);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'direct', 'consultant'] as const).map(f => (
          <button
            key={f}
            onClick={() => setSourceFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              sourceFilter === f ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {f === 'all' ? 'All Sources' : f === 'direct' ? 'Direct' : 'Consultant'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
        {STAGES.map(stage => {
          const stageCards = filtered.filter(c => stage.match(c.status));
          return (
            <div key={stage.key} className="bg-muted/30 rounded-xl p-3 min-h-[120px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">{stage.label}</h3>
                <span className="text-xs font-semibold text-muted-foreground bg-background rounded-full w-5 h-5 flex items-center justify-center">{stageCards.length}</span>
              </div>
              <div className="space-y-2">
                {stageCards.map(card => {
                  const isActioning = actioningIds.has(card.id);
                  const next = nextStageFor(card);
                  return (
                    <div key={`${card.source}-${card.id}`} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-foreground truncate">{card.candidateName}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${card.source === 'direct' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                          {card.source === 'direct' ? 'Direct' : 'Consultant'}
                        </span>
                      </div>
                      {card.consultantName && <p className="text-[10px] text-muted-foreground mb-1.5 truncate">via {card.consultantName}</p>}
                      <div className="flex items-center gap-1.5">
                        {card.cvUrl && (
                          <a href={card.cvUrl} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
                            {card.source === 'direct' ? <ExternalLink size={10} /> : <FileText size={10} />}
                          </a>
                        )}
                        {stage.key !== 'rejected' && stage.key !== 'selected' && (
                          <>
                            {next && (
                              <button
                                disabled={isActioning}
                                onClick={() => onAdvance(card, next.key)}
                                className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                              >
                                {isActioning ? <Loader2 size={9} className="animate-spin" /> : <ArrowRight size={9} />}
                                {next.label}
                              </button>
                            )}
                            <button
                              disabled={isActioning}
                              onClick={() => onReject(card)}
                              className="text-[10px] font-semibold px-2 py-1 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {stage.key === 'selected' && card.source === 'consultant' && onManageOffer && (
                          <button
                            onClick={() => onManageOffer(card)}
                            className="flex-1 text-[10px] font-semibold px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10"
                          >
                            Manage Offer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {stageCards.length === 0 && <p className="text-[11px] text-muted-foreground/50 text-center py-4">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
