import type { Account, RenewalReadiness } from "./types";

/* The prototype pins "today" so the demo dataset stays internally consistent:
   renewal countdowns, quarter grouping and QBR ages all agree with each other
   no matter when the app is opened. Swap to new Date() against live data. */
export const TODAY = new Date("2026-08-21T00:00:00Z");
export const TODAY_ISO = "2026-08-21";

const MS_DAY = 86400000;

export function parseDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function shiftDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(iso: string): number {
  return Math.round((parseDate(iso).getTime() - TODAY.getTime()) / MS_DAY);
}

export function daysSince(iso: string): number {
  return Math.round((TODAY.getTime() - parseDate(iso).getTime()) / MS_DAY);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* 2026-10-02 -> 02 Oct 2026 */
export function fmtDate(iso?: string): string {
  if (!iso) return "Not set";
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "Not set";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* 2026-10-02 09:15 -> 02 Oct, 09:15 */
export function fmtDateTime(value: string): string {
  const [datePart, timePart] = value.split(" ");
  const d = parseDate(datePart);
  const label = `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
  return timePart ? `${label}, ${timePart}` : label;
}

/* 2026-08 -> Aug 26 */
export function fmtMonthKey(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
}

export function fmtCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${(Math.round(m * 100) / 100).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString("en-US")}`;
}

export function fmtCurrencyFull(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function fmtPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function fmtDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/* Quarter key for the renewal timeline, for example 2026-Q4. */
export function quarterKey(iso: string): string {
  const d = parseDate(iso);
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

export function quarterLabel(key: string): string {
  const [year, q] = key.split("-");
  return `${q} ${year}`;
}

/* Renewal readiness is derived, not stored: health score carries most of the
   weight, then a low CSAT, an overdue QBR or an open support load can pull it
   down a band. Kept here so every view computes it identically. */
export function renewalReadiness(account: Account): RenewalReadiness {
  let penalty = 0;
  if (account.csat < 70) penalty += 1;
  if (daysSince(account.lastQbrDate) > 90) penalty += 1;
  if (account.openTickets >= 3) penalty += 1;
  if (account.uptimePct < 97) penalty += 1;

  const days = daysUntil(account.renewalDate);
  const closing = days <= 90;

  if (account.healthScore >= 75 && penalty <= 1) return "On Track";
  if (account.healthScore < 55 || (closing && penalty >= 2)) return "At Risk";
  if (account.healthScore >= 70 && penalty <= 2 && !closing) return "On Track";
  return "Needs Attention";
}

/* The risk chips shown on the Risk table. Uses the stored risk factors where
   present, otherwise derives them from the same signals. */
const RISK_VOCAB = [
  "Declining flight hours",
  "Ticket volume spike",
  "No QBR in 90+ days",
  "CSAT below threshold",
  "Uptime drop",
  "Renewal approaching with low health",
] as const;

export function riskChips(account: Account, limit = 3): string[] {
  const stored = (account.riskFactors ?? []).filter((f) =>
    RISK_VOCAB.some((v) => v.toLowerCase() === f.toLowerCase()),
  );
  if (stored.length) return stored.slice(0, limit);

  const derived: string[] = [];
  if (account.openTickets >= 3) derived.push("Ticket volume spike");
  if (account.csat < 70) derived.push("CSAT below threshold");
  if (account.uptimePct < 97) derived.push("Uptime drop");
  if (daysSince(account.lastQbrDate) > 90) derived.push("No QBR in 90+ days");
  if (account.flightHoursLast30d / Math.max(account.fleetSize, 1) < 10) derived.push("Declining flight hours");
  if (daysUntil(account.renewalDate) <= 90 && account.healthScore < 70) {
    derived.push("Renewal approaching with low health");
  }
  return derived.slice(0, limit);
}

export function accountAge(contractStart: string): string {
  const days = daysSince(contractStart);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years <= 0) return `${months}mo`;
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

export function statusFromScore(score: number): Account["status"] {
  if (score >= 75) return "Healthy";
  if (score >= 55) return "Watch";
  return "At Risk";
}
