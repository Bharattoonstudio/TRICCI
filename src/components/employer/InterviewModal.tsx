/**
 * InterviewModal — modal shell around InterviewStageTab (schedule rounds,
 * view timeline, submit feedback) for a consultant-sourced submission.
 */
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import InterviewStageTab from './InterviewStageTab';

interface InterviewModalProps {
  submissionId: number;
  candidateName: string;
  onClose: () => void;
}

export default function InterviewModal({ submissionId, candidateName, onClose }: InterviewModalProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Interview — {candidateName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <InterviewStageTab submissionId={submissionId} />
      </motion.div>
    </div>
  );
}
