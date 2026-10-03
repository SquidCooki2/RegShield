// Runs on the audio thread. Converts microphone audio (float samples at the device rate, usually
// 44.1 or 48 kHz) to what Transcribe streaming expects: 16 kHz, 16-bit, mono PCM. Posts one
// ArrayBuffer per ~100 ms. Resamples by linear interpolation.
const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 1600; // 100 ms at 16 kHz

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / TARGET_RATE; // input samples per output sample
    this.pos = 0; // read position in the current block; -1 means the previous block's last sample
    this.prev = 0;
    this.out = new Int16Array(CHUNK_SAMPLES);
    this.filled = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0]; // first channel only: mono
    if (!input?.length) return true;

    const at = (i) => (i < 0 ? this.prev : input[i]);
    while (this.pos < input.length - 1) {
      const i = Math.floor(this.pos);
      const frac = this.pos - i;
      const s = Math.max(-1, Math.min(1, at(i) * (1 - frac) + at(i + 1) * frac));
      this.out[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.filled === CHUNK_SAMPLES) {
        this.port.postMessage(this.out.buffer, [this.out.buffer]);
        this.out = new Int16Array(CHUNK_SAMPLES);
        this.filled = 0;
      }
      this.pos += this.step;
    }
    this.pos -= input.length;
    this.prev = input[input.length - 1];
    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
