// main.js - Entry point initializing 3D datacenter simulation
import { SimulationEngine } from './sim/SimulationEngine.js';
import { SoundManager } from './audio/SoundManager.js';
import { DatacenterScene } from './scene/DatacenterScene.js';
import { UIManager } from './ui/UIManager.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Simulation Physics Engine
  const sim = new SimulationEngine();

  // 2. Initialize Procedural Sound Synthesizer
  const sound = new SoundManager();

  // 3. Initialize 3D Three.js Datacenter Scene
  const canvasContainer = document.getElementById('webgl-canvas-container');
  let ui = null;

  const scene = new DatacenterScene(canvasContainer, sim, (selectedComp) => {
    // When a 3D component or rack is clicked in the viewport
    if (ui) {
      ui.selectComponent(selectedComp);
      sound.playClick();
    }
  });

  // 4. Initialize HUD and UI Manager
  ui = new UIManager(sim, sound, scene);

  // 5. Physics & Telemetry Tick Loop (Runs at 10 Hz)
  let lastTime = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    sim.update(dt);
  }, 100);

  // Focus default rack 1 inspection on load
  ui.selectRack(sim.racks[0]);

  console.log('🚀 Datacenter Live Simulation initialized successfully with 4 server stacks.');
});
