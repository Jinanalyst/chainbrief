import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import {
  ChartIcon,
  ChatIcon,
  ClockIcon,
  HomeIcon,
  PlayCircleIcon,
} from "@/components/Icon";
import { CommunityScreen } from "@/screens/CommunityScreen";
import { TradeScreen } from "@/screens/TradeScreen";
import { BreakingScreen } from "@/screens/BreakingScreen";
import { MarketScreen } from "@/screens/MarketScreen";
import { LiveScreen } from "@/screens/LiveScreen";

export type RootTabsParamList = {
  Trade: undefined;
  Breaking: undefined;
  Market: undefined;
  Live: undefined;
  Community: undefined;
};

const Tab = createBottomTabNavigator<RootTabsParamList>();

type TabLabelProps = { focused: boolean; label: string };
function TabLabel({ focused, label }: TabLabelProps) {
  return (
    <Text
      style={[
        styles.tabLabel,
        { color: focused ? colors.tabActive : colors.tabInactive },
      ]}
    >
      {label}
    </Text>
  );
}

type TabIconProps = {
  focused: boolean;
  Icon: (p: { size?: number; color?: string }) => JSX.Element;
};
function TabIcon({ focused, Icon }: TabIconProps) {
  return (
    <View style={styles.tabIconWrap}>
      <Icon size={22} color={focused ? colors.tabActive : colors.tabInactive} />
    </View>
  );
}

export function RootTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Community"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Trade"
        component={TradeScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="거래하기" />,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={ChartIcon} />,
        }}
      />
      <Tab.Screen
        name="Breaking"
        component={BreakingScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="속보" />,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={ClockIcon} />,
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="마켓" />,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={HomeIcon} />,
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="라이브" />,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={PlayCircleIcon} />,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="커뮤니티" />,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={ChatIcon} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.select({ ios: 84, default: 64 }),
    paddingTop: 6,
    paddingBottom: Platform.select({ ios: 24, default: 8 }),
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
