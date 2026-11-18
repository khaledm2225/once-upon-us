import { Types, createComponent } from '@iwsdk/core';

// ECS data for the photo album.

/** One print in the album: photo number 0 to 9 (page = floor(index / 2)). */
export const AlbumPrint = createComponent('AlbumPrint', {
  index: { type: Types.Int8, default: 0 },
});
