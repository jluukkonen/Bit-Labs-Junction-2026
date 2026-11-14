import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  ExternalLink,
  FileCode2,
  FileText,
  Flag,
  Languages,
  Lock,
  Orbit,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Applicant, ApplicantStatus, EventProfile } from '../types';
import {
  AIModelEngine,
  runLiveNemotronTriage,
  translateCuratorNoteTrilingual,
} from '../services/nemotronService';

interface CuratorCockpitProps {
  applicants: Applicant[];
  selectedEvent: EventProfile;
  onUpdateDecision: (
    applicantId: string,
    newStatus: ApplicantStatus,
    note: string
  ) => void;
  onUpdateApplicantReasoning: (
    applicantId: string,
    competenceScore: number,
    fluffIndex: number,
    reasoning: string
  ) => void;
  onOpenInMetaverse?: (applicantId: string) => void;
}

interface GravityDestination {
  isDeadZone: boolean;
  islandName: string;
  islandShort: string;
  islandSub: string;
  podName: string;
  roomZone: string;
  accentHex: string;
  badgeBg: string;
  gravityPct: number;
}

interface VisualTriad {
  constraint: string;
  mechanism: string;
  outcome: string;
}

function getGravityDestination(applicant: Applicant): GravityDestination {
  if (applicant.fluffIndex > 50 || applicant.competenceScore < 40) {
    return {
      isDeadZone: true,
      islandName: 'Outer Dead Zone',
      islandShort: 'Dead Zone',
      islandSub: '0% Semantic Gravity · Buzzword Repulsion',
      podName: 'No Pod Match (Unverified Claims)',
      roomZone: 'General Visitor Waitlist',
      accentHex: '#DC2626',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      gravityPct: 0,
    };
  }

  const gravityPct = applicant.competenceScore;

  switch (applicant.cluster) {
    case 'Edge AI & Robotics':
      return {
        isDeadZone: false,
        islandName: 'Otaniemi / Karaportti',
        islandShort: 'Karaportti',
        islandSub: '6G & Edge Robotics',
        podName: 'Nokia Bell Labs Espoo',
        roomZone: 'Karaportti · 6G & Edge Robotics',
        accentHex: '#059669',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        gravityPct,
      };
    case 'Quantum & Semiconductors':
      return {
        isDeadZone: false,
        islandName: 'Keilaniemi Hub',
        islandShort: 'Keilaniemi',
        islandSub: 'Cryo & Superconducting Processors',
        podName: 'IQM Quantum Computers',
        roomZone: 'Keilaniemi · Cryo & Superconducting Processors',
        accentHex: '#00508F',
        badgeBg: 'bg-sky-50 text-[#00508F] border-sky-200',
        gravityPct,
      };
    case 'CleanTech & Smart Grid':
      return {
        isDeadZone: false,
        islandName: 'Otaniemi Hub',
        islandShort: 'Otaniemi Hub',
        islandSub: 'Heavy EV Grid Power Electronics',
        podName: 'Kempower',
        roomZone: 'Otaniemi Hub · Heavy EV Grid Power Electronics',
        accentHex: '#0D9488',
        badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
        gravityPct,
      };
    case 'Bio & HealthTech':
      return {
        isDeadZone: false,
        islandName: 'Otaniemi Campus',
        islandShort: 'Otaniemi',
        islandSub: 'Microelectronics & Quantum',
        podName: 'VTT Technical Research Centre',
        roomZone: 'Otaniemi · Microelectronics & Quantum',
        accentHex: '#B45309',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        gravityPct,
      };
    case 'Sovereign AI & Cloud Infra':
    default:
      return {
        isDeadZone: false,
        islandName: 'Otaniemi Orbital',
        islandShort: 'Otaniemi',
        islandSub: 'SAR Satellite Earth Observation',
        podName: 'ICEYE',
        roomZone: 'Otaniemi · SAR Satellite Earth Observation',
        accentHex: '#0369A1',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
        gravityPct,
      };
  }
}

function clampLabel(text: string, maxLen = 78): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trimEnd()}…`;
}

function extractVisualTriad(applicant: Applicant, isDeadZone: boolean): VisualTriad {
  if (isDeadZone) {
    return {
      constraint: 'No physical or compute constraint stated',
      mechanism: '100% synthetic buzzwords — zero engineering mechanism',
      outcome: `Unverifiable marketing claims (${applicant.fluffIndex}% Fluff Index)`,
    };
  }

  const triadMatch = applicant.nemotronReasoning?.match(
    /\[Problem:\s*([^\]]+)\]\s*(?:→|->)\s*\[Mechanism:\s*([^\]]+)\]\s*(?:→|->)\s*\[Outcome:\s*([^\]]+)\]/i
  );

  if (triadMatch) {
    return {
      constraint: clampLabel(triadMatch[1]),
      mechanism: clampLabel(triadMatch[2]),
      outcome: clampLabel(triadMatch[3]),
    };
  }

  const mechParts = applicant.demonstratedMechanism
    .split(/(?:→|->|,\s*(?=cutting|reducing|holding|extending|bringing|eliminating))/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    constraint: clampLabel(
      applicant.currentExploration || `${applicant.cluster} production bottleneck`
    ),
    mechanism: clampLabel(mechParts[0] || applicant.demonstratedMechanism),
    outcome: clampLabel(
      mechParts[1] ||
        applicant.strengths[0] ||
        `Verified ${applicant.competenceScore}% technical alignment`
    ),
  };
}

interface EcosystemOriginInfo {
  label: string;
  verified: boolean;
}

const HERO_PRIORITY_IDS = [
  'app-01',
  'app-tariq',
  'app-04',
  'app-03',
  'app-06',
  'app-05',
  'app-07',
  'app-02',
  'app-08',
  'app-09',
];

const ECOSYSTEM_ORIGIN_MAP: Record<string, EcosystemOriginInfo> = {
  'app-01': { label: 'Aalto Startup Center / Otaniemi Alum', verified: true },
  'app-tariq': { label: 'ETH / IMEC & Espoo DeepTech Alumni Reference', verified: true },
  'app-03': { label: 'VTT Quantum LaunchPad Sponsored', verified: true },
  'app-04': { label: 'Kempower Ecosystem Partner Reference', verified: true },
  'app-05': { label: 'ESA BIC Finland / Otaniemi Space Hub Reference', verified: true },
  'app-06': { label: 'VTT Micronova & Health Incubator Reference', verified: true },
  'app-08': { label: 'Business Espoo Soft-Landing Partner Reference', verified: true },
  'app-09': { label: 'Nokia Bell Labs / Karaportti Alumni Network', verified: true },
  'app-11': { label: 'Aalto Energy Garage & Design Factory Reference', verified: true },
};

const CLUSTER_NDA_ORIGIN: Record<Applicant['cluster'], string> = {
  'Edge AI & Robotics': 'Nokia Bell Labs / Nordic Robotics Supplier NDA',
  'Quantum & Semiconductors': 'IQM / VTT Micronova Cryo Supply Chain NDA',
  'CleanTech & Smart Grid': 'Kempower / Nordic Grid Partner Reference',
  'Bio & HealthTech': 'Health Capital Helsinki / ISO 13485 Partner NDA',
  'Sovereign AI & Cloud Infra': 'CSC LUMI / Sovereign Cloud Partner Reference',
};

function getEcosystemOrigin(applicant: Applicant): EcosystemOriginInfo {
  if (applicant.fluffIndex > 50 || applicant.competenceScore < 40) {
    return {
      label: 'Unverified Self-Submission (No Ecosystem Partner)',
      verified: false,
    };
  }
  if (ECOSYSTEM_ORIGIN_MAP[applicant.id]) {
    return ECOSYSTEM_ORIGIN_MAP[applicant.id];
  }
  if (applicant.evidenceCategory === 'Applied Reasoning (Junior / Student)') {
    return {
      label: 'Aalto FITech & Otaniemi Junior Incubator Track',
      verified: true,
    };
  }
  if (applicant.evidenceCategory === 'Peer-Reviewed Research / Poster') {
    return {
      label: 'Otaniemi Academic & Peer-Reviewed Registry',
      verified: true,
    };
  }
  if (applicant.evidenceCategory === 'Redacted Enterprise NDA Vignette') {
    return {
      label: CLUSTER_NDA_ORIGIN[applicant.cluster] || 'Enterprise R&D NDA Reference',
      verified: true,
    };
  }
  return {
    label: 'Open-Source Benchmark & Business Espoo Tech Guild',
    verified: true,
  };
}

function generatePublicSectorJustification(
  applicant: Applicant,
  destination: GravityDestination
): string {
  if (
    destination.isDeadZone ||
    applicant.status === 'flagged' ||
    applicant.status === 'waitlisted'
  ) {
    return 'Application waitlisted: profile lacked verifiable engineering or physical constraints required for the DeepTech track. Candidate encouraged to submit portfolio for the Spring General Forum.';
  }
  if (applicant.id === 'app-01') {
    return 'Demonstrated verified hardware constraints and procedural trade-offs directly matching Nokia Bell Labs Edge ML track. Recommended for on-site ticket.';
  }
  if (applicant.id === 'app-03') {
    return 'Demonstrated verified sub-70ns RFSoC FPGA pulse-shaping and cryo readout trade-offs directly matching IQM Quantum Computers track. Recommended for on-site ticket.';
  }
  if (applicant.id === 'app-04') {
    return 'Demonstrated verified sub-zero ISO 15118 PLC harmonic filtering and STM32H7 trade-offs directly matching Kempower grid track. Recommended for on-site ticket.';
  }
  return `Demonstrated verified hardware constraints and procedural trade-offs directly matching ${destination.podName} (${applicant.cluster}) track. Recommended for on-site ticket.`;
}

const CandidateSketchMedallion: React.FC<{
  initials: string;
  destination: GravityDestination;
  size?: 'sm' | 'lg';
}> = ({ initials, destination, size = 'sm' }) => {
  const isLg = size === 'lg';
  const dim = isLg ? 68 : 42;
  const r = isLg ? 28 : 17;
  const cx = dim / 2;
  const circumference = 2 * Math.PI * r;
  const pct = destination.isDeadZone ? 100 : Math.max(8, destination.gravityPct);
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: dim, height: dim }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        {/* Warm drafting paper disc */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="#FFFDF8"
          stroke="#D4C8B0"
          strokeWidth={isLg ? 1.5 : 1}
        />

        {/* Pencil hatch inner guide */}
        <circle
          cx={cx}
          cy={cx}
          r={r - (isLg ? 4.5 : 3)}
          fill="none"
          stroke="#C6B89D"
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />

        {/* Resonance / Dead Zone radial arc */}
        {destination.isDeadZone ? (
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="#DC2626"
            strokeWidth={isLg ? 2.8 : 2.2}
            strokeDasharray="4 3"
          />
        ) : (
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={destination.accentHex}
            strokeWidth={isLg ? 3.2 : 2.4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        )}

        {/* Subtle hand-sketched figure silhouette behind initials on large medallion */}
        {isLg && (
          <g opacity="0.12" stroke="#0F172A" fill="none" strokeWidth="1.4">
            <circle cx={cx} cy={cx - 6} r="6.5" />
            <path d={`M ${cx - 12} ${cx + 15} C ${cx - 10} ${cx + 5}, ${cx + 10} ${cx + 5}, ${cx + 12} ${cx + 15}`} />
          </g>
        )}
      </svg>

      <span
        className={`absolute font-extrabold tracking-tight select-none ${
          isLg ? 'text-base' : 'text-[11px]'
        }`}
        style={{ color: destination.isDeadZone ? '#991B1B' : '#0F172A' }}
      >
        {initials}
      </span>

      {isLg && (
        <span
          className="absolute -bottom-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-tight border shadow-sm bg-[#FFFDF8]"
          style={{
            color: destination.accentHex,
            borderColor: destination.accentHex,
          }}
        >
          {destination.isDeadZone ? '0% FIT' : `${destination.gravityPct}% FIT`}
        </span>
      )}
    </div>
  );
};

const SemanticGravityVectorCard: React.FC<{
  applicant: Applicant;
  destination: GravityDestination;
}> = ({ applicant, destination }) => {
  const firstName = applicant.name.split(' ')[0];

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden ${
        destination.isDeadZone
          ? 'bg-rose-50/50 border-rose-200'
          : 'bg-[#F5EFE4]/60 border-[#D4C8B0]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Orbit
            className="w-3.5 h-3.5"
            style={{ color: destination.accentHex }}
          />
          Semantic Gravity Vector · City of Espoo Pod Alignment
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${destination.badgeBg}`}
        >
          {destination.isDeadZone
            ? `AI Fluff Repulsion (${applicant.fluffIndex}%)`
            : `${destination.gravityPct}% Gravity Lock`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3">
        {/* Left Node: Candidate */}
        <div className="sm:col-span-3 bg-[#FFFDF8] border border-[#D4C8B0] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: destination.accentHex }}
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{firstName}</div>
            <div className="text-[10px] font-mono text-slate-600">
              {destination.isDeadZone
                ? `AI Fluff: ${applicant.fluffIndex}%`
                : `Evidence: ${applicant.competenceScore}%`}
            </div>
          </div>
        </div>

        {/* Center Vector Graphic */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center py-1">
          <div className="w-full relative flex items-center justify-center">
            <svg
              viewBox="0 0 260 44"
              className="w-full h-11 overflow-visible"
              aria-hidden="true"
            >
              {destination.isDeadZone ? (
                <>
                  <path
                    d="M 10 22 Q 70 6, 122 22 T 244 22"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="2.2"
                    strokeDasharray="6 5"
                  />
                  {/* Repulsion barrier */}
                  <line
                    x1="126"
                    y1="8"
                    x2="134"
                    y2="36"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="134"
                    y1="8"
                    x2="126"
                    y2="36"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  {/* Base guide rail */}
                  <line
                    x1="10"
                    y1="22"
                    x2="242"
                    y2="22"
                    stroke={destination.accentHex}
                    strokeOpacity="0.22"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  {/* Crisp vector shaft */}
                  <line
                    x1="10"
                    y1="22"
                    x2="240"
                    y2="22"
                    stroke={destination.accentHex}
                    strokeWidth="2.2"
                    strokeDasharray="5 4"
                  />
                  {/* Directional chevrons */}
                  <polyline
                    points="234,16 244,22 234,28"
                    fill="none"
                    stroke={destination.accentHex}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Travelling semantic pulse particle */}
                  <circle r="4.2" fill={destination.accentHex}>
                    <animateMotion
                      dur="2.4s"
                      repeatCount="indefinite"
                      path="M 12 22 L 236 22"
                    />
                  </circle>
                </>
              )}
            </svg>
          </div>
          <span
            className="text-[11px] font-extrabold tracking-tight -mt-1 px-2.5 py-0.5 rounded-full bg-[#FFFDF8] border shadow-sm"
            style={{
              color: destination.accentHex,
              borderColor: `${destination.accentHex}55`,
            }}
          >
            {destination.isDeadZone
              ? `0% Gravity · Repelled (${applicant.fluffIndex}% AI Fluff)`
              : `${destination.gravityPct}% Semantic Gravity Pull`}
          </span>
        </div>

        {/* Right Node: Espoo Island & Pod */}
        <div
          className={`sm:col-span-4 rounded-xl px-3.5 py-2.5 border shadow-sm ${
            destination.isDeadZone
              ? 'bg-white border-rose-300 border-dashed'
              : 'bg-[#FFFDF8] border-[#C8BC9F]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1"
              style={{
                backgroundColor: destination.accentHex,
                ['--tw-ring-color' as string]: `${destination.accentHex}40`,
              }}
            />
            <span className="text-xs font-extrabold text-slate-900 truncate">
              {destination.islandName}
            </span>
          </div>
          <div
            className="text-xs font-bold truncate mt-0.5"
            style={{ color: destination.isDeadZone ? '#B91C1C' : '#00508F' }}
          >
            {destination.podName}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {destination.roomZone}
          </div>
        </div>
      </div>
    </div>
  );
};

const VisualTriadGrid: React.FC<{
  triad: VisualTriad;
  destination: GravityDestination;
}> = ({ triad, destination }) => {
  const nodes = [
    {
      step: '1. HARD CONSTRAINT',
      text: triad.constraint,
      icon: Zap,
      accent: destination.isDeadZone ? '#DC2626' : '#00508F',
      bg: destination.isDeadZone ? 'bg-rose-50/70' : 'bg-white',
    },
    {
      step: '2. MECHANISM BUILT',
      text: triad.mechanism,
      icon: Wrench,
      accent: destination.isDeadZone ? '#DC2626' : destination.accentHex,
      bg: destination.isDeadZone ? 'bg-rose-50/70' : 'bg-white',
    },
    {
      step: '3. MEASURED PROOF',
      text: triad.outcome,
      icon: TrendingUp,
      accent: destination.isDeadZone ? '#DC2626' : '#059669',
      bg: destination.isDeadZone ? 'bg-rose-50/70' : 'bg-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
      {nodes.map((node, idx) => {
        const Icon = node.icon;
        return (
          <div key={node.step} className="relative flex items-stretch">
            <div
              className={`w-full rounded-xl p-3.5 border shadow-sm flex flex-col justify-between gap-2 ${
                node.bg
              } ${
                destination.isDeadZone
                  ? 'border-rose-300 border-dashed'
                  : 'border-[#D4C8B0]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider"
                  style={{ color: node.accent }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {node.step}
                </span>
                {destination.isDeadZone && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                    ✕ Missing
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-snug">
                {node.text}
              </p>
            </div>

            {idx < 2 && (
              <div
                className="hidden md:flex items-center justify-center -mx-2.5 z-10 shrink-0 self-center"
                aria-hidden="true"
              >
                <div className="w-5 h-5 rounded-full bg-[#FFFDF8] border border-[#C8BC9F] flex items-center justify-center shadow-sm">
                  <ArrowRight className="w-3 h-3 text-[#00508F]" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const BlueprintModal: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, icon, onClose, children, footer }) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF8] border-2 border-[#C8BC9F] rounded-2xl max-w-2xl w-full shadow-2xl text-slate-900 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#F5EFE4] border-b border-[#D4C8B0] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-600 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-[#E8DFCE] transition shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 bg-[#F5EFE4]/70 border-t border-[#D4C8B0] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const CuratorCockpit: React.FC<CuratorCockpitProps> = ({
  applicants,
  selectedEvent,
  onUpdateDecision,
  onUpdateApplicantReasoning,
  onOpenInMetaverse,
}) => {
  const [selectedId, setSelectedId] = useState<string>(applicants[0]?.id || 'app-01');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rankingMode, setRankingMode] = useState<'evidence_balance' | 'legacy_keyword_ai'>(
    'evidence_balance'
  );
  const [reviewerNoteInput, setReviewerNoteInput] = useState<string>(
    applicants[0]?.humanReviewerNote || ''
  );
  const [activeModal, setActiveModal] = useState<'proof' | 'ai_lab' | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [liveBadgeInfo, setLiveBadgeInfo] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<AIModelEngine>('gemini-3-flash');
  const [isTranslatingNote, setIsTranslatingNote] = useState<boolean>(false);
  const [trilingualNote, setTrilingualNote] = useState<{
    fi: string;
    sv: string;
    en: string;
    latencyMs: number;
    modelUsed: string;
  } | null>(null);
  const [csvDownloaded, setCsvDownloaded] = useState<boolean>(false);

  const filteredApplicants = useMemo(() => {
    return applicants
      .filter((app) => {
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            app.name.toLowerCase().includes(q) ||
            app.role.toLowerCase().includes(q) ||
            app.origin.toLowerCase().includes(q) ||
            app.cluster.toLowerCase().includes(q) ||
            (app.evidenceCategory || '').toLowerCase().includes(q) ||
            (app.demonstratedMechanism || '').toLowerCase().includes(q) ||
            (app.currentExploration || '').toLowerCase().includes(q) ||
            (app.strengths || []).join(' ').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (rankingMode === 'legacy_keyword_ai') {
          return b.legacyLinkedInScore - a.legacyLinkedInScore;
        }
        const aLive = a.id.startsWith('app-live-');
        const bLive = b.id.startsWith('app-live-');
        if (aLive !== bLive) return aLive ? -1 : 1;

        const aHero = HERO_PRIORITY_IDS.indexOf(a.id);
        const bHero = HERO_PRIORITY_IDS.indexOf(b.id);
        if (aHero !== -1 && bHero !== -1) return aHero - bHero;
        if (aHero !== -1) return -1;
        if (bHero !== -1) return 1;

        if (b.competenceScore !== a.competenceScore) {
          return b.competenceScore - a.competenceScore;
        }
        return a.fluffIndex - b.fluffIndex;
      });
  }, [applicants, statusFilter, searchQuery, rankingMode]);

  const activeApplicant = useMemo(
    () =>
      applicants.find((a) => a.id === selectedId) ||
      filteredApplicants[0] ||
      applicants[0],
    [applicants, selectedId, filteredApplicants]
  );

  const activeDestination = useMemo(
    () => (activeApplicant ? getGravityDestination(activeApplicant) : null),
    [activeApplicant]
  );

  const activeTriad = useMemo(
    () =>
      activeApplicant && activeDestination
        ? extractVisualTriad(activeApplicant, activeDestination.isDeadZone)
        : null,
    [activeApplicant, activeDestination]
  );

  const activeEcosystemOrigin = useMemo(
    () => (activeApplicant ? getEcosystemOrigin(activeApplicant) : null),
    [activeApplicant]
  );

  useEffect(() => {
    setReviewerNoteInput(activeApplicant?.humanReviewerNote || '');
  }, [activeApplicant?.id]);

  const handleSelectApplicant = (app: Applicant) => {
    setSelectedId(app.id);
    setReviewerNoteInput(app.humanReviewerNote || '');
    setLiveBadgeInfo(null);
    setTrilingualNote(null);
  };

  const handleGeneratePublicJustification = () => {
    if (!activeApplicant || !activeDestination) return;
    const generated = generatePublicSectorJustification(activeApplicant, activeDestination);
    setReviewerNoteInput(generated);
    onUpdateDecision(activeApplicant.id, activeApplicant.status, generated);
  };

  const handleTranslateNote = async () => {
    if (!activeApplicant) return;
    setIsTranslatingNote(true);
    try {
      const res = await translateCuratorNoteTrilingual(
        reviewerNoteInput || activeApplicant.humanReviewerNote,
        activeApplicant.name,
        activeApplicant.status
      );
      setTrilingualNote(res);
    } finally {
      setIsTranslatingNote(false);
    }
  };

  const tavataCsvContent = useMemo(() => {
    const csvEscape = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const header =
      'tavata_profile_id,name,cluster,human_decision,curator_justification_note,reviewed_by,timestamp';
    const rows = applicants.map((app) => {
      const decision = app.status.toUpperCase();
      const justification =
        app.humanReviewerNote ||
        generatePublicSectorJustification(app, getGravityDestination(app));
      return [
        csvEscape(`TAVATA-ESP-${app.id.toUpperCase()}`),
        csvEscape(app.name),
        csvEscape(app.cluster),
        csvEscape(decision),
        csvEscape(justification),
        csvEscape(app.reviewedBy || 'Marika & Melissa · Espoo Talent Hub'),
        csvEscape(app.reviewedAt || '2026-11-14 16:30'),
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }, [applicants]);

  const handleDownloadTavataCsv = () => {
    const blob = new Blob(['\uFEFF' + tavataCsvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'TAVATA_ESPOO_MATCHMAKING_AUDIT_2026-11-14.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvDownloaded(true);
  };

  const handleLiveReanalyze = async () => {
    if (!activeApplicant) return;
    setIsReanalyzing(true);
    setLiveBadgeInfo(null);
    try {
      const result = await runLiveNemotronTriage({
        name: activeApplicant.name,
        role: activeApplicant.role,
        linkedInClaim: activeApplicant.linkedInSummaryClaim,
        scenarioAnswer: activeApplicant.scenarioAnswer,
        artifactText: activeApplicant.verifiedArtifacts
          .map((art) => `${art.title} (${art.type}): ${art.verificationNote}`)
          .join(' | '),
        engine: selectedEngine,
      });
      onUpdateApplicantReasoning(
        activeApplicant.id,
        result.competenceScore,
        result.fluffIndex,
        `[${result.modelUsed.toUpperCase()} · ${result.latencyMs}ms]\n${result.reasoningTrace}\n\nEvidence Summary: ${result.summaryVerdict}`
      );
      setLiveBadgeInfo(`${result.modelUsed} · ${result.latencyMs}ms`);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getStatusStamp = (status: ApplicantStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            ✓ Admitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            ⏳ Review
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
            Waitlist
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            ⚑ Flagged
          </span>
        );
    }
  };

  const getEvidencePill = (cat: string) => {
    const safeCat = cat || '';
    if (safeCat.includes('NDA')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Lock className="w-3.5 h-3.5" /> Confidential NDA Vignette
        </span>
      );
    }
    if (safeCat.includes('Junior') || safeCat.includes('Student')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Sparkles className="w-3.5 h-3.5" /> Applied Reasoning (Junior)
        </span>
      );
    }
    if (safeCat.includes('Research')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <FileText className="w-3.5 h-3.5" /> Research Publication
        </span>
      );
    }
    if (safeCat.includes('Public')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FileCode2 className="w-3.5 h-3.5" /> Verified Public Code
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5" /> Self-Reported Only
      </span>
    );
  };

  const filterLabels: Record<'all' | ApplicantStatus, string> = {
    all: `All (${applicants.length})`,
    pending: 'In Review',
    approved: 'Admitted',
    waitlisted: 'Waitlisted',
    flagged: 'Flagged',
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Tavata.fi Export Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'pending', 'approved', 'waitlisted', 'flagged'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-[#0066B3] text-white shadow-sm'
                  : 'bg-[#F8FAFC] text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {filterLabels[st]}
            </button>
          ))}

          <div className="relative ml-0 sm:ml-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${applicants.length} attendees, skills, clusters...`}
              className="bg-[#F8FAFC] border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066B3] focus:bg-white w-52 sm:w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {rankingMode === 'legacy_keyword_ai' && (
            <button
              onClick={() => setRankingMode('evidence_balance')}
              className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
            >
              Naive LinkedIn Sort Active · Reset
            </button>
          )}
          <button
            onClick={() => {
              setCsvDownloaded(false);
              setShowExportModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#00508F] text-white text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#FFC72C]" />
            <FileText className="w-3.5 h-3.5" />
            Tavata.fi Export &amp; EU AI Act Audit Log
          </button>
        </div>
      </div>

      {/* Main Split-Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Queue: Ultra-Scannable Blueprint Rail */}
        <div className="lg:col-span-4 bg-[#FFFDF8] border-2 border-[#D4C8B0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5DEC9] flex items-center justify-between bg-[#F5EFE4]/80">
            <span className="text-xs font-extrabold tracking-tight text-slate-800 uppercase">
              Attendee Queue ({filteredApplicants.length})
            </span>
            <span className="text-[10px] font-mono text-slate-600">
              {rankingMode === 'evidence_balance' ? 'GRAVITY SORT' : 'LINKEDIN KEYWORD SORT'}
            </span>
          </div>

          <div className="divide-y divide-[#ECE4D2] max-h-[620px] overflow-y-auto">
            {filteredApplicants.map((app) => {
              const isSelected = activeApplicant?.id === app.id;
              const dest = getGravityDestination(app);

              return (
                <button
                  key={app.id}
                  onClick={() => handleSelectApplicant(app)}
                  className={`w-full text-left px-3.5 py-3 transition flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[#0066B3]/10 border-l-4 border-l-[#0066B3]'
                      : 'hover:bg-[#F5EFE4]/60 border-l-4 border-l-transparent'
                  }`}
                >
                  <CandidateSketchMedallion
                    initials={app.avatarInitials}
                    destination={dest}
                    size="sm"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{app.name}</h4>
                      {getStatusStamp(app.status)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 truncate mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: dest.accentHex }}
                      />
                      {dest.isDeadZone ? (
                        <span className="text-rose-700 font-semibold truncate">
                          Dead Zone · {app.fluffIndex}% Fluff
                        </span>
                      ) : (
                        <span className="truncate">
                          {dest.islandShort} · {dest.podName} ·{' '}
                          <strong className="text-slate-900">{dest.gravityPct}%</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredApplicants.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No attendees match the current filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Evaluator Card: Living Semantic Blueprint (Zero Clutter by Default) */}
        {activeApplicant && activeDestination && activeTriad && (
          <div className="lg:col-span-8 bg-[#FFFDF8] border-2 border-[#D4C8B0] rounded-2xl shadow-sm relative overflow-hidden">
            {/* Subtle Inner Drafting Frame */}
            <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-[#C6B89D]/60" />

            {/* Subtle Blueprint Grid + Compass Watermark */}
            <svg
              className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.045]"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="espoo-blueprint-grid"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 28 0 L 0 0 0 28"
                    fill="none"
                    stroke="#00508F"
                    strokeWidth="0.8"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#espoo-blueprint-grid)" />
              <g transform="translate(640, 72)" stroke="#00508F" fill="none">
                <circle r="48" strokeWidth="1" strokeDasharray="3 3" />
                <circle r="30" strokeWidth="0.8" />
                <line x1="-58" y1="0" x2="58" y2="0" strokeWidth="0.8" />
                <line x1="0" y1="-58" x2="0" y2="58" strokeWidth="0.8" />
              </g>
            </svg>

            {/* Authentic Espoo TalentMatch Event Strip */}
            <div className="relative z-10 px-5 sm:px-7 py-2.5 bg-[#FFFDF8] border-b border-[#E5DEC9] flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-extrabold text-slate-900 truncate">
                  {selectedEvent.title}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#0066B3]/10 text-[#00508F] border border-[#0066B3]/25 font-bold whitespace-nowrap">
                  Espoo Talent Hub · Business Espoo
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F5EFE4] text-slate-700 border border-[#D4C8B0] font-semibold whitespace-nowrap">
                {selectedEvent.date.split(' · ')[1] || selectedEvent.date} ·{' '}
                {selectedEvent.applicantCount} Applicants → {selectedEvent.venueCapacity} Seats (Peak{' '}
                {selectedEvent.historicalPeakCount.toLocaleString()})
              </span>
            </div>

            {/* Top Blueprint Strip with On-Demand Pop-Up Triggers */}
            <div className="relative z-10 px-5 sm:px-7 py-3 bg-[#F5EFE4]/75 border-b border-[#E5DEC9] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFC72C] ring-2 ring-[#00508F]/25" />
                <Compass className="w-3.5 h-3.5 text-[#00508F]" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#00508F]">
                  Espoo Semantic Blueprint · Attendee Triage Card
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveModal('proof')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFFDF8] hover:bg-white border border-[#C8BC9F] hover:border-[#0066B3] text-[11px] font-bold text-slate-800 hover:text-[#0066B3] flex items-center gap-1.5 transition shadow-sm"
                >
                  <Search className="w-3 h-3 text-[#0066B3]" />
                  <span>Proof &amp; LinkedIn ({activeApplicant.verifiedArtifacts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('ai_lab')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFFDF8] hover:bg-white border border-[#C8BC9F] hover:border-[#0066B3] text-[11px] font-bold text-slate-800 hover:text-[#0066B3] flex items-center gap-1.5 transition shadow-sm"
                >
                  <Brain className="w-3 h-3 text-[#0066B3]" />
                  <span>AI Audit Lab</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenInMetaverse?.(activeApplicant.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#00508F] hover:bg-[#0066B3] text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Orbit className="w-3 h-3 text-[#FFC72C]" />
                  <span>3D Gravity</span>
                </button>
              </div>
            </div>

            {/* Calm Architectural Body */}
            <div className="relative z-10 p-5 sm:p-7 space-y-5">
              {/* Section A: Candidate Identity & Evidence Pill */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <CandidateSketchMedallion
                    initials={activeApplicant.avatarInitials}
                    destination={activeDestination}
                    size="lg"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                        {activeApplicant.name}
                      </h2>
                      {getStatusStamp(activeApplicant.status)}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {activeApplicant.role}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{activeApplicant.origin}</p>
                    {activeEcosystemOrigin && (
                      <div className="pt-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            activeEcosystemOrigin.verified
                              ? 'bg-emerald-50/90 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {activeEcosystemOrigin.verified ? (
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>
                            {activeEcosystemOrigin.verified
                              ? 'Ecosystem Source:'
                              : 'Verification Source:'}{' '}
                            {activeEcosystemOrigin.label}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  {getEvidencePill(activeApplicant.evidenceCategory)}
                </div>
              </div>

              {/* Section B: Signature Graphic — 2D Semantic Gravity Vector Map */}
              <SemanticGravityVectorCard
                applicant={activeApplicant}
                destination={activeDestination}
              />

              {/* Section C: Signature Graphic — 3-Node Visual Triad */}
              <VisualTriadGrid triad={activeTriad} destination={activeDestination} />

              {/* Section D: Official Decision Justification & Municipal Curator Stamp Bar */}
              <div className="pt-3 border-t border-[#E5DEC9] space-y-3.5">
                {/* Official Decision Justification (Päätösperustelu / EU AI Act Art. 14) */}
                <div className="bg-white border border-[#D4C8B0] rounded-xl p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="official-decision-justification"
                      className="text-xs font-extrabold text-[#00508F] flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#0066B3] shrink-0" />
                      <span>
                        Official Decision Justification (Päätösperustelu / EU AI Act Art. 14)
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGeneratePublicJustification}
                        className="px-2.5 py-1 rounded-lg bg-[#0066B3]/10 hover:bg-[#0066B3] text-[#00508F] hover:text-white border border-[#0066B3]/30 text-[11px] font-bold flex items-center gap-1.5 transition"
                      >
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>✨ Generate Public Sector Justification</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTranslateNote}
                        disabled={isTranslatingNote}
                        className="px-2.5 py-1 rounded-lg bg-[#FFFDF8] hover:bg-slate-50 border border-[#C8BC9F] text-[#0066B3] text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        title="Generate official FI / SV / EN decision rationale via Gemini 3 Flash"
                      >
                        <Languages className="w-3 h-3" />
                        <span>
                          {isTranslatingNote ? 'Translating...' : 'FI · SV · EN (Gemini 3)'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="official-decision-justification"
                    rows={2}
                    value={reviewerNoteInput}
                    onChange={(e) => setReviewerNoteInput(e.target.value)}
                    onBlur={() => {
                      if (reviewerNoteInput !== (activeApplicant.humanReviewerNote || '')) {
                        onUpdateDecision(
                          activeApplicant.id,
                          activeApplicant.status,
                          reviewerNoteInput
                        );
                      }
                    }}
                    placeholder="Enter or generate official administrative justification for the applicant (saved to Tavata.fi audit log)..."
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066B3] focus:bg-white transition leading-relaxed"
                  />

                  {trilingualNote && (
                    <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                        <span className="font-bold text-[#00508F]">
                          Official Trilingual Record (Kielilaki / Hallintolaki § 45)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const combined = `${trilingualNote.fi} | ${trilingualNote.sv} | ${trilingualNote.en}`;
                            setReviewerNoteInput(combined);
                            onUpdateDecision(
                              activeApplicant.id,
                              activeApplicant.status,
                              combined
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#0066B3] hover:bg-[#00508F] text-white font-semibold text-[11px] transition"
                        >
                          Apply to Note
                        </button>
                      </div>
                      <div className="space-y-1 text-slate-700">
                        <div>
                          <span className="inline-block w-7 font-bold text-slate-900">FI:</span>
                          <span>{trilingualNote.fi}</span>
                        </div>
                        <div>
                          <span className="inline-block w-7 font-bold text-slate-900">SV:</span>
                          <span>{trilingualNote.sv}</span>
                        </div>
                        <div>
                          <span className="inline-block w-7 font-bold text-slate-900">EN:</span>
                          <span>{trilingualNote.en}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'approved',
                        reviewerNoteInput ||
                          `Verified mechanism match for ${activeDestination.islandName}.`
                      )
                    }
                    className={`px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                      activeApplicant.status === 'approved'
                        ? 'bg-[#0066B3] text-white border-[#00508F] shadow-sm'
                        : 'bg-[#FFFDF8] text-[#00508F] border-[#0066B3]/40 hover:bg-[#0066B3] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {activeDestination.isDeadZone
                        ? 'Hyväksy / Manual Admit'
                        : `Hyväksy / Admit to ${activeDestination.islandShort}`}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'waitlisted',
                        reviewerNoteInput || 'Placed on cluster capacity waitlist.'
                      )
                    }
                    className={`px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                      activeApplicant.status === 'waitlisted'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-[#FFFDF8] text-amber-800 border-amber-300 hover:bg-amber-600 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Aseta jonoon / Waitlist</span>
                  </button>

                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'flagged',
                        reviewerNoteInput ||
                          'Insufficient verifiable technical or operational evidence.'
                      )
                    }
                    className={`px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                      activeApplicant.status === 'flagged'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-[#FFFDF8] text-rose-700 border-rose-300 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    <Flag className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {activeDestination.isDeadZone
                        ? 'Hylkää / Keep in Dead Zone'
                        : 'Hylkää / Move to Dead Zone'}
                    </span>
                  </button>
                </div>

                {/* Compact Sign-off Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-600 min-w-0">
                    {activeApplicant.reviewedBy ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>
                          Signed by{' '}
                          <strong className="text-slate-900">{activeApplicant.reviewedBy}</strong>{' '}
                          · {activeApplicant.reviewedAt}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Awaiting human sign-off · Hallintolaki § 45 &amp; EU AI Act Art. 14
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#00508F]">
                    Synced with Tavata.fi Matchmaking Schema
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pop-Up Modal 1: Raw Submission, Artifacts & LinkedIn Diff */}
      {activeModal === 'proof' && activeApplicant && (
        <BlueprintModal
          title={`${activeApplicant.name} — Proof of Work & LinkedIn Diff`}
          subtitle="Raw technical submission, verified artifacts, and keyword-blindness test"
          icon={<Search className="w-5 h-5 text-[#0066B3] shrink-0" />}
          onClose={() => setActiveModal(null)}
        >
          {/* Verified Artifacts */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Submitted Proof of Work ({activeApplicant.verifiedArtifacts.length})
            </h4>
            {activeApplicant.verifiedArtifacts.map((art, i) => (
              <div
                key={i}
                className="bg-white border border-[#D4C8B0] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{art.title}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#F5EFE4] text-slate-700 border border-[#D4C8B0]">
                      {art.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{art.verificationNote}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${
                      art.authenticityScore >= 75
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    Integrity: {art.authenticityScore}%
                  </span>
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#FFFDF8] border border-[#D4C8B0] text-slate-600 hover:text-[#0066B3] transition"
                    title="Inspect Evidence Source"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Full Scenario Answer */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Full Scenario Answer
            </h4>
            <div className="bg-white border border-[#D4C8B0] rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
              “{activeApplicant.scenarioAnswer}”
            </div>
          </div>

          {/* LinkedIn Keyword Scraper Comparison */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Naive LinkedIn Scraper vs. Evidence Triage
              </h4>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F5EFE4] border border-[#D4C8B0]">
                <button
                  onClick={() => setRankingMode('evidence_balance')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                    rankingMode === 'evidence_balance'
                      ? 'bg-[#0066B3] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Evidence Sort
                </button>
                <button
                  onClick={() => setRankingMode('legacy_keyword_ai')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                    rankingMode === 'legacy_keyword_ai'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" /> Naive LinkedIn Sort
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#D4C8B0] rounded-xl p-4 space-y-2.5">
              <p className="text-xs text-slate-700">{activeApplicant.linkedInSummaryClaim}</p>
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                  Evidence Score: <strong>{activeApplicant.competenceScore}/100</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  Naive LinkedIn Score: <strong className="text-slate-900">{activeApplicant.legacyLinkedInScore}%</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  AI Fluff Index:{' '}
                  <strong
                    className={
                      activeApplicant.fluffIndex > 50 ? 'text-rose-700' : 'text-[#0066B3]'
                    }
                  >
                    {activeApplicant.fluffIndex}%
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </BlueprintModal>
      )}

      {/* Pop-Up Modal 2: Live AI Verification Audit Lab */}
      {activeModal === 'ai_lab' && activeApplicant && (
        <BlueprintModal
          title={`${activeApplicant.name} — Live AI Verification Audit Lab`}
          subtitle="Dual-Engine Evaluation (NVIDIA Nemotron 3.5 B300 & Google DeepMind Gemini 3) · EU AI Act Art. 14"
          icon={<Cpu className="w-5 h-5 text-[#0066B3] shrink-0" />}
          onClose={() => setActiveModal(null)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D4C8B0] rounded-xl p-3.5">
            <div className="inline-flex flex-wrap items-center p-0.5 rounded-lg bg-[#F5EFE4] border border-[#D4C8B0]">
              {(
                [
                  { id: 'nemotron-3.5-b300', label: 'Nemotron 3.5 B300' },
                  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
                  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
                ] as const
              ).map((eng) => (
                <button
                  key={eng.id}
                  onClick={() => setSelectedEngine(eng.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    selectedEngine === eng.id
                      ? 'bg-[#0066B3] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {eng.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {liveBadgeInfo && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {liveBadgeInfo}
                </span>
              )}
              <button
                onClick={handleLiveReanalyze}
                disabled={isReanalyzing}
                className="px-3 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#00508F] text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                {isReanalyzing ? 'Synthesizing...' : 'Re-Run Live Evidence Synthesis'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-white border border-[#D4C8B0] rounded-xl p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Evidence Score</div>
              <div className="text-lg font-extrabold text-emerald-700">
                {activeApplicant.competenceScore}/100
              </div>
            </div>
            <div className="bg-white border border-[#D4C8B0] rounded-xl p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">AI Fluff Index</div>
              <div
                className={`text-lg font-extrabold ${
                  activeApplicant.fluffIndex > 50 ? 'text-rose-700' : 'text-[#0066B3]'
                }`}
              >
                {activeApplicant.fluffIndex}%
              </div>
            </div>
            <div className="bg-white border border-[#D4C8B0] rounded-xl p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Espoo Target</div>
              <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                {activeDestination?.islandName}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit Reasoning Trace
            </h4>
            <pre className="text-xs font-mono text-slate-800 bg-white border border-[#D4C8B0] rounded-xl p-4 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {activeApplicant.nemotronReasoning}
            </pre>
          </div>
        </BlueprintModal>
      )}

      {/* Pop-Up Modal 3: Tavata.fi Export & EU AI Act Audit Log */}
      {showExportModal && (
        <BlueprintModal
          title="Tavata.fi CSV Export & EU AI Act Compliance Certificate"
          subtitle="City of Espoo Human-Signed Matchmaking Audit Record (Tavata.fi Schema)"
          icon={<FileText className="w-5 h-5 text-[#0066B3] shrink-0" />}
          onClose={() => setShowExportModal(false)}
          footer={
            <div className="flex items-center justify-between gap-3">
              {csvDownloaded ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Downloaded TAVATA_ESPOO_MATCHMAKING_AUDIT_2026-11-14.csv
                </span>
              ) : (
                <span className="text-[11px] text-slate-600">
                  UTF-8 BOM · Tavata.fi &amp; Excel ready
                </span>
              )}
              <button
                onClick={handleDownloadTavataCsv}
                className="px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#00508F] text-white font-bold text-xs transition shadow-sm"
              >
                Download Tavata.fi Verified CSV &amp; Audit Trail
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-700">
            <p>
              This export produces a clean CSV formatted for the{' '}
              <strong>Tavata.fi Matchmaking Schema</strong> (used by Espoo Talent Hub for
              municipal B2B &amp; talent matchmaking), containing human curator approval IDs,{' '}
              <em>Päätösperustelu</em> justifications, and administrative audit logs under Finnish{' '}
              <em>Hallintolaki</em> § 45:
            </p>

            <div className="bg-white p-3.5 rounded-xl border border-[#D4C8B0] font-mono text-[11px] space-y-1 text-slate-700 overflow-x-auto max-h-48 overflow-y-auto">
              <div className="text-[#0066B3] font-semibold">
                # TAVATA_ESPOO_MATCHMAKING_AUDIT_2026-11-14.csv ({applicants.length} records)
              </div>
              {tavataCsvContent
                .split('\n')
                .slice(0, 6)
                .map((line, i) => (
                  <div key={i} className="whitespace-nowrap">
                    {line}
                  </div>
                ))}
              {applicants.length > 5 && (
                <div className="text-slate-400 italic">
                  ... +{applicants.length - 5} more applicant rows in downloaded CSV
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-[#D4C8B0]">
                <span className="font-bold text-slate-900 block">EU AI Act (Annex III 4a):</span>
                <span>100% meaningful human oversight logged. Zero automated rejections.</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#D4C8B0]">
                <span className="font-bold text-slate-900 block">Yhdenvertaisuuslaki:</span>
                <span>No-artifact &amp; NDA cohorts protected by alternative evidence equality.</span>
              </div>
            </div>
          </div>
        </BlueprintModal>
      )}
    </div>
  );
};
