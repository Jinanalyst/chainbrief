import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/86 backdrop-blur-xl">
      <Container className="flex items-center justify-between py-4">
        <BrandLogo compact priority />

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
