import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator, ArrowLeft, Activity, TrendingUp, AlertTriangle,
  Target, Clock, Calendar, Home, Heart
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { DeconditioningInfoModal } from "@/components/deconditioning-info-modal";

interface AnonymousRiskCalculatorProps {}

export default function AnonymousRiskCalculator({}: AnonymousRiskCalculatorProps) {
  const { toast } = useToast();
  
  // Assessment State - matching the existing patient schema
  const [assessmentData, setAssessmentData] = useState({
    age: 65,
    sex: 'female',
    weight_kg: undefined,
    height_cm: undefined,
    level_of_care: 'ward',
    mobility_status: 'independent',
    cognitive_status: 'normal',
    baseline_function: 'independent',
    admission_diagnosis: '',
    
    medications: [],
    comorbidities: [],
    devices: [],
    
    // Admission Type checkboxes
    is_postoperative: false,
    is_trauma_admission: false,
    is_sepsis: false,
    is_cardiac_admission: false,
    is_neuro_admission: false,
    is_orthopedic: false,
    is_oncology: false,
    admission_other: false,
    no_admission_type: false,
    
    // Current Medications checkboxes
    on_sedating_medications: false,
    on_anticoagulants: false,
    on_steroids: false,
    no_medications: false,
    
    // Medical Conditions checkboxes
    has_diabetes: false,
    has_obesity: false,
    has_parkinson: false,
    has_active_cancer: false,
    has_malnutrition: false,
    has_neuropathy: false,
    has_stroke_history: false,
    has_vte_history: false,
    no_medical_conditions: false,
    
    // Devices & Lines checkboxes
    has_foley_catheter: false,
    has_central_line: false,
    has_feeding_tube: false,
    has_ventilator: false,
    no_devices: false,
    
    // Additional Risk Factors
    on_vte_prophylaxis: true,
    incontinent: false,
    albumin_low: false,
    days_immobile: 0
  });

  const [showAdmissionDiagnosis, setShowAdmissionDiagnosis] = useState(false);
  const [riskResults, setRiskResults] = useState<any>(null);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  
  // Free text inputs for medical processing
  const [freeTextInputs, setFreeTextInputs] = useState({
    admission_diagnosis: '',
    current_medications: '',
    medical_conditions: '',
    devices_lines: ''
  });

  // Anonymous risk calculation mutation
  const calculateRiskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/anonymous-risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate risk');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setRiskResults(data);
      toast({
        title: "Risk Assessment Complete",
        description: "Your personalized mobility recommendations are ready",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Calculation failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    },
  });

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
        setShowAdmissionDiagnosis(checked);
      }

      return newData;
    });
  };

  const handleCalculateRisk = () => {
    // Ensure admission_diagnosis has a value for validation
    const dataToSubmit = {
      ...assessmentData,
      admission_diagnosis: assessmentData.admission_diagnosis || freeTextInputs.admission_diagnosis || 'General admission'
    };
    calculateRiskMutation.mutate(dataToSubmit);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getRiskIcon = (type: string) => {
    switch (type) {
      case "deconditioning": return <TrendingUp className="w-4 h-4" />;
      case "vte": return <Activity className="w-4 h-4" />;
      case "falls": return <AlertTriangle className="w-4 h-4" />;
      case "pressure": return <AlertTriangle className="w-4 h-4" />;
      default: return <Calculator className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => window.location.href = '/'} className="mr-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <Heart className="w-6 h-6 text-red-500" />
                <h1 className="text-xl font-semibold text-gray-900">Anonymous Risk Calculator</h1>
              </div>
            </div>
            <span className="text-sm text-gray-600">No account required • Results not saved</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!riskResults ? (
          <div className="max-w-6xl mx-auto">
            {/* Anonymous disclaimer */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  <strong>Anonymous Demo:</strong> This calculator provides the same personalized risk assessment 
                  and mobility recommendations as our full platform. Your data is processed but not stored anywhere.
                </p>
              </CardContent>
            </Card>

            {/* Personal Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-600" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={assessmentData.age || ""}
                      onChange={(e) => setAssessmentData(prev => ({
                        ...prev,
                        age: parseInt(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sex">Sex</Label>
                    <Select 
                      value={assessmentData.sex || ""} 
                      onValueChange={(value) => setAssessmentData(prev => ({
                        ...prev, 
                        sex: value as "male" | "female"
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={assessmentData.weight_kg || ""}
                      onChange={(e) => setAssessmentData(prev => ({
                        ...prev,
                        weight_kg: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={assessmentData.height_cm || ""}
                      onChange={(e) => setAssessmentData(prev => ({
                        ...prev,
                        height_cm: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="levelOfCare">Level of Care</Label>
                    <Select 
                      value={assessmentData.level_of_care || ""} 
                      onValueChange={(value) => setAssessmentData(prev => ({
                        ...prev, 
                        level_of_care: value as "icu" | "stepdown" | "ward" | "rehab"
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="icu">ICU</SelectItem>
                        <SelectItem value="stepdown">Step-Down</SelectItem>
                        <SelectItem value="ward">Ward</SelectItem>
                        <SelectItem value="rehab">Rehabilitation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mobilityStatus">Mobility Status</Label>
                    <Select 
                      value={assessmentData.mobility_status || ""} 
                      onValueChange={(value) => setAssessmentData(prev => ({
                        ...prev, 
                        mobility_status: value as "bedbound" | "chair_bound" | "standing_assist" | "walking_assist" | "independent"
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mobility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bedbound">Bedbound</SelectItem>
                        <SelectItem value="chair_bound">Chair Bound</SelectItem>
                        <SelectItem value="standing_assist">Standing with Assist</SelectItem>
                        <SelectItem value="walking_assist">Walking with Assist</SelectItem>
                        <SelectItem value="independent">Independent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="cognitive_status">Cognitive Status</Label>
                  <Select 
                    value={assessmentData.cognitive_status || ""} 
                    onValueChange={(value) => setAssessmentData(prev => ({
                      ...prev, 
                      cognitive_status: value as "normal" | "mild_impairment" | "delirium_dementia"
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cognitive status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="mild_impairment">Mild Impairment</SelectItem>
                      <SelectItem value="delirium_dementia">Delirium/Dementia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-6" />

                {/* Admission Type Checkboxes */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Admission Type</h4>
                  <p className="text-sm text-gray-600 mb-4">Select all that apply</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="postoperative"
                        checked={assessmentData.is_postoperative || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_postoperative: checked as boolean }))
                        }
                      />
                      <Label htmlFor="postoperative" className="text-sm font-medium">Post-operative</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="trauma"
                        checked={assessmentData.is_trauma_admission || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_trauma_admission: checked as boolean }))
                        }
                      />
                      <Label htmlFor="trauma" className="text-sm font-medium">Trauma</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="sepsis"
                        checked={assessmentData.is_sepsis || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_sepsis: checked as boolean }))
                        }
                      />
                      <Label htmlFor="sepsis" className="text-sm font-medium">Sepsis/Infection</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="cardiac"
                        checked={assessmentData.is_cardiac_admission || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_cardiac_admission: checked as boolean }))
                        }
                      />
                      <Label htmlFor="cardiac" className="text-sm font-medium">Cardiac</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="neuro"
                        checked={assessmentData.is_neuro_admission || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_neuro_admission: checked as boolean }))
                        }
                      />
                      <Label htmlFor="neuro" className="text-sm font-medium">Neurological</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="orthopedic"
                        checked={assessmentData.is_orthopedic || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_orthopedic: checked as boolean }))
                        }
                      />
                      <Label htmlFor="orthopedic" className="text-sm font-medium">Orthopedic</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="oncology"
                        checked={assessmentData.is_oncology || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, is_oncology: checked as boolean }))
                        }
                      />
                      <Label htmlFor="oncology" className="text-sm font-medium">Oncology</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="admission_other"
                        checked={assessmentData.admission_other || false}
                        onCheckedChange={(checked) => {
                          handleCheckboxChange('admission_other', checked as boolean);
                        }}
                      />
                      <Label htmlFor="admission_other" className="text-sm font-medium">Other admission type</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="no_admission_type"
                        checked={assessmentData.no_admission_type || false}
                        onCheckedChange={(checked) => 
                          setAssessmentData(prev => ({ ...prev, no_admission_type: checked as boolean }))
                        }
                      />
                      <Label htmlFor="no_admission_type" className="text-sm font-medium">None of the above</Label>
                    </div>
                  </div>
                </div>

                {/* Conditional Text Field for Other Admission Type */}
                {assessmentData.admission_other && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Label htmlFor="other_admission_text">Describe Other Admission Type</Label>
                    <Textarea
                      id="other_admission_text"
                      placeholder="e.g., 'psychiatric admission for bipolar disorder'"
                      value={freeTextInputs.admission_diagnosis}
                      onChange={(e) => setFreeTextInputs(prev => ({
                        ...prev,
                        admission_diagnosis: e.target.value
                      }))}
                      className="mt-2"
                    />
                  </div>
                )}

                <Separator className="my-6" />
              </CardContent>
            </Card>

            {/* Desktop Optimized Layout - Structured Risk Factor Checkboxes */}
            <div className="grid lg:grid-cols-2 gap-6 xl:gap-8">
              {/* Medication Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💊 Current Medications
                    <Badge variant="outline" className="text-xs">High-Risk Categories</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="sedating_meds"
                        checked={assessmentData.on_sedating_medications || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('on_sedating_medications', checked as boolean, ['no_medications'])
                        }
                      />
                      <Label htmlFor="sedating_meds" className="text-sm font-medium">
                        Sedating Medications
                        <div className="text-xs text-gray-600 font-normal">
                          Benzodiazepines, opioids, antipsychotics (quetiapine, haloperidol), sleep aids
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="anticoagulants"
                        checked={assessmentData.on_anticoagulants || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('on_anticoagulants', checked as boolean, ['no_medications'])
                        }
                      />
                      <Label htmlFor="anticoagulants" className="text-sm font-medium">
                        Anticoagulants
                        <div className="text-xs text-gray-600 font-normal">
                          Heparin, warfarin, DOACs (apixaban, rivaroxaban, dabigatran)
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="steroids"
                        checked={assessmentData.on_steroids || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('on_steroids', checked as boolean, ['no_medications'])
                        }
                      />
                      <Label htmlFor="steroids" className="text-sm font-medium">
                        Corticosteroids
                        <div className="text-xs text-gray-600 font-normal">
                          Prednisone, methylprednisolone, dexamethasone, hydrocortisone
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="no_medications"
                        checked={assessmentData.no_medications || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('no_medications', checked as boolean, [
                            'on_sedating_medications', 'on_anticoagulants', 'on_steroids'
                          ])
                        }
                      />
                      <Label htmlFor="no_medications" className="text-sm font-medium">None of these medications</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Condition Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏥 Medical Conditions
                    <Badge variant="outline" className="text-xs">Risk Categories</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="diabetes"
                        checked={assessmentData.has_diabetes || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_diabetes', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="diabetes" className="text-sm font-medium">Diabetes</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="malnutrition"
                        checked={assessmentData.has_malnutrition || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_malnutrition', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="malnutrition" className="text-sm font-medium">Malnutrition</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="obesity"
                        checked={assessmentData.has_obesity || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_obesity', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="obesity" className="text-sm font-medium">Obesity (BMI &gt;30)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="neuropathy"
                        checked={assessmentData.has_neuropathy || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_neuropathy', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="neuropathy" className="text-sm font-medium">Neuropathy</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="parkinson"
                        checked={assessmentData.has_parkinson || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_parkinson', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="parkinson" className="text-sm font-medium">Parkinson's Disease</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="stroke_history"
                        checked={assessmentData.has_stroke_history || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_stroke_history', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="stroke_history" className="text-sm font-medium">Previous Stroke</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="active_cancer"
                        checked={assessmentData.has_active_cancer || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_active_cancer', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="active_cancer" className="text-sm font-medium">Active Cancer</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="vte_history"
                        checked={assessmentData.has_vte_history || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_vte_history', checked as boolean, ['no_medical_conditions'])
                        }
                      />
                      <Label htmlFor="vte_history" className="text-sm font-medium">VTE History</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="no_medical_conditions"
                        checked={assessmentData.no_medical_conditions || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('no_medical_conditions', checked as boolean, [
                            'has_diabetes', 'has_malnutrition', 'has_obesity', 'has_neuropathy',
                            'has_parkinson', 'has_stroke_history', 'has_active_cancer', 'has_vte_history'
                          ])
                        }
                      />
                      <Label htmlFor="no_medical_conditions" className="text-sm font-medium">None of these conditions</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Devices and Lines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔌 Devices & Lines
                    <Badge variant="outline" className="text-xs">Fall Risk</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="foley"
                        checked={assessmentData.has_foley_catheter || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_foley_catheter', checked as boolean, ['no_devices'])
                        }
                      />
                      <Label htmlFor="foley" className="text-sm font-medium">Foley Catheter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="central_line"
                        checked={assessmentData.has_central_line || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_central_line', checked as boolean, ['no_devices'])
                        }
                      />
                      <Label htmlFor="central_line" className="text-sm font-medium">Central Line</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="feeding_tube"
                        checked={assessmentData.has_feeding_tube || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_feeding_tube', checked as boolean, ['no_devices'])
                        }
                      />
                      <Label htmlFor="feeding_tube" className="text-sm font-medium">Feeding Tube</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="ventilator"
                        checked={assessmentData.has_ventilator || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('has_ventilator', checked as boolean, ['no_devices'])
                        }
                      />
                      <Label htmlFor="ventilator" className="text-sm font-medium">Ventilator</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="no_devices"
                        checked={assessmentData.no_devices || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange('no_devices', checked as boolean, [
                            'has_foley_catheter', 'has_central_line', 'has_feeding_tube', 'has_ventilator'
                          ])
                        }
                      />
                      <Label htmlFor="no_devices" className="text-sm font-medium">None of these devices</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 Additional Risk Factors
                    <Badge variant="outline" className="text-xs">Clinical Markers</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="on_vte_prophylaxis"
                          checked={assessmentData.on_vte_prophylaxis || false}
                          onCheckedChange={(checked) => 
                            setAssessmentData(prev => ({ ...prev, on_vte_prophylaxis: checked as boolean }))
                          }
                        />
                        <Label htmlFor="on_vte_prophylaxis" className="text-sm font-medium">VTE Prophylaxis</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="incontinent"
                          checked={assessmentData.incontinent || false}
                          onCheckedChange={(checked) => 
                            setAssessmentData(prev => ({ ...prev, incontinent: checked as boolean }))
                          }
                        />
                        <Label htmlFor="incontinent" className="text-sm font-medium">Incontinence</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="albumin_low"
                          checked={assessmentData.albumin_low || false}
                          onCheckedChange={(checked) => 
                            setAssessmentData(prev => ({ ...prev, albumin_low: checked as boolean }))
                          }
                        />
                        <Label htmlFor="albumin_low" className="text-sm font-medium">Low Albumin</Label>
                      </div>
                      <div>
                        <Label htmlFor="days_immobile">Days Immobile</Label>
                        <Input
                          id="days_immobile"
                          type="number"
                          min="0"
                          max="30"
                          value={assessmentData.days_immobile || 0}
                          onChange={(e) => setAssessmentData(prev => ({
                            ...prev,
                            days_immobile: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={handleCalculateRisk}
              disabled={calculateRiskMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {calculateRiskMutation.isPending ? "Processing & Calculating..." : "Generate Anonymous Risk Assessment"}
            </Button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Color-Coded Risk Display */}
            <Card className="border-2 border-gray-300">
              <CardHeader className="bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Calculator className="w-5 h-5" />
                  AI-Powered Risk Analysis Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className={`border-2 ${getRiskColor(riskResults.deconditioning?.risk_level || 'low')}`}>
                    <CardContent className="p-4 text-center">
                      {getRiskIcon('deconditioning')}
                      <div className="text-2xl font-bold mt-2">{(riskResults.deconditioning?.probability * 100 || 0).toFixed(1)}%</div>
                      <div className="text-sm font-medium flex items-center justify-center gap-1">
                        Deconditioning
                        <DeconditioningInfoModal />
                      </div>
                      <Badge variant="outline" className={`mt-2 text-xs ${getRiskColor(riskResults.deconditioning?.risk_level || 'low')}`}>
                        {(riskResults.deconditioning?.risk_level || 'low').toUpperCase()} RISK
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border-2 ${getRiskColor(riskResults.vte?.risk_level || 'low')}`}>
                    <CardContent className="p-4 text-center">
                      {getRiskIcon('vte')}
                      <div className="text-2xl font-bold mt-2">{(riskResults.vte?.probability * 100 || 0).toFixed(1)}%</div>
                      <div className="text-sm font-medium">Blood Clots (VTE)</div>
                      <Badge variant="outline" className={`mt-2 text-xs ${getRiskColor(riskResults.vte?.risk_level || 'low')}`}>
                        {(riskResults.vte?.risk_level || 'low').toUpperCase()} RISK
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border-2 ${getRiskColor(riskResults.falls?.risk_level || 'low')}`}>
                    <CardContent className="p-4 text-center">
                      {getRiskIcon('falls')}
                      <div className="text-2xl font-bold mt-2">{(riskResults.falls?.probability * 100 || 0).toFixed(1)}%</div>
                      <div className="text-sm font-medium">Falls</div>
                      <Badge variant="outline" className={`mt-2 text-xs ${getRiskColor(riskResults.falls?.risk_level || 'low')}`}>
                        {(riskResults.falls?.risk_level || 'low').toUpperCase()} RISK
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border-2 ${getRiskColor(riskResults.pressure?.risk_level || 'low')}`}>
                    <CardContent className="p-4 text-center">
                      {getRiskIcon('pressure')}
                      <div className="text-2xl font-bold mt-2">{(riskResults.pressure?.probability * 100 || 0).toFixed(1)}%</div>
                      <div className="text-sm font-medium">Pressure Injuries</div>
                      <Badge variant="outline" className={`mt-2 text-xs ${getRiskColor(riskResults.pressure?.risk_level || 'low')}`}>
                        {(riskResults.pressure?.risk_level || 'low').toUpperCase()} RISK
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Risk Level Legend */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-3">Risk Level Guide:</div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                      <span className="text-sm text-green-800 font-medium">LOW</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                      <span className="text-sm text-yellow-800 font-medium">MODERATE</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                      <span className="text-sm text-red-800 font-medium">HIGH</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    Thresholds: Deconditioning ≥25% (high) • VTE/Falls/Pressure ≥4% (high)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Movement Goal */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-purple-50">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Target className="w-5 h-5" />
                  Personalized Movement Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  {/* Duration Target */}
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{riskResults.mobility_recommendation?.duration_min_per_session || 15}</div>
                    <div className="text-sm text-purple-700">min</div>
                    <div className="text-xs text-gray-500">Duration Target</div>
                    <div className="text-xs text-gray-400">Optimal session length</div>
                  </div>

                  {/* Power Target */}
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{riskResults.mobility_recommendation?.watt_goal || 25}</div>
                    <div className="text-sm text-purple-700">W</div>
                    <div className="text-xs text-gray-500">Power Target</div>
                    <div className="text-xs text-gray-400">Personalized intensity</div>
                  </div>

                  {/* Sessions Per Day */}
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{riskResults.mobility_recommendation?.sessions_per_day || 1}</div>
                    <div className="text-sm text-purple-700">x</div>
                    <div className="text-xs text-gray-500">Daily Frequency</div>
                    <div className="text-xs text-gray-400">Optimized for recovery</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stay Predictions - Desktop Optimized */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700">Length of Stay</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{(riskResults.losData?.predicted_days || 5).toFixed(1)} days</div>
                  <div className="text-xs text-gray-500">Predicted stay duration</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700">Home Discharge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{((riskResults.dischargeData?.home_probability || 0.75) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-gray-500">Chance of discharge home</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700">30d Readmission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{((riskResults.readmissionData?.thirty_day_probability || 0.15) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-gray-500">Readmission risk</div>
                </CardContent>
              </Card>
            </div>

            {/* Color-Coded Benefits Section - Desktop Optimized */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-2 border-emerald-200 bg-emerald-50">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Risk Reductions With Mobility
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {Object.entries(riskResults.mobility_benefits?.risk_reductions || {}).map(([type, reduction]: [string, any]) => {
                    const absoluteReduction = reduction.absolute_reduction_percent || 0;
                    const getBenefitColor = (value: number) => {
                      if (value >= 2.0) return "bg-gradient-to-r from-emerald-500 to-green-600 text-white";
                      if (value >= 1.0) return "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"; 
                      if (value >= 0.5) return "bg-gradient-to-r from-purple-500 to-indigo-600 text-white";
                      return "bg-gradient-to-r from-gray-500 to-slate-600 text-white";
                    };
                    
                    return (
                      <div key={type} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              {getRiskIcon(type)}
                              <span className="text-sm font-semibold capitalize text-gray-800">
                                {type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getBenefitColor(absoluteReduction)}`}>
                              -{absoluteReduction.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Absolute Risk Reduction:</span> {absoluteReduction.toFixed(1)} percentage points
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            From {(reduction.current_risk * 100).toFixed(1)}% → {(reduction.reduced_risk * 100).toFixed(1)}%
                          </div>
                        </div>
                        {/* Progress bar showing reduction magnitude */}
                        <div className="h-2 bg-gray-100">
                          <div 
                            className={`h-full ${getBenefitColor(absoluteReduction).split(' ')[0]} transition-all duration-500`}
                            style={{ width: `${Math.min(absoluteReduction * 25, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Benefits Legend */}
                  <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                    <div className="text-xs font-semibold text-gray-700 mb-3">Benefit Magnitude:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"></div>
                        <span className="text-gray-600">≥2% (Excellent)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full"></div>
                        <span className="text-gray-600">≥1% (Good)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"></div>
                        <span className="text-gray-600">≥0.5% (Moderate)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-gray-500 to-slate-600 rounded-full"></div>
                        <span className="text-gray-600">&lt;0.5% (Minimal)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Hospital Stay Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Length of Stay */}
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-semibold text-gray-800">Length of Stay</span>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white">
                          -{(riskResults.mobility_benefits?.stay_improvements?.length_of_stay_reduction || 0).toFixed(1)} days
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Shorter hospital stay</span> with mobility therapy
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500" 
                           style={{ width: `${Math.min((riskResults.mobility_benefits?.stay_improvements?.length_of_stay_reduction || 0) * 50, 100)}%` }} />
                    </div>
                  </div>

                  {/* Home Discharge */}
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-800">Home Discharge</span>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                          +{((riskResults.mobility_benefits?.stay_improvements?.home_discharge_improvement || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Higher chance</span> of going directly home
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500" 
                           style={{ width: `${Math.min(((riskResults.mobility_benefits?.stay_improvements?.home_discharge_improvement || 0) * 100) * 5, 100)}%` }} />
                    </div>
                  </div>

                  {/* Readmission Risk */}
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-gray-800">30d Readmission</span>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                          -{((riskResults.mobility_benefits?.stay_improvements?.readmission_reduction || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Reduced risk</span> of returning to hospital
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(riskResults.mobility_benefits?.stay_improvements?.readmission_percent_reduction || 0).toFixed(0)}% relative reduction
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500" 
                           style={{ width: `${Math.min(((riskResults.mobility_benefits?.stay_improvements?.readmission_reduction || 0) * 100) * 10, 100)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => setShowCalculationDetails(true)}
                variant="outline" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Calculator className="w-4 h-4 mr-2" />
                How This Was Calculated
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Create Account to Save Results
              </Button>
            </div>

            {/* Calculation Details Modal */}
            {showCalculationDetails && (
              <Card className="border-2 border-gray-300">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-gray-600" />
                      How This Was Calculated
                    </span>
                    <Button 
                      onClick={() => setShowCalculationDetails(false)}
                      variant="outline" 
                      size="sm"
                      className="text-gray-500"
                    >
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="text-sm text-gray-700">
                    <p className="mb-4">
                      <strong>Evidence-Based Risk Prediction:</strong> This advanced clinical decision support system utilizes
                      <em>modified</em> validated risk assessment tools, enhanced with mobility-specific algorithms and trained on
                      ~10,000 patient outcomes to deliver precise, personalized risk stratification.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <strong>Deconditioning Risk:</strong> Evidence-based algorithm incorporating mobility status, age, level of care, 
                        and immobility duration. AI personalizes predictions based on individual patient physiology and clinical factors.
                      </div>
                      
                      <div>
                        <strong>VTE Risk:</strong> <em>Modified Padua Score</em> enhanced with mobility-specific risk factors. 
                        AI algorithms adjust baseline risk based on patient-specific mobility status and prophylaxis effectiveness.
                      </div>
                      
                      <div>
                        <strong>Falls Risk:</strong> <em>Modified Morse Fall Scale</em> with enhanced mobility stratification. 
                        Incorporates age, cognitive status, medications, and devices with AI-driven mobility improvement predictions.
                      </div>
                      
                      <div>
                        <strong>Pressure Injury Risk:</strong> <em>Modified Braden Scale</em> with advanced mobility-based adjustments. 
                        AI personalizes risk based on nutrition, moisture, mobility level, and clinical severity factors.
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <strong>AI-Powered Movement Dosing:</strong> The {riskResults.mobility_recommendation?.watt_goal || 25}W goal 
                      is generated using evidence-based ACSM physiological equations, patient anthropometrics, 
                      and mobility-specific algorithms. Targets optimal 2.0-3.0 METs intensity for maximum movement benefit while maintaining clinical safety.
                      <br /><br />
                      <strong>Clinical Confidence:</strong> All mobility benefit calculations use validated, evidence-based algorithms tailored to each patient's 
                      unique risk profile. This system provides rehabilitation professionals with precise, individualized movement targets supported by robust clinical data.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}