import { Header } from "@/components/header";
import { HomepageFeed } from "@/components/homepage-feed";

export default function Home() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <HomepageFeed />
    </main>
  );
}
