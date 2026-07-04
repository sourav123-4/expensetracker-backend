import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/db';

let ready: Promise<void> | null = null;

function ensureConnected(): Promise<void> {
  if (!ready) {
    ready = connectDatabase().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

const app = createApp();

export default async function handler(req: any, res: any) {
  await ensureConnected();
  app(req, res);
}
