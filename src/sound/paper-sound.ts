import { getSettings, onSettings } from '../settings/settings.js';

// Paper sounds, made in code with the Web Audio API (no sound files): a soft
// lift, a rustling turn, a gentle thump when a page lands, a small tap for a
// paper button, and quiet rain on the first page. All follow the Sound setting.
// Browsers start audio only after a real click, so the Enter VR click unlocks it.

let audio: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let rainGain: GainNode | null = null;

const MASTER_LEVEL = 0.8;
const RAIN_LEVEL = 0.05;

/** Quiets every sound while the headset is off or the Quest menu is open. */
export function pauseAudio(paused: boolean): void {
  if (!audio) return;
  if (paused) void audio.suspend();
  else void audio.resume();
}

/** Call from a real click (Enter VR): creates or wakes the audio. */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return;
  if (!audio) {
    audio = new AudioContext();
    master = audio.createGain();
    master.gain.value = getSettings().sound ? MASTER_LEVEL : 0;
    master.connect(audio.destination);
    // Two seconds of soft white noise, the raw paper of every sound.
    noise = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    onSettings((settings) => {
      if (audio && master) master.gain.setTargetAtTime(settings.sound ? MASTER_LEVEL : 0, audio.currentTime, 0.05);
    });
  }
  void audio.resume();
}

function ready(): AudioContext | null {
  return audio && master && noise && audio.state === 'running' && getSettings().sound ? audio : null;
}

/** A burst of filtered noise with a soft envelope. */
function rustle(duration: number, from: number, to: number, q: number, level: number, attack: number): void {
  const ctx = ready();
  if (!ctx || !master || !noise) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(gain).connect(master);
  source.start(now, Math.random() * 1.5, duration + 0.05);
}

export function playLift(): void {
  rustle(0.18, 2600, 2000, 0.8, 0.22, 0.02);
}

export function playTurn(): void {
  rustle(0.45, 900, 3000, 0.6, 0.2, 0.08);
}

export function playTap(): void {
  rustle(0.07, 3600, 3200, 1.2, 0.12, 0.005);
}

/** A page lands: a low, soft thump with a little paper in it. */
export function playThump(): void {
  const ctx = ready();
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const tone = ctx.createOscillator();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(85, now);
  tone.frequency.exponentialRampToValueAtTime(55, now + 0.18);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  tone.connect(gain).connect(master);
  tone.start(now);
  tone.stop(now + 0.22);
  rustle(0.09, 700, 400, 0.7, 0.1, 0.004);
}

/** Warm notes for the album photos, a calm pentatonic run (Hz). */
const MEMORY_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66] as const;

/**
 * A photo rises from the album: a soft, slow swell of two warm notes, like
 * the score of an old winter film, with a breath of paper air on top.
 */
export function playMemory(order: number): void {
  const ctx = ready();
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const root = MEMORY_NOTES[order % MEMORY_NOTES.length];
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
  filter.connect(gain).connect(master);
  for (const [ratio, type] of [[1, 'triangle'], [1.5, 'sine'], [2, 'sine']] as const) {
    const tone = ctx.createOscillator();
    tone.type = type;
    tone.frequency.value = root * ratio;
    tone.detune.value = ratio === 2 ? 6 : 0;
    tone.connect(filter);
    tone.start(now);
    tone.stop(now + 3.3);
  }
  rustle(0.6, 5200, 2600, 0.6, 0.025, 0.25);
}

/** Quiet rain, 0 (silent) to 1 (full), following how open page 1 is. */
export function setRain(level: number): void {
  const ctx = ready();
  if (!ctx || !master || !noise) {
    if (audio && rainGain) rainGain.gain.setTargetAtTime(0, audio.currentTime, 0.2);
    return;
  }
  if (!rainGain) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 700;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 3800;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    source.connect(high).connect(low).connect(rainGain).connect(master);
    source.start();
  }
  rainGain.gain.setTargetAtTime(RAIN_LEVEL * level, ctx.currentTime, 0.4);
}
