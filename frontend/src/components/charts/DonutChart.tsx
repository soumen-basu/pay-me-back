interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  total: string;
  totalLabel?: string;
  size?: number;
}

export function DonutChart({ segments, total, totalLabel = 'TOTAL', size = 200 }: DonutChartProps) {
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate the total value for proportions
  const totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (totalValue === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-slate-400">No data</p>
      </div>
    );
  }

  // Build the arcs
  let cumulativeOffset = 0;
  const arcs = segments.map((seg) => {
    const proportion = seg.value / totalValue;
    const dashLength = proportion * circumference;
    const dashOffset = circumference - cumulativeOffset;
    cumulativeOffset += dashLength;

    return {
      ...seg,
      dashArray: `${dashLength} ${circumference - dashLength}`,
      dashOffset,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Data arcs */}
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          ))}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{totalLabel}</span>
          <span className="text-2xl font-extrabold text-slate-900">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 mt-4 w-full">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-sm text-slate-600 font-medium">{seg.label}</span>
            </div>
            <span className="text-sm font-bold text-slate-900">
              {totalValue > 0 ? Math.round((seg.value / totalValue) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
