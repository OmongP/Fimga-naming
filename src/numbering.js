// Renumber sibling layers in reading order (left → right, then the next row down).
// Numbers start at 1. Layers without a trailing number are left alone.

// "Item 0" → prefix "Item", separator " ", number "0". Separators (space, _, -) are kept.
const TRAILING_NUMBER = /^(.*?)([\s_-]*)(\d+)$/;

// Layers whose y differs from the row's first layer by at most this much share a row.
export const ROW_TOLERANCE = 30;

/**
 * Sort nodes in reading order: rows by y (top → bottom), each row left → right.
 *
 * @param {Array} nodes - [{ x, y, ... }] siblings sharing one parent
 * @param {number} [tolerance] - max y difference (px) within one row
 */
export function readingOrder(nodes, tolerance = ROW_TOLERANCE) {
  const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const node of sorted) {
    const row = rows[rows.length - 1];
    if (row && node.y - row.top <= tolerance) row.items.push(node);
    else rows.push({ top: node.y, items: [node] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

/**
 * Plan renames that number the layers 1, 2, 3 … in reading order.
 *
 * @param {Array} nodes - [{ id, name, x, y, width, height }] siblings
 * @returns {Array<{ id, before, after }>} only the layers whose name changes
 */
export function renumber(nodes) {
  const changes = [];
  let index = 0;
  for (const node of readingOrder(nodes)) {
    const before = String(node.name ?? "");
    const match = before.match(TRAILING_NUMBER);
    if (!match) continue;
    index += 1;
    const [, prefix, separator] = match;
    const after = `${prefix}${separator}${index}`;
    if (after !== before) changes.push({ id: node.id, before, after });
  }
  return changes;
}
