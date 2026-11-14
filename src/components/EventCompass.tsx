import React, { useState, useMemo } from 'react';
import {
  Compass,
  Sparkles,
  Building2,
  User,
  Zap,
  RefreshCw,
  MessageSquareHeart,
  Layers,
  CheckCircle2,
  MapPin,
  CalendarCheck,
  Send,
  Lock,
} from 'lucide-react';
import { Applicant, CompanyNode } from '../types';
import { generateLiveConversationSpark } from '../services/nemotronService';

interface EventCompassProps {
  applicants: Applicant[];
  companies: CompanyNode[];
}

export const EventCompass: React.FC<EventCompassProps> = ({ applicants, companies }) => {
  const approvedBuilders = useMemo(
    () => applicants.filter((a) => a.competenceScore >= 80 && a.status !== 'flagged'),
    [applicants]
  );

  const [viewerId, setViewerId] = useState<string>(approvedBuilders[0]?.id || 'app-01');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('comp-nokia-bell');
  const [customSparks, setCustomSparks] = useState<Record<string, { text: string; meta: string }>>(
    {}
  );
  const [isGeneratingSpark, setIsGeneratingSpark] = useState<boolean>(false);
  const [lockedIntroductions, setLockedIntroductions] = useState<Set<string>>(new Set());

  const activeViewer = useMemo(
    () => approvedBuilders.find((a) => a.id === viewerId) || approvedBuilders[0],
    [approvedBuilders, viewerId]
  );

  const selectedTarget = useMemo(() => {
    const comp = companies.find((c) => c.id === selectedTargetId);
    if (comp) return { type: 'company' as const, data: comp };
    const peer = approvedBuilders.find((a) => a.id === selectedTargetId);
    if (peer) return { type: 'peer' as const, data: peer };
    return { type: 'company' as const, data: companies[0] };
  }, [companies, approvedBuilders, selectedTargetId]);

  const currentSparkKey = `${activeViewer?.id}__${selectedTarget.data.id}`;
  const isLocked = lockedIntroductions.has(currentSparkKey);

  const displayedSpark = useMemo(() => {
    if (customSparks[currentSparkKey]) {
      return customSparks[currentSparkKey];
    }
    if (activeViewer?.sparks?.[selectedTarget.data.id]) {
      return {
        text: activeViewer.sparks[selectedTarget.data.id] || '',
        meta: 'Pre-computed from demonstrated artifacts & company bottlenecks',
      };
    }
    if (selectedTarget.type === 'company') {
      const comp = selectedTarget.data;
      return {
        text: `Both you and ${comp.repName} at ${comp.name} work on high-reliability systems. Ask ${
          comp.repName.split(' ')[0]
        } how their Espoo team approaches "${comp['active bottlenecks'][0]}" and share lessons from "${
          activeViewer?.verifiedArtifacts[0]?.title || 'your recent engineering build'
        }".`,
        meta: 'Artifact-to-Bottleneck Resonance Match',
      };
    } else {
      const peer = selectedTarget.data;
      return {
        text: `You and ${peer.name} are both verified builders at today's forum. Compare your approach on "${activeViewer?.currentExploration}" with ${
          peer.name.split(' ')[0]
        }'s work on "${peer.currentExploration}".`,
        meta: 'Peer Builder Problem-Space Overlap',
      };
    }
  }, [activeViewer, selectedTarget, customSparks, currentSparkKey]);

  const handleGenerateLiveSpark = async () => {
    if (!activeViewer) return;
    setIsGeneratingSpark(true);
    try {
      const res = await generateLiveConversationSpark(activeViewer, selectedTarget.data);
      setCustomSparks((prev) => ({
        ...prev,
        [currentSparkKey]: {
          text: res.spark,
          meta: `${res.modelUsed} · ${res.latencyMs}ms`,
        },
      }));
    } finally {
      setIsGeneratingSpark(false);
    }
  };

  const handleToggleLockIntro = () => {
    setLockedIntroductions((prev) => {
      const next = new Set(prev);
      if (next.has(currentSparkKey)) {
        next.delete(currentSparkKey);
      } else {
        next.add(currentSparkKey);
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Philosophy Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/30 to-slate-900 border border-sky-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
            <Compass className="w-4 h-4" /> Room Topology &amp; Problem-Space Discovery · Zero Forced Meetings
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            Instead of shoehorning attendees into rigid speed-dating tables, the{' '}
            <strong className="text-white">Event Compass</strong> maps shared technical bottlenecks across the venue.
            Attendees choose whom to approach on their own terms—backed by a{' '}
            <strong className="text-emerald-300">Double Opt-In Monday Follow-Up</strong> loop for verified TE24 employment outcomes.
          </p>
        </div>

        {/* Perspective Switcher */}
        <div className="bg-slate-950/90 border border-slate-700 rounded-xl p-2.5 shrink-0 flex items-center gap-3">
          <div className="text-[11px] text-slate-400 font-medium">
            Viewing Compass As:
          </div>
          <select
            value={viewerId}
            onChange={(e) => setViewerId(e.target.value)}
            className="bg-slate-900 border border-sky-500/40 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
          >
            {approvedBuilders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.cluster})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Radar + Conversation Spark Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive 2D Problem-Space Radar */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" /> Problem-Space Nebula Radar (Venue Entrance Screen Display)
            </span>
            <div className="flex items-center gap-4 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 inline-block" />
                You ({activeViewer?.name.split(' ')[0]})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rotate-45 bg-amber-400 inline-block" />
                Espoo R&amp;D Company Challenge
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                Verified Peer Builder
              </span>
            </div>
          </div>

          {/* 2D Interactive SVG Map */}
          <div className="relative w-full h-[480px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden select-none">
            {/* Subtle Radar Grid & Cluster Nebulae */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <radialGradient id="nebula-edge" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="nebula-quantum" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="nebula-clean" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="nebula-cloud" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Cluster Background Nebulae */}
              <circle cx="24" cy="28" r="22" fill="url(#nebula-edge)" />
              <circle cx="72" cy="26" r="22" fill="url(#nebula-quantum)" />
              <circle cx="26" cy="72" r="22" fill="url(#nebula-clean)" />
              <circle cx="75" cy="70" r="22" fill="url(#nebula-cloud)" />
              <circle cx="50" cy="50" r="18" fill="url(#nebula-edge)" />

              {/* Concentric Radar Rings */}
              <circle
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />

              {/* Resonance Connection Lines from Active Viewer */}
              {activeViewer &&
                companies.map((comp) => {
                  const isSameCluster = comp.cluster === activeViewer.cluster;
                  const isSelected = selectedTarget.data.id === comp.id;
                  if (!isSameCluster && !isSelected) return null;
                  return (
                    <line
                      key={`line-${comp.id}`}
                      x1={activeViewer.radarCoords.x}
                      y1={activeViewer.radarCoords.y}
                      x2={comp.radarCoords.x}
                      y2={comp.radarCoords.y}
                      stroke={isSelected ? '#38bdf8' : '#10b981'}
                      strokeWidth={isSelected ? '0.6' : '0.35'}
                      strokeDasharray={isSelected ? 'none' : '1.2,1.2'}
                      opacity={isSelected ? 0.95 : 0.55}
                    />
                  );
                })}

              {activeViewer &&
                approvedBuilders.map((peer) => {
                  if (peer.id === activeViewer.id) return null;
                  const isSameCluster = peer.cluster === activeViewer.cluster;
                  const isSelected = selectedTarget.data.id === peer.id;
                  if (!isSameCluster && !isSelected) return null;
                  return (
                    <line
                      key={`peerline-${peer.id}`}
                      x1={activeViewer.radarCoords.x}
                      y1={activeViewer.radarCoords.y}
                      x2={peer.radarCoords.x}
                      y2={peer.radarCoords.y}
                      stroke="#38bdf8"
                      strokeWidth={isSelected ? '0.55' : '0.3'}
                      strokeDasharray="1,1"
                      opacity={isSelected ? 0.9 : 0.45}
                    />
                  );
                })}
            </svg>

            {/* Zone Labels */}
            <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-widest text-sky-400/80 pointer-events-none">
              Zone B · Edge AI &amp; Robotics
            </div>
            <div className="absolute top-3 right-4 text-[10px] font-bold uppercase tracking-widest text-purple-400/80 pointer-events-none">
              Zone A · Quantum &amp; Cryo
            </div>
            <div className="absolute bottom-3 left-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 pointer-events-none">
              Zone C · CleanTech &amp; Smart Grid
            </div>
            <div className="absolute bottom-3 right-4 text-[10px] font-bold uppercase tracking-widest text-amber-400/80 pointer-events-none">
              Zone D · Sovereign AI &amp; Orbital
            </div>

            {/* Interactive Company Nodes */}
            {companies.map((comp) => {
              const isSelected = selectedTarget.data.id === comp.id;
              const isResonant = activeViewer?.cluster === comp.cluster;
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedTargetId(comp.id)}
                  style={{
                    left: `${comp.radarCoords.x}%`,
                    top: `${comp.radarCoords.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all ${
                    isSelected ? 'z-30 scale-110' : 'z-20 hover:scale-105'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-lg transition ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-white font-bold shadow-amber-400/30'
                        : isResonant
                        ? 'bg-slate-900/95 text-amber-300 border-amber-400/60 hover:border-amber-300'
                        : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] whitespace-nowrap">{comp.name}</span>
                  </div>
                </button>
              );
            })}

            {/* Interactive Peer Builder Nodes */}
            {approvedBuilders.map((builder) => {
              const isViewer = builder.id === activeViewer?.id;
              const isSelected = selectedTarget.data.id === builder.id;

              return (
                <button
                  key={builder.id}
                  onClick={() => {
                    if (!isViewer) setSelectedTargetId(builder.id);
                  }}
                  style={{
                    left: `${builder.radarCoords.x}%`,
                    top: `${builder.radarCoords.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
                    isViewer
                      ? 'z-30 cursor-default'
                      : isSelected
                      ? 'z-30 scale-110'
                      : 'z-10 hover:scale-105'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 text-[11px] shadow-md ${
                      isViewer
                        ? 'bg-emerald-500 text-slate-950 border-white font-bold ring-4 ring-emerald-500/30'
                        : isSelected
                        ? 'bg-sky-400 text-slate-950 border-white font-bold shadow-sky-400/30'
                        : 'bg-slate-900/90 text-sky-200 border-sky-500/40 hover:border-sky-300'
                    }`}
                  >
                    <User className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">
                      {isViewer ? `YOU: ${builder.name.split(' ')[0]}` : builder.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Problem Space & Conversation Spark Inspector */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
          {/* Selected Node Header */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {selectedTarget.type === 'company'
                  ? 'Espoo R&D Company Challenge Node'
                  : 'Verified Peer Builder Node'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                {selectedTarget.type === 'company'
                  ? selectedTarget.data.zone
                  : selectedTarget.data.cluster}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mt-2">{selectedTarget.data.name}</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {selectedTarget.type === 'company'
                ? `${selectedTarget.data.repName} · ${selectedTarget.data.repRole} (${selectedTarget.data.hq})`
                : `${selectedTarget.data.role} · ${selectedTarget.data.origin}`}
            </p>
          </div>

          {/* De-Jargonized Problem Space vs Old Boilerplate */}
          {selectedTarget.type === 'company' ? (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-sky-400" /> Real Engineering Bottlenecks in the Room Today
                </div>
                <p className="text-xs text-slate-100 mt-1.5 leading-relaxed">
                  {selectedTarget.data.actualProblemSpace}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Active Technical Bottlenecks (Newman Weighted):
                  </span>
                  <ul className="mt-1.5 space-y-1">
                    {selectedTarget.data['active bottlenecks'].map((b, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Demonstrated Engineering Focus:
              </div>
              <p className="text-xs text-slate-100 leading-relaxed">
                {selectedTarget.data.currentExploration}
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-300">
                <strong className="text-slate-400">Extracted Triad:</strong>{' '}
                {selectedTarget.data.demonstratedMechanism}
              </div>
            </div>
          )}

          {/* Conversation Spark Card */}
          <div className="bg-gradient-to-br from-emerald-950/50 via-slate-950 to-sky-950/40 border border-emerald-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <MessageSquareHeart className="w-4 h-4 text-emerald-400" /> Voluntary Conversation Spark
              </span>

              <button
                onClick={handleGenerateLiveSpark}
                disabled={isGeneratingSpark}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingSpark ? 'animate-spin' : ''}`} />
                {isGeneratingSpark ? 'Synthesizing...' : 'Re-Synthesize'}
              </button>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5">
              <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed">
                “{displayedSpark.text}”
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {displayedSpark.meta}
              </span>
              <span className="text-sky-300 font-medium">100% Voluntary Suggestion</span>
            </div>
          </div>

          {/* POST-EVENT LIFECYCLE: Double Opt-In Monday Follow-Up & TE24 Ledger */}
          <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Post-Event Lifecycle: Monday Follow-Up
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">
                TE24 Reform Ready
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If both parties indicate interest, an automated contextual introduction is emailed on Monday at 09:00 via Lyyti—closing the event lifecycle without manual business card sorting.
            </p>

            <button
              onClick={handleToggleLockIntro}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                isLocked
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isLocked ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Mutual Interest Locked · Scheduled for Monday 09:00
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Lock Mutual Interest for Monday Follow-Up
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
