import { GrabSystem, Grabbed, createSystem } from '@iwsdk/core';

import { CornerHandle } from '../book/book-components.js';

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
      if (session.visibilityState !== 'visible') this.releaseAll();
    };
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.world.session?.addEventListener('visibilitychange', onVisibility);
    });
  }

  releaseAll(): void {
    const grab = this.world.getSystem(GrabSystem);
    for (const handle of [...this.queries.heldHandles.entities]) grab?.forceRelease(handle);
  }
}
