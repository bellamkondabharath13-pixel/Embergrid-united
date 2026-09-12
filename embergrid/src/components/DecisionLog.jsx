import React, { useRef, useEffect } from "react";
import {
  Cpu,
  Building2,
  Zap,
  BatteryCharging,
  Battery,
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign
} from "lucide-react";

function getDecisionMeta(key) {
  const map = {
    directReuse: {
      icon: Building2,
      color: "#22c55e",
      bg: "rgba(34, 197, 94, 0.12)",
      label: "Direct Heat Reuse"
    },
    orcGen: {
      icon: Zap,
      color: "#fbbf24",
      bg: "rgba(251, 191, 36, 0.12)",
      label: "ORC Generation"
    },
    batteryCharge: {
      icon: BatteryCharging,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.12)",
      label: "Battery Charging"
    },
    batteryDischarge: {
      icon: Battery,
      color: "#f97316",
      bg: "rgba(249, 115, 22, 0.12)",
      label: "Battery Discharge"
    },
    gridExport: {
      icon: DollarSign,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.18)",
      label: "Grid Export (Peak Arbitrage)"
    },
    thermalMitigation: {
      icon: AlertTriangle,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.15)",
      label: "Heat Evacuation"
    },
    blackoutSupport: {
      icon: Zap,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.15)",
      label: "Blackout Microgrid"
    }
  };

  return map[key] || {
    icon: Cpu,
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    label: key
  };
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function LogItem({ entry }) {
  const decisionKeys = Object.keys(entry.decisions || {});
  const s = entry.sensors || {};
  const isHighTemp = s.serverAvgTemp > 30;

  return (
    <div className="border-b border-slate-800/50 px-4 py-3 transition-colors hover:bg-slate-800/25">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-xs text-slate-400">
            #{entry.id}
          </span>
          <Clock className="h-3 w-3 text-slate-500" />
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {formatTime(entry.timestamp)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {entry.tickRevenue > 0 && (
            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 font-mono text-xs font-bold text-emerald-300">
              +₹{entry.tickRevenue.toFixed(0)}
            </span>
          )}
          <span className="text-xs font-semibold text-emerald-400 tabular-nums">
            +{entry.co2Saved.toFixed(2)} kg
          </span>
          {entry.co2Saved === 0 && !entry.tickRevenue && (
            <span className="text-xs text-slate-600">standby</span>
          )}
        </div>
      </div>

      {/* Decision Badges */}
      <div className="mt-2 flex flex-wrap gap-2">
        {decisionKeys.length === 0 && (
          <span className="text-xs text-slate-600">
            No action required — thermodynamic state in equilibrium
          </span>
        )}
        {decisionKeys.map((key) => {
          const meta = getDecisionMeta(key);
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs border border-white/5"
              style={{ background: meta.bg }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
              <span className="font-semibold text-slate-200">{meta.label}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{entry.decisions[key]}</span>
            </div>
          );
        })}
      </div>

      {/* Telemetry Footprint */}
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] tabular-nums text-slate-500">
        <span>
          Heat: <strong className="text-slate-300 font-semibold">{s.wasteHeatAvailableKw?.toFixed(0)} kW</strong>
        </span>
        <span>
          Demand: <strong className="text-slate-300 font-semibold">{s.datacenterPowerDemandKw?.toFixed(0)} kW</strong>
        </span>
        <span>
          Price: <strong className="text-amber-400/90 font-semibold">₹{s.gridElectricityPrice?.toFixed(1)}</strong>
        </span>
        {s.serverAvgTemp !== undefined && (
          <span className={isHighTemp ? "text-rose-400 font-bold" : "text-emerald-400/90"}>
            Server Temp: <strong>{s.serverAvgTemp.toFixed(1)}°C</strong>
          </span>
        )}
      </div>
    </div>
  );
}

export function DecisionLog({ history = [] }) {
  const containerRef = useRef(null);
  const prevLenRef = useRef(history.length);

  useEffect(() => {
    if (history.length > prevLenRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    prevLenRef.current = history.length;
  }, [history.length]);

  const recentEntries = [...history].reverse().slice(0, 25);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">AI Thermodynamic Decision Stream</h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">{history.length} cycles</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto max-h-[460px]">
        {recentEntries.length === 0 ? (
          <div className="flex h-48 items-center justify-center p-8 text-center">
            <p className="text-sm text-slate-500">Awaiting simulation cycle initialization...</p>
          </div>
        ) : (
          recentEntries.map((item) => <LogItem key={item.id} entry={item} />)
        )}
      </div>
    </div>
  );
}
