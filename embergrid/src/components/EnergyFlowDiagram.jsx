import React from "react";
import { Flame, Building2, Zap, Battery, Server, IndianRupee } from "lucide-react";

function FlowPath({
  active,
  color,
  d,
  speed = "1.4s",
  delay = 0,
  markerId,
  label,
  labelPos
}) {
  return (
    <g>
      {/* Inactive / Background Guide Track */}
      <path
        d={d}
        fill="none"
        stroke="rgba(51,65,85,0.35)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* Active Flow Stream */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="8 10"
        strokeLinecap="round"
        style={{
          opacity: active ? 1 : 0,
          animation: `flowDash ${speed} linear infinite`,
          animationDelay: `${delay}s`,
          transition: "opacity 0.4s ease, stroke 0.4s ease",
          filter: active ? `drop-shadow(0 0 6px ${color})` : "none"
        }}
        markerEnd={active && markerId ? `url(#${markerId})` : undefined}
      />

      {/* Dynamic Action Badge on Midpoint */}
      {active && label && labelPos && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`} className="pointer-events-none">
          <rect
            x={-labelPos.width / 2}
            y="-9"
            width={labelPos.width}
            height="18"
            rx="9"
            fill="rgba(15, 23, 42, 0.9)"
            stroke={color}
            strokeWidth="1.2"
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
          <text
            textAnchor="middle"
            y="3.5"
            className="text-[8px] font-bold tracking-wider uppercase"
            fill={color}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function DiagramNode({ x, y, icon: Icon, label, color, active, value, subtext, pulse = false }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Outer pulsing beacon ring for active nodes */}
      {active && pulse && (
        <circle
          r="34"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="animate-spin"
          style={{ animationDuration: "14s" }}
          opacity="0.4"
        />
      )}

      {/* Main Node Circle */}
      <circle
        r="28"
        fill={active ? `${color}25` : "rgba(15,23,42,0.85)"}
        stroke={active ? color : "rgba(51,65,85,0.6)"}
        strokeWidth="2"
        style={{
          filter: active ? `drop-shadow(0 0 10px ${color}88)` : "none",
          transition: "all 0.4s ease"
        }}
      />

      {/* Centered Icon */}
      <foreignObject x="-14" y="-14" width="28" height="28">
        <div className="flex h-full w-full items-center justify-center pointer-events-none">
          <Icon className="h-5 w-5" style={{ color: active ? color : "#64748b" }} />
        </div>
      </foreignObject>

      {/* Label */}
      <text
        y="42"
        textAnchor="middle"
        className="fill-slate-400 text-[9.5px] font-semibold uppercase tracking-wider"
      >
        {label}
      </text>

      {/* Value */}
      {value && (
        <text
          y="55"
          textAnchor="middle"
          className="fill-slate-100 text-[10.5px] font-bold tabular-nums"
        >
          {value}
        </text>
      )}

      {/* Subtext */}
      {subtext && (
        <text
          y="67"
          textAnchor="middle"
          className="fill-amber-400 text-[8.5px] font-semibold tabular-nums"
        >
          {subtext}
        </text>
      )}
    </g>
  );
}

export function EnergyFlowDiagram({ tick }) {
  const { sensors, decisions } = tick;

  const isDirectReuse = !!decisions.directReuse;
  const isOrcGen = !!decisions.orcGen;
  const isBatteryCharge = !!decisions.batteryCharge;
  const isBatteryDischarge = !!decisions.batteryDischarge;
  const isGridExport = !!decisions.gridExport || (tick.gridExportKw > 0);
  const isGridImport = !!decisions.gridImport || (tick.gridImportKw > 0) || (sensors.gridElectricityPrice < 0.100 && sensors.gridPower !== false && !isGridExport);

  const reusedKw = isDirectReuse
    ? Math.min(sensors.wasteHeatAvailableKw, sensors.nearbyBuildingHeatDemandKw)
    : 0;
  const orcKw = tick.orcGeneratedKw || (isOrcGen ? sensors.wasteHeatAvailableKw * 0.08 : 0);
  const exportKw = tick.gridExportKw || 0;
  const tickRev = tick.tickRevenue || (exportKw * sensors.gridElectricityPrice);

  const isHot = sensors.serverAvgTemp > 30;
  const heatNodeColor = isHot ? "#ef4444" : "#f97316";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      {/* Card Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Dynamic Energy Flow</h3>
          {sensors.isLive && (
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE COUPLED
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 font-mono">Thermodynamic Closed-Loop</span>
      </div>

      {/* SVG Flow Canvas */}
      <svg
        viewBox="0 0 600 325"
        className="w-full h-auto min-h-[280px]"
      >
        <defs>
          <style>
            {`
              @keyframes flowDash {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: -36; }
              }
            `}
          </style>

          {/* Arrowhead Markers for Flow Direction */}
          <marker
            id="arrow-green"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22c55e" />
          </marker>
          <marker
            id="arrow-amber"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fbbf24" />
          </marker>
          <marker
            id="arrow-cyan"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
          </marker>
          <marker
            id="arrow-emerald"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
          </marker>
          <marker
            id="arrow-blue"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* 6 Connected Nodes */}
        {/* Node 1: Waste Heat Exhaust */}
        <DiagramNode
          x={75}
          y={145}
          icon={Flame}
          label="Waste Heat"
          color={heatNodeColor}
          active={sensors.wasteHeatAvailableKw > 10}
          value={`${sensors.wasteHeatAvailableKw.toFixed(0)} kW`}
          subtext={sensors.serverAvgTemp ? `${sensors.serverAvgTemp}°C exhaust` : undefined}
          pulse={isHot}
        />

        {/* Node 2: District Buildings */}
        <DiagramNode
          x={300}
          y={55}
          icon={Building2}
          label="Buildings"
          color="#22c55e"
          active={isDirectReuse}
          value={isDirectReuse ? `${reusedKw.toFixed(0)} kW` : `${sensors.nearbyBuildingHeatDemandKw.toFixed(0)} kW req`}
          subtext={isDirectReuse ? "Direct Heating" : "Demand Idle"}
        />

        {/* Node 3: ORC Turbine Generator */}
        <DiagramNode
          x={300}
          y={145}
          icon={Zap}
          label="ORC Turbine"
          color="#fbbf24"
          active={isOrcGen}
          value={isOrcGen ? `${orcKw.toFixed(1)} kW` : "0.0 kW (STANDBY)"}
          subtext={
            isOrcGen
              ? (sensors.gridElectricityPrice >= 0.100 ? "Powering Data Center" : "Surplus Power Gen")
              : (tick.batteryLevel < (tick.batteryCapacity - 1.5) ? "Paused (Recharging Battery)" : "Standby")
          }
          pulse={isOrcGen}
        />

        {/* Node 4: Carnot Battery Thermal Store */}
        <DiagramNode
          x={300}
          y={240}
          icon={Battery}
          label="Carnot Battery"
          color={isGridExport ? "#10b981" : tick.batteryLevel >= (tick.batteryCapacity - 1.5) ? "#10b981" : "#06b6d4"}
          active={isBatteryCharge || isBatteryDischarge || isGridExport || tick.batteryLevel >= (tick.batteryCapacity - 1.5)}
          value={`${tick.batteryLevel.toFixed(1)} kWh`}
          subtext={
            isGridExport
              ? "Selling to External"
              : isBatteryCharge
              ? (sensors.serverAvgTemp > 35 ? "Emergency Sink" : "Recharging SOC")
              : isBatteryDischarge
              ? "UPS Backup to DC"
              : tick.batteryLevel >= (tick.batteryCapacity - 1.5)
              ? "100% Fully Charged"
              : `${((tick.batteryLevel / tick.batteryCapacity) * 100).toFixed(0)}% SOC`
          }
          pulse={isBatteryCharge || isBatteryDischarge || isGridExport}
        />

        {/* Node 5: Server Room Datacenter */}
        <DiagramNode
          x={525}
          y={145}
          icon={Server}
          label="Datacenter"
          color="#3b82f6"
          active={true}
          value={`${sensors.datacenterPowerDemandKw.toFixed(0)} kW`}
          subtext={
            !sensors.gridPower
              ? "BLACKOUT UPS"
              : isOrcGen
              ? "ORC POWERED"
              : isGridImport
              ? "CHEAP GRID POWER"
              : sensors.activeChaosMode
              ? sensors.activeChaosMode.replace("_", " ").toUpperCase()
              : "ONLINE"
          }
          pulse={!sensors.gridPower || !sensors.cracUnitsActive}
        />

        {/* Node 6: External Regional Power Grid */}
        <DiagramNode
          x={525}
          y={240}
          icon={IndianRupee}
          label="External Grid"
          color={isGridExport ? "#10b981" : isGridImport ? "#38bdf8" : "#94a3b8"}
          active={isGridExport || isGridImport}
          value={
            isGridExport
              ? `${exportKw.toFixed(1)} kW sold`
              : isGridImport
              ? `${sensors.datacenterPowerDemandKw.toFixed(0)} kW buy`
              : `₹${sensors.gridElectricityPrice.toFixed(1)}/kWh`
          }
          subtext={
            isGridExport
              ? `+₹${tickRev.toFixed(0)} rev (Peak)`
              : isGridImport
              ? `₹${sensors.gridElectricityPrice.toFixed(1)}/kWh (Low)`
              : "Standard Rate"
          }
          pulse={isGridExport}
        />

        {/* 7 Directional Flow Connectors */}
        {/* Flow 1: Waste Heat -> District Buildings (Direct Reuse) */}
        <FlowPath
          active={isDirectReuse}
          color="#22c55e"
          d="M 99 131 Q 185 65 270 57"
          markerId="arrow-green"
          label="DISTRICT REUSE"
          labelPos={{ x: 180, y: 76, width: 84 }}
        />

        {/* Flow 2: Waste Heat -> ORC Generator */}
        <FlowPath
          active={isOrcGen}
          color="#fbbf24"
          d="M 103 145 L 270 145"
          markerId="arrow-amber"
          label={sensors.gridElectricityPrice >= 0.100 ? "ORC POWER" : "SURPLUS TO ORC"}
          labelPos={{ x: 185, y: 130, width: 78 }}
        />

        {/* Flow 3: Waste Heat -> Carnot Battery (Thermal Charge / Surge Sink) */}
        <FlowPath
          active={isBatteryCharge && !isGridExport}
          color="#06b6d4"
          d="M 99 159 Q 185 225 270 238"
          speed={sensors.serverAvgTemp > 35 ? "0.8s" : "1.3s"}
          markerId="arrow-cyan"
          label={sensors.serverAvgTemp > 35 ? "SURGE SINK" : "RECHARGING"}
          labelPos={{ x: 180, y: 215, width: 80 }}
        />

        {/* Flow 4: ORC Generator -> Datacenter Power Bus */}
        <FlowPath
          active={isOrcGen}
          color="#fbbf24"
          d="M 328 145 L 495 145"
          markerId="arrow-amber"
          label={sensors.gridElectricityPrice >= 0.100 ? "POWER TO DC" : "SURPLUS TO DC"}
          labelPos={{ x: 412, y: 130, width: 80 }}
        />

        {/* Flow 5: Carnot Battery -> Datacenter (Discharging / Blackout UPS) */}
        <FlowPath
          active={isBatteryDischarge && !isBatteryCharge}
          color="#06b6d4"
          d="M 325 225 Q 412 165 497 154"
          speed="0.9s"
          delay={0.2}
          markerId="arrow-cyan"
          label={!sensors.gridPower ? "UPS BACKUP" : "DISCHARGE"}
          labelPos={{ x: 412, y: 172, width: 76 }}
        />

        {/* Flow 6: Carnot Battery -> External Grid (Peak Tariff Arbitrage) */}
        <FlowPath
          active={isGridExport && !isBatteryCharge}
          color="#10b981"
          d="M 328 240 L 495 240"
          speed="0.8s"
          markerId="arrow-emerald"
          label="SELL TO EXTERNAL"
          labelPos={{ x: 412, y: 226, width: 86 }}
        />

        {/* Flow 7: External Grid -> Datacenter (Cheap Grid Electricity Import) */}
        <FlowPath
          active={isGridImport && !isOrcGen && sensors.gridPower !== false && !isGridExport}
          color="#38bdf8"
          d="M 525 212 L 525 173"
          speed="1.0s"
          markerId="arrow-blue"
          label="CHEAP GRID POWER"
          labelPos={{ x: 525, y: 192, width: 96 }}
        />
      </svg>
    </div>
  );
}
