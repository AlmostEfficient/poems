import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

const BASE_SIZE = 512;
const BASE_RADIUS = 113;
const DEFAULT_ICON_CONFIG = {
  textOffset: { x: -660, y: 70 },
  rotation: -5,
  fontSize: 82,
};

const LINES = [
  'I have heard that hysterical women',
  'say they are sick of the palette and',
  'fiddle-bow, of poems that are all',
  'imagination, and of men that are',
  'taken up with the shows that please',
  'them most and call them masterworks',
];

export interface PoemsAppIconProps {
  size?: number;
  rotation?: number;
  fontSize?: number;
  textOffset?: {
    x: number;
    y: number;
  };
  style?: StyleProp<ViewStyle>;
}

const highlightWord = 'poems';

export function PoemsAppIcon({
  size = 256,
  rotation = DEFAULT_ICON_CONFIG.rotation,
  fontSize = DEFAULT_ICON_CONFIG.fontSize,
  textOffset = DEFAULT_ICON_CONFIG.textOffset,
  style,
}: PoemsAppIconProps) {
  const scale = size / BASE_SIZE;
  const effectiveFontSize = fontSize * scale;
  const lineHeight = effectiveFontSize * 1.45;
  const radius = BASE_RADIUS * scale;
  const centeredTextOffsetY = -(LINES.length * lineHeight) / 2;

  return (
    <View style={[styles.wrapper, { width: size, height: size, borderRadius: radius }, style]}>
      <View style={[styles.canvas]}>
        <View
          style={[
            styles.textContainer,
            {
              width: BASE_SIZE * scale,
              transform: [
                { translateX: size / 2 },
                { translateY: size / 2 },
                { rotate: `${rotation}deg` },
                { translateX: textOffset.x * scale },
                { translateY: textOffset.y * scale + centeredTextOffsetY },
              ],
            },
          ]}
        >
          {LINES.map((line) => {
            const hasHighlight = line.includes(highlightWord);
            if (!hasHighlight) {
              return (
                <Text
                  key={line}
                  style={[
                    styles.line,
                    {
                      fontSize: effectiveFontSize,
                      lineHeight,
                    },
                  ]}
                >
                  {line}
                </Text>
              );
            }

            const highlightIndex = line.indexOf(highlightWord);
            const before = line.slice(0, highlightIndex);
            const after = line.slice(highlightIndex + highlightWord.length);

            return (
              <Text
                key={line}
                style={[
                  styles.line,
                  {
                    fontSize: effectiveFontSize,
                    lineHeight,
                  },
                ]}
              >
                {before}
                <Text
                  style={[
                    styles.highlight,
                    {
                      fontSize: effectiveFontSize + 6 * scale,
                    },
                  ]}
                >
                  {highlightWord}
                </Text>
                {after}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#f5f5f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvas: {
    ...StyleSheet.absoluteFill,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  line: {
    color: '#2a2a2a',
    fontFamily: Platform.select({
      ios: 'Georgia',
      default: 'serif',
    }),
    textAlign: 'left',
  },
  highlight: {
    color: '#c41e3a',
    fontWeight: '700',
    fontFamily: Platform.select({
      ios: 'Georgia',
      default: 'serif',
    }),
  },
});

export default PoemsAppIcon;
