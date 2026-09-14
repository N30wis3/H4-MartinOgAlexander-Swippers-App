import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Login</ThemedText>
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
