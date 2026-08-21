import { useMemo, useState } from "react";
import {
  ArrowsClockwise,
  CalendarBlank,
  ChatCircleText,
  CheckCircle,
  Circle,
  Envelope,
  FileText,
  Notebook,
  PhoneCall,
  Plus,
  Presentation,
  Ticket as TicketIcon,
  Users,
} from "@phosphor-icons/react";
import { useStore, type ActivityEvent } from "../app/storeContext";
import { HealthTrendChart } from "../components/charts";
import {
  Button,
  Chip,
  Eyebrow,
  KeyValue,
  Panel,
  PanelHeader,
  ScoreMeter,
  Select,
  Status,
  TableFrame,
  Td,
  Th,
  TextInput,
  type Semantic,
} from "../components/primitives";
import { statusSemantic } from "../components/AccountTable";
import { prioritySemantic, slaSemantic } from "../views/SupportTools";
import { ToolConsole, ToolRunRecord } from "../components/ToolConsole";
import { accountHealthTrend } from "../data/accounts";
import {
  accountAge,
  daysSince,
  daysUntil,
  fmtCurrencyCompact,
  fmtCurrencyFull,
  fmtDate,
  fmtDateTime,
  renewalReadiness,
  riskChips,
} from "../lib/format";
import type { Account, AccountMeta, OperationalStatus, RenewalReadiness } from "../lib/types";

const READINESS_SEMANTIC: Record<RenewalReadiness, Semantic> = {
  "On Track": "success",
  "Needs Attention": "warning",
  "At Risk": "error",
};

interface TabProps {
  account: Account;
  meta: AccountMeta;
}

/* A titled section of grouped rows. Used instead of turning every metric into a
   floating card. */
function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Panel>
      <PanelHeader title={title} right={right} />
      <div className="px-3 py-1">{children}</div>
    </Panel>
  );
}

/* ------------------------------ Overview ------------------------------ */

const OP_STATUS: OperationalStatus[] = ["Healthy", "Watch", "At Risk", "Blocked"];

function opSemantic(s: OperationalStatus): Semantic {
  if (s === "Healthy") return "success";
  if (s === "Watch") return "warning";
  if (s === "At Risk") return "error";
  return "error";
}

export function OverviewTab({ account, meta }: TabProps) {
  const { patchMeta, patchAccount, activityFor, csmRoster } = useStore();
  const trend = useMemo(() => accountHealthTrend(account.id, account.healthScore), [account.id, account.healthScore]);
  const chips = riskChips(account, 3);
  const ready = renewalReadiness(account);
  const activity = activityFor(account.id);
  const csm = csmRoster.find((c) => c.initials === account.csmInitials);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Health"
            right={<Status kind={statusSemantic(account.status)} label={account.status} />}
          />
          <div className="grid grid-cols-3 gap-[1px] border-b border-de bg-de">
            <div className="bg-ds px-3 py-2">
              <Eyebrow>Score</Eyebrow>
              <div className="mt-1">
                <ScoreMeter score={account.healthScore} />
              </div>
            </div>
            <div className="bg-ds px-3 py-2">
              <Eyebrow>CSM assessment</Eyebrow>
              <div className="num mt-1 text-[18px] text-dh">{meta.csmHealthScore ?? account.healthScore}</div>
            </div>
            <div className="bg-ds px-3 py-2">
              <Eyebrow>6-month change</Eyebrow>
              <div
                className={`num mt-1 text-[18px] ${
                  trend[trend.length - 1].score - trend[0].score >= 0 ? "text-success" : "text-error"
                }`}
              >
                {trend[trend.length - 1].score - trend[0].score > 0 ? "+" : ""}
                {trend[trend.length - 1].score - trend[0].score}
              </div>
            </div>
          </div>
          <div className="px-2 py-2">
            <HealthTrendChart data={trend} height={148} />
          </div>
          <div className="border-t border-de px-3 py-2">
            <Eyebrow>Risk factors</Eyebrow>
            <div className="mt-1 flex flex-wrap gap-1">
              {chips.length ? (
                chips.map((c) => <Chip key={c} label={c} tone={account.status === "At Risk" ? "error" : "warning"} />)
              ) : (
                <Status kind="success" label="No active risk signals" />
              )}
            </div>
          </div>
        </Panel>

        <div className="space-y-3">
          <Section
            title="Commercial"
            right={<Status kind={READINESS_SEMANTIC[ready]} label={ready} />}
          >
            <KeyValue label="ARR">{fmtCurrencyFull(account.arr)}</KeyValue>
            <KeyValue label="Renewal date">{fmtDate(account.renewalDate)}</KeyValue>
            <KeyValue label="Days to renewal">{`${daysUntil(account.renewalDate)}d`}</KeyValue>
            <KeyValue label="Renewal readiness">
              <Status kind={READINESS_SEMANTIC[ready]} label={ready} />
            </KeyValue>
            <KeyValue label="Account age">{accountAge(meta.contractStart)}</KeyValue>
            <KeyValue label="Contract start">{fmtDate(meta.contractStart)}</KeyValue>
            <KeyValue label="Multi-year">{meta.multiYear ? "Yes" : "No"}</KeyValue>
          </Section>

          <Section title="Account status" right={<span className="num text-[11px] text-dm">operational classification</span>}>
            <KeyValue label="Current">
              <Status kind={opSemantic(meta.operationalStatus)} label={meta.operationalStatus} />
            </KeyValue>
            <KeyValue label="Set status">
              <Select
                ariaLabel="Set account status"
                value={meta.operationalStatus}
                options={OP_STATUS}
                onChange={(v) => {
                  const next = v as OperationalStatus;
                  patchMeta(account.id, { operationalStatus: next }, `Operational status set to ${next}.`);
                  if (next !== "Blocked") {
                    patchAccount(account.id, { status: next as Account["status"] }, `Account status set to ${next}.`);
                  }
                }}
              />
            </KeyValue>
            <KeyValue label="Excluded from metrics">{meta.excludeFromMetrics ? "Yes" : "No"}</KeyValue>
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Section title="Operations" right={<span className="num text-[11px] text-dm">last 30 days</span>}>
          <KeyValue label="Fleet size">{account.fleetSize}</KeyValue>
          <KeyValue label="Flight hours">{account.flightHoursLast30d.toLocaleString("en-US")}</KeyValue>
          <KeyValue label="Hours per aircraft">
            {(account.flightHoursLast30d / Math.max(account.fleetSize, 1)).toFixed(1)}
          </KeyValue>
          <KeyValue label="Uptime">
            <Status
              kind={account.uptimePct >= 98 ? "success" : account.uptimePct >= 96 ? "warning" : "error"}
              label={`${account.uptimePct}%`}
            />
          </KeyValue>
          <KeyValue label="Open tickets">
            <Status
              kind={account.openTickets === 0 ? "success" : account.openTickets >= 3 ? "error" : "warning"}
              label={String(account.openTickets)}
            />
          </KeyValue>
          <KeyValue label="CSAT">
            <Status
              kind={account.csat >= 80 ? "success" : account.csat >= 70 ? "warning" : "error"}
              label={`${account.csat}%`}
            />
          </KeyValue>
        </Section>

        <Section title="Customer success" right={<span className="num text-[11px] text-dm">review cadence and ownership</span>}>
          <KeyValue label="Last MBR">{fmtDate(meta.lastMbrDate)}</KeyValue>
          <KeyValue label="Last QBR">
            <span className="flex items-center justify-end gap-2">
              <span className="num">{fmtDate(account.lastQbrDate)}</span>
              <span className={`num text-[11px] ${daysSince(account.lastQbrDate) > 90 ? "text-warning" : "text-dm"}`}>
                {daysSince(account.lastQbrDate)}d ago
              </span>
            </span>
          </KeyValue>
          <KeyValue label="Next MBR">{fmtDate(meta.nextMbrDate)}</KeyValue>
          <KeyValue label="Next QBR">{fmtDate(meta.nextQbrDate)}</KeyValue>
          <KeyValue label="CSM">{csm ? `${csm.initials}  ${csm.role}` : account.csmInitials}</KeyValue>
          <KeyValue label="AE">{meta.aeInitials}</KeyValue>
          <KeyValue label="Success kit">{meta.automationSuccessKit ? "Deployed" : "Not deployed"}</KeyValue>
        </Section>
      </div>

      <Panel>
        <PanelHeader title="Recent activity" right={<span className="num text-[11px] text-dm">{activity.length} events</span>} />
        <ActivityList events={activity} />
      </Panel>
    </div>
  );
}

const ACTIVITY_ICON: Record<ActivityEvent["kind"], Semantic> = {
  Note: "info",
  Action: "progress",
  "Business Review": "review",
  Support: "warning",
  "Tool Call": "info",
  Sync: "progress",
  Status: "review",
  Metadata: "info",
};

export function ActivityList({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return <div className="px-2 py-2 text-table-sm text-dm">No activity recorded on this account yet.</div>;
  }
  return (
    <ul>
      {events.map((e) => (
        <li key={e.id} className="grid grid-cols-[112px_1fr_auto] items-start gap-2 border-b border-de px-2 py-1 last:border-b-0">
          <span className="num text-[11px] text-dm">{e.at.includes(" ") ? fmtDateTime(e.at) : e.at}</span>
          <span className="min-w-0">
            <Status kind={ACTIVITY_ICON[e.kind]} label={e.kind} />
            <span className="mt-[2px] block text-table-sm text-dbd">{e.summary}</span>
            {e.simulated ? (
              <span className="num mt-[2px] block text-[11px] text-warning">
                Simulated action. No external system was modified.
              </span>
            ) : null}
          </span>
          <span className="num shrink-0 border border-de bg-dbg px-1 py-[1px] text-[11px] text-dsc">{e.ownerInitials}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Billing ------------------------------ */

export function BillingTab({ account, meta }: TabProps) {
  const { patchMeta } = useStore();
  /* Seats in use follow the recorded usage tier, so the number and the label on
     the row can never contradict each other. */
  const seatsInUse =
    meta.usageTier === "Over"
      ? meta.seats + Math.max(1, Math.round(meta.seats * 0.15))
      : meta.usageTier === "Under"
        ? Math.max(1, Math.round(meta.seats * 0.7))
        : meta.seats;
  const seatPosition = seatsInUse > meta.seats ? "Over" : seatsInUse < meta.seats ? "Under" : "On Plan";
  const billingSemantic: Semantic =
    meta.billingStatus === "Current" || meta.billingStatus === "Prepaid"
      ? "success"
      : meta.billingStatus === "Past Due"
        ? "warning"
        : "error";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Section title="Billing" right={<Status kind={billingSemantic} label={meta.billingStatus} />}>
          <KeyValue label="Status">
            <Select
              ariaLabel="Billing status"
              value={meta.billingStatus}
              options={["Current", "Past Due", "In Collections", "Prepaid"]}
              onChange={(v) => patchMeta(account.id, { billingStatus: v as AccountMeta["billingStatus"] }, `Billing status set to ${v}.`)}
            />
          </KeyValue>
          <KeyValue label="Plan">
            <Select
              ariaLabel="Plan"
              value={meta.plan}
              options={["Fleet Standard", "Fleet Advanced", "Fleet Enterprise"]}
              onChange={(v) => patchMeta(account.id, { plan: v as AccountMeta["plan"] }, `Plan set to ${v}.`)}
            />
          </KeyValue>
          <KeyValue label="Period end">{fmtDate(meta.periodEnd)}</KeyValue>
          <KeyValue label="ARR">{fmtCurrencyFull(account.arr)}</KeyValue>
          <KeyValue label="ARR per seat">{fmtCurrencyFull(Math.round(account.arr / Math.max(meta.seats, 1)))}</KeyValue>
          <KeyValue label="Wallet balance">{fmtCurrencyFull(meta.walletBalanceUsd)}</KeyValue>
          <KeyValue label="Multi-year">{meta.multiYear ? "Yes" : "No"}</KeyValue>
        </Section>

        <Section title="Account configuration" right={<span className="num text-[11px] text-dm">operational settings</span>}>
          <KeyValue label="Seats">{meta.seats}</KeyValue>
          <KeyValue label="Usage tier">
            <Select
              ariaLabel="Usage tier"
              value={meta.usageTier}
              options={["Under", "On Plan", "Over"]}
              onChange={(v) => patchMeta(account.id, { usageTier: v as AccountMeta["usageTier"] }, `Usage tier set to ${v}.`)}
            />
          </KeyValue>
          <KeyValue label="Region">{meta.region}</KeyValue>
          <KeyValue label="AI Inbox">{meta.aiInboxEnabled ? "Enabled" : "Disabled"}</KeyValue>
          <KeyValue label="Automation Success Kit">{meta.automationSuccessKit ? "Deployed" : "Not deployed"}</KeyValue>
          <KeyValue label="Fleet under contract">{account.fleetSize}</KeyValue>
          <KeyValue label="Exclude from metrics">{meta.excludeFromMetrics ? "Yes" : "No"}</KeyValue>
        </Section>
      </div>

      <Panel>
        <PanelHeader title="Usage against plan" right={<span className="num text-[11px] text-dm">last 30 days</span>} />
        <TableFrame>
          <thead>
            <tr>
              <Th>Measure</Th>
              <Th align="right">Contracted</Th>
              <Th align="right">Actual</Th>
              <Th>Position</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Operator seats</Td>
              <Td align="right" mono>
                {meta.seats}
              </Td>
              <Td align="right" mono>
                {seatsInUse}
              </Td>
              <Td>
                <Status
                  kind={seatPosition === "Over" ? "warning" : seatPosition === "Under" ? "review" : "success"}
                  label={seatPosition}
                />
              </Td>
            </tr>
            <tr>
              <Td>Airframes under contract</Td>
              <Td align="right" mono>
                {account.fleetSize}
              </Td>
              <Td align="right" mono>
                {account.fleetSize}
              </Td>
              <Td>
                <Status kind="success" label="On Plan" />
              </Td>
            </tr>
            <tr>
              <Td>Flight hours</Td>
              <Td align="right" mono>
                {(account.fleetSize * 20).toLocaleString("en-US")}
              </Td>
              <Td align="right" mono>
                {account.flightHoursLast30d.toLocaleString("en-US")}
              </Td>
              <Td>
                <Status
                  kind={account.flightHoursLast30d >= account.fleetSize * 20 ? "success" : "warning"}
                  label={account.flightHoursLast30d >= account.fleetSize * 20 ? "On Plan" : "Under"}
                />
              </Td>
            </tr>
          </tbody>
        </TableFrame>
        <div className="border-t border-de px-2 py-1 text-table-sm text-dm">
          Contracted flight hours are modelled at 20 hours per airframe per month. No invoicing, payment or metering system
          is connected to this prototype, so nothing here can be charged or collected.
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------- Interactions ---------------------------- */

const INTERACTION_ICON = {
  Call: PhoneCall,
  Email: Envelope,
  Meeting: Users,
  Support: TicketIcon,
  "Business Review": Presentation,
} as const;

export function InteractionsTab({ account }: TabProps) {
  const { interactionsFor } = useStore();
  const [filter, setFilter] = useState("Any");
  const rows = interactionsFor(account.id).filter((i) => (filter === "Any" ? true : i.type === filter));

  return (
    <Panel>
      <PanelHeader
        title="Interactions"
        right={
          <label className="flex items-center gap-1">
            <span className="eyebrow">Type</span>
            <Select
              ariaLabel="Filter interactions by type"
              value={filter}
              options={["Any", "Call", "Email", "Meeting", "Support", "Business Review"]}
              onChange={setFilter}
            />
          </label>
        }
      />
      {rows.length === 0 ? (
        <div className="px-2 py-2 text-table-sm text-dm">No interactions of this type recorded.</div>
      ) : (
        <ul>
          {rows.map((i) => {
            const Glyph = INTERACTION_ICON[i.type];
            return (
              <li key={i.id} className="grid grid-cols-[112px_88px_1fr_auto] items-start gap-2 border-b border-de px-2 py-1 last:border-b-0">
                <span className="num text-[11px] text-dm">{fmtDateTime(i.at)}</span>
                <span className="flex items-center gap-1 text-dsc">
                  <Glyph size={13} weight="regular" aria-hidden />
                  <span className="text-table-sm">{i.type}</span>
                </span>
                <span className="min-w-0 text-table-sm text-dbd">{i.summary}</span>
                <span className="num shrink-0 border border-de bg-dbg px-1 py-[1px] text-[11px] text-dsc">{i.ownerInitials}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------- Business Reviews -------------------------- */

export function ReviewsTab({ account, meta }: TabProps) {
  const { reviewsFor, logSimulatedAction, activityFor } = useStore();
  const reviews = reviewsFor(account.id);
  const next = reviews.find((r) => r.state === "Scheduled");
  const last = reviews.find((r) => r.state !== "Scheduled");
  const reviewEvents = activityFor(account.id).filter((e) => e.kind === "Business Review" || e.kind === "Sync");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Section title="Next business review" right={next ? <Status kind="review" label={next.state} /> : undefined}>
          {next ? (
            <>
              <KeyValue label="Type">{next.type}</KeyValue>
              <KeyValue label="Date">{fmtDate(next.date)}</KeyValue>
              <KeyValue label="In">{`${daysUntil(next.date)}d`}</KeyValue>
              <KeyValue label="Owner">{next.ownerInitials}</KeyValue>
              <KeyValue label="Attendees">{next.attendees}</KeyValue>
            </>
          ) : (
            <div className="py-2 text-table-sm text-dm">No review scheduled.</div>
          )}
        </Section>
        <Section title="Last business review" right={last ? <Status kind={last.state === "Completed" ? "success" : "review"} label={last.state} /> : undefined}>
          {last ? (
            <>
              <KeyValue label="Type">{last.type}</KeyValue>
              <KeyValue label="Date">{fmtDate(last.date)}</KeyValue>
              <KeyValue label="Health at review">{last.healthScoreAtReview}</KeyValue>
              <KeyValue label="Change since">{`${account.healthScore - last.healthScoreAtReview > 0 ? "+" : ""}${account.healthScore - last.healthScoreAtReview}`}</KeyValue>
              <KeyValue label="Owner">{last.ownerInitials}</KeyValue>
            </>
          ) : (
            <div className="py-2 text-table-sm text-dm">No completed review on record.</div>
          )}
        </Section>
      </div>

      <Panel>
        <PanelHeader
          title="Review history"
          right={
            <Button
              glyph={Presentation}
              onClick={() =>
                logSimulatedAction(
                  account.id,
                  "Business Review",
                  `Business review opened for ${account.name}. Simulated in this prototype: no calendar invite was created and no external deck was generated.`,
                )
              }
            >
              Open business review
            </Button>
          }
        />
        <TableFrame>
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Date</Th>
              <Th align="right">Health at review</Th>
              <Th>Attendees</Th>
              <Th>Outcome</Th>
              <Th>State</Th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <Td mono>{r.type}</Td>
                <Td mono className="whitespace-nowrap">
                  {fmtDate(r.date)}
                </Td>
                <Td align="right" mono>
                  {r.healthScoreAtReview}
                </Td>
                <Td className="text-dsc">{r.attendees}</Td>
                <Td className="min-w-[260px]">{r.outcome}</Td>
                <Td>
                  <Status kind={r.state === "Completed" ? "success" : r.state === "Scheduled" ? "review" : "warning"} label={r.state} />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
        <div className="border-t border-de px-2 py-1 text-table-sm text-dm">
          Cadence on this account: MBR monthly, QBR quarterly. Last MBR {fmtDate(meta.lastMbrDate)}, next{" "}
          {fmtDate(meta.nextMbrDate)}.
        </div>
      </Panel>

      {reviewEvents.length ? (
        <Panel>
          <PanelHeader title="Review activity" />
          <ActivityList events={reviewEvents} />
        </Panel>
      ) : null}
    </div>
  );
}

/* ----------------------------- Documents ----------------------------- */

export function DocumentsTab({ account }: TabProps) {
  const { documentsFor } = useStore();
  const docs = documentsFor(account.id);
  return (
    <Panel>
      <PanelHeader title="Documents" right={<span className="num text-[11px] text-dm">{docs.length} records</span>} />
      <TableFrame>
        <thead>
          <tr>
            <Th>Document</Th>
            <Th>Type</Th>
            <Th>Updated</Th>
            <Th>Owner</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <Td>
                <span className="flex items-center gap-2">
                  <FileText size={14} weight="regular" className="shrink-0 text-dm" aria-hidden />
                  <span className="truncate text-table-sm text-dh">{d.name}</span>
                </span>
              </Td>
              <Td mono className="whitespace-nowrap text-dsc">
                {d.type}
              </Td>
              <Td mono className="whitespace-nowrap">
                {fmtDate(d.updated)}
              </Td>
              <Td>
                <span className="num inline-flex h-[22px] w-[30px] items-center justify-center border border-de bg-dbg text-[11px] text-dsc">
                  {d.ownerInitials}
                </span>
              </Td>
              <Td>
                <Status
                  kind={d.state === "Signed" ? "success" : d.state === "In Review" ? "review" : d.state === "Draft" ? "progress" : "error"}
                  label={d.state}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
      <div className="border-t border-de px-2 py-1 text-table-sm text-dm">
        Document records only. No file store is connected to this prototype, so there is nothing to open or download.
      </div>
    </Panel>
  );
}

/* -------------------------- Notes and Actions -------------------------- */

export function NotesTab({ account }: TabProps) {
  const { notesFor, addNote, toggleAction, currentCsm } = useStore();
  const notes = notesFor(account.id);
  const [kind, setKind] = useState<"Note" | "Action">("Note");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");

  const actions = notes.filter((n) => n.kind === "Action");
  const openActions = actions.filter((n) => !n.complete);

  function submit() {
    const text = body.trim();
    if (!text) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    addNote(account.id, {
      kind,
      body: text,
      authorInitials: currentCsm.initials,
      createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      dueDate: kind === "Action" && due ? due : undefined,
      complete: kind === "Action" ? false : undefined,
    });
    setBody("");
    setDue("");
  }

  return (
    <div className="space-y-3">
      <Panel>
        <PanelHeader
          title={`Add ${kind.toLowerCase()}`}
          right={
            <span className="flex items-center gap-1">
              <span className="eyebrow">Type</span>
              <Select ariaLabel="Entry type" value={kind} options={["Note", "Action"]} onChange={(v) => setKind(v as "Note" | "Action")} />
            </span>
          }
        />
        <div className="px-3 py-2">
          <label className="block">
            <Eyebrow>{kind === "Note" ? "Note body" : "Action description"}</Eyebrow>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              aria-label={kind === "Note" ? "Note body" : "Action description"}
              placeholder={
                kind === "Note"
                  ? `What changed on ${account.name}?`
                  : `What needs to happen on ${account.name}, and by when?`
              }
              className="mt-1 w-full resize-none border border-de bg-dbg px-2 py-1 text-table-sm text-dbd outline-none transition-colors duration-200 hover:border-db focus:border-db"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-end gap-2">
              {kind === "Action" ? (
                <label className="block">
                  <Eyebrow>Due date</Eyebrow>
                  <div className="mt-1 w-[160px]">
                    <TextInput ariaLabel="Due date" type="date" mono value={due} onChange={setDue} />
                  </div>
                </label>
              ) : null}
              <span className="num pb-1 text-[11px] text-dm">
                Author {currentCsm.initials}  Account {account.id}
              </span>
            </div>
            <Button tone="primary" glyph={Plus} onClick={submit} disabled={!body.trim()}>
              {kind === "Note" ? "Add note" : "Add action"}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Notes and actions"
          right={
            <span className="num text-[11px] text-dm">
              {notes.length} entries  {openActions.length} open {openActions.length === 1 ? "action" : "actions"}
            </span>
          }
        />
        {notes.length === 0 ? (
          <div className="px-2 py-2 text-table-sm text-dm">Nothing recorded on this account yet.</div>
        ) : (
          <ul>
            {notes.map((n) => (
              <li key={n.id} className="grid grid-cols-[112px_1fr_auto] items-start gap-2 border-b border-de px-2 py-1 last:border-b-0">
                <span className="num text-[11px] text-dm">{fmtDateTime(n.createdAt)}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    {n.kind === "Action" ? (
                      <Status kind={n.complete ? "success" : "progress"} label={n.complete ? "Action complete" : "Action open"} />
                    ) : (
                      <span className="flex items-center gap-1 text-dsc">
                        <Notebook size={13} weight="regular" aria-hidden />
                        <span className="text-table-sm">Note</span>
                      </span>
                    )}
                    <span className="num text-[11px] text-dm">{account.id}</span>
                    {n.dueDate ? (
                      <span className={`num text-[11px] ${!n.complete && daysUntil(n.dueDate) < 0 ? "text-error" : "text-dm"}`}>
                        due {fmtDate(n.dueDate)}
                      </span>
                    ) : null}
                  </span>
                  <span className={`mt-[2px] block text-table-sm ${n.complete ? "text-dm line-through" : "text-dbd"}`}>{n.body}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {n.kind === "Action" ? (
                    <button
                      type="button"
                      onClick={() => toggleAction(account.id, n.id)}
                      aria-label={n.complete ? "Reopen action" : "Mark action complete"}
                      title={n.complete ? "Reopen action" : "Mark action complete"}
                      className={`transition-colors duration-200 ${n.complete ? "text-success hover:text-dh" : "text-dm hover:text-success"}`}
                    >
                      {n.complete ? <CheckCircle size={15} weight="regular" aria-hidden /> : <Circle size={15} weight="regular" aria-hidden />}
                    </button>
                  ) : null}
                  <span className="num border border-de bg-dbg px-1 py-[1px] text-[11px] text-dsc">{n.authorInitials}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------ Support ------------------------------ */

export function SupportTab({ account }: TabProps) {
  const { ticketsFor } = useStore();
  const rows = ticketsFor(account.id);
  const breaching = rows.filter((t) => t.slaState === "Breached").length;

  return (
    <div className="space-y-3">
      <Panel>
        <PanelHeader
          title="Open tickets on this account"
          right={
            <span className="num text-[11px] text-dm">
              {rows.length} open  {breaching} breaching SLA
            </span>
          }
        />
        {rows.length === 0 ? (
          <div className="flex items-start gap-2 px-3 py-4">
            <CheckCircle size={15} weight="regular" className="mt-[2px] shrink-0 text-success" aria-hidden />
            <div>
              <div className="text-table-sm text-dbd">No open tickets on {account.name}.</div>
              <div className="mt-[2px] text-table-sm text-dm">
                Uptime is {account.uptimePct}% and CSAT is {account.csat}%. Invoke get_open_tickets below to confirm against
                the data source.
              </div>
            </div>
          </div>
        ) : (
          <TableFrame>
            <thead>
              <tr>
                <Th>Ticket ID</Th>
                <Th>Subject</Th>
                <Th>Priority</Th>
                <Th align="right">Age</Th>
                <Th>SLA state</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <Td mono className="whitespace-nowrap text-dh">
                    {t.id}
                  </Td>
                  <Td className="min-w-[280px]">{t.subject}</Td>
                  <Td>
                    <Status kind={prioritySemantic(t.priority)} label={t.priority} />
                  </Td>
                  <Td align="right" mono className={t.ageDays >= 8 ? "text-error" : t.ageDays >= 5 ? "text-warning" : "text-dbd"}>
                    {t.ageDays}d
                  </Td>
                  <Td>
                    <Status kind={slaSemantic(t.slaState)} label={t.slaState} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
        )}
      </Panel>

      <ToolConsole
        tools={["get_open_tickets"]}
        accountId={account.id}
        title="Get open tickets"
        defaults={{ get_open_tickets: { accountId: account.id, priority: "Any", slaState: "Any" } }}
      />
    </div>
  );
}

/* ------------------------------ Renewal ------------------------------ */

export function RenewalTab({ account, meta }: TabProps) {
  const { reviewsFor } = useStore();
  const ready = renewalReadiness(account);
  const chips = riskChips(account, 3);
  const days = daysUntil(account.renewalDate);
  const history = reviewsFor(account.id).filter((r) => r.state !== "Scheduled");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Section title="Renewal" right={<Status kind={READINESS_SEMANTIC[ready]} label={ready} />}>
          <KeyValue label="Renewal date">{fmtDate(account.renewalDate)}</KeyValue>
          <KeyValue label="Days out">{`${days}d`}</KeyValue>
          <KeyValue label="ARR at stake">{fmtCurrencyFull(account.arr)}</KeyValue>
          <KeyValue label="Health score">{account.healthScore}</KeyValue>
          <KeyValue label="Readiness">
            <Status kind={READINESS_SEMANTIC[ready]} label={ready} />
          </KeyValue>
          <KeyValue label="Period end">{fmtDate(meta.periodEnd)}</KeyValue>
          <KeyValue label="Multi-year">{meta.multiYear ? "Yes" : "No"}</KeyValue>
          <KeyValue label="Billing status">{meta.billingStatus}</KeyValue>
        </Section>

        <Section title="Renewal risk factors" right={<span className="num text-[11px] text-dm">signals weighing on the decision</span>}>
          <div className="py-2">
            {chips.length ? (
              <div className="flex flex-wrap gap-1">
                {chips.map((c) => (
                  <Chip key={c} label={c} tone={ready === "At Risk" ? "error" : "warning"} />
                ))}
              </div>
            ) : (
              <Status kind="success" label="No active risk signals on this renewal" />
            )}
          </div>
          <KeyValue label="CSAT">{`${account.csat}%`}</KeyValue>
          <KeyValue label="Uptime">{`${account.uptimePct}%`}</KeyValue>
          <KeyValue label="Open tickets">{account.openTickets}</KeyValue>
          <KeyValue label="Days since QBR">{daysSince(account.lastQbrDate)}</KeyValue>
        </Section>
      </div>

      <Panel>
        <PanelHeader title="Renewal history" right={<span className="num text-[11px] text-dm">reviews and health at the time</span>} />
        <TableFrame>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Date</Th>
              <Th align="right">Health at the time</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td mono>Contract start</Td>
              <Td mono className="whitespace-nowrap">
                {fmtDate(meta.contractStart)}
              </Td>
              <Td align="right" mono className="text-dm">
                not recorded
              </Td>
              <Td>{`${meta.plan}, ${meta.seats} seats, ${meta.multiYear ? "multi-year" : "annual"} term`}</Td>
            </tr>
            {history.map((r) => (
              <tr key={r.id}>
                <Td mono>{r.type}</Td>
                <Td mono className="whitespace-nowrap">
                  {fmtDate(r.date)}
                </Td>
                <Td align="right" mono>
                  {r.healthScoreAtReview}
                </Td>
                <Td className="min-w-[260px]">{r.outcome}</Td>
              </tr>
            ))}
            <tr>
              <Td mono>Renewal due</Td>
              <Td mono className="whitespace-nowrap">
                {fmtDate(account.renewalDate)}
              </Td>
              <Td align="right" mono>
                {account.healthScore}
              </Td>
              <Td>
                <span className="flex items-center gap-2">
                  <Status kind={READINESS_SEMANTIC[ready]} label={ready} />
                  <span className="num text-[11px] text-dm">{fmtCurrencyCompact(account.arr)} at stake</span>
                </span>
              </Td>
            </tr>
          </tbody>
        </TableFrame>
      </Panel>

      <ToolConsole
        tools={["get_renewal_details"]}
        accountId={account.id}
        title="Get renewal details"
        defaults={{ get_renewal_details: { accountId: account.id, readiness: "Any" } }}
      />
    </div>
  );
}

/* -------------------------- Tool calls / activity -------------------------- */

export function ToolCallsTab({ account }: TabProps) {
  const { invocations, activityFor, metaFor } = useStore();
  const meta = metaFor(account.id);
  const mine = invocations.filter((i) => i.accountId === account.id);
  const activity = activityFor(account.id);

  return (
    <div className="space-y-3">
      <ToolConsole
        tools={["get_customer_health", "get_open_tickets", "get_renewal_details"]}
        accountId={account.id}
        title={`Tool execution  ${account.id}`}
        historyLimit={0}
        defaults={{
          get_customer_health: { accountId: account.id, includeRiskFactors: true },
          get_open_tickets: { accountId: account.id, priority: "Any", slaState: "Any" },
          get_renewal_details: { accountId: account.id, readiness: "Any" },
        }}
      />

      <Panel>
        <PanelHeader
          title="Invocation history"
          right={
            <span className="flex items-center gap-1 text-dm">
              <ArrowsClockwise size={12} weight="regular" aria-hidden />
              <span className="num text-[11px]">
                {mine.length} {mine.length === 1 ? "call" : "calls"} on this account
              </span>
            </span>
          }
        />
        {mine.length === 0 ? (
          <div className="px-2 py-2 text-table-sm text-dm">
            No tool calls recorded against {account.id} in this session. Invoke a tool above to populate the history.
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {mine.map((inv) => (
              <ToolRunRecord key={inv.id} invocation={inv} />
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Account activity"
          right={
            <span className="flex items-center gap-1 text-dm">
              <ChatCircleText size={12} weight="regular" aria-hidden />
              <span className="num text-[11px]">{activity.length} events</span>
            </span>
          }
        />
        <ActivityList events={activity} />
      </Panel>

      <Panel>
        <PanelHeader
          title="Cadence"
          right={
            <span className="flex items-center gap-1 text-dm">
              <CalendarBlank size={12} weight="regular" aria-hidden />
              <span className="num text-[11px]">upcoming</span>
            </span>
          }
        />
        <div className="px-3 py-1">
          <KeyValue label="Next MBR">{fmtDate(meta?.nextMbrDate)}</KeyValue>
          <KeyValue label="Next QBR">{fmtDate(meta?.nextQbrDate)}</KeyValue>
          <KeyValue label="Renewal">{fmtDate(account.renewalDate)}</KeyValue>
        </div>
      </Panel>
    </div>
  );
}
