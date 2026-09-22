import { Anton_400Regular, useFonts } from '@expo-google-fonts/anton';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { Colors } from '@/constants/theme';
import { AppProvider, useApp } from '@/state/AppContext';

SplashScreen.preventAutoHideAsync();

const NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.bg,
    card: Colors.bg,
    text: Colors.text,
    border: Colors.border,
    primary: Colors.primary,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Anton_400Regular });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={NavigationTheme}>
          <AppProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <Navigator fontsLoaded={fontsLoaded} />
            </ToastProvider>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// The three guarded groups are the whole navigation policy (FK.07 / NF.05.06):
//   signed out                   -> (auth)
//   signed in, onboarding unfinished -> onboarding
//   signed in, onboarding done   -> the app
// "Onboarding done" means a completed fighter profile, or (database mode
// only) a judge-only account that has chosen its role and saved a name.
// Expo Router redirects automatically whenever a guard flips.
function Navigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, account, onboardingComplete } = useApp();
  const loaded = ready && fontsLoaded;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  const signedIn = !!account;

  return (
    <View style={styles.frame}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboardingComplete}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboardingComplete}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[matchId]" />
          <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="judge" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  // On a wide browser window the app is centred at phone-like width.
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
    backgroundColor: Colors.bg,
  },
});
