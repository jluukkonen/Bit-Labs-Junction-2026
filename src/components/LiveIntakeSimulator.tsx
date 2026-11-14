import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Building2,
  UserPlus,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Applicant, LiveTriageResult } from '../types';
import { deJargonizeCompanyNeed, runLiveNemotronTriage } from '../services/nemotronService';

interface LiveIntakeSimulatorProps {
  onAddApplicantToQueue: (newApplicant: Applicant) => void;
}

export const LiveIntakeSimulator: React.FC<LiveIntakeSimulatorProps> = ({
  onAddApplicantToQueue,
}) => {
  const [mode, setMode] = useState<'applicant' | 'company'>('applicant');

  // Applicant Form State
  const [name, setName] = useState('Dr. Tariq Al-Mansoor');
  const [role, setRole] = useState('Embedded Silicon & RISC-V Accelerator Architect');
  const [origin, setOrigin] = useState('Relocated to Espoo · Otaniemi Research Fellow');
  const [linkedInClaim, setLinkedInClaim] = useState(
    'Minimalist LinkedIn profile with 95 connections and no summary buzzwords. Lists: "Hardware engineer working on Verilator, Chisel RTL, and low-power neural accelerators."'
  );
  const [scenarioAnswer, setScenarioAnswer] = useState(
    'On a 22nm RISC-V vector core for edge radar signal processing, SRAM bank conflicts during 512-point FFT butterfly stages stalled our MAC units 41% of cycles. I redesigned the scratchpad address generation unit (AGU) with a conflict-free XOR bank-swizzling permutation in Chisel RTL, achieving 94% MAC utilization inside a 320mW power budget.'
  );
  const [artifactText, setArtifactText] = useState(
    'GitHub: https://github.com/tmansoor-rtl/riscv-xor-fft-scratchpad (Chisel3 RTL, Verilator cycle-accurate testbenches, OpenROAD post-place-and-route timing reports).'
  );

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [triageResult, setTriageResult] = useState<LiveTriageResult | null>(null);
  const [addedToQueue, setAddedToQueue] = useState(false);

  // Company De-Jargonizer State
  const [companyName, setCompanyName] = useState('Nordic GridScale Robotics Oy (Espoo)');
  const [rawHrText, setRawHrText] = useState(
    'We are looking for a passionate, visionary 10x Senior Full-Stack AI Rockstar Ninja with 8+ years of synergistic experience in LLMs, transformative cloud paradigms, and cross-functional agile leadership to revolutionize our dynamic smart-energy solutions.'
  );
  const [isDejargonizing, setIsDejargonizing] = useState(false);
  const [companyResult, setCompanyResult] = useState<{
    actualProblemSpace: string;
    bottlenecks: string[];
    scenarioQuestionForApplicants: string;
    reasoning: string;
    latencyMs: number;
  } | null>(null);

  const loadPreset = (type: 'builder' | 'spammer') => {
    setTriageResult(null);
    setAddedToQueue(false);
    if (type === 'builder') {
      setName('Dr. Tariq Al-Mansoor');
      setRole('Embedded Silicon & RISC-V Accelerator Architect');
      setOrigin('Relocated to Espoo · Otaniemi Research Fellow');
      setLinkedInClaim(
        'Minimalist LinkedIn profile with 95 connections and no summary buzzwords. Lists: "Hardware engineer working on Verilator, Chisel RTL, and low-power neural accelerators."'
      );
      setScenarioAnswer(
        'On a 22nm RISC-V vector core for edge radar signal processing, SRAM bank conflicts during 512-point FFT butterfly stages stalled our MAC units 41% of cycles. I redesigned the scratchpad address generation unit (AGU) with a conflict-free XOR bank-swizzling permutation in Chisel RTL, achieving 94% MAC utilization inside a 320mW power budget.'
      );
      setArtifactText(
        'GitHub: https://github.com/tmansoor-rtl/riscv-xor-fft-scratchpad (Chisel3 RTL, Verilator cycle-accurate testbenches, OpenROAD post-place-and-route timing reports).'
      );
    } else {
      setName('Maximilian "10x-AI" Sterling');
      setRole('Global Generative AI Thought Leader & Prompt Synergy Architect');
      setOrigin('Remote / Influencer');
      setLinkedInClaim(
        'Top 0.1% AI Visionary | 45,000+ Followers | Building Hyper-Scalable Quantum-Ready Agentic Ecosystems | Helping Enterprises Unlock 1000x ROI with Holistic Prompt Transformation.'
      );
      setScenarioAnswer(
        'By leveraging next-generation autonomous multi-agent synergy and paradigm-shifting hyper-growth frameworks, we orchestrated a seamless cognitive transformation across all stakeholder touchpoints, delivering unprecedented zero-latency scalability and disruptive AI excellence.'
      );
      setArtifactText(
        'LinkedIn Post: "Why Prompt Engineering Makes Traditional Coding Obsolete in 2026" (Carousel PDF, no code or technical specifications).'
      );
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setAddedToQueue(false);
    try {
      const res = await runLiveNemotronTriage({
        name,
        role,
        linkedInClaim,
        scenarioAnswer,
        artifactText,
      });
      setTriageResult(res);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePushToQueue = () => {
    if (!triageResult) return;
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newApp: Applicant = {
      id: `app-live-${Date.now()}`,
      name,
      role,
      origin,
      avatarInitials: initials,
      persona: triageResult.competenceScore >= 75 ? 'Builder / Engineer' : 'Startup Founder',
      cluster: triageResult.cluster,
      competenceScore: triageResult.competenceScore,
      legacyLinkedInScore: triageResult.legacyLinkedInScore,
      fluffIndex: triageResult.fluffIndex,
      status: triageResult.fluffIndex > 65 ? 'flagged' : 'pending',
      reviewedBy: null,
      reviewedAt: null,
      humanReviewerNote: '',
      linkedInSummaryClaim: linkedInClaim,
      scenarioPrompt:
        'Describe a hard physical or compute constraint you hit in a real system and the exact architectural trade-off you made to solve it.',
      scenarioAnswer,
      verifiedArtifacts: [
        {
          title: artifactText.slice(0, 68),
          type: 'Live Intake Artifact Submission',
          url: 'https://github.com',
          verificationNote: artifactText,
          authenticityScore: Math.max(5, 100 - triageResult.fluffIndex),
        },
      ],
      nemotronReasoning: `[LIVE B300 INFERENCE · ${triageResult.latencyMs}ms]\n${triageResult.reasoningTrace}\n\nSummary Verdict: ${triageResult.summaryVerdict}`,
      strengths: triageResult.strengths,
      risksOrFlags: triageResult.risksOrFlags,
      currentExploration: scenarioAnswer.slice(0, 140) + '...',
      radarCoords: {
        x: Math.floor(25 + Math.random() * 50),
        y: Math.floor(25 + Math.random() * 50),
      },
      sparks: {},
    };

    onAddApplicantToQueue(newApp);
    setAddedToQueue(true);
  };

  const handleDejargonize = async () => {
    setIsDejargonizing(true);
    try {
      const res = await deJargonizeCompanyNeed(companyName, rawHrText);
      setCompanyResult(res);
    } finally {
      setIsDejargonizing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Mode Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" /> Two-Sided AI Intake & De-Jargonizer Studio (Live B300 Sandbox)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Solves the two-sided description gap: helps talent prove real competence beyond CVs, and helps companies articulate their true engineering needs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMode('applicant')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'applicant'
                ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> 1. Talent Artifact Intake
          </button>
          <button
            onClick={() => setMode('company')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'company'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> 2. Company Need De-Jargonizer
          </button>
        </div>
      </div>

      {mode === 'applicant' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Input Column */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Simulate Applicant Registration
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPreset('builder')}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium hover:bg-emerald-500/25"
                >
                  Load Preset: Quiet DeepTech Builder
                </button>
                <button
                  onClick={() => loadPreset('spammer')}
                  className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-medium hover:bg-rose-500/25"
                >
                  Load Preset: AI Buzzword Spammer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Role / Specialty
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Surface LinkedIn / CV Summary (What legacy keyword scrapers read)
              </label>
              <textarea
                rows={2}
                value={linkedInClaim}
                onChange={(e) => setLinkedInClaim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-sky-300 mb-1">
                EventCompass Micro-Scenario Response (Hard constraint & trade-off)
              </label>
              <textarea
                rows={4}
                value={scenarioAnswer}
                onChange={(e) => setScenarioAnswer(e.target.value)}
                className="w-full bg-slate-950 border border-sky-500/40 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-emerald-300 mb-1">
                Verified Build Artifact / Repository Evidence
              </label>
              <textarea
                rows={2}
                value={artifactText}
                onChange={(e) => setArtifactText(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 hover:opacity-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
              {isEvaluating
                ? 'Running NVIDIA Nemotron 3.5 Super VL on B300 Cluster...'
                : 'Run Live NVIDIA Nemotron 3.5 Triage'}
            </button>
          </div>

          {/* Output Column */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            {!triageResult ? (
              <div className="h-80 flex flex-col items-center justify-center text-center px-6">
                <Sparkles className="w-10 h-10 text-sky-400/60 mb-3" />
                <h4 className="text-sm font-semibold text-slate-200">
                  Ready for Live B300 Competence & Fluff Evaluation
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Select one of the presets on the left (or type custom text) and click{' '}
                  <strong className="text-sky-300">Run Live NVIDIA Nemotron 3.5 Triage</strong> to see how EventCompass separates real builders from AI resume noise.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> {triageResult.modelUsed}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Latency: {triageResult.latencyMs}ms
                  </span>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-slate-400">Artifact Competence</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        triageResult.competenceScore >= 75 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {triageResult.competenceScore}/100
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-slate-400">Old LinkedIn AI</div>
                    <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                      {triageResult.legacyLinkedInScore}%
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-slate-400">AI Fluff Index</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        triageResult.fluffIndex > 50 ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      {triageResult.fluffIndex}%
                    </div>
                  </div>
                </div>

                {/* AI Recommendation for Human Reviewer */}
                <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">
                      AI Triage Recommendation (Requires Human Verification):
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        triageResult.recommendedAction === 'Approve'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {triageResult.recommendedAction}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                    {triageResult.summaryVerdict}
                  </p>
                </div>

                {/* Nemotron Chain-of-Thought Trace */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Nemotron 3.5 Chain-of-Thought Reasoning Trace:
                  </div>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                    {triageResult.reasoningTrace}
                  </pre>
                </div>

                {/* Push to Queue Button */}
                <div className="pt-2">
                  {addedToQueue ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Added to Curator’s Cockpit Triage Queue (Awaiting Human Sign-Off)
                    </div>
                  ) : (
                    <button
                      onClick={handlePushToQueue}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <PlusCircle className="w-4 h-4" /> Send to Curator’s Cockpit Queue for Human Sign-Off
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mode 2: Company De-Jargonizer */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Translate Vague HR Job Ads into Real Engineering Problem Spaces
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Espoo Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Raw Corporate HR Job Description / Boilerplate
              </label>
              <textarea
                rows={5}
                value={rawHrText}
                onChange={(e) => setRawHrText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <button
              onClick={handleDejargonize}
              disabled={isDejargonizing}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isDejargonizing ? 'animate-spin' : ''}`} />
              {isDejargonizing
                ? 'Extracting Real Engineering Bottlenecks on B300...'
                : 'Translate into Concrete Event Problem Space'}
            </button>
          </div>

          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            {!companyResult ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-6">
                <Building2 className="w-10 h-10 text-amber-400/60 mb-3" />
                <h4 className="text-sm font-semibold text-slate-200">
                  Help Espoo Companies Articulate What They Actually Need
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Click the button on the left to strip away HR buzzwords and generate a concrete problem space + scenario question for the Event Compass radar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-amber-300">
                    De-Jargonized Engineering Problem Space:
                  </div>
                  <p className="text-xs text-white mt-1.5 leading-relaxed">
                    {companyResult.actualProblemSpace}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-sky-300 mb-2">
                    Extracted Technical Bottlenecks (For Radar Matching):
                  </div>
                  <ul className="space-y-1.5">
                    {companyResult.bottlenecks.map((b, idx) => (
                      <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-emerald-300">
                    Recommended Scenario Question for Applicants (Replaces CV Upload):
                  </div>
                  <p className="text-xs text-emerald-100 mt-1.5 italic">
                    “{companyResult.scenarioQuestionForApplicants}”
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
