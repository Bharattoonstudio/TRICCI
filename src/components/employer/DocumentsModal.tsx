/**
 * DocumentsModal — employer requests documents (PAN, payslips, relieving
 * letter, etc.) from a shortlisted/selected candidate, and views whatever
 * has been uploaded so far. Works for both consultant submissions and
 * direct candidate applications (entityType picks the right API).
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Send, FileText, Download, Plus, CheckCircle2, Clock } from 'lucide-react';

interface DocRequest {
  id: number;
  documentLabels: string[];
  message: string | null;
  status: string;
  createdAt: string;
}
interface DocSubmission {
  id: number;
  documentLabel: string;
  fileUrl: string;
  fileName: string;
  uploadedByRole: 'consultant' | 'candidate';
  uploadedAt: string;
}

interface DocumentsModalProps {
  entityType: 'submission' | 'application';
  entityId: number;
  candidateName: string;
  onClose: () => void;
}

const COMMON_LABELS = [
  'PAN Card', 'Aadhar Card', 'Latest 3 Payslips', 'Relieving Letter',
  'Experience Letter', 'Education Certificates', 'Previous Offer Letter', 'Bank Statement',
];

export default function DocumentsModal({ entityType, entityId, candidateName, onClose }: DocumentsModalProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [documents, setDocuments] = useState<DocSubmission[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [customLabel, setCustomLabel] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const apiBase = entityType === 'submission' ? `/api/employer/submissions/${entityId}` : `/api/employer/applications/${entityId}`;

  function load() {
    setLoading(true);
    fetch(`${apiBase}/documents`)
      .then(r => r.json())
      .then(d => { setRequests(d.requests || []); setDocuments(d.documents || []); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [entityType, entityId]);

  function toggleLabel(label: string) {
    setSelectedLabels(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  function addCustomLabel() {
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    setSelectedLabels(prev => new Set(prev).add(trimmed));
    setCustomLabel('');
  }

  async function handleSendRequest() {
    if (selectedLabels.size === 0) { setError('Select at least one document'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/documents/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentLabels: Array.from(selectedLabels), message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send request');
      setSelectedLabels(new Set());
      setMessage('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Documents — {candidateName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            {/* Uploaded documents */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Uploaded ({documents.length})</h3>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing uploaded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {documents.map(doc => (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg p-2 hover:bg-muted transition-colors">
                      <FileText size={14} className="text-primary shrink-0" />
                      <span className="flex-1 truncate text-foreground font-medium">{doc.documentLabel}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">via {doc.uploadedByRole}</span>
                      <Download size={12} className="text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Past requests */}
            {requests.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Requests Sent</h3>
                <div className="space-y-1.5">
                  {requests.map(r => (
                    <div key={r.id} className="text-xs bg-muted/40 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        {r.status === 'completed'
                          ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                          : <Clock size={12} className="text-amber-500 shrink-0" />}
                        <span className="font-medium text-foreground capitalize">{r.status}</span>
                      </div>
                      <p className="text-muted-foreground">{r.documentLabels.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New request */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Request Documents</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_LABELS.map(label => (
                  <button key={label} onClick={() => toggleLabel(label)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                      selectedLabels.has(label) ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
                    }`}>
                    {label}
                  </button>
                ))}
                {Array.from(selectedLabels).filter(l => !COMMON_LABELS.includes(l)).map(label => (
                  <button key={label} onClick={() => toggleLabel(label)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-full border bg-primary/15 border-primary/40 text-primary">
                    {label} ×
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mb-2">
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomLabel())}
                  placeholder="Custom document name"
                  className="flex-1 text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground" />
                <button onClick={addCustomLabel} className="px-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground">
                  <Plus size={14} />
                </button>
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Optional note for the candidate"
                rows={2}
                className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground mb-2 resize-none" />
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button onClick={handleSendRequest} disabled={submitting}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send Request
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
