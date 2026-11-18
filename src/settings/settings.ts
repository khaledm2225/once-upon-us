// The reader's settings: bigger text, stronger contrast, bigger page tabs,
// reading aloud and paper sounds. They belong to the person reading, so they are saved on this
// device (not in the gift link), and both the start page and the paper menu
// in VR change them. Storage can be blocked, so every call is guarded.

export interface Settings {
  largeText: boolean;
  highContrast: boolean;
  largeTabs: boolean;
  readAloud: boolean;
  sound: boolean;
}

export type SettingKey = keyof Settings;

const KEY = 'once-upon-us:settings';
const DEFAULTS: Settings = { largeText: false, highContrast: false, largeTabs: false, readAloud: false, sound: true };

function load(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<SettingKey, unknown>>;
    const settings = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
      if (typeof saved[key] === 'boolean') settings[key] = saved[key] as boolean;
    }
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

let current: Settings = load();
const listeners = new Set<(settings: Settings, changed: SettingKey | null) => void>();

export function getSettings(): Settings {
  return current;
}

export function setSetting(key: SettingKey, value: boolean): void {
  if (current[key] === value) return;
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage is blocked: the setting still works until the page closes.
  }
  for (const listener of listeners) listener(current, key);
}

/** Calls back now and on every change. Returns a function that stops it. */
export function onSettings(listener: (settings: Settings, changed: SettingKey | null) => void): () => void {
  listeners.add(listener);
  listener(current, null);
  return () => listeners.delete(listener);
}

// Whether this browser can read aloud, kept up to date as voices arrive, so
// checking it every frame costs nothing. A failed reading turns it off.
let voiceReady = false;
let speechFailed = false;
const voiceListeners = new Set<() => void>();
function checkVoices(): void {
  const ready = !speechFailed && typeof speechSynthesis !== 'undefined' && speechSynthesis.getVoices().length > 0;
  if (ready === voiceReady) return;
  voiceReady = ready;
  for (const listener of voiceListeners) listener();
}
if (typeof speechSynthesis !== 'undefined') {
  checkVoices();
  speechSynthesis.addEventListener('voiceschanged', checkVoices);
}

/** True when this browser can read text aloud with at least one voice. */
export function canReadAloud(): boolean {
  return voiceReady;
}

/** Calls back whenever read aloud becomes available or unavailable. */
export function onVoicesChanged(listener: () => void): () => void {
  voiceListeners.add(listener);
  return () => voiceListeners.delete(listener);
}

/** The browser could not speak: read aloud is turned off and hidden for this visit. */
export function markSpeechFailed(): void {
  speechFailed = true;
  setSetting('readAloud', false);
  checkVoices();
}
