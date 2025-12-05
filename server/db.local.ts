import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

const sqlite = new Database('local.db');

export const db = drizzle(sqlite, { schema });
export const pool = sqlite; // For compatibility with existing code
