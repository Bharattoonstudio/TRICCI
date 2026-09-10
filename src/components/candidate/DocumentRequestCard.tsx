/**
 * DocumentRequestCard — candidate's view of a single document request,
 * with inline upload. Uploaded documents show below with a checkmark.
 */
import { useState, useRef } from 'react';
import { Loader2, Upload, Clock, CheckCircle2, FileText, Download } from 'lucide-react';

interface DocSubmission {
  id: number;
  documentLabel: string;
  fileUrl: string;
  fileName: string;
}

interface DocRequestCardProps {
  request: {
    id: number;
    entityType: 'submission' | 'application';
    entityId: string;
    documentLabels: string[];
    message: string | null;
    status: string;
    jobTitle?: string | null;
    companyName?: string | null;
  };
  documents: DocSubmission[];
  onUploaded: () => void;
}

export default function DocumentRequestCard({ request, documents, onUploaded }: DocRequestCardProps) {
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLabelRef = useRef<string>('');

  const isCompleted = request.status === 'completed';
  const uploadedLabels = new Set(documents.filter(d => request.documentLabels.includes(d.documentLabel)).map(d => d.documentLabel));

  function triggerUpload(label: string) {
    pendingLabelRef.current = label;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = pendingLabelRef.current;
    setUploadingLabel(label);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('label', label);
      fd.append('entityType', request.entityType);
      fd.append('entityId', request.entityId);
      fd.append('requestId', String(request.id));
      const res = await fetch('/api/candidate/documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLabel(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className={`border rounded-xl p-5 ${isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-foreground text-base">{request.jobTitle || 'Document Request'}</h4>
          {request.companyName && <p className="text-sm text-muted-foreground">{request.companyName}</p>}
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ml-2 flex items-center gap-1 ${
          isCompleted ? 'bg-green-500/20 text-green-700' : 'bg-amber-500/20 text-amber-700'
        }`}>
          {isCompleted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {isCompleted ? 'Completed' : 'Pending'}
        </span>
      </div>

      {request.message && (
        <p className="text-xs text-muted-foreground italic mb-3">"{request.message}"</p>
      )}

      <div className="space-y-2">
        {request.documentLabels.map(label => {
          const uploaded = uploadedLabels.has(label);
          const doc = documents.find(d => d.documentLabel === label);
          return (
            <div key={label} className="flex items-center justify-between gap-2 bg-background/60 rounded-lg px-3 py-2">
              <span className="text-sm text-foreground flex items-center gap-2">
                {uploaded ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <FileText size={14} className="text-muted-foreground shrink-0" />}
                {label}
              </span>
              {uploaded && doc ? (
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0">
                  <Download size={12} /> View
                </a>
              ) : (
                <button onClick={() => triggerUpload(label)} disabled={uploadingLabel === label}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 shrink-0">
                  {uploadingLabel === label ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  Upload
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
