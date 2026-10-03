// Returns the raw PCM samples of a WAV file (contents of its "data" chunk).
export function pcmFromWav(buf: Buffer): Buffer {
  let offset = 12
  while (offset < buf.length) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    if (id === 'data') return buf.subarray(offset + 8, offset + 8 + size)
    offset += 8 + size + (size % 2)
  }
  throw new Error('No data chunk in WAV')
}

// Wraps raw 16-bit mono PCM in a 44-byte WAV header.
export function wavFromPcm(pcm: Uint8Array, sampleRate = 16000): Uint8Array {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVEfmt ', 8, 'ascii')
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28) // byte rate
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}
