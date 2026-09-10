/**
 * ConsultantDocumentsModal — consultant views what the employer has
 * requested for their candidate, and uploads documents on their behalf.
 * Visible only to {consultant, employer} — the candidate never sees these.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Upload, FileText, Download, CheckCircle2, Clock } from 'lucide-react';

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
  uploadedAt: string;
}

interface ConsultantDocumentsModalProps {
  submissionId: number;
  candidateName: string;
  onClose: () => void;
}

export default function ConsultantDocumentsModal({ submissionId, candidateName, onClose }: ConsultantDocumentsModalProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [documents, setDocuments] = useState<DocSubmission[]>([]);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch(`/api/consultant/submissions/${submissionId}/documents`)
      .then(r => r.json())
      .then(d => { setRequests(d.requests || []); setDocuments(d.documents || []); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [submissionId]);

  async function handleUpload(requestId?: number, presetLabel?: string) {
    const file = fileInputRef.current?.files?.[0];
    const label = (presetLabel || uploadLabel).trim();
    if (!label) { setError('Enter a document name'); return; }
    if (!file) { setError('Choose a file'); return; }

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('label', label);
      if (requestId) fd.append('requestId', String(requestId));
      const res = await fetch(`/api/consultant/submissions/${submissionId}/documents/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadLabel('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
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
            {requests.length === 0 && documents.length === 0 && (
              <p className="text-xs text-muted-foreground">No document requests yet.</p>
            )}

            {requests.filter(r => r.status !== 'completed').map(r => (
              <div key={r.id} className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock size={12} className="text-amber-500" />
                  <span className="text-xs font-bold text-foreground">Requested</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{r.documentLabels.join(', ')}</p>
                {r.message && <p className="text-[11px] text-muted-foreground italic mb-2">"{r.message}"</p>}
                <div className="flex gap-1.5">
                  <input ref={fileInputRef} type="file" className="flex-1 text-[11px] text-muted-foreground" />
                  <button onClick={() => handleUpload(r.id, r.documentLabels[0])} disabled={uploading}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
                    {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    Upload
                  </button>
                </div>
              </div>
            ))}

            {documents.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Uploaded</h3>
                <div className="space-y-1.5">
                  {documents.map(doc => (
                    <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg p-2 hover:bg-muted transition-colors">
                      <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                      <span className="flex-1 truncate text-foreground font-medium">{doc.documentLabel}</span>
                      <Download size={12} className="text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Upload Additional Document</h3>
              <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)}
                placeholder="Document name (e.g. PAN Card)"
                className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground mb-2" />
              <div className="flex gap-1.5">
                <input ref={fileInputRef} type="file" className="flex-1 text-[11px] text-muted-foreground" />
                <button onClick={() => handleUpload()} disabled={uploading}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
                  {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  Upload
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
