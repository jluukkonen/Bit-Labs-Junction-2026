import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Orbit,
  Building2,
  Sparkles,
  ArrowRight,
  RotateCw,
  Eye,
  CheckCircle2,
  Users,
  Compass,
  Layers,
  MapPin,
  Play,
  Pause,
  AlertTriangle,
} from 'lucide-react';
import { Applicant, CompanyNode } from '../types';

interface EspooMetaverseProps {
  applicants: Applicant[];
  companies: CompanyNode[];
}

export const EspooMetaverse: React.FC<EspooMetaverseProps> = ({ applicants, companies }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Level 1: Macro City (Espoo Archipelago) vs Level 2: Micro Venue Floor (Hype Arena)
  const [sceneMode, setSceneMode] = useState<'city' | 'venue'>('city');
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>('app-01'); // Priya Nair
  const [cinematicMode, setCinematicMode] = useState<boolean>(true);
  const [selectedEntity, setSelectedEntity] = useState<{
    name: string;
    type: 'company' | 'event' | 'peer';
    description: string;
    bottleneck?: string;
    spark?: string;
    resonance: number;
    cluster: string;
  } | null>(null);

  const selectedVisitor = applicants.find((a) => a.id === selectedVisitorId) || applicants[0];

  // Three.js animation / render loop refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number>(0);
  const entitiesGroupRef = useRef<THREE.Group | null>(null);
  const visitorMeshRef = useRef<THREE.Mesh | null>(null);
  const resonanceLinesRef = useRef<THREE.LineSegments | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Blendi-inspired soft painterly atmospheric fog
    const bgColor = sceneMode === 'city' ? 0xdbeafe : 0x0f172a;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, sceneMode === 'city' ? 0.015 : 0.025);

    // --- 2. Camera Setup ---
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    if (sceneMode === 'city') {
      camera.position.set(0, 32, 48);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, 22, 32);
      camera.lookAt(0, 2, 0);
    }

    // --- 3. Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- 4. Lighting ---
    const ambientLight = new THREE.AmbientLight(
      sceneMode === 'city' ? 0xffffff : 0x94a3b8,
      sceneMode === 'city' ? 1.4 : 0.8
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    dirLight.position.set(24, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00508f, 2, 50);
    pointLight.position.set(0, 8, 0);
    scene.add(pointLight);

    // --- 5. Environment Content Builder ---
    const rootGroup = new THREE.Group();
    entitiesGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // Target positions map for calculating semantic gravity
    const targetNodes: {
      name: string;
      position: THREE.Vector3;
      cluster: string;
      type: 'company' | 'event';
      meta: any;
    }[] = [];

    if (sceneMode === 'city') {
      // ══════════════════════════════════════════════════════════
      // SCENE 1: GREATER ESPOO ARCHIPELAGO (Macro Level)
      // ══════════════════════════════════════════════════════════

      // Nordic Calm Sea Plane
      const waterGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.2,
        metalness: 0.1,
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.y = -0.5;
      water.receiveShadow = true;
      rootGroup.add(water);

      // Stylized Islands representing Espoo Innovation Districts
      const districts = [
        {
          id: 'otaniemi',
          name: 'Otaniemi / Dipoli Hub',
          desc: 'Espoo DeepTech & AI Forum 2026',
          cluster: 'Quantum & Edge AI',
          color: 0x38bdf8,
          x: -16,
          z: -8,
          scale: 14,
          height: 1.6,
        },
        {
          id: 'keilaniemi',
          name: 'Keilaniemi Enterprise Bay',
          desc: 'Nokia Bell Labs & IQM Global HQs',
          cluster: 'Edge AI & Robotics',
          color: 0x818cf8,
          x: 16,
          z: -12,
          scale: 12,
          height: 2.2,
        },
        {
          id: 'kera',
          name: 'Kera CleanTech District',
          desc: 'Circular Economy & Kempower Grid Hub',
          cluster: 'CleanTech & Smart Grid',
          color: 0x34d399,
          x: -14,
          z: 16,
          scale: 11,
          height: 1.2,
        },
        {
          id: 'tapiola',
          name: 'Tapiola Civic & Cultural Island',
          desc: 'City of Espoo Living Lab & EMMA',
          cluster: 'Sovereign AI & Cloud Infra',
          color: 0xfbbf24,
          x: 14,
          z: 14,
          scale: 10,
          height: 1.4,
        },
      ];

      districts.forEach((dist) => {
        // Island landmass (soft rounded bevel)
        const islandGeo = new THREE.CylinderGeometry(
          dist.scale,
          dist.scale * 1.15,
          dist.height,
          24
        );
        const islandMat = new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          roughness: 0.7,
        });
        const island = new THREE.Mesh(islandGeo, islandMat);
        island.position.set(dist.x, dist.height / 2, dist.z);
        island.receiveShadow = true;
        island.castShadow = true;
        rootGroup.add(island);

        // Island Grass Cap
        const grassGeo = new THREE.CylinderGeometry(dist.scale * 0.94, dist.scale * 0.94, 0.4, 24);
        const grassMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.9,
        });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.position.set(dist.x, dist.height + 0.1, dist.z);
        grass.receiveShadow = true;
        rootGroup.add(grass);

        // Central Landmark Tower / Event Beacon
        const beaconGeo = new THREE.CylinderGeometry(1.2, 1.8, 6, 8);
        const beaconMat = new THREE.MeshStandardMaterial({
          color: dist.color,
          metalness: 0.3,
          roughness: 0.2,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(dist.x, dist.height + 3, dist.z);
        beacon.castShadow = true;
        rootGroup.add(beacon);

        // Glowing Top Orb
        const orbGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const orbMat = new THREE.MeshStandardMaterial({
          color: dist.color,
          emissive: dist.color,
          emissiveIntensity: 0.6,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(dist.x, dist.height + 7, dist.z);
        rootGroup.add(orb);

        // Decorative miniature buildings
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const bldgGeo = new THREE.BoxGeometry(2, 2.5 + (i % 2) * 1.5, 2);
          const bldgMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
          const bldg = new THREE.Mesh(bldgGeo, bldgMat);
          bldg.position.set(
            dist.x + Math.cos(angle) * (dist.scale * 0.5),
            dist.height + 1.25,
            dist.z + Math.sin(angle) * (dist.scale * 0.5)
          );
          bldg.castShadow = true;
          rootGroup.add(bldg);
        }

        targetNodes.push({
          name: dist.name,
          position: new THREE.Vector3(dist.x, dist.height + 3, dist.z),
          cluster: dist.cluster,
          type: 'event',
          meta: dist,
        });
      });
    } else {
      // ══════════════════════════════════════════════════════════
      // SCENE 2: MICRO VENUE FLOOR (Inside Hype Arena Espoo)
      // ══════════════════════════════════════════════════════════

      // Nordic Polished Birch Floor
      const floorGeo = new THREE.PlaneGeometry(60, 60);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.3,
        metalness: 0.2,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      rootGroup.add(floor);

      // Arena Grid Lines (Luminescent floor zones)
      const gridHelper = new THREE.GridHelper(60, 30, 0x0284c7, 0x334155);
      gridHelper.position.y = 0.05;
      rootGroup.add(gridHelper);

      // Company Problem-Space Pods (From real companies_sample.json)
      companies.slice(0, 5).forEach((comp, idx) => {
        const angle = (idx / 5) * Math.PI * 2;
        const radius = 16;
        const posX = Math.cos(angle) * radius;
        const posZ = Math.sin(angle) * radius;

        // Pod Base Platform
        const podGeo = new THREE.CylinderGeometry(3.5, 4, 0.8, 16);
        const podMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.6,
          roughness: 0.3,
        });
        const pod = new THREE.Mesh(podGeo, podMat);
        pod.position.set(posX, 0.4, posZ);
        pod.receiveShadow = true;
        rootGroup.add(pod);

        // Glowing Challenge Pillar
        const pillarGeo = new THREE.BoxGeometry(2, 5, 2);
        const pillarMat = new THREE.MeshStandardMaterial({
          color: idx === 1 ? 0x10b981 : 0x00508f,
          emissive: idx === 1 ? 0x047857 : 0x003e70,
          emissiveIntensity: 0.4,
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(posX, 3, posZ);
        pillar.castShadow = true;
        rootGroup.add(pillar);

        // Holographic Problem Core (Rotating top diamond)
        const coreGeo = new THREE.OctahedronGeometry(1.2);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.8,
          wireframe: true,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(posX, 6.5, posZ);
        rootGroup.add(core);

        targetNodes.push({
          name: comp.name,
          position: new THREE.Vector3(posX, 3, posZ),
          cluster: comp.cluster,
          type: 'company',
          meta: comp,
        });
      });
    }

    // ══════════════════════════════════════════════════════════
    // VISITOR AVATAR & SEMANTIC GRAVITY PHYSICS
    // ══════════════════════════════════════════════════════════

    // Visitor representation: Glowing Capsule / Orb
    const visitorGroup = new THREE.Group();
    const visBodyGeo = new THREE.CapsuleGeometry(0.8, 1.4, 8, 16);
    const isFluffSpammer = selectedVisitor.fluffIndex > 60;
    const visMat = new THREE.MeshStandardMaterial({
      color: isFluffSpammer ? 0xef4444 : 0x10b981,
      emissive: isFluffSpammer ? 0x991b1b : 0x059669,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const visMesh = new THREE.Mesh(visBodyGeo, visMat);
    visMesh.position.y = 1.5;
    visMesh.castShadow = true;
    visitorGroup.add(visMesh);
    visitorMeshRef.current = visMesh;

    // Halo ring around visitor
    const ringGeo = new THREE.RingGeometry(1.5, 1.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isFluffSpammer ? 0xf87171 : 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    visitorGroup.add(ring);

    rootGroup.add(visitorGroup);

    // Initial position: center arrival point
    let currentVisPos = new THREE.Vector3(0, 0, sceneMode === 'city' ? 6 : 0);
    visitorGroup.position.copy(currentVisPos);

    // Determine target node with highest semantic resonance
    let bestTarget = targetNodes[0];
    let maxResonance = 0;

    targetNodes.forEach((node) => {
      let resonance = 20;
      if (
        selectedVisitor.cluster.toLowerCase().includes('edge') &&
        node.cluster.toLowerCase().includes('edge')
      ) {
        resonance = 96;
      } else if (
        selectedVisitor.cluster.toLowerCase().includes('quantum') &&
        node.cluster.toLowerCase().includes('quantum')
      ) {
        resonance = 94;
      } else if (
        selectedVisitor.cluster.toLowerCase().includes('clean') &&
        node.cluster.toLowerCase().includes('clean')
      ) {
        resonance = 92;
      }

      if (isFluffSpammer) {
        resonance = Math.floor(resonance * 0.2); // Spammers get almost zero semantic pull
      }

      if (resonance > maxResonance) {
        maxResonance = resonance;
        bestTarget = node;
      }
    });

    // Semantic Resonance Vector (Gravity target)
    const targetGravityPos = isFluffSpammer
      ? new THREE.Vector3(0, 0, 14) // Fluff spammer drifts into dead zone
      : bestTarget.position.clone().multiplyScalar(0.7); // Pulled 70% toward best-fit node

    // Create glowing gravitational resonance beam
    const lineMat = new THREE.LineBasicMaterial({
      color: isFluffSpammer ? 0xef4444 : 0x10b981,
      transparent: true,
      opacity: 0.8,
      linewidth: 3,
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      visitorGroup.position,
      bestTarget.position,
    ]);
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    rootGroup.add(lineMesh);

    // --- 6. Smooth Animation & Camera Orbit Loop ---
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Semantic Gravity: Smoothly pull visitor toward target
      const pullSpeed = isFluffSpammer ? 0.005 : 0.02;
      currentVisPos.lerp(targetGravityPos, pullSpeed);
      visitorGroup.position.copy(currentVisPos);

      // Subtle breathing / hovering animation
      visitorGroup.position.y = Math.sin(elapsedTime * 2.5) * 0.3 + (sceneMode === 'city' ? 1.5 : 0.8);
      ring.rotation.z = elapsedTime * 1.2;

      // Update resonance line points
      const points = [
        new THREE.Vector3(visitorGroup.position.x, visitorGroup.position.y + 1, visitorGroup.position.z),
        new THREE.Vector3(bestTarget.position.x, bestTarget.position.y + 1, bestTarget.position.z),
      ];
      lineGeo.setFromPoints(points);

      // Cinematic Camera Orbit
      if (cinematicMode) {
        const radius = sceneMode === 'city' ? 44 : 26;
        const orbitSpeed = 0.18;
        camera.position.x = Math.sin(elapsedTime * orbitSpeed) * radius;
        camera.position.z = Math.cos(elapsedTime * orbitSpeed) * radius;
        camera.position.y = sceneMode === 'city' ? 28 + Math.sin(elapsedTime * 0.3) * 4 : 18;
        camera.lookAt(
          visitorGroup.position.x * 0.4,
          sceneMode === 'city' ? 2 : 2.5,
          visitorGroup.position.z * 0.4
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [sceneMode, selectedVisitorId, cinematicMode]);

  return (
    <div className="relative w-full h-[780px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Level Switcher (Macro City vs Micro Venue) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto">
          <button
            onClick={() => setSceneMode('city')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              sceneMode === 'city'
                ? 'bg-[#00508F] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            1. Greater Espoo Archipelago (Macro)
          </button>
          <button
            onClick={() => setSceneMode('venue')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              sceneMode === 'venue'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            2. Inside Venue Floor (Hype Arena)
          </button>
        </div>

        {/* Camera Drone Toggle & Perspective Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setCinematicMode(!cinematicMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium backdrop-blur-md border transition-all ${
              cinematicMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/80 text-slate-300 border-slate-700'
            }`}
          >
            {cinematicMode ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Drone Orbit Active
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start Drone Orbit
              </>
            )}
          </button>

          {/* Attendee Perspective Dropdown */}
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Perspective:</span>
            <select
              value={selectedVisitorId}
              onChange={(e) => setSelectedVisitorId(e.target.value)}
              className="bg-transparent text-xs text-white font-semibold outline-none cursor-pointer"
            >
              <option value="app-01" className="bg-slate-900">
                Priya Nair (Embedded Rust Builder)
              </option>
              <option value="app-02" className="bg-slate-900">
                Dr. Tariq Al-Mansoor (RISC-V Architect)
              </option>
              <option value="app-03" className="bg-slate-900">
                Mateo Rojas (Cryo-Quantum Specialist)
              </option>
              <option value="app-05" className="bg-slate-900">
                Victor Sterling (ChatGPT Buzzword Spammer)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Floating Semantic Physics HUD */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-lg border border-slate-700/80 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
          {/* Active Visitor Gravitational Physics Status */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                selectedVisitor.fluffIndex > 60
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {selectedVisitor.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{selectedVisitor.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedVisitor.fluffIndex > 60
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {selectedVisitor.fluffIndex > 60 ? 'No Semantic Gravity' : 'Strong Magnetic Resonance'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{selectedVisitor.role}</p>
            </div>
          </div>

          {/* Gravitational Vector Explanation */}
          <div className="flex-1 max-w-xl bg-slate-950/60 rounded-lg p-2.5 border border-slate-800 text-xs">
            {selectedVisitor.fluffIndex > 60 ? (
              <div className="flex items-start gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Zero Gravitational Pull (88% AI Fluff):</span> Profile consists of
                  generic marketing buzzwords. No physical engineering constraints detected. Visitor drifts
                  aimlessly without company resonance.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-emerald-300">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-bold">Natural Gravitational Pull (96% Fit):</span> Vector calculated from
                  propositional triad <code className="text-sky-300 font-mono">15W Thermal → Rust IPC → 94% MAC</code>.
                  Visitor is naturally drawn toward{' '}
                  <strong className="text-white">
                    {sceneMode === 'city' ? 'Otaniemi / Dipoli DeepTech Forum' : 'Nokia Bell Labs Pod'}
                  </strong>
                  .
                </div>
              </div>
            )}
          </div>

          {/* Level Transition Action Button */}
          <div>
            {sceneMode === 'city' ? (
              <button
                onClick={() => setSceneMode('venue')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00508F] to-sky-600 hover:from-sky-600 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-900/30 transition-all"
              >
                Enter Dipoli Venue Floor
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setSceneMode('city')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
              >
                Back to Espoo Archipelago
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
