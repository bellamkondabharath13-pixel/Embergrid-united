import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Flame, Server, Building2, IndianRupee } from "lucide-react";
import { CarnotBatteryEngine } from "./sim/CarnotBatteryEngine";
import { TelemetryBridge } from "./sim/TelemetryBridge";
import { Header } from "./components/Header";
import { MetricCard } from "./components/MetricCard";
import { EnergyFlowDiagram } from "./components/EnergyFlowDiagram";
import { CarnotBatteryGauge } from "./components/CarnotBatteryGauge";
import { EnergyOverTimeChart } from "./components/EnergyOverTimeChart";
import { Co2ImpactCard } from "./components/Co2ImpactCard";
import { DecisionLog } from "./components/DecisionLog";
import { ServerRoomBridgePanel } from "./components/ServerRoomBridgePanel";

const HISTORY_WINDOW = 30;

export function App() {
  const engineRef = useRef(new CarnotBatteryEngine());
  const bridgeRef = useRef(null);

  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(() => engineRef.current.tick());
  const [history, setHistory] = useState([]);
  const [co2History, setCo2History] = useState([]);
  const [energyHistory, setEnergyHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [useLiveStream, setUseLiveStream] = useState(true);

  // Sparkline buffer ref
  const sparkRef = useRef({
    wasteHeat: [],
    powerDemand: [],
    heatDemand: [],
    gridPrice: []
  });

  // Cumulative energy counters
  const totalsRef = useRef({
    orc: 0,
    charged: 0,
    discharged: 0,
    reused: 0,
    exported: 0,
    revenue: 0
  });

  // Push new point into histories
  const recordTickData = useCallback((sensors, co2Saved, res) => {
    const s = sparkRef.current;
    s.wasteHeat = [...s.wasteHeat, sensors.wasteHeatAvailableKw].slice(-HISTORY_WINDOW);
    s.powerDemand = [...s.powerDemand, sensors.datacenterPowerDemandKw].slice(-HISTORY_WINDOW);
    s.heatDemand = [...s.heatDemand, sensors.nearbyBuildingHeatDemandKw].slice(-HISTORY_WINDOW);
    s.gridPrice = [...s.gridPrice, sensors.gridElectricityPrice].slice(-HISTORY_WINDOW);

    setCo2History((prev) => [...prev, co2Saved].slice(-HISTORY_WINDOW));

    const t = totalsRef.current;
    t.orc += res.orcGeneratedKw;
    t.charged += res.batteryChargedKwh;
    t.discharged += res.batteryDischargedKwh;
    t.reused += res.reusedHeatKw;
    t.exported += res.gridExportKw || 0;
    t.revenue += res.tickRevenue || 0;

    setEnergyHistory((prev) => [
      ...prev,
      {
        tick: engineRef.current.tickCount,
        orc: res.orcGeneratedKw,
        charge: res.batteryChargedKwh,
        discharge: res.batteryDischargedKwh,
        reuse: res.reusedHeatKw,
        gridExportKw: res.gridExportKw || 0,
        batteryLevel: res.batteryLevel
      }
    ].slice(-HISTORY_WINDOW));
  }, []);

  // Main simulation tick trigger
  const runTick = useCallback(() => {
    const result = engineRef.current.tick();
    setTick(result);
    recordTickData(result.sensors, result.co2Saved, result);
    setHistory([...engineRef.current.history]);

    // Send thermal feedback to server room if heat was extracted
    if (bridgeRef.current && (result.reusedHeatKw > 0 || result.batteryChargedKwh > 0)) {
      bridgeRef.current.sendHeatExtractedNotification(
        result.reusedHeatKw + result.batteryChargedKwh
      );
    }
  }, [recordTickData]);

  // Setup Telemetry Bridge
  useEffect(() => {
    const engine = engineRef.current;
    const bridge = new TelemetryBridge(engine);
    bridgeRef.current = bridge;

    let lastChaos = null;
    let lastGridPower = true;
    let lastCracActive = true;

    bridge.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    bridge.onTelemetry((payload) => {
      if (!payload || !engine.useLiveStream) return;

      // Immediate reactive tick if an emergency or chaos state transition occurs
      const chaosChanged = payload.activeChaosMode !== lastChaos;
      const gridChanged = payload.gridPower !== lastGridPower;
      const cracChanged = payload.cracUnitsActive !== lastCracActive;

      if (chaosChanged || gridChanged || cracChanged) {
        lastChaos = payload.activeChaosMode;
        lastGridPower = payload.gridPower;
        lastCracActive = payload.cracUnitsActive;
        runTick();
      }
    });

    return () => {
      bridge.destroy();
    };
  }, [runTick]);

  // Simulation timer loop (1500ms interval)
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      runTick();
    }, 1500);
    return () => clearInterval(timer);
  }, [running, runTick]);

  // Controls
  const handleToggleRun = useCallback(() => {
    setRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current.reset();
    sparkRef.current = { wasteHeat: [], powerDemand: [], heatDemand: [], gridPrice: [] };
    totalsRef.current = { orc: 0, charged: 0, discharged: 0, reused: 0, exported: 0, revenue: 0 };
    setHistory([]);
    setCo2History([]);
    setEnergyHistory([]);
    setTick(engineRef.current.tick());
  }, []);

  const handleToggleSource = useCallback(() => {
    setUseLiveStream((prev) => {
      const next = !prev;
      engineRef.current.useLiveStream = next;
      return next;
    });
  }, []);

  const handleTriggerChaos = useCallback((mode) => {
    if (bridgeRef.current) {
      bridgeRef.current.triggerRemoteChaos(mode);
    }
  }, []);

  const sensors = tick.sensors;
  const decisions = tick.decisions;
  const isCharging = useMemo(() => !!decisions.batteryCharge, [decisions]);
  const isDischarging = useMemo(() => !!decisions.batteryDischarge, [decisions]);
  const isThermalSurge = useMemo(() => sensors.serverAvgTemp > 35 || !sensors.cracUnitsActive, [sensors]);

  const spark = sparkRef.current;
  const totals = totalsRef.current;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-amber-600/5 blur-[140px]" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-cyan-600/5 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/5 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top Header */}
        <Header
          running={running}
          onToggleRun={handleToggleRun}
          onReset={handleReset}
          tickCount={engineRef.current.tickCount}
          isConnected={isConnected}
          useLiveStream={useLiveStream}
          onToggleSource={handleToggleSource}
          serverTemp={sensors.serverAvgTemp}
          ambientTemp={sensors.ambientRoomTemp}
          activeChaos={sensors.activeChaosMode}
          cracActive={sensors.cracUnitsActive}
          gridPower={sensors.gridPower}
        />

        {/* Main Content Dashboard */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-4">
          {/* Server Room Simulator Coupled Bridge Panel */}
          <ServerRoomBridgePanel
            rackTemps={sensors.rackTemps}
            ambientTemp={sensors.ambientRoomTemp}
            activeChaos={sensors.activeChaosMode}
            cracActive={sensors.cracUnitsActive}
            gridPower={sensors.gridPower}
            isConnected={isConnected}
            onTriggerChaos={handleTriggerChaos}
          />

          {/* 4 Telemetry KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Waste Heat"
              value={sensors.wasteHeatAvailableKw}
              unit="kW"
              icon={Flame}
              color={sensors.serverAvgTemp > 30 ? "#ef4444" : "#f97316"}
              history={spark.wasteHeat}
              decimals={1}
            />

            <MetricCard
              label="DC Power Demand"
              value={sensors.datacenterPowerDemandKw}
              unit="kW"
              icon={Server}
              color="#3b82f6"
              history={spark.powerDemand}
              decimals={1}
            />

            <MetricCard
              label="Building Heat Demand"
              value={sensors.nearbyBuildingHeatDemandKw}
              unit="kW"
              icon={Building2}
              color="#22c55e"
              history={spark.heatDemand}
              decimals={1}
            />

            <MetricCard
              label="Grid Electricity Price"
              value={sensors.gridElectricityPrice}
              unit="₹/kWh"
              icon={IndianRupee}
              color="#fbbf24"
              history={spark.gridPrice}
              decimals={1}
            >
              <div className="mt-2 flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    sensors.gridElectricityPrice >= 8.75
                      ? "bg-emerald-400 animate-pulse"
                      : sensors.gridElectricityPrice >= 8.3
                      ? "bg-amber-400"
                      : "bg-sky-400"
                  }`}
                />
                <span className="text-[10px] text-slate-400 font-medium">
                  {sensors.gridElectricityPrice >= 8.75
                    ? `Peak rate — ORC active; Carnot Battery selling power (+₹${(totals.revenue || 0).toFixed(0)} rev)`
                    : sensors.gridElectricityPrice >= 8.3
                    ? "Moderate rate — Balanced thermal storage"
                    : "Low rate — Datacenter buying cheap grid power; ORC on standby"}
                </span>
              </div>
            </MetricCard>
          </div>

          {/* Energy Flow Diagram & Carnot Battery Gauge */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EnergyFlowDiagram tick={tick} />
            </div>
            <div>
              <CarnotBatteryGauge
                level={tick.batteryLevel}
                capacity={tick.batteryCapacity}
                charging={isCharging}
                discharging={isDischarging}
                isThermalSurge={isThermalSurge}
              />
            </div>
          </div>

          {/* Energy Over Time Chart & Cumulative Stats */}
          <EnergyOverTimeChart
            history={energyHistory}
            totalOrc={totals.orc}
            totalCharged={totals.charged}
            totalDischarged={totals.discharged}
            totalReused={totals.reused}
            totalExported={totals.exported}
            totalRevenue={totals.revenue}
          />

          {/* Environmental Impact & Live Decision Stream */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Co2ImpactCard
              totalCo2Saved={tick.totalCo2Saved}
              tickCo2={tick.co2Saved}
              history={co2History}
            />
            <div className="min-h-[420px]">
              <DecisionLog history={history} />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 px-6 py-4 bg-slate-950/40">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">EmberGrid AI</span>
              <span>·</span>
              <span>Carnot Battery Closed-Loop Datacenter Grid Intelligence</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Grid emission factor: 0.71 kg CO₂/kWh</span>
              <span>ORC conversion: ~8–12%</span>
              <span>Round-trip efficiency: 70%</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
