import React, { useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  Scale,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react';

export const ImpactAndArchitecture: React.FC = () => {
  const [applicantVolume, setApplicantVolume] = useState<number>(1500);
  const [seatCapacity, setSeatCapacity] = useState<number>(400);

  const manualHours = Math.round((applicantVolume * 5) / 60);
  const assistedHours = Math.max(2, Math.round((applicantVolume * 0.45) / 60));
  const hoursSaved = manualHours - assistedHours;
  const rescuedBuilders = Math.round(applicantVolume * 0.14);
  const filteredSpam = Math.round(applicantVolume * 0.28);

  return (
    <div className="space-y-6">
      {/* Interactive Espoo Event Scale Simulator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> City of Espoo Event Scale & ROI Simulator (500 to 5,000 Applicants)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calibrated directly on Espoo mentor ground truth: recent specialized events (~500 applicants) to flagship peak events (5,000 applicants → 1,500 seats).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setApplicantVolume(500);
                setSeatCapacity(150);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                applicantVolume === 500
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Recent Event (500 → 150)
            </button>
            <button
              onClick={() => {
                setApplicantVolume(5000);
                setSeatCapacity(1500);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                applicantVolume === 5000
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Peak Flagship (5,000 → 1,500)
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-300">Total Event Applicants:</span>
              <span className="text-sky-400 font-mono text-sm">{applicantVolume.toLocaleString()} applicants</span>
            </div>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={applicantVolume}
              onChange={(e) => setApplicantVolume(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>200 (Niche Workshop)</span>
              <span>1,500 (Mid Summit)</span>
              <span>5,000 (Peak Espoo Flagship)</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-300">Target Venue Capacity (Admitted Tickets):</span>
              <span className="text-emerald-400 font-mono text-sm">{seatCapacity.toLocaleString()} seats</span>
            </div>
            <input
              type="range"
              min={50}
              max={Math.min(2000, applicantVolume)}
              step={50}
              value={Math.min(seatCapacity, applicantVolume)}
              onChange={(e) => setSeatCapacity(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Acceptance Rate: {Math.round((Math.min(seatCapacity, applicantVolume) / applicantVolume) * 100)}%</span>
              <span>100% Human-Reviewed Final List</span>
            </div>
          </div>
        </div>

        {/* Calculated Impact Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" /> Staff Triage Time Saved
            </div>
            <div className="text-2xl font-bold text-white mt-1.5 font-mono">
              {hoursSaved} hrs saved
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Down from {manualHours}h manual CV reading to {assistedHours}h focused human sign-off.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Quiet Builders Rescued
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1.5 font-mono">
              ~{rescuedBuilders} talent
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              High-competence international builders missed by LinkedIn keyword scrapers.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-400" /> Synthetic Fluff Caught
            </div>
            <div className="text-2xl font-bold text-rose-300 mt-1.5 font-mono">
              ~{filteredSpam} flagged
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              AI-generated buzzword resumes prevented from taking scarce event tickets.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" /> EU AI Act Governance
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1.5 font-mono">
              100% Audited
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Zero automated black-box rejections. Every final decision has a human sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* Ground-Truth Alignment Matrix & Technical Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-300 flex items-center gap-2">
            <Award className="w-4 h-4" /> Direct Alignment with City of Espoo Mentor Requirements
          </h3>

          <div className="space-y-3">
            {[
              {
                req: '1. “Not generic recruitment—we need Event Admissions & Competence Filtering”',
                ans: 'Built specifically as an Event Admissions & On-Site Experience Platform handling 500 to 5,000 event applicants.',
              },
              {
                req: '2. “Current AI just reads LinkedIn URLs and matches keywords—we want a wiser solution”',
                ans: 'Replaces LinkedIn keyword matching with concrete Micro-Scenarios and Verified Build Artifacts, exposing a live Fluff Index.',
              },
              {
                req: '3. “A human MUST be the final reviewer and verifier”',
                ans: 'The Curator’s Cockpit places municipal staff in full command with 1-click Approve / Waitlist / Flag buttons and full reasoning transparency.',
              },
              {
                req: '4. “Cover before and during the event, without shoehorning forced 1-on-1 meetings”',
                ans: 'The Event Compass provides an exploratory problem-space radar with Conversation Sparks so attendees connect organically on their own terms.',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item.req}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 pl-6">{item.ans}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Technical Stack & Partner Integrations
          </h3>

          <div className="space-y-3">
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" /> NVIDIA Nemotron 3.5 Super VL
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                  Verda B300 Cluster
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                1,048,576-token context window + native <code className="text-emerald-300">reasoning</code> chain-of-thought output. Powers multi-artifact competence triage, buzzword entropy scoring, and live Conversation Spark synthesis.
              </p>
            </div>

            <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300">
                  Google DeepMind / Gemini Multimodal Architecture
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">
                  Structured Schema
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                Structured JSON extraction for two-sided intake (de-jargonizing corporate HR job descriptions into testable engineering bottlenecks).
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs font-bold text-white">
                Frontend & Deployment Readiness
              </div>
              <p className="text-xs text-slate-300 mt-1.5">
                React 18, TypeScript, Vite proxy gateway, Tailwind CSS. Zero external database lock-in; ready to pilot at upcoming City of Espoo tech & matchmaking events.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
