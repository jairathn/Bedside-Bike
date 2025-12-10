import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('\n🧹 Cleaning ALL demo patient duplicates...\n');

const demoNames = [
  { firstName: 'Robert', lastName: 'Martinez' },
  { firstName: 'Dorothy', lastName: 'Chen' },
  { firstName: 'James', lastName: 'Thompson' }
];

for (const { firstName, lastName } of demoNames) {
  const patients = db.prepare('SELECT id, email FROM users WHERE first_name = ? AND last_name = ? AND user_type = ?')
    .all(firstName, lastName, 'patient') as any[];

  console.log(`Found ${patients.length} patient(s) named ${firstName} ${lastName}:`);

  for (const patient of patients) {
    console.log(`  Deleting ID ${patient.id} (${patient.email})`);

    // Delete in reverse order of dependencies
    db.prepare('DELETE FROM provider_patients WHERE patient_id = ?').run(patient.id);
    db.prepare('DELETE FROM patient_stats WHERE patient_id = ?').run(patient.id);
    db.prepare('DELETE FROM patient_goals WHERE patient_id = ?').run(patient.id);
    db.prepare('DELETE FROM exercise_sessions WHERE patient_id = ?').run(patient.id);
    db.prepare('DELETE FROM patient_protocol_assignments WHERE patient_id = ?').run(patient.id);
    db.prepare('DELETE FROM risk_assessments WHERE patient_id = ?').run(patient.id);
    db.prepare('DELETE FROM patient_profiles WHERE user_id = ?').run(patient.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(patient.id);
  }
}

db.close();

console.log('\n✅ Cleanup complete!');
console.log('\nNow run: npm run db:seed-demo');
