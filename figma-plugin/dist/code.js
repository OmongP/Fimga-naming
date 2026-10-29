(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/conventions.js
  var DEFAULT_CONVENTION = {
    component: "PascalCase",
    frame: "PascalCase",
    property: "camelCase",
    variantValue: "lowerFirst"
    // string variant values start lowercase
  };
  var DEFAULT_DICTIONARY = [
    "bottom",
    "sheet",
    "contents",
    "full",
    "top",
    "ads",
    "box",
    "button",
    "status",
    "bar",
    "text",
    "field",
    "home",
    "dark",
    "mode",
    "service",
    "system",
    "caption",
    "list",
    "outline",
    "progress",
    "indicator",
    "main",
    "content",
    "header",
    "navigation",
    "notice",
    "asset",
    "information",
    "form",
    "image"
  ];
  var DEFAULT_NAME_RE = /^(frame|group|component|component set|rectangle|ellipse|vector|line|arrow|star|polygon|slice|image|instance|text|union|subtract|intersect|exclude|mask|section|board)(\s+\d+)?$/i;
  function isDefaultName(name) {
    const s = String(name).trim();
    return DEFAULT_NAME_RE.test(s) || /^\d+$/.test(s);
  }
  var lcFirst = (s) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  function stripAnnotations(name) {
    return String(name).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  }
  function dictionarySplit(token, dictionary) {
    const words = [];
    let rest = token;
    while (rest.length) {
      const match = dictionary.filter((w) => rest.startsWith(w)).sort((a, b) => b.length - a.length)[0];
      if (!match) return null;
      words.push(match);
      rest = rest.slice(match.length);
    }
    return words;
  }
  function tokenize(segment, dictionary = DEFAULT_DICTIONARY) {
    const raw = String(segment).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[\s\-_.]+/).flatMap((w) => w.split(new RegExp("(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])"))).filter(Boolean);
    return raw.flatMap((w) => {
      const lower = w.toLowerCase();
      if (/^[a-z]+$/.test(lower)) {
        const split = dictionarySplit(lower, dictionary);
        if (split && split.length > 1) return split;
      }
      return [lower];
    });
  }
  var cap = (w) => w ? w[0].toUpperCase() + w.slice(1) : w;
  function toPascalSegment(segment, dictionary) {
    return tokenize(segment, dictionary).map(cap).join("");
  }
  function toCamelSegment(segment, dictionary) {
    const words = tokenize(segment, dictionary).map(cap);
    if (words.length === 0) return "";
    words[0] = words[0].toLowerCase();
    return words.join("");
  }
  function toCase(name, targetCase, dictionary) {
    const convert = targetCase === "camelCase" ? toCamelSegment : toPascalSegment;
    return String(name).split("/").map((seg) => convert(seg.trim(), dictionary)).filter(Boolean).join("/");
  }
  var PASCAL_SEG_RE = /^[A-Z][A-Za-z0-9]*$/;
  var CAMEL_SEG_RE = /^[a-z][A-Za-z0-9]*$/;
  function isValidCase(name, targetCase) {
    const re = targetCase === "camelCase" ? CAMEL_SEG_RE : PASCAL_SEG_RE;
    const segments = String(name).split("/");
    return segments.length > 0 && segments.every((seg) => re.test(seg.trim()));
  }
  var NORMALIZABLE_VALUE_RE = /^[A-Z][A-Za-z]*$/;
  function variantValueNeedsChange(value) {
    return NORMALIZABLE_VALUE_RE.test(String(value));
  }

  // src/naming.js
  function categoryOf(type) {
    const t = String(type || "").toUpperCase();
    if (t === "COMPONENT" || t === "COMPONENT_SET" || t === "INSTANCE") return "component";
    if (t === "FRAME" || t === "SECTION") return "frame";
    return "frame";
  }
  var baseName = (key) => String(key).split("#")[0];
  var suffixOf = (key) => {
    const i = String(key).indexOf("#");
    return i === -1 ? "" : String(key).slice(i);
  };
  function analyze(nodes = [], convention = {}, opts = {}) {
    var _a, _b, _c, _d, _e, _f, _g;
    const conv = __spreadValues(__spreadValues({}, DEFAULT_CONVENTION), convention);
    const names = (_a = opts.names) != null ? _a : {};
    const dictionary = (_b = opts.dictionary) != null ? _b : DEFAULT_DICTIONARY;
    const changes = [];
    const needsInput = [];
    const ok = [];
    for (const node of nodes) {
      const category = categoryOf(node.type);
      const targetCase = conv[category];
      const before = String((_c = node.name) != null ? _c : "").trim();
      const supplied = names[node.id];
      if (isDefaultName(before)) {
        if (supplied && supplied.trim()) {
          const after = toCase(stripAnnotations(supplied), targetCase, dictionary);
          if (after && after !== before) {
            changes.push({ id: node.id, category, kind: "node", before, after, reason: "default-name-replaced" });
          }
        } else {
          needsInput.push({ id: node.id, category, before, targetCase });
        }
      } else if (!isValidCase(before, targetCase)) {
        const after = toCase(stripAnnotations(before), targetCase, dictionary);
        if (after && after !== before) {
          changes.push({ id: node.id, category, kind: "node", before, after, reason: `not-${targetCase}` });
        }
      } else {
        ok.push({ id: node.id, category, name: before });
      }
      for (const prop of (_d = node.properties) != null ? _d : []) {
        const pkey = String((_e = prop.name) != null ? _e : "").trim();
        if (!pkey) continue;
        const base = baseName(pkey);
        const suffix = suffixOf(pkey);
        const ptype = String((_f = prop.type) != null ? _f : "").toUpperCase();
        if (!isValidCase(base, conv.property)) {
          const after = toCase(stripAnnotations(base), conv.property, dictionary) + suffix;
          if (after !== pkey) {
            changes.push({ id: node.id, category: "property", kind: "property", propertyKey: pkey, before: pkey, after, reason: `not-${conv.property}` });
          }
        } else {
          ok.push({ id: node.id, category: "property", name: pkey });
        }
        if (ptype === "VARIANT" || Array.isArray(prop.values)) {
          for (const value of (_g = prop.values) != null ? _g : []) {
            const v = String(value);
            if (variantValueNeedsChange(v)) {
              changes.push({ id: node.id, category: "variantValue", kind: "variantValue", propertyKey: pkey, before: v, after: lcFirst(v), reason: "value-not-lower-first" });
            } else {
              ok.push({ id: node.id, category: "variantValue", name: v });
            }
          }
        }
      }
    }
    return { changes, needsInput, ok };
  }

  // src/numbering.js
  var TRAILING_NUMBER = /^(.*?)([\s_-]*)(\d+)$/;
  var ROW_TOLERANCE = 30;
  function readingOrder(nodes, tolerance = ROW_TOLERANCE) {
    const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const node of sorted) {
      const row = rows[rows.length - 1];
      if (row && node.y - row.top <= tolerance) row.items.push(node);
      else rows.push({ top: node.y, items: [node] });
    }
    return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
  }
  function renumber(nodes) {
    var _a;
    const changes = [];
    let index = 0;
    for (const node of readingOrder(nodes)) {
      const before = String((_a = node.name) != null ? _a : "");
      const match = before.match(TRAILING_NUMBER);
      if (!match) continue;
      index += 1;
      const [, prefix, separator] = match;
      const after = `${prefix}${separator}${index}`;
      if (after !== before) changes.push({ id: node.id, before, after });
    }
    return changes;
  }

  // figma-plugin/src/figma-ops.js
  var CHECKED_TYPES = /* @__PURE__ */ new Set(["FRAME", "SECTION", "COMPONENT", "COMPONENT_SET"]);
  var isVariantChild = (node) => node.type === "COMPONENT" && node.parent && node.parent.type === "COMPONENT_SET";
  var changeKey = (c) => {
    var _a;
    return [c.kind, c.id, (_a = c.propertyKey) != null ? _a : "", c.before].join("|");
  };
  function renameVariantInName(name, property, from, to) {
    return String(name).split(",").map((pair) => {
      const i = pair.indexOf("=");
      if (i === -1) return pair;
      const key = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (key === property && value === from) return `${pair.slice(0, i)}=${to}`;
      return pair;
    }).join(",");
  }
  function readProperties(node) {
    const owner = node.type === "COMPONENT_SET" || node.type === "COMPONENT" && !isVariantChild(node) ? node : null;
    if (!owner) return void 0;
    let defs;
    try {
      defs = owner.componentPropertyDefinitions;
    } catch (e) {
      return void 0;
    }
    return Object.entries(defs).map(([name, def]) => {
      var _a;
      return {
        name,
        type: def.type,
        values: def.type === "VARIANT" ? (_a = def.variantOptions) != null ? _a : [] : void 0
      };
    });
  }
  function collectNodes(roots) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const visit = (node) => {
      if (seen.has(node.id)) return;
      seen.add(node.id);
      if (CHECKED_TYPES.has(node.type) && !isVariantChild(node)) {
        out.push({ id: node.id, name: node.name, type: node.type, properties: readProperties(node) });
      }
      if (node.type === "INSTANCE") return;
      if ("children" in node) for (const child of node.children) visit(child);
    };
    for (const root of roots) visit(root);
    return out;
  }
  var APPLY_ORDER = { variantValue: 0, property: 1, node: 2 };
  async function applyChanges(changes) {
    const sorted = [...changes].sort((a, b) => APPLY_ORDER[a.kind] - APPLY_ORDER[b.kind]);
    let applied = 0;
    const failed = [];
    for (const c of sorted) {
      try {
        const node = await figma.getNodeByIdAsync(c.id);
        if (!node) throw new Error("\uB178\uB4DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694");
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
        failed.push({ key: changeKey(c), before: c.before, after: c.after, error: String(e && e.message || e) });
      }
    }
    return { applied, failed };
  }

  // figma-plugin/src/code.js
  figma.showUI(__html__, { width: 420, height: 560, themeColors: true });
  var lastNodes = [];
  var lastNumberChanges = [];
  function scanRoots() {
    const selection = figma.currentPage.selection;
    return selection.length > 0 ? { roots: selection, scope: `\uC120\uD0DD\uD55C ${selection.length}\uAC1C \uB808\uC774\uC5B4` } : { roots: figma.currentPage.children, scope: `\uD604\uC7AC \uD398\uC774\uC9C0 "${figma.currentPage.name}" \uC804\uCCB4` };
  }
  function check() {
    const { roots, scope } = scanRoots();
    lastNodes = collectNodes(roots);
    const { changes, needsInput, ok } = analyze(lastNodes);
    figma.ui.postMessage({
      type: "result",
      scope,
      nodeCount: lastNodes.length,
      okCount: ok.length,
      changes: changes.map((c) => __spreadProps(__spreadValues({}, c), { key: changeKey(c) })),
      needsInput
    });
  }
  function numberCheck() {
    const selection = figma.currentPage.selection;
    const byParent = /* @__PURE__ */ new Map();
    for (const node of selection) {
      const key = node.parent ? node.parent.id : "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(node);
    }
    lastNumberChanges = [...byParent.values()].flatMap((siblings) => renumber(siblings));
    figma.ui.postMessage({
      type: "numberResult",
      scope: selection.length ? `\uC120\uD0DD\uD55C ${selection.length}\uAC1C \uB808\uC774\uC5B4` : "\uB808\uC774\uC5B4\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694",
      changes: lastNumberChanges
    });
  }
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "check") {
      check();
    } else if (msg.type === "numberCheck") {
      numberCheck();
    } else if (msg.type === "numberApply") {
      const picked = new Set(msg.keys || []);
      let applied = 0;
      for (const c of lastNumberChanges) {
        if (!picked.has(c.id)) continue;
        const node = await figma.getNodeByIdAsync(c.id);
        if (node) {
          node.name = c.after;
          applied++;
        }
      }
      figma.notify(`${applied}\uAC1C \uBC88\uD638\uB97C \uB2E4\uC2DC \uB9E4\uACBC\uC5B4\uC694`);
      numberCheck();
    } else if (msg.type === "apply") {
      const { changes } = analyze(lastNodes, {}, { names: msg.names || {} });
      const picked = new Set(msg.keys || []);
      const approved = changes.filter((c) => picked.has(changeKey(c)) || c.reason === "default-name-replaced");
      const { applied, failed } = await applyChanges(approved);
      figma.notify(failed.length ? `${applied}\uAC1C \uBCC0\uACBD, ${failed.length}\uAC1C \uC2E4\uD328` : `${applied}\uAC1C \uC774\uB984\uC744 \uC815\uB9AC\uD588\uC5B4\uC694`);
      figma.ui.postMessage({ type: "applied", applied, failed });
      check();
    } else if (msg.type === "focus") {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (node && "absoluteBoundingBox" in node) figma.viewport.scrollAndZoomIntoView([node]);
    }
  };
  check();
})();
