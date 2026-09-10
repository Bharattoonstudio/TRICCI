/**
 * PipelineTrail — point 47: full pipeline trail visible to the consultant —
 * Submitted → Shortlisted → Interview Done → Selected.
 */
const STEPS = ['Submitted', 'Shortlisted', 'Interview Done', 'Selected'] as const;

function stepIndexForStatus(status: string): number {
  switch (status) {
    case 'pending':
    case 'review':
      return 0;
    case 'shortlisted':
      return 1;
    case 'interview':
    case 'hold':
      return 2;
    case 'selected':
    case 'offered':
    case 'payment_processed':
    case 'payment_done':
      return 3;
    case 'rejected':
      return -1; // special-cased below
    default:
      return 0;
  }
}

export default function PipelineTrail({ status }: { status: string }) {
  if (status === 'rejected') {
    return <span className="text-[10px] font-semibold text-red-400/70">Rejected</span>;
  }

  const activeIndex = stepIndexForStatus(status);

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${i <= activeIndex ? 'bg-primary' : 'bg-white/15'}`}
            title={step}
          />
          {i < STEPS.length - 1 && (
            <div className={`w-3 h-px ${i < activeIndex ? 'bg-primary' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
