import { test } from "node:test";
import assert from "node:assert/strict";

import {
  toCase,
  isValidCase,
  isDefaultName,
  isValidVariantValue,
  lcFirst,
  tokenize,
} from "../src/conventions.js";
import { analyze, formatReport, toOperations } from "../src/naming.js";

test("tokenize splits mixed separators and camel boundaries", () => {
  assert.deepEqual(tokenize("button primary"), ["button", "primary"]);
  assert.deepEqual(tokenize("Button Type"), ["button", "type"]);
  assert.deepEqual(tokenize("icon-position_v2"), ["icon", "position", "v", "2"]);
});

test("tokenize splits known compound words", () => {
  assert.deepEqual(tokenize("bottomsheet"), ["bottom", "sheet"]);
  assert.deepEqual(tokenize("fullsheet"), ["full", "sheet"]);
  assert.deepEqual(tokenize("adssheet"), ["ads", "sheet"]);
});

test("toCase PascalCase splits compound words", () => {
  assert.equal(toCase("bottomsheet", "PascalCase"), "BottomSheet");
  assert.equal(toCase("fullsheet", "PascalCase"), "FullSheet");
  assert.equal(toCase("sheet_contents", "PascalCase"), "SheetContents");
  assert.equal(toCase("sheet_top", "PascalCase"), "SheetTop");
});

test("toCase camelCase for property names", () => {
  assert.equal(toCase("Show icon", "camelCase"), "showIcon");
  assert.equal(toCase("Sub Text", "camelCase"), "subText");
  assert.equal(toCase("Type", "camelCase"), "type");
});

test("isValidVariantValue + lcFirst", () => {
  assert.equal(isValidVariantValue("selected"), true);
  assert.equal(isValidVariantValue("Selected"), false);
  assert.equal(lcFirst("Ads"), "ads");
  assert.equal(lcFirst("Yes"), "yes");
});

test("isDefaultName flags Figma auto names", () => {
  assert.equal(isDefaultName("Frame 123"), true);
  assert.equal(isDefaultName("VehicleSummary"), false);
});

test("analyze: component name + camelCase props + variant values", () => {
  const nodes = [
    {
      id: "1",
      name: "sheet_top",
      type: "COMPONENT_SET",
      properties: [
        { name: "Sub Text#21:0", type: "TEXT" },
        { name: "Show icon#10:0", type: "BOOLEAN" },
        { name: "Type", type: "VARIANT", values: ["basic", "Ads", "sentence"] },
      ],
    },
  ];
  const { changes } = analyze(nodes);
  const byBefore = Object.fromEntries(changes.map((c) => [c.before, c.after]));
  assert.equal(byBefore["sheet_top"], "SheetTop");
  assert.equal(byBefore["Sub Text#21:0"], "subText#21:0");
  assert.equal(byBefore["Show icon#10:0"], "showIcon#10:0");
  assert.equal(byBefore["Type"], "type");
  assert.equal(byBefore["Ads"], "ads"); // variant value normalized
});

test("boolean values are never renamed (only VARIANT values normalized)", () => {
  const nodes = [
    {
      id: "1",
      name: "SheetTop",
      type: "COMPONENT_SET",
      properties: [
        { name: "scroll", type: "BOOLEAN" }, // value True/False not touched
        { name: "type", type: "VARIANT", values: ["basic", "ads"] },
      ],
    },
  ];
  const { changes } = analyze(nodes);
  // Everything already compliant → no changes.
  assert.equal(changes.length, 0);
});

test("toOperations differentiates node / property / variant-value renames", () => {
  const { changes } = analyze([
    {
      id: "1",
      name: "adssheet",
      type: "COMPONENT_SET",
      properties: [{ name: "Show Dim", type: "VARIANT", values: ["Yes", "No"] }],
    },
  ]);
  const ops = toOperations(changes);
  assert.ok(ops.some((o) => o.op === "renameNode" && o.to === "AdsSheet"));
  assert.ok(ops.some((o) => o.op === "renameProperty" && o.to === "showDim"));
  assert.ok(ops.some((o) => o.op === "renameVariantValue" && o.property === "Show Dim" && o.to === "yes"));
});

test("formatReport groups Component / Property / Variant value", () => {
  const { changes, needsInput } = analyze([
    {
      id: "1",
      name: "sheet_contents",
      type: "COMPONENT_SET",
      properties: [{ name: "Type", type: "VARIANT", values: ["text", "Selected", "img"] }],
    },
  ]);
  const report = formatReport({ changes, needsInput });
  assert.match(report, /Component\nsheet_contents → SheetContents/);
  assert.match(report, /Property\nType → type/);
  assert.match(report, /Variant value\nSelected → selected/);
});

test("clean names produce no changes", () => {
  const { changes, ok } = analyze([
    {
      id: "1",
      name: "BottomSheet",
      type: "COMPONENT_SET",
      properties: [{ name: "showDim", type: "VARIANT", values: ["yes", "no"] }],
    },
  ]);
  assert.equal(changes.length, 0);
  assert.ok(ok.length >= 3);
});
