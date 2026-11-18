import {
  ClampToEdgeWrapping,
  type Entity,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import { setFont } from '../paint/text.js';
import { bestAnisotropy, makeCanvas, toTexture } from '../paint/textures.js';
import { ALBUM_SIZE, type AlbumPhoto } from '../story/album.js';
import { AlbumPrint } from './album-components.js';
import { Leaf, LeafState } from './book-components.js';
import { FIRST_ALBUM_LEAF, LEAF_COUNT, type Book } from './book.js';
import { NORMAL_TEXT, PAGE_PX, type TextStyle, paperBaseTexture } from './page-text.js';

// The photo album after the story: two photos on each page, like prints held
// by dark paper photo corners, with the date under each one in the book's font.
// Five pages hold the 10 photos: the back of the last story sheet, then both
// faces of the two album sheets. The dedication stays the last page.
//
// Each print is its own small object lying on the page, so it can move like
// a film (AlbumSystem): prints are set down one by one, then a slow camera
// move drifts inside one photo after another.

/** Largest photo size on the page, in canvas pixels. */
const BOX = { w: 520, h: 310 } as const;
/** The cream border of a print. */
const BORDER = 16;
/** Size of each paper photo corner. */
const CORNER = 46;
/** Room around the print for its shadow and, below it, its date. */
const SHADOW_ROOM = 28;
const dateRoom = (style: TextStyle) => Math.round(20 + style.size * 1.25);
/** A slight hand placed tilt, top print and bottom print (radians). */
const TILTS = [-0.016, 0.012] as const;
const PRINT_COLOR = '#f6efe1';
const CORNER_COLOR = '#3b2f28';
/** Canvas pixels per meter: the page canvas spans the page exactly. */
const PX_PER_M = PAGE_PX.w / LAYOUT.page.width;
/** Prints float this far off the paper, so they never flicker into it. */
const LIFT = 0.00025;

/** One print slot and what it shows now. */
export interface PrintSlot {
  index: number;
  /** True on a back face (a left page once its sheet turns). */
  back: boolean;
  leaf: number;
  group: Group;
  photo: Mesh;
  frame: Mesh;
  photoMaterial: MeshLambertMaterial;
  frameMaterial: MeshLambertMaterial;
  /** The resting height of the group above its face, along the face normal. */
  restY: number;
  /** Where the slow camera move drifts toward inside the photo (0 to 1). */
  anchor: { x: number; y: number };
  hasPhoto: boolean;
  /** The photo and date shown now, kept to reprint the date in a new style. */
  image: HTMLImageElement | null;
  date: string;
}

export interface Album {
  slots: PrintSlot[];
  /** Shows these photos (or none), replacing what the album showed before. */
  show(photos: readonly AlbumPhoto[] | Promise<readonly AlbumPhoto[]>): void;
  /** Reprints the dates in a new style (bigger text, stronger contrast). */
  restyle(next: TextStyle): void;
}

function drawCorner(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number): void {
  ctx.save();
  ctx.translate(x, y);
  // The corner shape is drawn for the top left corner, then mirrored.
  ctx.scale(-sx, -sy);
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(CORNER, -5);
  ctx.lineTo(-5, CORNER);
  ctx.closePath();
  ctx.fillStyle = CORNER_COLOR;
  ctx.fill();
  // A soft light edge along the fold, like the sheen of the paper.
  ctx.beginPath();
  ctx.moveTo(CORNER - 3, -2);
  ctx.lineTo(-2, CORNER - 3);
  ctx.strokeStyle = 'rgba(246, 239, 225, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/**
 * The frame of one print: its shadow, cream border, four photo corners and
 * the date below. The middle stays see-through, where the photo shows.
 */
function frameCanvas(dw: number, dh: number, date: string, style: TextStyle): HTMLCanvasElement {
  const pw = dw + BORDER * 2;
  const ph = dh + BORDER * 2;
  const [canvas, ctx] = makeCanvas(pw + SHADOW_ROOM * 2, ph + SHADOW_ROOM + Math.max(SHADOW_ROOM, dateRoom(style)));
  const x0 = SHADOW_ROOM;
  const y0 = SHADOW_ROOM;
  ctx.save();
  ctx.shadowColor = 'rgba(59, 36, 20, 0.32)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = PRINT_COLOR;
  ctx.fillRect(x0, y0, pw, ph);
  ctx.restore();
  ctx.clearRect(x0 + BORDER, y0 + BORDER, dw, dh);
  ctx.save();
  ctx.shadowColor = 'rgba(30, 20, 12, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    drawCorner(ctx, x0 + ((sx + 1) / 2) * pw, y0 + ((sy + 1) / 2) * ph, sx, sy);
  }
  ctx.restore();
  setFont(ctx, style.size, style.weight);
  ctx.fillStyle = style.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(date, canvas.width / 2, y0 + ph + 20 + style.size * 0.8);
  return canvas;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  await image.decode();
  return image;
}

/** A few calm places for the camera move to drift toward, one per photo. */
const ANCHORS = [
  { x: 0.5, y: 0.62 },
  { x: 0.35, y: 0.55 },
  { x: 0.65, y: 0.58 },
  { x: 0.45, y: 0.4 },
  { x: 0.58, y: 0.66 },
] as const;

/** Gives each album page plain paper and a place for its two prints. */
export function buildAlbum(world: World, book: Book, initial: TextStyle = NORMAL_TEXT): Album {
  let style = initial;
  let plain = paperBaseTexture(style.paper);
  const pageMaterials: MeshLambertMaterial[] = [];
  const pages: { leaf: number; back: boolean }[] = [{ leaf: FIRST_ALBUM_LEAF - 1, back: true }];
  for (let leaf = FIRST_ALBUM_LEAF; leaf < LEAF_COUNT; leaf++) {
    pages.push({ leaf, back: false }, { leaf, back: true });
  }

  const slots: PrintSlot[] = [];
  pages.forEach(({ leaf, back }, page) => {
    const material = new MeshLambertMaterial({ map: plain });
    pageMaterials.push(material);
    const materials = book.leafMeshes[leaf].material as MeshLambertMaterial[];
    materials[back ? 1 : 2] = material;

    for (const slot of [0, 1] as const) {
      const index = page * 2 + slot;
      const group = new Group();
      group.name = `album-print-${index + 1}`;
      // A print lies on its face. Front faces look up (+y); back faces look
      // down (−y) and are read after the sheet turns half around the spine.
      const tilt = TILTS[slot];
      if (back) group.rotation.set(Math.PI / 2, 0, Math.PI + tilt);
      else group.rotation.set(-Math.PI / 2, 0, tilt);
      const restY = back ? -LIFT : LAYOUT.page.thickness + LIFT;
      group.position.y = restY;
      group.visible = false;

      const photoMaterial = new MeshLambertMaterial({ transparent: true, opacity: 0 });
      const photo = new Mesh(new PlaneGeometry(1, 1), photoMaterial);
      const frameMaterial = new MeshLambertMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const frame = new Mesh(new PlaneGeometry(1, 1), frameMaterial);
      frame.position.z = 0.0001;
      frame.renderOrder = 2;
      photo.renderOrder = 1;
      group.add(photo, frame);

      const entity: Entity = world.createTransformEntity(group, { parent: book.leaves[leaf] });
      entity.addComponent(AlbumPrint, { index });
      slots.push({
        index,
        back,
        leaf,
        group,
        photo,
        frame,
        photoMaterial,
        frameMaterial,
        restY,
        anchor: ANCHORS[index % ANCHORS.length],
        hasPhoto: false,
        image: null,
        date: '',
      });
    }
  });

  /** Sizes and places one print for its photo, in the page's own coordinates. */
  const place = (slot: PrintSlot, image: HTMLImageElement, date: string) => {
    const scale = Math.min(BOX.w / image.naturalWidth, BOX.h / image.naturalHeight);
    const dw = Math.round(image.naturalWidth * scale);
    const dh = Math.round(image.naturalHeight * scale);
    const half = slot.index % 2;
    const slotHeight = PAGE_PX.h / 2;
    const blockHeight = BOX.h + BORDER * 2 + dateRoom(style);
    const printTop = half * slotHeight + (slotHeight - blockHeight) / 2 + (BOX.h - dh) / 2;
    const ph = dh + BORDER * 2;
    const cx = PAGE_PX.w / 2;
    const cy = printTop + ph / 2;
    const x = cx / PX_PER_M;
    slot.group.position.x = slot.back ? LAYOUT.page.width - x : x;
    slot.group.position.z = -LAYOUT.page.depth / 2 + cy / PX_PER_M;

    // A restyle keeps the same photo: only its frame and date are reprinted.
    let photoTexture = slot.photoMaterial.map;
    if (!photoTexture || photoTexture.image !== image) {
      photoTexture?.dispose();
      photoTexture = new Texture(image);
      photoTexture.colorSpace = SRGBColorSpace;
      photoTexture.wrapS = ClampToEdgeWrapping;
      photoTexture.wrapT = ClampToEdgeWrapping;
      photoTexture.anisotropy = bestAnisotropy();
      photoTexture.needsUpdate = true;
      slot.photoMaterial.map = photoTexture;
      slot.photoMaterial.needsUpdate = true;
    }
    slot.photo.scale.set(dw / PX_PER_M, dh / PX_PER_M, 1);

    const canvas = frameCanvas(dw, dh, date, style);
    slot.frameMaterial.map?.dispose();
    const frameTexture = toTexture(canvas);
    slot.frameMaterial.map = frameTexture;
    // Upload now, on the start page, so turning to the album never stutters.
    world.renderer.initTexture(photoTexture);
    world.renderer.initTexture(frameTexture);
    slot.frameMaterial.needsUpdate = true;
    slot.frame.scale.set(canvas.width / PX_PER_M, canvas.height / PX_PER_M, 1);
    // The frame canvas has more room below the print (for the date) than above.
    const extraBelow = canvas.height - (ph + SHADOW_ROOM * 2);
    slot.frame.position.y = -extraBelow / 2 / PX_PER_M;
    slot.hasPhoto = true;
    slot.image = image;
    slot.date = date;
  };

  /**
   * Album sheets with no photos are put away, so a book with few or no
   * photos never shows blank pages before the dedication.
   */
  const keepSheets = (count: number) => {
    for (let leaf = FIRST_ALBUM_LEAF; leaf < LEAF_COUNT; leaf++) {
      const firstPhotoOnSheet = ((leaf - FIRST_ALBUM_LEAF) * 2 + 1) * 2;
      const hidden = count <= firstPhotoOnSheet;
      const entity = book.leaves[leaf];
      entity.setValue(Leaf, 'hidden', hidden);
      if (entity.object3D) entity.object3D.visible = !hidden;
      // A put away sheet always rests on the right stack, so the book stays in order.
      if (hidden && entity.getValue(Leaf, 'state') === LeafState.Rest) {
        const rest = entity.getValue(Leaf, 'restRight') as number;
        entity.setValue(Leaf, 'angle', rest);
        entity.setValue(Leaf, 'target', rest);
        if (entity.object3D) entity.object3D.rotation.z = rest;
      }
    }
  };

  let generation = 0;
  const show = async (source: readonly AlbumPhoto[] | Promise<readonly AlbumPhoto[]>) => {
    const mine = ++generation;
    for (const slot of slots) {
      slot.hasPhoto = false;
      slot.image = null;
      slot.group.visible = false;
    }
    let photos: readonly AlbumPhoto[] = [];
    try {
      photos = (await source).slice(0, ALBUM_SIZE);
    } catch (error) {
      console.warn('The family photos could not load.', error);
    }
    if (mine !== generation) return;
    keepSheets(photos.length);
    await Promise.all(
      photos.map(async (photo, index) => {
        try {
          const image = await loadImage(photo.src);
          if (mine !== generation) return;
          place(slots[index], image, photo.date);
        } catch (error) {
          console.warn('A photo could not be shown.', error);
        }
      }),
    );
  };

  return {
    slots,
    restyle: (next) => {
      if (next.paper !== style.paper) {
        plain = paperBaseTexture(next.paper);
        for (const material of pageMaterials) {
          material.map = plain;
          material.needsUpdate = true;
        }
      }
      style = next;
      for (const slot of slots) if (slot.image) place(slot, slot.image, slot.date);
    },
    show: (photos) => {
      show(photos).catch((error: unknown) => console.warn('The photo album could not load.', error));
    },
  };
}
