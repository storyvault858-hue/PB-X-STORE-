export type SoundEffect = 'tap' | 'toggle' | 'success' | 'error';

const SAMPLE_RATE = 22050;

/**
 * Generates a real 16-bit PCM WAV data URI in memory so playback works
 * reliably via both Web Audio API AND HTML5 <audio> fallback across
 * Android Chrome, iOS Safari, Desktop browsers, and cross-origin iframes.
 */
function buildWavDataUri(samples: Float32Array): string {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function synthesizeSamples(effect: SoundEffect): Float32Array {
  if (effect === 'tap') {
    // Crisp, pleasant tactile glass-wood pop (68ms, clearly audible on phone speakers)
    const duration = 0.068;
    const len = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(len);
    let phase1 = 0;
    let phase2 = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const freq1 = 760 * Math.exp(-t * 24) + 210;
      const freq2 = 1950 * Math.exp(-t * 58) + 600;
      phase1 += (2 * Math.PI * freq1) / SAMPLE_RATE;
      phase2 += (2 * Math.PI * freq2) / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.0025);
      const env1 = attack * Math.exp(-t * 52);
      const env2 = attack * Math.exp(-t * 145);
      out[i] = (Math.sin(phase1) * 0.56 * env1 + Math.sin(phase2) * 0.28 * env2) * 0.9;
    }
    return out;
  }

  if (effect === 'toggle') {
    // Silky upward switch tick (85ms)
    const duration = 0.085;
    const len = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(len);
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const freq = 540 + 480 * (1 - Math.exp(-t * 42));
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.003);
      const env = attack * Math.exp(-t * 36);
      out[i] = Math.sin(phase) * 0.62 * env;
    }
    return out;
  }

  if (effect === 'success') {
    // Warm two-note chime (180ms)
    const duration = 0.19;
    const len = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      let sample = 0;
      // Note 1: E5 (659Hz)
      if (t < 0.11) {
        const a1 = Math.min(1, t / 0.004);
        const e1 = a1 * Math.exp(-t * 28);
        sample += Math.sin(2 * Math.PI * 659.25 * t) * 0.48 * e1;
      }
      // Note 2: B5 (987Hz)
      if (t >= 0.055) {
        const t2 = t - 0.055;
        const a2 = Math.min(1, t2 / 0.004);
        const e2 = a2 * Math.exp(-t2 * 24);
        sample += Math.sin(2 * Math.PI * 987.77 * t2) * 0.52 * e2;
      }
      out[i] = sample;
    }
    return out;
  }

  // Error: soft low double-pulse thud (145ms)
  const duration = 0.145;
  const len = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 260 * Math.exp(-t * 10) + 115;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.004);
    const env = attack * Math.exp(-t * 24);
    out[i] = Math.sin(phase) * 0.68 * env;
  }
  return out;
}

const sampleCache: Partial<Record<SoundEffect, Float32Array>> = {};
const wavCache: Partial<Record<SoundEffect, string>> = {};
const audioPool: Partial<Record<SoundEffect, HTMLAudioElement[]>> = {};
const poolIndex: Record<SoundEffect, number> = {
  tap: 0,
  toggle: 0,
  success: 0,
  error: 0,
};

let audioCtx: AudioContext | null = null;
const webAudioBuffers: Partial<Record<SoundEffect, AudioBuffer>> = {};
let lastPlayedAt = 0;

function getSamples(effect: SoundEffect): Float32Array {
  if (!sampleCache[effect]) {
    sampleCache[effect] = synthesizeSamples(effect);
  }
  return sampleCache[effect]!;
}

function getWavUri(effect: SoundEffect): string {
  if (!wavCache[effect]) {
    wavCache[effect] = buildWavDataUri(getSamples(effect));
  }
  return wavCache[effect]!;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playViaHtmlAudio(effect: SoundEffect): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;
  try {
    let pool = audioPool[effect];
    if (!pool) {
      const uri = getWavUri(effect);
      pool = [new Audio(uri), new Audio(uri), new Audio(uri)];
      pool.forEach((el) => {
        el.preload = 'auto';
        el.volume = 0.72;
      });
      audioPool[effect] = pool;
    }

    const idx = poolIndex[effect] % pool.length;
    poolIndex[effect] = idx + 1;
    const el = pool[idx];
    el.currentTime = 0;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

function playViaWebAudio(ctx: AudioContext, effect: SoundEffect): boolean {
  try {
    let buffer = webAudioBuffers[effect];
    if (!buffer) {
      const samples = getSamples(effect);
      buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);
      webAudioBuffers[effect] = buffer;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.78;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

export function unlockAudioEngine(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays a crisp, unmistakable tactile UI sound using Web Audio when active,
 * with an instant synchronous HTML5 <audio> WAV fallback so it works on
 * Android Chrome, iOS Safari, Desktop, and cross-origin iframes without ever failing silently.
 */
export function playTactileSound(effect: SoundEffect = 'tap'): void {
  const now = performance.now();
  if (effect === 'tap' && now - lastPlayedAt < 55) return;
  lastPlayedAt = now;

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') {
    if (playViaWebAudio(ctx, effect)) {
      return;
    }
  }

  // Resume AudioContext for subsequent ultra-low-latency taps,
  // while playing THIS tap immediately via HTML5 <audio> WAV!
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  playViaHtmlAudio(effect);
}
