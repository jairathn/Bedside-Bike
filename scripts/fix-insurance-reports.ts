#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const sqlPath = join(process.cwd(), 'scripts', 'fix-insurance-reports-table.sql');

console.log('🔧 Fixing insurance_reports table structure...\n');

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

const sql = readFileSync(sqlPath, 'utf-8');

console.log('📊 Executing SQL fix...');
sqlite.exec(sql);

console.log('\n✅ insurance_reports table fixed successfully!');
console.log('📁 Database file: local.db\n');

sqlite.close();
