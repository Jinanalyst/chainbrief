import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "muted";
};

export function Badge({ children, className, tone = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
        tone === "accent" && "border-accent/40 bg-accent-soft/80 text-blue-200",
        tone === "muted" && "border-border bg-surface-2 text-muted",
        tone === "default" && "border-white/10 bg-white/[0.04] text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
