import { cn } from "@/lib/cn";

type SourceBadgeProps = {
  children: string;
  active?: boolean;
  onClick?: () => void;
};

export function SourceBadge({ children, active = false, onClick }: SourceBadgeProps) {
  return (
    <button
      className={cn(
        "max-w-full rounded-md border px-3 py-2 text-sm font-semibold transition",
        active
          ? "border-accent bg-accent text-white"
          : "border-tint/10 bg-tint/[0.03] text-muted hover:text-ink",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
