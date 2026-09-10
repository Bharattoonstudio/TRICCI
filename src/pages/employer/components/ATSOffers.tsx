import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  FileText, CheckCircle, Clock, XCircle, Shield, Send,
  ChevronRight, AlertCircle, Plus, Loader2, Users, X,
} from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';
import type { SubmissionRecord, SubmissionStatus } from './types.js';

interface PlacementOffer {
  id: number;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  offerCtcLpa: number | null;
  offerExpiryDate: string | null;
  joiningDate: string | null;
  offerStatus: string;
  offerApprovalStatus: string | null;
  offerApprovalRequestedBy: string | null;
  offerApprovedBy: string | null;
  offerApprovalNote: string | null;
  offerVerificationStatus: string | null;
  createdAt: string;
}

type OfferTab = 'all' | 'pending_approval' | 'verification';

interface Props {
  submissions: SubmissionRecord[];
  loading: boolean;
  updateStatus: (id: number, status: SubmissionStatus) => Promise<boolean>;
}

export default function ATSOffers({ submissions, loading }: Props) {
  const [offers, setOffers] = useState<PlacementOffer[]>([]),
    [offersLoading, setOffersLoading] = useState(true),
    [canApprove, setCanApprove] = useState(false),
    [activeTab, setActiveTab] = useState<OfferTab>('all'),
    [error, setError] = useState(''),
    [busyId, setBusyId] = useState<number | null>(null);

  // Create-offer flow
  const [showPicker, setShowPicker] = useState(false);
  const [draftTarget, setDraftTarget] = useState<{ placementId: number; candidateName: string } | null>(null);
  const [draftCtc, setDraftCtc] = useState('');
  const [draftExpiry, setDraftExpiry] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Reject flow
  const [rejectTarget, setRejectTarget] = useState<PlacementOffer | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const loadOffers = useCallback(() => {
    setOffersLoading(true);
    fetch('/api/employer/offers')
      .then(r => r.json())
      .then(d => { setOffers(d.offers ?? []); setCanApprove(!!d.canApprove); })
      .catch(() => setError('Failed to load offers'))
      .finally(() => setOffersLoading(false));
  }, []);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const filtered = activeTab === 'all' ? offers
    : activeTab === 'pending_approval' ? offers.filter(o => o.offerApprovalStatus === 'pending_approval')
    : offers.filter(o => o.offerVerificationStatus === 'pending' || o.offerVerificationStatus === 'failed');

  // Candidates eligible for a new offer: selected, no approval-workflow offer yet
  const eligibleCandidates = submissions.filter(s => s.status === 'selected');

  async function pickCandidate(sub: SubmissionRecord) {
    setError('');
    try {
      const res = await fetch(`/api/employer/placements/by-submission/${sub.id}`);
      const data = await res.json();
      if (!data.placement) { setError('No placement record found for this candidate yet.'); return; }
      setDraftTarget({ placementId: data.placement.id, candidateName: sub.candidateName });
      setDraftCtc(data.placement.offerCtcLpa ? String(data.placement.offerCtcLpa) : '');
      setDraftExpiry(data.placement.offerExpiryDate ? data.placement.offerExpiryDate.slice(0, 10) : '');
      setDraftNote('');
      setShowPicker(false);
    } catch {
      setError('Failed to look up placement');
    }
  }

  async function saveDraft() {
    if (!draftTarget) return;
    const ctc = parseFloat(draftCtc);
    if (!ctc || ctc <= 0) { setError('Enter a valid CTC'); return; }
    if (!draftExpiry) { setError('Enter an offer expiry date'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/employer/placements/${draftTarget.placementId}/offer/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerCtcLpa: ctc, offerExpiryDate: new Date(draftExpiry).toISOString(), note: draftNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save draft');
      setDraftTarget(null);
      loadOffers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }

  async function submitForApproval(id: number) {
    setBusyId(id);
    try {
      await fetch(`/api/employer/placements/${id}/offer/submit-approval`, { method: 'POST' });
      loadOffers();
    } finally {
      setBusyId(null);
    }
  }

  async function approve(id: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/employer/placements/${id}/offer/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to approve');
      loadOffers();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget || !rejectNote.trim()) return;
    setBusyId(rejectTarget.id);
    try {
      const res = await fetch(`/api/employer/placements/${rejectTarget.id}/offer/reject-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to reject');
      setRejectTarget(null);
      setRejectNote('');
      loadOffers();
    } finally {
      setBusyId(null);
    }
  }

  async function setVerification(id: number, status: string) {
    setBusyId(id);
    try {
      await fetch(`/api/employer/placements/${id}/offer/verification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadOffers();
    } finally {
      setBusyId(null);
    }
  }

  if (loading || offersLoading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Offers Management — Employer Dashboard — TRICCI</title>
        <meta name="description" content="Create and track offer letters for selected candidates in the TRICCI ATS pipeline." />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Offers Management — TRICCI Employer Dashboard</h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Offers Management</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Draft, submit for approval, and track offers</p>
        </div>
        <button onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus size={15} /> Create Offer
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'All Offers', value: offers.length, color: '#6B4FBB', tab: 'all' as OfferTab },
          { label: 'Pending Approval', value: offers.filter(o => o.offerApprovalStatus === 'pending_approval').length, color: '#eab308', tab: 'pending_approval' as OfferTab },
          { label: 'Sent/Accepted', value: offers.filter(o => o.offerStatus === 'sent' || o.offerStatus === 'accepted').length, color: '#22c55e', tab: 'all' as OfferTab },
          { label: 'Verification', value: offers.filter(o => o.offerVerificationStatus === 'pending' || o.offerVerificationStatus === 'failed').length, color: '#E8470A', tab: 'verification' as OfferTab },
        ].map(s => (
          <button key={s.label} onClick={() => setActiveTab(s.tab)}
            className={`bg-card border rounded-xl p-4 text-center transition-all hover:shadow-sm ${activeTab === s.tab ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
            <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-muted border border-border rounded-xl p-1 w-fit">
        {([
          { id: 'all', label: 'All Offers' },
          { id: 'pending_approval', label: 'Pending Approval' },
          { id: 'verification', label: 'Verification' },
        ] as { id: OfferTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Offers list */}
      <div className="space-y-3">
        {filtered.map(offer => {
          const isDraft = offer.offerApprovalStatus === 'draft';
          const isPending = offer.offerApprovalStatus === 'pending_approval';
          const isBusy = busyId === offer.id;

          return (
            <motion.div key={offer.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground text-sm">{offer.candidateName}</p>
                  <p className="text-xs text-muted-foreground">{offer.jobTitle} · {offer.companyName}</p>

                  <div className="flex flex-wrap gap-4 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Offered CTC</p>
                      <p className="text-sm font-black text-foreground">{offer.offerCtcLpa ? `₹${offer.offerCtcLpa}L` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expiry</p>
                      <p className="text-sm font-semibold text-foreground">{offer.offerExpiryDate ? new Date(offer.offerExpiryDate).toLocaleDateString('en-IN') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm text-muted-foreground">{new Date(offer.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  {offer.offerApprovalNote && isDraft && (
                    <p className="text-xs text-red-500 mt-2">Feedback: {offer.offerApprovalNote}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                    isDraft ? 'bg-muted text-muted-foreground border-border' :
                    isPending ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                    offer.offerStatus === 'accepted' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                    offer.offerStatus === 'declined' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                    'bg-primary/15 text-primary border-primary/30'
                  }`}>
                    {isDraft ? <FileText size={11} /> : isPending ? <Clock size={11} /> : <CheckCircle size={11} />}
                    {isDraft ? 'Draft' : isPending ? 'Pending Approval' : offer.offerStatus}
                  </span>
                  {offer.offerVerificationStatus && (
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      offer.offerVerificationStatus === 'verified' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                      offer.offerVerificationStatus === 'failed' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                    }`}>
                      <Shield size={10} />
                      {offer.offerVerificationStatus === 'verified' ? 'Verified' : offer.offerVerificationStatus === 'failed' ? 'Failed' : 'Pending Verification'}
                    </span>
                  )}
                </div>
              </div>

              {isDraft && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button onClick={() => submitForApproval(offer.id)} disabled={isBusy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/25 transition-colors disabled:opacity-40">
                    {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit for Approval
                  </button>
                </div>
              )}
              {isPending && canApprove && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button onClick={() => approve(offer.id)} disabled={isBusy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-40">
                    {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Approve & Send
                  </button>
                  <button onClick={() => setRejectTarget(offer)} disabled={isBusy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-40">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
              {isPending && !canApprove && (
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border flex items-center gap-1.5">
                  <Clock size={12} /> Waiting on a team lead or owner to approve
                </p>
              )}
              {(offer.offerStatus === 'sent' || offer.offerStatus === 'accepted') && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-2"><Shield size={12} /> Verification:</span>
                  {['pending', 'verified', 'failed'].map(s => (
                    <button key={s} onClick={() => setVerification(offer.id, s)} disabled={isBusy}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${
                        offer.offerVerificationStatus === s
                          ? (s === 'verified' ? 'bg-green-500/20 text-green-400 border-green-500/40' : s === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40')
                          : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                      }`}>
                      {s === 'verified' ? 'Verified' : s === 'failed' ? 'Failed' : 'Pending'}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center bg-card border border-border rounded-2xl">
            <AlertCircle size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No offers here yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Create Offer" to start a draft for a selected candidate.</p>
          </div>
        )}
      </div>

      {/* Candidate picker */}
      {showPicker && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Select a Candidate</h2>
              <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            {eligibleCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No candidates in "Selected" stage yet.</p>
            ) : (
              <div className="space-y-2">
                {eligibleCandidates.map(sub => (
                  <button key={sub.id} onClick={() => pickCandidate(sub)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted text-left transition-colors">
                    <Users size={16} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{sub.candidateName}</p>
                      <p className="text-xs text-muted-foreground truncate">{sub.jobTitle}</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Draft form */}
      {draftTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Draft Offer — {draftTarget.candidateName}</h2>
              <button onClick={() => setDraftTarget(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Offered CTC (LPA)</label>
                <input type="number" value={draftCtc} onChange={e => setDraftCtc(e.target.value)}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground" placeholder="e.g. 18" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Offer Expiry Date</label>
                <input type="date" value={draftExpiry} onChange={e => setDraftExpiry(e.target.value)}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note (optional)</label>
                <textarea value={draftNote} onChange={e => setDraftNote(e.target.value)} rows={2}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={saveDraft} disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Save Draft
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject form */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Reject Offer — {rejectTarget.candidateName}</h2>
              <button onClick={() => setRejectTarget(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">What needs to change?</label>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none mb-3" placeholder="e.g. CTC too high for this band" />
            <button onClick={confirmReject} disabled={!rejectNote.trim() || busyId === rejectTarget.id}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-lg bg-red-500 text-white hover:opacity-90 disabled:opacity-40">
              {busyId === rejectTarget.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Send Back to Draft
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
