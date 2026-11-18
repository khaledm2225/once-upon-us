import {
  type CanvasTexture,
  type Entity,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Vector3,
  type World,
  createSystem,
} from '@iwsdk/core';

import { Leaf, LeafState } from '../book/book-components.js';
import type { Book } from '../book/book.js';
import { bookEvents, setCoverInvite } from '../book/page-turn-system.js';
import { LAYOUT } from '../layout.js';
import { handTextures } from './hand-hint.js';

// The first five minutes, with no words and no tutorial: while the book is
// closed, the cover corner softly lifts and settles every few seconds, and a
// small paper hand shows the pinch that does it. Both stop once a pinch has
// opened the cover (it must land open, not fall back). This is kept only for
// the visit, so every new reader on the same headset sees the opening too.
// No glows, nothing fast.
const HINT_SIZE = 0.11;
/** One showing of the pinch, then a rest (seconds). */
const CYCLE = 5.5;
const FIRST_DELAY = 1.5;
/** How far the corner lifts with the hand (radians). */
const INVITE_LIFT = 0.1;
/** The hand comes down from this high above the corner (meters). */
const APPROACH = 0.06;
/** Where the pinch meets on the hand art, from the art's center (meters). */
const PINCH_OFFSET = { x: (-46 / 256) * HINT_SIZE, y: (-67 / 256) * HINT_SIZE } as const;

const smooth = (from: number, to: number, t: number) => {
  const p = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return p * p * (3 - 2 * p);
};

interface Hint {
  /** Sits on the cover corner and turns to face the reader. */
  group: Group;
  mesh: Mesh;
  material: MeshLambertMaterial;
  open: CanvasTexture;
  pinched: CanvasTexture;
}

let hint: Hint | null = null;

/** Builds the paper hand beside the cover's near outer corner. */
export function buildHandHint(world: World, book: Book): void {
  const { open, pinched } = handTextures();
  // Lit a little from within, like the pop-up paper, so it reads in the dim room.
  const material = new MeshLambertMaterial({
    map: open,
    emissive: '#ffffff',
    emissiveMap: open,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(HINT_SIZE, HINT_SIZE), material);
  mesh.name = 'hand-hint';
  // The art's pinch point sits on the group's origin, the cover corner.
  mesh.position.set(-PINCH_OFFSET.x, -PINCH_OFFSET.y, 0);
  const group = new Group();
  group.name = 'hand-hint-anchor';
  group.add(mesh);
  group.visible = false;
  world.createTransformEntity(group, { parent: book.entity });
  hint = { group, mesh, material, open, pinched };
}

export class OnboardingSystem extends createSystem({
  leaves: { required: [Leaf] },
}) {
  private done = false;
  private pinched = false;
  private clock = 0;
  private readonly head = new Vector3();

  init(): void {
    // The hint teaches the pinch: it is learned when a pinch (not a tab)
    // lifts the cover and the cover then lands open.
    const onLift = (event: Event) => {
      this.pinched = !(event as CustomEvent<{ byTab?: boolean }>).detail?.byTab;
    };
    const onLand = (event: Event) => {
      const leaf = (event as CustomEvent<{ leaf?: Entity }>).detail?.leaf;
      if (!leaf || !this.pinched) return;
      const isCover = (leaf.getValue(Leaf, 'index') as number) === 0;
      if (isCover && (leaf.getValue(Leaf, 'angle') as number) > Math.PI / 2) this.done = true;
    };
    bookEvents.addEventListener('lift', onLift);
    bookEvents.addEventListener('land', onLand);
    this.cleanupFuncs.push(
      () => bookEvents.removeEventListener('lift', onLift),
      () => bookEvents.removeEventListener('land', onLand),
    );
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.clock = -FIRST_DELAY;
    });
  }

  update(delta: number): void {
    if (!hint) return;
    const cover = this.coverResting();
    if (this.done || !cover || !this.renderer.xr.isPresenting) {
      hint.group.visible = false;
      setCoverInvite(0);
      return;
    }
    this.clock += Math.min(delta, 0.05);
    const t = this.clock < 0 ? -1 : this.clock % CYCLE;

    // The cover corner lifts with the pinched hand, then settles back.
    const lift = INVITE_LIFT * (smooth(1.2, 2.3, t) - smooth(2.3, 3.3, t));
    setCoverInvite(lift);

    // The hand comes down, pinches, rises with the corner, lets go, and leaves.
    const shown = smooth(0, 0.8, t) - smooth(3.5, 4.3, t);
    const away = APPROACH * (1 - smooth(0, 0.8, t) + smooth(3.5, 4.3, t));
    const pinching = t >= 1.0 && t < 3.3;
    const art = pinching ? hint.pinched : hint.open;
    hint.material.map = art;
    hint.material.emissiveMap = art;
    hint.material.opacity = shown;
    hint.group.visible = shown > 0.01;

    const reach = LAYOUT.page.width + LAYOUT.cover.overhang;
    hint.group.position.set(
      reach * Math.cos(lift) - 0.004,
      reach * Math.sin(lift) + LAYOUT.cover.thickness + away,
      LAYOUT.page.depth / 2 + LAYOUT.cover.overhang - 0.01,
    );
    // Always turned toward the reader, so the hand reads clearly.
    this.world.camera.getWorldPosition(this.head);
    hint.group.lookAt(this.head);
  }

  /** The closed cover, resting on the right, or null once the book is open. */
  private coverResting(): boolean {
    for (const leaf of this.queries.leaves.entities) {
      if ((leaf.getValue(Leaf, 'index') as number) !== 0) continue;
      return leaf.getValue(Leaf, 'state') === LeafState.Rest && (leaf.getValue(Leaf, 'angle') as number) < Math.PI / 2;
    }
    return false;
  }
}
