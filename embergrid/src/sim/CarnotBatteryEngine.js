// CarnotBatteryEngine.js - Carnot Battery Grid Intelligence Engine
// Dynamically couples with 3D Server Room Simulator telemetry

export const BATTERY_CAPACITY = 100; // kWh thermal storage capacity
export const ROUND_TRIP_EFFICIENCY = 0.70; // 70% thermal-to-electric round trip
export const ORC_EFFICIENCY_BASE = 0.08; // Base Organic Rankine Cycle efficiency factor
export const CO2_GRID_FACTOR = 0.71; // kg CO2 saved per kWh displaced

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export class CarnotBatteryEngine {
  constructor() {
    this.batteryCapacity = BATTERY_CAPACITY;
    this.batteryCharge = 50.0; // Starts at 50% state of charge (kWh)
    this.totalCo2Saved = 0.0;
    this.tickCount = 0;
    this.history = [];

    // Live Server Room Telemetry state
    this.useLiveStream = true;
    this.isLiveConnected = false;
    this.dcTelemetry = null;
    this.lastPacketTime = 0;

    // Running totals
    this.totalOrcGenerated = 0.0;
    this.totalBatteryCharged = 0.0;
    this.totalBatteryDischarged = 0.0;
    this.totalHeatReused = 0.0;
    this.totalRevenue = 0.0;
    this.totalExportedKwh = 0.0;
  }

  setLiveTelemetry(packet) {
    if (!packet) return;
    this.dcTelemetry = packet;
    this.lastPacketTime = Date.now();
    this.isLiveConnected = true;
  }

  checkConnectionHeartbeat() {
    if (this.isLiveConnected && Date.now() - this.lastPacketTime > 3500) {
      this.isLiveConnected = false;
    }
  }

  getSensorData() {
    this.checkConnectionHeartbeat();
    const prevEntry = this.history[this.history.length - 1];

    // Check if we have active live telemetry from the 3D Server Room Simulator
    if (this.useLiveStream && this.isLiveConnected && this.dcTelemetry) {
      const dc = this.dcTelemetry;
      const avgTemp = dc.avgTemp ?? 21.5;
      const totalWatts = dc.totalWatts ?? 5800;
      const activeChaos = dc.activeChaosMode;
      const cracActive = dc.cracUnitsActive !== false;
      const gridPower = dc.gridPower !== false;

      // 1. Datacenter Power Demand (kW)
      // Base scaled cluster power (scaled from 4-rack demo stack to ~100 kW pod)
      const baseScaledKw = (totalWatts / 1000) * 18.0;
      const datacenterPowerDemandKw = clamp(baseScaledKw, 35, 250);

      // 2. Waste Heat Available (kW)
      // Servers convert electrical power into thermal dissipation.
      // Higher temperature = higher enthalpy and higher Carnot recovery potential.
      const tempExcess = Math.max(0, avgTemp - 19.5);
      const tempThermalFactor = 1 + (tempExcess / 20.0); // at 45°C -> factor ~ 2.27x
      const wasteHeatAvailableKw = clamp(datacenterPowerDemandKw * 0.94 * tempThermalFactor, 40, 320);

      // 3. Nearby District Building Heat Demand (kW)
      // Smoothed dynamic demand curve with slight diurnal wave
      const smoothFunc = (prev, min, max) => {
        if (prev === undefined) return randRange(min, max);
        return clamp(prev * 0.8 + randRange(min, max) * 0.2, min, max);
      };
      const prevBuilding = prevEntry?.sensors?.nearbyBuildingHeatDemandKw;
      const nearbyBuildingHeatDemandKw = smoothFunc(prevBuilding, 20, 85);

      // 4. Grid Electricity Price (₹/kWh)
      const prevPrice = prevEntry?.sensors?.gridElectricityPrice;
      const gridElectricityPrice = smoothFunc(prevPrice, 5.4, 13.7);

      return {
        wasteHeatAvailableKw: +wasteHeatAvailableKw.toFixed(2),
        datacenterPowerDemandKw: +datacenterPowerDemandKw.toFixed(2),
        nearbyBuildingHeatDemandKw: +nearbyBuildingHeatDemandKw.toFixed(2),
        gridElectricityPrice: +gridElectricityPrice.toFixed(1),
        serverAvgTemp: +avgTemp.toFixed(1),
        serverMaxTemp: +(dc.maxTemp ?? avgTemp).toFixed(1),
        ambientRoomTemp: +(dc.ambientRoomTemp ?? 19.5).toFixed(1),
        cracUnitsActive: cracActive,
        gridPower: gridPower,
        activeChaosMode: activeChaos,
        rackTemps: dc.rackTemps || [],
        isLive: true,
        timestamp: Date.now()
      };
    }

    // Fallback: Autonomous synthetic generator when no live stream is connected
    const smooth = (prev, min, max) => {
      if (prev === undefined) return randRange(min, max);
      return clamp(prev * 0.5 + randRange(min, max) * 0.5, min, max);
    };

    const prevSensors = prevEntry?.sensors;
    const wasteHeat = smooth(prevSensors?.wasteHeatAvailableKw, 50, 200);
    const dcDemand = smooth(prevSensors?.datacenterPowerDemandKw, 40, 150);
    const buildingDemand = smooth(prevSensors?.nearbyBuildingHeatDemandKw, 0, 100);
    const price = smooth(prevSensors?.gridElectricityPrice, 0.05, 0.15);

    return {
      wasteHeatAvailableKw: +wasteHeat.toFixed(2),
      datacenterPowerDemandKw: +dcDemand.toFixed(2),
      nearbyBuildingHeatDemandKw: +buildingDemand.toFixed(2),
      gridElectricityPrice: +price.toFixed(3),
      serverAvgTemp: 22.0,
      serverMaxTemp: 23.5,
      ambientRoomTemp: 19.5,
      cracUnitsActive: true,
      gridPower: true,
      activeChaosMode: null,
      rackTemps: [],
      isLive: false,
      timestamp: Date.now()
    };
  }

  charge(amount) {
    const effective = amount * ROUND_TRIP_EFFICIENCY;
    const spaceLeft = this.batteryCapacity - this.batteryCharge;
    if (spaceLeft <= 0) {
      return { success: false, stored: 0 };
    }
    if (effective <= spaceLeft) {
      this.batteryCharge += effective;
      return { success: true, stored: effective };
    } else {
      this.batteryCharge = this.batteryCapacity;
      return { success: true, stored: spaceLeft };
    }
  }

  discharge(amount) {
    if (this.batteryCharge >= amount) {
      this.batteryCharge -= amount;
      return { success: true, energy: amount * ROUND_TRIP_EFFICIENCY };
    }
    return { success: false, energy: 0 };
  }

  decideAction(sensors) {
    let availableHeat = sensors.wasteHeatAvailableKw;
    const dcDemand = sensors.datacenterPowerDemandKw;
    const buildingDemand = sensors.nearbyBuildingHeatDemandKw;
    const price = sensors.gridElectricityPrice;
    const isHighGridPrice = price >= 8.3;
    const isThermalEmergency = sensors.serverAvgTemp > 35.0 || !sensors.cracUnitsActive;
    const isGridBlackout = !sensors.gridPower;

    const decisions = {};

    let co2Saved = 0.0;
    let orcGeneratedKw = 0.0;
    let batteryChargedKwh = 0.0;
    let batteryDischargedKwh = 0.0;
    let reusedHeatKw = 0.0;
    let gridExportKw = 0.0;
    let gridImportKw = 0.0;
    let tickRevenue = 0.0;

    // =========================================================================
    // RULE 1: HEAT REUSE SHOULD RUN ALL THE TIME AS IT IS MORE PROFITABLE
    // =========================================================================
    if (buildingDemand > 0 && availableHeat > 0) {
      reusedHeatKw = Math.min(availableHeat, buildingDemand);
      co2Saved += reusedHeatKw * 0.05;
      decisions.directReuse = `Continuous Heat Reuse: Routed ${reusedHeatKw.toFixed(1)} kW directly to buildings (max profit)`;
      availableHeat -= reusedHeatKw;
    }

    // =========================================================================
    // EMERGENCY OVERRIDES (BLACKOUT & CRAC OVERHEAT PROTECTION)
    // =========================================================================
    if (isGridBlackout) {
      // Mains grid collapse: Carnot Battery provides emergency UPS backup to DC bus
      const emergencyDemand = Math.min(dcDemand * 0.6, this.batteryCharge);
      const { success, energy } = this.discharge(emergencyDemand);
      if (success && energy > 0) {
        batteryDischargedKwh = energy;
        co2Saved += energy * CO2_GRID_FACTOR * 1.5;
        decisions.batteryDischarge = `Discharging ${energy.toFixed(2)} kW backup to DC bus`;
        decisions.blackoutSupport = `Grid collapse: Carnot microgrid extending UPS runtime`;
      }
      if (availableHeat > 15) {
        orcGeneratedKw = availableHeat * ORC_EFFICIENCY_BASE;
        decisions.orcGen = `Generated ${orcGeneratedKw.toFixed(2)} kW emergency microgrid power`;
      }
    }
    // =========================================================================
    // RULE 2: WHEN GRID PRICE IS HIGH (PEAK TARIFF >= $0.100/kWh)
    // - The ORC should run and send energy to Data Centers
    // - The Battery should sell energy to external power points
    // =========================================================================
    else if (isHighGridPrice) {
      // 1. ORC runs and sends energy to Data Centers to offset expensive peak grid power
      if (availableHeat > 5) {
        const orcEff = isThermalEmergency ? ORC_EFFICIENCY_BASE * 1.5 : ORC_EFFICIENCY_BASE * 1.25;
        orcGeneratedKw = availableHeat * orcEff;
        co2Saved += orcGeneratedKw * CO2_GRID_FACTOR;
        decisions.orcGen = `High Tariff (₹${price.toFixed(1)}): ORC generating ${orcGeneratedKw.toFixed(1)} kW -> sending power to Data Centers`;
        availableHeat -= (orcGeneratedKw / orcEff);
      }

      // 2. Carnot Battery sells stored thermal energy to external grid at peak price
      if (this.batteryCharge > 5) {
        const exportCandidate = Math.min(Math.max((this.batteryCharge - 5) * 0.35, 8.0), Math.min(this.batteryCharge - 2, 28.0));
        const { success, energy } = this.discharge(exportCandidate);
        if (success && energy > 0) {
          gridExportKw = energy;
          tickRevenue = energy * price;
          co2Saved += energy * CO2_GRID_FACTOR;
          decisions.gridExport = `Peak Tariff: Battery selling ${energy.toFixed(1)} kW to external @ ₹${price.toFixed(1)}/kWh (+₹${tickRevenue.toFixed(0)})`;
        }
      }
      // Note: Battery is selling to external, NOT charging. Cheap grid import is OFF.
    } else if (isThermalEmergency) {
      // Overheating / CRAC Failure (when price is not high): absorb surge heat into buffer
      if (availableHeat > 5) {
        const chargeAttempt = availableHeat * 0.85;
        const { success, stored } = this.charge(chargeAttempt);
        if (success && stored > 0) {
          batteryChargedKwh = stored;
          decisions.batteryCharge = `Buffer storing ${stored.toFixed(2)} kWh surge heat`;
          decisions.thermalMitigation = `CRAC offline (${sensors.serverAvgTemp}°C): Rapid heat evacuation sink`;
          availableHeat -= (stored / ROUND_TRIP_EFFICIENCY);
        }
      }
      gridImportKw = dcDemand;
      decisions.gridImport = `Drawing cheap grid electricity; ORC offline`;
    }
    // =========================================================================
    // RULE 3: WHEN GRID PRICE IS LESS (< $0.100/kWh)
    // - The Data Center should take energy from external (cheap electricity)
    // - The Carnot Battery should get RECHARGED from waste heat
    // - AFTER the Battery is charged, THEN ONLY the energy should enter the ORC
    // =========================================================================
    else {
      // 1. Data Center takes energy from external grid for less price
      gridImportKw = dcDemand;
      decisions.gridImport = `Low Tariff (₹${price.toFixed(1)}/kWh): Data Center taking cheap electricity from external`;

      const isBatteryFull = this.batteryCharge >= (this.batteryCapacity - 1.5); // >= 98.5%

      // 2. If Battery is NOT fully charged, RECHARGE the Carnot Battery
      if (!isBatteryFull && availableHeat > 5) {
        const { success, stored } = this.charge(availableHeat * 0.70);
        if (success && stored > 0) {
          batteryChargedKwh = stored;
          decisions.batteryCharge = `Recharging Carnot Battery: ${this.batteryCharge.toFixed(1)} / ${this.batteryCapacity} kWh (${((this.batteryCharge / this.batteryCapacity) * 100).toFixed(0)}% SOC)`;
          availableHeat -= (stored / ROUND_TRIP_EFFICIENCY);
        }
      }

      // 3. AFTER the Battery is charged, THEN ONLY the energy should enter the ORC!
      const batteryNowFull = this.batteryCharge >= (this.batteryCapacity - 1.5);
      if (batteryNowFull && availableHeat > 10) {
        orcGeneratedKw = availableHeat * ORC_EFFICIENCY_BASE;
        co2Saved += orcGeneratedKw * CO2_GRID_FACTOR;
        decisions.orcGen = `Battery Fully Charged (100%): Surplus energy entering ORC -> sending ${orcGeneratedKw.toFixed(1)} kW to Data Center`;
      }
      // If battery is still recharging, ORC stays completely OFF!
    }

    this.totalCo2Saved += co2Saved;
    this.totalOrcGenerated += orcGeneratedKw;
    this.totalBatteryCharged += batteryChargedKwh;
    this.totalBatteryDischarged += batteryDischargedKwh;
    this.totalHeatReused += reusedHeatKw;
    this.totalRevenue += tickRevenue;
    this.totalExportedKwh += gridExportKw;
    this.tickCount++;

    const historyEntry = {
      id: this.tickCount,
      timestamp: Date.now(),
      decisions,
      sensors,
      co2Saved,
      batteryLevel: this.batteryCharge,
      orcGeneratedKw,
      batteryChargedKwh,
      batteryDischargedKwh,
      reusedHeatKw,
      gridExportKw,
      gridImportKw,
      tickRevenue,
      totalRevenue: this.totalRevenue,
      totalExportedKwh: this.totalExportedKwh
    };

    this.history.push(historyEntry);
    if (this.history.length > 50) {
      this.history.shift();
    }

    return {
      decisions,
      co2Saved,
      orcGeneratedKw,
      batteryChargedKwh,
      batteryDischargedKwh,
      reusedHeatKw,
      gridExportKw,
      gridImportKw,
      tickRevenue
    };
  }

  tick() {
    const sensors = this.getSensorData();
    const actions = this.decideAction(sensors);

    return {
      sensors,
      decisions: actions.decisions,
      co2Saved: actions.co2Saved,
      batteryLevel: this.batteryCharge,
      batteryCapacity: this.batteryCapacity,
      totalCo2Saved: this.totalCo2Saved,
      orcGeneratedKw: actions.orcGeneratedKw,
      batteryChargedKwh: actions.batteryChargedKwh,
      batteryDischargedKwh: actions.batteryDischargedKwh,
      reusedHeatKw: actions.reusedHeatKw,
      gridExportKw: actions.gridExportKw,
      gridImportKw: actions.gridImportKw,
      tickRevenue: actions.tickRevenue,
      totalRevenue: this.totalRevenue,
      totalExportedKwh: this.totalExportedKwh
    };
  }

  reset() {
    this.batteryCharge = 50.0;
    this.totalCo2Saved = 0.0;
    this.totalOrcGenerated = 0.0;
    this.totalBatteryCharged = 0.0;
    this.totalBatteryDischarged = 0.0;
    this.totalHeatReused = 0.0;
    this.totalRevenue = 0.0;
    this.totalExportedKwh = 0.0;
    this.tickCount = 0;
    this.history = [];
  }
}
