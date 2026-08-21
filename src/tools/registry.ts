import type { Account, Ticket } from "../lib/types";
import {
  fmtCurrencyFull,
  fmtDate,
  fmtPct,
  daysUntil,
  parseDate,
  renewalReadiness,
  riskChips,
} from "../lib/format";
import { TABLES } from "../lib/supabase";
import type { ResultField, ToolDefinition, ToolInput, ToolResult } from "./types";

/* Resolves the account an operator named, by id or by name, so a tool can be
   invoked from a table row or from a typed parameter. */
function resolveAccount(ctx: { accounts: Account[] }, input: ToolInput): Account | undefined {
  const id = String(input.accountId ?? "").trim();
  const name = String(input.accountName ?? "").trim();
  if (id) {
    const byId = ctx.accounts.find((a) => a.id.toLowerCase() === id.toLowerCase());
    if (byId) return byId;
  }
  if (name) {
    const lower = name.toLowerCase();
    return (
      ctx.accounts.find((a) => a.name.toLowerCase() === lower) ??
      ctx.accounts.find((a) => a.name.toLowerCase().includes(lower))
    );
  }
  return undefined;
}

function statusOf(status: Account["status"]): ResultField["status"] {
  if (status === "Healthy") return "success";
  if (status === "Watch") return "warning";
  return "error";
}

function sourceLog(ctx: { origin: string; originNote?: string; supabaseReady: boolean }, table: string) {
  if (ctx.origin === "supabase") {
    return { title: "SUPABASE", detail: `Query executed against public.${table}` };
  }
  return {
    title: "LOCAL DATASET",
    detail: ctx.supabaseReady
      ? `Supabase returned no usable rows for public.${table}. Fallback dataset queried.`
      : `Supabase not configured. Fallback dataset queried instead of public.${table}.`,
  };
}

const ACCOUNT_ID_FIELD = {
  name: "accountId",
  kind: "string" as const,
  label: "accountId",
  required: false,
  description: "Account identifier, for example ACC-1042.",
  placeholder: "ACC-1042",
};

/* ------------------------------------------------------------------ */
/* get_customer_health                                                */
/* ------------------------------------------------------------------ */

export const getCustomerHealth: ToolDefinition = {
  name: "get_customer_health",
  description:
    "Returns the health record for one account: score, status, ARR, fleet and flight activity, uptime, CSAT, open ticket count, renewal date, last QBR and the active risk factors.",
  inputSchema: {
    fields: [
      ACCOUNT_ID_FIELD,
      { name: "accountName", kind: "string", label: "accountName", required: false, description: "Account name, used when no id is supplied.", placeholder: "Meridian Mining Co." },
      { name: "minHealthScore", kind: "number", label: "minHealthScore", required: false, description: "Optional filter. Returns nothing when the account scores below this value." },
      { name: "includeRiskFactors", kind: "boolean", label: "includeRiskFactors", required: false, description: "Include the derived risk factor list in the response." },
    ],
  },
  validate: (input) => {
    const problems: string[] = [];
    const id = String(input.accountId ?? "").trim();
    const name = String(input.accountName ?? "").trim();
    if (!id && !name) problems.push("Supply either accountId or accountName.");
    if (id && !/^ACC-\d{3,6}$/i.test(id)) problems.push(`accountId "${id}" does not match the expected format ACC-0000.`);
    const min = input.minHealthScore;
    if (min !== undefined && min !== "" && (Number(min) < 0 || Number(min) > 100)) {
      problems.push("minHealthScore must be between 0 and 100.");
    }
    return problems;
  },
  execute: async (input, ctx, log) => {

    if (!ctx.accounts.length) {
      return {
        state: "database-unavailable",
        error: {
          code: "NO_DATA_SOURCE",
          message: "No account records are reachable from Supabase or the fallback dataset.",
          remedy: "Check the Supabase status in Settings, then reload the snapshot.",
        },
      };
    }

    log({ phase: "executing", title: "EXECUTING", detail: "Querying customer health..." });
    const live = await ctx.queryLive(TABLES.accounts, { id: String(input.accountId ?? "") });
    if ("error" in live && live.error.fatal) {
      return { state: "error", error: live.error };
    }

    const account = resolveAccount(ctx, input);
    log({ phase: "source", ...sourceLog(ctx, TABLES.accounts) });

    if (!account) {
      log({ phase: "result", title: "RESULT", detail: "0 records returned" });
      return {
        state: "empty",
        result: { recordCount: 0, records: [], origin: ctx.origin, originNote: ctx.originNote },
      };
    }

    const min = input.minHealthScore;
    if (min !== undefined && String(min) !== "" && account.healthScore < Number(min)) {
      log({ phase: "result", title: "RESULT", detail: `0 records returned. Filtered out by minHealthScore ${Number(min)}.` });
      return {
        state: "empty",
        result: { recordCount: 0, records: [], origin: ctx.origin, originNote: ctx.originNote },
      };
    }

    const includeRisk = input.includeRiskFactors !== false;
    const fields: ResultField[] = [
      { label: "Account", value: account.name },
      { label: "Account ID", value: account.id },
      { label: "Health score", value: String(account.healthScore) },
      { label: "Status", value: account.status, status: statusOf(account.status) },
      { label: "ARR", value: fmtCurrencyFull(account.arr) },
      { label: "Fleet size", value: String(account.fleetSize) },
      { label: "Flight hours 30d", value: String(account.flightHoursLast30d) },
      { label: "Uptime", value: fmtPct(account.uptimePct) },
      { label: "CSAT", value: `${account.csat}%`, status: account.csat >= 80 ? "success" : account.csat >= 70 ? "warning" : "error" },
      { label: "Open tickets", value: String(account.openTickets), status: account.openTickets === 0 ? "success" : account.openTickets >= 3 ? "error" : "warning" },
      { label: "Renewal date", value: fmtDate(account.renewalDate) },
      { label: "Last QBR", value: fmtDate(account.lastQbrDate) },
    ];
    if (includeRisk) {
      const chips = riskChips(account, 3);
      fields.push({ label: "Risk factors", value: chips.length ? chips.join(", ") : "None active" });
    }

    log({ phase: "result", title: "RESULT", detail: "1 record returned" });
    const result: ToolResult = { recordCount: 1, fields, records: [account], origin: ctx.origin, originNote: ctx.originNote };
    return { state: "success", result };
  },
};

/* ------------------------------------------------------------------ */
/* get_open_tickets                                                   */
/* ------------------------------------------------------------------ */

const PRIORITIES = ["Any", "Low", "Medium", "High", "Urgent"];
const SLA_STATES = ["Any", "On Track", "At Risk", "Breached"];

export const getOpenTickets: ToolDefinition = {
  name: "get_open_tickets",
  description:
    "Returns open support tickets with account, subject, priority, age in days and SLA state. Filters by account, priority and SLA state.",
  inputSchema: {
    fields: [
      ACCOUNT_ID_FIELD,
      { name: "priority", kind: "enum", label: "priority", required: false, description: "Restrict to one priority band.", options: PRIORITIES },
      { name: "slaState", kind: "enum", label: "slaState", required: false, description: "Restrict to one SLA state.", options: SLA_STATES },
      { name: "minAgeDays", kind: "number", label: "minAgeDays", required: false, description: "Optional filter. Only tickets at least this many days old." },
    ],
  },
  validate: (input, ctx) => {
    const problems: string[] = [];
    const id = String(input.accountId ?? "").trim();
    if (id) {
      if (!/^ACC-\d{3,6}$/i.test(id)) {
        problems.push(`accountId "${id}" does not match the expected format ACC-0000.`);
      } else if (!ctx.accounts.some((a) => a.id.toLowerCase() === id.toLowerCase())) {
        problems.push(`accountId "${id}" is not present in the current account snapshot.`);
      }
    }
    const p = String(input.priority ?? "");
    if (p && !PRIORITIES.includes(p)) problems.push(`priority "${p}" is not one of ${PRIORITIES.join(", ")}.`);
    const s = String(input.slaState ?? "");
    if (s && !SLA_STATES.includes(s)) problems.push(`slaState "${s}" is not one of ${SLA_STATES.join(", ")}.`);
    const age = input.minAgeDays;
    if (age !== undefined && String(age) !== "" && Number(age) < 0) problems.push("minAgeDays cannot be negative.");
    return problems;
  },
  execute: async (input, ctx, log) => {
    log({ phase: "executing", title: "EXECUTING", detail: "Querying open tickets..." });

    const live = await ctx.queryLive(TABLES.tickets, { account_id: String(input.accountId ?? "") });
    if ("error" in live && live.error.fatal) {
      return { state: "error", error: live.error };
    }
    log({ phase: "source", ...sourceLog(ctx, TABLES.tickets) });

    const id = String(input.accountId ?? "").trim().toLowerCase();
    const priority = String(input.priority ?? "");
    const sla = String(input.slaState ?? "");
    const minAge = input.minAgeDays === undefined || String(input.minAgeDays) === "" ? 0 : Number(input.minAgeDays);

    const nameFor = (accountId: string) => ctx.accounts.find((a) => a.id === accountId)?.name ?? accountId;
    const matched: Ticket[] = ctx.tickets
      .filter((t) => (id ? t.accountId.toLowerCase() === id : true))
      .filter((t) => (priority && priority !== "Any" ? t.priority === priority : true))
      .filter((t) => (sla && sla !== "Any" ? t.slaState === sla : true))
      .filter((t) => t.ageDays >= minAge)
      .sort((a, b) => b.ageDays - a.ageDays);

    log({ phase: "result", title: "RESULT", detail: `${matched.length} ${matched.length === 1 ? "record" : "records"} returned` });

    if (matched.length === 0) {
      return { state: "empty", result: { recordCount: 0, records: [], origin: ctx.origin, originNote: ctx.originNote } };
    }

    return {
      state: "success",
      result: {
        recordCount: matched.length,
        columns: ["Ticket ID", "Account", "Subject", "Priority", "Age", "SLA state"],
        rows: matched.map((t) => [t.id, nameFor(t.accountId), t.subject, t.priority, `${t.ageDays}d`, t.slaState]),
        records: matched,
        origin: ctx.origin,
        originNote: ctx.originNote,
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* get_renewal_details                                                */
/* ------------------------------------------------------------------ */

export const getRenewalDetails: ToolDefinition = {
  name: "get_renewal_details",
  description:
    "Returns renewal records with renewal date, ARR at stake, health score, derived renewal readiness and the risk factors weighing on the renewal.",
  inputSchema: {
    fields: [
      ACCOUNT_ID_FIELD,
      { name: "renewalFrom", kind: "date", label: "renewalFrom", required: false, description: "Start of the renewal date range." },
      { name: "renewalTo", kind: "date", label: "renewalTo", required: false, description: "End of the renewal date range." },
      { name: "readiness", kind: "enum", label: "readiness", required: false, description: "Restrict to one readiness band.", options: ["Any", "On Track", "Needs Attention", "At Risk"] },
    ],
  },
  validate: (input, ctx) => {
    const problems: string[] = [];
    const id = String(input.accountId ?? "").trim();
    if (id) {
      if (!/^ACC-\d{3,6}$/i.test(id)) {
        problems.push(`accountId "${id}" does not match the expected format ACC-0000.`);
      } else if (!ctx.accounts.some((a) => a.id.toLowerCase() === id.toLowerCase())) {
        problems.push(`accountId "${id}" is not present in the current account snapshot.`);
      }
    }
    const from = String(input.renewalFrom ?? "");
    const to = String(input.renewalTo ?? "");
    if (from && Number.isNaN(parseDate(from).getTime())) problems.push("renewalFrom is not a valid date.");
    if (to && Number.isNaN(parseDate(to).getTime())) problems.push("renewalTo is not a valid date.");
    if (from && to && parseDate(from) > parseDate(to)) problems.push("renewalFrom is later than renewalTo.");
    return problems;
  },
  execute: async (input, ctx, log) => {
    log({ phase: "executing", title: "EXECUTING", detail: "Querying renewal details..." });

    const live = await ctx.queryLive(TABLES.accounts, { id: String(input.accountId ?? "") });
    if ("error" in live && live.error.fatal) {
      return { state: "error", error: live.error };
    }
    log({ phase: "source", ...sourceLog(ctx, TABLES.accounts) });

    const id = String(input.accountId ?? "").trim().toLowerCase();
    const from = String(input.renewalFrom ?? "");
    const to = String(input.renewalTo ?? "");
    const readiness = String(input.readiness ?? "");

    const matched = ctx.accounts
      .filter((a) => (id ? a.id.toLowerCase() === id : true))
      .filter((a) => (from ? parseDate(a.renewalDate) >= parseDate(from) : true))
      .filter((a) => (to ? parseDate(a.renewalDate) <= parseDate(to) : true))
      .filter((a) => (readiness && readiness !== "Any" ? renewalReadiness(a) === readiness : true))
      .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

    log({ phase: "result", title: "RESULT", detail: `${matched.length} ${matched.length === 1 ? "record" : "records"} returned` });

    if (matched.length === 0) {
      return { state: "empty", result: { recordCount: 0, records: [], origin: ctx.origin, originNote: ctx.originNote } };
    }

    if (matched.length === 1) {
      const a = matched[0];
      const ready = renewalReadiness(a);
      const chips = riskChips(a, 3);
      const fields: ResultField[] = [
        { label: "Account", value: a.name },
        { label: "Account ID", value: a.id },
        { label: "Renewal date", value: fmtDate(a.renewalDate) },
        { label: "Days to renewal", value: `${daysUntil(a.renewalDate)}d` },
        { label: "ARR at stake", value: fmtCurrencyFull(a.arr) },
        { label: "Health score", value: String(a.healthScore) },
        { label: "Renewal readiness", value: ready, status: ready === "On Track" ? "success" : ready === "Needs Attention" ? "warning" : "error" },
        { label: "Risk factors", value: chips.length ? chips.join(", ") : "None active" },
      ];
      return {
        state: "success",
        result: { recordCount: 1, fields, records: matched, origin: ctx.origin, originNote: ctx.originNote },
      };
    }

    return {
      state: "success",
      result: {
        recordCount: matched.length,
        columns: ["Account", "Renewal", "ARR at stake", "Health", "Readiness"],
        rows: matched.map((a) => [a.name, fmtDate(a.renewalDate), fmtCurrencyFull(a.arr), String(a.healthScore), renewalReadiness(a)]),
        records: matched,
        origin: ctx.origin,
        originNote: ctx.originNote,
      },
    };
  },
};

/* Single formatter for a parameter set, shared with the execution panel so the
   log and the header never disagree. */
export function describeInput(input: ToolInput): string {
  const entries = Object.entries(input).filter(([, v]) => v !== undefined && v !== "" && v !== "Any");
  if (!entries.length) return "no parameters";
  return entries.map(([k, v]) => `${k}: ${v}`).join("  ");
}

export const TOOL_REGISTRY: ToolDefinition[] = [getCustomerHealth, getOpenTickets, getRenewalDetails];

export function findTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.name === name);
}
