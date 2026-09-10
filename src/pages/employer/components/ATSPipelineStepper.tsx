import { CheckCircle } from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';

export type ATSStage = 'interviews' | 'assessments' | 'selected' | 'offers';

const STAGES: { id: ATSStage; label: string; short: string }[] = [
  { id: 'interviews', label: 'Interview Panel', short: 'Interviews' },
  { id: 'assessments', label: 'Assessments', short: 'Assessments' },
  { id: 'selected', label: 'Selected & Payment', short: 'Selected' },
  { id: 'offers', label: 'Offers', short: 'Offers' },
];

interface Props {
  active: ATSStage;
  onChange: (stage: ATSStage) => void;
  /** Optional: interview round count from the job posting */
  interviewRoundCount?: number;
}

export default function ATSPipelineStepper({ active, onChange, interviewRoundCount }: Props) {
  const activeIdx = STAGES.findIndex(s => s.id === active);

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-4 sm:px-6">
      <Helmet>
        <title>ATS Pipeline — Employer Dashboard — TRICCI</title>
        <meta name="description" content="Navigate the ATS hiring pipeline stages on TRICCI." />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">ATS Pipeline Stepper — TRICCI Employer Dashboard</h1>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hiring Pipeline</p>
        {interviewRoundCount != null && interviewRoundCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
            {interviewRoundCount} Interview Round{interviewRoundCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;

          return (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              {/* Step node */}
              <button
                onClick={() => onChange(stage.id)}
                className="flex flex-col items-center gap-1.5 group shrink-0"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone
                    ? 'bg-primary border-primary'
                    : isActive
                    ? 'bg-primary/15 border-primary'
                    : 'bg-muted border-border group-hover:border-primary/40'
                }`}>
                  {isDone ? (
                    <CheckCircle size={14} className="text-primary-foreground" />
                  ) : (
                    <span className={`text-xs font-black ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {i + 1}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold whitespace-nowrap hidden sm:block transition-colors ${
                  isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                }`}>
                  {stage.short}
                </span>
              </button>

              {/* Connector line (not after last) */}
              {i < STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 sm:mx-2 transition-colors ${
                  i < activeIdx ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
