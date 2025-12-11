#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('\n🔍 Checking Clinical Protocols...\n');

const protocols = db.prepare('SELECT id, name, indication, diagnosis_codes FROM clinical_protocols').all();
console.log(`Found ${protocols.length} protocols:`);
protocols.forEach((p: any) => {
  console.log(`  - ${p.id}: ${p.name} (${p.indication})`);
});

console.log('\n🔍 Checking Dorothy Chen (Patient 1)...\n');

const patient = db.prepare('SELECT * FROM patient_profiles WHERE user_id = 1').get();
if (patient) {
  console.log(`Patient found:`, patient);
} else {
  console.log('Patient profile not found!');
}

console.log('\n🔍 Checking all patients...\n');
const allPatients = db.prepare("SELECT id, first_name, last_name, user_type FROM users WHERE user_type = 'patient'").all();
console.log(`Found ${allPatients.length} patients:`);
allPatients.forEach((p: any) => {
  console.log(`  - ${p.id}: ${p.first_name} ${p.last_name}`);
});

db.close();
