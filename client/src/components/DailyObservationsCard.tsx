import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Smile,
  AlertTriangle,
  HelpCircle,
  Calendar,
  User
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DailyObservationsCardProps {
  patientId: number;
  patientName: string;
}

export default function DailyObservationsCard({ patientId, patientName }: DailyObservationsCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch daily observations summary
  const { data: observationsSummary, isLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}/observations/daily-summary`, { date: today }],
    enabled: !!patientId,
  });

  const handleCopy = async () => {
    if (!observationsSummary?.copyPasteText) return;

    try {
      await navigator.clipboard.writeText(observationsSummary.copyPasteText);
      setCopied(true);
      toast({
        title: "Copied to Clipboard",
        description: "Daily observations summary is ready to paste into EMR.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getMoodBadge = (mood: string | null) => {
    if (!mood) return null;
    const moodColors: Record<string, string> = {
      great: "bg-green-100 text-green-800",
      good: "bg-blue-100 text-blue-800",
      fair: "bg-yellow-100 text-yellow-800",
      poor: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={moodColors[mood] || "bg-gray-100 text-gray-800"}>
        {mood.charAt(0).toUpperCase() + mood.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Daily Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasObservations = observationsSummary?.observationCount > 0;

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Daily Observations
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(today).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Badge>
            {hasObservations && (
              <Badge className="bg-purple-100 text-purple-800">
                {observationsSummary.observationCount} observation{observationsSummary.observationCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasObservations ? (
          <div className="text-center py-4 text-gray-500">
            <Smile className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No observations recorded for today.</p>
            <p className="text-sm text-gray-400 mt-1">
              Patients and caregivers can log observations from their dashboard.
            </p>
          </div>
        ) : (
          <>
            {/* AI Summary */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-800 mb-1">Summary</p>
              <p className="text-gray-700">{observationsSummary.aiSummary}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2">
              {observationsSummary.observations.some((o: any) => o.concerns) && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Concerns flagged
                </Badge>
              )}
              {observationsSummary.observations.some((o: any) => o.questionsForProvider) && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Questions for provider
                </Badge>
              )}
            </div>

            {/* Expandable Details */}
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="text-sm text-gray-600">
                {expanded ? "Hide Details" : "View All Observations"}
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {expanded && (
              <div className="space-y-3 mt-2">
                {observationsSummary.observations.map((obs: any, index: number) => (
                  <div key={obs.id || index} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{obs.observerName}</span>
                        <Badge variant="outline" className="text-xs">
                          {obs.observerType}
                        </Badge>
                      </div>
                      {obs.createdAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(obs.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {obs.moodLevel && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Mood:</span>
                          {getMoodBadge(obs.moodLevel)}
                        </div>
                      )}
                      {obs.painLevel !== null && (
                        <div>
                          <span className="text-gray-500">Pain:</span>{" "}
                          <span className={`font-medium ${obs.painLevel > 5 ? 'text-red-600' : 'text-gray-700'}`}>
                            {obs.painLevel}/10
                          </span>
                        </div>
                      )}
                      {obs.energyLevel && (
                        <div>
                          <span className="text-gray-500">Energy:</span>{" "}
                          <span className="text-gray-700">{obs.energyLevel}</span>
                        </div>
                      )}
                      {obs.notes && (
                        <div>
                          <span className="text-gray-500">Notes:</span>{" "}
                          <span className="text-gray-700">{obs.notes}</span>
                        </div>
                      )}
                      {obs.concerns && (
                        <div className="p-2 bg-orange-50 rounded border border-orange-200 mt-1">
                          <span className="text-orange-700 font-medium">Concerns:</span>{" "}
                          <span className="text-gray-700">{obs.concerns}</span>
                        </div>
                      )}
                      {obs.questionsForProvider && (
                        <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-1">
                          <span className="text-blue-700 font-medium">Question:</span>{" "}
                          <span className="text-gray-700">{obs.questionsForProvider}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Copy to EMR Button */}
            <Button
              onClick={handleCopy}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Observations for EMR
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
