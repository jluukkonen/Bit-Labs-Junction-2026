import React, { useState, useMemo } from 'react';
import {
  Building2,
  User,
  RefreshCw,
  MessageSquareHeart,
  CheckCircle2,
  MapPin,
  Send,
  ChevronDown,
  ChevronUp,
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
  const [showDetails, setShowDetails] = useState<boolean>(false);

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

  const handleSelectTarget = (targetId: string) => {
    setSelectedTargetId(targetId);
    setShowDetails(false);
  };

  const displayedSpark = useMemo(() => {
    if (customSparks[currentSparkKey]) {
      return customSparks[currentSparkKey];
    }
    if (activeViewer?.sparks?.[selectedTarget.data.id]) {
      return {
        text: activeViewer.sparks[selectedTarget.data.id] || '',
        meta: 'Artifact-to-bottleneck match',
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
        meta: 'Artifact-to-bottleneck match',
      };
    } else {
      const peer = selectedTarget.data;
      return {
        text: `You and ${peer.name} are both verified builders at today's forum. Compare your approach on "${activeViewer?.currentExploration}" with ${
          peer.name.split(' ')[0]
        }'s work on "${peer.currentExploration}".`,
        meta: 'Peer problem-space overlap',
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
      {/* Minimal Toolbar: Legend + Viewing As Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700 font-medium">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200 inline-block" />
            You ({activeViewer?.name.split(' ')[0]})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rotate-45 bg-[#FFC72C] border border-amber-500 inline-block" />
            Espoo R&amp;D Challenge
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0066B3] inline-block" />
            Peer Builder
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 font-medium">Viewing As:</span>
          <select
            value={viewerId}
            onChange={(e) => setViewerId(e.target.value)}
            aria-label="Select perspective builder"
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
          >
            {approvedBuilders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.cluster})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Floorplan Map + Sleek Inspector Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Breathing Architectural Floorplan Map */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="relative w-full h-[490px] rounded-xl bg-[#F1F5F9] border border-slate-200 overflow-hidden select-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <radialGradient id="zone-edge" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0066B3" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#0066B3" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="zone-quantum" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="zone-clean" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="zone-cloud" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx="24" cy="28" r="23" fill="url(#zone-edge)" />
              <circle cx="72" cy="26" r="23" fill="url(#zone-quantum)" />
              <circle cx="26" cy="72" r="23" fill="url(#zone-clean)" />
              <circle cx="75" cy="70" r="23" fill="url(#zone-cloud)" />

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
                      strokeWidth={isSelected ? '0.65' : '0.35'}
                      strokeDasharray={isSelected ? 'none' : '1.4,1.2'}
                      opacity={isSelected ? 0.9 : 0.5}
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
                      opacity={isSelected ? 0.85 : 0.4}
                    />
                  );
                })}
            </svg>

            {/* Zone Labels */}
            <div className="absolute top-3 left-3 bg-white/95 border border-slate-200 text-[#00508F] px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone B · Edge AI
            </div>
            <div className="absolute top-3 right-3 bg-white/95 border border-slate-200 text-purple-800 px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone A · Quantum
            </div>
            <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-200 text-emerald-800 px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone C · CleanTech
            </div>
            <div className="absolute bottom-3 right-3 bg-white/95 border border-slate-200 text-amber-800 px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-bold uppercase tracking-wider pointer-events-none">
              Zone D · Sovereign AI
            </div>

            {/* Company Nodes */}
            {companies.map((comp) => {
              const isSelected = selectedTarget.data.id === comp.id;
              const isResonant = activeViewer?.cluster === comp.cluster;
              return (
                <button
                  key={comp.id}
                  onClick={() => handleSelectTarget(comp.id)}
                  style={{
                    left: `${comp.radarCoords.x}%`,
                    top: `${comp.radarCoords.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
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

            {/* Peer Builder Nodes */}
            {approvedBuilders.map((builder) => {
              const isViewer = builder.id === activeViewer?.id;
              const isSelected = selectedTarget.data.id === builder.id;

              return (
                <button
                  key={builder.id}
                  onClick={() => {
                    if (!isViewer) handleSelectTarget(builder.id);
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

        {/* Right: Sleek, Compact Node Inspector */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
          {/* 1. Selected Entity Name & Zone */}
          <div className="pb-4 border-b border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0066B3]">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {selectedTarget.type === 'company'
                  ? selectedTarget.data.zone
                  : selectedTarget.data.cluster}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">{selectedTarget.data.name}</h3>
            <p className="text-xs text-slate-500">
              {selectedTarget.type === 'company'
                ? `${selectedTarget.data.repName} · ${selectedTarget.data.repRole}`
                : `${selectedTarget.data.role} · ${selectedTarget.data.origin}`}
            </p>
          </div>

          {/* 2. Conversation Spark (2 sentences max) */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <MessageSquareHeart className="w-4 h-4 text-emerald-600" /> Conversation Spark
              </span>

              <button
                onClick={handleGenerateLiveSpark}
                disabled={isGeneratingSpark}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingSpark ? 'animate-spin' : ''}`} />
                {isGeneratingSpark ? 'Synthesizing...' : 'Re-Synthesize'}
              </button>
            </div>

            <p className="text-sm text-slate-900 font-medium leading-relaxed">
              “{displayedSpark.text}”
            </p>

            <div className="text-[11px] text-slate-500">{displayedSpark.meta}</div>
          </div>

          {/* 3. Lock Mutual Interest for Monday Follow-Up */}
          <button
            onClick={handleToggleLockIntro}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm ${
              isLocked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#0066B3] hover:bg-[#00508F] text-white'
            }`}
          >
            {isLocked ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Mutual Interest Locked · Monday 09:00 via Lyyti
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Lock Mutual Interest for Monday Follow-Up
              </>
            )}
          </button>

          {/* 4. Progressive Disclosure Accordion: Deep Bottlenecks / Candidate Background */}
          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition"
            >
              <span>Näytä lisätiedot / Details</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showDetails && (
              <div className="mt-3 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                {selectedTarget.type === 'company' ? (
                  <>
                    <div>
                      <div className="font-bold text-slate-800 mb-1">Problem Space</div>
                      <p className="text-slate-600 leading-relaxed">
                        {selectedTarget.data.actualProblemSpace}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="font-bold text-slate-800 mb-1.5">Active Bottlenecks</div>
                      <ul className="space-y-1.5">
                        {selectedTarget.data['active bottlenecks'].map((b, i) => (
                          <li key={i} className="text-slate-700 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0066B3] shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="font-bold text-slate-800 mb-1">Engineering Focus</div>
                      <p className="text-slate-600 leading-relaxed">
                        {selectedTarget.data.currentExploration}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">Propositional Triad</div>
                      <p className="text-slate-700 leading-relaxed">
                        {selectedTarget.data.demonstratedMechanism}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
