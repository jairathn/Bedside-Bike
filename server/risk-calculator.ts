/**
 * risk-calculator.ts
 * 
 * Hospital Immobility Harm Risk & Mobility Goal Calculator
 * Direct TypeScript port from the Python implementation
 * 
 * Outputs:
 *   - Probability, Odds Ratio (vs. fully-mobile baseline), and Ordinal Risk for:
 *       * In-hospital deconditioning (functional decline)
 *       * Venous thromboembolism (VTE)
 *       * Inpatient falls
 *       * Pressure injuries (pressure sores)
 *   - Personalized cycling (Watts) recommendation with duration/frequency
 */

import type { RiskAssessmentInput } from "@shared/schema";
import { addStayPredictions } from './mobility-addons.js';
// Removed duplicate calculator - using only central risk calculator

// Enumerations & normalizations
const MOBILITY_LEVELS = [
  "bedbound",          // 0
  "chair_bound",       // 1
  "standing_assist",   // 2
  "walking_assist",    // 3
  "independent",       // 4
] as const;

const COGNITION_LEVELS = ["normal", "mild_impairment", "delirium_dementia"] as const;
const LEVEL_OF_CARE = ["icu", "stepdown", "ward", "rehab"] as const;
const BASELINE_FUNCTION = ["independent", "walker", "dependent"] as const;

// Comprehensive diagnosis mapping for admission categories
const ADMIT_MAP: Record<string, string> = {
  // Neurological
  "stroke": "neuro",
  "cva": "neuro", 
  "intracranial hemorrhage": "neuro",
  "ich": "neuro",
  "tbi": "neuro",
  "traumatic brain injury": "neuro",
  "seizure": "neuro",
  "epilepsy": "neuro",
  "meningitis": "neuro",
  "encephalitis": "neuro",
  "spinal cord": "neuro",
  "guillain": "neuro",
  
  // Pulmonary/Respiratory
  "pneumonia": "medical_pulm",
  "copd": "medical_pulm",
  "asthma": "medical_pulm", 
  "respiratory failure": "medical_pulm",
  "pulmonary embolism": "medical_pulm",
  "pe": "medical_pulm",
  "pneumothorax": "medical_pulm",
  "pleural effusion": "medical_pulm",
  "lung": "medical_pulm",
  
  // Cardiac
  "heart failure": "cardiac",
  "chf": "cardiac",
  "mi": "cardiac",
  "myocardial infarction": "cardiac",
  "stemi": "cardiac",
  "nstemi": "cardiac",
  "cardiomyopathy": "cardiac",
  "arrhythmia": "cardiac",
  "atrial fibrillation": "cardiac",
  "afib": "cardiac",
  "cardiac arrest": "cardiac",
  "pericarditis": "cardiac",
  "aortic": "cardiac",
  "valve": "cardiac",
  
  // Surgical/Post-operative
  "post-op": "postop",
  "postoperative": "postop",
  "surgery": "postop",
  "surgical": "postop",
  "appendectomy": "postop",
  "cholecystectomy": "postop",
  "laparoscopy": "postop",
  "bowel resection": "postop",
  "hernia repair": "postop",
  
  // Orthopedic
  "orthopedic": "ortho",
  "hip fracture": "ortho",
  "femur fracture": "ortho", 
  "spine": "ortho",
  "vertebral": "ortho",
  "joint replacement": "ortho",
  "knee replacement": "ortho",
  "hip replacement": "ortho",
  "fracture": "ortho",
  "dislocation": "ortho",
  "amputation": "ortho",
  
  // Oncology
  "cancer": "oncology",
  "malignancy": "oncology",
  "tumor": "oncology",
  "leukemia": "oncology",
  "lymphoma": "oncology",
  "metastasis": "oncology",
  "chemotherapy": "oncology",
  "radiation": "oncology",
  
  // Infectious/Sepsis
  "sepsis": "sepsis",
  "septic shock": "sepsis",
  "bacteremia": "sepsis",
  "infection": "sepsis",
  "cellulitis": "sepsis",
  "abscess": "sepsis",
  "osteomyelitis": "sepsis",
  "uti": "sepsis",
  "c diff": "sepsis",
  "mrsa": "sepsis",
  
  // Trauma
  "trauma": "trauma",
  "mva": "trauma",
  "motor vehicle": "trauma",
  "fall": "trauma",
  "assault": "trauma",
  "gunshot": "trauma",
  "stab": "trauma",
  "blunt trauma": "trauma",
  "polytrauma": "trauma",
  
  // GI/Abdominal
  "gi bleed": "medical_gi",
  "gastrointestinal": "medical_gi",
  "bleeding": "medical_gi",
  "bowel obstruction": "medical_gi",
  "pancreatitis": "medical_gi",
  "liver": "medical_gi",
  "hepatic": "medical_gi",
  "cirrhosis": "medical_gi",
  "colitis": "medical_gi",
  "crohns": "medical_gi",
  
  // Renal/Genitourinary
  "kidney": "medical_renal",
  "renal": "medical_renal",
  "dialysis": "medical_renal", 
  "acute kidney injury": "medical_renal",
  "aki": "medical_renal",
  "chronic kidney disease": "medical_renal",
  "ckd": "medical_renal",
  "urinary retention": "medical_renal",
  
  // Endocrine/Metabolic
  "diabetes": "medical_endo",
  "diabetic ketoacidosis": "medical_endo",
  "dka": "medical_endo",
  "thyroid": "medical_endo",
  "hyperthyroid": "medical_endo",
  "hypothyroid": "medical_endo",
  "adrenal": "medical_endo",
};

function mapAdmitCategory(text: string): string {
  const t = (text || "").toLowerCase();
  for (const [key, value] of Object.entries(ADMIT_MAP)) {
    if (t.includes(key)) {
      return value;
    }
  }
  // Default to general medical for any unrecognized diagnosis
  return "general_medical";
}

// Medication token buckets
const SEDATIVE_TOKENS = new Set([
  "lorazepam", "diazepam", "alprazolam", "midazolam", "clonazepam",
  "zolpidem", "eszopiclone", "temazepam", "quetiapine", "haloperidol",
  "olanzapine", "trazodone", "morphine", "hydromorphone", "fentanyl",
  "oxycodone", "methadone", "propofol", "dexmedetomidine", "gabapentin",
]);

const ANTICOAG_TOKENS = new Set([
  "heparin", "enoxaparin", "fondaparinux", "apixaban", "rivaroxaban", "warfarin", "dabigatran"
]);

const STEROID_TOKENS = new Set([
  "prednisone", "methylprednisolone", "dexamethasone", "hydrocortisone"
]);

function bucketMeds(meds: string[], structuredFlags?: { sedating?: boolean; anticoag?: boolean; steroids?: boolean }): { sedating: boolean; on_anticoagulant: boolean; on_steroids: boolean } {
  // Use structured inputs if provided, otherwise analyze text
  if (structuredFlags) {
    return {
      sedating: structuredFlags.sedating || false,
      on_anticoagulant: structuredFlags.anticoag || false,
      on_steroids: structuredFlags.steroids || false,
    };
  }
  
  const medsLower = (meds || []).map(m => m.toLowerCase());
  
  const sedating = medsLower.some(m => 
    Array.from(SEDATIVE_TOKENS).some(token => m.includes(token))
  );
  
  const anticoag = medsLower.some(m => 
    Array.from(ANTICOAG_TOKENS).some(token => m.includes(token))
  );
  
  const steroid = medsLower.some(m => 
    Array.from(STEROID_TOKENS).some(token => m.includes(token))
  );
  
  return { sedating, on_anticoagulant: anticoag, on_steroids: steroid };
}

// Calibration & Weights - Direct from Python
const CALIBRATION = {
  deconditioning: { intercept: -2.0 },   // ~12%
  vte: { intercept: -4.18 },             // ~1.5%
  falls: { intercept: -5.8 },            // ~0.3% baseline (1-11% max range)
  pressure: { intercept: -3.66 },        // ~2.5%
};

// Mobility weights (largest driver across outcomes)
const W_MOBILITY = {
  deconditioning: {
    bedbound: Math.log(5.6),        // ~5.6x odds vs high mobility
    chair_bound: Math.log(3.0),
    standing_assist: Math.log(1.8),
    walking_assist: Math.log(1.3),
    independent: 0.0,
  },
  vte: {
    bedbound: Math.log(3.6),
    chair_bound: Math.log(2.0),
    standing_assist: Math.log(1.5),
    walking_assist: Math.log(1.2),
    independent: 0.0,
  },
  falls: {
    bedbound: Math.log(25.0),     // High falls risk when bedbound
    chair_bound: Math.log(15.0),   // Moderate-high falls risk  
    standing_assist: Math.log(8.0), // Moderate falls risk
    walking_assist: Math.log(3.0), // Mild falls risk
    independent: 0.0,              // Baseline low risk
  },
  pressure: {
    bedbound: Math.log(4.0),
    chair_bound: Math.log(2.5),
    standing_assist: Math.log(1.6),
    walking_assist: Math.log(1.2),
    independent: 0.0,
  },
};

// Additional risk factor weights (log-odds increments)
const W_COMMON = {
  "age_65+": Math.log(1.3),        // Age 65+: 30% increase (NEW)
  "age_70+": Math.log(1.3),        // Additional 30% for 70+ (cumulative with 65+)
  "age_80+": Math.log(1.4),        // Additional 40% for 80+ (cumulative with 65+, 70+)
  "icu": Math.log(2.0),
  "stepdown": Math.log(1.3),
  "malnutrition": Math.log(1.6),
  "low_albumin": Math.log(1.5),
  "obesity": Math.log(1.3),
  "diabetes": Math.log(1.2),
  "neuropathy": Math.log(1.4),
  "parkinson": Math.log(1.6),
  "stroke": Math.log(1.8),
  "walker_baseline": Math.log(1.4),
  "dependent_baseline": Math.log(2.0),
};

// Outcome-specific modifiers
const W_SPECIFIC = {
  deconditioning: {
    cog_mild: Math.log(1.3),
    cog_delirium: Math.log(1.7),
    steroids: Math.log(1.2),
    days_immobile_ge3: Math.log(1.6),
  },
  vte: {
    immobile_ge3: Math.log(1.8),     // additive to mobility category
    active_cancer: Math.log(2.0),
    history_vte: Math.log(3.0),
    postop: Math.log(1.8),
    trauma: Math.log(2.2),
    no_prophylaxis: Math.log(2.5),
  },
  falls: {
    sedating_meds: Math.log(1.8),
    cog_mild: Math.log(1.6),
    cog_delirium: Math.log(2.6),
    orthopedic: Math.log(1.5),
    stroke: Math.log(1.6),
    devices: Math.log(1.3),          // lines/tubes/foley
  },
  pressure: {
    moisture: Math.log(1.6),         // incontinence, moisture
    low_albumin: Math.log(1.5),
    diabetes: Math.log(1.3),
    immobile_ge3: Math.log(1.6),
  }
};

// Interaction: immobility + delirium dramatically increases falls
const INTERACTIONS = {
  falls: {
    "bedbound,delirium_dementia": Math.log(1.8),
    "chair_bound,delirium_dementia": Math.log(1.5),
  }
};

// Risk level thresholds (probability bands)
const RISK_BANDS = {
  deconditioning: { low: 0.0, moderate: 0.15, high: 0.25 },   // High at 25%
  vte: { low: 0.0, moderate: 0.02, high: 0.04 },              // High at 4%  
  falls: { low: 0.0, moderate: 0.02, high: 0.04 },            // High at 4%
  pressure: { low: 0.0, moderate: 0.02, high: 0.04 },         // High at 4%
};

// Core math helpers
function sigmoid(x: number): number {
  return 1.0 / (1.0 + Math.exp(-x));
}

function probFromLogit(intercept: number, score: number): number {
  return sigmoid(intercept + score);
}

function riskLevel(outcome: keyof typeof RISK_BANDS, p: number): string {
  const bands = RISK_BANDS[outcome];
  if (p >= bands.high) return "high";
  if (p >= bands.moderate) return "moderate";
  return "low";
}

// Feature extraction
function featureFlags(p: RiskAssessmentInput): Record<string, any> {
  // Use structured medication flags if available
  const structuredMedFlags = {
    sedating: p.on_sedating_medications,
    anticoag: p.on_anticoagulants,
    steroids: p.on_steroids,
  };
  
  const medsInfo = bucketMeds(p.medications || [], structuredMedFlags);
  const com = new Set(p.comorbidities || []);
  const devices = new Set(p.devices || []);

  // Age flags
  const age_70p = p.age >= 70;
  const age_80p = p.age >= 80;

  // Level of care
  const loc = p.level_of_care.toLowerCase();
  const is_icu = loc === "icu";
  const is_step = loc === "stepdown";

  // Baseline function
  const bf = (p.baseline_function || "independent").toLowerCase();

  // Admission category
  const admit_cat = mapAdmitCategory(p.admission_diagnosis || "");

  // Days immobile
  const d_imm = p.days_immobile || 0;
  const immobile_ge3 = d_imm >= 3;

  // Cognition
  const cog = (p.cognitive_status || "normal").toLowerCase();

  // Moisture risk
  const moisture = Boolean(p.incontinent);

  // BMI calculation for obesity
  const bmi = p.weight_kg && p.height_cm ? 
    p.weight_kg / Math.pow(p.height_cm / 100, 2) : null;

  const flags = {
    "age_65+": p.age >= 65,
    "age_70+": age_70p, 
    "age_80+": age_80p,
    "icu": is_icu,
    "stepdown": is_step,
    "malnutrition": p.has_malnutrition || com.has("malnutrition"),
    "low_albumin": Boolean(p.albumin_low),
    "obesity": p.has_obesity || com.has("obesity") || (bmi !== null && bmi >= 30),
    "diabetes": p.has_diabetes || com.has("diabetes"),
    "neuropathy": p.has_neuropathy || com.has("neuropathy"),
    "parkinson": p.has_parkinson || com.has("parkinson"),
    "stroke": p.has_stroke_history || com.has("stroke") || p.is_neuro_admission || admit_cat === "neuro" || admit_cat === "medical_pulm",
    "walker_baseline": bf === "walker",
    "dependent_baseline": bf === "dependent",

    // VTE specifics
    "active_cancer": p.has_active_cancer || com.has("active_cancer") || p.is_oncology || admit_cat === "oncology",
    "history_vte": p.has_vte_history || com.has("history_vte"),
    "postop": p.is_postoperative || admit_cat === "postop",
    "trauma": p.is_trauma_admission || admit_cat === "trauma",
    "immobile_ge3": immobile_ge3,
    "no_prophylaxis": !Boolean(p.on_vte_prophylaxis),

    // Falls specifics
    "sedating_meds": medsInfo.sedating,
    "devices": devices.size > 0 || p.has_foley_catheter || p.has_central_line || p.has_feeding_tube || p.has_ventilator,

    // Pressure specifics
    "moisture": moisture,

    // cognition normalization
    "cog": cog,
    "admit_cat": getAdmitCategory(p, admit_cat),
    "mobility": (p.mobility_status || "bedbound").toLowerCase(),
  };
  
  return flags;
}

// Helper function to determine admission category from structured inputs
function getAdmitCategory(p: RiskAssessmentInput, textBasedCat: string): string {
  if (p.is_cardiac_admission) return "cardiac";
  if (p.is_neuro_admission) return "neuro";
  if (p.is_orthopedic) return "ortho";
  if (p.is_oncology) return "oncology";
  if (p.is_postoperative) return "postop";
  if (p.is_trauma_admission) return "trauma";
  if (p.is_sepsis) return "sepsis";
  return textBasedCat; // Fall back to comprehensive text analysis
}

// Scoring engines
function scoreDeconditioning(f: Record<string, any>): { score: number; factors: string[] } {
  let w = 0.0;
  const factors: string[] = [];

  // mobility
  const mob = f.mobility;
  w += W_MOBILITY.deconditioning[mob as keyof typeof W_MOBILITY.deconditioning];
  factors.push(`mobility:${mob}`);

  // common - NOW INCLUDING AGE 65+
  const commonKeys = ["age_65+", "age_70+", "age_80+", "icu", "stepdown", "malnutrition", "low_albumin", "walker_baseline", "dependent_baseline"];
  for (const key of commonKeys) {
    if (f[key]) {
      w += W_COMMON[key as keyof typeof W_COMMON];
      factors.push(key);
    }
  }

  // cognition, steroids, immobile days
  if (f.cog === "mild_impairment") {
    w += W_SPECIFIC.deconditioning.cog_mild;
    factors.push("cog_mild");
  }
  if (f.cog === "delirium_dementia") {
    w += W_SPECIFIC.deconditioning.cog_delirium;
    factors.push("cog_delirium");
  }
  if (f.immobile_ge3) {
    w += W_SPECIFIC.deconditioning.days_immobile_ge3;
    factors.push("immobile_ge3");
  }

  return { score: w, factors };
}

function scoreVte(f: Record<string, any>): { score: number; factors: string[] } {
  let w = 0.0;
  const factors: string[] = [];
  
  const mob = f.mobility;
  w += W_MOBILITY.vte[mob as keyof typeof W_MOBILITY.vte];
  factors.push(`mobility:${mob}`);

  const vteKeys = ["icu", "stepdown", "active_cancer", "history_vte", "postop", "trauma", "immobile_ge3", "no_prophylaxis", "age_65+", "age_70+", "age_80+", "obesity"];
  for (const key of vteKeys) {
    if (f[key]) {
      const add = W_SPECIFIC.vte[key as keyof typeof W_SPECIFIC.vte] || W_COMMON[key as keyof typeof W_COMMON];
      if (add) {
        w += add;
        factors.push(key);
      }
    }
  }
  
  return { score: w, factors };
}

function scoreFalls(f: Record<string, any>): { score: number; factors: string[] } {
  let w = 0.0;
  const factors: string[] = [];
  
  const mob = f.mobility;
  w += W_MOBILITY.falls[mob as keyof typeof W_MOBILITY.falls];
  factors.push(`mobility:${mob}`);

  // cognition
  if (f.cog === "mild_impairment") {
    w += W_SPECIFIC.falls.cog_mild;
    factors.push("cog_mild");
  }
  if (f.cog === "delirium_dementia") {
    w += W_SPECIFIC.falls.cog_delirium;
    factors.push("cog_delirium");
  }

  // meds, neuro/ortho, devices
  const fallsKeys = ["sedating_meds", "stroke", "devices"];
  for (const key of fallsKeys) {
    if (f[key]) {
      const add = W_SPECIFIC.falls[key as keyof typeof W_SPECIFIC.falls] || W_COMMON[key as keyof typeof W_COMMON];
      if (add) {
        w += add;
        factors.push(key);
      }
    }
  }
  
  if (f.admit_cat === "ortho") {
    w += W_SPECIFIC.falls.orthopedic;
    factors.push("orthopedic");
  }

  // interactions
  const inter = INTERACTIONS.falls;
  const tup = `${mob},${f.cog}`;
  if (tup in inter) {
    w += inter[tup as keyof typeof inter];
    factors.push(`interaction:${mob}+${f.cog}`);
  }
  
  // age & baseline function - NOW INCLUDING AGE 65+
  const ageKeys = ["age_65+", "age_70+", "age_80+", "walker_baseline", "dependent_baseline"];
  for (const key of ageKeys) {
    if (f[key]) {
      w += W_COMMON[key as keyof typeof W_COMMON];
      factors.push(key);
    }
  }
  
  return { score: w, factors };
}

function scorePressure(f: Record<string, any>): { score: number; factors: string[] } {
  let w = 0.0;
  const factors: string[] = [];
  
  const mob = f.mobility;
  w += W_MOBILITY.pressure[mob as keyof typeof W_MOBILITY.pressure];
  factors.push(`mobility:${mob}`);

  const pressureKeys = ["age_65+", "age_70+", "age_80+", "low_albumin", "diabetes", "immobile_ge3", "malnutrition", "obesity", "moisture", "walker_baseline", "dependent_baseline", "icu", "stepdown"];
  for (const key of pressureKeys) {
    if (f[key]) {
      const add = W_SPECIFIC.pressure[key as keyof typeof W_SPECIFIC.pressure] || W_COMMON[key as keyof typeof W_COMMON];
      if (add) {
        w += add;
        factors.push(key);
      }
    }
  }
  
  return { score: w, factors };
}

// Mobility recommendation (Watts)
function estimateWattGoal(p: RiskAssessmentInput): {
  watt_goal: number;
  duration_min_per_session: number;
  sessions_per_day: number;
  notes: string;
} {
  // Base by mobility capacity
  const baseByMob = {
    bedbound: 12.0,
    chair_bound: 16.0,
    standing_assist: 20.0,
    walking_assist: 28.0,
    independent: 35.0,
  };
  
  const mob = (p.mobility_status || "bedbound").toLowerCase();
  let base = baseByMob[mob as keyof typeof baseByMob] || 16.0;

  // Size adjustment (if available)
  let sizeAdj = 0.0;
  if (p.weight_kg) {
    // ~0.12 W per kg above/below 70kg (light touch)
    sizeAdj += 0.12 * (p.weight_kg - 70.0);
  }

  // Age adjustment
  if (p.age >= 80) {
    base -= 6.0;
  } else if (p.age >= 70) {
    base -= 4.0;
  } else if (p.age <= 45) {
    base += 3.0;
  }

  // Sex adjustment
  const sex = (p.sex || "").toLowerCase();
  if (sex === "male") {
    base += 2.0;
  } else if (sex === "female") {
    base += 0.0;  // neutral baseline
  }

  // Level of care safety
  const loc = (p.level_of_care || "ward").toLowerCase();
  if (loc === "icu") {
    base -= 4.0;  // start gentler in ICU
  }

  // Clamp to safe window
  const targetW = Math.max(10.0, Math.min(80.0, base + sizeAdj));

  // Duration & frequency defaults
  // ICU/very frail: shorter, more frequent bouts
  let duration: number, sessions: number;
  if (loc === "icu" || ["bedbound", "chair_bound"].includes(mob)) {
    duration = 10;
    sessions = 2;
  } else {
    duration = 15;
    sessions = 2;
  }

  return {
    watt_goal: Math.round(targetW * 10) / 10,
    duration_min_per_session: duration,
    sessions_per_day: sessions,
    notes: "Aim for light–moderate effort. Increase gradually if well tolerated. Walking or sit-to-stand sets can substitute when safe.",
  };
}

function estimateWattGoalV2(p: RiskAssessmentInput): {
  watt_goal: number;
  duration_min_per_session: number;
  sessions_per_day: number;
  notes: string;
  debug?: any;
} {
  /**
   * Anthropometric-aware cycling recommendation for a bedside cycle ergometer.
   * Uses weight & height (if available) to compute a safe, personalized W/kg target
   * anchored to ~2.0–3.0 METs (light–moderate), then converts to absolute Watts.
   */
  
  // Helper function for safe defaults
  const safe = (val: any, defaultVal: any) => val == null ? defaultVal : val;

  const age = parseInt(safe(p.age, 70));
  const sex = String(safe(p.sex, "")).toLowerCase();
  const loc = String(safe(p.level_of_care, "ward")).toLowerCase();
  const mob = String(safe(p.mobility_status, "bedbound")).toLowerCase();

  const wt = p.weight_kg;
  const htCm = p.height_cm;
  const hasWt = typeof wt === 'number' && wt > 0;
  const hasHt = typeof htCm === 'number' && htCm > 0;

  // BMI calculation (if possible)
  let bmi: number | null = null;
  if (hasWt && hasHt) {
    const m = htCm / 100.0;
    bmi = wt / (m * m);
  }

  // Step 1: Choose W/kg band by mobility severity
  // These bands map roughly to total VO2 ~ 10–12 mL/kg/min (≈ 2.8–3.4 METs)
  const baseBand: Record<string, [number, number]> = {
    bedbound: [0.20, 0.28],        // very light
    chair_bound: [0.22, 0.30],
    standing_assist: [0.25, 0.34],
    walking_assist: [0.28, 0.40],
    independent: [0.32, 0.45],
  };

  const [wkgLo, wkgHi] = baseBand[mob] || [0.22, 0.32];
  let wkg = 0.5 * (wkgLo + wkgHi); // Start from middle of band

  // Step 2: Adjust intensity band for level of care & age
  if (loc === "icu") {
    wkg *= 0.85;
  } else if (loc === "stepdown") {
    wkg *= 0.93;
  }

  // Age trims (light, not punitive)
  if (age >= 80) {
    wkg *= 0.88;
  } else if (age >= 70) {
    wkg *= 0.93;
  } else if (age <= 45) {
    wkg *= 1.05;
  }

  // Sex: tiny nudge
  if (sex === "male") {
    wkg *= 1.03;
  }

  // Step 3: BMI-aware safety ceilings/floors
  if (bmi !== null) {
    if (bmi >= 40) {
      wkg = Math.min(wkg, 0.28);
    } else if (bmi >= 35) {
      wkg = Math.min(wkg, 0.30);
    } else if (bmi < 18.5) {
      // underweight: keep intensity modest
      wkg = Math.min(wkg, 0.26);
    }
  }

  // Global safety bounds regardless of BMI/mobility
  wkg = Math.max(0.18, Math.min(0.48, wkg));

  // Step 4: Convert W/kg to absolute Watts using weight
  let watts: number;
  if (hasWt) {
    // Using ACSM cycle-ergometer relation:
    // VO2 (mL/kg/min) = 7 + 10.8 * (W / kg)
    watts = wkg * wt;
  } else {
    // Fallback: reuse baseline by mobility, lightly age-trimmed
    const fallbackMap: Record<string, number> = {
      bedbound: 14.0,
      chair_bound: 18.0,
      standing_assist: 22.0,
      walking_assist: 30.0,
      independent: 36.0,
    };
    
    let fallback = fallbackMap[mob] || 18.0;
    
    // Age/ICU gentle scaling
    if (loc === "icu") fallback *= 0.9;
    if (age >= 80) fallback *= 0.88;
    else if (age >= 70) fallback *= 0.93;
    else if (age <= 45) fallback *= 1.05;
    
    watts = fallback;
  }

  // DEVICE-SPECIFIC CALIBRATION FOR 9-INCH ELECTROMAGNETIC FLYWHEEL
  // Physical constraints: 30-50 lbs resistance (linear scale 1-9)
  // Typical elderly RPM: 40-60 RPM
  // Physics: Power = Torque × Angular Velocity
  // For this device, realistic power outputs:
  // - Resistance 3-4 (35-40 lbs): 25-40W at 50 RPM
  // - Resistance 5-6 (42.5-45 lbs): 40-55W at 50 RPM
  // - Resistance 7-8 (47.5-50 lbs): 55-70W at 50 RPM
  
  // Increase baseline to match electromagnetic flywheel physics
  watts = Math.max(watts * 1.4, 25.0); // 40% increase for device reality
  
  // Step 5: Final safety clamps & rounding adjusted for 9-inch flywheel
  // Global clamp: 25–70 W realistic for electromagnetic resistance 30-50 lbs
  watts = Math.max(25.0, Math.min(70.0, watts));
  const wattGoal = Math.round(watts * 10) / 10; // Round to 1 decimal place

  // Step 6: Dose shape (duration/sessions)
  // Frailer/ICU -> shorter, more frequent; otherwise standard bouts
  let duration: number;
  let sessions: number;

  if (loc === "icu" || mob === "bedbound" || mob === "chair_bound") {
    duration = mob === "bedbound" ? 8 : 10;
    sessions = 2;
  } else {
    duration = (mob === "standing_assist" || mob === "walking_assist") ? 12 : 15;
    sessions = 2;
  }

  const notes = 
    `Target light–moderate effort (${wattGoal}W ≈ resistance level ${Math.round((wattGoal - 25) / 45 * 8 + 3)}). ` +
    "Adjust by symptoms, BP/HR response, and RPE 2–3/10. " +
    "If undue fatigue or hemodynamic instability, reduce resistance level and reassess.";

  const totalDailyEnergy = Math.round(wattGoal * duration * sessions); // Round total energy to whole number

  return {
    watt_goal: wattGoal,
    duration_min_per_session: duration,
    sessions_per_day: sessions,
    total_daily_energy: totalDailyEnergy,
    notes,
    debug: {
      used_wkg: hasWt ? Math.round(wkg * 1000) / 1000 : null,
      bmi: bmi !== null ? Math.round(bmi * 10) / 10 : null,
      age,
      loc,
      mobility: mob,
    },
  };
}

// Public API
function computeOutcome(outcome: string, p: RiskAssessmentInput, f: Record<string, any>): {
  probability: number;
  odds_ratio_vs_mobile: number;
  risk_level: string;
  contributing_factors: string[];
} {
  let score: number, factors: string[];
  
  if (outcome === "deconditioning") {
    const result = scoreDeconditioning(f);
    score = result.score;
    factors = result.factors;
  } else if (outcome === "vte") {
    const result = scoreVte(f);
    score = result.score;
    factors = result.factors;
  } else if (outcome === "falls") {
    const result = scoreFalls(f);
    score = result.score;
    factors = result.factors;
  } else if (outcome === "pressure") {
    const result = scorePressure(f);
    score = result.score;
    factors = result.factors;
  } else {
    throw new Error("Unknown outcome");
  }

  const intercept = CALIBRATION[outcome as keyof typeof CALIBRATION].intercept;
  let prob = probFromLogit(intercept, score);
  
  // Apply standard capping (remove special falls capping as you mentioned baseline accounts for this)
  prob = Math.min(prob, 0.95); // Cap all outcomes at 95%

  // Reference (fully mobile) odds ratio: same patient but as "independent" and 0 immobile days
  const fRef = { ...f };
  fRef.mobility = "independent";
  fRef.immobile_ge3 = false;

  let scoreRef: number;
  if (outcome === "deconditioning") {
    scoreRef = scoreDeconditioning(fRef).score;
  } else if (outcome === "vte") {
    scoreRef = scoreVte(fRef).score;
  } else if (outcome === "falls") {
    scoreRef = scoreFalls(fRef).score;
  } else {
    scoreRef = scorePressure(fRef).score;
  }

  const pRef = probFromLogit(intercept, scoreRef);
  
  // Avoid div by zero / 1 edge
  const odds = prob / Math.max(1e-9, (1 - prob));
  const oddsRef = pRef / Math.max(1e-9, (1 - pRef));
  const orVsMobile = odds / Math.max(1e-9, oddsRef);

  return {
    probability: Math.round(prob * 10000) / 10000,
    odds_ratio_vs_mobile: Math.round(orVsMobile * 100) / 100,
    risk_level: riskLevel(outcome as keyof typeof RISK_BANDS, prob),
    contributing_factors: factors,
  };
}

export function calculateRisks(p: RiskAssessmentInput): {
  deconditioning: ReturnType<typeof computeOutcome>;
  vte: ReturnType<typeof computeOutcome>;
  falls: ReturnType<typeof computeOutcome>;
  pressure: ReturnType<typeof computeOutcome>;
  mobility_recommendation: ReturnType<typeof estimateWattGoalV2>;
  input_echo: RiskAssessmentInput;
  los?: any; // Length of stay predictions from addStayPredictions
  discharge?: any; // Discharge disposition predictions
  readmission?: any; // Readmission risk predictions
  personalized_benefit?: any; // Personalized benefits from mobility
} {
  const f = featureFlags(p);
  
  const baseResults = {
    deconditioning: computeOutcome("deconditioning", p, f),
    vte: computeOutcome("vte", p, f),
    falls: computeOutcome("falls", p, f),
    pressure: computeOutcome("pressure", p, f),
    mobility_recommendation: estimateWattGoalV2(p),
    input_echo: p,
  };
  
  // Add stay predictions (LOS, discharge, readmission) using robust calculator only
  return addStayPredictions(baseResults);
}