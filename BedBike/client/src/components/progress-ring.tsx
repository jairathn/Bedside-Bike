import { Check } from "lucide-react";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  showCheck?: boolean;
}

export function ProgressRing({ 
  progress, 
  size = 64, 
  strokeWidth = 4, 
  color = "stroke-blue-600",
  showCheck = false 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeProgress = isNaN(progress) || progress < 0 ? 0 : Math.min(progress, 100);
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="progress-ring"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`progress-ring-circle ${color}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {showCheck && safeProgress === 100 ? (
          <Check className="w-4 h-4 text-blue-600" />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            {Math.round(safeProgress)}%
          </span>
        )}
      </div>
    </div>
  );
}
