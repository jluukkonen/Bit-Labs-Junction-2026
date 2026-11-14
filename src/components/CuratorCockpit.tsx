import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
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
  TrendingUp,
  RefreshCw,
  FileText,
  Lock,
  Layers,
  Scale,
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
            app.evidenceCategory.toLowerCase().includes(q)
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
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Human Admitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" /> In Curator Review
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3" /> Priority Waitlist
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Flag className="w-3 h-3" /> Insufficient Evidence
          </span>
        );
    }
  };

  const getEvidencePill = (cat: string) => {
    if (cat.includes('NDA')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Lock className="w-2.5 h-2.5" /> Confidential NDA Vignette
        </span>
      );
    }
    if (cat.includes('Junior') || cat.includes('Student')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <Sparkles className="w-2.5 h-2.5" /> Applied Reasoning (Student / Junior)
        </span>
      );
    }
    if (cat.includes('Research')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
          <FileText className="w-2.5 h-2.5" /> Research / Lab Publication
        </span>
      );
    }
    if (cat.includes('Public')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <FileCode2 className="w-2.5 h-2.5" /> Public Code / Benchmark
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <AlertTriangle className="w-2.5 h-2.5" /> Self-Reported Only
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Governance & Methodology Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
            <Scale className="w-4 h-4 text-sky-400" />
            AI as an Evidence Reader · Human Curators Decide Room Composition
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            We reject pseudo-objective "AI competence leaderboards". The AI extracts{' '}
            <strong className="text-white">Propositional Triads (`Constraint → Tool → Outcome`)</strong> and supports equal-status evidence pathways (including{' '}
            <strong className="text-purple-300">Confidential NDA Vignettes</strong> and{' '}
            <strong className="text-sky-300">Applied Reasoning for Juniors</strong>) to eliminate linguistic and open-source bias.
          </p>
        </div>

        {/* 1-Click Lyyti & EU AI Act Audit Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold flex items-center gap-2 transition shadow-md"
          >
            <FileText className="w-3.5 h-3.5" />
            Lyyti CSV &amp; EU AI Act Audit Log
          </button>
        </div>
      </div>

      {/* Top KPI & Mode Comparison Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Human-Admitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats.approved}</span>
              <span className="text-xs text-slate-400">/ {applicants.length} pool</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-400">
              Verified for room diversity
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Curator Review Queue</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-300">{stats.pending}</span>
              <span className="text-xs text-slate-400">awaiting decision</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              AI extracts · Staff balances
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>NDA / Enterprise Builders</span>
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-300">{stats.ndaVignettes}</span>
              <span className="text-xs text-slate-400">vignettes</span>
            </div>
            <div className="mt-1 text-[11px] text-purple-400">
              Zero public GitHub bias
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Insufficient Evidence</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-300">{stats.flagged}</span>
              <span className="text-xs text-slate-400">unverified</span>
            </div>
            <div className="mt-1 text-[11px] text-rose-400">
              Self-reported buzzwords only
            </div>
          </div>
        </div>

        {/* Comparison Switcher: Why Legacy LinkedIn AI Fails */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-sky-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Methodology Comparison
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">
              Booth Demo Toggle
            </span>
          </div>
          <p className="text-xs text-slate-300 my-1.5">
            Compare how a naive LinkedIn keyword scorer ranks applicants vs.{' '}
            <strong className="text-white">Evidence &amp; Room Balance</strong>:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => setRankingMode('evidence_balance')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                rankingMode === 'evidence_balance'
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Evidence &amp; Room Coverage
            </button>
            <button
              onClick={() => setRankingMode('legacy_keyword_ai')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                rankingMode === 'legacy_keyword_ai'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Naive LinkedIn Keyword Scraper
            </button>
          </div>
        </div>
      </div>

      {/* Warning Callout when Legacy LinkedIn Mode is active */}
      {rankingMode === 'legacy_keyword_ai' && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-xs text-rose-200">
              <strong>Naive LinkedIn Keyword Scraper Mode Active:</strong> Notice how{' '}
              <span className="underline font-semibold">Victor "Visionary" Sterling (95%)</span> and{' '}
              <span className="underline font-semibold">Chadwick Vance (91%)</span> jump to #1 and #2 because their profiles are stuffed with AI buzzwords—while real enterprise NDA engineer{' '}
              <span className="underline font-semibold">Mateo Rojas (54%)</span> and embedded builder{' '}
              <span className="underline font-semibold">Priya Nair (48%)</span> get buried because they don't market on social media!
            </div>
          </div>
          <button
            onClick={() => setRankingMode('evidence_balance')}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition"
          >
            Restore Evidence Triage
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'pending', 'approved', 'waitlisted', 'flagged'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
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
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Event Clusters</option>
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
              placeholder="Filter by name, role, evidence..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Main Split-Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: Applicant Queue */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Applicant Evidence Dossiers ({filteredApplicants.length})
            </span>
            <span className="text-[11px] text-slate-400">
              View:{' '}
              <strong className="text-sky-300">
                {rankingMode === 'evidence_balance' ? 'Evidence & Room Coverage' : 'Naive LinkedIn Scraper'}
              </strong>
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[680px] overflow-y-auto">
            {filteredApplicants.map((app, index) => {
              const isSelected = activeApplicant?.id === app.id;

              return (
                <button
                  key={app.id}
                  onClick={() => handleSelectApplicant(app)}
                  className={`w-full text-left p-4 transition flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-sky-500/10 border-l-4 border-l-sky-400'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-300 shrink-0 mt-0.5">
                    #{index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-white truncate">{app.name}</h4>
                      {getStatusBadge(app.status)}
                    </div>

                    <p className="text-xs text-slate-300 truncate mt-0.5">{app.role}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{app.origin}</p>

                    {/* Evidence & Alignment Badges */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {getEvidencePill(app.evidenceCategory)}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {app.alignmentType}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Deep-Dive Inspector & Mandatory Human-in-the-Loop Controls */}
        {activeApplicant && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden space-y-5 p-5">
            {/* Mandatory Human-in-the-Loop Decision Header */}
            <div className="bg-slate-950/90 border border-sky-500/30 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Human Curator Decision Gate (EU AI Act &amp; Hallintolaki Compliant)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  AI reads &amp; structures evidence · Human curator decides admission
                </span>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={reviewerNoteInput}
                  onChange={(e) => setReviewerNoteInput(e.target.value)}
                  placeholder="Official curator reason for decision (public record under Julkisuuslaki)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'approved',
                        reviewerNoteInput || 'Verified demonstrated problem-solving mechanism.'
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeApplicant.status === 'approved'
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Admit to Room
                  </button>

                  <button
                    onClick={() =>
                      onUpdateDecision(
                        activeApplicant.id,
                        'waitlisted',
                        reviewerNoteInput || 'Placed on cluster capacity waitlist.'
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeApplicant.status === 'waitlisted'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500 hover:text-slate-950'
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
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeApplicant.status === 'flagged'
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" /> Flag
                  </button>
                </div>
              </div>

              {activeApplicant.reviewedBy && (
                <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between bg-slate-900/70 px-3 py-1.5 rounded-lg">
                  <span>
                    Official decision by <strong className="text-slate-200">{activeApplicant.reviewedBy}</strong> at{' '}
                    {activeApplicant.reviewedAt}
                  </span>
                  {activeApplicant.humanReviewerNote && (
                    <span className="italic text-sky-300">“{activeApplicant.humanReviewerNote}”</span>
                  )}
                </div>
              )}
            </div>

            {/* Applicant Profile Header & Evidence Cards */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-white">{activeApplicant.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-sky-300 border border-slate-700">
                    {activeApplicant.cluster}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-0.5">{activeApplicant.role}</p>
                <p className="text-xs text-slate-400 mt-0.5">{activeApplicant.origin}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {getEvidencePill(activeApplicant.evidenceCategory)}
                <span className="text-xs text-slate-300 font-medium">
                  Room Fit: <strong className="text-sky-300">{activeApplicant.alignmentType}</strong>
                </span>
              </div>
            </div>

            {/* Extracted Demonstrated Mechanism (Propositional Triad) */}
            <div className="bg-sky-950/20 border border-sky-500/30 rounded-xl p-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center justify-between">
                <span>Extracted Propositional Triad (`Constraint → Tool → Outcome`)</span>
                <span className="text-[10px] font-mono text-emerald-400">L2 Equity Protected</span>
              </div>
              <p className="text-xs text-slate-100 mt-2 leading-relaxed">
                {activeApplicant.demonstratedMechanism}
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                “{activeApplicant.scenarioAnswer}”
              </div>
            </div>

            {/* Evidence & Artifact Verification (With NDA Equal Status) */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-sky-400" /> Submitted Proof of Work / Architecture Vignette
              </h4>
              <div className="space-y-2.5">
                {activeApplicant.verifiedArtifacts.map((art, i) => (
                  <div
                    key={i}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{art.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300">
                          {art.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{art.verificationNote}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                          art.authenticityScore >= 75
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        Evidence Integrity: {art.authenticityScore}%
                      </span>
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                        title="Inspect Evidence Source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NVIDIA Nemotron 3.5 Super VL Reasoning Trace + Live B300 Re-Inference */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    NVIDIA Nemotron 3.5 Super VL · Evidence Synthesis Trace
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {liveBadgeInfo && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {liveBadgeInfo}
                    </span>
                  )}
                  <button
                    onClick={handleLiveReanalyze}
                    disabled={isReanalyzing}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    {isReanalyzing ? 'Querying B300 GPU...' : 'Re-Run Live Evidence Synthesis'}
                  </button>
                </div>
              </div>

              <pre className="mt-3 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {activeApplicant.nemotronReasoning}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Lyyti CSV & EU AI Act Audit Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">
                  Lyyti CSV Export &amp; EU AI Act Compliance Certificate
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                This export produces a clean CSV compatible with <strong>Lyyti</strong> (the official municipal event management software used across Finland), containing human curator approval IDs and full administrative audit logs under Finnish <em>Hallintolaki</em> § 45:
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                <div className="text-emerald-400"># ESP_EVENT_AUDIT_LOG_2026-11-14.csv</div>
                <div>id,name,email,cluster,evidence_type,human_decision,curator_id,timestamp,julkisuus_status</div>
                <div>app-01,Priya Nair,p.nair@example.fi,Edge AI,Verified Public Code,APPROVED,MARIKA_K,2026-11-13 19:40,PUBLIC</div>
                <div>app-03,Dr. Lukas Lindqvist,l.lindqvist@vtt.fi,Quantum,Research Publication,APPROVED,MARIKA_K,2026-11-13 20:05,PUBLIC</div>
                <div>app-04,Mateo Rojas,m.rojas@example.fi,CleanTech,Confidential NDA Vignette,APPROVED,MELISSA_L,2026-11-14 09:15,CONFIDENTIAL_TRADE_SECRET</div>
                <div>app-10,Noora Lindström,n.lindstrom@aalto.fi,CleanTech,Applied Reasoning (Junior),APPROVED,MELISSA_L,2026-11-13 20:45,PUBLIC</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-bold text-white block">EU AI Act (Annex III 4a):</span>
                  <span>100% meaningful human oversight logged. Zero automated rejections.</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-bold text-white block">Yhdenvertaisuuslaki:</span>
                  <span>No-artifact &amp; NDA cohorts protected by alternative evidence equality.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition"
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
