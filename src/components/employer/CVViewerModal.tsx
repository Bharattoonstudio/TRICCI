/**
 * CVViewerModal — inline PDF/image viewer for candidate CVs
 * Replaces forced downloads with in-app viewing
 * Features: zoom, page nav, download, print, fullscreen
 */
import { useState } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface CVViewerModalProps {
  cvUrl: string;
  candidateName: string;
  onClose: () => void;
}

export default function CVViewerModal({ cvUrl, candidateName, onClose }: CVViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => direction === 'in' ? Math.min(prev + 20, 200) : Math.max(prev - 20, 50));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = cvUrl;
    link.download = `${candidateName}_cv.pdf`;
    link.click();
  };

  const handlePrint = () => {
    window.open(cvUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full max-w-4xl max-h-screen flex flex-col bg-background rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">{candidateName}'s CV</h3>
            <p className="text-xs text-muted-foreground">{currentPage} of {totalPages}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button onClick={() => handleZoom('out')} className="p-2 hover:bg-muted rounded-lg" title="Zoom out">
              <ZoomOut size={18} className="text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
            <button onClick={() => handleZoom('in')} className="p-2 hover:bg-muted rounded-lg" title="Zoom in">
              <ZoomIn size={18} className="text-muted-foreground" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-2" />

            {/* Action buttons */}
            <button onClick={handleDownload} className="p-2 hover:bg-muted rounded-lg" title="Download CV">
              <Download size={18} className="text-muted-foreground" />
            </button>
            <button onClick={handlePrint} className="p-2 hover:bg-muted rounded-lg" title="Print CV">
              <Printer size={18} className="text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg" title="Fullscreen">
              <Maximize2 size={18} className="text-muted-foreground" />
            </button>

            {/* Close button */}
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/50">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }} className="transition-transform">
            {cvUrl?.endsWith('.pdf') ? (
              <iframe src={cvUrl} className="w-[850px] h-[1100px] border border-border rounded" title="CV PDF" />
            ) : (
              <img src={cvUrl} alt={`${candidateName}'s CV`} className="max-w-2xl max-h-96 rounded border border-border" />
            )}
          </div>
        </div>

        {/* Footer with pagination */}
        {totalPages > 1 && (
          <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-center gap-4">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-muted disabled:opacity-50 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-muted-foreground">Page {currentPage}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-muted disabled:opacity-50 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
