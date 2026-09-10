/**
 * InterviewFeedbackForm — submit feedback after interview
 * Captures: feedback text, score (1-5), reason for selection, next steps
 */
import { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';

interface InterviewFeedbackFormProps {
  interviewRoundId: number;
  submissionId: number;
  roundName: string;
  onSubmitted: () => void;
  onClosed: () => void;
}

export default function InterviewFeedbackForm({
  interviewRoundId,
  submissionId,
  roundName,
  onSubmitted,
  onClosed,
}: InterviewFeedbackFormProps) {
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [reason, setReason] = useState('next_round');
  const [nextSteps, setNextSteps] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    { value: 'next_round', label: '✅ Moving to next round' },
    { value: 'alternative', label: '→ Consider for alternative role' },
    { value: 'not_fit', label: '❌ Not a fit' },
    { value: 'review', label: '⏳ Further review needed' },
  ];

  async function handleSubmit() {
    if (!feedback.trim()) {
      setError('Please enter feedback');
      return;
    }
    if (score === 0) {
      setError('Please select a score');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(
        `/api/employer/submissions/${submissionId}/interview/round/${interviewRoundId}/submit-feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedback: feedback.trim(),
            score,
            reasonForSelection: reason,
            nextSteps: nextSteps.trim(),
          }),
        }
      );

      if (res.ok) {
        onSubmitted();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit feedback');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-foreground text-lg">{roundName} Feedback</h3>
            <p className="text-xs text-muted-foreground mt-1">Submit your feedback after the interview</p>
          </div>
          <button onClick={onClosed} className="p-2 hover:bg-muted rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Feedback textarea */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Feedback *
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="How was the interview? What impressed you? Any concerns?"
              rows={5}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Score (1-5) *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
                    score === s
                      ? 'bg-primary text-primary-foreground scale-105'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reason for selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Reason for Selection *
            </label>
            <div className="space-y-2">
              {reasons.map(r => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted rounded-lg">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Next Steps (optional)
            </label>
            <textarea
              value={nextSteps}
              onChange={e => setNextSteps(e.target.value)}
              placeholder="e.g., Schedule Round 2, Send offer, Rejection email"
              rows={2}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onClosed}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
