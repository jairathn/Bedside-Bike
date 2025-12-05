# Energy-Based Parameter Generation Examples

## Complete Calculation Walkthrough Using Evidence-Based Risk Calculator

### Example 1: 72-year-old Female, Chair-bound, Post-stroke

**Patient Profile:**
- Age: 72
- Sex: Female  
- Weight: 68 kg
- Height: 165 cm
- BMI: 25.0 (normal)
- Mobility: Chair-bound
- Level of Care: Ward

**STEP 1: AI Risk Calculator Foundation (ACSM-based)**

**W/kg Band Selection (targeting 2.8-3.4 METs):**
- Chair-bound base: [0.22, 0.30] W/kg
- Middle of range: 0.26 W/kg

**Clinical Adjustments:**
- Age 72: 0.26 × 0.93 = 0.242 W/kg (7% reduction for age)
- Female: 0.242 × 1.0 = 0.242 W/kg (neutral baseline)
- BMI 25.0: No adjustment (normal range)
- Ward level: No adjustment

**Absolute Watts Calculation:**
- W/kg × Weight: 0.242 × 68kg = 16.5W
- Device calibration: 16.5W × 1.4 = 23.1W
- Clamp to device limits: max(25, min(70, 23.1)) = **25W**

**Duration & Sessions (Evidence-based):**
- Chair-bound patient: 10 minutes per session
- Standard frequency: 2 sessions per day

**AI BASELINE: 25W × 10min × 2 sessions = 500 watt-minutes/day**

---

**STEP 2: Provider Adjusts Energy Target to 800 watt-min/day**

**Energy Ratio:** 800 ÷ 500 = 1.6 (60% increase)

**Scaling Strategy (Frail Patient):**
- Energy ratio >1.5 + chair-bound = add sessions preferentially
- Target sessions: 2 × √1.6 = 2.53 → round to 3 sessions
- Adjust watts: 800 ÷ (10min × 3 sessions) = 26.7W → **27W**

**FINAL GENERATED PARAMETERS:**
- **Watts:** 27W (vs AI's 25W)
- **Duration:** 10 minutes (unchanged - evidence-based for frail patients)
- **Sessions:** 3 per day (vs AI's 2)
- **Total Energy:** 27W × 10min × 3 = **810 watt-minutes/day** ✓

---

### Example 2: 65-year-old Male, Independent, Orthopedic Surgery

**Patient Profile:**
- Age: 65
- Sex: Male
- Weight: 85 kg  
- Height: 178 cm
- BMI: 26.8 (overweight)
- Mobility: Independent
- Level of Care: Ward

**STEP 1: AI Risk Calculator Foundation**

**W/kg Band Selection:**
- Independent base: [0.32, 0.45] W/kg
- Middle of range: 0.385 W/kg

**Clinical Adjustments:**
- Age 65: 0.385 × 1.05 = 0.404 W/kg (5% increase for younger)
- Male: 0.404 × 1.03 = 0.416 W/kg (3% male advantage)
- BMI 26.8: No adjustment (not obese)
- Ward level: No adjustment

**Absolute Watts Calculation:**
- W/kg × Weight: 0.416 × 85kg = 35.4W
- Device calibration: 35.4W × 1.4 = 49.6W
- Clamp to device limits: max(25, min(70, 49.6)) = **50W**

**Duration & Sessions:**
- Independent patient: 15 minutes per session
- Standard frequency: 2 sessions per day

**AI BASELINE: 50W × 15min × 2 sessions = 1500 watt-minutes/day**

---

**STEP 2: Provider Adjusts Energy Target to 2100 watt-min/day**

**Energy Ratio:** 2100 ÷ 1500 = 1.4 (40% increase)

**Scaling Strategy (Strong Patient):**
- Energy ratio ≤1.5 + independent = scale watts primarily
- Target watts: 50W × 1.4 = 70W (hits device ceiling)
- Adjust duration: 2100 ÷ (70W × 2 sessions) = 15min (unchanged)

**FINAL GENERATED PARAMETERS:**
- **Watts:** 70W (vs AI's 50W) - maxed out for strength
- **Duration:** 15 minutes (unchanged - optimal therapeutic range)
- **Sessions:** 2 per day (unchanged - standard for independent)
- **Total Energy:** 70W × 15min × 2 = **2100 watt-minutes/day** ✓

---

### Example 3: 88-year-old Female, Bedbound, ICU

**Patient Profile:**
- Age: 88
- Sex: Female
- Weight: 55 kg
- Height: 160 cm
- BMI: 21.5 (normal)
- Mobility: Bedbound
- Level of Care: ICU

**STEP 1: AI Risk Calculator Foundation**

**W/kg Band Selection:**
- Bedbound base: [0.20, 0.28] W/kg
- Middle of range: 0.24 W/kg

**Clinical Adjustments:**
- ICU: 0.24 × 0.85 = 0.204 W/kg (15% reduction for ICU)
- Age 88: 0.204 × 0.88 = 0.179 W/kg (12% reduction for very elderly)
- Female: 0.179 × 1.0 = 0.179 W/kg
- BMI 21.5: No adjustment

**Global bounds:** max(0.18, 0.179) = 0.179 W/kg

**Absolute Watts Calculation:**
- W/kg × Weight: 0.179 × 55kg = 9.8W
- Device calibration: 9.8W × 1.4 = 13.7W
- Clamp to device limits: max(25, min(70, 13.7)) = **25W** (minimum)

**Duration & Sessions (ICU Protocol):**
- Bedbound ICU: 8 minutes per session (very short for frail)
- ICU frequency: 3 sessions per day (more frequent, gentler)

**AI BASELINE: 25W × 8min × 3 sessions = 600 watt-minutes/day**

---

**STEP 2: Provider Reduces Energy Target to 400 watt-min/day**

**Energy Ratio:** 400 ÷ 600 = 0.67 (33% decrease)

**Scaling Strategy (Decrease):**
- Reduce watts first: 25W × 0.67 = 16.8W
- BUT watts can't go below 25W (device minimum)
- Alternative: Reduce sessions instead
- Target sessions: 400 ÷ (25W × 8min) = 2 sessions

**FINAL GENERATED PARAMETERS:**
- **Watts:** 25W (device minimum maintained)
- **Duration:** 8 minutes (evidence-based for bedbound ICU)
- **Sessions:** 2 per day (reduced from AI's 3)
- **Total Energy:** 25W × 8min × 2 = **400 watt-minutes/day** ✓

---

## Key Insights

**Anthropometric Factors Preserved:**
- Weight directly affects watts (W/kg × actual weight)
- BMI influences safety ceilings (obesity limits, underweight caution)
- Sex affects baseline capacity (males +3% power output)
- Age creates graduated reductions (80+ = -12%, 70+ = -7%)

**Clinical Evidence Maintained:**
- Session patterns based on mobility/care level
- Duration ranges from clinical research
- Frequency adjusted for patient frailty
- All within device's electromagnetic constraints (25-70W)

**Smart Balancing Logic:**
- Frail patients: Prefer more sessions over higher intensity
- Strong patients: Can handle intensity increases
- Always respects clinical bounds from research
- Maintains exact energy targets through intelligent parameter adjustment