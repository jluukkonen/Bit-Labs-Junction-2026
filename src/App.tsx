import React, { useState } from 'react';
import {
  Compass,
  ShieldCheck,
  Cpu,
  Sparkles,
  Calendar,
  MapPin,
  BarChart3,
  UserCheck,
  Sun,
} from 'lucide-react';
import initialApplicantsData from '../data/applicants_sample.json';
import initialCompaniesData from '../data/companies_sample.json';
import eventProfilesData from '../data/event_profiles.json';
import { Applicant, ApplicantStatus, CompanyNode, EventProfile } from './types';
import { CuratorCockpit } from './components/CuratorCockpit';
import { EventCompass } from './components/EventCompass';
import { LiveIntakeSimulator } from './components/LiveIntakeSimulator';
import { ImpactAndArchitecture } from './components/ImpactAndArchitecture';

export function App() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'compass' | 'intake' | 'impact'>('cockpit');
  const [events] = useState<EventProfile[]>(eventProfilesData as EventProfile[]);
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0].id);
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicantsData as Applicant[]);
  const [companies] = useState<CompanyNode[]>(initialCompaniesData as CompanyNode[]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleUpdateDecision = (
    applicantId: string,
    newStatus: ApplicantStatus,
    note: string
  ) => {
    const now = new Date();
    const timeStr = `2026-11-14 ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    setApplicants((prev) =>
      prev.map((app) =>
        app.id === applicantId
          ? {
              ...app,
              status: newStatus,
              reviewedBy: 'Marika / City of Espoo Curator',
              reviewedAt: timeStr,
              humanReviewerNote: note,
            }
          : app
      )
    );
  };

  const handleUpdateApplicantReasoning = (
    applicantId: string,
    competenceScore: number,
    fluffIndex: number,
    reasoning: string
  ) => {
    setApplicants((prev) =>
      prev.map((app) =>
        app.id === applicantId
          ? {
              ...app,
              competenceScore,
              fluffIndex,
              nemotronReasoning: reasoning,
            }
          : app
      )
    );
  };

  const handleAddApplicantToQueue = (newApplicant: Applicant) => {
    setApplicants((prev) => [newApplicant, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Official City of Espoo Top Civic Bar */}
      <div className="bg-[#00508F] text-white text-xs py-1.5 px-4 sm:px-6 border-b border-[#003E70]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-bold tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC72C] ring-2 ring-[#FFC72C]/30" />
              Espoo · Esbo
            </span>
            <span className="text-white/40">|</span>
            <span className="px-2 py-0.5 rounded bg-white/15 text-white font-medium text-[11px] border border-white/20">
              Business Espoo | Työllisyys- ja elinkeinopalvelut
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[11px] text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <Cpu className="w-3 h-3 text-[#FFC72C]" />
              <span className="font-medium">Nemotron 3.5 Super VL · B300 Live</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[11px] text-white">
              <UserCheck className="w-3 h-3 text-[#FFC72C]" />
              <span>Hallintolaki § 45 Human-in-the-Loop</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFC72C]/20 border border-[#FFC72C]/40 text-[11px] font-medium text-[#FFC72C]">
              <Sun className="w-3 h-3" />
              Civic Light (WCAG AA)
            </span>
          </div>
        </div>
      </div>

      {/* Main Municipal Header & Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0066B3] flex items-center justify-center shadow-sm ring-2 ring-[#FFC72C]/60 shrink-0">
              <Compass className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Espoo <span className="text-[#0066B3]">EventCompass</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                  Junction 2026
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                EventCompass: Osaamispohjainen Tapahtumakuratori · TE24-valmis &amp; Lyyti-yhteensopiva
              </p>
            </div>
          </div>

          {/* Right Event Selector & Metadata */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden xl:flex items-center gap-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#0066B3]" />
                {selectedEvent.date}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                {selectedEvent.venueCapacity} seats · {selectedEvent.applicantCount} applicants
              </span>
            </div>

            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              aria-label="Select City of Espoo Event"
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0066B3] focus:ring-2 focus:ring-[#0066B3]/15"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  Event: {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-slate-100">
          <nav className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'cockpit'
                  ? 'border-[#0066B3] text-[#0066B3] bg-[#0066B3]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              1. Curator Cockpit
            </button>

            <button
              onClick={() => setActiveTab('compass')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'compass'
                  ? 'border-[#0066B3] text-[#0066B3] bg-[#0066B3]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4" />
              2. Event Compass Radar
            </button>

            <button
              onClick={() => setActiveTab('intake')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'intake'
                  ? 'border-[#0066B3] text-[#0066B3] bg-[#0066B3]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              3. Live Intake Simulator
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'impact'
                  ? 'border-[#0066B3] text-[#0066B3] bg-[#0066B3]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              4. Impact &amp; Architecture
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'cockpit' && (
          <CuratorCockpit
            applicants={applicants}
            selectedEvent={selectedEvent}
            onUpdateDecision={handleUpdateDecision}
            onUpdateApplicantReasoning={handleUpdateApplicantReasoning}
          />
        )}

        {activeTab === 'compass' && (
          <EventCompass applicants={applicants} companies={companies} />
        )}

        {activeTab === 'intake' && (
          <LiveIntakeSimulator onAddApplicantToQueue={handleAddApplicantToQueue} />
        )}

        {activeTab === 'impact' && <ImpactAndArchitecture />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong className="text-slate-900">Espoo · Esbo EventCompass</strong> · Business Espoo | Työllisyys- ja elinkeinopalvelut · Junction 2026
          </span>
          <span className="text-slate-500">
            Powered by <strong className="text-slate-700">NVIDIA Nemotron 3.5 Super VL (B300)</strong> &amp; <strong className="text-slate-700">Lyyti / TE24 Architecture</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
export default App;
