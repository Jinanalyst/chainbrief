import { Header } from "@/components/header";
import { HomepageLanding } from "@/components/homepage-landing";

export default function Home() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <HomepageLanding />
    </main>
  );
}
