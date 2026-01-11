import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ClipboardList, Calendar, Activity, Footprints, Bike, Armchair } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MobilitySummaryProps {
  patientName: string;
  date: string;
  activities: Array<{
    type: 'ride' | 'walk' | 'sit' | 'transfer';
    duration: number;
    watts?: number;
    assistance?: 'assisted' | 'independent';
    resistance?: number;
    transferCount?: number;
  }>;
  goalMinutes: number;
  streak: number;
  weeklyAverage: number;
}

export default function MobilitySummaryCard({
  patientName,
  date,
  activities,
  goalMinutes,
  streak,
  weeklyAverage
}: MobilitySummaryProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Calculate totals
  const totalMinutes = activities
    .filter(a => a.type !== 'transfer')
    .reduce((sum, a) => sum + a.duration, 0);
  const goalPercentage = Math.round((totalMinutes / goalMinutes) * 100);

  // Get activity label
  const getActivityLabel = (type: string) => ({
    ride: 'Cycling',
    walk: 'Walking',
    sit: 'Chair',
    transfer: 'Transfers'
  }[type] || type);

  // Format duration
  const formatDuration = (activity: typeof activities[0]) => {
    if (activity.type === 'transfer') {
      return `${activity.transferCount || 0}x`;
    }
    return `${activity.duration} min`;
  };

  // Format output (watts)
  const formatOutput = (activity: typeof activities[0]) => {
    if (activity.watts && activity.watts > 0) {
      return activity.type === 'ride' ? `${activity.watts}W` : `${activity.watts}W eq.`;
    }
    return '--';
  };

  // Format assistance
  const formatAssistance = (activity: typeof activities[0]) => {
    if (activity.type === 'walk' && activity.assistance) {
      return activity.assistance === 'assisted' ? 'Asst.' : 'Indep.';
    }
    if (activity.type === 'ride' && activity.resistance) {
      return `R${activity.resistance}`;
    }
    return 'N/A';
  };

  // Generate plain text summary for clipboard
  const generatePlainTextSummary = () => {
    const header = `MOBILITY SUMMARY - ${patientName} - ${date}`;
    const separator = '━'.repeat(44);
    const goalLine = `Movement Today: ${totalMinutes} min (${goalPercentage}% of ${goalMinutes} min goal)`;

    const tableHeader = `
┌──────────┬──────────┬────────────┬─────────┐
│ Activity │ Duration │ Avg Output │ Assist  │
├──────────┼──────────┼────────────┼─────────┤`;

    const rows = activities.map(a => {
      const activity = getActivityLabel(a.type).padEnd(8);
      const duration = formatDuration(a).padEnd(8);
      const output = formatOutput(a).padEnd(10);
      const assist = formatAssistance(a).padEnd(7);
      return `│ ${activity} │ ${duration} │ ${output} │ ${assist} │`;
    }).join('\n');

    const tableFooter = '└──────────┴──────────┴────────────┴─────────┘';
    const summaryLine = `7-Day Avg: ${weeklyAverage} min/day | Consistency: ${streak}-day streak`;

    return `${header}\n${separator}\n${goalLine}\n${tableHeader}\n${rows}\n${tableFooter}\n${summaryLine}`;
  };

  const handleCopy = async () => {
    const summary = generatePlainTextSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({
        title: "Copied to Clipboard!",
        description: "Mobility summary ready to paste into your EMR.",
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

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ride': return <Bike className="w-4 h-4 text-blue-600" />;
      case 'walk': return <Footprints className="w-4 h-4 text-green-600" />;
      case 'sit': return <Armchair className="w-4 h-4 text-purple-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get color for activity type
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'ride': return 'bg-blue-50 border-blue-200';
      case 'walk': return 'bg-green-50 border-green-200';
      case 'sit': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-slate-600" />
            Mobility Summary
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
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {date}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Progress */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Movement Today</span>
          <div className="text-right">
            <span className="text-lg font-bold text-blue-600">{totalMinutes} min</span>
            <span className="text-gray-500 text-sm ml-1">
              ({goalPercentage}% of {goalMinutes} min goal)
            </span>
          </div>
        </div>

        {/* Activity Table */}
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((activity, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-center space-x-3">
                  {getActivityIcon(activity.type)}
                  <span className="font-medium">{getActivityLabel(activity.type)}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{formatDuration(activity)}</div>
                    <div className="text-xs text-gray-500">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{formatOutput(activity)}</div>
                    <div className="text-xs text-gray-500">Output</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{formatAssistance(activity)}</div>
                    <div className="text-xs text-gray-500">
                      {activity.type === 'walk' ? 'Assist' : activity.type === 'ride' ? 'Resist' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No mobility activities recorded today
          </div>
        )}

        {/* Weekly Stats */}
        <div className="flex items-center justify-between pt-2 border-t text-sm text-gray-600">
          <div>
            <span className="font-medium">7-Day Avg:</span> {weeklyAverage} min/day
          </div>
          <div>
            <span className="font-medium">Streak:</span> {streak} days
          </div>
        </div>

        {/* Copy Preview */}
        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Preview clipboard text
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre font-mono">
              {generatePlainTextSummary()}
            </pre>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
