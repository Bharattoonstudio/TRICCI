import { useEffect, useState } from 'react';
import { Sparkles, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface EnhancedCvContent {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  summary: string;
  skills: string[];
  experience?: Array<{ title: string; company: string; duration: string; bullets: string[] }>;
  education?: Array<{ degree: string; institution: string; year: string }>;
}

export interface ApprovedCv {
  cvUrl: string;
  cvFileName: string;
  matchScore: number;
}

interface Props {
  jobId: string;
  open: boolean;
  onClose: () => void;
  /** Called once the candidate approves — parent should attach this to the application on Apply */
  onApprove: (approved: ApprovedCv) => void;
}

type Status = 'loading' | 'ready' | 'no_cv' | 'error';

export default function CvEnhanceModal({ jobId, open, onClose, onApprove }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [before, setBefore] = useState(0);
  const [after, setAfter] = useState(0);
  const [gaps, setGaps] = useState<string[]>([]);
  const [cv, setCv] = useState<EnhancedCvContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approved, setApproved] = useState<ApprovedCv | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('loading');
    setApproved(null);
    fetch('/api/candidate/cv-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.enhanced || !data.enhancedCv) {
          setStatus(data.reason === 'no_cv_data' ? 'no_cv' : 'error');
          setMessage(data.message || 'Could not analyze your CV right now. Please try again shortly.');
          return;
        }
        setBefore(data.matchScoreBefore ?? 0);
        setAfter(data.matchScoreAfter ?? 0);
        setGaps(data.gaps ?? []);
        setCv(data.enhancedCv);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong while analyzing your CV. Please try again.');
      });
  }, [open, jobId]);

  async function handleApproveAndDownload() {
    if (!cv) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/candidate/cv-enhance/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, cv }),
      });
      const data = await res.json();
      if (!res.ok || !data.cvUrl) {
        setMessage('Could not generate your enhanced CV PDF. Please try again.');
        return;
      }
      const result: ApprovedCv = { cvUrl: data.cvUrl, cvFileName: data.cvFileName, matchScore: after };
      setApproved(result);
      onApprove(result);

      // Trigger a real download with a friendly filename
      const a = document.createElement('a');
      a.href = data.cvUrl;
      a.download = data.cvFileName || 'Enhanced CV.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setMessage('Could not generate your enhanced CV PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function scoreColor(score: number) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            AI CV Enhancer
          </DialogTitle>
        </DialogHeader>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <span className="animate-spin inline-block w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" />
            <p className="text-sm text-muted-foreground">Analyzing your CV against this job's requirements…</p>
          </div>
        )}

        {status === 'no_cv' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <AlertTriangle size={28} className="text-amber-500" />
            <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
            <button onClick={onClose} className="mt-2 text-sm font-semibold text-primary hover:underline">
              Close
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <AlertTriangle size={28} className="text-red-500" />
            <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
            <button onClick={onClose} className="mt-2 text-sm font-semibold text-primary hover:underline">
              Close
            </button>
          </div>
        )}

        {status === 'ready' && cv && (
          <div className="space-y-5">
            {/* Match score */}
            <div className="flex items-center justify-around bg-muted/40 rounded-xl py-4 px-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Before</p>
                <p className={`text-2xl font-black ${scoreColor(before)}`}>{before}%</p>
              </div>
              <ArrowRightIcon />
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">After Enhancement</p>
                <p className={`text-2xl font-black ${scoreColor(after)}`}>{after}%</p>
              </div>
            </div>

            {after < 80 && (
              <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Your genuine match is currently {after}%. We only enhance your CV with skills and experience you actually have —
                we never fabricate qualifications. Consider the skill gaps below.
              </p>
            )}

            {gaps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Genuine skill gaps (not added to your CV)</p>
                <div className="flex flex-wrap gap-1.5">
                  {gaps.map((g, i) => (
                    <span key={i} className="text-xs bg-red-500/10 text-red-600 border border-red-500/20 rounded-full px-2.5 py-1">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
              <div>
                <p className="font-bold text-foreground">{cv.name}</p>
                {cv.currentTitle && <p className="text-sm text-primary font-semibold">{cv.currentTitle}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tailored Summary</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{cv.summary}</p>
              </div>
              {cv.skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Skills Highlighted</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.skills.map((s, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {cv.experience?.length ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Experience</p>
                  <div className="space-y-2">
                    {cv.experience.slice(0, 3).map((exp, i) => (
                      <div key={i}>
                        <p className="text-sm font-semibold text-foreground">{exp.title} — {exp.company}</p>
                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mt-0.5">
                          {exp.bullets?.slice(0, 3).map((b, j) => <li key={j}>{b}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Actions */}
            {approved ? (
              <div className="flex items-center gap-2 bg-green-600/10 text-green-600 border border-green-600/30 font-semibold py-3 px-4 rounded-xl text-sm">
                <CheckCircle2 size={16} />
                Approved — this enhanced CV ({approved.matchScore}% match) will be submitted with your application. It's also been downloaded to your device.
              </div>
            ) : (
              <button
                onClick={handleApproveAndDownload}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
              >
                {generating ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating PDF…</>
                ) : (
                  <><Download size={15} /> Approve, Download &amp; Use for this Application</>
                )}
              </button>
            )}

            <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1">
              {approved ? 'Done' : "Skip — I'll apply with my original CV"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-muted-foreground shrink-0">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
