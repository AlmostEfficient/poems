import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ToastConfigParams } from 'react-native-toast-message';
import { useAppColors } from '../styles/theme';

function ToastBody({
  text1,
  text2,
  tone,
}: ToastConfigParams<any> & { tone: 'success' | 'error' | 'info' }) {
  const colors = useAppColors();
  const marker = tone === 'error' ? colors.danger : tone === 'success' ? colors.success : colors.accent;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.marker, { backgroundColor: marker }]} />
      <View style={styles.copy}>
        {text1 ? <Text style={[styles.text1, { color: colors.ink }]}>{text1}</Text> : null}
        {text2 ? <Text style={[styles.text2, { color: colors.secondary }]}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: ToastConfigParams<any>) => <ToastBody {...props} tone="success" />,
  error: (props: ToastConfigParams<any>) => <ToastBody {...props} tone="error" />,
  info: (props: ToastConfigParams<any>) => <ToastBody {...props} tone="info" />,
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 420,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 8px 28px rgba(47, 38, 29, 0.16)',
  },
  marker: {
    alignSelf: 'stretch',
    width: 4,
  },
  copy: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text1: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  text2: {
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 2,
  },
});
