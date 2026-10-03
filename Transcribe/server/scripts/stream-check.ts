// Milestone 0 risk check: does the Transcribe streaming SDK client (HTTP/2) work under Bun?
// Streams a 16 kHz mono PCM WAV in 100 ms chunks at real-time pace, like the browser will.
// Usage (from server/): bun scripts/stream-check.ts ../test-data/audio/demo-guarantee.wav

import { StartStreamTranscriptionCommand, TranscribeStreamingClient } from '@aws-sdk/client-transcribe-streaming'
import { pcmFromWav } from '../src/wav'

const SAMPLE_RATE = 16000
const CHUNK_MS = 100
const CHUNK_BYTES = (SAMPLE_RATE * 2 * CHUNK_MS) / 1000 // 16-bit mono

const file = process.argv[2]
if (!file) throw new Error('Usage: bun scripts/stream-check.ts <16 kHz mono PCM wav>')
const pcm = pcmFromWav(Buffer.from(await Bun.file(file).arrayBuffer()))

const t0 = performance.now()
const elapsed = () => ((performance.now() - t0) / 1000).toFixed(1).padStart(5)

async function* audioStream() {
  for (let i = 0; i < pcm.length; i += CHUNK_BYTES) {
    yield { AudioEvent: { AudioChunk: pcm.subarray(i, i + CHUNK_BYTES) } }
    await Bun.sleep(CHUNK_MS)
  }
}

const client = new TranscribeStreamingClient({ region: process.env.AWS_REGION })
const response = await client.send(
  new StartStreamTranscriptionCommand({
    LanguageCode: 'en-US',
    MediaEncoding: 'pcm',
    MediaSampleRateHertz: SAMPLE_RATE,
    ShowSpeakerLabel: true,
    ContentRedactionType: 'PII',
    AudioStream: audioStream(),
  }),
)
console.log(`[${elapsed()}s] stream open, session ${response.SessionId}`)

let partials = 0
let unredactedPartials = 0
for await (const event of response.TranscriptResultStream!) {
  for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
    const alt = result.Alternatives?.[0]
    if (!alt?.Transcript) continue

    if (result.IsPartial) {
      partials++
      if (/\d{3}/.test(alt.Transcript)) unredactedPartials++ // the fake phone number's digits
      continue
    }

    const speaker = alt.Items?.find((item) => item.Speaker)?.Speaker ?? '?'
    console.log(`[${elapsed()}s] FINAL ${result.StartTime?.toFixed(1)}–${result.EndTime?.toFixed(1)}s spk_${speaker}: ${alt.Transcript}`)
  }
}

console.log(`[${elapsed()}s] stream closed. ${partials} partial results ignored, ${unredactedPartials} of them contained phone digits`)
