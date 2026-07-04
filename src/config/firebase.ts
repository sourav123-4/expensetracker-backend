import fs from 'fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { env } from './env';
import { logger } from './logger';

/**
 * Optional Firebase Admin initialization. Push notifications activate when
 * FIREBASE_SERVICE_ACCOUNT_JSON (preferred for Vercel) or
 * FIREBASE_SERVICE_ACCOUNT_PATH is configured; everything else no-ops with a
 * log line so the API runs fine without Firebase configured.
 */
let messaging: Messaging | null = null;

const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

if (serviceAccountJson) {
  try {
    const app = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    messaging = getMessaging(app);
    logger.info('Firebase Admin initialized — push notifications enabled');
  } catch (err) {
    logger.error(
      `Firebase Admin failed to initialize (${(err as Error).message}) — push notifications disabled`,
    );
  }
} else if (serviceAccountPath) {
  try {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    const app = initializeApp({ credential: cert(JSON.parse(raw)) });
    messaging = getMessaging(app);
    logger.info('Firebase Admin initialized — push notifications enabled');
  } catch (err) {
    logger.error(
      `Firebase Admin failed to initialize (${(err as Error).message}) — push notifications disabled`,
    );
  }
}

export const isFirebaseConfigured = (): boolean => messaging !== null;
export const getFirebaseMessaging = (): Messaging | null => messaging;
