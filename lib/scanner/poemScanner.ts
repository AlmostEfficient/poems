import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

const NEXUS_URL = process.env.EXPO_PUBLIC_NEXUS_URL ?? 'https://nexus.raza.run';
const INSTALL_ID_KEY = 'poems-scanner-install-id';
const INSTALL_TOKEN_KEY = 'poems-scanner-install-token';
const INSTALL_TOKEN_EXPIRY_KEY = 'poems-scanner-install-token-expiry';
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;
const SCAN_REQUEST_TIMEOUT_MS = 30_000;

interface ScannerTokenResponse {
  token: string;
  expiresAt: number;
}

export interface ScannedPoem {
  title: string | null;
  author: string | null;
  content: string;
  language: 'en' | 'ur' | null;
}

interface ScannerPoemResponse {
  poem: boolean;
  title: string | null;
  author: string | null;
  content: string | null;
  language: 'en' | 'ur' | null;
}

export class PoemScannerError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'PoemScannerError';
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new PoemScannerError(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getInstallId(): Promise<string> {
  const stored = await SecureStore.getItemAsync(INSTALL_ID_KEY);
  if (stored) return stored;

  const installId = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALL_ID_KEY, installId);
  return installId;
}

async function issueInstallToken(): Promise<string> {
  const response = await fetchWithTimeout(
    `${NEXUS_URL}/install/token`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        installId: await getInstallId(),
        bundleId: 'com.raza.poems',
        appVersion: Constants.expoConfig?.version ?? '1.0',
      }),
    },
    TOKEN_REQUEST_TIMEOUT_MS,
    'The scanner could not connect. Please try again.'
  );
  const body = (await response.json().catch(() => null)) as
    | ScannerTokenResponse
    | { error?: string }
    | null;

  if (!response.ok || !body || !('token' in body) || !body.token) {
    const message =
      body && 'error' in body && body.error
        ? body.error
        : 'Could not prepare the poem scanner.';
    throw new PoemScannerError(message, response.status);
  }

  await Promise.all([
    SecureStore.setItemAsync(INSTALL_TOKEN_KEY, body.token),
    SecureStore.setItemAsync(INSTALL_TOKEN_EXPIRY_KEY, String(body.expiresAt)),
  ]);
  return body.token;
}

async function getInstallToken(): Promise<string> {
  const [token, expiryValue] = await Promise.all([
    SecureStore.getItemAsync(INSTALL_TOKEN_KEY),
    SecureStore.getItemAsync(INSTALL_TOKEN_EXPIRY_KEY),
  ]);
  const expiry = Number(expiryValue);
  const now = Math.floor(Date.now() / 1000);

  if (token && Number.isFinite(expiry) && expiry > now + TOKEN_EXPIRY_BUFFER_SECONDS) {
    return token;
  }

  return issueInstallToken();
}

async function requestPoemScan(
  token: string,
  image: { mimeType: string; data: string }
): Promise<Response> {
  return fetchWithTimeout(
    `${NEXUS_URL}/scanner/poems`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-scanner-request-id': Crypto.randomUUID(),
      },
      body: JSON.stringify({ image }),
    },
    SCAN_REQUEST_TIMEOUT_MS,
    'Scanning took too long. Please try the photo again.'
  );
}

export async function scanPoemImage(uri: string, mimeType = 'image/jpeg'): Promise<ScannedPoem> {
  const data = await new File(uri).base64();
  const image = { mimeType, data };
  let token = await getInstallToken();
  let response = await requestPoemScan(token, image);

  if (response.status === 401) {
    await Promise.all([
      SecureStore.deleteItemAsync(INSTALL_TOKEN_KEY),
      SecureStore.deleteItemAsync(INSTALL_TOKEN_EXPIRY_KEY),
    ]);
    token = await issueInstallToken();
    response = await requestPoemScan(token, image);
  }

  const body = (await response.json().catch(() => null)) as
    | ScannerPoemResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      body && 'error' in body && body.error
        ? body.error
        : 'The image could not be scanned. Please try again.';
    throw new PoemScannerError(message, response.status);
  }

  if (!body || !('poem' in body) || !body.poem || !body.content?.trim()) {
    throw new PoemScannerError('No clear poem was found in that image.');
  }

  return {
    title: body.title?.trim() || null,
    author: body.author?.trim() || null,
    content: body.content.trim(),
    language: body.language,
  };
}
