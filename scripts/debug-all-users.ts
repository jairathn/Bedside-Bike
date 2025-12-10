import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

console.log('\n🔍 ALL USERS IN DATABASE:\n');

const allUsers = db.prepare("SELECT id, first_name, last_name, date_of_birth, email, user_type FROM users WHERE user_type = 'patient' ORDER BY id").all();

allUsers.forEach((user: any) => {
  console.log(`ID: ${user.id} | ${user.first_name} ${user.last_name} | DOB: ${user.date_of_birth} | Email: ${user.email}`);

  // Check if they have data
  const sessions = db.prepare('SELECT COUNT(*) as count FROM exercise_sessions WHERE patient_id = ?').get(user.id) as any;
  const stats = db.prepare('SELECT * FROM patient_stats WHERE patient_id = ?').get(user.id) as any;
  const providers = db.prepare('SELECT COUNT(*) as count FROM provider_patients WHERE patient_id = ?').get(user.id) as any;

  console.log(`  Sessions: ${sessions.count}, Stats: ${stats ? 'YES' : 'NO'}, Providers: ${providers.count}`);
  if (stats) {
    console.log(`  Stats Details - Total Sessions: ${stats.total_sessions}, Duration: ${stats.total_duration}s, Level: ${stats.level}, XP: ${stats.xp}`);
  }
  console.log('');
});

db.close();
