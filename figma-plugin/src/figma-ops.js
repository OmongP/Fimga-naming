// Figma-side helpers for the plugin: read nodes into the engine's input shape
// and apply the engine's changes back to the document.
//
// Pure string helpers are exported separately so they can be unit-tested
// without a Figma runtime.

// Node types the engine checks. Instances keep their main component's name,
// and variant components inside a set are renamed through variant values.
const CHECKED_TYPES = new Set(["FRAME", "SECTION", "COMPONENT", "COMPONENT_SET"]);

const isVariantChild = (node) => node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET";

/** Stable key used by the UI to identify a change. */
export const changeKey = (c) => [c.kind, c.id, c.propertyKey ?? "", c.before].join("|");

/**
 * Replace one variant value inside a variant component name.
 * "Type=Selected, Size=Large" + (Type, Selected → selected) → "Type=selected, Size=Large"
 */
export function renameVariantInName(name, property, from, to) {
  return String(name)
    .split(",")
    .map((pair) => {
      const i = pair.indexOf("=");
      if (i === -1) return pair;
      const key = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (key === property && value === from) return `${pair.slice(0, i)}=${to}`;
      return pair;
    })
    .join(",");
}

/** Read a node's component property definitions into the engine's format. */
function readProperties(node) {
  const owner = node.type === "COMPONENT_SET" || (node.type === "COMPONENT" && !isVariantChild(node)) ? node : null;
  if (!owner) return undefined;
  let defs;
  try {
    defs = owner.componentPropertyDefinitions;
  } catch (e) {
    return undefined; // e.g. a component set with broken variants
  }
  return Object.entries(defs).map(([name, def]) => ({
    name,
    type: def.type,
    values: def.type === "VARIANT" ? def.variantOptions ?? [] : undefined,
  }));
}

/** Collect checkable nodes from the given roots (roots + descendants). */
export function collectNodes(roots) {
  const out = [];
  const seen = new Set();
  const visit = (node) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    if (CHECKED_TYPES.has(node.type) && !isVariantChild(node)) {
      out.push({ id: node.id, name: node.name, type: node.type, properties: readProperties(node) });
    }
    if (node.type === "INSTANCE") return; // don't descend into instance internals
    if ("children" in node) for (const child of node.children) visit(child);
  };
  for (const root of roots) visit(root);
  return out;
}

// Variant values first (they match child names by the old property name),
// then property names, then node names.
const APPLY_ORDER = { variantValue: 0, property: 1, node: 2 };

/** Apply engine changes to the document. Returns { applied, failed }. */
export async function applyChanges(changes) {
  const sorted = [...changes].sort((a, b) => APPLY_ORDER[a.kind] - APPLY_ORDER[b.kind]);
  let applied = 0;
  const failed = [];

  for (const c of sorted) {
    try {
      const node = await figma.getNodeByIdAsync(c.id);
      if (!node) throw new Error("노드를 찾을 수 없어요");

      if (c.kind === "node") {
        node.name = c.after;
      } else if (c.kind === "property") {
        node.editComponentProperty(c.propertyKey, { name: c.after.split("#")[0] });
      } else if (c.kind === "variantValue") {
        const property = c.propertyKey.split("#")[0];
        const variants = node.type === "COMPONENT_SET" ? node.children : [node];
        for (const v of variants) {
          if (v.type !== "COMPONENT") continue;
          const next = renameVariantInName(v.name, property, c.before, c.after);
          if (next !== v.name) v.name = next;
        }
      }
      applied++;
    } catch (e) {
      failed.push({ key: changeKey(c), before: c.before, after: c.after, error: String((e && e.message) || e) });
    }
  }
  return { applied, failed };
}
