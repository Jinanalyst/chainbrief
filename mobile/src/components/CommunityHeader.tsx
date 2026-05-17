import { Pressable, StyleSheet, Text, View } from "react-native";
import { BellIcon, GiftIcon, MenuIcon, SearchIcon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/layout";

export function CommunityHeader() {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>커뮤니티</Text>
      <View style={styles.actions}>
        <Pressable hitSlop={8} style={styles.iconBtn}>
          <GiftIcon size={22} color={colors.brand} />
        </Pressable>
        <Pressable hitSlop={8} style={styles.iconBtn}>
          <SearchIcon size={22} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} style={styles.iconBtn}>
          <View>
            <BellIcon size={22} color={colors.text} />
            <View style={styles.dot} />
          </View>
        </Pressable>
        <Pressable hitSlop={8} style={styles.iconBtn}>
          <MenuIcon size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBtn: {
    padding: 2,
  },
  dot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bearish,
  },
});
