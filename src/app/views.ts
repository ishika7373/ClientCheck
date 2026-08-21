import type { Icon } from "@phosphor-icons/react";
import { Briefcase, CalendarBlank, Gear, SquaresFour, TrendDown, Warning, Wrench } from "@phosphor-icons/react";

export type ViewId = "dashboard" | "portfolio" | "risk" | "renewals" | "churn" | "support" | "settings";

export interface NavItem {
  id: ViewId;
  label: string;
  glyph: Icon;
}

/* Order is fixed by the product spec. */
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", glyph: SquaresFour },
  { id: "portfolio", label: "My Portfolio", glyph: Briefcase },
  { id: "risk", label: "Risk", glyph: Warning },
  { id: "renewals", label: "Renewals", glyph: CalendarBlank },
  { id: "churn", label: "Churn", glyph: TrendDown },
  { id: "support", label: "Support Tools", glyph: Wrench },
  { id: "settings", label: "Settings", glyph: Gear },
];
