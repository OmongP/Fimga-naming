import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/naming.js";
import { correctSpelling, correctWord } from "../src/spelling.js";
import { componentWord, suggestName } from "../src/suggest.js";
import { describeNode } from "../figma-plugin/src/figma-ops.js";

test("correctSpelling fixes a missing, wrong or swapped letter", () => {
  assert.equal(correctSpelling("GraphStatContainr"), "GraphStatContainer");
  assert.equal(correctSpelling("Buton"), "Button");
  assert.equal(correctSpelling("Contianer"), "Container");
  assert.equal(correctSpelling("showIcno"), "showIcon");
});

test("correctSpelling leaves valid, plural, short, coded and Korean words alone", () => {
  for (const name of ["GraphStatContainer", "Buttons", "Categories", "IcSort", "URLValue", "MDMC15AW2", "주행거리입력", "Ab"]) {
    assert.equal(correctSpelling(name), name);
  }
});

test("correctWord refuses ambiguous matches", () => {
  assert.equal(correctWord("cart"), null); // known
  assert.equal(correctWord("tabe"), null); // table / tab / tape… → no single best
});

test("analyze reports a typo in an otherwise valid name", () => {
  const { changes } = analyze([{ id: "1", name: "GraphStatContainr", type: "FRAME" }]);
  assert.deepEqual(changes.map((c) => [c.after, c.reason]), [["GraphStatContainer", "typo"]]);
});

test("analyze fixes typos together with case conversion", () => {
  const { changes } = analyze([{ id: "1", name: "graph_containr", type: "FRAME" }]);
  assert.equal(changes[0].after, "GraphContainer");
});

test("symbols like + are removed when converting case", () => {
  const { changes } = analyze([
    { id: "1", name: "+top", type: "FRAME", properties: [{ name: "+ icon left", type: "BOOLEAN" }] },
  ]);
  assert.deepEqual(changes.map((c) => c.after), ["Top", "iconLeft"]);
});

test("suggestName uses screen position first", () => {
  assert.equal(suggestName({ role: "top" }), "Header");
  assert.equal(suggestName({ role: "middle" }), "MainContent");
  assert.equal(suggestName({ role: "bottom" }), "SheetBottom");
});

test("suggestName names a frame after its content, not its layout", () => {
  assert.equal(suggestName({ contents: ["BoxButton"] }), "BoxButton");
  assert.equal(suggestName({ contents: ["BoxButton", "BoxButton"] }), "BoxButtonGroup");
  assert.equal(suggestName({ contents: ["Image"] }), "Image");
  assert.equal(suggestName({ contents: ["Text", "Text"] }), "TextGroup");
  assert.equal(suggestName({ contents: ["Image", "Title", "Text"] }), "ImageTitleText");
  assert.equal(suggestName({ contents: ["Icon", "Text", "Icon"] }), "IconText");
  assert.equal(suggestName({ contents: ["Image", "Text", "Icon", "BoxButton"] }), "Content");
  assert.equal(suggestName({ contents: [] }), null);
});

test("componentWord maps icon instances to Icon and skips Korean names", () => {
  assert.equal(componentWord("Box Button"), "BoxButton");
  assert.equal(componentWord("Line/ic_sort/default"), "Icon");
  assert.equal(componentWord("IconArrow"), "Icon");
  assert.equal(componentWord("아이콘"), null);
});

test("describeNode reads position in the screen and the content of its children", () => {
  const page = { type: "PAGE" };
  const screen = { type: "FRAME", parent: page, height: 800 };
  const top = { type: "FRAME", parent: screen, y: 0, height: 56, children: [] };
  const card = {
    type: "FRAME", parent: { type: "FRAME", parent: screen }, y: 0, height: 120,
    children: [
      { type: "RECTANGLE", fills: [{ type: "IMAGE" }] },
      { type: "FRAME", children: [{ type: "TEXT", fontSize: 22 }, { type: "TEXT", fontSize: 13 }] },
      { type: "INSTANCE", name: "TextField" },
      { type: "VECTOR" },
      { type: "RECTANGLE", fills: [{ type: "SOLID" }] }, // background shape → ignored
      { type: "TEXT", fontSize: 13, visible: false }, // hidden → ignored
    ],
  };
  assert.equal(describeNode(top).role, "top");
  assert.deepEqual(describeNode(card), { role: undefined, contents: ["Image", "Title", "Text", "TextField", "Icon"] });
});
