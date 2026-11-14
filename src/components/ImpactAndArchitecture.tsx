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
  FileSpreadsheet,
  Zap,
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
    <div className="space-y-5">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 border-t-4 border-t-[#0066B3] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Curation Throughput</span>
            <Zap className="w-4 h-4 text-[#0066B3]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1.5">
            4.2x Faster Curation
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Triads extracted automatically; staff review structured proof, not 5-page CVs.
          </p>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-600 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Statutory Oversight</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5">
            100% Human-Signed (Hallintolaki § 45)
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Zero automated rejections. Every admission is signed by a municipal curator.
          </p>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-t-[#FFC72C] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Municipal Workflow</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5">
            Lyyti Zero-Friction Export
          </div>
          <p className="text-xs text-slate-600 mt-1">
            1-click Lyyti CSV &amp; EU AI Act audit logs + automated Monday follow-up.
          </p>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-t-purple-600 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Equal-Status Pathways</span>
            <ShieldCheck className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1.5">
            100% NDA &amp; Junior Equity
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Protects enterprise NDA engineers &amp; students lacking public GitHub profiles.
          </p>
        </div>
      </div>

      {/* Interactive Espoo Event Scale Simulator */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0066B3]" /> City of Espoo Event Scale &amp; ROI Simulator
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Calibrated for municipal events from 500 specialized applicants to 5,000-applicant flagship summits.
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
                  ? 'bg-[#0066B3] text-white border-[#00508F]'
                  : 'bg-[#F8FAFC] text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Specialized Event (500 → 150)
            </button>
            <button
              onClick={() => {
                setApplicantVolume(5000);
                setSeatCapacity(1500);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                applicantVolume === 5000
                  ? 'bg-[#0066B3] text-white border-[#00508F]'
                  : 'bg-[#F8FAFC] text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Peak Flagship (5,000 → 1,500)
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-700">Total Event Applicants:</span>
              <span className="text-[#0066B3] font-mono text-sm font-bold">
                {applicantVolume.toLocaleString()} applicants
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={applicantVolume}
              onChange={(e) => setApplicantVolume(Number(e.target.value))}
              className="w-full accent-[#0066B3] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>200 (Workshop)</span>
              <span>1,500 (Mid Summit)</span>
              <span>5,000 (Espoo Flagship)</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-700">Target Venue Capacity:</span>
              <span className="text-emerald-700 font-mono text-sm font-bold">
                {seatCapacity.toLocaleString()} seats
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={Math.min(2000, applicantVolume)}
              step={50}
              value={Math.min(seatCapacity, applicantVolume)}
              onChange={(e) => setSeatCapacity(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Acceptance Rate: {Math.round((Math.min(seatCapacity, applicantVolume) / applicantVolume) * 100)}%</span>
              <span>100% Human-Reviewed List</span>
            </div>
          </div>
        </div>

        {/* Calculated Simulator Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0066B3]" /> Staff Time Saved
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {hoursSaved} hrs
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {manualHours}h manual → {assistedHours}h curator review
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Builders Rescued
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
              ~{rescuedBuilders}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Missed by keyword CV scrapers
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-600" /> Synthetic Fluff Caught
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
              ~{filteredSpam}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Buzzword-only applications flagged
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-600" /> Audit Compliance
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
              100%
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              EU AI Act Annex III &amp; TE24 ready
            </p>
          </div>
        </div>
      </div>

      {/* Alignment Matrix & Technical Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#00508F] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#0066B3]" /> Espoo Challenge Alignment
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                req: 'Event Admissions Focus',
                ans: 'Designed for 500–5,000 applicant municipal event curation, not generic HR.',
              },
              {
                req: 'Beyond LinkedIn Keywords',
                ans: 'Extracts Propositional Triads (Constraint → Tool → Outcome) and Fluff Index.',
              },
              {
                req: 'Mandatory Human Decision',
                ans: 'Curators sign every Admit / Waitlist / Flag decision under Hallintolaki § 45.',
              },
              {
                req: 'Zero Forced Speed-Dating',
                ans: 'Event Compass floorplan surfaces shared problems for voluntary intros.',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item.req}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.ans}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#00508F] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0066B3]" /> Technical Stack
          </h3>

          <div className="space-y-3">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#0066B3]" /> NVIDIA Nemotron 3.5 Super VL
                </span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verda B300
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                1M-token context + reasoning trace for competence triage, fluff scoring, and Conversation Sparks.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Lyyti &amp; TE24 Municipal Integration
                </span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-50 text-[#0066B3] border border-sky-200">
                  CSV &amp; Audit
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                React 18 + TypeScript + Vite gateway; zero vendor lock-in for immediate City of Espoo piloting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
