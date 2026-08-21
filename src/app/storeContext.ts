import { createContext, useContext } from "react";
import type {
  Account,
  AccountDocument,
  AccountMeta,
  AccountNote,
  BusinessReview,
  ChurnRatePoint,
  ChurnedAccount,
  Csm,
  DataOrigin,
  Interaction,
  Ticket,
} from "../lib/types";
import type { Snapshot } from "../lib/repository";
import type { ProbeResult } from "../lib/supabase";
import type { ToolInput, ToolInvocation } from "../tools/types";

/* Context, hook and store shape. Kept apart from StoreProvider so this module
   has no component exports: React Fast Refresh then never leaves a consumer
   holding a context from a torn down module. */

export interface ActivityEvent {
  id: string;
  at: string;
  kind: "Note" | "Action" | "Business Review" | "Support" | "Tool Call" | "Sync" | "Status" | "Metadata";
  summary: string;
  ownerInitials: string;
  simulated?: boolean;
}

export interface Store {
  loading: boolean;
  snapshot: Snapshot | null;
  origin: DataOrigin;
  probe: ProbeResult | null;
  reload: () => void;

  accounts: Account[];
  tickets: Ticket[];
  churned: ChurnedAccount[];
  churnRate: ChurnRatePoint[];

  csmRoster: Csm[];
  currentCsm: Csm;
  setCurrentCsm: (initials: string) => void;
  notifyOnHealthDrop: boolean;
  setNotifyOnHealthDrop: (v: boolean) => void;
  weeklyRenewalDigest: boolean;
  setWeeklyRenewalDigest: (v: boolean) => void;

  accountById: (id: string) => Account | undefined;
  metaFor: (id: string) => AccountMeta | undefined;
  notesFor: (id: string) => AccountNote[];
  reviewsFor: (id: string) => BusinessReview[];
  documentsFor: (id: string) => AccountDocument[];
  interactionsFor: (id: string) => Interaction[];
  ticketsFor: (id: string) => Ticket[];
  activityFor: (id: string) => ActivityEvent[];

  patchAccount: (id: string, patch: Partial<Account>, description: string) => Promise<void>;
  patchMeta: (id: string, patch: Partial<AccountMeta>, description: string) => Promise<void>;
  addNote: (id: string, note: Omit<AccountNote, "id" | "accountId">) => void;
  toggleAction: (id: string, noteId: string) => void;
  runSync: (id: string) => Promise<void>;
  logSimulatedAction: (id: string, kind: ActivityEvent["kind"], summary: string) => void;

  invocations: ToolInvocation[];
  invokeTool: (toolName: string, input: ToolInput, accountId?: string) => Promise<ToolInvocation | undefined>;
  clearInvocations: () => void;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
