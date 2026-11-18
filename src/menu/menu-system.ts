import { Box3, type Entity, Pressed, Vector3, createSystem } from '@iwsdk/core';

import { canReadAloud, getSettings, onSettings, onVoicesChanged, setSetting } from '../settings/settings.js';
import { playTap } from '../sound/paper-sound.js';
import { MENU_SETTINGS, type Menu, type MenuButtonView } from './menu.js';
import { MenuButton } from './menu-components.js';

// The paper buttons: a poke turns a setting on or off. A press counts only
// when a fingertip really touches the button from above (IWSDK reports a
// press 2 cm early), so a hand passing over the row on its way to the book
// changes nothing. Like the page tabs, a button works again only after every
// fingertip has moved clearly away, and a finger near two buttons counts
// only for the nearer one. Feedback is paper only: a button rises a little
// when a fingertip comes near and sinks when pressed.

const REARM_DISTANCE = 0.06;
/** A fingertip this close to the button's box counts as touching it. */
const TOUCH_DISTANCE = 0.006;
const NEAR_DISTANCE = 0.04;
const NEAR_RISE = 0.002;
const PRESS_SINK = -0.004;
const FEEDBACK_RATE = 18;

let menu: Menu | null = null;

/** Hands the menu to the system once it is built. */
export function setMenu(next: Menu): void {
  menu = next;
  // Paint each button's current state, and lay the row out, right away.
  const settings = getSettings();
  for (const view of next.buttons) next.paint(view, settings[view.key]);
  next.layout(canReadAloud());
}

export class MenuSystem extends createSystem({
  buttons: { required: [MenuButton] },
}) {
  private readonly armed = new Map<Entity, boolean>();
  private readonly offset = new Map<Entity, number>();
  private readonly box = new Box3();
  private readonly tip = new Vector3();
  private readonly local = new Vector3();
  /** Height of the nearest fingertip above the button's top face, from the last call. */
  private tipAbove = 0;

  init(): void {
    this.cleanupFuncs.push(
      onSettings((settings) => {
        if (!menu) return;
        for (const view of menu.buttons) menu.paint(view, settings[view.key]);
      }),
      onVoicesChanged(() => menu?.layout(canReadAloud())),
    );
  }

  private viewOf(button: Entity): MenuButtonView | null {
    return menu?.buttons[button.getValue(MenuButton, 'setting') as number] ?? null;
  }

  /** Distance from the nearest index fingertip to the button's box; also sets tipAbove. */
  private nearestTip(button: Entity): number {
    const object = button.object3D;
    if (!object) return Infinity;
    this.box.setFromObject(object);
    let nearest = Infinity;
    for (const hand of ['left', 'right'] as const) {
      this.player.indexTipSpaces[hand].getWorldPosition(this.tip);
      const distance = this.box.distanceToPoint(this.tip);
      if (distance < nearest) {
        nearest = distance;
        this.local.copy(this.tip);
        object.worldToLocal(this.local);
        this.tipAbove = this.local.y;
      }
    }
    return nearest;
  }

  private toggle(button: Entity): void {
    this.armed.set(button, false);
    const key = MENU_SETTINGS[button.getValue(MenuButton, 'setting') as number].key;
    setSetting(key, !getSettings()[key]);
    playTap();
  }

  update(delta: number): void {
    if (!menu) return;
    const dt = Math.min(delta, 0.05);
    for (const button of this.queries.buttons.entities) {
      const view = this.viewOf(button);
      const object = button.object3D;
      if (!view || !object || !object.visible) continue;

      const tip = this.nearestTip(button);
      const fromAbove = this.tipAbove > 0;
      if (this.armed.get(button) === false && tip > REARM_DISTANCE) this.armed.set(button, true);
      if (button.hasComponent(Pressed) && this.armed.get(button) !== false && tip <= TOUCH_DISTANCE && fromAbove) {
        // A finger near two buttons counts only for the nearer one.
        let nearest = true;
        for (const other of this.queries.buttons.entities) {
          if (other !== button && other.object3D?.visible && this.nearestTip(other) < tip) nearest = false;
        }
        if (nearest) this.toggle(button);
      }

      const pressed = button.hasComponent(Pressed) && tip <= TOUCH_DISTANCE;
      const wanted = pressed ? PRESS_SINK : tip < NEAR_DISTANCE ? NEAR_RISE : 0;
      const current = this.offset.get(button) ?? 0;
      const next = current + (wanted - current) * (1 - Math.exp(-FEEDBACK_RATE * dt));
      this.offset.set(button, next);
      object.position.y = view.restY + next;
    }
  }
}
