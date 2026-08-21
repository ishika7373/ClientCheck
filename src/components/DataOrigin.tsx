import { Database, HardDrives } from "@phosphor-icons/react";
import { useStore } from "../app/storeContext";
import type { DataOrigin } from "../lib/types";

/* States plainly where the numbers on screen came from. Mock data is never
   presented as a Supabase read. */
export function OriginBadge({ origin, note }: { origin: DataOrigin; note?: string }) {
  if (origin === "supabase") {
    return (
      <span className="inline-flex items-center gap-1 border border-de bg-dbg px-2 py-[3px] text-success" title="Rows returned by Supabase.">
        <Database size={13} weight="regular" aria-hidden />
        <span className="eyebrow text-success">Supabase data</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 border border-de bg-dbg px-2 py-[3px] text-warning"
      title={note ?? "Local fallback dataset. Not from Supabase."}
    >
      <HardDrives size={13} weight="regular" aria-hidden />
      <span className="eyebrow text-warning">Fallback data</span>
    </span>
  );
}

export function GlobalOriginBadge() {
  const { origin, snapshot } = useStore();
  return <OriginBadge origin={origin} note={snapshot?.accounts.note} />;
}

/* Full width strip shown under a page heading when the app is running on the
   fallback dataset. */
export function FallbackNotice() {
  const { origin, snapshot, probe } = useStore();
  if (origin === "supabase") return null;
  const note = snapshot?.accounts.note ?? "Supabase is not configured.";
  return (
    <div className="flex items-start gap-2 border border-de bg-ds px-3 py-2">
      <HardDrives size={14} weight="regular" className="mt-[3px] shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <div className="text-table-sm text-dbd">Local fallback dataset in use. These figures did not come from Supabase.</div>
        <div className="mt-[2px] text-table-sm text-dm">
          {note}
          {probe?.state === "connection-error" ? ` Connection error: ${probe.detail}` : ""}
        </div>
      </div>
    </div>
  );
}
