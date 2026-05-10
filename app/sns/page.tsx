import { Header } from "@/components/header";
import { SNSFeed } from "@/components/sns/SNSFeed";

export default function SNSPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <SNSFeed />
    </main>
  );
}
