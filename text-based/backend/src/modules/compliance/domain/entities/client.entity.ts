import { ComplianceStatus, OnboardingStatus, BucketScore } from '../value-objects/status.vo';

export interface DocumentMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key?: string;
  s3Url?: string;
  uploadedAt: Date;
  extractedTextLength?: number;
}

export interface ClientEntity {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  ssnLast4?: string;
  citizenshipStatus?: string;
  residentialAddress?: string;

  // Account Type
  accountType: 'Individual' | 'Joint' | 'Trust' | 'Entity' | 'IRA';
  coOwnerFullName?: string;
  coOwnerRelationship?: string;
  trustName?: string;
  trustDate?: string;

  // Suitability / Reg BI
  targetPortfolio: string;
  estimatedAum: number;
  annualIncome?: string;
  liquidNetWorth?: string;
  riskTolerance?: string;
  investmentObjective?: string;
  liquidityTimeHorizon?: string;
  sourceOfWealth?: string;
  transferringCustodian?: string;

  // Senior / Trusted Contact
  trustedContactName?: string;
  trustedContactPhone?: string;
  trustedContactRelationship?: string;

  // Disclosures
  formCrsAcknowledged: boolean;
  advPart2Delivered: boolean;
  privacyPolicyConsent: boolean;

  // Advisor Info
  advisorName: string;
  advisorFirm?: string;
  advisorCrd?: string;
  notes?: string;

  documents: DocumentMetadata[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewEntity {
  id: string;
  clientId: string;
  overallStatus: ComplianceStatus;
  onboardingStatus: OnboardingStatus;
  registrationMismatch: boolean;
  registrationDetails?: string;
  portfolioRiskSummary: string;
  sourceOfFundsSummary: string;
  dossierMarkdown: string;
  bucketScores: BucketScore[];
  flaggedAnomalies: string[];
  reviewedBy?: string;
  reviewedAt?: Date;
  remediationNotes?: string[];
  createdAt: Date;
  updatedAt: Date;
}
