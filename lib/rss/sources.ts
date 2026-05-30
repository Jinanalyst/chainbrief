export type RssSource = {
  id: string;
  name: string;
  url: string;
  description: string;
  enabledByDefault: boolean;
  defaultCategory: string;
  kind?: "rss" | "html";
};

export const RSS_REFRESH_SECONDS = 5 * 60;

export const rssSources: RssSource[] = [
  {
    id: "mk-finance",
    name: "매일경제",
    url: "https://www.mk.co.kr/rss/50200011/",
    description: "국내 증시와 금융 뉴스.",
    enabledByDefault: true,
    defaultCategory: "국내증시",
  },
  {
    id: "hankyung-finance",
    name: "한국경제",
    url: "https://www.hankyung.com/feed/finance",
    description: "국내 금융 및 증권 뉴스.",
    enabledByDefault: true,
    defaultCategory: "국내증시",
  },
  {
    id: "etoday-news",
    name: "이투데이",
    url: "https://www.etoday.co.kr/rss/news.xml",
    description: "국내 금융, 산업, 정책 속보.",
    enabledByDefault: true,
    defaultCategory: "국내증시",
  },
  {
    id: "yonhap-market",
    name: "연합뉴스",
    url: "https://www.yna.co.kr/rss/market.xml",
    description: "연합뉴스 마켓+ 증시 및 금융 속보.",
    enabledByDefault: true,
    defaultCategory: "국내증시",
  },
  {
    id: "mk-economy",
    name: "매일경제",
    url: "https://www.mk.co.kr/rss/30100041/",
    description: "국내 경제와 매크로 뉴스.",
    enabledByDefault: true,
    defaultCategory: "매크로",
  },
  {
    id: "hankyung-economy",
    name: "한국경제",
    url: "https://www.hankyung.com/feed/economy",
    description: "경제 정책, 물가, 금리, 거시 뉴스.",
    enabledByDefault: true,
    defaultCategory: "매크로",
  },
  {
    id: "yonhap-economy",
    name: "연합뉴스",
    url: "https://www.yna.co.kr/rss/economy.xml",
    description: "연합뉴스 경제 정책, 산업, 매크로 뉴스.",
    enabledByDefault: true,
    defaultCategory: "매크로",
  },
  {
    id: "bok-press",
    name: "한국은행",
    url: "https://www.bok.or.kr/portal/bbs/B0000559/list.do?menuNo=200690",
    description: "한국은행 보도자료.",
    enabledByDefault: true,
    defaultCategory: "매크로",
    kind: "html",
  },
  {
    id: "mk-realestate",
    name: "매일경제",
    url: "https://www.mk.co.kr/rss/50300009/",
    description: "부동산 시장 뉴스.",
    enabledByDefault: true,
    defaultCategory: "부동산",
  },
  {
    id: "hankyung-realestate",
    name: "한국경제",
    url: "https://www.hankyung.com/feed/realestate",
    description: "주택, 분양, 정책, 부동산 금융 뉴스.",
    enabledByDefault: true,
    defaultCategory: "부동산",
  },
  {
    id: "molit-press",
    name: "국토교통부",
    url: "https://www.molit.go.kr/",
    description: "국토교통부 정책 및 보도자료.",
    enabledByDefault: true,
    defaultCategory: "부동산",
    kind: "html",
  },
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    description: "Crypto markets, policy, and institutional digital asset news.",
    enabledByDefault: true,
    defaultCategory: "가상자산",
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    description: "Broad crypto, blockchain, Web3, and market headlines.",
    enabledByDefault: true,
    defaultCategory: "가상자산",
  },
  {
    id: "decrypt",
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    description: "Web3, crypto culture, business, and digital asset news.",
    enabledByDefault: true,
    defaultCategory: "가상자산",
  },
  {
    id: "blockmedia",
    name: "블록미디어",
    url: "https://www.blockmedia.co.kr/feed",
    description: "한국어 가상자산 시장 뉴스.",
    enabledByDefault: true,
    defaultCategory: "가상자산",
  },
  {
    id: "cnbc-finance",
    name: "CNBC",
    url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    description: "글로벌 증시, 경제, 금융 시장 속보.",
    enabledByDefault: true,
    defaultCategory: "매크로",
  },
];
