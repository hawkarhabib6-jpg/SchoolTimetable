import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { spacing } from '@/theme/layout';

interface Props {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, value, onChange }: Props) {
  const { theme, rowDirection } = useSettings();

  return (
    <View style={[styles.row, { flexDirection: rowDirection }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor={theme.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  label: { fontSize: 14, flex: 1 },
});
