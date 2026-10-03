import type { Server } from 'node:http'
import { StartStreamTranscriptionCommand, TranscribeStreamingClient } from '@aws-sdk/client-transcribe-streaming'
import { WebSocket, WebSocketServer, type RawData } from 'ws'
import {
  LiveClientMessage,
  type LiveAlert,
  type LiveServerMessage,
  type ReviewRecord,
  type TranscriptTurn,
} from '@transcribe/shared'
import { analyzeTranscript, normalize, ruleNudges } from './analysis'
import { analyzeAndSave, markFailed } from './pipeline'
import { auditEvent, createReview, updateReview } from './store'
import { turnsFromStreamItems } from './transcript'
import { uploadToArchive } from './transcription'
import { wavFromPcm } from './wav'

const SAMPLE_RATE = 16000 // matches the browser worklet and the archived WAV
const CHECK_INTERVAL_MS = 30_000
const CONTEXT_TURNS = 3 // earlier turns sent with each live check, so the model sees who's who
const SYSTEM = 'system'

const streaming = new TranscribeStreamingClient({ region: process.env.AWS_REGION })

type StartMessage = Extract<LiveClientMessage, { type: 'start' }>
type Send = (message: LiveServerMessage) => void

// Live meetings: the browser sends a JSON start message, then binary PCM audio, then stop.
export function attachLive(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/api/live' })
  wss.on('connection', handleConnection)
}

function handleConnection(ws: WebSocket): void {
  let audio: AudioQueue | undefined
  const send: Send = (message) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
  }

  ws.on('message', (data, isBinary) => {
    if (isBinary) return void audio?.push(toBytes(data))

    const parsed = LiveClientMessage.safeParse(safeJson(data.toString()))
    if (!parsed.success) return send({ type: 'error', message: 'Unrecognized message' })

    if (parsed.data.type === 'stop') return audio?.close()
    if (audio) return send({ type: 'error', message: 'This meeting has already started' })
    audio = new AudioQueue()
    runMeeting(parsed.data, audio, send).finally(() => ws.close())
  })

  // A dropped connection ends the meeting the same way as stop: archive and analyze what we have.
  ws.on('close', () => audio?.close())
}

async function runMeeting(start: StartMessage, audio: AudioQueue, send: Send): Promise<void> {
  const meetingId = crypto.randomUUID()
  const consentNote = `Client consent to record confirmed by ${start.createdBy} at meeting start`
  const now = new Date().toISOString()

  const record: ReviewRecord = {
    meetingId,
    mode: 'live',
    title: start.title,
    createdAt: now,
    createdBy: start.createdBy,
    consentNote,
    status: 'live',
    overallRisk: 'none',
    speakerRoles: {},
    transcript: [],
    flags: [],
    liveAlerts: [],
    actionItems: [],
    summaryStatus: 'draft',
    audit: [auditEvent(start.createdBy, 'consent_confirmed', consentNote), auditEvent(start.createdBy, 'meeting_started')],
  }
  try {
    await createReview(record)
  } catch (error) {
    console.error('Could not create live meeting:', error)
    audio.close()
    return send({ type: 'error', message: 'Could not start the meeting. Try again.' })
  }
  send({ type: 'session_started', meetingId })

  const turns: TranscriptTurn[] = []
  const alerts: LiveAlert[] = []
  let checkedUpTo = 0
  let check: Promise<void> | undefined

  // One live check at a time; a cycle is skipped while the previous one is still running.
  const timer = setInterval(() => {
    if (check || turns.length === checkedUpTo) return
    const window = turns.slice(Math.max(0, checkedUpTo - CONTEXT_TURNS))
    checkedUpTo = turns.length
    check = liveCheck(meetingId, window, turns, alerts, send)
      .catch((error) => console.error(`Live check failed for ${meetingId}:`, error))
      .finally(() => (check = undefined))
  }, CHECK_INTERVAL_MS)

  try {
    const response = await streaming.send(
      new StartStreamTranscriptionCommand({
        LanguageCode: 'en-US',
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: SAMPLE_RATE,
        ShowSpeakerLabel: true,
        ContentRedactionType: 'PII',
        AudioStream: audio.events(),
      }),
    )
    for await (const event of response.TranscriptResultStream!) {
      for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
        if (result.IsPartial) continue // partial results are not redacted
        for (const turn of turnsFromStreamItems(result.Alternatives?.[0]?.Items ?? [])) {
          turns.push(turn)
          send({ type: 'caption', turn })
        }
      }
    }
  } catch (error) {
    console.error(`Live transcription failed for ${meetingId}:`, error)
    send({ type: 'error', message: 'Live transcription stopped. Ending the meeting and saving what was captured.' })
  } finally {
    clearInterval(timer)
    audio.close()
    await check
  }

  try {
    const pcm = audio.recorded()
    const archiveKey = await uploadToArchive(meetingId, 'meeting.wav', wavFromPcm(pcm, SAMPLE_RATE))
    const seconds = Math.round(pcm.length / (SAMPLE_RATE * 2))
    await updateReview(
      meetingId,
      { archiveKey, transcript: turns, status: 'analyzing' },
      auditEvent(start.createdBy, 'meeting_ended', `${seconds}s of audio, ${turns.length} transcript turns`),
    )
    if (turns.length) await analyzeAndSave(meetingId, turns)
    else await markFailed(meetingId, new Error('No speech was transcribed'))
  } catch (error) {
    await markFailed(meetingId, error)
  }
  send({ type: 'meeting_complete', meetingId })
}

// Quick check of the recent transcript. New, verified issues become nudges for the advisor.
async function liveCheck(meetingId: string, window: TranscriptTurn[], turns: TranscriptTurn[], alerts: LiveAlert[], send: Send) {
  const result = await analyzeTranscript(window, 'live')
  for (const flag of result.flags) {
    if (!flag.quoteVerified) continue // never nudge on a quote that wasn't actually said
    if (alerts.some((a) => a.ruleId === flag.ruleId && similarQuote(a.quote, flag.quote))) continue

    const alert: LiveAlert = {
      ruleId: flag.ruleId,
      nudge: ruleNudges[flag.ruleId] ?? flag.suggestedAction,
      quote: flag.quote,
      timestampSeconds: flag.timestampSeconds,
      shownAt: new Date().toISOString(),
    }
    alerts.push(alert)
    send({ type: 'live_alert', alert })
    await updateReview(meetingId, { liveAlerts: alerts, transcript: turns }, auditEvent(SYSTEM, 'live_alert_shown', `${alert.ruleId}: "${alert.quote}"`))
  }
}

function similarQuote(a: string, b: string): boolean {
  const [x, y] = [normalize(a), normalize(b)]
  return x.includes(y) || y.includes(x)
}

// Audio chunks from the browser: fed to Transcribe as they arrive, and kept for the archive WAV.
class AudioQueue {
  private pending: Uint8Array[] = []
  private all: Uint8Array[] = []
  private closed = false
  private wake?: () => void

  push(chunk: Uint8Array): void {
    if (this.closed) return
    this.pending.push(chunk)
    this.all.push(chunk)
    this.wake?.()
  }

  close(): void {
    this.closed = true
    this.wake?.()
  }

  recorded(): Uint8Array {
    return Buffer.concat(this.all)
  }

  async *events() {
    while (true) {
      const chunk = this.pending.shift()
      if (chunk) yield { AudioEvent: { AudioChunk: chunk } }
      else if (this.closed) return
      else await new Promise<void>((resolve) => (this.wake = resolve))
    }
  }
}

function toBytes(data: RawData): Uint8Array {
  return Array.isArray(data) ? Buffer.concat(data) : new Uint8Array(data as ArrayBuffer)
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
