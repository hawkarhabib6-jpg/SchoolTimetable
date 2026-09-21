import React, { forwardRef } from 'react';
import { View, type ViewStyle } from 'react-native';

import { BackgroundLayer } from './BackgroundLayer';
import { ElementView } from './ElementView';
import { CARD_HEIGHT, CARD_WIDTH, type CardSide } from '@/types/card';
import { vcardQrValue } from '@/utils/vcard';
import type { CardContact } from '@/types/card';

interface Props {
  side: CardSide;
  contact: CardContact;
  /** Rendered width in pixels; height follows the 3.5:2 card ratio. */
  width: number;
  style?: ViewStyle;
  rounded?: boolean;
}

/**
 * Read-only render of one card side. Used for thumbnails, previews and — at
 * `width = CARD_WIDTH` — for the print-resolution export capture.
 */
export const CardCanvas = forwardRef<View, Props>(function CardCanvas(
  { side, contact, width, style, rounded = true },
  ref,
) {
  const scale = width / CARD_WIDTH;
  const height = CARD_HEIGHT * scale;
  const vcard = vcardQrValue(contact);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        {
          width,
          height,
          overflow: 'hidden',
          borderRadius: rounded ? 12 * Math.max(scale, 0.4) : 0,
          backgroundColor: side.background.color,
        },
        style,
      ]}
    >
      <BackgroundLayer background={side.background} width={width} height={height} />
      {side.elements.map((element) => (
        <ElementView
          key={element.id}
          element={element}
          scale={scale}
          vcardValue={vcard}
        />
      ))}
    </View>
  );
});
