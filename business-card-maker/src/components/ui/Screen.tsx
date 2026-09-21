import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { useSettings } from '@/context/SettingsContext';
import { spacing } from '@/theme/layout';

interface Props {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
}

export function Screen({
  title,
  subtitle,
  onBack,
  headerRight,
  children,
  edges = ['top'],
  padded = true,
}: Props) {
  const { theme, rowDirection, textAlign, isRTL } = useSettings();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={edges}>
      {title || onBack || headerRight ? (
        <View style={[styles.header, { flexDirection: rowDirection, borderBottomColor: theme.border }]}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backButton} accessibilityRole="button">
              <BackIcon size={22} color={theme.text} />
            </Pressable>
          ) : null}
          <View style={styles.titleBlock}>
            {title ? (
              <Text numberOfLines={1} style={[styles.title, { color: theme.text, textAlign }]}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textMuted, textAlign }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight ? (
            <View style={[styles.actions, { flexDirection: rowDirection }]}>{headerRight}</View>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.body, padded ? styles.padded : null]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 2 },
  titleBlock: { flex: 1 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  actions: { alignItems: 'center', gap: spacing.md },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
});
