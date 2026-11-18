import { Types, createComponent } from '@iwsdk/core';

// ECS data for the paper menu in VR.

/** One paper button on the menu card: which setting it turns on and off. */
export const MenuButton = createComponent('MenuButton', {
  /** Index into MENU_SETTINGS. */
  setting: { type: Types.Int8, default: 0 },
});
