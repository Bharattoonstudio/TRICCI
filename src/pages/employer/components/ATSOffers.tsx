import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, CheckCircle, Clock, XCircle, Shield, Send,
  ChevronRight, AlertCircle, Plus, Loader2, Users,
} from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';
import type { Offer, OfferStatus, SubmissionRecord, SubmissionStatus } from './types.js';

const STATUS_MAP: Record<OfferStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border', icon: FileText },
  pending_approval: { label: 'Pending Approval', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Clock },
  approved: { label: 'Approved', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: CheckCircle },
  sent: { label: 'Sent', className: 'bg-primary/15 text-primary border-primary/30', icon: Send },
  accepted: { label: 'Accepted', className: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle },
  declined: { label: 'Declined', className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
  verification: { label: 'Verification', className: 'bg-secondary/15 text-secondary border-secondary/30', icon: Shield },
};

type OfferTab = 'all' | 'pending_approval' | 'verification';

interface Props {
  submissions: SubmissionRecord[];
  loading: boolean;
  updateStatus: (id: number, status: SubmissionStatus) => Promise<boolean>;
}

export default function ATSOffers({ submissions, loading }: Props) {
  const [offers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<OfferTab>('all');

  // Submissions that are in offered stage
  const offeredSubs = submissions.filter(s => s.status === 'offered');

  const filtered = activeTab === 'all' ? offers
    : activeTab === 'pending_approval' ? offers.filter(o => o.status === 'pending_approval')
    : offers.filter(o => o.verificationStatus === 'pending' || o.status === 'verification');

  if (loading) {
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
          <p className="text-sm text-muted-foreground mt-0.5">Track all offers, approvals, and verification status</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus size={15} /> Create Offer
        </button>
      </div>

      {/* Candidates with offer issued (from ATS pipeline) */}
      {offeredSubs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-blue-500/5">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Candidates with Offer Issued</p>
          </div>
          <div className="divide-y divide-border">
            {offeredSubs.map(sub => (
              <div key={sub.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-primary">{sub.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{sub.candidateName}</p>
                  <p className="text-xs text-muted-foreground">{sub.jobTitle}</p>
                  {sub.consultantName && <p className="text-xs text-muted-foreground flex items-center gap-1"><Users size={10} />via {sub.consultantName}</p>}
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">Offer Sent</span>
                {sub.cvUrl && (
                  <a href={sub.cvUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs hover:text-foreground transition-colors">
                    <FileText size={11} /> CV
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'All Offers', value: offers.length, color: '#6B4FBB', tab: 'all' as OfferTab },
          { label: 'Pending Approval', value: offers.filter(o => o.status === 'pending_approval').length, color: '#eab308', tab: 'pending_approval' as OfferTab },
          { label: 'Accepted', value: offers.filter(o => o.status === 'accepted').length, color: '#22c55e', tab: 'all' as OfferTab },
          { label: 'Verification', value: offers.filter(o => o.verificationStatus === 'pending').length, color: '#E8470A', tab: 'verification' as OfferTab },
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
          const s = STATUS_MAP[offer.status];
          const StatusIcon = s.icon;

          return (
            <motion.div key={offer.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-foreground text-sm">{offer.candidateName}</p>
                    {offer.jobCode && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono font-semibold">{offer.jobCode}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{offer.jobTitle}</p>

                  <div className="flex flex-wrap gap-4 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Offered CTC</p>
                      <p className="text-sm font-black text-foreground">{offer.ctcOffered}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joining Date</p>
                      <p className="text-sm font-semibold text-foreground">{offer.joiningDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm text-muted-foreground">{offer.createdAt}</p>
                    </div>
                    {offer.approvedBy && (
                      <div>
                        <p className="text-xs text-muted-foreground">Approved By</p>
                        <p className="text-sm font-semibold text-foreground">{offer.approvedBy}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>
                    <StatusIcon size={11} />
                    {s.label}
                  </span>

                  {offer.verificationStatus && (
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      offer.verificationStatus === 'verified' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                      offer.verificationStatus === 'failed' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                    }`}>
                      <Shield size={10} />
                      {offer.verificationStatus === 'verified' ? 'Verified' : offer.verificationStatus === 'failed' ? 'Failed' : 'Pending Verification'}
                    </span>
                  )}
                </div>
              </div>

              {offer.status === 'pending_approval' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/25 transition-colors">
                    <CheckCircle size={13} /> Approve Offer
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors">
                    <XCircle size={13} /> Reject
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors ml-auto">
                    View Details <ChevronRight size={13} />
                  </button>
                </div>
              )}
              {offer.status === 'draft' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/25 transition-colors">
                    <Send size={13} /> Submit for Approval
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center bg-card border border-border rounded-2xl">
            <AlertCircle size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No formal offers created yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Issue Offer" from the Selected tab to create offer letters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
