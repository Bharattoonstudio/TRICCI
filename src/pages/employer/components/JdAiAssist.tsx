import { useRef, useState } from 'react';
import { Sparkles, Upload, XCircle } from 'lucide-react';

export interface JdFormValues {
  title: string;
  location: string;
  experience: string;
  skills: string;
  description: string;
  responsibilities: string;
  requirements: string;
}

interface Draft {
  title?: string;
  summary?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  skills?: string;
}

interface Props {
  values: JdFormValues;
  onApply: (patch: Partial<JdFormValues>) => void;
}

async function readJson(res: Response): Promise<{ draft?: Draft | null; text?: string | null; reason?: string; message?: string; error?: string }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const errorFor = (reason?: string, message?: string, error?: string) => {
  if (message) return message;
  if (error) return error;
  switch (reason) {
    case 'ai_not_configured': return 'AI writing is not switched on yet. Please write the description yourself for now.';
    case 'ai_error': return 'AI could not create a draft right now. Please try again in a moment.';
    case 'no_text': return 'We could not read text from that file. Try a Word or text version.';
    case 'extract_failed': return 'That file could not be read. Try a Word or text version.';
    default: return 'Something went wrong. Please try again.';
  }
};

/**
 * "Write with AI" panel for the job description step.
 * 1. Enhance the write-up the employer has already written.
 * 2. Create a complete draft from just the position name.
 * 3. Upload a PDF/Word JD and have AI enhance it.
 * Every AI result is shown as a preview. Nothing is applied until the employer clicks "Use this draft".
 */
export default function JdAiAssist({ values, onApply }: Props) {
  const [busy, setBusy] = useState<null | 'enhance' | 'generate' | 'upload'>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSource, setDraftSource] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const hasWriteUp = Boolean(values.description.trim() || values.responsibilities.trim() || values.requirements.trim());

  async function callDraft(payload: Record<string, unknown>, source: string) {
    setError(null);
    setDraft(null);
    setBusy(source === 'generate' ? 'generate' : 'enhance');
    try {
      const res = await fetch('/api/jobs/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await readJson(res);
      if (!res.ok || !data.draft) {
        setError(errorFor(data.reason, data.message, data.error));
        return;
      }
      setDraft(data.draft);
      setDraftSource(source);
    } catch {
      setError('Network problem. Please check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  function enhanceWriteUp() {
    return callDraft({
      mode: 'enhance',
      title: values.title,
      description: values.description,
      responsibilities: values.responsibilities,
      requirements: values.requirements,
      skills: values.skills,
      location: values.location,
      experience: values.experience,
    }, 'enhance');
  }

  function generateFromTitle() {
    if (!values.title.trim()) {
      setError('Enter the position name in Basic Details first.');
      return;
    }
    return callDraft({
      mode: 'generate',
      title: values.title,
      location: values.location,
      experience: values.experience,
      skills: values.skills,
    }, 'generate');
  }

  async function enhanceUpload(file: File) {
    setError(null);
    setDraft(null);
    setBusy('upload');
    try {
      const form = new FormData();
      form.append('jd', file);
      const res = await fetch('/api/jobs/ai-draft/extract', { method: 'POST', body: form, credentials: 'include' });
      const data = await readJson(res);
      if (!res.ok || !data.text) {
        setError(errorFor(data.reason, data.message, data.error));
        setBusy(null);
        return;
      }
      setBusy(null);
      await callDraft({
        mode: 'enhance',
        title: values.title,
        description: data.text,
        skills: values.skills,
        location: values.location,
        experience: values.experience,
      }, 'upload');
    } catch {
      setError('Network problem. Please check your connection and try again.');
      setBusy(null);
    }
  }

  function applyDraft() {
    if (!draft) return;
    const patch: Partial<JdFormValues> = {};
    if (draft.description) patch.description = draft.description;
    if (draft.responsibilities) patch.responsibilities = draft.responsibilities;
    if (draft.requirements) patch.requirements = draft.requirements;
    if (draft.skills && !values.skills.trim()) patch.skills = draft.skills;
    if (draft.title && !values.title.trim()) patch.title = draft.title;
    onApply(patch);
    setDraft(null);
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition';

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">Write with AI</p>
      </div>
      <p className="text-xs text-muted-foreground">
        AI creates a draft for you to review. Nothing is changed until you click “Use this draft”.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={!hasWriteUp || busy !== null} onClick={enhanceWriteUp}>
          {busy === 'enhance' ? 'Enhancing…' : 'Enhance my write-up'}
        </button>
        <button type="button" className={btn} disabled={!values.title.trim() || busy !== null} onClick={generateFromTitle}>
          {busy === 'generate' ? 'Creating…' : 'Create JD from position name'}
        </button>
        <button type="button" className={btn} disabled={busy !== null} onClick={() => fileRef.current?.click()}>
          <Upload size={12} /> {busy === 'upload' ? 'Reading file…' : 'Upload PDF/Word to enhance'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void enhanceUpload(f);
          }}
        />
      </div>

      {!hasWriteUp && <p className="text-xs text-muted-foreground">Write a few lines of the JD first to enhance it, or use the position name.</p>}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          <XCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draft && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              AI draft {draftSource === 'generate' ? '(created from position name)' : '(enhanced)'}
            </p>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setDraft(null)}>Discard</button>
          </div>
          {draft.summary && <p className="text-xs text-muted-foreground">{draft.summary}</p>}
          {draft.description && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">About the role</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{draft.description}</p>
            </div>
          )}
          {draft.responsibilities && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Responsibilities</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{draft.responsibilities}</p>
            </div>
          )}
          {draft.requirements && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Requirements</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{draft.requirements}</p>
            </div>
          )}
          <p className="text-[11px] text-amber-600">Check every point before posting. AI can make mistakes, and pay, location and requirements must be correct.</p>
          <div className="flex gap-2">
            <button type="button" onClick={applyDraft}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
              Use this draft
            </button>
            <button type="button" onClick={() => setDraft(null)}
              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Keep my version
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
