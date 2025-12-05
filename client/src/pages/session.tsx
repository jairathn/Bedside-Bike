import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Pause, Square, Zap, Clock, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SessionPage() {
  const [, setLocation] = useLocation();
  const { patient } = useAuth();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentPower, setCurrentPower] = useState(0);
  const [avgPower, setAvgPower] = useState(0);
  const [resistance, setResistance] = useState(3.5);
  
  // Get provider-sent goals to determine target power
  const { data: dashboardData } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/dashboard`],
    enabled: !!patient?.id,
  });
  
  const targetPower = dashboardData?.goals?.find((goal: any) => goal.goalType === 'power')?.targetValue || 37.7;

  useEffect(() => {
    if (!patient) {
      setLocation("/");
      return;
    }

    let interval: NodeJS.Timeout;
    if (sessionActive && !sessionPaused) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
        // Simulate realistic power fluctuations based on provider target
        const basePower = parseFloat(targetPower) + (resistance - 3.5) * 15;
        const fluctuation = (Math.random() - 0.5) * 20;
        const newPower = Math.max(0, Math.round(basePower + fluctuation));
        setCurrentPower(newPower);
        
        // Update average power
        setAvgPower(prev => Math.round((prev * (sessionTime) + newPower) / (sessionTime + 1)));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive, sessionPaused, sessionTime, resistance, patient, setLocation, targetPower]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = () => {
    setSessionActive(true);
    setSessionPaused(false);
    setSessionTime(0);
    setCurrentPower(0);
    setAvgPower(0);
  };

  const handlePauseResume = () => {
    setSessionPaused(!sessionPaused);
  };

  const handleEndSession = () => {
    setSessionActive(false);
    setSessionPaused(false);
    // Here you would typically save the session data
  };

  const targetTime = 40 * 60; // 40 minutes in seconds
  const progress = Math.min((sessionTime / targetTime) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mr-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Exercise Session</h1>
            </div>
            <span className="text-sm text-gray-600">Welcome, {patient?.firstName} {patient?.lastName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Status */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">{formatTime(sessionTime)}</div>
              <div className="text-lg text-gray-600">Session Duration</div>
              {sessionActive && (
                <div className="mt-2">
                  <Progress value={progress} className="w-full max-w-md mx-auto h-3" />
                  <div className="text-sm text-gray-500 mt-1">
                    {Math.round(progress)}% of daily goal (40 min)
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              {!sessionActive ? (
                <Button 
                  onClick={handleStartSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Session
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handlePauseResume}
                    variant="outline"
                    size="lg"
                    className="px-6"
                  >
                    {sessionPaused ? <Play className="w-5 h-5 mr-2" /> : <Pause className="w-5 h-5 mr-2" />}
                    {sessionPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button 
                    onClick={handleEndSession}
                    variant="destructive"
                    size="lg"
                    className="px-6"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    End Session
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{currentPower}W</div>
              <div className="text-sm text-gray-600 mb-2">Current Power</div>
              <div className="text-xs text-gray-500">Avg: {avgPower}W</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{resistance.toFixed(1)}</div>
              <div className="text-sm text-gray-600 mb-2">Resistance Level</div>
              <div className="flex justify-center space-x-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setResistance(Math.max(1, resistance - 0.5))}
                  disabled={!sessionActive}
                >
                  -
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setResistance(Math.min(10, resistance + 0.5))}
                  disabled={!sessionActive}
                >
                  +
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {Math.max(0, Math.round((targetTime - sessionTime) / 60))}
              </div>
              <div className="text-sm text-gray-600 mb-2">Minutes to Goal</div>
              <div className="text-xs text-gray-500">
                {sessionTime >= targetTime ? "Goal achieved!" : `${Math.round(targetTime / 60)} min target`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Tips */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Start Slowly</div>
                  <div className="text-sm text-gray-600">Begin with light resistance and gradually increase as you warm up</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-sm font-semibold">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Maintain Steady Pace</div>
                  <div className="text-sm text-gray-600">Keep a consistent rhythm rather than rushing</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-orange-600 text-sm font-semibold">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Listen to Your Body</div>
                  <div className="text-sm text-gray-600">Take breaks if needed and don't push through pain</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">4</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Stay Hydrated</div>
                  <div className="text-sm text-gray-600">Keep water nearby and sip regularly during exercise</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}