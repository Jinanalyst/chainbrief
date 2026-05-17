import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fetchPrices } from "@/api/prices";
import type { PriceTicker } from "@/types";
import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/layout";

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function formatDelta(price: number, pct: number): string {
  const delta = (price * pct) / 100;
  const sign = delta >= 0 ? "+" : "-";
  return `(${sign}${Math.abs(delta).toLocaleString("en-US", { maximumFractionDigits: 2 })})`;
}

function CoinDot({ symbol }: { symbol: "BTC" | "ETH" }) {
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: symbol === "BTC" ? colors.bitcoin : colors.ethereum },
      ]}
    >
      <Text style={styles.dotLabel}>{symbol === "BTC" ? "₿" : "Ξ"}</Text>
    </View>
  );
}

function TickerCard({ ticker }: { ticker: PriceTicker }) {
  const isUp = ticker.changePct24h >= 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <CoinDot symbol={ticker.symbol} />
        <Text style={styles.sym}>{ticker.symbol}</Text>
        <Text style={[styles.pct, { color: isUp ? colors.bullish : colors.bearish }]}>
          {isUp ? "▲" : "▼"} {Math.abs(ticker.changePct24h).toFixed(2)}%
        </Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.price}>{formatPrice(ticker.priceUsd)}</Text>
        <Text style={styles.delta}>{formatDelta(ticker.priceUsd, ticker.changePct24h)}</Text>
      </View>
    </View>
  );
}

export function PriceTickerRow() {
  const [tickers, setTickers] = useState<PriceTicker[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPrices().then((p) => {
      if (mounted) setTickers(p);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const data = tickers ?? [
    { symbol: "BTC" as const, name: "Bitcoin", priceUsd: 78134.2, changePct24h: -1.22 },
    { symbol: "ETH" as const, name: "Ethereum", priceUsd: 2180.42, changePct24h: -1.97 },
  ];

  return (
    <View style={styles.row}>
      {data.map((t) => (
        <TickerCard key={t.symbol} ticker={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dotLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sym: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  pct: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  delta: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
