import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class CreateClientSubmissionDto {
  // 1. Client Identity & Personal Details
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  ssnLast4?: string;

  @IsString()
  @IsOptional()
  citizenshipStatus?: string;

  @IsString()
  @IsOptional()
  residentialAddress?: string;

  // 2. Account & Registration Details
  @IsString()
  @IsNotEmpty()
  accountType: 'Individual' | 'Joint' | 'Trust' | 'Entity' | 'IRA';

  @IsString()
  @IsOptional()
  coOwnerFullName?: string;

  @IsString()
  @IsOptional()
  coOwnerRelationship?: string;

  @IsString()
  @IsOptional()
  trustName?: string;

  @IsString()
  @IsOptional()
  trustDate?: string;

  // 3. Financial & Investment Profile (Reg BI / Suitability)
  @IsString()
  @IsNotEmpty()
  targetPortfolio: string;

  @IsNumber()
  @IsOptional()
  estimatedAum?: number;

  @IsString()
  @IsOptional()
  annualIncome?: string;

  @IsString()
  @IsOptional()
  liquidNetWorth?: string;

  @IsString()
  @IsOptional()
  riskTolerance?: string; // Conservative, Moderate, Aggressive

  @IsString()
  @IsOptional()
  investmentObjective?: string;

  @IsString()
  @IsOptional()
  liquidityTimeHorizon?: string;

  @IsString()
  @IsOptional()
  sourceOfWealth?: string; // Employment, Business Sale, Inheritance, Retirement Transfer

  @IsString()
  @IsOptional()
  transferringCustodian?: string; // Merrill Lynch, Charles Schwab, Fidelity, Vanguard

  // 4. Senior & Vulnerable Investor Protections (FINRA 2165)
  @IsString()
  @IsOptional()
  trustedContactName?: string;

  @IsString()
  @IsOptional()
  trustedContactPhone?: string;

  @IsString()
  @IsOptional()
  trustedContactRelationship?: string;

  // 5. Regulatory Disclosures & Consents
  @IsBoolean()
  @IsOptional()
  formCrsAcknowledged?: boolean;

  @IsBoolean()
  @IsOptional()
  advPart2Delivered?: boolean;

  @IsBoolean()
  @IsOptional()
  privacyPolicyConsent?: boolean;

  // 6. Advisor Credentials
  @IsString()
  @IsNotEmpty()
  advisorName: string;

  @IsString()
  @IsOptional()
  advisorFirm?: string;

  @IsString()
  @IsOptional()
  advisorCrd?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class DecisionDto {
  @IsEnum(['Cleared to Fund', 'Action Required', 'Rejected'])
  action: 'Cleared to Fund' | 'Action Required' | 'Rejected';

  @IsString()
  @IsOptional()
  reviewerNotes?: string;

  @IsString()
  @IsOptional()
  reviewerName?: string;
}

export class RemediationRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['SMS', 'EMAIL', 'PORTAL_NOTIFICATION'])
  channel: 'SMS' | 'EMAIL' | 'PORTAL_NOTIFICATION';

  @IsString()
  @IsOptional()
  requestedDocumentType?: string;
}
