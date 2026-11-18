import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './start/start-page.css';

import { Color, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { setupStartPage } from './start/start-page.js';

// A warm, dim room color, so the space around the book is never black.
const ROOM_COLOR = '#3a2418';

const container = document.getElementById('scene-container') as HTMLDivElement;

World.create(container, projectOptions).then((world) => {
  world.scene.background = new Color(ROOM_COLOR);
  setupStartPage(world);
});
