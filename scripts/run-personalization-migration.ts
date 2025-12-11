#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const sqlPath = join(process.cwd(), 'scripts', 'add-personalization-tables.sql');

console.log('🗄️  Adding personalization tables to local database...\n');

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

const sql = readFileSync(sqlPath, 'utf-8');

console.log('📊 Executing SQL migration...');
sqlite.exec(sql);

console.log('\n✅ Personalization tables added successfully!');
console.log('📁 Database file: local.db\n');

sqlite.close();
