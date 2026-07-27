import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { UseAuthSessionResult } from '../hooks/useAuthSession';
import { styles } from '../styles/styles';

interface AccountScreenProps {
  auth: UseAuthSessionResult;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export function AccountScreen({ auth, onClose, onAccountDeleted }: AccountScreenProps) {
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

  const handleRequestCode = () => {
    void run(async () => {
      await auth.requestEmailSignInCode(email);
      setCodeSent(true);
    });
  };

  const handleVerifyCode = () => {
    void run(async () => {
      await auth.signInWithEmailCode(email, code);
      setCode('');
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete account?',
      'Your cloud backup, saved poems, and personal poems will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void run(async () => {
              await auth.deleteAccount();
              onAccountDeleted();
            });
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.accountContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.accountContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.accountHeader}>
          <View>
            <Text style={styles.accountTitle}>Account</Text>
            <Text style={styles.accountSubtitle}>Optional backup and cross-device sync</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.libraryHeaderButton, pressed && styles.saveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Close account"
          >
            <Text style={styles.libraryHeaderButtonText}>Close</Text>
          </Pressable>
        </View>

        {auth.user ? (
          <View style={styles.accountCard}>
            <Text style={styles.accountSectionTitle}>Signed in</Text>
            <Text style={styles.accountEmail}>{auth.user.email}</Text>
            <Text style={styles.accountStatus}>Backup and sync are on.</Text>

            <Pressable
              disabled={isBusy}
              onPress={() => void run(auth.signOut)}
              style={({ pressed }) => [
                styles.accountSecondaryButton,
                pressed && styles.saveButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.accountSecondaryButtonText}>Sign out</Text>
            </Pressable>
            <Pressable
              disabled={isBusy}
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.accountDeleteButton,
                pressed && styles.saveButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              <Text style={styles.accountDeleteButtonText}>Delete account</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.accountCard}>
              <Text style={styles.accountSectionTitle}>Keep your library backed up</Text>
              <Text style={styles.accountBody}>
                Reading and saving still work without an account.
              </Text>
              {isAppleAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={22}
                  style={styles.accountAppleButton}
                  onPress={() => void run(auth.signInWithApple)}
                />
              ) : null}
            </View>

            <View style={styles.accountCard}>
              <Text style={styles.accountSectionTitle}>Continue with email</Text>
              <Text style={styles.accountFieldLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.libraryTextInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor="#a09a91"
                accessibilityLabel="Email address"
              />

              {codeSent ? (
                <>
                  <Text style={styles.accountFieldLabel}>Six-digit code</Text>
                  <TextInput
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                    style={styles.libraryTextInput}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor="#a09a91"
                    accessibilityLabel="Six-digit sign-in code"
                  />
                  <Pressable
                    disabled={isBusy || code.length !== 6}
                    onPress={handleVerifyCode}
                    style={({ pressed }) => [
                      styles.libraryPrimaryButton,
                      (isBusy || code.length !== 6) && styles.accountButtonDisabled,
                      pressed && styles.saveButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Verify sign-in code"
                  >
                    <Text style={styles.libraryPrimaryButtonText}>Continue</Text>
                  </Pressable>
                  <Pressable
                    disabled={isBusy}
                    onPress={handleRequestCode}
                    style={({ pressed }) => [
                      styles.accountTextButton,
                      pressed && styles.saveButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send a new code"
                  >
                    <Text style={styles.accountTextButtonText}>Send a new code</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  disabled={isBusy || !email.includes('@')}
                  onPress={handleRequestCode}
                  style={({ pressed }) => [
                    styles.libraryPrimaryButton,
                    (isBusy || !email.includes('@')) && styles.accountButtonDisabled,
                    pressed && styles.saveButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Email me a sign-in code"
                >
                  <Text style={styles.libraryPrimaryButtonText}>Email me a code</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {error || auth.error ? (
          <Text style={styles.accountError} accessibilityRole="alert">
            {error ?? auth.error?.message}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
