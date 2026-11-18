import type { World } from '@iwsdk/core';

import { type Gift, cleanDedication, defaultGift, readGift, writeGift } from '../story/personalize.js';

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

/** Shown if the book fails to build, so the page never just sits there. */
export function showStartError(): void {
  const note = document.getElementById('start-note') as HTMLElement | null;
  if (!note) return;
  note.textContent = 'Something went wrong while opening the book. Please reload the page.';
  note.hidden = false;
}

/**
 * The gift form: two names and a dedication. As the family types, the
 * address bar updates (after "#"), so the address itself is the gift link,
 * and the book repaints its cover and last page.
 */
export function setupGiftForm(onChange: (gift: Gift) => void): void {
  const name1 = document.getElementById('name1') as HTMLInputElement;
  const name2 = document.getElementById('name2') as HTMLInputElement;
  const dedication = document.getElementById('dedication') as HTMLTextAreaElement;

  const fill = (gift: Gift) => {
    name1.value = gift.name1;
    name2.value = gift.name2;
    dedication.value = gift.dedication.join('\n');
  };
  const fromFields = (): Gift => {
    const fallback = defaultGift();
    const lines = cleanDedication(dedication.value);
    return {
      name1: name1.value.trim() || fallback.name1,
      name2: name2.value.trim() || fallback.name2,
      dedication: lines.length > 0 ? lines : fallback.dedication,
    };
  };

  fill(readGift());
  let timer = 0;
  const changed = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const gift = fromFields();
      writeGift(gift);
      onChange(gift);
    }, 250);
  };
  for (const field of [name1, name2, dedication]) field.addEventListener('input', changed);

  // A second gift link opened in the same tab only changes the part after "#".
  window.addEventListener('hashchange', () => {
    const gift = readGift();
    fill(gift);
    onChange(gift);
  });
}
