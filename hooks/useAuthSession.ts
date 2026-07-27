import { useMemo } from 'react';

import {
  authClient,
  deleteAccount,
  requestEmailSignInCode,
  signInWithApple,
  signInWithEmailCode,
  signOut,
} from '../lib/auth/client';

export interface PoemsAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface PoemsAuthSession {
  user: PoemsAuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

export interface UseAuthSessionResult {
  session: PoemsAuthSession | null;
  user: PoemsAuthUser | null;
  isReady: boolean;
  isConfigured: true;
  isGuest: boolean;
  error: Error | null;
  requestEmailSignInCode: typeof requestEmailSignInCode;
  signInWithEmailCode: typeof signInWithEmailCode;
  signInWithApple: typeof signInWithApple;
  signOut: typeof signOut;
  deleteAccount: typeof deleteAccount;
  refresh: () => Promise<void>;
}

export function useAuthSession(): UseAuthSessionResult {
  const sessionQuery = authClient.useSession();
  const session = (sessionQuery.data as PoemsAuthSession | null) ?? null;
  const error = sessionQuery.error
    ? new Error(sessionQuery.error.message ?? 'Failed to load the account session.')
    : null;

  return useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isReady: !sessionQuery.isPending,
      isConfigured: true as const,
      isGuest: !sessionQuery.isPending && !session,
      error,
      requestEmailSignInCode,
      signInWithEmailCode,
      signInWithApple,
      signOut,
      deleteAccount,
      refresh: async () => {
        await sessionQuery.refetch();
      },
    }),
    [error, session, sessionQuery.isPending, sessionQuery.refetch]
  );
}
