import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommand,
  TranscribeClient,
  type MediaFormat,
  type TranscriptionJob,
} from '@aws-sdk/client-transcribe'

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in server/.env`)
  return value
}

const region = env('AWS_REGION')
const archiveBucket = env('ARCHIVE_BUCKET')
const workBucket = env('WORK_BUCKET')

const s3 = new S3Client({ region })
const transcribe = new TranscribeClient({ region })

// Stores the untouched original in the Object Lock archive bucket.
// No Object Lock headers: this account denies per-object retention, so the bucket's default
// retention applies (DESIGN_DECISIONS.md D1). The SDK adds the required checksum itself.
export async function uploadToArchive(meetingId: string, fileName: string, body: Uint8Array): Promise<string> {
  const key = `meetings/${meetingId}/${fileName}`
  await s3.send(new PutObjectCommand({ Bucket: archiveBucket, Key: key, Body: body }))
  return key
}

// Short-lived link for playing the original audio; the archive bucket stays private.
export function archiveAudioUrl(archiveKey: string, expiresInSeconds = 900): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: archiveBucket, Key: archiveKey }), { expiresIn: expiresInSeconds })
}

// Starts a batch job reading from the archive and writing redacted + unredacted output to the work bucket.
export async function startTranscription(meetingId: string, archiveKey: string): Promise<string> {
  const jobName = `${meetingId}-${Date.now()}` // job names must be unique
  await transcribe.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: 'en-US', // PII redaction needs US English
      MediaFormat: archiveKey.split('.').pop()!.toLowerCase() as MediaFormat,
      Media: { MediaFileUri: `s3://${archiveBucket}/${archiveKey}` },
      OutputBucketName: workBucket,
      OutputKey: `transcripts/${meetingId}/`,
      Settings: { ShowSpeakerLabels: true, MaxSpeakerLabels: 2 },
      ContentRedaction: { RedactionType: 'PII', RedactionOutput: 'redacted_and_unredacted' },
    }),
  )
  return jobName
}

// Polls until the job finishes. Fine for now; Milestone 6 replaces this with EventBridge.
export async function waitForTranscription(jobName: string, intervalMs = 5000): Promise<TranscriptionJob> {
  while (true) {
    const { TranscriptionJob: job } = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }))
    if (job?.TranscriptionJobStatus === 'COMPLETED') return job
    if (job?.TranscriptionJobStatus === 'FAILED') throw new Error(`Transcription failed: ${job.FailureReason}`)
    await Bun.sleep(intervalMs)
  }
}

// Reads the redacted transcript JSON. Never use TranscriptFileUri: that one contains client PII.
export async function fetchRedactedTranscript(job: TranscriptionJob): Promise<unknown> {
  const uri = job.Transcript?.RedactedTranscriptFileUri
  if (!uri) throw new Error(`Job ${job.TranscriptionJobName} has no redacted transcript`)

  // URI looks like https://s3.<region>.amazonaws.com/<bucket>/<key>
  const path = decodeURIComponent(new URL(uri).pathname).slice(1)
  const key = path.startsWith(`${workBucket}/`) ? path.slice(workBucket.length + 1) : path

  const res = await s3.send(new GetObjectCommand({ Bucket: workBucket, Key: key }))
  return JSON.parse(await res.Body!.transformToString())
}
