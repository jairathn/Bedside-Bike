import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  TrendingUp,
  Users,
  BarChart3,
  Target,
  Award,
  FileText,
  RefreshCw,
  Bike,
  Footprints,
  ClipboardList,
  Heart
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface MobilityScore {
  overallScore: number;
  componentScores: {
    bikePerformance: number;
    ambulation: number;
    ptAssessment: number;
    nursingObservation: number;
    adlFunction: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

interface BarthelIndex {
  totalScore: number;
  maxScore: number;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
    description: string;
  }>;
  independenceLevel: string;
}

interface FIMScore {
  motorScore: number;
  cognitiveScore: number;
  totalScore: number;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
  }>;
  dependenceLevel: string;
}

export default function MobilityScoresPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

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

  // Get mobility score
  const { data: mobilityScore, refetch: refetchMobility } = useQuery<MobilityScore>({
    queryKey: [`/api/patients/${selectedPatientId}/mobility-score`],
    enabled: !!selectedPatientId,
  });

  // Get Barthel Index
  const { data: barthelIndex } = useQuery<BarthelIndex>({
    queryKey: [`/api/patients/${selectedPatientId}/barthel-index`],
    enabled: !!selectedPatientId,
  });

  // Get FIM Score
  const { data: fimScore } = useQuery<FIMScore>({
    queryKey: [`/api/patients/${selectedPatientId}/fim-score`],
    enabled: !!selectedPatientId,
  });

  // Get Hospital Mobility Score
  const { data: hospitalScore } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/hospital-mobility-score`],
    enabled: !!selectedPatientId,
  });

  // Get mobility history
  const { data: mobilityHistory } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/mobility-history`],
    enabled: !!selectedPatientId,
  });

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const radarData = mobilityScore?.componentScores ? [
    { subject: 'Bike', value: mobilityScore.components?.bikeScore || 0, fullMark: 100 },
    { subject: 'Walking', value: mobilityScore.components?.ambulationScore || 0, fullMark: 100 },
    { subject: 'PT Assessment', value: mobilityScore.components?.ptScore || 0, fullMark: 100 },
    { subject: 'Nursing', value: mobilityScore.components?.nursingScore || 0, fullMark: 100 },
    { subject: 'ADL', value: mobilityScore.components?.adlScore || 0, fullMark: 100 },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className="w-8 h-8 mr-3 text-blue-600" />
            Multi-Modal Mobility Scoring
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive mobility assessment with Barthel Index and FIM translations
          </p>
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
                <Button variant="outline" onClick={() => refetchMobility()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Scores
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPatientId ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="barthel">Barthel Index</TabsTrigger>
              <TabsTrigger value="fim">FIM Score</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overall Score Card */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Overall Mobility Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    {mobilityScore ? (
                      <>
                        <div className={`text-6xl font-bold ${getScoreColor(mobilityScore.overallScore)}`}>
                          {Math.round(mobilityScore.overallScore)}
                        </div>
                        <div className="text-gray-500 text-sm mt-1">out of 100</div>
                        <Progress
                          value={mobilityScore.overallScore}
                          className="mt-4"
                        />
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <TrendingUp className={`w-5 h-5 ${
                            mobilityScore.trend === 'improving' ? 'text-green-500' :
                            mobilityScore.trend === 'declining' ? 'text-red-500' :
                            'text-yellow-500'
                          }`} />
                          <span className="capitalize">{mobilityScore.trend}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Last updated: {new Date(mobilityScore.lastUpdated).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">Loading...</div>
                    )}
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Component Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {radarData.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar
                              name="Score"
                              dataKey="value"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.5}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 flex items-center justify-center text-gray-400">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Component Details */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Bike className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {mobilityScore?.components?.bikeScore || '--'}
                    </div>
                    <div className="text-sm text-gray-600">Bike Performance</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Footprints className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">
                      {mobilityScore?.components?.ambulationScore || '--'}
                    </div>
                    <div className="text-sm text-gray-600">Ambulation</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">
                      {mobilityScore?.components?.ptScore || '--'}
                    </div>
                    <div className="text-sm text-gray-600">PT Assessment</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <div className="text-2xl font-bold">
                      {mobilityScore?.components?.nursingScore || '--'}
                    </div>
                    <div className="text-sm text-gray-600">Nursing Obs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">
                      {mobilityScore?.components?.adlScore || '--'}
                    </div>
                    <div className="text-sm text-gray-600">ADL Function</div>
                  </CardContent>
                </Card>
              </div>

              {/* Hospital Mobility Score */}
              {hospitalScore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Hospital Mobility Score (HMS)
                    </CardTitle>
                    <CardDescription>Standardized score for quality reporting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(hospitalScore.score, hospitalScore.maxScore)}`}>
                          {hospitalScore.score}
                        </div>
                        <div className="text-sm text-gray-500">/ {hospitalScore.maxScore}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-2">Level: {hospitalScore.level}</div>
                        <Progress value={(hospitalScore.score / hospitalScore.maxScore) * 100} />
                        <div className="text-xs text-gray-500 mt-2">{hospitalScore.description}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Barthel Index Tab */}
            <TabsContent value="barthel" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Barthel Index Assessment
                  </CardTitle>
                  <CardDescription>
                    Activities of Daily Living (ADL) score translated from mobility data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {barthelIndex ? (
                    <div className="space-y-6">
                      {/* Total Score */}
                      <div className="flex items-center gap-8 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className={`text-5xl font-bold ${getScoreColor(barthelIndex.totalScore, barthelIndex.maxScore)}`}>
                            {barthelIndex.totalScore}
                          </div>
                          <div className="text-sm text-gray-500">/ {barthelIndex.maxScore}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-medium mb-2">
                            Independence Level: {barthelIndex.independenceLevel}
                          </div>
                          <Progress
                            value={(barthelIndex.totalScore / barthelIndex.maxScore) * 100}
                          />
                        </div>
                      </div>

                      {/* Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {barthelIndex.categories?.map((cat, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{cat.name}</span>
                              <Badge variant="outline">
                                {cat.score} / {cat.maxScore}
                              </Badge>
                            </div>
                            <Progress value={(cat.score / cat.maxScore) * 100} className="h-2" />
                            <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      Barthel Index data not available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* FIM Score Tab */}
            <TabsContent value="fim" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Functional Independence Measure (FIM)
                  </CardTitle>
                  <CardDescription>
                    Motor and cognitive function scores translated from mobility data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fimScore ? (
                    <div className="space-y-6">
                      {/* Score Summary */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">{fimScore.motorScore}</div>
                          <div className="text-sm text-gray-600">Motor Score</div>
                          <div className="text-xs text-gray-400">Max: 91</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg text-center">
                          <div className="text-3xl font-bold text-purple-600">{fimScore.cognitiveScore}</div>
                          <div className="text-sm text-gray-600">Cognitive Score</div>
                          <div className="text-xs text-gray-400">Max: 35</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                          <div className="text-3xl font-bold text-green-600">{fimScore.totalScore}</div>
                          <div className="text-sm text-gray-600">Total FIM</div>
                          <div className="text-xs text-gray-400">Max: 126</div>
                        </div>
                      </div>

                      {/* Dependence Level */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-lg font-medium">
                          Dependence Level: <span className="text-blue-600">{fimScore.dependenceLevel}</span>
                        </div>
                        <Progress value={(fimScore.totalScore / 126) * 100} className="mt-2" />
                      </div>

                      {/* Categories */}
                      <div className="space-y-3">
                        {fimScore.categories?.map((cat, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-medium">{cat.name}</div>
                            <div className="flex-1">
                              <Progress value={(cat.score / cat.maxScore) * 100} className="h-3" />
                            </div>
                            <div className="w-16 text-right text-sm">
                              {cat.score}/{cat.maxScore}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      FIM Score data not available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Mobility Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mobilityHistory?.scores && mobilityHistory.scores.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mobilityHistory.scores}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="overallScore"
                            name="Overall"
                            stroke="#3B82F6"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="barthelScore"
                            name="Barthel"
                            stroke="#10B981"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="fimScore"
                            name="FIM"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>No historical data available yet</p>
                        <p className="text-sm">Scores will appear as assessments are recorded</p>
                      </div>
                    </div>
                  )}
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
                Choose a patient to view their mobility scores
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
