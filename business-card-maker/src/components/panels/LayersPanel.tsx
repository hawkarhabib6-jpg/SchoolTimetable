import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  QrCode,
  Shapes,
  Trash2,
  Type as TypeIcon,
  Image as ImageIcon,
} from 'lucide-react-native';

import { Sheet } from '@/components/ui/Sheet';
import { useEditor } from '@/context/EditorContext';
import { useSettings } from '@/context/SettingsContext';
import { radius, spacing } from '@/theme/layout';
import type { CardElement } from '@/types/card';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LayersPanel({ visible, onClose }: Props) {
  const { t, theme, rowDirection, textAlign } = useSettings();
  const { currentSide, selectedId, select, reorder, removeElement } = useEditor();

  // Topmost element first, matching what the user sees on the card.
  const layers = [...currentSide.elements].reverse();

  return (
    <Sheet visible={visible} title={t('editor.layers')} onClose={onClose} maxHeight={0.7}>
      {layers.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted, textAlign }]}>
          {t('editor.nothingSelected')}
        </Text>
      ) : null}
      {layers.map((element) => {
        const active = element.id === selectedId;
        return (
          <Pressable
            key={element.id}
            onPress={() => select(element.id)}
            style={[
              styles.row,
              {
                flexDirection: rowDirection,
                backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
          >
            <LayerIcon element={element} color={active ? theme.primary : theme.textMuted} />
            <Text numberOfLines={1} style={[styles.label, { color: theme.text, textAlign }]}>
              {layerLabel(element)}
            </Text>
            {element.locked ? <Lock size={14} color={theme.textMuted} /> : null}
            <Pressable onPress={() => reorder(element.id, 'forward')} hitSlop={8}>
              <ChevronUp size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable onPress={() => reorder(element.id, 'backward')} hitSlop={8}>
              <ChevronDown size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable onPress={() => removeElement(element.id)} hitSlop={8}>
              <Trash2 size={18} color={theme.danger} />
            </Pressable>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

function LayerIcon({ element, color }: { element: CardElement; color: string }) {
  switch (element.type) {
    case 'text':
      return <TypeIcon size={18} color={color} />;
    case 'image':
      return <ImageIcon size={18} color={color} />;
    case 'qr':
      return <QrCode size={18} color={color} />;
    case 'shape':
      return <Shapes size={18} color={color} />;
    default:
      return <Eye size={18} color={color} />;
  }
}

function layerLabel(element: CardElement): string {
  if (element.type === 'text') return element.text.slice(0, 32) || 'Text';
  if (element.type === 'icon') return element.iconName;
  if (element.type === 'qr') return 'QR';
  if (element.type === 'image') return 'Image';
  return element.shape;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  label: { flex: 1, fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 13, paddingVertical: spacing.lg },
});
