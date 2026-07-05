import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db';

// config/firebase.ts's real body imports firebase-admin/auth, which pulls in
// jwks-rsa -> jose (ESM-only, Jest can't parse). Mocking our own thin config
// wrapper — rather than the real firebase-admin/auth — means that import
// chain never actually runs, AND existing tests asserting "Firebase
// unconfigured" behavior (isFirebaseConfigured/getFirebaseMessaging) keep
// working untouched. Import mockVerifyIdToken from this file in any test
// that needs to control the phone-auth verification result.
export const mockVerifyIdToken = jest.fn();
jest.mock('../src/config/firebase', () => ({
  isFirebaseConfigured: () => false,
  getFirebaseMessaging: () => null,
  getFirebaseAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri('expenseflow-test'));
});

afterEach(async () => {
  // Isolate tests: wipe every collection between cases
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await disconnectDatabase();
  await mongo.stop();
});
