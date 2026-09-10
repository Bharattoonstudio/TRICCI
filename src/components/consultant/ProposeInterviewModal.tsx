/**
 * ProposeInterviewModal — points 40, 43: consultant proposes (or
 * re-proposes, if the employer requested an alternate) an interview
 * date/time for a shortlisted candidate.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, CalendarClock } from 'lucide-react';

interface ProposeInterviewModalProps {
  candidateName: string;
  onClose: () => void;
  onSubmit: (proposedDate: string, note: string) => void;
  submitting: boolean;
  error?: string;
}

export default function ProposeInterviewModal({ candidateName, onClose, onSubmit, submitting, error }: ProposeInterviewModalProps) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');

  function handleSubmit() {
    if (!date) {
      setLocalError('Please pick a date and time.');
      return;
    }
    setLocalError('');
    onSubmit(new Date(date).toISOString(), note.trim());
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-white">Propose Interview Time</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <p className="text-xs text-white/40 mb-3">for {candidateName}</p>

        <label className="block text-xs text-white/40 mb-1">Date &amp; Time</label>
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-white/30"
        />

        <label className="block text-xs text-white/40 mb-1">Note (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Candidate prefers morning slots"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 mb-3 focus:outline-none focus:border-white/30"
        />

        {(localError || error) && <p className="text-sm text-red-400 mb-3">{localError || error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? 'Sending...' : 'Propose This Time'}
        </button>
      </motion.div>
    </div>
  );
}
