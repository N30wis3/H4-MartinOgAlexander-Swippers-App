import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

// The welcome screen is the first thing a signed-out user sees.
export const unstable_settings = { anchor: 'welcome' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }} />;
}
