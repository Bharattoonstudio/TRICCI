/**
 * InterviewStageTab — visual timeline of interview rounds
 * Shows scheduled dates, feedback, scores, next steps
 * Allows employer to add rounds and submit feedback
 */
import { useState, useEffect } from 'react';
import { Loader2, Plus, CheckCircle2, Clock, MessageCircle, AlertCircle } from 'lucide-react';

interface InterviewRound {
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
  interviewerId?: string;
}

interface InterviewStageTabProps {
  submissionId: number;
}

export default function InterviewStageTab({ submissionId }: InterviewStageTabProps) {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [error, setError] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  useEffect(() => {
    fetch(`/api/employer/submissions/${submissionId}/interview/rounds`)
      .then(r => r.json())
      .then(d => {
        if (d.rounds) setRounds(d.rounds);
        if (d.error) setError(d.error);
      })
      .catch(e => setError('Failed to load interview rounds'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      {rounds.length > 0 ? (
        <div className="space-y-4">
          {rounds.map((round, idx) => (
            <div key={round.id} className="relative">
              {/* Timeline connector */}
              {idx < rounds.length - 1 && (
                <div className="absolute left-6 top-16 w-1 h-8 bg-border" />
              )}
              
              {/* Round card */}
              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="relative flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                    round.status === 'completed' ? 'bg-green-500/20 text-green-600 border-2 border-green-500' :
                    round.status === 'scheduled' ? 'bg-blue-500/20 text-blue-600 border-2 border-blue-500' :
                    round.status === 'cancelled' ? 'bg-red-500/20 text-red-600 border-2 border-red-500' :
                    'bg-muted text-muted-foreground border-2 border-border'
                  }`}>
                    {round.status === 'completed' ? <CheckCircle2 size={20} /> :
                     round.status === 'scheduled' ? <Clock size={20} /> :
                     round.status === 'cancelled' ? '✕' :
                     <span>{round.round}</span>}
                  </div>
                </div>

                {/* Round details */}
                <div className="flex-1 pb-6">
                  <div className="bg-card border border-border rounded-lg p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-foreground">
                          Round {round.round}: {round.roundName || 'Interview'}
                        </h4>
                        <p className="text-xs text-muted-foreground capitalize mt-1">{round.status}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        round.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                        round.status === 'scheduled' ? 'bg-blue-500/20 text-blue-700' :
                        round.status === 'cancelled' ? 'bg-red-500/20 text-red-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {round.status}
                      </span>
                    </div>

                    {/* Scheduled info */}
                    {round.scheduledAt && (
                      <div className="mb-3 p-2 bg-muted rounded text-xs text-muted-foreground">
                        📅 Scheduled: {new Date(round.scheduledAt).toLocaleString('en-IN')}
                      </div>
                    )}

                    {/* Feedback section (if completed) */}
                    {round.status === 'completed' && round.feedback && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Feedback</p>
                          <p className="text-sm text-foreground">{round.feedback}</p>
                        </div>
                        {round.score && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Score:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <span key={i} className={`text-lg ${i <= round.score! ? '⭐' : '☆'}`} />
                              ))}
                            </div>
                            <span className="text-sm font-bold text-foreground">{round.score}/5</span>
                          </div>
                        )}
                        {round.reasonForSelection && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Reason</p>
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

                    {/* Action button for pending feedback */}
                    {round.status === 'scheduled' && (
                      <button className="mt-3 w-full px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                        {round.feedback ? 'Edit Feedback' : 'Submit Feedback'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle size={32} className="text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No interviews scheduled yet</p>
        </div>
      )}

      {/* Add Round Button */}
      <button 
        onClick={() => setShowScheduleForm(!showScheduleForm)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground px-4 py-3 rounded-lg font-semibold text-sm transition-colors"
      >
        <Plus size={16} />
        Schedule Next Round
      </button>

      {/* Schedule Form Placeholder */}
      {showScheduleForm && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-3">
          <p className="text-sm text-muted-foreground">Schedule form coming soon...</p>
        </div>
      )}
    </div>
  );
}
