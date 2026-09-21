import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Fraction of the screen height the sheet may use. */
  maxHeight?: number;
}

/** Bottom sheet used by every property panel in the editor. */
export function Sheet({ visible, title, onClose, children, maxHeight = 0.75 }: Props) {
  const { theme, rowDirection, textAlign } = useSettings();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="none" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              maxHeight: `${Math.round(maxHeight * 100)}%`,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          <View style={[styles.header, { flexDirection: rowDirection }]}>
            <Text style={[styles.title, { color: theme.text, textAlign }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <X size={22} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.lg,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
