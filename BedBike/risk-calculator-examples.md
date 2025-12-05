# Risk Calculator Examples: Complete User Workflow

## Example 1: ICU Sepsis Patient - High Risk

### Patient Input (Provider Entry)
```json
{
  "age": 78,
  "sex": "female",
  "weight_kg": 62,
  "height_cm": 160,
  "level_of_care": "icu",
  "mobility_status": "bedbound",
  "cognitive_status": "mild_impairment",
  "baseline_function": "walker",
  "admission_diagnosis": "sepsis, pneumonia",
  "medications": ["propofol", "fentanyl", "norepinephrine"],
  "comorbidities": ["diabetes", "heart_failure", "malnutrition"],
  "devices": ["foley_catheter", "central_line", "ventilator"],
  "on_vte_prophylaxis": true,
  "incontinent": true,
  "albumin_low": true,
  "days_immobile": 7,
  "on_sedating_medications": true,
  "additional_medical_history": "Recent stroke, multiple hospitalizations"
}
```

### Calculator Output (What Provider Sees)
```json
{
  "risk_probabilities": {
    "deconditioning": {
      "probability": 0.94,
      "odds_ratio_vs_mobile": 12.8,
      "risk_level": "high",
      "factors": ["bedbound", "age_70+", "icu", "malnutrition", "immobile_7d+"]
    },
    "vte": {
      "probability": 0.31,
      "risk_level": "high", 
      "factors": ["bedbound", "icu", "immobile_7d+", "central_line"]
    },
    "falls": {
      "probability": 0.18,
      "risk_level": "high",
      "factors": ["bedbound", "sedating_meds", "devices", "age_70+"]
    },
    "pressure_injury": {
      "probability": 0.82,
      "risk_level": "high",
      "factors": ["bedbound", "malnutrition", "moisture", "devices", "icu"]
    }
  },
  
  "therapy_prescription": {
    "watt_goal": 25,
    "duration_min_per_session": 6,
    "sessions_per_day": 3,
    "total_daily_energy": 450, // watts × duration × sessions
    "notes": "Very light effort (25W ≈ resistance level 3). Monitor hemodynamics closely."
  },
  
  "stay_predictions": {
    "length_of_stay": {
      "predicted_days": 14.2,
      "range_min": 11.4,
      "range_max": 18.5,
      "mobility_goal_benefit": 0.85, // 14.2 × 0.06 = 0.85 days
      "confidence": "high"
    },
    "discharge_disposition": {
      "home_probability": 0.045,
      "disposition": "post_acute_likely",
      "mobility_benefit": 0.12 // Improved conditioning helps discharge home
    },
    "readmission_30d": {
      "probability": 0.61,
      "risk_level": "high",
      "mobility_benefit": 0.18 // Reduced deconditioning lowers readmission
    }
  }
}
```

### Provider Modification Scenario
**Provider Decision**: "This patient is too frail - I want to reduce the energy target by 30%"

**Modified Input**:
- Custom energy target: 315 watt-minutes/day (450 × 0.7)

**System Auto-Generation** (Evidence-Based Scaling):
- **New prescription**: 21W × 5min × 3 sessions = 315 watt-min/day
- **Scaling logic**: Reduced watts (frail patient preference), kept short sessions for ICU

---

## Example 2: Ward Orthopedic Patient - Moderate Risk

### Patient Input
```json
{
  "age": 67,
  "sex": "male",
  "weight_kg": 82,
  "height_cm": 175,
  "level_of_care": "ward",
  "mobility_status": "chair_bound",
  "cognitive_status": "normal",
  "baseline_function": "independent",
  "admission_diagnosis": "hip fracture repair",
  "medications": ["oxycodone", "acetaminophen"],
  "comorbidities": ["hypertension", "obesity"],
  "devices": ["foley_catheter"],
  "on_vte_prophylaxis": true,
  "incontinent": false,
  "albumin_low": false,
  "days_immobile": 2,
  "is_postoperative": true,
  "is_orthopedic": true
}
```

### Calculator Output
```json
{
  "risk_probabilities": {
    "deconditioning": {
      "probability": 0.42,
      "risk_level": "moderate",
      "factors": ["chair_bound", "age_65+", "postop", "immobile_2d"]
    },
    "vte": {
      "probability": 0.08,
      "risk_level": "moderate",
      "factors": ["chair_bound", "postop", "orthopedic", "obesity"]
    },
    "falls": {
      "probability": 0.06,
      "risk_level": "moderate", 
      "factors": ["chair_bound", "postop", "age_65+"]
    },
    "pressure_injury": {
      "probability": 0.15,
      "risk_level": "moderate",
      "factors": ["chair_bound", "obesity", "postop"]
    }
  },
  
  "therapy_prescription": {
    "watt_goal": 34,
    "duration_min_per_session": 12,
    "sessions_per_day": 2,
    "total_daily_energy": 816, // Evidence-based for 82kg male, chair-bound
    "notes": "Moderate effort (34W ≈ resistance level 4). Monitor surgical site."
  },
  
  "stay_predictions": {
    "length_of_stay": {
      "predicted_days": 6.8,
      "mobility_goal_benefit": 0.34, // 6.8 × 0.05 = 0.34 days (chair-bound rate)
      "confidence": "moderate"
    },
    "discharge_disposition": {
      "home_probability": 0.72,
      "disposition": "home_possible",
      "mobility_benefit": 0.08
    },
    "readmission_30d": {
      "probability": 0.16,
      "mobility_benefit": 0.04
    }
  }
}
```

### Provider Modification Scenario
**Provider Decision**: "Patient is progressing well - let's increase intensity for faster recovery"

**Modified Input**:
- Custom energy target: 1200 watt-minutes/day (816 × 1.47 increase)

**System Auto-Generation**:
- **New prescription**: 50W × 12min × 2 sessions = 1200 watt-min/day
- **Scaling logic**: Increased watts (stronger patient can handle intensity), kept standard duration

---

## Example 3: Stepdown Cardiac Patient - Variable Risk

### Patient Input
```json
{
  "age": 71,
  "sex": "female",
  "weight_kg": 68,
  "height_cm": 165,
  "level_of_care": "stepdown",
  "mobility_status": "standing_assist",
  "cognitive_status": "normal",
  "baseline_function": "independent",
  "admission_diagnosis": "heart failure exacerbation",
  "medications": ["metoprolol", "furosemide", "lisinopril"],
  "comorbidities": ["diabetes", "heart_failure"],
  "devices": ["central_line"],
  "on_vte_prophylaxis": true,
  "incontinent": false,
  "albumin_low": false,
  "days_immobile": 3,
  "is_cardiac_admission": true
}
```

### Calculator Output
```json
{
  "risk_probabilities": {
    "deconditioning": {
      "probability": 0.48,
      "risk_level": "moderate",
      "factors": ["standing_assist", "age_70+", "stepdown", "immobile_3d"]
    },
    "vte": {
      "probability": 0.06,
      "risk_level": "moderate",
      "factors": ["standing_assist", "stepdown", "central_line"]
    },
    "falls": {
      "probability": 0.04,
      "risk_level": "moderate",
      "factors": ["standing_assist", "age_70+", "devices"]
    },
    "pressure_injury": {
      "probability": 0.08,
      "risk_level": "low",
      "factors": ["standing_assist", "age_70+", "diabetes"]
    }
  },
  
  "therapy_prescription": {
    "watt_goal": 28,
    "duration_min_per_session": 10,
    "sessions_per_day": 2,
    "total_daily_energy": 560, // Cardiac-safe parameters
    "notes": "Light-moderate effort (28W ≈ resistance level 3). Monitor HR/BP response."
  },
  
  "stay_predictions": {
    "length_of_stay": {
      "predicted_days": 7.2,
      "mobility_goal_benefit": 0.29, // 7.2 × 0.04 = 0.29 days (standing assist rate)
      "confidence": "moderate"
    },
    "discharge_disposition": {
      "home_probability": 0.68,
      "disposition": "home_possible",
      "mobility_benefit": 0.06
    },
    "readmission_30d": {
      "probability": 0.22,
      "risk_level": "moderate",
      "mobility_benefit": 0.05
    }
  }
}
```

### Provider Modification Scenario
**Provider Decision**: "Cardiac patient needs very gentle progression - reduce by 40%"

**Modified Input**:
- Custom energy target: 336 watt-minutes/day (560 × 0.6)

**System Auto-Generation**:
- **New prescription**: 28W × 6min × 2 sessions = 336 watt-min/day
- **Scaling logic**: Kept safe watts, reduced duration for cardiac precautions

---

## Example 4: Ward Recovery Patient - Low Risk

### Patient Input
```json
{
  "age": 52,
  "sex": "male",
  "weight_kg": 78,
  "height_cm": 180,
  "level_of_care": "ward",
  "mobility_status": "walking_assist",
  "cognitive_status": "normal",
  "baseline_function": "independent",
  "admission_diagnosis": "appendectomy",
  "medications": ["ibuprofen"],
  "comorbidities": [],
  "devices": [],
  "on_vte_prophylaxis": true,
  "incontinent": false,
  "albumin_low": false,
  "days_immobile": 1,
  "is_postoperative": true
}
```

### Calculator Output
```json
{
  "risk_probabilities": {
    "deconditioning": {
      "probability": 0.18,
      "risk_level": "low",
      "factors": ["walking_assist", "postop"]
    },
    "vte": {
      "probability": 0.04,
      "risk_level": "moderate",
      "factors": ["walking_assist", "postop"]
    },
    "falls": {
      "probability": 0.03,
      "risk_level": "moderate",
      "factors": ["walking_assist"]
    },
    "pressure_injury": {
      "probability": 0.03,
      "risk_level": "moderate",
      "factors": ["walking_assist"]
    }
  },
  
  "therapy_prescription": {
    "watt_goal": 42,
    "duration_min_per_session": 15,
    "sessions_per_day": 2,
    "total_daily_energy": 1260, // Higher capacity - young, healthy
    "notes": "Moderate effort (42W ≈ resistance level 5). Post-surgical precautions."
  },
  
  "stay_predictions": {
    "length_of_stay": {
      "predicted_days": 3.2,
      "mobility_goal_benefit": 0.08, // 3.2 × 0.025 = 0.08 days (walking assist rate)
      "confidence": "low"
    },
    "discharge_disposition": {
      "home_probability": 0.89,
      "disposition": "home_likely",
      "mobility_benefit": 0.02
    },
    "readmission_30d": {
      "probability": 0.08,
      "risk_level": "low",
      "mobility_benefit": 0.008
    }
  }
}
```

### Provider Modification Scenario
**Provider Decision**: "Young patient recovering well - let's accelerate rehabilitation"

**Modified Input**:
- Custom energy target: 1800 watt-minutes/day (1260 × 1.43 increase)

**System Auto-Generation**:
- **New prescription**: 60W × 15min × 2 sessions = 1800 watt-min/day
- **Scaling logic**: Increased to maximum watts (young, strong patient), maintained standard duration

---

## Key Clinical Insights from Examples

### Risk Stratification Patterns
- **ICU bedbound**: 85-95% deconditioning risk, 80%+ pressure injury risk
- **Ward chair-bound**: 40-50% deconditioning risk, moderate VTE risk  
- **Stepdown standing**: 45-50% deconditioning risk, lower overall risks
- **Ward walking**: 15-20% deconditioning risk, minimal stay impact

### Therapy Prescription Logic
- **Anthropometric scaling**: Weight, BMI, age, sex all factor into watt calculations
- **Clinical safety bounds**: ICU (5-20min), Ward (8-45min), Watts (25-70W)
- **Mobility-specific rates**: Bedbound (6%), Chair (5%), Standing (4%), Walking (2.5%), Independent (1.5%)

### Provider Flexibility
- **Energy target control**: Providers set total watt-minutes/day
- **Smart parameter balancing**: System auto-generates optimal watts/duration/sessions
- **Clinical warnings**: >30% above AI recommendation triggers alerts
- **Evidence preservation**: All scaling maintains clinical ratios and safety bounds