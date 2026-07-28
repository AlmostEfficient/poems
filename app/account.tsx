import * as AppleAuthentication from 'expo-apple-authentication';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { usePoemsApp } from '../providers/poems-app-provider';
import { type, useAppColors } from '../styles/theme';

export default function AccountScreen() {
  const colors = useAppColors();
  const isDark = useColorScheme() === 'dark';
  const { auth, handleAccountDeleted } = usePoemsApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
  }, []);

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      await auth.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  };

  const requestCode = () => {
    void run(async () => {
      await auth.requestEmailSignInCode(email.trim());
      setCodeSent(true);
    });
  };

  const verifyCode = () => {
    void run(async () => {
      await auth.signInWithEmailCode(email.trim(), code);
      setCode('');
    });
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'Cloud backup, saved poems, and personal poems will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void run(async () => {
              await auth.deleteAccount();
              handleAccountDeleted();
              router.back();
            });
          },
        },
      ]
    );
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {auth.user ? (
            <>
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: colors.accentSoft, borderColor: colors.border },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.avatarText, { color: colors.accent }]}>
                    {(auth.user.name || auth.user.email).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.statusCopy}>
                  <Text selectable style={[styles.cardTitle, { color: colors.ink }]}>
                    Your library is backed up
                  </Text>
                  <Text selectable style={[styles.email, { color: colors.secondary }]}>
                    {auth.user.email}
                  </Text>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text selectable style={[styles.cardTitle, { color: colors.ink }]}>
                  Sync
                </Text>
                <Text selectable style={[styles.body, { color: colors.secondary }]}>
                  Saved and personal poems sync when a connection is available. Reading always works offline.
                </Text>
                <View style={styles.statusLine}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statusText, { color: colors.success }]}>On</Text>
                </View>
              </View>

              <Pressable
                disabled={isBusy}
                onPress={() => void run(auth.signOut)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  (pressed || isBusy) && styles.dimmed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <Text style={[styles.secondaryButtonText, { color: colors.ink }]}>Sign out</Text>
              </Pressable>

              <View style={styles.dangerZone}>
                <Text style={[styles.dangerTitle, { color: colors.danger }]}>Delete account</Text>
                <Text style={[styles.body, { color: colors.secondary }]}>
                  This removes your cloud data permanently. Poems stored only on this device are cleared too.
                </Text>
                <Pressable
                  disabled={isBusy}
                  onPress={deleteAccount}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    { borderColor: colors.danger },
                    (pressed || isBusy) && styles.dimmed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account permanently"
                >
                  <Text style={[styles.dangerButtonText, { color: colors.danger }]}>Delete account</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.intro}>
                <Text selectable style={[styles.introTitle, { color: colors.ink }]}>
                  Keep your library with you.
                </Text>
                <Text selectable style={[styles.introBody, { color: colors.secondary }]}>
                  An account adds private backup and sync. Reading, saving, scanning, and writing still work without one.
                </Text>
              </View>

              {isAppleAvailable ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={
                      isDark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={24}
                    style={styles.appleButton}
                    onPress={() => void run(auth.signInWithApple)}
                  />
                </View>
              ) : null}

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text selectable style={[styles.cardTitle, { color: colors.ink }]}>
                  Continue with email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  editable={!codeSent && !isBusy}
                  style={[
                    styles.input,
                    { color: colors.ink, backgroundColor: colors.canvas, borderColor: colors.border },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.tertiary}
                  accessibilityLabel="Email address"
                />

                {codeSent ? (
                  <>
                    <Text selectable style={[styles.codeHint, { color: colors.secondary }]}>
                      Enter the six-digit code sent to {email.trim()}.
                    </Text>
                    <TextInput
                      value={code}
                      onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                      style={[
                        styles.input,
                        styles.codeInput,
                        { color: colors.ink, backgroundColor: colors.canvas, borderColor: colors.border },
                      ]}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      maxLength={6}
                      placeholder="000000"
                      placeholderTextColor={colors.tertiary}
                      accessibilityLabel="Six-digit sign-in code"
                    />
                    <PrimaryButton
                      label="Continue"
                      disabled={isBusy || code.length !== 6}
                      onPress={verifyCode}
                    />
                    <Pressable
                      disabled={isBusy}
                      onPress={() => {
                        setCodeSent(false);
                        setCode('');
                      }}
                      style={styles.textButton}
                    >
                      <Text style={[styles.textButtonLabel, { color: colors.secondary }]}>
                        Use a different email
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <PrimaryButton
                    label={isBusy ? 'Sending…' : 'Email me a code'}
                    disabled={isBusy || !email.includes('@')}
                    onPress={requestCode}
                  />
                )}
              </View>
            </>
          )}

          {error || auth.error ? (
            <Text selectable accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
              {error ?? auth.error?.message}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          <Stack.Toolbar.Label>Done</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: colors.accent },
        (pressed || disabled) && styles.dimmed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 72,
  },
  intro: {
    gap: 8,
    paddingBottom: 8,
  },
  introTitle: {
    fontFamily: type.display,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  introBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: 13,
    padding: 18,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  statusCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
  },
  avatarText: {
    fontFamily: type.display,
    fontSize: 24,
    fontWeight: '600',
  },
  statusCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: type.display,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    borderCurve: 'continuous',
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  codeInput: {
    fontSize: 23,
    letterSpacing: 9,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  codeHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    marginTop: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  textButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerZone: {
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  dangerTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  dangerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 6,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.48,
  },
});
