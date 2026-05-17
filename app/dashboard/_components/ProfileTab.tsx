"use client";

import { ProfileSection } from "@/components/profile-section";

export function ProfileTab({ showToast: _showToast }: { showToast: (msg: string) => void }) {
  return <ProfileSection />;
}
