import { Anton_400Regular, useFonts } from '@expo-google-fonts/anton';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { isProfileComplete } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({ Anton_400Regular });

  useEffect(() => {
    async function checkSessionAndRoute() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace('/loginChoice');
      } else {
        const complete = await isProfileComplete(session.user.id);
        router.replace(complete ? '/(tabs)' : '/onboarding');
      }

      setIsReady(true);
    }

    checkSessionAndRoute();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/loginChoice');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded]);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="loginChoice" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </ThemeProvider>
  );
}
