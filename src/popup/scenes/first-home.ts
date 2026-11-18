import { Group, Mesh, MeshLambertMaterial, PlaneGeometry } from '@iwsdk/core';

import { makeCanvas, toTexture } from '../../paint/textures.js';
import { PAPER, cloudBand, paperShape, stars } from '../paper-art.js';
import type { SceneDef } from '../popup-builder.js';
import { MotionKind } from '../popup-components.js';

// Page 3, the first home: a small house at night, one warm lit window,
// a kettle always warm for two. The window breathes softly; steam rises.

const WINDOW = { w: 0.03, h: 0.026 };

/** The lit window: warm light with the kettle's dark shape on the sill. */
function buildWindow(): Mesh {
  const [canvas, ctx] = makeCanvas(150, 130);
  ctx.fillStyle = '#ffd59a';
  ctx.fillRect(0, 0, 150, 130);
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 142, 122);
  ctx.beginPath();
  ctx.moveTo(75, 4);
  ctx.lineTo(75, 126);
  ctx.stroke();
  // The kettle: body, lid knob, spout and handle.
  ctx.fillStyle = '#4a3326';
  ctx.beginPath();
  ctx.ellipse(104, 104, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(98, 84, 12, 6);
  ctx.beginPath();
  ctx.moveTo(124, 100);
  ctx.lineTo(138, 88);
  ctx.lineTo(134, 104);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(104, 92, 14, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  const material = new MeshLambertMaterial({
    map: toTexture(canvas),
    emissive: '#ffb871',
    emissiveIntensity: 0.9,
  });
  const window = new Mesh(new PlaneGeometry(WINDOW.w, WINDOW.h), material);
  window.name = 'lit-window';
  return window;
}

/** Three faint steam wisps above the kettle. */
function buildSteam(): Group {
  const [canvas, ctx] = makeCanvas(48, 96);
  ctx.strokeStyle = 'rgba(255, 246, 232, 0.9)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(24, 92);
  ctx.bezierCurveTo(4, 70, 44, 46, 24, 24);
  ctx.bezierCurveTo(14, 14, 28, 6, 24, 4);
  ctx.stroke();
  const texture = toTexture(canvas);
  const steam = new Group();
  steam.name = 'kettle-steam';
  for (let i = 0; i < 3; i++) {
    const wisp = new Mesh(
      new PlaneGeometry(0.006, 0.012),
      new MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 }),
    );
    wisp.position.set((i - 1) * 0.003, 0, 0.001);
    steam.add(wisp);
  }
  return steam;
}

export function firstHomeScene(): SceneDef {
  return {
    spread: 3,
    layers: [
      {
        name: 'sky',
        z: -0.035,
        height: 0.11,
        paint: (ctx, w, h) => {
          paperShape(ctx, cloudBand(30, w - 30, 14, h, 24, 303), '#3e2b22');
          stars(ctx, 60, w - 60, 30, h * 0.55, 34, 31);
          const moon = new Path2D();
          moon.arc(200, 70, 26, 0, Math.PI * 2);
          paperShape(ctx, moon, '#e9dcc0');
        },
      },
      {
        name: 'house',
        z: -0.01,
        height: 0.095,
        paint: (ctx, w, h) => {
          const house = new Path2D();
          house.roundRect(392, 110, 296, h - 110, 4);
          paperShape(ctx, house, '#7a5640');
          const roof = new Path2D();
          roof.moveTo(372, 116);
          roof.lineTo(540, 26);
          roof.lineTo(708, 116);
          roof.closePath();
          roof.roundRect(620, 40, 26, 50, 3);
          paperShape(ctx, roof, '#4b3226');
          const door = new Path2D();
          door.roundRect(436, h - 92, 48, 92, 6);
          paperShape(ctx, door, '#3e2a1f');
        },
        attachments: [
          {
            side: 'right',
            x: 0.0375,
            y: 0.03,
            build: buildWindow,
            motion: { kind: MotionKind.Window, seed: 0 },
          },
          {
            side: 'right',
            x: 0.0433,
            y: 0.026,
            build: buildSteam,
            motion: { kind: MotionKind.Steam, seed: 0 },
          },
        ],
      },
      {
        name: 'fence',
        z: 0.03,
        height: 0.032,
        paint: (ctx, w, h) => {
          const fence = new Path2D();
          for (let x = 70; x < w - 70; x += 34) fence.roundRect(x, h * 0.25, 18, h * 0.75, 3);
          fence.roundRect(60, h * 0.45, w - 120, 10, 3);
          paperShape(ctx, fence, '#5a4a36');
          const bushes = new Path2D();
          bushes.ellipse(330, h, 90, 40, 0, Math.PI, 0);
          bushes.ellipse(760, h, 110, 44, 0, Math.PI, 0);
          paperShape(ctx, bushes, PAPER.oliveDark);
        },
      },
    ],
  };
}
