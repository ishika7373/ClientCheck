import type { Account, AccountMeta, ChurnedAccount, DataOrigin, Ticket } from "../lib/types";

/* One tool abstraction, used by every call site.
 *
 * A tool owns its own name, description, input schema and execution. React
 * components never query a data source directly: they invoke a tool and render
 * whatever the invocation record contains. Adding a tool means adding an entry
 * to the registry, with no change to the calling interface. */

export type FieldKind = "string" | "enum" | "date" | "number" | "boolean";

export interface ToolField {
  name: string;
  kind: FieldKind;
  label: string;
  required: boolean;
  description: string;
  options?: string[];
  placeholder?: string;
}

export interface ToolInputSchema {
  fields: ToolField[];
}

export type ToolInput = Record<string, string | number | boolean | undefined>;

/* Phases of a single invocation, rendered in order in the execution panel. */
export type LogPhase = "input" | "executing" | "source" | "result" | "error";

export interface ToolLogEntry {
  phase: LogPhase;
  title: string;
  detail: string;
  elapsedMs: number;
}

/* A row of the structured response, shown as a label and value pair. */
export interface ResultField {
  label: string;
  value: string;
  /* Optional semantic status so the panel can render icon plus text plus colour
     instead of a bare number. */
  status?: "success" | "warning" | "error" | "info" | "progress" | "review";
}

export interface ToolResult {
  recordCount: number;
  /* Flat summary for a single record response. */
  fields?: ResultField[];
  /* Tabular payload for multi record responses. */
  columns?: string[];
  rows?: string[][];
  /* Raw records so a view can merge the response into its own state. */
  records: unknown[];
  origin: DataOrigin;
  originNote?: string;
}

export type ToolState =
  | "idle"
  | "calling"
  | "success"
  | "empty"
  | "error"
  | "invalid-input"
  | "database-unavailable";

export interface ToolError {
  code: string;
  message: string;
  /* Written for an operator, not a developer. */
  remedy: string;
  /* True when the failure means the tool must not answer from fallback data:
     the operator needs to see the failure rather than a plausible number. */
  fatal?: boolean;
}

export interface ToolContext {
  accounts: Account[];
  tickets: Ticket[];
  churned: ChurnedAccount[];
  meta: AccountMeta[];
  /* Where the in memory snapshot came from. A tool reports this honestly rather
     than claiming a Supabase round trip that did not happen. */
  origin: DataOrigin;
  originNote?: string;
  /* True when a live Supabase read is possible. */
  supabaseReady: boolean;
  /* Performs the read against Supabase and returns null when unavailable. */
  queryLive: (table: string, filters: Record<string, string>) => Promise<{ rows: unknown[] } | { error: ToolError }>;
}

export interface ToolExecuteOutcome {
  state: Extract<ToolState, "success" | "empty" | "error" | "database-unavailable">;
  result?: ToolResult;
  error?: ToolError;
}

export interface ToolDefinition<I extends ToolInput = ToolInput> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  /* Returns a list of human readable problems. Empty means valid. */
  validate: (input: I, ctx: ToolContext) => string[];
  execute: (
    input: I,
    ctx: ToolContext,
    log: (entry: Omit<ToolLogEntry, "elapsedMs">) => void,
  ) => Promise<ToolExecuteOutcome>;
}

/* A single invocation. This is what the UI stores and renders. */
export interface ToolInvocation {
  id: string;
  toolName: string;
  input: ToolInput;
  state: ToolState;
  log: ToolLogEntry[];
  result?: ToolResult;
  error?: ToolError;
  validationProblems?: string[];
  startedAt: string;
  durationMs?: number;
  accountId?: string;
}
