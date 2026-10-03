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
