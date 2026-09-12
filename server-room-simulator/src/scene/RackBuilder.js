// RackBuilder.js - Procedural 3D high-fidelity model generator for realistic 42U server stacks
import * as THREE from 'three';

export class RackBuilder {
  constructor() {
    this.createSharedMaterials();
  }

  createSharedMaterials() {
    // Shared materials for performance
    this.materials = {
      rackFrame: new THREE.MeshStandardMaterial({
        color: 0x181a1f,
        roughness: 0.5,
        metalness: 0.8
      }),
      rackRail: new THREE.MeshStandardMaterial({
        color: 0x7c889b,
        roughness: 0.25,
        metalness: 0.9
      }),
      serverBezelDark: new THREE.MeshStandardMaterial({
        color: 0x343c48,
        roughness: 0.45,
        metalness: 0.45
      }),
      serverBezelLight: new THREE.MeshStandardMaterial({
        color: 0x546173,
        roughness: 0.35,
        metalness: 0.6
      }),
      metalGrill: new THREE.MeshStandardMaterial({
        color: 0x1d222a,
        roughness: 0.6,
        metalness: 0.5,
        wireframe: false
      }),
      glassDoor: new THREE.MeshPhysicalMaterial({
        color: 0x0a1018,
        metalness: 0.1,
        roughness: 0.15,
        transmission: 0.75,
        transparent: true,
        opacity: 0.5,
        reflectivity: 0.6
      }),
      meshDoorPerforated: new THREE.MeshStandardMaterial({
        color: 0x2b3340,
        metalness: 0.6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.32
      }),
      cableBlue: new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5 }),
      cableYellow: new THREE.MeshStandardMaterial({ color: 0xffd600, roughness: 0.5 }),
      cableOrange: new THREE.MeshStandardMaterial({ color: 0xff6d00, roughness: 0.5 }),
      cableCyan: new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.5 }),
      ledGreen: new THREE.MeshBasicMaterial({ color: 0x00e676 }),
      ledAmber: new THREE.MeshBasicMaterial({ color: 0xffab00 }),
      ledRed: new THREE.MeshBasicMaterial({ color: 0xff1744 }),
      ledBlue: new THREE.MeshBasicMaterial({ color: 0x00b0ff }),
      ledWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      ledDim: new THREE.MeshBasicMaterial({ color: 0x0d1a10 }),
      beaconGreen: new THREE.MeshBasicMaterial({ color: 0x00e676 }),
      beaconAmber: new THREE.MeshBasicMaterial({ color: 0xffab00 }),
      beaconRed: new THREE.MeshBasicMaterial({ color: 0xff1744 }),
      beaconDim: new THREE.MeshBasicMaterial({ color: 0x22262a }),
      railGlowStrip: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
      baseGlowMat: new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    };
  }

  buildRack(rackData) {
    const rackGroup = new THREE.Group();
    rackGroup.name = rackData.id;
    rackGroup.userData = { rackData, type: 'rack' };

    // Standard Rack Dimensions in meters: 42U ~= 2.0m tall, 0.6m wide, 1.0m deep
    const W = 0.62;
    const H = 2.08;
    const D = 1.0;
    const railInset = 0.06;
    const frontZ = D / 2;

    // Track dynamic components for animation / telemetry updates
    const dynamicNodes = {
      doorHinge: null,
      topFans: [],
      switchLeds: [],
      driveLeds: [],
      upsScreenCanvas: null,
      upsScreenTexture: null,
      tempScreenCanvas: null,
      tempScreenTexture: null,
      kvmScreenCanvas: null,
      kvmScreenTexture: null,
      statusLeds: [],
      interiorLight: null,
      internalHeartbeatLeds: [],
      beaconGreen: null,
      beaconAmber: null,
      beaconRed: null,
      railStrips: [],
      baseGlow: null
    };

    // 1. OUTER STEEL CABINET FRAME (Structure & Security)
    const frameGroup = new THREE.Group();

    // Corner Posts (4 vertical posts)
    const postGeo = new THREE.BoxGeometry(0.04, H, 0.04);
    const postOffsets = [
      [-W/2 + 0.02, H/2, -D/2 + 0.02],
      [W/2 - 0.02, H/2, -D/2 + 0.02],
      [-W/2 + 0.02, H/2, D/2 - 0.02],
      [W/2 - 0.02, H/2, D/2 - 0.02]
    ];
    postOffsets.forEach(pos => {
      const post = new THREE.Mesh(postGeo, this.materials.rackFrame);
      post.position.set(...pos);
      post.castShadow = true;
      post.receiveShadow = true;
      frameGroup.add(post);
    });

    // Top & Bottom Horizontal Beams
    const beamXGeo = new THREE.BoxGeometry(W - 0.04, 0.04, 0.04);
    const beamZGeo = new THREE.BoxGeometry(0.04, 0.04, D - 0.04);
    [0.02, H - 0.02].forEach(y => {
      // Front and Back beams
      [-D/2 + 0.02, D/2 - 0.02].forEach(z => {
        const b = new THREE.Mesh(beamXGeo, this.materials.rackFrame);
        b.position.set(0, y, z);
        frameGroup.add(b);
      });
      // Side beams
      [-W/2 + 0.02, W/2 - 0.02].forEach(x => {
        const b = new THREE.Mesh(beamZGeo, this.materials.rackFrame);
        b.position.set(x, y, 0);
        frameGroup.add(b);
      });
    });

    // Side Panels (Perforated/ribbed metal panels on left & right)
    const sidePanelGeo = new THREE.BoxGeometry(0.015, H - 0.1, D - 0.08);
    [-W/2 + 0.008, W/2 - 0.008].forEach(x => {
      const side = new THREE.Mesh(sidePanelGeo, this.materials.rackFrame);
      side.position.set(x, H/2, 0);
      side.castShadow = true;
      frameGroup.add(side);
    });

    // Top Roof Panel with Fan Cutouts
    const roofGeo = new THREE.BoxGeometry(W - 0.04, 0.02, D - 0.04);
    const roof = new THREE.Mesh(roofGeo, this.materials.rackFrame);
    roof.position.set(0, H - 0.01, 0);
    frameGroup.add(roof);

    // Heavy-Duty Leveling Feet & Casters
    const footGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, metalness: 0.9, roughness: 0.2 });
    [[-W/2 + 0.04, -D/2 + 0.06], [W/2 - 0.04, -D/2 + 0.06], [-W/2 + 0.04, D/2 - 0.06], [W/2 - 0.04, D/2 - 0.06]].forEach(([x, z]) => {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(x, 0.02, z);
      frameGroup.add(foot);
    });

    rackGroup.add(frameGroup);

    // 2. 19-INCH VERTICAL EIA MOUNTING RAILS (Rails & Shelves)
    const railGeo = new THREE.BoxGeometry(0.025, H - 0.16, 0.03);
    const railX = 0.245; // 19" inside width
    [[-railX, frontZ - railInset], [railX, frontZ - railInset], [-railX, -frontZ + railInset], [railX, -frontZ + railInset]].forEach(([rx, rz]) => {
      const rail = new THREE.Mesh(railGeo, this.materials.rackRail);
      rail.position.set(rx, H/2, rz);
      rackGroup.add(rail);
    });

    // 2B. INTERIOR LIGHTING & BLINKING ACCENTS
    // Dual High-Intensity Interior PointLights illuminating top and bottom components from within
    const rackThemeColor = new THREE.Color(rackData.meta.primaryColor);
    
    const upperLight = new THREE.PointLight(0xffffff, 2.0, 3.2, 1.2);
    upperLight.position.set(0, H * 0.72, frontZ - 0.22);
    rackGroup.add(upperLight);
    dynamicNodes.interiorLightUpper = upperLight;

    const lowerLight = new THREE.PointLight(rackThemeColor, 1.8, 3.0, 1.2);
    lowerLight.position.set(0, H * 0.28, frontZ - 0.22);
    rackGroup.add(lowerLight);
    dynamicNodes.interiorLightLower = lowerLight;

    // Vertical Interior Rail LED Strips (left and right inner rails)
    const stripGeo = new THREE.BoxGeometry(0.006, H - 0.22, 0.006);
    const stripMat = new THREE.MeshBasicMaterial({ color: rackThemeColor });
    [-railX + 0.012, railX - 0.012].forEach(sx => {
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(sx, H / 2, frontZ - railInset + 0.005);
      rackGroup.add(strip);
      dynamicNodes.railStrips.push(strip);
    });

    // Under-Rack Perimeter Floor Neon Glow
    const baseGlowGeo = new THREE.PlaneGeometry(W + 0.16, D + 0.16);
    const baseGlowMat = new THREE.MeshBasicMaterial({
      color: rackThemeColor,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const baseGlow = new THREE.Mesh(baseGlowGeo, baseGlowMat);
    baseGlow.rotation.x = -Math.PI / 2;
    baseGlow.position.set(0, 0.006, 0);
    rackGroup.add(baseGlow);
    dynamicNodes.baseGlow = baseGlow;

    // Top Status Beacon Tower (Andon Light mounted on top of the rack)
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(W / 2 - 0.09, H + 0.01, frontZ - 0.09);

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.07, 12),
      this.materials.rackFrame
    );
    pole.position.y = 0.035;
    beaconGroup.add(pole);

    // 3 Tiers: Green (bottom), Amber (middle), Red (top)
    const tierGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.02, 16);

    const beaconGreen = new THREE.Mesh(tierGeo, this.materials.beaconGreen);
    beaconGreen.position.y = 0.08;
    beaconGroup.add(beaconGreen);
    dynamicNodes.beaconGreen = beaconGreen;

    const beaconAmber = new THREE.Mesh(tierGeo, this.materials.beaconDim);
    beaconAmber.position.y = 0.104;
    beaconGroup.add(beaconAmber);
    dynamicNodes.beaconAmber = beaconAmber;

    const beaconRed = new THREE.Mesh(tierGeo, this.materials.beaconDim);
    beaconRed.position.y = 0.128;
    beaconGroup.add(beaconRed);
    dynamicNodes.beaconRed = beaconRed;

    rackGroup.add(beaconGroup);

    // 3. INTERNAL STACKED MODULES (Matching reference image: "INSIDE A SERVER RACK")
    const uHeight = (H - 0.24) / 42; // ~0.0438m per 1U
    const baseY = 0.12;

    const getUpos = (uStart, uCount) => {
      const centerU = uStart + (uCount / 2);
      return baseY + centerU * uHeight;
    };

    // --- MODULE A: Top Unit (41U-42U) - Cooling Systems & Environmental Monitoring Tools ---
    {
      const uY = getUpos(40, 2);
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 1.9, 0.6),
        this.materials.serverBezelDark
      );
      chassis.position.set(0, uY, frontZ - 0.35);
      rackGroup.add(chassis);

      // Top Exhaust Fans with animated blades
      const fanGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 16);
      const fanMat = new THREE.MeshStandardMaterial({ color: 0x29b6f6, roughness: 0.3 });
      [-0.14, 0.14].forEach(fx => {
        const fan = new THREE.Mesh(fanGeo, fanMat);
        fan.rotation.x = Math.PI / 2;
        fan.position.set(fx, uY + 0.01, frontZ - railInset + 0.005);
        chassis.add(fan);
        dynamicNodes.topFans.push(fan);
      });

      // Digital Rack Environmental Display (intake/exhaust temp canvas texture)
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      dynamicNodes.tempScreenCanvas = canvas;
      dynamicNodes.tempScreenTexture = texture;

      const screenMat = new THREE.MeshBasicMaterial({ map: texture });
      const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), screenMat);
      screenMesh.position.set(0, uY, frontZ - railInset + 0.008);
      screenMesh.userData = { componentName: 'Rack Environmental Monitor', type: 'cooling_monitor', rackId: rackData.id };
      rackGroup.add(screenMesh);
    }

    // --- MODULE B: KVM Switches, Consoles & Remote Access (38U-39U) ---
    {
      const uY = getUpos(38, 1.8);
      const kvmBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 1.7, 0.6),
        this.materials.serverBezelLight
      );
      kvmBody.position.set(0, uY, frontZ - 0.35);
      rackGroup.add(kvmBody);

      // Fold-out KVM Display screen
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#06101e';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`KVM: ${rackData.name}`, 15, 30);
      ctx.font = '13px monospace';
      ctx.fillStyle = '#81d4fa';
      ctx.fillText(`PORT 01: [NODE-PRIMARY]`, 15, 60);
      ctx.fillText(`STATUS: ACTIVE (24h 12m)`, 15, 85);
      ctx.fillStyle = '#00e676';
      ctx.fillText(`SSH/IPMI: ONLINE`, 15, 110);

      const kvmTexture = new THREE.CanvasTexture(canvas);
      dynamicNodes.kvmScreenCanvas = canvas;
      dynamicNodes.kvmScreenTexture = kvmTexture;

      const kvmScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.055),
        new THREE.MeshBasicMaterial({ map: kvmTexture })
      );
      kvmScreen.position.set(-0.1, uY, frontZ - railInset + 0.008);
      kvmScreen.userData = { componentName: 'Slide-out KVM Console', type: 'kvm_console', rackId: rackData.id };
      rackGroup.add(kvmScreen);

      // Keyboard & Trackpad tray texture mockup
      const kbMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.8 })
      );
      kbMesh.position.set(0.12, uY, frontZ - railInset + 0.008);
      rackGroup.add(kbMesh);
    }

    // --- MODULE C: Patch Panels & Cable Management (36U-37U) ---
    {
      const uY = getUpos(36, 1.8);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 1.7, 0.15),
        this.materials.serverBezelDark
      );
      panel.position.set(0, uY, frontZ - railInset - 0.07);
      panel.userData = { componentName: 'Patch Panel 24-Port Cat6A', type: 'patch_panel', rackId: rackData.id };
      rackGroup.add(panel);

      // 24 RJ45 Jack cutouts
      const jackGeo = new THREE.BoxGeometry(0.012, 0.012, 0.005);
      const jackMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0f });
      for (let i = 0; i < 20; i++) {
        const jx = -0.19 + (i * 0.02);
        const jack = new THREE.Mesh(jackGeo, jackMat);
        jack.position.set(jx, uY + 0.01, frontZ - railInset + 0.006);
        rackGroup.add(jack);
      }

      // 3D Curved Colored Patch Cables cascading down into the switch below
      const cableColors = [
        this.materials.cableBlue,
        this.materials.cableBlue,
        this.materials.cableYellow,
        this.materials.cableYellow,
        this.materials.cableOrange,
        this.materials.cableCyan,
        this.materials.cableBlue,
        this.materials.cableCyan
      ];

      cableColors.forEach((mat, idx) => {
        const startX = -0.16 + (idx * 0.045);
        const endX = startX + (Math.random() * 0.02 - 0.01);
        const startY = uY;
        const endY = uY - uHeight * 2.2; // connects to switch below

        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(startX, startY, frontZ - railInset + 0.008),
          new THREE.Vector3(startX, startY - 0.04, frontZ - railInset + 0.045),
          new THREE.Vector3(endX, endY + 0.04, frontZ - railInset + 0.045),
          new THREE.Vector3(endX, endY, frontZ - railInset + 0.008)
        );

        const cableGeo = new THREE.TubeGeometry(curve, 16, 0.004, 8, false);
        const cableMesh = new THREE.Mesh(cableGeo, mat);
        rackGroup.add(cableMesh);
      });
    }

    // --- MODULE D: Networking Equipment - Top of Rack 48-Port Switch (34U-35U) ---
    {
      const uY = getUpos(34, 1.8);
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 1.7, 0.45),
        this.materials.serverBezelLight
      );
      sw.position.set(0, uY, frontZ - 0.28);
      sw.userData = { componentName: 'Enterprise 48-Port Top-of-Rack Switch', type: 'network_switch', rackId: rackData.id };
      rackGroup.add(sw);

      // Port Banks & Dynamic Blinking Link LEDs
      const ledGeo = new THREE.BoxGeometry(0.004, 0.004, 0.002);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 16; c++) {
          const lx = -0.18 + (c * 0.022);
          const ly = uY - 0.012 + (r * 0.02);
          const led = new THREE.Mesh(ledGeo, this.materials.ledGreen);
          led.position.set(lx, ly, frontZ - railInset + 0.008);
          rackGroup.add(led);
          dynamicNodes.switchLeds.push(led);
        }
      }

      // SFP+ 100G Fiber Uplinks on right side
      const sfpGeo = new THREE.BoxGeometry(0.015, 0.015, 0.008);
      const sfpMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.9 });
      for (let s = 0; s < 4; s++) {
        const sfp = new THREE.Mesh(sfpGeo, sfpMat);
        sfp.position.set(0.14 + (s * 0.022), uY, frontZ - railInset + 0.008);
        rackGroup.add(sfp);
      }
    }

    // --- MODULE E: Enterprise Compute Servers (28U-33U) ---
    // Server 1 (2U Dell/HP style server)
    {
      const uY = getUpos(30, 3.5);
      const srv = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 3.3, 0.75),
        this.materials.serverBezelDark
      );
      srv.position.set(0, uY, frontZ - 0.42);
      srv.userData = { componentName: '2U Enterprise Compute Node 01', type: 'server_node_1', rackId: rackData.id };
      rackGroup.add(srv);

      // Hot-swap Drive Bays & Status LEDs
      const bayGeo = new THREE.BoxGeometry(0.038, 0.022, 0.006);
      const bayMat = new THREE.MeshStandardMaterial({ color: 0x2c323c, roughness: 0.4 });
      const driveLedGeo = new THREE.BoxGeometry(0.003, 0.003, 0.002);

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 6; col++) {
          const bx = -0.18 + (col * 0.045);
          const by = uY - 0.02 + (row * 0.035);
          const bay = new THREE.Mesh(bayGeo, bayMat);
          bay.position.set(bx, by, frontZ - railInset + 0.007);
          rackGroup.add(bay);

          const dLed = new THREE.Mesh(driveLedGeo, this.materials.ledGreen);
          dLed.position.set(bx + 0.012, by, frontZ - railInset + 0.011);
          rackGroup.add(dLed);
          dynamicNodes.driveLeds.push(dLed);
        }
      }

      // Internal Motherboard Heartbeat LEDs (blinking inside 2U server chassis)
      for (let k = 0; k < 6; k++) {
        const hLed = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.004), this.materials.ledGreen);
        hLed.position.set(-0.14 + k * 0.055, uY - 0.01, frontZ - 0.22);
        rackGroup.add(hLed);
        dynamicNodes.internalHeartbeatLeds.push({ mesh: hLed, offset: k * 0.7, type: 'green' });
      }

      // Server Power Button & Diagnostic LED bar
      const pwrButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.004, 16),
        this.materials.ledBlue
      );
      pwrButton.rotation.x = Math.PI / 2;
      pwrButton.position.set(0.18, uY + 0.02, frontZ - railInset + 0.008);
      rackGroup.add(pwrButton);
    }

    // Server 2 (1U Enterprise Compute Server)
    {
      const uY = getUpos(27, 1.8);
      const srv2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 1.7, 0.75),
        this.materials.serverBezelDark
      );
      srv2.position.set(0, uY, frontZ - 0.42);
      srv2.userData = { componentName: '1U High-Density Compute Node 02', type: 'server_node_2', rackId: rackData.id };
      rackGroup.add(srv2);

      // 4 front 3.5" drive caddies
      const bayGeo = new THREE.BoxGeometry(0.065, 0.028, 0.006);
      const bayMat = new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.5 });
      for (let b = 0; b < 4; b++) {
        const bx = -0.15 + (b * 0.075);
        const bay = new THREE.Mesh(bayGeo, bayMat);
        bay.position.set(bx, uY, frontZ - railInset + 0.007);
        rackGroup.add(bay);

        const dLed = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.002), this.materials.ledGreen);
        dLed.position.set(bx + 0.022, uY, frontZ - railInset + 0.011);
        rackGroup.add(dLed);
        dynamicNodes.driveLeds.push(dLed);
      }

      // Internal Motherboard Heartbeat LEDs (blinking inside 1U server chassis)
      for (let k = 0; k < 5; k++) {
        const hLed = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.004), this.materials.ledBlue);
        hLed.position.set(-0.12 + k * 0.06, uY, frontZ - 0.22);
        rackGroup.add(hLed);
        dynamicNodes.internalHeartbeatLeds.push({ mesh: hLed, offset: k * 0.9 + 1.2, type: 'blue' });
      }
    }

    // --- MODULE F: Storage Units - Dense 4U SAN / NAS Disk Array (19U-26U) ---
    {
      const uY = getUpos(21, 5.5);
      const san = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 5.3, 0.8),
        this.materials.serverBezelLight
      );
      san.position.set(0, uY, frontZ - 0.45);
      san.userData = { componentName: '4U Enterprise SAN / NVMe Storage Array', type: 'storage_san', rackId: rackData.id };
      rackGroup.add(san);

      // 4 Rows x 6 Columns = 24 Hot-swap NVMe/SAS drive sleds with pulsing disk LEDs!
      const driveSledGeo = new THREE.BoxGeometry(0.038, 0.035, 0.008);
      const driveSledMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, metalness: 0.5, roughness: 0.3 });
      const diskActivityLedGeo = new THREE.BoxGeometry(0.0035, 0.0035, 0.002);

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
          const dx = -0.165 + (c * 0.046);
          const dy = uY - 0.065 + (r * 0.044);

          const sled = new THREE.Mesh(driveSledGeo, driveSledMat);
          sled.position.set(dx, dy, frontZ - railInset + 0.008);
          rackGroup.add(sled);

          const led = new THREE.Mesh(diskActivityLedGeo, this.materials.ledGreen);
          led.position.set(dx + 0.012, dy + 0.008, frontZ - railInset + 0.013);
          rackGroup.add(led);
          dynamicNodes.driveLeds.push(led);
        }
      }

      // Storage Array Status Bar
      const sanStatus = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.025),
        new THREE.MeshBasicMaterial({ color: 0x00bcd4 })
      );
      sanStatus.position.set(0.16, uY + 0.06, frontZ - railInset + 0.01);
      rackGroup.add(sanStatus);

      // Internal SAN backplane controller heartbeat LEDs
      for (let k = 0; k < 8; k++) {
        const hLed = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.004), this.materials.ledAmber);
        hLed.position.set(-0.16 + k * 0.045, uY + 0.02, frontZ - 0.28);
        rackGroup.add(hLed);
        dynamicNodes.internalHeartbeatLeds.push({ mesh: hLed, offset: k * 0.5 + 2.1, type: 'amber' });
      }
    }

    // --- MODULE G: AI & GPU Compute Accelerator Node (13U-18U) ---
    {
      const uY = getUpos(14, 4.5);
      const gpuChassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 4.3, 0.8),
        this.materials.serverBezelDark
      );
      gpuChassis.position.set(0, uY, frontZ - 0.45);
      gpuChassis.userData = { componentName: '4U AI / GPU Accelerator Node', type: 'gpu_accelerator', rackId: rackData.id };
      rackGroup.add(gpuChassis);

      // Heavy intake ventilation fan grills for high-heat GPUs
      const fanGrillGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.005, 24);
      const fanGrillMat = new THREE.MeshStandardMaterial({ color: 0x111317, wireframe: true });
      [-0.12, 0.12].forEach(gx => {
        const grill = new THREE.Mesh(fanGrillGeo, fanGrillMat);
        grill.rotation.x = Math.PI / 2;
        grill.position.set(gx, uY, frontZ - railInset + 0.008);
        rackGroup.add(grill);
      });

      // Tensor Core Activity LED Array
      const tLedGeo = new THREE.BoxGeometry(0.004, 0.004, 0.002);
      for (let i = 0; i < 8; i++) {
        const tLed = new THREE.Mesh(tLedGeo, this.materials.ledAmber);
        tLed.position.set(-0.04 + (i * 0.012), uY + 0.05, frontZ - railInset + 0.008);
        rackGroup.add(tLed);
        dynamicNodes.statusLeds.push(tLed);
      }

      // Internal GPU accelerator phase & voltage rail LEDs
      for (let k = 0; k < 6; k++) {
        const hLed = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.004), this.materials.ledCyan);
        hLed.position.set(-0.13 + k * 0.05, uY - 0.02, frontZ - 0.28);
        rackGroup.add(hLed);
        dynamicNodes.internalHeartbeatLeds.push({ mesh: hLed, offset: k * 0.6 + 3.0, type: 'cyan' });
      }
    }

    // --- MODULE H: Uninterruptible Power Supplies (UPS) (5U-12U) ---
    {
      const uY = getUpos(6, 6.0);
      const ups = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 5.8, 0.7),
        this.materials.serverBezelDark
      );
      ups.position.set(0, uY, frontZ - 0.4);
      ups.userData = { componentName: 'Online Double-Conversion UPS (3kVA)', type: 'ups_system', rackId: rackData.id };
      rackGroup.add(ups);

      // Prominent Backlit Glowing Blue LCD Telemetry Display
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      dynamicNodes.upsScreenCanvas = canvas;
      dynamicNodes.upsScreenTexture = texture;

      const lcdMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.08),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      lcdMesh.position.set(-0.08, uY, frontZ - railInset + 0.008);
      rackGroup.add(lcdMesh);

      // Power Switch & Circuit Test Buttons
      const btnGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16);
      const btnMat = new THREE.MeshStandardMaterial({ color: 0x0288d1 });
      const pwrBtn = new THREE.Mesh(btnGeo, btnMat);
      pwrBtn.rotation.x = Math.PI / 2;
      pwrBtn.position.set(0.14, uY + 0.02, frontZ - railInset + 0.008);
      rackGroup.add(pwrBtn);
    }

    // --- MODULE I: Managed Power Distribution Unit (PDU) & Breakers (1U-4U) ---
    {
      const uY = getUpos(1, 3.2);
      const pdu = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, uHeight * 3.0, 0.3),
        this.materials.serverBezelLight
      );
      pdu.position.set(0, uY, frontZ - 0.2);
      pdu.userData = { componentName: 'Intelligent Monitored Rack PDU', type: 'pdu_unit', rackId: rackData.id };
      rackGroup.add(pdu);

      // C13/C14 Power Sockets Mockup
      const socketGeo = new THREE.BoxGeometry(0.016, 0.02, 0.004);
      const socketMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c });
      for (let s = 0; s < 8; s++) {
        const sock = new THREE.Mesh(socketGeo, socketMat);
        sock.position.set(-0.16 + (s * 0.04), uY, frontZ - railInset + 0.006);
        rackGroup.add(sock);
      }

      // Master Breaker Switch
      const breaker = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.035, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xd32f2f })
      );
      breaker.position.set(0.17, uY, frontZ - railInset + 0.008);
      rackGroup.add(breaker);
    }

    // 4. FUNCTIONAL SWING-OPEN PERFORATED MESH FRONT DOOR (Hinges & Handles)
    const doorHinge = new THREE.Group();
    // Position hinge pivot on the left frame post
    doorHinge.position.set(-W/2 + 0.02, 0, frontZ);

    // Door Frame
    const doorFrameGroup = new THREE.Group();
    const dH = H - 0.06;
    const dW = W - 0.04;

    // Door outer borders
    const dBorderMat = this.materials.rackFrame;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.04, 0.02), dBorderMat);
    topBar.position.set(dW/2, H - 0.05, 0);
    doorFrameGroup.add(topBar);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.04, 0.02), dBorderMat);
    botBar.position.set(dW/2, 0.05, 0);
    doorFrameGroup.add(botBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, dH, 0.02), dBorderMat);
    leftBar.position.set(0.02, H/2, 0);
    doorFrameGroup.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, dH, 0.02), dBorderMat);
    rightBar.position.set(dW - 0.02, H/2, 0);
    doorFrameGroup.add(rightBar);

    // Perforated Metal Mesh Screen (semi-transparent so lights glow through!)
    const meshScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(dW - 0.06, dH - 0.08),
      this.materials.meshDoorPerforated
    );
    meshScreen.position.set(dW/2, H/2, 0.005);
    doorFrameGroup.add(meshScreen);

    // Modern Flush Door Handle & Lock
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.16, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.9, roughness: 0.2 })
    );
    handle.position.set(dW - 0.03, H/2, 0.015);
    doorFrameGroup.add(handle);

    // Door click interaction target
    doorFrameGroup.userData = {
      isDoor: true,
      rackId: rackData.id,
      componentName: `${rackData.name} Mesh Front Door`
    };

    doorHinge.add(doorFrameGroup);
    rackGroup.add(doorHinge);
    dynamicNodes.doorHinge = doorHinge;

    // 5. Overhead Rack Identification Sign / Top Glow Bar
    const signGeo = new THREE.BoxGeometry(0.38, 0.06, 0.02);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0a0d14';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = rackData.meta.primaryColor;
    sCtx.font = 'bold 36px monospace';
    sCtx.textAlign = 'center';
    sCtx.fillText(rackData.name.toUpperCase(), 256, 55);
    sCtx.font = '22px monospace';
    sCtx.fillStyle = '#b0bec5';
    sCtx.fillText(rackData.type.toUpperCase(), 256, 95);

    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, H + 0.04, frontZ - 0.05);
    rackGroup.add(signMesh);

    // Store references on rackGroup for runtime updates
    rackGroup.userData.dynamicNodes = dynamicNodes;
    rackGroup.userData.currentDoorAngle = 0;
    rackGroup.userData.targetDoorAngle = 0;

    return rackGroup;
  }

  updateRack(rackGroup, rackData, dt) {
    const nodes = rackGroup.userData.dynamicNodes;
    if (!nodes) return;

    // 1. Animate Front Mesh Door Swing (0° to 110°)
    const targetAngle = rackData.doorOpen ? -Math.PI * 0.6 : 0;
    rackGroup.userData.targetDoorAngle = targetAngle;
    rackGroup.userData.currentDoorAngle += (targetAngle - rackGroup.userData.currentDoorAngle) * Math.min(1, dt * 5);
    if (nodes.doorHinge) {
      nodes.doorHinge.rotation.y = rackGroup.userData.currentDoorAngle;
    }

    // 2. Animate Top Exhaust Fans
    const fanSpeed = (rackData.fanRpm / 60) * Math.PI * 2 * dt;
    nodes.topFans.forEach(fan => {
      fan.rotation.z += fanSpeed;
    });

    // 3. Update Environmental Monitor Canvas
    if (nodes.tempScreenCanvas && nodes.tempScreenTexture) {
      const ctx = nodes.tempScreenCanvas.getContext('2d');
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, 256, 128);

      ctx.fillStyle = '#546e7a';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('RACK THERMAL MON', 15, 25);

      const isHot = rackData.temp > 45;
      ctx.fillStyle = isHot ? '#ff1744' : '#00e5ff';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`${rackData.temp.toFixed(1)}°C`, 15, 68);

      ctx.fillStyle = '#90a4ae';
      ctx.font = '16px monospace';
      ctx.fillText(`FAN: ${Math.round(rackData.fanRpm)} RPM`, 15, 100);

      // Warning indicator
      if (rackData.overallHealth === 'CRITICAL' || rackData.overallHealth === 'WARNING') {
        ctx.fillStyle = rackData.overallHealth === 'CRITICAL' ? '#ff1744' : '#ffab00';
        ctx.fillRect(200, 15, 40, 20);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('WARN', 204, 30);
      }
      nodes.tempScreenTexture.needsUpdate = true;
    }

    // 4. Update UPS Backlit LCD Screen Canvas
    if (nodes.upsScreenCanvas && nodes.upsScreenTexture) {
      const ctx = nodes.upsScreenCanvas.getContext('2d');
      const ups = rackData.components.ups_system;
      const isBattery = ups.status === 'ON_BATTERY';

      ctx.fillStyle = isBattery ? '#3e1010' : '#041f38';
      ctx.fillRect(0, 0, 256, 128);

      ctx.fillStyle = isBattery ? '#ff5252' : '#00e5ff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`UPS: ${ups.status}`, 15, 26);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`BATT: ${Math.round(ups.batteryPercent)}%`, 15, 64);

      ctx.fillStyle = '#81d4fa';
      ctx.font = '16px monospace';
      ctx.fillText(`IN: ${ups.inputVoltage}V  OUT: ${Math.round(ups.outputVoltage)}V`, 15, 95);
      ctx.fillText(`LOAD: ${ups.loadPercent}% (${rackData.powerWatts}W)`, 15, 118);

      nodes.upsScreenTexture.needsUpdate = true;
    }

    // 5. Blinking Switch & Drive LEDs
    const switchLeds = nodes.switchLeds;
    const portStates = rackData.components.network_switch.portLeds;
    switchLeds.forEach((mesh, idx) => {
      const port = portStates[idx % portStates.length];
      if (port && port.error) {
        mesh.material = this.materials.ledRed;
      } else if (port && port.active) {
        mesh.material = this.materials.ledGreen;
      } else {
        mesh.material = this.materials.ledDim;
      }
    });

    // Drive LEDs
    const driveLeds = nodes.driveLeds;
    const drives = rackData.components.storage_san.drives;
    driveLeds.forEach((mesh, idx) => {
      const drive = drives[idx % drives.length];
      if (drive && drive.blink) {
        mesh.material = this.materials.ledAmber;
      } else {
        mesh.material = this.materials.ledGreen;
      }
    });

    // 6. Blinking Internal Server Chassis Heartbeat LEDs
    const now = performance.now() * 0.001;
    if (nodes.internalHeartbeatLeds && nodes.internalHeartbeatLeds.length > 0) {
      nodes.internalHeartbeatLeds.forEach(item => {
        const isBlinking = Math.sin(now * 9 + item.offset) > 0.1;
        if (rackData.overallHealth === 'OFFLINE' || !isBlinking) {
          item.mesh.material = this.materials.ledDim;
        } else {
          if (item.type === 'green') item.mesh.material = this.materials.ledGreen;
          else if (item.type === 'blue') item.mesh.material = this.materials.ledBlue;
          else if (item.type === 'amber') item.mesh.material = this.materials.ledAmber;
          else item.mesh.material = this.materials.cableCyan;
        }
      });
    }

    // 7. Top Status Beacon Tower (Andon Light)
    if (nodes.beaconGreen && nodes.beaconAmber && nodes.beaconRed) {
      if (rackData.overallHealth === 'OFFLINE') {
        nodes.beaconGreen.material = this.materials.beaconDim;
        nodes.beaconAmber.material = this.materials.beaconDim;
        nodes.beaconRed.material = this.materials.beaconDim;
      } else if (rackData.overallHealth === 'CRITICAL') {
        nodes.beaconGreen.material = this.materials.beaconDim;
        nodes.beaconAmber.material = this.materials.beaconDim;
        // Urgent 4 Hz strobe flash
        nodes.beaconRed.material = Math.sin(now * 22) > 0 ? this.materials.beaconRed : this.materials.beaconDim;
      } else if (rackData.overallHealth === 'WARNING') {
        nodes.beaconGreen.material = this.materials.beaconDim;
        // Moderate 2 Hz amber flash
        nodes.beaconAmber.material = Math.sin(now * 12) > 0 ? this.materials.beaconAmber : this.materials.beaconDim;
        nodes.beaconRed.material = this.materials.beaconDim;
      } else {
        // Nominal steady / gentle green pulse
        nodes.beaconGreen.material = Math.sin(now * 4) > -0.6 ? this.materials.beaconGreen : this.materials.beaconDim;
        nodes.beaconAmber.material = this.materials.beaconDim;
        nodes.beaconRed.material = this.materials.beaconDim;
      }
    }

    // 8. Dual Interior PointLights & Under-Rack Ground Glow
    const baseIntensity = rackData.doorOpen ? 2.4 : 1.8;
    if (nodes.interiorLightUpper) {
      if (rackData.overallHealth === 'CRITICAL') {
        nodes.interiorLightUpper.color.setHex(0xff1744);
        nodes.interiorLightUpper.intensity = baseIntensity * (Math.sin(now * 12) > 0 ? 1.4 : 0.6);
      } else {
        nodes.interiorLightUpper.color.setHex(0xffffff);
        nodes.interiorLightUpper.intensity = baseIntensity;
      }
    }

    if (nodes.interiorLightLower) {
      if (rackData.overallHealth === 'CRITICAL') {
        nodes.interiorLightLower.color.setHex(0xff1744);
        nodes.interiorLightLower.intensity = baseIntensity * (Math.sin(now * 12) > 0 ? 1.4 : 0.6);
      } else {
        nodes.interiorLightLower.color.setStyle(rackData.meta.primaryColor);
        nodes.interiorLightLower.intensity = baseIntensity * 0.9;
      }
    }

    if (nodes.baseGlow) {
      nodes.baseGlow.material.opacity = 0.35 + Math.sin(now * 3 + (rackData.temp * 0.1)) * 0.12;
    }
  }
}
