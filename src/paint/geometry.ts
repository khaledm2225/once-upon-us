import { BufferAttribute, type BufferGeometry } from '@iwsdk/core';

/**
 * A box's six faces come in the order +x, -x, +y, -y, +z, -z. This reorders
 * the faces so faces with the same material sit together, then gives each
 * material one group: one draw call per material instead of one per face run.
 */
export function groupBoxFaces(geometry: BufferGeometry, faceMaterials: readonly number[]): void {
  const index = geometry.index;
  if (!index || index.count !== 36) return;
  const source = index.array;
  const faces = [0, 1, 2, 3, 4, 5].sort((a, b) => faceMaterials[a] - faceMaterials[b] || a - b);
  const ordered = new (source.constructor as Uint16ArrayConstructor)(36);
  geometry.clearGroups();
  let start = 0;
  faces.forEach((face, i) => {
    ordered.set(source.subarray(face * 6, face * 6 + 6) as Uint16Array, i * 6);
    const last = i === faces.length - 1 || faceMaterials[faces[i + 1]] !== faceMaterials[face];
    if (last) {
      geometry.addGroup(start, (i + 1) * 6 - start, faceMaterials[face]);
      start = (i + 1) * 6;
    }
  });
  geometry.setIndex(new BufferAttribute(ordered, 1));
}
