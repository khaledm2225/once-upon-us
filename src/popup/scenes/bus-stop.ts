import { seededRandom } from '../../paint/textures.js';
import { PAPER, cloudBand, figure, knitStripes, paperShape } from '../paper-art.js';
import type { SceneDef } from '../popup-builder.js';
import { MotionKind } from '../popup-components.js';

// Page 1, the first meeting: a bus stop in the rain, two small figures,
// one shared umbrella. A soft warm grey morning; rain falls slowly.

export function busStopScene(): SceneDef {
  return {
    spread: 1,
    layers: [
      {
        name: 'sky',
        z: -0.035,
        height: 0.11,
        paint: (ctx, w, h) => {
          paperShape(ctx, cloudBand(30, w - 30, 18, h, 22, 101), '#cbbfae');
          const roofs = new Path2D();
          roofs.moveTo(30, h);
          const tops = [0.55, 0.42, 0.5, 0.36, 0.47, 0.4, 0.52, 0.44];
          tops.forEach((t, i) => {
            const x0 = 30 + ((w - 60) / tops.length) * i;
            const x1 = 30 + ((w - 60) / tops.length) * (i + 1);
            roofs.lineTo(x0, h * t);
            roofs.lineTo((x0 + x1) / 2, h * t - 18);
            roofs.lineTo(x1, h * t);
          });
          roofs.lineTo(w - 30, h);
          roofs.closePath();
          paperShape(ctx, roofs, '#a59682');
        },
      },
      {
        name: 'street',
        z: -0.012,
        height: 0.085,
        paint: (ctx, w, h) => {
          for (const [x0, x1, top] of [
            [60, 330, 30],
            [700, 960, 18],
          ] as const) {
            const block = new Path2D();
            block.roundRect(x0, top, x1 - x0, h - top, 4);
            paperShape(ctx, block, '#8e7d6b');
            const windows = new Path2D();
            for (let x = x0 + 22; x < x1 - 40; x += 62) {
              for (let y = top + 22; y < h - 40; y += 54) windows.roundRect(x, y, 30, 30, 3);
            }
            paperShape(ctx, windows, '#6f6052', { edgeWidth: 1 });
          }
        },
      },
      {
        name: 'rain',
        z: 0,
        height: 0.1,
        blend: true,
        repeat: { x: 2, y: 1 },
        motion: { kind: MotionKind.Rain, seed: 1 },
        paint: (ctx, w, h) => {
          const random = seededRandom(77);
          ctx.strokeStyle = 'rgba(238, 228, 212, 0.5)';
          ctx.lineCap = 'round';
          for (let i = 0; i < 90; i++) {
            const x = random() * w;
            const y = random() * h;
            ctx.lineWidth = 1 + random();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 4, y + 16 + random() * 10);
            ctx.stroke();
          }
        },
      },
      {
        name: 'stop',
        z: 0.012,
        height: 0.1,
        paint: (ctx, w, h) => {
          // The shelter: a roof slab on two posts, and a blank round sign.
          const shelter = new Path2D();
          shelter.roundRect(600, 30, 250, 14, 4);
          shelter.roundRect(612, 44, 10, h - 44, 3);
          shelter.roundRect(826, 44, 10, h - 44, 3);
          shelter.roundRect(900, 40, 8, h - 40, 3);
          paperShape(ctx, shelter, PAPER.charcoal);
          const sign = new Path2D();
          sign.arc(904, 34, 18, 0, Math.PI * 2);
          paperShape(ctx, sign, '#b9a78c');
          // The two of them under one umbrella.
          const her = figure(ctx, 468, h - 6, 196, { coat: PAPER.camel, legs: PAPER.charcoal, hair: '#6e3b22', skin: PAPER.skinShadow });
          knitStripes(ctx, her, h - 172, h - 146, [PAPER.cream, PAPER.rust, PAPER.navy], 7);
          const him = figure(ctx, 552, h - 6, 206, { coat: PAPER.charcoal, legs: PAPER.navy, hair: PAPER.hairDark, skin: PAPER.skinShadow });
          knitStripes(ctx, him, h - 182, h - 156, [PAPER.cream, PAPER.rust, PAPER.camel], 7);
          const umbrella = new Path2D();
          umbrella.moveTo(400, 46);
          umbrella.quadraticCurveTo(510, -26, 620, 46);
          for (let x = 620; x > 400; x -= 27.5) umbrella.quadraticCurveTo(x - 13.75, 36, x - 27.5, 46);
          umbrella.closePath();
          umbrella.roundRect(507, 34, 6, 80, 2);
          paperShape(ctx, umbrella, '#2e2b29');
        },
      },
      {
        name: 'curb',
        z: 0.035,
        height: 0.03,
        paint: (ctx, w, h) => {
          const curb = new Path2D();
          curb.roundRect(40, h * 0.45, w - 80, h * 0.55, 6);
          paperShape(ctx, curb, '#6c5f52');
          const puddles = new Path2D();
          puddles.ellipse(300, h * 0.72, 70, 9, 0, 0, Math.PI * 2);
          puddles.ellipse(760, h * 0.7, 90, 10, 0, 0, Math.PI * 2);
          paperShape(ctx, puddles, '#9b8f82', { edgeWidth: 1 });
        },
      },
    ],
  };
}
