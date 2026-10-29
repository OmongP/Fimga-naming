// Typo suggestions for English words inside layer / property names:
// "GraphStatContainr" → "GraphStatContainer". Only suggests when exactly one
// known UI word is within a small edit distance, so unknown-but-valid words
// (brand names, codes) are left alone.

import { DEFAULT_DICTIONARY } from "./conventions.js";

// Common UI vocabulary (lowercase). Add words here when a valid word gets "corrected".
const UI_WORDS = `
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

const KNOWN = new Set([...UI_WORDS, ...DEFAULT_DICTIONARY]);

// Optimal string alignment distance (insert / delete / substitute / swap neighbours).
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

// Plurals and simple inflections of known words count as known ("Buttons", "Cards").
function isKnown(word) {
  if (KNOWN.has(word)) return true;
  if (word.endsWith("ies") && KNOWN.has(word.slice(0, -3) + "y")) return true;
  if (word.endsWith("es") && KNOWN.has(word.slice(0, -2))) return true;
  return word.endsWith("s") && KNOWN.has(word.slice(0, -1));
}

/** Correct one lowercase word, or return null when it is known / not confidently a typo. */
export function correctWord(word) {
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

// Words inside a name: "GraphStatContainr" → Graph, Stat, Containr. All-caps runs are skipped.
const WORD_RE = /[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g;

/** Return the name with confidently misspelled words fixed, keeping case and separators. */
export function correctSpelling(name) {
  return String(name).replace(WORD_RE, (w) => {
    if (w.length > 1 && w === w.toUpperCase()) return w; // acronyms: URL, CTA
    const fix = correctWord(w.toLowerCase());
    if (!fix) return w;
    return w[0] === w[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
  });
}
