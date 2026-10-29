// Figma plugin entry — runs the same naming engine as the MCP, but reads and
// renames nodes directly instead of going through Claude + the Figma MCP.
//
// Flow: check (selection or page) → preview in the UI → user picks → apply.

import { analyze } from "../../src/naming.js";
import { renumber } from "../../src/numbering.js";
import { applyChanges, changeKey, collectNodes } from "./figma-ops.js";

figma.showUI(__html__, { width: 420, height: 560, themeColors: true });

let lastNodes = [];
let lastNumberChanges = [];

function scanRoots() {
  const selection = figma.currentPage.selection;
  return selection.length > 0
    ? { roots: selection, scope: `선택한 ${selection.length}개 레이어` }
    : { roots: figma.currentPage.children, scope: `현재 페이지 "${figma.currentPage.name}" 전체` };
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
    changes: changes.map((c) => ({ ...c, key: changeKey(c) })),
    needsInput,
  });
}

// Number the selected layers 1, 2, 3 … per parent, in reading order.
function numberCheck() {
  const selection = figma.currentPage.selection;
  const byParent = new Map();
  for (const node of selection) {
    const key = node.parent ? node.parent.id : "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  }
  lastNumberChanges = [...byParent.values()].flatMap((siblings) => renumber(siblings));
  figma.ui.postMessage({
    type: "numberResult",
    scope: selection.length ? `선택한 ${selection.length}개 레이어` : "레이어를 선택해 주세요",
    changes: lastNumberChanges,
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
    figma.notify(`${applied}개 번호를 다시 매겼어요`);
    numberCheck();
  } else if (msg.type === "apply") {
    // Re-run with the names typed for default-named nodes, keep only what the user ticked.
    const { changes } = analyze(lastNodes, {}, { names: msg.names || {} });
    const picked = new Set(msg.keys || []);
    const approved = changes.filter((c) => picked.has(changeKey(c)) || c.reason === "default-name-replaced");
    const { applied, failed } = await applyChanges(approved);
    figma.notify(failed.length ? `${applied}개 변경, ${failed.length}개 실패` : `${applied}개 이름을 정리했어요`);
    figma.ui.postMessage({ type: "applied", applied, failed });
    check();
  } else if (msg.type === "focus") {
    const node = await figma.getNodeByIdAsync(msg.id);
    if (node && "absoluteBoundingBox" in node) figma.viewport.scrollAndZoomIntoView([node]);
  }
};

check();
