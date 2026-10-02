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
  accountType: 'Individual' | 'Joint' | 'Trust' | 'Entity' | 'IRA';
  advisorName: string;
  advisorFirm?: string;
  targetPortfolio: string;
  estimatedAum: number;
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
