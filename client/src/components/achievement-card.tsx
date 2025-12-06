import { Achievement } from "@shared/schema";
import { Check } from "lucide-react";

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const bgColor = achievement.isUnlocked 
    ? "bg-green-50 border-green-200" 
    : "bg-gray-50 border-gray-200";
  
  const iconBgColor = achievement.isUnlocked 
    ? "bg-green-500" 
    : "bg-gray-300";

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${bgColor}`}>
      <div className={`w-8 h-8 ${iconBgColor} rounded-full flex items-center justify-center`}>
        {achievement.isUnlocked ? (
          <Check className="text-white text-xs" size={12} />
        ) : (
          <span className="text-gray-600 text-xs">!</span>
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{achievement.title}</div>
        <div className="text-sm text-gray-600">{achievement.description}</div>
      </div>
      <div className={`text-sm font-medium ${achievement.isUnlocked ? 'text-green-600' : 'text-gray-500'}`}>
        +{achievement.xpReward} XP
      </div>
    </div>
  );
}
