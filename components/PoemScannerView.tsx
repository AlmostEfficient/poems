import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { scanPoemImage, type ScannedPoem } from '../lib/scanner/poemScanner';
import { styles } from '../styles/styles';

interface PoemScannerViewProps {
  onCancel: () => void;
  onScanned: (poem: ScannedPoem) => void;
}

export function PoemScannerView({ onCancel, onScanned }: PoemScannerViewProps) {
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
        onScanned(poem);
      } catch (scanError) {
        setError(scanError instanceof Error ? scanError.message : 'The image could not be scanned.');
      } finally {
        setIsScanning(false);
      }
    },
    [onScanned]
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isScanning) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.78,
        skipProcessing: false,
      });
      if (photo?.uri) {
        await scanImage(photo.uri, 'image/jpeg');
      }
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : 'The photo could not be taken.');
    }
  }, [isScanning, scanImage]);

  const choosePicture = useCallback(async () => {
    if (isScanning) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.82,
      allowsEditing: false,
    });
    const image = result.canceled ? null : result.assets[0];
    if (image) {
      await scanImage(image.uri, image.mimeType);
    }
  }, [isScanning, scanImage]);

  if (!permission) {
    return (
      <View style={styles.scannerPermissionContainer}>
        <ActivityIndicator color="#2c2c2c" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.scannerPermissionContainer}>
        <Text style={styles.scannerPermissionTitle}>Scan a poem</Text>
        <Text style={styles.scannerPermissionText}>
          Camera access lets you photograph a poem and turn it into editable text.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.libraryPrimaryButton, pressed && styles.saveButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
        >
          <Text style={styles.libraryPrimaryButtonText}>Allow camera</Text>
        </Pressable>
        <Pressable
          onPress={choosePicture}
          style={({ pressed }) => [styles.accountSecondaryButton, pressed && styles.saveButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Choose a poem image from photo library"
        >
          <Text style={styles.accountSecondaryButtonText}>Choose a photo instead</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.accountTextButton, pressed && styles.saveButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Cancel scanning poem"
        >
          <Text style={styles.accountTextButtonText}>Cancel</Text>
        </Pressable>
        {error ? (
          <Text style={styles.scannerError} accessibilityRole="alert" selectable>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <CameraView ref={cameraRef} style={styles.scannerCamera} facing="back" />
      <View style={styles.scannerTopBar}>
        <Pressable
          onPress={onCancel}
          disabled={isScanning}
          style={({ pressed }) => [
            styles.scannerOverlayButton,
            pressed && styles.saveButtonPressed,
            isScanning && styles.accountButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cancel scanning poem"
        >
          <Text style={styles.scannerOverlayButtonText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.scannerGuide} pointerEvents="none">
        <View style={styles.scannerGuideFrame} />
        <Text style={styles.scannerGuideText}>Keep the poem flat and fill the frame</Text>
      </View>

      <View style={styles.scannerControls}>
        {error ? (
          <Text style={styles.scannerErrorBanner} accessibilityRole="alert" selectable>
            {error}
          </Text>
        ) : null}
        <View style={styles.scannerControlRow}>
          <Pressable
            onPress={choosePicture}
            disabled={isScanning}
            style={({ pressed }) => [
              styles.scannerOverlayButton,
              pressed && styles.saveButtonPressed,
              isScanning && styles.accountButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Choose a poem image from photo library"
          >
            <Text style={styles.scannerOverlayButtonText}>Photos</Text>
          </Pressable>
          <Pressable
            onPress={takePicture}
            disabled={isScanning}
            style={({ pressed }) => [
              styles.scannerShutterOuter,
              pressed && styles.saveButtonPressed,
              isScanning && styles.accountButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Take picture and scan poem"
          >
            <View style={styles.scannerShutterInner} />
          </Pressable>
          <View style={styles.scannerControlSpacer} />
        </View>
      </View>

      {isScanning ? (
        <View style={styles.scannerLoadingOverlay}>
          <ActivityIndicator color="#ffffff" size="large" />
          <Text style={styles.scannerLoadingText}>Extracting poem…</Text>
        </View>
      ) : null}
    </View>
  );
}
