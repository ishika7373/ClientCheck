import { useMemo, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import type { Account } from "../lib/types";
import { daysUntil, fmtCurrencyCompact, fmtDate } from "../lib/format";
import { ScoreMeter, Status, TableFrame, Td, Th, type Semantic } from "./primitives";

/* One table shape reused by the Dashboard and My Portfolio. Rows open the
   Account 360 workspace. */

export function statusSemantic(status: Account["status"]): Semantic {
  if (status === "Healthy") return "success";
  if (status === "Watch") return "warning";
  return "error";
}

type SortKey = "name" | "healthScore" | "arr" | "renewalDate" | "openTickets" | "csat";
type ColumnId = "name" | "industry" | "health" | "status" | "arr" | "renewal" | "tickets" | "csat" | "csm";

const COLUMNS: { id: ColumnId; key: SortKey | null; label: string; align?: "left" | "right" }[] = [
  { id: "name", key: "name", label: "Account" },
  { id: "industry", key: null, label: "Industry" },
  { id: "health", key: "healthScore", label: "Health" },
  { id: "status", key: null, label: "Status" },
  { id: "arr", key: "arr", label: "ARR", align: "right" },
  { id: "renewal", key: "renewalDate", label: "Renewal" },
  { id: "tickets", key: "openTickets", label: "Tickets", align: "right" },
  { id: "csat", key: "csat", label: "CSAT", align: "right" },
  { id: "csm", key: null, label: "CSM" },
];

/* The Dashboard gives the table roughly 70 percent of a 1200px shell, which is
   not enough for all nine columns at this density, so it drops the two widest
   non-essential ones rather than clipping the row behind a scrollbar. */
const COMPACT_COLUMNS: ColumnId[] = ["name", "health", "status", "arr", "renewal", "csm"];

export function AccountTable({
  accounts,
  onOpen,
  variant = "full",
}: {
  accounts: Account[];
  onOpen: (id: string) => void;
  variant?: "full" | "compact";
}) {
  const compact = variant === "compact";
  const shown = compact ? COLUMNS.filter((c) => COMPACT_COLUMNS.includes(c.id)) : COLUMNS;
  const minWidth = compact ? "min-w-[560px]" : "min-w-[960px]";
  const show = (id: ColumnId) => !compact || COMPACT_COLUMNS.includes(id);
  const [sort, setSort] = useState<SortKey>("healthScore");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const sorted = [...accounts].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return dir === "asc" ? sorted : sorted.reverse();
  }, [accounts, sort, dir]);

  function toggle(key: SortKey) {
    if (key === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir(key === "name" ? "asc" : "asc");
    }
  }

  return (
    <div className={`w-full overflow-x-auto`}>
      <table className={`w-full ${minWidth} border-collapse text-left`}>
        <thead>
          <tr>
            {shown.map((c) => (
              <Th key={c.label} align={c.align} dense={compact}>
                {c.key ? (
                  <button
                    type="button"
                    onClick={() => toggle(c.key as SortKey)}
                    className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-dsc"
                  >
                    {c.label}
                    {sort === c.key ? (
                      dir === "asc" ? (
                        <CaretUp size={9} weight="bold" aria-hidden />
                      ) : (
                        <CaretDown size={9} weight="bold" aria-hidden />
                      )
                    ) : null}
                  </button>
                ) : (
                  c.label
                )}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const days = daysUntil(a.renewalDate);
            return (
              <tr
                key={a.id}
                onClick={() => onOpen(a.id)}
                role="button"
                aria-label={`Open Account 360 for ${a.name}, ${a.id}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(a.id);
                  }
                }}
                className="cursor-pointer transition-colors duration-200 hover:bg-de focus-visible:bg-de"
              >
                <Td>
                  <span className="block truncate text-table text-dh">{a.name}</span>
                  <span className="num mt-[1px] block text-[11px] text-dm">
                    {compact ? `${a.id}  ${a.industry}` : a.id}
                  </span>
                </Td>
                {show("industry") ? <Td dense={compact} className="text-dsc">{a.industry}</Td> : null}
                <Td>
                  <ScoreMeter score={a.healthScore} />
                </Td>
                <Td>
                  <Status kind={statusSemantic(a.status)} label={a.status} />
                </Td>
                <Td dense={compact} align="right" mono className="whitespace-nowrap text-dh">
                  {fmtCurrencyCompact(a.arr)}
                </Td>
                <Td dense={compact} className="whitespace-nowrap">
                  <span className="num text-dbd">{fmtDate(a.renewalDate)}</span>
                  <span className={`num mt-[1px] block text-[11px] ${days <= 60 ? "text-warning" : "text-dm"}`}>{days}d</span>
                </Td>
                {show("tickets") ? (
                  <Td dense={compact} align="right" mono className={a.openTickets >= 3 ? "text-error" : "text-dbd"}>
                    {a.openTickets}
                  </Td>
                ) : null}
                {show("csat") ? (
                  <Td dense={compact} align="right" mono className={a.csat < 70 ? "text-error" : a.csat < 80 ? "text-warning" : "text-dbd"}>
                    {a.csat}%
                  </Td>
                ) : null}
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
      {rows.length === 0 ? (
        <div className="px-2 py-2 text-table-sm text-dm">No accounts match the current scope.</div>
      ) : null}
    </div>
  );
}

/* Compact three column variant used inside the Account 360 right rail and other
   tight spaces. */
export function MiniAccountList({ accounts, onOpen }: { accounts: Account[]; onOpen: (id: string) => void }) {
  return (
    <TableFrame className="min-w-0">
      <tbody>
        {accounts.map((a) => (
          <tr key={a.id} onClick={() => onOpen(a.id)} className="cursor-pointer transition-colors duration-200 hover:bg-de">
            <Td>
              <span className="block truncate text-table-sm text-dbd">{a.name}</span>
            </Td>
            <Td align="right" mono>
              {a.healthScore}
            </Td>
            <Td align="right" mono>
              {fmtCurrencyCompact(a.arr)}
            </Td>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  );
}
