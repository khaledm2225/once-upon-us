import { Types, createComponent } from '@iwsdk/core';

// ECS data for the pop-up scenes.

/** One half of one paper layer. Its stand angle follows its spread's opening. */
export const PopLayer = createComponent('PopLayer', {
  spread: { type: Types.Int8, default: 1 },
  /** 1 when fully open means standing straight up. */
  fullStand: { type: Types.Float32, default: 1 },
});

/** A small gentle motion inside a scene. */
export const MotionKind = {
  Rain: 0,
  Sway: 1,
  Window: 2,
  Steam: 3,
  Sun: 4,
} as const;

export const SceneMotion = createComponent('SceneMotion', {
  spread: { type: Types.Int8, default: 1 },
  kind: { type: Types.Int8, default: MotionKind.Rain },
  /** Free number per motion (for example a phase offset). */
  seed: { type: Types.Float32, default: 0 },
});
