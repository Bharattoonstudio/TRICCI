/**
 * RejectReasonModal — mandatory reason capture before recording a rejection
 * (point 8: reject requires a small reason note before it's recorded).
 * Reusable for direct applications and consultant submissions.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

interface RejectReasonModalProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting?: boolean;
}

export default function RejectReasonModal({ onClose, onSubmit, submitting }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!reason.trim()) {
      setError('Please provide a reason for rejecting this candidate.');
      return;
    }
    onSubmit(reason.trim());
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Reason for rejection</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Experience doesn't match requirements"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 mb-3"
        />
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-red-500/90 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          Confirm Rejection
        </button>
      </motion.div>
    </div>
  );
}
