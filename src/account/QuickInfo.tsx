import { useState } from "react";
import { Check, Hash, PencilSimple, X } from "@phosphor-icons/react";
import { useStore } from "../app/storeContext";
import { Eyebrow, ExternalLink, Panel, PanelHeader, Select, Status, TextInput } from "../components/primitives";
import { accountAge, fmtCurrencyCompact, fmtDate } from "../lib/format";
import type { Account, AccountMeta } from "../lib/types";

/* Persistent right rail. Visually quiet, information dense, every field either
   a compact control or a read-only value. Nothing here is a large form field. */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-1 border-b border-de px-2 py-1 last:border-b-0">
      <span className="eyebrow">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1 text-right">{children}</span>
    </div>
  );
}

function ReadValue({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <span className={`truncate text-table-sm text-dbd ${mono ? "num" : ""}`}>{children}</span>;
}

/* Inline editor: click the pencil, edit in place, commit or discard. */
function InlineText({
  value,
  onCommit,
  ariaLabel,
  mono,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  ariaLabel: string;
  mono?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <>
        <ReadValue mono={mono}>{value || <span className="text-dm">Not set</span>}</ReadValue>
        <button
          type="button"
          aria-label={`Edit ${ariaLabel}`}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="shrink-0 text-dm transition-colors duration-200 hover:text-dh"
        >
          <PencilSimple size={12} weight="regular" aria-hidden />
        </button>
      </>
    );
  }
  return (
    <>
      <TextInput ariaLabel={ariaLabel} value={draft} onChange={setDraft} mono={mono} placeholder={placeholder} />
      <button
        type="button"
        aria-label="Commit change"
        onClick={() => {
          onCommit(draft);
          setEditing(false);
        }}
        className="shrink-0 text-success transition-colors duration-200 hover:text-dh"
      >
        <Check size={12} weight="regular" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Discard change"
        onClick={() => setEditing(false)}
        className="shrink-0 text-dm transition-colors duration-200 hover:text-dh"
      >
        <X size={12} weight="regular" aria-hidden />
      </button>
    </>
  );
}

/* Compact square checkbox rather than a wide switch, to keep the rail quiet. */
function Flag({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`text-table-sm ${checked ? "text-dbd" : "text-dm"}`}>{checked ? "Yes" : "No"}</span>
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[13px] w-[13px] shrink-0 cursor-pointer appearance-none border border-db bg-dbg transition-colors duration-200 checked:border-dbd checked:bg-dbd"
      />
    </span>
  );
}

export function QuickInfo({ account, meta }: { account: Account; meta: AccountMeta }) {
  const { csmRoster, patchAccount, patchMeta } = useStore();
  const aeOptions = ["PJ", "HN", "TB"];
  const csmScore = meta.csmHealthScore ?? account.healthScore;

  return (
    <Panel as="aside">
      <PanelHeader
        title="Quick info"
        right={
          <span className="flex items-center gap-1 text-dm">
            <Hash size={12} weight="regular" aria-hidden />
            <span className="num text-[11px]">{account.id}</span>
          </span>
        }
      />

      <Row label="CSM">
        <Select
          ariaLabel="Assign CSM"
          value={account.csmInitials}
          options={csmRoster.map((c) => c.initials)}
          onChange={(v) => patchAccount(account.id, { csmInitials: v }, `CSM reassigned to ${v}.`)}
        />
      </Row>
      <Row label="AE">
        <Select
          ariaLabel="Assign AE"
          value={meta.aeInitials}
          options={aeOptions}
          onChange={(v) => patchMeta(account.id, { aeInitials: v }, `AE reassigned to ${v}.`)}
        />
      </Row>
      <Row label="AI Inbox">
        <Flag
          ariaLabel="AI Inbox enabled"
          checked={meta.aiInboxEnabled}
          onChange={(v) => patchMeta(account.id, { aiInboxEnabled: v }, `AI Inbox ${v ? "enabled" : "disabled"}.`)}
        />
      </Row>
      <Row label="Billing">
        <Select
          ariaLabel="Billing status"
          value={meta.billingStatus}
          options={["Current", "Past Due", "In Collections", "Prepaid"]}
          onChange={(v) => patchMeta(account.id, { billingStatus: v as AccountMeta["billingStatus"] }, `Billing status set to ${v}.`)}
        />
      </Row>
      <Row label="Usage">
        <Select
          ariaLabel="Usage tier"
          value={meta.usageTier}
          options={["Under", "On Plan", "Over"]}
          onChange={(v) => patchMeta(account.id, { usageTier: v as AccountMeta["usageTier"] }, `Usage tier set to ${v}.`)}
        />
      </Row>
      <Row label="Account age">
        <ReadValue mono>{accountAge(meta.contractStart)}</ReadValue>
      </Row>
      <Row label="Website">
        <ExternalLink href={meta.website}>{meta.website}</ExternalLink>
      </Row>
      <Row label="Slack">
        <InlineText
          ariaLabel="Slack channel"
          mono
          value={meta.slackChannel}
          placeholder="#acct-name"
          onCommit={(v) => patchMeta(account.id, { slackChannel: v }, `Slack channel set to ${v}.`)}
        />
      </Row>
      <Row label="Success kit">
        <Flag
          ariaLabel="Automation Success Kit"
          checked={meta.automationSuccessKit}
          onChange={(v) => patchMeta(account.id, { automationSuccessKit: v }, `Automation Success Kit ${v ? "enabled" : "disabled"}.`)}
        />
      </Row>
      <Row label="Multi-year">
        <Flag
          ariaLabel="Multi-year contract"
          checked={meta.multiYear}
          onChange={(v) => patchMeta(account.id, { multiYear: v }, `Multi-year flag set to ${v ? "yes" : "no"}.`)}
        />
      </Row>
      <Row label="Health by CSM">
        <InlineText
          ariaLabel="Health score assigned by CSM"
          mono
          value={String(csmScore)}
          onCommit={(v) => {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0 && n <= 100) {
              patchMeta(account.id, { csmHealthScore: n }, `CSM health assessment set to ${n}.`);
            }
          }}
        />
        <span className="num shrink-0 text-[11px] text-dm">sys {account.healthScore}</span>
      </Row>
      <Row label="Last MBR">
        <input
          type="date"
          aria-label="Last MBR date"
          value={meta.lastMbrDate}
          onChange={(e) => patchMeta(account.id, { lastMbrDate: e.target.value }, `Last MBR set to ${e.target.value}.`)}
          className="num w-full border border-de bg-dbg px-2 py-[3px] text-right text-table-sm text-dbd transition-colors duration-200 hover:border-db"
        />
      </Row>
      <Row label="Last QBR">
        <ReadValue mono>{fmtDate(account.lastQbrDate)}</ReadValue>
      </Row>
      <Row label="Next MBR">
        <input
          type="date"
          aria-label="Next MBR date"
          value={meta.nextMbrDate}
          onChange={(e) => patchMeta(account.id, { nextMbrDate: e.target.value }, `Next MBR set to ${e.target.value}.`)}
          className="num w-full border border-de bg-dbg px-2 py-[3px] text-right text-table-sm text-dbd transition-colors duration-200 hover:border-db"
        />
      </Row>
      <Row label="Next QBR">
        <input
          type="date"
          aria-label="Next QBR date"
          value={meta.nextQbrDate}
          onChange={(e) => patchMeta(account.id, { nextQbrDate: e.target.value }, `Next QBR set to ${e.target.value}.`)}
          className="num w-full border border-de bg-dbg px-2 py-[3px] text-right text-table-sm text-dbd transition-colors duration-200 hover:border-db"
        />
      </Row>
      <Row label="Exclude">
        <Flag
          ariaLabel="Exclude from metrics"
          checked={meta.excludeFromMetrics}
          onChange={(v) =>
            patchMeta(account.id, { excludeFromMetrics: v }, `Account ${v ? "excluded from" : "included in"} portfolio metrics.`)
          }
        />
      </Row>
      <Row label="Churn reason">
        <InlineText
          ariaLabel="Churn reason"
          value={meta.churnReason}
          placeholder="Not churned"
          onCommit={(v) => patchMeta(account.id, { churnReason: v }, `Churn reason recorded.`)}
        />
      </Row>

      <div className="border-t border-de px-3 py-2">
        <Eyebrow>Commercial</Eyebrow>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div>
            <span className="eyebrow">Plan</span>
            <div className="mt-[2px] text-table-sm text-dbd">{meta.plan}</div>
          </div>
          <div>
            <span className="eyebrow">Seats</span>
            <div className="num mt-[2px] text-table-sm text-dbd">{meta.seats}</div>
          </div>
          <div>
            <span className="eyebrow">Wallet</span>
            <div className="num mt-[2px] text-table-sm text-dbd">{fmtCurrencyCompact(meta.walletBalanceUsd)}</div>
          </div>
          <div>
            <span className="eyebrow">Region</span>
            <div className="mt-[2px] text-table-sm text-dbd">{meta.region}</div>
          </div>
        </div>
      </div>

      {meta.excludeFromMetrics ? (
        <div className="border-t border-de px-3 py-2">
          <Status kind="warning" label="Excluded from portfolio metrics" />
        </div>
      ) : null}
    </Panel>
  );
}
