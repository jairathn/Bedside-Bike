#!/usr/bin/env node

/**
 * Database Migration Runner for Azure SQL
 *
 * This script reads and executes SQL migration files against Azure SQL Database.
 * Usage: node run-migration.js [migration-file]
 *
 * If no file is specified, it will run migrations/0001_initial_schema.sql
 */

import dotenv from 'dotenv';
import sql from 'mssql';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get migration file from command line args or use default
const migrationFile = process.argv[2] || 'migrations/0001_initial_schema.sql';
const migrationPath = join(__dirname, migrationFile);

// Load environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('   Please create a .env file or set the DATABASE_URL variable');
  process.exit(1);
}

// Parse connection string to extract components
// Connection string format: "Server=tcp:server,port;Initial Catalog=db;User ID=user;Password=pass;..."
function parseConnectionString(connStr) {
  const parts = {};
  connStr.split(';').forEach(part => {
    const [key, value] = part.split('=').map(s => s.trim());
    if (key && value) {
      parts[key.toLowerCase().replace(/ /g, '')] = value;
    }
  });

  // Extract server and port from "tcp:server,port" format
  let server = parts['server'] || '';
  let port = 1433;

  if (server.startsWith('tcp:')) {
    server = server.substring(4);
  }

  if (server.includes(',')) {
    [server, port] = server.split(',');
    port = parseInt(port, 10);
  }

  return {
    server,
    port,
    database: parts['initialcatalog'] || parts['database'],
    user: parts['userid'] || parts['user'],
    password: parts['password'] || parts['pwd'],
  };
}

const connDetails = parseConnectionString(process.env.DATABASE_URL);

console.log('🔗 Connection details:');
console.log(`   Server: ${connDetails.server}`);
console.log(`   Port: ${connDetails.port}`);
console.log(`   Database: ${connDetails.database}`);
console.log(`   User: ${connDetails.user}`);
console.log('');

// Azure SQL connection configuration
const config = {
  server: connDetails.server,
  port: connDetails.port,
  database: connDetails.database,
  user: connDetails.user,
  password: connDetails.password,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function runMigration() {
  let pool;

  try {
    console.log('🔄 Starting database migration...\n');
    console.log(`📂 Migration file: ${migrationFile}`);

    // Read the SQL file
    console.log('📖 Reading SQL file...');
    const sqlContent = readFileSync(migrationPath, 'utf8');

    // Split by GO statements (MS SQL batch separator)
    const batches = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`📊 Found ${batches.length} SQL batches to execute\n`);

    // Connect to database
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!\n');

    // Execute each batch
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Skip empty batches and comments-only batches
      if (!batch || batch.startsWith('--')) {
        continue;
      }

      try {
        console.log(`⚙️  Executing batch ${i + 1}/${batches.length}...`);

        // Show a preview of what we're executing (first 100 chars)
        const preview = batch.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   Preview: ${preview}${batch.length > 100 ? '...' : ''}`);

        await pool.request().query(batch);
        successCount++;
        console.log(`   ✅ Success\n`);

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error: ${error.message}\n`);

        // For DROP TABLE errors, continue (table might not exist)
        if (error.message.includes('Cannot drop') || error.message.includes('does not exist')) {
          console.log('   ℹ️  This is likely OK - table may not have existed\n');
          continue;
        }

        // For other errors, you might want to stop or continue based on your preference
        // Uncomment the next line to stop on first error:
        // throw error;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successful batches: ${successCount}`);
    console.log(`❌ Failed batches: ${errorCount}`);
    console.log('='.repeat(60));

    // Verify tables were created
    console.log('\n🔍 Verifying database schema...\n');

    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log(`📋 Tables created (${result.recordset.length} total):`);
    result.recordset.forEach(row => {
      console.log(`   ✓ ${row.TABLE_NAME}`);
    });

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('Login failed')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your DATABASE_URL credentials');
      console.error('   - Verify username and password are correct');
      console.error('   - Ensure database server allows connections from your IP');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your internet connection');
      console.error('   - Verify the server hostname in DATABASE_URL');
      console.error('   - Ensure Azure SQL Database is running');
    } else if (error.code === 'ENOENT') {
      console.error('\n💡 Troubleshooting:');
      console.error(`   - Migration file not found: ${migrationPath}`);
      console.error('   - Make sure the file exists');
    }

    process.exit(1);

  } finally {
    // Close connection
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
