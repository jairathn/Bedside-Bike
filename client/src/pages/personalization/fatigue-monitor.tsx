import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  Zap,
  Heart,
  Gauge,
  Timer,
  Users,
  RefreshCw,
  Eye
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface FatigueEvent {
  id: number;
  sessionId: number;
  timestamp: string;
  fatigueType: string;
  severity: string;
  confidence: number;
  metrics: {
    powerDecline?: number;
    cadenceCV?: number;
    asymmetryIncrease?: number;
  };
  actionTaken?: string;
}

interface SessionMetrics {
  timestamp: string;
  power: number;
  cadence: number;
  heartRate?: number;
  fatigueLevel: number;
}

export default function FatigueMonitorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<SessionMetrics[]>([]);

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

  // Get fatigue history
  const { data: fatigueHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/fatigue-history`],
    enabled: !!selectedPatientId,
  });

  // Simulate live metrics (in production, this would come from WebSocket)
  useEffect(() => {
    if (!isLiveMode || !selectedPatientId) return;

    const interval = setInterval(() => {
      const now = new Date();
      const basepower = 30 + Math.random() * 10;
      const fatigue = liveMetrics.length > 30 ? Math.min(liveMetrics.length / 60, 1) : 0;

      setLiveMetrics(prev => {
        const newMetrics = [
          ...prev.slice(-59),
          {
            timestamp: now.toISOString(),
            power: Math.max(10, basepower - (fatigue * 15) + (Math.random() - 0.5) * 5),
            cadence: 45 + Math.random() * 10 - (fatigue * 5),
            heartRate: 80 + Math.random() * 20,
            fatigueLevel: fatigue * 100,
          }
        ];
        return newMetrics;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveMode, selectedPatientId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-500 text-white';
      case 'moderate': return 'bg-orange-500 text-white';
      case 'mild': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getFatigueTypeIcon = (type: string) => {
    switch (type) {
      case 'power_decline': return <TrendingDown className="w-4 h-4" />;
      case 'cadence_variability': return <Gauge className="w-4 h-4" />;
      case 'asymmetry': return <Activity className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const currentFatigueLevel = liveMetrics.length > 0
    ? liveMetrics[liveMetrics.length - 1].fatigueLevel
    : 0;

  const getFatigueLevelColor = (level: number) => {
    if (level < 30) return 'text-green-600';
    if (level < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className="w-8 h-8 mr-3 text-blue-600" />
            Fatigue Detection & Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time fatigue detection with automatic resistance adjustment recommendations
          </p>
        </div>

        {/* Mock Data Banner */}
        {isLiveMode && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Simulated Data Mode</p>
              <p className="text-sm text-amber-700">
                Live metrics are simulated for demonstration. Connect to a real Bedside Bike device and Azure database for actual patient data.
              </p>
            </div>
          </div>
        )}

        {/* Patient Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(v) => {
                    setSelectedPatientId(parseInt(v));
                    setLiveMetrics([]);
                    setIsLiveMode(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient to monitor..." />
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
                    onClick={() => setIsLiveMode(!isLiveMode)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isLiveMode ? "Stop Monitoring" : "Start Live Monitoring"}
                  </Button>
                  <Button variant="outline" onClick={() => refetchHistory()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh History
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPatientId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Monitoring Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={`${currentFatigueLevel > 60 ? 'border-red-500 border-2' : ''}`}>
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${getFatigueLevelColor(currentFatigueLevel)}`} />
                    <div className={`text-3xl font-bold ${getFatigueLevelColor(currentFatigueLevel)}`}>
                      {Math.round(currentFatigueLevel)}%
                    </div>
                    <div className="text-sm text-gray-600">Fatigue Level</div>
                    <Progress
                      value={currentFatigueLevel}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <div className="text-3xl font-bold text-gray-900">
                      {liveMetrics.length > 0
                        ? Math.round(liveMetrics[liveMetrics.length - 1].power)
                        : '--'}W
                    </div>
                    <div className="text-sm text-gray-600">Current Power</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Gauge className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-3xl font-bold text-gray-900">
                      {liveMetrics.length > 0
                        ? Math.round(liveMetrics[liveMetrics.length - 1].cadence)
                        : '--'}
                    </div>
                    <div className="text-sm text-gray-600">RPM</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <div className="text-3xl font-bold text-gray-900">
                      {liveMetrics.length > 0 && liveMetrics[liveMetrics.length - 1].heartRate
                        ? Math.round(liveMetrics[liveMetrics.length - 1].heartRate!)
                        : '--'}
                    </div>
                    <div className="text-sm text-gray-600">Heart Rate</div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Real-Time Metrics
                    {isLiveMode && (
                      <Badge className="ml-2 bg-green-500 animate-pulse">LIVE</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLiveMode && liveMetrics.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={liveMetrics.slice(-30)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                          />
                          <YAxis yAxisId="left" domain={[0, 60]} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                          <Tooltip
                            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                            formatter={(value: number, name: string) => [
                              Math.round(value),
                              name === 'power' ? 'Power (W)' :
                              name === 'cadence' ? 'RPM' :
                              name === 'fatigueLevel' ? 'Fatigue %' : name
                            ]}
                          />
                          <ReferenceLine y={60} yAxisId="right" stroke="red" strokeDasharray="3 3" label="Fatigue Threshold" />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="power"
                            stroke="#EAB308"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="cadence"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="fatigueLevel"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Timer className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">Click "Start Live Monitoring" to view real-time data</p>
                        <p className="text-sm mt-2">Data updates every second during active sessions</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Auto-Resistance Recommendation */}
              {currentFatigueLevel > 60 && (
                <Card className="border-2 border-orange-500 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-800">Fatigue Detected - Resistance Reduction Recommended</h3>
                        <p className="text-orange-700 text-sm">
                          Patient shows signs of fatigue. Consider reducing resistance by 1-2 levels or ending session.
                        </p>
                      </div>
                      <Button variant="outline" className="border-orange-500 text-orange-700">
                        Reduce Resistance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Fatigue History */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Fatigue History</CardTitle>
                  <CardDescription>Recent fatigue events from past sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  {fatigueHistory.events && fatigueHistory.events.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {fatigueHistory.events.map((event: FatigueEvent) => (
                        <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getFatigueTypeIcon(event.fatigueType)}
                              <span className="font-medium text-sm">
                                {event.fatigueType.replace('_', ' ')}
                              </span>
                            </div>
                            <Badge className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Confidence: {Math.round(event.confidence * 100)}%
                          </div>
                          {event.metrics && (
                            <div className="mt-2 text-xs grid grid-cols-2 gap-1">
                              {event.metrics.powerDecline && (
                                <div>Power Drop: {event.metrics.powerDecline}%</div>
                              )}
                              {event.metrics.cadenceCV && (
                                <div>Cadence CV: {event.metrics.cadenceCV}%</div>
                              )}
                            </div>
                          )}
                          {event.actionTaken && (
                            <div className="mt-2 text-xs text-green-600">
                              Action: {event.actionTaken}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No fatigue events recorded</p>
                      <p className="text-xs mt-1">Events appear when fatigue is detected during sessions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a Patient
              </h3>
              <p className="text-gray-500">
                Choose a patient from the dropdown to view their fatigue monitoring data
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
