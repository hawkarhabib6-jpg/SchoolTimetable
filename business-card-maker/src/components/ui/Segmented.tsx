import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
  label?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
  label,
}: Props<T>) {
  const { theme, rowDirection, textAlign } = useSettings();

  const items = (
    <View style={[styles.row, { flexDirection: rowDirection, backgroundColor: theme.surfaceAlt }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.item,
              {
                backgroundColor: active ? theme.primary : 'transparent',
                flex: scrollable ? 0 : 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.itemLabel,
                { color: active ? theme.onPrimary : theme.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: theme.textMuted, textAlign }]}>{label}</Text>
      ) : null}
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {items}
        </ScrollView>
      ) : (
        items
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: spacing.xs },
  row: {
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontSize: 13, fontWeight: '600' },
});
