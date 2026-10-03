import { describe, expect, test } from 'bun:test'
import { formatForModel, parseTranscribeOutput } from '../src/transcript'

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
