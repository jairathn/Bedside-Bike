import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Target, Trophy, Settings, LogOut, Play, MessageCircle, BarChart3 } from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
// Temporary inline collapsible component until we add the shadcn component
const Collapsible = ({ children, open, onOpenChange }: any) => (
  <div>{children}</div>
);
const CollapsibleTrigger = ({ children, asChild, ...props }: any) => (
  <div {...props}>{children}</div>
);
const CollapsibleContent = ({ children }: any) => (
  <div>{children}</div>
);
import { ChevronDown, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, patient, logout } = useAuth();
  const currentPatient = patient || user;
  
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!currentPatient) {
      setLocation("/");
    }
  }, [currentPatient, setLocation]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/patients/${currentPatient?.id}/dashboard`],
    enabled: !!currentPatient?.id,
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (isLoading || !currentPatient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = (dashboardData as any)?.stats;
  const goals = (dashboardData as any)?.goals;
  const achievements = (dashboardData as any)?.achievements;
  const adaptiveGoal = (dashboardData as any)?.adaptiveGoal;

  // Primary goal for focus
  const primaryGoal = goals?.[0] || {};
  const secondaryGoals = goals?.slice(1) || [];

  // Calculate today's progress
  const todayMinutes = Math.floor((stats?.totalDuration || 0) / 60) % (24 * 60);
  const targetMinutes = adaptiveGoal?.durationGoal || 15;
  const todayProgress = Math.min((todayMinutes / targetMinutes) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Hi {currentPatient?.firstName}! 👋
              </h1>
              <p className="text-gray-600">Let's pedal!</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/kudos-wall")}>
                <MessageCircle className="w-4 h-4 mr-1" />
                Kudos
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Today's Main Focus - Large, Prominent */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-24 h-24 mb-4">
                  <ProgressRing 
                    value={todayProgress}
                    size={96}
                    strokeWidth={8}
                    className="text-white"
                  />
                </div>
                <div className="text-3xl font-bold">
                  {Math.floor(todayProgress)}% Complete
                </div>
                <div className="text-blue-100 text-lg">
                  {Math.floor(todayMinutes)}min of {targetMinutes}min today
                </div>
              </div>
              
              {todayProgress < 100 ? (
                <Button 
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 text-xl px-8 py-4 h-auto font-semibold"
                  onClick={() => setLocation("/session")}
                >
                  <Play className="w-6 h-6 mr-2" />
                  Start Exercise
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center text-green-200">
                    <Trophy className="w-8 h-8 mr-2" />
                    <span className="text-2xl font-bold">Goal Complete!</span>
                  </div>
                  <Button 
                    size="lg"
                    className="bg-green-600 text-white hover:bg-green-700 text-xl px-8 py-4 h-auto font-semibold"
                    onClick={() => setLocation("/session")}
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Bonus Session?
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats - Simple & Large */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {stats?.totalSessions || 0}
              </div>
              <div className="text-gray-600">Total Sessions</div>
              <Badge variant="secondary" className="mt-2">
                {stats?.consistencyStreak || 0} day streak
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                Level {stats?.level || 1}
              </div>
              <div className="text-gray-600">Your Level</div>
              <Badge variant="secondary" className="mt-2">
                {stats?.xp || 0} XP
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Kudos & Social - Prominent for Engagement */}
        <Card className="border-purple-200 bg-purple-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/kudos-wall")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💙</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Community Wall</h3>
                  <p className="text-gray-600">See what others are celebrating</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">3</div>
                <div className="text-sm text-gray-500">New updates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Sections for Additional Info */}
        <div className="space-y-4">
          
          {/* Goals Section */}
          {secondaryGoals.length > 0 && (
            <Collapsible open={showAllGoals} onOpenChange={setShowAllGoals}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Target className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <h3 className="font-semibold">Other Goals</h3>
                          <p className="text-sm text-gray-600">{secondaryGoals.length} additional targets</p>
                        </div>
                      </div>
                      {showAllGoals ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-3 mt-3">
                  {secondaryGoals.map((goal: any, index: number) => (
                    <Card key={goal.id || index} className="border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{goal.label}</h4>
                            <p className="text-sm text-gray-600">{goal.subtitle}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {Math.floor(Number(goal.currentValue) || 0)}/{Math.floor(Number(goal.targetValue) || 0)}
                            </div>
                            <div className="text-xs text-gray-600">{goal.unit}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Progress Details */}
          <Collapsible open={showProgress} onOpenChange={setShowProgress}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 text-green-600 mr-3" />
                      <div>
                        <h3 className="font-semibold">Progress Details</h3>
                        <p className="text-sm text-gray-600">Charts and detailed stats</p>
                      </div>
                    </div>
                    {showProgress ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Detailed Statistics</h4>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xl font-bold text-blue-600">
                            {Math.floor((stats?.totalDuration || 0) / 60)}
                          </div>
                          <div className="text-sm text-gray-600">Total Minutes</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-green-600">
                            {Math.floor(stats?.avgDailyDuration || 0)}
                          </div>
                          <div className="text-sm text-gray-600">Avg Daily</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="text-center">
                    <Button 
                      onClick={() => setLocation("/reports")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      View Detailed Reports
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
        </div>

        {/* Simple Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button 
            size="lg"
            className="h-16 bg-blue-600 hover:bg-blue-700 text-lg"
            onClick={() => setLocation("/goals")}
          >
            <Target className="w-6 h-6 mr-2" />
            My Goals
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="h-16 text-lg"
            onClick={() => setLocation("/risk-assessment")}
          >
            <Settings className="w-6 h-6 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}