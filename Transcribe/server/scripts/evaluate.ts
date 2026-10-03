// M4 scorecard: runs every saved redacted transcript through full analysis and compares the flags
// with test-data/answer-key.json. No re-transcribing. Run several times to check stability.
// Usage (from server/): bun scripts/evaluate.ts [runs=1]

import { join } from 'node:path'
import { analyzeTranscript } from '../src/analysis'
import { parseAnswerKey, scoreRecording, type RecordingScore } from '../src/scorecard'
import { parseTranscribeOutput } from '../src/transcript'

const runs = Number(process.argv[2] ?? 1)
const testData = join(import.meta.dir, '../../test-data')
const answerKey = parseAnswerKey(await Bun.file(join(testData, 'answer-key.json')).json())

const totals = { planted: 0, caught: 0, falseAlarms: 0, acceptable: 0, nearMisses: 0, nearMissesHandled: 0, unverified: 0, errors: 0 }

for (let run = 1; run <= runs; run++) {
  console.log(`\n=== Run ${run} of ${runs}`)

  const results = await Promise.all(
    Object.entries(answerKey).map(async ([name, key]) => {
      try {
        const turns = parseTranscribeOutput(await Bun.file(join(testData, `transcripts/${name}.redacted.json`)).json())
        const { flags } = await analyzeTranscript(turns, 'full')
        return { name, key, score: scoreRecording(key, flags) }
      } catch (error) {
        return { name, key, error: error instanceof Error ? error.message : String(error) }
      }
    }),
  )

  for (const { name, key, score, error } of results) {
    if (error !== undefined) {
      totals.errors++
      console.log(`✗ ${name}: ERROR ${error.split('\n')[0]}`)
      continue
    }
    printRecording(name, score!)
    totals.planted += key.expected.length
    totals.caught += score!.caught.length
    totals.falseAlarms += score!.falseAlarms.length
    totals.acceptable += score!.acceptable.length
    totals.nearMisses += key.nearMisses.length
    totals.nearMissesHandled += score!.nearMissesHandled
    totals.unverified += score!.unverified.length
  }
}

console.log(`\n=== Scorecard (${runs} run${runs > 1 ? 's' : ''} × ${Object.keys(answerKey).length} recordings)`)
console.log(`Issues caught:          ${totals.caught} / ${totals.planted}`)
console.log(`False alarms:           ${totals.falseAlarms}`)
console.log(`Near-misses handled:    ${totals.nearMissesHandled} / ${totals.nearMisses}`)
console.log(`Unverified quotes:      ${totals.unverified}`)
console.log(`Debatable (acceptable): ${totals.acceptable}`)
if (totals.errors) console.log(`Errors:                 ${totals.errors}`)

function printRecording(name: string, s: RecordingScore) {
  const ok = !s.missed.length && !s.falseAlarms.length && !s.nearMissesFailed.length
  console.log(`${ok ? '✓' : '✗'} ${name}: caught [${s.caught.map((e) => `${e.ruleId}/${e.speakerRole}`).join(', ')}]`)
  for (const e of s.missed) console.log(`    MISSED ${e.ruleId}/${e.speakerRole}: "${e.quote}"`)
  for (const f of s.falseAlarms) console.log(`    FALSE ALARM ${f.ruleId}/${f.speakerRole}: "${f.quote}"`)
  for (const { nearMiss } of s.nearMissesFailed) console.log(`    NEAR-MISS FLAGGED ${nearMiss.ruleId}: "${nearMiss.quote}"`)
  for (const f of s.acceptable) console.log(`    acceptable ${f.ruleId}/${f.speakerRole}: "${f.quote}"`)
  for (const f of s.unverified) console.log(`    UNVERIFIED QUOTE ${f.ruleId}: "${f.quote}"`)
}
