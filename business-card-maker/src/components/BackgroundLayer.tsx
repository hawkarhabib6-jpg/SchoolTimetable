import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { CARD_HEIGHT, CARD_WIDTH, type CardBackground } from '@/types/card';
import { angleToPoints } from '@/utils/color';

interface Props {
  background: CardBackground;
  /** Rendered card width in pixels. */
  width: number;
  height: number;
}

/** Solid colour → gradient → pattern, drawn bottom-up behind the elements. */
export function BackgroundLayer({ background, width, height }: Props) {
  const gradient = background.gradient;
  const points = gradient ? angleToPoints(gradient.angle) : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: background.color }]} />
      {gradient && points ? (
        <LinearGradient
          colors={gradient.colors as [string, string, ...string[]]}
          start={points.start}
          end={points.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {background.pattern !== 'none' ? (
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
          style={StyleSheet.absoluteFill}
          opacity={background.patternOpacity}
        >
          {renderPattern(background.pattern, background.patternColor)}
        </Svg>
      ) : null}
    </View>
  );
}

function renderPattern(pattern: CardBackground['pattern'], color: string) {
  switch (pattern) {
    case 'dots': {
      const dots: React.ReactNode[] = [];
      for (let x = 30; x < CARD_WIDTH; x += 50) {
        for (let y = 30; y < CARD_HEIGHT; y += 50) {
          dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={5} fill={color} />);
        }
      }
      return <>{dots}</>;
    }
    case 'grid': {
      const lines: React.ReactNode[] = [];
      for (let x = 0; x <= CARD_WIDTH; x += 60) {
        lines.push(
          <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={CARD_HEIGHT} stroke={color} strokeWidth={2} />,
        );
      }
      for (let y = 0; y <= CARD_HEIGHT; y += 60) {
        lines.push(
          <Line key={`h${y}`} x1={0} y1={y} x2={CARD_WIDTH} y2={y} stroke={color} strokeWidth={2} />,
        );
      }
      return <>{lines}</>;
    }
    case 'diagonal': {
      const lines: React.ReactNode[] = [];
      for (let x = -CARD_HEIGHT; x < CARD_WIDTH; x += 48) {
        lines.push(
          <Line
            key={`d${x}`}
            x1={x}
            y1={0}
            x2={x + CARD_HEIGHT}
            y2={CARD_HEIGHT}
            stroke={color}
            strokeWidth={6}
          />,
        );
      }
      return <>{lines}</>;
    }
    case 'waves': {
      const paths: React.ReactNode[] = [];
      for (let i = 0; i < 6; i += 1) {
        const offset = i * 110;
        paths.push(
          <Path
            key={`w${i}`}
            d={`M 0 ${offset} Q ${CARD_WIDTH / 4} ${offset - 60} ${CARD_WIDTH / 2} ${offset} T ${CARD_WIDTH} ${offset}`}
            stroke={color}
            strokeWidth={6}
            fill="none"
          />,
        );
      }
      return <>{paths}</>;
    }
    default:
      return null;
  }
}
