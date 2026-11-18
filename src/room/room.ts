import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import {
  COLORS,
  softShadowTexture,
  surfaceTexture,
  woodTexture,
} from '../paint/textures.js';

// The quiet evening room: a wooden table, one warm lamp, dim walls.
// One point light plus a soft fill light, and no real time shadows.

const LAMP_LIGHT_COLOR = '#ffc192'; // terracotta and rust toned lamp light
const FILL_SKY = '#9a9fd6'; // cool indigo night, like a winter cinema
const FILL_GROUND = '#14152a';

const CINEMA_VELVET = '#262a5c';
const CINEMA_CARPET = '#1b1d3f';

export interface Room {
  lampLight: PointLight;
}

export function buildRoom(world: World): Room {
  const room = new Group();
  room.name = 'room';

  // A small night cinema in winter: deep indigo velvet walls and carpet,
  // dim, never black, lit only by the warm lamp.
  const floorMat = new MeshLambertMaterial({ map: surfaceTexture(CINEMA_CARPET, 3) });
  floorMat.map!.repeat.set(6, 6);
  const floor = new Mesh(new PlaneGeometry(6, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, LAYOUT.floorY, -1);
  room.add(floor);

  const wallMat = new MeshLambertMaterial({ map: surfaceTexture(CINEMA_VELVET, 5) });
  wallMat.map!.repeat.set(4, 2);
  const wallGeo = new PlaneGeometry(4.2, 3.2);
  const backWall = new Mesh(wallGeo, wallMat);
  backWall.position.set(0, LAYOUT.floorY + 1.6, LAYOUT.room.backWallZ);
  room.add(backWall);
  for (const side of [-1, 1]) {
    const wall = new Mesh(wallGeo, wallMat);
    wall.rotation.y = -side * (Math.PI / 2);
    wall.position.set(side * LAYOUT.room.sideWallX, LAYOUT.floorY + 1.6, -0.2);
    room.add(wall);
  }
  // A wall behind the user and a ceiling close the room, so no empty
  // color shows anywhere the user looks.
  const rearWall = new Mesh(wallGeo, wallMat);
  rearWall.rotation.y = Math.PI;
  rearWall.position.set(0, LAYOUT.floorY + 1.6, 1.6);
  room.add(rearWall);
  const ceiling = new Mesh(new PlaneGeometry(4, 4), wallMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, LAYOUT.floorY + 2.7, -0.2);
  room.add(ceiling);
  // The big surfaces draw after the table and the book, which cover most of them.
  for (const surface of [floor, backWall, rearWall, ceiling, ...room.children.filter((c) => c !== floor && (c as Mesh).geometry === wallGeo)]) {
    surface.renderOrder = 1;
  }

  // Table: a wooden top on four legs.
  const wood = woodTexture();
  const tableMat = new MeshLambertMaterial({ map: wood });
  const { width, depth, thickness, centerZ } = LAYOUT.table;
  const top = new Mesh(new BoxGeometry(width, thickness, depth), tableMat);
  top.position.set(0, LAYOUT.tableTopY - thickness / 2, centerZ);
  room.add(top);
  const legHeight = LAYOUT.tableTopY - thickness - LAYOUT.floorY;
  const legGeo = new BoxGeometry(0.05, legHeight, 0.05);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new Mesh(legGeo, tableMat);
      leg.position.set(
        sx * (width / 2 - 0.06),
        LAYOUT.floorY + legHeight / 2,
        centerZ + sz * (depth / 2 - 0.06),
      );
      room.add(leg);
    }
  }

  // Lamp: base, stem, fabric shade, bulb, and the one warm light.
  const lamp = new Group();
  lamp.position.set(LAYOUT.lamp.x, LAYOUT.tableTopY, LAYOUT.lamp.z);
  const brass = new MeshLambertMaterial({ color: '#8a6a42' });
  const base = new Mesh(new CylinderGeometry(0.065, 0.075, 0.022, 32), brass);
  base.position.y = 0.011;
  lamp.add(base);
  const stem = new Mesh(new CylinderGeometry(0.007, 0.007, 0.3, 12), brass);
  stem.position.y = 0.022 + 0.15;
  lamp.add(stem);
  const shadeMat = new MeshLambertMaterial({
    color: '#eadcc6',
    emissive: '#ffcf9c',
    emissiveIntensity: 0.35,
    side: DoubleSide,
  });
  const shade = new Mesh(new CylinderGeometry(0.075, 0.13, 0.16, 40, 1, true), shadeMat);
  shade.position.y = 0.33;
  lamp.add(shade);
  const bulb = new Mesh(
    new SphereGeometry(0.022, 16, 12),
    new MeshBasicMaterial({ color: '#ffe2bd' }),
  );
  bulb.position.y = 0.3;
  lamp.add(bulb);
  const lampLight = new PointLight(LAMP_LIGHT_COLOR, 1.25, 4, 2);
  lampLight.position.y = 0.29;
  lamp.add(lampLight);
  room.add(lamp);

  // Soft fill so the room stays readable and never goes black.
  const fill = new HemisphereLight(FILL_SKY, FILL_GROUND, 0.95);
  room.add(fill);

  // Painted soft shadows: under the lamp base, and under the book.
  const lampShadow = new Mesh(
    new PlaneGeometry(0.26, 0.26),
    new MeshBasicMaterial({
      map: softShadowTexture(128, 128, 30, 14, 0.55),
      transparent: true,
      depthWrite: false,
    }),
  );
  lampShadow.rotation.x = -Math.PI / 2;
  lampShadow.position.set(LAYOUT.lamp.x, LAYOUT.tableTopY + 0.0006, LAYOUT.lamp.z);
  room.add(lampShadow);

  world.createTransformEntity(room);
  return { lampLight };
}
