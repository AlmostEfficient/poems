import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '../styles/theme';

export function SegmentedPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  const colors = useAppColors();
  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (option.value === value) return;
              if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                boxShadow: '0 1px 3px rgba(51, 42, 33, 0.09)',
              },
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.ink : colors.secondary },
                selected && styles.labelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 46,
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 13,
    borderCurve: 'continuous',
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  labelSelected: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});

