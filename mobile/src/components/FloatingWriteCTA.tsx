import { Pressable, StyleSheet, Text, View } from "react-native";
import { PencilIcon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/layout";

type Props = { onPress?: () => void };

export function FloatingWriteCTA({ onPress }: Props) {
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Pressable style={styles.btn} onPress={onPress}>
        <PencilIcon size={16} color="#FFFFFF" />
        <Text style={styles.label}>게시글을 남겨주실래요?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.lg,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
