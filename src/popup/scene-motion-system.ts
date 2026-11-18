import { type Entity, type Material, type Mesh, type MeshLambertMaterial, createSystem } from '@iwsdk/core';

import { PopUpSystem } from './popup-system.js';
import { MotionKind, SceneMotion } from './popup-components.js';

// Small, gentle motion inside each scene: slow, low contrast, never flashing.
// Motion runs only while its spread is mostly open.

const OPEN_ENOUGH = Math.PI * 0.5;
/** Sway and steam grow from nothing to full between these openings. */
const FADE_FROM = Math.PI * 0.5;
const FADE_TO = Math.PI * 0.7;
/** Rain falls slowly: texture lengths per second. */
const RAIN_SPEED = 0.35;
/** String lights sway a few degrees, once every few seconds. */
const SWAY_ANGLE = 0.035;
const SWAY_RATE = 0.9;
/** The lit window breathes gently, well under once per second. */
const WINDOW_RATE = 2 * Math.PI * 0.35;
/** The sun lowers over this many seconds, then rests at the horizon. */
const SUN_SECONDS = 40;
const SUN_DROP = 0.05;

/** The first mesh under an entity, found once and remembered. */
const meshes = new Map<Entity, Mesh | null>();
function firstMesh(entity: Entity): Mesh | null {
  if (meshes.has(entity)) return meshes.get(entity) ?? null;
  let found: Mesh | null = null;
  entity.object3D?.traverse((child) => {
    if (!found && (child as Mesh).isMesh) found = child as Mesh;
  });
  meshes.set(entity, found);
  return found;
}

export class SceneMotionSystem extends createSystem({
  motions: { required: [SceneMotion] },
}) {
  private readonly elapsed = new Map<Entity, number>();
  private readonly baseY = new Map<Entity, number>();

  update(delta: number, time: number): void {
    const popups = this.world.getSystem(PopUpSystem);
    if (!popups) return;
    const dt = Math.min(delta, 0.05);

    for (const entity of this.queries.motions.entities) {
      const object = entity.object3D;
      if (!object) continue;
      const spread = entity.getValue(SceneMotion, 'spread') as number;
      const opening = popups.spreadOpening(spread);
      const seed = entity.getValue(SceneMotion, 'seed') as number;
      const kind = entity.getValue(SceneMotion, 'kind') as number;

      if (opening < Math.PI * 0.1) {
        // Closed: reset the sun so it sets again next time the page opens.
        this.elapsed.delete(entity);
        continue;
      }
      if (opening < OPEN_ENOUGH) continue;
      // Sway and steam fade in and out with the page, never jumping.
      const fadeT = Math.min(1, Math.max(0, (opening - FADE_FROM) / (FADE_TO - FADE_FROM)));
      const fade = fadeT * fadeT * (3 - 2 * fadeT);

      switch (kind) {
        case MotionKind.Rain: {
          const mesh = firstMesh(entity);
          const map = (mesh?.material as MeshLambertMaterial | undefined)?.map;
          if (map && seed === 1) map.offset.y = (map.offset.y + RAIN_SPEED * dt) % 1;
          break;
        }
        case MotionKind.Sway: {
          // PopUpSystem has just set the hinge; add a slow sway on top.
          object.rotation.x += Math.sin(time * SWAY_RATE + seed) * SWAY_ANGLE * fade;
          break;
        }
        case MotionKind.Window: {
          const mesh = firstMesh(entity);
          const material = mesh?.material as MeshLambertMaterial | undefined;
          if (material) material.emissiveIntensity = 0.9 + 0.08 * Math.sin(time * WINDOW_RATE + seed);
          break;
        }
        case MotionKind.Steam: {
          // Three faint wisps rise a little and fade, one after another.
          for (let i = 0; i < object.children.length; i++) {
            const wisp = object.children[i];
            const t = (time * 0.22 + i / object.children.length + seed) % 1;
            wisp.position.y = t * 0.018;
            const material = (wisp as Mesh).material as Material & { opacity: number };
            material.opacity = Math.sin(t * Math.PI) * 0.55 * fade;
            wisp.visible = material.opacity > 0.02;
          }
          break;
        }
        case MotionKind.Sun: {
          if (!this.baseY.has(entity)) this.baseY.set(entity, object.position.y);
          const seconds = Math.min(SUN_SECONDS, (this.elapsed.get(entity) ?? 0) + dt);
          this.elapsed.set(entity, seconds);
          const t = seconds / SUN_SECONDS;
          const eased = t * t * (3 - 2 * t);
          object.position.y = (this.baseY.get(entity) as number) - SUN_DROP * eased;
          break;
        }
      }
    }
  }
}
