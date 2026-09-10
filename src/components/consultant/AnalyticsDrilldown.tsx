import React from 'react';
import { motion } from 'motion/react';
import { X, ArrowLeft } from 'lucide-react';

interface DrilldownProps {
  title: string;
  metric: string;
  value: number | string;
  description: string;
  details: { label: string; value: string | number; color?: string }[];
  onClose: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export function AnalyticsDrilldown({
  title,
  metric,
  value,
  description,
  details,
  onClose,
  onBack,
  showBack = false,
}: DrilldownProps) {
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
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-80 overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main metric */}
          <div className="bg-muted/30 rounded-xl p-6 text-center border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {metric}
            </p>
            <p className="text-4xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              {value}
            </p>
          </div>

          {/* Details grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              {details.map((detail, i) => (
                <div
                  key={i}
                  className="bg-muted/20 rounded-lg p-4 border border-border/50"
                >
                  <p className="text-xs text-muted-foreground mb-2">{detail.label}</p>
                  <p className="text-2xl font-black" style={{ color: detail.color || '#ffffff' }}>
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            {showBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
