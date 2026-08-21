import type { ChurnRatePoint, ChurnedAccount } from "../lib/types";

/* Fallback dataset. Separate from the active portfolio: a churned account is
   never a row in MOCK_ACCOUNTS. */
export const MOCK_CHURNED_ACCOUNTS: ChurnedAccount[] = [
  { id: "CHU-0912", name: "Foothill Aggregates", industry: "Mining", churnDate: "2026-07-31", arrLost: 185000, reason: "Consolidated to a competing platform" },
  { id: "CHU-0908", name: "Tidewater Marine Terminal", industry: "Maritime Ports", churnDate: "2026-05-15", arrLost: 240000, reason: "Site decommissioned" },
  { id: "CHU-0903", name: "Sable Creek Energy", industry: "Oil & Gas", churnDate: "2026-03-31", arrLost: 310000, reason: "Budget reduction after asset sale" },
  { id: "CHU-0900", name: "Northgate Quarry", industry: "Construction", churnDate: "2026-02-27", arrLost: 128000, reason: "Consolidated to a competing platform" },
  { id: "CHU-0897", name: "Copperline Transit", industry: "Transportation", churnDate: "2026-01-31", arrLost: 145000, reason: "Program ended after pilot phase" },
  { id: "CHU-0891", name: "Vantage Yard Services", industry: "Security Services", churnDate: "2025-11-30", arrLost: 96000, reason: "Moved to a managed service provider" },
  { id: "CHU-0885", name: "Pinnacle Grid Works", industry: "Electric Utilities", churnDate: "2025-09-30", arrLost: 275000, reason: "Moved to in-house flight operations" },
];

/* Trailing 12 months, oldest first. churnRatePct is ARR lost in the month over
   portfolio ARR at the start of that month. */
export const MOCK_CHURN_RATE: ChurnRatePoint[] = [
  { month: "2025-09", churnRatePct: 3.1, accountsLost: 1, arrLost: 275000 },
  { month: "2025-10", churnRatePct: 0.0, accountsLost: 0, arrLost: 0 },
  { month: "2025-11", churnRatePct: 1.1, accountsLost: 1, arrLost: 96000 },
  { month: "2025-12", churnRatePct: 0.0, accountsLost: 0, arrLost: 0 },
  { month: "2026-01", churnRatePct: 1.7, accountsLost: 1, arrLost: 145000 },
  { month: "2026-02", churnRatePct: 1.5, accountsLost: 1, arrLost: 128000 },
  { month: "2026-03", churnRatePct: 3.8, accountsLost: 1, arrLost: 310000 },
  { month: "2026-04", churnRatePct: 0.0, accountsLost: 0, arrLost: 0 },
  { month: "2026-05", churnRatePct: 3.0, accountsLost: 1, arrLost: 240000 },
  { month: "2026-06", churnRatePct: 0.0, accountsLost: 0, arrLost: 0 },
  { month: "2026-07", churnRatePct: 2.4, accountsLost: 1, arrLost: 185000 },
  { month: "2026-08", churnRatePct: 0.0, accountsLost: 0, arrLost: 0 },
];
