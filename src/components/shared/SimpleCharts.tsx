/**
 * SimpleCharts — lightweight, zero-dependency SVG chart primitives.
 * Deliberately not using a charting library (recharts/chart.js) here:
 * this project has none installed, and adding one now means a new
 * lockfile dependency Railway has to fetch and build correctly — real
 * risk for marginal visual gain over hand-rolled SVG at this data scale.
 */

export function SimpleBarChart({ data, height = 160 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-4" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-xs font-bold text-foreground mb-1">{d.value}</span>
          <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(4, (d.value / max) * (height - 40))}px`, backgroundColor: d.color }} />
          <span className="text-[10px] text-muted-foreground mt-2 text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function SimpleDonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const radius = size / 2;
  const strokeWidth = size * 0.22;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map(d => {
          const fraction = d.value / total;
          const dashLength = fraction * circumference;
          const dashOffset = -cumulative * circumference;
          cumulative += fraction;
          return (
            <circle
              key={d.label}
              cx={radius} cy={radius} r={innerRadius}
              fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          );
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-bold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
