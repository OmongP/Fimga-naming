import { test } from "node:test";
import assert from "node:assert/strict";
import { readingOrder, renumber } from "../src/numbering.js";

const box = (id, name, x, y) => ({ id, name, x, y, width: 100, height: 40 });

test("readingOrder goes left to right, then the next row down", () => {
  const nodes = [
    box("c", "C", 0, 100),
    box("b", "B", 200, 0),
    box("a", "A", 0, 0),
    box("d", "D", 200, 100),
  ];
  assert.deepEqual(readingOrder(nodes).map((n) => n.id), ["a", "b", "c", "d"]);
});

test("readingOrder treats layers within 30px of y as one row", () => {
  const nodes = [box("right", "R", 200, 30), box("left", "L", 0, 0)];
  assert.deepEqual(readingOrder(nodes).map((n) => n.id), ["left", "right"]);
});

test("readingOrder starts a new row past the 30px tolerance", () => {
  const nodes = [box("below", "B", 0, 31), box("top", "T", 200, 0)];
  assert.deepEqual(readingOrder(nodes).map((n) => n.id), ["top", "below"]);
});

test("renumber starts at 1 and keeps the prefix and separator", () => {
  const nodes = [box("1", "Item 0", 0, 0), box("2", "Item 1", 120, 0), box("3", "Item_2", 240, 0)];
  assert.deepEqual(renumber(nodes), [
    { id: "1", before: "Item 0", after: "Item 1" },
    { id: "2", before: "Item 1", after: "Item 2" },
    { id: "3", before: "Item_2", after: "Item_3" },
  ]);
});

test("renumber skips layers without a trailing number but still counts the rest", () => {
  const nodes = [box("a", "Header", 0, 0), box("b", "Card 0", 120, 0), box("c", "Card 0", 240, 0)];
  assert.deepEqual(renumber(nodes), [
    { id: "b", before: "Card 0", after: "Card 1" },
    { id: "c", before: "Card 0", after: "Card 2" },
  ]);
});

test("renumber returns nothing when the numbers already match", () => {
  const nodes = [box("a", "Step 1", 0, 0), box("b", "Step 2", 120, 0)];
  assert.deepEqual(renumber(nodes), []);
});
