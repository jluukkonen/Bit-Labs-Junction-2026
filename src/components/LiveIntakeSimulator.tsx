import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  PlusCircle,
  Building2,
  UserPlus,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import { Applicant, LiveTriageResult } from '../types';
import {
  AIModelEngine,
  VisualAttachment,
  deJargonizeCompanyNeed,
  runLiveNemotronTriage,
} from '../services/nemotronService';

interface LiveIntakeSimulatorProps {
  onAddApplicantToQueue: (newApplicant: Applicant) => void;
}

const ENGINE_OPTIONS: ReadonlyArray<{ id: AIModelEngine; label: string }> = [
  { id: 'nemotron-3.5-b300', label: 'Nemotron 3.5 B300' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash ⚡' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro 🧠' },
];

function createSampleThermalPlotPng(): VisualAttachment {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Jetson Orin Nano 8GB · ROS2 Zero-Copy IPC Benchmark', 28, 38);

    ctx.fillStyle = '#475569';
    ctx.font = '13px monospace';
    ctx.fillText('4-Cam YOLOv8 + Depth Point-Cloud | 15W TDP Envelope | 60 FPS Target', 28, 62);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let y = 100; y <= 300; y += 50) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(680, y);
      ctx.stroke();
    }

    // Bar 1: Standard DDS
    ctx.fillStyle = '#E11D48';
    ctx.fillRect(120, 120, 160, 180);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('64.0 ms', 165, 112);
    ctx.font = '13px sans-serif';
    ctx.fillText('Standard DDS (38% drop, 78°C)', 105, 326);

    // Bar 2: iceoryx + CUDA pinned
    ctx.fillStyle = '#0066B3';
    ctx.fillRect(410, 265, 160, 35);
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('11.4 ms (14.2W)', 420, 255);
    ctx.fillStyle = '#0F172A';
    ctx.font = '13px sans-serif';
    ctx.fillText('iceoryx + CUDA Pinned (0% drop, 61°C)', 375, 326);
  }

  return {
    fileName: 'orin-nano-thermal-latency-plot.png',
    mimeType: 'image/png',
    base64Data: canvas.toDataURL('image/png'),
  };
}

export const LiveIntakeSimulator: React.FC<LiveIntakeSimulatorProps> = ({
  onAddApplicantToQueue,
}) => {
  const [mode, setMode] = useState<'applicant' | 'company'>('applicant');
  const [selectedEngine, setSelectedEngine] = useState<AIModelEngine>('gemini-3-flash');
  const [visualAttachment, setVisualAttachment] = useState<VisualAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Applicant Form State
  const [name, setName] = useState('Dr. Tariq Al-Mansoor');
  const [role, setRole] = useState('Embedded Silicon & RISC-V Accelerator Architect');
  const [origin] = useState('Relocated to Espoo · Otaniemi Research Fellow');
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
  const [showReasoningTrace, setShowReasoningTrace] = useState(false);

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
    modelUsed?: string;
  } | null>(null);

  const loadPreset = (type: 'builder' | 'spammer') => {
    setTriageResult(null);
    setAddedToQueue(false);
    setShowReasoningTrace(false);
    setVisualAttachment(null);
    if (type === 'builder') {
      setName('Dr. Tariq Al-Mansoor');
      setRole('Embedded Silicon & RISC-V Accelerator Architect');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setVisualAttachment({
          fileName: file.name,
          mimeType: file.type || 'image/png',
          base64Data: reader.result,
        });
        if (selectedEngine === 'nemotron-3.5-b300') {
          setSelectedEngine('gemini-3-flash');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAttachSamplePlot = () => {
    setVisualAttachment(createSampleThermalPlotPng());
    if (selectedEngine === 'nemotron-3.5-b300') {
      setSelectedEngine('gemini-3-flash');
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setAddedToQueue(false);
    setShowReasoningTrace(false);
    try {
      const res = await runLiveNemotronTriage({
        name,
        role,
        linkedInClaim,
        scenarioAnswer,
        artifactText,
        engine: selectedEngine,
        visualAttachment: visualAttachment || undefined,
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

    const artifacts = [
      {
        title: artifactText.slice(0, 68),
        type: 'Live Intake Artifact Submission',
        url: 'https://github.com',
        verificationNote: artifactText,
        authenticityScore: Math.max(5, 100 - triageResult.fluffIndex),
      },
    ];

    if (visualAttachment) {
      artifacts.push({
        title: visualAttachment.fileName,
        type: `Multimodal Proof (${visualAttachment.mimeType})`,
        url: 'https://github.com',
        verificationNote: `Inspected via ${triageResult.modelUsed}`,
        authenticityScore: Math.max(5, 100 - triageResult.fluffIndex),
      });
    }

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
      verifiedArtifacts: artifacts,
      nemotronReasoning: `[${triageResult.modelUsed.toUpperCase()} · ${triageResult.latencyMs}ms]\n${triageResult.reasoningTrace}\n\nSummary Verdict: ${triageResult.summaryVerdict}`,
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
      const res = await deJargonizeCompanyNeed(companyName, rawHrText, selectedEngine);
      setCompanyResult(res);
    } finally {
      setIsDejargonizing(false);
    }
  };

  const activeEngineLabel =
    ENGINE_OPTIONS.find((e) => e.id === selectedEngine)?.label.replace(/ [⚡🧠]$/, '') ||
    'Gemini 3 Flash';

  return (
    <div className="space-y-6">
      {/* Mode & Dual-Engine Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:px-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0 self-start lg:self-auto">
          <button
            onClick={() => setMode('applicant')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'applicant'
                ? 'bg-[#0066B3] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> 1. Talent Intake
          </button>
          <button
            onClick={() => setMode('company')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === 'company'
                ? 'bg-[#FFC72C] text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> 2. Company De-Jargonizer
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#0066B3]" /> AI Engine:
          </span>
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            {ENGINE_OPTIONS.map((eng) => (
              <button
                key={eng.id}
                onClick={() => setSelectedEngine(eng.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedEngine === eng.id
                    ? 'bg-white text-[#0066B3] shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {eng.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'applicant' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Input Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">
                Applicant Submission
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPreset('builder')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition"
                >
                  DeepTech Builder
                </button>
                <button
                  onClick={() => loadPreset('spammer')}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
                >
                  Buzzword Spammer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                LinkedIn / CV Summary
              </label>
              <textarea
                rows={2}
                value={linkedInClaim}
                onChange={(e) => setLinkedInClaim(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Micro-Scenario Response
              </label>
              <textarea
                rows={4}
                value={scenarioAnswer}
                onChange={(e) => setScenarioAnswer(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Verified Artifact / Repository
              </label>
              <textarea
                rows={2}
                value={artifactText}
                onChange={(e) => setArtifactText(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
              />
            </div>

            {/* Compact Multimodal Proof Attachment */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#0066B3]" />
                  Multimodal Proof (Screenshot / Diagram / PDF)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0066B3] text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition"
                  >
                    <Upload className="w-3 h-3" /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={handleAttachSamplePlot}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[11px] font-semibold text-[#0066B3] transition"
                  >
                    Attach Sample Orin Thermal Plot (Vision)
                  </button>
                </div>
              </div>

              {visualAttachment && (
                <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {visualAttachment.mimeType.startsWith('image/') ? (
                      <img
                        src={visualAttachment.base64Data}
                        alt={visualAttachment.fileName}
                        className="w-12 h-8 object-cover rounded border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-8 rounded bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-purple-700" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {visualAttachment.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Ready for Gemini 3 Vision inspection
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisualAttachment(null)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="w-full py-3 rounded-xl bg-[#0066B3] hover:bg-[#00508F] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
              {isEvaluating
                ? `Evaluating on ${activeEngineLabel}...`
                : `Run Live ${activeEngineLabel} Triage`}
            </button>
          </div>

          {/* Output Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {!triageResult ? (
              <div className="h-96 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#0066B3]" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Ready for Live Evaluation
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
                  Choose an AI engine above and run triage to compare competence extraction.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> {triageResult.modelUsed}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {triageResult.latencyMs}ms
                  </span>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 text-center">
                    <div className="text-[11px] font-semibold uppercase text-slate-500">Competence</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        triageResult.competenceScore >= 75 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {triageResult.competenceScore}
                    </div>
                  </div>
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 text-center">
                    <div className="text-[11px] font-semibold uppercase text-slate-500">LinkedIn AI</div>
                    <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
                      {triageResult.legacyLinkedInScore}%
                    </div>
                  </div>
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 text-center">
                    <div className="text-[11px] font-semibold uppercase text-slate-500">Fluff Index</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        triageResult.fluffIndex > 50 ? 'text-rose-700' : 'text-[#0066B3]'
                      }`}
                    >
                      {triageResult.fluffIndex}%
                    </div>
                  </div>
                </div>

                {/* Verdict Summary */}
                <div className="bg-[#F8FAFC] border border-slate-200 border-l-4 border-l-[#0066B3] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#00508F]">
                      Triage Verdict
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
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {triageResult.summaryVerdict}
                  </p>
                </div>

                {/* Push to Queue Button */}
                {addedToQueue ? (
                  <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Sent to Curator Cockpit Queue
                  </div>
                ) : (
                  <button
                    onClick={handlePushToQueue}
                    className="w-full py-3 rounded-xl bg-[#0066B3] hover:bg-[#00508F] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" /> Send to Curator Cockpit Queue
                  </button>
                )}

                {/* Collapsible AI Reasoning Trace */}
                <div className="border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setShowReasoningTrace((prev) => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition"
                  >
                    <span>Näytä AI-päätelyketju / View Reasoning Trace</span>
                    {showReasoningTrace ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {showReasoningTrace && (
                    <pre className="mt-3 text-xs font-mono text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {triageResult.reasoningTrace}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mode 2: Company De-Jargonizer */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="text-sm font-bold text-slate-900 pb-4 border-b border-slate-100">
              Company Need De-Jargonizer
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Espoo Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Raw HR Job Description
              </label>
              <textarea
                rows={5}
                value={rawHrText}
                onChange={(e) => setRawHrText(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
              />
            </div>
            <button
              onClick={handleDejargonize}
              disabled={isDejargonizing}
              className="w-full py-3 rounded-xl bg-[#FFC72C] hover:bg-[#F59E0B] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isDejargonizing ? 'animate-spin' : ''}`} />
              {isDejargonizing
                ? `Extracting via ${activeEngineLabel}...`
                : `Translate via ${activeEngineLabel}`}
            </button>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {!companyResult ? (
              <div className="h-72 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-amber-700" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Strip HR Buzzwords
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
                  Translate corporate job boilerplate into clear technical bottlenecks and scenario prompts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {companyResult.modelUsed && (
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                    <span className="font-semibold text-emerald-700">{companyResult.modelUsed}</span>
                    <span className="font-mono">{companyResult.latencyMs}ms</span>
                  </div>
                )}

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-amber-800">
                    Problem Space
                  </div>
                  <p className="text-sm text-slate-900 mt-1.5 leading-relaxed font-medium">
                    {companyResult.actualProblemSpace}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-[#00508F] mb-2">
                    Technical Bottlenecks
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
                    Scenario Prompt
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
