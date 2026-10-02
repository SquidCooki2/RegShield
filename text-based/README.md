# RegShield: Autonomous AI Compliance Platform

RegShield is an AI-powered compliance platform that bridges the gap between independent wealth advisors and LPL's back-office compliance principals. 

Built according to the PRD and Technical Architecture blueprints in `docs/`:
- **Frontend:** Next.js (App Router), Tailwind CSS, Lucide Icons, React Markdown.
- **Backend:** NestJS implementing simplified Domain-Driven Design (DDD), S3 Storage integration, and AWS Bedrock AI Compliance Engine.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- npm

---

### 2. Backend Setup & Startup

```bash
cd text-based/backend
npm install
npm run start:dev
```
The NestJS API will be live on `http://localhost:3001/api`.

*(Optional: Configure `.env` in `text-based/backend` with your AWS Bedrock & S3 credentials if using live AWS infrastructure; otherwise, the built-in AI synthesizer runs automatically).*

---

### 3. Frontend Setup & Startup

```bash
cd text-based/frontend
npm install
npm run dev
```
The Next.js App will be live on `http://localhost:3000`.

---

## 🎬 Hackathon MVP Demo Walkthrough

1. **Start as the Advisor (`/advisor`):**
   - Click **"Load Clean Demo (John Doe)"** or drag and drop any brokerage statement PDF / ID.
   - Click **"Submit Client to Compliance Back-Office"**.
   - Watch the AI processing step synthesize the documents.
2. **Switch to Back-Office Reviewer (`/reviewer`):**
   - See the prioritized compliance queue.
   - Inspect the **Split-Screen Dashboard**:
     - **Left Side:** Interactive AI-generated **Compliance Dossier** summarizing source of funds, entity matching, and portfolio risk.
     - **Right Side:** **4-Bucket Regulatory Audit Grid** (AML/Identity, Reg BI, Disclosures, Vulnerable Adult) scored Green/Yellow/Red.
3. **Execute Decisions:**
   - Click **"Approve & Clear"** &rarr; witness the instant **"Cleared to Fund"** status badge.
   - Test the Anomaly case with **"Load Anomaly Demo"** to demonstrate automated remediation notifications (SMS/Email) for registration mismatches.
