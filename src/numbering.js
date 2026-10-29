// Rename layers to prefix + sequence number, Ultra Renamer style, but starting at 1.
// The old name is discarded: "Prefix" + 1, 2, 3 … in the chosen order.

// Layers whose position differs by at most this much (px) share a row / column.
export const LINE_TOLERANCE = 30;

/**
 * Sort nodes into lines, then along each line.
 *   order "row":    rows top → bottom, each row left → right   (0→1 / 2→3)
 *   order "column": columns left → right, each column top → bottom (0 2 / 1 3)
 *
 * @param {Array} nodes - [{ x, y, ... }] in one coordinate space
 * @param {"row"|"column"} [order]
 * @param {number} [tolerance] - max cross-axis difference (px) within one line
 */
export function readingOrder(nodes, order = "row", tolerance = LINE_TOLERANCE) {
  const [cross, along] = order === "column" ? ["x", "y"] : ["y", "x"];
  const sorted = [...nodes].sort((a, b) => a[cross] - b[cross] || a[along] - b[along]);
  const lines = [];
  for (const node of sorted) {
    const line = lines[lines.length - 1];
    if (line && node[cross] - line.start <= tolerance) line.items.push(node);
    else lines.push({ start: node[cross], items: [node] });
  }
  return lines.flatMap((l) => l.items.sort((a, b) => a[along] - b[along]));
}

/**
 * Plan renames: prefix + 1, 2, 3 … in the given order.
 *
 * @param {Array} nodes - [{ id, name, x, y }]
 * @param {{ prefix?: string, order?: "row"|"column" }} [opts]
 * @returns {Array<{ id, before, after }>} every node, in numbering order
 */
export function renumber(nodes, { prefix = "", order = "row" } = {}) {
  return readingOrder(nodes, order).map((node, i) => ({
    id: node.id,
    before: String(node.name ?? ""),
    after: `${prefix}${i + 1}`,
  }));
}
