import {
  BoxGeometry,
  type CanvasTexture,
  Group,
  Mesh,
  MeshLambertMaterial,
  PokeInteractable,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import { setFont } from '../paint/text.js';
import { COLORS, makeCanvas, paintPaper, toTexture } from '../paint/textures.js';
import type { SettingKey } from '../settings/settings.js';
import { MenuButton } from './menu-components.js';

// A row of paper buttons along the front edge of the table, centered under
// the book: within reach of either hand, and just below where the reader
// already looks. Each button turns one reading setting on or off with a poke.

export const MENU_SETTINGS: readonly { key: SettingKey; label: string }[] = [
  { key: 'largeText', label: 'Large text' },
  { key: 'highContrast', label: 'High contrast' },
  { key: 'largeTabs', label: 'Large tabs' },
  { key: 'readAloud', label: 'Read aloud' },
];

const BUTTON = { width: 0.108, height: 0.006, depth: 0.046 } as const;
/** Space between buttons, wider than a fingertip's poke reach (2 cm). */
const BUTTON_GAP = 0.022;
const BUTTON_PX = { w: 480, h: 204 } as const;
/** The row's place: centered under the book, near the table's front edge. */
const ROW = { z: -0.215, tilt: 0.25 } as const;

export interface MenuButtonView {
  key: SettingKey;
  mesh: Mesh;
  texture: CanvasTexture;
  restY: number;
}

export interface Menu {
  buttons: MenuButtonView[];
  /** Repaints one button's check mark. */
  paint(view: MenuButtonView, on: boolean): void;
  /** Lays the row out, centered, with or without the Read aloud button. */
  layout(withReadAloud: boolean): void;
}

function paintButton(texture: CanvasTexture, label: string, on: boolean): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const { w, h } = BUTTON_PX;
  paintPaper(ctx, w, h, on ? '#f6ecda' : COLORS.paper, 61);
  // The check box: an ink square, filled with a check mark when on.
  const box = 74;
  const bx = 26;
  const by = (h - box) / 2;
  ctx.lineWidth = 8;
  ctx.strokeStyle = COLORS.ink;
  ctx.strokeRect(bx, by, box, box);
  if (on) {
    ctx.beginPath();
    ctx.moveTo(bx + 18, by + box * 0.52);
    ctx.lineTo(bx + box * 0.42, by + box - 20);
    ctx.lineTo(bx + box - 14, by + 16);
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  setFont(ctx, 48, on ? 700 : 400);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + box + 22, h / 2 + 3);
  texture.needsUpdate = true;
}

export function buildMenu(world: World): Menu {
  const row = new Group();
  row.name = 'reading-menu';
  // Tilted up toward the reader a little, with its near edge on the table.
  row.position.set(0, LAYOUT.tableTopY + (BUTTON.depth / 2) * Math.sin(ROW.tilt) + 0.004, ROW.z);
  row.rotation.x = ROW.tilt;
  const rowEntity = world.createTransformEntity(row);

  const rowWidth = (count: number) => count * BUTTON.width + (count - 1) * BUTTON_GAP;
  const [paperCanvas, paperCtx] = makeCanvas(512, 64);
  paintPaper(paperCtx, 512, 64, COLORS.paperEdge, 71);
  // The strip is 1 m wide in its geometry and scaled to the row's width.
  const base = new Mesh(
    new BoxGeometry(1, 0.003, BUTTON.depth + 0.014),
    new MeshLambertMaterial({ map: toTexture(paperCanvas, false, false) }),
  );
  base.name = 'reading-menu-strip';
  row.add(base);

  // Two draw calls per button: the printed top face, and the plain sides.
  const buttonGeo = new BoxGeometry(BUTTON.width, BUTTON.height, BUTTON.depth);
  buttonGeo.clearGroups();
  buttonGeo.addGroup(0, 12, 0);
  buttonGeo.addGroup(12, 6, 1);
  buttonGeo.addGroup(18, 18, 0);
  const restY = 0.0015 + BUTTON.height / 2;
  const side = new MeshLambertMaterial({ color: COLORS.paperEdge });
  const buttons: MenuButtonView[] = MENU_SETTINGS.map((setting, index) => {
    const [canvas] = makeCanvas(BUTTON_PX.w, BUTTON_PX.h);
    const texture = toTexture(canvas);
    paintButton(texture, setting.label, false);
    // Only the top face prints the label; the sides are plain paper.
    const top = new MeshLambertMaterial({ map: texture });
    const mesh = new Mesh(buttonGeo, [side, top]);
    mesh.name = `menu-${setting.key}`;
    mesh.position.set(0, restY, 0);
    const entity = world.createTransformEntity(mesh, { parent: rowEntity });
    entity.addComponent(MenuButton, { setting: index });
    entity.addComponent(PokeInteractable);
    return { key: setting.key, mesh, texture, restY };
  });

  const layout = (withReadAloud: boolean) => {
    const shown = buttons.filter((view) => withReadAloud || view.key !== 'readAloud');
    const total = rowWidth(shown.length);
    base.scale.x = total + 0.02;
    for (const view of buttons) view.mesh.visible = shown.includes(view);
    shown.forEach((view, index) => {
      view.mesh.position.x = -total / 2 + BUTTON.width / 2 + index * (BUTTON.width + BUTTON_GAP);
    });
  };
  layout(false);

  return {
    buttons,
    paint: (view, on) => {
      const label = MENU_SETTINGS.find((s) => s.key === view.key)?.label ?? '';
      paintButton(view.texture, label, on);
    },
    layout,
  };
}
