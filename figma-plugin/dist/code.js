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
    const raw = String(segment).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).flatMap((w) => w.split(new RegExp("(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])"))).filter(Boolean);
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

  // src/spelling.js
  var UI_WORDS = `
account action active add address agree agreement alert all amount app area arrow asset avatar
back background badge balance bank banner bar base basic body border bottom box brand breadcrumb
bullet button calendar call camera caption car card carousel cart category cell center chart chat
check checkbox chevron chip circle clear close code collapse color column comment complete component
confirm contact container content contents control count counter cover credit dark dashboard date
day default delete desc description detail details dialog disabled divider document dot down drawer
dropdown edit empty end error expand field file fill filled filter first focus footer form frame full
gallery ghost graph grid group guide handle header heading help hidden history home horizontal hover
icon image indicator info information inner input insurance item label large last layout left light
line link list loading loan location lock login logo logout main map medium menu message middle
mileage mode modal month more name navigation new next notice notification number off option order
outer outline overlay page pagination panel password payment period phone picker placeholder plus
point popup preview previous price primary profile progress radio rate rating receipt record refresh
request result right row sample scroll search secondary section segment select selected selection
service setting settings shadow sheet side sidebar signup size skeleton slider small snackbar sort
space spacer stat state statistics status step stepper sub submit success summary switch system tab
table tag temp terms tertiary test text textarea thumbnail time title toast toggle toolbar tooltip top
total type upload user value vehicle vertical view warning week widget wrapper year
`.split(/\s+/).filter(Boolean);
  var KNOWN = /* @__PURE__ */ new Set([...UI_WORDS, ...DEFAULT_DICTIONARY]);
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }
  function isKnown(word) {
    if (KNOWN.has(word)) return true;
    if (word.endsWith("ies") && KNOWN.has(word.slice(0, -3) + "y")) return true;
    if (word.endsWith("es") && KNOWN.has(word.slice(0, -2))) return true;
    return word.endsWith("s") && KNOWN.has(word.slice(0, -1));
  }
  function correctWord(word) {
    if (word.length < 4 || isKnown(word)) return null;
    const max = word.length >= 8 ? 2 : 1;
    let best = null;
    let bestDistance = Infinity;
    let tie = false;
    for (const known of KNOWN) {
      if (Math.abs(known.length - word.length) > max) continue;
      const dist = distance(word, known);
      if (dist > max) continue;
      if (dist < bestDistance) [best, bestDistance, tie] = [known, dist, false];
      else if (dist === bestDistance) tie = true;
    }
    return best && !tie ? best : null;
  }
  var WORD_RE = /[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g;
  function correctSpelling(name) {
    return String(name).replace(WORD_RE, (w) => {
      if (w.length > 1 && w === w.toUpperCase()) return w;
      const fix = correctWord(w.toLowerCase());
      if (!fix) return w;
      return w[0] === w[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
    });
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
          const after = correctSpelling(toCase(stripAnnotations(supplied), targetCase, dictionary));
          if (after && after !== before) {
            changes.push({ id: node.id, category, kind: "node", before, after, reason: "default-name-replaced" });
          }
        } else {
          needsInput.push({ id: node.id, category, before, targetCase });
        }
      } else if (!isValidCase(before, targetCase)) {
        const after = correctSpelling(toCase(stripAnnotations(before), targetCase, dictionary));
        if (after && after !== before) {
          changes.push({ id: node.id, category, kind: "node", before, after, reason: `not-${targetCase}` });
        }
      } else if (correctSpelling(before) !== before) {
        changes.push({ id: node.id, category, kind: "node", before, after: correctSpelling(before), reason: "typo" });
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
          const after = correctSpelling(toCase(stripAnnotations(base), conv.property, dictionary)) + suffix;
          if (after !== pkey) {
            changes.push({ id: node.id, category: "property", kind: "property", propertyKey: pkey, before: pkey, after, reason: `not-${conv.property}` });
          }
        } else if (correctSpelling(base) !== base) {
          const after = correctSpelling(base) + suffix;
          changes.push({ id: node.id, category: "property", kind: "property", propertyKey: pkey, before: pkey, after, reason: "typo" });
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
  var LINE_TOLERANCE = 30;
  function readingOrder(nodes, order = "row", tolerance = LINE_TOLERANCE) {
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
  function renumber(nodes, { prefix = "", order = "row" } = {}) {
    return readingOrder(nodes, order).map((node, i) => {
      var _a;
      return {
        id: node.id,
        before: String((_a = node.name) != null ? _a : ""),
        after: `${prefix}${i + 1}`
      };
    });
  }

  // src/suggest.js
  var PASCAL_RE = /^[A-Z][A-Za-z0-9]*$/;
  var ICON_RE = /icon|(^|[\/_\s-])ic([\/_\s-]|$)/i;
  function componentWord(name) {
    if (ICON_RE.test(String(name))) return "Icon";
    const first = String(name).split("/")[0].trim();
    if (!first || isDefaultName(first)) return null;
    const word = toCase(stripAnnotations(first), "PascalCase");
    return PASCAL_RE.test(word) ? word : null;
  }
  function suggestName(s = {}) {
    var _a;
    if (s.role === "top") return "Header";
    if (s.role === "bottom") return "SheetBottom";
    if (s.role === "middle") return "MainContent";
    const contents = ((_a = s.contents) != null ? _a : []).filter(Boolean);
    if (!contents.length) return null;
    const kinds = [...new Set(contents)];
    if (kinds.length === 1) return contents.length === 1 ? kinds[0] : `${kinds[0]}Group`;
    if (kinds.length <= 3) return kinds.join("");
    return "Content";
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
  function screenRole(node) {
    const screen = node.parent;
    if (!screen || screen.type !== "FRAME" || !screen.parent || screen.parent.type !== "PAGE") return void 0;
    const h = screen.height;
    if (!h) return void 0;
    if (node.y <= h * 0.15 && node.height <= h * 0.3) return "top";
    if (node.y + node.height >= h * 0.85 && node.height <= h * 0.35) return "bottom";
    if (node.height >= h * 0.4) return "middle";
    return void 0;
  }
  var hasImageFill = (n) => Array.isArray(n.fills) && n.fills.some((f) => f.type === "IMAGE" && f.visible !== false);
  var ICON_TYPES = /* @__PURE__ */ new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON"]);
  function contentsOf(node, depth = 0) {
    if (node.visible === false) return [];
    if (node.type === "TEXT") return [typeof node.fontSize === "number" && node.fontSize >= 20 ? "Title" : "Text"];
    if (hasImageFill(node)) return ["Image"];
    if (node.type === "INSTANCE") return [componentWord(node.name)];
    if (ICON_TYPES.has(node.type)) return ["Icon"];
    if (node.type === "LINE") return ["Divider"];
    if (depth === 0 && "children" in node) return node.children.flatMap((c) => contentsOf(c, 1));
    return [];
  }
  function describeNode(node) {
    const kids = "children" in node ? node.children : [];
    return { role: screenRole(node), contents: kids.flatMap((k) => contentsOf(k)).filter(Boolean) };
  }
  function collectNodes(roots) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const visit = (node) => {
      var _a;
      if (seen.has(node.id)) return;
      seen.add(node.id);
      if (CHECKED_TYPES.has(node.type) && !isVariantChild(node)) {
        const entry = { id: node.id, name: node.name, type: node.type, properties: readProperties(node) };
        if (isDefaultName(node.name)) entry.suggestion = (_a = suggestName(describeNode(node))) != null ? _a : void 0;
        out.push(entry);
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
    const suggestions = new Map(lastNodes.map((n) => [n.id, n.suggestion]));
    figma.ui.postMessage({
      type: "result",
      scope,
      nodeCount: lastNodes.length,
      okCount: ok.length,
      changes: changes.map((c) => __spreadProps(__spreadValues({}, c), { key: changeKey(c) })),
      needsInput: needsInput.map((n) => __spreadProps(__spreadValues({}, n), { suggestion: suggestions.get(n.id) }))
    });
  }
  var numberOpts = null;
  function numberCheck(opts = numberOpts || {}) {
    numberOpts = opts;
    const selection = figma.currentPage.selection;
    const nodes = selection.map((node) => {
      const box = node.absoluteBoundingBox;
      return { id: node.id, name: node.name, x: box ? box.x : node.x, y: box ? box.y : node.y };
    });
    lastNumberChanges = renumber(nodes, opts);
    figma.ui.postMessage({
      type: "numberResult",
      scope: `${selection.length} Frames Selected`,
      changes: lastNumberChanges
    });
  }
  figma.on("selectionchange", () => {
    if (numberOpts) numberCheck();
  });
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "check") {
      numberOpts = null;
      check();
    } else if (msg.type === "numberCheck") {
      numberCheck({ prefix: msg.prefix || "", order: msg.order || "row" });
    } else if (msg.type === "numberApply") {
      let applied = 0;
      for (const c of lastNumberChanges) {
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
