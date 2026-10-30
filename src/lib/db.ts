import "server-only";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";
import type { Database } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const store = globalThis as unknown as { __fbdDb?: Database };

function load(): Database {
  // Deleting the file (npm run data:reset) reseeds even while the server keeps running.
  if (store.__fbdDb && fs.existsSync(DB_FILE)) return store.__fbdDb;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    store.__fbdDb = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
  } else {
    store.__fbdDb = seedDatabase();
    persist(store.__fbdDb);
  }
  return store.__fbdDb;
}

function persist(db: Database) {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

export function getDb(): Database {
  return load();
}

export function mutate<T>(fn: (db: Database) => T): T {
  const db = load();
  const out = fn(db);
  persist(db);
  return out;
}

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
