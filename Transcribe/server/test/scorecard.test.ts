import { describe, expect, test } from 'bun:test'
import type { Flag } from '@transcribe/shared'
import { quotesOverlap, scoreRecording, type Expectation } from '../src/scorecard'

const flag = (ruleId: string, speakerRole: Flag['speakerRole'], quote = 'x', quoteVerified = true): Flag => ({
  ruleId,
  ruleName: '',
  severity: 'high',
  speakerRole,
  quote,
  timestampSeconds: 0,
  explanation: '',
  suggestedAction: '',
  quoteVerified,
})

const key: Expectation = {
  expected: [{ ruleId: 'R5', speakerRole: 'client', quote: 'Can I deposit the cash in a few chunks so it stays under ten thousand?' }],
  acceptable: [{ ruleId: 'R3', reason: '' }],
  nearMisses: [{ ruleId: 'R5', quote: 'Splitting cash deposits to avoid the reporting requirement is called structuring' }],
}

describe('scoreRecording', () => {
  test('right rule and speaker is caught; duplicates are not false alarms', () => {
    const score = scoreRecording(key, [flag('R5', 'client'), flag('R5', 'client')])
    expect(score.caught).toHaveLength(1)
    expect(score.missed).toHaveLength(0)
    expect(score.falseAlarms).toHaveLength(0)
    expect(score.nearMissesHandled).toBe(1)
  })

  test('blaming the wrong speaker is a miss, a false alarm, and a failed near-miss', () => {
    const score = scoreRecording(key, [flag('R5', 'advisor', 'Splitting cash deposits to avoid the reporting requirement is called structuring')])
    expect(score.missed).toHaveLength(1)
    expect(score.falseAlarms).toHaveLength(1)
    expect(score.nearMissesFailed).toHaveLength(1)
  })

  test('acceptable rules and unverified quotes are reported separately', () => {
    const score = scoreRecording(key, [flag('R3', 'advisor', 'x', false), flag('R1', 'advisor')])
    expect(score.acceptable.map((f) => f.ruleId)).toEqual(['R3'])
    expect(score.falseAlarms.map((f) => f.ruleId)).toEqual(['R1'])
    expect(score.unverified).toHaveLength(1)
  })
})

describe('quotesOverlap', () => {
  test('tolerates Transcribe rewording and partial quotes', () => {
    expect(quotesOverlap('can I deposit the cash in a few chunks so it stays under 10,000 each time', key.expected[0]!.quote)).toBe(true)
    expect(quotesOverlap('called structuring', key.nearMisses[0]!.quote)).toBe(true)
  })
  test('unrelated quotes do not overlap', () => {
    expect(quotesOverlap('the fees are low', key.nearMisses[0]!.quote)).toBe(false)
  })
})
