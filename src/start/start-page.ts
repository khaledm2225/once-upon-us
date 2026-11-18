import type { World } from '@iwsdk/core';

import {
  type Gift,
  cleanDedication,
  defaultDedication,
  defaultGift,
  readGift,
  writeGift,
} from '../story/personalize.js';
import { type SettingKey, canReadAloud, onSettings, onVoicesChanged, setSetting } from '../settings/settings.js';
import { unlockAudio } from '../sound/paper-sound.js';
import { setupPhotoPicker } from './photo-picker.js';

// Shown when the browser can't open an immersive VR session (approved wording).
const NO_VR_NOTE = "Open this link in your headset's browser to enter VR.";

export function setupStartPage(world: World): void {
  const page = document.getElementById('start-page') as HTMLElement;
  const button = document.getElementById('enter-vr') as HTMLButtonElement;
  const note = document.getElementById('start-note') as HTMLElement;

  // The start page hides when VR starts and comes back when VR ends,
  // whatever way the session started or ended.
  world.renderer.xr.addEventListener('sessionstart', () => {
    page.hidden = true;
  });
  world.renderer.xr.addEventListener('sessionend', () => {
    page.hidden = false;
  });

  // launchXR runs inside the click itself, because browsers only open
  // VR in direct answer to a real user gesture.
  button.addEventListener('click', () => {
    // The same click wakes the paper sounds, which browsers allow only now.
    unlockAudio();
    world.launchXR();
  });

  const showNoVR = (): void => {
    button.disabled = true;
    note.textContent = NO_VR_NOTE;
    note.hidden = false;
  };

  const xr = navigator.xr;
  if (!xr) {
    showNoVR();
    return;
  }
  xr.isSessionSupported('immersive-vr')
    .then((supported) => {
      if (supported) {
        button.disabled = false;
        note.hidden = true;
      } else {
        showNoVR();
      }
    })
    .catch(showNoVR);
}

/** The reading switches on the start page, kept in step with the menu in VR. */
export function setupReadingSwitches(): void {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-setting]'));
  for (const input of inputs) {
    input.addEventListener('change', () => setSetting(input.dataset.setting as SettingKey, input.checked));
  }
  onSettings((settings) => {
    for (const input of inputs) input.checked = settings[input.dataset.setting as SettingKey];
  });
  // Read aloud shows only where the browser has a voice; voices can arrive late.
  const readAloud = document.getElementById('read-aloud-switch') as HTMLElement;
  const check = () => {
    readAloud.hidden = !canReadAloud();
  };
  check();
  onVoicesChanged(check);
}

/** Shown if the book fails to build, so the page never just sits there. */
export function showStartError(): void {
  const note = document.getElementById('start-note') as HTMLElement | null;
  if (!note) return;
  note.textContent = 'Something went wrong while opening the book. Please reload the page.';
  note.hidden = false;
}

/**
 * The gift form: two names, a dedication and the family photos. As the family
 * types, the address bar updates (after "#"), so the address itself is the
 * gift link, and the book repaints its cover, album and last page.
 */
export function setupGiftForm(onChange: (gift: Gift) => void): void {
  const form = document.getElementById('gift-form') as HTMLFormElement;
  const name1 = document.getElementById('name1') as HTMLInputElement;
  const name2 = document.getElementById('name2') as HTMLInputElement;
  const dedication = document.getElementById('dedication') as HTMLTextAreaElement;

  const fill = (gift: Gift) => {
    name1.value = gift.name1;
    name2.value = gift.name2;
    dedication.value = gift.dedication.join('\n');
  };
  // The saved photos' id is not a field: it comes from the link or a save.
  let photos = readGift().photos;
  const names = () => {
    const fallback = defaultGift();
    return [name1.value.trim() || fallback.name1, name2.value.trim() || fallback.name2] as const;
  };
  const fromFields = (): Gift => {
    const [first, second] = names();
    const lines = cleanDedication(dedication.value);
    return {
      name1: first,
      name2: second,
      dedication: lines.length > 0 ? lines : defaultDedication(first, second),
      photos,
    };
  };
  // While the dedication is still the story's own, it follows the names.
  // Once the family writes their own words, it is left alone.
  let lastNames = names();
  const followNames = () => {
    const next = names();
    if (dedication.value.trim() === defaultDedication(...lastNames).join('\n')) {
      dedication.value = defaultDedication(...next).join('\n');
    }
    lastNames = next;
  };

  // Enter in a field never reloads the page.
  form.addEventListener('submit', (event) => event.preventDefault());
  fill(readGift());
  lastNames = names();
  let timer = 0;
  const changed = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const gift = fromFields();
      writeGift(gift);
      onChange(gift);
    }, 250);
  };
  for (const field of [name1, name2]) field.addEventListener('input', followNames);
  for (const field of [name1, name2, dedication]) field.addEventListener('input', changed);

  setupPhotoPicker(
    () => photos !== '',
    (id) => {
      photos = id;
      const gift = fromFields();
      writeGift(gift);
      onChange(gift);
    },
  );

  // A second gift link opened in the same tab only changes the part after "#".
  window.addEventListener('hashchange', () => {
    const gift = readGift();
    photos = gift.photos;
    fill(gift);
    lastNames = names();
    onChange(gift);
  });
}
