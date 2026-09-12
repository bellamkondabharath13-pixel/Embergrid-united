import React from "react";

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  color,
  history = [],
  decimals = 2,
  children
}) {
  const maxVal = Math.max(...history, 1);
  const minVal = Math.min(...history, 0);
  const range = maxVal - minVal || 1;

  const points = history.map((val, idx) => {
    const x = (idx / Math.max(history.length - 1, 1)) * 100;
    const y = 100 - ((val - minVal) / range) * 80 - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const fillPoints = `0,100 ${points} 100,100`;
  const cleanId = `grad-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-slate-700">
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color }} />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {label}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-white">
              {typeof value === "number" ? value.toFixed(decimals) : value}
            </span>
            <span className="text-sm text-slate-500">{unit}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-10">
        {history.length > 1 && (
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={cleanId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPoints} fill={`url(#${cleanId})`} />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}
