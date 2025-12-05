import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bike, Clock, Zap, Target, Trophy, Settings, LogOut, Play, ChartLine, Gamepad2, Calculator, AlertTriangle, Brain } from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { MetricCard } from "@/components/metric-card";
import { AchievementCard } from "@/components/achievement-card";
import { Leaderboard } from "@/components/leaderboard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { patient, logout } = useAuth();
  const [chartView, setChartView] = useState<'1day' | 'hospital'>('hospital');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!patient) {
      setLocation("/");
    }
  }, [patient, setLocation]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/dashboard`],
    enabled: !!patient?.id,
  });

  const chartDays = chartView === '1day' ? 1 : 7;
  
  const { data: usageData } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/usage-data`, { days: chartDays }],
    enabled: !!patient?.id,
  });

  const { data: dailySessions } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/daily-sessions?date=${selectedDate.toISOString().split('T')[0]}`],
    enabled: !!patient?.id && chartView === '1day',
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["/api/leaderboard"],
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!patient) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const goals = dashboardData?.goals || [];
  const achievements = dashboardData?.achievements || [];
  const daysSinceStart = dashboardData?.daysSinceStart || 0;
  const adaptiveGoal = dashboardData?.adaptiveGoal;

  // Process usage data for chart
  const chartData = chartView === '1day' 
    ? (dailySessions || []).map((session, index) => ({
        name: `Session ${index + 1}`,
        time: new Date(session.startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        duration: Math.round(session.duration / 60), // Convert to minutes
        power: Math.round(session.avgPower || 0),
      }))
    : usageData?.map((day, index) => {
        const date = new Date(day.date);
        let name;
        
        if (chartView === 'hospital') {
          name = `Day ${index + 1}`;
        } else {
          name = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return {
          name,
          duration: Math.round(day.duration / 60), // Convert to minutes
          power: Math.round(day.avgPower || 0),
        };
      }) || [];



  const chartConfig = {
    duration: {
      label: "Duration (min)",
      color: "hsl(217, 91%, 60%)",
    },
    power: {
      label: "Avg Power (W)",
      color: "hsl(43, 96%, 56%)",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <Bike className="text-white text-sm" size={16} />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Bedside Bike</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {patient.firstName} {patient.lastName}</span>
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Day {Math.min(daysSinceStart + 1, 6)} of Your Recovery</h2>
                  <p className="text-blue-100">You've been consistently improving! Keep it up!</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{Math.min(daysSinceStart + 1, 6)}</div>
                  <div className="text-sm text-blue-200">Days in Hospital</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Risk Assessment CTA */}
        <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-xl font-semibold text-indigo-900">Personalized Risk Assessment</h3>
                </div>
                <p className="text-indigo-700 mb-4">
                  Get AI-powered analysis of your mobility risks and receive personalized exercise prescriptions 
                  tailored to prevent hospital-acquired complications.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-indigo-600">
                  <span className="bg-indigo-100 px-2 py-1 rounded">• Deconditioning Risk</span>
                  <span className="bg-indigo-100 px-2 py-1 rounded">• VTE Prevention</span>
                  <span className="bg-indigo-100 px-2 py-1 rounded">• Fall Risk</span>
                  <span className="bg-indigo-100 px-2 py-1 rounded">• Pressure Injury</span>
                  <span className="bg-indigo-100 px-2 py-1 rounded">• Length of Stay</span>
                </div>
              </div>
              <div className="ml-6">
                <Button 
                  onClick={() => setLocation("/risk-assessment")}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  Start Assessment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<Clock className="w-5 h-5" />}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
            title="Session Time"
            value="40m"
            subtitle="Today"
            change="+5m from yesterday"
            changeColor="text-green-600"
          />
          <MetricCard
            icon={<Zap className="w-5 h-5" />}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            title="Avg Power"
            value={`${Math.round(usageData?.[usageData.length - 1]?.avgPower || 88)}W`}
            subtitle="Today"
            change="+8W from yesterday"
            changeColor="text-orange-600"
          />
          <MetricCard
            icon={<Target className="w-5 h-5" />}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            title="Today's Goal"
            value={`${adaptiveGoal?.durationGoal || 40}min`}
            subtitle={adaptiveGoal?.adaptiveReason || "Personalized target"}
            change={adaptiveGoal?.adaptiveReason || "Based on your progress"}
            changeColor="text-blue-600"
          />
          <MetricCard
            icon={<Trophy className="w-5 h-5" />}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
            title="Hospital Rank"
            value="3rd Place"
            subtitle="This stay"
            change="Better than 60% of patients"
            changeColor="text-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Progress Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {chartView === '1day' ? 'Daily Sessions' : 'Your Progress'}
                    </h3>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant={chartView === '1day' ? 'default' : 'outline'}
                        onClick={() => setChartView('1day')}
                        className={chartView === '1day' ? 'bg-blue-600 hover:bg-blue-700 text-xs px-2' : 'text-xs px-2'}
                      >
                        1 Day
                      </Button>
                      <Button 
                        size="sm" 
                        variant={chartView === 'hospital' ? 'default' : 'outline'}
                        onClick={() => setChartView('hospital')}
                        className={chartView === 'hospital' ? 'bg-blue-600 hover:bg-blue-700 text-xs px-2' : 'text-xs px-2'}
                      >
                        Stay
                      </Button>
                    </div>
                  </div>
                  {chartView === '1day' && (
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
                        disabled={selectedDate <= new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)}
                        className="px-3"
                      >
                        ←
                      </Button>
                      <span className="text-sm font-medium px-4 py-1 bg-gray-100 rounded min-w-[80px] text-center">
                        {selectedDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                        disabled={selectedDate.toDateString() === new Date().toDateString()}
                        className="px-3"
                      >
                        →
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Chart */}
                <div className="h-80 w-full">
                  <div className="flex h-full">
                    {/* Y-axis */}
                    <div className="flex flex-col justify-between items-end pr-3 py-4 text-xs text-gray-500 w-12">
                      <span>60</span>
                      <span>45</span>
                      <span>30</span>
                      <span>15</span>
                      <span>0</span>
                    </div>
                    
                    {/* Chart area */}
                    <div className="flex-1 relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between py-4">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="border-t border-gray-200 w-full"></div>
                        ))}
                      </div>
                      
                      {/* Bars */}
                      <div className="relative h-full flex items-end justify-between px-4 py-4">
                        {chartData.length > 0 ? chartData.map((item, index) => {
                          // Force visible bars with proportional heights
                          const heightPx = chartView === '1day' 
                            ? Math.max(item.duration * 4, 40) // 4px per minute, min 40px  
                            : Math.max(item.duration * 3, 30); // 3px per minute, min 30px
                          
                          return (
                            <div key={index} className="flex flex-col items-center flex-1 mx-1">
                              <div 
                                className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600 cursor-pointer relative group"
                                style={{ 
                                  height: `${heightPx}px`,
                                  width: '40px',
                                  backgroundColor: '#3b82f6'
                                }}
                              >
                                {/* Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                  {item.duration} min
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 mt-2 text-center truncate w-full">
                                {chartView === '1day' ? item.time : item.name}
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">
                            No sessions found for this date
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Y-axis label */}
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Exercise Duration (minutes)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals & Achievements */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Goals</h3>
              
              <div className="space-y-6">
                {/* Adaptive Daily Duration Goal */}
                {adaptiveGoal && (
                  <div className="flex items-center space-x-4">
                    <ProgressRing 
                      progress={Math.min(((stats?.avgDailyDuration || 0) / 60 / adaptiveGoal.durationGoal) * 100, 100)} 
                      color="stroke-green-500" 
                      showCheck={((stats?.avgDailyDuration || 0) / 60) >= adaptiveGoal.durationGoal}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Today's Duration Goal</div>
                      <div className={`text-sm ${((stats?.avgDailyDuration || 0) / 60) >= adaptiveGoal.durationGoal ? 'text-green-600' : 'text-gray-600'}`}>
                        {Math.round((stats?.avgDailyDuration || 0) / 60)}/{adaptiveGoal.durationGoal} minutes today
                        {((stats?.avgDailyDuration || 0) / 60) >= adaptiveGoal.durationGoal && ' - Goal achieved!'}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">{adaptiveGoal.adaptiveReason}</div>
                    </div>
                  </div>
                )}
                
                {/* Other Goals */}
                {goals.filter(goal => goal.type !== 'duration').slice(0, 2).map((goal, index) => {
                  const progress = Math.round((goal.current / goal.target) * 100);
                  const colors = ['stroke-orange-500', 'stroke-blue-600'];
                  const isCompleted = progress >= 100;
                  
                  return (
                    <div key={goal.id} className="flex items-center space-x-4">
                      <ProgressRing 
                        progress={Math.min(progress, 100)} 
                        color={colors[index]} 
                        showCheck={isCompleted}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {goal.type === 'power' ? 'Power Output' : 
                           goal.type === 'consistency' ? 'Consistency' : 'Resistance Level'}
                        </div>
                        <div className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
                          {goal.type === 'power'
                            ? `${Math.round(goal.current)}/${Math.round(goal.target)} watts average`
                            : `${goal.current.toFixed(1)}/${goal.target.toFixed(1)} resistance level`}
                          {isCompleted && ' - Goal achieved!'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                Set New Goals
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Gamification Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Achievement Game */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recovery Quest</h3>
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-sm font-medium text-gray-600">Level {stats?.level || 3}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to Level {(stats?.level || 3) + 1}</span>
                  <span>{stats?.xp || 750}/1000 XP</span>
                </div>
                <Progress value={((stats?.xp || 750) / 1000) * 100} className="h-3" />
              </div>

              <div className="space-y-3">
                {achievements.slice(0, 3).map((achievement) => (
                  <AchievementCard 
                    key={achievement.id}
                    achievement={achievement}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Peer Comparison */}
          <Leaderboard data={leaderboard} currentPatientId={patient.id} />
        </div>

        {/* Customizable Metrics */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Your Custom Metrics</h3>
              <Button variant="outline" size="sm" className="text-blue-600">
                <span className="mr-1">+</span>Add Metric
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Sessions per Day</h4>
                  <Button variant="ghost" size="sm" className="p-1">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{((stats?.totalSessions || 15) / Math.max(daysSinceStart + 1, 1)).toFixed(1)}</div>
                <div className="text-sm text-gray-600">Per day average</div>
                <div className="text-xs text-green-600 mt-1">↗ +0.5 from admission</div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Improvement Rate</h4>
                  <Button variant="ghost" size="sm" className="p-1">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1">+35%</div>
                <div className="text-sm text-gray-600">Since admission</div>
                <div className="text-xs text-green-600 mt-1">↗ Power & endurance gains</div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Avg Resistance</h4>
                  <Button variant="ghost" size="sm" className="p-1">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </div>
                <div className="text-2xl font-bold text-orange-600 mb-1">4.0</div>
                <div className="text-sm text-gray-600">Current level</div>
                <div className="text-xs text-orange-600 mt-1">↗ +1.5 from admission</div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Stop/Start Events</h4>
                  <Button variant="ghost" size="sm" className="p-1">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1">1.0</div>
                <div className="text-sm text-gray-600">Per session today</div>
                <div className="text-xs text-green-600 mt-1">↓ -5 fewer interruptions</div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Peak Power</h4>
                  <Button variant="ghost" size="sm" className="p-1">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </div>
                <div className="text-2xl font-bold text-red-600 mb-1">115W</div>
                <div className="text-sm text-gray-600">Personal best</div>
                <div className="text-xs text-green-600 mt-1">↗ +30W from admission</div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Consistency Score</h4>
                  <Button variant="ghost" size="sm" className="p-1">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </div>
                <div className="text-2xl font-bold text-indigo-600 mb-1">{Math.round(((stats?.consistencyStreak || 6) / 6) * 100)}%</div>
                <div className="text-sm text-gray-600">{stats?.consistencyStreak || 6} day streak</div>
                <div className="text-xs text-green-600 mt-1">Perfect consistency!</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto hover:border-red-600 hover:bg-red-50 border-red-200 bg-red-25"
                onClick={() => setLocation('/risk-assessment')}
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                  <Calculator className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Risk Assessment</span>
              </Button>

              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto hover:border-blue-600 hover:bg-blue-50"
                onClick={() => setLocation('/session')}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Start Session</span>
              </Button>

              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto hover:border-green-600 hover:bg-green-50"
                onClick={() => setLocation('/goals')}
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Update Goals</span>
              </Button>

              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto hover:border-orange-600 hover:bg-orange-50"
                onClick={() => setLocation('/reports')}
              >
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                  <ChartLine className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">View Reports</span>
              </Button>

              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto hover:border-purple-600 hover:bg-purple-50"
                onClick={() => setLocation('/games')}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <Gamepad2 className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Play Games</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
