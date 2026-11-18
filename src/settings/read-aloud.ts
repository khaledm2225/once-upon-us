import { canReadAloud, getSettings, markSpeechFailed } from './settings.js';

// Read aloud: when a page with words opens, the browser's own voice reads it,
// slowly and calmly. It is offered only where the browser has a voice.

/** A little slower than normal speech, for an unhurried reading. */
const RATE = 0.9;
/** If speech hasn't started by then, the browser can't really speak here. */
const START_TIMEOUT_MS = 3000;

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Reads the page's words if the reader turned read aloud on. */
export function readPage(words: string): void {
  stopSpeaking();
  if (!getSettings().readAloud || !canReadAloud() || words.length === 0) return;
  const utterance = new SpeechSynthesisUtterance(words);
  utterance.lang = 'en-US';
  utterance.rate = RATE;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  // Some browsers list voices but stay silent (for example inside VR). Then
  // read aloud turns itself off instead of pretending to work.
  let started = false;
  const timer = window.setTimeout(() => {
    if (!started) {
      console.warn('Read aloud did not start, so it is turned off for this visit.');
      stopSpeaking();
      markSpeechFailed();
    }
  }, START_TIMEOUT_MS);
  utterance.addEventListener('start', () => {
    started = true;
    window.clearTimeout(timer);
  });
  utterance.addEventListener('error', (event) => {
    window.clearTimeout(timer);
    if (event.error === 'canceled' || event.error === 'interrupted') return;
    console.warn('Read aloud failed, so it is turned off for this visit.', event.error);
    markSpeechFailed();
  });
  speechSynthesis.speak(utterance);
}
