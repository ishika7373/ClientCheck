import {
  ArrowSquareOut,
  CaretDown,
  CheckCircle,
  ClipboardText,
  Info,
  Spinner,
  Warning,
  WarningOctagon,
  type Icon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

/* Shared building blocks. Everything is square, flat and borderless except for
   the 1px --de hairline. Colour only ever arrives through a token class. */

export type Semantic = "success" | "warning" | "error" | "info" | "progress" | "review";

const SEMANTIC_ICON: Record<Semantic, Icon> = {
  success: CheckCircle,
  warning: Warning,
  error: WarningOctagon,
  info: Info,
  progress: Spinner,
  review: ClipboardText,
};

const SEMANTIC_TEXT: Record<Semantic, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  progress: "text-progress",
  review: "text-review",
};

/* Status is always icon plus text plus colour. Colour alone is never the
   carrier of meaning. */
export function Status({ kind, label, className = "" }: { kind: Semantic; label: string; className?: string }) {
  const Glyph = SEMANTIC_ICON[kind];
  return (
    <span className={`inline-flex items-center gap-1 ${SEMANTIC_TEXT[kind]} ${className}`}>
      <Glyph size={13} weight="regular" aria-hidden />
      <span className="text-table-sm">{label}</span>
    </span>
  );
}

export function StatusPill({ kind, label }: { kind: Semantic; label: string }) {
  const Glyph = SEMANTIC_ICON[kind];
  return (
    <span className={`inline-flex items-center gap-1 border border-de bg-dbg px-2 py-[3px] ${SEMANTIC_TEXT[kind]}`}>
      <Glyph size={13} weight="regular" aria-hidden />
      <span className="text-table-sm">{label}</span>
    </span>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

/* Exactly one page heading per section. The final word is Lora italic. */
export function PageHeading({ text, accent }: { text: string; accent: string }) {
  return (
    <h1 className="text-page font-normal text-dh">
      {text}{" "}
      <span className="font-lora italic">{accent}</span>
    </h1>
  );
}

export function Panel({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}) {
  return <Tag className={`border border-de bg-ds ${className}`}>{children}</Tag>;
}

export function PanelHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-de px-3 py-2">
      <Eyebrow>{title}</Eyebrow>
      {right}
    </div>
  );
}

/* The one place a framed icon square is allowed by the brand system. */
export function IconFrame({ glyph: Glyph, size = 32 }: { glyph: Icon; size?: 32 | 40 }) {
  const box = size === 40 ? "h-[40px] w-[40px]" : "h-[32px] w-[32px]";
  return (
    <span className={`${box} inline-flex items-center justify-center border border-de bg-dbg text-dsc`}>
      <Glyph size={size === 40 ? 18 : 15} weight="regular" aria-hidden />
    </span>
  );
}

export type ButtonTone = "primary" | "default" | "quiet" | "danger";

const TONE: Record<ButtonTone, string> = {
  primary: "border-o400 bg-o400 text-dbg hover:bg-o200 hover:border-o200",
  default: "border-de bg-ds text-dbd hover:border-db hover:text-dh",
  quiet: "border-transparent bg-transparent text-dsc hover:text-dh hover:border-de",
  danger: "border-de bg-ds text-error hover:border-error",
};

export function Button({
  children,
  onClick,
  tone = "default",
  glyph: Glyph,
  disabled,
  type = "button",
  className = "",
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  glyph?: Icon;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 border px-2 py-1 text-table-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${TONE[tone]} ${className}`}
    >
      {Glyph ? <Glyph size={14} weight="regular" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-2 py-1">
      <span className="min-w-0">
        <span className="block text-table text-dbd">{label}</span>
        {hint ? <span className="mt-[2px] block text-table-sm text-dm">{hint}</span> : null}
      </span>
      <span className="relative mt-[2px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-[16px] w-[30px] cursor-pointer appearance-none border border-db bg-dbg transition-colors duration-200 checked:border-dbd checked:bg-dbd"
        />
        <span className="pointer-events-none absolute left-[2px] top-[2px] h-[10px] w-[12px] bg-dm transition-transform duration-200 peer-checked:translate-x-[14px] peer-checked:bg-dbg" />
      </span>
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-de bg-dbg py-1 pl-2 pr-6 text-table-sm text-dbd transition-colors duration-200 hover:border-db"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <CaretDown size={11} weight="regular" className="pointer-events-none absolute right-2 text-dm" aria-hidden />
    </span>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  mono,
  className = "",
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
  mono?: boolean;
  className?: string;
  type?: "text" | "number" | "date";
}) {
  return (
    <input
      type={type}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-de bg-dbg px-2 py-1 text-table-sm text-dbd transition-colors duration-200 hover:border-db ${
        mono ? "num" : ""
      } ${className}`}
    />
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href.startsWith("http") ? href : `https://${href}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-table-sm text-dbd underline decoration-de underline-offset-2 transition-colors duration-200 hover:text-dh hover:decoration-db"
    >
      {children}
      <ArrowSquareOut size={12} weight="regular" aria-hidden />
    </a>
  );
}

/* Horizontal score meter. Fixed step widths keep it on the spacing grid and
   avoid inline styles. */
export function ScoreMeter({ score }: { score: number }) {
  const kind: Semantic = score >= 75 ? "success" : score >= 55 ? "warning" : "error";
  const bar = kind === "success" ? "bg-success" : kind === "warning" ? "bg-warning" : "bg-error";
  const step = Math.max(1, Math.min(10, Math.round(score / 10)));
  return (
    <span className="inline-flex items-center gap-2" title={`Health score ${score} of 100`}>
      <span className="num text-table tabular-nums text-dh">{String(score).padStart(2, "0")}</span>
      <span className="inline-flex h-[6px] w-[60px] gap-[2px]" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-full w-[4px] ${i < step ? bar : "bg-de"}`} />
        ))}
      </span>
    </span>
  );
}

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warning" | "error" }) {
  const cls =
    tone === "error" ? "border-de text-error" : tone === "warning" ? "border-de text-warning" : "border-de text-dsc";
  return <span className={`inline-block border bg-dbg px-1 py-[2px] text-table-sm ${cls}`}>{label}</span>;
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-de py-1 last:border-b-0">
      <span className="eyebrow shrink-0">{label}</span>
      <span className="min-w-0 truncate text-right text-table-sm text-dbd">{children}</span>
    </div>
  );
}

export function Metric({ label, value, sub, semantic }: { label: string; value: string; sub?: string; semantic?: Semantic }) {
  const tone = semantic ? SEMANTIC_TEXT[semantic] : "text-dh";
  return (
    <div className="min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <div className={`num mt-1 text-[20px] leading-[26px] ${tone}`}>{value}</div>
      {sub ? <div className="mt-[2px] text-table-sm text-dm">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({ title, detail, glyph }: { title: string; detail: string; glyph?: Icon }) {
  return (
    <div className="flex items-start gap-2 px-3 py-4">
      {glyph ? <IconFrame glyph={glyph} /> : null}
      <div className="min-w-0">
        <div className="text-table text-dbd">{title}</div>
        <div className="mt-[2px] text-table-sm text-dm">{detail}</div>
      </div>
    </div>
  );
}

/* Tables are horizontally scrollable rather than reflowed, so density survives
   on narrow viewports. */
export function TableFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full min-w-[720px] border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
  dense,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  dense?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`eyebrow whitespace-nowrap border-b border-de py-1 font-normal ${dense ? "px-1" : "px-2"} ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  mono,
  dense,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  mono?: boolean;
  dense?: boolean;
}) {
  return (
    <td
      className={`border-b border-de py-1 text-table-sm text-dbd ${dense ? "px-1" : "px-2"} ${align === "right" ? "text-right" : ""} ${
        mono ? "num" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}
