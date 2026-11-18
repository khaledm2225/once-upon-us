import { seededRandom } from '../../paint/textures.js';
import { PAPER, chair, paperShape } from '../paper-art.js';
import type { SceneDef } from '../popup-builder.js';

// Page 4, the busy years: a dinner table with many chairs, small and big.
// Warm indoor light, full plates.

export function busyYearsScene(): SceneDef {
  return {
    spread: 4,
    layers: [
      {
        name: 'wall',
        z: -0.035,
        height: 0.11,
        paint: (ctx, w, h) => {
          const wall = new Path2D();
          wall.roundRect(30, 10, w - 60, h - 10, 8);
          paperShape(ctx, wall, '#c99d6c');
          const window = new Path2D();
          window.roundRect(700, 50, 170, 130, 4);
          paperShape(ctx, window, '#3e2b22');
          const frame = new Path2D();
          frame.roundRect(700, 50, 170, 10, 2);
          frame.roundRect(700, 170, 170, 10, 2);
          frame.roundRect(700, 50, 10, 130, 2);
          frame.roundRect(860, 50, 10, 130, 2);
          frame.roundRect(780, 50, 10, 130, 2);
          paperShape(ctx, frame, PAPER.cream);
          const lamp = new Path2D();
          lamp.roundRect(509, 10, 6, 60, 2);
          lamp.moveTo(462, 110);
          lamp.lineTo(482, 66);
          lamp.lineTo(542, 66);
          lamp.lineTo(562, 110);
          lamp.closePath();
          paperShape(ctx, lamp, '#efd8b0');
        },
      },
      {
        name: 'back-chairs',
        z: -0.012,
        height: 0.07,
        paint: (ctx, w, h) => {
          const sizes = [150, 120, 165, 95, 140, 110];
          const colors = ['#8a5a34', PAPER.navy, '#8a5a34', PAPER.rust, '#8a5a34', PAPER.sage];
          sizes.forEach((size, i) => chair(ctx, 230 + i * 113, h - 2, size, colors[i]));
        },
      },
      {
        name: 'table',
        z: 0.008,
        height: 0.05,
        paint: (ctx, w, h) => {
          const cloth = new Path2D();
          cloth.moveTo(150, 40);
          cloth.lineTo(w - 150, 40);
          cloth.lineTo(w - 130, h);
          cloth.lineTo(130, h);
          cloth.closePath();
          paperShape(ctx, cloth, PAPER.cream);
          const random = seededRandom(44);
          const plates = new Path2D();
          const bowls = new Path2D();
          for (let i = 0; i < 9; i++) {
            const x = 200 + i * 78;
            plates.ellipse(x, 36, 26, 8, 0, 0, Math.PI * 2);
            if (random() < 0.6) bowls.ellipse(x + 10, 28, 12, 9, 0, Math.PI, 0);
          }
          paperShape(ctx, plates, '#f7efe0', { edgeWidth: 1 });
          paperShape(ctx, bowls, PAPER.camel, { edgeWidth: 1 });
          const pot = new Path2D();
          pot.roundRect(486, 6, 52, 30, 8);
          paperShape(ctx, pot, PAPER.rust);
        },
      },
      {
        name: 'front-chairs',
        z: 0.03,
        height: 0.055,
        paint: (ctx, w, h) => {
          const sizes = [130, 105, 140, 90, 125];
          const colors = ['#7a4e2e', PAPER.rust, '#7a4e2e', PAPER.navy, '#7a4e2e'];
          sizes.forEach((size, i) => chair(ctx, 270 + i * 120, h - 2, size, colors[i]));
        },
      },
    ],
  };
}
