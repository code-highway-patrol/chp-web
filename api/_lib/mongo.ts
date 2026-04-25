import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "marketplace";

if (!uri) throw new Error("MONGODB_URI is not set");

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(uri!, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

export const STATUES = "statues";
export const VECTOR_INDEX = "statues_vector_index";
