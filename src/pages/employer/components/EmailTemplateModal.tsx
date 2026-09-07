import { useState } from 'react';
import { motion } from 'motion/react';
import { XCircle, Mail, CheckCircle, Copy, Send } from 'lucide-react';
import type { DashboardJob } from './types.js';

interface EmailTemplateModalProps {
  job: DashboardJob;
  onClose: () => void;
}

export default function EmailTemplateModal({ job, onClose }: EmailTemplateModalProps) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const commissionAmount = job.ctcMin && job.ctcMax
    ? `₹${Math.round(job.ctcMin * job.fee / 100)}L – ₹${Math.round(job.ctcMax * job.fee / 100)}L`
    : `${job.fee}% of first-year CTC`;

  const emailBody = `Subject: New Job Requisition Posted — ${job.jobCode || 'N/A'} | ${job.title}

Dear TRICCI Admin Team,

We have posted a new job requisition on the TRICCI platform. Please review and ensure it goes live immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JOB REQUISITION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Job Code       : ${job.jobCode || 'Auto-assigned on post'}
Position       : ${job.title}
Department     : ${job.department || 'Not specified'}
Location       : ${job.location}
Work Type      : ${job.locationType || 'Not specified'}
CTC Range      : ${job.ctc}
Experience     : ${job.description ? 'As per JD' : 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMISSION & FEE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Placement Fee  : ${job.fee}% of first-year CTC
Fee Amount     : ${commissionAmount} (estimated)
Payment Terms  : Payable on successful placement only
Invoice Basis  : First-year gross CTC of placed candidate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERVIEW PROCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${job.interviewRounds && job.interviewRounds.length > 0
  ? job.interviewRounds.map((r, i) => `Round ${i + 1}: ${r.label}${r.description ? ` — ${r.description}` : ''}`).join('\n')
  : 'Interview rounds to be confirmed by hiring manager.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${job.skills && job.skills.length > 0 ? job.skills.join(', ') : 'As per Job Description attached.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please confirm receipt and ensure the requisition is visible to verified consultants on the platform at the earliest.

For any clarifications, please reach out to the hiring team directly.

Best regards,
Employer — TRICCI Platform
Posted via: https://tricci.in/employer/dashboard`;

  function copyToClipboard() {
    navigator.clipboard.writeText(emailBody).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function sendToAdmin() {
    setSending(true);
    // Simulate send
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4 z-10">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-primary" />
            <span className="text-sm font-black text-foreground">Email Template — Admin Notification</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <XCircle size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info */}
          <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <Mail size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is a standard notification template to inform the TRICCI admin team about your new job posting. It includes the JD summary, fee structure, and commission details.
            </p>
          </div>

          {/* Email preview */}
          <div className="bg-muted/40 border border-border rounded-xl p-4">
            <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">{emailBody}</pre>
          </div>

          {sent ? (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
              <CheckCircle size={15} className="text-green-400 shrink-0" />
              <p className="text-sm text-green-400 font-semibold">Email sent to TRICCI admin team successfully.</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                {copied ? <><CheckCircle size={14} className="text-green-400" /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
              </button>
              <button onClick={sendToAdmin} disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
                {sending ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Sending…</>
                ) : (
                  <><Send size={14} /> Send to Admin</>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
