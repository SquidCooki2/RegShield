// Runs one recording through the recorded-mode transcription path and prints the result.
// Usage (from server/): bun scripts/transcribe-file.ts ../test-data/audio/demo-guarantee.wav

import { basename, join } from 'node:path'
import { formatForModel, parseTranscribeOutput } from '../src/transcript'
import { fetchRedactedTranscript, startTranscription, uploadToArchive, waitForTranscription } from '../src/transcription'

const file = process.argv[2]
if (!file) throw new Error('Usage: bun scripts/transcribe-file.ts <audio file>')

const meetingId = crypto.randomUUID()
const body = new Uint8Array(await Bun.file(file).arrayBuffer())

const archiveKey = await uploadToArchive(meetingId, basename(file), body)
console.log(`Uploaded to archive: ${archiveKey}`)

const jobName = await startTranscription(meetingId, archiveKey)
console.log(`Started job ${jobName}, waiting...`)

const job = await waitForTranscription(jobName)
const raw = await fetchRedactedTranscript(job)

// Keep the redacted output so prompt tuning doesn't need to re-run Transcribe
const saved = join(import.meta.dir, `../../test-data/transcripts/${basename(file).replace(/\.\w+$/, '')}.redacted.json`)
await Bun.write(saved, JSON.stringify(raw, null, 2))
console.log(`Saved redacted output: ${saved}\n`)

console.log(formatForModel(parseTranscribeOutput(raw)))
