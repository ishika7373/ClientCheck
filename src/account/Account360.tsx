import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowsClockwise, NotePencil, Presentation, SignIn } from "@phosphor-icons/react";
import { useStore } from "../app/storeContext";
import { statusSemantic } from "../components/AccountTable";
import { Button, Eyebrow, Panel, ScoreMeter, Status } from "../components/primitives";
import { FallbackNotice } from "../components/DataOrigin";
import { daysUntil, fmtCurrencyCompact, fmtDate, renewalReadiness } from "../lib/format";
import { QuickInfo } from "./QuickInfo";
import {
  BillingTab,
  DocumentsTab,
  InteractionsTab,
  NotesTab,
  OverviewTab,
  RenewalTab,
  ReviewsTab,
  SupportTab,
  ToolCallsTab,
} from "./tabs";

const TABS = [
  "Overview",
  "Billing",
  "Interactions",
  "Business Reviews",
  "Documents",
  "Notes & Actions",
  "Support",
  "Renewal",
  "Tool Calls",
] as const;

type TabName = (typeof TABS)[number];

/* The Account 360 workspace. Rendered inside the application shell, so the
   sidebar and the global search stay in place and the operator keeps a single
   obvious way back to where they came from. */
export function Account360({
  accountId,
  onBack,
  backLabel,
}: {
  accountId: string;
  onBack: () => void;
  backLabel: string;
}) {
  const { accountById, metaFor, invokeTool, runSync, logSimulatedAction } = useStore();
  const [tab, setTab] = useState<TabName>("Overview");
  const [syncing, setSyncing] = useState(false);

  const account = accountById(accountId);
  const meta = metaFor(accountId);

  /* A different account arriving means a fresh workspace, not a stale tab. */
  useEffect(() => setTab("Overview"), [accountId]);

  const ready = useMemo(() => (account ? renewalReadiness(account) : "On Track"), [account]);

  if (!account || !meta) {
    return (
      <div className="mx-auto w-full max-w-shell px-3 py-4 sm:px-6">
        <Button glyph={ArrowLeft} onClick={onBack}>
          Back to {backLabel}
        </Button>
        <Panel className="mt-3 px-3 py-4">
          <div className="text-table text-dbd">Account {accountId} is not in the current snapshot.</div>
          <div className="mt-1 text-table-sm text-dm">
            {account ? "Operational metadata is missing for this account." : "No account record was returned for this id."}{" "}
            Reload the snapshot from Settings, or check the Supabase connection state.
          </div>
        </Panel>
      </div>
    );
  }

  const days = daysUntil(account.renewalDate);
  const readySemantic = ready === "On Track" ? "success" : ready === "Needs Attention" ? "warning" : "error";

  async function onSync() {
    setSyncing(true);
    await runSync(account!.id);
    await invokeTool("get_customer_health", { accountId: account!.id, includeRiskFactors: true }, account!.id);
    setSyncing(false);
  }

  return (
    <div className="mx-auto w-full max-w-shell px-3 py-4 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-table-sm text-dsc transition-colors duration-200 hover:text-dh"
      >
        <ArrowLeft size={13} weight="regular" aria-hidden />
        Back to {backLabel}
      </button>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Account 360</Eyebrow>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <h1 className="text-page font-normal text-dh">{account.name}</h1>
            <span className="num text-table text-dm">{account.id}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2">
              <span className="eyebrow">Health</span>
              <ScoreMeter score={account.healthScore} />
              <Status kind={statusSemantic(account.status)} label={account.status} />
            </span>
            <span className="flex items-center gap-2">
              <span className="eyebrow">ARR</span>
              <span className="num text-table text-dh">{fmtCurrencyCompact(account.arr)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="eyebrow">Renewal</span>
              <span className="num text-table text-dh">{days}d</span>
              <span className="num text-table-sm text-dm">{fmtDate(account.renewalDate)}</span>
              <Status kind={readySemantic} label={ready} />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            glyph={SignIn}
            onClick={() =>
              logSimulatedAction(
                account.id,
                "Metadata",
                `Operator login to the ${account.name} tenant requested. Simulated in this prototype: no session was created in an external console.`,
              )
            }
          >
            Login
          </Button>
          <Button glyph={ArrowsClockwise} onClick={onSync} disabled={syncing}>
            {syncing ? "Syncing" : "Sync"}
          </Button>
          <Button
            glyph={Presentation}
            onClick={() => {
              logSimulatedAction(
                account.id,
                "Business Review",
                `Business review opened for ${account.name}. Simulated in this prototype: no calendar invite was created.`,
              );
              setTab("Business Reviews");
            }}
          >
            Business Review
          </Button>
          <Button glyph={NotePencil} onClick={() => setTab("Notes & Actions")}>
            Add Note
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <FallbackNotice />
      </div>

      <div className="mt-3 overflow-x-auto border-b border-de">
        <div className="flex min-w-max">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={tab === t ? "true" : undefined}
              className={`-mb-[1px] whitespace-nowrap border-b-2 px-2 py-1 text-table transition-colors duration-200 ${
                tab === t ? "border-b-o400 text-dh" : "border-b-transparent text-dsc hover:text-dh"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="min-w-0 animate-rise">
          {tab === "Overview" ? <OverviewTab account={account} meta={meta} /> : null}
          {tab === "Billing" ? <BillingTab account={account} meta={meta} /> : null}
          {tab === "Interactions" ? <InteractionsTab account={account} meta={meta} /> : null}
          {tab === "Business Reviews" ? <ReviewsTab account={account} meta={meta} /> : null}
          {tab === "Documents" ? <DocumentsTab account={account} meta={meta} /> : null}
          {tab === "Notes & Actions" ? <NotesTab account={account} meta={meta} /> : null}
          {tab === "Support" ? <SupportTab account={account} meta={meta} /> : null}
          {tab === "Renewal" ? <RenewalTab account={account} meta={meta} /> : null}
          {tab === "Tool Calls" ? <ToolCallsTab account={account} meta={meta} /> : null}
        </div>
        <div className="min-w-0">
          <QuickInfo account={account} meta={meta} />
        </div>
      </div>
    </div>
  );
}
