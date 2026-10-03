export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type UserRole = "ADVISOR" | "REVIEWER";

/** Returned by GET /api/me. Identity and roles come from the session, never from the client. */
export interface UserProfile {
  id: string;
  name: string;
  roles: UserRole[];
  /** Display-only, e.g. "CRD #482910" or "FINRA Series 24". */
  credential?: string;
}

export interface ComplianceFlag {
  ruleCategory: string;
  severity: SeverityLevel;
  quote: string;
  timestampRange?: { startSec: number; endSec: number };
  explanation: string;
  recommendedAction: string;
}

export interface DialogueSegment {
  speakerLabel: string;
  startSec: number;
  endSec: number;
  text: string;
}

export interface CrmSummary {
  clientObjectives: string;
  productsDiscussed: string[];
  disclosuresVerified: boolean;
  outsideBusinessMentions: string[];
  actionItems: string[];
}

export interface ComplianceAuditReport {
  meetingId: string;
  advisorId: string;
  overallRiskScore: number;
  overallRiskLevel: SeverityLevel;
  flags: ComplianceFlag[];
  redactedTranscript: string;
  segments: DialogueSegment[];
  crmSummary: CrmSummary;
  /** Model that produced the audit, returned by the server. */
  modelId?: string;
}

export type ReviewStatus = "APPROVED" | "FLAGGED_FOR_REVIEW" | "ESCALATED" | "RESOLVED";

/** What a reviewer can do with a case. */
export type CaseDisposition = "APPROVED" | "ESCALATED";

export interface MeetingCaseRecord {
  meetingId: string;
  advisorId: string;
  timestamp: string;
  reviewStatus: ReviewStatus;
  overallRiskScore: number;
  overallRiskLevel: SeverityLevel;
  s3AudioLocation?: string;
  auditReport: ComplianceAuditReport;
}