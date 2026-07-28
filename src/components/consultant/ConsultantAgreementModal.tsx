import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  FileText, CheckCircle, XCircle, Shield, AlertCircle,
  Building2, User, Briefcase, Lock, Hash,
} from 'lucide-react';

interface Props {
  onAccepted: () => void;
}

const AGREEMENT_SECTIONS = [
  {
    title: 'PREAMBLE',
    content: `This Recruitment Consultant Agreement ("Agreement") is entered into between TRICCI (hereinafter referred to as "TRICCI" or "the Platform") and the Recruitment Consultant / Agency (hereinafter referred to as "Consultant") who digitally executes this Agreement through the TRICCI platform.

TRICCI is a technology-enabled recruitment aggregator platform that connects verified recruitment consultants with employer mandates. This Agreement governs the terms under which the Consultant may access live job mandates, submit candidates, and earn placement fees through the TRICCI platform.`,
  },
  {
    title: '1. DEFINITIONS',
    content: `1.1 "Platform" means the TRICCI web application accessible at tricci.in and all associated services.

1.2 "Mandate" means a job requirement posted by an employer on the TRICCI platform.

1.3 "Candidate Submission" means the act of submitting a candidate's profile against an active mandate.

1.4 "Placement Fee" means the fee payable to the Consultant upon successful placement of a submitted candidate, calculated as a percentage of the candidate's first-year CTC as specified per mandate.

1.5 "Successful Placement" means a candidate submitted by the Consultant who is offered and accepts employment with the employer, and completes the agreed retention period.

1.6 "KYC" means Know Your Customer verification documents and information provided by the Consultant.`,
  },
  {
    title: '2. ELIGIBILITY & ONBOARDING',
    content: `2.1 The Consultant represents and warrants that they are a legally constituted entity or individual with the authority to enter into this Agreement.

2.2 The Consultant agrees to provide accurate KYC information including but not limited to: agency/firm name, authorized signatory details, PAN/GST registration (where applicable), and bank account details for fee disbursement.

2.3 TRICCI reserves the right to verify the Consultant's credentials and reject or suspend access at its sole discretion if information is found to be false, misleading, or incomplete.

2.4 The Consultant must be at least 18 years of age and legally authorized to conduct recruitment activities in India.`,
  },
  {
    title: '3. SCOPE OF SERVICES',
    content: `3.1 Upon execution of this Agreement, the Consultant shall be granted access to live job mandates posted by verified employers on the TRICCI platform.

3.2 The Consultant may submit pre-screened candidates against active mandates subject to the mandate-specific requirements and submission guidelines.

3.3 The Consultant agrees to submit only candidates who have explicitly consented to their profile being shared with the respective employer.

3.4 The Consultant shall not submit the same candidate for the same mandate more than once, and shall not submit candidates already in the employer's pipeline through other channels without prior disclosure.

3.5 TRICCI does not guarantee the availability of mandates, the number of submissions that will be accepted, or the conversion of submissions to placements.`,
  },
  {
    title: '4. PLACEMENT FEES & PAYMENT TERMS',
    content: `4.1 The Consultant shall be entitled to a placement fee as specified on each mandate, which represents the Consultant's share after TRICCI's platform margin has been deducted from the employer's total fee.

4.2 Placement fees are payable ONLY upon successful placement, defined as: (a) the candidate receiving and accepting a formal offer of employment; (b) the candidate joining the employer on the agreed date; and (c) the candidate completing a minimum retention period of 90 days from the date of joining.

4.3 In the event a placed candidate resigns or is terminated within the 90-day retention period, no fee shall be payable, or if already paid, shall be subject to clawback at TRICCI's discretion.

4.4 TRICCI shall process fee payments within 30 working days of receiving confirmed payment from the employer.

4.5 All fees are subject to applicable taxes including GST. The Consultant is responsible for their own tax compliance and shall provide valid GST invoices where required.

4.6 TRICCI's platform margin is not disclosed to the Consultant. The fee percentage displayed on each mandate represents the Consultant's net earning.`,
  },
  {
    title: '5. EXCLUSIVITY & NON-CIRCUMVENTION',
    content: `5.1 The Consultant agrees not to directly approach, solicit, or engage with employers discovered through the TRICCI platform outside of the platform for a period of 24 months from the date of first introduction through TRICCI.

5.2 Any attempt to circumvent TRICCI's platform to conduct direct placements with employers sourced through TRICCI shall constitute a material breach of this Agreement and shall entitle TRICCI to claim damages equivalent to the placement fee that would have been earned.

5.3 The Consultant shall not share employer contact details, mandate details, or any confidential information obtained through the platform with third parties.`,
  },
  {
    title: '6. CANDIDATE DATA & PRIVACY',
    content: `6.1 The Consultant agrees to handle all candidate data in compliance with applicable data protection laws including the Digital Personal Data Protection Act, 2023 (India).

6.2 The Consultant shall obtain explicit written consent from each candidate before submitting their profile on the TRICCI platform.

6.3 The Consultant shall not retain candidate data beyond the period necessary for the recruitment engagement and shall securely delete data upon request.

6.4 Any data breach involving candidate information obtained through TRICCI must be reported to TRICCI within 24 hours of discovery.`,
  },
  {
    title: '7. CODE OF CONDUCT',
    content: `7.1 The Consultant agrees to conduct all recruitment activities with the highest standards of professionalism, integrity, and ethical conduct.

7.2 The Consultant shall not misrepresent candidate qualifications, experience, or compensation expectations to employers.

7.3 The Consultant shall not engage in any discriminatory practices based on caste, religion, gender, age, disability, or any other protected characteristic.

7.4 The Consultant shall not solicit or accept any payment, gift, or benefit from candidates in exchange for submission or placement services.

7.5 The Consultant shall not engage in any activity that could damage TRICCI's reputation or relationships with employers.`,
  },
  {
    title: '8. INTELLECTUAL PROPERTY',
    content: `8.1 All content, data, technology, and materials on the TRICCI platform are the exclusive intellectual property of TRICCI and its licensors.

8.2 The Consultant is granted a limited, non-exclusive, non-transferable license to use the platform solely for the purposes described in this Agreement.

8.3 The Consultant shall not copy, reproduce, reverse-engineer, or create derivative works from any part of the TRICCI platform.`,
  },
  {
    title: '9. TERM & TERMINATION',
    content: `9.1 This Agreement shall commence on the date of digital execution and shall remain in force until terminated by either party with 30 days' written notice.

9.2 TRICCI may terminate this Agreement immediately and without notice in the event of: (a) material breach of any provision; (b) fraudulent or unethical conduct; (c) violation of applicable laws; or (d) actions that damage TRICCI's reputation or business.

9.3 Upon termination, the Consultant's access to the platform shall be revoked immediately. Any pending fees for placements completed prior to termination shall be processed in accordance with Section 4.

9.4 Clauses 5 (Non-Circumvention), 6 (Data Privacy), and 8 (Intellectual Property) shall survive termination of this Agreement.`,
  },
  {
    title: '10. LIMITATION OF LIABILITY',
    content: `10.1 TRICCI's total liability to the Consultant under this Agreement shall not exceed the total fees paid to the Consultant in the 3 months preceding the claim.

10.2 TRICCI shall not be liable for any indirect, incidental, consequential, or punitive damages arising from the use of the platform or the performance of this Agreement.

10.3 TRICCI does not warrant that the platform will be available uninterrupted or error-free, and shall not be liable for any losses arising from platform downtime or technical issues.`,
  },
  {
    title: '11. GOVERNING LAW & DISPUTE RESOLUTION',
    content: `11.1 This Agreement shall be governed by and construed in accordance with the laws of India.

11.2 Any dispute arising out of or in connection with this Agreement shall first be attempted to be resolved through good-faith negotiation between the parties.

11.3 If negotiation fails, disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with a sole arbitrator appointed by mutual consent. The seat of arbitration shall be Mumbai, Maharashtra.

11.4 The courts of Mumbai, Maharashtra shall have exclusive jurisdiction over any matters not subject to arbitration.`,
  },
  {
    title: '12. DIGITAL EXECUTION & LEGAL VALIDITY',
    content: `12.1 This Agreement is executed digitally through the TRICCI platform. The digital execution constitutes a legally binding agreement under the Information Technology Act, 2000 (India) and the Indian Contract Act, 1872.

12.2 The execution log including the Consultant's name, agency name, designation, IP address, timestamp, and cryptographic hash shall serve as conclusive evidence of acceptance of this Agreement.

12.3 By clicking "I Accept & Execute Agreement", the Consultant confirms that: (a) they have read and understood the entire Agreement; (b) they have the authority to bind their entity to this Agreement; (c) they agree to be bound by all terms and conditions herein; and (d) they consent to the digital execution being legally equivalent to a wet-ink signature.`,
  },
];

export default function ConsultantAgreementModal({ onAccepted }: Props) {
  const [step, setStep] = useState<'read' | 'kyc' | 'confirm' | 'done'>('read');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [form, setForm] = useState({ agencyName: '', signatoryName: '', designation: '' });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<{
    signedAt: string; hash: string; ip: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolledToBottom(true);
    }
  }

  async function handleSubmit() {
    if (!agreed) { setError('Please confirm you have read and agree to the terms'); return; }
    if (!form.agencyName.trim() || !form.signatoryName.trim() || !form.designation.trim()) {
      setError('All KYC fields are required'); return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/consultant/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { success?: boolean; signedAt?: string; hash?: string; ip?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to record agreement');
      setExecutionLog({ signedAt: data.signedAt!, hash: data.hash!, ip: data.ip! });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const now = new Date();
  const istString = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'medium' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              TRICCI Recruitment Consultant Agreement
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 'read' && 'Read the full agreement before proceeding'}
              {step === 'kyc' && 'Step 2 of 3 — KYC & Signatory Details'}
              {step === 'confirm' && 'Step 3 of 3 — Review & Execute'}
              {step === 'done' && 'Agreement executed successfully'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {['read', 'kyc', 'confirm'].map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                step === s ? 'bg-secondary' :
                ['read', 'kyc', 'confirm'].indexOf(step) > i ? 'bg-green-400' : 'bg-muted'
              }`} />
            ))}
          </div>
        </div>

        {/* ── STEP: READ ── */}
        {step === 'read' && (
          <>
            <div className="px-5 py-3 bg-yellow-500/8 border-b border-yellow-500/20 shrink-0">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
                  You must read the entire agreement before you can access live job mandates. Scroll to the bottom to proceed.
                </p>
              </div>
            </div>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
            >
              {/* Agreement header */}
              <div className="text-center border-b border-border pb-5">
                <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-2 mb-3">
                  <Shield size={14} className="text-secondary" />
                  <span className="text-xs font-black text-secondary uppercase tracking-wider">TRICCI Platform Agreement</span>
                </div>
                <h3 className="text-lg font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  RECRUITMENT CONSULTANT AGREEMENT
                </h3>
                <p className="text-xs text-muted-foreground">Version 1.0 &bull; Effective June 2025 &bull; Governed by Indian Law</p>
              </div>

              {AGREEMENT_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {section.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}

              {/* Scroll sentinel */}
              <div className="pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">— End of Agreement —</p>
                {scrolledToBottom && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-3 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2">
                    <CheckCircle size={13} className="text-green-400" />
                    <span className="text-xs text-green-400 font-semibold">You&rsquo;ve read the full agreement</span>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-border shrink-0">
              <button
                onClick={() => setStep('kyc')}
                disabled={!scrolledToBottom}
                className="w-full py-3 rounded-xl bg-secondary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scrolledToBottom ? 'Proceed to KYC Details →' : 'Scroll to bottom to continue'}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                You must scroll through the entire agreement before proceeding
              </p>
            </div>
          </>
        )}

        {/* ── STEP: KYC ── */}
        {step === 'kyc' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="bg-muted/40 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These details will be recorded in the digital execution log and serve as your legal identity on the TRICCI platform. Please ensure all information is accurate and matches your official business records.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
                  <Building2 size={14} className="text-secondary" />
                  Consultant Entity / Agency Name *
                </label>
                <input
                  value={form.agencyName}
                  onChange={e => setForm(f => ({ ...f, agencyName: e.target.value }))}
                  placeholder="e.g. Apex Talent Solutions Pvt. Ltd. or your full name if individual"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter your registered company name or your full legal name if operating as an individual consultant</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
                  <User size={14} className="text-secondary" />
                  Authorized Signatory Name *
                </label>
                <input
                  value={form.signatoryName}
                  onChange={e => setForm(f => ({ ...f, signatoryName: e.target.value }))}
                  placeholder="Full legal name of the person executing this agreement"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">Must be the person who has authority to bind the entity to this agreement</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
                  <Briefcase size={14} className="text-secondary" />
                  Designation / Capacity *
                </label>
                <input
                  value={form.designation}
                  onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                  placeholder="e.g. Founder, Director, Managing Partner, Proprietor"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <XCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-border shrink-0">
              <button onClick={() => setStep('read')}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
              <button
                onClick={() => {
                  if (!form.agencyName.trim() || !form.signatoryName.trim() || !form.designation.trim()) {
                    setError('All fields are required'); return;
                  }
                  setError(null); setStep('confirm');
                }}
                className="flex-1 py-3 rounded-xl bg-secondary text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Review & Execute →
              </button>
            </div>
          </>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="bg-muted/40 border border-border rounded-2xl p-5">
                <p className="text-xs font-black text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Hash size={13} className="text-secondary" />
                  TRICCI SYSTEM DIGITAL EXECUTION LOG
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Consultant Entity / Agency Name', value: form.agencyName },
                    { label: 'Authorized Signatory Name', value: form.signatoryName },
                    { label: 'Designation / Capacity', value: form.designation },
                    { label: 'Execution Timestamp', value: `${istString} IST` },
                    { label: 'Originating IP Address', value: 'Captured on submission' },
                    { label: 'Cryptographic Signature Hash', value: 'SHA-256 — Generated on submission' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                      <p className="text-xs text-muted-foreground w-48 shrink-0">{label}</p>
                      <p className="text-xs font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-secondary/8 border border-secondary/20 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-secondary shrink-0"
                  />
                  <span className="text-xs text-foreground leading-relaxed">
                    I, <strong>{form.signatoryName}</strong>, acting in my capacity as <strong>{form.designation}</strong> of <strong>{form.agencyName}</strong>, confirm that I have read, understood, and agree to be legally bound by the TRICCI Recruitment Consultant Agreement in its entirety. I understand that this digital execution is legally equivalent to a wet-ink signature under the Information Technology Act, 2000 (India).
                  </span>
                </label>
              </div>

              <div className="flex items-start gap-2 bg-muted/30 border border-border rounded-xl px-4 py-3">
                <Lock size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your execution details will be cryptographically hashed and stored securely. This record is immutable and serves as legal proof of your acceptance.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <XCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-border shrink-0">
              <button onClick={() => setStep('kyc')} disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!agreed || submitting}
                className="flex-1 py-3 rounded-xl bg-secondary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Recording…</>
                ) : 'I Accept & Execute Agreement'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: DONE ── */}
        {step === 'done' && executionLog && (
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4">
              <CheckCircle size={28} className="text-green-400" />
            </motion.div>
            <h3 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Agreement Executed Successfully
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Your digital signature has been recorded. You now have full access to live job mandates on TRICCI.
            </p>

            <div className="w-full bg-muted/40 border border-border rounded-2xl p-5 text-left space-y-3 mb-6">
              <p className="text-xs font-black text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Hash size={13} className="text-green-400" />
                Execution Receipt
              </p>
              {[
                { label: 'Entity / Agency', value: form.agencyName },
                { label: 'Signatory', value: form.signatoryName },
                { label: 'Designation', value: form.designation },
                { label: 'Signed At (IST)', value: new Date(executionLog.signedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'medium' }) },
                { label: 'IP Address', value: executionLog.ip },
                { label: 'SHA-256 Hash', value: executionLog.hash.slice(0, 32) + '…' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <p className="text-xs text-muted-foreground w-36 shrink-0">{label}</p>
                  <p className="text-xs font-mono font-semibold text-foreground break-all">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={onAccepted}
              className="w-full py-3 rounded-xl bg-secondary text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Access Live Job Mandates →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
