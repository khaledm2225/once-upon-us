import type { World } from '@iwsdk/core';

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
