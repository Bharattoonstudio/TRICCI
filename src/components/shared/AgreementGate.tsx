/**
 * AgreementGate — shared blocking T&C acceptance modal used by the
 * employer and candidate dashboards (consultant has its own richer KYC
 * modal: ConsultantAgreementModal.tsx). Renders as a full-screen overlay
 * that cannot be dismissed until the agreement is accepted, matching
 * the cross-cutting rule: nothing works for any role until their
 * agreement is accepted.
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';

interface AgreementGateProps {
  role: 'employer' | 'candidate';
  endpoint: string; // e.g. '/api/employer/agreement'
  onAccepted: () => void;
  /** Employer needs a designation field too; candidate just needs a name. */
  requireDesignation?: boolean;
}

const TERMS_TEXT: Record<'employer' | 'candidate', string> = {
  employer:
    'By accepting, you agree that TRICCI facilitates recruitment between your organization and independent consultants/candidates on this platform, that placement fees are payable per the terms shown at job-posting time, and that all data shared is accurate to the best of your knowledge.',
  candidate:
    'By accepting, you agree that TRICCI may share your profile and CV with employers and consultants for the purpose of recruitment, that the information you provide is accurate to the best of your knowledge, and that you consent to being contacted regarding relevant job opportunities.',
};

export default function AgreementGate({ role, endpoint, onAccepted, requireDesignation }: AgreementGateProps) {
  const [signatoryName, setSignatoryName] = useState('');
  const [designation, setDesignation] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fullText, setFullText] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'employer') {
      fetch('/api/legal/employer-agreement')
        .then(r => r.json())
        .then(d => setFullText(d.text))
        .catch(() => {});
    }
  }, [role]);

  function downloadAgreement() {
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TRICCI-Employer-Agreement.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit() {
    setError('');
    if (!signatoryName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (requireDesignation && !designation.trim()) {
      setError('Please enter your designation.');
      return;
    }
    if (!agreed) {
      setError('Please confirm you have read and agree to the terms.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          requireDesignation ? { signatoryName: signatoryName.trim(), designation: designation.trim() } : { signatoryName: signatoryName.trim() },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === 'agreement_required' ? data.message : (data?.error || 'Failed to record agreement. Please try again.'));
        setSubmitting(false);
        return;
      }
      onAccepted();
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8470A] to-[#6B4FBB] flex items-center justify-center shrink-0">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">TRICCI Platform Agreement</h2>
            <p className="text-xs text-white/50">Required before you can continue as {role === 'employer' ? 'an employer' : 'a candidate'}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-2 max-h-64 overflow-y-auto text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
          {role === 'employer' ? (fullText ?? 'Loading agreement…') : TERMS_TEXT[role]}
        </div>
        {role === 'employer' && (
          <button
            type="button"
            onClick={downloadAgreement}
            disabled={!fullText}
            className="text-xs text-primary hover:underline mb-5 disabled:opacity-40 disabled:no-underline"
          >
            Download full agreement (.txt)
          </button>
        )}
        {role !== 'employer' && <div className="mb-5" />}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1.5">Full Name</label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="Your full legal name"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
          {requireDesignation && (
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. HR Manager, Founder"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5"
          />
          <span className="text-sm text-white/70">I have read and agree to the TRICCI Platform Agreement and Terms of Service.</span>
        </label>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#E8470A] to-[#6B4FBB] text-white font-semibold py-3 rounded-xl disabled:opacity-60"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          {submitting ? 'Recording...' : 'Accept & Continue'}
        </button>
      </motion.div>
    </div>
  );
}
