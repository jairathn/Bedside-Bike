#!/usr/bin/env tsx

import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('\n📋 CLINICAL PROTOCOLS SUMMARY\n');
console.log('='.repeat(80));

const protocols = db.prepare(`
  SELECT
    cp.id,
    cp.name,
    cp.indication,
    json_extract(cp.protocol_data, '$.phases') as phases,
    pmc.min_age,
    pmc.max_age,
    pmc.match_weight,
    pmc.match_priority
  FROM clinical_protocols cp
  LEFT JOIN protocol_matching_criteria pmc ON cp.id = pmc.protocol_id
  ORDER BY pmc.match_priority DESC, cp.id
`).all();

protocols.forEach((protocol: any) => {
  const phases = JSON.parse(protocol.phases || '[]');
  const durations = phases.map((p: any) => `${p.duration} min ${p.frequency}`).join(' → ');

  console.log(`\n${protocol.id}. ${protocol.name}`);
  console.log(`   ${'-'.repeat(75)}`);
  console.log(`   Indication: ${protocol.indication}`);
  console.log(`   Progression: ${durations}`);
  console.log(`   Age Range: ${protocol.min_age || 'any'}-${protocol.max_age || 'any'} years`);
  console.log(`   Match Priority: ${protocol.match_priority} (weight: ${protocol.match_weight})`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Total Protocols: ${protocols.length}`);
console.log(`\n📊 Duration Guidelines:`);
console.log(`   • Baseline (healthy 70yo): 15 min initially → 20 min BID`);
console.log(`   • Frail elderly: 5 min → 10 min BID`);
console.log(`   • CHF/COPD: 5 min → 10 min BID`);
console.log(`   • Post-surgical (TKA): 10 min → 15 min → 20 min BID`);
console.log(`   • ICU recovery: 5 min → 10 min BID`);
console.log(`   • Maximum duration: 30 min BID (all protocols)\n`);

db.close();
