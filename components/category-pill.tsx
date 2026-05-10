import { Badge } from "@/components/ui/badge";

type CategoryPillProps = {
  label: string;
};

export function CategoryPill({ label }: CategoryPillProps) {
  return <Badge tone="default">{label}</Badge>;
}
