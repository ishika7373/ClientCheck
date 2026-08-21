import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useStore } from "./storeContext";
import { GlobalOriginBadge } from "../components/DataOrigin";
import { statusSemantic } from "../components/AccountTable";
import { Status } from "../components/primitives";
import { fmtCurrencyCompact } from "../lib/format";

/* Persistent global account search. Searches the whole account snapshot by name
   or by account id, never just the rows in the current table. */
export function TopBar({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const { accounts } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return accounts
      .filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
      .slice(0, 8);
  }, [accounts, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setCursor(0), [query]);

  function choose(id: string) {
    onOpenAccount(id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[cursor].id);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-[56px] shrink-0 items-center gap-3 border-b border-de bg-dbg px-3 sm:px-6">
      <div ref={wrapRef} className="relative w-full max-w-[440px]">
        <div className="flex items-center gap-2 border border-de bg-ds px-2 py-1 transition-colors duration-200 focus-within:border-db">
          <MagnifyingGlass size={14} weight="regular" className="shrink-0 text-dm" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKey}
            aria-label="Search accounts by name or account ID"
            placeholder="Search accounts by name or ID"
            className="min-w-0 flex-1 bg-transparent text-table-sm text-dbd outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 text-dm transition-colors duration-200 hover:text-dh"
            >
              <X size={12} weight="regular" aria-hidden />
            </button>
          ) : (
            <span className="num shrink-0 border border-de px-1 py-[1px] text-[10px] text-dm">&#8984; K</span>
          )}
        </div>

        {open && query.trim() ? (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 border border-db bg-ds">
            <div className="border-b border-de px-2 py-1">
              <span className="eyebrow">
                {results.length} of {accounts.length} accounts
              </span>
            </div>
            {results.length === 0 ? (
              <div className="px-2 py-2 text-table-sm text-dm">
                No account matches &quot;{query.trim()}&quot;. Search by account name or by an ID such as ACC-1042.
              </div>
            ) : (
              <ul>
                {results.map((a, i) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => choose(a.id)}
                      className={`flex w-full items-center gap-3 border-b border-de px-2 py-1 text-left transition-colors duration-200 last:border-b-0 ${
                        i === cursor ? "bg-de" : "hover:bg-de"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-table-sm text-dh">{a.name}</span>
                        <span className="num block text-[11px] text-dm">
                          {a.id}  {a.industry}  {a.csmInitials}
                        </span>
                      </span>
                      <span className="num shrink-0 text-table-sm text-dbd">{fmtCurrencyCompact(a.arr)}</span>
                      <span className="num shrink-0 text-table-sm text-dh">{a.healthScore}</span>
                      <span className="shrink-0">
                        <Status kind={statusSemantic(a.status)} label={a.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlobalOriginBadge />
      </div>
    </header>
  );
}
