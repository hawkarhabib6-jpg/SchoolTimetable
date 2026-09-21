let counter = 0;

/** Collision-safe enough for local documents, with no native dependency. */
export function createId(prefix = 'id'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${random}`;
}
