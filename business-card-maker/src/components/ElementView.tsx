import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Polygon } from 'react-native-svg';

import { getIcon } from './IconLibrary';
import { fontFamily } from '@/theme/fonts';
import { angleToPoints } from '@/utils/color';
import type {
  CardElement,
  IconElement,
  ImageElement,
  QrElement,
  ShapeElement,
  TextElement,
} from '@/types/card';

interface Props {
  element: CardElement;
  /** Rendered pixels per card unit. */
  scale: number;
  /** vCard payload used by QR elements whose source is `vcard`. */
  vcardValue: string;
}

/**
 * Renders one card element. The same component is used on screen and during
 * the 300 DPI export — only `scale` differs.
 */
export function ElementView({ element, scale, vcardValue }: Props) {
  const frame = {
    position: 'absolute' as const,
    left: element.x * scale,
    top: element.y * scale,
    width: element.width * scale,
    height: element.height * scale,
    opacity: element.opacity,
    transform: [{ rotate: `${element.rotation}deg` }],
  };

  return <View style={frame}>{renderContent(element, scale, vcardValue)}</View>;
}

function renderContent(element: CardElement, scale: number, vcardValue: string) {
  switch (element.type) {
    case 'text':
      return <TextContent element={element} scale={scale} />;
    case 'image':
      return <ImageContent element={element} scale={scale} />;
    case 'shape':
      return <ShapeContent element={element} scale={scale} />;
    case 'icon':
      return <IconContent element={element} scale={scale} />;
    case 'qr':
      return <QrContent element={element} scale={scale} vcardValue={vcardValue} />;
    default:
      return null;
  }
}

function TextContent({ element, scale }: { element: TextElement; scale: number }) {
  const size = element.fontSize * scale;
  return (
    <Text
      allowFontScaling={false}
      style={{
        fontFamily: fontFamily(element.fontId, element.fontWeight),
        fontSize: size,
        lineHeight: size * element.lineHeight,
        letterSpacing: element.letterSpacing * scale,
        color: element.color,
        textAlign: element.align,
        width: '100%',
        // `includeFontPadding` keeps Arabic/Kurdish glyphs from being clipped.
        includeFontPadding: true,
        textAlignVertical: 'top',
      }}
    >
      {element.uppercase ? element.text.toUpperCase() : element.text}
    </Text>
  );
}

function ImageContent({ element, scale }: { element: ImageElement; scale: number }) {
  const radius =
    element.shape === 'circle'
      ? Math.min(element.width, element.height) * scale
      : element.shape === 'rounded'
        ? element.cornerRadius * scale
        : 0;

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        borderWidth: element.borderWidth * scale,
        borderColor: element.borderColor,
        overflow: 'hidden',
        ...(element.shadow > 0
          ? {
              shadowColor: '#000000',
              shadowOpacity: 0.35,
              shadowRadius: element.shadow * scale,
              shadowOffset: { width: 0, height: (element.shadow / 2) * scale },
              elevation: element.shadow,
            }
          : null),
      }}
    >
      <Image
        source={{ uri: element.uri }}
        resizeMode={element.resizeMode}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function ShapeContent({ element, scale }: { element: ShapeElement; scale: number }) {
  if (element.shape === 'triangle') {
    const width = element.width * scale;
    const height = element.height * scale;
    return (
      <Svg width={width} height={height}>
        <Polygon
          points={`${width / 2},0 ${width},${height} 0,${height}`}
          fill={element.color}
        />
      </Svg>
    );
  }

  const radius =
    element.shape === 'circle'
      ? Math.min(element.width, element.height) * scale
      : element.shape === 'line'
        ? (element.height * scale) / 2
        : element.cornerRadius * scale;

  if (element.gradient) {
    const points = angleToPoints(element.gradient.angle);
    return (
      <LinearGradient
        colors={element.gradient.colors as [string, string, ...string[]]}
        start={points.start}
        end={points.end}
        style={{ width: '100%', height: '100%', borderRadius: radius }}
      />
    );
  }

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: element.color,
        borderRadius: radius,
      }}
    />
  );
}

function IconContent({ element, scale }: { element: IconElement; scale: number }) {
  const Icon = getIcon(element.iconName);
  const size = Math.min(element.width, element.height) * scale;
  return (
    <View style={styles.center}>
      <Icon size={size} color={element.color} strokeWidth={element.strokeWidth} />
    </View>
  );
}

function QrContent({
  element,
  scale,
  vcardValue,
}: {
  element: QrElement;
  scale: number;
  vcardValue: string;
}) {
  const size = Math.min(element.width, element.height) * scale;
  const value =
    element.source === 'vcard' ? vcardValue : element.value.trim() || ' ';
  return (
    <View style={styles.center}>
      <QRCode
        value={value}
        size={Math.max(size, 1)}
        color={element.color}
        backgroundColor={element.backgroundColor}
        ecl="M"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
