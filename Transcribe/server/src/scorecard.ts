import { z } from 'zod'
import { RuleId, SpeakerRole, type Flag } from '@transcribe/shared'
import { normalize } from './analysis'

// test-data/answer-key.json: what each test recording should and should not trigger.
const Expectation = z.object({
  expected: z.array(z.object({ ruleId: RuleId, speakerRole: SpeakerRole, quote: z.string() })),
  acceptable: z.array(z.object({ ruleId: RuleId, reason: z.string() })),
  nearMisses: z.array(z.object({ ruleId: RuleId, quote: z.string() })),
})
export type Expectation = z.infer<typeof Expectation>

export function parseAnswerKey(json: unknown): Record<string, Expectation> {
  const { _readme: _, ...recordings } = z.record(z.string(), z.unknown()).parse(json)
  return z.record(z.string(), Expectation).parse(recordings)
}

export interface RecordingScore {
  caught: Expectation['expected']
  missed: Expectation['expected']
  falseAlarms: Flag[]
  acceptable: Flag[]
  nearMissesHandled: number
  nearMissesFailed: { nearMiss: Expectation['nearMisses'][number]; flag: Flag }[]
  unverified: Flag[]
}

// A planted issue counts as caught only when the rule AND the speaker role match:
// flagging the advisor for something the client said is a miss plus a false alarm.
export function scoreRecording(key: Expectation, flags: Flag[]): RecordingScore {
  const matches = (f: Flag, e: Expectation['expected'][number]) => f.ruleId === e.ruleId && f.speakerRole === e.speakerRole

  const caught = key.expected.filter((e) => flags.some((f) => matches(f, e)))
  const missed = key.expected.filter((e) => !caught.includes(e))
  const unexpected = flags.filter((f) => !key.expected.some((e) => matches(f, e)))
  const isAcceptable = (f: Flag) => key.acceptable.some((a) => a.ruleId === f.ruleId)

  const nearMissesFailed = key.nearMisses.flatMap((nearMiss) => {
    const flag = flags.find((f) => f.ruleId === nearMiss.ruleId && quotesOverlap(f.quote, nearMiss.quote))
    return flag ? [{ nearMiss, flag }] : []
  })

  return {
    caught,
    missed,
    falseAlarms: unexpected.filter((f) => !isAcceptable(f)),
    acceptable: unexpected.filter(isAcceptable),
    nearMissesHandled: key.nearMisses.length - nearMissesFailed.length,
    nearMissesFailed,
    unverified: flags.filter((f) => !f.quoteVerified),
  }
}

// Script wording and Transcribe wording differ ("ten thousand" vs "10,000"), so compare by words:
// most words of the shorter quote must appear in the longer one.
export function quotesOverlap(a: string, b: string, threshold = 0.6): boolean {
  const [short, long] = [normalize(a).split(' '), normalize(b).split(' ')].sort((x, y) => x.length - y.length) as [string[], string[]]
  if (!short[0]) return false
  const longWords = new Set(long)
  return short.filter((w) => longWords.has(w)).length / short.length >= threshold
}
