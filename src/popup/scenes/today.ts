import { Mesh, MeshLambertMaterial, PlaneGeometry } from '@iwsdk/core';

import { makeCanvas, toTexture } from '../../paint/textures.js';
import { PAPER, cloudBand, figure, hills, knitStripes, paperShape } from '../paper-art.js';
import type { SceneDef } from '../popup-builder.js';
import { MotionKind } from '../popup-components.js';

// Page 5, today: the two of them on a bench, holding hands, watching the
// sunset. The paper sun lowers slowly behind the hills.

function buildSun(): Mesh {
  const [canvas, ctx] = makeCanvas(128, 128);
  const sun = new Path2D();
  sun.arc(64, 64, 58, 0, Math.PI * 2);
  paperShape(ctx, sun, '#e3632b', { edge: 'rgba(120, 40, 10, 0.35)' });
  const material = new MeshLambertMaterial({ map: toTexture(canvas), alphaTest: 0.5, emissive: '#b8461c', emissiveIntensity: 0.35 });
  const mesh = new Mesh(new PlaneGeometry(0.034, 0.034), material);
  mesh.name = 'sun';
  return mesh;
}

export function todayScene(): SceneDef {
  return {
    spread: 5,
    layers: [
      {
        name: 'sky',
        z: -0.035,
        height: 0.11,
        paint: (ctx, w, h) => {
          paperShape(ctx, cloudBand(30, w - 30, 14, h, 26, 505), '#efa772');
          const birds = new Path2D();
          for (const [x, y] of [
            [660, 60],
            [700, 46],
          ] as const) {
            birds.moveTo(x - 12, y);
            birds.quadraticCurveTo(x - 6, y - 7, x, y);
            birds.quadraticCurveTo(x + 6, y - 7, x + 12, y);
          }
          ctx.strokeStyle = '#6b3a24';
          ctx.lineWidth = 3;
          ctx.stroke(birds);
        },
        attachments: [
          {
            side: 'right',
            x: 0.07,
            y: 0.072,
            build: buildSun,
            motion: { kind: MotionKind.Sun, seed: 0 },
          },
        ],
      },
      {
        name: 'hills',
        z: -0.018,
        height: 0.06,
        paint: (ctx, w, h) => {
          paperShape(ctx, hills(30, w - 30, h * 0.45, h, h * 0.25, 3, 0.4), PAPER.olive);
          paperShape(ctx, hills(30, w - 30, h * 0.75, h, h * 0.18, 4, 1.7), '#8f7a3e');
        },
      },
      {
        name: 'bench',
        z: 0.008,
        height: 0.095,
        paint: (ctx, w, h) => {
          // The tree on the left: trunk, branches and a cream paper crown.
          const trunk = new Path2D();
          trunk.moveTo(232, h);
          trunk.lineTo(250, h * 0.42);
          trunk.lineTo(236, h * 0.3);
          trunk.lineTo(262, h * 0.4);
          trunk.lineTo(290, h * 0.26);
          trunk.lineTo(272, h * 0.46);
          trunk.lineTo(268, h);
          trunk.closePath();
          paperShape(ctx, trunk, PAPER.bark);
          const crown = new Path2D();
          for (const [cx, cy, r] of [
            [210, 60, 52],
            [270, 44, 58],
            [320, 70, 46],
            [250, 92, 44],
          ] as const) {
            crown.moveTo(cx + r, cy);
            crown.arc(cx, cy, r, 0, Math.PI * 2);
          }
          // One soft crown: no cut lines between the round puffs.
          paperShape(ctx, crown, '#efd9b4', { edge: 'rgba(0, 0, 0, 0)' });
          // The couple from behind: gray hair, striped winter knits.
          // Seated, seen from behind: their legs are hidden by the backrest.
          const him = figure(ctx, 556, h - 12, 178, { coat: PAPER.terracotta, legs: PAPER.terracotta, hair: PAPER.hairGray }, { hat: PAPER.charcoal });
          knitStripes(ctx, him, h - 150, h - 60, [PAPER.cream, PAPER.charcoal, PAPER.camel, PAPER.navy], 12);
          const her = figure(ctx, 474, h - 12, 164, { coat: PAPER.terracotta, legs: PAPER.terracotta, hair: PAPER.hairGray });
          knitStripes(ctx, her, h - 136, h - 60, [PAPER.cream, PAPER.rust], 14);
          const hands = new Path2D();
          hands.roundRect(498, h - 96, 38, 10, 4);
          paperShape(ctx, hands, PAPER.skinShadow, { edgeWidth: 1 });
          // The wooden bench: a solid backrest board, a seat edge and two legs.
          const bench = new Path2D();
          bench.roundRect(384, h - 86, 260, 46, 4);
          bench.roundRect(384, h - 34, 260, 12, 3);
          bench.roundRect(396, h - 40, 12, 40, 3);
          bench.roundRect(620, h - 40, 12, 40, 3);
          paperShape(ctx, bench, PAPER.wood);
          const slatLines = new Path2D();
          slatLines.moveTo(388, h - 63);
          slatLines.lineTo(640, h - 63);
          ctx.strokeStyle = 'rgba(80, 45, 20, 0.45)';
          ctx.lineWidth = 2;
          ctx.stroke(slatLines);
        },
      },
      {
        name: 'bushes',
        z: 0.035,
        height: 0.03,
        paint: (ctx, w, h) => {
          const bushes = new Path2D();
          bushes.ellipse(150, h, 110, 52, 0, Math.PI, 0);
          bushes.ellipse(330, h, 80, 40, 0, Math.PI, 0);
          bushes.ellipse(760, h, 100, 46, 0, Math.PI, 0);
          bushes.ellipse(900, h, 70, 34, 0, Math.PI, 0);
          paperShape(ctx, bushes, PAPER.oliveDark);
        },
      },
    ],
  };
}
