import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ColorPicker } from '@/components/ColorPicker';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { useEditor } from '@/context/EditorContext';
import { useSettings } from '@/context/SettingsContext';
import { GRADIENT_PRESETS } from '@/theme/colors';
import { radius, spacing } from '@/theme/layout';
import { angleToPoints } from '@/utils/color';
import type { PatternKind } from '@/types/card';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function BackgroundPanel({ visible, onClose }: Props) {
  const { t, theme, textAlign } = useSettings();
  const { currentSide, setBackground } = useEditor();
  const [bothSides, setBothSides] = React.useState(false);
  const background = currentSide.background;

  const update = (patch: Parameters<typeof setBackground>[0]) =>
    setBackground(patch, bothSides);

  return (
    <Sheet visible={visible} title={t('editor.background')} onClose={onClose} maxHeight={0.85}>
      <Toggle
        label={t('editor.applyToBothSides')}
        value={bothSides}
        onChange={setBothSides}
      />

      <Segmented
        label={t('editor.background')}
        value={background.gradient ? 'gradient' : 'solid'}
        onChange={(mode) =>
          update({
            gradient:
              mode === 'gradient'
                ? { colors: [background.color, '#4F46E5'], angle: 135 }
                : null,
          })
        }
        options={[
          { value: 'solid', label: t('editor.solid') },
          { value: 'gradient', label: t('editor.gradient') },
        ]}
      />

      {background.gradient ? (
        <View>
          <Text style={[styles.label, { color: theme.textMuted, textAlign }]}>
            {t('editor.gradient')}
          </Text>
          <View style={styles.presets}>
            {GRADIENT_PRESETS.map((preset, index) => {
              const points = angleToPoints(preset.angle);
              return (
                <Pressable
                  key={index}
                  onPress={() => update({ gradient: { ...preset } })}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={preset.colors as [string, string, ...string[]]}
                    start={points.start}
                    end={points.end}
                    style={[styles.preset, { borderColor: theme.border }]}
                  />
                </Pressable>
              );
            })}
          </View>
          <Slider
            label={t('editor.gradientAngle')}
            value={background.gradient.angle}
            min={0}
            max={360}
            formatValue={(value) => `${Math.round(value)}°`}
            onChange={(angle) =>
              update({
                gradient: background.gradient ? { ...background.gradient, angle } : null,
              })
            }
          />
        </View>
      ) : (
        <ColorPicker
          label={t('editor.color')}
          value={background.color}
          onChange={(color) => update({ color })}
        />
      )}

      <Segmented<PatternKind>
        label={t('editor.pattern')}
        value={background.pattern}
        onChange={(pattern) => update({ pattern })}
        scrollable
        options={[
          { value: 'none', label: t('common.none') },
          { value: 'dots', label: t('editor.patternDots') },
          { value: 'grid', label: t('editor.patternGrid') },
          { value: 'diagonal', label: t('editor.patternDiagonal') },
          { value: 'waves', label: t('editor.patternWaves') },
        ]}
      />

      {background.pattern !== 'none' ? (
        <View>
          <ColorPicker
            label={t('editor.pattern')}
            value={background.patternColor}
            onChange={(patternColor) => update({ patternColor })}
          />
          <Slider
            label={t('editor.patternOpacity')}
            value={background.patternOpacity}
            min={0.02}
            max={0.6}
            step={0.02}
            formatValue={(value) => `${Math.round(value * 100)}%`}
            onChange={(patternOpacity) => update({ patternOpacity })}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: spacing.sm },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  preset: { width: 54, height: 40, borderRadius: radius.sm, borderWidth: 1 },
});
