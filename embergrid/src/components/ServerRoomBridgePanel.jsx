import React, { useState } from "react";
import { Server, Activity, AlertTriangle, ExternalLink, Zap, Flame, Wind, RefreshCw } from "lucide-react";

export function ServerRoomBridgePanel({
  rackTemps = [],
  ambientTemp = 19.5,
  activeChaos = null,
  cracActive = true,
  gridPower = true,
  isConnected = false,
  onTriggerChaos
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fallback demo racks if not yet streaming
  const displayRacks = rackTemps.length > 0 ? rackTemps : [
    { id: "rack_01", name: "Stack 01 (Alpha)", role: "Edge & API Gateway", temp: 21.5, cpuLoad: 24, powerWatts: 1450, health: "HEALTHY" },
    { id: "rack_02", name: "Stack 02 (Beta)", role: "Storage & Database SAN", temp: 22.0, cpuLoad: 28, powerWatts: 1520, health: "HEALTHY" },
    { id: "rack_03", name: "Stack 03 (Gamma)", role: "AI & GPU Compute", temp: 24.5, cpuLoad: 45, gpuTemp: 38, powerWatts: 1850, health: "HEALTHY" },
    { id: "rack_04", name: "Stack 04 (Delta)", role: "Core Network & UPS", temp: 20.8, cpuLoad: 18, powerWatts: 1380, health: "HEALTHY" }
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Coupled Server Room Telemetry (4 EIA-310 Stacks)
              </h3>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isConnected
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isConnected ? "BIDIRECTIONAL LINK ACTIVE" : "LOCAL BRIDGE STANDBY"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time thermal dissipation directly driving Carnot Battery heat absorption & ORC cycles
            </p>
          </div>
        </div>

        {/* Chaos Injection Quick Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-semibold text-slate-500">Inject Chaos:</span>
          <button
            onClick={() => onTriggerChaos && onTriggerChaos("traffic_spike")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
              activeChaos === "traffic_spike"
                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-amber-500/50"
            }`}
          >
            <Activity className="h-3 w-3 text-amber-400" />
            Traffic Spike
          </button>

          <button
            onClick={() => onTriggerChaos && onTriggerChaos("ac_failure")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
              activeChaos === "ac_failure" || !cracActive
                ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-rose-500/50"
            }`}
          >
            <Flame className="h-3 w-3 text-rose-400" />
            CRAC Failure
          </button>

          <button
            onClick={() => onTriggerChaos && onTriggerChaos("blackout")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
              activeChaos === "blackout" || !gridPower
                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-amber-500/50"
            }`}
          >
            <Zap className="h-3 w-3 text-amber-400" />
            Blackout
          </button>

          <button
            onClick={() => onTriggerChaos && onTriggerChaos("normal")}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-medium text-slate-300 hover:border-emerald-500/50 hover:text-white"
            title="Restore Nominal"
          >
            <RefreshCw className="h-3 w-3 text-emerald-400" />
            Reset
          </button>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
          >
            <span>3D View</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 4 Racks Cards */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {displayRacks.map((rack) => {
          const isHot = rack.temp > 35;
          const isWarm = rack.temp > 28;
          const tempColor = isHot ? "text-rose-400" : isWarm ? "text-amber-400" : "text-emerald-400";
          const borderColor = isHot
            ? "border-rose-500/40 bg-rose-500/5"
            : isWarm
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-slate-800/80 bg-slate-900/40";

          return (
            <div
              key={rack.id}
              className={`rounded-xl border p-3 transition-all ${borderColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-xs text-white">{rack.name}</div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    rack.health === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-300"
                      : rack.health === "WARNING"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {rack.health || "HEALTHY"}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{rack.role}</div>

              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center font-mono">
                <div className="rounded bg-slate-800/50 p-1">
                  <div className="text-[9px] text-slate-500">TEMP</div>
                  <div className={`text-xs font-bold ${tempColor}`}>
                    {rack.temp.toFixed(1)}°C
                  </div>
                </div>

                <div className="rounded bg-slate-800/50 p-1">
                  <div className="text-[9px] text-slate-500">LOAD</div>
                  <div className="text-xs font-bold text-slate-200">
                    {Math.round(rack.cpuLoad)}%
                  </div>
                </div>

                <div className="rounded bg-slate-800/50 p-1">
                  <div className="text-[9px] text-slate-500">POWER</div>
                  <div className="text-xs font-bold text-slate-200">
                    {Math.round(rack.powerWatts)}W
                  </div>
                </div>
              </div>

              {rack.gpuTemp && (
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>AI Acceleration Node:</span>
                  <span className={rack.gpuTemp > 50 ? "text-rose-400 font-bold" : "text-amber-400"}>
                    GPU {rack.gpuTemp}°C
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
