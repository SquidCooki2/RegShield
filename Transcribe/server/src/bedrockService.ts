import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { ComplianceCheckResult } from "./types";

const region = process.env.AWS_REGION || "us-east-1";
const modelId =
  process.env.BEDROCK_MODEL_ID ||
  "anthropic.claude-3-sonnet-20240229-v1:0";

const bedrock = new BedrockRuntimeClient({ region });

function analyzeWithHeuristics(
  transcript: string
): ComplianceCheckResult {
  const flags: ComplianceCheckResult["flags"] = [];
  let score = 5;

  const rules = [
    {
      pattern: /\b(guarantee[d]?|can't lose|risk-free|100% safe)\b/i,
      category: "Potential misleading guarantee",
      violation: "Promissory or guaranteed-return language detected.",
      severity: "CRITICAL" as const,
      points: 45,
    },
    {
      pattern: /\b(\d+%\s*(return|gain|profit)|double your money)\b/i,
      category: "Potential performance claim",
      violation: "Specific investment performance claim detected.",
      severity: "HIGH" as const,
      points: 30,
    },
    {
      pattern:
        /\b(my side business|private crypto fund|outside investment|don't tell compliance)\b/i,
      category: "Potential outside business activity",
      violation: "Possible undisclosed outside business activity.",
      severity: "CRITICAL" as const,
      points: 40,
    },
    {
      pattern:
        /\b(structuring|offshore wire|avoid reporting|cash deposit)\b/i,
      category: "Potential AML concern",
      violation: "Potential money-laundering or reporting-evasion language.",
      severity: "CRITICAL" as const,
      points: 45,
    },
  ];

  for (const rule of rules) {
    const match = transcript.match(rule.pattern);

    if (match) {
      flags.push({
        category: rule.category,
        quote: match[0],
        violation: rule.violation,
        severity: rule.severity,
        recommendation: "Flag for compliance officer review.",
      });

      score += rule.points;
    }
  }

  const redactedTranscript = transcript
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED SSN]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[REDACTED PHONE]")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[REDACTED EMAIL]"
    );

  score = Math.min(score, 100);

  const riskLevel =
    score > 70
      ? "CRITICAL"
      : score > 40
      ? "HIGH"
      : score > 15
      ? "MEDIUM"
      : "LOW";

  return {
    riskScore: score,
    riskLevel,
    flags,
    redactedTranscript,
    crmSummary: {
      clientGoals: "Review client goals discussed in meeting.",
      discussedProducts: [],
      disclosuresMade: /disclos/i.test(transcript),
      outsideBusinessMentions: [],
      actionItems: ["Review flagged items with compliance officer."],
    },
  };
}

export async function analyzeTranscriptWithBedrock(
  transcript: string
): Promise<ComplianceCheckResult> {
  if (!transcript?.trim()) {
    throw new Error("Transcript is required");
  }

  const prompt = `
Analyze this financial-advisor meeting transcript for potential compliance issues.

Look for:
- Guaranteed or misleading performance claims
- Potential outside business activities
- Potential AML concerns
- Missing disclosures
- Sensitive personal information

Return ONLY valid JSON using this structure:

{
  "riskScore": 0,
  "riskLevel": "LOW",
  "flags": [],
  "redactedTranscript": "",
  "crmSummary": {
    "clientGoals": "",
    "discussedProducts": [],
    "disclosuresMade": false,
    "outsideBusinessMentions": [],
    "actionItems": []
  }
}

Transcript:
${transcript}
`;

  try {
    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      })
    );

    const decoded = new TextDecoder().decode(response.body);
    const result = JSON.parse(decoded);
    const text = result.content?.[0]?.text;

    if (!text) throw new Error("Empty Bedrock response");

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) throw new Error("Invalid JSON from Bedrock");

    return JSON.parse(match[0]) as ComplianceCheckResult;
  } catch (error) {
    console.warn("Bedrock failed, using local analysis:", error);
    return analyzeWithHeuristics(transcript);
  }
}