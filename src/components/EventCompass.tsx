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
        meta: 'Pre-computed from demonstrated artifacts & bottlenecks',
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
    <div className="space-y-4">
      {/* Compact Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066B3]/10 text-[#0066B3] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Event Compass Floorplan · Organic Problem-Space Discovery
            </h2>
            <p className="text-xs text-slate-600">
              Explore active R&amp;D bottlenecks and peer builders across venue zones—zero forced speed-dating.
            </p>
          </div>
        </div>

        {/* Perspective Switcher */}
        <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3 py-1.5 shrink-0 flex items-center gap-2.5">
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            Viewing As:
          </span>
          <select
            value={viewerId}
            onChange={(e) => setViewerId(e.target.value)}
            aria-label="Select perspective builder"
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0066B3]"
          >
            {approvedBuilders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.cluster})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Floorplan Radar + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Light Architectural Floorplan / Constellation Map */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0066B3]" /> Venue Zone Map
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200 inline-block" />
                You ({activeViewer?.name.split(' ')[0]})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#FFC72C] border border-amber-500 inline-block" />
                Espoo R&amp;D Challenge
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0066B3] inline-block" />
                Peer Builder
              </span>
            </div>
          </div>

          {/* 2D Interactive Light Floorplan Map */}
          <div className="relative w-full h-[480px] rounded-xl bg-[#F1F5F9] border border-slate-300 shadow-inner overflow-hidden select-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <radialGradient id="zone-edge" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0066B3" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#0066B3" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="zone-quantum" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.11" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="zone-clean" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="zone-cloud" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Soft Cluster Zones */}
              <circle cx="24" cy="28" r="23" fill="url(#zone-edge)" />
              <circle cx="72" cy="26" r="23" fill="url(#zone-quantum)" />
              <circle cx="26" cy="72" r="23" fill="url(#zone-clean)" />
              <circle cx="75" cy="70" r="23" fill="url(#zone-cloud)" />
              <circle cx="50" cy="50" r="18" fill="url(#zone-edge)" />

              {/* Subtle Architectural Grid & Concentric Rings */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="#CBD5E1" strokeWidth="0.25" strokeDasharray="1,1.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#CBD5E1" strokeWidth="0.25" strokeDasharray="1,1.5" />
              <circle
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="0.4"
                strokeDasharray="1.2,1.2"
              />
              <circle
                cx="50"
                cy="50"
                r="39"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="0.4"
                strokeDasharray="1.2,1.2"
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
                      stroke={isSelected ? '#0066B3' : '#059669'}
                      strokeWidth={isSelected ? '0.65' : '0.4'}
                      strokeDasharray={isSelected ? 'none' : '1.4,1.2'}
                      opacity={isSelected ? 0.9 : 0.55}
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
                      stroke="#0066B3"
                      strokeWidth={isSelected ? '0.6' : '0.35'}
                      strokeDasharray="1.2,1.2"
                      opacity={isSelected ? 0.85 : 0.45}
                    />
                  );
                })}
            </svg>

            {/* High-Contrast Zone Corner Labels */}
            <div className="absolute top-3 left-3 bg-white/95 border border-sky-200 text-[#00508F] px-2.5 py-1 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone B · Edge AI &amp; Robotics
            </div>
            <div className="absolute top-3 right-3 bg-white/95 border border-purple-200 text-purple-800 px-2.5 py-1 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone A · Quantum &amp; Cryo
            </div>
            <div className="absolute bottom-3 left-3 bg-white/95 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone C · CleanTech &amp; Smart Grid
            </div>
            <div className="absolute bottom-3 right-3 bg-white/95 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
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
                    isSelected ? 'z-30 scale-105' : 'z-20 hover:scale-105'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm transition ${
                      isSelected
                        ? 'bg-[#FFC72C] text-slate-950 border-amber-600 font-bold shadow-md ring-2 ring-[#FFC72C]/40'
                        : isResonant
                        ? 'bg-white text-slate-900 border-amber-400 font-semibold hover:border-amber-600'
                        : 'bg-white/95 text-slate-700 border-slate-300 font-medium hover:border-slate-400'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-950' : 'text-amber-600'}`} />
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
                      ? 'z-30 scale-105'
                      : 'z-10 hover:scale-105'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 text-[11px] shadow-sm transition ${
                      isViewer
                        ? 'bg-emerald-600 text-white border-emerald-700 font-bold ring-4 ring-emerald-500/20'
                        : isSelected
                        ? 'bg-[#0066B3] text-white border-[#00508F] font-bold shadow-md ring-2 ring-[#0066B3]/30'
                        : 'bg-white text-slate-800 border-slate-300 font-medium hover:border-[#0066B3]'
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

        {/* Right: Compact Problem Space & Conversation Spark Inspector */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Selected Node Header */}
          <div className="border-b border-slate-200 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  selectedTarget.type === 'company'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                {selectedTarget.type === 'company'
                  ? 'Espoo R&D Challenge'
                  : 'Verified Peer Builder'}
              </span>
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0066B3]" />
                {selectedTarget.type === 'company'
                  ? selectedTarget.data.zone
                  : selectedTarget.data.cluster}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-2">{selectedTarget.data.name}</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {selectedTarget.type === 'company'
                ? `${selectedTarget.data.repName} · ${selectedTarget.data.repRole} (${selectedTarget.data.hq})`
                : `${selectedTarget.data.role} · ${selectedTarget.data.origin}`}
            </p>
          </div>

          {/* Compact Problem Space / Focus */}
          {selectedTarget.type === 'company' ? (
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#00508F] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#0066B3]" /> Room Engineering Bottlenecks
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedTarget.data.actualProblemSpace}
              </p>

              <ul className="pt-2 border-t border-slate-200 space-y-1">
                {selectedTarget.data['active bottlenecks'].map((b, i) => (
                  <li key={i} className="text-xs text-slate-800 flex items-start gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0066B3] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#00508F]">
                Current Engineering Focus
              </div>
              <p className="text-xs text-slate-800 leading-relaxed">
                {selectedTarget.data.currentExploration}
              </p>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-700">
                <strong className="text-slate-900">Triad:</strong>{' '}
                {selectedTarget.data.demonstratedMechanism}
              </div>
            </div>
          )}

          {/* Conversation Spark Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <MessageSquareHeart className="w-4 h-4 text-emerald-700" /> Voluntary Conversation Spark
              </span>

              <button
                onClick={handleGenerateLiveSpark}
                disabled={isGeneratingSpark}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingSpark ? 'animate-spin' : ''}`} />
                {isGeneratingSpark ? 'Synthesizing...' : 'Re-Synthesize'}
              </button>
            </div>

            <div className="bg-white border border-emerald-200/80 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                “{displayedSpark.text}”
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                {displayedSpark.meta}
              </span>
              <span className="text-emerald-800 font-semibold shrink-0">100% Voluntary</span>
            </div>
          </div>

          {/* Post-Event Lifecycle: Double Opt-In Monday Follow-Up */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-[#0066B3]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Monday Follow-Up (Lyyti)
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-[#0066B3] border border-sky-200">
                TE24 Ready
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Double opt-in sends a contextual intro Monday at 09:00 via Lyyti—no manual business card sorting.
            </p>

            <button
              onClick={handleToggleLockIntro}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm ${
                isLocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#0066B3] hover:bg-[#00508F] text-white'
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
