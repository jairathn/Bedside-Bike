import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Zap, Clock, Settings, Save, RotateCcw, Calculator, AlertTriangle, CheckCircle } from "lucide-react";
import { RiskCalculatorModal } from "./risk-calculator-modal";

interface Goal {
  id: number;
  goalType: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  label: string;
  subtitle?: string;
  period: string;
  aiRecommended: boolean;
}

interface ProviderGoalEditorProps {
  patientGoals: Goal[];
  patientId: number;
  onUpdateGoals: (goals: Partial<Goal>[]) => void;
  onRunRiskCalculator: () => void;
  isLoading?: boolean;
}

export function ProviderGoalEditor({ patientGoals = [], patientId, onUpdateGoals, onRunRiskCalculator, isLoading = false }: ProviderGoalEditorProps) {
  // Simple input values - what user sees and types
  const [inputValues, setInputValues] = useState({
    totalEnergy: "899",
    duration: "16", 
    power: "29.0",
    resistance: "5"
  });
  
  const [editedGoals, setEditedGoals] = useState<Record<string, string>>({});
  const [totalEnergyTarget, setTotalEnergyTarget] = useState<number>(1050);
  const [autoRecalibrate, setAutoRecalibrate] = useState(true);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [hasRunRiskCalculator, setHasRunRiskCalculator] = useState(false);
  
  // Separate goals by type for easier management
  const durationGoal = patientGoals.find(g => g.goalType === 'duration');
  const powerGoal = patientGoals.find(g => g.goalType === 'power');
  const resistanceGoal = patientGoals.find(g => g.goalType === 'resistance');
  
  useEffect(() => {
    // Initialize input values from database
    if (powerGoal) setInputValues(prev => ({ ...prev, power: parseFloat(powerGoal.targetValue).toFixed(1) }));
    if (durationGoal) setInputValues(prev => ({ ...prev, duration: Math.round(parseFloat(durationGoal.targetValue) / 60).toString() }));
    if (resistanceGoal) setInputValues(prev => ({ ...prev, resistance: resistanceGoal.targetValue }));
    
    // Calculate total energy
    if (powerGoal && durationGoal) {
      const watts = parseFloat(powerGoal.targetValue) || 35;
      const seconds = parseFloat(durationGoal.targetValue) || 900;
      const minutes = seconds / 60;
      const totalWattMinutes = watts * minutes * 2; // 2 sessions/day
      const totalEnergy = Math.round(totalWattMinutes);
      setTotalEnergyTarget(totalEnergy);
      setInputValues(prev => ({ ...prev, totalEnergy: totalEnergy.toString() }));
    }
  }, [patientGoals]);
  
  // Auto-recalibration logic based on total energy target
  const recalibrateFromEnergyTarget = (newEnergyTarget: number) => {
    if (!autoRecalibrate) return;
    
    // Start with calculator recommendations for twice-daily sessions
    // Assume 2 sessions per day, distribute energy across both
    const energyPerSession = newEnergyTarget / 2;
    
    // Bedside bike calibration: 9-inch electromagnetic flywheel
    // Resistance scale 1-9 maps to ~30-50 lbs
    // Power range: 25-70W typical for elderly patients
    
    // Start with optimal session duration (15-25 minutes based on energy)
    const optimalMinutes = Math.max(10, Math.min(25, 15 + (energyPerSession - 400) / 100));
    const optimalWatts = energyPerSession / optimalMinutes;
    
    // Clamp watts to safe range
    const safeWatts = Math.max(25, Math.min(70, optimalWatts));
    
    // Calculate resistance needed for target watts (linear scale 1-9)
    // Lower resistance for higher power to maintain patient comfort
    const resistanceLevel = Math.max(1, Math.min(9, 9 - ((safeWatts - 25) / 45) * 8));
    
    // Update input values immediately so user sees the changes
    setInputValues(prev => ({
      ...prev,
      power: safeWatts.toFixed(1),
      duration: optimalMinutes.toFixed(1),
      resistance: Math.round(resistanceLevel).toString()
    }));
    
    setEditedGoals(prev => ({
      ...prev,
      duration_target: (optimalMinutes * 60).toString(),
      power_target: safeWatts.toFixed(1),
      resistance_target: Math.round(resistanceLevel).toString()
    }));
  };
  
  // Recalibrate when individual components change (keeping energy constant)
  const recalibrateFromComponents = (changedComponent: string, value: string) => {
    if (!autoRecalibrate) return;
    
    // Keep total energy constant by adjusting other components
    switch (changedComponent) {
      case 'resistance':
        const newResistance = parseFloat(value);
        // Higher resistance allows for higher power output
        const adjustedPower = Math.max(25, Math.min(70, 25 + (newResistance - 1) * 5));
        const adjustedDuration = Math.max(5, (totalEnergyTarget / 2) / adjustedPower);
        
        // Update both input values and edited goals
        setInputValues(prev => ({
          ...prev,
          power: adjustedPower.toFixed(1),
          duration: adjustedDuration.toFixed(1)
        }));
        setEditedGoals(prev => ({
          ...prev,
          power_target: adjustedPower.toFixed(1),
          duration_target: (adjustedDuration * 60).toString()
        }));
        break;
        
      case 'power':
        const newPower = parseFloat(value);
        const adjustedDurationForPower = Math.max(5, (totalEnergyTarget / 2) / newPower);
        const adjustedResistanceForPower = Math.max(1, Math.min(9, 1 + (newPower - 25) / 5));
        
        setInputValues(prev => ({
          ...prev,
          duration: adjustedDurationForPower.toFixed(1),
          resistance: Math.round(adjustedResistanceForPower).toString()
        }));
        setEditedGoals(prev => ({
          ...prev,
          duration_target: (adjustedDurationForPower * 60).toString(),
          resistance_target: Math.round(adjustedResistanceForPower).toString()
        }));
        break;
        
      case 'duration':
        const newDurationMinutes = parseFloat(value) / 60; // convert seconds to minutes
        const adjustedPowerForDuration = Math.max(25, Math.min(70, (totalEnergyTarget / 2) / newDurationMinutes));
        const adjustedResistanceForDuration = Math.max(1, Math.min(9, 1 + (adjustedPowerForDuration - 25) / 5));
        
        setInputValues(prev => ({
          ...prev,
          power: adjustedPowerForDuration.toFixed(1),
          resistance: Math.round(adjustedResistanceForDuration).toString()
        }));
        setEditedGoals(prev => ({
          ...prev,
          power_target: adjustedPowerForDuration.toFixed(1),
          resistance_target: Math.round(adjustedResistanceForDuration).toString()
        }));
        break;
    }
  };
  
  const handleEnergyTargetChange = (value: string) => {
    const newTarget = parseFloat(value) || 1050;
    setTotalEnergyTarget(newTarget);
    recalibrateFromEnergyTarget(newTarget);
  };
  
  const handleGoalChange = (goalType: string, value: string) => {
    // Allow free typing - just update the state
    setEditedGoals(prev => ({
      ...prev,
      [`${goalType}_target`]: value
    }));
  };
  
  const handleGoalFinished = (goalType: string, value: string) => {
    // Only recalibrate when user finishes typing (onBlur)
    if (autoRecalibrate) {
      recalibrateFromComponents(goalType, value);
    }
  };
  
  const handleSaveGoals = () => {
    const updatedGoals: Partial<Goal>[] = [];
    
    patientGoals.forEach(goal => {
      const newValue = editedGoals[`${goal.goalType}_target`];
      if (newValue && newValue !== goal.targetValue) {
        updatedGoals.push({
          id: goal.id,
          targetValue: newValue
        });
      }
    });
    
    if (updatedGoals.length > 0) {
      onUpdateGoals(updatedGoals);
    }
  };
  
  const handleReset = () => {
    const resetValues: Record<string, string> = {};
    patientGoals.forEach(goal => {
      resetValues[`${goal.goalType}_target`] = goal.targetValue;
    });
    setEditedGoals(resetValues);
    
    // Recalculate energy target from original goals
    if (powerGoal && durationGoal) {
      const watts = parseFloat(powerGoal.targetValue) || 35;
      const seconds = parseFloat(durationGoal.targetValue) || 900;
      const minutes = seconds / 60;
      const totalWattMinutes = watts * minutes * 2; // Twice daily
      setTotalEnergyTarget(Math.round(totalWattMinutes));
    }
  };
  
  const hasChanges = patientGoals.some(goal => 
    editedGoals[`${goal.goalType}_target`] !== goal.targetValue
  );
  
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Provider Goal Management
        </CardTitle>
        <p className="text-sm text-gray-600">
          Adjust patient exercise targets with automatic recalibration for optimal therapeutic outcomes
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Total Energy Target Control */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Total Daily Energy Target</span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Primary Goal
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="energy-target" className="text-sm font-medium">
                Total Watt-Minutes (Daily)
              </Label>
              <Input
                id="energy-target"
                type="text"
                value={inputValues.totalEnergy}
                onChange={(e) => setInputValues(prev => ({ ...prev, totalEnergy: e.target.value }))}
                onBlur={() => {
                  const energy = parseFloat(inputValues.totalEnergy) || 1050;
                  const clampedEnergy = Math.max(300, Math.min(2000, energy));
                  setTotalEnergyTarget(clampedEnergy);
                  setInputValues(prev => ({ ...prev, totalEnergy: clampedEnergy.toString() }));
                  if (autoRecalibrate) {
                    recalibrateFromEnergyTarget(clampedEnergy);
                  }
                }}
                className="mt-1"
                onFocus={(e) => e.target.select()}
                placeholder="1050"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total energy across 2 daily sessions
              </p>
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">Per Session:</span><br/>
              {Math.round(totalEnergyTarget / 2)} Watt-Minutes
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-recalibrate"
                checked={autoRecalibrate}
                onChange={(e) => setAutoRecalibrate(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="auto-recalibrate" className="text-sm">
                Auto-calculate components
              </Label>
            </div>
          </div>
        </div>
        
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
                  <h4 className="font-semibold text-green-900 mb-1">Risk Assessment Complete</h4>
                  <p className="text-sm text-green-700">
                    Goals generated from evidence-based risk factors. You can now edit and send to patient.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowRiskModal(true)} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                <Calculator className="w-4 h-4 mr-2" />
                Re-run Assessment
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
              Minutes per Session
            </Label>
            <Input
              type="text"
              value={inputValues.duration}
              onChange={(e) => setInputValues(prev => ({ ...prev, duration: e.target.value }))}
              onBlur={() => {
                const minutes = parseFloat(inputValues.duration) || 15;
                const clampedMinutes = Math.max(5, Math.min(30, minutes));
                setInputValues(prev => ({ ...prev, duration: clampedMinutes.toFixed(1) }));
                if (autoRecalibrate) {
                  recalibrateFromComponents('duration', (clampedMinutes * 60).toString());
                }
              }}
              className="text-center"
              onFocus={(e) => e.target.select()}
              placeholder="15.0"
            />
          </div>
          
          {/* Power Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Average Watts
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
              placeholder="35.0"
            />
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
              placeholder="5"
            />
          </div>
          
          {/* Sessions Per Day */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Sessions/Day
            </Label>
            <Input
              type="text"
              value="2"
              disabled
              className="text-center bg-gray-50"
            />
          </div>
        </div>
        )}
        
        {/* Energy Distribution Summary - Only show after risk assessment */}
        {hasRunRiskCalculator && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Current Prescription Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="font-medium text-gray-700">Total Energy:</span><br/>
              <span className="text-blue-600 font-semibold">{totalEnergyTarget} Watt-Min</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Per Session:</span><br/>
              <span className="text-green-600 font-semibold">{Math.round(totalEnergyTarget / 2)} Watt-Min</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Sessions/Day:</span><br/>
              <span className="text-purple-600 font-semibold">2 sessions</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Frequency:</span><br/>
              <span className="text-orange-600 font-semibold">Daily</span>
            </div>
          </div>
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
        
        {hasChanges && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ You have unsaved changes. Click "Send to Patient" to update their goals.
          </div>
        )}
        )}
        
      </CardContent>
      
      {/* Risk Calculator Modal */}
      <RiskCalculatorModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        patientId={patientId}
        onGoalsGenerated={(newGoals) => {
          // Convert new goals to the format expected by onUpdateGoals
          const updatedGoals = newGoals.map(goal => ({
            goalType: goal.goalType,
            targetValue: goal.targetValue,
            label: goal.label,
            subtitle: goal.subtitle
          }));
          onUpdateGoals(updatedGoals);
          setHasRunRiskCalculator(true);
          setShowRiskModal(false);
        }}
      />
    </Card>
  );
}