import { StyleSheet, View } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { CustomBottomBar } from '@/components/CustomBottomBar';
import { UserCard } from '@/components/userCard';
import { SwipeActions } from '@expo/ui/swift-ui';
import { SwipeCard } from '@/components/swipeCard';

export default function mainPage() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <>
        <SwipeCard>
          <UserCard />
        </SwipeCard>
        <CustomBottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    alignItems: 'center',
    top: '5%',
    fontFamily: 'Anton_400Regular',
    fontSize: 10,
  },
});