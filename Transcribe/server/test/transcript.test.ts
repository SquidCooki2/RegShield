import { describe, expect, test } from 'bun:test'
import { formatForModel, parseTranscribeOutput, turnsFromStreamItems } from '../src/transcript'

const word = (content: string, start: number, end: number, speaker_label?: string) => ({
  type: 'pronunciation',
  start_time: String(start),
  end_time: String(end),
  alternatives: [{ content }],
  ...(speaker_label && { speaker_label }),
})
const punct = (content: string) => ({ type: 'punctuation', alternatives: [{ content }] })

const expected = [
  { speaker: 'spk_0', start: 0.5, end: 1.4, text: 'Call [PII].' },
  { speaker: 'spk_1', start: 2, end: 2.3, text: 'Sure.' },
]

describe('parseTranscribeOutput', () => {
  test('newer format: speaker_label on each item', () => {
    const json = {
      results: {
        items: [word('Call', 0.5, 0.9, 'spk_0'), word('[PII]', 1.0, 1.4, 'spk_0'), punct('.'), word('Sure', 2, 2.3, 'spk_1'), punct('.')],
      },
    }
    expect(parseTranscribeOutput(json)).toEqual(expected)
  })

  test('older format: speakers only in speaker_labels.segments', () => {
    const json = {
      results: {
        items: [word('Call', 0.5, 0.9), word('[PII]', 1.0, 1.4), punct('.'), word('Sure', 2, 2.3), punct('.')],
        speaker_labels: {
          segments: [
            { items: [{ start_time: '0.5', speaker_label: 'spk_0' }, { start_time: '1', speaker_label: 'spk_0' }] },
            { items: [{ start_time: '2', speaker_label: 'spk_1' }] },
          ],
        },
      },
    }
    expect(parseTranscribeOutput(json)).toEqual(expected)
  })

  test('rejects output that is not a Transcribe result', () => {
    expect(() => parseTranscribeOutput({ hello: 'world' })).toThrow()
  })
})

test('formatForModel', () => {
  expect(formatForModel([{ speaker: 'spk_0', start: 70.4, end: 75, text: 'Hello.' }])).toBe('[01:10] spk_0: Hello.')
})

describe('turnsFromStreamItems', () => {
  const item = (Content: string, StartTime: number, EndTime: number, Speaker: string) =>
    ({ Type: 'pronunciation', Content, StartTime, EndTime, Speaker }) as const
  const mark = (Content: string) => ({ Type: 'punctuation', Content }) as const

  test('splits one result into turns by per-item speaker', () => {
    const items = [item('Call', 0.5, 0.9, '0'), item('[NAME]', 1, 1.4, '0'), mark('.'), item('Sure', 2, 2.3, '2'), mark('.')]
    expect(turnsFromStreamItems(items)).toEqual([
      { speaker: 'spk_0', start: 0.5, end: 1.4, text: 'Call [NAME].' },
      { speaker: 'spk_2', start: 2, end: 2.3, text: 'Sure.' },
    ])
  })

  test('a word without a speaker label stays with the previous speaker', () => {
    const items = [item('Hi', 0, 0.2, '1'), { Type: 'pronunciation', Content: 'there', StartTime: 0.3, EndTime: 0.5 } as const]
    expect(turnsFromStreamItems(items)).toEqual([{ speaker: 'spk_1', start: 0, end: 0.5, text: 'Hi there' }])
  })
})
