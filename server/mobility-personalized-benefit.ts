/**
 * Personalized, literature-anchored mobility benefit add-on for:
 *  - Length of stay (days)
 *  - Discharge destination (home vs post-acute)
 *  - 30-day all-cause readmission
 * 
 * This module consumes the existing calculate_risks(...) payload and appends 
 * personalized, dose-aware "with_goal" projections using tunable literature-based effect sizes.
 */

export interface ObservedActivity {
  steps_per_day?: number;
  cycle_watts?: number;
  minutes_per_session?: number;
  sessions_per_day?: number;
}

export interface EffectSizes {
  los_reduction_pct: {
    icu: number;
    stepdown: number;
    ward: number;
    rehab: number;
  };
  los_abs_cap_days: number;
  los_abs_floor_days: number;
  home_odds_mult: {
    icu: number;
    stepdown: number;
    ward: number;
    rehab: number;
  };
  readmit_odds_mult_at_goal: number;
  dose_targets: {
    steps_per_day: number;
    cycle_watt_minutes_per_day: number;
  };
  severity_weight: number;
  adherence_weight: number;
}

// Effect sizes from literature (tunable)
const EFFECT_SIZES: EffectSizes = {
  // LOS % reduction when mobility program achieved (base values before personalization)
  los_reduction_pct: {
    icu: 0.13,       // ~10–15% ICU
    stepdown: 0.18,  // ~15–20%
    ward: 0.20,      // ~18–22%
    rehab: 0.10      // conservative
  },
  // Absolute cap for LOS reduction in days (strong programs ~2–2.5 days)
  los_abs_cap_days: 2.4,
  los_abs_floor_days: 0.8,

  // Home discharge improvement modeled as an odds multiplier on HOME
  home_odds_mult: {
    icu: 1.15,
    stepdown: 1.25,
    ward: 1.35,
    rehab: 1.20
  },
  // 30d readmission improvement as odds multiplier (<1 is good)
  readmit_odds_mult_at_goal: 0.90,

  // Mobility "dose" target (rough equivalence for benefit saturation)
  dose_targets: {
    steps_per_day: 275,        // threshold reported in studies
    cycle_watt_minutes_per_day: 300  // e.g., 20W * 15min * 1 session = 300
  },

  // How much severity modifies effect size (0=no personalization, 1=full)
  severity_weight: 0.6,
  // How much adherence/dose modifies effect size
  adherence_weight: 0.7,
};

// Lightweight feature derivation from input_echo
function flagsFromEcho(echo: any): any {
  const loc = (echo.level_of_care || "ward").toLowerCase();
  const mob = (echo.mobility_status || "bedbound").toLowerCase();
  const cog = (echo.cognitive_status || "normal").toLowerCase();
  const days_immobile = parseInt(echo.days_immobile || "0");
  const age = parseInt(echo.age || "0");
  const incontinent = Boolean(echo.incontinent);
  const albumin_low = Boolean(echo.albumin_low);
  const devices = new Set(echo.devices || []);
  const com = new Set(echo.comorbidities || []);

  // admit category (rough)
  const admit = (echo.admission_diagnosis || "").toLowerCase();
  const neuro = com.has("stroke") || ["stroke","intracranial","tbi"].some(k => admit.includes(k));
  const postop = ["post-op","postoperative"].some(k => admit.includes(k));
  const trauma = admit.includes("trauma");

  const medications = (echo.medications || []).join(" ").toLowerCase();
  const sedatingMeds = ["lorazepam","diazepam","alprazolam","midazolam","clonazepam",
                       "zolpidem","quetiapine","haloperidol","trazodone","morphine",
                       "hydromorphone","fentanyl","oxycodone","propofol","dexmedetomidine","gabapentin"];
  const sedating = sedatingMeds.some(med => medications.includes(med));

  return {
    loc,
    mob,
    cog,
    days_immobile,
    age70: age >= 70,
    age80: age >= 80,
    neuro,
    postop,
    trauma,
    devices: devices.size > 0,
    incontinent,
    albumin_low,
    malnutrition: com.has("malnutrition"),
    active_cancer: com.has("active_cancer"),
    sedating,
  };
}

// Personalization knobs
function severityIndex(f: any): number {
  // 0..1 scale based on immobility, ICU/stepdown, cognition, immobile days, neuro dx
  const mobOrder: Record<string, number> = {
    "bedbound": 1.0, 
    "chair_bound": 0.8, 
    "standing_assist": 0.6,
    "walking_assist": 0.3, 
    "independent": 0.0
  };
  
  let s = 0.0;
  s += mobOrder[f.mob] || 0.6;
  s += f.loc === "icu" ? 0.6 : (f.loc === "stepdown" ? 0.3 : 0.0);
  s += f.cog === "mild_impairment" ? 0.3 : (f.cog === "delirium_dementia" ? 0.6 : 0.0);
  s += f.days_immobile >= 3 ? 0.3 : 0.0;
  s += (f.neuro || f.trauma) ? 0.2 : 0.0;
  s += (f.malnutrition || f.albumin_low) ? 0.2 : 0.0;
  
  // Normalize to 0..1 (max approx ~2.9)
  return Math.min(1.0, s / 2.5);
}

function adherenceFactor(observed: ObservedActivity | null, echo: any): number {
  // Estimates 0..1 adherence to daily goal using observed steps/Watt-min; defaults based on patient factors
  if (observed) {
    // Convert to dose fraction relative to target; cap at 1.0
    const stepTarget = EFFECT_SIZES.dose_targets.steps_per_day;
    const wmTarget = EFFECT_SIZES.dose_targets.cycle_watt_minutes_per_day;

    const fracSteps = Math.min(1.0, Math.max(0.0, (observed.steps_per_day || 0) / stepTarget));
    let wm = 0.0;
    if (observed.cycle_watts && observed.minutes_per_session) {
      const sessions = Math.max(1, parseInt(String(observed.sessions_per_day || 1)));
      wm = observed.cycle_watts * observed.minutes_per_session * sessions;
    }
    const fracWm = wm > 0 ? Math.min(1.0, Math.max(0.0, wm / wmTarget)) : 0.0;
    return Math.max(fracSteps, fracWm);
  }

  // No observed data: estimate compliance from factors
  const f = flagsFromEcho(echo);
  let base = 0.75;  // optimistic default with coaching
  if (f.loc === "icu") base -= 0.15;
  if (["bedbound","chair_bound"].includes(f.mob)) base -= 0.10;
  if (f.cog === "delirium_dementia") base -= 0.20;
  if (f.sedating) base -= 0.05;
  if (f.devices) base -= 0.05;
  return Math.max(0.2, Math.min(0.95, base));
}

function cycleGoalToWm(recommendation: any): number {
  // Convert goal to Watt-min/day
  if (!recommendation) return 0.0;
  const w = parseFloat(recommendation.watt_goal || "0");
  const mins = parseInt(recommendation.duration_min_per_session || "0");
  const sess = parseInt(recommendation.sessions_per_day || "0");
  return Math.max(0.0, w * mins * sess);
}

// Core transforms
function applyPersonalizedLOS(baseDays: number, f: any, adherence: number): [number, number] {
  // Return [with_goal_days, absolute_reduction]
  const basePct = EFFECT_SIZES.los_reduction_pct[f.loc as keyof typeof EFFECT_SIZES.los_reduction_pct] || EFFECT_SIZES.los_reduction_pct.ward;
  const sev = severityIndex(f);
  // Personalize % reduction
  const personalizedPct = basePct * (1.0 + EFFECT_SIZES.severity_weight * sev) * (0.5 + EFFECT_SIZES.adherence_weight * adherence);
  // Convert to absolute reduction with caps
  const absReduction = Math.min(EFFECT_SIZES.los_abs_cap_days, Math.max(EFFECT_SIZES.los_abs_floor_days, baseDays * personalizedPct));
  const withGoal = Math.max(1.0, baseDays - absReduction);
  return [withGoal, absReduction];
}

function applyPersonalizedHomeProb(pHome: number, f: any, adherence: number): [number, number] {
  // Return [with_goal_home_prob, absolute_increase]. Uses odds multiplier
  const baseMult = EFFECT_SIZES.home_odds_mult[f.loc as keyof typeof EFFECT_SIZES.home_odds_mult] || EFFECT_SIZES.home_odds_mult.ward;
  const sev = severityIndex(f);
  let mult = Math.pow(baseMult, 0.7 + 0.6 * sev);  // steeper effect if more severe
  mult = Math.pow(mult, 0.5 + EFFECT_SIZES.adherence_weight * adherence);
  const odds = pHome / Math.max(1e-9, 1 - pHome);
  const newOdds = odds * mult;
  const pNew = newOdds / (1 + newOdds);
  // Clamp to realistic
  const pNewClamped = Math.min(0.995, Math.max(0.01, pNew));
  return [pNewClamped, pNewClamped - pHome];
}

function applyPersonalizedReadmit(pReadmit: number, f: any, adherence: number): [number, number] {
  // Return [with_goal_prob, absolute_reduction]. Applies dose-aware odds reduction
  const sev = severityIndex(f);
  const baseMult = EFFECT_SIZES.readmit_odds_mult_at_goal;  // ~0.90
  // More severe patients can realize larger relative benefit (adherence-weighted)
  const mult = 1.0 - (1.0 - baseMult) * (0.6 + 0.6 * sev) * (0.5 + EFFECT_SIZES.adherence_weight * adherence);
  const multClamped = Math.max(0.75, Math.min(0.98, mult));  // keep within plausible band
  const odds = pReadmit / Math.max(1e-9, 1 - pReadmit);
  const newOdds = odds * multClamped;
  const pNew = newOdds / (1 + newOdds);
  return [pNew, pReadmit - pNew];
}

// Public API
export function addPersonalizedBenefit(
  previousResults: any,
  observedActivity: ObservedActivity | null = null,
  overrides: Partial<EffectSizes> | null = null
): any {
  const cfg = { ...EFFECT_SIZES, ...overrides };
  const out = { ...previousResults };
  const echo = out.input_echo || {};
  const f = flagsFromEcho(echo);

  // Determine adherence using observed activity if provided; otherwise estimate
  const adherence = adherenceFactor(observedActivity, echo);

  // --- Baselines ---
  // LOS baseline: if previous add-on exists use it; else approximate from care & mobility
  let baseLOS: number;
  if (out.los && out.los.predicted_days) {
    baseLOS = parseFloat(out.los.predicted_days);
  } else {
    // Simple baseline: ICU 7.5, stepdown 6.5, ward 5.5, rehab 9; adjust for mobility & age
    const baseMap: Record<string, number> = {"icu": 7.5, "stepdown": 6.5, "ward": 5.5, "rehab": 9.0};
    baseLOS = baseMap[f.loc] || 5.5;
    const mobAdj: Record<string, number> = {"bedbound": 1.5, "chair_bound": 1.0, "standing_assist": 0.5, "walking_assist": 0.2, "independent": 0.0};
    baseLOS += mobAdj[f.mob] || 0.5;
    if (f.age70) baseLOS += 0.4;
    if (f.age80) baseLOS += 0.4;
  }

  // Discharge baseline: use prior add-on if present; else set from care & mobility
  let baseHome: number;
  if (out.discharge && out.discharge.home_probability) {
    baseHome = parseFloat(out.discharge.home_probability);
  } else {
    baseHome = f.loc === "ward" ? 0.78 : (f.loc === "stepdown" ? 0.60 : f.loc === "icu" ? 0.45 : 0.55);
    if (f.mob === "bedbound") baseHome -= 0.20;
    else if (f.mob === "chair_bound") baseHome -= 0.12;
    else if (f.mob === "standing_assist") baseHome -= 0.06;
    else if (f.mob === "walking_assist") baseHome -= 0.02;
    if (f.cog === "delirium_dementia") baseHome -= 0.15;
    else if (f.cog === "mild_impairment") baseHome -= 0.05;
    baseHome = Math.min(0.95, Math.max(0.05, baseHome));
  }

  // Readmission baseline: use prior add-on if present; else default by care & severity
  let baseReadmit: number;
  if (out.readmission_30d && out.readmission_30d.probability) {
    baseReadmit = parseFloat(out.readmission_30d.probability);
  } else {
    baseReadmit = f.loc === "ward" ? 0.15 : (f.loc === "stepdown" ? 0.18 : f.loc === "icu" ? 0.22 : 0.16);
    if (["bedbound","chair_bound"].includes(f.mob)) baseReadmit += 0.04;
    if (f.cog === "delirium_dementia") baseReadmit += 0.05;
    else if (f.cog === "mild_impairment") baseReadmit += 0.02;
    if (f.days_immobile >= 3) baseReadmit += 0.02;
    baseReadmit = Math.min(0.5, Math.max(0.03, baseReadmit));
  }

  // --- Personalized "with_goal" projections ---
  const [withGoalLOS, losReduction] = applyPersonalizedLOS(baseLOS, f, adherence);
  const [withGoalHome, homeIncrease] = applyPersonalizedHomeProb(baseHome, f, adherence);
  const [withGoalReadmit, readmitReduction] = applyPersonalizedReadmit(baseReadmit, f, adherence);

  // Build results
  out.los = {
    predicted_days: baseLOS,
    with_goal_days: withGoalLOS,
    absolute_reduction_days: losReduction,
    relative_reduction_pct: (losReduction / baseLOS) * 100,
    explain: {
      severity_index: severityIndex(f),
      adherence_factor: adherence,
      personalized_effect: `${((losReduction / baseLOS) * 100).toFixed(1)}% reduction (${losReduction.toFixed(1)} days)`
    }
  };

  out.discharge = {
    home_probability: baseHome,
    with_goal_home_probability: withGoalHome,
    absolute_increase: homeIncrease,
    relative_improvement_pct: (homeIncrease / baseHome) * 100,
    explain: {
      severity_index: severityIndex(f),
      adherence_factor: adherence,
      personalized_effect: `${(homeIncrease * 100).toFixed(1)}% point increase in home discharge`
    }
  };

  out.readmission_30d = {
    probability: baseReadmit,
    with_goal_probability: withGoalReadmit,
    absolute_reduction: readmitReduction,
    relative_reduction_pct: (readmitReduction / baseReadmit) * 100,
    explain: {
      severity_index: severityIndex(f),
      adherence_factor: adherence,
      personalized_effect: `${((readmitReduction / baseReadmit) * 100).toFixed(1)}% relative reduction`
    }
  };

  return out;
}