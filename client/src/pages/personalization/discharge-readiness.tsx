import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Home,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  BarChart3,
  Save,
  RefreshCw,
  BookOpen,
  ChevronDown,
  Calendar,
  Clock,
  FileText,
  Info
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

// EMS Component definitions with scoring options
const EMS_COMPONENTS = {
  lyingToSitting: {
    label: "Lying to Sitting",
    description: "Ability to move from lying to sitting position",
    maxScore: 2,
    options: [
      { value: 2, label: "Independent" },
      { value: 1, label: "Needs help of 1 person" },
      { value: 0, label: "Needs help of 2+ people" }
    ]
  },
  sittingToLying: {
    label: "Sitting to Lying",
    description: "Ability to move from sitting to lying position",
    maxScore: 2,
    options: [
      { value: 2, label: "Independent" },
      { value: 1, label: "Needs help of 1 person" },
      { value: 0, label: "Needs help of 2+ people" }
    ]
  },
  sittingToStanding: {
    label: "Sitting to Standing",
    description: "Ability to stand from sitting position",
    maxScore: 3,
    options: [
      { value: 3, label: "Independent in under 3 seconds" },
      { value: 2, label: "Independent in over 3 seconds" },
      { value: 1, label: "Needs help of 1 person" },
      { value: 0, label: "Needs help of 2+ people" }
    ]
  },
  standing: {
    label: "Standing Balance",
    description: "Standing ability and reaching",
    maxScore: 3,
    options: [
      { value: 3, label: "Stands without support and able to reach" },
      { value: 2, label: "Stands without support but needs support to reach" },
      { value: 1, label: "Stands but needs support" },
      { value: 0, label: "Stands only with physical support of another person" }
    ]
  },
  gait: {
    label: "Gait",
    description: "Walking ability and aid required",
    maxScore: 3,
    options: [
      { value: 3, label: "Independent (+/- stick)" },
      { value: 2, label: "Independent with frame" },
      { value: 1, label: "Mobile with walking aid but erratic/unsafe" },
      { value: 0, label: "Needs physical help to walk or constant supervision" }
    ]
  },
  timedWalk: {
    label: "Timed Walk (6 metres)",
    description: "Time to walk 6 metres",
    maxScore: 3,
    options: [
      { value: 3, label: "Under 15 seconds" },
      { value: 2, label: "16-30 seconds" },
      { value: 1, label: "Over 30 seconds" },
      { value: 0, label: "Unable to cover 6 metres" }
    ]
  },
  functionalReach: {
    label: "Functional Reach",
    description: "Forward reach distance",
    maxScore: 4,
    options: [
      { value: 4, label: "Over 20 cm" },
      { value: 2, label: "10-20 cm" },
      { value: 0, label: "Under 10 cm" }
    ]
  }
};

// Evidence/References data
const EVIDENCE_DATA = {
  overview: {
    title: "Elderly Mobility Scale (EMS)",
    citation: "Smith R. (1994). Validation and Reliability of the Elderly Mobility Scale. Physiotherapy; 80 (11); 744-747",
    description: "The EMS is a 20-point validated assessment tool for frail elderly subjects. It evaluates mobility through seven functional activities including bed mobility, transfers, and bodily reaction to perturbation."
  },
  validation: [
    {
      title: "Concurrent Validity",
      content: "EMS scores correlate highly with the Functional Independence Measure (0.948) and Barthel Index (0.962). Also correlates with Modified Rivermead Mobility Index (Spearman's rho = 0.887).",
      citation: "Nolan et al. (2008)"
    },
    {
      title: "Inter-rater Reliability",
      content: "Results of Mann Whitney Test was 196, p=0.75 showing no significant difference between testers across various grades of clinical staff.",
      citation: "Smith (1994)"
    },
    {
      title: "Discriminant Validity",
      content: "Testing 20 healthy community-dwelling volunteers all scored 20/20, demonstrating the scale discriminates between those with mobility deficits and those without.",
      citation: "Smith (1994)"
    },
    {
      title: "Fall Risk Prediction",
      content: "The Functional Reach component and the whole EMS can predict an individual who is at risk of falling. EMS score was significantly associated with having had 2 or more falls.",
      citation: "Duncan et al. (1992), Spilg et al. (2003)"
    },
    {
      title: "Sensitivity to Change",
      content: "The Elderly Mobility Scale is significantly more likely to detect improvement in mobility than either the Barthel Index or Functional Ambulation Category.",
      citation: "Spilg et al. (2001)"
    },
    {
      title: "Residential Care Placement",
      content: "EMS classified into Bed mobility and Functional mobility subscales can provide mobility profiles useful to allocate people to the most appropriate care setting.",
      citation: "Yu et al. (2007)"
    }
  ],
  references: [
    "Bassey E.J., et al. (1992). Leg extensor power and functional performance in very old men and women. Clinical Science; 82; 321-327",
    "Chiu A.Y.Y., et al. (2003). A comparison of four functional tests in discriminating fallers from non-fallers in older people. Disability and Rehabilitation; 25 (1); 45-50",
    "Duncan P.W., et al. (1992). Functional Reach: predictive validity in a sample of elderly male veterans. Journal of Gerontology; 47; M93-98",
    "Nolan J., et al. (2008). The reliability and validity of the Elderly Mobility Scale in the acute hospital setting. Internet J Allied Health Sci Pract 6(4)",
    "Prosser L., Canby A. (1997). Further Validation of the Elderly Mobility Scale for measurement of mobility of hospitalised elderly people. Clinical Rehabilitation; 11; 338-343",
    "Smith R. (1994). Validation and Reliability of the Elderly Mobility Scale. Physiotherapy; 80 (11); 744-747",
    "Spilg E.G., et al. (2001). A comparison of mobility assessments in a geriatric day hospital. Clinical Rehabilitation 15: 296-300",
    "Spilg E.G., et al. (2003). Falls risk following discharge from a geriatric day hospital. Clinical Rehabilitation 17(3):334-40",
    "Yu M.S.W., et al. (2007). Usefulness of the Elderly Mobility Scale for classifying residential placements. Clinical Rehabilitation; 21; 1114-1120"
  ]
};

// Tier configuration
const TIER_CONFIG = {
  home: {
    label: "Ready for Home",
    sublabel: "Independent in basic ADL",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-500",
    icon: Home,
    description: "Patient is able to perform mobility maneuvers alone and safely and is independent in basic activities of daily living."
  },
  borderline: {
    label: "Home with Help",
    sublabel: "Borderline mobility & ADL",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-500",
    icon: AlertTriangle,
    description: "Patient is borderline in terms of safe mobility and independence in activities of daily living. Requires some help with some mobility maneuvers."
  },
  dependent: {
    label: "High-Level Assistance Needed",
    sublabel: "Dependent in mobility & ADL",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-500",
    icon: XCircle,
    description: "Patient is dependent in mobility maneuvers; requires help with basic ADL such as transfers, toileting, and dressing."
  }
};

interface EMSAssessment {
  id: number;
  patientId: number;
  providerId: number | null;
  assessedAt: string;
  lyingToSitting: number;
  sittingToLying: number;
  sittingToStanding: number;
  standing: number;
  gait: number;
  timedWalk: number;
  functionalReach: number;
  timedWalkSeconds: number | null;
  functionalReachCm: number | null;
  totalScore: number;
  tier: 'home' | 'borderline' | 'dependent';
  notes: string | null;
  walkingAidUsed: string | null;
  createdAt: string;
}

export default function DischargeReadinessPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // Form state for new assessment
  const [scores, setScores] = useState({
    lyingToSitting: null as number | null,
    sittingToLying: null as number | null,
    sittingToStanding: null as number | null,
    standing: null as number | null,
    gait: null as number | null,
    timedWalk: null as number | null,
    functionalReach: null as number | null
  });
  const [timedWalkSeconds, setTimedWalkSeconds] = useState<string>("");
  const [functionalReachCm, setFunctionalReachCm] = useState<string>("");
  const [walkingAidUsed, setWalkingAidUsed] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate total score and tier
  const calculatedScore = useMemo(() => {
    const values = Object.values(scores);
    if (values.some(v => v === null)) return null;
    return values.reduce((sum: number, v) => sum + (v || 0), 0);
  }, [scores]);

  const calculatedTier = useMemo(() => {
    if (calculatedScore === null) return null;
    if (calculatedScore > 14) return 'home';
    if (calculatedScore >= 10) return 'borderline';
    return 'dependent';
  }, [calculatedScore]);

  // Check if form is complete
  const isFormComplete = useMemo(() => {
    return Object.values(scores).every(v => v !== null);
  }, [scores]);

  // Loading state
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

  // Fetch patients
  const { data: patients = [] } = useQuery<any[]>({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Fetch EMS assessments for selected patient
  const { data: assessments = [], refetch: refetchAssessments } = useQuery<EMSAssessment[]>({
    queryKey: [`/api/patients/${selectedPatientId}/ems-assessments`],
    enabled: !!selectedPatientId,
  });

  // Latest assessment
  const latestAssessment = useMemo(() => {
    if (!assessments.length) return null;
    return assessments[assessments.length - 1];
  }, [assessments]);

  // Chart data
  const chartData = useMemo(() => {
    return assessments.map(a => ({
      date: new Date(a.assessedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date(a.assessedAt).toLocaleDateString(),
      score: a.totalScore,
      tier: a.tier
    }));
  }, [assessments]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/patients/${selectedPatientId}/ems-assessments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/ems-assessments`] });
      toast({
        title: "Assessment Saved",
        description: "Discharge readiness score has been recorded successfully.",
      });
      // Reset form
      setScores({
        lyingToSitting: null,
        sittingToLying: null,
        sittingToStanding: null,
        standing: null,
        gait: null,
        timedWalk: null,
        functionalReach: null
      });
      setTimedWalkSeconds("");
      setFunctionalReachCm("");
      setNotes("");
      setWalkingAidUsed("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (!isFormComplete || !selectedPatientId) return;

    saveMutation.mutate({
      providerId: user?.id,
      ...scores,
      timedWalkSeconds: timedWalkSeconds ? parseFloat(timedWalkSeconds) : null,
      functionalReachCm: functionalReachCm ? parseFloat(functionalReachCm) : null,
      walkingAidUsed: walkingAidUsed || null,
      notes: notes || null,
      assessedAt: assessmentDate
    });
  };

  const TierIcon = calculatedTier ? TIER_CONFIG[calculatedTier].icon : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ClipboardCheck className="w-8 h-8 mr-3 text-indigo-600" />
            Discharge Readiness Score
          </h1>
          <p className="text-gray-600 mt-2">
            Validated mobility assessment for elderly patients to guide discharge planning
          </p>
          <Badge variant="outline" className="mt-2">
            Based on the Elderly Mobility Scale (Smith, 1994)
          </Badge>
        </div>

        {/* Patient Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(v) => setSelectedPatientId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient..." />
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
              {selectedPatientId && (
                <Button variant="outline" onClick={() => refetchAssessments()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPatientId ? (
          <Tabs defaultValue="calculator" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="history">History & Trends</TabsTrigger>
              <TabsTrigger value="evidence">Evidence & Validation</TabsTrigger>
            </TabsList>

            {/* Calculator Tab */}
            <TabsContent value="calculator" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Input */}
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Assessment Components</CardTitle>
                      <CardDescription>
                        Select the appropriate score for each mobility component
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(EMS_COMPONENTS).map(([key, config]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-medium">
                              {config.label}
                              <span className="text-gray-400 ml-2 text-sm font-normal">
                                (max {config.maxScore})
                              </span>
                            </Label>
                            {scores[key as keyof typeof scores] !== null && (
                              <Badge variant="outline" className="text-lg px-3">
                                {scores[key as keyof typeof scores]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{config.description}</p>
                          <Select
                            value={scores[key as keyof typeof scores]?.toString() ?? ""}
                            onValueChange={(v) => setScores(prev => ({
                              ...prev,
                              [key]: parseInt(v)
                            }))}
                          >
                            <SelectTrigger className={scores[key as keyof typeof scores] !== null ? "border-green-300" : ""}>
                              <SelectValue placeholder="Select score..." />
                            </SelectTrigger>
                            <SelectContent>
                              {config.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                  <span className="font-medium mr-2">{opt.value}:</span>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}

                      {/* Additional measurements */}
                      <div className="border-t pt-4 mt-6">
                        <h4 className="font-medium mb-4">Optional Measurements</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Timed Walk (seconds)</Label>
                            <input
                              type="number"
                              className="w-full mt-1 px-3 py-2 border rounded-md"
                              placeholder="e.g., 22"
                              value={timedWalkSeconds}
                              onChange={(e) => setTimedWalkSeconds(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Functional Reach (cm)</Label>
                            <input
                              type="number"
                              className="w-full mt-1 px-3 py-2 border rounded-md"
                              placeholder="e.g., 18"
                              value={functionalReachCm}
                              onChange={(e) => setFunctionalReachCm(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Walking Aid Used</Label>
                            <Select value={walkingAidUsed} onValueChange={setWalkingAidUsed}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select aid..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="stick">Stick/Cane</SelectItem>
                                <SelectItem value="frame">Frame</SelectItem>
                                <SelectItem value="rollator">Rollator</SelectItem>
                                <SelectItem value="crutches">Crutches</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Assessment Date</Label>
                            <input
                              type="date"
                              className="w-full mt-1 px-3 py-2 border rounded-md"
                              value={assessmentDate}
                              onChange={(e) => setAssessmentDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Clinical Notes */}
                      <div className="border-t pt-4">
                        <Label>Clinical Notes</Label>
                        <Textarea
                          className="mt-1"
                          placeholder="Enter any observations or notes about this assessment..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Score Display */}
                <div className="space-y-4">
                  {/* Real-time Score Card */}
                  <Card className={`${calculatedTier ? TIER_CONFIG[calculatedTier].borderColor : 'border-gray-200'} border-2`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Current Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-center p-6 rounded-lg ${calculatedTier ? TIER_CONFIG[calculatedTier].bgColor : 'bg-gray-100'}`}>
                        <div className={`text-6xl font-bold ${calculatedTier ? TIER_CONFIG[calculatedTier].textColor : 'text-gray-400'}`}>
                          {calculatedScore !== null ? calculatedScore : '--'}
                        </div>
                        <div className="text-gray-500 text-sm mt-1">out of 20</div>

                        {calculatedTier && (
                          <div className="mt-4">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${TIER_CONFIG[calculatedTier].color} text-white font-medium`}>
                              {TierIcon && <TierIcon className="w-5 h-5" />}
                              {TIER_CONFIG[calculatedTier].label}
                            </div>
                            <p className="text-sm text-gray-600 mt-3">
                              {TIER_CONFIG[calculatedTier].description}
                            </p>
                          </div>
                        )}

                        {!isFormComplete && (
                          <p className="text-sm text-gray-400 mt-4">
                            Complete all components to see the result
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Interpretation */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Score Interpretation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 p-2 rounded bg-green-50">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <div>
                          <div className="font-medium text-green-700">15-20: Home</div>
                          <div className="text-xs text-gray-600">Independent mobility & ADL</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-yellow-50">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <div>
                          <div className="font-medium text-yellow-700">10-14: Home with Help</div>
                          <div className="text-xs text-gray-600">Borderline mobility & ADL</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-red-50">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <div>
                          <div className="font-medium text-red-700">0-9: High Assistance</div>
                          <div className="text-xs text-gray-600">Dependent in mobility & ADL</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!isFormComplete || saveMutation.isPending}
                    onClick={handleSave}
                  >
                    {saveMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Assessment
                      </>
                    )}
                  </Button>

                  {/* Last Assessment Summary */}
                  {latestAssessment && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">Previous Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold">{latestAssessment.totalScore}/20</div>
                            <div className="text-xs text-gray-500">
                              {new Date(latestAssessment.assessedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge className={TIER_CONFIG[latestAssessment.tier].color}>
                            {TIER_CONFIG[latestAssessment.tier].label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              {assessments.length > 0 ? (
                <>
                  {/* Trend Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Score Trend Over Time
                      </CardTitle>
                      <CardDescription>
                        Track mobility progress throughout the admission
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-3 border rounded shadow-lg">
                                      <p className="font-medium">{data.fullDate}</p>
                                      <p className="text-2xl font-bold">{data.score}/20</p>
                                      <Badge className={TIER_CONFIG[data.tier as keyof typeof TIER_CONFIG].color}>
                                        {TIER_CONFIG[data.tier as keyof typeof TIER_CONFIG].label}
                                      </Badge>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Reference lines for tiers */}
                            <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Home', fill: '#22c55e', position: 'right' }} />
                            <ReferenceLine y={10} stroke="#eab308" strokeDasharray="5 5" label={{ value: 'Borderline', fill: '#eab308', position: 'right' }} />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#4f46e5"
                              strokeWidth={3}
                              dot={{
                                fill: '#4f46e5',
                                strokeWidth: 2,
                                r: 6
                              }}
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assessment History Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Assessment History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {assessments.slice().reverse().map((assessment) => (
                          <div
                            key={assessment.id}
                            className={`p-4 rounded-lg border-l-4 ${TIER_CONFIG[assessment.tier].borderColor} bg-white`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="text-2xl font-bold">{assessment.totalScore}/20</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(assessment.assessedAt).toLocaleDateString()}
                                    <Clock className="w-3 h-3 ml-2" />
                                    {new Date(assessment.assessedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                              <Badge className={TIER_CONFIG[assessment.tier].color}>
                                {TIER_CONFIG[assessment.tier].label}
                              </Badge>
                            </div>

                            {/* Component breakdown */}
                            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.lyingToSitting}</div>
                                <div className="text-gray-500">L-S</div>
                              </div>
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.sittingToLying}</div>
                                <div className="text-gray-500">S-L</div>
                              </div>
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.sittingToStanding}</div>
                                <div className="text-gray-500">S-St</div>
                              </div>
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.standing}</div>
                                <div className="text-gray-500">Stand</div>
                              </div>
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.gait}</div>
                                <div className="text-gray-500">Gait</div>
                              </div>
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.timedWalk}</div>
                                <div className="text-gray-500">Walk</div>
                              </div>
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="font-bold">{assessment.functionalReach}</div>
                                <div className="text-gray-500">Reach</div>
                              </div>
                            </div>

                            {assessment.notes && (
                              <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                                <FileText className="w-3 h-3 inline mr-1" />
                                {assessment.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Assessments Yet</h3>
                    <p className="text-gray-500">
                      Complete the calculator to record the first assessment
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Evidence Tab */}
            <TabsContent value="evidence" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    {EVIDENCE_DATA.overview.title}
                  </CardTitle>
                  <CardDescription>
                    {EVIDENCE_DATA.overview.citation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{EVIDENCE_DATA.overview.description}</p>
                </CardContent>
              </Card>

              {/* Validation Studies */}
              <Card>
                <CardHeader>
                  <CardTitle>Validation & Clinical Evidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {EVIDENCE_DATA.validation.map((study, idx) => (
                    <Collapsible key={idx}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <span className="font-medium">{study.title}</span>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 bg-white border rounded-b-lg -mt-1">
                          <p className="text-gray-700 mb-2">{study.content}</p>
                          <p className="text-sm text-gray-500 italic">Source: {study.citation}</p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>

              {/* Full References */}
              <Card>
                <CardHeader>
                  <CardTitle>References</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {EVIDENCE_DATA.references.map((ref, idx) => (
                      <li key={idx} className="pl-4 border-l-2 border-gray-200">
                        {ref}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Clinical Appropriateness */}
              <Card>
                <CardHeader>
                  <CardTitle>Clinical Appropriateness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Best Used For</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>- Elderly patients in hospital settings</li>
                        <li>- Patients on medical/surgical wards</li>
                        <li>- Day hospital outpatients</li>
                        <li>- Discharge planning assessments</li>
                        <li>- Tracking rehabilitation progress</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-yellow-700 mb-2">Limitations</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>- Ceiling effect for more able patients</li>
                        <li>- Requires 6m walking space</li>
                        <li>- Less sensitive for confidence issues</li>
                        <li>- Difficult in community environments</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Time to complete:</strong> Approximately 15 minutes
                      <br />
                      <strong>Equipment needed:</strong> Metre rule, stop watch, bed, chair, 6m walking space
                      <br />
                      <strong>Training:</strong> Minimal training required when following standard protocol
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a Patient
              </h3>
              <p className="text-gray-500">
                Choose a patient to assess their discharge readiness
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
