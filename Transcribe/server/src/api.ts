import express, { type ErrorRequestHandler, type Response } from 'express'
import { z } from 'zod'
import type { OverallRisk, ReviewRecord, ReviewStatus } from '@transcribe/shared'
import { AUDIO_EXTENSIONS, startRecordedMeeting } from './pipeline'
import { auditEvent, getReview, listReviews, updateReview } from './store'
import { archiveAudioUrl } from './transcription'

export const api = express.Router()

// Statuses where analysis has finished, so the summary exists and can be edited or sent.
const ANALYZED: ReviewStatus[] = ['needs_review', 'no_issues', 'approved', 'escalated']

// Upload a recording. The audio file is the raw request body (fetch(url, { body: file })); the rest
// goes in the query string. Responds once the original is archived; transcription and analysis
// continue in the background, so poll GET /api/meetings/:id for status.
const UploadQuery = z.object({
  title: z.string().trim().min(1, 'Enter a meeting title'),
  fileName: z
    .string()
    .refine((name) => AUDIO_EXTENSIONS.includes(name.split('.').pop()!.toLowerCase()), `File must be one of: ${AUDIO_EXTENSIONS.join(', ')}`),
  createdBy: z.string().trim().min(1, 'Enter your name'),
  consent: z.literal('true', 'Confirm the client consented to recording'),
})

api.post('/meetings', express.raw({ type: () => true, limit: '200mb' }), async (req, res) => {
  const query = UploadQuery.parse(req.query)
  if (!Buffer.isBuffer(req.body) || !req.body.length) return void res.status(400).json({ error: 'Send the audio file as the request body' })

  const meetingId = await startRecordedMeeting({
    title: query.title,
    fileName: query.fileName.replace(/[^\w.-]/g, '_'),
    createdBy: query.createdBy,
    consentNote: `Client consent to record confirmed by ${query.createdBy} at upload`,
    audio: new Uint8Array(req.body),
  })
  res.status(202).json({ meetingId })
})

const riskRank: Record<OverallRisk, number> = { high: 3, medium: 2, low: 1, none: 0 }

// All meetings, most severe first, then newest first. The client filters by status.
api.get('/meetings', async (_req, res) => {
  const reviews = await listReviews()
  reviews.sort((a, b) => riskRank[b.overallRisk] - riskRank[a.overallRisk] || b.createdAt.localeCompare(a.createdAt))
  res.json(
    reviews.map((r) => ({
      meetingId: r.meetingId,
      mode: r.mode,
      title: r.title,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      status: r.status,
      overallRisk: r.overallRisk,
      flagCount: r.flags.length,
      summaryStatus: r.summaryStatus,
    })),
  )
})

api.get('/meetings/:id', async (req, res) => {
  const review = await findReview(req.params.id, res)
  if (!review) return
  const audioUrl = review.archiveKey ? await archiveAudioUrl(review.archiveKey) : undefined
  res.json({ ...review, audioUrl })
})

// The redacted transcript, one entry per speaker turn, with the speaker roles the analysis assigned.
api.get('/meetings/:id/transcript', async (req, res) => {
  const review = await findReview(req.params.id, res)
  if (!review) return
  if (review.status === 'uploaded' || review.status === 'transcribing') {
    return void res.status(409).json({ error: 'This meeting is still being transcribed. Try again shortly.' })
  }
  const { meetingId, title, status, speakerRoles, transcript } = review
  res.json({ meetingId, title, status, speakerRoles, transcript })
})

const ReviewerAction = z.object({ actor: z.string().trim().min(1, 'Enter your name'), note: z.string().optional() })

for (const [path, status] of [['approve', 'approved'], ['escalate', 'escalated']] as const) {
  api.post(`/meetings/:id/${path}`, async (req, res) => {
    const { actor, note } = ReviewerAction.parse(req.body)
    if (!(await findReview(req.params.id, res))) return
    res.json(await updateReview(req.params.id, { status }, auditEvent(actor, status, note), ['needs_review']))
  })
}

const SummaryEdit = z.object({
  actor: z.string().trim().min(1, 'Enter your name'),
  summary: z.string(),
  actionItems: z.array(z.string()),
})

api.patch('/meetings/:id/summary', async (req, res) => {
  const { actor, summary, actionItems } = SummaryEdit.parse(req.body)
  const review = await findReview(req.params.id, res)
  if (!review || !draftSummary(review, res)) return
  res.json(await updateReview(review.meetingId, { summary, actionItems }, auditEvent(actor, 'summary_edited'), ANALYZED))
})

// Mock CRM: logs the summary instead of calling a real system.
api.post('/meetings/:id/send-to-crm', async (req, res) => {
  const { actor } = ReviewerAction.parse(req.body)
  const review = await findReview(req.params.id, res)
  if (!review || !draftSummary(review, res)) return
  console.log(`[mock CRM] ${review.title}: ${review.summary}`)
  res.json(await updateReview(review.meetingId, { summaryStatus: 'sent_to_crm' }, auditEvent(actor, 'sent_to_crm'), ANALYZED))
})

async function findReview(meetingId: string, res: Response): Promise<ReviewRecord | undefined> {
  const review = await getReview(meetingId)
  if (!review) res.status(404).json({ error: `No meeting with ID ${meetingId}` })
  return review
}

function draftSummary(review: ReviewRecord, res: Response): boolean {
  if (review.summaryStatus === 'draft') return true
  res.status(409).json({ error: 'This summary was already sent to the CRM and can no longer change' })
  return false
}

export const apiErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof z.ZodError) return void res.status(400).json({ error: z.prettifyError(error) })
  if (error?.name === 'ConditionalCheckFailedException') {
    return void res.status(409).json({ error: "This meeting isn't in a state that allows that action. Refresh to see its current status." })
  }
  console.error(error)
  res.status(error?.status ?? 500).json({ error: error?.message ?? 'Something went wrong' })
}
