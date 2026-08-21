import type {
  Account,
  AccountMeta,
  ChurnRatePoint,
  ChurnedAccount,
  DataOrigin,
  Sourced,
  Ticket,
} from "./types";
import { MOCK_ACCOUNTS } from "../data/accounts";
import { MOCK_TICKETS } from "../data/tickets";
import { MOCK_CHURNED_ACCOUNTS, MOCK_CHURN_RATE } from "../data/churn";
import { MOCK_ACCOUNT_META } from "../data/accountMeta";
import { TABLES, getSupabase, isConfigured } from "./supabase";
import { statusFromScore } from "./format";

/* The single place that decides where data comes from.
 *
 * Rule: a dataset is reported as origin "supabase" only when Supabase actually
 * returned rows for it. An empty table, a missing table or an error all fall
 * back to the local dataset and are reported as origin "mock", with the reason
 * carried through so the UI can say it out loud. */

type Row = Record<string, unknown>;

const str = (r: Row, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.length) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
};
const num = (r: Row, ...keys: string[]): number => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
};
const bool = (r: Row, ...keys: string[]): boolean => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return false;
};
const list = (r: Row, ...keys: string[]): string[] => {
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string" && v.trim()) {
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};
const date = (r: Row, ...keys: string[]): string => str(r, ...keys).slice(0, 10);

function mapAccount(r: Row): Account {
  const healthScore = num(r, "health_score", "healthScore");
  const rawStatus = str(r, "status");
  const status = (["Healthy", "Watch", "At Risk"] as const).find((s) => s === rawStatus) ?? statusFromScore(healthScore);
  return {
    id: str(r, "id", "account_id", "accountId"),
    name: str(r, "name", "account_name"),
    industry: str(r, "industry") as Account["industry"],
    healthScore,
    status,
    riskFactors: list(r, "risk_factors", "riskFactors"),
    fleetSize: num(r, "fleet_size", "fleetSize"),
    flightHoursLast30d: num(r, "flight_hours_last_30d", "flightHoursLast30d"),
    uptimePct: num(r, "uptime_pct", "uptimePct"),
    openTickets: num(r, "open_tickets", "openTickets"),
    csat: num(r, "csat"),
    arr: num(r, "arr"),
    renewalDate: date(r, "renewal_date", "renewalDate"),
    lastQbrDate: date(r, "last_qbr_date", "lastQbrDate"),
    csmInitials: str(r, "csm_initials", "csmInitials"),
  };
}

function mapTicket(r: Row): Ticket {
  return {
    id: str(r, "id", "ticket_id"),
    accountId: str(r, "account_id", "accountId"),
    subject: str(r, "subject"),
    priority: str(r, "priority") as Ticket["priority"],
    ageDays: num(r, "age_days", "ageDays"),
    slaState: str(r, "sla_state", "slaState") as Ticket["slaState"],
  };
}

function mapChurned(r: Row): ChurnedAccount {
  return {
    id: str(r, "id"),
    name: str(r, "name"),
    industry: str(r, "industry") as ChurnedAccount["industry"],
    churnDate: date(r, "churn_date", "churnDate"),
    arrLost: num(r, "arr_lost", "arrLost"),
    reason: str(r, "reason", "churn_reason"),
  };
}

function mapChurnRate(r: Row): ChurnRatePoint {
  return {
    month: str(r, "month"),
    churnRatePct: num(r, "churn_rate_pct", "churnRatePct"),
    accountsLost: num(r, "accounts_lost", "accountsLost"),
    arrLost: num(r, "arr_lost", "arrLost"),
  };
}

function mapMeta(r: Row): AccountMeta {
  return {
    accountId: str(r, "account_id", "accountId"),
    aeInitials: str(r, "ae_initials", "aeInitials"),
    aiInboxEnabled: bool(r, "ai_inbox_enabled", "aiInboxEnabled"),
    billingStatus: (str(r, "billing_status", "billingStatus") || "Current") as AccountMeta["billingStatus"],
    plan: (str(r, "plan") || "Fleet Standard") as AccountMeta["plan"],
    periodEnd: date(r, "period_end", "periodEnd"),
    walletBalanceUsd: num(r, "wallet_balance_usd", "walletBalanceUsd"),
    usageTier: (str(r, "usage_tier", "usageTier") || "On Plan") as AccountMeta["usageTier"],
    contractStart: date(r, "contract_start", "contractStart"),
    website: str(r, "website"),
    slackChannel: str(r, "slack_channel", "slackChannel"),
    automationSuccessKit: bool(r, "automation_success_kit", "automationSuccessKit"),
    multiYear: bool(r, "multi_year", "multiYear"),
    lastMbrDate: date(r, "last_mbr_date", "lastMbrDate"),
    nextMbrDate: date(r, "next_mbr_date", "nextMbrDate"),
    nextQbrDate: date(r, "next_qbr_date", "nextQbrDate"),
    excludeFromMetrics: bool(r, "exclude_from_metrics", "excludeFromMetrics"),
    churnReason: str(r, "churn_reason", "churnReason"),
    operationalStatus: (str(r, "operational_status", "operationalStatus") || "Healthy") as AccountMeta["operationalStatus"],
    seats: num(r, "seats"),
    csmHealthScore: r["csm_health_score"] === undefined ? undefined : num(r, "csm_health_score", "csmHealthScore"),
    region: (str(r, "region") || "North America") as AccountMeta["region"],
  };
}

async function fetchTable<T>(table: string, map: (r: Row) => T, fallback: T[]): Promise<Sourced<T[]>> {
  if (!isConfigured) {
    return { data: fallback, origin: "mock", note: "Supabase is not configured. Showing the local fallback dataset." };
  }
  const sb = getSupabase();
  if (!sb) {
    return { data: fallback, origin: "mock", note: "Supabase client unavailable. Showing the local fallback dataset." };
  }
  const { data, error } = await sb.from(table).select("*");
  if (error) {
    return {
      data: fallback,
      origin: "mock",
      note: `Supabase read on "${table}" failed (${error.code || "error"}: ${error.message}). Showing the local fallback dataset.`,
    };
  }
  if (!data || data.length === 0) {
    return {
      data: fallback,
      origin: "mock",
      note: `Supabase table "${table}" is empty. Showing the local fallback dataset.`,
    };
  }
  return { data: (data as Row[]).map(map), origin: "supabase" };
}

export interface Snapshot {
  accounts: Sourced<Account[]>;
  tickets: Sourced<Ticket[]>;
  churned: Sourced<ChurnedAccount[]>;
  churnRate: Sourced<ChurnRatePoint[]>;
  meta: Sourced<AccountMeta[]>;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const [accounts, tickets, churned, churnRate, meta] = await Promise.all([
    fetchTable(TABLES.accounts, mapAccount, MOCK_ACCOUNTS),
    fetchTable(TABLES.tickets, mapTicket, MOCK_TICKETS),
    fetchTable(TABLES.churnedAccounts, mapChurned, MOCK_CHURNED_ACCOUNTS),
    fetchTable(TABLES.churnRate, mapChurnRate, MOCK_CHURN_RATE),
    fetchTable(TABLES.accountMeta, mapMeta, MOCK_ACCOUNT_META),
  ]);
  return { accounts, tickets, churned, churnRate, meta };
}

export function overallOrigin(s: Snapshot): DataOrigin {
  const parts = [s.accounts, s.tickets, s.churned, s.churnRate, s.meta];
  return parts.every((p) => p.origin === "supabase") ? "supabase" : "mock";
}

/* Writes go through here so an unconfigured project can never look like it
   accepted a change. Returns whether the write actually reached Supabase. */
export interface WriteOutcome {
  persisted: boolean;
  detail: string;
}

export async function writeAccountPatch(id: string, patch: Record<string, unknown>): Promise<WriteOutcome> {
  const sb = getSupabase();
  if (!sb) {
    return { persisted: false, detail: "Supabase is not configured. The change is held in this session only." };
  }
  const { error } = await sb.from(TABLES.accounts).update(patch).eq("id", id);
  if (error) {
    return { persisted: false, detail: `Supabase write failed (${error.code || "error"}: ${error.message}). The change is held in this session only.` };
  }
  return { persisted: true, detail: `Committed to Supabase table "${TABLES.accounts}".` };
}

export async function writeMetaPatch(accountId: string, patch: Record<string, unknown>): Promise<WriteOutcome> {
  const sb = getSupabase();
  if (!sb) {
    return { persisted: false, detail: "Supabase is not configured. The change is held in this session only." };
  }
  const { error } = await sb.from(TABLES.accountMeta).update(patch).eq("account_id", accountId);
  if (error) {
    return { persisted: false, detail: `Supabase write failed (${error.code || "error"}: ${error.message}). The change is held in this session only.` };
  }
  return { persisted: true, detail: `Committed to Supabase table "${TABLES.accountMeta}".` };
}
