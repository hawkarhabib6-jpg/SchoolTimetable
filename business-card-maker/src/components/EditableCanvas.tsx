import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { BackgroundLayer } from './BackgroundLayer';
import { ElementView } from './ElementView';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  type CardContact,
  type CardElement,
  type CardSide,
} from '@/types/card';
import { clampToCard, minSizeFor, snap } from '@/utils/geometry';
import { vcardQrValue } from '@/utils/vcard';
import { useTheme } from '@/context/SettingsContext';

interface Props {
  side: CardSide;
  contact: CardContact;
  width: number;
  selectedId: string | null;
  snapToGrid: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CardElement>, transient: boolean) => void;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** The interactive card surface: tap to select, drag to move, corners to resize. */
export function EditableCanvas({
  side,
  contact,
  width,
  selectedId,
  snapToGrid,
  onSelect,
  onChange,
}: Props) {
  const theme = useTheme();
  const scale = width / CARD_WIDTH;
  const height = CARD_HEIGHT * scale;
  const vcard = useMemo(() => vcardQrValue(contact), [contact]);
  const selected = side.elements.find((element) => element.id === selectedId) ?? null;

  return (
    <View
      style={[
        styles.card,
        { width, height, backgroundColor: side.background.color, borderColor: theme.border },
      ]}
    >
      <BackgroundLayer background={side.background} width={width} height={height} />

      {side.elements.map((element) => (
        <ElementView key={element.id} element={element} scale={scale} vcardValue={vcard} />
      ))}

      {/* Tapping empty canvas clears the selection. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => onSelect(null)}
        accessibilityRole="none"
      />

      {side.elements.map((element) => (
        <DragLayer
          key={`drag-${element.id}`}
          element={element}
          scale={scale}
          snapToGrid={snapToGrid}
          isSelected={element.id === selectedId}
          onSelect={onSelect}
          onChange={onChange}
        />
      ))}

      {selected && !selected.locked ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.selection,
              {
                left: selected.x * scale,
                top: selected.y * scale,
                width: selected.width * scale,
                height: selected.height * scale,
                borderColor: theme.primary,
              },
            ]}
          />
          {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((corner) => (
            <ResizeHandle
              key={corner}
              corner={corner}
              element={selected}
              scale={scale}
              snapToGrid={snapToGrid}
              color={theme.primary}
              onChange={onChange}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function DragLayer({
  element,
  scale,
  snapToGrid,
  isSelected,
  onSelect,
  onChange,
}: {
  element: CardElement;
  scale: number;
  snapToGrid: boolean;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CardElement>, transient: boolean) => void;
}) {
  const origin = useRef({ x: element.x, y: element.y });
  const moved = useRef(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !element.locked,
        onMoveShouldSetPanResponder: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => !element.locked && (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2),
        onPanResponderGrant: () => {
          origin.current = { x: element.x, y: element.y };
          moved.current = false;
          onSelect(element.id);
        },
        onPanResponderMove: (_event, gesture) => {
          moved.current = true;
          const next = clampToCard(
            snap(origin.current.x + gesture.dx / scale, snapToGrid),
            snap(origin.current.y + gesture.dy / scale, snapToGrid),
            element.width,
            element.height,
          );
          onChange(element.id, next, true);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (!moved.current) {
            onSelect(element.id);
            return;
          }
          const next = clampToCard(
            snap(origin.current.x + gesture.dx / scale, snapToGrid),
            snap(origin.current.y + gesture.dy / scale, snapToGrid),
            element.width,
            element.height,
          );
          // Final, non-transient update: this is the one that enters history.
          onChange(element.id, next, false);
        },
      }),
    [element, onChange, onSelect, scale, snapToGrid],
  );

  return (
    <View
      {...responder.panHandlers}
      style={{
        position: 'absolute',
        left: element.x * scale,
        top: element.y * scale,
        width: element.width * scale,
        height: element.height * scale,
        zIndex: isSelected ? 20 : 10,
      }}
    />
  );
}

function ResizeHandle({
  corner,
  element,
  scale,
  snapToGrid,
  color,
  onChange,
}: {
  corner: Corner;
  element: CardElement;
  scale: number;
  snapToGrid: boolean;
  color: string;
  onChange: (id: string, patch: Partial<CardElement>, transient: boolean) => void;
}) {
  const start = useRef({ x: element.x, y: element.y, width: element.width, height: element.height });
  const size = 26;

  const compute = (dx: number, dy: number) => {
    const min = minSizeFor(element);
    const deltaX = dx / scale;
    const deltaY = dy / scale;
    const base = start.current;
    let { x, y, width, height } = base;

    if (corner === 'br') {
      width = base.width + deltaX;
      height = base.height + deltaY;
    } else if (corner === 'bl') {
      width = base.width - deltaX;
      height = base.height + deltaY;
      x = base.x + deltaX;
    } else if (corner === 'tr') {
      width = base.width + deltaX;
      height = base.height - deltaY;
      y = base.y + deltaY;
    } else {
      width = base.width - deltaX;
      height = base.height - deltaY;
      x = base.x + deltaX;
      y = base.y + deltaY;
    }

    if (width < min.width) {
      if (corner === 'bl' || corner === 'tl') x = base.x + base.width - min.width;
      width = min.width;
    }
    if (height < min.height) {
      if (corner === 'tl' || corner === 'tr') y = base.y + base.height - min.height;
      height = min.height;
    }

    return {
      x: snap(x, snapToGrid),
      y: snap(y, snapToGrid),
      width: snap(width, snapToGrid),
      height: snap(height, snapToGrid),
    };
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          };
        },
        onPanResponderMove: (_event, gesture) => {
          onChange(element.id, compute(gesture.dx, gesture.dy), true);
        },
        onPanResponderRelease: (_event, gesture) => {
          onChange(element.id, compute(gesture.dx, gesture.dy), false);
        },
      }),
    // `compute` closes over the current element, so it is recreated with it.
    [element, onChange, scale, snapToGrid],
  );

  const left =
    (corner === 'tl' || corner === 'bl' ? element.x : element.x + element.width) * scale -
    size / 2;
  const top =
    (corner === 'tl' || corner === 'tr' ? element.y : element.y + element.height) * scale -
    size / 2;

  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.handle,
        { left, top, width: size, height: size, borderColor: color },
      ]}
    >
      <View style={[styles.handleDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selection: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    zIndex: 30,
  },
  handle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 40,
  },
  handleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
