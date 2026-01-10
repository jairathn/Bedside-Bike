import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ClipboardCheck,
  Home,
  AlertTriangle,
  XCircle,
  BookOpen,
  ChevronDown,
  Info,
  ArrowLeft,
  Heart,
  RefreshCw
} from "lucide-react";

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

export default function PublicDischargeReadinessPage() {
  // Form state for assessment
  const [scores, setScores] = useState({
    lyingToSitting: null as number | null,
    sittingToLying: null as number | null,
    sittingToStanding: null as number | null,
    standing: null as number | null,
    gait: null as number | null,
    timedWalk: null as number | null,
    functionalReach: null as number | null
  });

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

  const resetCalculator = () => {
    setScores({
      lyingToSitting: null,
      sittingToLying: null,
      sittingToStanding: null,
      standing: null,
      gait: null,
      timedWalk: null,
      functionalReach: null
    });
  };

  const TierIcon = calculatedTier ? TIER_CONFIG[calculatedTier].icon : null;

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
                <h1 className="text-xl font-semibold text-gray-900">Discharge Readiness Calculator</h1>
              </div>
            </div>
            <span className="text-sm text-gray-600">No account required</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Info */}
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

        {/* Anonymous disclaimer */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Try the Calculator:</strong> This tool provides the same validated discharge readiness assessment
              used by healthcare providers. Your data is not stored. Sign in as a provider to save assessments and track patient progress.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
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

                {/* Reset Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetCalculator}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Calculator
                </Button>

                {/* CTA to sign in */}
                <Card className="bg-indigo-50 border-indigo-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-indigo-800 mb-3">
                      Sign in as a provider to save assessments and track patient progress over time.
                    </p>
                    <Button
                      onClick={() => window.location.href = '/'}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Sign In as Provider
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
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
      </div>
    </div>
  );
}
