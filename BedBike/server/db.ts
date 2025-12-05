import sql from 'mssql';
import { drizzle } from 'drizzle-orm/mssql';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Azure SQL connection configuration
const config: sql.config = {
  connectionString: process.env.DATABASE_URL,
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: false, // Azure SQL uses valid certificates
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export const pool = new sql.ConnectionPool(config);

// Initialize connection pool
pool.connect().catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

export const db = drizzle(pool, { schema });
