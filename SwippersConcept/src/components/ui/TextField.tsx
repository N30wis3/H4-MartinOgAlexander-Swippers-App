import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

// The field draws its own focus border, so hide the browser's default outline.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined;

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  // Adds a show/hide toggle for password fields.
  secureToggle?: boolean;
}

export function TextField({ label, error, hint, secureToggle, secureTextEntry, multiline, ...rest }: Props) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const isSecure = secureToggle ? hidden : secureTextEntry;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" dim>
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={Colors.textFaint}
          secureTextEntry={isSecure}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline, webNoOutline]}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.toggle}>
            <MaterialCommunityIcons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={Colors.textDim} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={Colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" dim>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: Spacing.md },
  focused: { borderColor: Colors.text },
  errored: { borderColor: Colors.danger },
  input: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: Spacing.md },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top', paddingVertical: 0 },
  toggle: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', marginRight: -Spacing.md },
});
