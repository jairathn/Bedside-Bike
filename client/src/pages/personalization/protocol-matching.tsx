import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Target,
  CheckCircle,
  AlertCircle,
  Users,
  Brain,
  Heart,
  Activity,
  ArrowRight,
  Star,
  Zap
} from "lucide-react";

interface ProtocolMatch {
  protocolId: number;
  protocolName: string;
  matchScore: number;
  matchConfidence: string;
  matchingFactors: string[];
  phases: Array<{
    name: string;
    duration: string;
    frequency: string;
    intensity: string;
  }>;
}

interface PatientProfile {
  personalityType: string;
  motivationFactors: string[];
  mobilityLevel: string;
  preferredSessionLength: string;
}

export default function ProtocolMatchingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [matchResults, setMatchResults] = useState<ProtocolMatch[] | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [comorbidities, setComorbidities] = useState<string[]>([]);

  const commonDiagnoses = [
    "Total Knee Arthroplasty",
    "Hip Fracture",
    "Stroke/CVA",
    "COPD Exacerbation",
    "Heart Failure",
    "ICU Stay/Critical Illness",
    "Delirium/Confusion",
    "Frail Elderly (75+)",
    "General Medical/Surgical",
    "Other"
  ];

  const commonComorbidities = [
    "Diabetes", "Hypertension", "Heart Failure", "COPD",
    "Obesity", "Stroke History", "Parkinson's", "Dementia"
  ];

  const finalDiagnosis = diagnosis === "Other" ? customDiagnosis : diagnosis;

  // Get patients for provider
  const { data: patients = [], isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 Protocol Matching Debug:', {
      authLoading,
      user: user ? { id: user.id, userType: user.userType, email: user.email } : 'NO USER',
      queryEnabled: !!user && user.userType === 'provider',
      patients: patients,
      patientsCount: patients?.length || 0,
      patientsLoading,
      patientsError,
      queryKey: `/api/providers/${user?.id}/patients`
    });
  }, [authLoading, user, patients, patientsLoading, patientsError]);

  // Get patient's personalization profile
  const { data: patientProfile } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/personalization-profile`],
    enabled: !!selectedPatientId,
  });

  // Match protocols mutation
  const matchProtocolsMutation = useMutation({
    mutationFn: async (data: { patientId: number; diagnosis?: string; comorbidities?: string[] }) => {
      return await apiRequest(`/api/patients/${data.patientId}/protocol-match`, {
        method: 'POST',
        body: JSON.stringify({ diagnosis: data.diagnosis, comorbidities: data.comorbidities }),
      });
    },
    onSuccess: (data) => {
      setMatchResults(data.matchingProtocols || []);
      toast({
        title: "Protocols Matched",
        description: `Found ${data.totalMatches || 0} matching protocols`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Matching Failed",
        description: error.message || "Failed to match protocols",
        variant: "destructive",
      });
    },
  });

  // Auto-assign protocol mutation
  const autoAssignMutation = useMutation({
    mutationFn: async (data: { patientId: number; protocolId: number }) => {
      return await apiRequest(`/api/patients/${data.patientId}/protocol`, {
        method: 'POST',
        body: JSON.stringify({
          protocolId: data.protocolId,
          assignedBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/protocol`] });
      toast({
        title: "Protocol Assigned",
        description: "The protocol has been assigned to the patient",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign protocol",
        variant: "destructive",
      });
    },
  });

  const handleMatch = () => {
    if (!selectedPatientId) {
      toast({
        title: "Missing Information",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }
    setIsMatching(true);
    matchProtocolsMutation.mutate({ patientId: selectedPatientId, diagnosis: finalDiagnosis || undefined, comorbidities: comorbidities.length > 0 ? comorbidities : undefined });
    setIsMatching(false);
  };

  const handleAssign = (protocolId: number) => {
    if (!selectedPatientId) return;
    autoAssignMutation.mutate({
      patientId: selectedPatientId,
      protocolId,
    });
  };

  const toggleComorbidity = (comorbidity: string) => {
    setComorbidities(prev =>
      prev.includes(comorbidity)
        ? prev.filter(c => c !== comorbidity)
        : [...prev, comorbidity]
    );
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-orange-600 bg-orange-50";
  };

  const getPersonalityIcon = (type: string) => {
    switch (type) {
      case 'achiever': return <Star className="w-4 h-4" />;
      case 'socializer': return <Users className="w-4 h-4" />;
      case 'steady': return <Heart className="w-4 h-4" />;
      case 'cautious': return <Brain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Show loading state while auth initializes - AFTER all hooks
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Target className="w-8 h-8 mr-3 text-blue-600" />
            Personalized Protocol Matching
          </h1>
          <p className="text-gray-600 mt-2">
            Match protocols to patients based on diagnosis, comorbidities, mobility level, and personality type
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Selection & Input */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Selector */}
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

            {/* Diagnosis Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis">Primary Diagnosis</Label>
                  <Select value={diagnosis} onValueChange={setDiagnosis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select diagnosis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commonDiagnoses.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {diagnosis === "Other" && (
                  <div>
                    <Label htmlFor="customDiagnosis">Specify Diagnosis</Label>
                    <Input
                      id="customDiagnosis"
                      placeholder="Enter diagnosis..."
                      value={customDiagnosis}
                      onChange={(e) => setCustomDiagnosis(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Comorbidities</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {commonComorbidities.map((c) => (
                      <div key={c} className="flex items-center space-x-2">
                        <Checkbox
                          id={c}
                          checked={comorbidities.includes(c)}
                          onCheckedChange={() => toggleComorbidity(c)}
                        />
                        <label htmlFor={c} className="text-sm">{c}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleMatch}
                  disabled={!selectedPatientId || !finalDiagnosis || matchProtocolsMutation.isPending}
                >
                  {matchProtocolsMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Find Matching Protocols
                </Button>
              </CardContent>
            </Card>

            {/* Patient Profile */}
            {patientProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    Patient Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Personality Type</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getPersonalityIcon(patientProfile.personalityType)}
                      {patientProfile.personalityType || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Mobility Level</span>
                    <Badge variant="secondary">{patientProfile.mobilityLevel || 'Moderate'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Session Preference</span>
                    <Badge variant="secondary">{patientProfile.preferredSessionLength || '15 min'}</Badge>
                  </div>
                  {patientProfile.motivationFactors?.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-1">Motivation Factors</span>
                      <div className="flex flex-wrap gap-1">
                        {patientProfile.motivationFactors.map((factor: string) => (
                          <Badge key={factor} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Match Results */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                  Matching Protocols
                </CardTitle>
                <CardDescription>
                  Protocols ranked by match score based on patient profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!matchResults && (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      No protocols matched yet
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Select a patient, enter diagnosis and comorbidities, then click "Find Matching Protocols"
                    </p>
                  </div>
                )}

                {matchResults && matchResults.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      No matching protocols found
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Consider using a general medical/surgical protocol or consult with PT
                    </p>
                  </div>
                )}

                {matchResults && matchResults.length > 0 && (
                  <div className="space-y-4">
                    {matchResults.map((protocol, index) => (
                      <div
                        key={protocol.protocolId}
                        className={`p-4 rounded-lg border-2 ${
                          index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <Badge className="bg-green-600">
                                  <Star className="w-3 h-3 mr-1" />
                                  Best Match
                                </Badge>
                              )}
                              <h3 className="text-lg font-semibold">{protocol.protocolName}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Confidence: {protocol.matchConfidence}
                            </p>
                          </div>
                          <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${getMatchScoreColor(protocol.matchScore)}`}>
                            {protocol.matchScore}%
                          </div>
                        </div>

                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Matching Factors:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {protocol.matchingFactors?.map((factor, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {protocol.phases && protocol.phases.length > 0 && (
                          <div className="mb-3 bg-white rounded p-3">
                            <span className="text-sm font-medium text-gray-700 block mb-2">Protocol Phases:</span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {protocol.phases.slice(0, 4).map((phase, i) => (
                                <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                                  <div className="font-medium">{phase.name}</div>
                                  <div className="text-gray-500">{phase.frequency}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full"
                          variant={index === 0 ? "default" : "outline"}
                          onClick={() => handleAssign(protocol.protocolId)}
                          disabled={autoAssignMutation.isPending}
                        >
                          {autoAssignMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-2" />
                          )}
                          Assign This Protocol
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
