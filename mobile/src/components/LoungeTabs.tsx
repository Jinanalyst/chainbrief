import { Pressable, StyleSheet, Text, View } from "react-native";
import { RefreshIcon } from "@/components/Icon";
import type { LoungeTab } from "@/types";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/layout";
import { formatClockKo } from "@/lib/time";

type Props = {
  active: LoungeTab;
  onChange: (tab: LoungeTab) => void;
  onRefresh: () => void;
  lastUpdated: Date;
};

export function LoungeTabs({ active, onChange, onRefresh, lastUpdated }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.tabs}>
        <TabBtn label="라운지" active={active === "lounge"} onPress={() => onChange("lounge")} />
        <TabBtn label="전문가" active={active === "expert"} onPress={() => onChange("expert")} />
      </View>
      <View style={styles.right}>
        <Text style={styles.clock}>{formatClockKo(lastUpdated)}</Text>
        <Pressable hitSlop={8} onPress={onRefresh}>
          <RefreshIcon size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function TabBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {active ? <View style={styles.underline} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  tabBtn: {
    paddingVertical: spacing.md,
  },
  tabLabel: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: "700",
  },
  underline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.text,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: spacing.md,
  },
  clock: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
