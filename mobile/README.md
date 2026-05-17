# ChainBrief Mobile

Expo + React Native + TypeScript mobile client for ChainBrief.
Layout inspired by the Coinness Korean crypto-news app: 5-tab bottom nav, a price-ticker strip, popular posts carousel, airdrop banner, lounge/expert tabs, and the community feed.

The Community tab (`커뮤니티`) is the first fully built screen. The other four tabs (`거래하기`, `속보`, `마켓`, `라이브`) are placeholders that share the same shell so the bottom navigation works end-to-end.

## Stack

- Expo SDK 52 (new architecture enabled)
- React Native 0.76
- React Navigation v7 (bottom tabs)
- TypeScript with `@/*` path alias to `src/*`
- `react-native-svg` for icons (no icon font dependency)
- CoinGecko public API for BTC/ETH prices (no key, no auth)

## Project layout

```
mobile/
├─ App.tsx                  # NavigationContainer + tabs
├─ app.json                 # Expo config (bundle ids, splash, scheme)
├─ index.ts                 # Expo entry
└─ src/
   ├─ navigation/RootTabs.tsx
   ├─ screens/
   │  ├─ CommunityScreen.tsx     # Coinness-style community feed (built)
   │  ├─ TradeScreen.tsx         # placeholder
   │  ├─ BreakingScreen.tsx      # placeholder
   │  ├─ MarketScreen.tsx        # placeholder
   │  ├─ LiveScreen.tsx          # placeholder
   │  └─ PlaceholderScreen.tsx
   ├─ components/
   │  ├─ CommunityHeader.tsx
   │  ├─ PriceTickerRow.tsx
   │  ├─ PopularPostsCarousel.tsx
   │  ├─ AirdropBanner.tsx
   │  ├─ LoungeTabs.tsx
   │  ├─ FilterPills.tsx
   │  ├─ PostListItem.tsx
   │  ├─ FloatingWriteCTA.tsx
   │  └─ Icon.tsx
   ├─ api/
   │  ├─ prices.ts               # CoinGecko fetch + fallback
   │  └─ posts.ts                # mock community posts (same shape as web)
   ├─ lib/time.ts                # Korean relative time + clock formatter
   ├─ theme/
   │  ├─ colors.ts               # brand `#2F7BFF`, status colors
   │  └─ layout.ts               # spacing / radius / type scales
   └─ types.ts
```

## Running locally

From the `mobile/` folder:

```sh
npm install
npm start              # opens Expo dev tools; scan QR with Expo Go on a phone
# or, directly into a simulator:
npm run ios            # macOS only
npm run android        # requires Android SDK
npm run web            # quick preview in browser via metro web
```

You'll need the **Expo Go** app installed on your phone the first time, or a simulator set up via Xcode / Android Studio. No native build is required to iterate.

## Where the data comes from

| Surface              | Source                                                |
| -------------------- | ----------------------------------------------------- |
| BTC / ETH prices     | CoinGecko public `simple/price` endpoint (no key)     |
| Popular + feed posts | Mocked in `src/api/posts.ts`, shape matches web `CommunityPost` (`lib/community.ts`) |

When the web app exposes a real community API, replace the mock in `src/api/posts.ts` with a `fetch("https://chainbrief.kr/api/community/posts")` call — the types already line up.

## Design notes

- **Light theme**, matching the Coinness reference screenshots — clean white surfaces, subtle gray borders, and the ChainBrief brand blue (`#2F7BFF`) for primary actions.
- The Community screen mirrors Coinness section order: header → price tickers → 인기글 → 에어드롭 배너 → 라운지/전문가 탭 → 필터 → 피드 → 플로팅 글쓰기 CTA.
- Filter behavior:
  - `최신` (Latest) — sorted by `publishedAt` descending
  - `HOT` — sorted by like count
  - `EVENT` — filter to `postKind === "event"`
  - `전문가` tab additionally narrows to analysis + news posts.
- The floating "게시글을 남겨주실래요?" CTA stays anchored above the tab bar.

## Next steps (suggested)

1. Replace mock posts with a real `/api/community/posts` endpoint.
2. Build out the other four tabs (Trade is probably a webview link to upbit/bithumb; Live mirrors the YouTube feed from the web Live page; Market reuses the existing heatmap data).
3. Wire Supabase auth via `@supabase/supabase-js` so the write CTA actually creates posts.
4. Push notifications via Expo's `expo-notifications` for breaking news.
