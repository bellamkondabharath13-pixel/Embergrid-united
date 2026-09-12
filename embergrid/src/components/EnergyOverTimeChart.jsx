import React from "react";
import { Zap, BatteryCharging, Battery, Building2, Flame } from "lucide-react";

function Sparkline({ data, color, maxVal }) {
  if (data.length < 2) {
    return <div className="flex h-8 items-center text-[10px] text-slate-600">Collecting...</div>;
  }
  const top = maxVal || 1;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - (val / top) * 90 - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const fillPoints = `0,100 ${points} 100,100`;
  const cleanId = `spark-${color.replace("#", "")}`;

  return (
    <svg className="h-8 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={cleanId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${cleanId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function EnergyOverTimeChart({
  history = [],
  totalOrc = 0,
  totalCharged = 0,
  totalDischarged = 0,
  totalReused = 0,
  totalExported = 0,
  totalRevenue = 0
}) {
  const orcSeries = history.map(h => h.orc || 0);
  const chargeSeries = history.map(h => h.charge || 0);
  const dischargeSeries = history.map(h => h.discharge || 0);
  const reuseSeries = history.map(h => h.reuse || 0);
  const exportSeries = history.map(h => h.gridExportKw || 0);
  const batterySeries = history.map(h => h.batteryLevel || 50);

  const maxOrc = Math.max(...orcSeries, 1);
  const maxCharge = Math.max(...chargeSeries, 1);
  const maxDischarge = Math.max(...dischargeSeries, 1);
  const maxReuse = Math.max(...reuseSeries, 1);
  const maxBattery = 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Energy Over Time</h3>
          {totalRevenue > 0 && (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-300">
              Arbitrage Rev: +₹{totalRevenue.toFixed(0)} ({totalExported.toFixed(1)} kWh sold)
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 font-mono">{history.length} cycles window</span>
      </div>

      {/* 4 Cumulative Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              ORC Total
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums text-white">
              {totalOrc.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">kWh</span>
          </div>
          <div className="mt-1.5">
            <Sparkline data={orcSeries} color="#fbbf24" maxVal={maxOrc} />
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-1.5">
            <BatteryCharging className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              Charged Total
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums text-white">
              {totalCharged.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">kWh</span>
          </div>
          <div className="mt-1.5">
            <Sparkline data={chargeSeries} color="#06b6d4" maxVal={maxCharge} />
          </div>
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
          <div className="flex items-center gap-1.5">
            <Battery className="h-3 w-3 text-orange-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">
              Discharged Total
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums text-white">
              {totalDischarged.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">kWh</span>
          </div>
          <div className="mt-1.5">
            <Sparkline data={dischargeSeries} color="#f97316" maxVal={maxDischarge} />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Heat Reused Total
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums text-white">
              {totalReused.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">kW</span>
          </div>
          <div className="mt-1.5">
            <Sparkline data={reuseSeries} color="#22c55e" maxVal={maxReuse} />
          </div>
        </div>
      </div>

      {/* Multi-series chart */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">Per-cycle dynamic breakdown</span>
          <div className="flex flex-wrap gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> ORC Gen
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> Charge
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> Discharge
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Building Reuse
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-teal-400" /> Grid Export
            </span>
          </div>
        </div>

        {history.length < 2 ? (
          <div className="flex h-28 items-center justify-center text-xs text-slate-600">
            Collecting cycles data...
          </div>
        ) : (
          <svg className="h-28 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[
              { data: orcSeries, color: "#fbbf24" },
              { data: chargeSeries, color: "#06b6d4" },
              { data: dischargeSeries, color: "#f97316" },
              { data: reuseSeries, color: "#22c55e" },
              { data: exportSeries, color: "#2dd4bf" }
            ].map((series, idx) => {
              const maxS = Math.max(...series.data, 1);
              const pts = series.data.map((val, i) => {
                const x = (i / (series.data.length - 1)) * 100;
                const y = 100 - (val / maxS) * 85 - 5;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ");
              return (
                <polyline
                  key={idx}
                  points={pts}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.85"
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Battery State of Charge Trend */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Carnot Thermal Battery SOC Trend</span>
          <span className="text-xs tabular-nums text-slate-500 font-mono">
            {batterySeries.length > 0
              ? `${batterySeries[0].toFixed(0)}% → ${batterySeries[batterySeries.length - 1].toFixed(0)}%`
              : "--"}
          </span>
        </div>

        {batterySeries.length < 2 ? (
          <div className="flex h-12 items-center justify-center text-xs text-slate-600">
            Tracking SOC...
          </div>
        ) : (
          <svg className="h-12 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="batteryTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const pts = batterySeries.map((val, idx) => {
                const x = (idx / (batterySeries.length - 1)) * 100;
                const y = 100 - (val / maxBattery) * 88 - 5;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ");
              return (
                <>
                  <polygon points={`0,100 ${pts} 100,100`} fill="url(#batteryTrendGrad)" />
                  <polyline
                    points={pts}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
}
