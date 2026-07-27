import { expoClient } from '@better-auth/expo/client';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from 'better-auth/react';

const NEXUS_URL = process.env.EXPO_PUBLIC_NEXUS_URL ?? 'https://nexus.raza.run';
export const POEMS_AUTH_URL = `${NEXUS_URL}/v1/auth/poems`;
export const POEMS_DATA_URL = `${NEXUS_URL}/v1/apps/poems`;

export const authClient = createAuthClient({
  baseURL: POEMS_AUTH_URL,
  plugins: [
    expoClient({
      scheme: 'poems',
      storagePrefix: 'nexus-poems',
      cookiePrefix: 'nexus-poems',
      storage: SecureStore,
    }) as never,
  ],
});

function messageFromAuthError(error: { message?: string } | null): string {
  return error?.message ?? 'Authentication could not be completed.';
}

export async function requestEmailSignInCode(email: string): Promise<void> {
  const result = await authClient.$fetch('/email-otp/send-verification-otp', {
    method: 'POST',
    body: {
      email: email.trim().toLowerCase(),
      type: 'sign-in',
    },
  });
  if (result.error) throw new Error(messageFromAuthError(result.error));
}

export async function signInWithEmailCode(email: string, otp: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await authClient.$fetch('/sign-in/email-otp', {
    method: 'POST',
    body: {
      email: normalizedEmail,
      otp: otp.trim(),
      name: normalizedEmail.split('@')[0] || 'Poems reader',
    },
  });
  if (result.error) throw new Error(messageFromAuthError(result.error));
}

export async function signInWithApple(): Promise<void> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken || !credential.authorizationCode) {
    throw new Error('Apple did not return the credentials needed to sign in.');
  }

  const firstName = credential.fullName?.givenName ?? undefined;
  const lastName = credential.fullName?.familyName ?? undefined;
  const result = await authClient.signIn.social(
    {
      provider: 'apple',
      idToken: {
        token: credential.identityToken,
        nonce: rawNonce,
        user: {
          email: credential.email ?? undefined,
          name:
            firstName || lastName
              ? {
                  firstName,
                  lastName,
                }
              : undefined,
        },
      },
    },
    {
      headers: {
        'X-Apple-Authorization-Code': credential.authorizationCode,
      },
    }
  );

  if (result.error) throw new Error(messageFromAuthError(result.error));
}

export async function signOut(): Promise<void> {
  const result = await authClient.signOut();
  if (result.error) throw new Error(messageFromAuthError(result.error));
}

export async function deleteAccount(): Promise<void> {
  const result = await authClient.deleteUser();
  if (result.error) throw new Error(messageFromAuthError(result.error));
}

export function getAuthCookie(): string {
  return (authClient as typeof authClient & { getCookie: () => string }).getCookie();
}
