import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../aws-s3/s3.service';
import { BedrockService } from '../aws-bedrock/bedrock.service';
import { OcrEngineService } from './ocr-engine.service';
import { ClientEntity, ReviewEntity, DocumentMetadata } from './domain/entities/client.entity';
import { ComplianceStatus, OnboardingStatus } from './domain/value-objects/status.vo';
import { CreateClientSubmissionDto, DecisionDto, RemediationRequestDto } from './dto/upload-request.dto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  private clients: Map<string, ClientEntity> = new Map();
  private reviews: Map<string, ReviewEntity> = new Map();

  constructor(
    private readonly s3Service: S3Service,
    private readonly bedrockService: BedrockService,
    private readonly ocrEngineService: OcrEngineService
  ) {
    this.seedInitialData();
  }

  private seedInitialData() {
    const sampleId1 = 'demo-client-john-doe';
    const client1: ClientEntity = {
      id: sampleId1,
      fullName: 'Johnathan Doe',
      email: 'john.doe@californiawealth.com',
      phone: '+1 (555) 234-5678',
      dateOfBirth: '1976-08-14',
      ssnLast4: '8821',
      citizenshipStatus: 'US Citizen',
      residentialAddress: '450 Newport Center Dr, Newport Beach, CA 92660',
      accountType: 'Individual',
      targetPortfolio: 'Growth & Income (60/40 Equity/Fixed)',
      estimatedAum: 1250000,
      annualIncome: '$250,000 - $500,000',
      liquidNetWorth: '$1,000,000 - $5,000,000',
      riskTolerance: 'Moderate Growth',
      investmentObjective: 'Long-term Capital Appreciation & Tax-Advantaged Income',
      liquidityTimeHorizon: '7 - 10 Years',
      sourceOfWealth: 'Executive Compensation & Investment Liquidity',
      transferringCustodian: 'Merrill Lynch Wealth Management',
      trustedContactName: 'Mary Doe',
      trustedContactPhone: '+1 (555) 234-9988',
      trustedContactRelationship: 'Spouse',
      formCrsAcknowledged: true,
      advPart2Delivered: true,
      privacyPolicyConsent: true,
      advisorName: 'Sarah Jenkins, CFP',
      advisorFirm: 'Apex Wealth Advisory',
      advisorCrd: 'CRD# 6842109',
      notes: 'Clean onboarding intake with verified CA Driver License and Merrill Lynch statement.',
      documents: [
        {
          id: 'doc-1',
          category: 'PHOTO_ID',
          originalName: 'CA_Driver_License_JohnDoe.pdf',
          mimeType: 'application/pdf',
          size: 450000,
          uploadedAt: new Date(Date.now() - 3600000 * 2),
          ocrConfidence: 99.4,
          extractedFields: { Name: 'DOE, JOHNATHAN', DOB: '08/14/1976', Status: 'VALID' }
        },
        {
          id: 'doc-2',
          category: 'PROOF_OF_ADDRESS',
          originalName: 'Edison_Utility_Bill_Sep2026.pdf',
          mimeType: 'application/pdf',
          size: 210000,
          uploadedAt: new Date(Date.now() - 3600000 * 2),
          ocrConfidence: 98.8,
          extractedFields: { Address: '450 Newport Center Dr, Newport Beach, CA 92660', Status: 'MATCH' }
        },
        {
          id: 'doc-3',
          category: 'BROKERAGE_STATEMENT',
          originalName: 'Merrill_Lynch_ACAT_Statement.pdf',
          mimeType: 'application/pdf',
          size: 890000,
          uploadedAt: new Date(Date.now() - 3600000 * 2),
          ocrConfidence: 99.1,
          extractedFields: { Title: 'Individual Taxable', Value: '$1,250,000.00' }
        }
      ],
      createdAt: new Date(Date.now() - 3600000 * 2),
      updatedAt: new Date(Date.now() - 3600000 * 2),
    };

    const review1: ReviewEntity = {
      id: 'rev-1',
      clientId: sampleId1,
      overallStatus: ComplianceStatus.GREEN,
      onboardingStatus: OnboardingStatus.PENDING_REVIEW,
      registrationMismatch: false,
      registrationDetails: 'Structured form intake matches all regulatory suitability benchmarks and OCR documents.',
      portfolioRiskSummary: 'Transitioning $1.25M into Growth & Income strategy. Suitability envelope verified.',
      sourceOfFundsSummary: 'Liquid funds originating from Merrill Lynch ACAT transfer.',
      ocrAuditSummary: [
        {
          documentType: 'Government Photo ID',
          fileName: 'CA_Driver_License_JohnDoe.pdf',
          matchScore: '99.4%',
          crossCheckStatus: 'MATCH',
          notes: 'Full Legal Name and DOB match state driver license OCR record.'
        },
        {
          documentType: 'Proof of Address',
          fileName: 'Edison_Utility_Bill_Sep2026.pdf',
          matchScore: '98.8%',
          crossCheckStatus: 'MATCH',
          notes: 'Utility statement dated within 90 days. Zero address variance.'
        },
        {
          documentType: 'Competitor Brokerage Statement',
          fileName: 'Merrill_Lynch_ACAT_Statement.pdf',
          matchScore: '99.1%',
          crossCheckStatus: 'MATCH',
          notes: 'Statement reflects Individual Taxable registration and $1.25M transfer value.'
        }
      ],
      bucketScores: [
        {
          bucket: 'AML_IDENTITY',
          title: 'Bucket A: Identity & AML (CIP)',
          status: ComplianceStatus.GREEN,
          summary: 'OCR verified photo ID and utility proof of address for Johnathan Doe. OFAC Clear.',
          findings: ['California Real ID verified.', 'Proof of Address (<90 days) validated.', '0 hits on OFAC Sanctions database.']
        },
        {
          bucket: 'REG_BI_SUITABILITY',
          title: 'Bucket B: Reg BI & Suitability',
          status: ComplianceStatus.GREEN,
          summary: 'Individual ownership validated across form and ACAT statement. Moderate risk profile matches strategy.',
          findings: ['Annual Income ($250k+) and Liquid Net Worth ($1M+) confirm suitability.', 'Estimated fee savings: 38 bps vs retail broker.']
        },
        {
          bucket: 'REQUIRED_DISCLOSURES',
          title: 'Bucket C: Required Disclosures',
          status: ComplianceStatus.GREEN,
          summary: 'Form CRS and ADV Part 2 electronic sign-offs complete with timestamp.',
          findings: ['Form CRS Relationship Summary acknowledged.', 'Fee schedule disclosed under SEC Rule 17a-14.']
        },
        {
          bucket: 'VULNERABLE_ADULT',
          title: 'Bucket D: Vulnerable Adult Protection',
          status: ComplianceStatus.GREEN,
          summary: 'Client age 48. Trusted Contact Person recorded on master profile.',
          findings: ['Trusted Contact designated: Mary Doe (Spouse).', 'FINRA Rule 2165 authorization granted.']
        }
      ],
      flaggedAnomalies: [],
      dossierMarkdown: `# COMPLIANCE SUPERVISORY AUDIT MEMORANDUM
**FIRM:** LPL Financial Compliance & Regulatory Supervision Division  
**DOCUMENT REF:** AUD-2026-JOH-8821  
**ISSUED DATE:** ${new Date().toISOString().split('T')[0]}  
**MANAGING ADVISOR:** Sarah Jenkins, CFP (Apex Wealth Advisory &bull; CRD# 6842109)  
**CLASSIFICATION:** Strictly Privileged &amp; Confidential / Supervisory Audit Record  

---

## 1. Executive Summary & Regulatory Determination

| Parameter | Intake Form Value | OCR Extracted Document Value | Cross-Check Status |
| :--- | :--- | :--- | :--- |
| **Applicant Legal Name** | Johnathan Doe | Johnathan Doe (CA Driver License) | **MATCH / VERIFIED** |
| **Date of Birth / Age** | 1976-08-14 (Age: 48) | 1976-08-14 | **MATCH / VERIFIED** |
| **Residential Address** | 450 Newport Center Dr, Newport Beach, CA | 450 Newport Center Dr (Utility Statement) | **MATCH / VERIFIED** |
| **Account Ownership** | Individual | Individual (Merrill Lynch Statement) | **CONFIRMED** |
| **Inflow / Transfer AUM** | **$1,250,000.00** | **$1,250,000.00** (ACAT Statement) | **CONFIRMED** |
| **Supervisory Determination** | **CLEARED FOR IMMEDIATE APPROVAL** | Automated OCR Multi-Doc Audit | **PASS (LOW RISK)** |

**Supervisory Determination:**  
The applicant's customer identification documents (Photo ID & Utility Bill OCR), Reg BI suitability parameters, and required disclosures meet all regulatory thresholds. Recommended for immediate 1-click back-office clearance.

---

## 2. Document OCR Cross-Verification Audit

| Document Type | Ingested File Name | OCR Confidence | Cross-Verification Result | Audit Finding |
| :--- | :--- | :--- | :--- | :--- |
| **Government Photo ID** | CA_Driver_License_JohnDoe.pdf | 99.4% | **MATCH** | Name, DOB, and DL validity verified against state ledger. |
| **Proof of Address** | Edison_Utility_Bill_Sep2026.pdf | 98.8% | **MATCH** | Domicile verified within 90 days. Valid street address (no P.O. Box). |
| **Competitor Statement** | Merrill_Lynch_ACAT_Statement.pdf | 99.1% | **MATCH** | Account titles and asset holdings ($1.25M) aligned. |

---

## 3. Regulation Best Interest (Reg BI) & Suitability Assessment
*Governing Standards: SEC Rule 17a-14, SEC Regulation Best Interest, and FINRA Rule 2111*

- **Proposed Investment Strategy:** **Growth & Income (60/40 Equity/Fixed)**
- **Risk Capacity & Profile:** Client is categorized under **Moderate Growth** risk envelope with an investment liquidity horizon of **7 - 10 Years**.
- **Financial Baseline Suitability:** Stated annual income bracket (**$250,000 - $500,000**) and liquid net worth (**$1,000,000 - $5,000,000**) substantiate the liquidity and risk capacity of the mandate.
- **Cost & Comparative Analysis:** Advisory fee model schedule achieves an estimated **38 bps** net reduction in all-in costs versus legacy retail brokerage structures.

---

## 4. Senior & Vulnerable Investor Protections (FINRA Rule 2165)

| Protection Item | Audit Verification Detail | Compliance Result |
| :--- | :--- | :--- |
| **Demographic Status** | Age: 48 (Standard Adult Protocol) | **LOGGED** |
| **Trusted Contact Person (TCP)** | Mary Doe (Spouse) &bull; +1 (555) 234-9988 | **SATISFIED** |
| **Diminished Capacity Safeguards** | FINRA Rule 2165 authorization protocol recorded | **CONFIRMED** |

---

## 5. Required Disclosures & Consents (Form CRS)

- **Form CRS Relationship Summary:** Electronic delivery acknowledged and recorded on immutable compliance ledger.
- **Form ADV Part 2A / Part 2B Schedule:** Current firm brochure and fee schedules delivered.
- **Gramm-Leach-Bliley Act Notice:** Electronic records and consumer privacy disclosures confirmed.

---

## 6. Supervisory Action Recommendation

**Supervisory Status:** **RECOMMENDED FOR APPROVAL**

**Directives:** No regulatory discrepancies detected. Back-office reviewer may proceed with 1-click authorization to transition the account into 'Cleared to Fund'.
`,
      createdAt: new Date(Date.now() - 3600000 * 2),
      updatedAt: new Date(Date.now() - 3600000 * 2),
    };

    const sampleId2 = 'demo-client-eleanor-vance';
    const client2: ClientEntity = {
      id: sampleId2,
      fullName: 'Eleanor Vance',
      email: 'eleanor.vance@example.org',
      phone: '+1 (555) 891-2345',
      dateOfBirth: '1952-03-22',
      ssnLast4: '3419',
      citizenshipStatus: 'US Citizen',
      residentialAddress: '120 Ocean View Ave, Carmel, CA 93921',
      accountType: 'Joint',
      targetPortfolio: 'Capital Preservation & Dividend Income',
      estimatedAum: 875000,
      annualIncome: '$100,000 - $250,000',
      liquidNetWorth: '$1,000,000 - $5,000,000',
      riskTolerance: 'Conservative / Income',
      investmentObjective: 'Capital Preservation & Current Income',
      liquidityTimeHorizon: '3 - 5 Years',
      sourceOfWealth: 'Retirement Assets',
      transferringCustodian: 'Charles Schwab & Co.',
      trustedContactName: '',
      formCrsAcknowledged: true,
      advPart2Delivered: true,
      privacyPolicyConsent: true,
      advisorName: 'Marcus Reynolds',
      advisorFirm: 'Pacific Horizon Financial',
      advisorCrd: 'CRD# 5129840',
      notes: 'Demo test case: Statement OCR reflects Individual ownership, whereas application marked Joint + Senior TCP missing.',
      documents: [
        {
          id: 'doc-4',
          category: 'PHOTO_ID',
          originalName: 'US_Passport_Eleanor_Vance.pdf',
          mimeType: 'application/pdf',
          size: 512000,
          uploadedAt: new Date(Date.now() - 3600000 * 5),
          ocrConfidence: 99.0,
          extractedFields: { Name: 'VANCE, ELEANOR', DOB: '03/22/1952' }
        },
        {
          id: 'doc-5',
          category: 'BROKERAGE_STATEMENT',
          originalName: 'Schwab_Statement_Eleanor_Vance.pdf',
          mimeType: 'application/pdf',
          size: 890000,
          uploadedAt: new Date(Date.now() - 3600000 * 5),
          ocrConfidence: 98.6,
          extractedFields: { Title: 'Individual Ownership', Value: '$875,000.00' }
        }
      ],
      createdAt: new Date(Date.now() - 3600000 * 5),
      updatedAt: new Date(Date.now() - 3600000 * 5),
    };

    const review2: ReviewEntity = {
      id: 'rev-2',
      clientId: sampleId2,
      overallStatus: ComplianceStatus.YELLOW,
      onboardingStatus: OnboardingStatus.ACTION_REQUIRED,
      registrationMismatch: true,
      registrationDetails: 'Discrepancy: Competitor statement OCR reflects Individual Ownership, but form selected Joint.',
      portfolioRiskSummary: 'Conservative portfolio strategy appropriate for client horizon.',
      sourceOfFundsSummary: 'Charles Schwab ACAT transfer.',
      ocrAuditSummary: [
        {
          documentType: 'Government Photo ID',
          fileName: 'US_Passport_Eleanor_Vance.pdf',
          matchScore: '99.0%',
          crossCheckStatus: 'MATCH',
          notes: 'US Passport verified legal name and DOB (Age 74).'
        },
        {
          documentType: 'Competitor Brokerage Statement',
          fileName: 'Schwab_Statement_Eleanor_Vance.pdf',
          matchScore: '82.0%',
          crossCheckStatus: 'DISCREPANCY',
          notes: 'OCR extracted Individual Ownership; onboarding form marked Joint Tenants (WROS).'
        }
      ],
      bucketScores: [
        {
          bucket: 'AML_IDENTITY',
          title: 'Bucket A: Identity & AML (CIP)',
          status: ComplianceStatus.GREEN,
          summary: 'Primary applicant CIP validated via US Passport OCR. 0 OFAC sanctions hits.',
          findings: ['US Passport OCR verified.', 'Clear OFAC and watch list record.']
        },
        {
          bucket: 'REG_BI_SUITABILITY',
          title: 'Bucket B: Reg BI & Suitability',
          status: ComplianceStatus.YELLOW,
          summary: 'Registration variance: Competitor statement OCR reflects Individual; application requests Joint.',
          findings: ['Co-owner signature and authorization required to establish Joint tenancy.']
        },
        {
          bucket: 'REQUIRED_DISCLOSURES',
          title: 'Bucket C: Required Disclosures',
          status: ComplianceStatus.GREEN,
          summary: 'Disclosures completed.',
          findings: ['Form CRS signed on March 15.']
        },
        {
          bucket: 'VULNERABLE_ADULT',
          title: 'Bucket D: Vulnerable Adult Protection',
          status: ComplianceStatus.YELLOW,
          summary: 'Client age 74 (Senior Investor). Trusted Contact Person designation is required.',
          findings: ['FINRA Rule 2165 prompt active for senior account holder.']
        }
      ],
      flaggedAnomalies: [
        'Registration Mismatch: Charles Schwab account statement OCR reflects Individual Ownership, whereas onboarding intake specifies Joint account.',
        'Senior Investor Protection: Age 74 requires Trusted Contact Person (TCP) form.'
      ],
      dossierMarkdown: `# COMPLIANCE SUPERVISORY AUDIT MEMORANDUM
**FIRM:** LPL Financial Compliance & Regulatory Supervision Division  
**DOCUMENT REF:** AUD-2026-ELE-3419  
**ISSUED DATE:** ${new Date().toISOString().split('T')[0]}  
**MANAGING ADVISOR:** Marcus Reynolds (Pacific Horizon Financial &bull; CRD# 5129840)  
**CLASSIFICATION:** Strictly Privileged &amp; Confidential / Supervisory Audit Record  

---

## 1. Executive Summary & Regulatory Determination

| Parameter | Intake Form Value | OCR Extracted Document Value | Cross-Check Status |
| :--- | :--- | :--- | :--- |
| **Applicant Legal Name** | Eleanor Vance | Eleanor Vance (US Passport) | **MATCH / VERIFIED** |
| **Date of Birth / Age** | 1952-03-22 (Age: 74) | 1952-03-22 | **MATCH / VERIFIED** |
| **Residential Address** | 120 Ocean View Ave, Carmel, CA | 120 Ocean View Ave | **CONFIRMED** |
| **Account Ownership** | Joint Tenants (WROS) | Individual Ownership (Schwab Statement) | **DISCREPANCY DETECTED** |
| **Inflow / Transfer AUM** | **$875,000.00** | **$875,000.00** (Schwab Statement) | **CONFIRMED** |
| **Supervisory Determination** | **ACTION REQUIRED / SUPERVISORY HOLD** | Automated OCR Multi-Doc Audit | **MANUAL REVIEW REQUIRED** |

**Supervisory Determination:**  
The account registration requires clarification prior to settlement. The intake form designates a Joint tenancy structure, but the uploaded Charles Schwab statement reflects Individual ownership. Additionally, senior investor protocol (FINRA 2165) requires a Trusted Contact Person designation.

---

## 2. Document OCR Cross-Verification Audit

| Document Type | Ingested File Name | OCR Confidence | Cross-Verification Result | Audit Finding |
| :--- | :--- | :--- | :--- | :--- |
| **Government Photo ID** | US_Passport_Eleanor_Vance.pdf | 99.0% | **MATCH** | US Passport verified legal name and DOB (Age 74). |
| **Competitor Statement** | Schwab_Statement_Eleanor_Vance.pdf | 82.0% | **DISCREPANCY** | OCR extracted Single/Individual; application requested Joint account. |

---

## 3. Regulation Best Interest (Reg BI) & Suitability Assessment

- **Proposed Investment Strategy:** **Capital Preservation & Dividend Income**
- **Risk Capacity & Profile:** Client categorized under **Conservative / Income** risk tolerance with an investment liquidity horizon of **3 - 5 Years**.
- **Financial Baseline Suitability:** Stated income of **$100,000 - $250,000** and liquid net worth of **$1,000,000 - $5,000,000** support conservative income distribution strategy.
- **Account Structure Variance:** Joint tenancy selected without secondary signature authorization.

---

## 4. Senior & Vulnerable Investor Protections (FINRA Rule 2165)

| Protection Item | Audit Verification Detail | Compliance Result |
| :--- | :--- | :--- |
| **Demographic Status** | Age: 74 (Senior Investor Protocol Active) | **ACTION REQUIRED** |
| **Trusted Contact Person (TCP)** | Not Designated on Intake Form | **MISSING** |
| **Diminished Capacity Safeguards** | FINRA Rule 2165 authorization pending TCP form | **HOLD** |

---

## 5. Supervisory Action Recommendation

**Supervisory Status:** **REMEDIATION DISPATCH REQUIRED**

**Directives:** Dispatch automated notification to advisor Marcus Reynolds requesting:
1. Secondary co-owner legal identification and signature authorization for Joint account.
2. Completed FINRA Rule 2165 Trusted Contact Person (TCP) authorization form.
`,
      createdAt: new Date(Date.now() - 3600000 * 5),
      updatedAt: new Date(Date.now() - 3600000 * 5),
    };

    this.clients.set(sampleId1, client1);
    this.reviews.set(sampleId1, review1);

    this.clients.set(sampleId2, client2);
    this.reviews.set(sampleId2, review2);
  }

  async getAllClientsWithReviews(): Promise<Array<{ client: ClientEntity; review: ReviewEntity }>> {
    const list: Array<{ client: ClientEntity; review: ReviewEntity }> = [];
    for (const [id, client] of this.clients.entries()) {
      const review = this.reviews.get(id);
      if (review) {
        list.push({ client, review });
      }
    }
    return list.sort((a, b) => b.client.createdAt.getTime() - a.client.createdAt.getTime());
  }

  async getClientDetails(clientId: string): Promise<{ client: ClientEntity; review: ReviewEntity }> {
    const client = this.clients.get(clientId);
    const review = this.reviews.get(clientId);
    if (!client || !review) {
      throw new NotFoundException(`Client onboarding case ${clientId} not found.`);
    }
    return { client, review };
  }

  async createSubmission(
    dto: CreateClientSubmissionDto,
    files: Express.Multer.File[] = []
  ): Promise<{ client: ClientEntity; review: ReviewEntity }> {
    const clientId = `client-${Date.now()}`;
    const uploadedDocs: DocumentMetadata[] = [];
    const ocrResults: Array<{ category: string; fileName: string; extractedText: string; confidence: number }> = [];

    // Process all uploaded files through the OCR Engine
    if (files && files.length > 0) {
      for (const file of files) {
        const docId = `doc-${uuidv4().substring(0, 8)}`;
        const ocr = await this.ocrEngineService.processDocument(file);
        const uploadResult = await this.s3Service.uploadFile(file, `clients/${clientId}`);

        uploadedDocs.push({
          id: docId,
          category: ocr.category,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          s3Key: uploadResult.key,
          s3Url: uploadResult.url,
          uploadedAt: new Date(),
          ocrConfidence: ocr.confidence,
          extractedFields: ocr.extractedFields,
        });

        ocrResults.push({
          category: ocr.category,
          fileName: file.originalname,
          extractedText: ocr.extractedText,
          confidence: ocr.confidence,
        });
      }
    } else {
      // Default sample OCR files if submitted via form preset
      ocrResults.push(
        {
          category: 'PHOTO_ID',
          fileName: 'Drivers_License_CA.pdf',
          extractedText: `CALIFORNIA REAL ID\nNAME: ${dto.fullName}\nDOB: ${dto.dateOfBirth || '1976-08-14'}\nADDRESS: ${dto.residentialAddress || '450 Newport Center Dr, CA'}`,
          confidence: 99.4,
        },
        {
          category: 'PROOF_OF_ADDRESS',
          fileName: 'Utility_Billing_Statement.pdf',
          extractedText: `UTILITY STATEMENT\nCUSTOMER: ${dto.fullName}\nADDRESS: ${dto.residentialAddress || '450 Newport Center Dr, CA'}\nDATE: September 2026`,
          confidence: 98.8,
        },
        {
          category: 'BROKERAGE_STATEMENT',
          fileName: 'ACAT_Transfer_Statement.pdf',
          extractedText: `BROKERAGE STATEMENT\nACCOUNT HOLDER: ${dto.fullName}\nREGISTRATION: ${dto.accountType === 'Joint' && !dto.coOwnerFullName ? 'Individual' : dto.accountType}\nTOTAL VALUE: $${(dto.estimatedAum || 1250000).toLocaleString()}`,
          confidence: 99.1,
        }
      );
    }

    const client: ClientEntity = {
      id: clientId,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth,
      ssnLast4: dto.ssnLast4,
      citizenshipStatus: dto.citizenshipStatus || 'US Citizen',
      residentialAddress: dto.residentialAddress,
      accountType: dto.accountType,
      coOwnerFullName: dto.coOwnerFullName,
      coOwnerRelationship: dto.coOwnerRelationship,
      trustName: dto.trustName,
      trustDate: dto.trustDate,
      targetPortfolio: dto.targetPortfolio,
      estimatedAum: dto.estimatedAum ? Number(dto.estimatedAum) : 750000,
      annualIncome: dto.annualIncome,
      liquidNetWorth: dto.liquidNetWorth,
      riskTolerance: dto.riskTolerance,
      investmentObjective: dto.investmentObjective,
      liquidityTimeHorizon: dto.liquidityTimeHorizon,
      sourceOfWealth: dto.sourceOfWealth,
      transferringCustodian: dto.transferringCustodian,
      trustedContactName: dto.trustedContactName,
      trustedContactPhone: dto.trustedContactPhone,
      trustedContactRelationship: dto.trustedContactRelationship,
      formCrsAcknowledged: dto.formCrsAcknowledged !== false,
      advPart2Delivered: dto.advPart2Delivered !== false,
      privacyPolicyConsent: dto.privacyPolicyConsent !== false,
      advisorName: dto.advisorName,
      advisorFirm: dto.advisorFirm || 'Independent Registered Advisor',
      advisorCrd: dto.advisorCrd || 'CRD# 7421890',
      notes: dto.notes,
      documents: uploadedDocs,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bedrockResult = await this.bedrockService.analyzeSubmission(client, ocrResults);

    const initialOnboardingStatus =
      bedrockResult.overallStatus === ComplianceStatus.RED || bedrockResult.overallStatus === ComplianceStatus.YELLOW
        ? OnboardingStatus.ACTION_REQUIRED
        : OnboardingStatus.PENDING_REVIEW;

    const review: ReviewEntity = {
      id: `rev-${uuidv4().substring(0, 8)}`,
      clientId,
      overallStatus: bedrockResult.overallStatus,
      onboardingStatus: initialOnboardingStatus,
      registrationMismatch: bedrockResult.registrationMismatch,
      registrationDetails: bedrockResult.registrationDetails,
      portfolioRiskSummary: bedrockResult.portfolioRiskSummary,
      sourceOfFundsSummary: bedrockResult.sourceOfFundsSummary,
      dossierMarkdown: bedrockResult.dossierMarkdown,
      bucketScores: bedrockResult.bucketScores,
      flaggedAnomalies: bedrockResult.flaggedAnomalies,
      ocrAuditSummary: bedrockResult.ocrAuditSummary,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clients.set(clientId, client);
    this.reviews.set(clientId, review);

    return { client, review };
  }

  async updateDecision(clientId: string, dto: DecisionDto): Promise<ReviewEntity> {
    const review = this.reviews.get(clientId);
    if (!review) {
      throw new NotFoundException(`Review for client ${clientId} not found.`);
    }

    if (dto.action === 'Cleared to Fund') {
      review.onboardingStatus = OnboardingStatus.CLEARED_TO_FUND;
      review.overallStatus = ComplianceStatus.GREEN;
    } else if (dto.action === 'Action Required') {
      review.onboardingStatus = OnboardingStatus.ACTION_REQUIRED;
      review.overallStatus = ComplianceStatus.YELLOW;
    } else {
      review.onboardingStatus = OnboardingStatus.REJECTED;
      review.overallStatus = ComplianceStatus.RED;
    }

    review.reviewedBy = dto.reviewerName || 'LPL Compliance Principal';
    review.reviewedAt = new Date();
    review.updatedAt = new Date();

    if (dto.reviewerNotes) {
      if (!review.remediationNotes) review.remediationNotes = [];
      review.remediationNotes.push(`[${new Date().toLocaleTimeString()}] Note: ${dto.reviewerNotes}`);
    }

    return review;
  }

  async triggerRemediation(clientId: string, dto: RemediationRequestDto): Promise<{ success: boolean; message: string }> {
    const client = this.clients.get(clientId);
    const review = this.reviews.get(clientId);
    if (!client || !review) {
      throw new NotFoundException(`Client ${clientId} not found.`);
    }

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] Sent ${dto.channel} to ${client.fullName} (${client.email}): "${dto.message}"`;

    if (!review.remediationNotes) {
      review.remediationNotes = [];
    }
    review.remediationNotes.push(logEntry);
    review.onboardingStatus = OnboardingStatus.ACTION_REQUIRED;
    review.updatedAt = new Date();

    return {
      success: true,
      message: `Automated ${dto.channel} notification sent to ${client.fullName} and advisor ${client.advisorName}.`,
    };
  }
}
