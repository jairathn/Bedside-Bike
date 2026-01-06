/**
 * Clinical Validation Test for Immobility Harm Risk Calculator
 * Tests 25 varied patient scenarios to verify clinical reasonableness
 */

import { calculateRisks, type ExtendedRiskAssessmentInput } from '../server/risk-calculator';

interface TestCase {
  name: string;
  description: string;
  input: ExtendedRiskAssessmentInput;
  expectedRanges: {
    deconditioning: { min: number; max: number; level: string };
    vte: { min: number; max: number; level: string };
    falls: { min: number; max: number; level: string };
    pressure: { min: number; max: number; level: string };
  };
}

const TEST_CASES: TestCase[] = [
  // 1. LOW RISK - Healthy young adult, minor surgery
  {
    name: "1. Young healthy post-appendectomy",
    description: "35yo M, independent, ward, post-appendectomy day 1, no comorbidities",
    input: {
      age: 35,
      sex: "M",
      weight_kg: 75,
      height_cm: 178,
      mobility_status: "walking_assist",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "appendectomy",
      comorbidities: [],
      medications: [],
      days_immobile: 1,
      on_vte_prophylaxis: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.05, max: 0.20, level: "low" },
      vte: { min: 0.01, max: 0.05, level: "low" },
      falls: { min: 0.01, max: 0.05, level: "low" },
      pressure: { min: 0.01, max: 0.05, level: "low" },
    }
  },

  // 2. MODERATE RISK - Older adult, medical admission
  {
    name: "2. 68yo pneumonia, ward",
    description: "68yo F, walking with assist, ward, community-acquired pneumonia",
    input: {
      age: 68,
      sex: "F",
      weight_kg: 65,
      height_cm: 162,
      mobility_status: "walking_assist",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "pneumonia",
      comorbidities: ["diabetes"],
      medications: [],
      days_immobile: 2,
      on_vte_prophylaxis: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.15, max: 0.35, level: "moderate" },
      vte: { min: 0.02, max: 0.08, level: "moderate" },
      falls: { min: 0.02, max: 0.08, level: "low" },
      pressure: { min: 0.02, max: 0.08, level: "low" },
    }
  },

  // 3. HIGH RISK - Elderly ICU sepsis
  {
    name: "3. 82yo ICU sepsis, bedbound",
    description: "82yo M, bedbound, ICU, sepsis, delirium, on sedatives",
    input: {
      age: 82,
      sex: "M",
      weight_kg: 70,
      height_cm: 170,
      mobility_status: "bedbound",
      cognitive_status: "delirium_dementia",
      level_of_care: "icu",
      baseline_function: "walker",
      admission_diagnosis: "sepsis",
      comorbidities: ["diabetes", "CKD"],
      medications: ["lorazepam", "fentanyl"],
      days_immobile: 5,
      on_vte_prophylaxis: true,
      albumin_low: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.50, max: 0.95, level: "high" },
      vte: { min: 0.05, max: 0.20, level: "high" },
      falls: { min: 0.20, max: 0.80, level: "high" },
      pressure: { min: 0.10, max: 0.40, level: "high" },
    }
  },

  // 4. HIP FRACTURE - Classic high-risk ortho
  {
    name: "4. 78yo hip fracture s/p ORIF",
    description: "78yo F, chair-bound, ward, hip fracture post-op day 2",
    input: {
      age: 78,
      sex: "F",
      weight_kg: 58,
      height_cm: 155,
      mobility_status: "chair_bound",
      cognitive_status: "mild_impairment",
      level_of_care: "ward",
      baseline_function: "walker",
      admission_diagnosis: "hip fracture s/p ORIF",
      comorbidities: ["osteoporosis"],
      medications: ["oxycodone"],
      days_immobile: 3,
      on_vte_prophylaxis: true,
      is_orthopedic: true,
      is_postoperative: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.35, max: 0.70, level: "high" },
      vte: { min: 0.04, max: 0.15, level: "high" },
      falls: { min: 0.15, max: 0.50, level: "high" },
      pressure: { min: 0.05, max: 0.20, level: "moderate" },
    }
  },

  // 5. STROKE - Neuro with hemiparesis
  {
    name: "5. 72yo acute stroke, hemiparesis",
    description: "72yo M, bedbound, stepdown, acute ischemic stroke with right hemiparesis",
    input: {
      age: 72,
      sex: "M",
      weight_kg: 85,
      height_cm: 175,
      mobility_status: "bedbound",
      cognitive_status: "mild_impairment",
      level_of_care: "stepdown",
      baseline_function: "independent",
      admission_diagnosis: "acute ischemic stroke",
      comorbidities: ["hypertension", "atrial fibrillation"],
      medications: ["apixaban"],
      days_immobile: 4,
      on_vte_prophylaxis: true,
      is_neuro_admission: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.40, max: 0.80, level: "high" },
      vte: { min: 0.03, max: 0.12, level: "high" },
      falls: { min: 0.25, max: 0.70, level: "high" },
      pressure: { min: 0.08, max: 0.25, level: "high" },
    }
  },

  // 6. CHF EXACERBATION - Cardiac
  {
    name: "6. 75yo CHF exacerbation",
    description: "75yo F, standing assist, ward, CHF exacerbation, on diuretics",
    input: {
      age: 75,
      sex: "F",
      weight_kg: 72,
      height_cm: 160,
      mobility_status: "standing_assist",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "walker",
      admission_diagnosis: "CHF exacerbation",
      comorbidities: ["CHF", "diabetes", "CKD"],
      medications: ["furosemide", "metoprolol"],
      days_immobile: 2,
      on_vte_prophylaxis: true,
      is_cardiac_admission: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.25, max: 0.55, level: "high" },
      vte: { min: 0.02, max: 0.08, level: "moderate" },
      falls: { min: 0.05, max: 0.20, level: "moderate" },
      pressure: { min: 0.03, max: 0.12, level: "moderate" },
    }
  },

  // 7. CANCER - Active malignancy
  {
    name: "7. 65yo metastatic lung cancer",
    description: "65yo M, walking assist, ward, metastatic lung cancer, on chemo",
    input: {
      age: 65,
      sex: "M",
      weight_kg: 62,
      height_cm: 172,
      mobility_status: "walking_assist",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "metastatic lung cancer, dehydration",
      comorbidities: [],
      medications: [],
      days_immobile: 2,
      on_vte_prophylaxis: true,
      has_active_cancer: true,
      is_oncology: true,
      albumin_low: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.20, max: 0.50, level: "moderate" },
      vte: { min: 0.04, max: 0.15, level: "high" },
      falls: { min: 0.02, max: 0.10, level: "low" },
      pressure: { min: 0.04, max: 0.15, level: "moderate" },
    }
  },

  // 8. YOUNG TRAUMA - Multiple injuries
  {
    name: "8. 28yo MVA polytrauma",
    description: "28yo M, bedbound, ICU, MVA with pelvic fracture, on sedation",
    input: {
      age: 28,
      sex: "M",
      weight_kg: 80,
      height_cm: 180,
      mobility_status: "bedbound",
      cognitive_status: "normal",
      level_of_care: "icu",
      baseline_function: "independent",
      admission_diagnosis: "MVA polytrauma, pelvic fracture",
      comorbidities: [],
      medications: ["fentanyl", "propofol"],
      days_immobile: 7,
      on_vte_prophylaxis: true,
      is_trauma_admission: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.30, max: 0.65, level: "high" },
      vte: { min: 0.08, max: 0.25, level: "high" },
      falls: { min: 0.10, max: 0.40, level: "high" },
      pressure: { min: 0.08, max: 0.25, level: "high" },
    }
  },

  // 9. OBESE - Bariatric considerations
  {
    name: "9. 55yo morbid obesity, cellulitis",
    description: "55yo F, chair-bound, ward, cellulitis, BMI 48",
    input: {
      age: 55,
      sex: "F",
      weight_kg: 130,
      height_cm: 165,
      mobility_status: "chair_bound",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "walker",
      admission_diagnosis: "cellulitis right leg",
      comorbidities: ["obesity", "diabetes"],
      medications: [],
      days_immobile: 3,
      on_vte_prophylaxis: true,
      has_obesity: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.20, max: 0.50, level: "moderate" },
      vte: { min: 0.03, max: 0.12, level: "moderate" },
      falls: { min: 0.08, max: 0.25, level: "moderate" },
      pressure: { min: 0.05, max: 0.18, level: "moderate" },
    }
  },

  // 10. PARKINSON'S - Movement disorder
  {
    name: "10. 76yo Parkinson's, UTI",
    description: "76yo M, walking assist, ward, UTI, Parkinson's disease",
    input: {
      age: 76,
      sex: "M",
      weight_kg: 68,
      height_cm: 170,
      mobility_status: "walking_assist",
      cognitive_status: "mild_impairment",
      level_of_care: "ward",
      baseline_function: "walker",
      admission_diagnosis: "UTI",
      comorbidities: ["Parkinson's Disease"],
      medications: ["carbidopa-levodopa"],
      days_immobile: 2,
      on_vte_prophylaxis: true,
      has_parkinson: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.25, max: 0.55, level: "high" },
      vte: { min: 0.02, max: 0.08, level: "moderate" },
      falls: { min: 0.08, max: 0.30, level: "high" },
      pressure: { min: 0.03, max: 0.12, level: "moderate" },
    }
  },

  // 11. POST-CABG - Cardiac surgery
  {
    name: "11. 68yo post-CABG day 3",
    description: "68yo M, standing assist, stepdown, post-CABG",
    input: {
      age: 68,
      sex: "M",
      weight_kg: 88,
      height_cm: 178,
      mobility_status: "standing_assist",
      cognitive_status: "normal",
      level_of_care: "stepdown",
      baseline_function: "independent",
      admission_diagnosis: "post-CABG",
      comorbidities: ["CAD", "diabetes"],
      medications: ["metoprolol", "aspirin"],
      days_immobile: 3,
      on_vte_prophylaxis: true,
      is_cardiac_admission: true,
      is_postoperative: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.25, max: 0.50, level: "moderate" },
      vte: { min: 0.04, max: 0.15, level: "high" },
      falls: { min: 0.05, max: 0.18, level: "moderate" },
      pressure: { min: 0.03, max: 0.12, level: "moderate" },
    }
  },

  // 12. COPD EXACERBATION - Pulmonary
  {
    name: "12. 70yo COPD exacerbation",
    description: "70yo M, walking assist, ward, COPD exacerbation on steroids",
    input: {
      age: 70,
      sex: "M",
      weight_kg: 65,
      height_cm: 168,
      mobility_status: "walking_assist",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "COPD exacerbation",
      comorbidities: ["COPD"],
      medications: ["prednisone", "albuterol"],
      days_immobile: 2,
      on_vte_prophylaxis: true,
      on_steroids: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.18, max: 0.40, level: "moderate" },
      vte: { min: 0.02, max: 0.08, level: "moderate" },
      falls: { min: 0.02, max: 0.08, level: "low" },
      pressure: { min: 0.02, max: 0.08, level: "low" },
    }
  },

  // 13. GI BLEED - No anticoagulation
  {
    name: "13. 62yo GI bleed, anemic",
    description: "62yo F, chair-bound, stepdown, upper GI bleed, no VTE prophylaxis",
    input: {
      age: 62,
      sex: "F",
      weight_kg: 55,
      height_cm: 158,
      mobility_status: "chair_bound",
      cognitive_status: "normal",
      level_of_care: "stepdown",
      baseline_function: "independent",
      admission_diagnosis: "upper GI bleed",
      comorbidities: [],
      medications: [],
      days_immobile: 3,
      on_vte_prophylaxis: false,
      albumin_low: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.25, max: 0.55, level: "high" },
      vte: { min: 0.06, max: 0.20, level: "high" },
      falls: { min: 0.08, max: 0.25, level: "moderate" },
      pressure: { min: 0.05, max: 0.18, level: "moderate" },
    }
  },

  // 14. DELIRIUM - High falls risk
  {
    name: "14. 85yo delirium, multiple sedatives",
    description: "85yo F, chair-bound, ward, delirium, on haloperidol and lorazepam",
    input: {
      age: 85,
      sex: "F",
      weight_kg: 52,
      height_cm: 152,
      mobility_status: "chair_bound",
      cognitive_status: "delirium_dementia",
      level_of_care: "ward",
      baseline_function: "walker",
      admission_diagnosis: "delirium workup",
      comorbidities: [],
      medications: ["haloperidol", "lorazepam"],
      days_immobile: 4,
      on_vte_prophylaxis: true,
      on_sedating_medications: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.50, max: 0.85, level: "high" },
      vte: { min: 0.03, max: 0.12, level: "moderate" },
      falls: { min: 0.40, max: 0.90, level: "high" },
      pressure: { min: 0.08, max: 0.25, level: "high" },
    }
  },

  // 15. DIABETIC FOOT - Neuropathy
  {
    name: "15. 58yo diabetic foot ulcer",
    description: "58yo M, chair-bound, ward, diabetic foot ulcer, neuropathy",
    input: {
      age: 58,
      sex: "M",
      weight_kg: 95,
      height_cm: 175,
      mobility_status: "chair_bound",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "diabetic foot ulcer",
      comorbidities: ["diabetes", "neuropathy"],
      medications: ["insulin", "gabapentin"],
      days_immobile: 5,
      on_vte_prophylaxis: true,
      has_diabetes: true,
      has_neuropathy: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.25, max: 0.55, level: "high" },
      vte: { min: 0.02, max: 0.10, level: "moderate" },
      falls: { min: 0.12, max: 0.35, level: "high" },
      pressure: { min: 0.08, max: 0.25, level: "high" },
    }
  },

  // 16. YOUNG FEMALE - Low baseline
  {
    name: "16. 25yo F elective cholecystectomy",
    description: "25yo F, independent, ward, post laparoscopic cholecystectomy",
    input: {
      age: 25,
      sex: "F",
      weight_kg: 60,
      height_cm: 165,
      mobility_status: "independent",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "cholecystectomy",
      comorbidities: [],
      medications: [],
      days_immobile: 0,
      on_vte_prophylaxis: true,
      is_postoperative: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.03, max: 0.12, level: "low" },
      vte: { min: 0.01, max: 0.04, level: "low" },
      falls: { min: 0.002, max: 0.02, level: "low" },
      pressure: { min: 0.01, max: 0.04, level: "low" },
    }
  },

  // 17. VTE HISTORY - Very high VTE risk
  {
    name: "17. 60yo VTE history, knee replacement",
    description: "60yo M, chair-bound, ward, post TKA with prior DVT history",
    input: {
      age: 60,
      sex: "M",
      weight_kg: 90,
      height_cm: 180,
      mobility_status: "chair_bound",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "total knee arthroplasty",
      comorbidities: ["history of DVT"],
      medications: ["enoxaparin"],
      days_immobile: 2,
      on_vte_prophylaxis: true,
      has_vte_history: true,
      is_orthopedic: true,
      is_postoperative: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.20, max: 0.45, level: "moderate" },
      vte: { min: 0.08, max: 0.25, level: "high" },
      falls: { min: 0.10, max: 0.30, level: "high" },
      pressure: { min: 0.03, max: 0.12, level: "moderate" },
    }
  },

  // 18. FOLEY + LINES - Device burden
  {
    name: "18. 73yo multiple devices/lines",
    description: "73yo F, bedbound, stepdown, post-op with foley, central line, NG tube",
    input: {
      age: 73,
      sex: "F",
      weight_kg: 68,
      height_cm: 162,
      mobility_status: "bedbound",
      cognitive_status: "mild_impairment",
      level_of_care: "stepdown",
      baseline_function: "independent",
      admission_diagnosis: "bowel obstruction post-op",
      comorbidities: [],
      medications: ["morphine"],
      days_immobile: 4,
      on_vte_prophylaxis: true,
      has_foley_catheter: true,
      has_central_line: true,
      has_feeding_tube: true,
      is_postoperative: true,
      on_sedating_medications: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.45, max: 0.80, level: "high" },
      vte: { min: 0.05, max: 0.18, level: "high" },
      falls: { min: 0.25, max: 0.65, level: "high" },
      pressure: { min: 0.10, max: 0.30, level: "high" },
    }
  },

  // 19. REHAB - Lower acuity
  {
    name: "19. 80yo rehab, recovering stroke",
    description: "80yo M, walking assist, rehab, stroke 2 weeks out",
    input: {
      age: 80,
      sex: "M",
      weight_kg: 72,
      height_cm: 170,
      mobility_status: "walking_assist",
      cognitive_status: "normal",
      level_of_care: "rehab",
      baseline_function: "walker",
      admission_diagnosis: "stroke rehabilitation",
      comorbidities: ["hypertension", "stroke history"],
      medications: ["aspirin", "atorvastatin"],
      days_immobile: 0,
      on_vte_prophylaxis: true,
      has_stroke_history: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.20, max: 0.45, level: "moderate" },
      vte: { min: 0.02, max: 0.08, level: "moderate" },
      falls: { min: 0.08, max: 0.25, level: "high" },
      pressure: { min: 0.03, max: 0.10, level: "moderate" },
    }
  },

  // 20. INCONTINENCE - Pressure risk
  {
    name: "20. 88yo incontinent, dementia",
    description: "88yo F, chair-bound, ward, dementia, incontinent",
    input: {
      age: 88,
      sex: "F",
      weight_kg: 48,
      height_cm: 150,
      mobility_status: "chair_bound",
      cognitive_status: "delirium_dementia",
      level_of_care: "ward",
      baseline_function: "dependent",
      admission_diagnosis: "aspiration pneumonia",
      comorbidities: ["dementia"],
      medications: [],
      days_immobile: 5,
      on_vte_prophylaxis: true,
      incontinent: true,
      albumin_low: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.60, max: 0.95, level: "high" },
      vte: { min: 0.04, max: 0.15, level: "high" },
      falls: { min: 0.35, max: 0.85, level: "high" },
      pressure: { min: 0.20, max: 0.50, level: "high" },
    }
  },

  // 21. UNDERWEIGHT - Malnutrition
  {
    name: "21. 70yo cachexia, cancer",
    description: "70yo M, standing assist, ward, pancreatic cancer, cachexia",
    input: {
      age: 70,
      sex: "M",
      weight_kg: 50,
      height_cm: 175,
      mobility_status: "standing_assist",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "pancreatic cancer, failure to thrive",
      comorbidities: ["malnutrition"],
      medications: [],
      days_immobile: 3,
      on_vte_prophylaxis: true,
      has_active_cancer: true,
      has_malnutrition: true,
      albumin_low: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.35, max: 0.70, level: "high" },
      vte: { min: 0.05, max: 0.18, level: "high" },
      falls: { min: 0.05, max: 0.18, level: "moderate" },
      pressure: { min: 0.10, max: 0.30, level: "high" },
    }
  },

  // 22. VENTILATOR - Critical illness
  {
    name: "22. 55yo ventilated ARDS",
    description: "55yo M, bedbound, ICU, ARDS on ventilator, sedated",
    input: {
      age: 55,
      sex: "M",
      weight_kg: 85,
      height_cm: 178,
      mobility_status: "bedbound",
      cognitive_status: "delirium_dementia",
      level_of_care: "icu",
      baseline_function: "independent",
      admission_diagnosis: "ARDS, respiratory failure",
      comorbidities: [],
      medications: ["propofol", "fentanyl", "dexmedetomidine"],
      days_immobile: 10,
      on_vte_prophylaxis: true,
      has_ventilator: true,
      has_central_line: true,
      has_foley_catheter: true,
      on_sedating_medications: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.65, max: 0.95, level: "high" },
      vte: { min: 0.08, max: 0.25, level: "high" },
      falls: { min: 0.50, max: 0.95, level: "high" },
      pressure: { min: 0.15, max: 0.45, level: "high" },
    }
  },

  // 23. MIDDLE-AGED HEALTHY - Baseline
  {
    name: "23. 45yo healthy, observation",
    description: "45yo F, independent, ward, chest pain observation, ruled out",
    input: {
      age: 45,
      sex: "F",
      weight_kg: 68,
      height_cm: 165,
      mobility_status: "independent",
      cognitive_status: "normal",
      level_of_care: "ward",
      baseline_function: "independent",
      admission_diagnosis: "chest pain observation",
      comorbidities: [],
      medications: [],
      days_immobile: 0,
      on_vte_prophylaxis: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.03, max: 0.12, level: "low" },
      vte: { min: 0.008, max: 0.03, level: "low" },
      falls: { min: 0.002, max: 0.015, level: "low" },
      pressure: { min: 0.01, max: 0.04, level: "low" },
    }
  },

  // 24. SPINAL CORD INJURY - Neuro
  {
    name: "24. 42yo new paraplegia",
    description: "42yo M, bedbound, stepdown, new T10 spinal cord injury",
    input: {
      age: 42,
      sex: "M",
      weight_kg: 78,
      height_cm: 180,
      mobility_status: "bedbound",
      cognitive_status: "normal",
      level_of_care: "stepdown",
      baseline_function: "independent",
      admission_diagnosis: "T10 spinal cord injury, paraplegia",
      comorbidities: [],
      medications: [],
      days_immobile: 7,
      on_vte_prophylaxis: true,
      is_neuro_admission: true,
      is_trauma_admission: true,
      incontinent: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.35, max: 0.70, level: "high" },
      vte: { min: 0.10, max: 0.30, level: "high" },
      falls: { min: 0.25, max: 0.60, level: "high" },
      pressure: { min: 0.15, max: 0.40, level: "high" },
    }
  },

  // 25. LIVER CIRRHOSIS - Complex medical
  {
    name: "25. 58yo cirrhosis, encephalopathy",
    description: "58yo M, chair-bound, ward, cirrhosis with hepatic encephalopathy",
    input: {
      age: 58,
      sex: "M",
      weight_kg: 75,
      height_cm: 172,
      mobility_status: "chair_bound",
      cognitive_status: "delirium_dementia",
      level_of_care: "ward",
      baseline_function: "walker",
      admission_diagnosis: "hepatic encephalopathy, cirrhosis",
      comorbidities: ["cirrhosis"],
      medications: ["lactulose"],
      days_immobile: 4,
      on_vte_prophylaxis: false,  // Often held due to coagulopathy
      albumin_low: true,
    },
    expectedRanges: {
      deconditioning: { min: 0.40, max: 0.75, level: "high" },
      vte: { min: 0.04, max: 0.15, level: "high" },
      falls: { min: 0.30, max: 0.75, level: "high" },
      pressure: { min: 0.08, max: 0.25, level: "high" },
    }
  },
];

function runTests() {
  console.log("=" .repeat(80));
  console.log("CLINICAL VALIDATION: Immobility Harm Risk Calculator");
  console.log("=" .repeat(80));
  console.log("\n### DECONDITIONING DEFINITION ###");
  console.log("In-hospital deconditioning (also called hospital-acquired functional decline)");
  console.log("is defined as a measurable loss of physical function during hospitalization,");
  console.log("characterized by:");
  console.log("  - Decline in muscle strength (>10% loss of grip/leg strength)");
  console.log("  - Reduced mobility (decline in walking distance or gait speed)");
  console.log("  - Loss of ability to perform ADLs independently");
  console.log("  - Decreased aerobic capacity");
  console.log("  - Often measured by Barthel Index decline ≥5 points, or");
  console.log("    6-minute walk test decline >50 meters from admission\n");
  console.log("Risk factors: prolonged bedrest, advanced age, cognitive impairment,");
  console.log("malnutrition, critical illness, polypharmacy, pre-existing frailty.\n");
  console.log("=" .repeat(80));

  let passCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n### ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);

    const results = calculateRisks(testCase.input);

    const outcomes = ['deconditioning', 'vte', 'falls', 'pressure'] as const;
    let casePass = true;

    console.log("\n| Outcome        | Probability | Expected Range      | Level    | Pass? |");
    console.log("|----------------|-------------|---------------------|----------|-------|");

    for (const outcome of outcomes) {
      const result = results[outcome];
      const expected = testCase.expectedRanges[outcome];
      const prob = result.probability;
      const level = result.risk_level;

      const inRange = prob >= expected.min && prob <= expected.max;
      const levelMatch = level === expected.level ||
        (expected.level === "moderate" && (level === "low" || level === "high"));  // Allow adjacent levels

      const pass = inRange && levelMatch;
      if (!pass) casePass = false;

      const rangeStr = `${(expected.min * 100).toFixed(1)}-${(expected.max * 100).toFixed(1)}%`;
      const passStr = pass ? "✓" : "✗";

      console.log(`| ${outcome.padEnd(14)} | ${(prob * 100).toFixed(1).padStart(10)}% | ${rangeStr.padEnd(19)} | ${level.padEnd(8)} | ${passStr.padEnd(5)} |`);
    }

    // Show contributing factors for key outcomes
    console.log(`\nKey factors (deconditioning): ${results.deconditioning.contributing_factors.slice(0, 5).join(', ')}`);
    console.log(`Key factors (falls): ${results.falls.contributing_factors.slice(0, 5).join(', ')}`);

    // Show mobility recommendation
    const mobRec = results.mobility_recommendation;
    console.log(`\nMobility Rx: ${mobRec.watt_goal}W × ${mobRec.duration_min_per_session}min × ${mobRec.sessions_per_day}/day`);

    if (casePass) {
      passCount++;
      console.log("\n✓ PASS - Results clinically reasonable");
    } else {
      failCount++;
      failures.push(testCase.name);
      console.log("\n✗ FAIL - Results outside expected clinical ranges");
    }
  }

  console.log("\n" + "=" .repeat(80));
  console.log("SUMMARY");
  console.log("=" .repeat(80));
  console.log(`Total: ${TEST_CASES.length} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log(`Pass rate: ${((passCount / TEST_CASES.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log("\nFailed cases:");
    failures.forEach(f => console.log(`  - ${f}`));
  }

  console.log("\n### CLINICAL INTERPRETATION GUIDE ###");
  console.log("Deconditioning: High >25% = aggressive early mobility; Moderate 15-25% = standard mobilization");
  console.log("VTE: High >4% = ensure prophylaxis + mobility; Low <2% = mechanical prophylaxis may suffice");
  console.log("Falls: High >4% = fall precautions + supervision; Low <2% = standard care");
  console.log("Pressure: High >4% = q2h turns, pressure-reducing surface; Low <2% = standard skin care");
}

runTests();
