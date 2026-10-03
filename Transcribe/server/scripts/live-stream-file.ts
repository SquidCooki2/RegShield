// Milestone 7a: runs a live meeting from a file, exactly as the browser does, so live mode can be
// tested without anyone talking. Streams a 16 kHz mono PCM WAV to /api/live in 100 ms chunks at
// real-time pace, prints captions and nudges, then ends the meeting and waits for the full analysis.
// Usage (from server/, with the server running): bun scripts/live-stream-file.ts ../test-data/audio/demo-guarantee.wav

import { basename } from 'node:path'
import { LiveServerMessage } from '@transcribe/shared'
import { pcmFromWav } from '../src/wav'

const SAMPLE_RATE = 16000
const CHUNK_MS = 100
const CHUNK_BYTES = (SAMPLE_RATE * 2 * CHUNK_MS) / 1000 // 16-bit mono

const file = process.argv[2]
if (!file) throw new Error('Usage: bun scripts/live-stream-file.ts <16 kHz mono PCM wav>')
const pcm = pcmFromWav(Buffer.from(await Bun.file(file).arrayBuffer()))
const url = `ws://localhost:${process.env.PORT ?? 3000}/api/live`

const t0 = performance.now()
const elapsed = () => ((performance.now() - t0) / 1000).toFixed(1).padStart(5)

const ws = new WebSocket(url)
ws.binaryType = 'arraybuffer'

const done = new Promise<void>((resolve) => {
  ws.onclose = () => resolve()
})

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'start', title: `Live test: ${basename(file)}`, createdBy: 'live-stream-file', consent: true }))
}

ws.onmessage = async (event) => {
  const message = LiveServerMessage.parse(JSON.parse(String(event.data)))
  switch (message.type) {
    case 'session_started':
      console.log(`[${elapsed()}s] session started, meeting ${message.meetingId}`)
      await streamAudio()
      console.log(`[${elapsed()}s] audio sent, ending meeting`)
      ws.send(JSON.stringify({ type: 'stop' }))
      break
    case 'caption':
      console.log(`[${elapsed()}s] caption ${message.turn.start.toFixed(1)}s ${message.turn.speaker}: ${message.turn.text}`)
      break
    case 'live_alert':
      console.log(`[${elapsed()}s] NUDGE ${message.alert.ruleId}: ${message.alert.nudge} ("${message.alert.quote}" at ${message.alert.timestampSeconds}s)`)
      break
    case 'error':
      console.log(`[${elapsed()}s] ERROR ${message.message}`)
      break
    case 'meeting_complete':
      console.log(`[${elapsed()}s] meeting complete. GET /api/meetings/${message.meetingId}`)
      break
  }
}

async function streamAudio() {
  for (let i = 0; i < pcm.length; i += CHUNK_BYTES) {
    ws.send(pcm.subarray(i, i + CHUNK_BYTES))
    await Bun.sleep(CHUNK_MS)
  }
}

await done
