// Dual database support: SQLite for local dev, MS SQL for Azure production
import * as schema from '@shared/schema';

const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true' || !process.env.DATABASE_URL;

let db: any;
let pool: any;

if (USE_LOCAL_DB) {
  console.log('🗄️  Using local SQLite database for development');

  // SQLite for local development
  const Database = await import('better-sqlite3').then(m => m.default);
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const path = await import('path');

  // Use process.cwd() to get the actual working directory
  const dbPath = path.join(process.cwd(), 'local.db');

  console.log('📁 Database file:', dbPath);

  const sqlite = new Database(dbPath);

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });
  pool = sqlite; // For compatibility

} else {
  console.log('☁️  Using Azure SQL Server database');

  // MS SQL for Azure production
  const sql = await import('mssql').then(m => m.default);
  const { drizzle } = await import('drizzle-orm/mssql');

  const config: typeof sql.config = {
    connectionString: process.env.DATABASE_URL!,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  const connectionPool = new sql.ConnectionPool(config);

  // Initialize connection pool
  await connectionPool.connect().catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

  db = drizzle(connectionPool, { schema });
  pool = connectionPool;
}

export { db, pool };
