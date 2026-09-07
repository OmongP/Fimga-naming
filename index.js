#!/usr/bin/env node
// Figma Naming MCP — a deterministic naming-rule engine exposed over MCP.
//
// It does not touch Figma directly. The MCP client (Claude) reads the
// current selection through the official Figma MCP, feeds the nodes here to
// check / preview, and — after approval — applies the returned operations
// back through the Figma MCP, then captures Before / After screenshots.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { DEFAULT_CONVENTION } from "./src/conventions.js";
import { analyze, formatReport, toOperations } from "./src/naming.js";

const nodeSchema = z.object({
  id: z.string().describe("Figma node id"),
  name: z.string().describe("Current node name"),
  type: z
    .string()
    .describe("Figma node type: COMPONENT, COMPONENT_SET, FRAME, SECTION, INSTANCE, ..."),
  properties: z
    .array(
      z.object({
        name: z.string().describe("Property key, may include Figma's #id suffix"),
        type: z
          .enum(["VARIANT", "BOOLEAN", "TEXT", "INSTANCE_SWAP"])
          .optional()
          .describe("Property type. BOOLEAN values (True/False) are never renamed"),
        values: z
          .array(z.string())
          .optional()
          .describe("VARIANT string values, normalized to start lowercase"),
      })
    )
    .optional()
    .describe("Component property definitions, for property-name and variant-value checks"),
});

const conventionSchema = z
  .object({
    component: z.enum(["PascalCase", "camelCase"]).optional(),
    frame: z.enum(["PascalCase", "camelCase"]).optional(),
    property: z.enum(["PascalCase", "camelCase"]).optional(),
    variantValue: z.enum(["lowerFirst"]).optional(),
  })
  .optional()
  .describe(
    "Overrides for the default convention (component/frame: PascalCase, property: camelCase, variant values: lowerFirst)"
  );

const server = new McpServer({ name: "figma-naming-mcp", version: "1.0.0" });

const asText = (obj, text) => ({
  content: [{ type: "text", text: text ?? JSON.stringify(obj, null, 2) }],
  structuredContent: obj,
});

// 1) checkNaming — inspect the selection and report violations.
server.registerTool(
  "checkNaming",
  {
    title: "Check naming",
    description:
      "Check the naming of selected Figma frames, components and their properties against the convention. " +
      "Returns a human-readable report plus structured violations. " +
      "Default-named nodes (e.g. 'Frame 123') are flagged as needing a meaningful name.",
    inputSchema: {
      nodes: z.array(nodeSchema).describe("Selected nodes read via the Figma MCP"),
      convention: conventionSchema,
    },
  },
  async ({ nodes, convention }) => {
    const result = analyze(nodes, convention, {});
    return asText(
      {
        report: formatReport(result),
        changes: result.changes,
        needsInput: result.needsInput,
        okCount: result.ok.length,
      },
      formatReport(result)
    );
  }
);

// 2) previewRename — the "changes ready" screen (before → after).
server.registerTool(
  "previewRename",
  {
    title: "Preview rename",
    description:
      "Produce the rename plan (before → after) for the selection. " +
      "For default-named nodes, pass a meaningful name in `names` keyed by node id " +
      "(e.g. { \"12:34\": \"VehicleSummary\" }); it is normalized to the required case. " +
      "This does NOT modify Figma — pass the returned `operations` to applyRename after approval.",
    inputSchema: {
      nodes: z.array(nodeSchema),
      convention: conventionSchema,
      names: z
        .record(z.string(), z.string())
        .optional()
        .describe("Meaningful names for default-named nodes, keyed by node id"),
    },
  },
  async ({ nodes, convention, names }) => {
    const result = analyze(nodes, convention, { names: names ?? {} });
    return asText(
      {
        report: formatReport(result),
        operations: toOperations(result.changes),
        changes: result.changes,
        needsInput: result.needsInput,
      },
      formatReport(result)
    );
  }
);

// 3) applyRename — validate the approved plan into a Figma-ready manifest.
server.registerTool(
  "applyRename",
  {
    title: "Apply rename",
    description:
      "Finalize an approved rename plan into an ordered operation manifest for the Figma MCP to execute " +
      "(renameNode / renameProperty / renameVariantValue). Call this only after the user approves the " +
      "previewRename result. The client executes the operations in Figma and captures Before/After.",
    inputSchema: {
      changes: z
        .array(
          z.object({
            id: z.string(),
            category: z.enum(["component", "frame", "property", "variantValue"]),
            kind: z.enum(["node", "property", "variantValue"]),
            propertyKey: z.string().optional(),
            before: z.string(),
            after: z.string(),
            reason: z.string().optional(),
          })
        )
        .describe("The approved `changes` array from previewRename"),
    },
  },
  async ({ changes }) => {
    const operations = toOperations(changes);
    const summary =
      `Approved ${operations.length} operation${operations.length === 1 ? "" : "s"}.\n` +
      `Execute these via the Figma MCP, then capture Before/After screenshots:\n` +
      operations
        .map((o) =>
          o.op === "renameProperty"
            ? `• ${o.nodeId}: property "${o.from}" → "${o.to}"`
            : o.op === "renameVariantValue"
            ? `• ${o.nodeId}: ${o.property} value "${o.from}" → "${o.to}"`
            : `• ${o.nodeId}: name → "${o.to}"`
        )
        .join("\n");
    return asText({ operations, count: operations.length }, summary);
  }
);

// 4) getConvention — expose the active default convention.
server.registerTool(
  "getConvention",
  {
    title: "Get convention",
    description: "Return the default naming convention used by this server.",
    inputSchema: {},
  },
  async () => asText(DEFAULT_CONVENTION)
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("figma-naming-mcp running on stdio");
