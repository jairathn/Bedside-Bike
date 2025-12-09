import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity,
  ArrowLeftRight,
  AlertTriangle,
  Brain,
  Users,
  Eye,
  RefreshCw,
  TrendingUp,
  Target,
  Zap,
  Heart
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ZAxis, Legend } from 'recharts';

interface BilateralFeedback {
  asymmetryPercentage: number;
  dominantSide: 'left' | 'right' | 'balanced';
  recommendation: string;
  targetBalance: number;
  currentBalance: number;
  trend: 'improving' | 'stable' | 'worsening';
}

interface NeurologicalCheck {
  hasAlert: boolean;
  alertType?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  asymmetryChange: number;
  recommendation?: string;
  requiresImmediate: boolean;
}

interface ForceVector {
  timestamp: string;
  leftForce: number;
  rightForce: number;
  leftAngle: number;
  rightAngle: number;
}

interface ButterflyPlotData {
  angle: number;
  leftRadius: number;
  rightRadius: number;
}

export default function BilateralForcePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveData, setLiveData] = useState<Array<{ time: number; left: number; right: number; asymmetry: number }>>([]);

  // Get patients
  const { data: patients = [] } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Get patient sessions
  const { data: sessions = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/sessions`],
    enabled: !!selectedPatientId,
  });

  // Get bilateral feedback
  const { data: bilateralFeedback, refetch: refetchFeedback } = useQuery<BilateralFeedback>({
    queryKey: [`/api/patients/${selectedPatientId}/bilateral-feedback`],
    enabled: !!selectedPatientId,
  });

  // Get neurological check
  const { data: neuroCheck, refetch: refetchNeuro } = useQuery<NeurologicalCheck>({
    queryKey: [`/api/patients/${selectedPatientId}/neurological-check`],
    enabled: !!selectedPatientId,
  });

  // Get force vectors for session
  const { data: forceVectors } = useQuery<ForceVector[]>({
    queryKey: [`/api/sessions/${selectedSessionId}/force-vectors`],
    enabled: !!selectedSessionId,
  });

  // Get butterfly plot data
  const { data: butterflyPlot } = useQuery<ButterflyPlotData[]>({
    queryKey: [`/api/sessions/${selectedSessionId}/butterfly-plot`],
    enabled: !!selectedSessionId,
  });

  // Initialize stroke protocol mutation
  const strokeProtocolMutation = useMutation({
    mutationFn: async (data: { patientId: number; affectedSide: string }) => {
      return await apiRequest(`/api/patients/${data.patientId}/stroke-protocol`, {
        method: 'POST',
        body: JSON.stringify({
          affectedSide: data.affectedSide,
          initiatedBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Stroke Protocol Initialized",
        description: "Patient has been enrolled in stroke rehabilitation protocol",
      });
    },
  });

  // Simulate live bilateral data
  useEffect(() => {
    if (!isLiveMode || !selectedPatientId) return;

    const interval = setInterval(() => {
      const baseLeft = 25 + Math.random() * 10;
      const baseRight = 25 + Math.random() * 10;
      const asymmetry = ((baseRight - baseLeft) / (baseRight + baseLeft)) * 100;

      setLiveData(prev => {
        const newData = [
          ...prev.slice(-59),
          {
            time: prev.length,
            left: Math.round(baseLeft * 10) / 10,
            right: Math.round(baseRight * 10) / 10,
            asymmetry: Math.round(asymmetry * 10) / 10,
          }
        ];
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveMode, selectedPatientId]);

  const getAsymmetryColor = (asymmetry: number) => {
    const abs = Math.abs(asymmetry);
    if (abs < 10) return 'text-green-600';
    if (abs < 20) return 'text-yellow-600';
    if (abs < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getAsymmetryBg = (asymmetry: number) => {
    const abs = Math.abs(asymmetry);
    if (abs < 10) return 'bg-green-50 border-green-200';
    if (abs < 20) return 'bg-yellow-50 border-yellow-200';
    if (abs < 30) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  // Generate butterfly plot visualization data
  const butterflyVizData = butterflyPlot?.map((point, idx) => ({
    x: point.leftRadius * Math.cos((point.angle * Math.PI) / 180),
    y: point.leftRadius * Math.sin((point.angle * Math.PI) / 180),
    side: 'Left',
    index: idx,
  })).concat(
    butterflyPlot?.map((point, idx) => ({
      x: -point.rightRadius * Math.cos((point.angle * Math.PI) / 180),
      y: point.rightRadius * Math.sin((point.angle * Math.PI) / 180),
      side: 'Right',
      index: idx,
    })) || []
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ArrowLeftRight className="w-8 h-8 mr-3 text-blue-600" />
            Bilateral Force Analysis
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time bilateral force visualization and stroke rehabilitation support
          </p>
          <Badge variant="outline" className="mt-2">
            Tier 2 Feature - Requires Force Sensors
          </Badge>
        </div>

        {/* Sensor Integration Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
          <Brain className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-800">Bilateral Force Sensors Required</p>
            <p className="text-sm text-blue-700">
              This feature requires bilateral force sensors to be installed on the Bedside Bike pedals.
              {isLiveMode && " Currently showing simulated data for demonstration purposes."}
            </p>
          </div>
        </div>

        {/* Patient Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(v) => {
                    setSelectedPatientId(parseInt(v));
                    setSelectedSessionId(null);
                    setLiveData([]);
                    setIsLiveMode(false);
                  }}
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
                <>
                  <Button
                    variant={isLiveMode ? "destructive" : "default"}
                    onClick={() => {
                      setIsLiveMode(!isLiveMode);
                      if (!isLiveMode) setLiveData([]);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isLiveMode ? "Stop Live" : "Live Monitor"}
                  </Button>
                  <Button variant="outline" onClick={() => { refetchFeedback(); refetchNeuro(); }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPatientId ? (
          <>
            {/* Neurological Alert */}
            {neuroCheck?.hasAlert && (
              <Card className={`mb-6 border-2 ${
                neuroCheck.severity === 'severe' ? 'border-red-500 bg-red-50' :
                neuroCheck.severity === 'moderate' ? 'border-orange-500 bg-orange-50' :
                'border-yellow-500 bg-yellow-50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      neuroCheck.severity === 'severe' ? 'bg-red-500' :
                      neuroCheck.severity === 'moderate' ? 'bg-orange-500' :
                      'bg-yellow-500'
                    }`}>
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {neuroCheck.alertType || 'Neurological Alert'}
                        {neuroCheck.requiresImmediate && (
                          <Badge className="ml-2 bg-red-600">IMMEDIATE ATTENTION</Badge>
                        )}
                      </h3>
                      <p className="text-gray-700">
                        Asymmetry change: {neuroCheck.asymmetryChange}%
                      </p>
                      {neuroCheck.recommendation && (
                        <p className="text-sm mt-1">{neuroCheck.recommendation}</p>
                      )}
                    </div>
                    <Button variant="outline">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Acknowledge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="realtime" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="realtime">Real-Time</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="butterfly">Butterfly Plot</TabsTrigger>
                <TabsTrigger value="stroke">Stroke Rehab</TabsTrigger>
              </TabsList>

              {/* Real-Time Tab */}
              <TabsContent value="realtime" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Live Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Real-Time Bilateral Force
                        {isLiveMode && (
                          <Badge className="ml-2 bg-green-500 animate-pulse">LIVE</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLiveMode && liveData.length > 0 ? (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={liveData.slice(-30)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" />
                              <YAxis domain={[0, 50]} />
                              <Tooltip />
                              <Legend />
                              <Area
                                type="monotone"
                                dataKey="left"
                                name="Left Force (W)"
                                stroke="#3B82F6"
                                fill="#93C5FD"
                                fillOpacity={0.5}
                              />
                              <Area
                                type="monotone"
                                dataKey="right"
                                name="Right Force (W)"
                                stroke="#EF4444"
                                fill="#FCA5A5"
                                fillOpacity={0.5}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">Click "Live Monitor" to view real-time data</p>
                            <p className="text-sm mt-2">Or select a past session to analyze</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Current Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Left/Right Indicators */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Zap className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <div className="text-3xl font-bold text-blue-600">
                            {liveData.length > 0 ? liveData[liveData.length - 1].left : '--'}
                          </div>
                          <div className="text-sm text-gray-600">Left (W)</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <Zap className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <div className="text-3xl font-bold text-red-600">
                            {liveData.length > 0 ? liveData[liveData.length - 1].right : '--'}
                          </div>
                          <div className="text-sm text-gray-600">Right (W)</div>
                        </div>
                      </div>

                      {/* Asymmetry */}
                      <div className={`p-4 rounded-lg border ${liveData.length > 0 ? getAsymmetryBg(liveData[liveData.length - 1].asymmetry) : 'bg-gray-50'}`}>
                        <div className="text-sm text-gray-600 mb-1">Asymmetry</div>
                        <div className={`text-3xl font-bold ${liveData.length > 0 ? getAsymmetryColor(liveData[liveData.length - 1].asymmetry) : 'text-gray-400'}`}>
                          {liveData.length > 0 ? `${liveData[liveData.length - 1].asymmetry}%` : '--'}
                        </div>
                        {liveData.length > 0 && (
                          <div className="text-sm mt-1">
                            {liveData[liveData.length - 1].asymmetry > 0 ? 'Right dominant' :
                             liveData[liveData.length - 1].asymmetry < 0 ? 'Left dominant' : 'Balanced'}
                          </div>
                        )}
                      </div>

                      {/* Balance Target */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Balance Progress</span>
                          <span>{bilateralFeedback?.currentBalance || 50}%</span>
                        </div>
                        <Progress value={bilateralFeedback?.currentBalance || 50} />
                        <div className="text-xs text-gray-500 mt-1">
                          Target: 50% (balanced)
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Feedback Summary */}
                  {bilateralFeedback && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Bilateral Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Asymmetry</span>
                          <span className={`font-bold ${getAsymmetryColor(bilateralFeedback.asymmetryPercentage)}`}>
                            {bilateralFeedback.asymmetryPercentage}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Dominant Side</span>
                          <Badge variant="outline">{bilateralFeedback.dominantSide}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Trend</span>
                          <Badge className={
                            bilateralFeedback.trend === 'improving' ? 'bg-green-500' :
                            bilateralFeedback.trend === 'worsening' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }>
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {bilateralFeedback.trend}
                          </Badge>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-800">Recommendation:</div>
                          <div className="text-sm text-blue-700">{bilateralFeedback.recommendation}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Session Selector */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Session Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={selectedSessionId?.toString() || ""}
                        onValueChange={(v) => setSelectedSessionId(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session to analyze..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.slice(0, 10).map((session: any) => (
                            <SelectItem key={session.id} value={session.id.toString()}>
                              {new Date(session.createdAt).toLocaleDateString()} - {session.duration}s
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedSessionId && forceVectors && (
                        <div className="mt-4 h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forceVectors.slice(0, 60)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="timestamp" tick={false} />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="leftForce" name="Left" stroke="#3B82F6" dot={false} />
                              <Line type="monotone" dataKey="rightForce" name="Right" stroke="#EF4444" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Butterfly Plot Tab */}
              <TabsContent value="butterfly" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Butterfly Plot Visualization</CardTitle>
                    <CardDescription>
                      Polar force distribution showing left/right symmetry patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {butterflyVizData.length > 0 ? (
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="x" domain={[-50, 50]} name="Force" />
                            <YAxis type="number" dataKey="y" domain={[-50, 50]} />
                            <ZAxis range={[50, 50]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            <Scatter
                              name="Left Side"
                              data={butterflyVizData.filter(d => d.side === 'Left')}
                              fill="#3B82F6"
                              line={{ stroke: '#3B82F6', strokeWidth: 2 }}
                            />
                            <Scatter
                              name="Right Side"
                              data={butterflyVizData.filter(d => d.side === 'Right')}
                              fill="#EF4444"
                              line={{ stroke: '#EF4444', strokeWidth: 2 }}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-96 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p>Select a session to view butterfly plot</p>
                          <p className="text-sm">This shows force distribution patterns during pedaling</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stroke Rehab Tab */}
              <TabsContent value="stroke" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Heart className="w-5 h-5 mr-2 text-red-500" />
                      Stroke Rehabilitation Protocol
                    </CardTitle>
                    <CardDescription>
                      Specialized asymmetry-focused rehabilitation for stroke patients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-medium">Initialize Stroke Protocol</h3>
                        <p className="text-sm text-gray-600">
                          This protocol focuses on reducing asymmetry and improving affected side strength.
                        </p>
                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            onClick={() => strokeProtocolMutation.mutate({
                              patientId: selectedPatientId!,
                              affectedSide: 'left',
                            })}
                            disabled={strokeProtocolMutation.isPending}
                          >
                            Left Side Affected
                          </Button>
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => strokeProtocolMutation.mutate({
                              patientId: selectedPatientId!,
                              affectedSide: 'right',
                            })}
                            disabled={strokeProtocolMutation.isPending}
                          >
                            Right Side Affected
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Protocol Features:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Progressive asymmetry reduction targets</li>
                          <li>• Real-time audio feedback for balance</li>
                          <li>• Automatic resistance adjustment</li>
                          <li>• Affected side strengthening focus</li>
                          <li>• Neurological event monitoring</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a Patient
              </h3>
              <p className="text-gray-500">
                Choose a patient to view bilateral force analysis
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
