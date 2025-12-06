import { Card, CardContent } from "@/components/ui/card";
import { Crown, Medal } from "lucide-react";

interface LeaderboardEntry {
  patientId: number;
  name: string;
  weeklyDuration: number;
  rank: number;
}

interface LeaderboardProps {
  data?: LeaderboardEntry[];
  currentPatientId?: number;
}

export function Leaderboard({ data = [], currentPatientId }: LeaderboardProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes today`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400 w-4 h-4" />;
    if (rank === 3) return <Medal className="text-blue-600 w-4 h-4" />;
    return null;
  };

  const getRankBgColor = (rank: number, isCurrentPatient: boolean) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-200";
    if (isCurrentPatient) return "bg-blue-50 border-blue-200";
    return "bg-gray-50 border-gray-200";
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Leaderboard</h3>
        <p className="text-sm text-gray-600 mb-4">
          See how you're doing compared to other patients today (anonymized)
        </p>
        
        <div className="space-y-3">
          {data.map((entry) => {
            const isCurrentPatient = entry.patientId === currentPatientId;
            const bgColor = getRankBgColor(entry.rank, isCurrentPatient);
            
            return (
              <div 
                key={entry.patientId}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${bgColor}`}
              >
                <div className={`w-8 h-8 ${entry.rank === 1 ? 'bg-yellow-400' : 'bg-gray-400'} rounded-full flex items-center justify-center`}>
                  <span className="text-xs font-bold text-white">{entry.rank}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {isCurrentPatient ? `You (${entry.name})` : entry.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDuration(entry.weeklyDuration)}
                  </div>
                </div>
                {getRankIcon(entry.rank)}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Great work!</div>
          <div className="text-sm text-gray-600 mt-1">
            You're ahead of 60% of patients at similar stages of recovery.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
