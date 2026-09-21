import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';
import type { IconComponent } from '@/components/IconLibrary';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconComponent;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled = false,
  loading = false,
  compact = false,
  fullWidth = false,
}: Props) {
  const { theme, rowDirection } = useSettings();

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    secondary: { bg: theme.surfaceAlt, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
    danger: { bg: theme.danger, fg: '#FFFFFF', border: theme.danger },
  };
  const colors = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          flexDirection: rowDirection,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: compact ? spacing.sm : spacing.md,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} size="small" />
      ) : (
        <View style={[styles.content, { flexDirection: rowDirection }]}>
          {Icon ? <Icon size={compact ? 16 : 18} color={colors.fg} strokeWidth={2} /> : null}
          <Text
            numberOfLines={1}
            style={[styles.label, { color: colors.fg, fontSize: compact ? 13 : 15 }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: '600',
  },
});
