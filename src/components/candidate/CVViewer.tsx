import { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CVViewerProps {
  cvUrl: string;
  fileName?: string;
  onClose: () => void;
}

/**
 * Modal preview for an uploaded CV. Browsers can't render .docx inline, so
 * this fetches a server-extracted plain-text preview (via /api/candidate/cv-preview)
 * and shows it in a readable panel, with a direct download button as the
 * reliable fallback either way.
 */
export default function CVViewer({ cvUrl, fileName, onClose }: CVViewerProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/candidate/cv-preview');
        if (!res.ok) {
          if (!cancelled) setError('Couldn\u2019t load a preview for this file.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.text) setText(data.text);
        else setError('Preview isn\u2019t available for this file \u2014 you can still download it below.');
      } catch {
        if (!cancelled) setError('Couldn\u2019t load a preview for this file.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.15 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 p-5 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-primary" />
              </div>
              <p className="font-bold text-foreground text-sm truncate">{fileName ?? 'Your CV'}</p>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 size={22} className="animate-spin" />
                <p className="text-sm">Loading preview\u2026</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <AlertCircle size={22} className="text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
              </div>
            )}

            {!loading && !error && text && (
              <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                {text}
              </pre>
            )}
          </div>

          <div className="p-4 border-t border-border shrink-0">
            <a href={cvUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
              <Download size={14} /> Download original file
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
