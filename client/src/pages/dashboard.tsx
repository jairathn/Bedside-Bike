import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, MessageCircle, LogOut, Calculator, Gamepad2, TrendingUp, Play, Trophy, Menu, Lightbulb, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, HelpCircle, Heart, Activity, Info } from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";

// Patient-Friendly Did You Know Component
function PatientFactoids() {
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const statistics = [
    {
      stat: "More than 90%",
      text: "of time in the hospital is spent immobile in bed",
      reference: "Brown CJ, et al. Mobility limitation in the older patient: a clinical review. JAMA. 2013;310(11):1168-1177."
    },
    {
      stat: "More than 2%",
      text: "of muscle mass is lost daily in older hospitalized patients",
      reference: "Kortebein P, et al. Effect of 10 days of bed rest on skeletal muscle in healthy older adults. JAMA. 2007;297(16):1772-1774."
    },
    {
      stat: "One-third",
      text: "of patients leave more disabled than when they arrived",
      reference: "Brown CJ, et al. Mobility limitation in the older patient: a clinical review. JAMA. 2013;310(11):1168-1177."
    },
    {
      stat: "15%",
      text: "of 30-day readmissions are due to falls in newly deconditioned patients",
      reference: "Mahoney JE, et al. Temporal association between hospitalization and rate of falls after discharge. Arch Intern Med. 2000;160(18):2788-2795."
    },
    {
      stat: "20 minutes",
      text: "of cycling daily while you're admitted, or 400-900 steps can reduce or prevent hospital-acquired functional decline",
      reference: "Burtin C, et al. Early exercise in critically ill patients enhances short-term functional recovery. Crit Care Med. 2009;37(9):2499-505.\n\nAgmon M, et al. Association Between 900 Steps a Day and Functional Decline in Older Hospitalized Patients. JAMA Intern Med. 2017;177(2):272-274."
    }
  ];

  const startAutoRotation = () => {
    if (intervalId) clearInterval(intervalId);
    const newInterval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % statistics.length);
      setExpandedCitation(null);
    }, 7000);
    setIntervalId(newInterval);
  };

  const navigateToStat = (index: number) => {
    setCurrentStatIndex(index);
    setExpandedCitation(null);
    startAutoRotation();
  };

  const navigatePrevious = () => {
    const newIndex = currentStatIndex === 0 ? statistics.length - 1 : currentStatIndex - 1;
    navigateToStat(newIndex);
  };

  const navigateNext = () => {
    const newIndex = (currentStatIndex + 1) % statistics.length;
    navigateToStat(newIndex);
  };

  useEffect(() => {
    startAutoRotation();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  const currentStat = statistics[currentStatIndex];

  return (
    <Card className="mb-6 bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-base font-semibold text-white">Did You Know?</h3>
              <div className="flex space-x-1">
                {statistics.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                      index === currentStatIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-base font-medium mb-1 flex-1">
                <span className="text-xl font-bold text-yellow-300">{currentStat.stat}</span>
                {' '}{currentStat.text}
                <button
                  onClick={() => setExpandedCitation(expandedCitation === currentStatIndex ? null : currentStatIndex)}
                  className="ml-2 text-yellow-300 hover:text-yellow-200 transition-colors"
                >
                  {expandedCitation === currentStatIndex ? (
                    <ChevronUp className="w-3 h-3 inline" />
                  ) : (
                    <ChevronDown className="w-3 h-3 inline" />
                  )}
                </button>
              </div>
              <div className="flex items-center space-x-1 ml-3">
                <button
                  onClick={navigatePrevious}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Previous statistic"
                >
                  <ChevronLeft className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={navigateNext}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Next statistic"
                >
                  <ChevronRight className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
            {expandedCitation === currentStatIndex && (
              <div className="mt-2 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-xs text-green-100 italic whitespace-pre-line">
                  <strong>Reference:</strong> {currentStat.reference}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, patient, logout } = useAuth();
  const currentPatient = patient || user;
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showGoalExplanation, setShowGoalExplanation] = useState(false);
  const [showMETsExplanation, setShowMETsExplanation] = useState(false);

  useEffect(() => {
    if (!currentPatient) {
      setLocation("/");
    }
  }, [currentPatient, setLocation]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/patients/${currentPatient?.id}/dashboard`],
    enabled: !!currentPatient?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch fresh data
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
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = (dashboardData as any)?.stats;
  const goals = (dashboardData as any)?.goals;
  const adaptiveGoal = (dashboardData as any)?.adaptiveGoal;
  const sessions = (dashboardData as any)?.recentSessions || [];

  // Calculate today's progress - sum all sessions from today
  const today = new Date().toISOString().split('T')[0]; // Get today's date (YYYY-MM-DD)
  const recentSessions = (dashboardData as any)?.recentSessions || [];
  const todayMinutes = recentSessions
    .filter((session: any) => session.sessionDate === today)
    .reduce((total: number, session: any) => total + (session.duration / 60), 0);
  // Calculate daily target = session duration × number of sessions (same as goals page)
  const targetMinutes = (() => {
    const durationGoal = goals?.find((g: any) => g.goalType === 'duration');
    const sessionsGoal = goals?.find((g: any) => g.goalType === 'sessions');
    // Check if targetValue is already in minutes or needs conversion from seconds
    const sessionMinutes = durationGoal ? 
      (durationGoal.targetValue > 60 ? durationGoal.targetValue / 60 : durationGoal.targetValue) : 15;
    const sessionsPerDay = sessionsGoal ? sessionsGoal.targetValue : 2;
    return Math.round(sessionMinutes * sessionsPerDay);
  })();
  const todayProgress = Math.min((todayMinutes / targetMinutes) * 100, 100);

  // Function to calculate METs from watts
  // Based on ACSM formula: VO2 (mL/kg/min) = 7 + 10.8 * (W / kg)
  // METs = VO2 / 3.5
  const calculateMETs = (watts: number, weightKg?: number) => {
    // Use patient weight if available, otherwise use average of 70kg
    const weight = weightKg || 70;
    const wPerKg = watts / weight;
    const vo2 = 7 + (10.8 * wPerKg);
    const mets = vo2 / 3.5;
    return Math.round(mets * 10) / 10; // Round to 1 decimal place
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Hi {currentPatient?.firstName}! 👋
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">Let's pedal!</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/provider-access")} className="flex-1 sm:flex-none">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-xs sm:text-sm">My Providers</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/risk-assessment")} className="flex-1 sm:flex-none">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-xs sm:text-sm">Goal Calculator</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/games")} className="hidden sm:flex">
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-xs sm:text-sm">Games</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/kudos-wall")} className="hidden sm:flex">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-xs sm:text-sm">Community</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span className="text-xs sm:text-sm">Logout</span>
              </Button>
              
              {/* Mobile Menu Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Mobile Dropdown Menu */}
            {showMobileMenu && (
              <div className="sm:hidden mt-4 space-y-2">
                <Button variant="ghost" size="sm" onClick={() => setLocation("/games")} className="w-full justify-start">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Games
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/kudos-wall")} className="w-full justify-start">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Community
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-8">
        
        {/* Patient Education Factoids */}
        <PatientFactoids />
        
        {/* Today's Main Focus - Extra Large and Prominent */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-4 sm:p-8">
            <div className="text-center">
              <div className="mb-4 sm:mb-6">
                <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6">
                  <ProgressRing 
                    progress={todayProgress}
                    size={96}
                    strokeWidth={8}
                    color="stroke-white"
                  />
                </div>
                <div className="text-2xl sm:text-4xl font-bold mb-2">
                  {Math.floor(todayProgress)}% Complete
                </div>
                <div className="text-blue-100 text-lg sm:text-2xl mb-4 sm:mb-6">
                  {Math.floor(todayMinutes)} of {targetMinutes} minutes today
                </div>
              </div>
              
              {todayProgress < 100 ? (
                <Button 
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 text-lg sm:text-2xl px-6 sm:px-12 py-4 sm:py-6 h-auto font-bold rounded-xl w-full sm:w-auto"
                  onClick={() => setLocation("/session")}
                >
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                  Start Exercise
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center text-green-200">
                    <Trophy className="w-10 h-10 mr-3" />
                    <span className="text-3xl font-bold">Daily Goal Complete!</span>
                  </div>
                  <Button 
                    size="lg"
                    className="bg-green-600 text-white hover:bg-green-700 text-2xl px-12 py-6 h-auto font-bold rounded-xl"
                    onClick={() => setLocation("/session")}
                  >
                    <Play className="w-8 h-8 mr-3" />
                    Bonus Session?
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats - Larger and Clearer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="text-center">
            <CardContent className="p-4 sm:p-6">
              <div className="text-2xl sm:text-4xl font-bold text-blue-600 mb-2">
                {stats?.totalSessions || 0}
              </div>
              <div className="text-sm sm:text-lg text-gray-600 mb-2">Total Sessions</div>
              <Badge variant="secondary" className="text-sm sm:text-lg px-2 sm:px-3 py-1">
                {stats?.consistencyStreak || 0} day streak
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4 sm:p-6">
              <div className="text-2xl sm:text-4xl font-bold text-green-600 mb-2">
                {Math.floor((stats?.avgDailyDuration || 0) / 60)}
              </div>
              <div className="text-sm sm:text-lg text-gray-600 mb-2">Average Daily</div>
              <Badge variant="secondary" className="text-sm sm:text-lg px-2 sm:px-3 py-1">
                minutes per day
              </Badge>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4 sm:p-6">
              <div className="text-2xl sm:text-4xl font-bold text-orange-600 mb-2">
                {sessions && sessions.length > 2 ? (
                  <>
                    {/* Show recent trend: last 3 sessions vs previous 3 sessions */}
                    {(() => {
                      const recent3 = sessions.slice(0, 3).reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / 3;
                      const previous3 = sessions.slice(3, 6).reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / 3;
                      const improvement = recent3 - previous3;
                      return improvement > 0.5 ? `+${Math.round(improvement * 10) / 10}W` : 
                             improvement < -0.5 ? `${Math.round(improvement * 10) / 10}W` : 
                             `${Math.round(recent3 * 10) / 10}W`;
                    })()}
                  </>
                ) : sessions && sessions.length > 0 ? (
                  `${Math.round(parseFloat(sessions[0]?.avgPower || '0') * 10) / 10}W`
                ) : (
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 mx-auto" />
                )}
              </div>
              <div className="text-sm sm:text-lg text-gray-600 mb-2">
                {sessions && sessions.length > 2 ? (
                  (() => {
                    const recent3 = sessions.slice(0, 3).reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / 3;
                    const previous3 = sessions.slice(3, 6).reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / 3;
                    const improvement = recent3 - previous3;
                    return improvement > 0.5 ? 'Getting Stronger!' : 
                           improvement < -0.5 ? 'Gentle Recovery' : 
                           'Steady Progress';
                  })()
                ) : sessions && sessions.length > 0 ? 'Recent Power' : 'View Progress'}
              </div>
              <Badge variant="secondary" className="text-sm sm:text-lg px-2 sm:px-3 py-1">
                {sessions && sessions.length > 2 ? (
                  (() => {
                    const recent3 = sessions.slice(0, 3).reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / 3;
                    const previous3 = sessions.slice(3, 6).reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / 3;
                    const improvement = recent3 - previous3;
                    return improvement > 0.5 ? 'Excellent!' : 
                           improvement < -0.5 ? 'Rest & rebuild' : 
                           'Consistent effort';
                  })()
                ) : sessions && sessions.length > 0 ? 'Latest session' : 'Charts & Trends'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Feature Access Menu */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-purple-200 bg-purple-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/kudos-wall")}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-purple-900">Community Wall</h3>
                    <p className="text-sm sm:text-base text-purple-700">Share encouragement with other patients</p>
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white text-xs sm:text-sm">New</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/games")}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-blue-900">Interactive Games</h3>
                    <p className="text-sm sm:text-base text-blue-700">Make exercise fun with bike games</p>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white text-xs sm:text-sm">Play</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-green-200 bg-green-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/risk-assessment")}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-6">
                <Calculator className="w-8 h-8 sm:w-12 sm:h-12 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-green-900">Goal Calculator</h3>
                  <p className="text-sm sm:text-lg text-green-700">Get your optimal mobility goals based on your health profile</p>
                  <Badge className="bg-green-600 text-white mt-2 text-xs sm:text-sm">AI-Powered</Badge>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs sm:text-sm text-green-600 font-medium">Personalized</div>
                <div className="text-xs text-green-500">Smart Recommendations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Large Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Button 
            size="lg"
            className="h-16 sm:h-20 bg-blue-600 hover:bg-blue-700 text-lg sm:text-xl font-semibold btn-interactive group"
            onClick={() => setLocation("/goals")}
          >
            <Target className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 transition-transform group-hover:rotate-12" />
            View My Goals
          </Button>
          <Button 
            size="lg"
            className="h-20 bg-green-600 hover:bg-green-700 text-xl font-semibold btn-interactive group"
            onClick={() => setLocation("/reports")}
          >
            <TrendingUp className="w-8 h-8 mr-3 transition-transform group-hover:scale-110" />
            Progress Reports
          </Button>
        </div>

        {/* Additional Goals - Patient-Friendly Only */}
        {goals && goals.filter((goal: any) => ['resistance', 'duration', 'sessions', 'power'].includes(goal.goalType)).length > 0 && (
          <Card className="card-interactive animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Additional Goals</h3>
                <Dialog open={showGoalExplanation} onOpenChange={setShowGoalExplanation}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Why was this recommended?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center text-2xl text-blue-700">
                        <Heart className="w-6 h-6 mr-2 text-red-500" />
                        Your Personal Exercise Plan
                      </DialogTitle>
                      <DialogDescription className="text-base text-gray-700 leading-relaxed">
                        Understanding why these goals were chosen just for you
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-6">
                      {/* Why Exercise Matters */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                          <Activity className="w-5 h-5 mr-2" />
                          Why Exercise Helps You Get Better
                        </h4>
                        <div className="space-y-3 text-gray-700">
                          <p>
                            When you're in the hospital, your body needs help staying strong. Just like a car that sits too long gets rusty, 
                            your muscles get weaker when you don't move around.
                          </p>
                          <p>
                            <strong>Here's what happens when you exercise:</strong>
                          </p>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Your heart gets stronger and pumps blood better</li>
                            <li>Your muscles stay strong so you can walk and move easily</li>
                            <li>Your lungs work better to give you more energy</li>
                            <li>You're less likely to fall when you go home</li>
                            <li>You feel better and have more energy during the day</li>
                            <li>You might be able to go home sooner</li>
                          </ul>
                        </div>
                      </div>

                      {/* How Goals Were Calculated */}
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-green-800 mb-3">
                          How We Picked YOUR Specific Goals
                        </h4>
                        <div className="space-y-3 text-gray-700">
                          <p>
                            Your healthcare team used Bedside Bike's smart computer system to create goals that are perfect for you. 
                            This isn't a guess - it's based on real science!
                          </p>
                          <p>
                            <strong>We looked at things like:</strong>
                          </p>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Your age and health conditions</li>
                            <li>How active you were before coming to the hospital</li>
                            <li>What medications you're taking</li>
                            <li>How long you've been in the hospital</li>
                            <li>Your current strength and energy levels</li>
                          </ul>
                          <p>
                            Then our computer program (like a very smart calculator) figured out exactly how much exercise 
                            would help you the most without being too hard.
                          </p>
                        </div>
                      </div>

                      {/* Encouragement */}
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-yellow-800 mb-3">
                          You Can Do This! 💪
                        </h4>
                        <div className="space-y-3 text-gray-700">
                          <p>
                            These goals might seem challenging, but remember: they were made just for you. Your healthcare team 
                            believes you can reach them, and we're here to help every step of the way.
                          </p>
                          <p>
                            <strong>Remember:</strong>
                          </p>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Start slow and work your way up</li>
                            <li>Every minute of exercise helps</li>
                            <li>It's okay to take breaks</li>
                            <li>Ask your nurse or therapist if you have questions</li>
                            <li>You're getting stronger every day!</li>
                          </ul>
                          <p className="font-semibold text-green-700">
                            You're not just exercising - you're taking control of your recovery and building a stronger, 
                            healthier future for yourself!
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid gap-4">
                {goals
                  .filter((goal: any) => ['resistance', 'duration', 'sessions', 'power'].includes(goal.goalType))
                  .map((goal: any, index: number) => {
                    const isAchieved = parseFloat(goal.currentValue || '0') >= parseFloat(goal.targetValue || '0');
                    const isPowerGoal = goal.goalType === 'power';
                    const watts = isPowerGoal ? parseFloat(goal.targetValue || '0') : null;
                    const mets = isPowerGoal && watts ? calculateMETs(watts, (dashboardData as any)?.patient?.weightKg) : null;
                    
                    return (
                      <div 
                        key={goal.id || index} 
                        className={`flex justify-between items-center p-4 rounded-lg transition-all duration-300 hover:shadow-md ${
                          isAchieved 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 animate-pulse-glow' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div>
                          <h4 className="text-lg font-medium flex items-center">
                            {goal.label}
                            {isAchieved && <span className="ml-2 animate-gentle-bounce">🎯</span>}
                          </h4>
                          <p className="text-gray-600">{goal.subtitle}</p>
                          {isPowerGoal && mets && (
                            <p className="text-sm text-orange-600 font-medium mt-1 flex items-center">
                              ≈ {mets} METs
                              <Dialog open={showMETsExplanation} onOpenChange={setShowMETsExplanation}>
                                <DialogTrigger asChild>
                                  <button className="ml-1 text-orange-500 hover:text-orange-700">
                                    <Info className="w-3 h-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center text-xl text-orange-700">
                                      <Activity className="w-5 h-5 mr-2" />
                                      What are METs?
                                    </DialogTitle>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4 mt-4 pb-4">
                                    <div className="bg-orange-50 p-4 rounded-lg">
                                      <h4 className="text-lg font-semibold text-orange-800 mb-3">
                                        METs Made Simple
                                      </h4>
                                      <div className="space-y-3 text-gray-700">
                                        <p>
                                          <strong>MET</strong> stands for "Metabolic Equivalent of Task." Think of it as a way to measure how hard your body is working.
                                        </p>
                                        <p>
                                          <strong>1 MET = sitting quietly</strong> (like watching TV)
                                        </p>
                                        <p>
                                          <strong>Here are some examples:</strong>
                                        </p>
                                        <ul className="list-disc pl-6 space-y-1">
                                          <li>1 MET = Sitting, watching TV</li>
                                          <li>2 METs = Walking slowly</li>
                                          <li>3 METs = Walking at normal speed</li>
                                          <li>4 METs = Fast walking</li>
                                          <li>6 METs = Biking at medium speed</li>
                                          <li>8+ METs = Running or intense exercise</li>
                                        </ul>
                                      </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-lg">
                                      <h4 className="text-lg font-semibold text-blue-800 mb-3">
                                        Why We Use METs in the Hospital
                                      </h4>
                                      <div className="space-y-3 text-gray-700">
                                        <p>
                                          METs help your healthcare team know exactly how much energy you're using during exercise.
                                        </p>
                                        <p>
                                          <strong>This helps us:</strong>
                                        </p>
                                        <ul className="list-disc pl-6 space-y-1">
                                          <li>Make sure your exercise is safe for your heart</li>
                                          <li>Give you the right amount of exercise (not too little, not too much)</li>
                                          <li>Track your progress as you get stronger</li>
                                          <li>Compare your effort to other activities you might do at home</li>
                                        </ul>
                                        <p className="font-semibold text-blue-700">
                                          Your MET level shows how hard you're working compared to just sitting still. Higher METs mean you're getting a better workout!
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold transition-colors ${
                            isAchieved ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {goal.goalType === 'duration' && parseFloat(goal.targetValue || '0') > 100 
                              ? Math.round(parseFloat(goal.targetValue || '0') / 60) 
                              : Math.round(parseFloat(goal.targetValue || '0'))}
                          </div>
                          <div className="text-sm text-gray-600">
                            {goal.goalType === 'duration' ? 'minutes' : goal.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}