import type {
  Account,
  AccountDocument,
  AccountMeta,
  AccountNote,
  BusinessReview,
  Industry,
  Interaction,
} from "../lib/types";
import { fmtDate, shiftDays } from "../lib/format";

/* Account level activity for the Account 360 tabs. Records are derived from the
   account's own dates and industry so every row reads like it belongs to that
   specific site rather than to a generic template. */

interface Vocabulary {
  missions: [string, string, string];
  asset: string;
  stakeholder: string;
  metric: string;
}

const VOCABULARY: Record<Industry, Vocabulary> = {
  Mining: { missions: ["pit wall scan", "haul road survey", "stockpile volume run"], asset: "pit", stakeholder: "Mine Technical Services", metric: "stockpile reconciliation variance" },
  "Oil & Gas": { missions: ["flare stack inspection", "tank farm sweep", "pipeline right of way patrol"], asset: "terminal", stakeholder: "Process Safety", metric: "inspection backlog" },
  "Security Services": { missions: ["perimeter patrol", "alarm response flight", "gate camera sweep"], asset: "site", stakeholder: "Guard Force Operations", metric: "alarm response time" },
  "Maritime Ports": { missions: ["container yard sweep", "berth approach survey", "crane rail inspection"], asset: "terminal", stakeholder: "Harbour Operations", metric: "yard cycle time" },
  "Electric Utilities": { missions: ["transmission corridor scan", "substation thermal pass", "storm damage assessment"], asset: "substation", stakeholder: "Asset Management", metric: "corridor kilometres inspected" },
  "Public Safety": { missions: ["incident overwatch", "search pattern flight", "crowd flow monitoring"], asset: "district", stakeholder: "Communications Centre", metric: "time to first aerial view" },
  Construction: { missions: ["site progress capture", "earthwork volume run", "crane radius check"], asset: "site", stakeholder: "Project Controls", metric: "progress claim accuracy" },
  "Data Centers": { missions: ["roof chiller inspection", "generator yard sweep", "perimeter fence check"], asset: "campus", stakeholder: "Critical Facilities", metric: "planned inspection completion" },
  "Railroad Operations": { missions: ["track inspection run", "yard inventory sweep", "bridge undercarriage scan"], asset: "yard", stakeholder: "Engineering Services", metric: "track kilometres inspected" },
  Transportation: { missions: ["depot yard sweep", "trailer inventory count", "fuel island inspection"], asset: "depot", stakeholder: "Network Operations", metric: "trailer count accuracy" },
  Solar: { missions: ["array thermal sweep", "inverter pad inspection", "vegetation encroachment scan"], asset: "array block", stakeholder: "Plant Performance", metric: "module fault detection rate" },
};

function trend(account: Account) {
  if (account.status === "At Risk") return "down";
  if (account.status === "Watch") return "flat";
  return "up";
}

export function buildInteractions(account: Account, meta: AccountMeta): Interaction[] {
  const v = VOCABULARY[account.industry];
  const t = trend(account);
  const rows: Interaction[] = [
    {
      id: `${account.id}-INT-1`,
      accountId: account.id,
      at: `${shiftDays(meta.lastMbrDate, 0)} 10:00`,
      type: "Business Review",
      summary: `Monthly review with ${v.stakeholder}. Walked ${account.flightHoursLast30d} flight hours and ${v.metric}.`,
      ownerInitials: account.csmInitials,
    },
    {
      id: `${account.id}-INT-2`,
      accountId: account.id,
      at: `${shiftDays(meta.lastMbrDate, 4)} 14:30`,
      type: "Email",
      summary:
        t === "down"
          ? `Sent escalation summary covering the ${v.missions[0]} failures and the recovery plan owner.`
          : `Sent the ${v.missions[0]} adoption summary and next month's mission plan.`,
      ownerInitials: account.csmInitials,
    },
    {
      id: `${account.id}-INT-3`,
      accountId: account.id,
      at: `${shiftDays(meta.lastMbrDate, 9)} 09:15`,
      type: "Call",
      summary:
        t === "down"
          ? `Operations lead raised repeat docking aborts at the main ${v.asset}. Agreed a joint reliability review.`
          : `Operations lead confirmed the ${v.missions[1]} is now on the standing schedule.`,
      ownerInitials: meta.aeInitials,
    },
    {
      id: `${account.id}-INT-4`,
      accountId: account.id,
      at: `${shiftDays(meta.lastMbrDate, 15)} 16:00`,
      type: "Support",
      summary:
        account.openTickets > 0
          ? `Support bridge on the open ${account.openTickets === 1 ? "ticket" : "tickets"}. Field engineer scheduled for the ${v.asset}.`
          : `Proactive check on dock telemetry. No action required, uptime holding at ${account.uptimePct}%.`,
      ownerInitials: "SUP",
    },
    {
      id: `${account.id}-INT-5`,
      accountId: account.id,
      at: `${shiftDays(meta.lastMbrDate, 21)} 11:00`,
      type: "Meeting",
      summary:
        t === "down"
          ? `Renewal risk session with ${v.stakeholder}. Budget holder wants a reliability commitment before signature.`
          : `Expansion session on adding ${v.missions[2]} coverage to the ${v.asset}.`,
      ownerInitials: meta.aeInitials,
    },
  ];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

export function buildNotes(account: Account, meta: AccountMeta): AccountNote[] {
  const v = VOCABULARY[account.industry];
  const t = trend(account);
  const rows: AccountNote[] = [
    {
      id: `${account.id}-NOTE-1`,
      accountId: account.id,
      kind: "Note",
      body:
        t === "down"
          ? `Health at ${account.healthScore} driven by CSAT ${account.csat}% and uptime ${account.uptimePct}%. ${v.stakeholder} is the escalation owner.`
          : `Health steady at ${account.healthScore}. ${v.stakeholder} treats the ${v.missions[0]} as a standing operational dependency.`,
      authorInitials: account.csmInitials,
      createdAt: `${shiftDays(meta.lastMbrDate, 2)} 09:40`,
    },
    {
      id: `${account.id}-NOTE-2`,
      accountId: account.id,
      kind: "Action",
      body:
        t === "down"
          ? `Publish a reliability recovery plan for the ${v.asset} and review it with the budget holder.`
          : `Confirm the ${v.missions[2]} scope for next quarter and size the seat increase.`,
      authorInitials: account.csmInitials,
      createdAt: `${shiftDays(meta.lastMbrDate, 6)} 15:05`,
      dueDate: shiftDays(meta.nextMbrDate, -3),
      complete: false,
    },
    {
      id: `${account.id}-NOTE-3`,
      accountId: account.id,
      kind: "Action",
      body: `Send the ${v.metric} summary ahead of the next business review.`,
      authorInitials: meta.aeInitials,
      createdAt: `${shiftDays(meta.lastMbrDate, 11)} 12:20`,
      dueDate: shiftDays(meta.lastMbrDate, 18),
      complete: true,
    },
    {
      id: `${account.id}-NOTE-4`,
      accountId: account.id,
      kind: "Note",
      body:
        account.openTickets > 0
          ? `Open support load is ${account.openTickets}. Field engineering visit logged against the ${v.asset}.`
          : `No open support tickets. Fleet of ${account.fleetSize} flying ${account.flightHoursLast30d} hours in the last 30 days.`,
      authorInitials: "SUP",
      createdAt: `${shiftDays(meta.lastMbrDate, 16)} 08:55`,
    },
  ];
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildBusinessReviews(account: Account, meta: AccountMeta): BusinessReview[] {
  const v = VOCABULARY[account.industry];
  const t = trend(account);
  const scoreAtQbr = Math.min(100, account.healthScore + (t === "down" ? 14 : t === "flat" ? 8 : -3));
  const scoreAtMbr = Math.min(100, account.healthScore + (t === "down" ? 5 : t === "flat" ? 3 : -1));
  return [
    {
      id: `${account.id}-BR-3`,
      accountId: account.id,
      type: "QBR",
      date: meta.nextQbrDate,
      healthScoreAtReview: account.healthScore,
      attendees: `${account.csmInitials}, ${meta.aeInitials}, ${v.stakeholder}`,
      outcome:
        t === "up"
          ? "Agenda set: usage review, expansion scope, next year mission plan."
          : "Agenda set: reliability recovery, CSAT recovery plan, renewal decision path.",
      ownerInitials: account.csmInitials,
      state: "Scheduled",
    },
    {
      id: `${account.id}-BR-2`,
      accountId: account.id,
      type: "MBR",
      date: meta.lastMbrDate,
      healthScoreAtReview: scoreAtMbr,
      attendees: `${account.csmInitials}, ${v.stakeholder}`,
      outcome:
        t === "down"
          ? `Reviewed ${v.missions[0]} aborts and the docking failures. Two actions carried forward.`
          : `Reviewed ${account.flightHoursLast30d} flight hours and ${v.metric}. No blockers raised.`,
      ownerInitials: account.csmInitials,
      state: t === "down" ? "Needs Review" : "Completed",
    },
    {
      id: `${account.id}-BR-1`,
      accountId: account.id,
      type: "QBR",
      date: account.lastQbrDate,
      healthScoreAtReview: scoreAtQbr,
      attendees: `${account.csmInitials}, ${meta.aeInitials}, ${v.stakeholder}`,
      outcome: `Committed the ${v.missions[1]} to a standing schedule across ${meta.seats} operator seats.`,
      ownerInitials: meta.aeInitials,
      state: "Completed",
    },
  ];
}

export function buildDocuments(account: Account, meta: AccountMeta): AccountDocument[] {
  const rows: AccountDocument[] = [
    { id: `${account.id}-DOC-1`, accountId: account.id, name: `Master Services Agreement ${meta.contractStart.slice(0, 4)}`, type: "MSA", updated: meta.contractStart, ownerInitials: meta.aeInitials, state: "Signed" },
    { id: `${account.id}-DOC-2`, accountId: account.id, name: `Order Form ${meta.plan} ${meta.seats} seats`, type: "Order Form", updated: shiftDays(meta.contractStart, 4), ownerInitials: meta.aeInitials, state: "Signed" },
    { id: `${account.id}-DOC-3`, accountId: account.id, name: "Flight Operations Runbook", type: "Runbook", updated: shiftDays(meta.lastMbrDate, -12), ownerInitials: account.csmInitials, state: account.status === "At Risk" ? "In Review" : "Signed" },
    { id: `${account.id}-DOC-4`, accountId: account.id, name: `QBR Deck ${fmtDate(account.lastQbrDate)}`, type: "QBR Deck", updated: account.lastQbrDate, ownerInitials: account.csmInitials, state: "Signed" },
    { id: `${account.id}-DOC-5`, accountId: account.id, name: "Security and Data Residency Review", type: "Security Review", updated: shiftDays(meta.contractStart, 21), ownerInitials: "SEC", state: meta.multiYear ? "Signed" : "Expired" },
  ];
  if (account.status !== "Healthy") {
    rows.push({
      id: `${account.id}-DOC-6`,
      accountId: account.id,
      name: "Reliability Recovery Plan",
      type: "SOW",
      updated: shiftDays(meta.lastMbrDate, 3),
      ownerInitials: account.csmInitials,
      state: "Draft",
    });
  }
  return rows.sort((a, b) => b.updated.localeCompare(a.updated));
}
