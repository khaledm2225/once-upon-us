import { type CanvasTexture } from '@iwsdk/core';

import { COLORS, makeCanvas, toTexture } from '../paint/textures.js';

// The paper hand hint: a small cutout of a hand seen from the side, reaching
// in from the right, with the index finger and thumb apart (open) or meeting
// (pinched). Cream paper with a soft ink edge, like the book's paper art.

const SIZE = 256;
const PAPER = '#f3e6d0';
const EDGE = 'rgba(59, 36, 20, 0.55)';

type Stroke = [x1: number, y1: number, x2: number, y2: number, width: number];

function paintHand(pinched: boolean): CanvasTexture {
  const [canvas, ctx] = makeCanvas(SIZE, SIZE);
  const thumbTip = pinched ? [88, 200] : [122, 206];
  const strokes: Stroke[] = [
    // Wrist and the back of the hand.
    [256, 92, 168, 92, 64],
    [176, 96, 128, 104, 70],
    // The other three fingers, curled under the palm.
    [150, 128, 136, 150, 24],
    [168, 126, 158, 152, 24],
    [186, 122, 180, 146, 22],
    // Index finger, reaching down to the left.
    [118, 112, 82, 190, 26],
    // Thumb.
    [148, 126, thumbTip[0], thumbTip[1], 26],
  ];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The ink edge first, a little wider, then the paper on top.
  for (const pass of [0, 1]) {
    for (const [x1, y1, x2, y2, width] of strokes) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = pass === 0 ? width + 6 : width;
      ctx.strokeStyle = pass === 0 ? EDGE : PAPER;
      ctx.stroke();
    }
  }
  // A small fold line at the knuckle, like a crease in the paper.
  ctx.beginPath();
  ctx.moveTo(132, 98);
  ctx.quadraticCurveTo(142, 112, 134, 124);
  ctx.strokeStyle = COLORS.paperEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  return toTexture(canvas);
}

export function handTextures(): { open: CanvasTexture; pinched: CanvasTexture } {
  return { open: paintHand(false), pinched: paintHand(true) };
}
