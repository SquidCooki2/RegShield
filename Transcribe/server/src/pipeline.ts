import type { ReviewRecord, TranscriptTurn } from '@transcribe/shared'
import { analyzeTranscript } from './analysis'
import { auditEvent, createReview, updateReview } from './store'
import { parseTranscribeOutput } from './transcript'
import { fetchRedactedTranscript, startTranscription, uploadToArchive, waitForTranscription } from './transcription'

// File types Transcribe batch accepts (its MediaFormat values).
export const AUDIO_EXTENSIONS = ['mp3', 'mp4', 'wav', 'flac', 'ogg', 'amr', 'webm', 'm4a']

const SYSTEM = 'system'

interface NewRecording {
  title: string
  fileName: string
  createdBy: string
  consentNote: string
  audio: Uint8Array
}

// Creates the review record and archives the original before returning, so the caller knows the
// recording is safe. Transcription and analysis continue in the background (see processRecording).
export async function startRecordedMeeting(input: NewRecording): Promise<string> {
  const meetingId = crypto.randomUUID()
  const now = new Date().toISOString()

  const record: ReviewRecord = {
    meetingId,
    mode: 'recorded',
    title: input.title,
    createdAt: now,
    createdBy: input.createdBy,
    consentNote: input.consentNote,
    status: 'uploaded',
    overallRisk: 'none',
    speakerRoles: {},
    transcript: [],
    flags: [],
    liveAlerts: [],
    actionItems: [],
    summaryStatus: 'draft',
    audit: [auditEvent(input.createdBy, 'consent_confirmed', input.consentNote)],
  }
  await createReview(record)

  try {
    const archiveKey = await uploadToArchive(meetingId, input.fileName, input.audio)
    await updateReview(meetingId, { archiveKey }, auditEvent(input.createdBy, 'uploaded', input.fileName))
    processRecording(meetingId, archiveKey).catch((error) => markFailed(meetingId, error))
  } catch (error) {
    await markFailed(meetingId, error)
    throw error
  }
  return meetingId
}

export async function markFailed(meetingId: string, error: unknown): Promise<void> {
  console.error(`Meeting ${meetingId} failed:`, error)
  const message = error instanceof Error ? error.message : String(error)
  await updateReview(meetingId, { status: 'failed' }, auditEvent(SYSTEM, 'failed', message)).catch(console.error)
}

async function processRecording(meetingId: string, archiveKey: string): Promise<void> {
  const jobName = await startTranscription(meetingId, archiveKey)
  await updateReview(meetingId, { status: 'transcribing' }, auditEvent(SYSTEM, 'transcribing', jobName))

  const job = await waitForTranscription(jobName)
  const transcript = parseTranscribeOutput(await fetchRedactedTranscript(job))
  await updateReview(meetingId, { status: 'analyzing', transcript }, auditEvent(SYSTEM, 'transcribed'))

  await analyzeAndSave(meetingId, transcript)
}

// Full analysis of a finished transcript (recorded or live); the authoritative result for review.
export async function analyzeAndSave(meetingId: string, transcript: TranscriptTurn[]): Promise<void> {
  const result = await analyzeTranscript(transcript, 'full')
  await updateReview(
    meetingId,
    {
      status: result.flags.length ? 'needs_review' : 'no_issues',
      overallRisk: result.overallRisk,
      flags: result.flags,
      speakerRoles: result.speakerRoles,
      summary: result.summary,
      actionItems: result.actionItems,
    },
    auditEvent(SYSTEM, 'analyzed', `${result.flags.length} flag(s), overall risk ${result.overallRisk}`),
  )
}
