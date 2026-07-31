/**
 * ApplyDetailsModal — collects the mandatory CTC breakdown (Fixed / Variable /
 * ESOPs / Other) and notice period (days + negotiable toggle) required before
 * a candidate can submit an application (SOP points 60-62). Shown right before
 * the actual apply API call fires.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, IndianRupee } from 'lucide-react';

interface ApplyDetailsModalProps {
  jobTitle: string;
  onClose: () => void;
  onSubmit: (details: {
    ctcFixed: number;
    ctcVariable: number;
    ctcEsops: number;
    ctcOther: number;
    noticePeriodDays: number;
    noticePeriodNegotiable: boolean;
  }) => void;
  submitting: boolean;
}

export default function ApplyDetailsModal({ jobTitle, onClose, onSubmit, submitting }: ApplyDetailsModalProps) {
  const [ctcFixed, setCtcFixed] = useState('');
  const [ctcVariable, setCtcVariable] = useState('');
  const [ctcEsops, setCtcEsops] = useState('');
  const [ctcOther, setCtcOther] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [error, setError] = useState('');

  function handleSubmit() {
    setError('');
    const fixed = Number(ctcFixed);
    if (!ctcFixed || Number.isNaN(fixed) || fixed <= 0) {
      setError('Please enter your expected fixed CTC (in LPA).');
      return;
    }
    if (!noticePeriodDays || Number.isNaN(Number(noticePeriodDays)) || Number(noticePeriodDays) < 0) {
      setError('Please enter your notice period in days.');
      return;
    }
    onSubmit({
      ctcFixed: Math.round(fixed * 100000),
      ctcVariable: Math.round((Number(ctcVariable) || 0) * 100000),
      ctcEsops: Math.round((Number(ctcEsops) || 0) * 100000),
      ctcOther: Math.round((Number(ctcOther) || 0) * 100000),
      noticePeriodDays: Math.round(Number(noticePeriodDays)),
      noticePeriodNegotiable: negotiable,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">A few details before you apply</h2>
            <p className="text-xs text-white/50 mt-0.5">for {jobTitle}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs font-semibold text-white/50 mb-2 flex items-center gap-1.5">
          <IndianRupee size={12} /> Expected CTC (LPA) — Fixed is required
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Fixed *</label>
            <input type="number" min="0" step="0.1" value={ctcFixed} onChange={e => setCtcFixed(e.target.value)}
              placeholder="e.g. 12" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Variable / Bonus</label>
            <input type="number" min="0" step="0.1" value={ctcVariable} onChange={e => setCtcVariable(e.target.value)}
              placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1">ESOPs</label>
            <input type="number" min="0" step="0.1" value={ctcEsops} onChange={e => setCtcEsops(e.target.value)}
              placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Other</label>
            <input type="number" min="0" step="0.1" value={ctcOther} onChange={e => setCtcOther(e.target.value)}
              placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] text-white/40 mb-1">Notice Period (days) *</label>
          <input type="number" min="0" value={noticePeriodDays} onChange={e => setNoticePeriodDays(e.target.value)}
            placeholder="e.g. 30" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
        </div>

        <div className="flex items-center gap-2 mb-5">
          <button
            type="button"
            onClick={() => setNegotiable(true)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${negotiable ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/50'}`}
          >
            Negotiable
          </button>
          <button
            type="button"
            onClick={() => setNegotiable(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${!negotiable ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/50'}`}
          >
            Non-negotiable
          </button>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </motion.div>
    </div>
  );
}
