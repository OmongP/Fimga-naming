// Naming conventions and case utilities for the Figma Naming MCP.
//
// The engine is deterministic and string-only. It never talks to Figma:
// the MCP client (Claude) reads node data via the official Figma MCP and
// passes it in, then applies approved renames back through the Figma MCP.
//
// Finalized rules:
//   1. Component / Component set / Frame names → PascalCase
//   2. Component property names                → camelCase
//   3. Variant string values                   → start lowercase
//   4. Boolean property values (True/False)    → left as-is (not renameable)

export const DEFAULT_CONVENTION = {
  component: "PascalCase",
  frame: "PascalCase",
  property: "camelCase",
  variantValue: "lowerFirst", // string variant values start lowercase
};

// Known words used to split an all-lowercase, separator-less name into words
// (e.g. "bottomsheet" → Bottom + Sheet). Longest match wins. Overridable per call.
export const DEFAULT_DICTIONARY = [
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
];

// Figma's auto-generated names. These carry no meaning, so they always
// count as violations and cannot be fixed by case conversion alone —
// they need a human/AI-supplied meaningful name.
const DEFAULT_NAME_RE =
  /^(frame|group|component|component set|rectangle|ellipse|vector|line|arrow|star|polygon|slice|image|instance|text|union|subtract|intersect|exclude|mask|section|board)(\s+\d+)?$/i;

export function isDefaultName(name) {
  return DEFAULT_NAME_RE.test(String(name).trim());
}

export const lcFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * Strip parenthetical annotations from a name before casing.
 * e.g. "Asterisk (별표)" → "Asterisk". Keeps the meaningful part.
 */
export function stripAnnotations(name) {
  return String(name)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

/**
 * Greedily split an all-lowercase, separator-less token into dictionary words.
 * Returns null if the token can't be fully covered by the dictionary.
 */
function dictionarySplit(token, dictionary) {
  const words = [];
  let rest = token;
  while (rest.length) {
    // Longest matching prefix from the dictionary.
    const match = dictionary
      .filter((w) => rest.startsWith(w))
      .sort((a, b) => b.length - a.length)[0];
    if (!match) return null;
    words.push(match);
    rest = rest.slice(match.length);
  }
  return words;
}

/**
 * Split a single segment (no slash) into lowercase word tokens.
 * Handles spaces, - _ . separators, camelCase boundaries, letter/number
 * boundaries, and — as a last resort — known compound words.
 */
export function tokenize(segment, dictionary = DEFAULT_DICTIONARY) {
  const raw = String(segment)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // fooBar -> foo Bar
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // URLValue -> URL Value
    .split(/[\s\-_.]+/)
    .flatMap((w) => w.split(/(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])/)) // v2 boundaries
    .filter(Boolean);

  // For a single alphabetic token (any case), try to split it into known words.
  return raw.flatMap((w) => {
    const lower = w.toLowerCase();
    if (/^[a-z]+$/.test(lower)) {
      const split = dictionarySplit(lower, dictionary);
      if (split && split.length > 1) return split;
    }
    return [lower];
  });
}

const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

export function toPascalSegment(segment, dictionary) {
  return tokenize(segment, dictionary).map(cap).join("");
}

export function toCamelSegment(segment, dictionary) {
  const words = tokenize(segment, dictionary).map(cap);
  if (words.length === 0) return "";
  words[0] = words[0].toLowerCase();
  return words.join("");
}

/** Convert a full name to the target case. Slash segments are kept for grouping. */
export function toCase(name, targetCase, dictionary) {
  const convert = targetCase === "camelCase" ? toCamelSegment : toPascalSegment;
  return String(name)
    .split("/")
    .map((seg) => convert(seg.trim(), dictionary))
    .filter(Boolean)
    .join("/");
}

const PASCAL_SEG_RE = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_SEG_RE = /^[a-z][A-Za-z0-9]*$/;

/** True when every slash segment already satisfies the target case. */
export function isValidCase(name, targetCase) {
  const re = targetCase === "camelCase" ? CAMEL_SEG_RE : PASCAL_SEG_RE;
  const segments = String(name).split("/");
  return segments.length > 0 && segments.every((seg) => re.test(seg.trim()));
}

// A variant value is normalized (lowercased first char) ONLY when it is a
// simple Latin word starting with an uppercase letter — e.g. "Yes", "No",
// "Selected", "Dark", "DarkMode". Everything else is left untouched:
//   - already lowercase-first ("basic", "suffix-unit")
//   - digit-started ("1depth", "12")
//   - coded identifiers with separators ("SS_001_receipt")
//   - non-Latin values (Korean: "주민등록번호")
const NORMALIZABLE_VALUE_RE = /^[A-Z][A-Za-z]*$/;

/** True when the variant value should be normalized (starts uppercase, plain Latin word). */
export function variantValueNeedsChange(value) {
  return NORMALIZABLE_VALUE_RE.test(String(value));
}

/** A variant value is "valid" when it does NOT need normalization. */
export function isValidVariantValue(value) {
  return !variantValueNeedsChange(value);
}
