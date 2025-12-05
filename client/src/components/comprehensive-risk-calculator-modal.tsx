import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, User, Pill, Stethoscope, Activity, AlertTriangle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ComprehensiveRiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onGoalsGenerated: (goals: any[], riskResults: any) => void;
}

export function ComprehensiveRiskCalculatorModal({ 
  isOpen, 
  onClose, 
  patientId, 
  onGoalsGenerated 
}: ComprehensiveRiskCalculatorModalProps) {
  // Assessment State - MATCHING EXISTING PATIENT SCHEMA
  const [assessmentData, setAssessmentData] = useState({
    // Personal Details - matching schema exactly
    age: 65,
    sex: 'female',
    weight_kg: undefined,
    height_cm: undefined,
    level_of_care: 'ward',
    mobility_status: 'independent',
    cognitive_status: 'normal',
    baseline_function: 'independent',
    admission_diagnosis: '',
    
    // Arrays for structured data
    medications: [],
    comorbidities: [],
    devices: [],
    
    // Admission Type - checkboxes
    is_postoperative: false,
    is_trauma_admission: false,
    is_sepsis: false,
    is_cardiac_admission: false,
    is_neuro_admission: false,
    is_orthopedic: false,
    is_oncology: false,
    admission_other: false,
    no_admission_type: false,
    
    // Current Medications - checkboxes
    on_sedating_medications: false,
    on_anticoagulants: false,
    on_steroids: false,
    no_medications: false,
    
    // Medical Conditions - checkboxes  
    has_diabetes: false,
    has_obesity: false,
    has_parkinson: false,
    has_active_cancer: false,
    has_malnutrition: false,
    has_neuropathy: false,
    has_stroke_history: false,
    has_vte_history: false,
    no_medical_conditions: false,
    
    // Devices & Lines - checkboxes
    has_foley_catheter: false,
    has_central_line: false,
    has_feeding_tube: false,
    has_ventilator: false,
    no_devices: false,
    
    // Additional Risk Factors - matching schema
    on_vte_prophylaxis: true,
    incontinent: false,
    albumin_low: false,
    days_immobile: 0
  });

  // Conditional admission diagnosis visibility
  const [showAdmissionDiagnosis, setShowAdmissionDiagnosis] = useState(false);
  
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  // Handle checkbox changes with mutual exclusion logic
  const handleCheckboxChange = (field: keyof typeof assessmentData, checked: boolean, exclusiveGroup?: string[]) => {
    setAssessmentData(prev => {
      const newData = { ...prev, [field]: checked };
      
      // Handle mutual exclusion for "None of the above" options
      if (exclusiveGroup && checked) {
        exclusiveGroup.forEach(exclusiveField => {
          if (exclusiveField !== field) {
            (newData as any)[exclusiveField] = false;
          }
        });
      }

      // Show admission diagnosis when "other" is selected
      if (field === 'admission_other') {
        setShowAdmissionDiagnosis(checked as boolean);
        if (!checked) {
          newData.admission_diagnosis = '';
        }
      }
      
      return newData;
    });
  };

  const handleRunAssessment = async () => {
    // Age validation (pre-filled, so just check it exists and is reasonable)
    if (!assessmentData.age || assessmentData.age < 16 || assessmentData.age > 110) {
      toast({
        title: "Invalid Age",
        description: "Please enter a valid age between 16 and 110",
        variant: "destructive"
      });
      return;
    }

    // Skip diagnosis validation for now - categories provide enough context
    // (admission_diagnosis will be auto-generated from selected categories)

    setIsCalculating(true);
    try {
      // Generate admission diagnosis from selected categories
      let diagnosisText = assessmentData.admission_diagnosis || '';
      if (!diagnosisText && !assessmentData.admission_other) {
        const selectedTypes = [];
        if (assessmentData.is_postoperative) selectedTypes.push("post-operative");
        if (assessmentData.is_trauma_admission) selectedTypes.push("trauma");
        if (assessmentData.is_sepsis) selectedTypes.push("sepsis");
        if (assessmentData.is_cardiac_admission) selectedTypes.push("cardiac");
        if (assessmentData.is_neuro_admission) selectedTypes.push("neurological");
        if (assessmentData.is_orthopedic) selectedTypes.push("orthopedic");
        if (assessmentData.is_oncology) selectedTypes.push("oncology");
        
        diagnosisText = selectedTypes.length > 0 ? selectedTypes.join(", ") + " admission" : "general admission";
      }

      // Prepare data matching exact schema requirements
      const requestData = {
        patientId: parseInt(patientId),
        ...assessmentData,
        admission_diagnosis: diagnosisText,
        // Convert weight/height properly
        weight_kg: assessmentData.weight_kg || null,
        height_cm: assessmentData.height_cm || null
      };

      console.log('Sending assessment data:', requestData);

      // Call evidence-based risk assessment API with structured data
      const response = await apiRequest('/api/risk-assessment', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      // Extract therapeutic recommendations and convert to goals
      if (response.mobility_recommendation) {
        const recommendation = response.mobility_recommendation;
        const newGoals = [
          {
            goalType: 'duration',
            targetValue: (recommendation.session_duration_minutes || 15).toString(),
            label: 'Evidence-Based Duration',
            subtitle: 'Based on comprehensive risk profile'
          },
          {
            goalType: 'power',
            targetValue: recommendation.target_watts?.toString() || '35.0',
            label: 'Evidence-Based Power Target', 
            subtitle: 'Optimized for clinical outcomes'
          }
        ];

        // Pass goals back to provider interface with risk results
        onGoalsGenerated(newGoals, response);
        
        toast({
          title: "Risk Assessment Complete",
          description: "Evidence-based goals have been loaded into the goal editor"
        });
        
        onClose(); // Close modal after successful assessment
      }
    } catch (error: any) {
      console.error('Assessment error:', error);
      toast({
        title: "Assessment Failed",
        description: error.message || "Failed to calculate risks",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="text-xl font-medium">Personalized Goal Calculator</DialogTitle>
          </div>
          <div className="text-sm text-gray-600">Welcome, Provider</div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={assessmentData.age}
                  onChange={(e) => setAssessmentData({...assessmentData, age: parseInt(e.target.value) || 65})}
                  placeholder="65"
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select
                  value={assessmentData.sex}
                  onValueChange={(value) => setAssessmentData({...assessmentData, sex: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Female" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={assessmentData.weight_kg || ''}
                  onChange={(e) => setAssessmentData({...assessmentData, weight_kg: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="e.g. 70.5"
                />
                <p className="text-xs text-gray-500 mt-1">Optional - enables personalized W/kg calculation</p>
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={assessmentData.height_cm || ''}
                  onChange={(e) => setAssessmentData({...assessmentData, height_cm: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="e.g. 175.5"
                />
                <p className="text-xs text-gray-500 mt-1">Optional - enables BMI-based safety adjustments</p>
              </div>
              <div>
                <Label htmlFor="level_of_care">Level of Care</Label>
                <Select
                  value={assessmentData.level_of_care}
                  onValueChange={(value) => setAssessmentData({...assessmentData, level_of_care: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ward">Ward</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="step_down">Step Down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mobility_status">Mobility Status</Label>
                <Select
                  value={assessmentData.mobility_status}
                  onValueChange={(value) => setAssessmentData({...assessmentData, mobility_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="walking_assist">Walking Assist</SelectItem>
                    <SelectItem value="standing_assist">Standing Assist</SelectItem>
                    <SelectItem value="chair_bound">Chair Bound</SelectItem>
                    <SelectItem value="bedbound">Bedbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cognitive_status">Cognitive Status</Label>
                <Select
                  value={assessmentData.cognitive_status}
                  onValueChange={(value) => setAssessmentData({...assessmentData, cognitive_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="mild_impairment">Mild Impairment</SelectItem>
                    <SelectItem value="delirium_dementia">Delirium/Dementia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Conditional Admission Diagnosis - Only when "Other" selected */}
          {showAdmissionDiagnosis && (
            <Card>
              <CardHeader>
                <CardTitle>Admission Diagnosis Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="admission_diagnosis">Primary admission diagnosis</Label>
                  <Input
                    id="admission_diagnosis"
                    value={assessmentData.admission_diagnosis}
                    onChange={(e) => setAssessmentData({...assessmentData, admission_diagnosis: e.target.value})}
                    placeholder="e.g. Acute myocardial infarction, Hip fracture, Pneumonia"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admission Type Section */}
          <Card>
            <CardHeader>
              <CardTitle>Admission Type</CardTitle>
              <p className="text-sm text-gray-600">Select all that apply</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="postop"
                    checked={assessmentData.is_postoperative}
                    onCheckedChange={(checked) => handleCheckboxChange('is_postoperative', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="postop">Post-operative</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trauma"
                    checked={assessmentData.is_trauma_admission}
                    onCheckedChange={(checked) => handleCheckboxChange('is_trauma_admission', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="trauma">Trauma</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sepsis"
                    checked={assessmentData.is_sepsis}
                    onCheckedChange={(checked) => handleCheckboxChange('is_sepsis', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="sepsis">Sepsis/Infection</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cardiac"
                    checked={assessmentData.is_cardiac_admission}
                    onCheckedChange={(checked) => handleCheckboxChange('is_cardiac_admission', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="cardiac">Cardiac</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="neuro"
                    checked={assessmentData.is_neuro_admission}
                    onCheckedChange={(checked) => handleCheckboxChange('is_neuro_admission', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="neuro">Neurological</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="orthopedic"
                    checked={assessmentData.is_orthopedic}
                    onCheckedChange={(checked) => handleCheckboxChange('is_orthopedic', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="orthopedic">Orthopedic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="oncology"
                    checked={assessmentData.is_oncology}
                    onCheckedChange={(checked) => handleCheckboxChange('is_oncology', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="oncology">Oncology</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="other_admission"
                    checked={assessmentData.admission_other}
                    onCheckedChange={(checked) => handleCheckboxChange('admission_other', checked as boolean, ['no_admission_type'])}
                  />
                  <Label htmlFor="other_admission">Other admission type</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    id="no_admission"
                    checked={assessmentData.no_admission_type}
                    onCheckedChange={(checked) => handleCheckboxChange('no_admission_type', checked as boolean, ['is_postoperative', 'is_trauma_admission', 'is_sepsis', 'is_cardiac_admission', 'is_neuro_admission', 'is_orthopedic', 'is_oncology', 'admission_other'])}
                  />
                  <Label htmlFor="no_admission">None of the above</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Medications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-red-500" />
                Current Medications
                <Badge variant="destructive" className="text-xs">High-Risk Categories</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sedating"
                    checked={assessmentData.on_sedating_medications}
                    onCheckedChange={(checked) => handleCheckboxChange('on_sedating_medications', checked as boolean, ['no_medications'])}
                  />
                  <div>
                    <Label htmlFor="sedating" className="font-medium">Sedating Medications</Label>
                    <p className="text-sm text-gray-500">Benzodiazepines, opioids, antipsychotics (quetiapine, haloperidol), sleep aids</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anticoagulants"
                    checked={assessmentData.on_anticoagulants}
                    onCheckedChange={(checked) => handleCheckboxChange('on_anticoagulants', checked as boolean, ['no_medications'])}
                  />
                  <div>
                    <Label htmlFor="anticoagulants" className="font-medium">Anticoagulants</Label>
                    <p className="text-sm text-gray-500">Heparin, warfarin, DOACs (apixaban, rivaroxaban, dabigatran)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="steroids"
                    checked={assessmentData.on_steroids}
                    onCheckedChange={(checked) => handleCheckboxChange('on_steroids', checked as boolean, ['no_medications'])}
                  />
                  <div>
                    <Label htmlFor="steroids" className="font-medium">Corticosteroids</Label>
                    <p className="text-sm text-gray-500">Prednisolone, methylprednisolone, dexamethasone, hydrocortisone</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no_meds"
                    checked={assessmentData.no_medications}
                    onCheckedChange={(checked) => handleCheckboxChange('no_medications', checked as boolean, ['on_sedating_medications', 'on_anticoagulants', 'on_steroids'])}
                  />
                  <Label htmlFor="no_meds" className="font-medium">None of these medications</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Conditions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-500" />
                Medical Conditions
                <Badge variant="outline" className="text-xs">Risk Categories</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="diabetes"
                    checked={assessmentData.has_diabetes}
                    onCheckedChange={(checked) => handleCheckboxChange('has_diabetes', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="diabetes">Diabetes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="malnutrition"
                    checked={assessmentData.has_malnutrition}
                    onCheckedChange={(checked) => handleCheckboxChange('has_malnutrition', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="malnutrition">Malnutrition</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="obesity"
                    checked={assessmentData.has_obesity}
                    onCheckedChange={(checked) => handleCheckboxChange('has_obesity', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="obesity">Obesity (BMI &gt;30)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="neuropathy"
                    checked={assessmentData.has_neuropathy}
                    onCheckedChange={(checked) => handleCheckboxChange('has_neuropathy', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="neuropathy">Neuropathy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parkinsons"
                    checked={assessmentData.has_parkinson}
                    onCheckedChange={(checked) => handleCheckboxChange('has_parkinson', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="parkinsons">Parkinson's Disease</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stroke"
                    checked={assessmentData.has_stroke_history}
                    onCheckedChange={(checked) => handleCheckboxChange('has_stroke_history', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="stroke">Previous Stroke</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cancer"
                    checked={assessmentData.has_active_cancer}
                    onCheckedChange={(checked) => handleCheckboxChange('has_active_cancer', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="cancer">Active Cancer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vte_history"
                    checked={assessmentData.has_vte_history}
                    onCheckedChange={(checked) => handleCheckboxChange('has_vte_history', checked as boolean, ['no_medical_conditions'])}
                  />
                  <Label htmlFor="vte_history">VTE History</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    id="no_conditions"
                    checked={assessmentData.no_medical_conditions}
                    onCheckedChange={(checked) => handleCheckboxChange('no_medical_conditions', checked as boolean, ['has_diabetes', 'has_malnutrition', 'has_obesity', 'has_neuropathy', 'has_parkinson', 'has_stroke_history', 'has_active_cancer', 'has_vte_history'])}
                  />
                  <Label htmlFor="no_conditions">None of these conditions</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devices & Lines Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Devices & Lines
                <Badge variant="secondary" className="text-xs">Fall Risk</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="foley"
                    checked={assessmentData.has_foley_catheter}
                    onCheckedChange={(checked) => handleCheckboxChange('has_foley_catheter', checked as boolean, ['no_devices'])}
                  />
                  <Label htmlFor="foley">Foley Catheter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="central_line"
                    checked={assessmentData.has_central_line}
                    onCheckedChange={(checked) => handleCheckboxChange('has_central_line', checked as boolean, ['no_devices'])}
                  />
                  <Label htmlFor="central_line">Central Line</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="feeding_tube"
                    checked={assessmentData.has_feeding_tube}
                    onCheckedChange={(checked) => handleCheckboxChange('has_feeding_tube', checked as boolean, ['no_devices'])}
                  />
                  <Label htmlFor="feeding_tube">Feeding Tube</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ventilator"
                    checked={assessmentData.has_ventilator}
                    onCheckedChange={(checked) => handleCheckboxChange('has_ventilator', checked as boolean, ['no_devices'])}
                  />
                  <Label htmlFor="ventilator">Ventilator</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    id="no_devices"
                    checked={assessmentData.no_devices}
                    onCheckedChange={(checked) => handleCheckboxChange('no_devices', checked as boolean, ['has_foley_catheter', 'has_central_line', 'has_feeding_tube', 'has_ventilator'])}
                  />
                  <Label htmlFor="no_devices">None of these devices</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Risk Factors Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Additional Risk Factors
                <Badge variant="outline" className="text-xs">Clinical Markers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vte_prophylaxis"
                    checked={assessmentData.on_vte_prophylaxis}
                    onCheckedChange={(checked) => setAssessmentData({...assessmentData, on_vte_prophylaxis: checked as boolean})}
                  />
                  <Label htmlFor="vte_prophylaxis">VTE Prophylaxis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incontinence"
                    checked={assessmentData.incontinent}
                    onCheckedChange={(checked) => setAssessmentData({...assessmentData, incontinent: checked as boolean})}
                  />
                  <Label htmlFor="incontinence">Incontinence</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="low_albumin"
                    checked={assessmentData.albumin_low}
                    onCheckedChange={(checked) => setAssessmentData({...assessmentData, albumin_low: checked as boolean})}
                  />
                  <Label htmlFor="low_albumin">Low Albumin</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Separator />
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRunAssessment}
              disabled={isCalculating}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {isCalculating ? "Running Assessment..." : "Run Assessment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}