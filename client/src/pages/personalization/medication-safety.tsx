import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Pill,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Heart,
  Activity,
  Clock,
  Users,
  Plus,
  Info,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  FileWarning
} from "lucide-react";

interface MedicationInteraction {
  medication: string;
  drugClass: string;
  interactions: Array<{
    type: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  exerciseModifications: string[];
  monitoringRequired: string[];
}

interface Contraindication {
  id: number;
  condition: string;
  type: 'absolute' | 'relative' | 'temporal';
  description: string;
  canOverride: boolean;
  overrideReason?: string;
  overriddenBy?: number;
}

interface ContraindicationVerification {
  canExercise: boolean;
  absoluteContraindications: Contraindication[];
  relativeContraindications: Contraindication[];
  temporalContraindications: Contraindication[];
  warnings: string[];
  precautions: string[];
}

const commonMedications = [
  "Metoprolol", "Atenolol", "Carvedilol", // Beta blockers
  "Warfarin", "Apixaban", "Rivaroxaban", "Heparin", // Anticoagulants
  "Lisinopril", "Losartan", "Amlodipine", // Blood pressure
  "Metformin", "Insulin", "Glipizide", // Diabetes
  "Prednisone", "Dexamethasone", // Steroids
  "Furosemide", "Hydrochlorothiazide", // Diuretics
  "Oxycodone", "Morphine", "Gabapentin", // Pain/Sedating
  "Alprazolam", "Lorazepam", "Zolpidem" // Sedatives
];

export default function MedicationSafetyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [medications, setMedications] = useState<string[]>([]);
  const [newMedication, setNewMedication] = useState("");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedContraindication, setSelectedContraindication] = useState<Contraindication | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  // Show loading state while auth initializes
  if (authLoading) {

  // Show loading state while auth initializes
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Get patients
  const { data: patients = [] } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Analyze medications mutation
  const analyzeMutation = useMutation({
    mutationFn: async (data: { patientId: number; medications: string[] }) => {
      return await apiRequest(`/api/patients/${data.patientId}/medication-analysis`, {
        method: 'POST',
        body: JSON.stringify({ medications: data.medications }),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze medications",
        variant: "destructive",
      });
    },
  });

  // Contraindication check
  const contraindicationMutation = useMutation({
    mutationFn: async (data: { patientId: number; medications: string[] }) => {
      return await apiRequest(`/api/patients/${data.patientId}/contraindication-check`, {
        method: 'POST',
        body: JSON.stringify({ medications: data.medications, conditions: [] }),
      });
    },
  });

  // Override mutation
  const overrideMutation = useMutation({
    mutationFn: async (data: { patientId: number; contraindicationId: number; reason: string }) => {
      return await apiRequest(`/api/patients/${data.patientId}/contraindication-override`, {
        method: 'POST',
        body: JSON.stringify({
          contraindicationId: data.contraindicationId,
          overrideReason: data.reason,
          overriddenBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      setShowOverrideDialog(false);
      setSelectedContraindication(null);
      setOverrideReason("");
      toast({
        title: "Override Recorded",
        description: "Clinical override has been documented",
      });
    },
  });

  const addMedication = () => {
    if (newMedication && !medications.includes(newMedication)) {
      setMedications([...medications, newMedication]);
      setNewMedication("");
    }
  };

  const removeMedication = (med: string) => {
    setMedications(medications.filter(m => m !== med));
  };

  const runAnalysis = () => {
    if (!selectedPatientId || medications.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and add medications",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate({ patientId: selectedPatientId, medications });
    contraindicationMutation.mutate({ patientId: selectedPatientId, medications });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-500 text-white';
      case 'moderate': return 'bg-orange-500 text-white';
      case 'low': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getContraindicationIcon = (type: string) => {
    switch (type) {
      case 'absolute': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'relative': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'temporal': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Pill className="w-8 h-8 mr-3 text-blue-600" />
            Medication Safety & Contraindications
          </h1>
          <p className="text-gray-600 mt-2">
            Analyze drug-exercise interactions and verify contraindications before sessions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Select Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(v) => setSelectedPatientId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Medication Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Pill className="w-5 h-5 mr-2" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add medication..."
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                    list="common-meds"
                  />
                  <datalist id="common-meds">
                    {commonMedications.map(med => (
                      <option key={med} value={med} />
                    ))}
                  </datalist>
                  <Button onClick={addMedication}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick Add */}
                <div>
                  <Label className="text-sm text-gray-600">Quick Add:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonMedications.slice(0, 6).map(med => (
                      <Button
                        key={med}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => !medications.includes(med) && setMedications([...medications, med])}
                        disabled={medications.includes(med)}
                      >
                        {med}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Current Medications List */}
                {medications.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">Selected:</Label>
                    <div className="flex flex-wrap gap-2">
                      {medications.map(med => (
                        <Badge
                          key={med}
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-100"
                          onClick={() => removeMedication(med)}
                        >
                          {med} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={runAnalysis}
                  disabled={!selectedPatientId || medications.length === 0 || analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Run Safety Analysis
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contraindication Status */}
            {contraindicationMutation.data && (
              <Card className={`border-2 ${
                contraindicationMutation.data.canExercise
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {contraindicationMutation.data.canExercise ? (
                      <ShieldCheck className="w-16 h-16 text-green-500" />
                    ) : (
                      <ShieldAlert className="w-16 h-16 text-red-500" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">
                        {contraindicationMutation.data.canExercise
                          ? 'Cleared for Exercise'
                          : 'Exercise Not Recommended'}
                      </h2>
                      <p className="text-gray-600">
                        {contraindicationMutation.data.canExercise
                          ? 'Patient may proceed with exercise following any noted precautions'
                          : 'Review contraindications below before proceeding'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Absolute Contraindications */}
            {contraindicationMutation.data?.absoluteContraindications?.length > 0 && (
              <Card className="border-red-300">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-red-600">
                    <XCircle className="w-5 h-5 mr-2" />
                    Absolute Contraindications
                  </CardTitle>
                  <CardDescription>Exercise is NOT recommended with these conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contraindicationMutation.data.absoluteContraindications.map((c: Contraindication) => (
                      <div key={c.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="font-medium">{c.condition}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                          </div>
                          {c.canOverride && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500 text-red-600"
                              onClick={() => {
                                setSelectedContraindication(c);
                                setShowOverrideDialog(true);
                              }}
                            >
                              Override
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Relative Contraindications */}
            {contraindicationMutation.data?.relativeContraindications?.length > 0 && (
              <Card className="border-orange-300">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-orange-600">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Relative Contraindications
                  </CardTitle>
                  <CardDescription>Exercise with caution and modifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contraindicationMutation.data.relativeContraindications.map((c: Contraindication) => (
                      <div key={c.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">{c.condition}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medication Analysis Results */}
            {analyzeMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Drug-Exercise Interactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyzeMutation.data.interactions?.map((interaction: MedicationInteraction, idx: number) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium">{interaction.medication}</span>
                            <Badge variant="outline" className="ml-2">{interaction.drugClass}</Badge>
                          </div>
                        </div>

                        {interaction.interactions?.map((i, iIdx) => (
                          <div key={iIdx} className="ml-4 mt-2 p-2 bg-white rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityColor(i.severity)}>{i.severity}</Badge>
                              <span className="text-sm font-medium">{i.type}</span>
                            </div>
                            <p className="text-sm text-gray-600">{i.description}</p>
                            <p className="text-sm text-blue-600 mt-1">
                              <strong>Recommendation:</strong> {i.recommendation}
                            </p>
                          </div>
                        ))}

                        {interaction.exerciseModifications?.length > 0 && (
                          <div className="mt-3">
                            <span className="text-sm font-medium text-gray-700">Exercise Modifications:</span>
                            <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                              {interaction.exerciseModifications.map((mod, mIdx) => (
                                <li key={mIdx}>{mod}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {interaction.monitoringRequired?.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-700">Monitoring Required:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {interaction.monitoringRequired.map((mon, mIdx) => (
                                <Badge key={mIdx} variant="outline" className="text-xs">
                                  {mon}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!analyzeMutation.data && !contraindicationMutation.data && (
              <Card>
                <CardContent className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No Analysis Results Yet
                  </h3>
                  <p className="text-gray-500">
                    Select a patient, add their medications, and run safety analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Override Dialog */}
        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <FileWarning className="w-5 h-5 mr-2" />
                Clinical Override Required
              </DialogTitle>
              <DialogDescription>
                You are overriding: <strong>{selectedContraindication?.condition}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                <strong>Warning:</strong> This contraindication exists for patient safety.
                Only override with clear clinical justification.
              </div>
              <div>
                <Label htmlFor="override-reason">Clinical Justification (Required)</Label>
                <Textarea
                  id="override-reason"
                  placeholder="Document your clinical reasoning for this override..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedPatientId && selectedContraindication && overrideReason) {
                    overrideMutation.mutate({
                      patientId: selectedPatientId,
                      contraindicationId: selectedContraindication.id,
                      reason: overrideReason,
                    });
                  }
                }}
                disabled={!overrideReason || overrideMutation.isPending}
              >
                {overrideMutation.isPending ? "Processing..." : "Confirm Override"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
