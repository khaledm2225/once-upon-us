import {
  BoxGeometry,
  type CanvasTexture,
  type Entity,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OneHandGrabbable,
  PlaneGeometry,
  PokeInteractable,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import { drawCenteredLine, fitFontSize } from '../paint/text.js';
import {
  COLORS,
  clothTexture,
  makeCanvas,
  paintCloth,
  paintPaper,
  paperTexture,
  softShadowTexture,
  toTexture,
  woodTexture,
} from '../paint/textures.js';
import { coverNamesLine, story } from '../story/story.js';
import { CornerHandle, Leaf, LeafState, TurnTab } from './book-components.js';

/** The cover plus 5 sheets. */
export const LEAF_COUNT = 6;
/** Tiny angle between stacked leaves, so pages never flicker against each other. */
const REST_STEP = 0.004;

/** Rest angle on the right stack: the top leaf (lowest index) sits highest. */
export function restRightAngle(index: number): number {
  return REST_STEP * (LEAF_COUNT - index);
}

/** Rest angle on the left stack: the first leaf turned sits lowest. */
export function restLeftAngle(index: number): number {
  return Math.PI - REST_STEP * index;
}

export interface Book {
  root: Group;
  entity: Entity;
  leaves: Entity[];
  /** The paper mesh of each leaf; each has its own material list per face. */
  leafMeshes: Mesh[];
  repaintCover(name1: string, name2: string): void;
}

const W = LAYOUT.page.width;
const D = LAYOUT.page.depth;

/** Normal tab size in meters (x across, z along the page edge). */
export const TAB_SIZE = { x: 0.07, z: 0.1 } as const;
/** Tabs sit toward the far side of the page edge, away from the corners. */
const TAB_Z = -0.02;

/** A paper tab with a bold ink arrow: right for forward, left for back. */
function tabArrowTexture(direction: 1 | -1): CanvasTexture {
  const [canvas, ctx] = makeCanvas(160, 224);
  paintPaper(ctx, 160, 224, COLORS.paper, 41 + direction);
  ctx.save();
  ctx.translate(80, 112);
  // The tab's +y face maps canvas width to the book's x axis.
  ctx.scale(direction, 1);
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.moveTo(-56, -18);
  ctx.lineTo(10, -18);
  ctx.lineTo(10, -50);
  ctx.lineTo(62, 0);
  ctx.lineTo(10, 50);
  ctx.lineTo(10, 18);
  ctx.lineTo(-56, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return toTexture(canvas);
}

function paintCover(texture: CanvasTexture, name1: string, name2: string): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const { width, height } = canvas;
  paintCloth(ctx, width, height);
  // A thin pressed frame, like a cloth cover's border.
  ctx.strokeStyle = 'rgba(236, 215, 180, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 56, width - 112, height - 112);
  const titleSize = fitFontSize(ctx, story.cover.title, width - 200, 118, 700);
  drawCenteredLine(ctx, story.cover.title, width / 2, height * 0.42, titleSize, COLORS.coverFoil, 700);
  const names = coverNamesLine(name1, name2);
  const namesSize = fitFontSize(ctx, names, width - 220, 66, 400);
  drawCenteredLine(ctx, names, width / 2, height * 0.42 + titleSize * 1.15, namesSize, COLORS.coverFoil, 400);
  texture.needsUpdate = true;
}

export function buildBook(world: World): Book {
  const tilt = (LAYOUT.book.tiltDeg * Math.PI) / 180;
  const coverT = LAYOUT.cover.thickness;
  const over = LAYOUT.cover.overhang;

  // Book root: its origin is the spine line. The far edge is lifted
  // by the tilt, so the near edge rests just above the table.
  const root = new Group();
  root.name = 'book';
  root.position.set(
    LAYOUT.book.x,
    LAYOUT.tableTopY + coverT + 0.014 + (D / 2) * Math.sin(tilt),
    LAYOUT.book.z,
  );
  root.rotation.x = tilt;
  const bookEntity = world.createTransformEntity(root);

  // Shared materials, reused by every page.
  const paperMat = new MeshLambertMaterial({ map: paperTexture() });
  const edgeMat = new MeshLambertMaterial({ color: COLORS.paperEdge });
  const clothMat = new MeshLambertMaterial({ map: clothTexture() });
  clothMat.map!.repeat.set(3, 3);
  const woodMat = new MeshLambertMaterial({ map: woodTexture(256, 256) });

  // Wooden book rest under the open book, plus its back support.
  const restBoard = new Mesh(new BoxGeometry(2 * W + 0.05, 0.012, D + 0.03), woodMat);
  restBoard.position.set(0, -coverT - 0.006, 0);
  root.add(restBoard);
  const supportHeight = (D + 0.03) * Math.sin(tilt);
  const support = new Mesh(new BoxGeometry(2 * W + 0.05, supportHeight, 0.018), woodMat);
  support.rotation.x = -tilt;
  support.position.set(0, -coverT - 0.012 - (supportHeight / 2) * Math.cos(tilt), -D / 2 - 0.006);
  root.add(support);

  // Back board (fixed, under the right stack) and the spine.
  const board = new Mesh(new BoxGeometry(W + over, coverT, D + 2 * over), clothMat);
  board.position.set((W + over) / 2, -coverT / 2, 0);
  root.add(board);
  const spine = new Mesh(new BoxGeometry(0.012, coverT + 0.002, D + 2 * over), clothMat);
  spine.position.set(-0.002, -coverT / 2 - 0.0015, 0);
  root.add(spine);

  // Cover texture with the title and the two names.
  const [coverCanvas] = makeCanvas(1024, 1280);
  const coverTexture = toTexture(coverCanvas);
  paintCover(coverTexture, story.cover.name1, story.cover.name2);
  const coverOutsideMat = new MeshLambertMaterial({ map: coverTexture });

  // Leaves: the cover (index 0) and 5 paper sheets, each on a pivot at the spine.
  const leafGeo = new BoxGeometry(W, LAYOUT.page.thickness, D);
  leafGeo.translate(W / 2, LAYOUT.page.thickness / 2, 0);
  // Two draw calls per page instead of six: the back face (indices 18 to 23)
  // uses material 1, everything else uses material 0.
  leafGeo.clearGroups();
  leafGeo.addGroup(0, 18, 0);
  leafGeo.addGroup(18, 6, 1);
  leafGeo.addGroup(24, 12, 0);
  const coverGeo = new BoxGeometry(W + over, coverT, D + 2 * over);
  coverGeo.translate((W + over) / 2, coverT / 2, 0);
  // Box faces in order: +x, -x, +y (front), -y (back), +z, -z.
  const leafMats = [paperMat, paperMat];
  void edgeMat;
  const coverMats = [clothMat, clothMat, coverOutsideMat, paperMat, clothMat, clothMat];

  const leaves: Entity[] = [];
  const leafMeshes: Mesh[] = [];
  for (let index = 0; index < LEAF_COUNT; index++) {
    const pivot = new Group();
    pivot.name = index === 0 ? 'cover' : `leaf-${index}`;
    // Each leaf gets its own list, so its two faces can print different pages.
    const mesh = new Mesh(index === 0 ? coverGeo : leafGeo, index === 0 ? [...coverMats] : [...leafMats]);
    leafMeshes.push(mesh);
    pivot.add(mesh);
    const rest = restRightAngle(index);
    pivot.rotation.z = rest;
    const leafEntity = world.createTransformEntity(pivot, { parent: bookEntity });
    leafEntity.addComponent(Leaf, {
      index,
      angle: rest,
      target: rest,
      state: LeafState.Rest,
      restRight: rest,
      restLeft: restLeftAngle(index),
    });
    leaves.push(leafEntity);
  }

  // One grab box per leaf at its near outer corner. It draws nothing
  // (hidden material) but stays a grab target. The box is centered on the
  // page plane, so it reaches the palm above the page on either side.
  // PageTurnSystem keeps only the top page on each side grabbable.
  const handleMat = new MeshBasicMaterial({ visible: false });
  // Page corner boxes reach a little past the near edge, toward the hand,
  // which keeps them well apart from the paper tabs.
  const handleGeo = new BoxGeometry(0.12, 0.12, 0.08);
  // The cover opens from anywhere along its outer edge, like a real book.
  const coverEdgeGeo = new BoxGeometry(0.1, 0.12, D + 0.02);
  leaves.forEach((leafEntity, index) => {
    const handle = new Mesh(index === 0 ? coverEdgeGeo : handleGeo, handleMat);
    handle.name = index === 0 ? 'cover-corner' : `leaf-${index}-corner`;
    if (index === 0) handle.position.set(W - 0.03, 0, 0);
    else handle.position.set(W - 0.02, 0, D / 2 + 0.01);
    const handleEntity = world.createTransformEntity(handle, { parent: leafEntity });
    handleEntity.addComponent(CornerHandle, { leaf: leafEntity });
    handleEntity.addComponent(OneHandGrabbable, { rotate: false, translate: false });
  });

  // Large paper tabs for a poke: forward on the right edge, back on the left.
  // They sit toward the far side, well apart from the corner grab boxes.
  // One shared paper material with the arrow; the back tab is the same tab
  // turned half around, so its arrow points left. One draw call per tab.
  const tabGeo = new BoxGeometry(TAB_SIZE.x, 0.002, TAB_SIZE.z);
  const tabMat = new MeshLambertMaterial({ map: tabArrowTexture(1) });
  for (const direction of [1, -1] as const) {
    const tab = new Mesh(tabGeo, tabMat);
    if (direction === -1) tab.rotation.y = Math.PI;
    tab.name = direction === 1 ? 'tab-forward' : 'tab-back';
    tab.position.set(direction * (W + over + TAB_SIZE.x / 2 - 0.004), 0.003, TAB_Z);
    const tabEntity = world.createTransformEntity(tab, { parent: bookEntity });
    tabEntity.addComponent(TurnTab, { direction });
    tabEntity.addComponent(PokeInteractable);
  }

  // Painted soft shadow on the table, under the book and its rest.
  const bookShadow = new Mesh(
    new PlaneGeometry(2 * W + 0.16, D + 0.16),
    new MeshBasicMaterial({
      map: softShadowTexture(256, 160, 26, 16, 0.5),
      transparent: true,
      depthWrite: false,
    }),
  );
  bookShadow.rotation.x = -Math.PI / 2;
  bookShadow.position.set(LAYOUT.book.x, LAYOUT.tableTopY + 0.0006, LAYOUT.book.z - 0.01);
  world.createTransformEntity(bookShadow);

  return {
    root,
    entity: bookEntity,
    leaves,
    leafMeshes,
    repaintCover: (name1, name2) => paintCover(coverTexture, name1, name2),
  };
}
