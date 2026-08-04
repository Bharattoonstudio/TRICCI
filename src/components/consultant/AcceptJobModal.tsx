/**
 * AcceptJobModal — spec STEP 5: before a consultant can work a job mandate,
 * they must explicitly accept its terms (replacement period, fee %, and a
 * set of conduct rules) rather than a silent one-click toggle.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

interface AcceptJobModalProps {
  jobTitle: string;
  feePercent: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const RULES = [
  'I will not submit duplicate candidates already submitted to this role',
  'I will not submit fake or fabricated candidate profiles',
  'I will not engage in resume farming (bulk speculative submissions)',
  'I will obtain each candidate\u2019s explicit consent before submitting them',
];

export default function AcceptJobModal({ jobTitle, feePercent, onClose, onConfirm }: AcceptJobModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!agreed) {
      setError('Please confirm you agree to these terms.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Accept Job Terms</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{jobTitle}</p>
        <p className="text-xs text-muted-foreground mb-4">Fee: <span className="font-bold text-foreground">{feePercent}%</span> of candidate CTC on successful placement</p>

        <div className="space-y-2 mb-4">
          {RULES.map(rule => (
            <div key={rule} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{rule}</p>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border" />
          <span className="text-xs text-foreground">I agree to these terms and the TRICCI Consultant Agreement for this job mandate.</span>
        </label>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? 'Accepting…' : 'Accept & Unlock Job'}
        </button>
      </motion.div>
    </div>
  );
}
