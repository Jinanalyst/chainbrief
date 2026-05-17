"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { ProfileTab } from "./_components/ProfileTab";
import { MembershipTab } from "./_components/MembershipTab";

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-xl border border-tint/10 bg-surface-3 px-4 py-3 text-sm font-semibold text-ink shadow-soft backdrop-blur transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none",
      )}
    >
      ✓ {message}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",    label: "Profile" },
  { id: "membership", label: "Membership" },
  { id: "analytics",  label: "Analytics" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [toast, setToast] = useState({ visible: false, message: "" });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }, []);

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />

      <Container className="pt-8">
        {/* Tab bar */}
        <div className="mb-8 flex items-center gap-1 border-b border-tint/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-3 text-sm font-semibold transition",
                activeTab === tab.id ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profile"    && <ProfileTab    showToast={showToast} />}
        {activeTab === "membership" && <MembershipTab showToast={showToast} />}
        {activeTab === "analytics"  && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-tint/20 py-32 text-sm text-muted-2">
            Analytics — coming soon
          </div>
        )}
      </Container>

      <Toast visible={toast.visible} message={toast.message} />
    </main>
  );
}
