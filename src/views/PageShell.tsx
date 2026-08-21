import type { ReactNode } from "react";
import { PageHeading } from "../components/primitives";
import { FallbackNotice } from "../components/DataOrigin";

/* Every section shares this frame: one Lora accented heading, an optional
   summary line, the data origin notice, then the content. */
export function PageShell({
  heading,
  accent,
  summary,
  actions,
  children,
}: {
  heading: string;
  accent: string;
  summary?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-shell px-3 py-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <PageHeading text={heading} accent={accent} />
          {summary ? <p className="mt-1 max-w-[70ch] text-body text-dsc">{summary}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-3">
        <FallbackNotice />
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export function SummaryStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-[1px] border border-de bg-de sm:grid-cols-3 lg:grid-cols-5">{children}</div>;
}

export function SummaryCell({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warning" | "error" | "success";
}) {
  const valueTone =
    tone === "error" ? "text-error" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-dh";
  return (
    <div className="bg-ds px-3 py-2">
      <div className="eyebrow">{label}</div>
      <div className={`num mt-1 text-[22px] leading-[28px] ${valueTone}`}>{value}</div>
      {sub ? <div className="mt-[2px] text-table-sm text-dm">{sub}</div> : null}
    </div>
  );
}
