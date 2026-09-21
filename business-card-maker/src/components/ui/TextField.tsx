import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';

interface Props {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  maxLength?: number;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
}: Props) {
  const { theme, textAlign } = useSettings();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: theme.textMuted, textAlign }]}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
            color: theme.text,
            textAlign,
            minHeight: multiline ? 88 : 46,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
});
