import React from "react";
import { Flame, Play, Pause, RotateCcw, Zap, Server, Activity, AlertTriangle } from "lucide-react";

export function Header({
  running,
  onToggleRun,
  onReset,
  tickCount,
  isConnected,
  useLiveStream,
  onToggleSource,
  serverTemp,
  ambientTemp,
  activeChaos,
  cracActive,
  gridPower
}) {
  const isOverheating = serverTemp > 35 || !cracActive;
  const isBlackout = !gridPower;

  return (
    <header className="relative z-10 border-b border-amber-500/20 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
            <Flame className="h-6 w-6 text-white" strokeWidth={2.5} />
            <div className="absolute inset-0 animate-pulse rounded-xl ring-1 ring-amber-400/50" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              EmberGrid <span className="text-amber-400">AI</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                CARNOT BATTERY
              </span>
            </h1>
            <p className="text-xs text-slate-400">Carnot Battery Grid Intelligence & Data Center Coupling</p>
          </div>
        </div>

        {/* Live Datacenter Telemetry Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSource}
            title="Click to toggle between Live Datacenter Stream and Synthetic Simulation"
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              useLiveStream && isConnected
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/20"
                : "border-slate-700/60 bg-slate-900/60 text-slate-400 hover:border-slate-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                useLiveStream && isConnected
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-slate-500"
              }`}
            />
            {useLiveStream && isConnected
              ? "DC LINK: LIVE (4 RACKS)"
              : "MODE: SYNTHETIC SIM"}
          </button>

          {/* Temperature KPI Pill */}
          {useLiveStream && isConnected && (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium tabular-nums ${
                isOverheating
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-300 animate-pulse"
                  : serverTemp > 28
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-slate-700/50 bg-slate-900/50 text-slate-300"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>Rack Avg:</span>
              <strong className="font-bold">{serverTemp.toFixed(1)}°C</strong>
              <span className="text-[10px] opacity-75">({ambientTemp.toFixed(1)}°C room)</span>
            </div>
          )}

          {/* Critical Chaos Alerts */}
          {isOverheating && (
            <div className="hidden items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 md:flex">
              <AlertTriangle className="h-3.5 w-3.5" />
              {!cracActive ? "CRAC FAILURE: SURGE HEAT" : "THERMAL RUNAWAY"}
            </div>
          )}
          {isBlackout && (
            <div className="hidden items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 md:flex">
              <Zap className="h-3.5 w-3.5" />
              GRID OFFLINE: UPS ACTIVE
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 sm:flex">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-slate-300">Tick</span>
            <span className="text-sm font-bold tabular-nums text-white">{tickCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleRun}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                running
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/20"
              }`}
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : "Run"}
            </button>

            <button
              onClick={onReset}
              title="Reset Carnot Battery & Telemetry"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
