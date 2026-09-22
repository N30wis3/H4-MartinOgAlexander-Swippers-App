import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { unseenMatchCount } from '@/state/store';
import { useApp } from '@/state/AppContext';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function tabIcon(name: IconName, focusedName: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <MaterialCommunityIcons name={focused ? focusedName : name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const { data } = useApp();
  const insets = useSafeAreaInsets();
  const unseen = data ? unseenMatchCount(data) : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDim,
        // Explicit height: icon + label + the device's bottom inset (home bar).
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        sceneStyle: { backgroundColor: Colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: tabIcon('boxing-glove', 'boxing-glove') }} />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: tabIcon('message-text-outline', 'message-text'),
          tabBarBadge: unseen > 0 ? unseen : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.primary, color: Colors.onPrimary },
        }}
      />
      <Tabs.Screen name="leaderboard" options={{ title: 'Ranking', tabBarIcon: tabIcon('trophy-outline', 'trophy') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('account-outline', 'account') }} />
    </Tabs>
  );
}
