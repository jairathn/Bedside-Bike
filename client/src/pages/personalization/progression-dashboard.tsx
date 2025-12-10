import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Users,
  Calendar
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ProgressionEvaluation {
  isReadyToProgress: boolean;
  currentLevel: {
    resistance: number;
    duration: number;
    frequency: number;
  };
  recommendation: {
    parameter: string;
    currentValue: number;
    suggestedValue: number;
    confidence: number;
    rationale: string;
  };
  performanceTrend: 'improving' | 'stable' | 'declining';
  sessionsAnalyzed: number;
  averagePower: number;
  consistencyScore: number;
}

interface SetbackCheck {
  hasSetback: boolean;
  setbackType?: string;
  severity?: string;
  reason?: string;
  recommendedAction?: string;
}

interface PerformancePrediction {
  predictedPower: number;
  predictedDuration: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: Array<{
    date: string;
    predicted: number;
    actual?: number;
  }>;
}

export default function ProgressionDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Get progression evaluation
  const { data: progression, isLoading: progressionLoading } = useQuery<ProgressionEvaluation>({
    queryKey: [`/api/patients/${selectedPatientId}/progression`],
    enabled: !!selectedPatientId,
  });

  // Get setback check
  const { data: setbackCheck } = useQuery<SetbackCheck>({
    queryKey: [`/api/patients/${selectedPatientId}/setback-check`],
    enabled: !!selectedPatientId,
  });

  // Get performance prediction
  const { data: prediction } = useQuery<PerformancePrediction>({
    queryKey: [`/api/patients/${selectedPatientId}/performance-prediction`],
    enabled: !!selectedPatientId,
  });

  // Apply progression mutation
  const applyProgressionMutation = useMutation({
    mutationFn: async (data: { patientId: number; parameter: string; increment: number }) => {
      return await apiRequest(`/api/patients/${data.patientId}/progression/apply`, {
        method: 'POST',
        body: JSON.stringify({
          parameter: data.parameter,
          increment: data.increment,
          approvedBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/progression`] });
      toast({
        title: "Progression Applied",
        description: "Patient's exercise parameters have been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Progression Failed",
        description: error.message || "Failed to apply progression",
        variant: "destructive",
      });
    },
  });

  // Initiate setback recovery mutation
  const setbackRecoveryMutation = useMutation({
    mutationFn: async (data: { patientId: number; setbackType: string; reason: string }) => {
      return await apiRequest(`/api/patients/${data.patientId}/setback-recovery`, {
        method: 'POST',
        body: JSON.stringify({
          setbackType: data.setbackType,
          reason: data.reason,
          approvedBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/progression`] });
      toast({
        title: "Setback Recovery Initiated",
        description: "Patient's goals have been adjusted for recovery",
      });
    },
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <BarChart3 className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'bg-green-100 text-green-800';
      case 'declining': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-blue-600" />
            Progressive Overload Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Track patient progression and manage automatic exercise intensity adjustments
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
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/progression`] })}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPatientId ? (
          progressionLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Progression Panel */}
              <div className="lg:col-span-2 space-y-6">
                {/* Setback Alert */}
                {setbackCheck?.hasSetback && (
                  <Card className="border-2 border-red-500 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500 rounded-full">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-800">
                            Setback Detected: {setbackCheck.setbackType}
                          </h3>
                          <p className="text-red-700 text-sm">{setbackCheck.reason}</p>
                          <p className="text-red-600 text-sm mt-1">
                            Recommended: {setbackCheck.recommendedAction}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setbackRecoveryMutation.mutate({
                            patientId: selectedPatientId,
                            setbackType: setbackCheck.setbackType || 'unknown',
                            reason: setbackCheck.reason || '',
                          })}
                        >
                          Initiate Recovery
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Progression Readiness */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        Progression Readiness
                      </span>
                      {progression && (
                        <Badge className={getTrendColor(progression.performanceTrend)}>
                          {getTrendIcon(progression.performanceTrend)}
                          <span className="ml-1">{progression.performanceTrend}</span>
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {progression ? (
                      <div className="space-y-6">
                        {/* Readiness Status */}
                        <div className={`p-4 rounded-lg flex items-center gap-4 ${
                          progression.isReadyToProgress
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}>
                          {progression.isReadyToProgress ? (
                            <CheckCircle className="w-12 h-12 text-green-500" />
                          ) : (
                            <XCircle className="w-12 h-12 text-gray-400" />
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {progression.isReadyToProgress
                                ? 'Ready for Progression'
                                : 'Not Ready Yet'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Based on {progression.sessionsAnalyzed} sessions analyzed
                            </p>
                          </div>
                        </div>

                        {/* Current Levels */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <Zap className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                            <div className="text-2xl font-bold text-blue-600">
                              {progression.currentLevel.resistance}
                            </div>
                            <div className="text-sm text-gray-600">Resistance Level</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <Clock className="w-6 h-6 mx-auto mb-2 text-green-600" />
                            <div className="text-2xl font-bold text-green-600">
                              {progression.currentLevel.duration}m
                            </div>
                            <div className="text-sm text-gray-600">Duration</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                            <div className="text-2xl font-bold text-purple-600">
                              {progression.currentLevel.frequency}x
                            </div>
                            <div className="text-sm text-gray-600">Daily Sessions</div>
                          </div>
                        </div>

                        {/* Recommendation */}
                        {progression.recommendation && progression.isReadyToProgress && (
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-3 flex items-center">
                              <ArrowUp className="w-4 h-4 mr-2 text-green-500" />
                              Recommended Progression
                            </h4>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="text-gray-600">{progression.recommendation.parameter}:</span>
                                <span className="ml-2">
                                  {progression.recommendation.currentValue} →
                                  <span className="font-bold text-green-600 ml-1">
                                    {progression.recommendation.suggestedValue}
                                  </span>
                                </span>
                              </div>
                              <Badge variant="outline">
                                {Math.round(progression.recommendation.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">{progression.recommendation.rationale}</p>
                            <Button
                              className="w-full"
                              onClick={() => applyProgressionMutation.mutate({
                                patientId: selectedPatientId,
                                parameter: progression.recommendation.parameter,
                                increment: progression.recommendation.suggestedValue - progression.recommendation.currentValue,
                              })}
                              disabled={applyProgressionMutation.isPending}
                            >
                              {applyProgressionMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              ) : (
                                <ArrowUp className="w-4 h-4 mr-2" />
                              )}
                              Apply Progression
                            </Button>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Avg Power</div>
                            <div className="text-xl font-bold">{Math.round(progression.averagePower)}W</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Consistency</div>
                            <div className="flex items-center">
                              <div className="text-xl font-bold mr-2">{Math.round(progression.consistencyScore)}%</div>
                              <Progress value={progression.consistencyScore} className="flex-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No progression data available</p>
                        <p className="text-sm mt-1">Patient needs more sessions for analysis</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Prediction */}
                {prediction && prediction.trend && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Performance Prediction (7 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={prediction.trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area
                              type="monotone"
                              dataKey="predicted"
                              stroke="#3B82F6"
                              fill="#93C5FD"
                              strokeWidth={2}
                            />
                            {prediction.trend.some(t => t.actual) && (
                              <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={{ fill: '#10B981' }}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Predicted Power</div>
                          <div className="text-xl font-bold text-blue-600">
                            {Math.round(prediction.predictedPower)}W
                          </div>
                          <div className="text-xs text-gray-500">
                            CI: {Math.round(prediction.confidenceInterval.lower)}-{Math.round(prediction.confidenceInterval.upper)}W
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600">Predicted Duration</div>
                          <div className="text-xl font-bold text-green-600">
                            {Math.round(prediction.predictedDuration)}min
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Side Panel - Quick Actions */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowUp className="w-4 h-4 mr-2 text-green-500" />
                      Increase Resistance
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowDown className="w-4 h-4 mr-2 text-orange-500" />
                      Decrease Resistance
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      Extend Duration
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Mark Setback
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progression History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                        <ArrowUp className="w-4 h-4 text-green-500" />
                        <div className="text-sm">
                          <div className="font-medium">Resistance +1</div>
                          <div className="text-gray-500">2 days ago</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <div className="text-sm">
                          <div className="font-medium">Duration +5min</div>
                          <div className="text-gray-500">5 days ago</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-orange-50 rounded">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <div className="text-sm">
                          <div className="font-medium">Setback Recovery</div>
                          <div className="text-gray-500">1 week ago</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a Patient
              </h3>
              <p className="text-gray-500">
                Choose a patient to view their progression data
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
