# RegShield: Technical Architecture & Execution Plan

This document outlines the technical blueprint for the RegShield Compliance Dashboard. The architecture is designed to be modern, scalable, and tailored for a rapid hackathon execution while demonstrating enterprise-grade patterns (Domain-Driven Design, AWS integration).

## 1. High-Level System Architecture

The system follows a decoupled client-server model:
*   **Frontend (Client):** Next.js (React) application styled with Tailwind CSS.
*   **Backend (API & AI Gateway):** NestJS application implementing Domain-Driven Design (DDD).
*   **Cloud Infrastructure:** AWS (S3 for storage, Bedrock for AI processing).

### The Data Flow (The Demo Workflow)
1.  **Advisor Client:** The advisor uploads a PDF and submits client details via the Next.js portal.
2.  **API Gateway:** The Next.js app sends the file and metadata to the NestJS backend via a REST/Multipart endpoint.
3.  **Storage:** NestJS temporarily securely stores the raw documents in an **Amazon S3** bucket (using `@aws-sdk/client-s3`).
4.  **AI Processing:** NestJS orchestrates an API call to **Amazon Bedrock** (using `@aws-sdk/client-bedrock-runtime`). The prompt instructs Bedrock (e.g., Claude 3 Sonnet) to analyze the extracted text, perform compliance checks against the metadata, and generate a structured markdown/HTML summary.
5.  **Persistence:** The resulting compliance status (Green/Yellow/Red) and the Bedrock summary are saved to the backend database (e.g., PostgreSQL via Prisma or TypeORM).
6.  **Reviewer Client:** The Back-Office Reviewer opens the Next.js dashboard, fetching the compiled compliance data and rendering the Bedrock-generated summary.

---

## 2. Frontend Architecture (Next.js & Tailwind CSS)

We will use Next.js (App Router) to build the two distinct views required for the demo.

### Technology Stack
*   **Framework:** Next.js 14+ (React)
*   **Styling:** Tailwind CSS (for rapid, utility-first UI development)
*   **State Management:** React Hooks (`useState`, `useContext`) - *Keep it simple for the hackathon.*
*   **Data Fetching:** Native `fetch` API or React Query.

### Application Structure (Pages/Routes)
1.  `/advisor`: The entry point for the Advisor persona.
    *   **Components:** `UploadZone` (drag-and-drop file handler), `ClientDetailsForm`, `SubmissionStatusBadge`.
2.  `/reviewer`: The entry point for the Back-Office persona.
    *   **Components:** `ClientQueueSideNav` (list of pending/cleared clients).
3.  `/reviewer/[clientId]`: The main dashboard for reviewing a specific client.
    *   **Components:** `TrafficLightGrid` (the 4 compliance buckets), `BedrockDossierViewer` (renders the AI summary), `ActionCenter` (Approve/Reject buttons).

---

## 3. Backend Architecture (NestJS & Domain-Driven Design)

The backend will be built with NestJS, utilizing a simplified Domain-Driven Design (DDD) approach. This demonstrates architectural maturity to the judges.

### Core DDD Concepts Applied
*   **Bounded Context:** `ComplianceOnboarding`
*   **Entities:** `Client`, `ComplianceReview`, `Document`
*   **Value Objects:** `ComplianceStatus` (Green/Yellow/Red), `RiskScore`
*   **Domain Services:** `ComplianceEvaluationService` (contains the business logic for calculating the final status based on individual bucket scores).

### NestJS Project Structure (Simplified DDD)
```text
src/
├── app.module.ts
├── main.ts
└── modules/
    ├── aws-bedrock/                # Infrastructure Layer (AWS Integration)
    │   ├── bedrock.service.ts      # Wraps @aws-sdk/client-bedrock-runtime
    │   └── bedrock.module.ts
    ├── aws-s3/                     # Infrastructure Layer (AWS Integration)
    │   ├── s3.service.ts           # Wraps @aws-sdk/client-s3
    │   └── s3.module.ts
    └── compliance/                 # Domain Layer (The Core Business Logic)
        ├── compliance.controller.ts# Presentation Layer (API Endpoints)
        ├── compliance.service.ts   # Application Service (Orchestrates flow)
        ├── compliance.module.ts
        ├── domain/
        │   ├── entities/           # Client.entity.ts, Review.entity.ts
        │   └── value-objects/      # Status.vo.ts
        └── dto/                    # Data Transfer Objects (UploadRequest.dto.ts)
```

---

## 4. AWS Integration Strategy

### 1. Amazon S3 (Document Storage)
*   **Package:** `@aws-sdk/client-s3`
*   **Implementation:** The `S3Service` in NestJS will handle `PutObjectCommand` to securely store the uploaded PDFs. For the hackathon, we will store them temporarily and generate Pre-signed URLs if the frontend needs to render the raw PDF.

### 2. Amazon Bedrock (The AI Engine)
*   **Package:** `@aws-sdk/client-bedrock-runtime`
*   **Model:** Anthropic Claude 3 Sonnet (or Haiku for faster response times).
*   **Implementation:** The `BedrockService` in NestJS will handle the `InvokeModelCommand`. 
*   **The Prompt Strategy:** 
    *   We will extract the text from the uploaded PDFs (either via a simple library like `pdf-parse` in Node.js before sending to Bedrock, or if using a multimodal model, passing the document directly).
    *   The prompt will be highly structured: *"You are an LPL Compliance Officer. Compare the provided client metadata (JSON) against the extracted text from the attached PDF statement. Output a JSON object containing: 1. A boolean flag for Registration Mismatch. 2. A 3-sentence summary of the account holdings. 3. A Markdown-formatted dossier highlighting any risks."*

## 5. Hackathon Execution Phases

*   **Phase 1: Scaffold (Hours 1-2)**
    *   Initialize Next.js and NestJS projects.
    *   Configure Tailwind CSS.
    *   Set up AWS credentials locally.
*   **Phase 2: The UI Shell (Hours 2-5)**
    *   Build the `/advisor` upload screen.
    *   Build the hardcoded `/reviewer` dashboard (Traffic Lights, UI layout).
*   **Phase 3: The AWS Brains (Hours 5-10)**
    *   Implement NestJS file upload to S3.
    *   Craft the Bedrock prompt and implement the `InvokeModel` call.
    *   Connect the NestJS output to the Next.js dashboard.
*   **Phase 4: Polish & Pitch (Hours 10-12)**
    *   Refine the Bedrock output so it looks beautiful in the `BedrockDossierViewer`.
    *   Ensure the "Approve" button triggers the "Cleared to Fund" state seamlessly.