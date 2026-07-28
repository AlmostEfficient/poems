import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scanPoemImage, type ScannedPoem } from '../lib/scanner/poemScanner';
import { type, useAppColors } from '../styles/theme';

interface PoemScannerViewProps {
  onCancel: () => void;
  onScanned: (poem: ScannedPoem) => void;
}

export function PoemScannerView({ onCancel, onScanned }: PoemScannerViewProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanImage = useCallback(
    async (uri: string, mimeType?: string | null) => {
      setError(null);
      setIsScanning(true);
      try {
        const poem = await scanPoemImage(uri, mimeType ?? 'image/jpeg');
        if (process.env.EXPO_OS === 'ios') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onScanned(poem);
      } catch (scanError) {
        setError(scanError instanceof Error ? scanError.message : 'The image could not be scanned.');
        if (process.env.EXPO_OS === 'ios') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        setIsScanning(false);
      }
    },
    [onScanned]
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isScanning) return;
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });
      if (photo?.uri) await scanImage(photo.uri, 'image/jpeg');
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : 'The photo could not be taken.');
    }
  }, [isScanning, scanImage]);

  const choosePicture = useCallback(async () => {
    if (isScanning) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.86,
      allowsEditing: false,
    });
    const image = result.canceled ? null : result.assets[0];
    if (image) await scanImage(image.uri, image.mimeType);
  }, [isScanning, scanImage]);

  if (!permission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permissionContainer,
          {
            backgroundColor: colors.canvas,
            paddingTop: insets.top + 30,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={[styles.permissionIcon, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.permissionIconText, { color: colors.accent }]}>▣</Text>
        </View>
        <Text selectable style={[styles.permissionTitle, { color: colors.ink }]}>
          Scan a poem from the page
        </Text>
        <Text selectable style={[styles.permissionBody, { color: colors.secondary }]}>
          Frame the poem and we’ll turn it into editable text. You always review it before saving.
        </Text>

        <Pressable
          onPress={() =>
            permission.canAskAgain ? void requestPermission() : void Linking.openSettings()
          }
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={permission.canAskAgain ? 'Allow camera access' : 'Open camera settings'}
        >
          <Text style={styles.primaryButtonText}>
            {permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          </Text>
        </Pressable>
        <Pressable
          onPress={choosePicture}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose a poem image from photos"
        >
          <Text style={[styles.secondaryButtonText, { color: colors.ink }]}>
            Choose from photos
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.textButton} accessibilityRole="button">
          <Text style={[styles.textButtonText, { color: colors.secondary }]}>Not now</Text>
        </Pressable>
        {error ? (
          <Text selectable accessibilityRole="alert" style={[styles.permissionError, { color: colors.danger }]}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.cameraShade} pointerEvents="none" />

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <Pressable
          onPress={onCancel}
          disabled={isScanning}
          style={({ pressed }) => [
            styles.overlayButton,
            pressed && styles.pressed,
            isScanning && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
        >
          <Text style={styles.overlayButtonText}>Close</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.guide,
          { top: insets.top + 80, bottom: insets.bottom + 176 },
        ]}
        pointerEvents="none"
      >
        <View style={styles.guideCorners}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
        <Text style={styles.guideText}>Keep the poem flat and fill the frame</Text>
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + 24 }]}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text selectable accessibilityRole="alert" style={styles.errorBannerText}>
              {error}
            </Text>
          </View>
        ) : null}
        <View style={styles.controlRow}>
          <Pressable
            onPress={choosePicture}
            disabled={isScanning}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.pressed,
              isScanning && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Choose from photos"
          >
            <Text style={styles.photoGlyph}>▧</Text>
            <Text style={styles.photoButtonText}>Photos</Text>
          </Pressable>
          <Pressable
            onPress={takePicture}
            disabled={isScanning}
            style={({ pressed }) => [
              styles.shutterOuter,
              pressed && styles.shutterPressed,
              isScanning && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Take photo and scan poem"
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.controlBalance} />
        </View>
      </View>

      {isScanning ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.loadingTitle}>Reading the page…</Text>
          <Text style={styles.loadingBody}>You’ll review the text before it’s saved.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  permissionIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderCurve: 'continuous',
    marginBottom: 22,
  },
  permissionIconText: {
    fontSize: 30,
  },
  permissionTitle: {
    maxWidth: 340,
    fontFamily: type.display,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBody: {
    maxWidth: 350,
    paddingTop: 10,
    paddingBottom: 24,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    maxWidth: 380,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 380,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    borderWidth: 1,
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  textButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  permissionError: {
    maxWidth: 360,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
  },
  overlayButton: {
    minWidth: 70,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 19, 18, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  overlayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  guide: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 14,
  },
  guideCorners: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 16,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowRadius: 6,
  },
  controls: {
    position: 'absolute',
    left: 22,
    right: 22,
    gap: 12,
  },
  controlRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoButton: {
    width: 78,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 19, 18, 0.62)',
  },
  photoGlyph: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  shutterOuter: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
  },
  controlBalance: {
    width: 78,
  },
  errorBanner: {
    alignSelf: 'center',
    maxWidth: 380,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(130, 43, 35, 0.92)',
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(12, 11, 10, 0.78)',
  },
  loadingTitle: {
    paddingTop: 8,
    color: '#FFFFFF',
    fontFamily: type.display,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '600',
  },
  loadingBody: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.42,
  },
});
