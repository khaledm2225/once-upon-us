import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-600.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import './start/start-page.css';

import { Color, type Material, type Mesh, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { LEAF_COUNT, buildBook } from './book/book.js';
import { NORMAL_TEXT, paintDedicationPage, printBookText } from './book/page-text.js';
import { bookEvents } from './book/page-turn-system.js';
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
import { SessionSystem } from './session/session-system.js';
import { setupGiftForm, setupStartPage, showStartError } from './start/start-page.js';
import { loadPage, restorePage, savePage, turnedCount } from './state/progress.js';
import { type Gift, readGift } from './story/personalize.js';

// A warm, dim room color, so the space around the book is never black.
const ROOM_COLOR = '#211f1d';
// Quest blurs the edges of the view to save power (foveation). Text is the
// heart of the book, so we ask for a gentler level than the maximum.
const FOVEATION = 0.5;

const container = document.getElementById('scene-container') as HTMLDivElement;

/**
 * IWSDK 1.1.0 still draws a small white cursor dot where a hand pointer
 * touches something, even with rays off. The paper gives its own feedback, so
 * the dot is hidden: it is the circle mesh IWSDK draws last (renderOrder
 * Infinity) and marks as attached. Its material stays hidden while IWSDK keeps
 * toggling the mesh. The dots appear once hands connect, so this keeps looking.
 */
function hidePointerCursors(world: World): void {
  const hidden = new Set<Mesh>();
  const sweep = () => {
    world.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && mesh.renderOrder === Infinity && mesh.userData.attached === true) {
        (mesh.material as Material).visible = false;
        hidden.add(mesh);
      }
    });
  };
  const timer = window.setInterval(() => {
    sweep();
    if (hidden.size >= 2) window.clearInterval(timer);
  }, 1000);
}

World.create(container, projectOptions)
  .then(async (world) => {
  world.scene.background = new Color(ROOM_COLOR);
  world.renderer.xr.setFoveation(FOVEATION);
  setTextureQuality(world.renderer);

  // Text is painted on canvas, so the font must be ready before painting.
  await loadFonts();
  buildRoom(world);
  const book = buildBook(world);
  const text = printBookText(world, book);

  // The gift: names on the cover and the dedication on the last page.
  let gift: Gift = readGift();
  const applyGift = (next: Gift) => {
    gift = next;
    book.repaintCover(next.name1, next.name2);
    paintDedicationPage(text.dedicationTexture, next.dedication, NORMAL_TEXT);
  };
  applyGift(gift);
  setupGiftForm(applyGift);

  // Pause and resume: back to the saved page at once, saved again on every landing.
  restorePage(book.leaves, loadPage(gift, LEAF_COUNT));
  bookEvents.addEventListener('land', () => savePage(gift, turnedCount(book.leaves)));
  // Spread k stands between leaf k−1 (left page) and leaf k (right page).
  for (const scene of [busStopScene(), weddingScene(), firstHomeScene(), busyYearsScene(), todayScene()]) {
    buildScene(world, scene, book.leaves[scene.spread - 1], book.leaves[scene.spread]);
  }
  world.registerSystem(PageTurnSystem);
  world.registerSystem(TabSystem);
  world.registerSystem(PopUpSystem);
  world.registerSystem(SceneMotionSystem);
  world.registerSystem(SessionSystem);

  // Hand rays draw a laser line and a cursor (a sci fi look), so they are off.
  // Pinch (grab) and poke carry every action, with either hand.
  world.input.xr.multiPointers.left.toggleSubPointer('ray', false);
  world.input.xr.multiPointers.right.toggleSubPointer('ray', false);
  hidePointerCursors(world);

  // Enter VR turns on only now, when the book is ready.
  setupStartPage(world);
})
  .catch((error: unknown) => {
    console.error(error);
    showStartError();
  });
