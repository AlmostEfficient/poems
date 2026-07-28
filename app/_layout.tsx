import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { PoemsAppProvider } from '../providers/poems-app-provider';
import { useAppColors } from '../styles/theme';

function RootNavigator() {
  const colors = useAppColors();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.canvas },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="poem/[id]"
          options={{
            title: '',
            headerTransparent: true,
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="add-poem"
          options={{
            title: 'Add a poem',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.86, 1],
          }}
        />
        <Stack.Screen
          name="scanner"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            title: 'Account',
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.68, 1],
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <PoemsAppProvider>
      <RootNavigator />
    </PoemsAppProvider>
  );
}

