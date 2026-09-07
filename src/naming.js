// Analysis + rename planning + report formatting.

import {
  DEFAULT_CONVENTION,
  DEFAULT_DICTIONARY,
  isDefaultName,
  isValidCase,
  isValidVariantValue,
  lcFirst,
  toCase,
} from "./conventions.js";

// Map raw Figma node types to a rule category.
function categoryOf(type) {
  const t = String(type || "").toUpperCase();
  if (t === "COMPONENT" || t === "COMPONENT_SET" || t === "INSTANCE") return "component";
  if (t === "FRAME" || t === "SECTION") return "frame";
  return "frame"; // default bucket for other container-ish nodes
}

const LABEL = {
  component: "Component",
  frame: "Frame",
  property: "Property",
  variantValue: "Variant value",
};

// Strip Figma's internal "#id" suffix from a property key ("Sub Text#21:0" -> "Sub Text").
const baseName = (key) => String(key).split("#")[0];
const suffixOf = (key) => {
  const i = String(key).indexOf("#");
  return i === -1 ? "" : String(key).slice(i);
};

/**
 * Analyze a list of nodes against the convention.
 *
 * @param {Array} nodes - [{ id, name, type, properties?: [{ name, type?, values? }] }]
 *   - property.type: "VARIANT" | "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" (optional)
 *   - property.values: string[] for VARIANT properties (values to normalize)
 * @param {object} [convention] - overrides for DEFAULT_CONVENTION
 * @param {object} [opts] - { names?: { [id]: "MeaningfulName" }, dictionary?: string[] }
 * @returns {{ changes, needsInput, ok }}
 */
export function analyze(nodes = [], convention = {}, opts = {}) {
  const conv = { ...DEFAULT_CONVENTION, ...convention };
  const names = opts.names ?? {};
  const dictionary = opts.dictionary ?? DEFAULT_DICTIONARY;

  const changes = []; // { id, category, kind, before, after, reason, ...refs }
  const needsInput = [];
  const ok = [];

  for (const node of nodes) {
    const category = categoryOf(node.type);
    const targetCase = conv[category];
    const before = String(node.name ?? "").trim();
    const supplied = names[node.id];

    // --- Node name ---
    if (isDefaultName(before)) {
      if (supplied && supplied.trim()) {
        const after = toCase(supplied, targetCase, dictionary);
        if (after && after !== before) {
          changes.push({ id: node.id, category, kind: "node", before, after, reason: "default-name-replaced" });
        }
      } else {
        needsInput.push({ id: node.id, category, before, targetCase });
      }
    } else if (!isValidCase(before, targetCase)) {
      const after = toCase(before, targetCase, dictionary);
      if (after && after !== before) {
        changes.push({ id: node.id, category, kind: "node", before, after, reason: `not-${targetCase}` });
      }
    } else {
      ok.push({ id: node.id, category, name: before });
    }

    // --- Properties ---
    for (const prop of node.properties ?? []) {
      const pkey = String(prop.name ?? "").trim();
      if (!pkey) continue;
      const base = baseName(pkey);
      const suffix = suffixOf(pkey);
      const ptype = String(prop.type ?? "").toUpperCase();

      // Property name → camelCase (applies to every property type).
      if (!isValidCase(base, conv.property)) {
        const after = toCase(base, conv.property, dictionary) + suffix;
        if (after !== pkey) {
          changes.push({ id: node.id, category: "property", kind: "property", propertyKey: pkey, before: pkey, after, reason: `not-${conv.property}` });
        }
      } else {
        ok.push({ id: node.id, category: "property", name: pkey });
      }

      // Variant string values → start lowercase. Boolean values are the
      // literal true/false type (rendered True/False) and are NOT touched.
      if (ptype === "VARIANT" || Array.isArray(prop.values)) {
        for (const value of prop.values ?? []) {
          const v = String(value);
          if (!isValidVariantValue(v)) {
            const after = lcFirst(v);
            if (after !== v) {
              changes.push({ id: node.id, category: "variantValue", kind: "variantValue", propertyKey: pkey, before: v, after, reason: "value-not-lower-first" });
            }
          } else {
            ok.push({ id: node.id, category: "variantValue", name: v });
          }
        }
      }
    }
  }

  return { changes, needsInput, ok };
}

const ORDER = ["component", "property", "variantValue", "frame"];

/** Render the result screen (Component / Property / Variant value / Frame, then "N changes ready"). */
export function formatReport({ changes, needsInput = [] }) {
  if (changes.length === 0 && needsInput.length === 0) {
    return "No naming issues found ✓";
  }

  const lines = ["Naming issues found"];
  for (const cat of ORDER) {
    const group = changes.filter((c) => c.category === cat);
    if (group.length === 0) continue;
    lines.push("", LABEL[cat]);
    for (const c of group) lines.push(`${c.before} → ${c.after}`);
  }

  if (needsInput.length > 0) {
    lines.push("", "Needs a meaningful name");
    for (const n of needsInput) lines.push(`${n.before} → ?  (${LABEL[n.category]}, ${n.targetCase})`);
  }

  const count = changes.length;
  lines.push("", `${count} change${count === 1 ? "" : "s"} ready`);
  if (needsInput.length > 0) lines.push(`${needsInput.length} more need a meaningful name`);
  return lines.join("\n");
}

/** Build the operation manifest the client applies via the Figma MCP. */
export function toOperations(changes) {
  return changes.map((c) => {
    if (c.kind === "property") return { op: "renameProperty", nodeId: c.id, from: c.before, to: c.after };
    if (c.kind === "variantValue")
      return { op: "renameVariantValue", nodeId: c.id, property: baseName(c.propertyKey), from: c.before, to: c.after };
    return { op: "renameNode", nodeId: c.id, to: c.after };
  });
}
