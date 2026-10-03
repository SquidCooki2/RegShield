import { z } from 'zod'
import type { TranscriptTurn } from '@transcribe/shared'

// The parts of Transcribe's batch output JSON we use. Only the redacted file should be passed in.
// Newer outputs put speaker_label on each item; older ones only list it under speaker_labels.segments.
const TranscribeItem = z.object({
  type: z.enum(['pronunciation', 'punctuation']),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  speaker_label: z.string().optional(),
  alternatives: z.array(z.object({ content: z.string() })).min(1),
})

const TranscribeOutput = z.object({
  results: z.object({
    items: z.array(TranscribeItem),
    speaker_labels: z
      .object({
        segments: z.array(
          z.object({
            items: z.array(z.object({ start_time: z.string(), speaker_label: z.string() })),
          }),
        ),
      })
      .optional(),
  }),
})

// Turns Transcribe output into one turn per continuous stretch of one speaker.
export function parseTranscribeOutput(json: unknown): TranscriptTurn[] {
  const { results } = TranscribeOutput.parse(json)

  const speakerAt = new Map<string, string>()
  for (const segment of results.speaker_labels?.segments ?? []) {
    for (const item of segment.items) speakerAt.set(item.start_time, item.speaker_label)
  }

  const turns: TranscriptTurn[] = []
  for (const item of results.items) {
    const content = item.alternatives[0]!.content
    const last = turns.at(-1)

    if (item.type === 'punctuation') {
      if (last) last.text += content
      continue
    }

    const start = Number(item.start_time)
    const end = Number(item.end_time)
    const speaker = item.speaker_label ?? speakerAt.get(item.start_time!) ?? 'unknown'

    if (last && last.speaker === speaker) {
      last.text += ` ${content}`
      last.end = end
    } else {
      turns.push({ speaker, start, end, text: content })
    }
  }
  return turns
}

// One line per turn, e.g. "[01:10] spk_0: Honestly, this fund basically can not lose."
export function formatForModel(turns: TranscriptTurn[]): string {
  return turns.map((t) => `[${formatTime(t.start)}] ${t.speaker}: ${t.text}`).join('\n')
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
