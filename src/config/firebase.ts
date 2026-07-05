import fs from 'fs';
import { App, cert, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { env } from './env';
import { logger } from './logger';

/**
 * Optional Firebase Admin initialization. Push notifications AND phone-number
 * sign-in (verifying the ID token the client gets from Firebase Phone Auth)
 * both activate when FIREBASE_SERVICE_ACCOUNT_JSON (preferred for Vercel) or
 * FIREBASE_SERVICE_ACCOUNT_PATH is configured; everything else no-ops with a
 * log line so the API runs fine without Firebase configured.
 */
let app: App | null = null;
let messaging: Messaging | null = null;
let auth: Auth | null = null;

const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

function initFrom(credentialJson: string): void {
  app = initializeApp({ credential: cert(JSON.parse(credentialJson)) });
  messaging = getMessaging(app);
  auth = getAuth(app);
  logger.info('Firebase Admin initialized — push notifications + phone sign-in enabled');
}

if (serviceAccountJson) {
  try {
    initFrom(serviceAccountJson);
  } catch (err) {
    logger.error(`Firebase Admin failed to initialize (${(err as Error).message})`);
  }
} else if (serviceAccountPath) {
  try {
    initFrom(fs.readFileSync(serviceAccountPath, 'utf8'));
  } catch (err) {
    logger.error(`Firebase Admin failed to initialize (${(err as Error).message})`);
  }
}

export const isFirebaseConfigured = (): boolean => app !== null;
export const getFirebaseMessaging = (): Messaging | null => messaging;
export const getFirebaseAuth = (): Auth | null => auth;
