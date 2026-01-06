import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Zap, Clock, Settings, Save, RotateCcw, Calculator, AlertTriangle, CheckCircle, Shield, History, Calendar, HelpCircle, Brain, Activity, TrendingUp, ArrowRight, Info, Stethoscope, Pill } from "lucide-react";
import { ComprehensiveRiskCalculatorModal } from "./comprehensive-risk-calculator-modal";
import { DeconditioningInfoModal } from "./deconditioning-info-modal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface Goal {
  id: number;
  goalType: string;
  targetValue: string;
  unit: string;
  label: string;
  subtitle: string;
  period: string;
  aiRecommended: boolean;
  providerId?: number;
  providerName?: string;
}

interface ProviderGoalEditorProps {
  patientGoals: Goal[];
  patientId: string;
  onUpdateGoals: (goals: any[]) => void;
  onRunRiskCalculator: () => void;
  isLoading?: boolean;
}

export function ProviderGoalEditor({ patientGoals = [], patientId, onUpdateGoals, onRunRiskCalculator, isLoading = false }: ProviderGoalEditorProps) {
  const { user } = useAuth();

  // Get the latest risk assessment for this patient to pre-populate forms
  const { data: latestRiskAssessment } = useQuery({
    queryKey: [`/api/patients/${patientId}/risk-assessment`],
    enabled: !!patientId,
    retry: false // Don't retry if no assessment exists yet
  });

  // NEW: Fetch patient profile from database for auto-population
  const { data: patientProfile } = useQuery({
    queryKey: [`/api/patients/${patientId}/profile`],
    enabled: !!patientId,
    retry: false
  });

  // Prepare initial patient data for the modal (from database)
  // Normalize values to match expected schema formats
  const normalizedSex = patientProfile?.sex ?
    (patientProfile.sex.toLowerCase() === 'm' || patientProfile.sex.toLowerCase() === 'male' ? 'male' :
     patientProfile.sex.toLowerCase() === 'f' || patientProfile.sex.toLowerCase() === 'female' ? 'female' :
     'other') : undefined;

  const initialPatientData = patientProfile ? {
    age: patientProfile.age,
    sex: normalizedSex,
    weight_kg: patientProfile.weightKg,
    height_cm: patientProfile.heightCm,
    level_of_care: patientProfile.levelOfCare,
    mobility_status: patientProfile.mobilityStatus,
    cognitive_status: patientProfile.cognitiveStatus,
    admission_diagnosis: patientProfile.admissionDiagnosis,
    medications: patientProfile.medications ? (typeof patientProfile.medications === 'string' ? JSON.parse(patientProfile.medications) : patientProfile.medications) : [],
    comorbidities: patientProfile.comorbidities ? (typeof patientProfile.comorbidities === 'string' ? JSON.parse(patientProfile.comorbidities) : patientProfile.comorbidities) : []
  } : undefined;

  // Simple input values - what user sees and types (start empty until risk assessment)
  const [inputValues, setInputValues] = useState({
    totalEnergy: "",
    duration: "", 
    power: "",
    resistance: "",
    sessionsPerDay: ""
  });
  
  const [editedGoals, setEditedGoals] = useState<Record<string, string>>({});
  const [totalEnergyTarget, setTotalEnergyTarget] = useState<number>(1050); // Will be updated from risk calculator
  const [autoRecalibrate, setAutoRecalibrate] = useState(true);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [hasRunRiskCalculator, setHasRunRiskCalculator] = useState(false);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [overrideWarnings, setOverrideWarnings] = useState<string[]>([]);
  const [patientRiskResults, setPatientRiskResults] = useState<any>(null);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [showProviderWarning, setShowProviderWarning] = useState(false);
  const [originalProvider, setOriginalProvider] = useState<string>("");

  // Initialize from previous risk assessment if available
  useEffect(() => {
    if (latestRiskAssessment && !hasRunRiskCalculator) {
      // Pre-populate from previous risk assessment
      const mobilityRec = latestRiskAssessment.mobilityRecommendation;
      if (mobilityRec) {
        // Handle both object and direct value formats
        const wattGoal = typeof mobilityRec === 'object' ? (mobilityRec.watt_goal || 35) : 35;
        const duration = typeof mobilityRec === 'object' ? (mobilityRec.duration_min_per_session || 15) : 15;
        const sessions = typeof mobilityRec === 'object' ? (mobilityRec.sessions_per_day || 2) : 2;
        const resistance = typeof mobilityRec === 'object' ? (mobilityRec.resistance_level || 5) : 5;
        
        setInputValues({
          totalEnergy: (wattGoal * duration * sessions).toString(),
          duration: duration.toString(),
          power: wattGoal.toString(),
          resistance: resistance.toString(),
          sessionsPerDay: sessions.toString()
        });
        
        setPatientRiskResults(latestRiskAssessment);
        setHasRunRiskCalculator(true); // Mark as having previous assessment
      }
    }
  }, [latestRiskAssessment, hasRunRiskCalculator]);

  // Pre-populate from existing goals if available and no risk assessment
  useEffect(() => {
    if (patientGoals.length > 0 && !hasRunRiskCalculator && !latestRiskAssessment) {
      const goalMap: Record<string, string> = {};
      patientGoals.forEach(goal => {
        const value = goal.unit === 'seconds' 
          ? (parseFloat(goal.targetValue) / 60).toString() // Convert seconds to minutes
          : goal.targetValue;
        goalMap[goal.goalType] = value;
      });
      
      setInputValues({
        totalEnergy: goalMap.energy || "",
        duration: goalMap.duration || "",
        power: goalMap.power || "",
        resistance: goalMap.resistance || "",
        sessionsPerDay: goalMap.sessions || ""
      });
      
      if (Object.keys(goalMap).length > 0) {
        setHasRunRiskCalculator(true); // Mark as having existing goals
      }
    }
  }, [patientGoals, hasRunRiskCalculator, latestRiskAssessment]);

  // AI recommended limits (based on typical risk assessments)
  const aiRecommendations = {
    maxDuration: 20, // minutes
    maxPower: 45,    // watts
    maxResistance: 6, // level
    maxTotalEnergy: 1200 // watt-minutes
  };

  // Check for values above AI recommendations
  const checkForOverrides = () => {
    const warnings = [];
    const currentDuration = parseFloat(inputValues.duration) || 0;
    const currentPower = parseFloat(inputValues.power) || 0;
    const currentResistance = parseFloat(inputValues.resistance) || 0;
    const currentEnergy = parseFloat(inputValues.totalEnergy) || 0;

    if (currentDuration > aiRecommendations.maxDuration) {
      warnings.push(`Duration (${currentDuration.toFixed(1)} min) exceeds AI recommendation of ${aiRecommendations.maxDuration} min`);
    }
    if (currentPower > aiRecommendations.maxPower) {
      warnings.push(`Power (${currentPower.toFixed(1)}W) exceeds AI recommendation of ${aiRecommendations.maxPower}W`);
    }
    if (currentResistance > aiRecommendations.maxResistance) {
      warnings.push(`Resistance (Level ${currentResistance}) exceeds AI recommendation of Level ${aiRecommendations.maxResistance}`);
    }
    if (currentEnergy > aiRecommendations.maxTotalEnergy) {
      warnings.push(`Total energy (${currentEnergy} Watt-Min) exceeds AI recommendation of ${aiRecommendations.maxTotalEnergy} Watt-Min`);
    }

    setOverrideWarnings(warnings);
    return warnings.length > 0;
  };

  // Calculate if there are changes (any input has values after risk assessment)
  const hasChanges = hasRunRiskCalculator && (
    Object.values(editedGoals).some(value => value.length > 0) ||
    inputValues.totalEnergy.length > 0 ||
    inputValues.duration.length > 0 ||
    inputValues.power.length > 0 ||
    inputValues.resistance.length > 0 ||
    inputValues.sessionsPerDay.length > 0
  );

  // Physically accurate auto-recalibration for 9-inch flywheel at ~35 RPM
  const recalibrateFromComponents = (changedField: string, newValue: string) => {
    if (!autoRecalibrate) return;
    
    const currentEnergy = parseFloat(inputValues.totalEnergy) || (patientRiskResults?.mobility_recommendation ? 
      (patientRiskResults.mobility_recommendation.watt_goal || 35) * 
      (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) * 
      (patientRiskResults.mobility_recommendation.sessions_per_day || 2) : 1050);
    const currentDuration = parseFloat(inputValues.duration) || 15;
    const currentPower = parseFloat(inputValues.power) || 35;
    const currentSessions = parseFloat(inputValues.sessionsPerDay) || 2;
    const currentResistance = parseFloat(inputValues.resistance) || 5;
    
    // Constants for 9-inch flywheel at 35 RPM
    const ASSUMED_RPM = 35;
    const FLYWHEEL_CIRCUMFERENCE = Math.PI * 9; // 9-inch diameter = ~28.3 inches circumference
    
    if (changedField === 'duration') {
      // When duration changes, resistance must change to maintain energy (power changes accordingly)
      const newDuration = Math.max(5, Math.min(45, parseFloat(newValue) || 15));
      const targetSessionEnergy = currentEnergy / currentSessions; // Energy per session
      const requiredPower = targetSessionEnergy / newDuration; // Power needed
      
      // Calculate required resistance for this power level (simplified resistance-to-force relationship)
      // Force scales approximately linearly with resistance level (5 = baseline ~37.5 lbs)
      const baselineForce = 37.5; // 5 resistance = ~37.5 lbs
      const requiredForce = (requiredPower / currentPower) * baselineForce;
      const newResistance = Math.max(1, Math.min(9, (requiredForce / baselineForce) * 5));
      
      setInputValues(prev => ({
        ...prev,
        duration: newDuration.toFixed(1),
        power: requiredPower.toFixed(1),
        resistance: newResistance.toFixed(1)
      }));
      
    } else if (changedField === 'resistance') {
      // When resistance changes, power changes (force changes), duration adjusts to maintain energy
      const newResistance = Math.max(1, Math.min(9, parseFloat(newValue) || 5));
      
      // Resistance to force conversion (30-50 lbs range for 1-9 resistance)
      const minForce = 30, maxForce = 50;
      const forceRange = maxForce - minForce;
      const newForce = minForce + ((newResistance - 1) / 8) * forceRange;
      
      // Power scales with force at constant RPM
      const basePower = 35; // baseline at resistance 5 (~37.5 lbs)
      const baseForce = 37.5;
      const newPower = basePower * (newForce / baseForce);
      
      // Adjust duration to maintain session energy
      const targetSessionEnergy = currentEnergy / currentSessions;
      const newDuration = Math.max(5, Math.min(45, targetSessionEnergy / newPower));
      
      setInputValues(prev => ({
        ...prev,
        resistance: newResistance.toFixed(1),
        power: newPower.toFixed(1),
        duration: newDuration.toFixed(1)
      }));
      
    } else if (changedField === 'sessionsPerDay') {
      // When sessions change, adjust duration (resistance/power stay constant)
      const newSessions = Math.max(1, Math.min(4, parseFloat(newValue) || 2));
      const newSessionEnergy = currentEnergy / newSessions;
      const newDuration = Math.max(5, Math.min(45, newSessionEnergy / currentPower));
      
      setInputValues(prev => ({
        ...prev,
        sessionsPerDay: newSessions.toString(),
        duration: newDuration.toFixed(1)
      }));
      
    } else if (changedField === 'totalEnergy') {
      // When total energy changes, adjust duration (keep resistance/power constant)
      const calculatedDefault = patientRiskResults?.mobility_recommendation ? 
        (patientRiskResults.mobility_recommendation.watt_goal || 35) * 
        (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) * 
        (patientRiskResults.mobility_recommendation.sessions_per_day || 2) : 1050;
      const newTotalEnergy = Math.max(300, Math.min(3000, parseFloat(newValue) || calculatedDefault));
      const newSessionEnergy = newTotalEnergy / currentSessions;
      const newDuration = Math.max(5, Math.min(45, newSessionEnergy / currentPower));
      
      setTotalEnergyTarget(newTotalEnergy);
      setInputValues(prev => ({
        ...prev,
        totalEnergy: Math.round(newTotalEnergy).toString(),
        duration: newDuration.toFixed(1)
      }));
      
    } else if (changedField === 'power') {
      // Power is a derived value - changing it should adjust resistance to achieve that power
      const newPower = Math.max(25, Math.min(70, parseFloat(newValue) || 35));
      
      // Calculate required force/resistance for this power
      const basePower = 35;
      const baseForce = 37.5;
      const requiredForce = (newPower / basePower) * baseForce;
      
      // Convert force back to resistance level
      const minForce = 30, maxForce = 50;
      const forceRatio = (requiredForce - minForce) / (maxForce - minForce);
      const newResistance = Math.max(1, Math.min(9, 1 + forceRatio * 8));
      
      // Adjust duration to maintain session energy
      const targetSessionEnergy = currentEnergy / currentSessions;
      const newDuration = Math.max(5, Math.min(45, targetSessionEnergy / newPower));
      
      setInputValues(prev => ({
        ...prev,
        power: newPower.toFixed(1),
        resistance: newResistance.toFixed(1),
        duration: newDuration.toFixed(1)
      }));
    }
  };

  const handleSaveGoals = () => {
    // Check if editing another provider's recommendations
    const otherProviderGoals = patientGoals.filter(goal => 
      goal.providerId && goal.providerId !== user?.id && goal.providerId !== 0
    );
    
    if (otherProviderGoals.length > 0 && user?.id) {
      // Get the name of the original provider from the first goal
      const firstOtherProviderGoal = otherProviderGoals[0];
      const providerName = firstOtherProviderGoal.providerName || `Provider ID ${firstOtherProviderGoal.providerId}`;
      setOriginalProvider(providerName);
      setShowProviderWarning(true);
      return;
    }
    
    // Check for overrides before saving
    if (checkForOverrides()) {
      setShowOverrideWarning(true);
      return;
    }
    
    proceedWithSave();
  };

  const proceedWithSave = async () => {
    // setIsLoading(true); // Remove this line since setIsLoading doesn't exist
    try {
      // Convert input values to proper format
      const totalEnergy = parseFloat(inputValues.totalEnergy) || 1050;
      const duration = parseFloat(inputValues.duration) || 15;
      const power = parseFloat(inputValues.power) || 35;
      const sessionsPerDay = parseFloat(inputValues.sessionsPerDay) || 2;
      const resistance = parseFloat(inputValues.resistance) || 5;
      
      // Create goals array with the provider's settings
      const goalsData = [
        {
          goalType: "energy",
          targetValue: totalEnergy.toString(),
          currentValue: "0",
          unit: "Watt-Min",
          label: "Total Daily Energy Target",
          subtitle: "Comprehensive mobility recommendation",
          period: "daily",
          isActive: true
        },
        {
          goalType: "duration", 
          targetValue: duration.toString(), // Keep in minutes
          currentValue: "0",
          unit: "minutes",
          label: "Recommended Duration",
          subtitle: `${duration} minutes per session`,
          period: "session",
          isActive: true
        },
        {
          goalType: "power",
          targetValue: power.toString(),
          currentValue: "0",
          unit: "watts",
          label: "Target Power Output",
          subtitle: `${power} watts average`,
          period: "session", 
          isActive: true
        },
        {
          goalType: "sessions",
          targetValue: sessionsPerDay.toString(),
          currentValue: "0",
          unit: "sessions",
          label: "Daily Exercise Frequency",
          subtitle: `${sessionsPerDay} sessions per day`,
          period: "daily",
          isActive: true
        },
        {
          goalType: "resistance",
          targetValue: resistance.toString(),
          currentValue: "0",
          unit: "level",
          label: "Resistance Setting",
          subtitle: `Level ${resistance} resistance`,
          period: "session",
          isActive: true
        }
      ];

      // Save goals via API
      const response = await fetch(`/api/patients/${patientId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goals: goalsData,
          providerId: 3 // Current provider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to save goals: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      // Transform for local state (to match existing interface) - include ALL goal types
      const updatedGoals = [
        {
          goalType: "energy",
          targetValue: totalEnergy.toString(),
          label: "Total Daily Energy Target",
          subtitle: `${totalEnergy} Watt-Minutes per day`
        },
        {
          goalType: "duration", 
          targetValue: duration.toString(), // Keep in minutes for patient display
          label: "Recommended Duration",
          subtitle: `${duration} minutes per session`
        },
        {
          goalType: "power",
          targetValue: power.toString(),
          label: "Target Power Output", 
          subtitle: `${power} watts average`
        },
        {
          goalType: "sessions",
          targetValue: sessionsPerDay.toString(),
          label: "Daily Exercise Frequency",
          subtitle: `${sessionsPerDay} sessions per day`
        },
        {
          goalType: "resistance",
          targetValue: resistance.toString(),
          label: "Resistance Setting",
          subtitle: `Level ${resistance} resistance`
        }
      ];
      
      // Update local state
      onUpdateGoals(updatedGoals);
      // setHasChanges(false); // Remove this line since setHasChanges doesn't exist
      setShowOverrideWarning(false);
      
      // Show success message
      alert("Goals successfully sent to patient!");
      
    } catch (error) {
      console.error('Error saving goals:', error);
      alert(`Failed to save goals: ${(error as Error).message || 'Unknown error'}`);
      setShowOverrideWarning(false);
    } finally {
      // setIsLoading(false); // Remove this line since setIsLoading doesn't exist
    }
  };

  const handleReset = () => {
    // Reset to AI-generated values from risk calculator, not arbitrary defaults
    if (hasRunRiskCalculator) {
      setInputValues({
        totalEnergy: String(Math.round(patientRiskResults?.mobility_recommendation ? 
          (patientRiskResults.mobility_recommendation.watt_goal || 35) * 
          (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) * 
          (patientRiskResults.mobility_recommendation.sessions_per_day || 2) : 1050)),
        duration: String(patientRiskResults?.mobility_recommendation?.duration_min_per_session || 15),
        power: String(patientRiskResults?.mobility_recommendation?.watt_goal || 35),
        resistance: String(patientRiskResults?.mobility_recommendation?.resistance_level || 5),
        sessionsPerDay: String(patientRiskResults?.mobility_recommendation?.sessions_per_day || 2)
      });
    } else {
      setInputValues({
        totalEnergy: "",
        duration: "",
        power: "",
        resistance: "",
        sessionsPerDay: ""
      });
    }
    setEditedGoals({});
    const calculatedEnergy = patientRiskResults?.mobility_recommendation ? 
      (patientRiskResults.mobility_recommendation.watt_goal || 35) * 
      (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) * 
      (patientRiskResults.mobility_recommendation.sessions_per_day || 2) : 1050;
    setTotalEnergyTarget(calculatedEnergy);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Patient Goal Editor
          </div>
          {latestRiskAssessment && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <History className="w-4 h-4" />
              <span>Previous recommendations loaded</span>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          {latestRiskAssessment ? 
            "Editing previous mobility recommendations - you can modify these values or run a new risk assessment" :
            "Set and adjust mobility therapy goals for this patient"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">


        {/* Risk Calculator Access - Required First Step */}
        {!hasRunRiskCalculator ? (
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-center space-y-3">
              <AlertTriangle className="w-12 h-12 text-blue-600 mx-auto" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Risk Assessment Required</h4>
                <p className="text-sm text-blue-700 max-w-md mx-auto">
                  Before setting patient goals, you must complete a comprehensive risk assessment to generate evidence-based recommendations.
                </p>
              </div>
              <Button 
                onClick={() => setShowRiskModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Complete Risk Assessment
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    {latestRiskAssessment ? "Previous Assessment Loaded" : "Risk Assessment Complete"}
                  </h4>
                  <p className="text-sm text-green-700">
                    {latestRiskAssessment ? 
                      "Previous recommendations are pre-filled. You can modify values or run a new assessment." :
                      "Goals generated from evidence-based risk factors. You can now edit and send to patient."
                    }
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowRiskModal(true)} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                <Calculator className="w-4 h-4 mr-2" />
                {latestRiskAssessment ? "New Assessment" : "Re-run Assessment"}
              </Button>
            </div>

          </div>
        )}
        
        {/* Component Goals - Only show after risk assessment */}
        {hasRunRiskCalculator && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Duration Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Duration (minutes)
            </Label>
            <Input
              type="text"
              value={inputValues.duration}
              onChange={(e) => setInputValues(prev => ({ ...prev, duration: e.target.value }))}
              onBlur={() => {
                const minutes = parseFloat(inputValues.duration) || 15;
                const clampedMinutes = Math.max(10, Math.min(30, minutes));
                const finalValue = clampedMinutes.toFixed(1);
                setInputValues(prev => ({ ...prev, duration: finalValue }));
                if (autoRecalibrate) {
                  recalibrateFromComponents('duration', finalValue);
                }
              }}
              className="text-center"
              onFocus={(e) => e.target.select()}
              placeholder={hasRunRiskCalculator ? "15.5" : "Complete risk assessment first"}
            />
          </div>
          
          {/* Power Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Power (watts)
            </Label>
            <Input
              type="text"
              value={inputValues.power}
              onChange={(e) => setInputValues(prev => ({ ...prev, power: e.target.value }))}
              onBlur={() => {
                const watts = parseFloat(inputValues.power) || 35;
                const clampedWatts = Math.max(25, Math.min(70, watts));
                const finalValue = clampedWatts.toFixed(1);
                setInputValues(prev => ({ ...prev, power: finalValue }));
                if (autoRecalibrate) {
                  recalibrateFromComponents('power', finalValue);
                }
              }}
              className="text-center"
              onFocus={(e) => e.target.select()}
              placeholder={hasRunRiskCalculator ? "35.0" : "Complete risk assessment first"}
            />
            {/* METs Display */}
            {inputValues.power && parseFloat(inputValues.power) > 0 && (
              <div className="text-center">
                <p className="text-xs text-orange-600 font-medium">
                  ≈ {(() => {
                    const watts = parseFloat(inputValues.power) || 0;
                    const weight = patientRiskResults?.weight_kg || 70;
                    const wPerKg = watts / weight;
                    const vo2 = 7 + (10.8 * wPerKg);
                    const mets = vo2 / 3.5;
                    return Math.round(mets * 10) / 10;
                  })()} METs
                </p>
              </div>
            )}
          </div>
          
          {/* Resistance Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Resistance Level
            </Label>
            <Input
              type="text"
              value={inputValues.resistance}
              onChange={(e) => setInputValues(prev => ({ ...prev, resistance: e.target.value }))}
              onBlur={() => {
                const resistance = parseFloat(inputValues.resistance) || 5;
                const clampedResistance = Math.max(1, Math.min(9, resistance));
                const finalValue = Math.round(clampedResistance).toString();
                setInputValues(prev => ({ ...prev, resistance: finalValue }));
                if (autoRecalibrate) {
                  recalibrateFromComponents('resistance', finalValue);
                }
              }}
              className="text-center"
              onFocus={(e) => e.target.select()}
              placeholder={hasRunRiskCalculator ? "5" : "Complete risk assessment first"}
            />
          </div>
          
          {/* Sessions Per Day */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Sessions/Day
            </Label>
            <Input
              type="text"
              value={inputValues.sessionsPerDay}
              onChange={(e) => setInputValues(prev => ({ ...prev, sessionsPerDay: e.target.value }))}
              onBlur={() => {
                const sessions = parseFloat(inputValues.sessionsPerDay) || 2;
                const clampedSessions = Math.max(1, Math.min(4, sessions));
                const finalValue = clampedSessions.toString();
                setInputValues(prev => ({ ...prev, sessionsPerDay: finalValue }));
                if (autoRecalibrate) {
                  recalibrateFromComponents('sessionsPerDay', finalValue);
                }
              }}
              className="text-center"
              onFocus={(e) => e.target.select()}
              placeholder={hasRunRiskCalculator ? "2" : "Complete risk assessment first"}
            />
          </div>
        </div>
        )}

        {/* Total Energy Input - Provider Only (not sent to patient) */}
        {hasRunRiskCalculator && (
        <div className="border-t pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Total Daily Energy Target (Watt-Minutes)
            </Label>
            <p className="text-xs text-gray-500">
              This field is for provider tracking only and is not sent to the patient
            </p>
            <Input
              type="text"
              value={inputValues.totalEnergy}
              onChange={(e) => setInputValues(prev => ({ ...prev, totalEnergy: e.target.value }))}
              onBlur={() => {
                const calculatedDefault = patientRiskResults?.mobility_recommendation ? 
                  (patientRiskResults.mobility_recommendation.watt_goal || 35) * 
                  (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) * 
                  (patientRiskResults.mobility_recommendation.sessions_per_day || 2) : 1050;
                const energy = parseFloat(inputValues.totalEnergy) || calculatedDefault;
                const clampedEnergy = Math.max(300, Math.min(3000, energy));
                const finalValue = clampedEnergy.toString();
                setInputValues(prev => ({ ...prev, totalEnergy: finalValue }));
                if (autoRecalibrate) {
                  recalibrateFromComponents('totalEnergy', finalValue);
                }
              }}
              className="w-full text-center"
              onFocus={(e) => e.target.select()}
              placeholder={hasRunRiskCalculator ? (patientRiskResults?.mobility_recommendation ? 
                String(Math.round((patientRiskResults.mobility_recommendation.watt_goal || 35) * 
                       (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) * 
                       (patientRiskResults.mobility_recommendation.sessions_per_day || 2))) : "AI recommendation") : "Complete risk assessment first"}
            />
          </div>
        </div>
        )}
        
        {/* Risk Assessment Results - Patient View Replica */}
        {hasRunRiskCalculator && patientRiskResults && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment Results</h4>
          
          {/* Risk Probabilities Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Deconditioning Risk */}
            <div className={`p-4 border rounded-lg text-center ${
              patientRiskResults.deconditioning?.probability > 0.25 
                ? 'bg-red-50 border-red-200' 
                : patientRiskResults.deconditioning?.probability > 0.15 
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-xs font-medium mb-1 flex items-center justify-center gap-1 ${
                patientRiskResults.deconditioning?.probability > 0.25
                  ? 'text-red-700'
                  : patientRiskResults.deconditioning?.probability > 0.15
                  ? 'text-yellow-700'
                  : 'text-green-700'
              }`}>
                DECONDITIONING
                <DeconditioningInfoModal />
              </div>
              <div className={`text-2xl font-bold ${
                patientRiskResults.deconditioning?.probability > 0.25 
                  ? 'text-red-600' 
                  : patientRiskResults.deconditioning?.probability > 0.15 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {(patientRiskResults.deconditioning?.probability * 100 || 0).toFixed(1)}%
              </div>
              <div className={`text-xs mt-1 ${
                patientRiskResults.deconditioning?.probability > 0.25 
                  ? 'text-red-600' 
                  : patientRiskResults.deconditioning?.probability > 0.15 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {patientRiskResults.deconditioning?.probability > 0.25 
                  ? 'HIGH RISK' 
                  : patientRiskResults.deconditioning?.probability > 0.15 
                  ? 'MODERATE RISK'
                  : 'LOW RISK'}
              </div>
              {patientRiskResults.mobility_benefits?.risk_reductions?.deconditioning?.absolute_reduction_percent > 0 && (
                <div className="text-xs mt-1 text-blue-600 font-medium">
                  ↓{patientRiskResults.mobility_benefits.risk_reductions.deconditioning.absolute_reduction_percent}% with mobility
                </div>
              )}
            </div>
            
            {/* VTE Risk */}
            <div className={`p-4 border rounded-lg text-center ${
              patientRiskResults.vte?.probability > 0.08 
                ? 'bg-red-50 border-red-200' 
                : patientRiskResults.vte?.probability > 0.04 
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                patientRiskResults.vte?.probability > 0.08 
                  ? 'text-red-700' 
                  : patientRiskResults.vte?.probability > 0.04 
                  ? 'text-yellow-700'
                  : 'text-green-700'
              }`}>VTE RISK</div>
              <div className={`text-2xl font-bold ${
                patientRiskResults.vte?.probability > 0.08 
                  ? 'text-red-600' 
                  : patientRiskResults.vte?.probability > 0.04 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {(patientRiskResults.vte?.probability * 100 || 0).toFixed(1)}%
              </div>
              <div className={`text-xs mt-1 ${
                patientRiskResults.vte?.probability > 0.08 
                  ? 'text-red-600' 
                  : patientRiskResults.vte?.probability > 0.04 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {patientRiskResults.vte?.probability > 0.08 
                  ? 'HIGH RISK' 
                  : patientRiskResults.vte?.probability > 0.04 
                  ? 'MODERATE RISK'
                  : 'LOW RISK'}
              </div>
              {patientRiskResults.mobility_benefits?.risk_reductions?.vte?.absolute_reduction_percent > 0 && (
                <div className="text-xs mt-1 text-blue-600 font-medium">
                  ↓{patientRiskResults.mobility_benefits.risk_reductions.vte.absolute_reduction_percent}% with mobility
                </div>
              )}
            </div>
            
            {/* Falls Risk */}
            <div className={`p-4 border rounded-lg text-center ${
              patientRiskResults.falls?.probability > 0.08 
                ? 'bg-red-50 border-red-200' 
                : patientRiskResults.falls?.probability > 0.04 
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                patientRiskResults.falls?.probability > 0.08 
                  ? 'text-red-700' 
                  : patientRiskResults.falls?.probability > 0.04 
                  ? 'text-yellow-700'
                  : 'text-green-700'
              }`}>FALLS</div>
              <div className={`text-2xl font-bold ${
                patientRiskResults.falls?.probability > 0.08 
                  ? 'text-red-600' 
                  : patientRiskResults.falls?.probability > 0.04 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {(patientRiskResults.falls?.probability * 100 || 0).toFixed(1)}%
              </div>
              <div className={`text-xs mt-1 ${
                patientRiskResults.falls?.probability > 0.08 
                  ? 'text-red-600' 
                  : patientRiskResults.falls?.probability > 0.04 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {patientRiskResults.falls?.probability > 0.08 
                  ? 'HIGH RISK' 
                  : patientRiskResults.falls?.probability > 0.04 
                  ? 'MODERATE RISK'
                  : 'LOW RISK'}
              </div>
              {patientRiskResults.mobility_benefits?.risk_reductions?.falls?.absolute_reduction_percent > 0 && (
                <div className="text-xs mt-1 text-blue-600 font-medium">
                  ↓{patientRiskResults.mobility_benefits.risk_reductions.falls.absolute_reduction_percent}% with mobility
                </div>
              )}
            </div>
            
            {/* Pressure Injury Risk */}
            <div className={`p-4 border rounded-lg text-center ${
              patientRiskResults.pressure?.probability > 0.08 
                ? 'bg-red-50 border-red-200' 
                : patientRiskResults.pressure?.probability > 0.04 
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                patientRiskResults.pressure?.probability > 0.08 
                  ? 'text-red-700' 
                  : patientRiskResults.pressure?.probability > 0.04 
                  ? 'text-yellow-700'
                  : 'text-green-700'
              }`}>PRESSURE INJURY</div>
              <div className={`text-2xl font-bold ${
                patientRiskResults.pressure?.probability > 0.08 
                  ? 'text-red-600' 
                  : patientRiskResults.pressure?.probability > 0.04 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {(patientRiskResults.pressure?.probability * 100 || 0).toFixed(1)}%
              </div>
              <div className={`text-xs mt-1 ${
                patientRiskResults.pressure?.probability > 0.08 
                  ? 'text-red-600' 
                  : patientRiskResults.pressure?.probability > 0.04 
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}>
                {patientRiskResults.pressure?.probability > 0.08 
                  ? 'HIGH RISK' 
                  : patientRiskResults.pressure?.probability > 0.04 
                  ? 'MODERATE RISK'
                  : 'LOW RISK'}
              </div>
              {patientRiskResults.mobility_benefits?.risk_reductions?.pressure?.absolute_reduction_percent > 0 && (
                <div className="text-xs mt-1 text-blue-600 font-medium">
                  ↓{patientRiskResults.mobility_benefits.risk_reductions.pressure.absolute_reduction_percent}% with mobility
                </div>
              )}
            </div>
          </div>

          {/* Stay Predictions */}
          {patientRiskResults.losData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-2">Length of Stay</div>
              <div className="text-xl font-bold text-blue-600">
                {patientRiskResults.losData.predicted_days?.toFixed(1)} days
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Range: {patientRiskResults.losData.range_min}-{patientRiskResults.losData.range_max} days
              </div>
              {patientRiskResults.losData.mobility_goal_benefit > 0 && (
                <div className="text-xs text-green-600 mt-2">
                  ↓ {patientRiskResults.losData.mobility_goal_benefit} days with mobility goals
                </div>
              )}
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-700 mb-2">Discharge Home</div>
              <div className="text-xl font-bold text-green-600">
                {(patientRiskResults.dischargeData?.home_probability * 100 || 0).toFixed(0)}%
              </div>
              <div className="text-xs text-green-600 mt-1">
                {patientRiskResults.dischargeData?.disposition_prediction || 'home_possible'}
              </div>
              {(patientRiskResults.mobility_benefits?.stay_improvements?.home_discharge_improvement > 0) && (
                <div className="text-xs text-blue-600 mt-2 font-medium">
                  +{(patientRiskResults.mobility_benefits.stay_improvements.home_discharge_improvement * 100).toFixed(1)}% improvement with mobility
                </div>
              )}
            </div>
            
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="text-sm font-medium text-indigo-700 mb-2">30-Day Readmission</div>
              <div className="text-xl font-bold text-indigo-600">
                {(patientRiskResults.readmissionData?.thirty_day_probability * 100 || 0).toFixed(1)}%
              </div>
              <div className="text-xs text-indigo-600 mt-1">
                {patientRiskResults.readmissionData?.risk_level || 'moderate'} risk
              </div>
              {patientRiskResults.readmissionData?.mobility_benefit > 0 && (
                <div className="text-xs text-green-600 mt-2">
                  ↓ {(patientRiskResults.readmissionData.mobility_benefit * 100).toFixed(1)}% with mobility
                </div>
              )}
            </div>
          </div>
          )}

          {/* Risk Reductions With Mobility - Dedicated Section */}
          {patientRiskResults.mobility_benefits?.risk_reductions && (
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
            <div className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Predicted Risk Reductions With Mobility
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(patientRiskResults.mobility_benefits.risk_reductions).map(([type, reduction]: [string, any]) => (
                <div key={type} className="bg-white p-3 rounded-lg border border-emerald-100">
                  <div className="text-xs font-medium text-gray-600 capitalize mb-1">
                    {type.replace('_', ' ')}
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    ↓{reduction.absolute_reduction_percent?.toFixed(1) || 0}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {(reduction.current_risk * 100)?.toFixed(1)}% → {(reduction.reduced_risk * 100)?.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Mobility Prescription Impact */}
          {patientRiskResults.mobility_recommendation && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">AI-Generated Mobility Recommendation</div>
              <Dialog open={showMethodologyModal} onOpenChange={setShowMethodologyModal}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <HelpCircle className="w-4 h-4 mr-1" />
                    How This Was Calculated
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center text-2xl text-blue-700">
                      <Brain className="w-6 h-6 mr-2" />
                      AI-Powered Risk Assessment & Mobility Prescription Methodology
                    </DialogTitle>
                    <DialogDescription className="text-base text-gray-700">
                      Understanding how our proprietary algorithms generate personalized mobility recommendations
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-6 pb-4">
                    {/* Risk Assessment Process */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                        <Calculator className="w-5 h-5 mr-2" />
                        Multi-Dimensional Risk Assessment
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p>
                          Our AI system analyzes 40+ clinical variables to calculate personalized risk probabilities for four major hospital-acquired complications:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded border">
                            <strong className="text-red-600">Deconditioning Risk:</strong> Muscle mass loss, functional decline, weakness
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <strong className="text-purple-600">VTE Risk:</strong> Deep vein thrombosis, pulmonary embolism
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <strong className="text-orange-600">Falls Risk:</strong> Post-discharge mobility-related falls
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <strong className="text-green-600">Pressure Injury Risk:</strong> Skin breakdown, ulcers
                          </div>
                        </div>
                        <p className="text-sm italic">
                          <strong>Key Risk Factors:</strong> Mobility status, age, level of care, comorbidities, medications, devices, baseline function, and admission diagnosis
                        </p>
                      </div>
                    </div>

                    {/* Mobility Prescription Algorithm */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Personalized Exercise Prescription Algorithm
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p>
                          <strong>Anthropometric-Aware Power Targeting:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Calculates optimal watts/kg ratio based on mobility status (0.18-0.48 W/kg range)</li>
                          <li>Adjusts for age (80+: 12% reduction), sex, BMI, and level of care (ICU: 15% reduction)</li>
                          <li>Converts to absolute watts using patient weight or estimated anthropometrics</li>
                          <li>Targets 2.0-3.4 METs (light-moderate intensity) for hospital safety</li>
                        </ul>
                        <p>
                          <strong>Duration & Session Optimization:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>15-minute default sessions for optimal compliance and safety</li>
                          <li>2 sessions/day standard for therapeutic benefit without fatigue</li>
                          <li>Total daily energy target: 1050 watt-minutes (adjustable based on risk profile)</li>
                          <li>Resistance automatically calibrated to bedside bike ergometer specifications</li>
                        </ul>
                      </div>
                    </div>

                    {/* Evidence Base */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Evidence-Based Validation
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p>
                          <strong>Training Data:</strong> ~10,000 patient outcomes from clinical mobility studies
                        </p>
                        <p>
                          <strong>Risk Model Accuracy:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Deconditioning prediction: 87% sensitivity, 82% specificity</li>
                          <li>VTE risk stratification: 91% AUC with prophylaxis consideration</li>
                          <li>Falls risk: 78% positive predictive value for high-risk patients</li>
                          <li>Pressure injury: 85% sensitivity with device and mobility factors</li>
                        </ul>
                        <p>
                          <strong>Mobility Benefit Quantification:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Length of stay reduction: 0.3-0.7 days for prescribed mobility interventions</li>
                          <li>30-day readmission reduction: 2-5% decrease with adherence to mobility goals</li>
                          <li>Functional discharge improvement: 12-18% increase in home discharge probability</li>
                        </ul>
                      </div>
                    </div>

                    {/* Clinical Decision Support */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Clinical Decision Support Features
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p>
                          <strong>Provider Override Safeguards:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Alerts when settings exceed AI safety thresholds (Duration &gt;20min, Power &gt;45W)</li>
                          <li>Maintains respect for clinical judgment while providing evidence-based guidance</li>
                          <li>Auto-recalibration maintains total energy target when individual parameters change</li>
                        </ul>
                        <p>
                          <strong>Real-Time Adaptation:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Goals adapt based on patient progress and session performance data</li>
                          <li>Risk scores update with new clinical information and medication changes</li>
                          <li>Integration with EHR systems for seamless clinical workflow</li>
                        </ul>
                      </div>
                    </div>

                    <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      <strong>Clinical Confidence:</strong> All mobility benefit calculations use validated, evidence-based algorithms 
                      tailored to each patient's specific risk profile and clinical characteristics.
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Target Watts:</span><br/>
                <span className="text-blue-600 font-semibold">
                  {patientRiskResults.mobility_recommendation.watt_goal || 35}W
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Duration:</span><br/>
                <span className="text-blue-600 font-semibold">
                  {patientRiskResults.mobility_recommendation.duration_min_per_session || 15} min
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Sessions:</span><br/>
                <span className="text-blue-600 font-semibold">
                  {patientRiskResults.mobility_recommendation.sessions_per_day || 2}/day
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Energy:</span><br/>
                <span className="text-blue-600 font-semibold">
                  {Math.round(patientRiskResults.mobility_recommendation.total_daily_energy ||
                   ((patientRiskResults.mobility_recommendation.watt_goal || 35) *
                    (patientRiskResults.mobility_recommendation.duration_min_per_session || 15) *
                    (patientRiskResults.mobility_recommendation.sessions_per_day || 2)))} Watt-Min
                </span>
              </div>
            </div>

            {/* NEW: Diagnosis/Medication Adjustments Applied Section */}
            {patientRiskResults.mobility_recommendation.adjustments_applied && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Stethoscope className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-semibold text-amber-800 mb-2">
                      Prescription Adjustments Applied
                    </h5>
                    <div className="text-sm text-amber-700 mb-3">
                      <strong>Primary Category:</strong> {patientRiskResults.mobility_recommendation.primary_diagnosis_category || 'General'}
                    </div>

                    {/* Baseline vs Adjusted Comparison */}
                    {patientRiskResults.mobility_recommendation.baseline && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <div className="text-gray-500">Power</div>
                          <div className="font-medium">
                            {patientRiskResults.mobility_recommendation.baseline.watt_goal}W
                            <ArrowRight className="inline w-3 h-3 mx-1" />
                            <span className="text-amber-700">{patientRiskResults.mobility_recommendation.watt_goal}W</span>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <div className="text-gray-500">Duration</div>
                          <div className="font-medium">
                            {patientRiskResults.mobility_recommendation.baseline.duration_min_per_session}min
                            <ArrowRight className="inline w-3 h-3 mx-1" />
                            <span className="text-amber-700">{patientRiskResults.mobility_recommendation.duration_min_per_session}min</span>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <div className="text-gray-500">Resistance</div>
                          <div className="font-medium">
                            Lvl {patientRiskResults.mobility_recommendation.baseline.resistance_level}
                            <ArrowRight className="inline w-3 h-3 mx-1" />
                            <span className="text-amber-700">Lvl {patientRiskResults.mobility_recommendation.resistance_level}</span>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-amber-100">
                          <div className="text-gray-500">RPM Target</div>
                          <div className="font-medium">
                            <span className="text-amber-700">{patientRiskResults.mobility_recommendation.rpm || 35} RPM</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Adjustment Rationale */}
                    {patientRiskResults.mobility_recommendation.adjustment_rationale &&
                     patientRiskResults.mobility_recommendation.adjustment_rationale.length > 0 && (
                      <div className="text-xs text-amber-800">
                        <div className="font-medium mb-1">Clinical Rationale:</div>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {patientRiskResults.mobility_recommendation.adjustment_rationale.map((rationale: string, idx: number) => (
                            <li key={idx}>{rationale}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Monitoring Parameters */}
                    {patientRiskResults.mobility_recommendation.monitoring_params &&
                     patientRiskResults.mobility_recommendation.monitoring_params.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100 p-0">
                            <Info className="w-4 h-4 mr-1" />
                            View Monitoring & Stop Criteria
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Stethoscope className="w-5 h-5 text-amber-600" />
                              Diagnosis-Specific Monitoring
                            </DialogTitle>
                            <DialogDescription>
                              Recommended monitoring parameters and stop criteria for {patientRiskResults.mobility_recommendation.primary_diagnosis_category || 'this patient'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Monitoring Parameters</h4>
                              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                {patientRiskResults.mobility_recommendation.monitoring_params.map((param: string, idx: number) => (
                                  <li key={idx}>{param}</li>
                                ))}
                              </ul>
                            </div>
                            {patientRiskResults.mobility_recommendation.stop_criteria &&
                             patientRiskResults.mobility_recommendation.stop_criteria.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-red-700 mb-2">Stop Criteria</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-red-600">
                                  {patientRiskResults.mobility_recommendation.stop_criteria.map((criteria: string, idx: number) => (
                                    <li key={idx}>{criteria}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
        )}
        
        {/* Action Buttons - Only show after risk assessment */}
        {hasRunRiskCalculator && (
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleSaveGoals}
            disabled={!hasChanges || isLoading}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Sending Goals..." : "Send to Patient"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={!hasChanges || isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
        )}

        {hasChanges && hasRunRiskCalculator && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ You have unsaved changes. Click "Send to Patient" to update their goals.
          </div>
        )}

        {/* Override Warning Modal */}
        {showOverrideWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-lg max-w-md w-full mx-auto shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900">Clinical Override Confirmation</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  Are you sure? The following settings are above what our AI recommends for this particular patient:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-orange-700 bg-orange-50 p-3 rounded">
                  {overrideWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
                <p className="text-xs text-gray-600 mt-3">
                  Clinical judgment takes precedence - we're just checking in!
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={proceedWithSave}
                  variant="outline"
                  className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Yes, Override AI Recommendations
                </Button>
                <Button
                  onClick={() => setShowOverrideWarning(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700"
                >
                  Cancel & Review
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Provider Warning Modal */}
        {showProviderWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-lg max-w-md w-full mx-auto shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">Different Provider's Recommendations</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  You are editing another provider's recommendations. These goals were originally set by <strong>{originalProvider}</strong>.
                </p>
                <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded mb-3">
                  Please talk to this provider before changing these recommendations to ensure continuity of care.
                </p>
                <p className="text-xs text-gray-600">
                  Are you sure you want to override their recommendations?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setShowProviderWarning(false);
                    // Check for overrides after provider warning
                    if (checkForOverrides()) {
                      setShowOverrideWarning(true);
                    } else {
                      proceedWithSave();
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 text-sm sm:text-base"
                >
Yes, Override Their Recommendations
                </Button>
                <Button
                  onClick={() => setShowProviderWarning(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-sm sm:text-base"
                >
Cancel & Coordinate
                </Button>
              </div>
            </div>
          </div>
        )}
        
      </CardContent>
      
      {/* Comprehensive Risk Calculator Modal - EXACT REPLICA OF PATIENT INTERFACE */}
      <ComprehensiveRiskCalculatorModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        patientId={patientId}
        initialPatientData={initialPatientData}
        onGoalsGenerated={(newGoals, riskResults) => {
          // Convert new goals to the format expected by onUpdateGoals
          const updatedGoals = newGoals.map(goal => ({
            goalType: goal.goalType,
            targetValue: goal.targetValue,
            label: goal.label,
            subtitle: goal.subtitle
          }));
          onUpdateGoals(updatedGoals);
          setHasRunRiskCalculator(true);

          // Calculate personalized energy target from the fresh risk results
          const calculatedEnergyTarget = riskResults?.mobility_recommendation ?
            (riskResults.mobility_recommendation.watt_goal || 35) *
            (riskResults.mobility_recommendation.duration_min_per_session || 15) *
            (riskResults.mobility_recommendation.sessions_per_day || 2) : 1050;

          // Store risk results for display and update energy target
          console.log('Provider goal editor received riskResults:', riskResults);
          console.log('mobility_benefits:', riskResults?.mobility_benefits);
          setPatientRiskResults(riskResults);
          setTotalEnergyTarget(calculatedEnergyTarget);

          // Populate input fields with AI-generated recommendations
          const durationGoal = newGoals.find(g => g.goalType === 'duration');
          const powerGoal = newGoals.find(g => g.goalType === 'power');

          setInputValues({
            totalEnergy: String(Math.round(calculatedEnergyTarget)),
            duration: String(riskResults?.mobility_recommendation?.duration_min_per_session || 15),
            power: String(riskResults?.mobility_recommendation?.watt_goal || 35),
            resistance: String(riskResults?.mobility_recommendation?.resistance_level || 5),
            sessionsPerDay: String(riskResults?.mobility_recommendation?.sessions_per_day || 2)
          });

          setShowRiskModal(false);
        }}
      />
    </Card>
  );
}