import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './start/start-page.css';

import { Color, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { buildBook } from './book/book.js';
import { PageTurnSystem } from './book/page-turn-system.js';
import { TabSystem } from './book/tab-system.js';
import { loadFonts } from './paint/text.js';
import { setTextureQuality } from './paint/textures.js';
import { buildRoom } from './room/room.js';
import { setupStartPage } from './start/start-page.js';

// A warm, dim room color, so the space around the book is never black.
const ROOM_COLOR = '#3a2418';
// Quest blurs the edges of the view to save power (foveation). Text is the
// heart of the book, so we ask for a gentler level than the maximum.
const FOVEATION = 0.5;

const container = document.getElementById('scene-container') as HTMLDivElement;

World.create(container, projectOptions).then(async (world) => {
  world.scene.background = new Color(ROOM_COLOR);
  world.renderer.xr.setFoveation(FOVEATION);
  setTextureQuality(world.renderer);

  // Text is painted on canvas, so the font must be ready before painting.
  await loadFonts();
  buildRoom(world);
  buildBook(world);
  world.registerSystem(PageTurnSystem);
  world.registerSystem(TabSystem);

  // Hand rays draw a laser line and a cursor (a sci fi look), so they are off.
  // Pinch (grab) and poke carry every action, with either hand.
  world.input.xr.multiPointers.left.toggleSubPointer('ray', false);
  world.input.xr.multiPointers.right.toggleSubPointer('ray', false);

  // Enter VR turns on only now, when the book is ready.
  setupStartPage(world);
});
