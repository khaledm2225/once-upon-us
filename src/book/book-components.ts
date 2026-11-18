import { Types, createComponent } from '@iwsdk/core';

// ECS data for the book. A leaf is one turnable sheet (the cover is leaf 0).
// angle 0 means lying on the right, π means lying on the left.

export const LeafState = {
  Rest: 0,
  Held: 1,
  Settling: 2,
} as const;

export const Leaf = createComponent('Leaf', {
  index: { type: Types.Int8, default: 0 },
  angle: { type: Types.Float32, default: 0 },
  target: { type: Types.Float32, default: 0 },
  state: { type: Types.Int8, default: LeafState.Rest },
  restRight: { type: Types.Float32, default: 0 },
  restLeft: { type: Types.Float32, default: Math.PI },
});

/** The invisible grab box at a leaf's free corner. */
export const CornerHandle = createComponent('CornerHandle', {
  leaf: { type: Types.Entity, default: null },
});

/** A big paper tab to poke: direction 1 turns forward, -1 turns back. */
export const TurnTab = createComponent('TurnTab', {
  direction: { type: Types.Int8, default: 1 },
});
