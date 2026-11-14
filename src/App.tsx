import React, { useState } from 'react';
import {
  Compass,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Orbit,
} from 'lucide-react';
import initialApplicantsData from '../data/applicants_sample.json';
import initialCompaniesData from '../data/companies_sample.json';
import eventProfilesData from '../data/event_profiles.json';
import { Applicant, ApplicantStatus, CompanyNode, EventProfile } from './types';
import { CuratorCockpit } from './components/CuratorCockpit';
import { EventCompass } from './components/EventCompass';
import { LiveIntakeSimulator } from './components/LiveIntakeSimulator';
import { ImpactAndArchitecture } from './components/ImpactAndArchitecture';
import { EspooMetaverse } from './components/EspooMetaverse';

export function App() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'metaverse' | 'compass' | 'intake' | 'impact'>('cockpit');
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
              reviewedBy: 'Marika & Melissa · Espoo Talent Hub',
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
      {/* Calm Official City of Espoo Civic Ribbon */}
      <div className="bg-[#00508F] text-white text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-bold tracking-tight">
              <span className="w-2 h-2 rounded-full bg-[#FFC72C]" />
              Espoo · Esbo
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/90 font-medium">
              Espoo Talent Hub · Business Espoo · Työllisyys- ja elinkeinopalvelut
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/90 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            Nemotron B300 &amp; Gemini 3 Live
          </span>
        </div>
      </div>

      {/* Main Municipal Header & Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Brand Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0066B3] flex items-center justify-center shadow-sm shrink-0">
              <Compass className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Espoo <span className="text-[#0066B3]">EventCompass</span>
              </h1>
              <p className="text-xs text-slate-500">
                Espoo TalentMatch: DeepTech &amp; IT 2026 · Dipoli, Otaniemi (Hybrid) · TE24 &amp; Tavata.fi Ready
              </p>
            </div>
          </div>

          {/* Right Event Selector */}
          <div className="flex items-center">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              aria-label="Select City of Espoo Event"
              className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} · {ev.applicantCount} applicants → {ev.venueCapacity} seats
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-slate-100">
          <nav className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'cockpit'
                  ? 'border-[#0066B3] text-[#0066B3]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              1. Curator Cockpit
            </button>

            <button
              onClick={() => setActiveTab('metaverse')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'metaverse'
                  ? 'border-[#0066B3] text-[#0066B3]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Orbit className="w-4 h-4 text-sky-500" />
              2. 3D Semantic Gravity (Espoo Simulation)
            </button>

            <button
              onClick={() => setActiveTab('compass')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'compass'
                  ? 'border-[#0066B3] text-[#0066B3]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              3. Event Compass Radar
            </button>

            <button
              onClick={() => setActiveTab('intake')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'intake'
                  ? 'border-[#0066B3] text-[#0066B3]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              4. Live Intake Simulator
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'impact'
                  ? 'border-[#0066B3] text-[#0066B3]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              5. Impact &amp; Architecture
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'cockpit' && (
          <CuratorCockpit
            applicants={applicants}
            selectedEvent={selectedEvent}
            onUpdateDecision={handleUpdateDecision}
            onUpdateApplicantReasoning={handleUpdateApplicantReasoning}
            onOpenInMetaverse={() => setActiveTab('metaverse')}
          />
        )}

        {activeTab === 'metaverse' && (
          <EspooMetaverse applicants={applicants} companies={companies} />
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
            Powered by <strong className="text-slate-700">NVIDIA Nemotron 3.5 Super VL (B300)</strong>, <strong className="text-slate-700">Google DeepMind Gemini 3</strong> &amp; <strong className="text-slate-700">Tavata.fi / TE24 Matchmaking Schema</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
export default App;
