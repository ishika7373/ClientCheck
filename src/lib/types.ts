/* Canonical frontend data model.
   Account, Ticket and ChurnedAccount are fixed by the product spec. Everything
   else hangs off an account id so the three canonical shapes stay clean. */

export type Industry =
  | "Mining"
  | "Oil & Gas"
  | "Security Services"
  | "Maritime Ports"
  | "Electric Utilities"
  | "Public Safety"
  | "Construction"
  | "Data Centers"
  | "Railroad Operations"
  | "Transportation"
  | "Solar";

export type AccountStatus = "Healthy" | "Watch" | "At Risk";

export interface Account {
  id: string;
  name: string;
  industry: Industry;
  healthScore: number;
  status: AccountStatus;
  riskFactors?: string[];
  fleetSize: number;
  flightHoursLast30d: number;
  uptimePct: number;
  openTickets: number;
  csat: number;
  arr: number;
  renewalDate: string;
  lastQbrDate: string;
  csmInitials: string;
}

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type SlaState = "On Track" | "At Risk" | "Breached";

export interface Ticket {
  id: string;
  accountId: string;
  subject: string;
  priority: TicketPriority;
  ageDays: number;
  slaState: SlaState;
}

export interface ChurnedAccount {
  id: string;
  name: string;
  industry: Industry;
  churnDate: string;
  arrLost: number;
  reason: string;
}

/* Operational metadata surfaced in the Account 360 Quick Info panel and the
   Billing tab. Keyed by account id, editable in place. */
export type BillingStatus = "Current" | "Past Due" | "In Collections" | "Prepaid";
export type OperationalStatus = AccountStatus | "Blocked";

export interface AccountMeta {
  accountId: string;
  aeInitials: string;
  aiInboxEnabled: boolean;
  billingStatus: BillingStatus;
  plan: "Fleet Standard" | "Fleet Advanced" | "Fleet Enterprise";
  periodEnd: string;
  walletBalanceUsd: number;
  usageTier: "Under" | "On Plan" | "Over";
  contractStart: string;
  website: string;
  slackChannel: string;
  automationSuccessKit: boolean;
  multiYear: boolean;
  lastMbrDate: string;
  nextMbrDate: string;
  nextQbrDate: string;
  excludeFromMetrics: boolean;
  churnReason: string;
  operationalStatus: OperationalStatus;
  seats: number;
  /* Operator assigned score, kept beside the system computed healthScore. */
  csmHealthScore?: number;
  region: "North America" | "EMEA" | "APAC" | "LATAM";
}

export type RenewalReadiness = "On Track" | "Needs Attention" | "At Risk";

export interface HealthPoint {
  month: string;
  score: number;
}

export interface ChurnRatePoint {
  month: string;
  churnRatePct: number;
  accountsLost: number;
  arrLost: number;
}

export interface AccountNote {
  id: string;
  accountId: string;
  kind: "Note" | "Action";
  body: string;
  authorInitials: string;
  createdAt: string;
  dueDate?: string;
  complete?: boolean;
}

export interface BusinessReview {
  id: string;
  accountId: string;
  type: "MBR" | "QBR" | "EBR";
  date: string;
  healthScoreAtReview: number;
  attendees: string;
  outcome: string;
  ownerInitials: string;
  state: "Completed" | "Scheduled" | "Needs Review";
}

export interface AccountDocument {
  id: string;
  accountId: string;
  name: string;
  type: "MSA" | "Order Form" | "SOW" | "Runbook" | "Security Review" | "QBR Deck";
  updated: string;
  ownerInitials: string;
  state: "Signed" | "Draft" | "In Review" | "Expired";
}

export interface Interaction {
  id: string;
  accountId: string;
  at: string;
  type: "Call" | "Email" | "Meeting" | "Support" | "Business Review";
  summary: string;
  ownerInitials: string;
}

export interface Csm {
  initials: string;
  name: string;
  email: string;
  role: string;
}

/* Where a given slice of data came from. Rendered honestly in the UI so an
   operator is never shown mock numbers labelled as live ones. */
export type DataOrigin = "supabase" | "mock";

export interface Sourced<T> {
  data: T;
  origin: DataOrigin;
  note?: string;
}
