export type ClusterName =
  | 'Edge AI & Robotics'
  | 'CleanTech & Smart Grid'
  | 'Quantum & Semiconductors'
  | 'Bio & HealthTech'
  | 'Sovereign AI & Cloud Infra';

export type ApplicantStatus = 'approved' | 'pending' | 'waitlisted' | 'flagged';

export type EvidenceCategory =
  | 'Verified Public Code / Benchmark'
  | 'Redacted Enterprise NDA Vignette'
  | 'Peer-Reviewed Research / Poster'
  | 'Applied Reasoning (Junior / Student)'
  | 'Self-Reported Claims Only';

export type AlignmentType =
  | 'Direct Bottleneck Match'
  | 'Complementary Domain Capability'
  | 'Exploration & High Learning Agility';

export type PersonaType =
  | 'Builder / Engineer'
  | 'Researcher'
  | 'Startup Founder'
  | 'Domain Specialist';

export interface VerifiedArtifact {
  title: string;
  type: string;
  url: string;
  verificationNote: string;
  authenticityScore: number;
}

export interface Applicant {
  id: string;
  name: string;
  role: string;
  origin: string;
  avatarInitials: string;
  persona: PersonaType;
  cluster: ClusterName;
  competenceScore: number; // Retained for ranking comparison
  legacyLinkedInScore: number;
  fluffIndex: number;
  evidenceCategory: EvidenceCategory;
  alignmentType: AlignmentType;
  demonstratedMechanism: string;
  status: ApplicantStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  humanReviewerNote: string;
  linkedInSummaryClaim: string;
  scenarioPrompt: string;
  scenarioAnswer: string;
  verifiedArtifacts: VerifiedArtifact[];
  nemotronReasoning: string;
  strengths: string[];
  risksOrFlags: string[];
  currentExploration: string;
  radarCoords: { x: number; y: number };
  sparks: Record<string, string | undefined>;
}

export interface CompanyNode {
  id: string;
  name: string;
  hq: string;
  cluster: ClusterName;
  zone: string;
  repName: string;
  repRole: string;
  hrBoilerplate: string;
  actualProblemSpace: string;
  'active bottlenecks': string[];
  radarCoords: { x: number; y: number };
}

export interface EventProfile {
  id: string;
  title: string;
  date: string;
  format: string;
  applicantCount: number;
  historicalPeakCount: number;
  venueCapacity: number;
  description: string;
  clusters: ClusterName[];
  curationPolicy: string;
}

export interface LiveTriageResult {
  competenceScore: number;
  legacyLinkedInScore: number;
  fluffIndex: number;
  cluster: ClusterName;
  evidenceCategory: EvidenceCategory;
  alignmentType: AlignmentType;
  recommendedAction: 'Approve' | 'Waitlist' | 'Flag for Human Review';
  strengths: string[];
  risksOrFlags: string[];
  reasoningTrace: string;
  summaryVerdict: string;
  latencyMs: number;
  modelUsed: string;
}
