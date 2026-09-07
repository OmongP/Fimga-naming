// End-to-end demo: drive the MCP server over stdio through the full
// checkNaming -> previewRename -> applyRename flow, printing a clean transcript.
//
//   node examples/demo.mjs
//
// Uses a real SheetTop-style component set as the sample selection.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn("node", [join(root, "index.js")], { stdio: ["pipe", "pipe", "inherit"] });

let buffer = "";
const pending = new Map();
server.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  }
});

let id = 0;
const send = (method, params) =>
  new Promise((resolve) => {
    const rid = ++id;
    pending.set(rid, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: rid, method, params }) + "\n");
  });
const notify = (method, params) =>
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");

const call = (name, args) => send("tools/call", { name, arguments: args });
const textOf = (r) => r.content[0].text;

const sample = [
  {
    id: "13120:50612",
    name: "sheet_top",
    type: "COMPONENT_SET",
    properties: [
      { name: "Sub Text#21696:0", type: "TEXT" },
      { name: "Scroll#26591:0", type: "BOOLEAN" },
      { name: "Show icon#105792:0", type: "BOOLEAN" },
      { name: "Type", type: "VARIANT", values: ["basic", "sentence", "Ads"] },
    ],
  },
];

const rule = (s) => console.log("\n" + "─".repeat(56) + "\n" + s + "\n" + "─".repeat(56));

await send("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "demo", version: "1.0.0" },
});
notify("notifications/initialized");

rule("1) checkNaming  — 선택한 컴포넌트의 규칙 위반 검사");
const check = await call("checkNaming", { nodes: sample });
console.log(textOf(check));

rule("2) previewRename — before → after 변경 계획 (Figma 미변경)");
const preview = await call("previewRename", { nodes: sample });
console.log(textOf(preview));

rule("3) applyRename  — 승인 후 Figma 실행용 매니페스트 확정");
const apply = await call("applyRename", { changes: preview.structuredContent.changes });
console.log(textOf(apply));

server.stdin.end();
server.kill();
