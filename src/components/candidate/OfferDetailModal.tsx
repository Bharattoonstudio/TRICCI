/**
 * OfferDetailModal — candidate view and respond to offer
 * Shows full offer details and accept/reject buttons
 */
import { useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface OfferDetailModalProps {
  offer: {
    id: number;
    companyName: string;
    jobTitle: string;
    offerStatus: string;
    offerCtcLpa?: number;
    offerExpiryDate?: string;
    joiningDate?: string;
    offerNote?: string;
  };
  onClose: () => void;
  onUpdated: () => void;
}

export default function OfferDetailModal({ offer, onClose, onUpdated }: OfferDetailModalProps) {
  const [joiningDate, setJoiningDate] = useState(offer.joiningDate || '');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isExpired = offer.offerExpiryDate && new Date(offer.offerExpiryDate) < new Date();
  const isPending = offer.offerStatus === 'sent' && !isExpired;

  async function handleAccept() {
    if (!joiningDate) {
      setError('Please select a joining date');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/candidate/offers/${offer.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joiningDate: new Date(joiningDate).toISOString() }),
      });

      if (res.ok) {
        onUpdated();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to accept offer');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/candidate/offers/${offer.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      if (res.ok) {
        onUpdated();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to decline offer');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{offer.jobTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">{offer.companyName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Offer Status */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {offer.offerStatus === 'accepted' ? (
              <CheckCircle2 size={20} className="text-green-600" />
            ) : offer.offerStatus === 'declined' ? (
              <XCircle size={20} className="text-gray-600" />
            ) : offer.offerStatus === 'withdrawn' ? (
              <AlertCircle size={20} className="text-red-600" />
            ) : null}
            <span className="font-semibold text-foreground capitalize">{offer.offerStatus}</span>
          </div>
          {isExpired && (
            <p className="text-xs text-red-600">Offer expired on {new Date(offer.offerExpiryDate!).toLocaleDateString('en-IN')}</p>
          )}
        </div>

        {/* Offer Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {offer.offerCtcLpa && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Offered CTC</p>
              <p className="text-lg font-bold text-foreground">₹{offer.offerCtcLpa}L</p>
            </div>
          )}
          {offer.offerExpiryDate && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Valid Until</p>
              <p className="text-lg font-bold text-foreground">{new Date(offer.offerExpiryDate).toLocaleDateString('en-IN')}</p>
            </div>
          )}
        </div>

        {/* Note */}
        {offer.offerNote && (
          <div className="mb-6 p-3 bg-muted rounded text-sm text-foreground border-l-4 border-primary">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Message from employer</p>
            <p>{offer.offerNote}</p>
          </div>
        )}

        {/* Joining Date Input (for pending offers) */}
        {isPending && !showRejectForm && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tentative Joining Date *
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
            />
          </div>
        )}

        {/* Reject Reason (for reject form) */}
        {showRejectForm && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Reason for Decline (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Help them understand your decision..."
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Close
          </button>

          {isPending && !showRejectForm && (
            <>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-red-500/30 text-red-600 rounded-lg font-semibold hover:bg-red-500/5 disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting || !joiningDate}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Accept
                  </>
                )}
              </button>
            </>
          )}

          {showRejectForm && (
            <>
              <button
                onClick={() => setShowRejectForm(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Confirm Decline
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
