import { GrabSystem, Grabbed, createSystem } from '@iwsdk/core';

import { CornerHandle } from '../book/book-components.js';
import { stopSpeaking } from '../settings/read-aloud.js';
import { pauseAudio } from '../sound/paper-sound.js';

// Headset off or the Quest menu open: the XR session stops being fully visible.
// A page held in that moment is let go, so it eases to its nearest side
// instead of hanging mid air. This runs from the session's own visibility
// event, because systems stop running while the session is hidden.

export class SessionSystem extends createSystem({
  heldHandles: { required: [CornerHandle, Grabbed] },
}) {
  init(): void {
    const onVisibility = (event: Event) => {
      const session = event.target as XRSession;
      const visible = session.visibilityState === 'visible';
      if (!visible) {
        this.releaseAll();
        stopSpeaking();
      }
      pauseAudio(!visible);
    };
    // three hands over the session before IWSDK stores it, so ask three.
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.renderer.xr.getSession()?.addEventListener('visibilitychange', onVisibility);
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.releaseAll();
      stopSpeaking();
      // Back on the start page nothing plays; the next Enter VR click wakes it.
      pauseAudio(true);
    });
  }

  releaseAll(): void {
    const grab = this.world.getSystem(GrabSystem);
    for (const handle of [...this.queries.heldHandles.entities]) grab?.forceRelease(handle);
  }
}
