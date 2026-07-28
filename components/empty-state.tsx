import { StyleSheet, Text, View } from 'react-native';
import { type, useAppColors } from '../styles/theme';

export function EmptyState({
  symbol,
  title,
  body,
}: {
  symbol: string;
  title: string;
  body: string;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.container}>
      <View style={[styles.symbol, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.symbolText, { color: colors.accent }]}>{symbol}</Text>
      </View>
      <Text selectable style={[styles.title, { color: colors.ink }]}>
        {title}
      </Text>
      <Text selectable style={[styles.body, { color: colors.secondary }]}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingBottom: 44,
  },
  symbol: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    marginBottom: 18,
  },
  symbolText: {
    fontSize: 25,
  },
  title: {
    fontFamily: type.display,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    maxWidth: 330,
    paddingTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
