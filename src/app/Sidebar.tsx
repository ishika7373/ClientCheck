import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { BrandMark } from "../components/BrandMark";
import { NAV_ITEMS, type ViewId } from "./views";
import { useStore } from "./storeContext";

/* 240px expanded, 64px collapsed. Active item gets the raised --ds surface and a
   2px Signal Orange edge, never an orange fill. */
export function Sidebar({
  active,
  onSelect,
  collapsed,
  onToggle,
}: {
  active: ViewId;
  onSelect: (id: ViewId) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { currentCsm } = useStore();
  return (
    <nav
      aria-label="Primary"
      className={`flex h-full shrink-0 flex-col border-r border-de bg-ds transition-[width] duration-200 ${
        collapsed ? "w-[64px]" : "w-[240px]"
      }`}
    >
      <div className="flex h-[56px] items-center justify-between border-b border-de px-2">
        {collapsed ? null : (
          <div className="flex min-w-0 items-center gap-2 pl-1">
            <span className="text-o400">
              <BrandMark />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-table leading-[16px] text-dh">FlytBase</span>
   <span className="eyebrow block text-dbd">ClientCheck</span>            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-[32px] w-[32px] items-center justify-center border border-de bg-dbg text-dsc transition-colors duration-200 hover:border-db hover:text-dh ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          {collapsed ? <CaretRight size={13} weight="regular" aria-hidden /> : <CaretLeft size={13} weight="regular" aria-hidden />}
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          const Glyph = item.glyph;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`relative flex w-full items-center gap-2 border-l-2 py-2 pr-2 text-left transition-colors duration-200 ${
                  collapsed ? "justify-center pl-0" : "pl-3"
                } ${
                  isActive
                    ? "border-l-o400 bg-de text-dh"
                    : "border-l-transparent text-dsc hover:bg-de hover:text-dh"
                }`}
              >
                <Glyph size={16} weight="regular" aria-hidden className="shrink-0" />
                {collapsed ? null : <span className="truncate text-table">{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={`border-t border-de px-2 py-2 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <span className="num flex h-[32px] w-[32px] items-center justify-center border border-de bg-dbg text-[11px] text-dsc">
            {currentCsm.initials}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="num flex h-[32px] w-[32px] shrink-0 items-center justify-center border border-de bg-dbg text-[11px] text-dsc">
              {currentCsm.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-table-sm text-dbd">{currentCsm.name}</span>
              <span className="block truncate text-[11px] text-dm">{currentCsm.role}</span>
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
