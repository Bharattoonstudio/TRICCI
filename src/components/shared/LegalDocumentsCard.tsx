/**
 * LegalDocumentsCard — shown on the employer and consultant "My Account"
 * pages. Shows agreement acceptance status (signed date, signatory) and
 * lets the user download the full agreement text at any time — closes
 * the "where can I find/download our agreement" gap.
 */
import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, Loader2 } from 'lucide-react';

interface LegalDocumentsCardProps {
  role: 'employer' | 'consultant';
  theme?: 'light' | 'dark';
}

interface AgreementStatus {
  signed: boolean;
  signedAt?: string;
  signatoryName?: string;
  designation?: string;
  agencyName?: string;
}

export default function LegalDocumentsCard({ role, theme = 'light' }: LegalDocumentsCardProps) {
  const [status, setStatus] = useState<AgreementStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    fetch(`/api/${role}/agreement`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [role]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/legal/${role}-agreement`);
      const data = await res.json();
      const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TRICCI-${role === 'employer' ? 'Employer' : 'Consultant'}-Agreement.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={`rounded-2xl border p-6 ${isDark ? '' : 'bg-card border-border'}`} style={isDark ? { background: '#0d0d0d', borderColor: '#ffffff0d' } : undefined}>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className={isDark ? 'text-primary' : 'text-primary'} />
        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-foreground'}`}>Legal Documents</h3>
      </div>

      <div className={`rounded-xl p-4 mb-3 ${isDark ? 'bg-white/5' : 'bg-muted'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-foreground'}`}>
              TRICCI {role === 'employer' ? 'Employer' : 'Consultant'} Master Service Agreement
            </p>
            {status?.signed ? (
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                <CheckCircle2 size={11} />
                Signed by {status.signatoryName}{status.designation ? `, ${status.designation}` : ''} on {status.signedAt ? new Date(status.signedAt).toLocaleDateString('en-IN') : '—'}
              </p>
            ) : (
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-muted-foreground'}`}>Not yet signed</p>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 shrink-0 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Download
          </button>
        </div>
      </div>

      <p className={`text-[11px] ${isDark ? 'text-white/30' : 'text-muted-foreground'}`}>
        This is the agreement you accepted to use TRICCI as {role === 'employer' ? 'an employer' : 'a consultant'}. Download a copy for your records at any time.
      </p>
    </div>
  );
}
