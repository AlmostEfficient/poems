import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ToastConfigParams } from 'react-native-toast-message';

export const toastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View style={[styles.container, styles.successContainer]}>
      {text1 && <Text style={styles.text1}>{text1}</Text>}
      {text2 && <Text style={styles.text2}>{text2}</Text>}
    </View>
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View style={[styles.container, styles.errorContainer]}>
      {text1 && <Text style={styles.text1}>{text1}</Text>}
      {text2 && <Text style={styles.text2}>{text2}</Text>}
    </View>
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View style={[styles.container, styles.infoContainer]}>
      {text1 && <Text style={styles.text1}>{text1}</Text>}
      {text2 && <Text style={styles.text2}>{text2}</Text>}
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  successContainer: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  text1: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  text2: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
});
