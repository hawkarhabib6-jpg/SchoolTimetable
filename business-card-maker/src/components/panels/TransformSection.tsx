import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { useEditor } from '@/context/EditorContext';
import { useSettings } from '@/context/SettingsContext';
import { spacing } from '@/theme/layout';
import { CARD_HEIGHT, CARD_WIDTH, type CardElement } from '@/types/card';
import { centerHorizontally, centerVertically } from '@/utils/geometry';

/** Position, size, rotation, opacity and layer actions shared by all elements. */
export function TransformSection({ element }: { element: CardElement }) {
  const { t, rowDirection } = useSettings();
  const { updateElement, removeElement, duplicateElement, reorder } = useEditor();

  const patch = (values: Partial<CardElement>, transient = true) =>
    updateElement(element.id, values, transient);

  return (
    <View>
      <Slider
        label={t('editor.width')}
        value={element.width}
        min={20}
        max={CARD_WIDTH}
        step={2}
        onChange={(width) => patch({ width })}
        onCommit={(width) => patch({ width }, false)}
      />
      <Slider
        label={t('editor.height')}
        value={element.height}
        min={20}
        max={CARD_HEIGHT}
        step={2}
        onChange={(height) => patch({ height })}
        onCommit={(height) => patch({ height }, false)}
      />
      <Slider
        label={t('editor.rotation')}
        value={element.rotation}
        min={-180}
        max={180}
        step={1}
        formatValue={(value) => `${Math.round(value)}°`}
        onChange={(rotation) => patch({ rotation })}
        onCommit={(rotation) => patch({ rotation }, false)}
      />
      <Slider
        label={t('editor.opacity')}
        value={element.opacity}
        min={0.05}
        max={1}
        step={0.05}
        formatValue={(value) => `${Math.round(value * 100)}%`}
        onChange={(opacity) => patch({ opacity })}
        onCommit={(opacity) => patch({ opacity }, false)}
      />

      <View style={[styles.row, { flexDirection: rowDirection }]}>
        <Button
          label={t('editor.centerHorizontally')}
          variant="secondary"
          compact
          icon={AlignHorizontalJustifyCenter}
          onPress={() => patch({ x: centerHorizontally(element) }, false)}
        />
        <Button
          label={t('editor.centerVertically')}
          variant="secondary"
          compact
          icon={AlignVerticalJustifyCenter}
          onPress={() => patch({ y: centerVertically(element) }, false)}
        />
      </View>

      <View style={[styles.row, { flexDirection: rowDirection }]}>
        <Button
          label={t('editor.bringForward')}
          variant="secondary"
          compact
          icon={ArrowUpToLine}
          onPress={() => reorder(element.id, 'forward')}
        />
        <Button
          label={t('editor.sendBackward')}
          variant="secondary"
          compact
          icon={ArrowDownToLine}
          onPress={() => reorder(element.id, 'backward')}
        />
      </View>

      <View style={[styles.row, { flexDirection: rowDirection }]}>
        <Button
          label={element.locked ? t('editor.unlock') : t('editor.lock')}
          variant="secondary"
          compact
          icon={element.locked ? Unlock : Lock}
          onPress={() => patch({ locked: !element.locked }, false)}
        />
        <Button
          label={t('editor.duplicateElement')}
          variant="secondary"
          compact
          icon={Copy}
          onPress={() => duplicateElement(element.id)}
        />
        <Button
          label={t('editor.deleteElement')}
          variant="danger"
          compact
          icon={Trash2}
          onPress={() => removeElement(element.id)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
});
