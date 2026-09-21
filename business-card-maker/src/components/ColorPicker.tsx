import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { TextField } from './ui/TextField';
import { useSettings } from '@/context/SettingsContext';
import { SWATCHES } from '@/theme/colors';
import { radius, spacing } from '@/theme/layout';
import { contrastColor, isValidHex } from '@/utils/color';

interface Props {
  label: string;
  value: string;
  onChange: (color: string) => void;
  allowTransparent?: boolean;
}

export function ColorPicker({ label, value, onChange, allowTransparent = false }: Props) {
  const { theme, textAlign, t } = useSettings();
  const [hex, setHex] = useState(value);

  // Keep the text field in sync when the colour changes from outside (a swatch
  // tap, or the picker being reused for another element).
  useEffect(() => {
    setHex(value);
  }, [value]);

  const applyHex = (next: string) => {
    setHex(next);
    const candidate = next.startsWith('#') ? next : `#${next}`;
    if (isValidHex(candidate)) onChange(candidate.toUpperCase());
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textMuted, textAlign }]}>{label}</Text>
      <View style={styles.grid}>
        {allowTransparent ? (
          <Pressable
            onPress={() => onChange('transparent')}
            style={[styles.swatch, styles.transparent, { borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.none')}
          >
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>{t('common.none')}</Text>
          </Pressable>
        ) : null}
        {SWATCHES.map((swatch) => {
          const active = swatch.toUpperCase() === value.toUpperCase();
          return (
            <Pressable
              key={swatch}
              onPress={() => {
                setHex(swatch);
                onChange(swatch);
              }}
              accessibilityRole="button"
              accessibilityLabel={swatch}
              style={[
                styles.swatch,
                { backgroundColor: swatch, borderColor: active ? theme.primary : theme.border },
                active ? styles.swatchActive : null,
              ]}
            >
              {active ? <Check size={14} color={contrastColor(swatch)} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </View>
      <TextField
        value={hex}
        onChangeText={applyHex}
        placeholder="#RRGGBB"
        autoCapitalize="none"
        maxLength={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderWidth: 2.5 },
  transparent: { width: 54 },
});
