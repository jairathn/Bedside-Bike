#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('\n🔍 Checking Dorothy Chen (Patient 4) profile...\n');

const patient = db.prepare('SELECT * FROM patient_profiles WHERE user_id = 4').get();
if (patient) {
  console.log('Patient profile:', JSON.stringify(patient, null, 2));
} else {
  console.log('Patient profile not found!');
}

console.log('\n🔍 Checking user record...\n');
const user = db.prepare('SELECT * FROM users WHERE id = 4').get();
if (user) {
  console.log('User record:', JSON.stringify(user, null, 2));
} else {
  console.log('User not found!');
}

db.close();
