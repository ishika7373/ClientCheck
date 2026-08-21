import { ArrowClockwise, Database, Key, ShieldCheck } from "@phosphor-icons/react";
import { useStore } from "../app/storeContext";
import { Button, Eyebrow, KeyValue, Panel, PanelHeader, Select, Status, Toggle } from "../components/primitives";
import { configProblems, configSummary, SUPABASE_PROJECT_REF, TABLES } from "../lib/supabase";
import { PageShell } from "./PageShell";

const STATE_LABEL = {
  connected: "Connected",
  "configuration-required": "Configuration required",
  "connection-error": "Connection error",
  checking: "Checking",
} as const;

export function Settings() {
  const {
    currentCsm,
    csmRoster,
    setCurrentCsm,
    notifyOnHealthDrop,
    setNotifyOnHealthDrop,
    weeklyRenewalDigest,
    setWeeklyRenewalDigest,
    probe,
    reload,
    loading,
    accounts,
    snapshot,
  } = useStore();

  const state = probe?.state ?? "checking";
  const semantic = state === "connected" ? "success" : state === "configuration-required" ? "warning" : "error";
  const owned = accounts.filter((a) => a.csmInitials === currentCsm.initials).length;

  return (
    <PageShell
      heading="Workspace"
      accent="Settings"
      summary="Profile, notifications and the state of the Supabase data layer."
      actions={
        <Button glyph={ArrowClockwise} onClick={reload} disabled={loading}>
          {loading ? "Reloading" : "Reload snapshot"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Profile" right={<span className="num text-[11px] text-dm">determines My Portfolio</span>} />
          <div className="flex items-start gap-3 border-b border-de px-3 py-3">
            <span className="num flex h-[40px] w-[40px] shrink-0 items-center justify-center border border-de bg-dbg text-table text-dsc">
              {currentCsm.initials}
            </span>
            <div className="min-w-0">
              <div className="text-body-lg text-dh">{currentCsm.name}</div>
              <div className="num text-table-sm text-dsc">{currentCsm.email}</div>
              <div className="mt-[2px] text-table-sm text-dm">{currentCsm.role}</div>
            </div>
          </div>
          <div className="px-3 py-2">
            <KeyValue label="Signed in as">
              <Select
                ariaLabel="Signed in CSM"
                value={currentCsm.initials}
                options={csmRoster.map((c) => c.initials)}
                onChange={setCurrentCsm}
              />
            </KeyValue>
            <KeyValue label="Initials">{currentCsm.initials}</KeyValue>
            <KeyValue label="Accounts owned">{owned}</KeyValue>
            <KeyValue label="Role">{currentCsm.role}</KeyValue>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Notifications" />
          <div className="divide-y divide-de px-3 py-1">
            <div className="py-2">
              <Toggle
                label="Email me when an account's health score drops below 50"
                hint="Sent to the signed-in address at the time of the drop."
                checked={notifyOnHealthDrop}
                onChange={setNotifyOnHealthDrop}
              />
            </div>
            <div className="py-2">
              <Toggle
                label="Weekly renewal digest"
                hint="Monday summary of renewals inside 90 days and their readiness."
                checked={weeklyRenewalDigest}
                onChange={setWeeklyRenewalDigest}
              />
            </div>
          </div>
          <div className="border-t border-de px-3 py-2">
            <span className="num text-[11px] text-dm">
              Preferences are held in this session. No mail transport is wired up in the prototype, so nothing is sent.
            </span>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Supabase integration status"
          right={<Status kind={semantic} label={STATE_LABEL[state]} />}
        />
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          <div className="border-b border-de px-2 py-1 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2">
              <Database size={14} weight="regular" className="text-dm" aria-hidden />
              <Eyebrow>Project</Eyebrow>
            </div>
            <div className="mt-2">
              <KeyValue label="Project ref">{SUPABASE_PROJECT_REF}</KeyValue>
              <KeyValue label="URL">{configSummary.url}</KeyValue>
              <KeyValue label="Anon key">
                {configSummary.anonKeyPresent ? configSummary.anonKeyFingerprint : "not set"}
              </KeyValue>
              <KeyValue label="Last checked">{probe ? probe.checkedAt.slice(0, 19).replace("T", " ") : "pending"}</KeyValue>
              <KeyValue label="Latency">{probe?.latencyMs !== undefined ? `${probe.latencyMs}ms` : "n/a"}</KeyValue>
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Key size={14} weight="regular" className="text-dm" aria-hidden />
              <Eyebrow>Expected tables</Eyebrow>
            </div>
            <div className="mt-2">
              {Object.values(TABLES).map((t) => {
                const found = probe?.tablesFound.includes(t);
                return (
                  <KeyValue key={t} label={t}>
                    <Status kind={found ? "success" : "warning"} label={found ? "readable" : "not readable"} />
                  </KeyValue>
                );
              })}
            </div>
          </div>
        </div>

        {configProblems.length ? (
          <div className="border-t border-de px-3 py-2">
            <Eyebrow className="text-warning">Configuration required</Eyebrow>
            <ul className="mt-1 space-y-[2px]">
              {configProblems.map((p) => (
                <li key={p.code} className="text-table-sm text-dbd">
                  {p.message}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-table-sm text-dm">
              Copy .env.example to .env, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.
              Until then the app runs on the local fallback dataset and says so on every page.
            </div>
          </div>
        ) : null}

        {probe && probe.state !== "configuration-required" ? (
          <div className="border-t border-de px-3 py-2">
            <Eyebrow>Probe detail</Eyebrow>
            <div className="mt-1 text-table-sm text-dbd">{probe.detail}</div>
          </div>
        ) : null}

        <div className="flex items-start gap-2 border-t border-de px-3 py-2">
          <ShieldCheck size={14} weight="regular" className="mt-[3px] shrink-0 text-success" aria-hidden />
          <div className="text-table-sm text-dm">
            Only the publishable anon key is ever read by this frontend, and only its first and last characters are shown
            above. A service role key or database password supplied to a VITE_ variable is rejected at startup rather than
            used, because Vite inlines those values into the browser bundle.
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Data source per dataset" />
        <div className="px-3 py-2">
          {snapshot ? (
            (
              [
                ["accounts", snapshot.accounts],
                ["tickets", snapshot.tickets],
                ["churned_accounts", snapshot.churned],
                ["churn_rate_monthly", snapshot.churnRate],
                ["account_meta", snapshot.meta],
              ] as const
            ).map(([label, s]) => (
              <KeyValue key={label} label={label}>
                <span className="flex items-center justify-end gap-2">
                  <Status
                    kind={s.origin === "supabase" ? "success" : "warning"}
                    label={s.origin === "supabase" ? "Supabase" : "Fallback"}
                  />
                  <span className="num text-[11px] text-dm">{s.data.length} rows</span>
                </span>
              </KeyValue>
            ))
          ) : (
            <div className="text-table-sm text-dm">Loading snapshot.</div>
          )}
        </div>
        {snapshot?.accounts.note ? (
          <div className="border-t border-de px-2 py-1 text-table-sm text-dm">{snapshot.accounts.note}</div>
        ) : null}
      </Panel>
    </PageShell>
  );
}
