// Voices a two-speaker test meeting script (test-data/scripts/*.txt) with macOS `say` (no ffmpeg needed).
// Output: 16 kHz, 16-bit PCM, mono WAV — works for Transcribe batch and streaming tests.
// Usage (from server/): bun scripts/make-test-audio.ts ../test-data/scripts/<name>.txt [out.wav]

import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { pcmFromWav } from '../src/wav'

const SAMPLE_RATE = 16000
const PAUSE_SECONDS = 0.8 // gaps between speakers help speaker labeling

const VOICES = { ADVISOR: 'Samantha', CLIENT: 'Daniel' } as const

const scriptFile = process.argv[2]
if (!scriptFile) throw new Error('Usage: bun scripts/make-test-audio.ts <script.txt> [out.wav]')

// Lines look like "ADVISOR: text" or "CLIENT: text"; "#" lines are notes and are not spoken.
const script = (await Bun.file(scriptFile).text())
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const match = line.match(/^(ADVISOR|CLIENT):\s*(.+)$/)
    if (!match) throw new Error(`Bad script line: ${line}`)
    return [VOICES[match[1] as keyof typeof VOICES], match[2]!] as const
  })

const out = process.argv[3] ?? join(import.meta.dir, `../../test-data/audio/${basename(scriptFile, '.txt')}.wav`)
const tmp = await mkdtemp(join(tmpdir(), 'say-'))

function wavHeader(dataBytes: number): Buffer {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + dataBytes, 4)
  h.write('WAVE', 8)
  h.write('fmt ', 12)
  h.writeUInt32LE(16, 16) // fmt chunk size
  h.writeUInt16LE(1, 20) // PCM
  h.writeUInt16LE(1, 22) // mono
  h.writeUInt32LE(SAMPLE_RATE, 24)
  h.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  h.writeUInt16LE(2, 32) // block align
  h.writeUInt16LE(16, 34) // bits per sample
  h.write('data', 36)
  h.writeUInt32LE(dataBytes, 40)
  return h
}

const silence = Buffer.alloc(Math.round(PAUSE_SECONDS * SAMPLE_RATE) * 2)
const parts: Buffer[] = []

for (const [i, [voice, line]] of script.entries()) {
  const file = join(tmp, `${i}.wav`)
  const proc = Bun.spawnSync(['say', '-v', voice, '-o', file, '--file-format=WAVE', `--data-format=LEI16@${SAMPLE_RATE}`, line])
  if (proc.exitCode !== 0) throw new Error(`say failed: ${proc.stderr.toString()}`)
  parts.push(pcmFromWav(Buffer.from(await Bun.file(file).arrayBuffer())), silence)
}

const pcm = Buffer.concat(parts)
await mkdir(dirname(out), { recursive: true })
await Bun.write(out, Buffer.concat([wavHeader(pcm.length), pcm]))
await rm(tmp, { recursive: true })

console.log(`Wrote ${out} (${(pcm.length / 2 / SAMPLE_RATE).toFixed(1)}s)`)
