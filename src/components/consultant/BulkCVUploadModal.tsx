import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';

interface BulkUploadResult {
  fileName: string;
  status: 'processing' | 'success' | 'error';
  message: string;
  candidateData?: any;
}

interface BulkCVUploadModalProps {
  onClose: () => void;
  onSuccess: (candidatesData: any[]) => void;
}

export default function BulkCVUploadModal({ onClose, onSuccess }: BulkCVUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BulkUploadResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['pdf', 'doc', 'docx'].includes(ext || '');
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['pdf', 'doc', 'docx'].includes(ext || '');
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setResults(files.map(f => ({ fileName: f.name, status: 'processing' as const, message: 'Processing...' })));

    const successfulCandidates = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/consultant/cv-bank/parse', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          successfulCandidates.push(data);
          setResults(prev => [
            ...prev.slice(0, i),
            { fileName: file.name, status: 'success', message: `${data.name} - Added to CV Bank`, candidateData: data },
            ...prev.slice(i + 1),
          ]);
        } else {
          setResults(prev => [
            ...prev.slice(0, i),
            { fileName: file.name, status: 'error', message: 'Failed to parse CV' },
            ...prev.slice(i + 1),
          ]);
        }
      } catch (error) {
        setResults(prev => [
          ...prev.slice(0, i),
          { fileName: file.name, status: 'error', message: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error') },
          ...prev.slice(i + 1),
        ]);
      }
    }

    setIsProcessing(false);

    // Auto-close and notify if all successful
    if (successfulCandidates.length === files.length) {
      setTimeout(() => {
        onSuccess(successfulCandidates);
        onClose();
      }, 1000);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto"
        style={{ background: '#0d0d0d', borderColor: '#333' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Bulk Upload PDF/Word CVs</h2>
            <p className="text-sm text-white/50 mt-0.5">Upload multiple CVs at once for batch processing</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {results.length === 0 ? (
            <>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                style={{ borderColor: '#ffffff20' }}>
                <Upload className="mx-auto mb-3 text-white/40" size={32} />
                <p className="text-sm font-semibold text-white mb-1">Drag & drop PDF or Word files here</p>
                <p className="text-xs text-white/50">or click to browse</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Selected Files ({files.length})</h3>
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-white/50" />
                        <span className="text-sm text-white">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-white/40 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-4 py-2 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/10 transition-colors">
                  {files.length > 0 ? 'Add More' : 'Select Files'}
                </button>
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {isProcessing ? 'Processing...' : `Process ${files.length > 0 ? `${files.length}` : ''} Files`}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Results */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Upload Results</h3>
                  <div className="text-xs text-white/50">
                    {successCount} successful • {errorCount} failed
                  </div>
                </div>

                {results.map((result, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      result.status === 'success'
                        ? 'bg-green-500/10 border-green-500/20'
                        : result.status === 'error'
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-blue-500/10 border-blue-500/20'
                    }`}>
                    {result.status === 'success' && <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />}
                    {result.status === 'error' && <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />}
                    {result.status === 'processing' && <Loader2 size={16} className="text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{result.fileName}</p>
                      <p className="text-xs text-white/50 mt-0.5">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {!isProcessing && (
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setFiles([]);
                      setResults([]);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-white font-semibold hover:bg-white/5 transition-colors">
                    Upload More
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity">
                    Done
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </motion.div>
    </motion.div>
  );
}
