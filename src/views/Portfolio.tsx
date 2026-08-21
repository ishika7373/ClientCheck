import { useMemo } from "react";
import { useStore } from "../app/storeContext";
import { AccountTable } from "../components/AccountTable";
import { Panel, PanelHeader, Select } from "../components/primitives";
import { fmtCurrencyCompact } from "../lib/format";
import { PageShell, SummaryCell, SummaryStrip } from "./PageShell";

/* Pre-filtered to the signed-in CSM. The owner comes from Settings. */
export function Portfolio({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const { accounts, currentCsm, csmRoster, setCurrentCsm } = useStore();

  const mine = useMemo(() => accounts.filter((a) => a.csmInitials === currentCsm.initials), [accounts, currentCsm]);

  const stats = useMemo(() => {
    const arr = mine.reduce((s, a) => s + a.arr, 0);
    const atRisk = mine.filter((a) => a.status === "At Risk").length;
    const watch = mine.filter((a) => a.status === "Watch").length;
    const avg = mine.length ? Math.round(mine.reduce((s, a) => s + a.healthScore, 0) / mine.length) : 0;
    const tickets = mine.reduce((s, a) => s + a.openTickets, 0);
    return { arr, atRisk, watch, avg, tickets };
  }, [mine]);

  return (
    <PageShell
      heading="My"
      accent="Portfolio"
      summary={`Accounts owned by ${currentCsm.initials}. Ownership is set on the Settings page.`}
      actions={
        <label className="flex items-center gap-2">
          <span className="eyebrow">Owner</span>
          <Select
            ariaLabel="Portfolio owner"
            value={currentCsm.initials}
            options={csmRoster.map((c) => c.initials)}
            onChange={setCurrentCsm}
          />
        </label>
      }
    >
      <SummaryStrip>
        <SummaryCell label="Accounts owned" value={String(mine.length)} sub={`of ${accounts.length} in portfolio`} />
        <SummaryCell label="Combined ARR" value={fmtCurrencyCompact(stats.arr)} sub="Owned book" />
        <SummaryCell
          label="Accounts at risk"
          value={String(stats.atRisk)}
          sub={`${stats.watch} on watch`}
          tone={stats.atRisk ? "error" : "success"}
        />
        <SummaryCell
          label="Avg health score"
          value={String(stats.avg)}
          tone={stats.avg >= 75 ? "success" : stats.avg >= 55 ? "warning" : "error"}
          sub="Owned book mean"
        />
        <SummaryCell label="Open tickets" value={String(stats.tickets)} sub="Across owned accounts" />
      </SummaryStrip>

      <Panel>
        <PanelHeader
          title={`Accounts owned by ${currentCsm.initials}`}
          right={<span className="num text-[11px] text-dm">{mine.length} rows</span>}
        />
        <AccountTable accounts={mine} onOpen={onOpenAccount} />
      </Panel>
    </PageShell>
  );
}
