import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DisplayFont, gradientFor } from '@/constants/theme';

interface Props {
  id: string;
  name: string;
  photoUri?: string | null;
  size?: number;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Shows the profile photo, or a stable coloured gradient with initials when
// the fighter has not uploaded one.
export function Avatar({ id, name, photoUri, size = 48 }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        accessibilityLabel={`${name}'s photo`}
        style={[styles.base, dimension]}
        contentFit="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={gradientFor(id)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, styles.center, dimension]}>
      <View accessible={false}>
        <AppText style={{ fontFamily: DisplayFont, fontSize: size * 0.4, lineHeight: size * 0.5 }}>
          {initialsOf(name)}
        </AppText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
