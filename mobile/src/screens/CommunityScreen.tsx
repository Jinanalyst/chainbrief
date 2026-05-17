import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AirdropBanner } from "@/components/AirdropBanner";
import { CommunityHeader } from "@/components/CommunityHeader";
import { FilterPills } from "@/components/FilterPills";
import { FloatingWriteCTA } from "@/components/FloatingWriteCTA";
import { LoungeTabs } from "@/components/LoungeTabs";
import { PopularPostsCarousel } from "@/components/PopularPostsCarousel";
import { PostListItem } from "@/components/PostListItem";
import { PriceTickerRow } from "@/components/PriceTickerRow";
import { fetchCommunityPosts } from "@/api/posts";
import type { CommunityPost, FilterPill, LoungeTab } from "@/types";
import { colors } from "@/theme/colors";

export function CommunityScreen() {
  const [popular, setPopular] = useState<CommunityPost[]>([]);
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [tab, setTab] = useState<LoungeTab>("lounge");
  const [pill, setPill] = useState<FilterPill>("latest");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const load = () => {
    fetchCommunityPosts().then(({ popular, feed }) => {
      setPopular(popular);
      setFeed(feed);
      setLastUpdated(new Date());
    });
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    let list = feed;
    if (pill === "hot") {
      list = [...list].sort((a, b) => b.likes - a.likes);
    } else if (pill === "event") {
      list = list.filter((p) => p.postKind === "event");
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    }
    if (tab === "expert") {
      list = list.filter((p) => p.postKind === "analysis" || p.postKind === "news");
    }
    return list;
  }, [feed, pill, tab]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CommunityHeader />
        <PriceTickerRow />
        <PopularPostsCarousel posts={popular} />
        <AirdropBanner />
        <LoungeTabs
          active={tab}
          onChange={setTab}
          onRefresh={load}
          lastUpdated={lastUpdated}
        />
        <FilterPills active={pill} onChange={setPill} />
        <View style={styles.list}>
          {visible.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </View>
      </ScrollView>
      <FloatingWriteCTA />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },
  list: { backgroundColor: colors.surface },
});
