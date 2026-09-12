// DatacenterScene.js - High-performance 3D scene with Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RackBuilder } from './RackBuilder.js';

export class DatacenterScene {
  constructor(canvasContainer, simEngine, onSelectCallback) {
    this.container = canvasContainer;
    this.sim = simEngine;
    this.onSelect = onSelectCallback;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.rackBuilder = null;
    this.rackMeshes = new Map(); // id -> THREE.Group
    this.selectableObjects = [];
    this.hoveredObject = null;

    // Visual Modes
    this.thermalMode = false;
    this.airflowVisible = true;
    this.lightingMode = 'standard'; // 'standard', 'cyber', 'emergency'

    // Camera animation
    this.cameraTargetPos = new THREE.Vector3();
    this.cameraTargetLook = new THREE.Vector3();
    this.isCameraTransitioning = false;

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. SCENE & FOG
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121722);
    this.scene.fog = new THREE.FogExp2(0x121722, 0.008);

    // 2. CAMERA
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 2.2, 4.8);

    // 3. RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // 4. CONTROLS
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going under floor
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 14.0;
    this.controls.target.set(0, 1.1, 0);

    // 5. LIGHTING SETUP
    this.setupLighting();

    // 6. BUILD ROOM ARCHITECTURE
    this.buildRoom();

    // 7. BUILD 4 REALISTIC SERVER STACKS
    this.rackBuilder = new RackBuilder();
    this.buildServerRacks();

    // 8. AIRFLOW PARTICLE SYSTEM
    this.buildAirflowParticles();

    // 9. EVENT LISTENERS
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));

    // Animation Loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    this.lightingGroup = new THREE.Group();
    this.scene.add(this.lightingGroup);

    // High-CRI Ambient light
    this.ambientLight = new THREE.AmbientLight(0xf4f7ff, 1.35);
    this.lightingGroup.add(this.ambientLight);

    // Front Cold-Aisle Directional Maintenance Floodlight (Illuminates server front faceplates)
    this.frontFillLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.frontFillLight.position.set(0, 3.0, 3.8);
    this.frontFillLight.target.position.set(0, 1.1, 0);
    this.lightingGroup.add(this.frontFillLight);
    this.lightingGroup.add(this.frontFillLight.target);

    // Floor & Ceiling Bounce Light (Hemisphere)
    this.groundFillLight = new THREE.HemisphereLight(0xf0f6ff, 0x1c2430, 0.9);
    this.lightingGroup.add(this.groundFillLight);

    // Overhead High-Bay Fluorescent LED Troffer Lights
    this.ceilingLights = [];
    const lightPositions = [
      [-1.5, 3.4, 0.8],
      [1.5, 3.4, 0.8],
      [-1.5, 3.4, -1.0],
      [1.5, 3.4, -1.0]
    ];

    lightPositions.forEach(([x, y, z]) => {
      const pl = new THREE.PointLight(0xf8faff, 2.4, 10.0, 1.2);
      pl.position.set(x, y, z);
      pl.castShadow = true;
      pl.shadow.mapSize.width = 1024;
      pl.shadow.mapSize.height = 1024;
      pl.shadow.bias = -0.001;
      this.lightingGroup.add(pl);
      this.ceilingLights.push(pl);

      // Light fixture mesh
      const fixtureGeo = new THREE.BoxGeometry(0.8, 0.04, 1.4);
      const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(x, y + 0.02, z);
      this.lightingGroup.add(fixture);
    });

    // Emergency Red Strobe Light
    this.emergencyLight = new THREE.PointLight(0xff1122, 0, 10.0, 1.2);
    this.emergencyLight.position.set(0, 3.2, 0);
    this.lightingGroup.add(this.emergencyLight);
  }

  buildRoom() {
    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    // Room Dimensions (8m wide, 7m deep, 3.6m tall)
    const RW = 8.4;
    const RD = 7.0;
    const RH = 3.6;

    // Raised Floor Tiles (600mm anti-static tiles)
    const floorGeo = new THREE.PlaneGeometry(RW, RD, 28, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      roughness: 0.35,
      metalness: 0.45
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Perforated Cold Aisle Floor Grates in front of racks
    const grateGeo = new THREE.PlaneGeometry(RW * 0.7, 0.8);
    const grateMat = new THREE.MeshStandardMaterial({
      color: 0x122438,
      roughness: 0.6,
      metalness: 0.8
    });
    const grate = new THREE.Mesh(grateGeo, grateMat);
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(0, 0.005, 0.9);
    grate.receiveShadow = true;
    this.roomGroup.add(grate);

    // Raised Floor Pedestal Base Line
    const gridHelper = new THREE.GridHelper(RW, 28, 0x303d4e, 0x1e2733);
    gridHelper.position.y = 0.002;
    this.roomGroup.add(gridHelper);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.7,
      metalness: 0.2
    });

    // Back Wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallMat);
    backWall.position.set(0, RH / 2, -RD / 2);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-RW / 2, RH / 2, 0);
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(RW / 2, RH / 2, 0);
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(RW, RD),
      new THREE.MeshStandardMaterial({ color: 0x13161c, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = RH;
    this.roomGroup.add(ceiling);

    // Overhead Yellow & Blue Cable Ladders / Basket Trays
    const trayGeo = new THREE.BoxGeometry(RW * 0.75, 0.06, 0.35);
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x2e3846, metalness: 0.8, roughness: 0.3 });
    const ladder1 = new THREE.Mesh(trayGeo, trayMat);
    ladder1.position.set(0, 2.55, 0.1);
    this.roomGroup.add(ladder1);

    // Yellow Fiber Optic Raceway Tray
    const fiberTray = new THREE.Mesh(
      new THREE.BoxGeometry(RW * 0.75, 0.05, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.4 })
    );
    fiberTray.position.set(0, 2.68, 0.1);
    this.roomGroup.add(fiberTray);

    // Overhead Blinking Fiber Optic LEDs along cable raceway
    this.overheadFiberLeds = [];
    for (let i = 0; i < 20; i++) {
      const fLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      const fx = -2.8 + (i * 0.29);
      fLed.position.set(fx, 2.715, 0.1);
      this.roomGroup.add(fLed);
      this.overheadFiberLeds.push({ mesh: fLed, offset: i * 0.65 });
    }

    // Floor Guide Neon Strip in front of server racks
    const guideStrip = new THREE.Mesh(
      new THREE.BoxGeometry(RW * 0.72, 0.008, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    guideStrip.position.set(0, 0.008, 1.4);
    this.roomGroup.add(guideStrip);

    // Industrial CRAC / HVAC Units on Side Wall
    [-RW / 2 + 0.3, RW / 2 - 0.3].forEach((cx, idx) => {
      const crac = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 2.4, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.6, roughness: 0.4 })
      );
      crac.position.set(cx, 1.2, 0);
      crac.castShadow = true;
      this.roomGroup.add(crac);

      // Louver Grill
      const louver = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x102027, roughness: 0.8 })
      );
      louver.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
      louver.position.set(cx + (idx === 0 ? 0.26 : -0.26), 1.2, 0);
      this.roomGroup.add(louver);
    });

    // Datacenter Emergency Power Off (EPO) Push Button on Back Wall
    const epoPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.22, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.3 })
    );
    epoPlate.position.set(2.4, 1.4, -RD / 2 + 0.02);
    this.roomGroup.add(epoPlate);

    const epoButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.2 })
    );
    epoButton.rotation.x = Math.PI / 2;
    epoButton.position.set(2.4, 1.4, -RD / 2 + 0.04);
    this.roomGroup.add(epoButton);
  }

  buildServerRacks() {
    // 4 server stacks spaced side-by-side facing forward
    // Stack 01 (Alpha), Stack 02 (Beta), Stack 03 (Gamma), Stack 04 (Delta)
    const rackSpacing = 0.95; // 0.62m wide + ~0.33m aisle gap
    const startX = -1.5 * rackSpacing; // centers the 4 racks around x=0

    this.sim.racks.forEach((rackData, index) => {
      const rackGroup = this.rackBuilder.buildRack(rackData);
      const rx = startX + index * rackSpacing;
      rackGroup.position.set(rx, 0, 0);
      this.scene.add(rackGroup);
      this.rackMeshes.set(rackData.id, rackGroup);

      // Collect selectable targets
      this.registerSelectables(rackGroup, rackData);

      // Cable bundle dropping from overhead tray into top of rack
      const dropCurve = new THREE.LineCurve3(
        new THREE.Vector3(rx, 2.55, 0.1),
        new THREE.Vector3(rx, 2.1, 0.1)
      );
      const dropMesh = new THREE.Mesh(
        new THREE.TubeGeometry(dropCurve, 8, 0.025, 8, false),
        new THREE.MeshStandardMaterial({ color: 0x0277bd })
      );
      this.roomGroup.add(dropMesh);
    });
  }

  registerSelectables(group, rackData) {
    group.traverse(child => {
      if (child.isMesh && (child.userData.componentName || child.userData.isDoor)) {
        this.selectableObjects.push(child);
      }
    });
  }

  buildAirflowParticles() {
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const coldColor = new THREE.Color(0x00e5ff);
    const hotColor = new THREE.Color(0xff3d00);

    for (let i = 0; i < particleCount; i++) {
      const isCold = i < particleCount * 0.6;
      const pColor = isCold ? coldColor : hotColor;

      // Cold air in front of racks (Z: 0.6 to 1.4), Hot air in rear (Z: -0.6 to -1.2)
      const x = (Math.random() - 0.5) * 4.2;
      const y = Math.random() * 2.5;
      const z = isCold ? 0.6 + Math.random() * 0.8 : -0.6 - Math.random() * 0.8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = isCold ? 0.08 + Math.random() * 0.12 : 0.12 + Math.random() * 0.15; // rising
      velocities[i * 3 + 2] = isCold ? -0.05 - Math.random() * 0.05 : -0.02 - Math.random() * 0.05; // suction into rack

      colors[i * 3] = pColor.r;
      colors[i * 3 + 1] = pColor.g;
      colors[i * 3 + 2] = pColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    this.airflowPoints = new THREE.Points(geometry, material);
    this.airflowVelocities = velocities;
    this.scene.add(this.airflowPoints);
  }

  updateAirflowParticles(dt) {
    if (!this.airflowVisible || !this.airflowPoints) {
      if (this.airflowPoints) this.airflowPoints.visible = false;
      return;
    }
    this.airflowPoints.visible = true;

    const positions = this.airflowPoints.geometry.attributes.position.array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] += this.airflowVelocities[idx] * dt * 10;
      positions[idx + 1] += this.airflowVelocities[idx + 1] * dt * 10;
      positions[idx + 2] += this.airflowVelocities[idx + 2] * dt * 10;

      // Reset when reaching ceiling
      if (positions[idx + 1] > 2.8) {
        positions[idx + 1] = 0.05;
        const isCold = i < count * 0.6;
        positions[idx + 2] = isCold ? 0.7 + Math.random() * 0.7 : -0.6 - Math.random() * 0.7;
      }
    }
    this.airflowPoints.geometry.attributes.position.needsUpdate = true;
  }

  setLightingMode(mode) {
    this.lightingMode = mode;
    switch (mode) {
      case 'cyber':
        this.ambientLight.intensity = 0.55;
        if (this.frontFillLight) this.frontFillLight.intensity = 1.1;
        if (this.groundFillLight) this.groundFillLight.intensity = 0.45;
        this.ceilingLights.forEach(l => {
          l.color.setHex(0x00e5ff);
          l.intensity = 1.4;
        });
        this.emergencyLight.intensity = 0;
        break;
      case 'emergency':
        this.ambientLight.intensity = 0.2;
        if (this.frontFillLight) this.frontFillLight.intensity = 0.35;
        if (this.groundFillLight) this.groundFillLight.intensity = 0.2;
        this.ceilingLights.forEach(l => {
          l.intensity = 0.1;
        });
        this.emergencyLight.intensity = 2.8;
        break;
      case 'standard':
      default:
        this.ambientLight.intensity = 1.35;
        if (this.frontFillLight) this.frontFillLight.intensity = 2.2;
        if (this.groundFillLight) this.groundFillLight.intensity = 0.9;
        this.ceilingLights.forEach(l => {
          l.color.setHex(0xf8faff);
          l.intensity = 2.4;
        });
        this.emergencyLight.intensity = 0;
        break;
    }
  }

  setThermalHeatmap(enabled) {
    this.thermalMode = enabled;
    // When enabled, modify component materials or tint
    this.rackMeshes.forEach((rackGroup, rackId) => {
      const rackData = this.sim.racks.find(r => r.id === rackId);
      if (!rackData) return;

      const normalizedTemp = Math.min(1, Math.max(0, (rackData.temp - 18) / 50));
      const thermalColor = new THREE.Color();
      if (normalizedTemp < 0.25) {
        thermalColor.setRGB(0, normalizedTemp * 4, 1); // Blue to Cyan
      } else if (normalizedTemp < 0.5) {
        thermalColor.setRGB(0, 1, 1 - (normalizedTemp - 0.25) * 4); // Cyan to Green
      } else if (normalizedTemp < 0.75) {
        thermalColor.setRGB((normalizedTemp - 0.5) * 4, 1, 0); // Green to Yellow
      } else {
        thermalColor.setRGB(1, 1 - (normalizedTemp - 0.75) * 4, 0); // Yellow to Red
      }

      rackGroup.traverse(child => {
        if (child.isMesh && child.material) {
          if (enabled) {
            if (!child.userData.origMat) child.userData.origMat = child.material;
            child.material = new THREE.MeshBasicMaterial({
              color: thermalColor,
              wireframe: child.userData.isDoor ? true : false
            });
          } else if (child.userData.origMat) {
            child.material = child.userData.origMat;
          }
        }
      });
    });
  }

  // Camera Presets
  setCameraPreset(preset) {
    const rackSpacing = 0.95;
    const startX = -1.5 * rackSpacing;

    switch (preset) {
      case 'overview':
        this.tweenCamera(new THREE.Vector3(0, 2.2, 4.8), new THREE.Vector3(0, 1.1, 0));
        break;
      case 'walk_in':
        this.tweenCamera(new THREE.Vector3(0, 1.6, 2.2), new THREE.Vector3(0, 1.4, 0));
        break;
      case 'rack_01': {
        const rx = startX + 0 * rackSpacing;
        this.tweenCamera(new THREE.Vector3(rx, 1.4, 1.5), new THREE.Vector3(rx, 1.2, 0));
        break;
      }
      case 'rack_02': {
        const rx = startX + 1 * rackSpacing;
        this.tweenCamera(new THREE.Vector3(rx, 1.4, 1.5), new THREE.Vector3(rx, 1.2, 0));
        break;
      }
      case 'rack_03': {
        const rx = startX + 2 * rackSpacing;
        this.tweenCamera(new THREE.Vector3(rx, 1.4, 1.5), new THREE.Vector3(rx, 1.2, 0));
        break;
      }
      case 'rack_04': {
        const rx = startX + 3 * rackSpacing;
        this.tweenCamera(new THREE.Vector3(rx, 1.4, 1.5), new THREE.Vector3(rx, 1.2, 0));
        break;
      }
      case 'top_down':
        this.tweenCamera(new THREE.Vector3(0, 5.5, 0.1), new THREE.Vector3(0, 0, 0));
        break;
      case 'security_cctv':
        this.tweenCamera(new THREE.Vector3(-3.6, 3.2, 3.0), new THREE.Vector3(0, 1.0, 0));
        break;
    }
  }

  tweenCamera(pos, lookTarget) {
    this.cameraTargetPos.copy(pos);
    this.cameraTargetLook.copy(lookTarget);
    this.isCameraTransitioning = true;
  }

  onPointerMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, true);

    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer';
      this.hoveredObject = intersects[0].object;
    } else {
      document.body.style.cursor = 'default';
      this.hoveredObject = null;
    }
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, true);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const data = clickedMesh.userData;

      if (data.isDoor) {
        // Toggle front mesh door swing
        this.sim.toggleDoor(data.rackId);
      } else if (data.componentName) {
        if (this.onSelect) {
          this.onSelect({
            rackId: data.rackId,
            type: data.type,
            name: data.componentName
          });
        }
      }
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Camera Lerp
    if (this.isCameraTransitioning) {
      this.camera.position.lerp(this.cameraTargetPos, dt * 4.5);
      this.controls.target.lerp(this.cameraTargetLook, dt * 4.5);

      if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.05) {
        this.isCameraTransitioning = false;
      }
    }

    this.controls.update();

    // Emergency Strobe Flash
    if (this.lightingMode === 'emergency') {
      this.emergencyLight.intensity = Math.sin(performance.now() * 0.012) > 0 ? 3.0 : 0.2;
    }

    // Update 3D Racks
    this.rackMeshes.forEach((rackGroup, id) => {
      const rackData = this.sim.racks.find(r => r.id === id);
      if (rackData) {
        this.rackBuilder.updateRack(rackGroup, rackData, dt);
      }
    });

    // Update Airflow Particles
    this.updateAirflowParticles(dt);

    // Update Overhead Blinking Fiber LEDs
    if (this.overheadFiberLeds && this.overheadFiberLeds.length > 0) {
      const nowSec = performance.now() * 0.001;
      this.overheadFiberLeds.forEach(item => {
        const isLit = Math.sin(nowSec * 16 + item.offset) > 0.1;
        item.mesh.material.color.setHex(isLit ? 0x00e5ff : 0x002b3d);
      });
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}
