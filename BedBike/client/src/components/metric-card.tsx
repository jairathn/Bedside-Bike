import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface MetricCardProps {
  icon: ReactNode;
  iconColor: string;
  iconBgColor: string;
  title: string;
  value: string;
  subtitle: string;
  change: string;
  changeColor: string;
}

export function MetricCard({
  icon,
  iconColor,
  iconBgColor,
  title,
  value,
  subtitle,
  change,
  changeColor
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center`}>
            <div className={iconColor}>
              {icon}
            </div>
          </div>
          <span className="text-xs text-gray-500">{subtitle}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        <div className={`text-xs mt-1 ${changeColor}`}>{change}</div>
      </CardContent>
    </Card>
  );
}
