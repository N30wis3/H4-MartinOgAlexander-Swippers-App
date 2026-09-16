// components/CustomBottomBar.tsx
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const TABS = [
  { name: 'Home', route: '/mainPage', icon: require('@/assets/images/tabIcons/home.png') },
  { name: 'Messages', route: '/messages', icon: require('@/assets/images/tabIcons/home.png') },
  // add more as needed
];

export function CustomBottomBar() {
  const router = useRouter();
  const pathname = usePathname();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View style={[styles.bar, { backgroundColor: colors.background }]}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <Pressable
            key={tab.route}
            style={styles.tabItem}
            onPress={() => router.push(tab.route as any)}
          >
            <Image
              source={tab.icon}
              style={[styles.icon, { tintColor: isActive ? colors.text : colors.backgroundElement }]}
            />
            <ThemedText style={{ color: isActive ? colors.text : colors.backgroundElement, fontSize: 11 }}>
              {tab.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
});