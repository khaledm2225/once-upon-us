import { seededRandom } from '../../paint/textures.js';
import { PAPER, cloudBand, figure, paperShape } from '../paper-art.js';
import type { SceneDef } from '../popup-builder.js';
import { MotionKind } from '../popup-components.js';

// Page 2, the wedding: a small celebration under a string of lights,
// the couple in the middle. A dusk peach sky; the lights sway a little.

export function weddingScene(): SceneDef {
  return {
    spread: 2,
    layers: [
      {
        name: 'sky',
        z: -0.035,
        height: 0.11,
        paint: (ctx, w, h) => {
          paperShape(ctx, cloudBand(30, w - 30, 16, h, 24, 202), '#e6b58f');
          for (const cx of [110, w - 110]) {
            const tree = new Path2D();
            tree.ellipse(cx, h * 0.38, 95, 80, 0, 0, Math.PI * 2);
            tree.roundRect(cx - 9, h * 0.5, 18, h * 0.5, 4);
            paperShape(ctx, tree, PAPER.oliveDark);
          }
        },
      },
      {
        name: 'lights',
        z: -0.015,
        height: 0.1,
        motion: { kind: MotionKind.Sway, seed: 0.7 },
        paint: (ctx, w) => {
          const curve = (t: number) => {
            const x = 150 + (w - 300) * t;
            const y = 34 + Math.sin(t * Math.PI) * 52;
            return [x, y] as const;
          };
          ctx.strokeStyle = PAPER.charcoal;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i <= 40; i++) {
            const [x, y] = curve(i / 40);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          const bulbs = new Path2D();
          const caps = new Path2D();
          for (let i = 1; i < 14; i++) {
            const [x, y] = curve(i / 14);
            caps.roundRect(x - 5, y, 10, 7, 2);
            bulbs.ellipse(x, y + 16, 9, 11, 0, 0, Math.PI * 2);
          }
          paperShape(ctx, caps, PAPER.charcoal, { edgeWidth: 1 });
          paperShape(ctx, bulbs, '#f6dfb3', { edge: 'rgba(120, 80, 40, 0.4)' });
        },
      },
      {
        name: 'guests',
        z: 0.004,
        height: 0.07,
        paint: (ctx, w, h) => {
          const random = seededRandom(9);
          const coats = [PAPER.navy, PAPER.sage, PAPER.rust, PAPER.camel, PAPER.charcoal];
          for (const x of [190, 262, 330, 690, 760, 832]) {
            figure(ctx, x + random() * 10, h - 4, 120 + random() * 40, {
              coat: coats[Math.floor(random() * coats.length)],
              legs: PAPER.charcoal,
              hair: random() < 0.5 ? PAPER.hairDark : '#8a5a3a',
            });
          }
        },
      },
      {
        name: 'couple',
        z: 0.02,
        height: 0.1,
        paint: (ctx, w, h) => {
          figure(ctx, 474, h - 4, 212, { coat: PAPER.ivory, legs: PAPER.ivory, hair: '#6e3b22', skin: PAPER.skinShadow }, { dress: true });
          figure(ctx, 556, h - 4, 232, { coat: PAPER.charcoal, legs: PAPER.charcoal, hair: PAPER.hairDark, skin: PAPER.skinShadow });
          const hands = new Path2D();
          hands.roundRect(498, h - 128, 40, 10, 4);
          paperShape(ctx, hands, PAPER.skinShadow, { edgeWidth: 1 });
        },
      },
      {
        name: 'grass',
        z: 0.035,
        height: 0.03,
        paint: (ctx, w, h) => {
          const grass = new Path2D();
          grass.roundRect(60, h * 0.5, w - 120, h * 0.5, 8);
          paperShape(ctx, grass, PAPER.olive);
          const random = seededRandom(5);
          const flowers = new Path2D();
          for (let i = 0; i < 26; i++) flowers.arc(80 + random() * (w - 160), h * 0.6 + random() * h * 0.25, 4, 0, Math.PI * 2);
          paperShape(ctx, flowers, PAPER.cream, { edgeWidth: 1 });
        },
      },
    ],
  };
}
