// Dual database support: SQLite for local dev, PostgreSQL (Supabase) for persistent storage
import 'dotenv/config';

const USE_POSTGRES = process.env.USE_POSTGRES === 'true' && process.env.DATABASE_URL;

let db: any;
let pool: any;

if (USE_POSTGRES) {
  console.log('🐘 Using PostgreSQL (Supabase) database for persistent storage');

  // PostgreSQL for Supabase
  const pg = await import('pg').then(m => m.default);
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const schema = await import('@shared/schema.postgres');

  /**
   * HIPAA-Compliant Database Connection
   *
   * SSL Configuration:
   * - rejectUnauthorized: true enforces certificate validation
   * - This prevents man-in-the-middle attacks on database connections
   * - Requires valid SSL certificate from database provider (Supabase)
   *
   * Note: Set DB_SSL_REJECT_UNAUTHORIZED=false only for development
   * with self-signed certificates. NEVER in production.
   */
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

  const connectionPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      // HIPAA: Enforce certificate validation in production
      rejectUnauthorized: rejectUnauthorized,
    },
    max: 10,
    idleTimeoutMillis: 30000,
  });

  if (!rejectUnauthorized) {
    console.warn('SECURITY WARNING: SSL certificate validation is disabled. Enable for HIPAA compliance in production.');
  }

  // Test connection
  try {
    const client = await connectionPool.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
    process.exit(1);
  }

  db = drizzle(connectionPool, { schema });
  pool = connectionPool;

} else {
  console.log('🗄️  Using local SQLite database for development');

  // SQLite for local development
  const Database = await import('better-sqlite3').then(m => m.default);
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const path = await import('path');
  const schema = await import('@shared/schema.sqlite');

  // Use process.cwd() to get the actual working directory
  const dbPath = path.join(process.cwd(), 'local.db');

  console.log('📁 Database file:', dbPath);

  const sqlite = new Database(dbPath);

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });
  pool = sqlite; // For compatibility
}

export { db, pool };
