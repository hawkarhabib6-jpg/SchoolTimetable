import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Crop, Image as ImageIcon, RotateCw, Sparkles } from 'lucide-react-native';

import { TransformSection } from './TransformSection';
import { ColorPicker } from '@/components/ColorPicker';
import { FontPicker } from '@/components/FontPicker';
import { IconPicker } from '@/components/IconPicker';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Slider } from '@/components/ui/Slider';
import { TextField } from '@/components/ui/TextField';
import { Toggle } from '@/components/ui/Toggle';
import { useEditor } from '@/context/EditorContext';
import { useSettings } from '@/context/SettingsContext';
import { spacing } from '@/theme/layout';
import {
  cropToSquare,
  downscale,
  pickFromCamera,
  pickFromGallery,
  rotateImage,
} from '@/utils/imagePicker';
import type {
  CardElement,
  FontWeight,
  IconElement,
  ImageElement,
  QrElement,
  ShapeElement,
  TextAlign,
  TextElement,
} from '@/types/card';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Bottom sheet showing the properties of the selected element. */
export function ElementPanel({ visible, onClose }: Props) {
  const { t } = useSettings();
  const { selectedElement } = useEditor();

  const title = selectedElement ? panelTitle(selectedElement, t) : t('editor.nothingSelected');

  return (
    <Sheet visible={visible && selectedElement !== null} title={title} onClose={onClose} maxHeight={0.85}>
      {selectedElement ? (
        <View>
          {selectedElement.type === 'text' ? <TextSection element={selectedElement} /> : null}
          {selectedElement.type === 'image' ? <ImageSection element={selectedElement} /> : null}
          {selectedElement.type === 'shape' ? <ShapeSection element={selectedElement} /> : null}
          {selectedElement.type === 'icon' ? <IconSection element={selectedElement} /> : null}
          {selectedElement.type === 'qr' ? <QrSection element={selectedElement} /> : null}
          <View style={styles.divider} />
          <TransformSection element={selectedElement} />
        </View>
      ) : null}
    </Sheet>
  );
}

function panelTitle(element: CardElement, t: (key: string) => string): string {
  switch (element.type) {
    case 'text':
      return t('editor.text');
    case 'image':
      return t('editor.addImage');
    case 'shape':
      return t('editor.shape');
    case 'icon':
      return t('editor.icon');
    case 'qr':
      return t('editor.addQr');
    default:
      return '';
  }
}

function TextSection({ element }: { element: TextElement }) {
  const { t } = useSettings();
  const { updateElement } = useEditor();
  const patch = (values: Partial<TextElement>, transient = false) =>
    updateElement(element.id, values, transient);

  return (
    <View>
      <TextField
        label={t('editor.text')}
        value={element.text}
        onChangeText={(text) => patch({ text }, true)}
        multiline
      />
      <FontPicker
        label={t('editor.font')}
        value={element.fontId}
        onChange={(fontId) => patch({ fontId })}
      />
      <Slider
        label={t('editor.size')}
        value={element.fontSize}
        min={10}
        max={140}
        step={1}
        onChange={(fontSize) => patch({ fontSize }, true)}
        onCommit={(fontSize) => patch({ fontSize })}
      />
      <Segmented<FontWeight>
        label={t('editor.weight')}
        value={element.fontWeight}
        onChange={(fontWeight) => patch({ fontWeight })}
        options={[
          { value: '400', label: t('editor.weightRegular') },
          { value: '600', label: t('editor.weightSemibold') },
          { value: '700', label: t('editor.weightBold') },
        ]}
      />
      <Segmented<TextAlign>
        label={t('editor.alignment')}
        value={element.align}
        onChange={(align) => patch({ align })}
        options={[
          { value: 'left', label: t('editor.alignLeft') },
          { value: 'center', label: t('editor.alignCenter') },
          { value: 'right', label: t('editor.alignRight') },
        ]}
      />
      <Slider
        label={t('editor.lineHeight')}
        value={element.lineHeight}
        min={0.9}
        max={2.4}
        step={0.05}
        onChange={(lineHeight) => patch({ lineHeight }, true)}
        onCommit={(lineHeight) => patch({ lineHeight })}
      />
      <Slider
        label={t('editor.letterSpacing')}
        value={element.letterSpacing}
        min={-4}
        max={20}
        step={0.5}
        onChange={(letterSpacing) => patch({ letterSpacing }, true)}
        onCommit={(letterSpacing) => patch({ letterSpacing })}
      />
      <Toggle
        label={t('editor.uppercase')}
        value={element.uppercase}
        onChange={(uppercase) => patch({ uppercase })}
      />
      <ColorPicker
        label={t('editor.color')}
        value={element.color}
        onChange={(color) => patch({ color })}
      />
    </View>
  );
}

function ImageSection({ element }: { element: ImageElement }) {
  const { t, rowDirection } = useSettings();
  const { updateElement } = useEditor();
  const [busy, setBusy] = useState(false);
  const patch = (values: Partial<ImageElement>, transient = false) =>
    updateElement(element.id, values, transient);

  const replace = async (source: 'gallery' | 'camera') => {
    try {
      setBusy(true);
      const picked = source === 'gallery' ? await pickFromGallery() : await pickFromCamera();
      if (!picked) return;
      patch({ uri: await downscale(picked.uri) });
    } catch {
      Alert.alert(t('common.error'), t('editor.pickImageError'));
    } finally {
      setBusy(false);
    }
  };

  const applyCircleCrop = async () => {
    try {
      setBusy(true);
      const square = await cropToSquare(element.uri);
      const size = Math.min(element.width, element.height);
      patch({ uri: square, shape: 'circle', width: size, height: size });
    } catch {
      Alert.alert(t('common.error'), t('editor.pickImageError'));
    } finally {
      setBusy(false);
    }
  };

  const applyRotate = async () => {
    try {
      setBusy(true);
      patch({ uri: await rotateImage(element.uri, 90) });
    } catch {
      Alert.alert(t('common.error'), t('editor.pickImageError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={[styles.row, { flexDirection: rowDirection }]}>
        <Button
          label={t('editor.gallery')}
          variant="secondary"
          compact
          icon={ImageIcon}
          loading={busy}
          onPress={() => void replace('gallery')}
        />
        <Button
          label={t('editor.camera')}
          variant="secondary"
          compact
          icon={ImageIcon}
          loading={busy}
          onPress={() => void replace('camera')}
        />
      </View>
      <View style={[styles.row, { flexDirection: rowDirection }]}>
        <Button
          label={t('editor.cropCircle')}
          variant="secondary"
          compact
          icon={Crop}
          loading={busy}
          onPress={() => void applyCircleCrop()}
        />
        <Button
          label={t('editor.rotate90')}
          variant="secondary"
          compact
          icon={RotateCw}
          loading={busy}
          onPress={() => void applyRotate()}
        />
      </View>
      <Segmented<ImageElement['shape']>
        label={t('editor.shape')}
        value={element.shape}
        onChange={(shape) => patch({ shape })}
        options={[
          { value: 'rect', label: t('editor.shapeRect') },
          { value: 'rounded', label: t('editor.shapeRounded') },
          { value: 'circle', label: t('editor.shapeCircle') },
        ]}
      />
      <Segmented<ImageElement['resizeMode']>
        label={t('editor.fillMode')}
        value={element.resizeMode}
        onChange={(resizeMode) => patch({ resizeMode })}
        options={[
          { value: 'cover', label: t('editor.fillCover') },
          { value: 'contain', label: t('editor.fillContain') },
        ]}
      />
      {element.shape === 'rounded' ? (
        <Slider
          label={t('editor.cornerRadius')}
          value={element.cornerRadius}
          min={0}
          max={120}
          onChange={(cornerRadius) => patch({ cornerRadius }, true)}
          onCommit={(cornerRadius) => patch({ cornerRadius })}
        />
      ) : null}
      <Slider
        label={t('editor.borderWidth')}
        value={element.borderWidth}
        min={0}
        max={24}
        onChange={(borderWidth) => patch({ borderWidth }, true)}
        onCommit={(borderWidth) => patch({ borderWidth })}
      />
      {element.borderWidth > 0 ? (
        <ColorPicker
          label={t('editor.borderColor')}
          value={element.borderColor}
          onChange={(borderColor) => patch({ borderColor })}
        />
      ) : null}
      <Slider
        label={t('editor.shadow')}
        value={element.shadow}
        min={0}
        max={24}
        onChange={(shadow) => patch({ shadow }, true)}
        onCommit={(shadow) => patch({ shadow })}
      />
    </View>
  );
}

function ShapeSection({ element }: { element: ShapeElement }) {
  const { t } = useSettings();
  const { updateElement } = useEditor();
  const patch = (values: Partial<ShapeElement>, transient = false) =>
    updateElement(element.id, values, transient);

  return (
    <View>
      <Segmented<ShapeElement['shape']>
        label={t('editor.shape')}
        value={element.shape}
        onChange={(shape) => patch({ shape })}
        scrollable
        options={[
          { value: 'rect', label: t('editor.shapeRect') },
          { value: 'circle', label: t('editor.shapeCircle') },
          { value: 'line', label: t('editor.shapeLine') },
          { value: 'triangle', label: t('editor.shapeTriangle') },
        ]}
      />
      {element.shape === 'rect' ? (
        <Slider
          label={t('editor.cornerRadius')}
          value={element.cornerRadius}
          min={0}
          max={200}
          onChange={(cornerRadius) => patch({ cornerRadius }, true)}
          onCommit={(cornerRadius) => patch({ cornerRadius })}
        />
      ) : null}
      <ColorPicker
        label={t('editor.color')}
        value={element.color}
        onChange={(color) => patch({ color, gradient: null })}
      />
      <Button
        label={element.gradient ? t('common.reset') : t('editor.gradient')}
        variant="secondary"
        compact
        icon={Sparkles}
        onPress={() =>
          patch({
            gradient: element.gradient
              ? null
              : { colors: [element.color, '#06B6D4'], angle: 135 },
          })
        }
      />
      {element.gradient ? (
        <View style={styles.gradientBlock}>
          <ColorPicker
            label={`${t('editor.gradient')} 1`}
            value={element.gradient.colors[0]}
            onChange={(color) =>
              patch({
                gradient: element.gradient
                  ? { ...element.gradient, colors: [color, element.gradient.colors[1] ?? color] }
                  : null,
              })
            }
          />
          <ColorPicker
            label={`${t('editor.gradient')} 2`}
            value={element.gradient.colors[1] ?? element.gradient.colors[0]}
            onChange={(color) =>
              patch({
                gradient: element.gradient
                  ? { ...element.gradient, colors: [element.gradient.colors[0], color] }
                  : null,
              })
            }
          />
          <Slider
            label={t('editor.gradientAngle')}
            value={element.gradient.angle}
            min={0}
            max={360}
            formatValue={(value) => `${Math.round(value)}°`}
            onChange={(angle) =>
              patch({ gradient: element.gradient ? { ...element.gradient, angle } : null }, true)
            }
            onCommit={(angle) =>
              patch({ gradient: element.gradient ? { ...element.gradient, angle } : null })
            }
          />
        </View>
      ) : null}
    </View>
  );
}

function IconSection({ element }: { element: IconElement }) {
  const { t } = useSettings();
  const { updateElement } = useEditor();
  const patch = (values: Partial<IconElement>, transient = false) =>
    updateElement(element.id, values, transient);

  return (
    <View>
      <IconPicker value={element.iconName} onChange={(iconName) => patch({ iconName })} />
      <ColorPicker
        label={t('editor.color')}
        value={element.color}
        onChange={(color) => patch({ color })}
      />
      <Slider
        label={t('editor.iconStroke')}
        value={element.strokeWidth}
        min={0.5}
        max={4}
        step={0.25}
        onChange={(strokeWidth) => patch({ strokeWidth }, true)}
        onCommit={(strokeWidth) => patch({ strokeWidth })}
      />
    </View>
  );
}

function QrSection({ element }: { element: QrElement }) {
  const { t } = useSettings();
  const { updateElement } = useEditor();
  const patch = (values: Partial<QrElement>, transient = false) =>
    updateElement(element.id, values, transient);

  return (
    <View>
      <Segmented<QrElement['source']>
        label={t('editor.qrSource')}
        value={element.source}
        onChange={(source) => patch({ source })}
        options={[
          { value: 'vcard', label: t('editor.qrVcard') },
          { value: 'custom', label: t('editor.qrCustom') },
        ]}
      />
      {element.source === 'custom' ? (
        <TextField
          label={t('editor.qrValue')}
          value={element.value}
          onChangeText={(value) => patch({ value }, true)}
          autoCapitalize="none"
          placeholder="https://"
        />
      ) : null}
      <ColorPicker
        label={t('editor.qrForeground')}
        value={element.color}
        onChange={(color) => patch({ color })}
      />
      <ColorPicker
        label={t('editor.qrBackground')}
        value={element.backgroundColor}
        onChange={(backgroundColor) => patch({ backgroundColor })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: 'rgba(127,127,127,0.25)', marginVertical: spacing.lg },
  gradientBlock: { marginTop: spacing.md },
});
