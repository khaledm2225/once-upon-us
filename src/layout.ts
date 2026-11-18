// Where everything sits, in meters, measured from the user's eyes when VR
// starts ("local" reference space: x right, y up, z toward the user).

export const LAYOUT = {
  /** Height of the table top below the eyes of a seated person. */
  tableTopY: -0.45,
  /** Floor below the eyes of a seated person. */
  floorY: -1.17,
  table: { width: 1.1, depth: 0.75, thickness: 0.04, centerZ: -0.55 },
  /** The book's spine line: center of the open book. */
  book: { x: 0, z: -0.42, tiltDeg: 15, restHeight: 0.012 },
  page: { width: 0.24, depth: 0.3, thickness: 0.0008 },
  cover: { thickness: 0.003, overhang: 0.004 },
  lamp: { x: -0.43, z: -0.78 },
  room: { backWallZ: -2.1, sideWallX: 1.9 },
} as const;
