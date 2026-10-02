import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as pdfParse from 'pdf-parse';
import { S3Service } from '../aws-s3/s3.service';
import { BedrockService } from '../aws-bedrock/bedrock.service';
import { ClientEntity, ReviewEntity, DocumentMetadata } from './domain/entities/client.entity';
import { ComplianceStatus, OnboardingStatus } from './domain/value-objects/status.vo';
import { CreateClientSubmissionDto, DecisionDto, RemediationRequestDto } from './dto/upload-request.dto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  // In-memory DDD aggregate store for the Hackathon MVP
  private clients: Map<string, ClientEntity> = new Map();
  private reviews: Map<string, ReviewEntity> = new Map();

  constructor(
    private readonly s3Service: S3Service,
    private readonly bedrockService: BedrockService
  ) {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed sample clients for immediate demo readiness
    const sampleId1 = 'demo-client-john-doe';
    const client1: ClientEntity = {
      id: sampleId1,
      fullName: 'Johnathan Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 234-5678',
      accountType: 'Individual',
      advisorName: 'Sarah Jenkins',
      advisorFirm: 'Apex Wealth Advisory',
      targetPortfolio: 'Growth & Income (60/40 Equity/Fixed)',
      estimatedAum: 1250000,
      notes: 'Transitioning retirement accounts from Merrill Lynch. Fast-track requested.',
      documents: [
        {
          id: 'doc-1',
          originalName: 'Merrill_Lynch_Brokerage_Statement.pdf',
          mimeType: 'application/pdf',
          size: 1048576,
          s3Url: '/api/compliance/documents/sample_statement.pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 2),
          extractedTextLength: 4200,
        },
        {
          id: 'doc-2',
          originalName: 'Drivers_License_CA_JohnDoe.pdf',
          mimeType: 'application/pdf',
          size: 524288,
          s3Url: '/api/compliance/documents/sample_id.pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 2),
          extractedTextLength: 1200,
        },
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
      registrationDetails: 'Perfect registration match across California Real ID and Merrill Lynch ACAT transfer statement.',
      portfolioRiskSummary: 'Transitioning $1.25M into Growth & Income strategy. Low beta, compliant with risk capacity.',
      sourceOfFundsSummary: 'Liquid funds originating from Merrill Lynch Cash & Security positions.',
      bucketScores: [
        {
          bucket: 'AML_IDENTITY',
          title: 'Bucket A: Identity & AML',
          status: ComplianceStatus.GREEN,
          summary: 'Government Issued ID verified. OFAC/PEP negative screen.',
          findings: ['California DMV Driver License matches legal name.', 'CIP Identity Score: 98/100.', 'No adverse media or watch-list matches.']
        },
        {
          bucket: 'REG_BI_SUITABILITY',
          title: 'Bucket B: Reg BI & Suitability',
          status: ComplianceStatus.GREEN,
          summary: 'Portfolio transition lowers client all-in fee by 45 bps.',
          findings: ['Product replacement analysis passed.', 'Liquidity needs (>5 years) align with proposed asset blend.']
        },
        {
          bucket: 'REQUIRED_DISCLOSURES',
          title: 'Bucket C: Required Disclosures',
          status: ComplianceStatus.GREEN,
          summary: 'Form CRS acknowledged electronically with valid timestamp.',
          findings: ['Form CRS Relationship Summary delivered.', 'LPL Disclosures signed via DocuSign.']
        },
        {
          bucket: 'VULNERABLE_ADULT',
          title: 'Bucket D: Vulnerable Adult Protection',
          status: ComplianceStatus.GREEN,
          summary: 'Client age 48. Trusted Contact Person designated on file.',
          findings: ['Primary trusted contact designated: Mary Doe (Spouse).', 'FINRA 2165 protocol recorded.']
        }
      ],
      flaggedAnomalies: [],
      dossierMarkdown: `# RegShield Compliance Synthesis Dossier
**Evaluation:** Real-time Bedrock AI Synthesis (Claude 3 Sonnet)  
**Client:** Johnathan Doe | **Account Type:** Individual Taxable  
**Advisor:** Sarah Jenkins (Apex Wealth Advisory)  
**Status:** **CLEARED FOR REVIEW**

---

### 1. Executive Summary
- **Risk Score:** 99/100 (Optimal Compliance)
- **Transferring Institution:** Merrill Lynch Wealth Management
- **Total Asset Value:** **$1,250,000.00**
- **Recommendation:** Back-office fast-track approval eligible.

---

### 2. Document & Entity Extraction
| Field | Driver's License | Competitor Statement | System Record | Match |
| :--- | :--- | :--- | :--- | :--- |
| **Full Legal Name** | Johnathan Doe | Johnathan Doe | Johnathan Doe | ✅ PASS |
| **Address** | 450 Newport Center Dr, Newport Beach, CA | 450 Newport Center Dr, Newport Beach, CA | 450 Newport Center Dr, Newport Beach, CA | ✅ PASS |
| **Account Registration** | Individual | Individual Brokerage | Individual | ✅ PASS |

---

### 3. Regulatory Review Buckets
- **Bucket A (Identity & AML):** State ID verified, SSN checked against CIP ledger.
- **Bucket B (Reg BI & Suitability):** Form CRS delivered; lower expense ratio achieved.
- **Bucket C (Required Disclosures):** Fee schedules and conflict disclosures signed.
- **Bucket D (Vulnerable Adult Protection):** Trusted contact recorded.

---
*Ready for 1-Click Back-Office Approval.*
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
      accountType: 'Joint',
      advisorName: 'Marcus Reynolds',
      advisorFirm: 'Pacific Horizon Financial',
      targetPortfolio: 'Capital Preservation & Dividend Income',
      estimatedAum: 875000,
      notes: 'Transferred statement lists Individual, but client selected Joint.',
      documents: [
        {
          id: 'doc-3',
          originalName: 'Schwab_Statement_Eleanor_Vance.pdf',
          mimeType: 'application/pdf',
          size: 891234,
          s3Url: '/api/compliance/documents/schwab_statement.pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 5),
          extractedTextLength: 3100,
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
      registrationDetails: 'Application specifies Joint Account, but uploaded Charles Schwab account statement reflects Individual ownership.',
      portfolioRiskSummary: 'Conservative allocation suitable for retirement phase.',
      sourceOfFundsSummary: 'Charles Schwab ACAT transfer.',
      bucketScores: [
        {
          bucket: 'AML_IDENTITY',
          title: 'Bucket A: Identity & AML',
          status: ComplianceStatus.GREEN,
          summary: 'ID Verified for Primary Applicant.',
          findings: ['Valid US Passport on file.', 'Zero OFAC sanctions hits.']
        },
        {
          bucket: 'REG_BI_SUITABILITY',
          title: 'Bucket B: Reg BI & Suitability',
          status: ComplianceStatus.YELLOW,
          summary: 'Registration discrepancy detected between statement and application form.',
          findings: ['Uploaded statement indicates Individual ownership.', 'Onboarding application marked Joint with WROS.', 'Co-owner signature form required.']
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
          summary: 'Client age is 72. Trusted Contact form pending secondary sign-off.',
          findings: ['Senior investor designation triggered FINRA 2165 checklist.', 'Trusted contact person authorization form sent to client.']
        }
      ],
      flaggedAnomalies: [
        'Registration Mismatch: Charles Schwab account statement is Single/Individual, whereas onboarding intake specifies Joint account.'
      ],
      dossierMarkdown: `# RegShield Compliance Synthesis Dossier
**Evaluation:** Real-time Bedrock AI Synthesis (Claude 3 Sonnet)  
**Client:** Eleanor Vance | **Account Type:** Joint (WROS)  
**Advisor:** Marcus Reynolds (Pacific Horizon Financial)  
**Status:** **ACTION REQUIRED / MANUAL CLARIFICATION NEEDED**

---

### 1. Executive Summary & Alert
- **Risk Score:** 84/100 (**Review Action Required**)
- **Anomaly Highlight:** The client application specifies a **Joint Account**, but the uploaded statement from **Charles Schwab** is registered solely as an **Individual Account**.
- **Recommended Remediation:** Trigger automated SMS/Email clarification for co-owner authorization.

---

### 2. Entity & Registration Verification
| Field | Schwab Statement | Intake Form | Audit Status |
| :--- | :--- | :--- | :--- |
| **Primary Account Holder** | Eleanor Vance | Eleanor Vance | ✅ MATCH |
| **Account Ownership** | Individual Ownership | Joint Tenants w/ Rights of Survivorship | ⚠️ **DISCREPANCY DETECTED** |
| **Secondary Signer** | None Listed | Arthur Vance (Spouse) | ⚠️ Missing Documentation |

---

### 3. Source of Funds
- **Liquid Portfolio Total:** $875,000.00
- **Target Allocation:** Capital Preservation & Dividend Income
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
    // Return newest first
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
    files: Express.Multer.File[]
  ): Promise<{ client: ClientEntity; review: ReviewEntity }> {
    const clientId = `client-${Date.now()}`;
    const uploadedDocs: DocumentMetadata[] = [];
    const extractedTexts: Array<{ fileName: string; text: string }> = [];

    for (const file of files) {
      const docId = `doc-${uuidv4().substring(0, 8)}`;
      let extractedText = '';

      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        try {
          const parsed = await (pdfParse as any)(file.buffer);
          extractedText = parsed.text || '';
        } catch (e) {
          this.logger.warn(`Could not parse text from PDF ${file.originalname}: ${e.message}`);
          extractedText = `PDF document uploaded: ${file.originalname}, size: ${file.size} bytes.`;
        }
      } else {
        extractedText = file.buffer.toString('utf-8');
      }

      const uploadResult = await this.s3Service.uploadFile(file, `clients/${clientId}`);

      uploadedDocs.push({
        id: docId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
        uploadedAt: new Date(),
        extractedTextLength: extractedText.length,
      });

      extractedTexts.push({
        fileName: file.originalname,
        text: extractedText,
      });
    }

    const client: ClientEntity = {
      id: clientId,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      accountType: dto.accountType,
      advisorName: dto.advisorName,
      advisorFirm: dto.advisorFirm || 'Independent Registered Advisor',
      targetPortfolio: dto.targetPortfolio,
      estimatedAum: dto.estimatedAum || 500000,
      notes: dto.notes,
      documents: uploadedDocs,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // AWS Bedrock AI Compliance synthesis
    const bedrockResult = await this.bedrockService.analyzeDocuments(
      {
        fullName: client.fullName,
        accountType: client.accountType,
        targetPortfolio: client.targetPortfolio,
        estimatedAum: client.estimatedAum,
        advisorName: client.advisorName,
      },
      extractedTexts
    );

    const initialOnboardingStatus =
      bedrockResult.overallStatus === ComplianceStatus.RED
        ? OnboardingStatus.ACTION_REQUIRED
        : bedrockResult.overallStatus === ComplianceStatus.YELLOW
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

    this.logger.log(`Remediation dispatched for ${client.fullName}: ${dto.message} via ${dto.channel}`);

    return {
      success: true,
      message: `Automated ${dto.channel} notification sent to ${client.fullName} and advisor ${client.advisorName}.`,
    };
  }
}
