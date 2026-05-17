import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDownIcon } from "@/components/Icon";
import type { FilterPill } from "@/types";
import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/layout";

type Props = {
  active: FilterPill;
  onChange: (p: FilterPill) => void;
};

export function FilterPills({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.pillsLeft}>
        <Pill
          label="최신"
          accent={colors.bullish}
          icon="⚡"
          active={active === "latest"}
          onPress={() => onChange("latest")}
        />
        <Pill
          label="HOT"
          icon="🔥"
          active={active === "hot"}
          onPress={() => onChange("hot")}
        />
        <Pill
          label="EVENT"
          icon="🛍️"
          active={active === "event"}
          onPress={() => onChange("event")}
        />
      </View>
      <Pressable style={styles.dropdown}>
        <Text style={styles.dropdownLabel}>전체</Text>
        <ChevronDownIcon size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function Pill({
  label,
  icon,
  accent,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  accent?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <Text style={[styles.pillIcon, !active && styles.dim]}>{icon}</Text>
      <Text
        style={[
          styles.pillLabel,
          active ? { color: accent ?? colors.text, fontWeight: "700" } : styles.dim,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pillsLeft: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pillIcon: { fontSize: 13 },
  pillLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  dim: { color: colors.textMuted, fontWeight: "500" },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  dropdownLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
});
