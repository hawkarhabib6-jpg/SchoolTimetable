import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ICON_NAMES, getIcon } from './IconLibrary';
import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';

interface Props {
  value?: string;
  onChange: (name: string) => void;
}

export function IconPicker({ value, onChange }: Props) {
  const { theme } = useSettings();

  return (
    <View style={styles.grid}>
      {ICON_NAMES.map((name) => {
        const Icon = getIcon(name);
        const active = name === value;
        return (
          <Pressable
            key={name}
            onPress={() => onChange(name)}
            accessibilityRole="button"
            accessibilityLabel={name}
            style={[
              styles.cell,
              {
                backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
          >
            <Icon size={22} color={active ? theme.primary : theme.text} strokeWidth={2} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cell: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
