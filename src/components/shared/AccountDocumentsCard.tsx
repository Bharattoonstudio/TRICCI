/**
 * AccountDocumentsCard — generic document upload/management for the
 * employer and consultant My Account pages (GST certificates, agency
 * registration, incorporation docs, etc.) — separate from the platform
 * agreement, which has its own dedicated flow and card.
 */
import { useState, useEffect, useRef } from 'react';
import { Folder, Upload, Download, Trash2, Loader2, FileText } from 'lucide-react';

interface AccountDocumentsCardProps {
  theme?: 'light' | 'dark';
}

interface DocumentRow {
  id: number;
  label: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AccountDocumentsCard({ theme = 'light' }: AccountDocumentsCardProps) {
  const isDark = theme === 'dark';
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/account/documents')
      .then(r => r.json())
      .then((d: { documents?: DocumentRow[] }) => setDocuments(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleUpload() {
    setError('');
    if (!label.trim()) { setError('Please give this document a label (e.g. "GST Certificate").'); return; }
    if (!file) { setError('Please choose a file.'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('label', label.trim());
      fd.append('file', file);
      const res = await fetch('/api/account/documents', { method: 'POST', body: fd });
      if (res.ok) {
        setLabel('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to upload document.');
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    setDocuments(prev => prev.filter(d => d.id !== id));
    fetch(`/api/account/documents/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className={`rounded-2xl border p-6 ${isDark ? '' : 'bg-card border-border'}`} style={isDark ? { background: '#0d0d0d', borderColor: '#ffffff0d' } : undefined}>
      <div className="flex items-center gap-2 mb-4">
        <Folder size={16} className="text-primary" />
        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-foreground'}`}>Documents</h3>
      </div>
      <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-muted-foreground'}`}>
        Upload GST certificates, registration documents, or other files you want on record with TRICCI.
      </p>

      {/* Upload form */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. GST Certificate"
          className={`flex-1 text-sm rounded-lg px-3 py-2 border focus:outline-none ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-muted border-border text-foreground placeholder:text-muted-foreground'}`}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className={`text-xs ${isDark ? 'text-white/40' : 'text-muted-foreground'} file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:text-xs file:font-semibold ${isDark ? 'file:border-white/10 file:bg-white/5 file:text-white' : 'file:border-border file:bg-muted file:text-foreground'}`}
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 shrink-0"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Upload
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={16} className={`animate-spin ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} /></div>
      ) : documents.length === 0 ? (
        <p className={`text-xs text-center py-4 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`}>No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${isDark ? 'bg-white/5' : 'bg-muted'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={14} className={isDark ? 'text-white/40' : 'text-muted-foreground'} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-foreground'}`}>{doc.label}</p>
                  <p className={`text-[11px] truncate ${isDark ? 'text-white/30' : 'text-muted-foreground'}`}>{doc.fileName} · {formatSize(doc.fileSize)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
                  <Download size={12} />
                </a>
                <button onClick={() => handleDelete(doc.id)} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
