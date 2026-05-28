export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  getApprovedAnalystProfile,
  getCurrentUserContext,
} from "@/lib/analyst-data";

export default async function AnalystRootPage() {
  if (hasSupabaseConfig) {
    try {
      const { user } = await getCurrentUserContext();
      if (user) {
        const approved = await getApprovedAnalystProfile(user.id);
        if (approved) redirect("/analytics/dashboard");
      }
    } catch {
      // Supabase unreachable — fall through to apply page
    }
  }

  redirect("/analytics/apply");
}
