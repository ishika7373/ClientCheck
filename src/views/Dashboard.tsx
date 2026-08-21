import { useMemo } from "react";
import { Bell, CalendarBlank, ChartLine, Ticket, Warning } from "@phosphor-icons/react";
import { useStore } from "../app/storeContext";
import { AccountTable } from "../components/AccountTable";
import { HealthTrendChart } from "../components/charts";
import { Eyebrow, Panel, PanelHeader, Status, type Semantic } from "../components/primitives";
import { ToolConsole } from "../components/ToolConsole";
import { portfolioHealthTrend } from "../data/accounts";
import { daysSince, daysUntil, fmtCurrencyCompact, fmtDate } from "../lib/format";
import { PageShell, SummaryCell, SummaryStrip } from "./PageShell";

interface Alert {
  id: string;
  accountId: string;
  kind: Semantic;
  label: string;
  detail: string;
}

/* Alerts are derived from the current snapshot, so they always agree with the
   table beside them. */
function buildAlerts(accounts: ReturnType<typeof useStore>["accounts"]): Alert[] {
  const out: Alert[] = [];
  for (const a of accounts) {
    const days = daysUntil(a.renewalDate);
    if (days >= 0 && days <= 21) {
      out.push({
        id: `${a.id}-renewal`,
        accountId: a.id,
        kind: days <= 14 ? "error" : "warning",
        label: `Renewal in ${days} days`,
        detail: `${a.name}  ${fmtCurrencyCompact(a.arr)} at stake  health ${a.healthScore}`,
      });
    }
    if (a.csat < 70) {
      out.push({
        id: `${a.id}-csat`,
        accountId: a.id,
        kind: "error",
        label: `CSAT dropped below 70`,
        detail: `${a.name}  CSAT ${a.csat}%  ${a.openTickets} open ${a.openTickets === 1 ? "ticket" : "tickets"}`,
      });
    }
    if (a.uptimePct < 95) {
      out.push({
        id: `${a.id}-uptime`,
        accountId: a.id,
        kind: "warning",
        label: `Uptime below 95 percent`,
        detail: `${a.name}  uptime ${a.uptimePct}%  fleet ${a.fleetSize}`,
      });
    }
    if (daysSince(a.lastQbrDate) > 180) {
      out.push({
        id: `${a.id}-qbr`,
        accountId: a.id,
        kind: "review",
        label: `No QBR in ${daysSince(a.lastQbrDate)} days`,
        detail: `${a.name}  last QBR ${fmtDate(a.lastQbrDate)}`,
      });
    }
  }
  const rank: Record<Semantic, number> = { error: 0, warning: 1, review: 2, info: 3, progress: 4, success: 5 };
  const seen = new Set<string>();
  const deduped: Alert[] = [];
  for (const a of out.sort((x, y) => rank[x.kind] - rank[y.kind])) {
    if (seen.has(a.accountId)) continue;
    seen.add(a.accountId);
    deduped.push(a);
  }
  return deduped.slice(0, 5);
}

export function Dashboard({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const { accounts } = useStore();

  const kpis = useMemo(() => {
    const total = accounts.length;
    const arr = accounts.reduce((s, a) => s + a.arr, 0);
    const avg = total ? Math.round(accounts.reduce((s, a) => s + a.healthScore, 0) / total) : 0;
    const atRisk = accounts.filter((a) => a.status === "At Risk").length;
    const watch = accounts.filter((a) => a.status === "Watch").length;
    const due60 = accounts.filter((a) => {
      const d = daysUntil(a.renewalDate);
      return d >= 0 && d <= 60;
    });
    const due60Arr = due60.reduce((s, a) => s + a.arr, 0);
    return { total, arr, avg, atRisk, watch, due60: due60.length, due60Arr };
  }, [accounts]);

  const trend = useMemo(() => portfolioHealthTrend(accounts), [accounts]);
  const alerts = useMemo(() => buildAlerts(accounts), [accounts]);

  return (
    <PageShell
      heading="Account"
      accent="Health"
      summary="Portfolio wide view of account health, commercial exposure and open operational risk."
    >
      <SummaryStrip>
        <SummaryCell label="Total accounts" value={String(kpis.total)} sub={`${kpis.watch} on watch`} />
        <SummaryCell label="ARR managed" value={fmtCurrencyCompact(kpis.arr)} sub="Annual recurring revenue" />
        <SummaryCell
          label="Avg health score"
          value={String(kpis.avg)}
          sub="Portfolio mean"
          tone={kpis.avg >= 75 ? "success" : kpis.avg >= 55 ? "warning" : "error"}
        />
        <SummaryCell label="At-risk accounts" value={String(kpis.atRisk)} sub="Status At Risk" tone={kpis.atRisk ? "error" : "success"} />
        <SummaryCell
          label="Renewals due 60d"
          value={String(kpis.due60)}
          sub={`${fmtCurrencyCompact(kpis.due60Arr)} at stake`}
          tone={kpis.due60 ? "warning" : "default"}
        />
      </SummaryStrip>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <Panel>
          <PanelHeader
            title="Accounts"
            right={<span className="num text-[11px] text-dm">{accounts.length} rows  click to open Account 360</span>}
          />
          <AccountTable accounts={accounts} onOpen={onOpenAccount} variant="compact" />
        </Panel>

        <div className="space-y-3">
          <Panel>
            <PanelHeader
              title="Health trend"
              right={
                <span className="flex items-center gap-1 text-dm">
                  <ChartLine size={13} weight="regular" aria-hidden />
                  <span className="num text-[11px]">6 months, portfolio mean</span>
                </span>
              }
            />
            <div className="px-2 py-2">
              <HealthTrendChart data={trend} />
            </div>
            <div className="border-t border-de px-3 py-2">
              <span className="num text-[11px] text-dm">
                {trend[0]?.score} in {trend[0]?.month} to {trend[trend.length - 1]?.score} in{" "}
                {trend[trend.length - 1]?.month}. Dashed line marks the 75 healthy threshold.
              </span>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Alerts"
              right={
                <span className="flex items-center gap-1 text-dm">
                  <Bell size={13} weight="regular" aria-hidden />
                  <span className="num text-[11px]">{alerts.length}</span>
                </span>
              }
            />
            {alerts.length === 0 ? (
              <div className="px-2 py-2 text-table-sm text-dm">No alerts on the current snapshot.</div>
            ) : (
              <ul>
                {alerts.map((al) => (
                  <li key={al.id}>
                    <button
                      type="button"
                      onClick={() => onOpenAccount(al.accountId)}
                      className="w-full border-b border-de px-2 py-1 text-left transition-colors duration-200 last:border-b-0 hover:bg-de"
                    >
                      <Status kind={al.kind} label={al.label} />
                      <span className="num mt-[2px] block text-[11px] text-dm">{al.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Portfolio load"
              right={
                <span className="flex items-center gap-2 text-dm">
                  <Ticket size={13} weight="regular" aria-hidden />
                  <CalendarBlank size={13} weight="regular" aria-hidden />
                  <Warning size={13} weight="regular" aria-hidden />
                </span>
              }
            />
            <div className="grid grid-cols-3 gap-[1px] bg-de">
              <div className="bg-ds px-3 py-2">
                <Eyebrow>Open tickets</Eyebrow>
                <div className="num mt-1 text-[18px] text-dh">{accounts.reduce((s, a) => s + a.openTickets, 0)}</div>
              </div>
              <div className="bg-ds px-3 py-2">
                <Eyebrow>Fleet</Eyebrow>
                <div className="num mt-1 text-[18px] text-dh">{accounts.reduce((s, a) => s + a.fleetSize, 0)}</div>
              </div>
              <div className="bg-ds px-3 py-2">
                <Eyebrow>Hours 30d</Eyebrow>
                <div className="num mt-1 text-[18px] text-dh">
                  {accounts.reduce((s, a) => s + a.flightHoursLast30d, 0).toLocaleString("en-US")}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <ToolConsole
        tools={["get_customer_health", "get_renewal_details", "get_open_tickets"]}
        title="Tool execution  portfolio scope"
        defaults={{ get_customer_health: { accountId: "ACC-1042", includeRiskFactors: true } }}
      />
    </PageShell>
  );
}
