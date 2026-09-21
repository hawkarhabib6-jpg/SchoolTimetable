import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { spacing } from '@/theme/layout';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Fired continuously while dragging. */
  onChange: (value: number) => void;
  /** Fired once when the gesture ends — use it to commit to history. */
  onCommit?: (value: number) => void;
  formatValue?: (value: number) => string;
}

/**
 * Dependency-free slider: one less native module to keep compatible with EAS.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  formatValue,
}: Props) {
  const { theme, rowDirection, isRTL } = useSettings();
  const [trackWidth, setTrackWidth] = useState(0);
  const latest = useRef(value);
  latest.current = value;
  const widthRef = useRef(0);
  widthRef.current = trackWidth;

  const valueFromPosition = (positionX: number) => {
    const width = widthRef.current;
    if (width <= 0) return latest.current;
    const ratio = Math.min(1, Math.max(0, positionX / width));
    const directional = isRTL ? 1 - ratio : ratio;
    const raw = min + directional * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, Number(stepped.toFixed(4))));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          onChange(valueFromPosition(event.nativeEvent.locationX));
        },
        onPanResponderMove: (event) => {
          onChange(valueFromPosition(event.nativeEvent.locationX));
        },
        onPanResponderRelease: (event) => {
          const next = valueFromPosition(event.nativeEvent.locationX);
          onChange(next);
          onCommit?.(next);
        },
      }),
    // `valueFromPosition` reads refs, so it stays correct without re-creating.
    [isRTL, max, min, onChange, onCommit, step],
  );

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const fillWidth = Math.min(1, Math.max(0, ratio)) * trackWidth;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.text }]}>
          {formatValue ? formatValue(value) : String(Math.round(value * 100) / 100)}
        </Text>
      </View>
      <View
        {...responder.panHandlers}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={styles.touchArea}
      >
        <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              {
                width: fillWidth,
                backgroundColor: theme.primary,
                left: isRTL ? undefined : 0,
                right: isRTL ? 0 : undefined,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: theme.primary,
              borderColor: theme.surface,
              left: isRTL ? undefined : Math.max(0, fillWidth - 11),
              right: isRTL ? Math.max(0, fillWidth - 11) : undefined,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
  touchArea: {
    height: 34,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
});
