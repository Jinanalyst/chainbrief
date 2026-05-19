"use client";

type Props = {
  bullish: number;
  bearish: number;
  neutral?: number;
  needMore?: number;
  total: number;
  compact?: boolean;
};

// Live Bull/Bear/Neutral/Need-More-Data % bar shown under a post.
export function StanceBar({ bullish, bearish, neutral = 0, needMore = 0, total, compact }: Props) {
  if (total === 0) {
    return (
      <p className="text-[11px] text-muted-2">No reactions yet — be the first to react.</p>
    );
  }
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-tint/10">
        {bullish > 0 ? <span style={{ width: `${bullish}%` }} className="block h-full bg-emerald-400" /> : null}
        {bearish > 0 ? <span style={{ width: `${bearish}%` }} className="block h-full bg-rose-400" /> : null}
        {neutral > 0 ? <span style={{ width: `${neutral}%` }} className="block h-full bg-slate-400" /> : null}
        {needMore > 0 ? <span style={{ width: `${needMore}%` }} className="block h-full bg-amber-400" /> : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-muted">
        <span className="text-emerald-300">▲ Bull {bullish}%</span>
        <span className="text-rose-300">▼ Bear {bearish}%</span>
        {neutral > 0 ? <span>● Neutral {neutral}%</span> : null}
        {needMore > 0 ? <span className="text-amber-300">? Need data {needMore}%</span> : null}
        <span className="text-muted-2">· {total} reactions</span>
      </div>
    </div>
  );
}
