import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CommunityPost } from "@/types";
import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/layout";
import { formatRelativeKo } from "@/lib/time";

function kindLabel(post: CommunityPost): string {
  switch (post.postKind) {
    case "analysis":
      return "분석";
    case "news":
      return "뉴스";
    case "event":
      return "이벤트";
    default:
      return "자유";
  }
}

export function PostListItem({ post }: { post: CommunityPost }) {
  return (
    <Pressable style={styles.row}>
      <View style={styles.headerLine}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.avatar ?? "🙂"}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.author} numberOfLines={1}>
            {post.author}
          </Text>
          <Text style={styles.time}>{formatRelativeKo(post.publishedAt)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{kindLabel(post)}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      {post.preview ? (
        <Text style={styles.preview} numberOfLines={2}>
          {post.preview}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16 },
  identity: { flex: 1 },
  author: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  time: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
