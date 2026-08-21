import { useMemo, useState } from "react";
import { useStore } from "../app/storeContext";
import { Panel, PanelHeader, Select, Status, TableFrame, Td, Th, type Semantic } from "../components/primitives";
import { ToolConsole } from "../components/ToolConsole";
import type { SlaState, TicketPriority } from "../lib/types";
import { PageShell, SummaryCell, SummaryStrip } from "./PageShell";

export function slaSemantic(state: SlaState): Semantic {
  if (state === "On Track") return "success";
  if (state === "At Risk") return "warning";
  return "error";
}

export function prioritySemantic(p: TicketPriority): Semantic {
  if (p === "Urgent") return "error";
  if (p === "High") return "warning";
  if (p === "Medium") return "info";
  return "success";
}

const PRIORITY_ORDER: TicketPriority[] = ["Urgent", "High", "Medium", "Low"];

export function SupportTools({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const { tickets, accounts } = useStore();
  const [priority, setPriority] = useState("Any");
  const [sla, setSla] = useState("Any");

  const nameFor = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  const rows = useMemo(
    () =>
      tickets
        .filter((t) => (priority === "Any" ? true : t.priority === priority))
        .filter((t) => (sla === "Any" ? true : t.slaState === sla))
        .sort((a, b) => {
          const p = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
          return p !== 0 ? p : b.ageDays - a.ageDays;
        }),
    [tickets, priority, sla],
  );

  const stats = useMemo(() => {
    const breaching = tickets.filter((t) => t.slaState === "Breached").length;
    const atRisk = tickets.filter((t) => t.slaState === "At Risk").length;
    const avgAge = tickets.length ? tickets.reduce((s, t) => s + t.ageDays, 0) / tickets.length : 0;
    const urgent = tickets.filter((t) => t.priority === "Urgent").length;
    const accountsAffected = new Set(tickets.map((t) => t.accountId)).size;
    return { breaching, atRisk, avgAge, urgent, accountsAffected };
  }, [tickets]);

  return (
    <PageShell
      heading="Support"
      accent="Tools"
      summary="Every open ticket across the portfolio, with SLA state and age, and the ticket tool available for scoped queries."
    >
      <SummaryStrip>
        <SummaryCell label="Open tickets" value={String(tickets.length)} sub={`${stats.accountsAffected} accounts affected`} />
        <SummaryCell label="Breaching SLA" value={String(stats.breaching)} sub={`${stats.atRisk} at risk`} tone={stats.breaching ? "error" : "success"} />
        <SummaryCell label="Average age" value={`${stats.avgAge.toFixed(1)}d`} sub="Across open tickets" tone={stats.avgAge > 5 ? "warning" : "default"} />
        <SummaryCell label="Urgent priority" value={String(stats.urgent)} sub="Highest band" tone={stats.urgent ? "error" : "success"} />
        <SummaryCell
          label="Oldest ticket"
          value={`${Math.max(0, ...tickets.map((t) => t.ageDays))}d`}
          sub={[...tickets].sort((a, b) => b.ageDays - a.ageDays)[0]?.id ?? "None"}
          tone="warning"
        />
      </SummaryStrip>

      <Panel>
        <PanelHeader
          title="Open tickets"
          right={
            <span className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <span className="eyebrow">Priority</span>
                <Select ariaLabel="Filter by priority" value={priority} options={["Any", "Urgent", "High", "Medium", "Low"]} onChange={setPriority} />
              </label>
              <label className="flex items-center gap-1">
                <span className="eyebrow">SLA</span>
                <Select ariaLabel="Filter by SLA state" value={sla} options={["Any", "On Track", "At Risk", "Breached"]} onChange={setSla} />
              </label>
            </span>
          }
        />
        <TableFrame>
          <thead>
            <tr>
              <Th>Ticket ID</Th>
              <Th>Account</Th>
              <Th>Subject</Th>
              <Th>Priority</Th>
              <Th align="right">Age</Th>
              <Th>SLA state</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.id}
                onClick={() => onOpenAccount(t.accountId)}
                role="button"
                aria-label={`Open Account 360 for ${nameFor(t.accountId)}, ticket ${t.id}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenAccount(t.accountId);
                  }
                }}
                className="cursor-pointer transition-colors duration-200 hover:bg-de focus-visible:bg-de"
              >
                <Td mono className="whitespace-nowrap text-dh">
                  {t.id}
                </Td>
                <Td>
                  <span className="block truncate text-table-sm text-dbd">{nameFor(t.accountId)}</span>
                  <span className="num mt-[1px] block text-[11px] text-dm">{t.accountId}</span>
                </Td>
                <Td className="min-w-[280px]">{t.subject}</Td>
                <Td>
                  <Status kind={prioritySemantic(t.priority)} label={t.priority} />
                </Td>
                <Td align="right" mono className={t.ageDays >= 8 ? "text-error" : t.ageDays >= 5 ? "text-warning" : "text-dbd"}>
                  {t.ageDays}d
                </Td>
                <Td>
                  <Status kind={slaSemantic(t.slaState)} label={t.slaState} />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
        {rows.length === 0 ? (
          <div className="px-2 py-2 text-table-sm text-dm">No tickets match the current filters.</div>
        ) : null}
      </Panel>

      <ToolConsole
        tools={["get_open_tickets", "get_customer_health"]}
        title="Tool execution  support desk"
        defaults={{ get_open_tickets: { priority: "Any", slaState: "Breached" } }}
      />
    </PageShell>
  );
}
