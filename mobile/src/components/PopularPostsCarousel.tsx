import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CommentIcon, FireIcon } from "@/components/Icon";
import type { CommunityPost } from "@/types";
import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/layout";
import { formatRelativeKo } from "@/lib/time";

type Props = { posts: CommunityPost[] };

function PopularCard({ post }: { post: CommunityPost }) {
  return (
    <View style={styles.card}>
      <Text style={styles.time}>{formatRelativeKo(post.publishedAt)}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      <View style={styles.meta}>
        {post.commentsCount > 0 ? (
          <>
            <CommentIcon size={13} color={colors.textFaint} />
            <Text style={styles.metaText}>{post.commentsCount}</Text>
          </>
        ) : (
          <Text style={styles.metaPlaceholder}> </Text>
        )}
      </View>
    </View>
  );
}

export function PopularPostsCarousel({ posts }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>인기글</Text>
        <FireIcon size={16} color={colors.warning} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {posts.map((p) => (
          <PopularCard key={p.id} post={p} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 140,
    height: 130,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  time: {
    fontSize: 11,
    color: colors.textFaint,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 16,
  },
  metaText: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: "500",
  },
  metaPlaceholder: { fontSize: 12 },
});
