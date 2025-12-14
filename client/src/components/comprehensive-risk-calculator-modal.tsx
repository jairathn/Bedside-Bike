import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator, User, Pill, Stethoscope, Activity, AlertTriangle, ArrowLeft, Heart, Bone, Brain, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Specific diagnosis options matching prescription-adjustments.ts
const DIAGNOSIS_OPTIONS = [
  { value: 'Total Knee Arthroplasty', label: 'Total Knee Arthroplasty', category: 'orthopedic' },
  { value: 'Hip Fracture', label: 'Hip Fracture', category: 'orthopedic' },
  { value: 'Total Hip Arthroplasty', label: 'Total Hip Arthroplasty', category: 'orthopedic' },
  { value: 'Stroke/CVA', label: 'Stroke/CVA', category: 'neurological' },
  { value: 'COPD Exacerbation', label: 'COPD Exacerbation', category: 'pulmonary' },
  { value: 'Heart Failure', label: 'Heart Failure', category: 'cardiac' },
  { value: 'ICU Stay/Critical Illness', label: 'ICU Stay/Critical Illness', category: 'icu_recovery' },
  { value: 'Delirium/Confusion', label: 'Delirium/Confusion', category: 'delirium' },
  { value: 'Frail Elderly (75+)', label: 'Frail Elderly (75+)', category: 'frail_elderly' },
  { value: 'General Medical/Surgical', label: 'General Medical/Surgical', category: 'general' },
] as const;

// Specific medication options matching prescription-adjustments.ts
const MEDICATION_OPTIONS = [
  // Beta Blockers
  { value: 'Metoprolol', label: 'Metoprolol', category: 'beta_blocker', group: 'Beta Blockers' },
  { value: 'Atenolol', label: 'Atenolol', category: 'beta_blocker', group: 'Beta Blockers' },
  { value: 'Carvedilol', label: 'Carvedilol', category: 'beta_blocker', group: 'Beta Blockers' },
  // Rate Control
  { value: 'Digoxin', label: 'Digoxin', category: 'rate_control', group: 'Rate Control' },
  { value: 'Diltiazem', label: 'Diltiazem', category: 'rate_control', group: 'Rate Control' },
  { value: 'Verapamil', label: 'Verapamil', category: 'rate_control', group: 'Rate Control' },
  // Diuretics
  { value: 'Furosemide', label: 'Furosemide (Lasix)', category: 'diuretic', group: 'Diuretics' },
  { value: 'Spironolactone', label: 'Spironolactone', category: 'diuretic', group: 'Diuretics' },
  { value: 'Hydrochlorothiazide', label: 'Hydrochlorothiazide', category: 'diuretic', group: 'Diuretics' },
  // Insulin
  { value: 'Insulin', label: 'Insulin (any type)', category: 'insulin', group: 'Diabetes' },
  // Anticoagulants
  { value: 'Warfarin', label: 'Warfarin', category: 'anticoagulant', group: 'Anticoagulants' },
  { value: 'Apixaban', label: 'Apixaban (Eliquis)', category: 'anticoagulant', group: 'Anticoagulants' },
  { value: 'Rivaroxaban', label: 'Rivaroxaban (Xarelto)', category: 'anticoagulant', group: 'Anticoagulants' },
  { value: 'Enoxaparin', label: 'Enoxaparin (Lovenox)', category: 'anticoagulant', group: 'Anticoagulants' },
  { value: 'Heparin', label: 'Heparin', category: 'anticoagulant', group: 'Anticoagulants' },
  // Sedating
  { value: 'Oxycodone', label: 'Oxycodone', category: 'sedating', group: 'Sedating Medications' },
  { value: 'Morphine', label: 'Morphine', category: 'sedating', group: 'Sedating Medications' },
  { value: 'Lorazepam', label: 'Lorazepam (Ativan)', category: 'sedating', group: 'Sedating Medications' },
  { value: 'Quetiapine', label: 'Quetiapine (Seroquel)', category: 'sedating', group: 'Sedating Medications' },
  { value: 'Haloperidol', label: 'Haloperidol (Haldol)', category: 'sedating', group: 'Sedating Medications' },
  // Antiparkinsonian
  { value: 'Carbidopa-Levodopa', label: 'Carbidopa-Levodopa (Sinemet)', category: 'antiparkinsonian', group: 'Parkinson\'s' },
] as const;

interface ComprehensiveRiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onGoalsGenerated: (goals: any[], riskResults: any) => void;
  // Optional initial patient data for auto-population
  initialPatientData?: {
    age?: number;
    sex?: string;
    weight_kg?: number;
    height_cm?: number;
    level_of_care?: string;
    mobility_status?: string;
    cognitive_status?: string;
    admission_diagnosis?: string;
    medications?: string[];
    comorbidities?: string[];
  };
}

export function ComprehensiveRiskCalculatorModal({
  isOpen,
  onClose,
  patientId,
  onGoalsGenerated,
  initialPatientData
}: ComprehensiveRiskCalculatorModalProps) {
  // Assessment State - MATCHING EXISTING PATIENT SCHEMA
  const [assessmentData, setAssessmentData] = useState({
    // Personal Details - matching schema exactly
    age: 65,
    sex: 'female',
    weight_kg: undefined as number | undefined,
    height_cm: undefined as number | undefined,
    level_of_care: 'ward',
    mobility_status: 'independent',
    cognitive_status: 'normal',
    baseline_function: 'independent',
    admission_diagnosis: '',

    // Arrays for structured data
    medications: [] as string[],
    comorbidities: [] as string[],
    devices: [] as string[],

    // NEW: Specific diagnosis selections (checkboxes)
    selected_diagnoses: [] as string[],
    other_diagnosis: '',

    // NEW: Specific medication selections (checkboxes)
    selected_medications: [] as string[],
    other_medications: '',

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

    // Current Medications - checkboxes (categories)
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

  // Auto-populate from initial patient data when modal opens
  useEffect(() => {
    if (isOpen && initialPatientData) {
      setAssessmentData(prev => ({
        ...prev,
        age: initialPatientData.age || prev.age,
        sex: initialPatientData.sex || prev.sex,
        weight_kg: initialPatientData.weight_kg,
        height_cm: initialPatientData.height_cm,
        level_of_care: initialPatientData.level_of_care || prev.level_of_care,
        mobility_status: initialPatientData.mobility_status || prev.mobility_status,
        cognitive_status: initialPatientData.cognitive_status || prev.cognitive_status,
        admission_diagnosis: initialPatientData.admission_diagnosis || prev.admission_diagnosis,
        medications: initialPatientData.medications || prev.medications,
        comorbidities: initialPatientData.comorbidities || prev.comorbidities,
        // Auto-select matching diagnoses from the options
        selected_diagnoses: initialPatientData.admission_diagnosis ?
          DIAGNOSIS_OPTIONS
            .filter(opt => initialPatientData.admission_diagnosis?.toLowerCase().includes(opt.value.toLowerCase()))
            .map(opt => opt.value) : [],
        // Auto-select matching medications from the options
        selected_medications: initialPatientData.medications ?
          MEDICATION_OPTIONS
            .filter(opt => initialPatientData.medications?.some(m => m.toLowerCase().includes(opt.value.toLowerCase())))
            .map(opt => opt.value) : []
      }));
    }
  }, [isOpen, initialPatientData]);

  // Auto-map specific medications to their category checkboxes
  useEffect(() => {
    const selectedMeds = assessmentData.selected_medications;

    // Check if any selected medication belongs to each category
    const hasAnticoagulant = selectedMeds.some(med =>
      MEDICATION_OPTIONS.find(opt => opt.value === med)?.category === 'anticoagulant'
    );
    const hasSedating = selectedMeds.some(med =>
      MEDICATION_OPTIONS.find(opt => opt.value === med)?.category === 'sedating'
    );

    // Auto-update category checkboxes based on specific medication selections
    setAssessmentData(prev => {
      const updates: Partial<typeof prev> = {};

      // Only update if the value would change (to avoid infinite loops)
      if (hasAnticoagulant && !prev.on_anticoagulants) {
        updates.on_anticoagulants = true;
        updates.no_medications = false;
      }
      if (hasSedating && !prev.on_sedating_medications) {
        updates.on_sedating_medications = true;
        updates.no_medications = false;
      }

      // If no updates needed, return prev to avoid re-render
      if (Object.keys(updates).length === 0) return prev;

      return { ...prev, ...updates };
    });
  }, [assessmentData.selected_medications]);

  // Conditional admission diagnosis visibility
  const [showAdmissionDiagnosis, setShowAdmissionDiagnosis] = useState(false);
  const [showOtherMedications, setShowOtherMedications] = useState(false);

  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  // Handle diagnosis checkbox changes
  const handleDiagnosisChange = (diagnosisValue: string, checked: boolean) => {
    setAssessmentData(prev => ({
      ...prev,
      selected_diagnoses: checked
        ? [...prev.selected_diagnoses, diagnosisValue]
        : prev.selected_diagnoses.filter(d => d !== diagnosisValue)
    }));
  };

  // Handle medication checkbox changes
  const handleMedicationChange = (medicationValue: string, checked: boolean) => {
    setAssessmentData(prev => ({
      ...prev,
      selected_medications: checked
        ? [...prev.selected_medications, medicationValue]
        : prev.selected_medications.filter(m => m !== medicationValue)
    }));
  };

  // Get grouped medications for display
  const getMedicationGroups = () => {
    const groups: Record<string, typeof MEDICATION_OPTIONS[number][]> = {};
    MEDICATION_OPTIONS.forEach(med => {
      if (!groups[med.group]) {
        groups[med.group] = [];
      }
      groups[med.group].push(med);
    });
    return groups;
  };

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
      // Generate admission diagnosis from selected categories OR use specific selections
      let diagnosisText = assessmentData.admission_diagnosis || '';

      // If specific diagnoses are selected, use those for the diagnosis text
      if (assessmentData.selected_diagnoses.length > 0) {
        diagnosisText = assessmentData.selected_diagnoses.join(', ');
      } else if (!diagnosisText && !assessmentData.admission_other) {
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

      // Add "other" diagnosis if specified
      if (assessmentData.other_diagnosis) {
        diagnosisText = diagnosisText ? `${diagnosisText}, ${assessmentData.other_diagnosis}` : assessmentData.other_diagnosis;
      }

      // Combine selected medications with other medications
      const allMedications = [
        ...assessmentData.selected_medications,
        ...(assessmentData.other_medications ? [assessmentData.other_medications] : [])
      ];

      // Prepare data matching exact schema requirements
      const requestData = {
        patientId: parseInt(patientId),
        ...assessmentData,
        admission_diagnosis: diagnosisText,
        // NEW: Include specific diagnosis and medication selections
        selected_diagnoses: assessmentData.selected_diagnoses,
        selected_medications: allMedications,
        other_diagnosis: assessmentData.other_diagnosis,
        other_medications: assessmentData.other_medications,
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
      // Now using the enhanced recommendation with baseline and adjusted values
      if (response.mobility_recommendation) {
        const recommendation = response.mobility_recommendation;

        // Use adjusted values (which are already applied based on diagnosis/medications)
        const adjustedDuration = recommendation.duration_min_per_session || 15;
        const adjustedPower = recommendation.watt_goal || 35;
        const adjustedResistance = recommendation.resistance_level || 5;
        const adjustedSessions = recommendation.sessions_per_day || 2;
        const totalEnergy = recommendation.total_daily_energy ||
          (adjustedPower * adjustedDuration * adjustedSessions);

        // Check if adjustments were applied
        const hasAdjustments = recommendation.adjustments_applied || false;

        const newGoals = [
          {
            goalType: 'duration',
            targetValue: adjustedDuration.toString(),
            label: hasAdjustments ? 'Adjusted Duration' : 'Evidence-Based Duration',
            subtitle: hasAdjustments
              ? `${recommendation.baseline?.duration_min_per_session || adjustedDuration}→${adjustedDuration} min (${recommendation.primary_diagnosis_category || 'adjusted'})`
              : `${adjustedDuration} min per session`
          },
          {
            goalType: 'power',
            targetValue: adjustedPower.toString(),
            label: hasAdjustments ? 'Adjusted Power Target' : 'Evidence-Based Power Target',
            subtitle: hasAdjustments
              ? `${recommendation.baseline?.watt_goal || adjustedPower}→${adjustedPower}W (diagnosis-adjusted)`
              : `${adjustedPower}W average`
          },
          {
            goalType: 'resistance',
            targetValue: adjustedResistance.toString(),
            label: 'Resistance Level',
            subtitle: `Level ${adjustedResistance}`
          },
          {
            goalType: 'sessions',
            targetValue: adjustedSessions.toString(),
            label: 'Sessions Per Day',
            subtitle: `${adjustedSessions} sessions daily`
          },
          {
            goalType: 'energy',
            targetValue: totalEnergy.toString(),
            label: 'Total Daily Energy',
            subtitle: `${totalEnergy} Watt-Minutes`
          }
        ];

        // Pass goals back to provider interface with full risk results
        // The response now includes baseline, adjusted, and rationale
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

          {/* NEW: Specific Diagnosis Selection for Prescription Adjustments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Specific Diagnosis
                <Badge variant="secondary" className="text-xs">For Prescription Adjustments</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">Select the primary diagnosis that most affects mobility prescription. This fine-tunes resistance, RPM, and duration recommendations.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DIAGNOSIS_OPTIONS.map((diagnosis) => (
                  <div key={diagnosis.value} className="flex items-start space-x-2">
                    <Checkbox
                      id={`diag-${diagnosis.value}`}
                      checked={assessmentData.selected_diagnoses.includes(diagnosis.value)}
                      onCheckedChange={(checked) => handleDiagnosisChange(diagnosis.value, checked as boolean)}
                    />
                    <div className="grid gap-0.5">
                      <Label htmlFor={`diag-${diagnosis.value}`} className="font-medium cursor-pointer">
                        {diagnosis.label}
                      </Label>
                      <span className="text-xs text-gray-500">
                        {diagnosis.category === 'orthopedic' && '↓ Resistance, ↑ ROM/rotations'}
                        {diagnosis.category === 'cardiac' && '↑ Resistance, ↓ RPM (cardiac safe)'}
                        {diagnosis.category === 'pulmonary' && '↑ Resistance, ↓ RPM (respiratory)'}
                        {diagnosis.category === 'neurological' && 'Balanced, coordination focus'}
                        {diagnosis.category === 'icu_recovery' && 'Very gentle, progressive'}
                        {diagnosis.category === 'delirium' && 'Simplified, shorter sessions'}
                        {diagnosis.category === 'frail_elderly' && 'Low intensity, safety focus'}
                        {diagnosis.category === 'general' && 'Standard evidence-based'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Other diagnosis free text */}
              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="other_diagnosis" className="text-sm font-medium">Other Diagnosis (optional)</Label>
                <Input
                  id="other_diagnosis"
                  value={assessmentData.other_diagnosis}
                  onChange={(e) => setAssessmentData({...assessmentData, other_diagnosis: e.target.value})}
                  placeholder="e.g., Parkinson's disease, Multiple sclerosis"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* NEW: Specific Medications for Prescription Adjustments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-500" />
                Specific Medications
                <Badge variant="secondary" className="text-xs">For Prescription Adjustments</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">Select specific medications that affect exercise prescription. Beta blockers and rate control meds require resistance-focused (not RPM-focused) exercise.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(getMedicationGroups()).map(([group, meds]) => (
                  <div key={group} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">{group}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-2">
                      {meds.map((med) => (
                        <div key={med.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`med-${med.value}`}
                            checked={assessmentData.selected_medications.includes(med.value)}
                            onCheckedChange={(checked) => handleMedicationChange(med.value, checked as boolean)}
                          />
                          <Label htmlFor={`med-${med.value}`} className="text-sm cursor-pointer">
                            {med.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Other medications free text */}
              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="other_medications" className="text-sm font-medium">Other Medications (optional)</Label>
                <Input
                  id="other_medications"
                  value={assessmentData.other_medications}
                  onChange={(e) => setAssessmentData({...assessmentData, other_medications: e.target.value})}
                  placeholder="e.g., Gabapentin, Duloxetine"
                  className="mt-1"
                />
              </div>
              {/* Info box about medication adjustments */}
              {assessmentData.selected_medications.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Medication Adjustments Applied:</strong>
                      <ul className="mt-1 list-disc pl-4 space-y-0.5">
                        {assessmentData.selected_medications.some(m => ['Metoprolol', 'Atenolol', 'Carvedilol'].includes(m)) && (
                          <li>Beta blocker: Focus on resistance, reduce RPM targets (HR blunted)</li>
                        )}
                        {assessmentData.selected_medications.some(m => ['Digoxin', 'Diltiazem', 'Verapamil'].includes(m)) && (
                          <li>Rate control: Focus on resistance, avoid high RPM</li>
                        )}
                        {assessmentData.selected_medications.some(m => ['Furosemide', 'Spironolactone', 'Hydrochlorothiazide'].includes(m)) && (
                          <li>Diuretic: Monitor for fatigue, slightly shorter sessions</li>
                        )}
                        {assessmentData.selected_medications.some(m => ['Oxycodone', 'Morphine', 'Lorazepam', 'Quetiapine', 'Haloperidol'].includes(m)) && (
                          <li>Sedating medication: Reduced intensity, close supervision</li>
                        )}
                        {assessmentData.selected_medications.includes('Insulin') && (
                          <li>Insulin: Glucose monitoring, have snack available</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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