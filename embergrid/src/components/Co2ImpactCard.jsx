import React from "react";
import { Leaf, TrendingUp, Factory } from "lucide-react";

export function Co2ImpactCard({ totalCo2Saved = 0, tickCo2 = 0, history = [] }) {
  const treesEquivalent = totalCo2Saved / 22; // ~22 kg CO2 absorbed per tree per year
  const maxSavings = Math.max(...history, 0.1);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mb-4 flex items-center gap-2">
        <Leaf className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">CO₂ Environmental Impact</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span className="font-semibold uppercase tracking-wider">Total Avoided</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-white">
              {totalCo2Saved.toFixed(2)}
            </span>
            <span className="text-sm text-slate-400">kg</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Net carbon emissions prevented</div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Factory className="h-3 w-3" />
            <span className="font-semibold uppercase tracking-wider">This Cycle</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-white">
              {tickCo2.toFixed(2)}
            </span>
            <span className="text-sm text-slate-400">kg</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Grid factor: 0.71 kg/kWh</div>
        </div>
      </div>

      {/* Bar sparkline of recent cycles */}
      <div className="mt-4">
        <div className="mb-1.5 text-xs text-slate-400">Recent carbon savings per cycle</div>
        <div className="flex h-16 items-end gap-1">
          {history.slice(-30).map((val, idx) => {
            const heightPercent = Math.max((val / maxSavings) * 100, 3);
            return (
              <div
                key={idx}
                className="flex-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${heightPercent}%`,
                  background:
                    "linear-gradient(to top, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.8))",
                  opacity: 0.4 + (idx / Math.max(history.length, 1)) * 0.6
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Tree equivalent callout */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/20 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          <Leaf className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">
            {treesEquivalent.toFixed(1)} mature trees
          </div>
          <div className="text-xs text-slate-500">Annual CO₂ absorption equivalent offset</div>
        </div>
      </div>
    </div>
  );
}
