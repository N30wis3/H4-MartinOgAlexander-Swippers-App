import { View } from 'react-native';

// The root layout (_layout.tsx) handles all routing on launch based on
// session state. This screen only exists so Expo Router has something
// to resolve to before that redirect happens — it renders nothing.
export default function Index() {
  return <View />;
}
