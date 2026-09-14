import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Placeholder — this is where step 2 of registration lives (gender,
// height/weight/age brackets, kampsport, location), calling
// upsertUserConfig() from @/lib/auth. Not built yet.
export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Complete your profile</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
