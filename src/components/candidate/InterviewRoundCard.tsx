/**
 * InterviewRoundCard — display single interview round for candidate
 * Shows: company, job, round info, scheduling, feedback when available
 */
import { Calendar, CheckCircle2, Clock, MessageCircle, AlertCircle } from 'lucide-react';

interface InterviewRoundCardProps {
  round: {
    id: number;
    round: number;
    roundName?: string;
    status: string;
    scheduledAt?: string;
    completedAt?: string;
    feedback?: string;
    score?: number;
    reasonForSelection?: string;
    nextSteps?: string;
  };
  jobTitle: string;
  companyName: string;
}

export default function InterviewRoundCard({
  round,
  jobTitle,
  companyName,
}: InterviewRoundCardProps) {
  const isScheduled = round.status === 'scheduled' && round.scheduledAt;
  const isCompleted = round.status === 'completed';
  const isCancelled = round.status === 'cancelled';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const daysUntilInterview = () => {
    if (!round.scheduledAt) return null;
    const diff = new Date(round.scheduledAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return null;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${
      isCancelled ? 'bg-red-500/5 border-red-500/20' :
      isCompleted ? 'bg-green-500/5 border-green-500/20' :
      isScheduled ? 'bg-blue-500/5 border-blue-500/20' :
      'bg-muted/30 border-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {round.roundName || 'Interview'} Round
          </p>
          <h4 className="font-bold text-foreground mt-1">{jobTitle}</h4>
          <p className="text-xs text-muted-foreground">{companyName}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          isCompleted ? 'bg-green-500/20 text-green-700' :
          isScheduled ? 'bg-blue-500/20 text-blue-700' :
          isCancelled ? 'bg-red-500/20 text-red-700' :
          'bg-muted text-muted-foreground'
        }`}>
          {isCompleted && <CheckCircle2 size={12} className="inline mr-1" />}
          {isScheduled && <Clock size={12} className="inline mr-1" />}
          {round.status}
        </span>
      </div>

      {/* Scheduled Info */}
      {isScheduled && round.scheduledAt && (
        <div className="bg-background/50 border border-border rounded-lg p-3 mb-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
            <Calendar size={14} />
            {formatDate(round.scheduledAt)}
          </div>
          <p className="text-muted-foreground ml-6">{daysUntilInterview()}</p>
        </div>
      )}

      {/* Feedback Section */}
      {isCompleted && round.feedback && (
        <div className="space-y-3 border-t border-border/50 pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <MessageCircle size={12} />
              Feedback
            </p>
            <p className="text-sm text-foreground">{round.feedback}</p>
          </div>

          {round.score && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className="text-lg">
                    {i <= round.score! ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {round.reasonForSelection && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
              <p className="text-sm text-foreground">{round.reasonForSelection}</p>
            </div>
          )}

          {round.nextSteps && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Next Steps</p>
              <p className="text-sm text-foreground">{round.nextSteps}</p>
            </div>
          )}
        </div>
      )}

      {/* Cancel Notice */}
      {isCancelled && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          This interview has been cancelled
        </div>
      )}

      {/* Action Button */}
      {isScheduled && (
        <button className="w-full mt-3 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Add to Calendar
        </button>
      )}
    </div>
  );
}
