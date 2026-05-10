import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/86 backdrop-blur-xl">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Chain Brief">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/45 bg-accent text-sm font-black text-white shadow-[0_0_28px_rgba(47,123,255,0.35)]">
            CB
          </span>
          <span>
            <span className="block text-lg font-semibold leading-5 tracking-tight text-ink">
              Chain Brief
            </span>
            <span className="block text-xs font-medium uppercase tracking-[0.16em] text-muted-2">
              RSS briefing
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
          <Link className="transition hover:text-ink" href="/">
            Home
          </Link>
          <Link className="transition hover:text-ink" href="/briefs">
            Briefs
          </Link>
          <Link className="transition hover:text-ink" href="/settings">
            Settings
          </Link>
          <Link className="transition hover:text-ink" href="/about">
            About
          </Link>
        </nav>

        <Button className="hidden sm:inline-flex" href="/briefs" variant="secondary">
          Read Briefs
        </Button>
      </Container>
    </header>
  );
}
