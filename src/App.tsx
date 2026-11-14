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
  Sliders,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Municipal & Tech Header */}
      <header className="border-b border-slate-800/90 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <Compass className="w-6 h-6 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  ESPOO <span className="text-sky-400">EVENTCOMPASS</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  City of Espoo Challenge
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authentic Competence Curation, Human-in-the-Loop Admissions & Organic Event Discovery
              </p>
            </div>
          </div>

          {/* Right Event Selector & Live Model Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-semibold">Nemotron 3.5 Super VL</span>
              <span className="text-emerald-400/80 font-mono">(B300 Live)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/50 border border-sky-500/30 text-[11px] text-sky-300">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="font-semibold">Human-in-the-Loop Gate</span>
            </div>

            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  Event: {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Bar: Active Event Context & Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-1 flex flex-col md:flex-row md:items-center justify-between gap-2 border-t border-slate-900">
          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'cockpit'
                  ? 'border-sky-400 text-sky-300 bg-sky-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              1. Curator’s Cockpit (Pre-Event Triage)
            </button>

            <button
              onClick={() => setActiveTab('compass')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'compass'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              2. The Event Compass (On-Site Discovery)
            </button>

            <button
              onClick={() => setActiveTab('intake')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'intake'
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              3. Live AI Intake & De-Jargonizer
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'impact'
                  ? 'border-purple-400 text-purple-300 bg-purple-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              4. Espoo Scale Simulator & Governance
            </button>
          </nav>

          {/* Event Quick Metadata */}
          <div className="hidden xl:flex items-center gap-4 text-[11px] text-slate-400 py-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {selectedEvent.date}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Capacity: {selectedEvent.venueCapacity} seats ({selectedEvent.applicantCount} applicants)
            </span>
          </div>
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
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Espoo EventCompass</strong> · Built by Team Bit-Labs for Junction 2026 (City of Espoo “Rethinking Recruitment” Challenge)
          </span>
          <span className="text-slate-400">
            Powered by <strong>NVIDIA Nemotron 3.5 Super VL (1M Context · B300 Cluster)</strong> &amp; <strong>Google DeepMind Gemini</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
export default App;
