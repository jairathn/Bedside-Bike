#!/usr/bin/env tsx

// Test the diagnosis code extraction and matching logic

const extractDiagnosisCodes = (diagnosis: string, comorbidities: string[]): string[] => {
  const codes: string[] = [];

  // ICD-10 pattern matching
  const icd10Pattern = /[A-Z]\d{2}(?:\.\d{1,4})?/gi;

  const diagnosisMatches = diagnosis.match(icd10Pattern) || [];
  codes.push(...diagnosisMatches.map(c => c.toUpperCase()));

  for (const comorbidity of comorbidities) {
    const comorbidityMatches = comorbidity.match(icd10Pattern) || [];
    codes.push(...comorbidityMatches.map(c => c.toUpperCase()));
  }

  // Map common diagnoses to ICD-10 codes
  const diagnosisMap: Record<string, string[]> = {
    'knee replacement': ['Z96.641', 'Z96.642', 'M17'],
    'hip replacement': ['Z96.641', 'Z96.642', 'M16'],
    'tka': ['Z96.641', 'Z96.642'],
    'tha': ['Z96.641', 'Z96.642'],
    'pneumonia': ['J18.9', 'J15.9', 'J12.9'],
    'copd': ['J44.9', 'J44.1'],
    'heart failure': ['I50.9', 'I50.1', 'I50.2'],
    'chf': ['I50.9'],
    'stroke': ['I63.9', 'I64'],
    'hip fracture': ['S72.0', 'S72.1'],
    'sepsis': ['A41.9', 'R65.20'],
    'covid': ['U07.1', 'J12.82'],
  };

  for (const [term, termCodes] of Object.entries(diagnosisMap)) {
    const diagnosisLower = diagnosis.toLowerCase();
    const comorbsLower = comorbidities.map(c => c.toLowerCase());

    if (diagnosisLower.includes(term) || comorbsLower.some(c => c.includes(term))) {
      codes.push(...termCodes);
    }
  }

  return [...new Set(codes)];
};

console.log('\n🔍 Testing diagnosis code extraction...\n');

const diagnosis = "Hip Fracture";
const comorbidities = ["Hip Fracture", "Type 2 Diabetes", "Osteoporosis", "Hypertension"];

const extractedCodes = extractDiagnosisCodes(diagnosis, comorbidities);
console.log('Input diagnosis:', diagnosis);
console.log('Comorbidities:', comorbidities);
console.log('Extracted ICD-10 codes:', extractedCodes);

console.log('\n🔍 Testing protocol code matching...\n');

const protocolCodes = ["S72.001A", "S72.002A", "Z96.641", "Z96.642"];
console.log('Protocol codes:', protocolCodes);

const codeMatch = extractedCodes.some(code =>
  protocolCodes.some((pc: string) =>
    pc === code || code.startsWith(pc) || pc.startsWith(code)
  )
);

console.log('Code match found:', codeMatch);

// Show individual matches
console.log('\nDetailed matching:');
for (const patientCode of extractedCodes) {
  for (const protocolCode of protocolCodes) {
    if (protocolCode === patientCode) {
      console.log(`  ✓ ${patientCode} === ${protocolCode}`);
    } else if (patientCode.startsWith(protocolCode)) {
      console.log(`  ✓ ${patientCode} starts with ${protocolCode}`);
    } else if (protocolCode.startsWith(patientCode)) {
      console.log(`  ✓ ${protocolCode} starts with ${patientCode}`);
    }
  }
}
