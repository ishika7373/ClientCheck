import { useMemo } from "react";
import { useStore } from "../app/storeContext";
import { Chip, Panel, PanelHeader, ScoreMeter, Status } from "../components/primitives";
import { ToolConsole } from "../components/ToolConsole";
import {
  daysUntil,
  fmtCurrencyCompact,
  fmtDate,
  quarterKey,
  quarterLabel,
  renewalReadiness,
  riskChips,
} from "../lib/format";
import type { RenewalReadiness } from "../lib/types";
import { PageShell, SummaryCell, SummaryStrip } from "./PageShell";

const READINESS_SEMANTIC: Record<RenewalReadiness, "success" | "warning" | "error"> = {
  "On Track": "success",
  "Needs Attention": "warning",
  "At Risk": "error",
};

/* Timeline grouped by calendar quarter across the next 12 months. */
export function Renewals({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const { accounts } = useStore();

  const inWindow = useMemo(
    () =>
      accounts
        .filter((a) => {
          const d = daysUntil(a.renewalDate);
          return d >= 0 && d <= 366;
        })
        .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate)),
    [accounts],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof inWindow>();
    for (const a of inWindow) {
      const key = quarterKey(a.renewalDate);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [inWindow]);

  const stats = useMemo(() => {
    const in90 = inWindow.filter((a) => daysUntil(a.renewalDate) <= 90);
    const arr90 = in90.reduce((s, a) => s + a.arr, 0);
    const totalArr = inWindow.reduce((s, a) => s + a.arr, 0);
    const atRisk = inWindow.filter((a) => renewalReadiness(a) === "At Risk");
    const needs = inWindow.filter((a) => renewalReadiness(a) === "Needs Attention");
    return { count90: in90.length, arr90, totalArr, atRisk: atRisk.length, atRiskArr: atRisk.reduce((s, a) => s + a.arr, 0), needs: needs.length };
  }, [inWindow]);

  const soonest = inWindow[0]?.id ?? "";

  return (
    <PageShell
      heading="Renewal"
      accent="Pipeline"
      summary="Every renewal in the next 12 months, grouped by quarter, with derived readiness and the risks weighing on each decision."
    >
      <SummaryStrip>
        <SummaryCell label="ARR up for renewal 90d" value={fmtCurrencyCompact(stats.arr90)} sub={`${stats.count90} accounts`} tone="warning" />
        <SummaryCell label="ARR next 12 months" value={fmtCurrencyCompact(stats.totalArr)} sub={`${inWindow.length} accounts`} />
        <SummaryCell label="At risk renewals" value={String(stats.atRisk)} sub={`${fmtCurrencyCompact(stats.atRiskArr)} exposed`} tone={stats.atRisk ? "error" : "success"} />
        <SummaryCell label="Needs attention" value={String(stats.needs)} sub="Readiness band" tone="warning" />
        <SummaryCell label="Next renewal" value={`${daysUntil(inWindow[0]?.renewalDate ?? "2026-08-21")}d`} sub={inWindow[0]?.name ?? "None"} tone="warning" />
      </SummaryStrip>

      {groups.map(([key, rows]) => {
        const qArr = rows.reduce((s, a) => s + a.arr, 0);
        return (
          <Panel key={key}>
            <PanelHeader
              title={quarterLabel(key)}
              right={
                <span className="num text-[11px] text-dm">
                  {rows.length} {rows.length === 1 ? "renewal" : "renewals"}  {fmtCurrencyCompact(qArr)}
                </span>
              }
            />
            <ul>
              {rows.map((a) => {
                const ready = renewalReadiness(a);
                const days = daysUntil(a.renewalDate);
                const chips = riskChips(a, 2);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onOpenAccount(a.id)}
                      className="grid w-full grid-cols-1 items-center gap-2 border-b border-de px-2 py-1 text-left transition-colors duration-200 last:border-b-0 hover:bg-de sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,2.2fr)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-table text-dh">{a.name}</span>
                        <span className="num mt-[1px] block text-[11px] text-dm">
                          {a.id}  {a.industry}  {a.csmInitials}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="num block text-table-sm text-dbd">{fmtDate(a.renewalDate)}</span>
                        <span className={`num mt-[1px] block text-[11px] ${days <= 90 ? "text-warning" : "text-dm"}`}>
                          {days}d out
                        </span>
                      </span>
                      <span className="num text-table-sm text-dh">{fmtCurrencyCompact(a.arr)}</span>
                      <span>
                        <ScoreMeter score={a.healthScore} />
                      </span>
                      <span className="min-w-0">
                        <Status kind={READINESS_SEMANTIC[ready]} label={ready} />
                        {chips.length ? (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {chips.map((c) => (
                              <Chip key={c} label={c} tone={ready === "At Risk" ? "error" : "neutral"} />
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        );
      })}

      <ToolConsole
        tools={["get_renewal_details", "get_customer_health"]}
        title="Tool execution  renewal desk"
        defaults={{
          get_renewal_details: { accountId: soonest, readiness: "Any" },
          get_customer_health: { accountId: soonest, includeRiskFactors: true },
        }}
      />
    </PageShell>
  );
}
