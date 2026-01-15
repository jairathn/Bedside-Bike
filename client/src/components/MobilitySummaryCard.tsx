import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ClipboardList, Calendar, Activity, Footprints, Bike, Armchair, TrendingUp, TrendingDown, Minus, Hospital } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Session {
  id?: number;
  sessionDate: string;
  duration: number;
  activityType?: 'ride' | 'walk' | 'sit' | 'transfer';
  assistanceLevel?: 'assisted' | 'independent';
  resistance?: number;
  avgPower?: number;
  equivalentWatts?: number;
  transferCount?: number;
}

interface MobilitySummaryProps {
  patientName: string;
  admissionDate: string;
  sessions: Session[];
  goalMinutes: number;
  currentMobilityStatus?: string;
}

export default function MobilitySummaryCard({
  patientName,
  admissionDate,
  sessions,
  goalMinutes,
  currentMobilityStatus
}: MobilitySummaryProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Calculate hospital day
  const hospitalDay = useMemo(() => {
    const admission = new Date(admissionDate);
    const today = new Date();
    return Math.floor((today.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [admissionDate]);

  // Group sessions by date and calculate daily totals
  const dailyData = useMemo(() => {
    const byDate: Record<string, {
      date: string;
      totalMinutes: number;
      sessions: Session[];
      rideMinutes: number;
      walkMinutes: number;
      sitMinutes: number;
      transfers: number;
      avgWatts: number;
    }> = {};

    // Helper to format date in America/New_York timezone (YYYY-MM-DD format)
    const toESTDateStr = (date: Date) => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);

    // Initialize all dates from admission to today (using EST timezone)
    const admission = new Date(admissionDate);
    const today = new Date();
    const todayStr = toESTDateStr(today);

    // Start from admission date and go until today
    for (let d = new Date(admission); toESTDateStr(d) <= todayStr; d.setDate(d.getDate() + 1)) {
      const dateStr = toESTDateStr(d);
      if (!byDate[dateStr]) {
        byDate[dateStr] = {
          date: dateStr,
          totalMinutes: 0,
          sessions: [],
          rideMinutes: 0,
          walkMinutes: 0,
          sitMinutes: 0,
          transfers: 0,
          avgWatts: 0
        };
      }
    }

    // Aggregate sessions - convert session dates to EST for consistent grouping
    sessions.forEach(session => {
      let dateStr: string;
      if (session.sessionDate) {
        // If sessionDate is a full ISO string, parse and convert to EST
        const sessionDateObj = new Date(session.sessionDate);
        dateStr = toESTDateStr(sessionDateObj);
      } else {
        dateStr = toESTDateStr(new Date());
      }

      if (byDate[dateStr]) {
        byDate[dateStr].sessions.push(session);
        const duration = session.duration || 0;
        const activityType = session.activityType || 'ride';

        if (activityType !== 'transfer') {
          byDate[dateStr].totalMinutes += duration;
        }

        switch (activityType) {
          case 'ride':
            byDate[dateStr].rideMinutes += duration;
            break;
          case 'walk':
            byDate[dateStr].walkMinutes += duration;
            break;
          case 'sit':
            byDate[dateStr].sitMinutes += duration;
            break;
          case 'transfer':
            byDate[dateStr].transfers += (session.transferCount || 1);
            break;
        }
      }
    });

    // Calculate avg watts per day
    Object.values(byDate).forEach(day => {
      const wattsSum = day.sessions.reduce((sum, s) => {
        return sum + (s.equivalentWatts || s.avgPower || 0);
      }, 0);
      day.avgWatts = day.sessions.length > 0 ? Math.round(wattsSum / day.sessions.length) : 0;
    });

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, admissionDate]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const daysWithActivity = dailyData.filter(d => d.totalMinutes > 0).length;
    const totalMinutes = dailyData.reduce((sum, d) => sum + d.totalMinutes, 0);
    const avgMinutesPerDay = hospitalDay > 0 ? Math.round(totalMinutes / hospitalDay) : 0;
    const goalAchievementDays = dailyData.filter(d => d.totalMinutes >= goalMinutes).length;
    const goalAchievementRate = hospitalDay > 0 ? Math.round((goalAchievementDays / hospitalDay) * 100) : 0;

    // Trend calculation (last 3 days vs previous 3 days)
    const recent3 = dailyData.slice(-3);
    const previous3 = dailyData.slice(-6, -3);
    const recentAvg = recent3.length > 0 ? recent3.reduce((sum, d) => sum + d.totalMinutes, 0) / recent3.length : 0;
    const previousAvg = previous3.length > 0 ? previous3.reduce((sum, d) => sum + d.totalMinutes, 0) / previous3.length : 0;
    const trend = recentAvg - previousAvg;

    // Activity breakdown
    const totalRide = dailyData.reduce((sum, d) => sum + d.rideMinutes, 0);
    const totalWalk = dailyData.reduce((sum, d) => sum + d.walkMinutes, 0);
    const totalSit = dailyData.reduce((sum, d) => sum + d.sitMinutes, 0);
    const totalTransfers = dailyData.reduce((sum, d) => sum + d.transfers, 0);

    // Today's data - use America/New_York timezone to match server-side session storage
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    const todayData = dailyData.find(d => d.date === todayStr);

    return {
      hospitalDay,
      daysWithActivity,
      totalMinutes,
      avgMinutesPerDay,
      goalAchievementDays,
      goalAchievementRate,
      trend,
      totalRide,
      totalWalk,
      totalSit,
      totalTransfers,
      todayMinutes: todayData?.totalMinutes || 0,
      todayGoalPercent: todayData ? Math.round((todayData.totalMinutes / goalMinutes) * 100) : 0
    };
  }, [dailyData, hospitalDay, goalMinutes]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Generate ASCII trend graph for clipboard
  const generateASCIIGraph = () => {
    const maxMinutes = Math.max(...dailyData.map(d => d.totalMinutes), goalMinutes);
    const height = 6;
    const width = Math.min(dailyData.length, 14); // Last 14 days max
    const recentData = dailyData.slice(-width);

    const lines: string[] = [];

    // Header
    lines.push(`Movement Trend (Last ${width} Days)`);
    lines.push('─'.repeat(width + 10));

    // Graph rows
    for (let row = height; row >= 0; row--) {
      const threshold = (row / height) * maxMinutes;
      let line = row === Math.round((goalMinutes / maxMinutes) * height) ? '→' : ' ';
      line += `${Math.round(threshold).toString().padStart(3)}│`;

      for (const day of recentData) {
        if (day.totalMinutes >= threshold && threshold > 0) {
          line += '█';
        } else if (row === 0) {
          line += '─';
        } else {
          line += ' ';
        }
      }
      lines.push(line);
    }

    // X-axis labels
    lines.push('    └' + '─'.repeat(width));
    const dateLabels = recentData.map(d => formatDate(d.date).slice(0, 2)).join('');
    lines.push('     ' + dateLabels);

    return lines.join('\n');
  };

  // Generate clean plain text summary for clipboard (EMR-friendly)
  const generatePlainTextSummary = () => {
    const trendText = stats.trend > 2 ? 'Improving' : stats.trend < -2 ? 'Declining' : 'Stable';

    // Header line
    let output = `MOBILITY SUMMARY - Hospital Day ${stats.hospitalDay}\n`;
    output += `Goal: ${goalMinutes} min/day | Achievement: ${stats.goalAchievementDays}/${stats.hospitalDay} days (${stats.goalAchievementRate}%) | Trend: ${trendText}\n\n`;

    // Simple table with dashes (renders in any system)
    const recentDays = dailyData.slice(-7);

    output += `DATE        CYCLE   WALK   CHAIR   TOTAL   GOAL\n`;
    output += `----------- -----   ----   -----   -----   ----\n`;

    recentDays.forEach(day => {
      const date = formatDate(day.date).padEnd(11);
      const ride = `${day.rideMinutes}m`.padStart(5);
      const walk = `${day.walkMinutes}m`.padStart(4);
      const sit = `${day.sitMinutes}m`.padStart(5);
      const total = `${day.totalMinutes}m`.padStart(5);
      const goalMet = day.totalMinutes >= goalMinutes ? 'Yes' : 'No';
      output += `${date} ${ride}   ${walk}   ${sit}   ${total}   ${goalMet}\n`;
    });

    output += `----------- -----   ----   -----   -----\n`;
    output += `TOTAL       ${String(stats.totalRide).padStart(4)}m   ${String(stats.totalWalk).padStart(3)}m   ${String(stats.totalSit).padStart(4)}m   ${String(stats.totalMinutes).padStart(4)}m\n\n`;

    // Today status
    const todayStatus = stats.todayGoalPercent >= 100 ? 'Goal met' :
                        stats.todayGoalPercent >= 50 ? 'In progress' : 'Needs attention';
    output += `Today: ${stats.todayMinutes} min (${stats.todayGoalPercent}% of goal) - ${todayStatus}`;

    return output;
  };

  const handleCopy = async () => {
    const summary = generatePlainTextSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({
        title: "Copied to Clipboard!",
        description: "Full mobility report ready to paste into EMR.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please select and copy the text manually.",
        variant: "destructive",
      });
    }
  };

  // Trend icon
  const TrendIcon = stats.trend > 2 ? TrendingUp : stats.trend < -2 ? TrendingDown : Minus;
  const trendColor = stats.trend > 2 ? 'text-green-600' : stats.trend < -2 ? 'text-red-600' : 'text-gray-600';
  const trendBg = stats.trend > 2 ? 'bg-green-50' : stats.trend < -2 ? 'bg-red-50' : 'bg-gray-50';

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-slate-600" />
            Clinical Mobility Report
          </CardTitle>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className={copied ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy for EMR
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Hospital className="w-4 h-4 mr-1" />
            Day {stats.hospitalDay}
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Admitted {new Date(admissionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.avgMinutesPerDay}</div>
            <div className="text-xs text-gray-600">Avg min/day</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.goalAchievementRate}%</div>
            <div className="text-xs text-gray-600">Goal Rate</div>
          </div>
          <div className={`text-center p-3 rounded-lg ${trendBg}`}>
            <div className={`text-2xl font-bold ${trendColor} flex items-center justify-center`}>
              <TrendIcon className="w-5 h-5 mr-1" />
              {Math.abs(Math.round(stats.trend))}
            </div>
            <div className="text-xs text-gray-600">Trend</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.daysWithActivity}</div>
            <div className="text-xs text-gray-600">Active Days</div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => formatDate(date)}
                fontSize={10}
                stroke="#6b7280"
              />
              <YAxis
                fontSize={10}
                stroke="#6b7280"
                domain={[0, 'auto']}
              />
              <Tooltip
                labelFormatter={(date) => formatDate(date as string)}
                formatter={(value: number) => [`${value} min`, 'Movement']}
              />
              <ReferenceLine
                y={goalMinutes}
                stroke="#10B981"
                strokeDasharray="5 5"
                label={{ value: 'Goal', position: 'right', fontSize: 10, fill: '#10B981' }}
              />
              <Line
                type="monotone"
                dataKey="totalMinutes"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Breakdown */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
            <Bike className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-semibold text-blue-700">{stats.totalRide}m</div>
              <div className="text-xs text-gray-500">Cycling</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
            <Footprints className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-sm font-semibold text-green-700">{stats.totalWalk}m</div>
              <div className="text-xs text-gray-500">Walking</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
            <Armchair className="w-4 h-4 text-purple-600" />
            <div>
              <div className="text-sm font-semibold text-purple-700">{stats.totalSit}m</div>
              <div className="text-xs text-gray-500">Chair</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
            <Activity className="w-4 h-4 text-orange-600" />
            <div>
              <div className="text-sm font-semibold text-orange-700">{stats.totalTransfers}x</div>
              <div className="text-xs text-gray-500">Transfers</div>
            </div>
          </div>
        </div>

        {/* Today's Status */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          stats.todayGoalPercent >= 100 ? 'bg-green-50 border border-green-200' :
          stats.todayGoalPercent >= 50 ? 'bg-yellow-50 border border-yellow-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{stats.todayMinutes} min</span>
            <Badge variant={stats.todayGoalPercent >= 100 ? "default" : "secondary"}>
              {stats.todayGoalPercent}% of goal
            </Badge>
          </div>
        </div>

        {/* Copy Preview */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Preview clipboard text
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre font-mono max-h-64 overflow-y-auto">
            {generatePlainTextSummary()}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
