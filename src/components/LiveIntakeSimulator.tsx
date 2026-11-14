import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  PlusCircle,
  Building2,
  UserPlus,
  RefreshCw,
  ArrowRight,
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
      evidenceCategory:
        triageResult.evidenceCategory ||
        (triageResult.fluffIndex > 65
          ? 'Self-Reported Claims Only'
          : 'Verified Public Code / Benchmark'),
      alignmentType:
        triageResult.alignmentType ||
        (triageResult.competenceScore >= 80
          ? 'Direct Bottleneck Match'
          : 'Exploration & High Learning Agility'),
      demonstratedMechanism: triageResult.summaryVerdict,
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
    <div className="space-y-4">
      {/* Mode Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0066B3]" /> Two-Sided Live Intake &amp; De-Jargonizer
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Verify builder competence from real artifacts or translate corporate HR ads into concrete engineering needs.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
          <button
            onClick={() => setMode('applicant')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'applicant'
                ? 'bg-[#0066B3] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> 1. Talent Intake
          </button>
          <button
            onClick={() => setMode('company')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'company'
                ? 'bg-[#FFC72C] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> 2. Company De-Jargonizer
          </button>
        </div>
      </div>

      {mode === 'applicant' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Input Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00508F]">
                Applicant Submission Form
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPreset('builder')}
                  className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition"
                >
                  Preset: DeepTech Builder
                </button>
                <button
                  onClick={() => loadPreset('spammer')}
                  className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-100 transition"
                >
                  Preset: Buzzword Spammer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role / Specialty
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LinkedIn / CV Summary (Surface Keyword Signal)
              </label>
              <textarea
                rows={2}
                value={linkedInClaim}
                onChange={(e) => setLinkedInClaim(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#00508F] mb-1">
                Micro-Scenario Response (Hard Constraint &amp; Trade-Off)
              </label>
              <textarea
                rows={4}
                value={scenarioAnswer}
                onChange={(e) => setScenarioAnswer(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">
                Verified Artifact / Repository / Vignette
              </label>
              <textarea
                rows={2}
                value={artifactText}
                onChange={(e) => setArtifactText(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
              />
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="w-full py-2.5 rounded-xl bg-[#0066B3] hover:bg-[#00508F] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
              {isEvaluating
                ? 'Running NVIDIA Nemotron 3.5 Super VL on B300...'
                : 'Run Live NVIDIA Nemotron 3.5 Triage'}
            </button>
          </div>

          {/* Output Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            {!triageResult ? (
              <div className="h-80 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-[#0066B3]" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Ready for Live B300 Evidence Evaluation
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Select a preset or edit the fields on the left, then run live triage to extract the Propositional Triad and Fluff Index.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> {triageResult.modelUsed}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Latency: {triageResult.latencyMs}ms
                  </span>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-center">
                    <div className="text-[11px] font-semibold uppercase text-slate-600">Competence</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        triageResult.competenceScore >= 75 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {triageResult.competenceScore}/100
                    </div>
                  </div>
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-center">
                    <div className="text-[11px] font-semibold uppercase text-slate-600">LinkedIn AI</div>
                    <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
                      {triageResult.legacyLinkedInScore}%
                    </div>
                  </div>
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-center">
                    <div className="text-[11px] font-semibold uppercase text-slate-600">Fluff Index</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        triageResult.fluffIndex > 50 ? 'text-rose-700' : 'text-[#0066B3]'
                      }`}
                    >
                      {triageResult.fluffIndex}%
                    </div>
                  </div>
                </div>

                {/* AI Recommendation for Human Reviewer */}
                <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#00508F]">
                      Triage Summary (Awaiting Human Decision):
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        triageResult.recommendedAction === 'Approve'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {triageResult.recommendedAction}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 mt-2 leading-relaxed">
                    {triageResult.summaryVerdict}
                  </p>
                </div>

                {/* Nemotron Chain-of-Thought Trace */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Verification Reasoning Trace:
                  </div>
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                    {triageResult.reasoningTrace}
                  </pre>
                </div>

                {/* Push to Queue Button */}
                <div className="pt-1">
                  {addedToQueue ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Added to Curator Cockpit Inbox (Awaiting Human Sign-Off)
                    </div>
                  ) : (
                    <button
                      onClick={handlePushToQueue}
                      className="w-full py-2.5 rounded-xl bg-[#0066B3] hover:bg-[#00508F] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" /> Send to Curator Cockpit Queue
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
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 pb-3 border-b border-slate-200">
              Translate HR Boilerplate into Concrete Engineering Needs
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Espoo Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raw Corporate HR Job Description
              </label>
              <textarea
                rows={5}
                value={rawHrText}
                onChange={(e) => setRawHrText(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white"
              />
            </div>
            <button
              onClick={handleDejargonize}
              disabled={isDejargonizing}
              className="w-full py-2.5 rounded-xl bg-[#FFC72C] hover:bg-[#F59E0B] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isDejargonizing ? 'animate-spin' : ''}`} />
              {isDejargonizing
                ? 'Extracting Real Engineering Bottlenecks...'
                : 'Translate into Concrete Problem Space'}
            </button>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            {!companyResult ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-amber-700" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Clarify What Espoo Teams Actually Need
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Strip HR buzzwords to generate concrete Event Compass bottlenecks and a micro-scenario prompt.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-amber-800">
                    De-Jargonized Engineering Problem Space
                  </div>
                  <p className="text-xs text-slate-900 mt-1.5 leading-relaxed font-medium">
                    {companyResult.actualProblemSpace}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-[#00508F] mb-2">
                    Extracted Technical Bottlenecks
                  </div>
                  <ul className="space-y-1.5">
                    {companyResult.bottlenecks.map((b, idx) => (
                      <li key={idx} className="text-xs text-slate-800 flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-[#0066B3] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-emerald-800">
                    Recommended Scenario Prompt (Replaces CV Upload)
                  </div>
                  <p className="text-xs text-emerald-950 mt-1.5 italic font-medium">
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
