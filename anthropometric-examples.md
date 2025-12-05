# Anthropometric-Aware Cycling Prescription Examples

This demonstrates how weight and height data personalizes mobility prescriptions using the ACSM cycle ergometer equation and BMI-based safety adjustments.

## Base Patient Profile
- Age: 72 years old
- Sex: Female  
- Level of care: Ward
- Mobility status: Standing with assist
- All other risk factors identical

## Example Comparisons

### Patient A: Average Build
- **Weight**: 65 kg
- **Height**: 160 cm
- **BMI**: 25.4 (normal)
- **W/kg Target**: ~0.29 (middle of standing_assist range: 0.25-0.34)
- **Calculated Watts**: 0.29 × 65 = **18.9W**
- **Duration**: 12 minutes, 2x daily
- **Notes**: Target light–moderate effort (RPE 2-3/10)

### Patient B: Larger Build
- **Weight**: 95 kg  
- **Height**: 165 cm
- **BMI**: 35.0 (obese class II)
- **W/kg Target**: 0.30 (BMI ≥35 safety ceiling applied)
- **Calculated Watts**: 0.30 × 95 = **28.5W**
- **Duration**: 12 minutes, 2x daily  
- **Notes**: BMI-adjusted ceiling prevents overexertion

### Patient C: Smaller Build
- **Weight**: 48 kg
- **Height**: 155 cm  
- **BMI**: 20.0 (normal)
- **W/kg Target**: ~0.29 (normal BMI, no adjustments)
- **Calculated Watts**: 0.29 × 48 = **13.9W**
- **Duration**: 12 minutes, 2x daily
- **Notes**: Lower absolute watts but same relative intensity

### Patient D: Very Obese
- **Weight**: 115 kg
- **Height**: 170 cm
- **BMI**: 39.8 (obese class III, approaching 40)
- **W/kg Target**: 0.28 (BMI ≥35 safety ceiling, approaching stricter 40+ limit)  
- **Calculated Watts**: 0.28 × 115 = **32.2W**
- **Duration**: 12 minutes, 2x daily
- **Notes**: Conservative approach for morbid obesity

### Patient E: Underweight
- **Weight**: 42 kg
- **Height**: 165 cm
- **BMI**: 15.4 (underweight)
- **W/kg Target**: 0.26 (BMI <18.5 safety ceiling applied)
- **Calculated Watts**: 0.26 × 42 = **10.9W**  
- **Duration**: 12 minutes, 2x daily
- **Notes**: Modest intensity to avoid overexertion in malnutrition

## Key Differences

1. **Absolute Watts Range**: 10.9W - 32.2W (3x variation!)
2. **Same Relative Intensity**: All target ~2.5-3.0 METs physiologically  
3. **BMI Safety Bounds**: Obesity and underweight get protective limits
4. **Personalized Medicine**: Each prescription matches individual physiology

## Without Weight/Height Data

**Fallback Prescription** (all patients):
- **Watts**: 22W (mobility-based heuristic)
- **Duration**: 12 minutes, 2x daily
- **Issue**: One-size-fits-all doesn't account for body mass differences

## Clinical Impact

The anthropometric system ensures:
- **Heavier patients** get appropriately higher absolute watts
- **Lighter patients** aren't under-challenged  
- **Obese patients** have safety caps to prevent cardiovascular stress
- **Underweight patients** get gentler prescriptions
- **All patients** work at the same safe relative intensity (2-3 METs)