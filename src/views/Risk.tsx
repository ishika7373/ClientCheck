import { useMemo } from "react";
import { useStore } from "../app/storeContext";
import { statusSemantic } from "../components/AccountTable";
import { Chip, Panel, PanelHeader, ScoreMeter, Status, Td, Th } from "../components/primitives";
import { ToolConsole } from "../components/ToolConsole";
import { daysUntil, fmtCurrencyCompact, fmtDate, riskChips } from "../lib/format";
import { PageShell, SummaryCell, SummaryStrip } from "./PageShell";

/* Every Watch and At Risk account, ordered by health score ascending. */
export function Risk({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const { accounts } = useStore();

  const rows = useMemo(
    () =>
      accounts
        .filter((a) => a.status === "Watch" || a.status === "At Risk")
        .sort((a, b) => a.healthScore - b.healthScore),
    [accounts],
  );

  const stats = useMemo(() => {
    const arr = rows.reduce((s, a) => s + a.arr, 0);
    const atRisk = rows.filter((a) => a.status === "At Risk").length;
    const closing = rows.filter((a) => {
      const d = daysUntil(a.renewalDate);
      return d >= 0 && d <= 90;
    });
    return { arr, atRisk, watch: rows.length - atRisk, closingCount: closing.length, closingArr: closing.reduce((s, a) => s + a.arr, 0) };
  }, [rows]);

  const firstId = rows[0]?.id ?? "";

  return (
    <PageShell
      heading="Risk"
      accent="Register"
      summary="Accounts on Watch or At Risk, worst health first, with the signals driving the classification."
    >
      <SummaryStrip>
        <SummaryCell label="Accounts flagged" value={String(rows.length)} sub={`${stats.atRisk} at risk, ${stats.watch} watch`} tone="warning" />
        <SummaryCell label="ARR exposed" value={fmtCurrencyCompact(stats.arr)} sub="Flagged accounts" tone="warning" />
        <SummaryCell label="Renewing in 90d" value={String(stats.closingCount)} sub={`${fmtCurrencyCompact(stats.closingArr)} at stake`} tone={stats.closingCount ? "error" : "default"} />
        <SummaryCell
          label="Lowest health"
          value={String(rows[0]?.healthScore ?? 0)}
          sub={rows[0]?.name ?? "None"}
          tone="error"
        />
        <SummaryCell label="Open tickets" value={String(rows.reduce((s, a) => s + a.openTickets, 0))} sub="On flagged accounts" />
      </SummaryStrip>

      <Panel>
        <PanelHeader title="Risk register" right={<span className="num text-[11px] text-dm">sorted by health score ascending</span>} />
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr>
                <Th>Account</Th>
                <Th>Health score</Th>
                <Th align="right">ARR</Th>
                <Th>Renewal</Th>
                <Th>Risk factors</Th>
                <Th>CSM</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const days = daysUntil(a.renewalDate);
                const chips = riskChips(a, 3);
                return (
                  <tr
                    key={a.id}
                    onClick={() => onOpenAccount(a.id)}
                    role="button"
                    aria-label={`Open Account 360 for ${a.name}, ${a.id}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenAccount(a.id);
                      }
                    }}
                    className="cursor-pointer transition-colors duration-200 hover:bg-de focus-visible:bg-de"
                  >
                    <Td>
                      <span className="block truncate text-table text-dh">{a.name}</span>
                      <span className="num mt-[1px] block text-[11px] text-dm">
                        {a.id}  {a.industry}
                      </span>
                    </Td>
                    <Td>
                      <ScoreMeter score={a.healthScore} />
                      <span className="mt-1 block">
                        <Status kind={statusSemantic(a.status)} label={a.status} />
                      </span>
                    </Td>
                    <Td align="right" mono className="whitespace-nowrap text-dh">
                      {fmtCurrencyCompact(a.arr)}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="num text-dbd">{fmtDate(a.renewalDate)}</span>
                      <span className={`num mt-[1px] block text-[11px] ${days <= 90 ? "text-warning" : "text-dm"}`}>{days}d</span>
                    </Td>
                    <Td>
                      <span className="flex max-w-[320px] flex-wrap gap-1">
                        {chips.length ? (
                          chips.map((c) => (
                            <Chip key={c} label={c} tone={a.status === "At Risk" ? "error" : "warning"} />
                          ))
                        ) : (
                          <span className="text-table-sm text-dm">No active signals</span>
                        )}
                      </span>
                    </Td>
                    <Td>
                      <span className="num inline-flex h-[22px] w-[26px] items-center justify-center border border-de bg-dbg text-[11px] text-dsc">
                        {a.csmInitials}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <ToolConsole
        tools={["get_customer_health", "get_open_tickets"]}
        title="Tool execution  risk investigation"
        defaults={{
          get_customer_health: { accountId: firstId, includeRiskFactors: true },
          get_open_tickets: { accountId: firstId, priority: "Any", slaState: "Any" },
        }}
      />
    </PageShell>
  );
}
