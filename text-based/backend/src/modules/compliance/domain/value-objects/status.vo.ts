export enum ComplianceStatus {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum OnboardingStatus {
  SUBMITTED = 'Submitted',
  PROCESSING = 'Processing',
  PENDING_REVIEW = 'Pending Review',
  ACTION_REQUIRED = 'Action Required',
  CLEARED_TO_FUND = 'Cleared to Fund',
  REJECTED = 'Rejected',
}

export interface BucketScore {
  bucket: 'AML_IDENTITY' | 'REG_BI_SUITABILITY' | 'REQUIRED_DISCLOSURES' | 'VULNERABLE_ADULT';
  title: string;
  status: ComplianceStatus;
  summary: string;
  findings: string[];
}
