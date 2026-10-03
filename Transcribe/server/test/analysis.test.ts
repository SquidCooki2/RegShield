import { describe, expect, test } from 'bun:test'
import type { Flag } from '@transcribe/shared'
import { normalize, overallRisk, verifyQuote } from '../src/analysis'

const turns = [
  { speaker: 'spk_0', start: 22.1, end: 27.5, text: 'Of course I would put you in the growth fund. Honestly, this fund basically cannot lose.' },
  { speaker: 'spk_1', start: 28, end: 30, text: 'That sounds good.' },
]

const flag = (quote: string, severity: Flag['severity'] = 'high') => ({
  ruleId: 'R1',
  ruleName: 'Promises or guarantees',
  severity,
  speakerRole: 'advisor' as const,
  quote,
  timestampSeconds: 99,
  explanation: '',
  suggestedAction: '',
})

describe('verifyQuote', () => {
  test('matches despite case, punctuation and "can not", and takes the turn timestamp', () => {
    expect(verifyQuote(flag('this fund basically CAN NOT lose'), turns)).toMatchObject({ quoteVerified: true, timestampSeconds: 22.1 })
  })

  test('marks invented quotes unverified and keeps the model timestamp', () => {
    expect(verifyQuote(flag('this fund is guaranteed'), turns)).toMatchObject({ quoteVerified: false, timestampSeconds: 99 })
  })

  test('an empty quote is never verified', () => {
    expect(verifyQuote(flag('...'), turns).quoteVerified).toBe(false)
  })
})

test('normalize', () => {
  expect(normalize("  It CAN'T lose,  [PII]! ")).toBe('it cant lose pii')
})

describe('overallRisk', () => {
  const verified = (severity: Flag['severity']) => ({ ...flag('x', severity), quoteVerified: true })
  test('none without flags', () => expect(overallRisk([])).toBe('none'))
  test('highest severity wins', () => expect(overallRisk([verified('low'), verified('high'), verified('medium')])).toBe('high'))
})
