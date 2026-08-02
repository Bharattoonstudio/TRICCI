/**
 * InterviewResponseModal — points 41-43: employer views the consultant's
 * proposed interview date and either confirms it (providing interviewer
 * details, fires the 3-way confirmation email) or requests an alternate.
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, CalendarClock, CheckCircle2 } from 'lucide-react';

interface InterviewResponseModalProps {
  submissionId: number;
  candidateName: string;
  onClose: () => void;
  onResolved: () => void;
}

interface InterviewSchedule {
  status: string;
  proposedDate: string;
  proposalNote: string | null;
  interviewerName: string | null;
}

export default function InterviewResponseModal({ submissionId, candidateName, onClose, onResolved }: InterviewResponseModalProps) {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<InterviewSchedule | null>(null);
  const [mode, setMode] = useState<'view' | 'confirm' | 'alternate'>('view');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerDesignation, setInterviewerDesignation] = useState('');
  const [interviewerContact, setInterviewerContact] = useState('');
  const [altNote, setAltNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/submissions/${submissionId}/interview`)
      .then(r => r.json())
      .then(d => setSchedule(d.interview))
      .finally(() => setLoading(false));
  }, [submissionId]);

  async function handleConfirm() {
    if (!interviewerName.trim()) {
      setError('Interviewer name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/employer/submissions/${submissionId}/interview/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', interviewerName, interviewerDesignation, interviewerContact }),
      });
      if (res.ok) {
        onResolved();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to confirm interview.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestAlternate() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/employer/submissions/${submissionId}/interview/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_alternate', note: altNote.trim() }),
      });
      if (res.ok) {
        onResolved();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to request alternate time.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-white">Interview — {candidateName}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-white/40" /></div>
        ) : !schedule ? (
          <p className="text-sm text-white/40 py-4">No interview has been proposed yet by the consultant.</p>
        ) : schedule.status !== 'proposed' ? (
          <div className="py-4 text-center">
            <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
            <p className="text-sm text-white/70">Status: {schedule.status.replace('_', ' ')}</p>
            {schedule.interviewerName && <p className="text-xs text-white/40 mt-1">Interviewer: {schedule.interviewerName}</p>}
          </div>
        ) : mode === 'view' ? (
          <div>
            <p className="text-xs text-white/40 mb-1">Proposed date &amp; time</p>
            <p className="text-base font-bold text-white mb-1">{new Date(schedule.proposedDate).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
            {schedule.proposalNote && <p className="text-xs text-white/50 mb-4 italic">"{schedule.proposalNote}"</p>}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setMode('alternate')} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/5">
                Request Alternate
              </button>
              <button onClick={() => setMode('confirm')} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90">
                Confirm This Time
              </button>
            </div>
          </div>
        ) : mode === 'confirm' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Interviewer Name *</label>
              <input value={interviewerName} onChange={e => setInterviewerName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Designation</label>
              <input value={interviewerDesignation} onChange={e => setInterviewerDesignation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Contact (phone/email/meeting link)</label>
              <input value={interviewerContact} onChange={e => setInterviewerContact(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button onClick={handleConfirm} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? 'Confirming...' : 'Confirm Interview'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea value={altNote} onChange={e => setAltNote(e.target.value)} rows={2}
              placeholder="Optional note for the consultant"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button onClick={handleRequestAlternate} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 border border-white/10 text-white/70 font-semibold py-2.5 rounded-xl disabled:opacity-60 hover:bg-white/5">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? 'Sending...' : 'Request Alternate Time'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
