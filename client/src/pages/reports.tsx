import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, TrendingUp, Calendar, BarChart3, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, ResponsiveContainer } from "recharts";

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const { patient } = useAuth();
  const [reportPeriod, setReportPeriod] = useState<'hospital' | 'week' | 'month'>('hospital');

  useEffect(() => {
    if (!patient) {
      setLocation("/");
    }
  }, [patient, setLocation]);

  const { data: dashboardData } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/dashboard`],
    enabled: !!patient?.id,
  });

  // Process session data for charts
  const sessionData = (dashboardData as any)?.recentSessions || [];

  // Helper to format date string without timezone shift
  // "2026-01-10" should display as "Jan 10", not "Jan 9"
  const formatSessionDate = (dateStr: string) => {
    // Append noon time to prevent UTC midnight from shifting to previous day
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Aggregate sessions by day
  const sessionsByDay = sessionData.reduce((acc: any, session: any) => {
    const day = formatSessionDate(session.sessionDate);
    if (!acc[day]) {
      acc[day] = {
        day,
        totalDuration: 0,
        totalPower: 0,
        sessionCount: 0,
        date: session.sessionDate,
      };
    }
    acc[day].totalDuration += session.duration;
    acc[day].totalPower += parseFloat(session.avgPower) || 0;
    acc[day].sessionCount += 1;
    return acc;
  }, {});

  // Convert to array and sort by date
  const dailyData = Object.values(sessionsByDay).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Duration is stored in MINUTES
  const progressData = dailyData.map((day: any) => ({
    day: day.day,
    duration: Math.round(day.totalDuration),
    power: Math.round(day.totalPower / day.sessionCount),
    target: 15, // Target duration from goals
  }));

  const performanceData = dailyData.map((day: any) => ({
    day: day.day,
    efficiency: Math.round(((day.totalPower / day.sessionCount) / 45) * 100), // Avg efficiency vs max power
    consistency: Math.round(Math.min((day.totalDuration / 15) * 100, 100)), // Daily duration vs 15min target
  }));

  const chartConfig = {
    duration: { label: "Duration (min)", color: "hsl(217, 91%, 60%)" },
    power: { label: "Power (W)", color: "hsl(43, 96%, 56%)" },
    target: { label: "Target", color: "hsl(0, 0%, 70%)" },
    efficiency: { label: "Power Efficiency", color: "hsl(158, 64%, 52%)" },
    consistency: { label: "Time Consistency", color: "hsl(262, 83%, 58%)" },
  };

  const stats = (dashboardData as any)?.stats;
  const totalMinutes = Math.round(stats?.totalDuration || 0); // Duration stored in minutes
  const avgSessionTime = Math.round(totalMinutes / (stats?.totalSessions || 1));

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
              <h1 className="text-xl font-semibold text-gray-900">Progress Reports</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <span className="text-sm text-gray-600">Welcome, {patient?.firstName} {patient?.lastName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats?.totalSessions || 0}</div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalMinutes}</div>
                  <div className="text-sm text-gray-600">Total Minutes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{avgSessionTime}</div>
                  <div className="text-sm text-gray-600">Avg Session (min)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats?.consistencyStreak || 0}</div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Daily Progress</h3>
              </div>
              <div className="h-48 sm:h-64 w-full">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                      <XAxis 
                        dataKey="day" 
                        tickLine={false} 
                        axisLine={false} 
                        className="text-xs" 
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        className="text-xs" 
                        tick={{ fontSize: 11 }}
                        width={30}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="duration" fill="var(--color-duration)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" fill="var(--color-target)" radius={[4, 4, 0, 0]} opacity={0.3} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Performance Trends</h3>
              </div>
              <div className="h-48 sm:h-64 w-full">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                      <XAxis 
                        dataKey="day" 
                        tickLine={false} 
                        axisLine={false} 
                        className="text-xs" 
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        className="text-xs" 
                        tick={{ fontSize: 11 }}
                        width={35}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="var(--color-efficiency)" 
                        strokeWidth={2}
                        dot={{ fill: "var(--color-efficiency)", strokeWidth: 2, r: 3 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="consistency" 
                        stroke="var(--color-consistency)" 
                        strokeWidth={2}
                        dot={{ fill: "var(--color-consistency)", strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Insights */}
        <Card className="mb-6 md:mb-8">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Recovery Insights</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-green-800 font-medium mb-2">Strengths</div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Consistent daily exercise completion</li>
                  <li>• Steady power output improvement</li>
                  <li>• Reduced session interruptions</li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-blue-800 font-medium mb-2">Recommendations</div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Try increasing resistance gradually</li>
                  <li>• Extend sessions by 5-10 minutes</li>
                  <li>• Focus on maintaining steady rhythm</li>
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-orange-800 font-medium mb-2">Next Goals</div>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Reach 45-minute sessions</li>
                  <li>• Achieve 100W average power</li>
                  <li>• Complete full hospital stay</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Session Details</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Duration</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Avg Power</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Max Power</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Resistance</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData?.slice(0, 5).map((session: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-900 text-xs sm:text-sm">
                        {formatSessionDate(session.sessionDate)}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 text-xs sm:text-sm">
                        {Math.round(session.duration || 0)} min
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 text-xs sm:text-sm">
                        {Math.round(parseFloat(session.avgPower) || 0)}W
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 text-xs sm:text-sm">
                        {Math.round(parseFloat(session.maxPower) || 0)}W
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 text-xs sm:text-sm">
                        {parseFloat(session.resistance || '0').toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}