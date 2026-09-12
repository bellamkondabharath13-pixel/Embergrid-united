// SoundManager.js - Procedural Web Audio API sound generator for authentic datacenter acoustics

export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.isMuted = true;
    this.ambientGain = null;
    this.fanWhineOsc = null;
    this.fanWhineGain = null;
    this.alertOsc = null;
    this.alertGain = null;
    this.isInitialized = false;
  }

  initAudio() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // 1. Procedural Datacenter Room Rumble (Pink/Brown noise through Lowpass)
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Lowpass filter for deep airflow rumble
      this.rumbleFilter = this.audioCtx.createBiquadFilter();
      this.rumbleFilter.type = 'lowpass';
      this.rumbleFilter.frequency.setValueAtTime(220, this.audioCtx.currentTime);

      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);

      whiteNoise.connect(this.rumbleFilter);
      this.rumbleFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      whiteNoise.start();

      // 2. High-speed Server Fan Whine (Oscillator with bandpass)
      this.fanWhineOsc = this.audioCtx.createOscillator();
      this.fanWhineOsc.type = 'triangle';
      this.fanWhineOsc.frequency.setValueAtTime(320, this.audioCtx.currentTime);

      this.fanBandpass = this.audioCtx.createBiquadFilter();
      this.fanBandpass.type = 'bandpass';
      this.fanBandpass.frequency.setValueAtTime(320, this.audioCtx.currentTime);
      this.fanBandpass.Q.setValueAtTime(5, this.audioCtx.currentTime);

      this.fanWhineGain = this.audioCtx.createGain();
      this.fanWhineGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.fanWhineOsc.connect(this.fanBandpass);
      this.fanBandpass.connect(this.fanWhineGain);
      this.fanWhineGain.connect(this.masterGain);
      this.fanWhineOsc.start();

      // 3. Alert Beeper (intermittent square wave)
      this.alertOsc = this.audioCtx.createOscillator();
      this.alertOsc.type = 'square';
      this.alertOsc.frequency.setValueAtTime(880, this.audioCtx.currentTime);

      this.alertGain = this.audioCtx.createGain();
      this.alertGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

      this.alertOsc.connect(this.alertGain);
      this.alertGain.connect(this.masterGain);
      this.alertOsc.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (!this.isInitialized && !this.isMuted) {
      this.initAudio();
    }
    if (this.audioCtx && this.masterGain) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.6, this.audioCtx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  updateTelemetry(avgFanRpm, hasCriticalAlert, isBlackout) {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.audioCtx.currentTime;

    // Map 3500 RPM -> 14000 RPM to fan whine frequency 240Hz -> 850Hz
    const normalizedRpm = Math.min(1, Math.max(0, (avgFanRpm - 3500) / 10500));
    const targetFreq = 240 + normalizedRpm * 610;
    const targetGain = 0.05 + normalizedRpm * 0.22;

    this.fanWhineOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);
    this.fanBandpass.frequency.setTargetAtTime(targetFreq, now, 0.2);
    this.fanWhineGain.gain.setTargetAtTime(targetGain, now, 0.2);

    // Rumble filter shifts up slightly with fan pressure
    this.rumbleFilter.frequency.setTargetAtTime(200 + normalizedRpm * 250, now, 0.2);

    // Handle alert siren
    if (hasCriticalAlert || isBlackout) {
      const pulse = Math.sin(performance.now() * 0.008) > 0 ? 0.15 : 0.0;
      this.alertGain.gain.setTargetAtTime(pulse, now, 0.05);
      this.alertOsc.frequency.setValueAtTime(isBlackout ? 660 : 920, now);
    } else {
      this.alertGain.gain.setTargetAtTime(0.0, now, 0.05);
    }
  }

  playClick() {
    if (!this.isInitialized || this.isMuted) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch (_) {}
  }
}
