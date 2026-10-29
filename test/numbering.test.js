import { test } from "node:test";
import assert from "node:assert/strict";
import { readingOrder, renumber } from "../src/numbering.js";

const box = (id, name, x, y) => ({ id, name, x, y });

// 2×2 grid: a b / c d
const grid = [box("d", "D", 200, 100), box("b", "B", 200, 0), box("c", "C", 0, 100), box("a", "A", 0, 0)];

test("row order goes left to right, then the next row down", () => {
  assert.deepEqual(readingOrder(grid, "row").map((n) => n.id), ["a", "b", "c", "d"]);
});

test("column order goes top to bottom, then the next column right", () => {
  assert.deepEqual(readingOrder(grid, "column").map((n) => n.id), ["a", "c", "b", "d"]);
});

test("layers within 30px share a line, beyond that start a new one", () => {
  assert.deepEqual(readingOrder([box("r", "R", 200, 30), box("l", "L", 0, 0)]).map((n) => n.id), ["l", "r"]);
  assert.deepEqual(readingOrder([box("below", "B", 0, 31), box("top", "T", 200, 0)]).map((n) => n.id), ["top", "below"]);
});

test("renumber discards old names and starts at 1 with the prefix", () => {
  const nodes = [box("2", "기록 후 수정_주행거리입력", 240, 0), box("1", "기록없음 신규", 0, 0), box("3", "입력완료", 480, 0)];
  assert.deepEqual(renumber(nodes, { prefix: "Screen_" }), [
    { id: "1", before: "기록없음 신규", after: "Screen_1" },
    { id: "2", before: "기록 후 수정_주행거리입력", after: "Screen_2" },
    { id: "3", before: "입력완료", after: "Screen_3" },
  ]);
});

test("renumber with no prefix gives bare numbers", () => {
  assert.deepEqual(renumber(grid, { order: "column" }).map((c) => c.after), ["1", "2", "3", "4"]);
});
