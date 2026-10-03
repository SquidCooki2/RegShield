// Runs the Bedrock rule check on a saved redacted Transcribe output and prints the result.
// Usage (from server/): bun scripts/analyze-transcript.ts ../test-data/transcripts/demo-guarantee.redacted.json [full|live]

import { analyzeTranscript, type AnalysisMode } from '../src/analysis'
import { parseTranscribeOutput } from '../src/transcript'

const file = process.argv[2]
const mode = (process.argv[3] ?? 'full') as AnalysisMode
if (!file) throw new Error('Usage: bun scripts/analyze-transcript.ts <redacted.json> [full|live]')

const turns = parseTranscribeOutput(await Bun.file(file).json())
const t0 = performance.now()
const result = await analyzeTranscript(turns, mode)

console.log(JSON.stringify(result, null, 2))
console.log(`\n${mode} analysis took ${((performance.now() - t0) / 1000).toFixed(1)}s`)
