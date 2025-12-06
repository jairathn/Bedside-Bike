/**
 * mobility-addons.ts
 * 
 * Add-on predictions for:
 * - Length of Stay (LOS) in days (+ range)
 * - Discharge destination (home vs post-acute)
 * - 30-day all-cause readmission risk
 * 
 * This module extends the base risk calculator with additional outcomes.
 */



interface AddonFlags {
  age_70_plus: boolean;
  age_80_plus: boolean;
  icu: boolean;
  stepdown: boolean;
  malnutrition: boolean;
  low_albumin: boolean;
  obesity: boolean;
  diabetes: boolean;
  neuropathy: boolean;
  parkinson: boolean;
  stroke: boolean;
  walker_baseline: boolean;
  dependent_baseline: boolean;
  active_cancer: boolean;
  history_vte: boolean;
  postop: boolean;
  trauma: boolean;
  immobile_ge3: boolean;
  no_prophylaxis: boolean;
  sedating_meds: boolean;
  devices_present: boolean;
  moisture: boolean;
  cog: string;
  admit_cat: string;
  mobility: string;
  level_of_care: string;
  sex: string;
  age: number;
  bmi?: number;
  days_immobile: number;
}

interface StayPredictions {
  length_of_stay: {
    predicted_days: number;
    range_min: number;
    range_max: number;
    confidence_level: string;
    factors_increasing: string[];
    factors_decreasing: string[];
    mobility_goal_benefit: number;
  };
  discharge_disposition: {
    home_probability: number;
    disposition_prediction: string;
    confidence_level: string;
    key_factors: string[];
  };
  readmission_risk: {
    thirty_day_probability: number;
    risk_level: string;
    modifiable_factors: string[];
    mobility_benefit: number;
  };
}

// Admission diagnosis mapping
const ADMIT_MAP: Record<string, string> = {
  "stroke": "neuro",
  "intracranial hemorrhage": "neuro", 
  "tbi": "neuro",
  "pneumonia": "medical_pulm",
  "copd": "medical_pulm",
  "asthma": "medical_pulm",
  "heart failure": "cardiac",
  "mi": "cardiac",
  "post-op": "postop",
  "postoperative": "postop",
  "orthopedic": "ortho",
  "hip fracture": "ortho",
  "spine": "ortho",
  "cancer": "oncology",
  "sepsis": "sepsis",
  "trauma": "trauma",
};

// Medication classification
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

// Calibration constants for Length of Stay (baseline prediction unchanged)
const CAL_LOS = {
  base: 5.5,
  coef: {
    icu: 2.0,
    stepdown: 0.7,
    mob_bedbound: 1.5,  // Restored original values for baseline prediction
    mob_chair_bound: 1.0,
    mob_standing_assist: 0.5,
    mob_walking_assist: 0.2,
    immobile_ge3: 1.0,
    age_70_plus: 0.6,
    age_80_plus: 0.5,
    cog_mild: 0.3,
    cog_delirium: 0.8,
    malnutrition: 0.8,
    low_albumin: 0.5,
    stroke: 1.0,
    postop: 0.6,
    trauma: 0.8,
    devices_present: 0.3,
  },
  goal_delta_cap: 0.5,  // Reduced from 2.4 to 0.5 - this limits mobility benefit to ~0.5 days max
  goal_delta_floor: 0.1  // Reduced from 0.8 to 0.1 - minimum benefit now much smaller
};

// Calibration constants for Discharge Home probability
const CAL_DISCHARGE = {
  intercept: 1.20,
  coef: {
    icu: -1.20,
    stepdown: -0.40,
    mob_bedbound: -1.20,
    mob_chair_bound: -0.80,
    mob_standing_assist: -0.40,
    mob_walking_assist: -0.15,
    immobile_ge3: -0.50,
    age_70_plus: -0.30,
    age_80_plus: -0.20,
    cog_mild: -0.35,
    cog_delirium: -0.90,
    malnutrition: -0.40,
    low_albumin: -0.35,
    stroke: -0.60,
    trauma: -0.25,
    devices_present: -0.25,
  }
};

// Calibration constants for 30-day Readmission
const CAL_READMIT = {
  intercept: -1.73,
  coef: {
    icu: 0.20,
    stepdown: 0.10,
    mob_bedbound: 0.50,
    mob_chair_bound: 0.30,
    mob_standing_assist: 0.20,
    immobile_ge3: 0.30,
    age_70_plus: 0.15,
    age_80_plus: 0.15,
    cog_mild: 0.20,
    cog_delirium: 0.40,
    malnutrition: 0.30,
    low_albumin: 0.30,
    diabetes: 0.15,
    active_cancer: 0.25,
    stroke: 0.30,
    devices_present: 0.20,
    sedating_meds: 0.20,
  },
  goal_bonus_logit: -0.20
};

function mapAdmitCategory(text: string): string {
  const t = (text || "").toLowerCase();
  for (const [key, value] of Object.entries(ADMIT_MAP)) {
    if (t.includes(key)) {
      return value;
    }
  }
  return "general_medical";
}

function bucketMeds(meds: string[]): { sedating: boolean; on_anticoagulant: boolean; on_steroids: boolean } {
  const medLower = (meds || []).map(m => m.toLowerCase());
  
  const sedating = medLower.some(m => 
    Array.from(SEDATIVE_TOKENS).some(token => m.includes(token))
  );
  
  const on_anticoagulant = medLower.some(m => 
    Array.from(ANTICOAG_TOKENS).some(token => m.includes(token))
  );
  
  const on_steroids = medLower.some(m => 
    Array.from(STEROID_TOKENS).some(token => m.includes(token))
  );
  
  return { sedating, on_anticoagulant, on_steroids };
}

function sigmoid(x: number): number {
  return 1.0 / (1.0 + Math.exp(-x));
}

function extractAddonFlags(inputEcho: any): AddonFlags {
  const p = inputEcho;
  const medsInfo = bucketMeds(p.medications || []);
  const comorbidities = new Set(p.comorbidities || []);
  const devices = new Set(p.devices || []);
  
  const age = parseInt(p.age) || 0;
  const heightCm = p.height_cm;
  const weightKg = p.weight_kg;
  let bmi: number | undefined;
  
  if (heightCm && weightKg) {
    try {
      bmi = parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100.0, 2);
    } catch (e) {
      bmi = undefined;
    }
  }
  
  const levelOfCare = (p.level_of_care || "ward").toLowerCase();
  const baselineFunction = (p.baseline_function || "independent").toLowerCase();
  const cognitiveStatus = (p.cognitive_status || "normal").toLowerCase();
  const mobilityStatus = (p.mobility_status || "bedbound").toLowerCase();
  const admitCat = mapAdmitCategory(p.admission_diagnosis || "");
  const daysImmobile = parseInt(p.days_immobile) || 0;
  
  return {
    age_70_plus: age >= 70,
    age_80_plus: age >= 80,
    icu: levelOfCare === "icu",
    stepdown: levelOfCare === "stepdown",
    malnutrition: comorbidities.has("malnutrition"),
    low_albumin: Boolean(p.albumin_low),
    obesity: comorbidities.has("obesity") || (bmi !== undefined && bmi >= 30),
    diabetes: comorbidities.has("diabetes"),
    neuropathy: comorbidities.has("neuropathy"),
    parkinson: comorbidities.has("parkinson"),
    stroke: comorbidities.has("stroke") || admitCat === "neuro",
    walker_baseline: baselineFunction === "walker",
    dependent_baseline: baselineFunction === "dependent",
    active_cancer: comorbidities.has("active_cancer") || admitCat === "oncology",
    history_vte: comorbidities.has("history_vte"),
    postop: admitCat === "postop",
    trauma: admitCat === "trauma",
    immobile_ge3: daysImmobile >= 3,
    no_prophylaxis: !Boolean(p.on_vte_prophylaxis),
    sedating_meds: medsInfo.sedating,
    devices_present: devices.size > 0,
    moisture: Boolean(p.incontinent),
    cog: cognitiveStatus,
    admit_cat: admitCat,
    mobility: mobilityStatus,
    level_of_care: levelOfCare,
    sex: (p.sex || "").toLowerCase(),
    age,
    bmi,
    days_immobile: daysImmobile,
  };
}

function getMobilityKeys(mobility: string): Record<string, boolean> {
  const mob = mobility.toLowerCase();
  return {
    mob_bedbound: mob === "bedbound",
    mob_chair_bound: mob === "chair_bound", 
    mob_standing_assist: mob === "standing_assist",
    mob_walking_assist: mob === "walking_assist",
  };
}

function calculateLOS(flags: AddonFlags): { days: number; factors: string[] } {
  const c = CAL_LOS.coef;
  let days = CAL_LOS.base;
  const factors: string[] = [];
  
  // Mobility status
  const mobilityKeys = getMobilityKeys(flags.mobility);
  for (const [key, isActive] of Object.entries(mobilityKeys)) {
    if (isActive && c[key as keyof typeof c]) {
      days += c[key as keyof typeof c];
      factors.push(key);
    }
  }
  
  // Immobility duration
  if (flags.immobile_ge3) {
    days += c.immobile_ge3;
    factors.push("immobile_ge3");
  }
  
  // Level of care
  if (flags.icu) {
    days += c.icu;
    factors.push("icu");
  } else if (flags.stepdown) {
    days += c.stepdown;
    factors.push("stepdown");
  }
  
  // Age factors
  if (flags.age_70_plus) {
    days += c.age_70_plus;
    factors.push("age_70_plus");
  }
  if (flags.age_80_plus) {
    days += c.age_80_plus;
    factors.push("age_80_plus");
  }
  
  // Cognitive status
  if (flags.cog === "mild_impairment") {
    days += c.cog_mild;
    factors.push("cog_mild");
  }
  if (flags.cog === "delirium_dementia") {
    days += c.cog_delirium;
    factors.push("cog_delirium");
  }
  
  // Nutritional factors
  if (flags.malnutrition) {
    days += c.malnutrition;
    factors.push("malnutrition");
  }
  if (flags.low_albumin) {
    days += c.low_albumin;
    factors.push("low_albumin");
  }
  
  // Diagnosis factors
  if (flags.stroke) {
    days += c.stroke;
    factors.push("stroke");
  }
  if (flags.postop) {
    days += c.postop;
    factors.push("postop");
  }
  if (flags.trauma) {
    days += c.trauma;
    factors.push("trauma");
  }
  
  // Device factors
  if (flags.devices_present) {
    days += c.devices_present;
    factors.push("devices_present");
  }
  
  return { days: Math.max(1.0, days), factors };
}

function calculateHomeProbability(flags: AddonFlags): { probability: number; factors: string[] } {
  let logit = CAL_DISCHARGE.intercept;
  const factors: string[] = [];
  
  // Mobility status
  const mobilityKeys = getMobilityKeys(flags.mobility);
  for (const [key, isActive] of Object.entries(mobilityKeys)) {
    if (isActive && CAL_DISCHARGE.coef[key as keyof typeof CAL_DISCHARGE.coef]) {
      logit += CAL_DISCHARGE.coef[key as keyof typeof CAL_DISCHARGE.coef];
      factors.push(key);
    }
  }
  
  // Apply other factors similarly to LOS calculation
  if (flags.immobile_ge3) {
    logit += CAL_DISCHARGE.coef.immobile_ge3;
    factors.push("immobile_ge3");
  }
  
  if (flags.icu) {
    logit += CAL_DISCHARGE.coef.icu;
    factors.push("icu");
  } else if (flags.stepdown) {
    logit += CAL_DISCHARGE.coef.stepdown;
    factors.push("stepdown");
  }
  
  if (flags.age_70_plus) {
    logit += CAL_DISCHARGE.coef.age_70_plus;
    factors.push("age_70_plus");
  }
  if (flags.age_80_plus) {
    logit += CAL_DISCHARGE.coef.age_80_plus;
    factors.push("age_80_plus");
  }
  
  if (flags.cog === "mild_impairment") {
    logit += CAL_DISCHARGE.coef.cog_mild;
    factors.push("cog_mild");
  }
  if (flags.cog === "delirium_dementia") {
    logit += CAL_DISCHARGE.coef.cog_delirium;
    factors.push("cog_delirium");
  }
  
  if (flags.malnutrition) {
    logit += CAL_DISCHARGE.coef.malnutrition;
    factors.push("malnutrition");
  }
  if (flags.low_albumin) {
    logit += CAL_DISCHARGE.coef.low_albumin;
    factors.push("low_albumin");
  }
  if (flags.stroke) {
    logit += CAL_DISCHARGE.coef.stroke;
    factors.push("stroke");
  }
  if (flags.trauma) {
    logit += CAL_DISCHARGE.coef.trauma;
    factors.push("trauma");
  }
  if (flags.devices_present) {
    logit += CAL_DISCHARGE.coef.devices_present;
    factors.push("devices_present");
  }
  
  return { probability: sigmoid(logit), factors };
}

function calculateReadmissionRisk(flags: AddonFlags): { probability: number; factors: string[] } {
  let logit = CAL_READMIT.intercept;
  const factors: string[] = [];
  
  // Mobility status
  const mobilityKeys = getMobilityKeys(flags.mobility);
  for (const [key, isActive] of Object.entries(mobilityKeys)) {
    if (isActive && CAL_READMIT.coef[key as keyof typeof CAL_READMIT.coef]) {
      logit += CAL_READMIT.coef[key as keyof typeof CAL_READMIT.coef];
      factors.push(key);
    }
  }
  
  // Apply factors with similar pattern
  if (flags.immobile_ge3) {
    logit += CAL_READMIT.coef.immobile_ge3;
    factors.push("immobile_ge3");
  }
  
  if (flags.icu) {
    logit += CAL_READMIT.coef.icu;
    factors.push("icu");
  } else if (flags.stepdown) {
    logit += CAL_READMIT.coef.stepdown;
    factors.push("stepdown");
  }
  
  if (flags.age_70_plus) {
    logit += CAL_READMIT.coef.age_70_plus;
    factors.push("age_70_plus");
  }
  if (flags.age_80_plus) {
    logit += CAL_READMIT.coef.age_80_plus;
    factors.push("age_80_plus");
  }
  
  if (flags.cog === "mild_impairment") {
    logit += CAL_READMIT.coef.cog_mild;
    factors.push("cog_mild");
  }
  if (flags.cog === "delirium_dementia") {
    logit += CAL_READMIT.coef.cog_delirium;
    factors.push("cog_delirium");
  }
  
  if (flags.malnutrition) {
    logit += CAL_READMIT.coef.malnutrition;
    factors.push("malnutrition");
  }
  if (flags.low_albumin) {
    logit += CAL_READMIT.coef.low_albumin;
    factors.push("low_albumin");
  }
  if (flags.diabetes) {
    logit += CAL_READMIT.coef.diabetes;
    factors.push("diabetes");
  }
  if (flags.active_cancer) {
    logit += CAL_READMIT.coef.active_cancer;
    factors.push("active_cancer");
  }
  if (flags.stroke) {
    logit += CAL_READMIT.coef.stroke;
    factors.push("stroke");
  }
  if (flags.devices_present) {
    logit += CAL_READMIT.coef.devices_present;
    factors.push("devices_present");
  }
  if (flags.sedating_meds) {
    logit += CAL_READMIT.coef.sedating_meds;
    factors.push("sedating_meds");
  }
  
  return { probability: sigmoid(logit), factors };
}

function getRiskLevel(probability: number, lowThreshold: number, highThreshold: number): string {
  if (probability < lowThreshold) return "low";
  if (probability < highThreshold) return "moderate";
  return "high";
}

function getConfidenceLevel(factors: string[]): string {
  // More factors = higher confidence in prediction
  if (factors.length >= 4) return "high";
  if (factors.length >= 2) return "moderate";
  return "low";
}

export function addStayPredictions(baseResults: any): any {
  const inputEcho = baseResults.input_echo;
  const flags = extractAddonFlags(inputEcho);
  
  // Calculate improved mobility scenario for benefits
  const improvedFlags = { ...flags };
  if (flags.mobility === "bedbound") improvedFlags.mobility = "chair_bound";
  else if (flags.mobility === "chair_bound") improvedFlags.mobility = "standing_assist";
  else if (flags.mobility === "standing_assist") improvedFlags.mobility = "walking_assist";
  improvedFlags.immobile_ge3 = false; // Achieving goals eliminates prolonged immobility
  
  // Calculate Length of Stay with proportional benefit scaling
  const losResult = calculateLOS(flags);
  const improvedLosResult = calculateLOS(improvedFlags);
  
  // Calculate proportional benefit: higher LOS = higher potential benefit
  // All patients benefit from structured mobility programs, scaled by mobility level
  let baseBenefitRate: number;
  if (flags.mobility === "bedbound") {
    baseBenefitRate = 0.06; // 6% reduction - highest benefit
  } else if (flags.mobility === "chair_bound") {
    baseBenefitRate = 0.05; // 5% reduction - high benefit  
  } else if (flags.mobility === "standing_assist") {
    baseBenefitRate = 0.04; // 4% reduction - moderate benefit
  } else if (flags.mobility === "walking_assist") {
    baseBenefitRate = 0.025; // 2.5% reduction - still immobile between sessions
  } else { // independent
    baseBenefitRate = 0.015; // 1.5% reduction - tiny but present benefit
  }
  
  const losBenefit = Math.max(0, losResult.days * baseBenefitRate);
  
  // Calculate Discharge Disposition - all patients get some benefit from structured programs
  const homeResult = calculateHomeProbability(flags);
  const improvedHomeResult = calculateHomeProbability(improvedFlags);
  let homeBenefit = Math.max(0, improvedHomeResult.probability - homeResult.probability);
  
  // Even patients who can't improve mobility level benefit from structured programs
  if (homeBenefit === 0 && (flags.mobility === "walking_assist" || flags.mobility === "independent")) {
    // Small benefit from structured mobility programs: better conditioning, confidence
    homeBenefit = Math.min(0.02, homeResult.probability * 0.03); // Max 2% point or 3% relative improvement
  }
  
  let dispositionPrediction: string;
  if (homeResult.probability >= 0.75) dispositionPrediction = "Likely to go home";
  else if (homeResult.probability >= 0.65) dispositionPrediction = "May go home"; 
  else dispositionPrediction = "Post-acute care likely";
  
  // Calculate Readmission Risk - all patients get some benefit
  const readmitResult = calculateReadmissionRisk(flags);
  const improvedReadmitResult = calculateReadmissionRisk(improvedFlags);
  let readmitBenefit = Math.max(0, readmitResult.probability - improvedReadmitResult.probability);
  
  // Even higher-mobility patients benefit from structured programs
  if (readmitBenefit === 0 && (flags.mobility === "walking_assist" || flags.mobility === "independent")) {
    // Small benefit from improved conditioning and fall prevention
    readmitBenefit = Math.min(0.015, readmitResult.probability * 0.05); // Max 1.5% point or 5% relative reduction
  }
  const readmitLevel = getRiskLevel(readmitResult.probability, 0.12, 0.20);
  
  // Asymptotic benefit curves - easy to get halfway, much harder to reach theoretical limits
  const calculateAsymptoticBenefit = (risk: number, maxRelative: number, theoreticalCap: number) => {
    const linearBenefit = risk * maxRelative; // Start with linear relationship
    // Apply asymptotic curve: benefit approaches but never quite reaches the cap
    // Formula: cap * (linearBenefit / (linearBenefit + cap/2))
    return theoreticalCap * (linearBenefit / (linearBenefit + theoreticalCap / 2));
  };

  const riskBenefits = {
    deconditioning: baseResults.deconditioning.probability * 0.25, // 25% relative reduction, no cap as requested
    vte: calculateAsymptoticBenefit(baseResults.vte.probability, 0.40, 0.03), // Approaches 3% cap asymptotically
    falls: calculateAsymptoticBenefit(baseResults.falls.probability, 0.30, 0.025), // Approaches 2.5% cap asymptotically  
    pressure: calculateAsymptoticBenefit(baseResults.pressure.probability, 0.35, 0.03), // Approaches 3% cap asymptotically
  };
  
  const stayPredictions: StayPredictions = {
    length_of_stay: {
      predicted_days: Math.round(losResult.days * 10) / 10,
      range_min: Math.max(1, Math.round((losResult.days * 0.8) * 10) / 10),
      range_max: Math.round((losResult.days * 1.3) * 10) / 10,
      confidence_level: getConfidenceLevel(losResult.factors),
      factors_increasing: losResult.factors,
      factors_decreasing: [],
      mobility_goal_benefit: Math.round(losBenefit * 10) / 10,
    },
    discharge_disposition: {
      home_probability: Math.round(homeResult.probability * 1000) / 1000,
      disposition_prediction: dispositionPrediction,
      confidence_level: getConfidenceLevel(homeResult.factors),
      key_factors: homeResult.factors,
    },
    readmission_risk: {
      thirty_day_probability: Math.round(readmitResult.probability * 1000) / 1000,
      risk_level: readmitLevel,
      modifiable_factors: readmitResult.factors.filter(f => 
        ["mob_bedbound", "mob_chair_bound", "sedating_meds", "devices_present", "immobile_ge3"].includes(f)
      ),
      mobility_benefit: Math.round(readmitBenefit * 1000) / 1000,
    },
  };
  
  // Use mobility recommendation that was already calculated by robust calculator
  const mobilityRecommendation = baseResults.mobility_recommendation;

  return {
    ...baseResults,
    stay_predictions: stayPredictions,
    mobility_recommendation: mobilityRecommendation,
    mobility_benefits: {
      risk_reductions: {
        deconditioning: {
          current_risk: Math.round(baseResults.deconditioning.probability * 1000) / 1000,
          reduced_risk: Math.round((baseResults.deconditioning.probability - riskBenefits.deconditioning) * 1000) / 1000,
          absolute_reduction: Math.round(riskBenefits.deconditioning * 1000) / 1000,
          absolute_reduction_percent: Math.round(riskBenefits.deconditioning * 100 * 10) / 10, // Show absolute as percentage (e.g., 1.5%)
        },
        vte: {
          current_risk: Math.round(baseResults.vte.probability * 1000) / 1000,
          reduced_risk: Math.round((baseResults.vte.probability - riskBenefits.vte) * 1000) / 1000,
          absolute_reduction: Math.round(riskBenefits.vte * 1000) / 1000,
          absolute_reduction_percent: Math.round(riskBenefits.vte * 100 * 10) / 10, // Show absolute as percentage (e.g., 1.2%)
        },
        falls: {
          current_risk: Math.round(baseResults.falls.probability * 1000) / 1000,
          reduced_risk: Math.round((baseResults.falls.probability - riskBenefits.falls) * 1000) / 1000,
          absolute_reduction: Math.round(riskBenefits.falls * 1000) / 1000,
          absolute_reduction_percent: Math.round(riskBenefits.falls * 100 * 10) / 10, // Show absolute as percentage (e.g., 0.8%)
        },
        pressure: {
          current_risk: Math.round(baseResults.pressure.probability * 1000) / 1000,
          reduced_risk: Math.round((baseResults.pressure.probability - riskBenefits.pressure) * 1000) / 1000,
          absolute_reduction: Math.round(riskBenefits.pressure * 1000) / 1000,
          absolute_reduction_percent: Math.round(riskBenefits.pressure * 100 * 10) / 10, // Show absolute as percentage (e.g., 1.3%)
        },
      },
      stay_improvements: {
        length_of_stay_reduction: Math.round(losBenefit * 10) / 10,
        home_discharge_improvement: Math.round(homeBenefit * 1000) / 1000,
        readmission_reduction: Math.round(readmitBenefit * 1000) / 1000,
        readmission_percent_reduction: Math.round((readmitBenefit / readmitResult.probability) * 100),
      }
    },
  };
}