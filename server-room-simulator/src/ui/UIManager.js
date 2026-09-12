// UIManager.js - Manages HUD, sparkline charts, telemetry stats, inspector drawer, and chaos triggers

export class UIManager {
  constructor(simEngine, soundManager, datacenterScene) {
    this.sim = simEngine;
    this.sound = soundManager;
    this.scene = datacenterScene;

    this.selectedRack = this.sim.racks[0];
    this.selectedComponent = null;

    // Rolling history for sparklines (30 points)
    this.history = {
      cpu: Array(30).fill(25),
      temp: Array(30).fill(21.5),
      net: Array(30).fill(12.0),
      power: Array(30).fill(6.2)
    };

    this.initDOM();
    this.bindEvents();
    this.bindSimulation();
  }

  initDOM() {
    // Cache DOM elements
    this.dom = {
      // Top stats
      statusPill: document.getElementById('status-pill'),
      statusText: document.getElementById('status-text'),
      roomTemp: document.getElementById('val-room-temp'),
      totalPower: document.getElementById('val-total-power'),
      pueVal: document.getElementById('val-pue'),
      netThroughput: document.getElementById('val-net-throughput'),
      upsReserve: document.getElementById('val-ups-reserve'),
      gridStatus: document.getElementById('val-grid-status'),
      bridgeStatus: document.getElementById('val-bridge-status'),
      wasteHeat: document.getElementById('val-waste-heat'),

      // Canvas Sparklines
      canvasCpu: document.getElementById('spark-cpu'),
      canvasTemp: document.getElementById('spark-temp'),
      canvasNet: document.getElementById('spark-net'),

      // Controls
      btnSound: document.getElementById('btn-sound'),
      btnThermal: document.getElementById('btn-thermal'),
      btnAirflow: document.getElementById('btn-airflow'),
      selectLighting: document.getElementById('select-lighting'),
      selectCamera: document.getElementById('select-camera'),

      // Chaos buttons
      btnChaosNormal: document.getElementById('chaos-normal'),
      btnChaosTraffic: document.getElementById('chaos-traffic'),
      btnChaosDisk: document.getElementById('chaos-disk'),
      btnChaosAc: document.getElementById('chaos-ac'),
      btnChaosBlackout: document.getElementById('chaos-blackout'),

      // Speed buttons
      speedButtons: document.querySelectorAll('.btn-speed'),

      // Racks overview cards
      rackCardsContainer: document.getElementById('rack-cards-container'),

      // Inspector Drawer
      inspectorDrawer: document.getElementById('inspector-drawer'),
      inspectorTitle: document.getElementById('inspector-title'),
      inspectorSubtitle: document.getElementById('inspector-subtitle'),
      inspectorBody: document.getElementById('inspector-body'),
      btnCloseInspector: document.getElementById('btn-close-inspector'),

      // Syslog
      syslogContainer: document.getElementById('syslog-container')
    };

    this.renderRackCards();
  }

  renderRackCards() {
    if (!this.dom.rackCardsContainer) return;
    this.dom.rackCardsContainer.innerHTML = '';

    this.sim.racks.forEach((rack, idx) => {
      const card = document.createElement('div');
      card.className = `rack-card ${this.selectedRack?.id === rack.id ? 'active' : ''}`;
      card.dataset.rackId = rack.id;

      card.innerHTML = `
        <div class="rack-card-header">
          <div class="rack-name">
            <span class="rack-dot" style="background:${rack.meta.primaryColor}"></span>
            <strong>${rack.name}</strong>
          </div>
          <span class="badge ${rack.overallHealth.toLowerCase()}">${rack.overallHealth}</span>
        </div>
        <div class="rack-role">${rack.type}</div>
        <div class="rack-metrics-grid">
          <div><span class="lbl">TEMP</span><span class="val temp-val">${rack.temp.toFixed(1)}°C</span></div>
          <div><span class="lbl">CPU</span><span class="val cpu-val">${Math.round(rack.cpuLoad)}%</span></div>
          <div><span class="lbl">FAN</span><span class="val fan-val">${Math.round(rack.fanRpm)} RPM</span></div>
          <div><span class="lbl">PWR</span><span class="val pwr-val">${Math.round(rack.powerWatts)}W</span></div>
        </div>
        <div class="rack-card-actions">
          <button class="btn-sm btn-focus" data-rack-id="${rack.id}">Focus</button>
          <button class="btn-sm btn-door" data-rack-id="${rack.id}">${rack.doorOpen ? 'Close Door' : 'Open Door'}</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.selectRack(rack);
        }
      });

      card.querySelector('.btn-focus').addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectRack(rack);
        this.scene.setCameraPreset(rack.id);
      });

      card.querySelector('.btn-door').addEventListener('click', (e) => {
        e.stopPropagation();
        this.sim.toggleDoor(rack.id);
        e.target.innerText = rack.doorOpen ? 'Close Door' : 'Open Door';
        this.sound.playClick();
      });

      this.dom.rackCardsContainer.appendChild(card);
    });
  }

  selectRack(rack) {
    this.selectedRack = rack;
    this.selectedComponent = null;
    this.renderRackCards();
    this.renderInspector();
    this.openInspector();
  }

  selectComponent(compInfo) {
    const rack = this.sim.racks.find(r => r.id === compInfo.rackId);
    if (!rack) return;

    this.selectedRack = rack;
    this.selectedComponent = {
      rackId: rack.id,
      type: compInfo.type,
      name: compInfo.name,
      data: rack.components[compInfo.type]
    };

    this.renderRackCards();
    this.renderInspector();
    this.openInspector();
  }

  openInspector() {
    this.dom.inspectorDrawer.classList.add('open');
  }

  closeInspector() {
    this.dom.inspectorDrawer.classList.remove('open');
  }

  renderInspector() {
    if (this.selectedComponent && this.selectedComponent.data) {
      this.renderComponentInspector();
    } else if (this.selectedRack) {
      this.renderRackInspector();
    }
  }

  renderRackInspector() {
    const r = this.selectedRack;
    this.dom.inspectorTitle.innerText = r.name;
    this.dom.inspectorSubtitle.innerText = `${r.type} • 42U Standard EIA-310 Cabinet`;

    const comps = r.components;
    this.dom.inspectorBody.innerHTML = `
      <div class="inspector-section">
        <h4>Cabinet Telemetry</h4>
        <div class="metrics-row">
          <div class="metric-box">
            <span class="m-lbl">RACK TEMP</span>
            <span class="m-val highlight">${r.temp.toFixed(1)} °C</span>
          </div>
          <div class="metric-box">
            <span class="m-lbl">EXHAUST FANS</span>
            <span class="m-val">${Math.round(r.fanRpm)} RPM</span>
          </div>
          <div class="metric-box">
            <span class="m-lbl">TOTAL DRAW</span>
            <span class="m-val">${Math.round(r.powerWatts)} Watts</span>
          </div>
          <div class="metric-box">
            <span class="m-lbl">UPS BATTERY</span>
            <span class="m-val">${Math.round(comps.ups_system.batteryPercent)}%</span>
          </div>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Rack Structural Anatomy (Top to Bottom)</h4>
        <div class="anatomy-list">
          <div class="anatomy-item" data-type="cooling_monitor">
            <span class="u-badge">41U-42U</span>
            <div class="a-info">
              <strong>${comps.cooling_monitor.name}</strong>
              <small>Dual Exhaust Blowers • Digital Thermostat (${comps.cooling_monitor.exhaustTemp}°C)</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="kvm_console">
            <span class="u-badge">39U-40U</span>
            <div class="a-info">
              <strong>${comps.kvm_console.name}</strong>
              <small>Slide-out Screen & Keyboard • IPMI: ${comps.kvm_console.ipmiAddress}</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="patch_panel">
            <span class="u-badge">37U-38U</span>
            <div class="a-info">
              <strong>${comps.patch_panel.name}</strong>
              <small>${comps.patch_panel.activePorts}/${comps.patch_panel.totalPorts} RJ45 Ports Active • Bundled Patch Cables</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="network_switch">
            <span class="u-badge">35U-36U</span>
            <div class="a-info">
              <strong>${comps.network_switch.name}</strong>
              <small>48x 10GbE + 4x 100G SFP+ Uplinks • ${r.networkInGbps.toFixed(1)} Gbps Flow</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="server_node_1">
            <span class="u-badge">31U-34U</span>
            <div class="a-info">
              <strong>${comps.server_node_1.name}</strong>
              <small>2U Dual Xeon/EPYC Node • CPU ${comps.server_node_1.cpuUsage}% • RAM ${comps.server_node_1.ramUsage}%</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="server_node_2">
            <span class="u-badge">29U-30U</span>
            <div class="a-info">
              <strong>${comps.server_node_2.name}</strong>
              <small>1U Compute Node • CPU ${comps.server_node_2.cpuUsage}% • 4x Hot-swap Disks</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="storage_san">
            <span class="u-badge">21U-28U</span>
            <div class="a-info">
              <strong>${comps.storage_san.name}</strong>
              <small>24-Bay All-Flash NVMe Array • ${comps.storage_san.throughputMBs} MB/s (${comps.storage_san.iops} IOPS)</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="gpu_accelerator">
            <span class="u-badge">13U-20U</span>
            <div class="a-info">
              <strong>${comps.gpu_accelerator.name}</strong>
              <small>4U AI Compute • GPU ${comps.gpu_accelerator.gpuUsage}% • 96GB VRAM • ${comps.gpu_accelerator.gpuTemp}°C</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="ups_system">
            <span class="u-badge">5U-12U</span>
            <div class="a-info">
              <strong>${comps.ups_system.name}</strong>
              <small>Double-Conversion 3kVA • ${comps.ups_system.status} • Runtime: ${comps.ups_system.runtimeMinutes} min</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>

          <div class="anatomy-item" data-type="pdu_unit">
            <span class="u-badge">1U-4U</span>
            <div class="a-info">
              <strong>${comps.pdu_unit.name}</strong>
              <small>Monitored Rack PDU • ${comps.pdu_unit.currentAmps}A @ ${comps.pdu_unit.voltage}V (${comps.pdu_unit.powerKw} kW)</small>
            </div>
            <button class="btn-micro">Inspect</button>
          </div>
        </div>
      </div>

      <div class="inspector-section">
        <h4>Physical Actions</h4>
        <div class="action-buttons">
          <button class="btn-action" id="action-toggle-door">
            ${r.doorOpen ? 'Shut Perforated Door' : 'Swing Open Front Door'}
          </button>
          <button class="btn-action" id="action-reboot-rack">Warm Reboot Stack</button>
        </div>
      </div>
    `;

    // Bind sub-item inspections
    this.dom.inspectorBody.querySelectorAll('.anatomy-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        this.selectComponent({
          rackId: r.id,
          type,
          name: comps[type].name
        });
      });
    });

    const btnToggle = this.dom.inspectorBody.querySelector('#action-toggle-door');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.sim.toggleDoor(r.id);
        this.renderRackCards();
        this.renderRackInspector();
        this.sound.playClick();
      });
    }

    const btnReboot = this.dom.inspectorBody.querySelector('#action-reboot-rack');
    if (btnReboot) {
      btnReboot.addEventListener('click', () => {
        this.sim.addLog('SYSTEM', `${r.name}: Initiated graceful warm reboot of all blade nodes.`, 'warn');
        this.sound.playClick();
      });
    }
  }

  renderComponentInspector() {
    const c = this.selectedComponent;
    const r = this.selectedRack;
    const d = c.data;

    this.dom.inspectorTitle.innerText = d.name;
    this.dom.inspectorSubtitle.innerText = `${r.name} • Location: ${d.unitPos} • Type: ${d.type}`;

    let specificContent = '';

    if (c.type === 'network_switch') {
      specificContent = `
        <div class="component-stat-grid">
          <div><span class="lbl">THROUGHPUT</span><strong>${r.networkInGbps.toFixed(2)} Gbps</strong></div>
          <div><span class="lbl">PACKET RATE</span><strong>${d.packetRateMpps} Mpps</strong></div>
          <div><span class="lbl">ACTIVE PORTS</span><strong>24 / 48</strong></div>
          <div><span class="lbl">DUPLEX</span><strong>Full 10G / 100G</strong></div>
        </div>
        <div class="port-matrix">
          ${d.portLeds.map((led, i) => `
            <div class="port-box ${led.active ? 'active' : ''} ${led.error ? 'error' : ''}">
              P${i + 1}
            </div>
          `).join('')}
        </div>
      `;
    } else if (c.type === 'storage_san') {
      specificContent = `
        <div class="component-stat-grid">
          <div><span class="lbl">RAW CAPACITY</span><strong>${d.totalCapacityTB} TB NVMe</strong></div>
          <div><span class="lbl">USED SPACE</span><strong>${d.usedCapacityTB} TB (${Math.round((d.usedCapacityTB/d.totalCapacityTB)*100)}%)</strong></div>
          <div><span class="lbl">THROUGHPUT</span><strong>${d.throughputMBs} MB/s</strong></div>
          <div><span class="lbl">IOPS</span><strong>${d.iops.toLocaleString()}</strong></div>
        </div>
        <h5>Drive Tray Status (24 Bays)</h5>
        <div class="drive-matrix">
          ${d.drives.map((drv, i) => `
            <div class="drive-bay ${drv.blink ? 'blink' : ''}">
              <span class="drive-led"></span>
              <span>SSD-${i+1}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (c.type === 'ups_system') {
      specificContent = `
        <div class="component-stat-grid">
          <div><span class="lbl">STATUS</span><strong>${d.status}</strong></div>
          <div><span class="lbl">BATTERY RESERVE</span><strong>${Math.round(d.batteryPercent)}%</strong></div>
          <div><span class="lbl">MAINS VOLTAGE</span><strong>${d.inputVoltage} VAC</strong></div>
          <div><span class="lbl">OUTPUT VOLTAGE</span><strong>${Math.round(d.outputVoltage)} VAC</strong></div>
          <div><span class="lbl">ESTIMATED RUNTIME</span><strong>${d.runtimeMinutes} Minutes</strong></div>
          <div><span class="lbl">LOAD DRAW</span><strong>${d.loadPercent}% (${Math.round(r.powerWatts)}W)</strong></div>
        </div>
        <div class="battery-bar-container">
          <div class="battery-bar" style="width: ${d.batteryPercent}%; background: ${d.batteryPercent < 30 ? '#ff1744' : '#00e5ff'};"></div>
        </div>
      `;
    } else {
      specificContent = `
        <div class="component-stat-grid">
          <div><span class="lbl">STATUS</span><strong>${d.status || 'NORMAL'}</strong></div>
          <div><span class="lbl">TEMPERATURE</span><strong>${d.temp || r.temp.toFixed(1)} °C</strong></div>
          <div><span class="lbl">POWER</span><strong>${d.powerWatts || Math.round(r.powerWatts * 0.3)} W</strong></div>
          <div><span class="lbl">SPEC</span><strong>Enterprise Grade Tier-3</strong></div>
        </div>
      `;
    }

    this.dom.inspectorBody.innerHTML = `
      <div class="inspector-section">
        <button class="btn-sm btn-back-rack" id="btn-back-to-rack">← Back to ${r.name}</button>
      </div>
      <div class="inspector-section">
        <h4>Component Diagnostics</h4>
        ${specificContent}
      </div>
      <div class="inspector-section">
        <h4>Diagnostic Operations</h4>
        <div class="action-buttons">
          <button class="btn-action" id="btn-ping-comp">Run Self-Test</button>
          <button class="btn-action" id="btn-isolate-comp">Isolate Link</button>
        </div>
      </div>
    `;

    this.dom.inspectorBody.querySelector('#btn-back-to-rack').addEventListener('click', () => {
      this.selectedComponent = null;
      this.renderRackInspector();
    });

    this.dom.inspectorBody.querySelector('#btn-ping-comp').addEventListener('click', () => {
      this.sim.addLog('DIAG', `${d.name}: Self-test completed successfully. Latency: 0.12ms.`, 'info');
      this.sound.playClick();
    });

    this.dom.inspectorBody.querySelector('#btn-isolate-comp').addEventListener('click', () => {
      this.sim.addLog('SECURITY', `${d.name}: Administrative VLAN isolation toggled.`, 'warn');
      this.sound.playClick();
    });
  }

  bindEvents() {
    // Inspector close button
    this.dom.btnCloseInspector.addEventListener('click', () => this.closeInspector());

    // Sound toggle
    this.dom.btnSound.addEventListener('click', () => {
      const active = this.sound.toggleMute();
      this.dom.btnSound.innerText = active ? '🔊 Sound: ON' : '🔇 Sound: MUTED';
      this.dom.btnSound.classList.toggle('active', active);
    });

    // Thermal Heatmap toggle
    this.dom.btnThermal.addEventListener('click', () => {
      const active = !this.scene.thermalMode;
      this.scene.setThermalHeatmap(active);
      this.dom.btnThermal.classList.toggle('active', active);
      this.dom.btnThermal.innerText = active ? '🌡️ Thermal: ON' : '🌡️ Thermal: OFF';
    });

    // Airflow Particles toggle
    this.dom.btnAirflow.addEventListener('click', () => {
      this.scene.airflowVisible = !this.scene.airflowVisible;
      this.dom.btnAirflow.classList.toggle('active', this.scene.airflowVisible);
      this.dom.btnAirflow.innerText = this.scene.airflowVisible ? '💨 Airflow: ON' : '💨 Airflow: OFF';
    });

    // Lighting select
    this.dom.selectLighting.addEventListener('change', (e) => {
      this.scene.setLightingMode(e.target.value);
    });

    // Camera preset select
    this.dom.selectCamera.addEventListener('change', (e) => {
      this.scene.setCameraPreset(e.target.value);
    });

    // Chaos mode buttons
    const chaosButtons = [
      { btn: this.dom.btnChaosNormal, mode: 'normal' },
      { btn: this.dom.btnChaosTraffic, mode: 'traffic_spike' },
      { btn: this.dom.btnChaosDisk, mode: 'disk_benchmark' },
      { btn: this.dom.btnChaosAc, mode: 'ac_failure' },
      { btn: this.dom.btnChaosBlackout, mode: 'blackout' }
    ];

    chaosButtons.forEach(({ btn, mode }) => {
      btn.addEventListener('click', () => {
        chaosButtons.forEach(b => b.btn.classList.remove('active'));
        btn.classList.add('active');
        this.sim.triggerChaos(mode);
        this.sound.playClick();

        if (mode === 'blackout') {
          this.scene.setLightingMode('emergency');
          this.dom.selectLighting.value = 'emergency';
        } else if (mode === 'normal') {
          this.scene.setLightingMode('standard');
          this.dom.selectLighting.value = 'standard';
        }
      });
    });

    // Speed buttons
    this.dom.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.dataset.speed);
        this.sim.setSimulationSpeed(speed);
        this.sound.playClick();
      });
    });
  }

  bindSimulation() {
    // On every simulation tick (10Hz)
    this.sim.onTick((summary) => {
      this.updateHUD(summary);
      this.updateSparklines(summary);
      this.sound.updateTelemetry(
        summary.avgTemp * 180,
        summary.activeChaosMode === 'ac_failure',
        !summary.gridPower
      );
    });

    // On new syslog entry
    this.sim.onLog((entry) => {
      this.addSyslogRow(entry);
    });
  }

  updateHUD(summary) {
    // Top KPIs
    this.dom.roomTemp.innerText = `${summary.ambientRoomTemp.toFixed(1)}°C`;
    this.dom.totalPower.innerText = `${summary.totalKw} kW`;
    this.dom.pueVal.innerText = summary.pue;
    this.dom.netThroughput.innerText = `${summary.totalNetIn} Gbps`;
    this.dom.upsReserve.innerText = `${summary.minBattery}%`;

    // Grid Status
    if (!summary.gridPower) {
      this.dom.gridStatus.innerText = 'GRID OFFLINE (UPS ACTIVE)';
      this.dom.gridStatus.className = 'val crit';
      this.dom.statusPill.className = 'status-pill crit';
      this.dom.statusText.innerText = 'EMERGENCY: BATTERY BACKUP';
    } else if (summary.activeChaosMode === 'ac_failure') {
      this.dom.gridStatus.innerText = 'GRID NORMAL (CRAC FAIL)';
      this.dom.gridStatus.className = 'val warn';
      this.dom.statusPill.className = 'status-pill warn';
      this.dom.statusText.innerText = 'WARNING: THERMAL RUNAWAY';
    } else {
      this.dom.gridStatus.innerText = 'GRID STABLE (230 VAC)';
      this.dom.gridStatus.className = 'val good';
      this.dom.statusPill.className = 'status-pill good';
      this.dom.statusText.innerText = 'ALL SYSTEMS NOMINAL';
    }

    // EmberGrid Bridge status & waste heat
    if (this.dom.wasteHeat) {
      this.dom.wasteHeat.innerText = `${summary.wasteHeatKw || +(summary.totalKw * 16).toFixed(1)} kW`;
    }
    if (this.dom.bridgeStatus) {
      if (summary.activeChaosMode === 'ac_failure' || summary.avgTemp > 35) {
        this.dom.bridgeStatus.innerText = '🚨 THERMAL SURGE';
        this.dom.bridgeStatus.className = 'val crit';
      } else if (!summary.gridPower) {
        this.dom.bridgeStatus.innerText = '⚡ CARNOT SUPPORT REQ';
        this.dom.bridgeStatus.className = 'val warn';
      } else {
        this.dom.bridgeStatus.innerText = '🟢 SYNCED (BROADCASTING)';
        this.dom.bridgeStatus.className = 'val good';
      }
    }

    // Refresh active rack cards values without full DOM rebuild
    this.sim.racks.forEach(rack => {
      const card = this.dom.rackCardsContainer.querySelector(`[data-rack-id="${rack.id}"]`);
      if (card) {
        card.querySelector('.temp-val').innerText = `${rack.temp.toFixed(1)}°C`;
        card.querySelector('.cpu-val').innerText = `${Math.round(rack.cpuLoad)}%`;
        card.querySelector('.fan-val').innerText = `${Math.round(rack.fanRpm)} RPM`;
        card.querySelector('.pwr-val').innerText = `${Math.round(rack.powerWatts)}W`;

        const badge = card.querySelector('.badge');
        badge.innerText = rack.overallHealth;
        badge.className = `badge ${rack.overallHealth.toLowerCase()}`;
      }
    });

    // Refresh Inspector if open
    if (this.dom.inspectorDrawer.classList.contains('open')) {
      const highlight = this.dom.inspectorDrawer.querySelector('.m-val.highlight');
      if (highlight && this.selectedRack) {
        highlight.innerText = `${this.selectedRack.temp.toFixed(1)} °C`;
      }
    }
  }

  updateSparklines(summary) {
    this.history.cpu.push(summary.avgCpu);
    this.history.cpu.shift();

    this.history.temp.push(summary.avgTemp);
    this.history.temp.shift();

    this.history.net.push(summary.totalNetIn);
    this.history.net.shift();

    this.drawSparkline(this.dom.canvasCpu, this.history.cpu, 0, 100, '#00e5ff');
    this.drawSparkline(this.dom.canvasTemp, this.history.temp, 15, 60, '#ff9100');
    this.drawSparkline(this.dom.canvasNet, this.history.net, 0, 50, '#00e676');
  }

  drawSparkline(canvas, data, minVal, maxVal, color) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Subtle background grid line
    ctx.strokeStyle = '#1e2633';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Plot line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = w / (data.length - 1);
    data.forEach((val, i) => {
      const normalized = Math.min(1, Math.max(0, (val - minVal) / (maxVal - minVal)));
      const y = h - (normalized * (h - 4)) - 2;
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = color + '22';
    ctx.fill();
  }

  addSyslogRow(entry) {
    if (!this.dom.syslogContainer) return;
    const row = document.createElement('div');
    row.className = `log-row ${entry.level}`;
    row.innerHTML = `
      <span class="log-time">[${entry.time}]</span>
      <span class="log-cat">${entry.category}:</span>
      <span class="log-msg">${entry.message}</span>
    `;
    this.dom.syslogContainer.prepend(row);

    // Limit to 40 entries
    while (this.dom.syslogContainer.children.length > 40) {
      this.dom.syslogContainer.removeChild(this.dom.syslogContainer.lastChild);
    }
  }
}
