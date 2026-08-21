import { Component, useEffect, useState, type ReactNode } from "react";
import { Account360 } from "../account/Account360";
import { Churn } from "../views/Churn";
import { Dashboard } from "../views/Dashboard";
import { Portfolio } from "../views/Portfolio";
import { Renewals } from "../views/Renewals";
import { Risk } from "../views/Risk";
import { Settings } from "../views/Settings";
import { SupportTools } from "../views/SupportTools";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NAV_ITEMS, type ViewId } from "./views";
import { StoreProvider } from "./store";
import { useStore } from "./storeContext";

/* Application shell: sidebar, global search, main content and the optional
   Account 360 workspace. A single activeView state, no router. */
function Shell() {
  const { loading } = useStore();
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  /* Collapse the sidebar automatically on narrow viewports without taking the
     manual toggle away. */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  function selectView(id: ViewId) {
    setActiveView(id);
    setAccountId(null);
    window.scrollTo({ top: 0 });
  }

  function openAccount(id: string) {
    setAccountId(id);
    window.scrollTo({ top: 0 });
  }

  const backLabel = NAV_ITEMS.find((n) => n.id === activeView)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen bg-dbg">
      <div className="sticky top-0 h-screen">
        <Sidebar
          active={activeView}
          onSelect={selectView}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenAccount={openAccount} />
        <main className="flex-1">
          {loading ? (
            <div className="mx-auto w-full max-w-shell px-3 py-4 sm:px-6">
              <div className="border border-de bg-ds px-3 py-4">
                <span className="eyebrow">Loading</span>
                <div className="mt-1 text-table-sm text-dbd">
                  Reading the account snapshot and probing the Supabase connection.
                </div>
              </div>
            </div>
          ) : accountId ? (
            <Account360 accountId={accountId} onBack={() => setAccountId(null)} backLabel={backLabel} />
          ) : activeView === "dashboard" ? (
            <Dashboard onOpenAccount={openAccount} />
          ) : activeView === "portfolio" ? (
            <Portfolio onOpenAccount={openAccount} />
          ) : activeView === "risk" ? (
            <Risk onOpenAccount={openAccount} />
          ) : activeView === "renewals" ? (
            <Renewals onOpenAccount={openAccount} />
          ) : activeView === "churn" ? (
            <Churn />
          ) : activeView === "support" ? (
            <SupportTools onOpenAccount={openAccount} />
          ) : (
            <Settings />
          )}
        </main>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto w-full max-w-shell px-3 py-4 sm:px-6">
        <div className="border border-de bg-ds px-2 py-2">
          <span className="eyebrow text-error">Render failure</span>
          <div className="mt-1 text-table text-dbd">The console could not draw this view.</div>
          <div className="num mt-1 break-words text-table-sm text-dm">{this.state.error.message}</div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 border border-de bg-ds px-2 py-1 text-table-sm text-dbd transition-colors duration-200 hover:border-db hover:text-dh"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
