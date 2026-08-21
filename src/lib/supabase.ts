import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Supabase wiring.
 *
 * Configuration comes from environment variables only. Vite inlines anything
 * prefixed with VITE_ into the client bundle, so the ONLY Supabase credential
 * that may ever appear here is the publishable anon key, which is designed for
 * browser use and must be paired with row level security on every table.
 *
 * A service_role key, a database password or any other secret must never be
 * placed in a VITE_ variable. Server side work belongs in an edge function.
 *
 * Project ref for this prototype: kufvqlqkmqnacicnritb
 */

export const SUPABASE_PROJECT_REF = "kufvqlqkmqnacicnritb";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export type ConnectionState = "connected" | "configuration-required" | "connection-error" | "checking";

export interface ConfigProblem {
  code: "missing-url" | "missing-key" | "bad-url" | "secret-key-supplied";
  message: string;
}

/* Refuses to start if someone drops a privileged key into the frontend env. */
function looksPrivileged(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  if (key.startsWith("service_role")) return true;
  try {
    const payload = JSON.parse(atob(key.split(".")[1] ?? ""));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

export function inspectConfig(): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  if (!rawUrl) {
    problems.push({ code: "missing-url", message: "VITE_SUPABASE_URL is not set." });
  } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(rawUrl)) {
    problems.push({ code: "bad-url", message: "VITE_SUPABASE_URL is not a valid Supabase project URL." });
  }
  if (!rawKey) {
    problems.push({ code: "missing-key", message: "VITE_SUPABASE_ANON_KEY is not set." });
  } else if (looksPrivileged(rawKey)) {
    problems.push({
      code: "secret-key-supplied",
      message: "A privileged key was supplied to the frontend. Refusing to use it. Provide the publishable anon key instead.",
    });
  }
  return problems;
}

export const configProblems = inspectConfig();
export const isConfigured = configProblems.length === 0;

/* Safe to render: the project ref is public, the key never is. */
export const configSummary = {
  projectRef: SUPABASE_PROJECT_REF,
  url: rawUrl || "not set",
  anonKeyPresent: Boolean(rawKey),
  anonKeyFingerprint: rawKey ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}` : "not set",
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isConfigured) return null;
  if (!client) {
    client = createClient(rawUrl, rawKey, {
      auth: { persistSession: false },
      global: { headers: { "x-application-name": "clientcheck" } },
    });
  }
  return client;
}

/* Table names the data layer expects in the Supabase project. */
export const TABLES = {
  accounts: "accounts",
  tickets: "tickets",
  churnedAccounts: "churned_accounts",
  accountMeta: "account_meta",
  churnRate: "churn_rate_monthly",
} as const;

export interface ProbeResult {
  state: ConnectionState;
  detail: string;
  checkedAt: string;
  latencyMs?: number;
  tablesFound: string[];
  tablesMissing: string[];
}

/* Actually talks to the project. Never reports "connected" on a guess. */
export async function probeConnection(): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString();
  if (!isConfigured) {
    return {
      state: "configuration-required",
      detail: configProblems.map((p) => p.message).join(" "),
      checkedAt,
      tablesFound: [],
      tablesMissing: Object.values(TABLES),
    };
  }
  const sb = getSupabase();
  if (!sb) {
    return {
      state: "configuration-required",
      detail: "Supabase client could not be created.",
      checkedAt,
      tablesFound: [],
      tablesMissing: Object.values(TABLES),
    };
  }

  const started = performance.now();
  const found: string[] = [];
  const missing: string[] = [];

  /* Kinds of failure, most diagnostic first. An auth failure explains every
     table at once, so it outranks a per-table schema problem. */
  let authError = "";
  let transportError = "";
  let rlsCount = 0;
  let absentCount = 0;

  for (const table of Object.values(TABLES)) {
    /* A real one row read rather than a HEAD count: HEAD responses come back
       with an empty error body, which hides the actual cause. This also tests
       exactly what the data layer does. */
    const { error } = await sb.from(table).select("*").limit(1);
    if (!error) {
      found.push(table);
      continue;
    }
    missing.push(table);
    const msg = `${error.message || error.code || "unknown error"}${error.hint ? ` ${error.hint}` : ""}`;
    if (/invalid api key|jwt|unauthorized|not authorized/i.test(msg)) {
      authError = authError || msg;
    } else if (error.code === "PGRST205" || /does not exist|could not find the table/i.test(msg)) {
      absentCount += 1;
    } else if (error.code === "42501" || /permission denied|row-level security/i.test(msg)) {
      rlsCount += 1;
    } else {
      transportError = transportError || msg;
    }
  }
  const latencyMs = Math.round(performance.now() - started);

  if (authError) {
    return {
      state: "connection-error",
      detail: `The project rejected the key: ${authError} Check VITE_SUPABASE_ANON_KEY against Project Settings, API.`,
      checkedAt,
      latencyMs,
      tablesFound: found,
      tablesMissing: missing,
    };
  }

  if (transportError) {
    return { state: "connection-error", detail: transportError, checkedAt, latencyMs, tablesFound: found, tablesMissing: missing };
  }
  if (found.length === 0) {
    const cause =
      absentCount === missing.length
        ? "None of the expected tables exist in this project yet. Create the schema."
        : rlsCount === missing.length
          ? "The tables exist but the anon role cannot read them. Add a select policy for anon."
          : "None of the expected tables are readable. Create the schema or grant read access to the anon role.";
    return {
      state: "connection-error",
      detail: `Project reachable. ${cause}`,
      checkedAt,
      latencyMs,
      tablesFound: found,
      tablesMissing: missing,
    };
  }
  return {
    state: "connected",
    detail:
      missing.length === 0
        ? "All expected tables readable."
        : `Readable: ${found.join(", ")}. Not readable: ${missing.join(", ")}.`,
    checkedAt,
    latencyMs,
    tablesFound: found,
    tablesMissing: missing,
  };
}
