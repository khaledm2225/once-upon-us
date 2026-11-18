import { Types, createComponent } from '@iwsdk/core';

// ECS data for the printed text.

/** One printed line on a page: 0 to 4 are story pages, 5 is the dedication. */
export const TextLine = createComponent('TextLine', {
  page: { type: Types.Int8, default: 0 },
});
