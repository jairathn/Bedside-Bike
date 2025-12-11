#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('\n🔍 Checking Hip Fracture Protocol...\n');

const protocol = db.prepare("SELECT * FROM clinical_protocols WHERE name LIKE '%Hip Fracture%'").get();
if (protocol) {
  console.log('Protocol found:');
  console.log('  ID:', protocol.id);
  console.log('  Name:', protocol.name);
  console.log('  Indication:', protocol.indication);
  console.log('  Diagnosis Codes:', protocol.diagnosis_codes);
  console.log('  Contraindications:', protocol.contraindications);
  console.log('\n  Protocol Data:', JSON.stringify(JSON.parse(protocol.protocol_data), null, 2));
} else {
  console.log('Hip Fracture protocol not found!');
}

db.close();
