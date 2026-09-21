import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { FONTS, fontFamily } from '@/theme/fonts';
import { radius, spacing } from '@/theme/layout';
import type { FontId } from '@/types/card';

interface Props {
  label: string;
  value: FontId;
  onChange: (font: FontId) => void;
  /** Sample text rendered in each font — defaults to the active language. */
  sample?: string;
}

export function FontPicker({ label, value, onChange, sample }: Props) {
  const { theme, textAlign, settings } = useSettings();
  const preview =
    sample ??
    (settings.language === 'en' ? 'Aa Bb Cc' : settings.language === 'ar' ? 'أبجد Aa' : 'ئابج Aa');

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textMuted, textAlign }]}>{label}</Text>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.list} nestedScrollEnabled>
        {FONTS.map((font) => {
          const active = font.id === value;
          return (
            <Pressable
              key={font.id}
              onPress={() => onChange(font.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.row,
                {
                  backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.name, { color: theme.text }]}>{font.label}</Text>
              <Text
                style={{
                  fontFamily: fontFamily(font.id, '600'),
                  fontSize: 18,
                  color: theme.textMuted,
                }}
              >
                {preview}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: spacing.sm },
  list: { maxHeight: 280 },
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: { fontSize: 13, fontWeight: '600' },
});
