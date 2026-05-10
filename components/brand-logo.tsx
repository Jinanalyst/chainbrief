import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  priority?: boolean;
  full?: boolean;
};

export function BrandLogo({
  className,
  compact = false,
  priority = false,
  full = false,
}: BrandLogoProps) {
  const asset = full ? "/chain-brief-logo-full.svg" : "/chain-brief-logo-icon.svg";

  if (full) {
    return (
      <Link href="/" aria-label="Chain Brief" className={cn("inline-flex shrink-0 items-center", className)}>
        <span className="relative block aspect-[1400/900] w-full max-w-[760px] overflow-hidden rounded-2xl border border-white/10 bg-[#070A12] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <Image alt="" className="object-cover" fill priority={priority} sizes="(max-width: 768px) 100vw, 760px" src={asset} />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label="Chain Brief"
      className={cn("inline-flex items-center", compact ? "gap-2" : "gap-3", className)}
    >
      <span className={cn("relative shrink-0 overflow-hidden rounded-md", compact ? "h-10 w-10" : "h-12 w-12")}>
        <Image
          alt=""
          className="object-cover"
          fill
          priority={priority}
          sizes="48px"
          src={asset}
        />
      </span>
      <span className="leading-none">
        <span className={cn("block font-semibold tracking-tight text-ink", compact ? "text-lg" : "text-xl")}>
          Chain Brief
        </span>
        <span className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-2">
          Crypto news, simplified.
        </span>
      </span>
    </Link>
  );
}
