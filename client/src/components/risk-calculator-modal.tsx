import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Zap, Clock, Settings, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DeconditioningInfoModal } from "./deconditioning-info-modal";
import { useToast } from "@/hooks/use-toast";

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  onGoalsGenerated: (goals: any[]) => void;
}

export function RiskCalculatorModal({ 
  isOpen, 
  onClose, 
  patientId, 
  onGoalsGenerated 
}: RiskCalculatorModalProps) {
  const [medicalText, setMedicalText] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    age: '',
    height: '',
    weight: '',
    gender: 'male'
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [riskResults, setRiskResults] = useState<any>(null);
  const { toast } = useToast();

  const handleCalculateRisks = async () => {
    if (!medicalText.trim() || !patientInfo.age || !patientInfo.height || !patientInfo.weight) {
      toast({
        title: "Missing Information",
        description: "Please fill in all patient information and medical text",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);
    try {
      const response = await apiRequest('/api/calculate-risks', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          medicalText,
          patientInfo
        })
      });

      setRiskResults(response);
      
      // Generate goals from risk assessment
      if (response.stay_predictions?.mobility_recommendation) {
        const recommendation = response.stay_predictions.mobility_recommendation;
        const newGoals = [
          {
            goalType: 'power',
            targetValue: recommendation.target_watts?.toString() || '35.0',
            label: 'Calculator Recommended Power',
            subtitle: 'Based on risk assessment'
          },
          {
            goalType: 'duration',
            targetValue: (recommendation.session_duration_minutes || 15).toString(),
            label: 'Calculator Recommended Duration',
            subtitle: 'Based on risk factors'
          },
          {
            goalType: 'resistance',
            targetValue: recommendation.resistance_level?.toString() || '5',
            label: 'Calculator Recommended Resistance',
            subtitle: 'Optimized for patient profile'
          }
        ];
        onGoalsGenerated(newGoals);
      }

      toast({
        title: "Risk Assessment Complete",
        description: "New mobility recommendations generated"
      });
    } catch (error) {
      toast({
        title: "Assessment Failed",
        description: "Please try again with different medical information",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const getRiskColor = (percentage: number) => {
    if (percentage >= 25) return 'text-red-600';
    if (percentage >= 10) return 'text-orange-600';
    if (percentage >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Risk Assessment & Mobility Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  value={patientInfo.age}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="75"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={patientInfo.height}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, height: e.target.value }))}
                  placeholder="170"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={patientInfo.weight}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="70"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select 
                  id="gender"
                  value={patientInfo.gender}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Medical History Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical History & Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="medical-text">
                Paste medical record text, admission notes, or patient summary
              </Label>
              <Textarea
                id="medical-text"
                value={medicalText}
                onChange={(e) => setMedicalText(e.target.value)}
                placeholder="Enter patient's medical history, current medications, mobility status, cognitive assessment, and any relevant clinical notes..."
                className="mt-2 h-32"
              />
            </CardContent>
          </Card>

          {/* Risk Results */}
          {riskResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Assessment Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['deconditioning', 'vte', 'falls', 'pressure'].map((riskType) => {
                    const risk = riskResults[riskType];
                    if (!risk) return null;
                    
                    return (
                      <div key={riskType} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize flex items-center gap-1">
                            {riskType}
                            {riskType === 'deconditioning' && <DeconditioningInfoModal />}
                          </span>
                          {risk.probability >= 4 ?
                            <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          }
                        </div>
                        <div className={`text-2xl font-bold ${getRiskColor(risk.probability)}`}>
                          {risk.probability.toFixed(1)}%
                        </div>
                        <Badge variant={risk.probability >= 4 ? "destructive" : "secondary"} className="text-xs">
                          {risk.risk_level}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Mobility Recommendation */}
                {riskResults.stay_predictions?.mobility_recommendation && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Generated Mobility Recommendation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Power Target</div>
                          <div className="text-lg text-blue-600">
                            {riskResults.stay_predictions.mobility_recommendation.target_watts?.toFixed(1) || '35.0'}W
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-medium">Duration</div>
                          <div className="text-lg text-green-600">
                            {riskResults.stay_predictions.mobility_recommendation.session_duration_minutes || 15} min
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="font-medium">Resistance</div>
                          <div className="text-lg text-purple-600">
                            Level {riskResults.stay_predictions.mobility_recommendation.resistance_level || 5}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={handleCalculateRisks}
                disabled={isCalculating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isCalculating ? 'Calculating...' : 'Run Assessment'}
              </Button>
              {riskResults && (
                <Button 
                  onClick={onClose}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Recommendations
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}