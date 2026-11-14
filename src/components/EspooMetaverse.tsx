import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bike,
  Building2,
  Bus,
  Compass,
  Cpu,
  Leaf,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Orbit,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  TrainFront,
  TramFront,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import rawApplicantsSample from '../../data/applicants_sample.json';
import rawCompaniesSample from '../../data/companies_sample.json';
import { Applicant, ClusterName, CompanyNode } from '../types';

interface EspooMetaverseProps {
  applicants: Applicant[];
  companies: CompanyNode[];
}

type SceneMode = 'city' | 'venue';
type DistrictId = 'otaniemi' | 'keilaniemi' | 'kera';
type TransitMode = 'metro' | 'tram' | 'bus' | 'bike';

interface ActiveCutscene {
  mode: TransitMode;
  fromDistrict: DistrictId;
  toDistrict: DistrictId;
  co2SavedGrams: number;
  durationMinutes: number;
  lineLabel: string;
  serendipityText: string;
  source?: 'live' | 'fallback';
  latencyMs?: number;
}

interface NodeDetail {
  id: string;
  name: string;
  subtitle: string;
  kind: 'island' | 'building' | 'transit' | 'company' | 'peer';
  cluster: string;
  resonance: number;
  bottleneck: string;
  bottlenecks: string[];
  spark: string;
  accentHex: string;
  accentNum: number;
  repLabel?: string;
  transitMode?: TransitMode;
  lineLabel?: string;
  targetDistricts?: DistrictId[];
  canEnterVenue?: boolean;
  standSpot?: [number, number];
}

interface WorldNodeRecord extends NodeDetail {
  position: THREE.Vector3;
  labelAnchor: THREE.Vector3;
  hitMeshes: THREE.Object3D[];
}

interface DistrictSpec {
  id: DistrictId;
  name: string;
  shortName: string;
  subtitle: string;
  gpsLabel: string;
  arrivalPos: [number, number];
  accentHex: string;
  waterEastX: number | null;
}

const DISTRICT_SPECS: Record<DistrictId, DistrictSpec> = {
  otaniemi: {
    id: 'otaniemi',
    name: 'Otaniemi Campus & Dipoli',
    shortName: '1. Otaniemi',
    subtitle: 'Dipoli Forum · Aalto University · Maarintie R&D',
    gpsLabel: '60.1856°N, 24.8281°E · OSM Real Footprints',
    arrivalPos: [0, 8.2],
    accentHex: '#059669',
    waterEastX: 15.6,
  },
  keilaniemi: {
    id: 'keilaniemi',
    name: 'Keilaniemi Maritime Hub',
    shortName: '2. Keilaniemi',
    subtitle: 'IQM Quantum · Accountor Tower · Rantaraitti Pier',
    gpsLabel: '60.1749°N, 24.8308°E · OSM Real Footprints',
    arrivalPos: [-7.5, 10.0],
    accentHex: '#00508F',
    waterEastX: 12.8,
  },
  kera: {
    id: 'kera',
    name: 'Karaportti & Kera Smart Grid',
    shortName: '3. Karaportti & Kera',
    subtitle: 'Nokia Bell Labs · Kempower V2G · Keran Hallit',
    gpsLabel: '60.2195°N, 24.7558°E · OSM Real Footprints',
    arrivalPos: [-1.5, 12.0],
    accentHex: '#0D9488',
    waterEastX: null,
  },
};

const TRANSIT_TRIP_META: Record<
  `${DistrictId}->${DistrictId}`,
  { mode: TransitMode; lineLabel: string; durationMinutes: number; co2SavedGrams: number }
> = {
  'otaniemi->keilaniemi': { mode: 'metro', lineLabel: 'Länsimetro M1 · 1 Stop', durationMinutes: 2, co2SavedGrams: 420 },
  'otaniemi->kera': { mode: 'bus', lineLabel: 'HSL Electric Trunk Bus 520', durationMinutes: 9, co2SavedGrams: 890 },
  'keilaniemi->otaniemi': { mode: 'metro', lineLabel: 'Länsimetro M1 · 1 Stop', durationMinutes: 2, co2SavedGrams: 420 },
  'keilaniemi->kera': { mode: 'tram', lineLabel: 'Raide-Jokeri 15 + Rail Connector', durationMinutes: 11, co2SavedGrams: 980 },
  'kera->otaniemi': { mode: 'bus', lineLabel: 'HSL Electric Trunk Bus 520', durationMinutes: 9, co2SavedGrams: 890 },
  'kera->keilaniemi': { mode: 'tram', lineLabel: 'Raide-Jokeri 15 · Karaportti → Coast', durationMinutes: 11, co2SavedGrams: 980 },
  'otaniemi->otaniemi': { mode: 'bike', lineLabel: 'HSL City Bike · Rantaraitti', durationMinutes: 4, co2SavedGrams: 310 },
  'keilaniemi->keilaniemi': { mode: 'bike', lineLabel: 'HSL City Bike · Waterfront', durationMinutes: 4, co2SavedGrams: 310 },
  'kera->kera': { mode: 'bike', lineLabel: 'HSL City Bike · Kera Baana', durationMinutes: 4, co2SavedGrams: 310 },
};

// Real OpenStreetMap Nominatim polygon footprints scaled proportionally into diorama meters (1 unit ≈ 10m)
const OSM_DIPOLI_POLY: [number, number][] = [
  [-5.5, 2.0], [-3.6, 3.2], [-2.4, 2.0], [-0.9, 3.5], [1.0, 4.2],
  [3.0, 2.0], [4.0, 0.3], [4.3, -1.3], [4.1, -2.7], [1.8, -1.8],
  [0.5, -3.7], [-1.7, -4.4], [-3.6, -4.2], [-2.9, -2.4], [-4.0, -0.3],
];

const OSM_MICRONOVA_POLY: [number, number][] = [
  [-4.4, 1.8], [-3.4, 2.7], [-2.1, 1.8], [0.4, 2.0], [2.2, 1.0],
  [3.8, -0.1], [4.0, -1.3], [2.4, -1.8], [0.6, -0.6], [-0.1, -2.8],
  [-4.3, 0.1],
];

const OSM_AALTO_MAIN_POLY: [number, number][] = [
  [-5.4, 1.6], [-3.8, 2.8], [-0.6, 2.6], [3.6, 1.2], [4.2, -0.8],
  [1.4, -2.2], [-2.6, -2.4], [-4.8, -0.9],
];

const OSM_ACCOUNTOR_POLY: [number, number][] = [
  [-2.2, -1.6], [-0.8, 1.8], [0.2, 3.2], [2.1, 2.4], [2.4, 1.6], [0.5, -2.5],
];

const OSM_KONE_POLY: [number, number][] = [
  [-2.4, -2.2], [-0.6, 2.1], [2.0, 1.1], [1.0, -1.1], [0.0, -3.2],
];

const OSM_NOKIA_KARAPORTTI_POLY: [number, number][] = [
  [-4.6, 2.0], [4.4, 2.0], [4.8, -1.4], [1.8, -1.6], [1.6, -0.2],
  [-1.8, -0.2], [-2.0, -2.2], [-4.6, -2.0],
];

interface IslandSpec {
  id: string;
  name: string;
  subtitle: string;
  eventTitle: string;
  clusters: string[];
  x: number;
  z: number;
  radius: number;
  height: number;
  accentHex: string;
  accentNum: number;
  turfColors: string[];
  bottleneck: string;
  bottlenecks: string[];
  defaultSpark: string;
}

// ============================================================================
// ESPOO DOMAIN DATA & SEMANTIC GRAVITY LOGIC
// ============================================================================

const TARIQ_PROFILE: Applicant = {
  id: 'app-tariq',
  name: 'Dr. Tariq Al-Mansoor',
  role: 'Principal RISC-V Vector & Edge Silicon Architect',
  origin: 'Keilaniemi, Espoo · Former ETH & IMEC',
  avatarInitials: 'TM',
  persona: 'Builder / Engineer',
  cluster: 'Edge AI & Robotics',
  competenceScore: 95,
  legacyLinkedInScore: 63,
  fluffIndex: 7,
  evidenceCategory: 'Verified Public Code / Benchmark',
  alignmentType: 'Direct Bottleneck Match',
  demonstratedMechanism:
    'Custom RISC-V RVV 1.0 vector crypto & systolic edge tile on 22nm FDSOI, holding deterministic interrupt jitter to 18ns at 4.8W.',
  status: 'approved',
  reviewedBy: 'Marika K. (City of Espoo)',
  reviewedAt: '2026-11-13 21:00',
  humanReviewerNote: 'Deep custom silicon & deterministic vector ISA experience.',
  linkedInSummaryClaim:
    'Hardware systems architect focused on open ISA vector extensions and low-power edge inference.',
  scenarioPrompt:
    'Describe a hard physical or compute constraint you hit in a real system and the exact architectural trade-off you made to solve it.',
  scenarioAnswer:
    'Standard microcontroller interrupt handlers introduced 240ns cache-flush jitter during real-time LiDAR-to-actuator control. I partitioned a dual-issue RISC-V RVV 1.0 core with tightly coupled scratchpad SRAM and zero-overhead hardware context shadow banks on 22nm FDSOI, cutting worst-case latency to 18ns inside a 4.8W envelope.',
  verifiedArtifacts: [
    {
      title: 'rvv-deterministic-edge-tile (Chisel RTL & Silicon Tapeout)',
      type: 'Open-Source RTL & FPGA Timing Report',
      url: 'https://github.com/talmansoor-riscv/rvv-edge-tile',
      verificationNote: 'Includes verilator cycle-accurate traces and post-route power analysis.',
      authenticityScore: 97,
    },
  ],
  nemotronReasoning:
    '1. Evidence Classification: Open RTL + tapeout timing verification.\n2. Propositional Triad: [240ns cache jitter] -> [RISC-V RVV 1.0 shadow register banks] -> [18ns deterministic latency at 4.8W].\n3. Room Coverage: Direct match for Nokia Bell Labs Espoo & IQM low-latency control.',
  strengths: [
    'RISC-V RVV 1.0 microarchitecture & Chisel RTL',
    'Sub-20ns deterministic edge interrupt pipelines',
    '22nm FDSOI low-power silicon verification',
  ],
  risksOrFlags: [],
  currentExploration:
    'Deterministic RISC-V vector chiplets for 6G industrial edge robotics and cryogenic control.',
  radarCoords: { x: 34, y: 24 },
  sparks: {
    'comp-nokia-bell':
      'Your 18ns RISC-V RVV interrupt shadow banks fit Kaisa Lindholm’s sub-5ms 6G factory handover challenge at Nokia Bell Labs. Ask how they isolate TensorRT scheduling from real-time actuator loops.',
    'comp-iqm':
      'Your deterministic Chisel RTL timing pipeline maps straight into Dr. Heikki Rantanen’s sub-80ns qubit readout constraint at IQM. Compare FPGA vs. custom 22nm ASIC control overheads.',
    'app-01':
      'Pair your 4.8W RISC-V vector tile with Priya’s zero-copy iceoryx Rust IPC layer for an end-to-end deterministic edge stack.',
    'app-03':
      'Compare your 18ns hardware shadow-bank timing closure with Dr. Lukas Lindqvist’s DSP48E2 RFSoC VHDL pipeline.',
  },
};

const ISLAND_SPECS: IslandSpec[] = [
  {
    id: 'island-otaniemi',
    name: 'Otaniemi Island',
    subtitle: 'Dipoli, Quantum & Edge AI Hub',
    eventTitle: 'Espoo DeepTech & AI Forum 2026 (Dipoli)',
    clusters: ['Edge AI & Robotics', 'Quantum & Semiconductors', 'Bio & HealthTech'],
    x: -17,
    z: -7,
    radius: 8.6,
    height: 1.45,
    accentHex: '#059669',
    accentNum: 0x059669,
    turfColors: ['#95bf68', '#86b45c', '#a3ca74'],
    bottleneck:
      'Sub-15W deterministic edge AI, sub-80ns superconducting qubit readout, and wearable biosensor signal fidelity.',
    bottlenecks: [
      'Zero-copy ROS2 + TensorRT IPC under 15W thermal ceiling (Nokia Bell / Otaniemi)',
      'Sub-80ns RFSoC readout crosstalk & cryogenic thermal load',
      'Sub-milliwatt motion artifact cancellation on flexible graphene patches',
    ],
    defaultSpark:
      'Dipoli hosts the DeepTech Challenge Pods—step inside the venue floor to inspect live bottleneck beacons from Nokia Bell Labs, VTT, and ICEYE.',
  },
  {
    id: 'island-keilaniemi',
    name: 'Keilaniemi Island',
    subtitle: 'Nokia Bell Labs & Enterprise HQs',
    eventTitle: 'Keilaniemi Silicon, 6G & Quantum Bay',
    clusters: ['Edge AI & Robotics', 'Quantum & Semiconductors'],
    x: 17,
    z: -9,
    radius: 8.0,
    height: 1.55,
    accentHex: '#00508F',
    accentNum: 0x00508f,
    turfColors: ['#8db982', '#7ead74', '#9ec590'],
    bottleneck:
      'Industrial 6G spatial intelligence handovers and 54-qubit cryogenic control feedline scaling.',
    bottlenecks: [
      'Sub-5ms handover latency for factory floor autonomous mobile robots',
      'Cryo-CMOS signal routing thermal dissipation at 20mK',
      'Deterministic RISC-V & FPGA hardware pulse-shaping pipelines',
    ],
    defaultSpark:
      'Keilaniemi brings together Nokia Bell Labs and IQM Quantum engineers working on deterministic sub-microsecond hardware loops.',
  },
  {
    id: 'island-kera',
    name: 'Kera Island',
    subtitle: 'CleanTech & Smart Grid District',
    eventTitle: 'Kera Circular Energy & V2G Hub',
    clusters: ['CleanTech & Smart Grid'],
    x: -16,
    z: 9.5,
    radius: 7.4,
    height: 1.25,
    accentHex: '#0D9488',
    accentNum: 0x0d9488,
    turfColors: ['#9cc56c', '#8ebb62', '#aad07a'],
    bottleneck:
      'Bidirectional V2G megawatt charger resilience and SiC switching harmonic suppression in -30°C Finnish winters.',
    bottlenecks: [
      'ISO 15118-20 TLS & CAN-bus handshake stability at -30°C',
      'Predictive grid frequency droop control in embedded Rust/C++',
      'Real-time LFP lithium-plating impedance tracking under cold regen',
    ],
    defaultSpark:
      'Kera connects battery electrochemists and power-electronics firmware builders solving sub-zero Nordic grid bottlenecks.',
  },
  {
    id: 'island-tapiola',
    name: 'Tapiola Island',
    subtitle: 'Civic Innovation & Living Lab',
    eventTitle: 'Tapiola Sovereign Cloud & Civic Living Lab',
    clusters: ['Sovereign AI & Cloud Infra', 'Bio & HealthTech'],
    x: 16,
    z: 10,
    radius: 7.4,
    height: 1.35,
    accentHex: '#B45309',
    accentNum: 0xb45309,
    turfColors: ['#a4c676', '#94ba68', '#b0cf82'],
    bottleneck:
      'Out-of-core multi-terabyte SAR geospatial GPU streaming and sovereign zero-trust storage pipelines.',
    bottlenecks: [
      'Sub-9-minute satellite SAR phase-history backprojection on L40S GPUs',
      '120Gbps io_uring thread-per-core object storage without compaction spikes',
      'Privacy-preserving civic & clinical federated edge telemetry',
    ],
    defaultSpark:
      'Tapiola bridges ICEYE’s orbital geo-compute pipelines with high-throughput Rust storage architects and civic living labs.',
  },
];

const VENUE_POD_POSITIONS: Record<string, { x: number; z: number; accentHex: string; accentNum: number }> = {
  'comp-vtt-health': { x: 0, z: -15.5, accentHex: '#0D9488', accentNum: 0x0d9488 },
  'comp-nokia-bell': { x: -15.5, z: -7.5, accentHex: '#059669', accentNum: 0x059669 },
  'comp-iqm': { x: 15.5, z: -7.5, accentHex: '#00508F', accentNum: 0x00508f },
  'comp-kempower': { x: -16.5, z: 7.5, accentHex: '#15803D', accentNum: 0x15803d },
  'comp-iceye': { x: 16.5, z: 7.5, accentHex: '#0369A1', accentNum: 0x0369a1 },
};

const ARRIVAL_POS = new THREE.Vector3(0, 0, 15.5);
const DEAD_ZONE_POS = new THREE.Vector3(0, 0, 21.2);

function normalizeApplicantsList(propApplicants: Applicant[]): Applicant[] {
  const baseSample = rawApplicantsSample as Applicant[];
  const mergedMap = new Map<string, Applicant>();

  baseSample.forEach((item) => mergedMap.set(item.id, item));
  propApplicants.forEach((item) => mergedMap.set(item.id, item));

  if (!mergedMap.has(TARIQ_PROFILE.id)) {
    mergedMap.set(TARIQ_PROFILE.id, TARIQ_PROFILE);
  }

  const mateo = mergedMap.get('app-04');
  if (mateo) {
    mergedMap.set('app-04', {
      ...mateo,
      role: 'Cryo-Quantum Control & Sub-Zero Power Systems Specialist',
      competenceScore: Math.max(mateo.competenceScore, 94),
      fluffIndex: Math.min(mateo.fluffIndex, 9),
      sparks: {
        ...mateo.sparks,
        'comp-iqm':
          'Your deterministic PWM-synchronized STM32H7 harmonic notch filtering translates straight to IQM’s low-noise cryogenic control loops—ask Dr. Heikki Rantanen how they isolate feedline crosstalk below 80ns.',
      },
    });
  }

  const victor = mergedMap.get('app-02');
  if (victor) {
    mergedMap.set('app-02', {
      ...victor,
      name: 'Victor Sterling',
      fluffIndex: victor.fluffIndex === 92 ? 88 : victor.fluffIndex,
    });
  }

  const priorityOrder = ['app-01', 'app-tariq', 'app-04', 'app-02'];
  const ordered: Applicant[] = [];
  priorityOrder.forEach((id) => {
    const found = mergedMap.get(id);
    if (found) {
      ordered.push(found);
      mergedMap.delete(id);
    }
  });
  mergedMap.forEach((rest) => ordered.push(rest));
  return ordered;
}

function normalizeCompaniesList(propCompanies: CompanyNode[]): CompanyNode[] {
  const sample = rawCompaniesSample as CompanyNode[];
  const byId = new Map<string, CompanyNode>();
  sample.forEach((c) => byId.set(c.id, c));
  propCompanies.forEach((c) => byId.set(c.id, c));
  return Array.from(byId.values());
}

function computeIslandResonance(
  visitor: Applicant,
  island: IslandSpec
): { resonance: number; spark: string } {
  if (visitor.fluffIndex > 60) {
    return {
      resonance: 0,
      spark: `Zero gravitational pull (${visitor.fluffIndex}% AI fluff): "${visitor.role}" lacks verifiable hardware or algorithmic constraints needed for ${island.name}.`,
    };
  }

  if (visitor.id === 'app-01') {
    if (island.id === 'island-otaniemi') {
      return {
        resonance: 96,
        spark:
          'Priya’s zero-copy iceoryx CUDA bridge (64ms -> 11.4ms at 14.2W) locks onto Otaniemi DeepTech Forum’s Edge AI & Robotics track inside Dipoli.',
      };
    }
    if (island.id === 'island-keilaniemi') {
      return {
        resonance: 86,
        spark:
          'Secondary pull toward Nokia Bell Labs HQ in Keilaniemi for 15W industrial edge spatial intelligence.',
      };
    }
  }

  if (visitor.id === 'app-tariq') {
    if (island.id === 'island-keilaniemi') {
      return {
        resonance: 95,
        spark:
          'Dr. Tariq’s 18ns RISC-V RVV 1.0 deterministic edge tile draws strong magnetic resonance toward Keilaniemi’s Nokia Bell Labs & IQM silicon labs.',
      };
    }
    if (island.id === 'island-otaniemi') {
      return {
        resonance: 89,
        spark:
          'Secondary resonance with Otaniemi’s DeepTech Forum & Aalto hardware verification testbeds.',
      };
    }
  }

  if (visitor.id === 'app-04') {
    if (island.id === 'island-otaniemi') {
      return {
        resonance: 94,
        spark:
          'Mateo’s sub-zero deterministic control & cryogenic signal resilience aligns strongly with Otaniemi DeepTech Forum (IQM & VTT pods inside Dipoli).',
      };
    }
    if (island.id === 'island-kera') {
      return {
        resonance: 92,
        spark:
          'Direct CleanTech pull toward Kera’s V2G grid-balancing hub where Kempower solves -30°C ISO 15118 PLC packet drops.',
      };
    }
  }

  const directMatch = island.clusters.some(
    (c) => c.toLowerCase() === visitor.cluster.toLowerCase()
  );

  if (directMatch) {
    const score = Math.min(97, Math.max(82, visitor.competenceScore));
    return {
      resonance: score,
      spark: `${visitor.name} exhibits ${score}% semantic resonance with ${island.name} based on demonstrated mechanism: ${visitor.demonstratedMechanism}`,
    };
  }

  return {
    resonance: Math.max(24, Math.round(visitor.competenceScore * 0.42)),
    spark: island.defaultSpark,
  };
}

function computeCompanyResonance(
  visitor: Applicant,
  company: CompanyNode
): { resonance: number; spark: string } {
  if (visitor.fluffIndex > 60) {
    return {
      resonance: 0,
      spark: `Zero gravitational pull (${visitor.fluffIndex}% AI fluff): Synthetic marketing claims generate 0% overlap with ${company.name}’s physical bottleneck ("${company.actualProblemSpace}").`,
    };
  }

  const customSpark = visitor.sparks?.[company.id];

  if (visitor.id === 'app-01' && company.id === 'comp-nokia-bell') {
    return {
      resonance: 96,
      spark:
        customSpark ||
        'Both you and Kaisa Lindholm’s team at Nokia Bell Labs are solving zero-copy shared memory IPC between ROS2 and TensorRT on 15W modules.',
    };
  }

  if (visitor.id === 'app-tariq') {
    if (company.id === 'comp-nokia-bell') {
      return {
        resonance: 95,
        spark: customSpark || visitor.demonstratedMechanism,
      };
    }
    if (company.id === 'comp-iqm') {
      return {
        resonance: 91,
        spark: customSpark || visitor.demonstratedMechanism,
      };
    }
  }

  if (visitor.id === 'app-04') {
    if (company.id === 'comp-iqm') {
      return {
        resonance: 94,
        spark:
          customSpark ||
          'Compare deterministic sub-80ns FPGA/MCU control loops and harmonic noise isolation with Dr. Heikki Rantanen at IQM.',
      };
    }
    if (company.id === 'comp-kempower') {
      return {
        resonance: 92,
        spark:
          customSpark ||
          'Both you and Mikko Virtanen at Kempower are fighting sub-zero ISO 15118 TLS session drops! Share your PWM-synchronized STM32H7 notch filter.',
      };
    }
  }

  if (company.cluster.toLowerCase() === visitor.cluster.toLowerCase()) {
    const score = Math.min(96, Math.max(84, visitor.competenceScore));
    return {
      resonance: score,
      spark:
        customSpark ||
        `Direct ${visitor.cluster} bottleneck resonance with ${company.repName} (${company.repRole}): compare "${visitor.demonstratedMechanism}" against "${company['active bottlenecks'][0]}".`,
    };
  }

  if (customSpark) {
    return {
      resonance: Math.max(76, Math.round(visitor.competenceScore * 0.85)),
      spark: customSpark,
    };
  }

  return {
    resonance: Math.max(22, Math.round(visitor.competenceScore * 0.36)),
    spark: `Cross-domain exploration spark: ask ${company.repName} how "${company['active bottlenecks'][0]}" intersects with your work in ${visitor.cluster}.`,
  };
}

function computePeerResonance(
  visitor: Applicant,
  peer: Applicant
): { resonance: number; spark: string } {
  if (visitor.fluffIndex > 60 || peer.fluffIndex > 60) {
    return {
      resonance: 0,
      spark:
        visitor.fluffIndex > 60
          ? `Zero gravitational tether: ${visitor.name} carries ${visitor.fluffIndex}% ungrounded buzzwords and drifts outside verified builder clusters.`
          : `${peer.name} is isolated in the Dead Zone (${peer.fluffIndex}% AI fluff) with no verifiable systems constraints.`,
    };
  }

  const directSpark = visitor.sparks?.[peer.id] || peer.sparks?.[visitor.id];
  if (directSpark) {
    return {
      resonance: 91,
      spark: directSpark,
    };
  }

  if (visitor.cluster === peer.cluster) {
    return {
      resonance: 86,
      spark: `Shared ${peer.cluster} frontier: compare "${visitor.demonstratedMechanism}" with ${peer.name}’s "${peer.demonstratedMechanism}".`,
    };
  }

  return {
    resonance: 54,
    spark: `Adjacent hardware/systems spark: ask ${peer.name} (${peer.role}) about "${peer.currentExploration}".`,
  };
}

// ============================================================================
// @blendi/coloured-pencil ENGINE (MIT License — https://patch.gg/blendi/coloured-pencil)
// Ported cleanly into TypeScript: noise.js, pencil.js, page.js, shape.js, houses.js
// ============================================================================

const TAU = Math.PI * 2;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PC_UP = V(0, 1, 0);
const PC_SUN = V(-0.62, 0.62, 0.48).normalize();

type Vec3Tuple = [number, number, number];
type HatchFn = (x: number, y: number, z: number, i: number) => [number, number];
type ColourFn = (
  x: number,
  y: number,
  z: number,
  i: number,
  nx: number,
  ny: number,
  nz: number
) => THREE.ColorRepresentation;
type ColourFnOrValue = THREE.ColorRepresentation | ColourFn;

// --- noise.js ---
const PC_PERM = new Uint8Array(512);
{
  let s = 20261110;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PC_PERM[i] = p[i & 255];
}
const pcFade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const pcGrad = (h: number, x: number, y: number) =>
  (h & 1 ? -x : x) + (h & 2 ? -y : y);

function pcNoise2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const u = pcFade(fx);
  const v = pcFade(fy);
  const a = PC_PERM[X] + Y;
  const b = PC_PERM[X + 1] + Y;
  const lerp = (p: number, q: number, t: number) => p + (q - p) * t;
  return (
    lerp(
      lerp(pcGrad(PC_PERM[a], fx, fy), pcGrad(PC_PERM[b], fx - 1, fy), u),
      lerp(
        pcGrad(PC_PERM[a + 1], fx, fy - 1),
        pcGrad(PC_PERM[b + 1], fx - 1, fy - 1),
        u
      ),
      v
    ) * 1.4
  );
}

function pcRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- pencil.js ---
const PENCIL_GLSL = /* glsl */ `
uniform float uPx;
float pcHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float pcHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float pcNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pcHash3(i), pcHash3(i + vec3(1, 0, 0)), f.x), mix(pcHash3(i + vec3(0, 1, 0)), pcHash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(pcHash3(i + vec3(0, 0, 1)), pcHash3(i + vec3(1, 0, 1)), f.x), mix(pcHash3(i + vec3(0, 1, 1)), pcHash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float pcTooth(vec3 at) {
  float fine = length(fwidth(at));
  return mix(0.5, pcNoise(at * 19.0), clamp(1.0 - fine * 14.0, 0.0, 1.0)) * 0.6 + mix(0.5, pcNoise(at * 47.0 + 5.0), clamp(1.0 - fine * 35.0, 0.0, 1.0)) * 0.4;
}
float pcStroke(float W, float d) { return smoothstep(W * 0.5 + 1.0, W * 0.5 - 1.0, d) * min(1.0, W * 0.6); }
float pcStrokes(float h, float cover) {
  float g = length(vec2(dFdx(h), dFdy(h))) + 1e-9;
  float k = -log2(g * uPx), kf = floor(k), t = k - kf, s = exp2(kf), P = 1.0 / (g * s), x = h * s;
  float ic = floor(x + 0.5), im = floor(x) + 0.5;
  float W = cover * P / (1.0 + t) * 1.3;
  float a = pcStroke(W * (0.65 + 0.7 * pcHash(ic / s + 3.7)), abs(x - ic) * P) * (0.55 + 0.45 * pcHash(ic / s));
  float b = pcStroke(W * t * (0.65 + 0.7 * pcHash(im / s + 3.7)), abs(x - im) * P) * (0.55 + 0.45 * pcHash(im / s));
  return max(a, b);
}
vec3 pcDraw(vec3 local, float D, vec2 h, vec3 at) {
  float tooth = pcTooth(at);
  vec2 wob = vec2(0.012 * sin(at.x * 5.0 + at.y * 3.0) + 0.01 * sin(at.z * 6.3 - at.y * 4.1), 0.012 * sin(at.z * 4.6 + at.x * 2.7) + 0.01 * sin(at.y * 5.9 + at.x * 3.3));
  vec3 shade = mix(local * 0.5, vec3(0.24, 0.2, 0.62), 0.55);
  vec3 left = vec3(1.0);
  left *= mix(vec3(1.0), vec3(1.0, 0.9, 0.56), clamp((1.0 - smoothstep(0.0, 0.4, D)) * 0.34 * (0.45 + 0.9 * tooth), 0.0, 1.0));
  left *= mix(vec3(1.0), local, clamp((0.36 + 0.45 * smoothstep(0.0, 0.7, D)) * (0.5 + 0.85 * tooth), 0.0, 1.0));
  left *= mix(vec3(1.0), local, clamp(pcStrokes(h.x + wob.x, 0.45 + 0.4 * D) * (0.62 + 0.5 * D) * (0.55 + 0.8 * tooth), 0.0, 1.0));
  left *= mix(vec3(1.0), shade, clamp(pcStrokes(h.y + wob.y, clamp((D - 0.24) * 1.35, 0.0, 0.82)) * (0.5 + 0.75 * tooth) * 0.95, 0.0, 1.0));
  return left;
}`;

const PC_SKY_NOISE = /* glsl */ `
float skyHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float skyNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(skyHash(i), skyHash(i + vec2(1, 0)), f.x), mix(skyHash(i + vec2(0, 1)), skyHash(i + vec2(1, 1)), f.x), f.y); }
float skyFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * skyNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }`;

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _tmpCol = new THREE.Color();

function field(
  g: THREE.BufferGeometry,
  a: Vec3Tuple = [0.62, 1, 0.34],
  b: Vec3Tuple = [-0.78, 1, 0.22]
): THREE.BufferGeometry {
  _vecA.set(a[0], a[1], a[2]).normalize();
  _vecB.set(b[0], b[1], b[2]).normalize();
  const p = g.attributes.position as THREE.BufferAttribute;
  const h = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    h[i * 2] = p.getX(i) * _vecA.x + p.getY(i) * _vecA.y + p.getZ(i) * _vecA.z;
    h[i * 2 + 1] = p.getX(i) * _vecB.x + p.getY(i) * _vecB.y + p.getZ(i) * _vecB.z;
  }
  g.setAttribute('hatch', new THREE.BufferAttribute(h, 2));
  return g;
}

function fieldBy(g: THREE.BufferGeometry, fn: HatchFn): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  const h = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const pair = fn(p.getX(i), p.getY(i), p.getZ(i), i);
    h[i * 2] = pair[0];
    h[i * 2 + 1] = pair[1];
  }
  g.setAttribute('hatch', new THREE.BufferAttribute(h, 2));
  return g;
}

function hue(g: THREE.BufferGeometry, value: ColourFnOrValue): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute | undefined;
  const c = new Float32Array(p.count * 3);
  if (typeof value !== 'function') _tmpCol.set(value);
  for (let i = 0; i < p.count; i++) {
    if (typeof value === 'function') {
      _tmpCol.set(
        value(
          p.getX(i),
          p.getY(i),
          p.getZ(i),
          i,
          n?.getX(i) ?? 0,
          n?.getY(i) ?? 1,
          n?.getZ(i) ?? 0
        )
      );
    }
    c[i * 3] = _tmpCol.r;
    c[i * 3 + 1] = _tmpCol.g;
    c[i * 3 + 2] = _tmpCol.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

interface PencilSuite {
  px: { value: number };
  line: THREE.MeshLambertMaterial;
  both: THREE.MeshLambertMaterial;
  flat: THREE.MeshLambertMaterial;
  dispose: () => void;
}

function createPencil(): PencilSuite {
  const px = { value: 4.6 };
  const created: THREE.MeshLambertMaterial[] = [];
  const make = ({
    side = THREE.FrontSide as THREE.Side,
    flat = false,
  }: { side?: THREE.Side; flat?: boolean } = {}) => {
    const m = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side,
      depthWrite: !flat,
    });
    m.onBeforeCompile = (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.uniforms.uPx = px;
      s.vertexShader =
        'attribute vec2 hatch; varying vec2 vHatch; varying vec3 vAt;\n' +
        s.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n  vHatch = hatch; vAt = position;'
        );
      s.fragmentShader =
        'varying vec2 vHatch; varying vec3 vAt;\n' +
        PENCIL_GLSL +
        '\n' +
        s.fragmentShader.replace(
          '#include <opaque_fragment>',
          flat
            ? 'gl_FragColor = vec4(mix(vec3(1.0), diffuseColor.rgb, 0.82), 1.0);'
            : 'float pcLit = dot(outgoingLight, vec3(0.3333)) / max(dot(diffuseColor.rgb, vec3(0.3333)), 0.03);\n  gl_FragColor = vec4(pcDraw(diffuseColor.rgb, 1.0 - clamp(pow(pcLit, 0.8), 0.0, 1.0), vHatch, vAt), 1.0);'
        );
    };
    m.customProgramCacheKey = () => (flat ? `pencil-flat-${side}` : `pencil-${side}`);
    created.push(m);
    return m;
  };
  return {
    px,
    line: make(),
    both: make({ side: THREE.DoubleSide }),
    flat: make({ flat: true, side: THREE.DoubleSide }),
    dispose: () => created.forEach((m) => m.dispose()),
  };
}

interface PencilBatch {
  add: (
    g: THREE.BufferGeometry,
    colour?: ColourFnOrValue,
    a?: Vec3Tuple,
    b?: Vec3Tuple
  ) => THREE.BufferGeometry;
  build: () => THREE.Mesh;
  readonly count: number;
}

function createBatch(material: THREE.MeshLambertMaterial): PencilBatch {
  const parts: THREE.BufferGeometry[] = [];
  return {
    add(g, colour = '#cccccc', a, b) {
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.hatch) field(g, a, b);
      if (!g.attributes.color) hue(g, colour);
      if (g.attributes.uv) g.deleteAttribute('uv');
      parts.push(g.index ? g.toNonIndexed() : g);
      return g;
    },
    build() {
      const merged =
        parts.length > 0 ? mergeGeometries(parts) : new THREE.BufferGeometry();
      const mesh = new THREE.Mesh(merged, material);
      if (material.depthWrite) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      } else {
        mesh.renderOrder = 10;
      }
      return mesh;
    },
    get count() {
      return parts.length;
    },
  };
}

// --- page.js ---
const PAGE_QUAD = /* glsl */ `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function createPage(renderer: THREE.WebGLRenderer) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const wInit = Math.max(1, size.x);
  const hInit = Math.max(1, size.y);
  const target = new THREE.WebGLRenderTarget(wInit, hInit, {
    samples: 4,
    type: THREE.HalfFloatType,
    depthBuffer: true,
    generateMipmaps: false,
  });
  target.depthTexture = new THREE.DepthTexture(wInit, hInit, THREE.UnsignedIntType);

  const print = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tDrawn: { value: target.texture },
      tDepth: { value: target.depthTexture },
      uSize: { value: new THREE.Vector2(wInit, hInit) },
      uInverse: { value: new THREE.Matrix4() },
      uPixel: { value: 1 },
      uScale: { value: 1 },
      uNear: { value: 0.3 },
    },
    vertexShader: PAGE_QUAD,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tDrawn; uniform sampler2D tDepth; uniform vec2 uSize; uniform mat4 uInverse; uniform float uPixel; uniform float uScale; uniform float uNear;
      in vec2 vUv;
      layout(location = 0) out vec4 outC;
      vec3 seen(vec2 uv) { vec4 p = uInverse * vec4(uv * 2.0 - 1.0, texture(tDepth, uv).r * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float soft(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 px = gl_FragCoord.xy, t = 1.0 / uSize;
        float tooth = soft(px * 0.55 / uScale) * 0.6 + soft(px * 1.3 / uScale + 9.0) * 0.4;
        float w = uScale * 0.85;
        vec3 P = seen(vUv), L = seen(vUv - vec2(t.x * w, 0.0)), R = seen(vUv + vec2(t.x * w, 0.0)), D = seen(vUv - vec2(0.0, t.y * w)), U = seen(vUv + vec2(0.0, t.y * w));
        vec3 ax = abs(R.z - P.z) < abs(P.z - L.z) ? R - P : P - L, ay = abs(U.z - P.z) < abs(P.z - D.z) ? U - P : P - D;
        vec3 N = normalize(cross(ax, ay));
        float off = max(max(abs(dot(N, L - P)), abs(dot(N, R - P))), max(abs(dot(N, D - P)), abs(dot(N, U - P)))) / (min(min(-L.z, -R.z), min(-D.z, min(-U.z, -P.z))) * uPixel * w);
        float rough = 5.0 * -P.z / (uNear * 16777216.0 * uPixel);
        float line = smoothstep(0.34 + rough, 0.7 + rough * 1.5, off) * (0.45 + 0.55 * soft(px * 0.035 / uScale + 4.0)) * (0.6 + 0.5 * tooth) * mix(1.0, 0.45, smoothstep(40.0, 400.0, -P.z));
        vec3 left = texture(tDrawn, vUv).rgb * mix(vec3(1.0), vec3(0.2, 0.17, 0.22), clamp(line * 0.8, 0.0, 1.0));

        vec3 col = pow(clamp(left, 0.0, 1.0), vec3(1.0 / 2.2));
        float bare = smoothstep(0.62, 0.9, 1.0 - tooth) * (0.25 + 0.5 * dot(col, vec3(0.333)));
        col = mix(col, vec3(1.0), bare);
        vec2 q = min(vUv, 1.0 - vUv) * vec2(uSize.x / uSize.y, 1.0);
        float edge = min(q.x, q.y) + 0.032 * (soft(px * 0.012 / uScale) - 0.5) + 0.018 * (soft(px * 0.05 / uScale) - 0.5);
        col = mix(vec3(1.0), col, smoothstep(0.01, 0.068, edge));
        vec3 paper = vec3(0.975, 0.955, 0.915) * (0.97 + 0.045 * soft(px * 0.3 / uScale)) * (1.0 - 0.035 * soft(px * 0.006 / uScale + 3.0));
        outC = vec4(col * paper, 1.0);
      }`,
  });

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeo, print);
  quad.frustumCulled = false;
  const stage = new THREE.Scene();
  stage.add(quad);
  const flat = new THREE.Camera();

  return {
    resize() {
      renderer.getDrawingBufferSize(size);
      const w = Math.max(1, size.x);
      const h = Math.max(1, size.y);
      target.setSize(w, h);
      print.uniforms.uSize.value.set(w, h);
    },
    render(world: THREE.Scene, camera: THREE.PerspectiveCamera) {
      renderer.getDrawingBufferSize(size);
      const h = Math.max(1, size.y);
      print.uniforms.uInverse.value.copy(camera.projectionMatrixInverse);
      print.uniforms.uPixel.value = 2 / (camera.projectionMatrix.elements[5] * h);
      print.uniforms.uScale.value = h / 1080;
      print.uniforms.uNear.value = camera.near;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear();
      renderer.render(world, camera);
      renderer.setRenderTarget(null);
      renderer.render(stage, flat);
    },
    dispose() {
      target.depthTexture?.dispose();
      target.dispose();
      print.dispose();
      quadGeo.dispose();
    },
  };
}

// --- shape.js ---
function smooth(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.normal) g.deleteAttribute('normal');
  const merged = mergeVertices(g, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

const n3 = (x: number, y: number, z: number, s: number) =>
  0.6 * pcNoise2(x + s, y + z * 0.71) +
  0.6 * pcNoise2(z - s * 1.3, x * 0.83 - y * 0.57 + 5);

function knead(
  g: THREE.BufferGeometry,
  amount = 0.02,
  grain = 1.6,
  seed = 1,
  dents = 0,
  press = 0.3
): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();

  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = amount * n3(v.x * grain, v.y * grain, v.z * grain, seed);
    p.setXYZ(i, v.x + n.getX(i) * k, v.y + n.getY(i) * k, v.z + n.getZ(i) * k);
  }
  if (dents > 0) {
    const rand = pcRng(seed * 7 + 3);
    for (let k = 0; k < dents; k++) {
      const j = Math.floor(rand() * p.count);
      const r = press * (0.6 + 0.8 * rand());
      c.fromBufferAttribute(p, j);
      d.fromBufferAttribute(n, j);
      for (let i = 0; i < p.count; i++) {
        const far = v.fromBufferAttribute(p, i).distanceTo(c);
        if (far < r) {
          const push = r * 0.2 * (1 - (far / r) ** 2) ** 2;
          p.setXYZ(i, v.x - d.x * push, v.y - d.y * push, v.z - d.z * push);
        }
      }
    }
  }
  g.computeVertexNormals();
  return g;
}

const ball = (r = 1, detail = 2) => smooth(new THREE.IcosahedronGeometry(r, detail));

const turned = (profile: [number, number][], around = 18) =>
  smooth(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)),
      around
    )
  );

function block(w: number, h: number, d: number, round = 0.06, cell = 0.25): THREE.BufferGeometry {
  round = Math.min(round, w / 2, h / 2, d / 2);
  const seg = (s: number) => Math.max(2, Math.min(12, Math.round(s / cell)));
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const hx = w / 2 - round;
  const hy = h / 2 - round;
  const hz = d / 2 - round;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(
      Math.min(hx, Math.max(-hx, v.x)),
      Math.min(hy, Math.max(-hy, v.y)),
      Math.min(hz, Math.max(-hz, v.z))
    );
    v.sub(c);
    if (v.lengthSq() > 1e-12) v.setLength(round);
    p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  return smooth(g);
}

function roll(
  points: THREE.Vector3[],
  radius: number | ((t: number) => number),
  { around = 8, every = 0.25, closed = false, flat = 1 } = {}
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const len = Math.max(curve.getLength(), 1e-4);
  const R = typeof radius === 'function' ? radius : () => radius;
  const n = Math.max(3, Math.min(48, Math.round(len / every)));
  const e0 = Math.min(R(0), len * 0.35);
  const e1 = Math.min(R(1), len * 0.35);
  const stops: number[] = [];

  if (closed) {
    for (let i = 0; i < n; i++) stops.push(i / n);
  } else {
    for (const k of [0, 0.1, 0.32, 0.66]) stops.push((k * e0) / len);
    for (let i = 0; i <= n; i++) stops.push((e0 + (len - e0 - e1) * (i / n)) / len);
    for (const k of [0.66, 0.32, 0.1, 0]) stops.push(1 - (k * e1) / len);
  }

  const pos: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const nrm = new THREE.Vector3(0, 1, 0);
  const b = new THREE.Vector3();
  const m = stops.length;

  curve.getTangentAt(0, t);
  if (Math.abs(t.y) > 0.9) nrm.set(1, 0, 0);

  stops.forEach((u) => {
    const cu = Math.min(1, Math.max(0, u));
    curve.getPointAt(cu, p);
    curve.getTangentAt(cu, t);
    nrm.addScaledVector(t, -nrm.dot(t)).normalize();
    b.crossVectors(t, nrm);
    const s = cu * len;
    let r = R(cu);
    if (!closed) {
      if (s < e0 && e0 > 1e-5) r *= Math.sqrt(Math.max(0, 1 - (1 - s / e0) ** 2));
      else if (len - s < e1 && e1 > 1e-5) r *= Math.sqrt(Math.max(0, 1 - (1 - (len - s) / e1) ** 2));
    }
    for (let k = 0; k < around; k++) {
      const a = (k / around) * TAU;
      const ox = nrm.x * Math.cos(a) * r + b.x * Math.sin(a) * r;
      const oy = nrm.y * Math.cos(a) * r + b.y * Math.sin(a) * r;
      const oz = nrm.z * Math.cos(a) * r + b.z * Math.sin(a) * r;
      pos.push(p.x + ox, p.y + oy * flat, p.z + oz);
    }
  });

  for (let i = 0; i < (closed ? m : m - 1); i++) {
    for (let k = 0; k < around; k++) {
      const j = (i + 1) % m;
      const k1 = (k + 1) % around;
      const a = i * around + k;
      const a1 = i * around + k1;
      const c = j * around + k;
      const c1 = j * around + k1;
      index.push(a, a1, c, a1, c1, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return smooth(g);
}

function ring(
  centre: THREE.Vector3,
  axis: THREE.Vector3,
  radius: number,
  n = 14
): THREE.Vector3[] {
  const a = axis.clone().normalize();
  const u = new THREE.Vector3(1, 0, 0);
  if (Math.abs(a.x) > 0.9) u.set(0, 0, 1);
  u.addScaledVector(a, -u.dot(a)).normalize();
  const w = new THREE.Vector3().crossVectors(a, u);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    return centre
      .clone()
      .addScaledVector(u, Math.cos(t) * radius)
      .addScaledVector(w, Math.sin(t) * radius);
  });
}

function put(
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  turn = 0,
  scale = 1
): THREE.BufferGeometry {
  if (scale !== 1) g.scale(scale, scale, scale);
  if (turn) g.rotateY(turn);
  return g.translate(x, y, z);
}

function arched(w: number, h: number, deep = 0.1): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, Math.max(h - r, 0));
  s.absarc(0, Math.max(h - r, 0), r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return new THREE.ExtrudeGeometry(s, {
    depth: deep,
    bevelEnabled: false,
    curveSegments: 8,
  }).translate(0, 0, -deep / 2);
}

const darker = (c: THREE.ColorRepresentation, k = 0.82) =>
  new THREE.Color(c).multiplyScalar(k);
const hashN = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

interface SketchKit {
  line: PencilBatch;
  both: PencilBatch;
  flat: PencilBatch;
  rand: () => number;
  next: () => number;
  pick: <T>(list: readonly T[]) => T;
}

const PC_TILES = ['#c9663f', '#b5533c', '#d67a4a', '#bf5c3a', '#cf7050'];
const PC_GREENS = ['#5fa04a', '#74b356', '#4f8f44', '#8cc063'];
const PC_DARK = ['#2f6b4a', '#3a7a52', '#2a5f47', '#34704c'];
const PC_WHITE = '#f8f4ea';

function addRoof(
  kit: SketchKit,
  {
    x,
    y,
    z,
    w,
    d,
    rh,
    gable = true,
    tiles = PC_TILES,
    wall = '#f3e9d6',
  }: {
    x: number;
    y: number;
    z: number;
    w: number;
    d: number;
    rh: number;
    gable?: boolean;
    tiles?: string[];
    wall?: string;
  }
) {
  const { line, next } = kit;
  const tones = tiles.map((c) => new THREE.Color(c));
  const g = block(w + 0.06, rh, d + 0.06, 0.04, 0.45);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const k = 1 - 0.95 * (p.getY(i) / rh + 0.5);
    if (gable) p.setX(i, p.getX(i) * k);
    else p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  hue(g, (_px, _py, _pz, _i, nx, _ny, nz) =>
    Math.abs(gable ? nz : nx) > 0.6 ? wall : darker(tiles[0], 0.8)
  );
  line.add(field(g.translate(x, y + rh / 2 - 0.05, z)));

  const H = (gable ? w : d) / 2 + 0.18;
  const len = (gable ? d : w) + 0.28;
  const L = Math.hypot(H, rh);
  const a = Math.atan2(rh, H);
  const rows = Math.max(3, Math.min(5, Math.round(L / 0.5)));
  const rw = L / rows;
  for (const s of [-1, 1]) {
    for (let i = 0; i < rows; i++) {
      const t = (i + 0.5) / rows;
      const off = s * H * (1 - t);
      const lift = 0.04;
      const slab = knead(
        gable
          ? block(rw + 0.1, 0.07, len, 0.025, 0.45)
          : block(len, 0.07, rw + 0.1, 0.025, 0.45),
        0.006,
        4,
        next()
      );
      if (gable) slab.rotateZ(-s * (a - 0.08));
      else slab.rotateX(s * (a - 0.08));
      slab.translate(
        x + (gable ? off + ((s * rh) / L) * lift : 0),
        y + rh * t + (H / L) * lift - 0.04,
        z + (gable ? 0 : off + ((s * rh) / L) * lift)
      );
      hue(
        slab,
        (px, _py, pz) =>
          tones[
            Math.floor(
              hashN(Math.floor((gable ? pz : px) / 0.35) * 7.3 + i * 3.1 + s) * tones.length
            )
          ]
      );
      line.add(
        field(
          slab,
          gable ? [0, 0.05, 1] : [1, 0.05, 0],
          gable ? [1, 0.6, 0.3] : [0.3, 0.6, 1]
        )
      );
    }
  }
  const e = len / 2;
  line.add(
    roll(
      gable
        ? [V(x, y + rh + 0.02, z - e), V(x, y + rh + 0.02, z + e)]
        : [V(x - e, y + rh + 0.02, z), V(x + e, y + rh + 0.02, z)],
      0.09,
      { around: 7, every: 0.4 }
    ),
    darker(tiles[0], 0.9),
    gable ? [0, 0, 1] : [1, 0, 0]
  );
}

function addCrown(
  kit: SketchKit,
  c: THREE.Vector3,
  r: number,
  colour: string,
  squash = 0.85,
  stretch = 1
) {
  const g = knead(ball(r, 2).scale(1, squash, 1), r * 0.08, 2.2 / r, kit.next()).translate(
    c.x,
    c.y,
    c.z
  );
  const from = c.clone().addScaledVector(PC_SUN, r * 2.6);
  kit.line.add(
    fieldBy(g, (px, py, pz) => [
      Math.hypot((px - from.x) * stretch, py - from.y, (pz - from.z) * stretch) * 1.1,
      px * 0.6 - py * 0.5 + pz * 0.62,
    ]),
    colour
  );
}

function addNordicTree(kit: SketchKit, x: number, y: number, z: number, s = 1, conifer = false) {
  kit.line.add(
    knead(
      roll([V(x, y, z), V(x + 0.08 * s, y + 0.9 * s, z), V(x - 0.04 * s, y + 1.8 * s, z)], (t) => (0.18 - 0.07 * t) * s, {
        around: 7,
        every: 0.4,
      }),
      0.014,
      4,
      kit.next()
    ),
    '#8a5f3c',
    [0.9, 0.1, 0.4],
    [0.1, 1, 0.1]
  );
  if (conifer) {
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const rr = (0.72 - 0.45 * t) * s;
      const cy = y + 0.9 * s + t * 1.65 * s;
      addCrown(kit, V(x, cy, z), rr, kit.pick(PC_DARK), 0.85, 1.3);
    }
    kit.line.add(put(turned([[0, 0], [0.18 * s, 0], [0, 0.55 * s]], 6), x, y + 2.55 * s, z), PC_DARK[0]);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + kit.rand() * 0.4;
      const out = i === 0 ? 0.1 : 0.55 * s;
      const rr = (0.58 + 0.22 * kit.rand()) * s;
      addCrown(kit, V(x + Math.cos(a) * out, y + 2.15 * s + (i === 0 ? 0.35 * s : 0), z + Math.sin(a) * out), rr, kit.pick(PC_GREENS));
    }
  }
}

function buildSketchedAvatar(
  pencil: PencilSuite,
  {
    shirtHex,
    stripeHex,
    pantsHex = '#3c5884',
    skinHex = '#f5c7a1',
    hairHex = '#593b25',
    hatHex,
    hasScroll = false,
    accentOrbHex,
    isHero = false,
    seed = 10,
  }: {
    shirtHex: string;
    stripeHex: string;
    pantsHex?: string;
    skinHex?: string;
    hairHex?: string;
    hatHex?: string;
    hasScroll?: boolean;
    accentOrbHex?: string;
    isHero?: boolean;
    seed?: number;
  }
): { group: THREE.Group; hitMeshes: THREE.Object3D[] } {
  const b = createBatch(pencil.line);
  let s = seed;
  const next = () => s++;

  // Boots + legs (standing height ~1.72 * scale)
  for (const side of [-1, 1]) {
    b.add(
      ball(1, 2).scale(0.11, 0.08, 0.2).translate(side * 0.14, 0.08, 0.04),
      '#784e2d'
    );
    b.add(
      knead(
        roll(
          [V(side * 0.14, 0.12, 0), V(side * 0.14, 0.44, 0.01), V(side * 0.13, 0.78, 0)],
          (t) => 0.095 + 0.02 * t,
          { around: 8, every: 0.2 }
        ),
        0.005,
        8,
        next()
      ),
      pantsHex,
      [0.9, 0.1, 0.4]
    );
  }

  // Turned torso (jersey/coat with subtle striped accent band)
  const torso = turned(
    [
      [0, 0.72],
      [0.22, 0.74],
      [0.24, 0.96],
      [0.22, 1.2],
      [0.25, 1.38],
      [0.14, 1.46],
      [0, 1.47],
    ],
    18
  ).scale(1.06, 1, 0.82);
  knead(torso, 0.006, 7, next());
  hue(torso, (_x, y) => (Math.floor((y - 0.74) / 0.12) % 2 === 1 ? stripeHex : shirtHex));
  b.add(torso, shirtHex);

  // Scarf / lanyard ring + badge
  b.add(
    roll(ring(V(0, 1.43, 0.01), V(0, 1, -0.1), 0.12, 12), 0.04, { closed: true, around: 6, every: 0.06 }),
    stripeHex
  );
  b.add(block(0.13, 0.16, 0.04, 0.015, 0.1).translate(0, 1.15, 0.22), '#f8f4ea');

  // Arms
  for (const side of [-1, 1]) {
    const handPos =
      side === 1 && hasScroll ? V(0.28, 1.08, 0.26) : V(side * 0.34, 0.92, 0.08);
    b.add(
      roll(
        [V(side * 0.24, 1.37, 0), V(side * 0.32, 1.16, 0.04), handPos],
        (t) => 0.075 - 0.018 * t,
        { around: 8, every: 0.18 }
      ),
      shirtHex
    );
    b.add(ball(0.068, 2).translate(handPos.x, handPos.y, handPos.z), skinHex);
  }

  // Held engineering artifact (blueprint scroll or semantic sphere)
  if (hasScroll && accentOrbHex) {
    b.add(
      roll([V(0.25, 0.96, 0.28), V(0.32, 1.24, 0.32)], 0.045, { around: 8, every: 0.12 }),
      PC_WHITE
    );
    b.add(ball(0.085, 2).translate(0.32, 1.3, 0.32), accentOrbHex);
  }

  // Head + features + hair / beret
  const cy = 1.66;
  b.add(knead(ball(0.2, 3).scale(0.96, 1.02, 0.96), 0.004, 8, next()).translate(0, cy, 0.01), skinHex);
  b.add(ball(0.028, 1).translate(0, cy - 0.02, 0.195), '#eeb08e');
  for (const side of [-1, 1]) {
    b.add(ball(0.024, 1).translate(side * 0.07, cy + 0.03, 0.18), '#232026');
    b.add(ball(0.04, 1).scale(1, 0.8, 0.3).translate(side * 0.115, cy - 0.04, 0.155), '#f29a8e');
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.28 + 1.44 * (i / 8));
    b.add(
      ball(0.08 + 0.015 * (i % 2), 2).translate(
        Math.sin(a) * 0.155,
        cy + 0.05 - 0.04 * Math.abs(Math.cos(a)),
        Math.cos(a) * 0.145 - 0.02
      ),
      hairHex
    );
  }
  if (hatHex) {
    b.add(
      knead(ball(1, 3).scale(0.26, 0.09, 0.26), 0.008, 6, next())
        .rotateZ(0.2)
        .rotateX(-0.16)
        .translate(0.02, cy + 0.15, -0.01),
      hatHex
    );
  }

  const group = new THREE.Group();
  const bodyMesh = b.build();
  if (isHero) {
    group.scale.setScalar(1.32);
  } else {
    group.scale.setScalar(1.1);
  }
  group.add(bodyMesh);
  return { group, hitMeshes: [bodyMesh] };
}

function extrudeOsmPolygon(
  poly: [number, number][],
  height: number,
  wallColor: string,
  roofColor: string,
  scale = 1,
  seedVal = 1
): THREE.BufferGeometry {
  const pts2d: [number, number][] = poly.map(([x, z]) => [x * scale, -z * scale]);
  let signedArea = 0;
  for (let i = 0; i < pts2d.length; i++) {
    const [x1, y1] = pts2d[i];
    const [x2, y2] = pts2d[(i + 1) % pts2d.length];
    signedArea += x1 * y2 - x2 * y1;
  }
  const ordered = signedArea < 0 ? [...pts2d].reverse() : pts2d;

  const shape = new THREE.Shape();
  ordered.forEach(([x, y], idx) => {
    if (idx === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  knead(geo, 0.015, 0.9, seedVal);
  fieldBy(geo, (px, py, pz) => [px * 0.7 + py * 0.4, pz * 0.7 - py * 0.3]);
  hue(geo, (_px, py, _pz, _i, _nx, ny) =>
    ny > 0.65 ? roofColor : py < 0.35 ? darker(wallColor, 0.86) : wallColor
  );
  return geo;
}

function buildTransitStopStructure(
  pencil: PencilSuite,
  mode: TransitMode,
  isHighlighted: boolean,
  nextFn: () => number
): { group: THREE.Group; hitMeshes: THREE.Object3D[] } {
  const b = {
    line: createBatch(pencil.line),
    both: createBatch(pencil.both),
    flat: createBatch(pencil.flat),
  };

  // Architectural paving pad
  b.line.add(
    knead(block(3.8, 0.16, 3.0, 0.04, 0.5), 0.01, 2, nextFn()).translate(0, 0.08, 0),
    '#e7ddc8'
  );

  if (mode === 'metro') {
    // Iconic Länsimetro slanted corten-orange entrance pavilion + white [M] totem
    b.line.add(
      knead(block(2.9, 1.9, 1.9, 0.06, 0.4), 0.015, 1.5, nextFn())
        .rotateX(-0.18)
        .translate(0, 1.0, -0.2),
      '#f97316'
    );
    b.line.add(
      knead(block(2.2, 1.35, 1.4, 0.04, 0.3), 0.01, 2, nextFn()).translate(0, 0.72, 0.25),
      '#2c3e50'
    );
    b.line.add(
      roll([V(-1.55, 0.12, 1.15), V(-1.55, 3.1, 1.15)], 0.08, { around: 6, every: 0.5 }),
      '#475569'
    );
    b.line.add(block(0.85, 0.85, 0.24, 0.05, 0.2).translate(-1.55, 3.2, 1.15), '#ea580c');
  } else if (mode === 'tram') {
    // Raide-Jokeri 15 teal shelter + embedded dual steel rails
    b.flat.add(roll([V(-3.4, 0.09, -1.6), V(3.4, 0.09, -1.6)], 0.045, { around: 4, every: 0.7 }), '#64748b');
    b.flat.add(roll([V(-3.4, 0.09, -1.1), V(3.4, 0.09, -1.1)], 0.045, { around: 4, every: 0.7 }), '#64748b');
    for (const px of [-1.2, 1.2]) {
      b.line.add(roll([V(px, 0.14, 0.5), V(px, 2.25, 0.5)], 0.065, { around: 6, every: 0.5 }), '#0f766e');
    }
    b.line.add(block(3.1, 0.18, 1.35, 0.05, 0.3).translate(0, 2.35, 0.55), '#0d9488');
    b.line.add(block(2.6, 1.25, 0.1, 0.03, 0.3).translate(0, 1.0, 0.85), '#cbd5e1');
  } else if (mode === 'bus') {
    // HSL Blue-and-White Electric Bus 520 shelter + flag post
    for (const px of [-1.15, 1.15]) {
      b.line.add(roll([V(px, 0.14, 0.35), V(px, 2.15, 0.35)], 0.06, { around: 6, every: 0.5 }), '#0284c7');
    }
    b.line.add(block(2.8, 0.16, 1.25, 0.04, 0.3).translate(0, 2.22, 0.4), '#0369a1');
    b.line.add(roll([V(1.6, 0.14, 1.1), V(1.6, 2.85, 1.1)], 0.055, { around: 6, every: 0.5 }), '#475569');
    b.line.add(block(0.65, 0.75, 0.18, 0.04, 0.2).translate(1.6, 2.7, 1.1), '#0ea5e9');
  } else {
    // HSL Yellow City Bike Dock (3 parked yellow bikes + turquoise totem)
    for (const bx of [-0.95, 0, 0.95]) {
      b.line.add(roll(ring(V(bx, 0.38, -0.35), V(0, 0, 1), 0.28, 10), 0.045, { closed: true, around: 4, every: 0.2 }), '#334155');
      b.line.add(roll(ring(V(bx, 0.38, 0.55), V(0, 0, 1), 0.28, 10), 0.045, { closed: true, around: 4, every: 0.2 }), '#334155');
      b.line.add(roll([V(bx, 0.4, -0.35), V(bx, 0.78, 0.12), V(bx, 0.4, 0.55)], 0.05, { around: 5, every: 0.2 }), '#eab308');
      b.line.add(roll([V(bx - 0.18, 0.86, -0.25), V(bx + 0.18, 0.86, -0.25)], 0.035, { around: 4, every: 0.2 }), '#1e293b');
    }
    b.line.add(block(0.45, 1.75, 0.28, 0.04, 0.2).translate(-1.55, 0.95, 0.2), '#f59e0b');
  }

  if (isHighlighted) {
    b.flat.add(
      roll(ring(V(0, 0.14, 0.2), PC_UP, 1.55, 20), 0.035, { closed: true, around: 5, every: 0.6 }),
      mode === 'metro' ? '#f97316' : mode === 'tram' ? '#0d9488' : mode === 'bus' ? '#0284c7' : '#eab308'
    );
  }

  const group = new THREE.Group();
  const hitMeshes: THREE.Object3D[] = [];
  [b.line, b.both, b.flat].forEach((batch) => {
    if (batch.count) {
      const m = batch.build();
      group.add(m);
      hitMeshes.push(m);
    }
  });
  return { group, hitMeshes };
}

function buildTransitVehicleGroup(
  pencil: PencilSuite,
  mode: TransitMode,
  isFluffSpammer: boolean,
  nextFn: () => number
): { group: THREE.Group; wheels: THREE.Object3D[] } {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  if (mode === 'bike') {
    const b = { line: createBatch(pencil.line), both: createBatch(pencil.both), flat: createBatch(pencil.flat) };
    // Yellow HSL City Bike facing +X
    b.line.add(roll([V(-1.05, 0.6, 0), V(-0.15, 1.15, 0), V(0.85, 1.15, 0), V(1.08, 0.58, 0)], 0.065, { around: 6, every: 0.2 }), '#eab308');
    b.line.add(roll([V(-1.05, 0.6, 0), V(0.05, 0.58, 0), V(-0.15, 1.15, 0)], 0.055, { around: 6, every: 0.2 }), '#eab308');
    b.line.add(roll([V(0.85, 1.15, 0), V(0.75, 1.52, -0.35), V(0.75, 1.52, 0.35)], 0.045, { around: 5, every: 0.2 }), '#334155');
    b.line.add(block(0.45, 0.34, 0.52, 0.04, 0.2).translate(1.06, 1.28, 0), '#78350f');
    b.line.add(block(0.38, 0.14, 0.28, 0.04, 0.2).translate(-0.22, 1.24, 0), '#1e293b');
    if (b.line.count) group.add(b.line.build());

    // Spinning spoked wheels
    [-1.05, 1.08].forEach((wx) => {
      const wBatch = createBatch(pencil.line);
      wBatch.add(roll(ring(V(0, 0, 0), V(0, 0, 1), 0.56, 14), 0.075, { closed: true, around: 6, every: 0.2 }), '#1f2937');
      wBatch.add(roll([V(-0.52, 0, 0), V(0.52, 0, 0)], 0.03, { around: 4, every: 0.2 }), '#cbd5e1');
      wBatch.add(roll([V(0, -0.52, 0), V(0, 0.52, 0)], 0.03, { around: 4, every: 0.2 }), '#cbd5e1');
      const wMesh = wBatch.build();
      wMesh.position.set(wx, 0.58, 0);
      group.add(wMesh);
      wheels.push(wMesh);
    });

    const { group: rider } = buildSketchedAvatar(pencil, {
      shirtHex: isFluffSpammer ? '#dc2626' : '#059669',
      stripeHex: isFluffSpammer ? '#fca5a5' : '#fef08a',
      pantsHex: '#2f4f8f',
      hatHex: isFluffSpammer ? '#dc2626' : '#f2c12b',
      hasScroll: false,
      isHero: false,
      seed: 77,
    });
    rider.position.set(-0.22, 0.65, 0);
    rider.rotation.y = Math.PI / 2;
    rider.rotation.z = -0.14;
    group.add(rider);
    return { group, wheels };
  }

  const bodyCol = mode === 'metro' ? '#f97316' : mode === 'tram' ? '#0d9488' : '#0284c7';
  const roofCol = mode === 'metro' ? '#fff7ed' : mode === 'tram' ? '#f8fafc' : '#e0f2fe';
  const length = mode === 'tram' ? 8.2 : 6.6;
  const height = mode === 'bus' ? 2.25 : 2.35;
  const width = 2.15;

  const b = { line: createBatch(pencil.line), flat: createBatch(pencil.flat) };
  // Main streamlined chassis
  b.line.add(
    knead(block(length, height, width, 0.22, 0.45), 0.015, 2, nextFn()).translate(0, height * 0.5 + 0.55, 0),
    bodyCol
  );
  // Roof cap + green EV stripe or pantograph
  b.line.add(
    knead(block(length - 0.5, 0.24, width - 0.24, 0.08, 0.35), 0.01, 2, nextFn()).translate(0, height + 0.58, 0),
    roofCol
  );
  if (mode === 'metro' || mode === 'tram') {
    b.line.add(roll([V(-0.8, height + 0.7, 0), V(0, height + 1.45, 0), V(0.7, height + 0.7, 0)], 0.05, { around: 5, every: 0.25 }), '#475569');
  } else {
    b.line.add(block(2.6, 0.28, 1.35, 0.06, 0.3).translate(-0.4, height + 0.8, 0), '#10b981');
  }

  // Side windows + cute yellow stripe
  const winCount = mode === 'tram' ? 5 : 4;
  for (let i = 0; i < winCount; i++) {
    const wx = -length * 0.34 + i * ((length * 0.68) / Math.max(1, winCount - 1));
    b.line.add(
      block(0.82, 0.72, width + 0.08, 0.04, 0.2).translate(wx, height * 0.5 + 0.85, 0),
      '#bae6fd'
    );
  }
  b.line.add(
    block(0.18, 0.88, width - 0.26, 0.05, 0.2).translate(length * 0.49, height * 0.5 + 0.82, 0),
    '#7dd3fc'
  );
  // Headlight glow buds
  for (const sz of [-0.62, 0.62]) {
    b.line.add(ball(0.16, 1).translate(length * 0.51, 0.92, sz), '#fde047');
  }

  // Priya avatar waving from cabin top / sunroof window!
  const { group: passenger } = buildSketchedAvatar(pencil, {
    shirtHex: isFluffSpammer ? '#dc2626' : '#059669',
    stripeHex: '#fef08a',
    hatHex: '#f2c12b',
    hasScroll: false,
    isHero: false,
    seed: 91,
  });
  passenger.scale.setScalar(0.85);
  passenger.position.set(1.1, height - 0.35, 0);
  passenger.rotation.y = Math.PI / 2;
  group.add(passenger);

  if (b.line.count) group.add(b.line.build());
  if (b.flat.count) group.add(b.flat.build());

  // Spinning wheel bogies
  const wheelXs = mode === 'tram' ? [-2.7, -1.6, 1.6, 2.7] : [-2.0, 2.0];
  wheelXs.forEach((wx) => {
    for (const wz of [-0.95, 0.95]) {
      const wBatch = createBatch(pencil.line);
      wBatch.add(roll(ring(V(0, 0, 0), V(0, 0, 1), 0.36, 12), 0.14, { closed: true, around: 6, every: 0.2 }), '#1f2937');
      wBatch.add(ball(0.14, 1).translate(0, 0, 0), '#cbd5e1');
      const wMesh = wBatch.build();
      wMesh.position.set(wx, 0.4, wz);
      group.add(wMesh);
      wheels.push(wMesh);
    }
  });

  return { group, wheels };
}

function disposeSceneResources(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      mat.dispose();
    }
  });
}

// ============================================================================
// GOOGLE GEMINI 3.5 FLASH-LITE REAL-TIME ENGINE & ACOUSTIC SEMANTIC FEEDBACK
// ============================================================================

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const VALID_CLUSTERS: ClusterName[] = [
  'Edge AI & Robotics',
  'CleanTech & Smart Grid',
  'Quantum & Semiconductors',
  'Bio & HealthTech',
  'Sovereign AI & Cloud Infra',
];

const CLUSTER_RADAR_DEFAULT: Record<ClusterName, { x: number; y: number }> = {
  'Edge AI & Robotics': { x: 0.72, y: 0.76 },
  'Quantum & Semiconductors': { x: 0.84, y: 0.28 },
  'CleanTech & Smart Grid': { x: 0.28, y: 0.8 },
  'Bio & HealthTech': { x: 0.54, y: 0.36 },
  'Sovereign AI & Cloud Infra': { x: 0.24, y: 0.34 },
};

const CLUSTER_ISLAND_MAP: Record<ClusterName, string> = {
  'Edge AI & Robotics': 'island-otaniemi',
  'Quantum & Semiconductors': 'island-keilaniemi',
  'CleanTech & Smart Grid': 'island-kera',
  'Bio & HealthTech': 'island-tapiola',
  'Sovereign AI & Cloud Infra': 'island-tapiola',
};

interface LiveSparkResult {
  spark: string;
  sharedBottleneck: string;
  visitorBubble: string;
  hostBubble: string;
  source: 'live' | 'fallback';
  latencyMs: number;
}

interface ExchangeTurn {
  speaker: 'visitor' | 'host';
  speakerName: string;
  line: string;
}

interface LiveExchangeResult {
  turns: ExchangeTurn[];
  source: 'live' | 'fallback';
  latencyMs: number;
}

interface PitchEvalResult {
  applicant: Applicant;
  bestCompanyId: string;
  bestIslandId: string;
  resonance: number;
  visitorBubble: string;
  reason: string;
  source: 'live' | 'fallback';
  latencyMs: number;
}

const PITCH_PRESETS: Array<{ label: string; kind: 'builder' | 'fluff'; name: string; role: string; pitch: string }> = [
  {
    label: 'Hardware Builder',
    kind: 'builder',
    name: 'Aino Korhonen',
    role: 'FPGA & Cryo-Firmware Engineer',
    pitch:
      'Built deterministic 18ns JESD204B readout pipelines in SystemVerilog + no_std Rust for 4K dilution fridge DAC muxing; measured <11.5mW static dissipation per coax channel with zero frame drops over 72h.',
  },
  {
    label: 'Buzzword Hustler',
    kind: 'fluff',
    name: 'Chadwick Vance',
    role: '10x Quantum-AI Synergy Evangelist',
    pitch:
      'Deploying hyper-scale agentic LLM ecosystems to unlock exponential paradigm shifts across Web3 deep-tech verticals, driving synergistic ecosystem flywheel velocity and 1000x enterprise disruption.',
  },
];

let sharedAudioCtx: AudioContext | null = null;

function playSemanticChime(isMatch: boolean, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    const now = sharedAudioCtx.currentTime;
    const notes = isMatch ? [523.25, 659.25, 783.99, 987.77] : [146.83, 110.0];
    notes.forEach((freq, idx) => {
      if (!sharedAudioCtx) return;
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = isMatch ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(isMatch ? 0.045 : 0.06, now + idx * 0.065 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + (isMatch ? 0.44 : 0.22));
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + (isMatch ? 0.46 : 0.25));
    });
  } catch {
    // Audio playback cleanly ignored when browser blocks autoplay
  }
}

function extractGeminiJson<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> }).candidates;
  const parts = candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textPart = [...parts].reverse().find((p) => !p.thought && typeof p.text === 'string');
  if (!textPart?.text) return null;
  const cleaned = textPart.text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function callGeminiJson<T>(
  prompt: string,
  fallbackFn: () => T,
  externalSignal?: AbortSignal
): Promise<{ data: T; latencyMs: number; source: 'live' | 'fallback' }> {
  const start = performance.now();
  const timeoutCtrl = new AbortController();
  const timer = window.setTimeout(() => timeoutCtrl.abort(), 8500);
  const onExternalAbort = () => timeoutCtrl.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  });

  try {
    let response = await fetch(`/api/gemini/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: timeoutCtrl.signal,
    });

    const staticKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_GEMINI_API_KEY;
    if (response.status === 404 && staticKey) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': staticKey,
          },
          body,
          signal: timeoutCtrl.signal,
        }
      );
    }

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    const parsed = extractGeminiJson<T>(payload);
    if (!parsed) {
      throw new Error('Malformed Gemini JSON response');
    }

    return {
      data: parsed,
      latencyMs: Math.max(1, Math.round(performance.now() - start)),
      source: 'live',
    };
  } catch (err) {
    if (externalSignal?.aborted) {
      throw err;
    }
    return {
      data: fallbackFn(),
      latencyMs: Math.max(1, Math.round(performance.now() - start)),
      source: 'fallback',
    };
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

function buildFallbackNodeSpark(visitor: Applicant, node: NodeDetail): LiveSparkResult {
  const isFluff = visitor.fluffIndex > 60;
  if (isFluff) {
    return {
      spark: `Diagnostic check for ${visitor.name}: Ask for one concrete hardware interface, latency bound, or thermal measurement relevant to ${node.name}.`,
      sharedBottleneck: `Zero physical overlap: ${node.bottleneck}`,
      visitorBubble: 'Let us cross-pollinate our hyper-scale AI synergy flywheel!',
      hostBubble: 'Skip the buzzwords—what latency or thermal constraint did you benchmark?',
      source: 'fallback',
      latencyMs: 12,
    };
  }
  const shortMech = visitor.demonstratedMechanism.split(/[.;(]/)[0].trim().slice(0, 58);
  const shortNode = node.bottleneck.split(/[.;(]/)[0].trim().slice(0, 54);
  return {
    spark: node.spark,
    sharedBottleneck: node.bottleneck,
    visitorBubble: `Benchmarked ${shortMech || visitor.cluster}. Comparing notes!`,
    hostBubble: `How does your stack handle ${shortNode || node.name}?`,
    source: 'fallback',
    latencyMs: 12,
  };
}

async function fetchLiveNodeSpark(
  visitor: Applicant,
  node: NodeDetail,
  signal?: AbortSignal
): Promise<LiveSparkResult> {
  const isFluff = visitor.fluffIndex > 60;
  const hostActor = node.repLabel || node.name;
  const prompt = [
    'You generate crisp, grounded, anti-fluff engineering meetup dialogue in Espoo, Finland.',
    `Visitor: ${visitor.name} (${visitor.role}), Cluster: ${visitor.cluster}, FluffIndex: ${visitor.fluffIndex}%.`,
    `Visitor Verified Mechanism: ${visitor.demonstratedMechanism}`,
    `Visitor Exploration: ${visitor.currentExploration || visitor.role}`,
    `Clicked ${node.kind.toUpperCase()} Node: ${node.name} (${node.subtitle}), Host: ${hostActor}, Resonance: ${node.resonance}%.`,
    `Node Bottlenecks: ${[node.bottleneck, ...node.bottlenecks].slice(0, 3).join(' | ')}`,
    isFluff
      ? 'ANTI-FLUFF MODE: Visitor has high buzzword fluff. Write a funny buzzword-filled visitorBubble (<=11 words), a blunt grounded engineer reply hostBubble asking for concrete constraints (<=11 words), explain zero overlap in sharedBottleneck (<=18 words), and give a sharp reality-check prompt in spark.'
      : 'REAL ENGINEER MODE: Write concrete, non-fluff engineering output naming real numbers/interfaces/tradeoffs. visitorBubble (<=11 words) is what visitor says walking up; hostBubble (<=11 words) is what the host replies; sharedBottleneck (<=18 words) summarizes their overlapping physical bottleneck; spark is a crisp 1-2 sentence technical icebreaker.',
    'Return ONLY JSON with keys: {"spark":string,"sharedBottleneck":string,"visitorBubble":string,"hostBubble":string}.',
  ].join('\n');

  const fallback = () => buildFallbackNodeSpark(visitor, node);
  const res = await callGeminiJson<Partial<LiveSparkResult>>(prompt, fallback, signal);
  const fb = fallback();
  return {
    spark: typeof res.data.spark === 'string' && res.data.spark.trim() ? res.data.spark.trim() : fb.spark,
    sharedBottleneck:
      typeof res.data.sharedBottleneck === 'string' && res.data.sharedBottleneck.trim()
        ? res.data.sharedBottleneck.trim()
        : fb.sharedBottleneck,
    visitorBubble:
      typeof res.data.visitorBubble === 'string' && res.data.visitorBubble.trim()
        ? res.data.visitorBubble.trim()
        : fb.visitorBubble,
    hostBubble:
      typeof res.data.hostBubble === 'string' && res.data.hostBubble.trim()
        ? res.data.hostBubble.trim()
        : fb.hostBubble,
    source: res.source,
    latencyMs: res.latencyMs,
  };
}

async function fetchSimulatedExchange(
  visitor: Applicant,
  node: NodeDetail,
  signal?: AbortSignal
): Promise<LiveExchangeResult> {
  const hostShort = node.repLabel ? node.repLabel.split('·')[0].trim() : node.name;
  const fallback = (): { turns: ExchangeTurn[] } => {
    if (visitor.fluffIndex > 60) {
      return {
        turns: [
          {
            speaker: 'visitor',
            speakerName: visitor.name,
            line: 'Hey! Our autonomous multi-agent paradigm unlocks 100x vertical synergy across your entire roadmap!',
          },
          {
            speaker: 'host',
            speakerName: hostShort,
            line: `Wait—our current blocker is "${node.bottleneck.slice(0, 58)}". What subsystem have you actually shipped?`,
          },
          {
            speaker: 'visitor',
            speakerName: visitor.name,
            line: 'We leverage GPT wrappers in the cloud! Drifting back toward the lounge for coffee...',
          },
        ],
      };
    }
    return {
      turns: [
        {
          speaker: 'visitor',
          speakerName: visitor.name,
          line: `Quick check on your stack—I solved ${visitor.demonstratedMechanism.slice(0, 72)}. Seeing similar headroom here?`,
        },
        {
          speaker: 'host',
          speakerName: hostShort,
          line: `Exactly our pinch point: ${node.bottleneck.slice(0, 72)}. What worst-case jitter did your testbench show?`,
        },
        {
          speaker: 'visitor',
          speakerName: visitor.name,
          line: 'Zero heap allocs in the critical path and deterministic interrupt budgets. Let’s sketch the pipeline over whiteboard!',
        },
      ],
    };
  };

  const prompt = [
    'Generate a crisp 3-turn technical hallway exchange (20-second meetup simulation) at Espoo Junction / Dipoli.',
    `Visitor: ${visitor.name} (${visitor.role}), FluffIndex: ${visitor.fluffIndex}%, Mechanism: ${visitor.demonstratedMechanism}`,
    `Host: ${hostShort} representing ${node.name}, Bottleneck: ${node.bottleneck}`,
    visitor.fluffIndex > 60
      ? 'Speaker has 88% buzzword fluff and zero hardware grounding: turn 1 buzzword pitch, turn 2 polite engineer pinpointing physical constraint, turn 3 awkward buzzword retreat to Dead Zone.'
      : 'Both are serious engineers/scientists: 3 dense, realistic turns (13-22 words each) trading measurements, hardware interfaces, or constraints.',
    'Return ONLY JSON: {"turns":[{"speaker":"visitor","speakerName":string,"line":string},{"speaker":"host","speakerName":string,"line":string},{"speaker":"visitor","speakerName":string,"line":string}]}.',
  ].join('\n');

  const res = await callGeminiJson<{ turns?: ExchangeTurn[] }>(prompt, fallback, signal);
  const validTurns = Array.isArray(res.data.turns) && res.data.turns.length >= 2
    ? res.data.turns.slice(0, 3).map((t, idx) => ({
        speaker: (t.speaker === 'host' ? 'host' : 'visitor') as 'visitor' | 'host',
        speakerName: t.speakerName || (idx === 1 ? hostShort : visitor.name),
        line: typeof t.line === 'string' && t.line.trim() ? t.line.trim() : fallback().turns[idx]?.line || '',
      }))
    : fallback().turns;

  return {
    turns: validTurns,
    source: res.source,
    latencyMs: res.latencyMs,
  };
}

async function fetchTransitSerendipity(
  visitor: Applicant,
  fromDistrict: DistrictId,
  toDistrict: DistrictId,
  mode: TransitMode
): Promise<{ text: string; source: 'live' | 'fallback'; latencyMs: number }> {
  const fromName = DISTRICT_SPECS[fromDistrict].name;
  const toName = DISTRICT_SPECS[toDistrict].name;
  const modeLabel =
    mode === 'metro'
      ? 'Länsimetro M1'
      : mode === 'tram'
      ? 'Raide-Jokeri Light Rail 15'
      : mode === 'bus'
      ? 'HSL Electric Trunk Bus 520'
      : 'Rantaraitti Yellow City Bike';

  const fallback = (): { text: string } => {
    if (visitor.fluffIndex > 60) {
      return {
        text: `Riding ${modeLabel} to ${toName}: two engineers nearby ask what actual benchmark metrics back your slide deck.`,
      };
    }
    if (mode === 'metro') {
      return {
        text: `On ${modeLabel} between ${fromName} & ${toName}, an IQM cryo-architect glances at your notebook: “Still chasing sub-80ns FPGA loops?”`,
      };
    }
    if (mode === 'tram') {
      return {
        text: `Gliding smoothly on ${modeLabel}: a Nokia Bell Labs lead offers tips on zero-copy sensor fusion before your stop.`,
      };
    }
    if (mode === 'bus') {
      return {
        text: `Aboard electric Bus 520 toward Karaportti: Kempower firmware devs share -30°C ISO 15118 winter stress-test insights.`,
      };
    }
    return {
      text: `Breezing along Rantaraitti waterfront bike trail—spotted an ICEYE & VTT meetup group waving near the pier!`,
    };
  };

  const prompt = [
    `Generate a cute, crisp 1-sentence Transit Serendipity encounter (max 22 words) while ${visitor.name} rides ${modeLabel} from ${fromName} to ${toName} in Espoo.`,
    `Visitor skill: ${visitor.demonstratedMechanism} (Fluff: ${visitor.fluffIndex}%).`,
    'Return ONLY JSON: {"text": string}.',
  ].join('\n');

  const res = await callGeminiJson<{ text?: string }>(prompt, fallback);
  const line =
    typeof res.data.text === 'string' && res.data.text.trim()
      ? res.data.text.trim()
      : fallback().text;

  return {
    text: line,
    source: res.source,
    latencyMs: res.latencyMs,
  };
}

function buildFallbackPitchEval(
  name: string,
  role: string,
  pitchText: string,
  companies: CompanyNode[]
): Omit<PitchEvalResult, 'source' | 'latencyMs'> {
  const lower = `${role} ${pitchText}`.toLowerCase();
  const fluffHits = ['synergy', 'paradigm', 'hyper-scale', 'web3', '1000x', '100x', '10x', 'disrupt', 'flywheel', 'agentic', 'metaverse'].filter((k) =>
    lower.includes(k)
  ).length;
  const techHits = ['ns', 'ms', 'mw', 'dma', 'rust', 'verilog', 'fpga', 'cuda', 'cryo', 'pwm', 'sic', 'io_uring', 'isar', 'sar', 'jesd', 'stm32', 'benchmark', 'latency', '4k', '20mk'].filter((k) =>
    lower.includes(k)
  ).length;

  const isFluff = fluffHits >= 2 && techHits <= 1;
  const fluffIndex = isFluff ? Math.min(96, 72 + fluffHits * 6) : Math.max(4, 18 - techHits * 3);
  const competenceScore = isFluff ? Math.max(14, 32 - fluffHits * 4) : Math.min(97, 82 + techHits * 3);

  let cluster: ClusterName = 'Edge AI & Robotics';
  if (/cryo|qubit|fpga|verilog|jesd|quantum|risc-v|dac/.test(lower)) {
    cluster = 'Quantum & Semiconductors';
  } else if (/v2g|grid|sic|pwm|battery|charger|lfp|solar/.test(lower)) {
    cluster = 'CleanTech & Smart Grid';
  } else if (/sar|io_uring|storage|gpu|sovereign|cloud/.test(lower)) {
    cluster = 'Sovereign AI & Cloud Infra';
  } else if (/bio|clinical|cell|genom|assay/.test(lower)) {
    cluster = 'Bio & HealthTech';
  }

  const matchedComp = companies.find((c) => c.cluster === cluster) || companies[0];
  const bestCompanyId = matchedComp?.id || 'comp-nokia-bell';
  const bestIslandId = CLUSTER_ISLAND_MAP[cluster];
  const resonance = isFluff ? 0 : Math.min(96, Math.max(85, competenceScore));
  const demonstratedMechanism = isFluff
    ? 'Unverified buzzword marketing claims without physical constraints'
    : pitchText.trim().slice(0, 110);
  const spark = isFluff
    ? `Dead Zone Isolation (${fluffIndex}% fluff): Ask ${name} for one measurable latency, power, or memory constraint before pairing with R&D pods.`
    : `Semantic match locked onto ${matchedComp?.name || 'Espoo R&D'}: compare "${pitchText.slice(0, 72)}" against "${matchedComp?.actualProblemSpace.slice(0, 72)}".`;

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'live';

  const applicant: Applicant = {
    id: `app-live-${Date.now().toString(36)}`,
    name: name.trim() || 'Live Pitch Guest',
    role: role.trim() || 'Hackathon Builder',
    origin: 'Espoo Live Intake',
    avatarInitials: initials,
    persona: 'Builder / Engineer',
    cluster,
    competenceScore,
    legacyLinkedInScore: isFluff ? 94 : 78,
    fluffIndex,
    evidenceCategory: isFluff ? 'Self-Reported Claims Only' : 'Verified Public Code / Benchmark',
    alignmentType: isFluff ? 'Exploration & High Learning Agility' : 'Direct Bottleneck Match',
    demonstratedMechanism,
    status: isFluff ? 'flagged' : 'approved',
    reviewedBy: 'Gemini 3.5 Flash-Lite Triage',
    reviewedAt: new Date().toISOString(),
    humanReviewerNote: 'Live 3D Semantic Pitch Evaluator',
    linkedInSummaryClaim: role.trim(),
    scenarioPrompt: 'Live 3D Semantic Gravitation Drop',
    scenarioAnswer: pitchText.trim(),
    verifiedArtifacts: [],
    nemotronReasoning: isFluff
      ? 'High buzzword entropy with zero verifiable physical or systems tradeoffs.'
      : 'Strong verifiable mechanisms matching Espoo deep-tech lab bottlenecks.',
    strengths: isFluff ? ['Confident buzzword framing'] : [demonstratedMechanism],
    risksOrFlags: isFluff ? [`${fluffIndex}% synthetic AI fluff`] : [],
    currentExploration: demonstratedMechanism,
    radarCoords: matchedComp?.radarCoords || CLUSTER_RADAR_DEFAULT[cluster],
    sparks: { [bestCompanyId]: spark },
  };

  return {
    applicant,
    bestCompanyId,
    bestIslandId,
    resonance,
    visitorBubble: isFluff
      ? 'Supercharging exponential agentic synergy across Web3 quantum verticals!'
      : `Locking onto ${matchedComp?.name || cluster} with verified measurements!`,
    reason: isFluff
      ? 'High buzzword ratio and zero concrete engineering constraints trigger Dead Zone repulsion.'
      : `Concrete technical mechanisms pull directly toward ${matchedComp?.name || cluster}.`,
  };
}

async function evaluateCustomPitch(
  name: string,
  role: string,
  pitchText: string,
  companies: CompanyNode[]
): Promise<PitchEvalResult> {
  const companyMenu = companies
    .map((c) => `${c.id} | ${c.name} | Cluster: ${c.cluster} | Problem: ${c.actualProblemSpace}`)
    .join('\n');

  const prompt = [
    'You are the strict anti-fluff Semantic Gravitation evaluator for Espoo EventCompass.',
    `Score this attendee pitch:\nName: ${name}\nRole: ${role}\nPitch: ${pitchText}`,
    `Available Espoo R&D Pods:\n${companyMenu}`,
    `Valid cluster values (exact spelling): ${VALID_CLUSTERS.join(' | ')}`,
    'Rules:',
    '- If pitch relies on vague buzzwords (synergy, hyper-scale, web3, 100x, agentic ecosystem, disrupt) with zero real physics/code/benchmarks: fluffIndex 75-96, competenceScore 12-35, resonance 0.',
    '- If pitch cites concrete interfaces, protocols, thermal/latency budgets, benchmarks, or systems mechanisms: fluffIndex 4-20, competenceScore 84-97, resonance 85-97 matched to bestCompanyId.',
    'Return ONLY JSON: {"competenceScore":number,"fluffIndex":number,"cluster":string,"demonstratedMechanism":string,"bestCompanyId":string,"resonance":number,"spark":string,"visitorBubble":string,"reason":string}.',
  ].join('\n');

  const fallback = () => buildFallbackPitchEval(name, role, pitchText, companies);

  interface GeminiPitchJson {
    competenceScore?: number;
    fluffIndex?: number;
    cluster?: string;
    demonstratedMechanism?: string;
    bestCompanyId?: string;
    resonance?: number;
    spark?: string;
    visitorBubble?: string;
    reason?: string;
  }

  const res = await callGeminiJson<GeminiPitchJson>(prompt, fallback);
  const fb = fallback();
  const raw = res.data;

  const fluffIndex =
    typeof raw.fluffIndex === 'number' && Number.isFinite(raw.fluffIndex)
      ? Math.max(0, Math.min(99, Math.round(raw.fluffIndex)))
      : fb.applicant.fluffIndex;
  const isFluff = fluffIndex > 60;
  const competenceScore =
    typeof raw.competenceScore === 'number' && Number.isFinite(raw.competenceScore)
      ? Math.max(5, Math.min(99, Math.round(raw.competenceScore)))
      : fb.applicant.competenceScore;
  const cluster = VALID_CLUSTERS.find((c) => c.toLowerCase() === String(raw.cluster || '').toLowerCase()) || fb.applicant.cluster;
  const matchedCompany = companies.find((c) => c.id === raw.bestCompanyId) || companies.find((c) => c.cluster === cluster) || companies[0];
  const bestCompanyId = matchedCompany?.id || fb.bestCompanyId;
  const bestIslandId = CLUSTER_ISLAND_MAP[cluster];
  const resonance = isFluff
    ? 0
    : typeof raw.resonance === 'number' && Number.isFinite(raw.resonance)
    ? Math.max(70, Math.min(98, Math.round(raw.resonance)))
    : fb.resonance;
  const rawMech =
    typeof raw.demonstratedMechanism === 'string' ? raw.demonstratedMechanism.trim() : '';
  const demonstratedMechanism =
    rawMech && !/^(none|n\/a|null|nil|unknown|-)$/i.test(rawMech)
      ? rawMech
      : fb.applicant.demonstratedMechanism;
  const spark = typeof raw.spark === 'string' && raw.spark.trim() ? raw.spark.trim() : fb.applicant.sparks[fb.bestCompanyId] || '';
  const visitorBubble =
    typeof raw.visitorBubble === 'string' && raw.visitorBubble.trim()
      ? raw.visitorBubble.trim()
      : fb.visitorBubble;
  const reason = typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : fb.reason;

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'LP';

  const applicant: Applicant = {
    ...fb.applicant,
    id: `app-live-${Date.now().toString(36)}`,
    name: name.trim() || 'Live Pitch Guest',
    role: role.trim() || 'Hackathon Builder',
    avatarInitials: initials,
    cluster,
    competenceScore,
    fluffIndex,
    evidenceCategory: isFluff ? 'Self-Reported Claims Only' : 'Verified Public Code / Benchmark',
    alignmentType: isFluff ? 'Exploration & High Learning Agility' : 'Direct Bottleneck Match',
    demonstratedMechanism,
    status: isFluff ? 'flagged' : 'approved',
    nemotronReasoning: reason,
    currentExploration: demonstratedMechanism,
    radarCoords: matchedCompany?.radarCoords || CLUSTER_RADAR_DEFAULT[cluster],
    sparks: { [bestCompanyId]: spark },
  };

  return {
    applicant,
    bestCompanyId,
    bestIslandId,
    resonance,
    visitorBubble,
    reason,
    source: res.source,
    latencyMs: res.latencyMs,
  };
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export const EspooMetaverse: React.FC<EspooMetaverseProps> = ({ applicants, companies }) => {
  const baseApplicants = useMemo(() => normalizeApplicantsList(applicants), [applicants]);
  const [customApplicants, setCustomApplicants] = useState<Applicant[]>([]);
  const mergedApplicants = useMemo(
    () => [...customApplicants, ...baseApplicants],
    [customApplicants, baseApplicants]
  );
  const mergedCompanies = useMemo(() => normalizeCompaniesList(companies), [companies]);

  const [sceneMode, setSceneMode] = useState<SceneMode>('city');
  const [currentDistrict, setCurrentDistrict] = useState<DistrictId>('otaniemi');
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>('app-01');
  const [cinematicMode, setCinematicMode] = useState<boolean>(false);
  const [pullSeed, setPullSeed] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [nearbyNode, setNearbyNode] = useState<NodeDetail | null>(null);
  const [uiNodes, setUiNodes] = useState<NodeDetail[]>([]);

  // Public Transit Cutscene & Green Mobility Tracker
  const [activeCutscene, setActiveCutscene] = useState<ActiveCutscene | null>(null);
  const [greenStats, setGreenStats] = useState<{ trips: number; co2SavedGrams: number }>({
    trips: 1,
    co2SavedGrams: 420,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSparkPreviewBubble, setShowSparkPreviewBubble] = useState<boolean>(false);
  const fullscreenWrapperRef = useRef<HTMLDivElement>(null);
  const sparkPreviewTimerRef = useRef<number | null>(null);

  // Gemini 3.5 Flash-Lite Live Inference State
  const [liveSparks, setLiveSparks] = useState<Record<string, LiveSparkResult>>({});
  const [sparkLoadingKey, setSparkLoadingKey] = useState<string | null>(null);
  const [geminiStatus, setGeminiStatus] = useState<'ready' | 'thinking' | 'live' | 'fallback'>(
    'ready'
  );
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // 20-Second Simulated Exchange State
  const [exchangeState, setExchangeState] = useState<{
    key: string;
    loading: boolean;
    playing: boolean;
    activeIdx: number;
    result: LiveExchangeResult | null;
  }>({
    key: '',
    loading: false,
    playing: false,
    activeIdx: 0,
    result: null,
  });

  // Live "Drop Your Pitch" Evaluator Drawer State
  const [pitchDrawerOpen, setPitchDrawerOpen] = useState<boolean>(false);
  const [pitchName, setPitchName] = useState<string>(PITCH_PRESETS[0].name);
  const [pitchRole, setPitchRole] = useState<string>(PITCH_PRESETS[0].role);
  const [pitchText, setPitchText] = useState<string>(PITCH_PRESETS[0].pitch);
  const [pitchSubmitting, setPitchSubmitting] = useState<boolean>(false);
  const [lastPitchEval, setLastPitchEval] = useState<{
    applicantId: string;
    name: string;
    fluffIndex: number;
    competenceScore: number;
    reason: string;
    source: 'live' | 'fallback';
    latencyMs: number;
  } | null>(null);

  const selectedVisitor = useMemo(
    () => mergedApplicants.find((a) => a.id === selectedVisitorId) || mergedApplicants[0],
    [mergedApplicants, selectedVisitorId]
  );

  const mountRef = useRef<HTMLDivElement>(null);
  const cinematicRef = useRef<boolean>(cinematicMode);
  const manualLockedRef = useRef<boolean>(false);
  const autoSelectedOnceRef = useRef<boolean>(false);
  const labelDomRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visitorLabelRef = useRef<HTMLDivElement | null>(null);
  const visitorBubbleRef = useRef<HTMLDivElement | null>(null);
  const hostBubbleRef = useRef<HTMLDivElement | null>(null);
  const cutsceneBubbleRef = useRef<HTMLDivElement | null>(null);
  const cutsceneVehiclePosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 2.3, 0));
  const activeNodeIdRef = useRef<string | null>(null);
  const deadZoneLabelRef = useRef<HTMLDivElement | null>(null);

  // Playable Character Movement & Mobile/Desktop Input Refs
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 8.2));
  const playerTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const pendingInteractNodeRef = useRef<WorldNodeRecord | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const mobileMoveDirRef = useRef<{ dx: number; dz: number }>({ dx: 0, dz: 0 });
  const prevNearbyIdRef = useRef<string | null>(null);
  const nearbyNodeRef = useRef<NodeDetail | null>(null);
  nearbyNodeRef.current = nearbyNode;
  const activeCardNodeRef = useRef<NodeDetail | null>(null);
  const activeCutsceneRef = useRef<ActiveCutscene | null>(activeCutscene);
  activeCutsceneRef.current = activeCutscene;
  const cutsceneTimerRef = useRef<number | null>(null);

  const liveSparksRef = useRef<Record<string, LiveSparkResult>>(liveSparks);
  liveSparksRef.current = liveSparks;
  const sparkAbortRef = useRef<AbortController | null>(null);
  const sparkInFlightKeyRef = useRef<string | null>(null);
  const exchangeAbortRef = useRef<AbortController | null>(null);
  const exchangeRequestKeyRef = useRef<string>('');
  const audioEnabledRef = useRef<boolean>(audioEnabled);
  audioEnabledRef.current = audioEnabled;
  const selectedVisitorRef = useRef<Applicant>(selectedVisitor);
  selectedVisitorRef.current = selectedVisitor;

  const worldNodesRef = useRef<WorldNodeRecord[]>([]);
  const cameraStateRef = useRef<{
    azimuth: number;
    polar: number;
    distance: number;
    target: THREE.Vector3;
    isDragging: boolean;
    lastX: number;
    lastY: number;
  }>({
    azimuth: 0.2,
    polar: 0.94,
    distance: 38,
    target: new THREE.Vector3(0, 1.4, 5),
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    cinematicRef.current = cinematicMode;
  }, [cinematicMode]);

  useEffect(() => {
    manualLockedRef.current = false;
    autoSelectedOnceRef.current = false;
    setSelectedNode(null);
    setNearbyNode(null);
    prevNearbyIdRef.current = null;
    playerTargetPosRef.current = null;
    pendingInteractNodeRef.current = null;
    if (sceneMode === 'venue') {
      playerPosRef.current.set(0, 0, 14.5);
    } else {
      const [ax, az] = DISTRICT_SPECS[currentDistrict].arrivalPos;
      playerPosRef.current.set(ax, 0, az);
    }
    exchangeAbortRef.current?.abort();
    setExchangeState({ key: '', loading: false, playing: false, activeIdx: 0, result: null });
  }, [selectedVisitorId, sceneMode, currentDistrict, pullSeed]);

  const handleSelectNode = useCallback((node: NodeDetail) => {
    manualLockedRef.current = true;
    setSelectedNode(node);
    setExchangeState((prev) => (prev.playing ? { ...prev, playing: false } : prev));
    const visitor = selectedVisitorRef.current;
    playSemanticChime(visitor.fluffIndex <= 60 && node.resonance > 50, audioEnabledRef.current);
  }, []);

  const finishTransitCutscene = useCallback((cutscene: ActiveCutscene) => {
    if (cutsceneTimerRef.current !== null) {
      window.clearTimeout(cutsceneTimerRef.current);
      cutsceneTimerRef.current = null;
    }
    setGreenStats((prev) => ({
      trips: prev.trips + 1,
      co2SavedGrams: prev.co2SavedGrams + cutscene.co2SavedGrams,
    }));
    setActiveCutscene(null);
    setSceneMode('city');
    setCurrentDistrict(cutscene.toDistrict);
    playSemanticChime(true, audioEnabledRef.current);
  }, []);

  const startTransitCutscene = useCallback(
    (toDistrict: DistrictId, overrideMode?: TransitMode) => {
      if (cutsceneTimerRef.current !== null) {
        window.clearTimeout(cutsceneTimerRef.current);
        cutsceneTimerRef.current = null;
      }

      const fromDistrict = currentDistrict;
      const routeKey = `${fromDistrict}->${toDistrict}` as `${DistrictId}->${DistrictId}`;
      const baseMeta = TRANSIT_TRIP_META[routeKey];
      const mode: TransitMode = overrideMode || baseMeta.mode;
      const co2SavedGrams =
        mode === 'bike'
          ? 480
          : mode === 'metro'
          ? 420
          : mode === 'tram'
          ? 780
          : 890;
      const lineLabel =
        overrideMode === 'bike'
          ? `HSL City Bike · Rantaraitti → ${DISTRICT_SPECS[toDistrict].shortName}`
          : overrideMode === 'tram'
          ? `Raide-Jokeri 15 · → ${DISTRICT_SPECS[toDistrict].shortName}`
          : overrideMode === 'metro'
          ? `Länsimetro M1 · → ${DISTRICT_SPECS[toDistrict].shortName}`
          : overrideMode === 'bus'
          ? `HSL Electric Bus 520 · → ${DISTRICT_SPECS[toDistrict].shortName}`
          : baseMeta.lineLabel;

      const initialText =
        mode === 'metro'
          ? `All aboard Länsimetro M1 to ${DISTRICT_SPECS[toDistrict].name}! Listening for sub-80ns engineering chatter...`
          : mode === 'tram'
          ? `Gliding aboard Raide-Jokeri 15 toward ${DISTRICT_SPECS[toDistrict].name} — zero-emission light rail link!`
          : mode === 'bus'
          ? `Boarding HSL Electric Bus 520 (0g tailpipe CO₂) bound for ${DISTRICT_SPECS[toDistrict].name}!`
          : `Pedaling a yellow HSL City Bike along Espoo’s scenic Rantaraitti toward ${DISTRICT_SPECS[toDistrict].name}!`;

      const initialCutscene: ActiveCutscene = {
        mode,
        fromDistrict,
        toDistrict,
        co2SavedGrams,
        durationMinutes: baseMeta.durationMinutes,
        lineLabel,
        serendipityText: initialText,
      };

      setActiveCutscene(initialCutscene);
      playSemanticChime(true, audioEnabledRef.current);

      void fetchTransitSerendipity(selectedVisitorRef.current, fromDistrict, toDistrict, mode).then(
        (res) => {
          setLastLatencyMs(res.latencyMs);
          setGeminiStatus(res.source === 'live' ? 'live' : 'fallback');
          setActiveCutscene((curr) =>
            curr && curr.toDistrict === toDistrict && curr.mode === mode
              ? { ...curr, serendipityText: res.text, source: res.source, latencyMs: res.latencyMs }
              : curr
          );
        }
      );

      cutsceneTimerRef.current = window.setTimeout(() => {
        finishTransitCutscene(initialCutscene);
      }, 3400);
    },
    [currentDistrict, finishTransitCutscene]
  );

  useEffect(() => {
    return () => {
      if (cutsceneTimerRef.current !== null) {
        window.clearTimeout(cutsceneTimerRef.current);
      }
      if (sparkPreviewTimerRef.current !== null) {
        window.clearTimeout(sparkPreviewTimerRef.current);
      }
    };
  }, []);

  const wasNativeFullscreenRef = useRef<boolean>(false);

  const toggleFullscreen = useCallback(() => {
    const el = fullscreenWrapperRef.current;
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (el && !document.fullscreenElement && el.requestFullscreen) {
          void el.requestFullscreen().catch(() => {
            // Keep CSS fixed-viewport fullscreen active when native fullscreen is blocked
          });
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          void document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const hasNative = Boolean(document.fullscreenElement);
      if (hasNative) {
        wasNativeFullscreenRef.current = true;
        setIsFullscreen(true);
      } else if (wasNativeFullscreenRef.current) {
        wasNativeFullscreenRef.current = false;
        setIsFullscreen(false);
      }
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    return () => window.clearTimeout(t);
  }, [isFullscreen]);

  useEffect(() => {
    const moveKeys = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'KeyF') {
        e.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (e.code === 'Escape' && !document.fullscreenElement) {
        setIsFullscreen(false);
        return;
      }

      if (moveKeys.has(e.code)) {
        if (e.code.startsWith('Arrow')) e.preventDefault();
        pressedKeysRef.current.add(e.code);
      } else if (e.code === 'KeyE' && !activeCutsceneRef.current) {
        const target = nearbyNodeRef.current || activeCardNodeRef.current;
        if (!target) return;
        if (target.kind === 'transit') {
          const nextDist =
            target.targetDistricts?.[0] ||
            (currentDistrict === 'otaniemi'
              ? 'keilaniemi'
              : currentDistrict === 'keilaniemi'
              ? 'kera'
              : 'otaniemi');
          startTransitCutscene(nextDist, target.transitMode);
        } else if (target.canEnterVenue && sceneMode === 'city') {
          setSceneMode('venue');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.code);
    };

    const onBlur = () => {
      pressedKeysRef.current.clear();
      mobileMoveDirRef.current = { dx: 0, dz: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [currentDistrict, sceneMode, startTransitCutscene, toggleFullscreen]);

  const activeCutsceneMode = activeCutscene?.mode || null;
  const activeCutsceneTo = activeCutscene?.toDistrict || null;

  // Build and run the authentic @blendi/coloured-pencil 3D World & Post-Processing Pipeline
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth || 960, 1);
    const height = Math.max(container.clientHeight || 640, 1);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.3, 2500);
    const initTarget = activeCutsceneMode
      ? new THREE.Vector3(0, 1.5, 0)
      : new THREE.Vector3(playerPosRef.current.x, 1.4, playerPosRef.current.z);
    cameraStateRef.current = {
      azimuth: activeCutsceneMode ? 0.22 : sceneMode === 'city' ? 0.18 : 0.14,
      polar: activeCutsceneMode ? 1.24 : 0.94,
      distance: activeCutsceneMode ? 16 : sceneMode === 'city' ? 37 : 40,
      target: initTarget,
      isDragging: false,
      lastX: 0,
      lastY: 0,
    };

    // Match @blendi/coloured-pencil renderer configuration (multisampled half-float target + page.js gamma)
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pencil = createPencil();
    const page = createPage(renderer);
    const bufSize = new THREE.Vector2();
    const syncStrokeSpacing = () => {
      renderer.getDrawingBufferSize(bufSize);
      pencil.px.value = (4.6 * Math.max(1, bufSize.y)) / 1080;
    };
    syncStrokeSpacing();

    // Bright Scandinavian coastal morning light rig (PI units match MeshLambertMaterial reflectance)
    const sunLight = new THREE.DirectionalLight('#ffffff', Math.PI * 1.25);
    sunLight.position.copy(PC_SUN).multiplyScalar(68);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunLight.shadow.camera, {
      left: -38,
      right: 38,
      top: 34,
      bottom: -34,
      near: 5,
      far: 160,
    });
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.03;
    sunLight.shadow.radius = 2.5;
    scene.add(
      sunLight,
      sunLight.target,
      new THREE.AmbientLight('#ffffff', Math.PI * 0.27),
      new THREE.HemisphereLight('#ffffff', '#000000', Math.PI * 0.2)
    );

    const rand = pcRng(20261114);
    let seed = 100;
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];

    const line = createBatch(pencil.line);
    const both = createBatch(pencil.both);
    const flat = createBatch(pencil.flat);

    const kit: SketchKit = {
      line,
      both,
      flat,
      rand,
      next: () => seed++,
      pick,
    };

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const own = (make: (b: { line: PencilBatch; both: PencilBatch; flat: PencilBatch }) => void) => {
      const b = {
        line: createBatch(pencil.line),
        both: createBatch(pencil.both),
        flat: createBatch(pencil.flat),
      };
      const g = new THREE.Group();
      make(b);
      if (b.line.count) g.add(b.line.build());
      if (b.both.count) g.add(b.both.build());
      if (b.flat.count) g.add(b.flat.build());
      return g;
    };

    const uTime = { value: 0 };
    const uSun = { value: PC_SUN };
    const moving: Array<(dt: number, elapsed: number, cam: THREE.PerspectiveCamera) => void> = [];
    const boatMirrors = Array.from({ length: 6 }, () => new THREE.Vector3(0, -999, 1));
    const boatColors = Array.from({ length: 6 }, () => new THREE.Color('#f8f4ea'));
    let boatCount = 0;

    // ------------------------------------------------------------------------
    // @blendi Coloured-Pencil Sky Dome (bare-paper clouds + slanting pencil strokes)
    // ------------------------------------------------------------------------
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 40, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { uPx: pencil.px, uSun: uSun, uTime: uTime },
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir; uniform vec3 uSun; uniform float uTime;
          ${PENCIL_GLSL}
          ${PC_SKY_NOISE}
          void main() {
            vec3 d = normalize(vDir);
            float e = asin(clamp(d.y, -1.0, 1.0)), up = smoothstep(0.0, 0.8, d.y);
            vec2 c = d.xz / (abs(d.y) + 0.3) * 1.2 + vec2(uTime * 0.004, 0.0);
            float m = skyFbm(c * vec2(0.7, 1.25) + 3.0), cloud = smoothstep(0.5, 0.6, m) * smoothstep(0.0, 0.09, d.y);
            vec3 blue = mix(vec3(0.36, 0.62, 0.92), vec3(0.16, 0.38, 0.84), up);
            float tooth = pcTooth(d * 11.0);
            vec3 left = vec3(1.0);
            left *= mix(vec3(1.0), blue, clamp((0.3 + 0.4 * up) * (1.0 - cloud) * (0.5 + 0.85 * tooth), 0.0, 1.0));
            left *= mix(vec3(1.0), blue, clamp(pcStrokes(e * 26.0 + d.x * 9.0 + d.z * 5.0, (0.4 + 0.4 * up) * (1.0 - cloud)) * (0.5 + 0.8 * tooth) * 0.85, 0.0, 1.0));
            left *= mix(vec3(1.0), vec3(0.55, 0.56, 0.8), clamp(pcStrokes(e * 30.0 - d.x * 8.0, cloud * smoothstep(0.6, 0.78, m) * 0.7) * (0.5 + 0.7 * tooth) * 0.7, 0.0, 1.0));
            left *= mix(vec3(1.0), vec3(1.0, 0.86, 0.5), 0.3 * exp(-acos(clamp(dot(d, uSun), -1.0, 1.0)) * 2.6) * (0.6 + 0.6 * tooth));
            gl_FragColor = vec4(left, 1.0);
          }`,
      })
    );
    skyMesh.frustumCulled = false;
    rootGroup.add(skyMesh);
    moving.push((_dt, _el, cam) => skyMesh.position.copy(cam.position));

    // ------------------------------------------------------------------------
    // @blendi Coloured-Pencil Baltic Sea (horizontal level-line strokes & bare-paper sun glints)
    // ------------------------------------------------------------------------
    const seaGeo = new THREE.CircleGeometry(1300, 72).rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(
      seaGeo,
      new THREE.ShaderMaterial({
        uniforms: {
          uPx: pencil.px,
          uSun: uSun,
          uTime: uTime,
          uBoat: { value: boatMirrors },
          uBoatC: { value: boatColors },
        },
        vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          varying vec3 vW; uniform vec3 uSun; uniform float uTime;
          uniform vec3 uBoat[6]; uniform vec3 uBoatC[6];
          ${PENCIL_GLSL}
          void main() {
            vec2 p = vW.xz;
            float far = length(p - cameraPosition.xz);
            float sw = 0.48 * sin(p.x * 0.32 + p.y * 0.14 + uTime * 0.5) + 0.25 * sin(p.x * 0.78 - uTime * 0.75 + p.y * 0.38) + 0.11 * sin(p.x * 1.9 + uTime * 1.15 + p.y * 1.2);
            float h = p.y + sw * 0.3;
            vec3 local = mix(vec3(0.08, 0.5, 0.58), vec3(0.07, 0.27, 0.64), smoothstep(10.0, 120.0, far));
            vec3 eye = cameraPosition;
            float ripple = smoothstep(-0.25, 0.25, sin(p.y * 5.0 + sw * 5.8 + uTime * 0.9) + 0.5 * sin(p.y * 12.0 - uTime * 1.5 + p.x));
            for (int i = 0; i < 6; i++) {
              vec2 toEye = normalize(eye.xz - uBoat[i].xy + vec2(1e-5)), q = p - uBoat[i].xy - toEye * 1.2 * uBoat[i].z;
              float al = dot(q, toEye), ac = dot(q, vec2(-toEye.y, toEye.x)) + 0.12 * sin(al * 5.5 + uTime * 1.4);
              float inB = 1.0 - smoothstep(0.7, 1.0, length(vec2(ac / (0.68 * uBoat[i].z), al / (1.55 * uBoat[i].z))));
              local = mix(local, uBoatC[i] * 0.85, inB * 0.55 * (0.55 + 0.45 * ripple));
            }
            float D = clamp(0.36 + 0.22 * sin(p.y * 0.75 + sw * 2.0 + uTime * 0.3) + 0.18 * (1.0 - smoothstep(2.0, 48.0, far)), 0.0, 1.0);
            float bare = smoothstep(0.62, 0.8, pcNoise(vec3(p * vec2(0.42, 1.8) + vec2(uTime * 0.18, 0.0), uTime * 0.22))) * (1.0 - 0.6 * smoothstep(65.0, 280.0, far));
            float tooth = pcTooth(vec3(p.x, 0.0, p.y) * 0.55);
            vec3 left = vec3(1.0);
            left *= mix(vec3(1.0), local, clamp((0.38 + 0.34 * D) * (0.5 + 0.85 * tooth) * (1.0 - 0.85 * bare), 0.0, 1.0));
            left *= mix(vec3(1.0), local, clamp(pcStrokes(h, 0.48 + 0.34 * D) * (0.58 + 0.72 * tooth) * (1.0 - 0.9 * bare), 0.0, 1.0));
            left *= mix(vec3(1.0), vec3(0.08, 0.14, 0.52), clamp(pcStrokes(h + 0.37 + 0.2 * sin(p.x * 0.55), clamp((D - 0.42) * 1.45, 0.0, 0.68)) * (0.5 + 0.7 * tooth) * 0.85, 0.0, 1.0));
            gl_FragColor = vec4(left, 1.0);
          }`,
      })
    );
    seaMesh.position.y = activeCutsceneMode
      ? -0.45
      : sceneMode === 'city'
      ? DISTRICT_SPECS[currentDistrict].waterEastX !== null
        ? -0.35
        : -3.4
      : -1.1;
    seaMesh.frustumCulled = false;
    rootGroup.add(seaMesh);

    const dynamicSpinners: { mesh: THREE.Object3D; baseY: number }[] = [];
    const nodeRecords: WorldNodeRecord[] = [];
    const buildingColliders: Array<{ x: number; z: number; r: number }> = [];
    const isFluffSpammer = selectedVisitor.fluffIndex > 60;

    // Helper: Animated Bunting flags strung between two points
    const addBunting = (pA: THREE.Vector3, pB: THREE.Vector3) => {
      const len = pA.distanceTo(pB);
      const at = (t: number) =>
        pA
          .clone()
          .lerp(pB, t)
          .add(V(0, -0.85 * 4 * t * (1 - t) * (len / 10), 0));
      flat.add(
        roll(
          Array.from({ length: 11 }, (_, i) => at(i / 10)),
          0.015,
          { around: 4, every: 0.7 }
        ),
        '#6a655c'
      );
      const FLAGS = ['#e8554e', '#f2c12b', '#4f9bd8', '#59a640', '#f08a3c', PC_WHITE];
      const side = pB.clone().sub(pA).setY(0).normalize();
      const pos: number[] = [];
      const col: number[] = [];
      const c = new THREE.Color();
      let fi = 0;
      for (let d = 0.45; d < len - 0.45; d += 0.55) {
        const p = at(d / len);
        const q = at((d + 0.36) / len);
        const tip = p
          .clone()
          .lerp(q, 0.5)
          .add(V(side.z * 0.04 * Math.sin(fi), -0.4, -side.x * 0.04 * Math.sin(fi)));
        pos.push(p.x, p.y, p.z, q.x, q.y, q.z, tip.x, tip.y, tip.z);
        c.set(FLAGS[fi++ % FLAGS.length]);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      const flagsMesh = new THREE.Mesh(field(g), pencil.both);
      flagsMesh.castShadow = true;
      flagsMesh.frustumCulled = false;
      rootGroup.add(flagsMesh);
      const rest = Float32Array.from(pos);
      const P = g.attributes.position as THREE.BufferAttribute;
      const nx = side.z;
      const nz = -side.x;
      moving.push((_dt, t) => {
        for (let i = 0; i < P.count / 3; i++) {
          const gust = 0.55 + 0.45 * Math.sin(t * 0.7 - i * 0.35);
          const sw = gust * (0.06 + 0.16 * Math.sin(t * 3.2 - i * 0.9));
          const j = (i * 3 + 2) * 3;
          P.array[j] = rest[j] + nx * sw;
          P.array[j + 1] = rest[j + 1] + (sw * sw) / 0.84;
          P.array[j + 2] = rest[j + 2] + nz * sw;
        }
        P.needsUpdate = true;
      });
    };

    // Helper: Hand-kneaded Boat from world.js
    const addBoat = (
      x: number,
      z: number,
      yaw: number,
      hullColour: string,
      trimColour: string,
      mast = true,
      scale = 1
    ) => {
      if (boatCount < 6) {
        boatMirrors[boatCount].set(x, z, scale);
        boatColors[boatCount++].set(hullColour);
      }
      const g = own((b) => {
        const hull = ball(1, 3).scale(0.62, 0.44, 1.45);
        const p = hull.attributes.position as THREE.BufferAttribute;
        const inside: boolean[] = [];
        for (let i = 0; i < p.count; i++) {
          const up = p.getY(i) > 1e-4;
          inside.push(up);
          if (up) {
            p.setY(
              i,
              -0.2 * Math.max(0, 1 - (p.getX(i) / 0.62) ** 2 - (p.getZ(i) / 1.45) ** 2)
            );
          }
        }
        hull.computeVertexNormals();
        knead(hull, 0.01, 3, seed++);
        hue(hull, (_px, py, _pz, i) => (inside[i] ? '#ead9b4' : py < -0.28 ? '#8a3a30' : hullColour));
        b.line.add(field(hull, [0.15, 1, 0.1], [0.3, 0.4, 1]));
        b.line.add(
          roll(
            Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * TAU;
              return V(Math.cos(a) * 0.62, 0.02, Math.sin(a) * 1.45);
            }),
            0.05,
            { closed: true, around: 6, every: 0.25 }
          ),
          trimColour
        );
        b.line.add(block(1.0, 0.06, 0.26, 0.025, 0.2).translate(0, -0.04, -0.22), '#b98a52');
        b.line.add(block(0.88, 0.06, 0.24, 0.025, 0.2).translate(0, -0.04, 0.56), '#b98a52');
        if (mast) {
          b.line.add(
            roll([V(0, -0.1, 0.24), V(0, 3.2, 0.24)], 0.045, { around: 6, every: 0.8 }),
            '#96673c'
          );
          b.line.add(
            roll([V(0, 0.62, 0.24), V(0, 0.68, -1.2)], 0.03, { around: 6, every: 0.6 }),
            '#96673c'
          );
          const sail = new THREE.BufferGeometry();
          sail.setAttribute(
            'position',
            new THREE.Float32BufferAttribute([0, 0.72, 0.2, 0, 0.74, -1.1, 0.14, 3.05, 0.2], 3)
          );
          b.both.add(sail, PC_WHITE, [0.2, 1, 0.3], [0, 0.4, 1]);
        }
      });
      g.scale.setScalar(scale);
      g.position.set(x, 0.25 * scale, z);
      g.rotation.order = 'YXZ';
      g.rotation.y = yaw;
      rootGroup.add(g);
      const ph = rand() * 6;
      moving.push((_dt, t) => {
        g.position.y = 0.25 * scale + 0.04 * Math.sin(t * 1.1 + ph);
        g.rotation.x = 0.03 * Math.sin(t * 0.9 + ph);
        g.rotation.z = 0.05 * Math.sin(t * 0.7 + ph * 2);
      });
    };

    // Helper: Dead Zone Terracotta-Crimson Reef / Floor Pad
    const addDeadZonePad = (yBase: number) => {
      const dzDisk = turned(
        [
          [0, 0],
          [4.2, 0],
          [4.3, 0.24],
          [4.0, 0.32],
          [0, 0.32],
        ],
        24
      );
      knead(dzDisk, 0.025, 1.2, seed++, 4, 0.5);
      fieldBy(dzDisk, (px, _py, pz) => [px * 1.3 + pz * 1.3, px * 1.3 - pz * 1.3]);
      hue(dzDisk, (px, py, pz) => {
        const stripe = Math.abs(((px + pz) * 0.85) % 1.4) < 0.28;
        if (py < 0.12) return '#b57b72';
        return stripe ? '#dc2626' : '#f5ddd8';
      });
      dzDisk.translate(DEAD_ZONE_POS.x, yBase, DEAD_ZONE_POS.z);
      line.add(dzDisk);
      line.add(
        roll(
          ring(V(DEAD_ZONE_POS.x, yBase + 0.34, DEAD_ZONE_POS.z), PC_UP, 4.15, 22),
          0.075,
          { closed: true, around: 6, every: 0.4 }
        ),
        '#dc2626'
      );
      // Warning bollards round the Dead Zone perimeter
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        const bx = DEAD_ZONE_POS.x + Math.cos(a) * 3.85;
        const bz = DEAD_ZONE_POS.z + Math.sin(a) * 3.85;
        line.add(
          put(
            turned([[0, 0], [0.16, 0], [0.14, 0.48], [0, 0.52]], 10),
            bx,
            yBase + 0.3,
            bz
          ),
          i % 2 === 0 ? '#e8554e' : PC_WHITE
        );
      }
    };

    if (activeCutsceneMode) {
      // ════════════════════════════════════════════════════════════════════════
      // 3.2-SECOND CUTE 3D TRANSIT CUTSCENE STAGE (METRO / TRAM / BUS / BIKE)
      // ════════════════════════════════════════════════════════════════════════
      const isWaterRoute = activeCutsceneMode === 'metro' || activeCutsceneMode === 'bike';

      // Diorama elevated track / waterfront pier promenade
      const deckW = 64;
      const deckColor = isWaterRoute ? '#c9a675' : '#8dad76';
      const deck = knead(block(deckW, 0.7, 7.5, 0.08, 1.0), 0.02, 1.5, seed++).translate(0, -0.35, 0);
      hue(deck, (_x, py) => (py > -0.05 ? (isWaterRoute ? '#dec194' : '#9cc56c') : deckColor));
      line.add(deck);

      if (activeCutsceneMode === 'metro' || activeCutsceneMode === 'tram') {
        for (const rz of [-0.72, 0.72]) {
          flat.add(roll([V(-30, 0.06, rz), V(30, 0.06, rz)], 0.055, { around: 4, every: 1 }), '#475569');
        }
        for (let tx = -28; tx <= 28; tx += 1.8) {
          flat.add(block(0.28, 0.05, 1.9, 0.01, 0.2).translate(tx, 0.03, 0), '#785a40');
        }
      } else if (activeCutsceneMode === 'bike') {
        // Rantaraitti coastal timber railing & planks
        for (let tx = -28; tx <= 28; tx += 2.2) {
          line.add(roll([V(tx, 0, -3.4), V(tx, 1.05, -3.4)], 0.08, { around: 5, every: 0.4 }), '#855836');
        }
        line.add(roll([V(-30, 0.92, -3.4), V(30, 0.92, -3.4)], 0.06, { around: 5, every: 1 }), '#9c6b45');
        addBoat(-9, 10, 0.3, '#e8554e', PC_WHITE, true, 1.1);
        addBoat(12, 13, -0.4, '#4f9bd8', '#f2c12b', true, 1.05);
      } else {
        // Bus 520 paved boulevard + green bicycle/EV lane
        flat.add(block(deckW, 0.04, 4.2, 0.01, 0.5).translate(0, 0.02, 0), '#cbd5e1');
        flat.add(block(deckW, 0.05, 0.16, 0.01, 0.5).translate(0, 0.03, 0), '#facc15');
      }

      // Hero Moving Transit Vehicle
      const { group: vehicleGroup, wheels } = buildTransitVehicleGroup(
        pencil,
        activeCutsceneMode,
        isFluffSpammer,
        () => seed++
      );
      vehicleGroup.position.set(0, 0.05, 0);
      rootGroup.add(vehicleGroup);

      // Animated scrolling Nordic pine / birch tree treadmill along the backdrop
      const scroller = own((b) => {
        const sKit: SketchKit = { ...kit, line: b.line, both: b.both, flat: b.flat };
        for (let sx = -32; sx <= 32; sx += 8) {
          addNordicTree(sKit, sx, -0.1, -5.2 - (Math.abs(sx) % 3), 0.95 + (Math.abs(sx) % 2) * 0.25, Math.abs(sx) % 16 === 0);
          line.add(roll([V(sx + 4, 0, -3.2), V(sx + 4, 2.8, -3.2)], 0.05, { around: 5, every: 0.6 }), '#475569');
        }
      });
      rootGroup.add(scroller);

      // Cute floating green CO2-zero bubbles trailing behind the vehicle
      const ecoPuffs = Array.from({ length: 6 }, (_, i) => {
        const geo = field(hue(ball(0.24 - i * 0.02, 1), '#34d399'));
        if (geo.attributes.uv) geo.deleteAttribute('uv');
        const m = new THREE.Mesh(geo, pencil.line);
        rootGroup.add(m);
        return { mesh: m, phase: i / 6 };
      });

      const speedMul = activeCutsceneMode === 'metro' ? 14 : activeCutsceneMode === 'bike' ? 7 : 10;
      moving.push((dt, t) => {
        scroller.position.x = -((t * speedMul) % 8);
        vehicleGroup.position.y = 0.05 + Math.sin(t * (activeCutsceneMode === 'bike' ? 11 : 7)) * 0.06;
        vehicleGroup.rotation.z = Math.sin(t * 4.5) * 0.015;
        wheels.forEach((w) => {
          w.rotation.z -= dt * (activeCutsceneMode === 'bike' ? 9 : 13);
        });
        ecoPuffs.forEach((puff) => {
          const prog = (t * 0.8 + puff.phase) % 1;
          puff.mesh.position.set(-2.8 - prog * 5.2, 0.8 + Math.sin(prog * Math.PI) * 1.4, Math.sin(prog * 7) * 0.45);
          const s = (1 - prog) * 0.9 + 0.15;
          puff.mesh.scale.setScalar(s);
        });
        cutsceneVehiclePosRef.current.set(0, activeCutsceneMode === 'bike' ? 2.85 : 3.4, 0);
      });
    } else if (sceneMode === 'city') {
      // ════════════════════════════════════════════════════════════════════════
      // PLAYABLE REAL-GEO ESPOO DISTRICTS (OTANIEMI / KEILANIEMI / KERA)
      // ════════════════════════════════════════════════════════════════════════
      const dSpec = DISTRICT_SPECS[currentDistrict];
      const hasEastCoast = dSpec.waterEastX !== null;
      const landMaxX = dSpec.waterEastX ?? 22.5;
      const landMinX = -22.5;
      const landWidth = landMaxX - landMinX;
      const landCenterX = (landMaxX + landMinX) * 0.5;

      // Distant soft lavender-blue Espoo coastal horizon hills
      for (const [hx, hz, hr, hTall, hc] of [
        [-75, -92, 42, 0.34, '#9fa6dc'],
        [68, -104, 48, 0.3, '#a9aee2'],
        [-115, 26, 36, 0.32, '#a6b4e0'],
        [110, 18, 40, 0.28, '#a6b4e0'],
      ] as const) {
        line.add(
          put(knead(ball(hr, 3).scale(1, hTall, 0.6), hr * 0.06, 2.5 / hr, seed++), hx, -hr * hTall * 0.16, hz),
          hc,
          [0.4, 1, 0.3],
          [-0.7, 1, 0.2]
        );
      }

      // Main walkable Espoo landmass terrace (top sits cleanly at y = 0)
      const terrainBlock = knead(
        block(landWidth, 1.8, 42, 0.25, 1.3),
        0.04,
        0.65,
        seed++
      ).translate(landCenterX, -0.92, -1);
      hue(terrainBlock, (_px, py, pz) => {
        if (py < -0.35) return '#cdb994';
        if (currentDistrict === 'kera') return Math.abs(Math.floor(pz * 0.3)) % 2 === 0 ? '#a4c772' : '#96bd65';
        return Math.abs(Math.floor(pz * 0.3)) % 2 === 0 ? '#9cc56c' : '#8ebb62';
      });
      fieldBy(terrainBlock, (px, _py, pz) => [px * 0.35 + pz * 0.75, -px * 0.75 + pz * 0.35]);
      line.add(terrainBlock);

      // Paved pedestrian campus & urban sidewalks (Nordic granite & red Kera bike baana)
      const addPathway = (x: number, z: number, w: number, d: number, col = '#ede2ca') => {
        line.add(
          knead(block(w, 0.08, d, 0.03, 0.8), 0.008, 2, seed++).translate(x, 0.02, z),
          col
        );
      };
      addPathway(-2, 8.2, landWidth - 6, 3.2, '#ede2ca');
      addPathway(0, -1, 3.6, 23, '#e7d9bd');
      addPathway(-9.5, -2, 2.8, 20, '#ede2ca');
      if (hasEastCoast && dSpec.waterEastX !== null) {
        // Rantaraitti Coastal Timber Boardwalk + Red Asphalt Bike Lane
        addPathway(dSpec.waterEastX - 1.6, -1, 2.2, 36, '#c78c56');
        addPathway(dSpec.waterEastX - 3.6, -1, 1.5, 36, '#d67e6a');
        addBoat(dSpec.waterEastX + 5.8, -6, 0.25, '#e8554e', PC_WHITE, true, 1.15);
        addBoat(dSpec.waterEastX + 6.4, 8, -0.45, '#4f9bd8', '#f2c12b', true, 1.1);
      } else {
        // Kera Red Cycling Highway (Baana)
        addPathway(11, -1, 2.1, 36, '#d67e6a');
      }

      // Helper: Add Real-Geo OSM Footprint Event Venue Building
      const addOsmBuilding = (cfg: {
        id: string;
        name: string;
        subtitle: string;
        cluster: string;
        poly: [number, number][];
        x: number;
        z: number;
        height: number;
        scale?: number;
        wallColor: string;
        roofColor: string;
        accentHex: string;
        accentNum: number;
        bottleneck: string;
        bottlenecks: string[];
        spark: string;
        repLabel: string;
        resonance: number;
        canEnterVenue?: boolean;
        standSpot: [number, number];
        colliderRadius?: number;
        addon?: (g: THREE.Group) => void;
      }) => {
        const bGroup = new THREE.Group();
        const geo = extrudeOsmPolygon(
          cfg.poly,
          cfg.height,
          cfg.wallColor,
          cfg.roofColor,
          cfg.scale ?? 1,
          seed++
        );
        const mesh = new THREE.Mesh(geo, pencil.line);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        bGroup.add(mesh);

        // Doorstep doormat + interactive ground contour halo
        const doorGeo = field(hue(block(2.1, 0.14, 1.4, 0.03, 0.4).translate(cfg.standSpot[0] - cfg.x, 0.07, cfg.standSpot[1] - cfg.z - 0.8), cfg.accentHex));
        if (doorGeo.attributes.uv) doorGeo.deleteAttribute('uv');
        const doorMesh = new THREE.Mesh(doorGeo, pencil.line);
        bGroup.add(doorMesh);

        if (cfg.canEnterVenue && !isFluffSpammer) {
          const haloBatch = createBatch(pencil.flat);
          haloBatch.add(
            roll(ring(V(0, 0.09, 0), PC_UP, 4.8, 24), 0.045, { closed: true, around: 5, every: 0.7 }),
            cfg.accentHex
          );
          bGroup.add(haloBatch.build());
        }

        if (cfg.addon) cfg.addon(bGroup);
        bGroup.position.set(cfg.x, 0, cfg.z);
        rootGroup.add(bGroup);

        const hitMeshes: THREE.Object3D[] = [mesh, doorMesh];
        bGroup.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) hitMeshes.push(c);
        });

        if (cfg.resonance >= 78 && !isFluffSpammer) {
          const crystalGroup = own((b) => {
            b.line.add(new THREE.OctahedronGeometry(0.85), cfg.accentHex);
          });
          const baseY = cfg.height + 1.85;
          crystalGroup.position.set(cfg.x, baseY, cfg.z);
          rootGroup.add(crystalGroup);
          dynamicSpinners.push({ mesh: crystalGroup, baseY });
          hitMeshes.push(crystalGroup);
        }

        buildingColliders.push({ x: cfg.x, z: cfg.z, r: cfg.colliderRadius ?? 3.4 });

        nodeRecords.push({
          id: cfg.id,
          name: cfg.name,
          subtitle: cfg.subtitle,
          kind: 'building',
          cluster: cfg.cluster,
          resonance: cfg.resonance,
          bottleneck: cfg.bottleneck,
          bottlenecks: cfg.bottlenecks,
          spark: cfg.spark,
          accentHex: cfg.accentHex,
          accentNum: cfg.accentNum,
          repLabel: cfg.repLabel,
          canEnterVenue: cfg.canEnterVenue,
          standSpot: cfg.standSpot,
          position: new THREE.Vector3(cfg.x, 1.4, cfg.z),
          labelAnchor: new THREE.Vector3(cfg.x, cfg.height + 2.9, cfg.z),
          hitMeshes,
        });
      };

      // Helper: Add Real In-World Public Transit Station
      const addTransitHub = (cfg: {
        id: string;
        name: string;
        subtitle: string;
        mode: TransitMode;
        lineLabel: string;
        targets: DistrictId[];
        x: number;
        z: number;
        standSpot: [number, number];
        bottleneck: string;
        spark: string;
      }) => {
        const stopColor =
          cfg.mode === 'metro'
            ? '#f97316'
            : cfg.mode === 'tram'
            ? '#0d9488'
            : cfg.mode === 'bus'
            ? '#0284c7'
            : '#eab308';
        const { group, hitMeshes } = buildTransitStopStructure(
          pencil,
          cfg.mode,
          !isFluffSpammer,
          () => seed++
        );
        group.position.set(cfg.x, 0, cfg.z);
        rootGroup.add(group);
        buildingColliders.push({ x: cfg.x, z: cfg.z, r: 2.1 });

        nodeRecords.push({
          id: cfg.id,
          name: cfg.name,
          subtitle: cfg.subtitle,
          kind: 'transit',
          cluster: 'Sustainable Mobility',
          resonance: isFluffSpammer ? 0 : 88,
          bottleneck: cfg.bottleneck,
          bottlenecks: [cfg.lineLabel, 'Zero tailpipe emissions vs solo taxi'],
          spark: cfg.spark,
          accentHex: stopColor,
          accentNum: 0x0d9488,
          repLabel: cfg.lineLabel,
          transitMode: cfg.mode,
          lineLabel: cfg.lineLabel,
          targetDistricts: cfg.targets,
          standSpot: cfg.standSpot,
          position: new THREE.Vector3(cfg.x, 1.1, cfg.z),
          labelAnchor: new THREE.Vector3(cfg.x, 3.8, cfg.z),
          hitMeshes,
        });
      };

      const getComp = (id: string) => mergedCompanies.find((c) => c.id === id) || mergedCompanies[0];

      if (currentDistrict === 'otaniemi') {
        const iceye = getComp('comp-iceye');
        const iceyeRes = computeCompanyResonance(selectedVisitor, iceye);
        const vtt = getComp('comp-vtt-health');
        const vttRes = computeCompanyResonance(selectedVisitor, vtt);
        const dipoliRes = isFluffSpammer
          ? 0
          : selectedVisitor.id === 'app-01' || selectedVisitor.cluster === 'Edge AI & Robotics'
          ? 96
          : Math.max(82, Math.min(95, selectedVisitor.competenceScore));

        addOsmBuilding({
          id: 'venue-dipoli',
          name: 'Dipoli Event Hall',
          subtitle: 'Otaniemi DeepTech Forum · Enter Inside!',
          cluster: 'Edge AI & Robotics',
          poly: OSM_DIPOLI_POLY,
          x: 7.5,
          z: -7.5,
          height: 2.6,
          scale: 0.95,
          wallColor: '#e6d6b4',
          roofColor: '#5b947c',
          accentHex: '#059669',
          accentNum: 0x059669,
          bottleneck:
            'Flagship DeepTech Forum: Nokia Bell Labs, IQM, Kempower, ICEYE & VTT challenge pods await inside Dipoli.',
          bottlenecks: [
            'Sub-15W deterministic edge robotics & ROS2 IPC',
            'Cryo-quantum FPGA readout loops below 80ns',
          ],
          spark:
            isFluffSpammer
              ? 'Dipoli curators flag high-fluff buzzword decks at the door—demonstrate one real mechanism!'
              : 'Your Edge AI & Rust skills match 96% with the Dipoli Venue Floor! Walk to the entrance to step inside.',
          repLabel: 'Aalto & Espoo Innovation Garden Hub',
          resonance: dipoliRes,
          canEnterVenue: true,
          standSpot: [7.5, -2.5],
          colliderRadius: 4.1,
        });

        addOsmBuilding({
          id: 'aalto-main',
          name: 'Kandidaattikeskus & Aalto Amphitheater',
          subtitle: 'Otakaari 1 · Red-Brick Campus Square',
          cluster: 'Edge AI & Robotics',
          poly: OSM_AALTO_MAIN_POLY,
          x: -2.2,
          z: -12.5,
          height: 2.8,
          scale: 0.85,
          wallColor: '#c45d42',
          roofColor: '#7a4836',
          accentHex: '#b45309',
          accentNum: 0xb45309,
          bottleneck: 'Hardware startup demo booths, open RISC-V silicon verification & student prototypes.',
          bottlenecks: ['Academic-to-startup deep-tech spinout tracks'],
          spark: 'Walk past Alvar Aalto’s red-brick amphitheater to meet Aalto CS & microelectronics researchers.',
          repLabel: 'Aalto University Otakaari 1',
          resonance: isFluffSpammer ? 0 : 84,
          standSpot: [-2.2, -7.8],
          colliderRadius: 3.7,
        });

        addOsmBuilding({
          id: iceye.id,
          name: 'ICEYE Orbital SAR HQ',
          subtitle: 'Maarintie 6 · Geo-Compute & Edge Downlink',
          cluster: iceye.cluster,
          poly: OSM_MICRONOVA_POLY,
          x: -13.5,
          z: -6.5,
          height: 2.4,
          scale: 0.72,
          wallColor: '#e8eef5',
          roofColor: '#3b82f6',
          accentHex: '#0369A1',
          accentNum: 0x0369a1,
          bottleneck: iceye.actualProblemSpace,
          bottlenecks: iceye['active bottlenecks'] || [],
          spark: iceyeRes.spark,
          repLabel: `${iceye.repName} · ${iceye.repRole}`,
          resonance: iceyeRes.resonance,
          canEnterVenue: true,
          standSpot: [-11.0, -2.0],
          colliderRadius: 3.3,
          addon: (g) => {
            const dish = own((b) => {
              b.line.add(
                put(turned([[0, 0], [0.16, 0], [0.16, 1.0], [1.1, 1.55], [0, 1.25]], 14), 0, 0, 0),
                '#f8fafc'
              );
            });
            dish.position.set(0, 2.5, 0);
            g.add(dish);
            dynamicSpinners.push({ mesh: dish, baseY: 2.5 });
          },
        });

        addOsmBuilding({
          id: vtt.id,
          name: 'VTT Micronova Cleanroom',
          subtitle: 'Tietotie 3 · Microelectronics & Biosensors',
          cluster: vtt.cluster,
          poly: OSM_KONE_POLY,
          x: -13.5,
          z: 3.5,
          height: 2.2,
          scale: 1.1,
          wallColor: '#eef5f2',
          roofColor: '#0d9488',
          accentHex: '#0D9488',
          accentNum: 0x0d9488,
          bottleneck: vtt.actualProblemSpace,
          bottlenecks: vtt['active bottlenecks'] || [],
          spark: vttRes.spark,
          repLabel: `${vtt.repName} · ${vtt.repRole}`,
          resonance: vttRes.resonance,
          standSpot: [-10.0, 5.2],
          colliderRadius: 3.0,
        });

        addTransitHub({
          id: 'transit-ota-metro',
          name: 'Aalto-yliopisto Metro (M1)',
          subtitle: 'Fast Travel → Keilaniemi (2m) · Kera',
          mode: 'metro',
          lineLabel: 'Länsimetro M1 / M2 · Underground Rail',
          targets: ['keilaniemi', 'kera'],
          x: 0,
          z: 4.5,
          standSpot: [0, 7.6],
          bottleneck: 'High-capacity zero-emission metro linking Otaniemi ↔ Keilaniemi in 2 minutes.',
          spark: 'Hop onto Länsimetro M1 to zip under the bay to Keilaniemi’s IQM Quantum & Scaleup Summit!',
        });

        addTransitHub({
          id: 'transit-ota-tram',
          name: 'Aalto / Maari Raide-Jokeri 15',
          subtitle: 'Light Rail 15 → Keilaniemi · Karaportti',
          mode: 'tram',
          lineLabel: 'Raide-Jokeri Light Rail Line 15',
          targets: ['keilaniemi', 'kera'],
          x: -11.5,
          z: 11.5,
          standSpot: [-8.5, 11.5],
          bottleneck: 'Espoo–Helsinki flagship light rail uniting Aalto campus & industrial R&D hubs.',
          spark: 'Ride teal Raide-Jokeri 15 past the innovation corridor—great chance to bump into R&D leads.',
        });

        addTransitHub({
          id: 'transit-ota-bike',
          name: 'Rantaraitti City Bike Dock',
          subtitle: 'Scenic Coastal Pedal → Keilaniemi / Kera',
          mode: 'bike',
          lineLabel: 'HSL Yellow City Bike · 40km Waterfront',
          targets: ['keilaniemi', 'kera'],
          x: 11.5,
          z: 8.5,
          standSpot: [8.8, 8.5],
          bottleneck: 'Car-free Baltic shoreline path connecting Otaniemi & Keilaniemi.',
          spark: 'Grab a yellow HSL City Bike for a fresh Baltic breeze commute—0g CO₂!',
        });

        for (const [tx, tz] of [[-18, -14], [12.5, -14.5], [-18, 12], [5.5, 14]] as const) {
          addNordicTree(kit, tx, 0, tz, 1.0, tx < 0);
        }
      } else if (currentDistrict === 'keilaniemi') {
        const iqm = getComp('comp-iqm');
        const iqmRes = computeCompanyResonance(selectedVisitor, iqm);

        addOsmBuilding({
          id: iqm.id,
          name: 'IQM Quantum Computers Lab',
          subtitle: 'Keilaranta · 54-Qubit Superconducting Cryo Lab',
          cluster: iqm.cluster,
          poly: OSM_DIPOLI_POLY,
          x: -7.0,
          z: -9.5,
          height: 2.8,
          scale: 0.78,
          wallColor: '#eef3f9',
          roofColor: '#1d4ed8',
          accentHex: '#00508F',
          accentNum: 0x00508f,
          bottleneck: iqm.actualProblemSpace,
          bottlenecks: iqm['active bottlenecks'] || [],
          spark: iqmRes.spark,
          repLabel: `${iqm.repName} · ${iqm.repRole}`,
          resonance: iqmRes.resonance,
          canEnterVenue: true,
          standSpot: [-6.5, -4.5],
          colliderRadius: 3.6,
          addon: (g) => {
            const fridge = own((b) => {
              b.line.add(
                put(turned([[0, 0], [0.9, 0], [0.7, 0.5], [0.4, 1.1], [0.1, 1.4], [0, 1.45]], 14), 0, 0, 0),
                '#e3b54a'
              );
            });
            fridge.position.set(0, 2.9, 0);
            g.add(fridge);
            dynamicSpinners.push({ mesh: fridge, baseY: 2.9 });
          },
        });

        addOsmBuilding({
          id: 'accountor-tower',
          name: 'Accountor Tower Waterfront',
          subtitle: 'Keilaniemi Seaside Skyscraper (OSM Real Footprint)',
          cluster: 'Sovereign AI & Cloud Infra',
          poly: OSM_ACCOUNTOR_POLY,
          x: 6.2,
          z: -11.5,
          height: 6.4,
          scale: 1.25,
          wallColor: '#bfd9ec',
          roofColor: '#64748b',
          accentHex: '#0284c7',
          accentNum: 0x0284c7,
          bottleneck: 'Enterprise cloud scaleups & Nordic maritime headquarters overlooking Laajalahti Bay.',
          bottlenecks: ['International Talent Espoo executive mixers'],
          spark: 'Enjoy panoramic Baltic views from Keilaniemi Tower—enterprise AI adopters meet deep-tech builders here.',
          repLabel: 'Keilaniemi Corporate Tower',
          resonance: isFluffSpammer ? 0 : 79,
          standSpot: [5.5, -6.5],
          colliderRadius: 3.2,
        });

        addOsmBuilding({
          id: 'kone-summit',
          name: 'Kone & Talent Espoo Pavilion',
          subtitle: 'Keilaniemi Maritime Summit · Autonomous Elevators',
          cluster: 'Edge AI & Robotics',
          poly: OSM_KONE_POLY,
          x: 5.5,
          z: -1.5,
          height: 4.5,
          scale: 1.25,
          wallColor: '#d9e6f2',
          roofColor: '#3f6f9a',
          accentHex: '#059669',
          accentNum: 0x059669,
          bottleneck: 'Edge telemetry, smart-building robotics & Talent Espoo 350-engineer scaleup forum.',
          bottlenecks: ['Deterministic urban mobility & elevator predictive Edge AI'],
          spark: 'Your 15W Rust Edge IPC work resonates strongly with smart-building robotics teams inside Kone Pavilion!',
          repLabel: 'Talent Espoo Summit Host',
          resonance: isFluffSpammer ? 0 : 89,
          canEnterVenue: true,
          standSpot: [4.5, 3.2],
          colliderRadius: 3.3,
        });

        addTransitHub({
          id: 'transit-kei-metro',
          name: 'Keilaniemi Metro (M1 / M2)',
          subtitle: 'Return to Otaniemi (2m) or Connect to Kera',
          mode: 'metro',
          lineLabel: 'Länsimetro M1 · Maritime Glass Entrance',
          targets: ['otaniemi', 'kera'],
          x: -10.5,
          z: 6.5,
          standSpot: [-7.5, 6.8],
          bottleneck: 'Direct underground link under Keilalahti bay back to Aalto University & Dipoli.',
          spark: 'Ride Länsimetro M1 one stop west back to Otaniemi or transfer toward Kera.',
        });

        addTransitHub({
          id: 'transit-kei-tram',
          name: 'Keilaniemi Raide-Jokeri Terminus',
          subtitle: 'Light Rail 15 → Karaportti / Otaniemi',
          mode: 'tram',
          lineLabel: 'Raide-Jokeri Light Rail Line 15',
          targets: ['kera', 'otaniemi'],
          x: -1.5,
          z: 10.5,
          standSpot: [-1.5, 13.0],
          bottleneck: 'Western coastal terminus of Raide-Jokeri light rail.',
          spark: 'Take Raide-Jokeri 15 across northern Espoo to meet Nokia Bell Labs & Kempower!',
        });

        addTransitHub({
          id: 'transit-kei-bike',
          name: 'Keilaranta Seaside Bike Dock',
          subtitle: 'HSL City Bike along Rantaraitti',
          mode: 'bike',
          lineLabel: 'HSL Yellow City Bike · Keilaranta Pier',
          targets: ['otaniemi', 'kera'],
          x: 9.0,
          z: 8.5,
          standSpot: [6.5, 8.5],
          bottleneck: 'Direct bike trail linking Keilaniemi pier north to Otaniemi marina.',
          spark: 'Cycle along the sunlit Keilaranta boardwalk right beside the Baltic harbor.',
        });

        for (const [tx, tz] of [[-17, -12], [-17, 2], [-14, 13]] as const) {
          addNordicTree(kit, tx, 0, tz, 1.05, true);
        }
      } else {
        // 'kera': Karaportti Nokia Bell Labs + Kempower V2G + Keran Hallit Circular District
        const nokia = getComp('comp-nokia-bell');
        const nokiaRes = computeCompanyResonance(selectedVisitor, nokia);
        const kempower = getComp('comp-kempower');
        const kempRes = computeCompanyResonance(selectedVisitor, kempower);

        addOsmBuilding({
          id: nokia.id,
          name: 'Nokia Bell Labs Campus',
          subtitle: 'Karaportti · 6G Spatial & Edge Robotics HQ',
          cluster: nokia.cluster,
          poly: OSM_NOKIA_KARAPORTTI_POLY,
          x: -9.0,
          z: -8.0,
          height: 3.1,
          scale: 0.95,
          wallColor: '#e2ebf5',
          roofColor: '#1e3a8a',
          accentHex: '#059669',
          accentNum: 0x059669,
          bottleneck: nokia.actualProblemSpace,
          bottlenecks: nokia['active bottlenecks'] || [],
          spark: nokiaRes.spark,
          repLabel: `${nokia.repName} · ${nokia.repRole}`,
          resonance: nokiaRes.resonance,
          canEnterVenue: true,
          standSpot: [-8.5, -3.5],
          colliderRadius: 4.0,
        });

        addOsmBuilding({
          id: kempower.id,
          name: 'Kempower Espoo V2G Hub',
          subtitle: 'Sub-Zero MW Chargers · Smart Grid Power',
          cluster: kempower.cluster,
          poly: OSM_MICRONOVA_POLY,
          x: 8.5,
          z: -8.5,
          height: 2.5,
          scale: 0.78,
          wallColor: '#f1f5f9',
          roofColor: '#15803d',
          accentHex: '#15803D',
          accentNum: 0x15803d,
          bottleneck: kempower.actualProblemSpace,
          bottlenecks: kempower['active bottlenecks'] || [],
          spark: kempRes.spark,
          repLabel: `${kempower.repName} · ${kempower.repRole}`,
          resonance: kempRes.resonance,
          standSpot: [7.5, -4.0],
          colliderRadius: 3.4,
        });

        addOsmBuilding({
          id: 'keran-hallit',
          name: 'Keran Hallit Circular District',
          subtitle: 'Urban Reuse Courtyard · CleanTech Living Lab',
          cluster: 'CleanTech & Smart Grid',
          poly: [[-5.0, 1.8], [5.0, 1.8], [5.0, -1.8], [-5.0, -1.8]],
          x: 0.5,
          z: 0.5,
          height: 2.1,
          scale: 0.88,
          wallColor: '#c96f4a',
          roofColor: '#334155',
          accentHex: '#B45309',
          accentNum: 0xb45309,
          bottleneck: 'Espoo circular-economy testbed hosting zero-carbon district heating & smart community labs.',
          bottlenecks: ['Adaptive industrial hall reuse', 'Bi-directional EV microgrid trials'],
          spark: 'Walk into Keran Hallit’s vibrant courtyard—Nordic circular builders gather here over filter coffee.',
          repLabel: 'Espoo Circular City Testbed',
          resonance: isFluffSpammer ? 0 : 83,
          standSpot: [0.5, 4.2],
          colliderRadius: 3.6,
        });

        addTransitHub({
          id: 'transit-kera-bus',
          name: 'Karaportti Electric Bus 520',
          subtitle: 'Zero-Tailpipe e-Bus → Otaniemi · Keilaniemi',
          mode: 'bus',
          lineLabel: 'HSL Electric Trunk Bus 520',
          targets: ['otaniemi', 'keilaniemi'],
          x: -9.5,
          z: 10.5,
          standSpot: [-6.5, 10.5],
          bottleneck: 'All-electric HSL trunk bus connecting Karaportti Nokia campus south to Otaniemi.',
          spark: 'Catch electric Trunk Bus 520—saves ~890g CO₂ vs riding solo by taxi across Espoo!',
        });

        addTransitHub({
          id: 'transit-kera-tram',
          name: 'Kera Station & Rail Transfer',
          subtitle: 'Commuter Rail + Line 15 → Coast / Otaniemi',
          mode: 'tram',
          lineLabel: 'Kera Rail & Raide-Jokeri Corridor',
          targets: ['keilaniemi', 'otaniemi'],
          x: -1.0,
          z: 11.0,
          standSpot: [-1.0, 13.5],
          bottleneck: 'Transit-oriented development core of Espoo’s sustainable Kera hub.',
          spark: 'Hop on rail transit from Kera back to the seaside tech hubs!',
        });

        addTransitHub({
          id: 'transit-kera-bike',
          name: 'Kera Baana City Bike Hub',
          subtitle: 'Cycle Express Highway → Otaniemi',
          mode: 'bike',
          lineLabel: 'Espoo Cycling Baana · HSL City Bike',
          targets: ['otaniemi', 'keilaniemi'],
          x: 11.0,
          z: 9.5,
          standSpot: [8.2, 9.5],
          bottleneck: 'High-speed cycling highway with winter heated segments.',
          spark: 'Cruise down the red-asphalt Baana corridor straight back toward Otaniemi.',
        });

        for (const [tx, tz] of [[-18, -14], [16.5, -14], [-18, 2], [17, 3], [-16, 15]] as const) {
          addNordicTree(kit, tx, 0, tz, 1.05, Math.abs(tx) > 16);
        }
      }

      if (hasEastCoast && dSpec.waterEastX !== null) {
        const flock = Array.from({ length: 4 }, (_, i) => {
          const bird = own((b) => {
            b.line.add(ball(1, 2).scale(0.14, 0.12, 0.3), PC_WHITE);
            b.line.add(ball(0.08, 2).translate(0, 0.08, 0.24), PC_WHITE);
            b.both.add(
              new THREE.BufferGeometry().setAttribute(
                'position',
                new THREE.Float32BufferAttribute([0, 0.06, 0.1, 0, 0.06, -0.1, -0.8, 0.18, 0, 0, 0.06, 0.1, 0.8, 0.18, 0, 0, 0.06, -0.1], 3)
              ),
              '#eef0f2'
            );
          });
          rootGroup.add(bird);
          return {
            bird,
            cx: (dSpec.waterEastX ?? 14) + 6,
            cz: (i - 1.5) * 6,
            rad: 7 + rand() * 5,
            y: 9 + rand() * 4,
            speed: (0.25 + 0.08 * rand()) * (i % 2 ? 1 : -1),
            ph: rand() * 6,
          };
        });
        moving.push((_dt, t) => {
          flock.forEach((b) => {
            const a = b.ph + t * b.speed;
            b.bird.position.set(
              b.cx + Math.cos(a) * b.rad,
              b.y + 0.5 * Math.sin(a * 2 + b.ph),
              b.cz + Math.sin(a) * b.rad
            );
            b.bird.rotation.y = -a + (b.speed > 0 ? 0 : Math.PI);
          });
        });
      }

      if (isFluffSpammer) {
        addDeadZonePad(-0.08);
      }
    } else {
      // ════════════════════════════════════════════════════════════════════════
      // LEVEL 2: MICRO VENUE — INSIDE DIPOLI / HYPE ARENA (COLOURED PENCIL)
      // ════════════════════════════════════════════════════════════════════════

      // Warm sculpted Otaniemi birch & granite drafting platform overlooking the coastal pines & bay
      const floorBase = knead(
        turned([[0, -0.9], [27.5, -0.9], [28.2, -0.2], [27.4, 0], [0, 0]], 32),
        0.04,
        0.5,
        seed++
      );
      hue(floorBase, (_x, py) => (py > -0.15 ? '#efe4cc' : '#cdb994'));
      fieldBy(floorBase, (px, _py, pz) => [px * 0.45 + pz * 0.85, -px * 0.85 + pz * 0.45]);
      line.add(floorBase);

      // Subtle architectural flagstone tiles across the central floor (quayside.js technique)
      const FLAG_TONES = ['#eadcc0', '#e3d2b2', '#f3ead6', '#e8d8be', '#dfd1b6'];
      for (let gz = -18; gz <= 18; gz += 3.6) {
        for (let gx = -20; gx <= 20; gx += 4.2) {
          if (Math.hypot(gx, gz) > 22.5) continue;
          const jx = gx + (gz % 7.2 === 0 ? 0.9 : -0.7);
          line.add(
            put(
              knead(block(3.4, 0.08, 2.8, 0.04, 0.9), 0.008, 1.5, seed++),
              jx,
              0.02 + rand() * 0.015,
              gz,
              (rand() - 0.5) * 0.02
            ),
            pick(FLAG_TONES),
            [0.4 + 0.3 * rand(), 1, 0.85]
          );
        }
      }

      // Drafting hall contour rings in blue & slate pencil
      flat.add(roll(ring(V(0, 0.08, 0), PC_UP, 15.5, 32), 0.045, { closed: true, around: 4, every: 1 }), '#5d84a6');
      flat.add(roll(ring(V(0, 0.08, 0), PC_UP, 24.5, 36), 0.055, { closed: true, around: 4, every: 1 }), '#7e97b4');

      // Sweeping Dipoli Laminated Timber Arches & Copper Eaves around the Perimeter
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + Math.PI / 8;
        const rOut = 26.2;
        const rIn = 22.8;
        const p0 = V(Math.cos(ang) * rOut, -0.2, Math.sin(ang) * rOut);
        const p1 = V(Math.cos(ang) * (rOut - 0.6), 4.6, Math.sin(ang) * (rOut - 0.6));
        const p2 = V(Math.cos(ang) * rIn, 8.2, Math.sin(ang) * rIn);
        line.add(
          knead(roll([p0, p1, p2], (t) => 0.52 - 0.14 * t, { around: 8, every: 0.7 }), 0.015, 2, seed++),
          '#8a5a34',
          [0.1, 1, 0.2]
        );
        line.add(
          knead(block(4.8, 0.46, 1.5, 0.08, 0.6), 0.02, 2, seed++)
            .rotateZ(0.18)
            .rotateY(-ang)
            .translate(Math.cos(ang) * (rIn + 0.8), 8.2, Math.sin(ang) * (rIn + 0.8)),
          '#5b947c'
        );
        // Otaniemi Pines visible just outside the hall
        addNordicTree(
          kit,
          Math.cos(ang + 0.18) * 29.5,
          -0.6,
          Math.sin(ang + 0.18) * 29.5,
          1.15,
          true
        );
      }

      // Arrival Terminal Mat inside Dipoli
      const mat = turned([[0, 0], [2.7, 0], [2.8, 0.16], [0, 0.16]], 18).translate(
        ARRIVAL_POS.x,
        0,
        ARRIVAL_POS.z
      );
      line.add(mat, '#c9a675');
      flat.add(
        roll(ring(V(ARRIVAL_POS.x, 0.1, ARRIVAL_POS.z), PC_UP, 3.1, 20), 0.055, {
          closed: true,
          around: 4,
          every: 0.7,
        }),
        '#00508F'
      );

      addDeadZonePad(0.02);

      // 5 Company Challenge Pods from data/companies_sample.json
      mergedCompanies.slice(0, 5).forEach((comp, idx) => {
        const layout = VENUE_POD_POSITIONS[comp.id] || {
          x: Math.cos((idx / 5) * TAU) * 16,
          z: Math.sin((idx / 5) * TAU) * 14,
          accentHex: '#00508F',
          accentNum: 0x00508f,
        };
        const { resonance, spark } = computeCompanyResonance(selectedVisitor, comp);
        const podHitMeshes: THREE.Object3D[] = [];
        const backAngle = Math.atan2(layout.x, layout.z);

        const podGroup = own((b) => {
          // Octagonal sculpted timber stage
          const base = knead(turned([[0, 0], [3.6, 0], [3.8, 0.45], [3.5, 0.55], [0, 0.55]], 10), 0.015, 2, seed++);
          b.line.add(base, '#b98a52', [0.4, 1, 0.6]);

          // Acoustic Nordic timber & plaster screen behind the pod
          const screen = knead(block(4.8, 3.1, 0.36, 0.08, 0.6), 0.015, 2, seed++)
            .rotateY(backAngle)
            .translate(Math.sin(backAngle) * -2.25, 1.9, Math.cos(backAngle) * -2.25);
          b.line.add(screen, '#f8f4ea');

          // Bistro lounge table + 2 chairs on the pod deck (unforced organic dialogue!)
          b.line.add(
            put(
              turned(
                [[0, 0], [0.34, 0], [0.06, 0.08], [0.05, 0.86], [0.58, 0.9], [0.6, 0.95], [0, 0.95]],
                14
              ),
              Math.cos(backAngle) * 1.4,
              0.52,
              -Math.sin(backAngle) * 1.4
            ),
            PC_WHITE
          );

          // Challenge Monolith Pillar + Domain Sculpture
          b.line.add(
            knead(block(1.35, 3.9, 1.35, 0.1, 0.5), 0.015, 2, seed++).translate(0, 2.5, 0),
            layout.accentHex
          );

          if (comp.id === 'comp-iqm') {
            // Cryo-quantum brass dilution plates
            b.line.add(
              put(
                turned(
                  [[0, 0], [0.95, 0], [0.95, 0.12], [0.7, 0.5], [0.75, 0.6], [0.45, 1.1], [0.1, 1.4], [0, 1.45]],
                  16
                ),
                -1.45,
                0.55,
                0.75
              ),
              '#e3b54a'
            );
          } else if (comp.id === 'comp-nokia-bell') {
            // 6G RF phased array mast & edge-AI rack
            b.line.add(
              roll([V(1.4, 0.55, 0.6), V(1.4, 3.3, 0.6)], 0.08, { around: 6, every: 0.5 }),
              '#3d4654'
            );
            b.line.add(
              block(0.85, 0.85, 0.22, 0.04, 0.3).translate(1.4, 2.95, 0.65),
              '#4f9bd8'
            );
          } else if (comp.id === 'comp-kempower') {
            // SiC fast charger cabinet + coiled cable
            b.line.add(
              block(0.75, 2.1, 0.55, 0.08, 0.35).translate(-1.5, 1.6, 0.7),
              '#f28b3c'
            );
            b.line.add(
              roll(
                [V(-1.1, 1.8, 0.8), V(-0.85, 1.0, 1.1), V(-1.3, 0.75, 1.25)],
                0.045,
                { around: 6, every: 0.2 }
              ),
              '#2f3a44'
            );
          } else if (comp.id === 'comp-iceye') {
            // Orbital SAR radar dish
            b.line.add(
              put(turned([[0, 0], [0.15, 0], [0.15, 0.9], [0.95, 1.4], [0, 1.05]], 14), 1.45, 0.55, 0.75),
              '#c9d7e3'
            );
          } else {
            // VTT microfluidic biosensor dome
            b.line.add(
              ball(0.75, 2).scale(1, 0.7, 1).translate(-1.45, 1.05, 0.75),
              '#72c4b0'
            );
          }

          // Floor gravitational contour rings
          b.flat.add(
            roll(ring(V(0, 0.08, 0), PC_UP, 5.0, 22), 0.06, { closed: true, around: 4, every: 0.8 }),
            layout.accentHex
          );
          if (resonance > 80 && !isFluffSpammer) {
            b.flat.add(
              roll(ring(V(0, 0.09, 0), PC_UP, 6.6, 26), 0.085, { closed: true, around: 5, every: 0.9 }),
              layout.accentHex
            );
          }
        });

        podGroup.position.set(layout.x, 0, layout.z);
        rootGroup.add(podGroup);
        podGroup.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) podHitMeshes.push(c);
        });

        // Rotating Problem Beacon Crystal
        const crystalGroup = own((b) => {
          b.line.add(new THREE.OctahedronGeometry(1.05), layout.accentHex);
        });
        crystalGroup.position.set(layout.x, 5.95, layout.z);
        rootGroup.add(crystalGroup);
        dynamicSpinners.push({ mesh: crystalGroup, baseY: 5.95 });
        podHitMeshes.push(crystalGroup);

        nodeRecords.push({
          id: comp.id,
          name: comp.name,
          subtitle: comp.zone,
          kind: 'company',
          cluster: comp.cluster,
          resonance,
          bottleneck: comp.actualProblemSpace,
          bottlenecks: comp['active bottlenecks'] || [],
          spark,
          accentHex: layout.accentHex,
          accentNum: layout.accentNum,
          repLabel: `${comp.repName} · ${comp.repRole}`,
          position: new THREE.Vector3(layout.x, 3.0, layout.z),
          labelAnchor: new THREE.Vector3(layout.x, 6.7, layout.z),
          hitMeshes: podHitMeshes,
        });
      });

      // Hand-Sculpted Peer Avatars standing around their resonant Challenge Pods
      const peerPlacementCount: Record<string, number> = {};
      mergedApplicants
        .filter((app) => app.id !== selectedVisitor.id)
        .slice(0, 7)
        .forEach((peer, pIdx) => {
          const isPeerFluff = peer.fluffIndex > 60;
          let px = DEAD_ZONE_POS.x + 1.8;
          let pz = DEAD_ZONE_POS.z - 0.6;

          if (!isPeerFluff) {
            const bestComp =
              mergedCompanies.find((c) => c.cluster === peer.cluster) || mergedCompanies[0];
            const basePod = VENUE_POD_POSITIONS[bestComp.id] || { x: 0, z: -10 };
            const count = peerPlacementCount[bestComp.id] || 0;
            peerPlacementCount[bestComp.id] = count + 1;

            const toCenter = new THREE.Vector3(-basePod.x, 0, -basePod.z).normalize();
            const perp = new THREE.Vector3(-toCenter.z, 0, toCenter.x);
            const offset = toCenter
              .clone()
              .multiplyScalar(5.2)
              .add(perp.multiplyScalar((count % 2 === 0 ? 1 : -1) * (2.2 + count * 0.9)));
            px = basePod.x + offset.x;
            pz = basePod.z + offset.z;
          }

          const { resonance, spark } = computePeerResonance(selectedVisitor, peer);
          const peerHex = isPeerFluff ? '#dc2626' : resonance >= 85 ? '#059669' : '#0284c7';
          const peerNum = isPeerFluff ? 0xdc2626 : resonance >= 85 ? 0x059669 : 0x0284c7;

          const { group: peerFig, hitMeshes } = buildSketchedAvatar(pencil, {
            shirtHex: isPeerFluff ? '#e8554e' : resonance >= 85 ? '#4f9a8a' : '#4f9bd8',
            stripeHex: PC_WHITE,
            hairHex: pIdx % 2 === 0 ? '#5c3d28' : '#2d2b30',
            hatHex: isPeerFluff ? '#e8554e' : undefined,
            hasScroll: !isPeerFluff,
            accentOrbHex: peerHex,
            isHero: false,
            seed: 400 + pIdx * 17,
          });
          peerFig.position.set(px, 0, pz);
          peerFig.rotation.y = Math.atan2(-px, -pz);
          rootGroup.add(peerFig);

          flat.add(
            roll(ring(V(px, 0.08, pz), PC_UP, 0.92, 16), 0.045, { closed: true, around: 4, every: 0.4 }),
            peerHex
          );

          nodeRecords.push({
            id: peer.id,
            name: peer.name,
            subtitle: peer.role,
            kind: 'peer',
            cluster: peer.cluster,
            resonance,
            bottleneck: peer.demonstratedMechanism,
            bottlenecks: peer.strengths,
            spark,
            accentHex: peerHex,
            accentNum: peerNum,
            repLabel: `${peer.persona} · ${peer.origin}`,
            position: new THREE.Vector3(px, 1.3, pz),
            labelAnchor: new THREE.Vector3(px, 2.75, pz),
            hitMeshes,
          });
        });
    }

    // Build all static scenery batches into one draw call per material
    if (line.count) rootGroup.add(line.build());
    if (both.count) rootGroup.add(both.build());
    if (flat.count) rootGroup.add(flat.build());

    worldNodesRef.current = nodeRecords;
    setUiNodes(
      nodeRecords.map(({ position: _p, labelAnchor: _l, hitMeshes: _h, ...rest }) => rest)
    );

    // ════════════════════════════════════════════════════════════════════════
    // ACTIVE ATTENDEE HERO AVATAR (@blendi/sailor.js style) & SEMANTIC GRAVITY
    // ════════════════════════════════════════════════════════════════════════
    const heroHex = isFluffSpammer ? '#dc2626' : '#059669';
    const { group: visitorGroup } = buildSketchedAvatar(pencil, {
      shirtHex: isFluffSpammer ? '#dc2626' : '#059669',
      stripeHex: isFluffSpammer ? '#fca5a5' : '#fef08a',
      pantsHex: isFluffSpammer ? '#3a3f4a' : '#2f4f8f',
      hatHex: isFluffSpammer ? '#dc2626' : '#f2c12b',
      hasScroll: !isFluffSpammer,
      accentOrbHex: heroHex,
      isHero: true,
      seed: 99,
    });

    const visitorRingGroup = own((b) => {
      b.line.add(
        roll(ring(V(0, 0.14, 0), PC_UP, 1.38, 22), 0.065, { closed: true, around: 6, every: 0.3 }),
        isFluffSpammer ? '#ef4444' : '#10b981'
      );
    });
    visitorGroup.add(visitorRingGroup);

    const currentVisitorPos = playerPosRef.current;
    visitorGroup.position.copy(currentVisitorPos);
    visitorGroup.visible = !activeCutsceneMode;
    rootGroup.add(visitorGroup);

    // Sketched tap-to-walk target ring on ground
    const waypointRingGroup = own((b) => {
      b.flat.add(
        roll(ring(V(0, 0.08, 0), PC_UP, 0.85, 16), 0.06, { closed: true, around: 5, every: 0.3 }),
        '#00508F'
      );
      b.line.add(ball(0.16, 1).translate(0, 0.14, 0), '#059669');
    });
    waypointRingGroup.visible = false;
    rootGroup.add(waypointRingGroup);

    const primaryCandidates = nodeRecords
      .filter((n) => n.kind !== 'peer' && n.kind !== 'transit')
      .sort((a, b) => b.resonance - a.resonance);
    const bestTarget = primaryCandidates[0] || nodeRecords[0] || null;

    // Gravitational Curve Ribbons & Orbiting Pencil Beads (Ground Semantic Ley-Lines)
    const gravityVisualsGroup = new THREE.Group();
    gravityVisualsGroup.visible = !activeCutsceneMode;
    rootGroup.add(gravityVisualsGroup);

    interface FlowRibbon {
      targetPos: THREE.Vector3;
      tubeMesh: THREE.Mesh | null;
      beads: THREE.Mesh[];
      isPrimary: boolean;
      colorHex: string;
    }

    const flowRibbons: FlowRibbon[] = [];

    if (!activeCutsceneMode && !isFluffSpammer && bestTarget) {
      const targetsToDraw = [{ node: bestTarget, isPrimary: true }];

      targetsToDraw.forEach(({ node, isPrimary }) => {
        const beadCount = isPrimary ? 5 : 3;
        const beads: THREE.Mesh[] = [];
        const colorHex = isPrimary ? '#059669' : '#0284c7';
        const beadColor = isPrimary ? '#10b981' : '#38bdf8';
        for (let b = 0; b < beadCount; b++) {
          const beadGeo = field(hue(ball(isPrimary ? 0.22 : 0.14, 1), beadColor));
          if (beadGeo.attributes.uv) beadGeo.deleteAttribute('uv');
          const bead = new THREE.Mesh(beadGeo, pencil.line);
          bead.castShadow = true;
          gravityVisualsGroup.add(bead);
          beads.push(bead);
        }
        flowRibbons.push({
          targetPos: node.position.clone(),
          tubeMesh: null,
          beads,
          isPrimary,
          colorHex,
        });
      });
    } else if (!activeCutsceneMode && isFluffSpammer) {
      primaryCandidates.slice(0, 3).forEach((node) => {
        const start = V(DEAD_ZONE_POS.x, 1.0, DEAD_ZONE_POS.z);
        const end = start.clone().lerp(node.position, 0.28);
        const dashBatch = createBatch(pencil.flat);
        for (let sIdx = 0; sIdx < 4; sIdx++) {
          const t0 = sIdx * 0.25;
          const t1 = t0 + 0.12;
          dashBatch.add(
            roll([start.clone().lerp(end, t0), start.clone().lerp(end, t1)], 0.045, {
              around: 5,
              every: 0.4,
            }),
            '#dc2626'
          );
        }
        gravityVisualsGroup.add(dashBatch.build());
      });
    }

    // Raycaster & Desktop / Mobile Pointer Controls (Drag Orbit + Tap-to-Walk)
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    const walkPlane = new THREE.Plane(PC_UP, 0);
    const groundHit = new THREE.Vector3();
    let pointerDownPos = { x: 0, y: 0 };

    const clampToWalkBounds = (pos: THREE.Vector3) => {
      if (sceneMode === 'venue') {
        const dist = Math.hypot(pos.x, pos.z);
        if (dist > 22.8) {
          pos.x = (pos.x / dist) * 22.8;
          pos.z = (pos.z / dist) * 22.8;
        }
      } else {
        const eastCap =
          DISTRICT_SPECS[currentDistrict].waterEastX !== null
            ? (DISTRICT_SPECS[currentDistrict].waterEastX as number) - 1.2
            : 21.0;
        pos.x = Math.max(-21.0, Math.min(eastCap, pos.x));
        pos.z = Math.max(-18.8, Math.min(18.0, pos.z));
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const state = cameraStateRef.current;
      state.isDragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const state = cameraStateRef.current;
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        if (cinematicRef.current) setCinematicMode(false);
        state.azimuth -= dx * 0.007;
        state.polar = Math.max(0.32, Math.min(1.36, state.polar - dy * 0.005));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const state = cameraStateRef.current;
      if (!state.isDragging) return;
      state.isDragging = false;
      if (activeCutsceneMode) return;

      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNDC, camera);

        const allPickables = nodeRecords.flatMap((n) => n.hitMeshes);
        const hits = raycaster.intersectObjects(allPickables, true);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const matchedNode = nodeRecords.find(
            (n) =>
              n.hitMeshes.includes(hitObj) ||
              n.hitMeshes.some((hm) => hm === hitObj.parent)
          );
          if (matchedNode) {
            const { position: _p, labelAnchor: _l, hitMeshes: _h, ...detail } = matchedNode;
            handleSelectNode(detail);
            const stand = matchedNode.standSpot
              ? V(matchedNode.standSpot[0], 0, matchedNode.standSpot[1])
              : matchedNode.position.clone().setY(0).lerp(currentVisitorPos.clone().setY(0), 0.25);
            clampToWalkBounds(stand);
            playerTargetPosRef.current = stand;
            pendingInteractNodeRef.current = matchedNode;
            waypointRingGroup.position.set(stand.x, 0.05, stand.z);
            waypointRingGroup.visible = true;
            return;
          }
        }

        // Otherwise tap on walkable ground to steer player there!
        if (raycaster.ray.intersectPlane(walkPlane, groundHit)) {
          clampToWalkBounds(groundHit);
          groundHit.y = 0;
          playerTargetPosRef.current = groundHit.clone();
          pendingInteractNodeRef.current = null;
          waypointRingGroup.position.set(groundHit.x, 0.05, groundHit.z);
          waypointRingGroup.visible = true;
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = cameraStateRef.current;
      state.distance = Math.max(16, Math.min(68, state.distance + e.deltaY * 0.025));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    const clock = new THREE.Clock();
    let frameId = 0;
    const projVec = new THREE.Vector3();

    const projectToScreen = (worldPos: THREE.Vector3, w: number, h: number) => {
      projVec.copy(worldPos).project(camera);
      const visible = projVec.z >= -1 && projVec.z <= 1;
      const sx = (projVec.x * 0.5 + 0.5) * w;
      const sy = (-projVec.y * 0.5 + 0.5) * h;
      return { sx, sy, visible };
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      uTime.value = elapsed;

      const curW = container.clientWidth || width;
      const curH = container.clientHeight || height;
      const camState = cameraStateRef.current;

      if (activeCutsceneMode) {
        if (!camState.isDragging) {
          camState.azimuth = 0.22 + Math.sin(elapsed * 0.6) * 0.14;
          camState.polar = 1.22;
        }
        camState.target.set(0, 1.4, 0);
        const sinPolar = Math.sin(camState.polar);
        const cosPolar = Math.cos(camState.polar);
        camera.position.set(
          camState.target.x + camState.distance * sinPolar * Math.sin(camState.azimuth),
          camState.target.y + camState.distance * cosPolar,
          camState.target.z + camState.distance * sinPolar * Math.cos(camState.azimuth)
        );
        camera.lookAt(camState.target);
        camera.updateMatrixWorld(true);

        moving.forEach((fn) => fn(dt, elapsed, camera));
        page.render(scene, camera);

        if (cutsceneBubbleRef.current) {
          const { sx, sy, visible } = projectToScreen(cutsceneVehiclePosRef.current, curW, curH);
          if (!visible) {
            cutsceneBubbleRef.current.style.opacity = '0';
          } else {
            const bx = Math.max(150, Math.min(curW - 150, sx));
            const by = Math.max(125, Math.min(curH - 155, sy));
            cutsceneBubbleRef.current.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, -100%)`;
            cutsceneBubbleRef.current.style.opacity = '1';
          }
        }
        return;
      }

      dynamicSpinners.forEach(({ mesh, baseY }, idx) => {
        mesh.rotation.y = elapsed * 0.9 + idx;
        mesh.position.y = baseY + Math.sin(elapsed * 2 + idx) * 0.22;
      });

      // Playable Desktop (WASD/Arrows) + Mobile (D-Pad & Tap-to-Walk) Control Loop
      const keys = pressedKeysRef.current;
      let inX = 0;
      let inZ = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) inZ -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) inZ += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) inX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) inX += 1;

      const pad = mobileMoveDirRef.current;
      if (pad.dx !== 0 || pad.dz !== 0) {
        inX += pad.dx;
        inZ += pad.dz;
      }

      let isMovingNow = false;
      let moveHeadingX = 0;
      let moveHeadingZ = 0;

      if (Math.hypot(inX, inZ) > 0.05) {
        playerTargetPosRef.current = null;
        pendingInteractNodeRef.current = null;
        waypointRingGroup.visible = false;

        const norm = Math.hypot(inX, inZ);
        const ix = inX / norm;
        const iz = inZ / norm;
        const sinAz = Math.sin(camState.azimuth);
        const cosAz = Math.cos(camState.azimuth);
        // Camera right = (cosAz, -sinAz), camera forward onto ground = (-sinAz, -cosAz)
        moveHeadingX = ix * cosAz - iz * sinAz;
        moveHeadingZ = -ix * sinAz - iz * cosAz;

        const speed = isFluffSpammer ? 6.0 : bestTarget && bestTarget.resonance >= 85 ? 9.4 : 7.8;
        currentVisitorPos.x += moveHeadingX * speed * dt;
        currentVisitorPos.z += moveHeadingZ * speed * dt;
        isMovingNow = true;
      } else if (playerTargetPosRef.current) {
        const dx = playerTargetPosRef.current.x - currentVisitorPos.x;
        const dz = playerTargetPosRef.current.z - currentVisitorPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.35) {
          moveHeadingX = dx / dist;
          moveHeadingZ = dz / dist;
          const speed = isFluffSpammer ? 6.5 : 9.2;
          currentVisitorPos.x += moveHeadingX * Math.min(dist, speed * dt);
          currentVisitorPos.z += moveHeadingZ * Math.min(dist, speed * dt);
          isMovingNow = true;
        } else {
          playerTargetPosRef.current = null;
          waypointRingGroup.visible = false;
          if (pendingInteractNodeRef.current) {
            const pNode = pendingInteractNodeRef.current;
            pendingInteractNodeRef.current = null;
            const { position: _p, labelAnchor: _l, hitMeshes: _h, ...detail } = pNode;
            handleSelectNode(detail);
          }
        }
      } else if (isFluffSpammer && !manualLockedRef.current && elapsed < 2.2) {
        // Keep humorous Dead Zone drift for buzzword spammers before manual steering
        currentVisitorPos.lerp(DEAD_ZONE_POS, 0.03);
      }

      // Soft circular collision sliding around OSM building cores + walkable boundaries
      buildingColliders.forEach((col) => {
        const dx = currentVisitorPos.x - col.x;
        const dz = currentVisitorPos.z - col.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001 && dist < col.r) {
          currentVisitorPos.x = col.x + (dx / dist) * col.r;
          currentVisitorPos.z = col.z + (dz / dist) * col.r;
        }
      });
      clampToWalkBounds(currentVisitorPos);

      if (waypointRingGroup.visible) {
        waypointRingGroup.rotation.y = elapsed * 2.2;
      }

      const groundBaseY = 0.05;
      if (isMovingNow) {
        visitorGroup.position.set(
          currentVisitorPos.x,
          groundBaseY + Math.abs(Math.sin(elapsed * 13)) * 0.22,
          currentVisitorPos.z
        );
        visitorGroup.rotation.y = Math.atan2(moveHeadingX, moveHeadingZ);
        visitorGroup.rotation.z = Math.sin(elapsed * 13) * 0.055;
      } else {
        visitorGroup.position.set(
          currentVisitorPos.x,
          groundBaseY + Math.sin(elapsed * 2.4) * 0.07,
          currentVisitorPos.z
        );
        visitorGroup.rotation.z *= 0.85;
      }

      visitorRingGroup.rotation.y = elapsed * 0.85;

      // Nearest Node Proximity Scanner (triggers in-world Enter Venue / Board Transit prompt)
      let closestRec: WorldNodeRecord | null = null;
      let closestDist = 5.6;
      for (const nr of nodeRecords) {
        const refX = nr.standSpot ? nr.standSpot[0] : nr.position.x;
        const refZ = nr.standSpot ? nr.standSpot[1] : nr.position.z;
        const dCenter = Math.hypot(currentVisitorPos.x - nr.position.x, currentVisitorPos.z - nr.position.z);
        const dStand = Math.hypot(currentVisitorPos.x - refX, currentVisitorPos.z - refZ);
        const d = Math.min(dCenter, dStand);
        if (d < closestDist) {
          closestDist = d;
          closestRec = nr;
        }
      }
      const nextNearbyId = closestRec?.id || null;
      if (nextNearbyId !== prevNearbyIdRef.current) {
        prevNearbyIdRef.current = nextNearbyId;
        if (closestRec) {
          const { position: _p, labelAnchor: _l, hitMeshes: _h, ...detail } = closestRec;
          setNearbyNode(detail);
        } else {
          setNearbyNode(null);
        }
      }

      if (!manualLockedRef.current && !autoSelectedOnceRef.current && bestTarget) {
        autoSelectedOnceRef.current = true;
        const { position: _p, labelAnchor: _l, hitMeshes: _h, ...detail } = bestTarget;
        setSelectedNode(detail);
      }

      // Rebuild curved coloured-pencil semantic ley-lines + advance beads from player feet
      flowRibbons.forEach((ribbon, rIdx) => {
        const startPt = V(
          visitorGroup.position.x,
          visitorGroup.position.y + 0.95,
          visitorGroup.position.z
        );
        const endPt = ribbon.targetPos.clone();
        const midPt = startPt.clone().lerp(endPt, 0.5);
        midPt.y += ribbon.isPrimary ? 2.4 : 1.7;

        const curve = new THREE.QuadraticBezierCurve3(startPt, midPt, endPt);

        const tubeGeo = new THREE.TubeGeometry(
          curve,
          20,
          ribbon.isPrimary ? 0.13 : 0.065,
          6,
          false
        );
        field(tubeGeo);
        hue(tubeGeo, ribbon.colorHex);
        if (tubeGeo.attributes.uv) tubeGeo.deleteAttribute('uv');

        if (ribbon.tubeMesh) {
          ribbon.tubeMesh.geometry.dispose();
          ribbon.tubeMesh.geometry = tubeGeo;
        } else {
          ribbon.tubeMesh = new THREE.Mesh(tubeGeo, pencil.line);
          ribbon.tubeMesh.castShadow = true;
          gravityVisualsGroup.add(ribbon.tubeMesh);
        }

        ribbon.beads.forEach((bead, bIdx) => {
          const t =
            (elapsed * (ribbon.isPrimary ? 0.45 : 0.3) + bIdx / ribbon.beads.length + rIdx * 0.15) %
            1;
          bead.position.copy(curve.getPointAt(t));
        });
      });

      if (cinematicRef.current && !camState.isDragging) {
        camState.azimuth += dt * 0.21;
        camState.polar = (sceneMode === 'city' ? 0.94 : 0.9) + Math.sin(elapsed * 0.42) * 0.08;
      } else if (!camState.isDragging) {
        // Responsive third-person camera follow in Exploration Game Mode
        camState.target.lerp(V(currentVisitorPos.x, 1.35, currentVisitorPos.z), 0.1);
      }

      const sinPolar = Math.sin(camState.polar);
      const cosPolar = Math.cos(camState.polar);
      camera.position.set(
        camState.target.x + camState.distance * sinPolar * Math.sin(camState.azimuth),
        camState.target.y + camState.distance * cosPolar,
        camState.target.z + camState.distance * sinPolar * Math.cos(camState.azimuth)
      );
      camera.lookAt(camState.target);
      camera.updateMatrixWorld(true);

      moving.forEach((fn) => fn(dt, elapsed, camera));

      // Render through @blendi/coloured-pencil sketchbook post-process (depth outlines + tooth + paper)
      page.render(scene, camera);

      nodeRecords.forEach((node) => {
        const el = labelDomRefs.current[node.id];
        if (!el) return;
        const { sx, sy, visible } = projectToScreen(node.labelAnchor, curW, curH);
        const topSafeY = 68;
        const bottomSafeY = curH - 135;
        if (!visible || sx < 40 || sx > curW - 40 || sy < topSafeY || sy > bottomSafeY) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        }
      });

      if (visitorLabelRef.current) {
        const vAnchor = visitorGroup.position.clone().add(V(0, 3.0, 0));
        const { sx, sy, visible } = projectToScreen(vAnchor, curW, curH);
        if (!visible || sy < 62 || sy > curH - 125) {
          visitorLabelRef.current.style.opacity = '0';
          if (visitorBubbleRef.current) visitorBubbleRef.current.style.opacity = '0';
        } else {
          visitorLabelRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
          visitorLabelRef.current.style.opacity = '1';
          if (visitorBubbleRef.current) {
            const bx = Math.max(135, Math.min(curW - 135, sx));
            const by = Math.max(96, Math.min(curH - 175, sy));
            visitorBubbleRef.current.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, calc(-100% - 34px))`;
            visitorBubbleRef.current.style.opacity = sy < 75 || sy > curH - 135 ? '0' : '1';
          }
        }
      }

      if (hostBubbleRef.current) {
        const targetNode = nodeRecords.find((n) => n.id === activeNodeIdRef.current);
        if (!targetNode) {
          hostBubbleRef.current.style.opacity = '0';
        } else {
          const { sx, sy, visible } = projectToScreen(targetNode.labelAnchor, curW, curH);
          if (!visible || sx < 40 || sx > curW - 40 || sy < 75 || sy > curH - 135) {
            hostBubbleRef.current.style.opacity = '0';
          } else {
            const bx = Math.max(135, Math.min(curW - 135, sx));
            const by = Math.max(96, Math.min(curH - 175, sy));
            hostBubbleRef.current.style.transform = `translate3d(${bx}px, ${by}px, 0) translate(-50%, calc(-100% - 44px))`;
            hostBubbleRef.current.style.opacity = '1';
          }
        }
      }

      if (deadZoneLabelRef.current) {
        const dzAnchor = DEAD_ZONE_POS.clone().add(V(0, 0.45, 4.2));
        const { sx, sy, visible } = projectToScreen(dzAnchor, curW, curH);
        if (!visible || (!isFluffSpammer && sceneMode === 'city')) {
          deadZoneLabelRef.current.style.opacity = '0';
        } else {
          deadZoneLabelRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
          deadZoneLabelRef.current.style.opacity = '1';
        }
      }
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw <= 0 || nh <= 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      syncStrokeSpacing();
      page.resize();
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (resizeObserver) resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      disposeSceneResources(scene);
      pencil.dispose();
      page.dispose();
      renderer.dispose();
    };
  }, [
    sceneMode,
    currentDistrict,
    activeCutsceneMode,
    activeCutsceneTo,
    selectedVisitor,
    mergedCompanies,
    mergedApplicants,
    pullSeed,
    handleSelectNode,
  ]);

  const isSpammer = selectedVisitor.fluffIndex > 60;
  const primaryNodes = useMemo(
    () => uiNodes.filter((n) => n.kind !== 'peer').sort((a, b) => b.resonance - a.resonance),
    [uiNodes]
  );
  const topResonantNode = primaryNodes[0] || null;
  const activeCardNode = selectedNode || topResonantNode;
  activeNodeIdRef.current = activeCardNode?.id || null;
  activeCardNodeRef.current = activeCardNode;

  const activeCacheKey = activeCardNode
    ? `${selectedVisitor.id}::${activeCardNode.id}::${sceneMode}::${currentDistrict}`
    : '';
  const activeLiveSpark = activeCacheKey ? liveSparks[activeCacheKey] || null : null;
  const isSparkLoading = Boolean(activeCacheKey && sparkLoadingKey === activeCacheKey);

  const handleHudSelectNode = useCallback(
    (node: NodeDetail) => {
      handleSelectNode(node);
      if (activeCutsceneRef.current) return;
      const worldMatch = worldNodesRef.current.find((w) => w.id === node.id) || null;
      if (!worldMatch) return;
      const stand = worldMatch.standSpot
        ? new THREE.Vector3(worldMatch.standSpot[0], 0, worldMatch.standSpot[1])
        : worldMatch.position.clone().setY(0).lerp(playerPosRef.current.clone().setY(0), 0.25);
      playerTargetPosRef.current = stand;
      pendingInteractNodeRef.current = worldMatch;
    },
    [handleSelectNode]
  );

  const runNodeSpark = useCallback(
    async (node: NodeDetail, visitor: Applicant, mode: SceneMode, forceRefresh: boolean) => {
      const cacheKey = `${visitor.id}::${node.id}::${mode}::${currentDistrict}`;
      if (!forceRefresh && liveSparksRef.current[cacheKey]) {
        return;
      }
      if (!forceRefresh && sparkInFlightKeyRef.current === cacheKey) {
        return;
      }

      sparkAbortRef.current?.abort();
      const ctrl = new AbortController();
      sparkAbortRef.current = ctrl;
      sparkInFlightKeyRef.current = cacheKey;
      setSparkLoadingKey(cacheKey);
      setGeminiStatus('thinking');

      try {
        const result = await fetchLiveNodeSpark(visitor, node, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setLiveSparks((prev) => ({ ...prev, [cacheKey]: result }));
        setLastLatencyMs(result.latencyMs);
        setGeminiStatus(result.source === 'live' ? 'live' : 'fallback');
      } catch {
        // Ignored when aborted by newer selection
      } finally {
        if (sparkInFlightKeyRef.current === cacheKey) {
          sparkInFlightKeyRef.current = null;
        }
        setSparkLoadingKey((prev) => (prev === cacheKey ? null : prev));
      }
    },
    [currentDistrict]
  );

  useEffect(() => {
    if (!activeCardNode || activeCutscene || activeCardNode.kind === 'transit') return;
    void runNodeSpark(activeCardNode, selectedVisitor, sceneMode, false);
  }, [activeCardNode, activeCutscene, selectedVisitor, sceneMode, runNodeSpark]);

  useEffect(() => {
    return () => {
      sparkAbortRef.current?.abort();
      exchangeAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!exchangeState.playing || !exchangeState.result) return;
    const totalTurns = exchangeState.result.turns.length;
    if (totalTurns === 0) return;

    const timer = window.setInterval(() => {
      setExchangeState((prev) => {
        if (!prev.playing || !prev.result) return prev;
        if (prev.activeIdx + 1 >= prev.result.turns.length) {
          return { ...prev, playing: false };
        }
        return { ...prev, activeIdx: prev.activeIdx + 1 };
      });
    }, 2500);

    return () => window.clearInterval(timer);
  }, [exchangeState.playing, exchangeState.result]);

  const handleRegenerateSpark = useCallback(() => {
    if (!activeCardNode) return;
    playSemanticChime(selectedVisitor.fluffIndex <= 60 && activeCardNode.resonance > 50, audioEnabled);
    setShowSparkPreviewBubble(true);
    if (sparkPreviewTimerRef.current !== null) {
      window.clearTimeout(sparkPreviewTimerRef.current);
    }
    sparkPreviewTimerRef.current = window.setTimeout(() => {
      setShowSparkPreviewBubble(false);
    }, 4500);
    void runNodeSpark(activeCardNode, selectedVisitor, sceneMode, true);
  }, [activeCardNode, selectedVisitor, sceneMode, audioEnabled, runNodeSpark]);

  const handleToggleExchange = useCallback(async () => {
    if (!activeCardNode || !activeCacheKey) return;

    if (exchangeState.key === activeCacheKey && exchangeState.result) {
      if (exchangeState.playing) {
        setExchangeState((prev) => ({ ...prev, playing: false }));
      } else {
        playSemanticChime(selectedVisitor.fluffIndex <= 60 && activeCardNode.resonance > 50, audioEnabled);
        setExchangeState((prev) => ({
          ...prev,
          playing: true,
          activeIdx: prev.activeIdx + 1 >= (prev.result?.turns.length || 0) ? 0 : prev.activeIdx,
        }));
      }
      return;
    }

    exchangeAbortRef.current?.abort();
    const ctrl = new AbortController();
    exchangeAbortRef.current = ctrl;
    exchangeRequestKeyRef.current = activeCacheKey;
    setExchangeState({
      key: activeCacheKey,
      loading: true,
      playing: false,
      activeIdx: 0,
      result: null,
    });
    setGeminiStatus('thinking');

    try {
      const res = await fetchSimulatedExchange(selectedVisitor, activeCardNode, ctrl.signal);
      if (ctrl.signal.aborted || exchangeRequestKeyRef.current !== activeCacheKey) return;
      setLastLatencyMs(res.latencyMs);
      setGeminiStatus(res.source === 'live' ? 'live' : 'fallback');
      setExchangeState({
        key: activeCacheKey,
        loading: false,
        playing: true,
        activeIdx: 0,
        result: res,
      });
      playSemanticChime(selectedVisitor.fluffIndex <= 60 && activeCardNode.resonance > 50, audioEnabled);
    } catch {
      if (!ctrl.signal.aborted) {
        setExchangeState((prev) => (prev.key === activeCacheKey ? { ...prev, loading: false } : prev));
      }
    }
  }, [activeCardNode, activeCacheKey, exchangeState, selectedVisitor, audioEnabled]);

  const handlePitchSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!pitchName.trim() || !pitchText.trim() || pitchSubmitting) return;

      setPitchSubmitting(true);
      setGeminiStatus('thinking');
      try {
        const res = await evaluateCustomPitch(pitchName, pitchRole, pitchText, mergedCompanies);
        setCustomApplicants((prev) => [res.applicant, ...prev]);
        setSelectedVisitorId(res.applicant.id);
        setPullSeed((s) => s + 1);
        setLastLatencyMs(res.latencyMs);
        setGeminiStatus(res.source === 'live' ? 'live' : 'fallback');
        setLastPitchEval({
          applicantId: res.applicant.id,
          name: res.applicant.name,
          fluffIndex: res.applicant.fluffIndex,
          competenceScore: res.applicant.competenceScore,
          reason: res.reason,
          source: res.source,
          latencyMs: res.latencyMs,
        });
        playSemanticChime(res.applicant.fluffIndex <= 60, audioEnabled);
      } finally {
        setPitchSubmitting(false);
      }
    },
    [pitchName, pitchRole, pitchText, pitchSubmitting, mergedCompanies, audioEnabled]
  );

  const exchangeForActive =
    exchangeState.key === activeCacheKey && exchangeState.result ? exchangeState.result : null;
  const activeExchangeTurn =
    exchangeForActive && exchangeForActive.turns[exchangeState.activeIdx]
      ? exchangeForActive.turns[exchangeState.activeIdx]
      : null;

  const shouldShow3DBubbles = Boolean(activeExchangeTurn || showSparkPreviewBubble);

  const visitorBubbleText = !shouldShow3DBubbles
    ? ''
    : activeExchangeTurn
    ? activeExchangeTurn.speaker === 'visitor'
      ? activeExchangeTurn.line
      : ''
    : activeLiveSpark?.visitorBubble || '';

  const hostBubbleText = !shouldShow3DBubbles
    ? ''
    : activeExchangeTurn
    ? activeExchangeTurn.speaker === 'host'
      ? activeExchangeTurn.line
      : ''
    : activeLiveSpark?.hostBubble || '';

  const corePerspectiveIds = ['app-01', 'app-tariq', 'app-04', 'app-02'];
  const customIds = customApplicants.map((a) => a.id);
  const extraApplicants = mergedApplicants.filter(
    (a) => !corePerspectiveIds.includes(a.id) && !customIds.includes(a.id)
  );

  const isBusyGemini =
    geminiStatus === 'thinking' || isSparkLoading || pitchSubmitting || exchangeState.loading;

  const TRANSIT_ICON_MAP: Record<TransitMode, React.ComponentType<{ className?: string }>> = {
    metro: TrainFront,
    tram: TramFront,
    bus: Bus,
    bike: Bike,
  };
  const ActiveCutsceneIcon = activeCutscene ? TRANSIT_ICON_MAP[activeCutscene.mode] : TrainFront;
  const NearbyTransitIcon =
    nearbyNode?.transitMode ? TRANSIT_ICON_MAP[nearbyNode.transitMode] : TrainFront;
  const ActiveTransitIcon =
    activeCardNode?.transitMode ? TRANSIT_ICON_MAP[activeCardNode.transitMode] : TrainFront;
  const otherDistricts = (['otaniemi', 'keilaniemi', 'kera'] as DistrictId[]).filter(
    (d) => d !== currentDistrict
  );

  const steerDpad = (dx: number, dz: number) => {
    mobileMoveDirRef.current = { dx, dz };
  };

  return (
    <div
      ref={fullscreenWrapperRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen bg-[#F5EFE4] overflow-hidden select-none'
          : 'relative space-y-3 md:space-y-0 select-none'
      }
    >
      <div
        className={
          isFullscreen
            ? 'relative w-full h-full overflow-hidden bg-[#F5EFE4]'
            : 'relative w-full h-[560px] md:h-[760px] rounded-2xl overflow-hidden border border-[#CFC2A8] bg-[#F5EFE4] shadow-xl'
        }
      >
        <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-[#C6B89D]/40 z-10" />

        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* 3D-Projected Sleek Map Pins & Dialog Layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
          {!activeCutscene && (
            <>
              {uiNodes.map((node) => {
                const isSelected = activeCardNode?.id === node.id;
                const isPeer = node.kind === 'peer';
                const isTransit = node.kind === 'transit';
                const highRes = node.resonance >= 85 && !isSpammer;
                const NodeTransitIcon = node.transitMode ? TRANSIT_ICON_MAP[node.transitMode] : TrainFront;

                return (
                  <button
                    key={node.id}
                    ref={(el) => {
                      labelDomRefs.current[node.id] = el;
                    }}
                    onClick={() => handleHudSelectNode(node)}
                    style={{ opacity: 0 }}
                    className={`absolute top-0 left-0 pointer-events-auto transition-all duration-150 rounded-full border shadow-md backdrop-blur-md ${
                      isPeer ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                    } ${
                      isSelected
                        ? 'bg-[#0F172A]/95 text-white border-emerald-400 ring-2 ring-emerald-400/40'
                        : isTransit
                        ? 'bg-[#FFFDF9]/90 text-amber-950 border-amber-400/80 hover:bg-amber-50'
                        : highRes
                        ? 'bg-[#FFFDF9]/92 text-slate-900 border-emerald-600/75 hover:bg-emerald-50'
                        : 'bg-[#FFFDF9]/85 text-slate-800 border-[#CFC2A8]/90 hover:border-[#00508F]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 whitespace-nowrap font-bold tracking-tight">
                      {isTransit ? (
                        <NodeTransitIcon
                          className={`w-3 h-3 shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`}
                        />
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? '#34d399' : node.accentHex }}
                        />
                      )}
                      <span>{node.name}</span>
                      {!isSpammer && node.resonance > 0 && !isTransit && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950'
                              : node.resonance >= 85
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-900'
                          }`}
                        >
                          {node.resonance}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <div
                ref={visitorLabelRef}
                style={{ opacity: 0 }}
                className={`absolute top-0 left-0 px-2 py-0.5 rounded-full shadow-md border border-white/90 text-[10px] font-extrabold whitespace-nowrap flex items-center gap-1.5 ${
                  isSpammer ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{selectedVisitor.name}</span>
                <span className="opacity-90 font-semibold">
                  · {isSpammer ? `${selectedVisitor.fluffIndex}% Fluff` : `${selectedVisitor.competenceScore}% Fit`}
                </span>
              </div>

              {/* 3D Floating Visitor Speech Bubble (Active during 20s Chat / Re-Spark) */}
              <div
                ref={visitorBubbleRef}
                style={{ opacity: 0 }}
                className={`absolute top-0 left-0 max-w-[235px] px-2.5 py-1.5 rounded-xl border-2 shadow-lg backdrop-blur-md transition-opacity duration-150 ${
                  visitorBubbleText ? '' : 'hidden'
                } ${
                  isSpammer
                    ? 'bg-red-50/95 border-red-400 text-red-950 border-dashed'
                    : 'bg-[#FFFDF9]/95 border-emerald-600 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-wider mb-0.5 opacity-80">
                  <span className={isSpammer ? 'text-red-700' : 'text-emerald-700'}>
                    {selectedVisitor.name}
                  </span>
                  {activeExchangeTurn && (
                    <span className="px-1 rounded bg-slate-900 text-white">
                      Turn {exchangeState.activeIdx + 1}/{exchangeForActive?.turns.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold leading-snug">“{visitorBubbleText}”</p>
              </div>

              {/* 3D Floating Host / Pod Speech Bubble */}
              <div
                ref={hostBubbleRef}
                style={{ opacity: 0 }}
                className={`absolute top-0 left-0 max-w-[235px] px-2.5 py-1.5 rounded-xl border-2 bg-[#F8FBFF]/95 border-[#00508F] text-slate-900 shadow-lg backdrop-blur-md transition-opacity duration-150 ${
                  hostBubbleText && activeCardNode ? '' : 'hidden'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-wider mb-0.5 text-[#00508F]">
                  <span className="truncate">
                    {activeCardNode?.repLabel
                      ? activeCardNode.repLabel.split('·')[0].trim()
                      : activeCardNode?.name || 'Espoo Host'}
                  </span>
                  {activeExchangeTurn && (
                    <span className="px-1 rounded bg-[#00508F] text-white shrink-0">
                      Turn {exchangeState.activeIdx + 1}/{exchangeForActive?.turns.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold leading-snug">“{hostBubbleText}”</p>
              </div>

              <div
                ref={deadZoneLabelRef}
                style={{ opacity: 0 }}
                className="absolute top-0 left-0 px-2.5 py-0.5 rounded-full bg-red-50/95 border border-red-400 text-[10px] font-bold uppercase tracking-wider text-red-700 whitespace-nowrap shadow-sm"
              >
                Dead Zone · 0% Gravity
              </div>
            </>
          )}

          {/* 3D Floating Transit Cutscene Serendipity Bubble */}
          {activeCutscene && (
            <div
              ref={cutsceneBubbleRef}
              style={{ opacity: 0 }}
              className="absolute top-0 left-0 max-w-[285px] px-3 py-2 rounded-2xl border-2 border-emerald-600 bg-[#FFFDF8]/96 text-slate-900 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 mb-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Transit Serendipity
                </span>
                <span className="font-mono text-slate-500">Gemini 3.5 Flash-Lite</span>
              </div>
              <p className="text-[11px] font-semibold leading-snug text-slate-900">
                “{activeCutscene.serendipityText}”
              </p>
            </div>
          )}
        </div>

        {/* Cutscene Cinematic Banner & Skip Bar */}
        {activeCutscene && (
          <>
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0F172A]/92 text-white border border-emerald-400/70 shadow-2xl backdrop-blur-md">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                  <ActiveCutsceneIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                    {activeCutscene.mode === 'metro'
                      ? 'LÄNSIMETRO M1 · ZERO-EMISSION TRANSIT'
                      : activeCutscene.mode === 'tram'
                      ? 'RAIDE-JOKERI 15 · LIGHT RAIL'
                      : activeCutscene.mode === 'bus'
                      ? 'HSL ELECTRIC TRUNK BUS 520'
                      : 'HSL CITY BIKE · RANTARAITTI'}
                  </div>
                  <div className="text-xs font-extrabold tracking-tight">
                    {activeCutscene.lineLabel}
                  </div>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold">
                  -{activeCutscene.co2SavedGrams}g CO₂ · {activeCutscene.durationMinutes} min
                </span>
              </div>

              <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFDF8]/95 backdrop-blur-md border border-[#C8BC9F] shadow-md text-[11px]">
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="font-extrabold text-slate-900">Gemini 3.5 Flash-Lite</span>
              </div>
            </div>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => finishTransitCutscene(activeCutscene)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFFDF8]/95 hover:bg-emerald-50 text-slate-900 border border-[#C8BC9F] font-extrabold text-xs shadow-xl transition-all"
              >
                Skip Cutscene
                <ArrowRight className="w-3.5 h-3.5 text-[#00508F]" />
              </button>
            </div>
          </>
        )}

        {/* Single-Row Unified Studio Top Bar */}
        {!activeCutscene && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
            {/* Left Pill Cluster: Districts + Dipoli + Green Mobility */}
            <div className="pointer-events-auto flex items-center gap-0.5 bg-[#FFFDF9]/92 backdrop-blur-md border border-[#D4C8B0] rounded-full p-1 shadow-lg overflow-x-auto max-w-full">
              {(['otaniemi', 'keilaniemi', 'kera'] as DistrictId[]).map((dId) => {
                const spec = DISTRICT_SPECS[dId];
                const isCurrent = sceneMode === 'city' && currentDistrict === dId;
                return (
                  <button
                    key={dId}
                    onClick={() => {
                      if (sceneMode === 'city' && currentDistrict !== dId) {
                        startTransitCutscene(dId);
                      } else {
                        setSceneMode('city');
                        setCurrentDistrict(dId);
                      }
                    }}
                    title={`${spec.name} · ${spec.gpsLabel}`}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'bg-[#00508F] text-white shadow-sm'
                        : 'text-slate-700 hover:bg-[#EFE7D6]'
                    }`}
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{spec.shortName}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setSceneMode('venue')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                  sceneMode === 'venue'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-[#EFE7D6]'
                }`}
              >
                <Building2 className="w-3 h-3 shrink-0" />
                <span>Inside Dipoli</span>
              </button>

              <div className="h-4 w-px bg-[#D8CCB4] mx-1 shrink-0" />

              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-400/70 whitespace-nowrap shrink-0"
                title="Zero-emission carbon savings from riding HSL Länsimetro, Raide-Jokeri, Electric Bus, or City Bike"
              >
                <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>-{greenStats.co2SavedGrams}g CO₂</span>
              </div>
            </div>

            {/* Right Pill Cluster: Perspective + Gemini + Pitch + Orbit + Respawn + Fullscreen */}
            <div className="pointer-events-auto hidden md:flex items-center gap-1 bg-[#FFFDF9]/92 backdrop-blur-md border border-[#D4C8B0] rounded-full p-1 shadow-lg shrink-0">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5EFE4]/80 border border-[#E0D5BE]">
                <Users className="w-3 h-3 text-[#00508F] shrink-0" />
                <select
                  aria-label="Attendee Perspective Switcher"
                  value={selectedVisitor.id}
                  onChange={(e) => setSelectedVisitorId(e.target.value)}
                  className="bg-transparent text-[11px] font-extrabold text-slate-900 outline-none cursor-pointer max-w-[148px]"
                >
                  {customApplicants.length > 0 && (
                    <optgroup label="Live Gemini Dropped Pitches">
                      {customApplicants.map((app) => (
                        <option key={app.id} value={app.id}>
                          ⚡ {app.name} ({app.fluffIndex > 60 ? `${app.fluffIndex}% Fluff` : `${app.competenceScore}% Fit`})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Core Showcase Perspectives">
                    <option value="app-01">Priya Nair (Rust)</option>
                    <option value="app-tariq">Dr. Tariq (RISC-V)</option>
                    <option value="app-04">Mateo Rojas (Cryo)</option>
                    <option value="app-02">Victor Sterling (Fluff)</option>
                  </optgroup>
                  {extraApplicants.length > 0 && (
                    <optgroup label="Live Espoo Applicant Queue">
                      {extraApplicants.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name} ({app.fluffIndex > 60 ? `${app.fluffIndex}% Fluff` : app.cluster})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5EFE4]/80 border border-[#E0D5BE] text-[10px]">
                <Zap className={`w-3 h-3 text-amber-500 ${isBusyGemini ? 'animate-pulse' : ''}`} />
                <span className="font-extrabold text-slate-900">Gemini 3.5</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                    isBusyGemini
                      ? 'bg-amber-100 text-amber-900'
                      : geminiStatus === 'live'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isBusyGemini
                    ? '…'
                    : geminiStatus === 'live' && lastLatencyMs !== null
                    ? `${lastLatencyMs}ms`
                    : 'Live'}
                </span>
                <button
                  onClick={() => setAudioEnabled((prev) => !prev)}
                  aria-label="Toggle Gemini Semantic Audio"
                  title={audioEnabled ? 'Mute semantic chimes' : 'Enable semantic chimes'}
                  className="p-0.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-[#E5DEC9]"
                >
                  {audioEnabled ? (
                    <Volume2 className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <VolumeX className="w-3 h-3" />
                  )}
                </button>
              </div>

              <button
                onClick={() => setPitchDrawerOpen((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  pitchDrawerOpen
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-900 hover:bg-emerald-50'
                }`}
                title="Drop any live technical pitch and watch Gemini score semantic gravity vs fluff in 3D"
              >
                <Wand2 className="w-3 h-3" />
                <span>Pitch</span>
              </button>

              <button
                onClick={() => setCinematicMode((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  cinematicMode
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-800 hover:bg-[#EFE7D6]'
                }`}
                title="Smooth 360° camera rotation for pitch recording"
              >
                {cinematicMode ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-[#00508F]" />}
                <span>Orbit</span>
              </button>

              <button
                onClick={() => setPullSeed((s) => s + 1)}
                className="p-1.5 rounded-full text-slate-700 hover:bg-[#EFE7D6] transition-all"
                title="Respawn character at arrival terminal and replay gravitational pull"
                aria-label="Respawn character"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#00508F]" />
              </button>

              <button
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                title="Toggle Fullscreen Mode (F)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all ${
                  isFullscreen
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'bg-[#00508F] hover:bg-[#003F73] text-white shadow-sm'
                }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>Fullscreen</span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Compact Controls Toggle */}
            <div className="pointer-events-auto flex md:hidden items-center gap-1 bg-[#FFFDF9]/92 backdrop-blur-md border border-[#D4C8B0] rounded-full p-1 shadow-lg shrink-0">
              <button
                onClick={() => setPitchDrawerOpen((prev) => !prev)}
                aria-label="Drop Your Pitch"
                className="p-1.5 rounded-full text-emerald-800 hover:bg-emerald-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                className="p-1.5 rounded-full bg-[#00508F] text-white"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Anchored Live Pitch Evaluator Popover */}
        {!activeCutscene && pitchDrawerOpen && (
          <div className="absolute top-14 right-3 z-30 w-[350px] max-w-[calc(100%-24px)] bg-[#FFFDF9]/98 backdrop-blur-md border-2 border-[#C8BC9F] rounded-2xl p-3.5 shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-extrabold text-slate-900">
                  Live Semantic Gravity Tester
                </span>
              </div>
              <button
                onClick={() => setPitchDrawerOpen(false)}
                aria-label="Close Pitch Tester"
                className="p-1 rounded-lg text-slate-500 hover:bg-[#EFE7D6] hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Presets:
              </span>
              {PITCH_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setPitchName(preset.name);
                    setPitchRole(preset.role);
                    setPitchText(preset.pitch);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-colors ${
                    preset.kind === 'builder'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form onSubmit={handlePitchSubmit} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={pitchName}
                  onChange={(e) => setPitchName(e.target.value)}
                  placeholder="Attendee name"
                  aria-label="Pitch Name"
                  className="px-2.5 py-1.5 rounded-lg border border-[#D4C8B0] bg-white text-slate-900 font-semibold outline-none focus:border-emerald-600"
                />
                <input
                  type="text"
                  value={pitchRole}
                  onChange={(e) => setPitchRole(e.target.value)}
                  placeholder="Role / Title"
                  aria-label="Pitch Role"
                  className="px-2.5 py-1.5 rounded-lg border border-[#D4C8B0] bg-white text-slate-900 font-semibold outline-none focus:border-emerald-600"
                />
              </div>
              <textarea
                rows={3}
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                placeholder="Paste concrete system architecture/measurements or AI buzzwords to test Dead Zone repulsion..."
                aria-label="Technical Pitch"
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#D4C8B0] bg-white text-slate-900 leading-snug outline-none focus:border-emerald-600 resize-none"
              />
              <button
                type="submit"
                disabled={pitchSubmitting}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-extrabold text-xs shadow transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                {pitchSubmitting ? 'Scoring Gravity via Gemini…' : 'Evaluate Gravity & Drop into 3D'}
              </button>
            </form>

            {lastPitchEval && (
              <div
                className={`mt-2.5 p-2 rounded-xl border text-[11px] ${
                  lastPitchEval.fluffIndex > 60
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between font-extrabold mb-0.5">
                  <span>
                    {lastPitchEval.name}:{' '}
                    {lastPitchEval.fluffIndex > 60
                      ? `Dead Zone (${lastPitchEval.fluffIndex}% Fluff)`
                      : `${lastPitchEval.competenceScore}% Fit`}
                  </span>
                  <span className="text-[10px] font-mono opacity-80">
                    {lastPitchEval.source === 'live' ? `${lastPitchEval.latencyMs}ms Live` : 'Offline Eval'}
                  </span>
                </div>
                <p className="leading-snug opacity-90">{lastPitchEval.reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Sleek Circular Navigation Compass Overlay */}
        {!activeCutscene && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-3 md:bottom-4 left-3 z-20 flex flex-col items-center gap-1 select-none"
          >
            <div className="relative w-[76px] h-[76px] rounded-full bg-[#FFFDF9]/90 backdrop-blur-md border border-[#C8BC9F] shadow-lg flex items-center justify-center">
              <button
                type="button"
                aria-label="Walk Forward"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  steerDpad(0, 1);
                }}
                onPointerUp={() => steerDpad(0, 0)}
                onPointerLeave={() => steerDpad(0, 0)}
                onPointerCancel={() => steerDpad(0, 0)}
                className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-5 rounded-full hover:bg-emerald-100 active:bg-emerald-600 active:text-white flex items-center justify-center text-slate-700 transition-colors touch-none"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Walk Left"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  steerDpad(-1, 0);
                }}
                onPointerUp={() => steerDpad(0, 0)}
                onPointerLeave={() => steerDpad(0, 0)}
                onPointerCancel={() => steerDpad(0, 0)}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-6 rounded-full hover:bg-emerald-100 active:bg-emerald-600 active:text-white flex items-center justify-center text-slate-700 transition-colors touch-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Stop Walking"
                onClick={() => {
                  steerDpad(0, 0);
                  playerTargetPosRef.current = null;
                }}
                title="Walk with WASD, Arrow keys, or click anywhere on the ground"
                className="w-7 h-7 rounded-full bg-[#00508F]/10 hover:bg-[#00508F]/20 border border-[#C8BC9F] flex items-center justify-center text-[#00508F] transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Walk Right"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  steerDpad(1, 0);
                }}
                onPointerUp={() => steerDpad(0, 0)}
                onPointerLeave={() => steerDpad(0, 0)}
                onPointerCancel={() => steerDpad(0, 0)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-6 rounded-full hover:bg-emerald-100 active:bg-emerald-600 active:text-white flex items-center justify-center text-slate-700 transition-colors touch-none"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Walk Backward"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  steerDpad(0, -1);
                }}
                onPointerUp={() => steerDpad(0, 0)}
                onPointerLeave={() => steerDpad(0, 0)}
                onPointerCancel={() => steerDpad(0, 0)}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-5 rounded-full hover:bg-emerald-100 active:bg-emerald-600 active:text-white flex items-center justify-center text-slate-700 transition-colors touch-none"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#FFFDF9]/90 border border-[#C8BC9F] text-[8px] font-bold tracking-wide text-slate-600 shadow-sm whitespace-nowrap">
              WASD · Tap
            </span>
          </div>
        )}
      </div>

      {/* Centered Compact Bottom Studio Dock & Proximity Action Pill */}
      {!activeCutscene && (
        <div
          className={`${
            isFullscreen
              ? 'absolute bottom-3 left-24 right-3'
              : 'mt-3 md:mt-0 md:absolute md:bottom-3 md:left-24 md:right-3'
          } z-20 pointer-events-none flex flex-col items-center gap-1.5`}
        >
          {/* Integrated Proximity Action Pill */}
          {nearbyNode && (
            <div className="pointer-events-auto">
              {nearbyNode.kind === 'transit' ? (
                <div className="bg-[#0F172A]/95 text-white border border-emerald-400 rounded-full px-3.5 py-1 shadow-xl backdrop-blur-md flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
                    <NearbyTransitIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Near {nearbyNode.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(nearbyNode.targetDistricts && nearbyNode.targetDistricts.length > 0
                      ? nearbyNode.targetDistricts
                      : otherDistricts
                    ).map((dest, idx) => (
                      <button
                        key={dest}
                        onClick={() => startTransitCutscene(dest, nearbyNode.transitMode)}
                        className="px-2.5 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow transition-colors"
                      >
                        <span>Board → {DISTRICT_SPECS[dest].shortName}</span>
                        {idx === 0 && (
                          <kbd className="px-1 rounded bg-slate-900/80 text-white text-[9px] font-mono">
                            E
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : nearbyNode.canEnterVenue && sceneMode === 'city' ? (
                <button
                  onClick={() => setSceneMode('venue')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-300 rounded-full px-3.5 py-1 shadow-xl flex items-center gap-2 text-[11px] font-extrabold transition-all"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Enter Dipoli</span>
                  <kbd className="px-1.5 py-0.5 rounded-full bg-slate-900/70 text-[9px] font-mono">E</kbd>
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleSelectNode(nearbyNode);
                    void handleToggleExchange();
                  }}
                  className="bg-[#00508F] hover:bg-[#003F73] text-white border border-sky-300 rounded-full px-3.5 py-1 shadow-xl flex items-center gap-2 text-[11px] font-extrabold transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>20s Chat · {nearbyNode.name}</span>
                  <kbd className="px-1.5 py-0.5 rounded-full bg-slate-900/70 text-[9px] font-mono">E</kbd>
                </button>
              )}
            </div>
          )}

          {/* Compact Studio Dock Card */}
          <div className="w-full max-w-4xl bg-[#FFFDF9]/94 backdrop-blur-md border border-[#C8BC9F] rounded-2xl px-3.5 py-2.5 shadow-2xl pointer-events-auto">
            {/* Top Mini Node-Pill Strip + Attendee Fit Summary */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E5DEC9]">
              <div className="flex items-center gap-1 overflow-x-auto min-w-0">
                {uiNodes.map((node) => {
                  const active = activeCardNode?.id === node.id;
                  const isTransit = node.kind === 'transit';
                  const PillTransitIcon = node.transitMode
                    ? TRANSIT_ICON_MAP[node.transitMode]
                    : TrainFront;
                  return (
                    <button
                      key={node.id}
                      onClick={() => handleHudSelectNode(node)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all flex items-center gap-1 ${
                        active
                          ? 'bg-[#00508F] text-white border-[#00508F] shadow-sm'
                          : isTransit
                          ? 'bg-amber-50 text-amber-950 border-amber-300 hover:border-amber-500'
                          : 'bg-[#F5EFE4] text-slate-700 border-[#D8CCB4] hover:border-[#00508F]'
                      }`}
                    >
                      {isTransit ? (
                        <PillTransitIcon
                          className={`w-2.5 h-2.5 shrink-0 ${active ? 'text-amber-300' : 'text-amber-600'}`}
                        />
                      ) : (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: active ? '#FFFFFF' : node.accentHex }}
                        />
                      )}
                      <span>{node.name}</span>
                      {!isSpammer && node.resonance > 0 && !isTransit && (
                        <span className={active ? 'text-emerald-200' : 'text-emerald-700'}>
                          {node.resonance}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                title={`${selectedVisitor.role} — ${selectedVisitor.demonstratedMechanism}`}
                className="shrink-0 flex items-center gap-1.5 pl-2 border-l border-[#E5DEC9]"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[9px] border ${
                    isSpammer
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-400'
                  }`}
                >
                  {selectedVisitor.avatarInitials}
                </span>
                <span className="hidden sm:inline text-[11px] font-extrabold text-slate-800 max-w-[120px] truncate">
                  {selectedVisitor.name}
                </span>
                <Cpu className="w-3 h-3 text-[#00508F] hidden md:inline shrink-0" />
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap border ${
                    isSpammer
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {isSpammer
                    ? `${selectedVisitor.fluffIndex}% Fluff`
                    : `${topResonantNode?.resonance || selectedVisitor.competenceScore}% Fit`}
                </span>
              </div>
            </div>

            {/* Single Compact Horizontal Action & Insight Row */}
            {activeCardNode ? (
              activeCardNode.kind === 'transit' ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 font-extrabold text-amber-950">
                      <ActiveTransitIcon className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>{activeCardNode.lineLabel || activeCardNode.name}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-extrabold inline-flex items-center gap-1">
                        <Leaf className="w-2.5 h-2.5 text-emerald-700" />
                        0g CO₂
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] line-clamp-1">{activeCardNode.spark}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {(activeCardNode.targetDistricts && activeCardNode.targetDistricts.length > 0
                      ? activeCardNode.targetDistricts
                      : otherDistricts
                    ).map((dest) => {
                      const meta =
                        TRANSIT_TRIP_META[
                          `${currentDistrict}->${dest}` as `${DistrictId}->${DistrictId}`
                        ];
                      const mode = activeCardNode.transitMode || meta.mode;
                      const savings =
                        mode === 'bike'
                          ? 480
                          : mode === 'metro'
                          ? 420
                          : mode === 'tram'
                          ? 780
                          : 890;
                      return (
                        <button
                          key={dest}
                          onClick={() => startTransitCutscene(dest, mode)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#00508F] hover:bg-[#003F73] text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <ActiveTransitIcon className="w-3 h-3" />
                          <span>Ride → {DISTRICT_SPECS[dest].shortName}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[9px]">
                            -{savings}g · {meta.durationMinutes}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : isSpammer ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-red-50/90 border border-red-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-red-800 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>
                        Zero Pull ({selectedVisitor.fluffIndex}% AI Fluff) — Dead Zone
                      </span>
                    </div>
                    <p className="text-red-900/90 text-[11px] leading-snug line-clamp-1 mt-0.5">
                      {activeLiveSpark?.spark ||
                        `Unlike ${baseApplicants[0].name} (96% pull), ${selectedVisitor.name} emits no semantic vector toward ${activeCardNode.name}.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleRegenerateSpark}
                      disabled={isSparkLoading}
                      className="px-2 py-1 rounded-lg bg-white border border-red-300 text-red-800 text-[10px] font-bold hover:bg-red-100 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSparkLoading ? 'animate-spin' : ''}`} />
                      Re-Spark
                    </button>
                    <button
                      onClick={handleToggleExchange}
                      disabled={exchangeState.loading}
                      className="px-2 py-1 rounded-lg bg-red-700 text-white text-[10px] font-bold hover:bg-red-800 flex items-center gap-1"
                    >
                      {exchangeState.playing ? (
                        <>
                          <Pause className="w-3 h-3" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          {exchangeState.loading ? '…' : '20s Chat'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  {/* Shared Challenge */}
                  <div className="md:w-[36%] min-w-0 bg-[#F5EFE4]/85 border border-[#DFD4BC] rounded-xl px-2.5 py-1.5 text-xs">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#00508F] flex items-center justify-between gap-1.5 mb-0.5">
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <Orbit className="w-3 h-3 shrink-0" />
                        <span className="truncate">{activeCardNode.name}</span>
                      </span>
                      {activeCardNode.repLabel && (
                        <span className="text-[9px] font-semibold normal-case text-slate-500 truncate max-w-[110px]">
                          {activeCardNode.repLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 text-[11px] font-medium leading-snug line-clamp-2">
                      {activeLiveSpark?.sharedBottleneck || activeCardNode.bottleneck}
                    </p>
                  </div>

                  {/* Gemini Conversation Spark */}
                  <div className="flex-1 min-w-0 bg-emerald-50/85 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1 min-w-0">
                        <MessageSquare className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span className="truncate">Gemini Spark</span>
                        {isSparkLoading ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[8px] font-mono shrink-0 animate-pulse">
                            thinking
                          </span>
                        ) : activeLiveSpark ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-950 text-[8px] font-mono shrink-0">
                            {activeLiveSpark.source === 'live'
                              ? `${activeLiveSpark.latencyMs}ms`
                              : 'synth'}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={handleRegenerateSpark}
                          disabled={isSparkLoading}
                          title="Generate a fresh Gemini Conversation Spark"
                          className="px-1.5 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <RefreshCw
                            className={`w-2.5 h-2.5 ${isSparkLoading ? 'animate-spin' : ''}`}
                          />
                          Re-Spark
                        </button>
                        <button
                          onClick={handleToggleExchange}
                          disabled={exchangeState.loading}
                          title="Play a 3-turn 20-second meetup exchange in 3D speech bubbles"
                          className="px-1.5 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 flex items-center gap-1"
                        >
                          {exchangeState.playing ? (
                            <>
                              <Pause className="w-2.5 h-2.5" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5" />
                              {exchangeState.loading ? '…' : '20s Chat'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-emerald-950 text-[11px] font-medium leading-snug line-clamp-2">
                      {activeLiveSpark?.spark || activeCardNode.spark}
                    </p>
                  </div>

                  {/* Primary Scene CTA */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {sceneMode === 'city' ? (
                      <button
                        onClick={() => setSceneMode('venue')}
                        className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#00508F] hover:bg-[#003F73] text-white font-bold text-[11px] shadow-md transition-all whitespace-nowrap"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Enter Dipoli</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSceneMode('city')}
                        className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFE7D6] hover:bg-[#E4D8BE] text-slate-900 font-bold text-[11px] border border-[#C6B89D] shadow-sm transition-all whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#00508F]" />
                        <span>Exit to {DISTRICT_SPECS[currentDistrict].shortName}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between gap-2 bg-[#F5EFE4] border border-[#D8CCB4] rounded-xl px-3 py-2 text-[11px] text-slate-700">
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Walk with WASD / Compass or click the ground to explore {DISTRICT_SPECS[currentDistrict].name} &amp; HSL transit.
                </span>
                {sceneMode === 'city' ? (
                  <button
                    onClick={() => setSceneMode('venue')}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-[#00508F] text-white font-bold text-[10px]"
                  >
                    Enter Dipoli
                  </button>
                ) : (
                  <button
                    onClick={() => setSceneMode('city')}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-[#EFE7D6] text-slate-900 border border-[#C6B89D] font-bold text-[10px]"
                  >
                    Exit to {DISTRICT_SPECS[currentDistrict].shortName}
                  </button>
                )}
              </div>
            )}

            {/* Slim 3-Turn Exchange Transcript Strip */}
            {exchangeForActive && activeCardNode?.kind !== 'transit' && (
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {exchangeForActive.turns.map((turn, tIdx) => {
                  const isCurrent = tIdx === exchangeState.activeIdx;
                  return (
                    <button
                      key={`${tIdx}-${turn.speaker}`}
                      onClick={() =>
                        setExchangeState((prev) => ({
                          ...prev,
                          playing: false,
                          activeIdx: tIdx,
                        }))
                      }
                      className={`text-left px-2 py-1 rounded-lg border text-[10px] transition-all ${
                        isCurrent
                          ? 'bg-[#0F172A] text-white border-emerald-500 shadow-sm'
                          : 'bg-[#F5EFE4]/85 text-slate-700 border-[#D8CCB4] hover:border-[#00508F]'
                      }`}
                    >
                      <div className="font-extrabold truncate flex items-center justify-between gap-1">
                        <span>
                          {tIdx + 1}. {turn.speakerName}
                        </span>
                        <span className="opacity-70 uppercase text-[8px]">{turn.speaker}</span>
                      </div>
                      <div className="line-clamp-1 opacity-90">{turn.line}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
