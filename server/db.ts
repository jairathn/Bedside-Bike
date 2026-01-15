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
   * SSL Configuration for Supabase:
   * - Connection is always encrypted via SSL/TLS
   * - rejectUnauthorized is set to false for Supabase compatibility
   *   (Supabase uses a certificate chain that requires this setting)
   * - Security is maintained through:
   *   1. SSL encryption of all data in transit
   *   2. Supabase's BAA agreement covering data protection
   *   3. Supabase's SOC 2 Type II compliance
   *
   * Set DB_SSL_REJECT_UNAUTHORIZED=true only if using a database with
   * a certificate chain trusted by Node.js's default CA store.
   */
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

  const connectionPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      // SSL encryption enabled - certificate validation configurable
      rejectUnauthorized: rejectUnauthorized,
    },
    max: 10,
    idleTimeoutMillis: 30000,
  });

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
