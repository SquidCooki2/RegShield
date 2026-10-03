import { z } from 'zod'

// Review record shapes (AGENT_CONTEXT.md section 7). One record per meeting, stored in DynamoDB.

export const MeetingMode = z.enum(['recorded', 'live'])

export const ReviewStatus = z.enum([
  'uploaded',
  'transcribing',
  'live',
  'analyzing',
  'needs_review',
  'no_issues',
  'approved',
  'escalated',
  'failed', // transcription or analysis errored; see the audit log
])

export const Severity = z.enum(['low', 'medium', 'high'])

// "none" only when there are no flags; otherwise never lower than the most severe flag.
export const OverallRisk = z.enum(['none', 'low', 'medium', 'high'])

export const SpeakerRole = z.enum(['advisor', 'client', 'third_party'])

export const SummaryStatus = z.enum(['draft', 'sent_to_crm'])

export const RuleId = z.string().regex(/^R\d+$/)

// One continuous stretch of one speaker. Text is always the redacted version.
// In live mode, times are measured from the start of the stream (matches the archived WAV).
export const TranscriptTurn = z.object({
  speaker: z.string(), // Transcribe label, e.g. "spk_0"
  start: z.number().nonnegative(), // seconds
  end: z.number().nonnegative(), // seconds
  text: z.string(),
})

export const Flag = z.object({
  ruleId: RuleId,
  ruleName: z.string(),
  severity: Severity,
  speakerRole: SpeakerRole,
  quote: z.string(),
  timestampSeconds: z.number().nonnegative(),
  explanation: z.string(),
  suggestedAction: z.string(),
  // Set by our code after checking the quote against the transcript, never by the model.
  quoteVerified: z.boolean(),
})

// Live-mode coaching shown to the advisor. Not a compliance decision.
export const LiveAlert = z.object({
  ruleId: RuleId,
  nudge: z.string(),
  quote: z.string(),
  timestampSeconds: z.number().nonnegative(),
  shownAt: z.iso.datetime(),
})

export const AuditAction = z.enum([
  'consent_confirmed',
  'uploaded',
  'meeting_started',
  'meeting_ended',
  'transcribing',
  'transcribed',
  'live_alert_shown',
  'analyzed',
  'approved',
  'escalated',
  'summary_edited',
  'sent_to_crm',
  'failed',
])

export const AuditEvent = z.object({
  at: z.iso.datetime(),
  actor: z.string(), // person's name, or "system"
  action: AuditAction,
  note: z.string().optional(),
})

export const ReviewRecord = z.object({
  meetingId: z.string(),
  mode: MeetingMode,
  title: z.string(),
  createdAt: z.iso.datetime(),
  createdBy: z.string(),
  archiveKey: z.string().optional(), // set at upload (recorded) or at End meeting (live)
  consentNote: z.string(),

  status: ReviewStatus,
  overallRisk: OverallRisk,

  speakerRoles: z.record(z.string(), SpeakerRole), // e.g. { spk_0: "advisor", spk_1: "client" }
  transcript: z.array(TranscriptTurn),
  flags: z.array(Flag),
  liveAlerts: z.array(LiveAlert),

  summary: z.string().optional(),
  actionItems: z.array(z.string()),
  summaryStatus: SummaryStatus,

  audit: z.array(AuditEvent),
})

// Live-mode WebSocket messages (/api/live). Audio is sent as binary messages, not JSON:
// 16 kHz, 16-bit little-endian, mono PCM, roughly 100 ms per message.
export const LiveClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), title: z.string().min(1), createdBy: z.string().min(1), consent: z.literal(true) }),
  z.object({ type: z.literal('stop') }),
])

export const LiveServerMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session_started'), meetingId: z.string() }),
  z.object({ type: z.literal('caption'), turn: TranscriptTurn }), // final, redacted segments only
  z.object({ type: z.literal('live_alert'), alert: LiveAlert }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('meeting_complete'), meetingId: z.string() }),
])

export type MeetingMode = z.infer<typeof MeetingMode>
export type ReviewStatus = z.infer<typeof ReviewStatus>
export type Severity = z.infer<typeof Severity>
export type OverallRisk = z.infer<typeof OverallRisk>
export type SpeakerRole = z.infer<typeof SpeakerRole>
export type SummaryStatus = z.infer<typeof SummaryStatus>
export type TranscriptTurn = z.infer<typeof TranscriptTurn>
export type Flag = z.infer<typeof Flag>
export type LiveAlert = z.infer<typeof LiveAlert>
export type AuditAction = z.infer<typeof AuditAction>
export type AuditEvent = z.infer<typeof AuditEvent>
export type ReviewRecord = z.infer<typeof ReviewRecord>
export type LiveClientMessage = z.infer<typeof LiveClientMessage>
export type LiveServerMessage = z.infer<typeof LiveServerMessage>
