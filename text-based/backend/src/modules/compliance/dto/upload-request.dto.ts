import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateClientSubmissionDto {
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
  @IsNotEmpty()
  accountType: 'Individual' | 'Joint' | 'Trust' | 'Entity' | 'IRA';

  @IsString()
  @IsNotEmpty()
  advisorName: string;

  @IsString()
  @IsOptional()
  advisorFirm?: string;

  @IsString()
  @IsNotEmpty()
  targetPortfolio: string;

  @IsNumber()
  @IsOptional()
  estimatedAum?: number;

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
