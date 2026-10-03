import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { z } from 'zod'
import { Flag, SpeakerRole, type OverallRisk, type Severity, type TranscriptTurn } from '@transcribe/shared'
import { formatForModel } from './transcript'

export type AnalysisMode = 'full' | 'live'

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in server/.env`)
  return value
}

const bedrock = new BedrockRuntimeClient({ region: env('AWS_REGION') })
const modelIds: Record<AnalysisMode, string> = {
  full: env('BEDROCK_MODEL_ID'),
  live: env('BEDROCK_LIVE_MODEL_ID'),
}

const rules = await Bun.file(new URL('../rules/rules.md', import.meta.url)).text()

// Each rule's "- **Nudge:**" line, keyed by rule ID. Live mode shows these to the advisor.
export const ruleNudges: Record<string, string> = Object.fromEntries(
  rules.split(/^## /m).flatMap((section) => {
    const id = section.match(/^(R\d+):/)?.[1]
    const nudge = section.match(/^- \*\*Nudge:\*\* (.+)$/m)?.[1]
    return id && nudge ? [[id, nudge.trim()]] : []
  }),
)

// What the model fills in. quoteVerified is left out: our code sets it, never the model.
const ModelOutput = z.object({
  speakerRoles: z.record(z.string(), SpeakerRole).describe('Map each speaker label to a role, e.g. {"spk_0": "advisor"}'),
  flags: z.array(Flag.omit({ quoteVerified: true })).describe('Empty array if there are no real concerns'),
  summary: z.string().describe('Neutral, factual meeting notes. No PII, no compliance opinions. Empty string in live mode.'),
  actionItems: z.array(z.string()).describe('Agreed next steps. Empty array in live mode.'),
})

export type AnalysisResult = z.infer<typeof ModelOutput> & { flags: Flag[]; overallRisk: OverallRisk }

const TOOL_NAME = 'report_compliance_review'
const { $schema: _, ...toolSchema } = z.toJSONSchema(ModelOutput)

const COMMON_INSTRUCTIONS = `You review financial advisor meetings for compliance, using the rules below.

- Flag only real concerns. Compliant disclaimers and the "Do NOT flag" examples are not violations.
- Pay attention to who is speaking. A rule that applies to the advisor is not broken by the client.
- Copy every quote exactly as it appears in the transcript, as a short phrase from a single line.
- Set timestampSeconds to the time of the line you quote (convert mm:ss to seconds).
- Never guess redacted information ([PII], [NAME], [PHONE], ...).
- Work out which speaker label is the advisor and which is the client.
- Use the rule's default severity unless the rule says otherwise.
- Record your answer by calling the ${TOOL_NAME} tool.`

const MODE_INSTRUCTIONS: Record<AnalysisMode, string> = {
  full: `This is the full meeting. Also write a neutral, factual summary of the meeting with the next steps as action items. The summary must contain no personal information and no compliance opinions.`,
  live: `This is a short, recent window of a meeting still in progress. Only flag clear problems in this window. Leave summary empty and actionItems empty.`,
}

// Sends the redacted transcript to Bedrock and returns verified, sorted flags plus the summary.
// Only pass redacted turns: this text leaves our system.
export async function analyzeTranscript(turns: TranscriptTurn[], mode: AnalysisMode): Promise<AnalysisResult> {
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: modelIds[mode],
      system: [{ text: `${COMMON_INSTRUCTIONS}\n\n${MODE_INSTRUCTIONS[mode]}\n\n${rules}` }],
      messages: [{ role: 'user', content: [{ text: `Transcript:\n\n${formatForModel(turns)}` }] }],
      // No temperature: Sonnet 5 rejects sampling params. Forced tool + schema validation instead.
      toolConfig: {
        tools: [{ toolSpec: { name: TOOL_NAME, inputSchema: { json: toolSchema as never } } }],
        toolChoice: { tool: { name: TOOL_NAME } },
      },
    }),
  )

  const toolUse = response.output?.message?.content?.find((block) => block.toolUse)?.toolUse
  if (!toolUse) throw new Error(`Model did not call ${TOOL_NAME} (stopReason: ${response.stopReason})`)
  const parsed = ModelOutput.safeParse(toolUse.input)
  if (!parsed.success) {
    throw new Error(`Invalid ${TOOL_NAME} input: ${z.prettifyError(parsed.error)}\n${JSON.stringify(toolUse.input, null, 2)}`)
  }
  const output = parsed.data

  const flags = output.flags.map((flag) => verifyQuote(flag, turns)).sort(bySeverityThenTime)
  return { ...output, flags, overallRisk: overallRisk(flags) }
}

// Checks the quote really appears in the transcript. When it does, the timestamp is taken from
// the matching turn rather than trusted from the model.
export function verifyQuote(flag: Omit<Flag, 'quoteVerified'>, turns: TranscriptTurn[]): Flag {
  const quote = normalize(flag.quote)
  const turn = quote ? turns.find((t) => normalize(t.text).includes(quote)) : undefined
  return turn ? { ...flag, timestampSeconds: turn.start, quoteVerified: true } : { ...flag, quoteVerified: false }
}

// Lowercase, no punctuation, single spaces. Transcribe writes "can not" as "cannot".
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bcan not\b/g, 'cannot')
    .trim()
}

const severityRank: Record<Severity, number> = { high: 3, medium: 2, low: 1 }

function bySeverityThenTime(a: Flag, b: Flag): number {
  return severityRank[b.severity] - severityRank[a.severity] || a.timestampSeconds - b.timestampSeconds
}

// "none" only when there are no flags; otherwise the most severe flag's level.
export function overallRisk(flags: Flag[]): OverallRisk {
  return flags.reduce<OverallRisk>((risk, f) => (risk === 'none' || severityRank[f.severity] > severityRank[risk] ? f.severity : risk), 'none')
}
