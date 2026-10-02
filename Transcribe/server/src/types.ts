export type RiskSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface ComplianceFlag {
  category: string;
  quote: string;
  violation: string;
  severity: RiskSeverity;
  recommendation: string;
}

export interface CrmSummary {
  clientGoals: string;
  discussedProducts: string[];
  disclosuresMade: boolean;
  outsideBusinessMentions: string[];
  actionItems: string[];
}

export interface ComplianceCheckResult {
  riskScore: number;
  riskLevel: RiskSeverity;
  flags: ComplianceFlag[];
  redactedTranscript: string;
  crmSummary: CrmSummary;
}