import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './start/start-page.css';

import { Color, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { buildBook } from './book/book.js';
import { printBookText } from './book/page-text.js';
import { PageTurnSystem } from './book/page-turn-system.js';
import { TabSystem } from './book/tab-system.js';
import { loadFonts } from './paint/text.js';
import { buildScene } from './popup/popup-builder.js';
import { PopUpSystem } from './popup/popup-system.js';
import { SceneMotionSystem } from './popup/scene-motion-system.js';
import { busStopScene } from './popup/scenes/bus-stop.js';
import { busyYearsScene } from './popup/scenes/busy-years.js';
import { firstHomeScene } from './popup/scenes/first-home.js';
import { todayScene } from './popup/scenes/today.js';
import { weddingScene } from './popup/scenes/wedding.js';
import { setTextureQuality } from './paint/textures.js';
import { buildRoom } from './room/room.js';
import { setupStartPage, showStartError } from './start/start-page.js';

// A warm, dim room color, so the space around the book is never black.
const ROOM_COLOR = '#3a2418';
// Quest blurs the edges of the view to save power (foveation). Text is the
// heart of the book, so we ask for a gentler level than the maximum.
const FOVEATION = 0.5;

const container = document.getElementById('scene-container') as HTMLDivElement;

World.create(container, projectOptions)
  .then(async (world) => {
  world.scene.background = new Color(ROOM_COLOR);
  world.renderer.xr.setFoveation(FOVEATION);
  setTextureQuality(world.renderer);

  // Text is painted on canvas, so the font must be ready before painting.
  await loadFonts();
  buildRoom(world);
  const book = buildBook(world);
  printBookText(world, book);
  // Spread k stands between leaf k−1 (left page) and leaf k (right page).
  for (const scene of [busStopScene(), weddingScene(), firstHomeScene(), busyYearsScene(), todayScene()]) {
    buildScene(world, scene, book.leaves[scene.spread - 1], book.leaves[scene.spread]);
  }
  world.registerSystem(PageTurnSystem);
  world.registerSystem(TabSystem);
  world.registerSystem(PopUpSystem);
  world.registerSystem(SceneMotionSystem);

  // Hand rays draw a laser line and a cursor (a sci fi look), so they are off.
  // Pinch (grab) and poke carry every action, with either hand.
  world.input.xr.multiPointers.left.toggleSubPointer('ray', false);
  world.input.xr.multiPointers.right.toggleSubPointer('ray', false);

  // Enter VR turns on only now, when the book is ready.
  setupStartPage(world);
})
  .catch((error: unknown) => {
    console.error(error);
    showStartError();
  });
