import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Sparkles,
  ExternalLink,
  Search,
  SlidersHorizontal,
  UserCheck,
  Cpu,
  FileCode2,
  RefreshCw,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Applicant, ApplicantStatus, ClusterName, EventProfile } from '../types';
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
  selectedEvent,
  onUpdateDecision,
  onUpdateApplicantReasoning,
}) => {
  const [selectedId, setSelectedId] = useState<string>(applicants[0]?.id || 'app-01');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rankingMode, setRankingMode] = useState<'evidence_balance' | 'legacy_keyword_ai'>('evidence_balance');
  const [reviewerNoteInput, setReviewerNoteInput] = useState<string>('');
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [liveBadgeInfo, setLiveBadgeInfo] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showTraceDrawer, setShowTraceDrawer] = useState<boolean>(false);

  const filteredApplicants = useMemo(() => {
    return applicants
      .filter((app) => {
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        if (clusterFilter !== 'all' && app.cluster !== clusterFilter) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            app.name.toLowerCase().includes(q) ||
            app.role.toLowerCase().includes(q) ||
            app.origin.toLowerCase().includes(q) ||
            app.cluster.toLowerCase().includes(q) ||
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
  }, [applicants, statusFilter, clusterFilter, searchQuery, rankingMode]);

  const activeApplicant = useMemo(
    () => applicants.find((a) => a.id === selectedId) || filteredApplicants[0] || applicants[0],
    [applicants, selectedId, filteredApplicants]
  );

  const stats = useMemo(() => {
    const approved = applicants.filter((a) => a.status === 'approved').length;
    const pending = applicants.filter((a) => a.status === 'pending').length;
    const waitlisted = applicants.filter((a) => a.status === 'waitlisted').length;
    const flagged = applicants.filter((a) => a.status === 'flagged').length;
    const ndaVignettes = applicants.filter(
      (a) => a.evidenceCategory === 'Redacted Enterprise NDA Vignette'
    ).length;
    return { approved, pending, waitlisted, flagged, ndaVignettes };
  }, [applicants]);

  const handleSelectApplicant = (app: Applicant) => {
    setSelectedId(app.id);
    setReviewerNoteInput(app.humanReviewerNote || '');
    setLiveBadgeInfo(null);
    setShowTraceDrawer(false);
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
      setShowTraceDrawer(true);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Admitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> In Review
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3" /> Waitlisted
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Flag className="w-3 h-3" /> Flagged
          </span>
        );
    }
  };

  const getEvidencePill = (cat: string) => {
    const safeCat = cat || '';
    if (safeCat.includes('NDA')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Lock className="w-3 h-3" /> NDA Vignette
        </span>
      );
    }
    if (safeCat.includes('Junior') || safeCat.includes('Student')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Sparkles className="w-3 h-3" /> Junior Reasoning
        </span>
      );
    }
    if (safeCat.includes('Research')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <FileText className="w-3 h-3" /> Research Publication
        </span>
      );
    }
    if (safeCat.includes('Public')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FileCode2 className="w-3 h-3" /> Public Code
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3" /> Self-Reported Only
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Compact Civic KPI + Methodology + Lyyti Export Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* 4 Scannable Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-slate-200">
            <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>Human-Admitted</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{stats.approved}</span>
              <span className="text-xs text-slate-500">/ {applicants.length}</span>
            </div>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-slate-200">
            <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>In Review</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-700">{stats.pending}</span>
              <span className="text-xs text-slate-500">pending</span>
            </div>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-slate-200">
            <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>NDA Vignettes</span>
              <Lock className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-purple-700">{stats.ndaVignettes}</span>
              <span className="text-xs text-slate-500">protected</span>
            </div>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-slate-200">
            <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>Flagged</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-rose-700">{stats.flagged}</span>
              <span className="text-xs text-slate-500">unverified</span>
            </div>
          </div>
        </div>

        {/* Ranking Mode Switcher & Lyyti Export */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
            <button
              onClick={() => setRankingMode('evidence_balance')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                rankingMode === 'evidence_balance'
                  ? 'bg-[#0066B3] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Evidence Triage
            </button>
            <button
              onClick={() => setRankingMode('legacy_keyword_ai')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                rankingMode === 'legacy_keyword_ai'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Naive LinkedIn AI
            </button>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#0066B3] hover:bg-[#00508F] text-white text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Lyyti CSV &amp; EU AI Act Audit Log
          </button>
        </div>
      </div>

      {/* Warning Callout when Legacy LinkedIn Mode is active */}
      {rankingMode === 'legacy_keyword_ai' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Naive LinkedIn Scraper Mode:</strong> Keyword-stuffed profiles rank #1–#2 while verified NDA engineer <strong>Mateo Rojas (54%)</strong> and embedded builder <strong>Priya Nair (48%)</strong> drop down.
            </span>
          </div>
          <button
            onClick={() => setRankingMode('evidence_balance')}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0066B3] hover:bg-[#00508F] text-white font-semibold text-xs transition"
          >
            Restore Evidence Triage
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'pending', 'approved', 'waitlisted', 'flagged'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-[#0066B3]/10 text-[#0066B3] border border-[#0066B3]/30'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? `All (${applicants.length})` : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            aria-label="Filter by Event Cluster"
            className="bg-[#F8FAFC] border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0066B3]"
          >
            <option value="all">All Clusters</option>
            {selectedEvent.clusters.map((c: ClusterName) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, role, evidence..."
              className="bg-[#F8FAFC] border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066B3] focus:bg-white w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Main Split-Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: Crisp Inbox */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Applicant Inbox ({filteredApplicants.length})
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Sort:{' '}
              <strong className="text-[#0066B3]">
                {rankingMode === 'evidence_balance' ? 'Evidence Coverage' : 'LinkedIn Keywords'}
              </strong>
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {filteredApplicants.map((app, index) => {
              const isSelected = activeApplicant?.id === app.id;

              return (
                <button
                  key={app.id}
                  onClick={() => handleSelectApplicant(app)}
                  className={`w-full text-left px-4 py-3.5 transition flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[#0066B3]/5 border-l-4 border-l-[#0066B3]'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border ${
                      isSelected
                        ? 'bg-[#0066B3] text-white border-[#00508F]'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">{app.name}</h4>
                      {getStatusBadge(app.status)}
                    </div>

                    <p className="text-xs text-slate-700 truncate mt-0.5">{app.role}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {getEvidencePill(app.evidenceCategory)}
                      <span className="text-[11px] text-slate-500 font-medium truncate">
                        · {app.cluster}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Decluttered Dossier & Human Decision Gate */}
        {activeApplicant && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            {/* Applicant Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{activeApplicant.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {activeApplicant.cluster}
                  </span>
                </div>
                <p className="text-sm text-slate-700 font-medium mt-0.5">{activeApplicant.role}</p>
                <p className="text-xs text-slate-500 mt-0.5">{activeApplicant.origin}</p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                {getEvidencePill(activeApplicant.evidenceCategory)}
                <span className="text-xs text-slate-600">
                  Room Fit: <strong className="text-[#0066B3]">{activeApplicant.alignmentType}</strong>
                </span>
              </div>
            </div>

            {/* Prominent 2-Line Propositional Triad (Constraint -> Tool -> Outcome) */}
            <div className="bg-sky-50/70 border border-sky-200 border-l-4 border-l-[#0066B3] rounded-r-xl p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#00508F]">
                  Propositional Triad (Constraint → Tool → Outcome)
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  L2 Equity Protected
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
                {activeApplicant.demonstratedMechanism}
              </p>
            </div>

            {/* Proof of Work / Architecture Vignette */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-[#0066B3]" /> Submitted Proof of Work
              </h4>
              <div className="space-y-2">
                {activeApplicant.verifiedArtifacts.map((art, i) => (
                  <div
                    key={i}
                    className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{art.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-700 border border-slate-200">
                          {art.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{art.verificationNote}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${
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
                        className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-[#0066B3] hover:border-[#0066B3]/40 transition"
                        title="Inspect Evidence Source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Human Curator Decision Gate */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#0066B3]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Human Curator Decision Gate
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  Hallintolaki § 45 · Human Sign-Off Required
                </span>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={reviewerNoteInput}
                  onChange={(e) => setReviewerNoteInput(e.target.value)}
                  placeholder="Curator decision rationale (public record)..."
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066B3]"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'approved',
                        reviewerNoteInput || 'Verified demonstrated problem-solving mechanism.'
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                      activeApplicant.status === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Admit
                  </button>

                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'waitlisted',
                        reviewerNoteInput || 'Placed on cluster capacity waitlist.'
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                      activeApplicant.status === 'waitlisted'
                        ? 'bg-[#0066B3] text-white border-[#00508F] shadow-sm'
                        : 'bg-sky-50 text-[#0066B3] border-sky-200 hover:bg-[#0066B3] hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Waitlist
                  </button>

                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'flagged',
                        reviewerNoteInput || 'Insufficient verifiable technical or operational evidence.'
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                      activeApplicant.status === 'flagged'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" /> Flag
                  </button>
                </div>
              </div>

              {activeApplicant.reviewedBy && (
                <div className="mt-2.5 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
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

            {/* Expandable Verification Trace Drawer + Live B300 Re-Run */}
            <div className="border border-slate-200 rounded-xl bg-[#F8FAFC] overflow-hidden">
              <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setShowTraceDrawer((prev) => !prev)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-[#0066B3] transition"
                >
                  <Cpu className="w-4 h-4 text-[#0066B3]" />
                  <span>Näytä todisteketju / View Verification Trace</span>
                  {showTraceDrawer ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  {liveBadgeInfo && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {liveBadgeInfo}
                    </span>
                  )}
                  <button
                    onClick={handleLiveReanalyze}
                    disabled={isReanalyzing}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[#0066B3] border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    {isReanalyzing ? 'Querying B300...' : 'Re-Run Live Synthesis'}
                  </button>
                </div>
              </div>

              {showTraceDrawer && (
                <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-200 bg-white space-y-2.5">
                  <div className="text-[11px] text-slate-600 bg-[#F8FAFC] border border-slate-200 rounded-lg p-2.5">
                    <strong className="text-slate-800">Micro-Scenario Response:</strong>{' '}
                    <span className="italic">“{activeApplicant.scenarioAnswer}”</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-700 bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                    {activeApplicant.nemotronReasoning}
                  </pre>
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
