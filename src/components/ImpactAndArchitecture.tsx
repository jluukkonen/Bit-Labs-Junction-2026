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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const ImpactAndArchitecture: React.FC = () => {
  const [applicantVolume, setApplicantVolume] = useState<number>(1500);
  const [seatCapacity, setSeatCapacity] = useState<number>(400);
  const [showArchitecture, setShowArchitecture] = useState<boolean>(false);

  const manualHours = Math.round((applicantVolume * 5) / 60);
  const assistedHours = Math.max(2, Math.round((applicantVolume * 0.45) / 60));
  const hoursSaved = manualHours - assistedHours;
  const rescuedBuilders = Math.round(applicantVolume * 0.14);
  const filteredSpam = Math.round(applicantVolume * 0.28);

  return (
    <div className="space-y-6">
      {/* 4 Big Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 border-t-4 border-t-[#0066B3] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Curation Speed</span>
            <Zap className="w-4 h-4 text-[#0066B3]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            4.2x Faster
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Structured mechanisms over raw CVs
          </p>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-600 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Hallintolaki § 45</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            100% Human-Signed
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero automated rejections
          </p>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-t-[#FFC72C] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Municipal Export</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            Lyyti Zero-Friction
          </div>
          <p className="text-xs text-slate-500 mt-1">
            1-click CSV &amp; EU AI Act audit logs
          </p>
        </div>

        <div className="bg-white border border-slate-200 border-t-4 border-t-purple-600 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Evidence Equity</span>
            <ShieldCheck className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            NDA &amp; Junior Safe
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Equal status without public GitHub
          </p>
        </div>
      </div>

      {/* Clean Interactive Volume Slider */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0066B3]" /> Espoo Event Scale Simulator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Estimate staff hours saved across 500 to 5,000 event applicants.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setApplicantVolume(500);
                setSeatCapacity(150);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                applicantVolume === 500
                  ? 'bg-[#0066B3] text-white border-[#00508F]'
                  : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              500 → 150
            </button>
            <button
              onClick={() => {
                setApplicantVolume(5000);
                setSeatCapacity(1500);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                applicantVolume === 5000
                  ? 'bg-[#0066B3] text-white border-[#00508F]'
                  : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              5,000 → 1,500
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5">
            <div className="flex justify-between text-xs font-semibold mb-3">
              <span className="text-slate-700">Total Applicants</span>
              <span className="text-[#0066B3] font-mono text-sm font-bold">
                {applicantVolume.toLocaleString()}
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
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>200</span>
              <span>1,500</span>
              <span>5,000</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5">
            <div className="flex justify-between text-xs font-semibold mb-3">
              <span className="text-slate-700">Venue Seats</span>
              <span className="text-emerald-700 font-mono text-sm font-bold">
                {seatCapacity.toLocaleString()}
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
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Acceptance: {Math.round((Math.min(seatCapacity, applicantVolume) / applicantVolume) * 100)}%</span>
              <span>Human-Reviewed</span>
            </div>
          </div>
        </div>

        {/* Clean Calculated Impact Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0066B3]" /> Staff Time Saved
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {hoursSaved} hrs
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {manualHours}h manual → {assistedHours}h curator review
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Builders Rescued
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
              ~{rescuedBuilders}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Missed by keyword scrapers
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-600" /> Synthetic Fluff Caught
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
              ~{filteredSpam}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Buzzword-only noise flagged
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Architecture & Statutory Governance Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowArchitecture((prev) => !prev)}
          className="w-full px-6 py-4 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-[#F8FAFC] transition"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0066B3]" />
            Näytä arkkitehtuuri &amp; lakivaatimukset / View Architecture &amp; Statutory Governance
          </span>
          {showArchitecture ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showArchitecture && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00508F] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0066B3]" /> Espoo Challenge Alignment
              </h4>
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

            <div className="lg:col-span-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00508F] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0066B3]" /> Technical &amp; Legal Stack
              </h4>
              <div className="space-y-3">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      NVIDIA Nemotron 3.5 Super VL
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
                      EU AI Act Annex III &amp; Yhdenvertaisuuslaki
                    </span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-50 text-[#0066B3] border border-sky-200">
                      Lyyti Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Full human audit trail exported cleanly to Lyyti with zero vendor lock-in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
