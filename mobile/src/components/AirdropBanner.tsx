import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/layout";

export function AirdropBanner() {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.banner}>
        <View style={styles.textWrap}>
          <Text style={styles.text}>
            <Text style={styles.bold}>에어드롭 미션</Text>
            <Text style={styles.normal}> 참여하고 보상받기!</Text>
          </Text>
        </View>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🪂</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  textWrap: { flex: 1 },
  text: { fontSize: 13, color: colors.text },
  bold: { fontWeight: "700", color: colors.brand },
  normal: { color: colors.text },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 28 },
});
