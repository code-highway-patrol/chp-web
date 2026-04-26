import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "marketplace";

if (!uri) throw new Error("MONGODB_URI is not set");

declare global {
  // eslint-disable-next-line no-var
  var _chpMongoClient: MongoClient | undefined;
}

function makeClient() {
  return new MongoClient(uri!, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 30000,
  });
}

// Vercel Fluid Compute warm starts: cache the connected client on globalThis
// and ping it before reuse. If the ping fails, drop the cache and rebuild.
export async function getDb(): Promise<Db> {
  let client = globalThis._chpMongoClient;

  if (client) {
    try {
      await client.db(dbName).command({ ping: 1 });
      return client.db(dbName);
    } catch {
      try { await client.close(); } catch { /* ignore */ }
      globalThis._chpMongoClient = undefined;
      client = undefined;
    }
  }

  client = makeClient();
  await client.connect();
  globalThis._chpMongoClient = client;
  return client.db(dbName);
}

export const STATUES = "statues";
