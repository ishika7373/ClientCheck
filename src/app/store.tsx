import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Account, AccountMeta, AccountNote, DataOrigin } from "../lib/types";
import { loadSnapshot, overallOrigin, writeAccountPatch, writeMetaPatch, type Snapshot } from "../lib/repository";
import { getSupabase, isConfigured, probeConnection, type ProbeResult } from "../lib/supabase";
import { CSM_ROSTER, DEFAULT_CSM_INITIALS } from "../data/accountMeta";
import { TODAY_ISO, shiftDays } from "../lib/format";
import { buildBusinessReviews, buildDocuments, buildInteractions, buildNotes } from "../data/accountActivity";
import { findTool } from "../tools/registry";
import { StoreContext, type ActivityEvent, type Store } from "./storeContext";
import type { ToolContext, ToolError, ToolInput, ToolInvocation, ToolLogEntry } from "../tools/types";

/* Application state. One provider owns the data snapshot, the Supabase
   connection status, session level edits and the tool invocation history, so no
   component reaches for a data source on its own. */

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/* Timestamp for session events. Real wall clock: these are things that happened
   now, unlike the pinned demo dataset. */
function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /* Session level overrides layered on top of the snapshot. */
  const [accountEdits, setAccountEdits] = useState<Record<string, Partial<Account>>>({});
  const [metaEdits, setMetaEdits] = useState<Record<string, Partial<AccountMeta>>>({});
  const [extraNotes, setExtraNotes] = useState<Record<string, AccountNote[]>>({});
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  const [sessionEvents, setSessionEvents] = useState<Record<string, ActivityEvent[]>>({});
  const [invocations, setInvocations] = useState<ToolInvocation[]>([]);

  const [currentCsmInitials, setCurrentCsmInitials] = useState(DEFAULT_CSM_INITIALS);
  const [notifyOnHealthDrop, setNotifyOnHealthDrop] = useState(true);
  const [weeklyRenewalDigest, setWeeklyRenewalDigest] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [snap, pr] = await Promise.all([loadSnapshot(), probeConnection()]);
      if (!alive) return;
      setSnapshot(snap);
      setProbe(pr);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const baseAccounts = snapshot?.accounts.data ?? [];
  const accounts = useMemo(
    () => baseAccounts.map((a) => (accountEdits[a.id] ? { ...a, ...accountEdits[a.id] } : a)),
    [baseAccounts, accountEdits],
  );
  const baseMeta = snapshot?.meta.data ?? [];
  const metaList = useMemo(
    () => baseMeta.map((m) => (metaEdits[m.accountId] ? { ...m, ...metaEdits[m.accountId] } : m)),
    [baseMeta, metaEdits],
  );
  const tickets = snapshot?.tickets.data ?? [];
  const churned = snapshot?.churned.data ?? [];
  const churnRate = snapshot?.churnRate.data ?? [];
  const origin: DataOrigin = snapshot ? overallOrigin(snapshot) : "mock";

  const accountById = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);
  const metaFor = useCallback((id: string) => metaList.find((m) => m.accountId === id), [metaList]);
  const ticketsFor = useCallback((id: string) => tickets.filter((t) => t.accountId === id), [tickets]);

  const notesFor = useCallback(
    (id: string) => {
      const account = accountById(id);
      const meta = metaFor(id);
      const base = account && meta ? buildNotes(account, meta) : [];
      const withCompletion = base.map((n) =>
        n.kind === "Action" && completedActions[n.id] !== undefined ? { ...n, complete: completedActions[n.id] } : n,
      );
      const extra = (extraNotes[id] ?? []).map((n) =>
        n.kind === "Action" && completedActions[n.id] !== undefined ? { ...n, complete: completedActions[n.id] } : n,
      );
      return [...extra, ...withCompletion].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    [accountById, metaFor, extraNotes, completedActions],
  );

  const reviewsFor = useCallback(
    (id: string) => {
      const account = accountById(id);
      const meta = metaFor(id);
      return account && meta ? buildBusinessReviews(account, meta) : [];
    },
    [accountById, metaFor],
  );

  const documentsFor = useCallback(
    (id: string) => {
      const account = accountById(id);
      const meta = metaFor(id);
      return account && meta ? buildDocuments(account, meta) : [];
    },
    [accountById, metaFor],
  );

  const interactionsFor = useCallback(
    (id: string) => {
      const account = accountById(id);
      const meta = metaFor(id);
      return account && meta ? buildInteractions(account, meta) : [];
    },
    [accountById, metaFor],
  );

  const pushEvent = useCallback((accountId: string, event: ActivityEvent) => {
    setSessionEvents((prev) => ({ ...prev, [accountId]: [event, ...(prev[accountId] ?? [])] }));
  }, []);

  const activityFor = useCallback(
    (id: string): ActivityEvent[] => {
      const fromNotes: ActivityEvent[] = notesFor(id).map((n) => ({
        id: n.id,
        at: n.createdAt,
        kind: n.kind,
        summary: n.body,
        ownerInitials: n.authorInitials,
      }));
      const fromReviews: ActivityEvent[] = reviewsFor(id)
        .filter((r) => r.state !== "Scheduled")
        .map((r) => ({
          id: r.id,
          at: `${r.date} 10:00`,
          kind: "Business Review",
          summary: `${r.type} completed. ${r.outcome}`,
          ownerInitials: r.ownerInitials,
        }));
      /* A ticket carries an age, not a timestamp, so the opened date is derived
         from it. That puts support events in the right place chronologically
         alongside notes and reviews. */
      const fromTickets: ActivityEvent[] = ticketsFor(id).map((t) => ({
        id: t.id,
        at: `${shiftDays(TODAY_ISO, -t.ageDays)} 09:00`,
        kind: "Support",
        summary: `${t.id} opened. ${t.subject} (${t.priority}, ${t.slaState})`,
        ownerInitials: "SUP",
      }));
      const fromTools: ActivityEvent[] = invocations
        .filter((i) => i.accountId === id)
        .map((i) => ({
          id: i.id,
          at: i.startedAt,
          kind: "Tool Call",
          summary: `${i.toolName} returned ${i.result?.recordCount ?? 0} ${
            (i.result?.recordCount ?? 0) === 1 ? "record" : "records"
          } (${i.state})`,
          ownerInitials: currentCsmInitials,
        }));
      return [...(sessionEvents[id] ?? []), ...fromTools, ...fromNotes, ...fromReviews, ...fromTickets]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 12);
    },
    [notesFor, reviewsFor, ticketsFor, invocations, sessionEvents, currentCsmInitials],
  );

  const patchAccount = useCallback(
    async (id: string, patch: Partial<Account>, description: string) => {
      setAccountEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      const snakePatch: Record<string, unknown> = {};
      if (patch.status !== undefined) snakePatch.status = patch.status;
      if (patch.healthScore !== undefined) snakePatch.health_score = patch.healthScore;
      if (patch.csmInitials !== undefined) snakePatch.csm_initials = patch.csmInitials;
      const outcome = await writeAccountPatch(id, snakePatch);
      pushEvent(id, {
        id: nextId("EV"),
        at: stamp(),
        kind: "Status",
        summary: `${description} ${outcome.detail}`,
        ownerInitials: currentCsmInitials,
        simulated: !outcome.persisted,
      });
    },
    [pushEvent, currentCsmInitials],
  );

  const patchMeta = useCallback(
    async (id: string, patch: Partial<AccountMeta>, description: string) => {
      setMetaEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      const snakePatch: Record<string, unknown> = {};
      const map: Record<string, string> = {
        aeInitials: "ae_initials",
        aiInboxEnabled: "ai_inbox_enabled",
        billingStatus: "billing_status",
        plan: "plan",
        periodEnd: "period_end",
        usageTier: "usage_tier",
        website: "website",
        slackChannel: "slack_channel",
        automationSuccessKit: "automation_success_kit",
        multiYear: "multi_year",
        lastMbrDate: "last_mbr_date",
        nextMbrDate: "next_mbr_date",
        nextQbrDate: "next_qbr_date",
        excludeFromMetrics: "exclude_from_metrics",
        churnReason: "churn_reason",
        csmHealthScore: "csm_health_score",
        seats: "seats",
        region: "region",
        operationalStatus: "operational_status",
      };
      for (const [k, v] of Object.entries(patch)) {
        if (map[k]) snakePatch[map[k]] = v;
      }
      const outcome = await writeMetaPatch(id, snakePatch);
      pushEvent(id, {
        id: nextId("EV"),
        at: stamp(),
        kind: "Metadata",
        summary: `${description} ${outcome.detail}`,
        ownerInitials: currentCsmInitials,
        simulated: !outcome.persisted,
      });
    },
    [pushEvent, currentCsmInitials],
  );

  const addNote = useCallback(
    (id: string, note: Omit<AccountNote, "id" | "accountId">) => {
      const record: AccountNote = { ...note, id: nextId("NOTE"), accountId: id };
      setExtraNotes((prev) => ({ ...prev, [id]: [record, ...(prev[id] ?? [])] }));
    },
    [],
  );

  const toggleAction = useCallback((_id: string, noteId: string) => {
    setCompletedActions((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  }, []);

  const runSync = useCallback(
    async (id: string) => {
      pushEvent(id, {
        id: nextId("EV"),
        at: stamp(),
        kind: "Sync",
        summary: "Telemetry sync requested. Simulated in this prototype: no external flight operations system was contacted.",
        ownerInitials: currentCsmInitials,
        simulated: true,
      });
      await wait(400);
    },
    [pushEvent, currentCsmInitials],
  );

  const logSimulatedAction = useCallback(
    (id: string, kind: ActivityEvent["kind"], summary: string) => {
      pushEvent(id, { id: nextId("EV"), at: stamp(), kind, summary, ownerInitials: currentCsmInitials, simulated: true });
    },
    [pushEvent, currentCsmInitials],
  );

  /* ---------------- tool execution ---------------- */

  const queryLive = useCallback(
    async (table: string, filters: Record<string, string>) => {
      if (!isConfigured) {
        return {
          error: {
            code: "NOT_CONFIGURED",
            message: "Supabase is not configured, so no live query was attempted.",
            remedy: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload.",
            fatal: false,
          } as ToolError,
        };
      }
      const sb = getSupabase();
      if (!sb) {
        return { error: { code: "NOT_CONFIGURED", message: "Supabase client unavailable.", remedy: "Check Settings." } as ToolError };
      }
      try {
        let q = sb.from(table).select("*");
        for (const [k, v] of Object.entries(filters)) {
          if (v) q = q.eq(k, v);
        }
        const { data, error } = await q;
        if (error) {
          const msg = `${error.message || error.code || "unknown error"}${error.hint ? ` ${error.hint}` : ""}`;
          if (/invalid api key|jwt|unauthorized|not authorized/i.test(msg)) {
            return {
              error: {
                code: "AUTH_REJECTED",
                message: msg,
                remedy:
                  "The project rejected the key. Check VITE_SUPABASE_ANON_KEY against Project Settings, API, then reload and retry.",
                fatal: true,
              } as ToolError,
            };
          }
          if (error.code === "PGRST205" || /does not exist|could not find the table|row-level security|permission denied/i.test(msg)) {
            return {
              error: {
                code: "SCHEMA",
                message: msg,
                remedy: "Create the expected table or grant the anon role read access. The fallback dataset was used instead.",
                fatal: false,
              } as ToolError,
            };
          }
          return {
            error: {
              code: "TRANSPORT",
              message: msg,
              remedy: "Check network access to the Supabase project, then retry the call.",
              fatal: true,
            } as ToolError,
          };
        }
        return { rows: data ?? [] };
      } catch (e) {
        return {
          error: {
            code: "TRANSPORT",
            message: e instanceof Error ? e.message : "Unknown network failure.",
            remedy: "Check network access to the Supabase project, then retry the call.",
            fatal: true,
          } as ToolError,
        };
      }
    },
    [],
  );

  const toolCtx = useMemo<ToolContext>(
    () => ({
      accounts,
      tickets,
      churned,
      meta: metaList,
      origin,
      originNote: snapshot?.accounts.note,
      supabaseReady: isConfigured,
      queryLive,
    }),
    [accounts, tickets, churned, metaList, origin, snapshot, queryLive],
  );

  const ctxRef = useRef(toolCtx);
  ctxRef.current = toolCtx;

  const invokeTool = useCallback(
    async (toolName: string, input: ToolInput, accountId?: string): Promise<ToolInvocation | undefined> => {
      const tool = findTool(toolName);
      const id = nextId("CALL");
      const startedAt = stamp();
      if (!tool) return undefined;

      const ctx = ctxRef.current;
      const started = performance.now();
      const log: ToolLogEntry[] = [];
      const push = (entry: Omit<ToolLogEntry, "elapsedMs">) => {
        log.push({ ...entry, elapsedMs: Math.round(performance.now() - started) });
        setInvocations((prev) => prev.map((i) => (i.id === id ? { ...i, log: [...log] } : i)));
      };

      const seed: ToolInvocation = { id, toolName, input, state: "calling", log: [], startedAt, accountId };
      setInvocations((prev) => [seed, ...prev].slice(0, 40));

      const problems = tool.validate(input, ctx);
      if (problems.length) {
        const invalid: ToolInvocation = {
          ...seed,
          state: "invalid-input",
          validationProblems: problems,
          log: [{ phase: "error", title: "INVALID INPUT", detail: problems.join(" "), elapsedMs: 0 }],
          durationMs: Math.round(performance.now() - started),
        };
        setInvocations((prev) => prev.map((i) => (i.id === id ? invalid : i)));
        return invalid;
      }

      /* A short pause before the first phase so the operator can read the
         lifecycle unfold. The work itself is unchanged: nothing is fabricated
         by waiting. */
      await wait(120);

      try {
        const outcome = await tool.execute(input, ctx, push);
        await wait(120);
        const durationMs = Math.round(performance.now() - started);
        const finished: ToolInvocation = {
          ...seed,
          state: outcome.state,
          log: [...log],
          result: outcome.result,
          error: outcome.error,
          durationMs,
        };
        setInvocations((prev) => prev.map((i) => (i.id === id ? finished : i)));
        return finished;
      } catch (e) {
        const durationMs = Math.round(performance.now() - started);
        const failed: ToolInvocation = {
          ...seed,
          state: "error",
          log: [...log, { phase: "error", title: "ERROR", detail: e instanceof Error ? e.message : "Unknown failure", elapsedMs: durationMs }],
          error: {
            code: "UNEXPECTED",
            message: e instanceof Error ? e.message : "Unknown failure.",
            remedy: "Retry the call. If it keeps failing, check the Supabase status in Settings.",
          },
          durationMs,
        };
        setInvocations((prev) => prev.map((i) => (i.id === id ? failed : i)));
        return failed;
      }
    },
    [],
  );

  const currentCsm = useMemo(
    () => CSM_ROSTER.find((c) => c.initials === currentCsmInitials) ?? CSM_ROSTER[0],
    [currentCsmInitials],
  );

  const value: Store = {
    loading,
    snapshot,
    origin,
    probe,
    reload: () => setReloadKey((k) => k + 1),
    accounts,
    tickets,
    churned,
    churnRate,
    csmRoster: CSM_ROSTER,
    currentCsm,
    setCurrentCsm: setCurrentCsmInitials,
    notifyOnHealthDrop,
    setNotifyOnHealthDrop,
    weeklyRenewalDigest,
    setWeeklyRenewalDigest,
    accountById,
    metaFor,
    notesFor,
    reviewsFor,
    documentsFor,
    interactionsFor,
    ticketsFor,
    activityFor,
    patchAccount,
    patchMeta,
    addNote,
    toggleAction,
    runSync,
    logSimulatedAction,
    invocations,
    invokeTool,
    clearInvocations: () => setInvocations([]),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
