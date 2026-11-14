import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Sparkles,
  ExternalLink,
  Search,
  Cpu,
  FileCode2,
  RefreshCw,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { Applicant, ApplicantStatus, EventProfile } from '../types';
import { runLiveNemotronTriage } from '../services/nemotronService';

interface CuratorCockpitProps {
  applicants: Applicant[];
  selectedEvent: EventProfile;
  onUpdateDecision: (
    applicantId: string,
    newStatus: ApplicantStatus,
    note: string
  ) => void;
  onUpdateApplicantReasoning: (
    applicantId: string,
    competenceScore: number,
    fluffIndex: number,
    reasoning: string
  ) => void;
}

export const CuratorCockpit: React.FC<CuratorCockpitProps> = ({
  applicants,
  onUpdateDecision,
  onUpdateApplicantReasoning,
}) => {
  const [selectedId, setSelectedId] = useState<string>(applicants[0]?.id || 'app-01');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rankingMode, setRankingMode] = useState<'evidence_balance' | 'legacy_keyword_ai'>('evidence_balance');
  const [reviewerNoteInput, setReviewerNoteInput] = useState<string>('');
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [liveBadgeInfo, setLiveBadgeInfo] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showFullAudit, setShowFullAudit] = useState<boolean>(false);

  const filteredApplicants = useMemo(() => {
    return applicants
      .filter((app) => {
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            app.name.toLowerCase().includes(q) ||
            app.role.toLowerCase().includes(q) ||
            app.origin.toLowerCase().includes(q) ||
            (app.evidenceCategory || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (rankingMode === 'legacy_keyword_ai') {
          return b.legacyLinkedInScore - a.legacyLinkedInScore;
        }
        return b.competenceScore - a.competenceScore;
      });
  }, [applicants, statusFilter, searchQuery, rankingMode]);

  const activeApplicant = useMemo(
    () => applicants.find((a) => a.id === selectedId) || filteredApplicants[0] || applicants[0],
    [applicants, selectedId, filteredApplicants]
  );

  const handleSelectApplicant = (app: Applicant) => {
    setSelectedId(app.id);
    setReviewerNoteInput(app.humanReviewerNote || '');
    setLiveBadgeInfo(null);
    setShowFullAudit(false);
  };

  const handleLiveReanalyze = async () => {
    if (!activeApplicant) return;
    setIsReanalyzing(true);
    setLiveBadgeInfo(null);
    try {
      const result = await runLiveNemotronTriage({
        name: activeApplicant.name,
        role: activeApplicant.role,
        linkedInClaim: activeApplicant.linkedInSummaryClaim,
        scenarioAnswer: activeApplicant.scenarioAnswer,
        artifactText: activeApplicant.verifiedArtifacts
          .map((art) => `${art.title} (${art.type}): ${art.verificationNote}`)
          .join(' | '),
      });
      onUpdateApplicantReasoning(
        activeApplicant.id,
        result.competenceScore,
        result.fluffIndex,
        `[NVIDIA NEMOTRON 3.5 B300 AUDIT · ${result.latencyMs}ms]\n${result.reasoningTrace}\n\nEvidence Summary: ${result.summaryVerdict}`
      );
      setLiveBadgeInfo(`${result.modelUsed} · ${result.latencyMs}ms`);
      setShowFullAudit(true);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            Admitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            In Review
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
            Waitlisted
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            Flagged
          </span>
        );
    }
  };

  const getEvidencePill = (cat: string) => {
    const safeCat = cat || '';
    if (safeCat.includes('NDA')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Lock className="w-3.5 h-3.5" /> Confidential NDA Vignette
        </span>
      );
    }
    if (safeCat.includes('Junior') || safeCat.includes('Student')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Sparkles className="w-3.5 h-3.5" /> Applied Reasoning (Junior)
        </span>
      );
    }
    if (safeCat.includes('Research')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <FileText className="w-3.5 h-3.5" /> Research Publication
        </span>
      );
    }
    if (safeCat.includes('Public')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FileCode2 className="w-3.5 h-3.5" /> Verified Public Code
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5" /> Self-Reported Only
      </span>
    );
  };

  const filterLabels: Record<'all' | ApplicantStatus, string> = {
    all: `All (${applicants.length})`,
    pending: 'In Review',
    approved: 'Admitted',
    waitlisted: 'Waitlisted',
    flagged: 'Flagged',
  };

  return (
    <div className="space-y-6">
      {/* Calm Filter & Lyyti Export Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'pending', 'approved', 'waitlisted', 'flagged'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-[#0066B3] text-white shadow-sm'
                  : 'bg-[#F8FAFC] text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {filterLabels[st]}
            </button>
          ))}

          <div className="relative ml-0 sm:ml-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicants..."
              className="bg-[#F8FAFC] border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066B3] focus:bg-white w-48 sm:w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {rankingMode === 'legacy_keyword_ai' && (
            <button
              onClick={() => setRankingMode('evidence_balance')}
              className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
            >
              Naive LinkedIn Sort Active · Reset
            </button>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#00508F] text-white text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Lyyti CSV &amp; EU AI Act Audit Log
          </button>
        </div>
      </div>

      {/* Main Split-Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Minimal Applicant List Sidebar */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
            <span className="text-xs font-bold text-slate-700">
              Applicants ({filteredApplicants.length})
            </span>
            <span className="text-[11px] text-slate-500">
              {rankingMode === 'evidence_balance' ? 'Evidence order' : 'LinkedIn score order'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[660px] overflow-y-auto">
            {filteredApplicants.map((app) => {
              const isSelected = activeApplicant?.id === app.id;

              return (
                <button
                  key={app.id}
                  onClick={() => handleSelectApplicant(app)}
                  className={`w-full text-left px-4 py-3.5 transition flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-[#0066B3]/5 border-l-4 border-l-[#0066B3]'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-[#0066B3] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {app.avatarInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">{app.name}</h4>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{app.role}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calm, 5-Second Scannable Applicant Inspector */}
        {activeApplicant && (
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            {/* 1. Header: Name, Role, Origin & 1 Clean Evidence Pill */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {activeApplicant.name}
                </h2>
                <p className="text-sm font-medium text-slate-700">{activeApplicant.role}</p>
                <p className="text-xs text-slate-500">{activeApplicant.origin}</p>
              </div>

              <div className="shrink-0">
                {getEvidencePill(activeApplicant.evidenceCategory)}
              </div>
            </div>

            {/* 2. Key Mechanism (1-2 sentences max) */}
            <div className="bg-[#F8FAFC] border border-slate-200 border-l-4 border-l-[#0066B3] rounded-xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#00508F] mb-2">
                Key Mechanism · Constraint → Tool → Outcome
              </div>
              <p className="text-base font-medium text-slate-900 leading-relaxed">
                {activeApplicant.demonstratedMechanism}
              </p>
            </div>

            {/* 3. Human Curator Action Bar */}
            <div className="space-y-3 pt-1">
              <input
                type="text"
                value={reviewerNoteInput}
                onChange={(e) => setReviewerNoteInput(e.target.value)}
                placeholder="Curator note (Hallintolaki § 45)..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066B3] focus:bg-white transition"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() =>
                    onUpdateDecision(
                      activeApplicant.id,
                      'approved',
                      reviewerNoteInput || 'Verified demonstrated problem-solving mechanism.'
                    )
                  }
                  className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                    activeApplicant.status === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Hyväksy tapahtumaan / Admit</span>
                </button>

                <button
                  onClick={() =>
                    onUpdateDecision(
                      activeApplicant.id,
                      'waitlisted',
                      reviewerNoteInput || 'Placed on cluster capacity waitlist.'
                    )
                  }
                  className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                    activeApplicant.status === 'waitlisted'
                      ? 'bg-[#0066B3] text-white border-[#00508F] shadow-sm'
                      : 'bg-sky-50 text-[#0066B3] border-sky-200 hover:bg-[#0066B3] hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Aseta jonoon / Waitlist</span>
                </button>

                <button
                  onClick={() =>
                    onUpdateDecision(
                      activeApplicant.id,
                      'flagged',
                      reviewerNoteInput || 'Insufficient verifiable technical or operational evidence.'
                    )
                  }
                  className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                    activeApplicant.status === 'flagged'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white'
                  }`}
                >
                  <Flag className="w-4 h-4 shrink-0" />
                  <span>Pyydä lisätietoja / Flag</span>
                </button>
              </div>

              {activeApplicant.reviewedBy && (
                <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span>
                    Signed by <strong className="text-slate-900">{activeApplicant.reviewedBy}</strong> ·{' '}
                    {activeApplicant.reviewedAt}
                  </span>
                  {activeApplicant.humanReviewerNote && (
                    <span className="italic text-[#0066B3]">“{activeApplicant.humanReviewerNote}”</span>
                  )}
                </div>
              )}
            </div>

            {/* 4. Progressive Disclosure Drawer: Full Evidence & AI Audit */}
            <div className="border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowFullAudit((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition"
              >
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#0066B3]" />
                  Näytä täysi aineisto &amp; AI-todistusketju / View Full Evidence &amp; AI Audit
                </span>
                {showFullAudit ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {showFullAudit && (
                <div className="mt-4 space-y-5 pt-2">
                  {/* Submitted Proof of Work */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Submitted Proof of Work
                    </h4>
                    {activeApplicant.verifiedArtifacts.map((art, i) => (
                      <div
                        key={i}
                        className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{art.title}</span>
                            <span className="px-2 py-0.5 rounded text-[11px] bg-white text-slate-600 border border-slate-200">
                              {art.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{art.verificationNote}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${
                              art.authenticityScore >= 75
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            Integrity: {art.authenticityScore}%
                          </span>
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#0066B3] transition"
                            title="Inspect Evidence Source"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Full Scenario Answer */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Full Scenario Answer
                    </h4>
                    <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                      “{activeApplicant.scenarioAnswer}”
                    </div>
                  </div>

                  {/* LinkedIn Keyword Comparison */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        LinkedIn Keyword Scraper Comparison
                      </h4>
                      <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                        <button
                          onClick={() => setRankingMode('evidence_balance')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                            rankingMode === 'evidence_balance'
                              ? 'bg-[#0066B3] text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" /> Evidence Sort
                        </button>
                        <button
                          onClick={() => setRankingMode('legacy_keyword_ai')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                            rankingMode === 'legacy_keyword_ai'
                              ? 'bg-rose-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <SlidersHorizontal className="w-3 h-3" /> Naive LinkedIn Sort
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <p className="text-xs text-slate-600">{activeApplicant.linkedInSummaryClaim}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                          Evidence Score: <strong className="text-emerald-700">{activeApplicant.competenceScore}/100</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                          Naive LinkedIn Score: <strong className="text-slate-900">{activeApplicant.legacyLinkedInScore}%</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                          AI Fluff Index: <strong className={activeApplicant.fluffIndex > 50 ? 'text-rose-700' : 'text-[#0066B3]'}>{activeApplicant.fluffIndex}%</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* NVIDIA Nemotron 3.5 B300 Raw Audit Trace */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        NVIDIA Nemotron 3.5 B300 Raw Audit Trace
                      </h4>
                      <div className="flex items-center gap-2">
                        {liveBadgeInfo && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {liveBadgeInfo}
                          </span>
                        )}
                        <button
                          onClick={handleLiveReanalyze}
                          disabled={isReanalyzing}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[#0066B3] border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
                          {isReanalyzing ? 'Querying B300...' : 'Re-Run Live Evidence Synthesis'}
                        </button>
                      </div>
                    </div>

                    <pre className="text-xs font-mono text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                      {activeApplicant.nemotronReasoning}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Lyyti CSV & EU AI Act Audit Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0066B3]" />
                <h3 className="text-base font-bold text-slate-900">
                  Lyyti CSV Export &amp; EU AI Act Compliance Certificate
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-500 hover:text-slate-900 text-sm font-semibold px-2 py-1 rounded hover:bg-slate-100"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                This export produces a clean CSV compatible with <strong>Lyyti</strong> (the official municipal event management software used across Finland), containing human curator approval IDs and full administrative audit logs under Finnish <em>Hallintolaki</em> § 45:
              </p>

              <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1 text-slate-700 overflow-x-auto">
                <div className="text-[#0066B3] font-semibold"># ESP_EVENT_AUDIT_LOG_2026-11-14.csv</div>
                <div>id,name,email,cluster,evidence_type,human_decision,curator_id,timestamp,julkisuus_status</div>
                <div>app-01,Priya Nair,p.nair@example.fi,Edge AI,Verified Public Code,APPROVED,MARIKA_K,2026-11-13 19:40,PUBLIC</div>
                <div>app-03,Dr. Lukas Lindqvist,l.lindqvist@vtt.fi,Quantum,Research Publication,APPROVED,MARIKA_K,2026-11-13 20:05,PUBLIC</div>
                <div>app-04,Mateo Rojas,m.rojas@example.fi,CleanTech,Confidential NDA Vignette,APPROVED,MELISSA_L,2026-11-14 09:15,CONFIDENTIAL_TRADE_SECRET</div>
                <div>app-10,Noora Lindström,n.lindstrom@aalto.fi,CleanTech,Applied Reasoning (Junior),APPROVED,MELISSA_L,2026-11-13 20:45,PUBLIC</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block">EU AI Act (Annex III 4a):</span>
                  <span>100% meaningful human oversight logged. Zero automated rejections.</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block">Yhdenvertaisuuslaki:</span>
                  <span>No-artifact &amp; NDA cohorts protected by alternative evidence equality.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg bg-[#0066B3] hover:bg-[#00508F] text-white font-bold text-xs transition shadow-sm"
              >
                Download Lyyti Verified CSV &amp; Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
