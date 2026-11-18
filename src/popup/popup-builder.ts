import {
  type CanvasTexture,
  DoubleSide,
  type Entity,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
  PlaneGeometry,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import { makeCanvas, toTexture } from '../paint/textures.js';
import { type Ctx, setStrongEdges } from './paper-art.js';
import { MotionKind, PopLayer, SceneMotion } from './popup-components.js';

// Builds the paper layers of each pop-up scene.
// Every layer is cut in two at the spine: the left half is glued to the left
// page, the right half to the right page. Each half stands on a hinge along
// its bottom edge; PopUpSystem sets that hinge from how open the spread is.

/** Scene width across both pages, in meters. */
export const SCENE_WIDTH = 0.4;
/** Canvas pixels per meter for layer art. */
const PX_PER_M = 2560;
/** Scenes are painted 0.40 m wide and shown 20% larger, filling the spread. */
const SCENE_SCALE = 1.2;
/** Moves every hinge a little toward the reader, so the tallest layer still folds inside the page. */
const Z_SHIFT = 0.012;
/** Paper layers glow softly with their own colors, so the scene reads even with the lamp behind it. */
const SELF_LIGHT = 0.42;

export interface AttachmentDef {
  side: 'left' | 'right';
  /** Position on the standing layer, in meters: x across the book, y up from the hinge. */
  x: number;
  y: number;
  build: () => Object3D;
  motion: { kind: number; seed?: number };
}

export interface LayerDef {
  name: string;
  /** Hinge depth on the page in meters (+z is toward the reader). */
  z: number;
  /** Height of the layer when standing, in meters. */
  height: number;
  paint: (ctx: Ctx, width: number, height: number) => void;
  /** A see through layer (rain) that blends instead of cutting. */
  blend?: boolean;
  /** Repeating texture, for scrolling rain. */
  repeat?: { x: number; y: number };
  motion?: { kind: number; seed?: number };
  attachments?: AttachmentDef[];
}

export interface SceneDef {
  spread: number;
  layers: LayerDef[];
}

/** Paints a layer canvas and returns its texture. */
/** Every painted layer, kept so high contrast can repaint them with outlines. */
const painted: { layer: LayerDef; texture: CanvasTexture }[] = [];

function layerTexture(layer: LayerDef): CanvasTexture {
  const width = Math.round(SCENE_WIDTH * PX_PER_M);
  const height = Math.round(layer.height * PX_PER_M);
  const [canvas, ctx] = makeCanvas(width, height);
  layer.paint(ctx, width, height);
  const texture = toTexture(canvas, Boolean(layer.repeat));
  if (layer.repeat) texture.repeat.set(layer.repeat.x, layer.repeat.y);
  painted.push({ layer, texture });
  return texture;
}

/** Repaints every scene layer, for example with high contrast outlines. */
export function repaintScenes(strong: boolean): void {
  setStrongEdges(strong);
  for (const { layer, texture } of painted) {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layer.paint(ctx, canvas.width, canvas.height);
    texture.needsUpdate = true;
  }
  setStrongEdges(false);
}

/** A half plane whose bottom edge sits on the hinge, with UVs for its half. */
function halfGeometry(side: 'left' | 'right', height: number): PlaneGeometry {
  const geometry = new PlaneGeometry(SCENE_WIDTH / 2, height);
  geometry.translate(side === 'left' ? -SCENE_WIDTH / 4 : SCENE_WIDTH / 4, height / 2, 0);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setX(i, side === 'left' ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Builds one scene on its spread. leftLeaf carries the left page (its back
 * face), rightLeaf carries the right page (its front face).
 */
export function buildScene(world: World, scene: SceneDef, leftLeaf: Entity, rightLeaf: Entity): void {
  // On the left page we work in a frame flipped by π around the spine,
  // so when the page lies open on the left, "up" is up again.
  const leftFrame = new Group();
  leftFrame.name = `spread-${scene.spread}-left`;
  leftFrame.rotation.z = Math.PI;
  const leftFrameEntity = world.createTransformEntity(leftFrame, { parent: leftLeaf });

  scene.layers.forEach((layer, order) => {
    const texture = layerTexture(layer);
    const material = new MeshLambertMaterial({
      map: texture,
      emissive: '#ffffff',
      emissiveMap: texture,
      emissiveIntensity: SELF_LIGHT,
      side: DoubleSide,
      ...(layer.blend
        ? { transparent: true, depthWrite: false, opacity: 1, forceSinglePass: true }
        : // Alpha to coverage smooths the cut paper edges with the GPU's
          // antialiasing, so they don't shimmer as the head moves.
          { alphaTest: 0.5, alphaToCoverage: true }),
    });
    // Front layers sit a hair higher, so when folded flat they lie on top.
    const lift = 0.0012 + order * 0.0011;

    for (const side of ['left', 'right'] as const) {
      const hinge = new Group();
      hinge.name = `spread-${scene.spread}-${layer.name}-${side}`;
      const y = side === 'left' ? lift : LAYOUT.page.thickness + lift;
      hinge.position.set(0, y, layer.z + Z_SHIFT);
      hinge.scale.setScalar(SCENE_SCALE);
      hinge.add(new Mesh(halfGeometry(side, layer.height), material));
      const parent = side === 'left' ? leftFrameEntity : rightLeaf;
      const hingeEntity = world.createTransformEntity(hinge, { parent });
      hingeEntity.addComponent(PopLayer, { spread: scene.spread, fullStand: 1 });
      // Rain scrolls one shared texture, so only one half drives it.
      const drivesMotion = layer.motion && !(layer.motion.kind === MotionKind.Rain && side === 'left');
      if (layer.motion && drivesMotion) {
        hingeEntity.addComponent(SceneMotion, {
          spread: scene.spread,
          kind: layer.motion.kind,
          seed: layer.motion.seed ?? 0,
        });
      }

      for (const attachment of layer.attachments ?? []) {
        if (attachment.side !== side) continue;
        const object = attachment.build();
        object.position.set(attachment.x, attachment.y, 0.002);
        const attachmentEntity = world.createTransformEntity(object, { parent: hingeEntity });
        attachmentEntity.addComponent(SceneMotion, {
          spread: scene.spread,
          kind: attachment.motion.kind,
          seed: attachment.motion.seed ?? 0,
        });
      }
    }
  });
}
