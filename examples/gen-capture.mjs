// Generate docs/demo.svg — a terminal-style capture of the
// checkNaming → previewRename → applyRename flow, renderable on GitHub.
//
//   node examples/gen-capture.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = {
  bg: "#161b22", bar: "#21262d", border: "#30363d", text: "#c9d1d9",
  cmd: "#79c0ff", step: "#58a6ff", stepBg: "#1f2a44", head: "#f0883e",
  grp: "#8b949e", to: "#7ee787", from: "#c9d1d9", hash: "#6e7681",
  gold: "#d29922", ok: "#3fb950", dim: "#6e7681",
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const W = 700, PAD = 20, LH = 22, BAR = 40;
let y = BAR + 26;
const rows = [];
const push = (svg) => { rows.push(svg); y += LH; };
const blank = () => { y += LH * 0.5; };

// A line made of colored [text,color] spans.
function line(spans, x = PAD) {
  let out = `<text x="${x}" y="${y}" xml:space="preserve">`;
  let dx = x;
  for (const [t, c] of spans) {
    out += `<tspan x="${dx}" fill="${c}">${esc(t)}</tspan>`;
    dx += t.length * 7.62; // approx monospace advance at 13px
  }
  // Rebuild with cumulative x via a single tspan chain (monospace keeps alignment).
  out = `<text x="${x}" y="${y}" xml:space="preserve">`;
  for (const [t, c] of spans) out += `<tspan fill="${c}">${esc(t)}</tspan>`;
  out += `</text>`;
  push(out);
}
function banner(label) {
  blank();
  const h = 22, ry = y - 15;
  rows.push(`<rect x="${PAD - 8}" y="${ry}" width="${W - 2 * (PAD - 8)}" height="${h}" rx="4" fill="${C.stepBg}"/>`);
  rows.push(`<rect x="${PAD - 8}" y="${ry}" width="3" height="${h}" fill="${C.step}"/>`);
  rows.push(`<text x="${PAD}" y="${y}" font-weight="700" fill="${C.step}">${esc(label)}</text>`);
  y += LH + 4;
}

// ── content ──
line([["› ", C.ok], ["select SheetTop in Figma · read via Figma MCP · run figma-naming-mcp", C.cmd]]);

banner("1) checkNaming — 규칙 위반 검사");
line([["Naming issues found", C.head]]);
line([["Component", C.grp]]);
line([["sheet_top ", C.from], ["→ ", C.step], ["SheetTop", C.to]]);
line([["Property", C.grp]]);
line([["Sub Text", C.from], ["#21696:0 ", C.hash], ["→ ", C.step], ["subText", C.to], ["#21696:0", C.hash]]);
line([["Scroll", C.from], ["#26591:0 ", C.hash], ["→ ", C.step], ["scroll", C.to], ["#26591:0", C.hash]]);
line([["Show icon", C.from], ["#105792:0 ", C.hash], ["→ ", C.step], ["showIcon", C.to], ["#105792:0", C.hash]]);
line([["Type ", C.from], ["→ ", C.step], ["type", C.to]]);
line([["Variant value", C.grp]]);
line([["Ads ", C.from], ["→ ", C.step], ["ads", C.to]]);
line([["6 changes ready", C.gold]]);

banner("2) previewRename — before → after 계획 (Figma 미변경)");
line([["operations:", C.dim]]);
line([["• renameNode         ", C.dim], ["sheet_top ", C.from], ["→ ", C.step], ["SheetTop", C.to]]);
line([["• renameProperty      ", C.dim], ["Show icon ", C.from], ["→ ", C.step], ["showIcon", C.to]]);
line([["• renameProperty      ", C.dim], ["Type ", C.from], ["→ ", C.step], ["type", C.to]]);
line([["• renameVariantValue  ", C.dim], ["type Ads ", C.from], ["→ ", C.step], ["ads", C.to]]);
line([["  … + subText, scroll (6 total)", C.dim]]);

banner("3) applyRename — 승인 후 Figma 반영 → Before/After 캡처");
line([["✓ Approved 6 operations ", C.ok], ["· executed via Figma MCP (use_figma)", C.dim]]);
line([["• 13120:50612  name → ", C.dim], ["\"SheetTop\"", C.to]]);
line([["• 13120:50612  property \"Show icon\" → ", C.dim], ["\"showIcon\"", C.to]]);
line([["• 13120:50612  type value \"Ads\" → ", C.dim], ["\"ads\"", C.to]]);
line([["  boolean values (True/False) 는 규칙 대상 아님 → 유지", C.dim]]);

const H = y + 8;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-size="13">
<rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}"/>
<rect width="${W}" height="${BAR}" rx="12" fill="${C.bar}"/>
<rect y="${BAR - 12}" width="${W}" height="12" fill="${C.bar}"/>
<circle cx="20" cy="20" r="6" fill="#ff5f56"/><circle cx="40" cy="20" r="6" fill="#ffbd2e"/><circle cx="60" cy="20" r="6" fill="#27c93f"/>
<text x="82" y="24" fill="${C.grp}" font-size="12.5">figma-naming-mcp — checkNaming → previewRename → applyRename</text>
${rows.join("\n")}
</svg>`;

mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "demo.svg"), svg);
console.log("wrote docs/demo.svg  (" + W + "×" + H + ")");
