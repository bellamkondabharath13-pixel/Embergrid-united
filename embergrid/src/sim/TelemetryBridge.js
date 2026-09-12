// TelemetryBridge.js - Multi-protocol bridge connecting EmberGrid AI to Server Room Simulator

export class TelemetryBridge {
  constructor(engine) {
    this.engine = engine;
    this.channel = null;
    this.listeners = [];
    this.connectionListeners = [];
    this.isConnected = false;
    this.lastPacketTime = 0;
    this.pollInterval = null;

    this.initProtocols();
  }

  initProtocols() {
    // 1. BroadcastChannel (Same origin / tabs)
    try {
      this.channel = new BroadcastChannel('embergrid-datacenter-bridge');
      this.channel.onmessage = (e) => this.handlePacket(e.data);
    } catch (err) {
      console.warn('BroadcastChannel not supported:', err);
    }

    // 2. Window postMessage (Cross-origin iframes, parent, popup opener)
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'DATACENTER_TELEMETRY') {
        this.handlePacket(e.data);
      }
    });

    // 3. Fallback polling from localStorage & pinging parent/opener
    this.pollInterval = setInterval(() => {
      this.pingSources();
      this.checkLocalStorage();
      this.checkHeartbeat();
    }, 1000);

    // Initial broadcast to request telemetry
    this.requestTelemetry();
  }

  handlePacket(packet) {
    if (!packet || packet.type !== 'DATACENTER_TELEMETRY' || !packet.payload) return;

    // Deduplicate identical packets arriving via multiple channels
    const payload = packet.payload;
    if (this.lastPayloadTimestamp && payload.timestamp && payload.timestamp === this.lastPayloadTimestamp) {
      return;
    }
    this.lastPayloadTimestamp = payload.timestamp;
    this.lastPacketTime = Date.now();

    if (!this.isConnected) {
      this.isConnected = true;
      this.notifyConnectionChange(true);
    }

    // Feed telemetry to engine
    this.engine.setLiveTelemetry(payload);
    this.notifyTelemetry(payload);
  }

  pingSources() {
    const pingMsg = { type: 'EMBERGRID_REQUEST_TELEMETRY', timestamp: Date.now() };

    if (this.channel) {
      try { this.channel.postMessage(pingMsg); } catch (e) {}
    }
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage(pingMsg, '*'); } catch (e) {}
    }
    if (window.opener) {
      try { window.opener.postMessage(pingMsg, '*'); } catch (e) {}
    }
  }

  checkLocalStorage() {
    try {
      const raw = localStorage.getItem('dc_telemetry_latest');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.payload && parsed.payload.timestamp) {
          if (Date.now() - parsed.payload.timestamp < 3000) {
            this.handlePacket(parsed);
          }
        }
      }
    } catch (e) {}
  }

  checkHeartbeat() {
    if (this.isConnected && Date.now() - this.lastPacketTime > 4000) {
      this.isConnected = false;
      this.notifyConnectionChange(false);
    }
  }

  requestTelemetry() {
    this.pingSources();
  }

  triggerRemoteChaos(mode) {
    const msg = {
      type: 'EMBERGRID_TRIGGER_CHAOS',
      mode,
      source: 'embergrid-ai',
      timestamp: Date.now()
    };

    if (this.channel) {
      try { this.channel.postMessage(msg); } catch (e) {}
    }
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage(msg, '*'); } catch (e) {}
    }
    if (window.opener) {
      try { window.opener.postMessage(msg, '*'); } catch (e) {}
    }
  }

  sendHeatExtractedNotification(coolingKw) {
    const msg = {
      type: 'EMBERGRID_HEAT_REMOVED',
      coolingKw,
      timestamp: Date.now()
    };
    if (this.channel) {
      try { this.channel.postMessage(msg); } catch (e) {}
    }
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage(msg, '*'); } catch (e) {}
    }
  }

  onTelemetry(listener) {
    this.listeners.push(listener);
  }

  onConnectionChange(listener) {
    this.connectionListeners.push(listener);
    listener(this.isConnected);
  }

  notifyTelemetry(data) {
    this.listeners.forEach(fn => fn(data));
  }

  notifyConnectionChange(status) {
    this.connectionListeners.forEach(fn => fn(status));
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.channel) {
      try { this.channel.close(); } catch (e) {}
    }
  }
}
