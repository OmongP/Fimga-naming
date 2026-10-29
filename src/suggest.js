// Suggest a meaningful name for a default-named layer (Frame 12, "1" …) from
// what it contains — text, image, icon, components — offline, no AI. Layout
// words (Row, Column, List) are avoided: they say nothing about the content.
// The suggestion only pre-fills the input; the user can edit it before applying.

import { isDefaultName, stripAnnotations, toCase } from "./conventions.js";

const PASCAL_RE = /^[A-Z][A-Za-z0-9]*$/;
const ICON_RE = /icon|(^|[\/_\s-])ic([\/_\s-]|$)/i;

/**
 * Content word for a component instance: "Box Button" → "BoxButton",
 * "Line/ic_sort/default" → "Icon". Korean or default names → null.
 */
export function componentWord(name) {
  if (ICON_RE.test(String(name))) return "Icon";
  const first = String(name).split("/")[0].trim();
  if (!first || isDefaultName(first)) return null;
  const word = toCase(stripAnnotations(first), "PascalCase");
  return PASCAL_RE.test(word) ? word : null;
}

/**
 * @param {object} s - structural summary of the layer
 *   role?: "top" | "middle" | "bottom"  position as a direct child of a screen
 *   contents?: string[]  content word per child, in order (Text, Title, Image, Icon, Divider, BoxButton …)
 * @returns {string|null} PascalCase suggestion, or null when nothing fits
 */
export function suggestName(s = {}) {
  // Screen structure: Header → MainContent → SheetBottom.
  if (s.role === "top") return "Header";
  if (s.role === "bottom") return "SheetBottom";
  if (s.role === "middle") return "MainContent";

  const contents = (s.contents ?? []).filter(Boolean);
  if (!contents.length) return null;
  const kinds = [...new Set(contents)];
  if (kinds.length === 1) return contents.length === 1 ? kinds[0] : `${kinds[0]}Group`; // Image, ImageGroup
  if (kinds.length <= 3) return kinds.join(""); // ImageText, IconTextBoxButton
  return "Content";
}
