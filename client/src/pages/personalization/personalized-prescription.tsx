import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Users,
  Activity,
  ArrowRight,
  Zap,
  Clock,
  Gauge,
  Calendar
} from "lucide-react";
import { applyDiagnosisAdjustments, getDiagnosisCategory, type BaselineProtocol, type AdjustedProtocol } from "@/lib/diagnosis-adjustments";

export default function PersonalizedPrescriptionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
  const [adjustedProtocol, setAdjustedProtocol] = useState<AdjustedProtocol | null>(null);

  const commonDiagnoses = [
    "Total Knee Arthroplasty",
    "Hip Fracture",
    "Stroke/CVA",
    "COPD Exacerbation",
    "Heart Failure",
    "ICU Stay/Critical Illness",
    "Delirium/Confusion",
    "Frail Elderly (75+)",
    "General Medical/Surgical"
  ];

  // Get patients for provider
  const { data: patients = [] } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Get patient's basic profile
  const { data: patientProfile } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/profile`],
    enabled: !!selectedPatientId,
  });

  // Get patient's latest risk assessment (contains baseline mobility dose)
  const { data: riskAssessment } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/risk-assessment`],
    enabled: !!selectedPatientId,
  });

  // Auto-populate diagnosis from patient's admission diagnosis
  useEffect(() => {
    if (patientProfile?.admissionDiagnosis) {
      const admissionDx = patientProfile.admissionDiagnosis.toLowerCase();

      if (admissionDx.includes('knee') || admissionDx.includes('tka')) {
        setSelectedDiagnosis("Total Knee Arthroplasty");
      } else if (admissionDx.includes('hip fracture') || admissionDx.includes('orif')) {
        setSelectedDiagnosis("Hip Fracture");
      } else if (admissionDx.includes('stroke') || admissionDx.includes('cva')) {
        setSelectedDiagnosis("Stroke/CVA");
      } else if (admissionDx.includes('copd')) {
        setSelectedDiagnosis("COPD Exacerbation");
      } else if (admissionDx.includes('heart failure') || admissionDx.includes('chf')) {
        setSelectedDiagnosis("Heart Failure");
      } else if (admissionDx.includes('icu') || admissionDx.includes('critical')) {
        setSelectedDiagnosis("ICU Stay/Critical Illness");
      } else if (admissionDx.includes('delirium') || admissionDx.includes('confusion')) {
        setSelectedDiagnosis("Delirium/Confusion");
      } else {
        setSelectedDiagnosis("General Medical/Surgical");
      }
    }
  }, [patientProfile]);

  // Calculate adjusted protocol when diagnosis or risk assessment changes
  useEffect(() => {
    if (riskAssessment?.mobilityRecommendation && selectedDiagnosis) {
      const mobilityRec = riskAssessment.mobilityRecommendation;

      const baseline: BaselineProtocol = {
        power: typeof mobilityRec === 'object' ? (mobilityRec.watt_goal || 35) : 35,
        duration: typeof mobilityRec === 'object' ? (mobilityRec.duration_min_per_session || 15) : 15,
        resistance: typeof mobilityRec === 'object' ? (mobilityRec.resistance_level || 5) : 5,
        sessionsPerDay: typeof mobilityRec === 'object' ? (mobilityRec.sessions_per_day || 2) : 2
      };

      const adjusted = applyDiagnosisAdjustments(baseline, selectedDiagnosis);
      setAdjustedProtocol(adjusted);
    }
  }, [riskAssessment, selectedDiagnosis]);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || user.userType !== 'provider') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground">Provider access required</p>
      </div>
    );
  }

  const baseline = riskAssessment?.mobilityRecommendation ? {
    power: typeof riskAssessment.mobilityRecommendation === 'object' ? (riskAssessment.mobilityRecommendation.watt_goal || 35) : 35,
    duration: typeof riskAssessment.mobilityRecommendation === 'object' ? (riskAssessment.mobilityRecommendation.duration_min_per_session || 15) : 15,
    resistance: typeof riskAssessment.mobilityRecommendation === 'object' ? (riskAssessment.mobilityRecommendation.resistance_level || 5) : 5,
    sessionsPerDay: typeof riskAssessment.mobilityRecommendation === 'object' ? (riskAssessment.mobilityRecommendation.sessions_per_day || 2) : 2
  } : null;

  const totalDose = baseline ? baseline.power * baseline.duration * baseline.sessionsPerDay : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Personalized Prescription</h1>
          <p className="text-muted-foreground">
            Diagnosis-adjusted mobility prescription based on patient risk profile
          </p>
        </div>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select
              value={selectedPatientId?.toString() || ""}
              onValueChange={(v) => setSelectedPatientId(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient: any) => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedPatientId && !riskAssessment && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              No risk assessment found for this patient. Please run the risk calculator in the Provider Dashboard first.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPatientId && riskAssessment && (
        <>
          {/* Diagnosis Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Diagnosis
              </CardTitle>
              <CardDescription>
                Auto-populated from patient record. Change to see different protocol adjustments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Primary Diagnosis</Label>
                <Select
                  value={selectedDiagnosis}
                  onValueChange={setSelectedDiagnosis}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select diagnosis" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonDiagnoses.map((dx) => (
                      <SelectItem key={dx} value={dx}>
                        {dx}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDiagnosis && (
                  <Badge variant="secondary" className="mt-2">
                    {getDiagnosisCategory(selectedDiagnosis)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Protocol Comparison */}
          {adjustedProtocol && baseline && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Baseline Protocol */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk-Based Baseline</CardTitle>
                  <CardDescription>From comprehensive risk calculator</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Power
                      </span>
                      <span className="font-semibold">{baseline.power}W</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Duration
                      </span>
                      <span className="font-semibold">{baseline.duration} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Gauge className="h-4 w-4" /> Resistance
                      </span>
                      <span className="font-semibold">Level {baseline.resistance}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Sessions/Day
                      </span>
                      <span className="font-semibold">{baseline.sessionsPerDay}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-primary">
                      <span className="font-semibold">Total Dose</span>
                      <span className="font-bold text-lg">{totalDose} Watt-Min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Adjusted Protocol */}
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Diagnosis-Adjusted Prescription
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </CardTitle>
                  <CardDescription>{selectedDiagnosis}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Power
                      </span>
                      <span className={`font-semibold ${adjustedProtocol.power !== baseline.power ? 'text-primary' : ''}`}>
                        {adjustedProtocol.power}W
                        {adjustedProtocol.power !== baseline.power && (
                          <span className="text-xs ml-1">
                            ({adjustedProtocol.power > baseline.power ? '+' : ''}{adjustedProtocol.power - baseline.power}W)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Duration
                      </span>
                      <span className={`font-semibold ${adjustedProtocol.duration !== baseline.duration ? 'text-primary' : ''}`}>
                        {adjustedProtocol.duration} min
                        {adjustedProtocol.duration !== baseline.duration && (
                          <span className="text-xs ml-1">
                            ({adjustedProtocol.duration > baseline.duration ? '+' : ''}{adjustedProtocol.duration - baseline.duration} min)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Gauge className="h-4 w-4" /> Resistance
                      </span>
                      <span className={`font-semibold ${adjustedProtocol.resistance !== baseline.resistance ? 'text-primary' : ''}`}>
                        Level {adjustedProtocol.resistance}
                        {adjustedProtocol.resistance !== baseline.resistance && (
                          <span className="text-xs ml-1">
                            ({adjustedProtocol.resistance > baseline.resistance ? '+' : ''}{adjustedProtocol.resistance - baseline.resistance})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Target RPM</span>
                      <span className="font-semibold text-primary">
                        {adjustedProtocol.targetRPM.min}-{adjustedProtocol.targetRPM.max}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Sessions/Day
                      </span>
                      <span className="font-semibold">{adjustedProtocol.sessionsPerDay}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-primary">
                      <span className="font-semibold">Total Dose</span>
                      <span className="font-bold text-lg">
                        {adjustedProtocol.power * adjustedProtocol.duration * adjustedProtocol.sessionsPerDay} Watt-Min
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Rationale */}
          {adjustedProtocol && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Clinical Rationale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-900">
                  {adjustedProtocol.rationale}
                </p>
                {adjustedProtocol.adjustments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-blue-900">Adjustments Made:</p>
                    <ul className="space-y-1">
                      {adjustedProtocol.adjustments.map((adj, i) => (
                        <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{adj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
