import { useMemo } from "react";
import { useStore } from "../app/storeContext";
import { ChurnRateChart } from "../components/charts";
import { Panel, PanelHeader, TableFrame, Td, Th } from "../components/primitives";
import { fmtCurrencyCompact, fmtDate, fmtMonthKey } from "../lib/format";
import { PageShell, SummaryCell, SummaryStrip } from "./PageShell";

export function Churn() {
  const { churned, churnRate, accounts } = useStore();

  const stats = useMemo(() => {
    const arrLost = churned.reduce((s, c) => s + c.arrLost, 0);
    const avgRate = churnRate.length ? churnRate.reduce((s, p) => s + p.churnRatePct, 0) / churnRate.length : 0;
    const worst = [...churnRate].sort((a, b) => b.churnRatePct - a.churnRatePct)[0];
    const activeArr = accounts.reduce((s, a) => s + a.arr, 0);
    const byReason = new Map<string, number>();
    for (const c of churned) byReason.set(c.reason, (byReason.get(c.reason) ?? 0) + 1);
    const topReason = [...byReason.entries()].sort((a, b) => b[1] - a[1])[0];
    return { arrLost, avgRate, worst, activeArr, topReason };
  }, [churned, churnRate, accounts]);

  const reasons = useMemo(() => {
    const map = new Map<string, { count: number; arr: number }>();
    for (const c of churned) {
      const cur = map.get(c.reason) ?? { count: 0, arr: 0 };
      map.set(c.reason, { count: cur.count + 1, arr: cur.arr + c.arrLost });
    }
    return [...map.entries()].sort((a, b) => b[1].arr - a[1].arr);
  }, [churned]);

  return (
    <PageShell
      heading="Churn"
      accent="Analysis"
      summary="Trailing 12 months of logo and revenue churn, with the recorded reason for every departure."
    >
      <SummaryStrip>
        <SummaryCell label="Accounts churned 12m" value={String(churned.length)} sub="Closed lost" tone="error" />
        <SummaryCell label="ARR lost 12m" value={fmtCurrencyCompact(stats.arrLost)} sub="Recognised at churn date" tone="error" />
        <SummaryCell label="Avg monthly churn rate" value={`${stats.avgRate.toFixed(1)}%`} sub="ARR basis" tone="warning" />
        <SummaryCell
          label="Worst month"
          value={stats.worst ? `${stats.worst.churnRatePct.toFixed(1)}%` : "0.0%"}
          sub={stats.worst ? fmtMonthKey(stats.worst.month) : "None"}
          tone="error"
        />
        <SummaryCell
          label="Leading reason"
          value={stats.topReason ? String(stats.topReason[1]) : "0"}
          sub={stats.topReason ? stats.topReason[0] : "None recorded"}
        />
      </SummaryStrip>

      <Panel>
        <PanelHeader
          title="Monthly churn rate  trailing 12 months"
          right={<span className="num text-[11px] text-dm">ARR lost in month over ARR at start of month</span>}
        />
        <div className="px-2 py-2">
          <ChurnRateChart data={churnRate} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Churned accounts" right={<span className="num text-[11px] text-dm">{churned.length} records</span>} />
        <TableFrame>
          <thead>
            <tr>
              <Th>Account</Th>
              <Th>Industry</Th>
              <Th>Churn date</Th>
              <Th align="right">ARR lost</Th>
              <Th>Churn reason</Th>
            </tr>
          </thead>
          <tbody>
            {[...churned]
              .sort((a, b) => b.churnDate.localeCompare(a.churnDate))
              .map((c) => (
                <tr key={c.id}>
                  <Td>
                    <span className="block truncate text-table text-dh">{c.name}</span>
                    <span className="num mt-[1px] block text-[11px] text-dm">{c.id}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-dsc">{c.industry}</Td>
                  <Td mono className="whitespace-nowrap">
                    {fmtDate(c.churnDate)}
                  </Td>
                  <Td align="right" mono className="whitespace-nowrap text-error">
                    {fmtCurrencyCompact(c.arrLost)}
                  </Td>
                  <Td>{c.reason}</Td>
                </tr>
              ))}
          </tbody>
        </TableFrame>
      </Panel>

      <Panel>
        <PanelHeader title="Churn reasons" right={<span className="num text-[11px] text-dm">grouped by recorded reason</span>} />
        <TableFrame>
          <thead>
            <tr>
              <Th>Reason</Th>
              <Th align="right">Accounts</Th>
              <Th align="right">ARR lost</Th>
              <Th align="right">Share of ARR lost</Th>
            </tr>
          </thead>
          <tbody>
            {reasons.map(([reason, v]) => (
              <tr key={reason}>
                <Td>{reason}</Td>
                <Td align="right" mono>
                  {v.count}
                </Td>
                <Td align="right" mono>
                  {fmtCurrencyCompact(v.arr)}
                </Td>
                <Td align="right" mono>
                  {stats.arrLost ? `${Math.round((v.arr / stats.arrLost) * 100)}%` : "0%"}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      </Panel>
    </PageShell>
  );
}
