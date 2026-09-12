// SimulationEngine.js - Real-time physical & telemetry simulation for 4 datacenter server racks

export class SimulationEngine {
  constructor() {
    this.simSpeed = 1; // 1x, 2x, 5x, 0 = paused
    this.lastTick = performance.now();
    this.activeChaosMode = null; // 'traffic_spike', 'disk_benchmark', 'ac_failure', 'blackout'
    this.gridPower = true;
    this.cracUnitsActive = true;
    this.ambientRoomTemp = 19.5; // °C
    this.targetRoomTemp = 19.0;

    // Callbacks
    this.onLogListeners = [];
    this.onTickListeners = [];

    // Initialize the 4 server stacks based on "Inside a Server Rack" anatomy
    this.racks = [
      this.createRack('rack_01', 'Stack 01 (Alpha)', 'Edge & API Gateway', {
        primaryColor: '#00e5ff',
        ipRange: '10.0.1.0/24',
        roleDescription: 'Handles external ingress, reverse proxies, SSL termination & rate limiting.'
      }),
      this.createRack('rack_02', 'Stack 02 (Beta)', 'Storage & Database SAN', {
        primaryColor: '#00e676',
        ipRange: '10.0.2.0/24',
        roleDescription: 'High-density NVMe/SAS storage arrays and transactional database clusters.'
      }),
      this.createRack('rack_03', 'Stack 03 (Gamma)', 'AI & GPU Compute Cluster', {
        primaryColor: '#d500f9',
        ipRange: '10.0.3.0/24',
        roleDescription: 'Heavy parallel compute, matrix acceleration, and model inference nodes.'
      }),
      this.createRack('rack_04', 'Stack 04 (Delta)', 'Core Network & Master UPS', {
        primaryColor: '#ff9100',
        ipRange: '10.0.4.0/24',
        roleDescription: 'Core routing backbone, fiber backplane, domain controllers & emergency power.'
      })
    ];

    // Seed initial logs
    this.addLog('SYSTEM', 'Datacenter Room telemetry simulation initialized. All 4 server stacks online.', 'info');
    this.addLog('NETWORK', 'Core backbone link established: 100 GbE redundant uplink operational.', 'info');
    this.addLog('HVAC', 'Dual CRAC cooling systems engaged. Chilled airflow set to 19.0°C.', 'info');

    // Telemetry Broadcast Bridge for EmberGrid AI
    this.lastBroadcast = 0;
    try {
      this.broadcastChannel = new BroadcastChannel('embergrid-datacenter-bridge');
      this.broadcastChannel.onmessage = (e) => this.handleInboundBridgeMessage(e.data);
    } catch (err) {
      this.broadcastChannel = null;
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type && e.data.type.startsWith('EMBERGRID_')) {
          this.handleInboundBridgeMessage(e.data);
        }
      });
    }
  }

  createRack(id, name, type, meta) {
    return {
      id,
      name,
      type,
      meta,
      doorOpen: false,
      overallHealth: 'HEALTHY', // HEALTHY, WARNING, CRITICAL, OFFLINE
      // Aggregates
      temp: 21.5,
      fanRpm: 4200,
      cpuLoad: 24,
      ramLoad: 38,
      powerWatts: 1450,
      networkInGbps: 4.2,
      networkOutGbps: 3.8,
      diskIoMBps: 180,
      // Individual anatomical components matching reference diagram:
      components: {
        cooling_monitor: {
          name: 'Rack Environmental & Fan Controller',
          unitPos: '41U-42U',
          type: 'Monitoring Tools & Cooling',
          status: 'NORMAL',
          exhaustTemp: 22.4,
          intakeTemp: 19.2,
          fan1Rpm: 4250,
          fan2Rpm: 4180
        },
        kvm_console: {
          name: '1U Slide-out KVM Console & KVM Switch',
          unitPos: '39U-40U',
          type: 'KVM Switches & Remote Access',
          status: 'READY',
          activeConsolePort: 1,
          screenResolution: '1920x1080',
          remoteUsers: 1,
          ipmiAddress: `https://${meta.ipRange.replace('.0/24', '.250')}`
        },
        patch_panel: {
          name: 'Cat6A / Fiber High-Density Patch Panel',
          unitPos: '37U-38U',
          type: 'Patch Panels & Cable Management',
          status: 'OPTIMAL',
          activePorts: 22,
          totalPorts: 24,
          cables: ['blue', 'blue', 'yellow', 'yellow', 'orange', 'cyan', 'blue', 'blue']
        },
        network_switch: {
          name: 'Enterprise 48-Port 10G/100G Switch',
          unitPos: '35U-36U',
          type: 'Networking Equipment',
          status: 'NORMAL',
          packetRateMpps: 14.8,
          bandwidthGbps: 8.5,
          portLeds: Array(24).fill(0).map(() => ({ active: Math.random() > 0.2, error: false }))
        },
        server_node_1: {
          name: 'Enterprise 2U Compute Node 01',
          unitPos: '31U-34U',
          type: 'Compute Server',
          status: 'ONLINE',
          cpuUsage: 28,
          ramUsage: 45,
          temp: 34,
          drives: Array(8).fill(0).map((_, i) => ({ id: i, health: 'OK', readWrite: false })),
          powerWatts: 420
        },
        server_node_2: {
          name: 'Enterprise 1U Compute Node 02',
          unitPos: '29U-30U',
          type: 'Compute Server',
          status: 'ONLINE',
          cpuUsage: 19,
          ramUsage: 32,
          temp: 31,
          drives: Array(4).fill(0).map((_, i) => ({ id: i, health: 'OK', readWrite: false })),
          powerWatts: 260
        },
        storage_san: {
          name: 'Dense 4U NVMe SAN Storage Array',
          unitPos: '21U-28U',
          type: 'Storage Units',
          status: 'NORMAL',
          totalCapacityTB: 128,
          usedCapacityTB: 64.2,
          iops: 12500,
          throughputMBs: 320,
          drives: Array(24).fill(0).map((_, i) => ({ id: i, active: true, blink: false, error: false }))
        },
        gpu_accelerator: {
          name: 'High-Density 4U AI Inference Node',
          unitPos: '13U-20U',
          type: 'AI Accelerator / Compute',
          status: 'IDLE',
          gpuUsage: 12,
          vramGB: 96,
          gpuTemp: 38,
          powerWatts: 580
        },
        ups_system: {
          name: 'Online Double-Conversion UPS (3kVA)',
          unitPos: '5U-12U',
          type: 'Uninterruptible Power Supply',
          status: 'ON_GRID',
          batteryPercent: 100,
          inputVoltage: 230,
          outputVoltage: 230,
          loadPercent: 42,
          runtimeMinutes: 38
        },
        pdu_unit: {
          name: 'Intelligent Monitored Rack PDU',
          unitPos: '1U-4U',
          type: 'Power Distribution & Breakers',
          status: 'NOMINAL',
          currentAmps: 6.8,
          voltage: 230,
          powerKw: 1.56,
          breakerEngaged: true
        }
      }
    };
  }

  onLog(listener) {
    this.onLogListeners.push(listener);
  }

  onTick(listener) {
    this.onTickListeners.push(listener);
  }

  addLog(category, message, level = 'info') {
    const time = new Date().toTimeString().split(' ')[0];
    const entry = { time, category, message, level };
    this.onLogListeners.forEach(fn => fn(entry));
  }

  setSimulationSpeed(speed) {
    this.simSpeed = speed;
    this.addLog('SIM', `Simulation speed adjusted to ${speed}x.`, 'info');
  }

  toggleDoor(rackId) {
    const rack = this.racks.find(r => r.id === rackId);
    if (rack) {
      rack.doorOpen = !rack.doorOpen;
      this.addLog('PHYSICAL', `${rack.name}: Perforated front security door ${rack.doorOpen ? 'OPENED' : 'CLOSED'}.`, 'info');
    }
  }

  // Chaos Modes
  triggerChaos(mode) {
    this.activeChaosMode = mode;

    switch (mode) {
      case 'traffic_spike':
        this.addLog('ALERT', 'DDoS / Ingress Traffic Surge injected! 120,000 req/s hitting Stack 01 & 03.', 'warn');
        break;
      case 'disk_benchmark':
        this.addLog('ALERT', 'High-throughput 4K Random Read/Write benchmark started on Stack 02 SAN.', 'warn');
        break;
      case 'ac_failure':
        this.cracUnitsActive = false;
        this.addLog('CRITICAL', 'CRAC Cooling System 1 & 2 OFFLINE! Airflow compressor failure detected!', 'crit');
        break;
      case 'blackout':
        this.gridPower = false;
        this.addLog('CRITICAL', 'UTILITY GRID MAINS COLLAPSED! Emergency automatic transfer to UPS batteries engaged!', 'crit');
        break;
      case 'normal':
      default:
        this.activeChaosMode = null;
        this.gridPower = true;
        this.cracUnitsActive = true;
        this.addLog('SYSTEM', 'All environmental and load parameters restored to normal baseline.', 'info');
        break;
    }
  }

  update(delta) {
    if (this.simSpeed === 0) return;
    const dt = delta * this.simSpeed;

    // 1. Environmental Air Temperature Update
    if (!this.cracUnitsActive) {
      // Room heating up
      this.ambientRoomTemp = Math.min(48.0, this.ambientRoomTemp + dt * 0.45);
    } else {
      // Cooling returning to target 19°C
      if (this.ambientRoomTemp > this.targetRoomTemp) {
        this.ambientRoomTemp = Math.max(this.targetRoomTemp, this.ambientRoomTemp - dt * 0.25);
      }
    }

    // 2. Update each of the 4 Racks
    this.racks.forEach((rack, index) => {
      let targetCpu = 20 + Math.sin(performance.now() * 0.001 + index) * 8;
      let targetNetwork = 3 + Math.cos(performance.now() * 0.0012 + index * 2) * 1.5;
      let targetDisk = 150 + Math.sin(performance.now() * 0.002 + index) * 60;
      let targetGpu = 10;

      // Specialization baseline variations
      if (rack.id === 'rack_01') {
        targetNetwork += 8;
        targetCpu += 12;
      } else if (rack.id === 'rack_02') {
        targetDisk += 350;
        targetCpu += 6;
      } else if (rack.id === 'rack_03') {
        targetGpu = 45 + Math.sin(performance.now() * 0.002) * 20;
        targetCpu += 25;
      } else if (rack.id === 'rack_04') {
        targetNetwork += 12;
      }

      // Chaos Overrides
      if (this.activeChaosMode === 'traffic_spike') {
        if (rack.id === 'rack_01' || rack.id === 'rack_03') {
          targetCpu = 96 + Math.random() * 3;
          targetNetwork = 38 + Math.random() * 4;
        }
      } else if (this.activeChaosMode === 'disk_benchmark') {
        if (rack.id === 'rack_02') {
          targetDisk = 4200 + Math.random() * 300;
          targetCpu = 78 + Math.random() * 5;
        }
      }

      // Lerp telemetry smoothly
      rack.cpuLoad += (targetCpu - rack.cpuLoad) * Math.min(1, dt * 2);
      rack.networkInGbps += (targetNetwork - rack.networkInGbps) * Math.min(1, dt * 2);
      rack.networkOutGbps = rack.networkInGbps * 0.85;
      rack.diskIoMBps += (targetDisk - rack.diskIoMBps) * Math.min(1, dt * 2);

      // Thermal calculation: Heat from components + ambient room
      const heatGeneration = (rack.cpuLoad * 0.22) + (targetGpu * 0.28) + (rack.powerWatts * 0.008);
      const coolingFactor = this.cracUnitsActive ? 0.35 : 0.05;
      const targetRackTemp = this.ambientRoomTemp + (heatGeneration * (1 - coolingFactor * 0.5));
      rack.temp += (targetRackTemp - rack.temp) * Math.min(1, dt * 0.6);

      // Fan speed controller (proportional to temperature)
      let targetFanRpm = 3500;
      if (rack.temp > 22) {
        targetFanRpm = 3500 + (rack.temp - 22) * 260;
      }
      if (rack.temp > 40) {
        targetFanRpm = 8500 + (rack.temp - 40) * 220;
      }
      targetFanRpm = Math.min(14500, targetFanRpm);
      rack.fanRpm += (targetFanRpm - rack.fanRpm) * Math.min(1, dt * 1.5);

      // Power calculation
      const baseWatts = 800;
      const dynamicWatts = (rack.cpuLoad * 8.5) + (targetGpu * 12.0) + (rack.fanRpm * 0.04);
      rack.powerWatts += (baseWatts + dynamicWatts - rack.powerWatts) * Math.min(1, dt * 2);

      // UPS Battery discharge / recharge
      const ups = rack.components.ups_system;
      if (!this.gridPower) {
        // Discharging on battery
        ups.status = 'ON_BATTERY';
        ups.inputVoltage = 0;
        ups.outputVoltage = 228 + Math.sin(performance.now() * 0.01) * 2;
        ups.loadPercent = Math.round((rack.powerWatts / 3000) * 100);
        // Battery drops
        const dischargeRate = (rack.powerWatts / 1500) * 0.65; // % per second
        ups.batteryPercent = Math.max(0, ups.batteryPercent - dt * dischargeRate);
        ups.runtimeMinutes = Math.round((ups.batteryPercent / 100) * 45);
      } else {
        // Charging or full
        ups.status = 'ON_GRID';
        ups.inputVoltage = 230;
        ups.outputVoltage = 230;
        ups.loadPercent = Math.round((rack.powerWatts / 3000) * 100);
        if (ups.batteryPercent < 100) {
          ups.batteryPercent = Math.min(100, ups.batteryPercent + dt * 0.8);
        }
      }

      // Update Individual Component Data
      rack.components.cooling_monitor.exhaustTemp = +(rack.temp + 1.2).toFixed(1);
      rack.components.cooling_monitor.intakeTemp = +(this.ambientRoomTemp).toFixed(1);
      rack.components.cooling_monitor.fan1Rpm = Math.round(rack.fanRpm);
      rack.components.cooling_monitor.fan2Rpm = Math.round(rack.fanRpm * 0.98);

      rack.components.server_node_1.cpuUsage = Math.round(rack.cpuLoad);
      rack.components.server_node_1.temp = Math.round(rack.temp + 8);
      rack.components.server_node_1.powerWatts = Math.round(rack.powerWatts * 0.35);

      rack.components.server_node_2.cpuUsage = Math.round(Math.max(5, rack.cpuLoad * 0.8));
      rack.components.server_node_2.temp = Math.round(rack.temp + 6);
      rack.components.server_node_2.powerWatts = Math.round(rack.powerWatts * 0.22);

      rack.components.gpu_accelerator.gpuUsage = Math.round(targetGpu);
      rack.components.gpu_accelerator.gpuTemp = Math.round(rack.temp + 14);

      rack.components.storage_san.throughputMBs = Math.round(rack.diskIoMBps);
      rack.components.storage_san.iops = Math.round(rack.diskIoMBps * 42);

      rack.components.pdu_unit.voltage = this.gridPower ? 230 : (ups.batteryPercent > 0 ? 228 : 0);
      rack.components.pdu_unit.currentAmps = +(rack.powerWatts / (rack.components.pdu_unit.voltage || 1)).toFixed(1);
      rack.components.pdu_unit.powerKw = +(rack.powerWatts / 1000).toFixed(2);

      // Status health classification
      if (!this.gridPower && ups.batteryPercent <= 0) {
        rack.overallHealth = 'OFFLINE';
      } else if (rack.temp > 50 || (!this.gridPower && ups.batteryPercent < 20)) {
        rack.overallHealth = 'CRITICAL';
      } else if (rack.temp > 35 || rack.cpuLoad > 85 || !this.gridPower) {
        rack.overallHealth = 'WARNING';
      } else {
        rack.overallHealth = 'HEALTHY';
      }

      // Blink switch port LEDs
      rack.components.network_switch.portLeds.forEach((led, i) => {
        led.active = Math.random() < (rack.networkInGbps / 40);
        led.error = rack.overallHealth === 'CRITICAL' && (i % 7 === 0);
      });

      // Storage SAN drive blinking
      rack.components.storage_san.drives.forEach(drive => {
        drive.blink = Math.random() < (rack.diskIoMBps / 3000);
      });
    });

    // Notify listeners and broadcast bridge
    const summary = this.getSummary();
    this.onTickListeners.forEach(fn => fn(summary));

    const now = performance.now();
    if (now - this.lastBroadcast > 150) { // Broadcast at ~6.6 Hz to prevent bus congestion
      this.lastBroadcast = now;
      this.broadcastTelemetry(summary);
    }
  }

  broadcastTelemetry(summary) {
    const packet = {
      type: 'DATACENTER_TELEMETRY',
      source: 'server-room-simulator',
      payload: summary
    };

    // 1. BroadcastChannel (same-origin / tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (err) {
        // BroadcastChannel failed
      }
    }

    // 2. PostMessage to parent (if iframe) & opener (if popout)
    if (typeof window !== 'undefined') {
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(packet, '*');
        } catch (err) {}
      }
      if (window.opener) {
        try {
          window.opener.postMessage(packet, '*');
        } catch (err) {}
      }
    }

    // 3. LocalStorage cache for cross-tab persistence
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('dc_telemetry_latest', JSON.stringify(packet));
      } catch (err) {}
    }
  }

  handleInboundBridgeMessage(data) {
    if (!data) return;
    if (data.type === 'EMBERGRID_REQUEST_TELEMETRY') {
      this.broadcastTelemetry(this.getSummary());
    } else if (data.type === 'EMBERGRID_TRIGGER_CHAOS') {
      this.triggerChaos(data.mode);
      this.addLog('BRIDGE', `Chaos mode '${data.mode}' triggered remotely from EmberGrid AI.`, 'warn');
    } else if (data.type === 'EMBERGRID_HEAT_REMOVED') {
      // Embergrid Carnot Battery is actively drawing heat away from the server room!
      // This exerts a slight stabilizing / cooling effect on ambient room temperature
      if (this.ambientRoomTemp > 19.5 && data.coolingKw > 0) {
        const coolingDelta = (data.coolingKw / 500) * 0.05;
        this.ambientRoomTemp = Math.max(19.0, this.ambientRoomTemp - coolingDelta);
      }
    }
  }

  getSummary() {
    const totalWatts = this.racks.reduce((acc, r) => acc + r.powerWatts, 0);
    const avgTemp = +(this.racks.reduce((acc, r) => acc + r.temp, 0) / this.racks.length).toFixed(1);
    const maxTemp = +(Math.max(...this.racks.map(r => r.temp))).toFixed(1);
    const totalNetIn = +(this.racks.reduce((acc, r) => acc + r.networkInGbps, 0)).toFixed(1);
    const totalNetOut = +(this.racks.reduce((acc, r) => acc + r.networkOutGbps, 0)).toFixed(1);
    const avgCpu = Math.round(this.racks.reduce((acc, r) => acc + r.cpuLoad, 0) / this.racks.length);
    const minBattery = Math.min(...this.racks.map(r => r.components.ups_system.batteryPercent));

    // Scaled thermal calculation for Carnot Battery coupling
    // In a datacenter pod / row cluster (scaled by 18x from our 4-rack demo stack):
    const clusterScale = 18;
    const scaledPowerKw = +((totalWatts / 1000) * clusterScale).toFixed(1);
    const tempExcess = Math.max(0, avgTemp - 20);
    const thermalMultiplier = 1 + (tempExcess / 22);
    const wasteHeatKw = +(scaledPowerKw * 0.95 * thermalMultiplier).toFixed(1);

    const rackTemps = this.racks.map(r => ({
      id: r.id,
      name: r.name,
      role: r.type,
      temp: +r.temp.toFixed(1),
      exhaustTemp: +r.components.cooling_monitor.exhaustTemp.toFixed(1),
      intakeTemp: +r.components.cooling_monitor.intakeTemp.toFixed(1),
      cpuLoad: Math.round(r.cpuLoad),
      powerWatts: Math.round(r.powerWatts),
      gpuTemp: r.id === 'rack_03' ? r.components.gpu_accelerator.gpuTemp : undefined,
      health: r.overallHealth
    }));

    return {
      ambientRoomTemp: +this.ambientRoomTemp.toFixed(1),
      avgTemp,
      maxTemp,
      totalWatts: Math.round(totalWatts),
      totalKw: +(totalWatts / 1000).toFixed(2),
      scaledPowerKw,
      wasteHeatKw,
      totalNetIn,
      totalNetOut,
      avgCpu,
      minBattery: Math.round(minBattery),
      gridPower: this.gridPower,
      cracUnitsActive: this.cracUnitsActive,
      activeChaosMode: this.activeChaosMode,
      pue: +(1.12 + (this.cracUnitsActive ? 0.08 : 0.02) + (totalWatts / 20000)).toFixed(2),
      rackTemps,
      timestamp: Date.now()
    };
  }
}
