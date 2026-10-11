import { test } from "node:test";
import assert from "node:assert/strict";

import { collectNodes, renameVariantInName } from "../figma-plugin/src/figma-ops.js";

test("renameVariantInName replaces only the matching property value", () => {
  assert.equal(renameVariantInName("Type=Selected, Size=Large", "Type", "Selected", "selected"), "Type=selected, Size=Large");
  assert.equal(renameVariantInName("Type=Selected, State=Selected", "State", "Selected", "selected"), "Type=Selected, State=selected");
  assert.equal(renameVariantInName("Type=Default", "Type", "Selected", "selected"), "Type=Default");
});

test("collectNodes skips variant children and instance internals", () => {
  const variant = { id: "2", name: "Type=Selected", type: "COMPONENT", children: [] };
  const set = {
    id: "1", name: "sheet_top", type: "COMPONENT_SET", children: [variant],
    componentPropertyDefinitions: {
      Type: { type: "VARIANT", variantOptions: ["Selected"] },
      "Show icon#3:0": { type: "BOOLEAN" },
    },
  };
  variant.parent = set;
  const instance = { id: "4", name: "Button", type: "INSTANCE", children: [{ id: "5", name: "Frame 1", type: "FRAME", children: [] }] };
  const frame = { id: "6", name: "bottom_sheet", type: "FRAME", children: [set, instance] };

  const nodes = collectNodes([frame]);
  assert.deepEqual(nodes.map((n) => n.id), ["6", "1"]);
  assert.deepEqual(nodes[1].properties, [
    { name: "Type", type: "VARIANT", values: ["Selected"] },
    { name: "Show icon#3:0", type: "BOOLEAN", values: undefined },
  ]);
});
