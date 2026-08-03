/**
 * OfferModal — send an offer for a selected (consultant-sourced) candidate,
 * or record the candidate's response to an already-sent offer.
 *
 * SCOPE NOTE: Offer management currently only works for candidates sourced
 * via consultants — the placement table (which this is built on) is only
 * created from consultant submissions, not direct candidate applications.
 * Extending it to direct applications would need a schema change to an
 * already-migrated table; flagged here rather than silently only working
 * for half the candidates without explanation.
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';

interface PlacementRecord {
  id: number;
  offerStatus: string;
  offerCtcLpa: number | null;
  offerExpiryDate: string | null;
  joiningDate: string | null;
}

interface OfferModalProps {
  submissionId: number;
  candidateName: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function OfferModal({ submissionId, candidateName, onClose, onUpdated }: OfferModalProps) {
  const [loading, setLoading] = useState(true);
  const [placement, setPlacement] = useState<PlacementRecord | null>(null);
  const [offerCtc, setOfferCtc] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/employer/placements/by-submission/${submissionId}`)
      .then(r => r.json())
      .then(d => setPlacement(d.placement))
      .finally(() => setLoading(false));
  }, [submissionId]);

  async function handleSend() {
    if (!placement) return;
    if (!offerCtc || Number(offerCtc) <= 0) { setError('Please enter a valid offered CTC.'); return; }
    if (!expiryDate) { setError('Please pick an offer expiry date.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/employer/placements/${placement.id}/offer/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerCtcLpa: Number(offerCtc), offerExpiryDate: new Date(expiryDate).toISOString(), note: note.trim() }),
      });
      if (res.ok) { onUpdated(); onClose(); }
      else { const d = await res.json(); setError(d.error || 'Failed to send offer.'); }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRespond(response: 'accepted' | 'declined') {
    if (!placement) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/employer/placements/${placement.id}/offer/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, ...(response === 'accepted' && joiningDate ? { joiningDate: new Date(joiningDate).toISOString() } : {}) }),
      });
      if (res.ok) { onUpdated(); onClose(); }
      else { const d = await res.json(); setError(d.error || 'Failed to record response.'); }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Offer — {candidateName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : !placement ? (
          <p className="text-sm text-muted-foreground py-4">No placement record found for this candidate yet — offer management requires the candidate to be at Selected stage.</p>
        ) : placement.offerStatus === 'not_sent' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Offered CTC (LPA) *</label>
              <input type="number" min="0" step="0.1" value={offerCtc} onChange={e => setOfferCtc(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Offer Valid Until *</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button onClick={handleSend} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
              Send Offer
            </button>
          </div>
        ) : placement.offerStatus === 'sent' ? (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
              <p>Offered: <span className="font-bold text-foreground">₹{placement.offerCtcLpa}L</span></p>
              <p>Valid until: <span className="font-bold text-foreground">{placement.offerExpiryDate ? new Date(placement.offerExpiryDate).toLocaleDateString('en-IN') : '—'}</span></p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Joining Date (if accepting)</label>
              <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex items-center gap-2">
              <button onClick={() => handleRespond('declined')} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 border border-red-500/30 text-red-500 text-xs font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-red-500/10">
                <XCircle size={13} /> Declined
              </button>
              <button onClick={() => handleRespond('accepted')} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-40 hover:bg-green-500">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Accepted
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            {placement.offerStatus === 'accepted' ? <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" /> : <XCircle size={28} className="text-red-500 mx-auto mb-2" />}
            <p className="text-sm font-semibold text-foreground capitalize">Offer {placement.offerStatus}</p>
            {placement.joiningDate && <p className="text-xs text-muted-foreground mt-1">Joining: {new Date(placement.joiningDate).toLocaleDateString('en-IN')}</p>}
          </div>
        )}
      </motion.div>
    </div>
  );
}
