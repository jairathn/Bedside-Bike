import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Target, Clock, Zap, TrendingUp, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function GoalsPage() {
  const [, setLocation] = useLocation();
  const { patient } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [goals, setGoals] = useState<any[]>([]);
  
  // Check for risk assessment mobility recommendation to update goals
  const { data: riskAssessment } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/risk-assessment`],
    enabled: !!patient?.id,
  });

  const { data: dashboardData } = useQuery({
    queryKey: [`/api/patients/${patient?.id}/dashboard`],
    enabled: !!patient?.id,
  });

  useEffect(() => {
    if (!patient) {
      setLocation("/");
    }
  }, [patient, setLocation]);
  
  // Load goals from provider-sent goals instead of hardcoded values
  useEffect(() => {
    if ((dashboardData as any)?.goals) {
      const providerGoals = (dashboardData as any).goals;
      const mappedGoals = providerGoals.map((goal: any) => ({
        id: goal.id,
        type: goal.goalType,
        target: goal.goalType === 'duration' && parseFloat(goal.targetValue) > 100 
          ? Math.round(parseFloat(goal.targetValue) / 60)  // Convert seconds to minutes for display
          : parseFloat(goal.targetValue) || 0,
        period: goal.period,
        label: goal.label,
        unit: goal.unit,
        recommended: true, // These come from provider
      }));
      setGoals(mappedGoals);
    }
  }, [dashboardData]);

  const updateGoalMutation = useMutation({
    mutationFn: async (goal: any) => {
      return apiRequest(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ target: goal.target }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patient?.id}/dashboard`] });
      toast({
        title: "Goals Updated",
        description: "Your goals have been successfully updated.",
      });
    },
  });

  const handleGoalChange = (goalId: number, field: string, value: any) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId ? { ...goal, [field]: value } : goal
    ));
  };

  const handleSaveGoals = () => {
    goals.forEach(goal => {
      updateGoalMutation.mutate(goal);
    });
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'duration': return <Clock className="w-5 h-5" />;
      case 'power': return <Zap className="w-5 h-5" />;
      case 'consistency': return <Target className="w-5 h-5" />;
      case 'sessions': return <Target className="w-5 h-5" />;
      case 'resistance': return <TrendingUp className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'duration': return 'text-green-600 bg-green-100';
      case 'power': return 'text-orange-600 bg-orange-100';
      case 'consistency': return 'text-blue-600 bg-blue-100';
      case 'sessions': return 'text-blue-600 bg-blue-100';
      case 'resistance': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

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
              <h1 className="text-xl font-semibold text-gray-900">View Goals</h1>
            </div>
            <span className="text-sm text-gray-600">Welcome, {patient?.firstName} {patient?.lastName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Goal Setting Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Provider-Recommended Goals</h2>
            <p className="text-gray-600 mb-4">
              These mobility targets have been carefully recommended by your healthcare team based on your individual 
              risk assessment. Only your providers can modify these goals to ensure your safety and optimal recovery.
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <strong>Smart Goal:</strong> Based on your recent progress, your personalized daily exercise target is{' '}
                <strong>
                  {(() => {
                    // Calculate daily target = session duration × number of sessions
                    const durationGoal = goals.find(g => g.type === 'duration');
                    const sessionsGoal = goals.find(g => g.type === 'sessions');
                    const sessionMinutes = durationGoal ? (durationGoal.target > 100 ? durationGoal.target / 60 : durationGoal.target) : 15;
                    const sessionsPerDay = sessionsGoal ? sessionsGoal.target : 2;
                    const dailyTotal = sessionMinutes * sessionsPerDay;
                    return `${dailyTotal} minutes`;
                  })()}
                </strong>.{' '}
                Provider-recommended daily mobility target
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adaptive Duration Goal Card */}
        {(dashboardData as any)?.adaptiveGoal && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 text-green-600 bg-green-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Today's Exercise Duration</h3>
                  <p className="text-sm text-gray-600">Automatically adjusted based on your progress</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Your personalized target per session</Label>
                  <div className="mt-1 text-2xl font-bold text-green-600">
                    {(() => {
                      // Get the duration goal from provider-recommended goals
                      const durationGoal = goals.find(g => g.type === 'duration');
                      const minutes = durationGoal ? (durationGoal.target > 100 ? durationGoal.target / 60 : durationGoal.target) : 15;
                      return `${Math.round(minutes)} minutes`;
                    })()}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Provider-recommended per session target
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">How this goal was calculated:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Based on your previous day's exercise duration</li>
                    <li>• Gradually increases to reach the 40-minute hospital target</li>
                    <li>• Adjusts to be challenging but achievable for you</li>
                    <li>• Updates daily to match your progress</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          {goals.filter((goal) => 
            // Show patient-friendly goals: duration, sessions, resistance
            // Hide technical goals: power, energy (Watt-Min confuses patients)
            ['duration', 'sessions', 'resistance'].includes(goal.type)
          ).map((goal) => (
            <Card key={goal.id}>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getGoalColor(goal.type)}`}>
                    {getGoalIcon(goal.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.label}</h3>
                    <p className="text-sm text-gray-600">Daily target</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`target-${goal.id}`} className="text-sm font-medium text-gray-700">
                      Target ({goal.unit})
                    </Label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-lg font-semibold text-blue-600">
                      {goal.target} {goal.unit}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended by your healthcare provider
                    </p>
                  </div>


                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Provider Information */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Goal Changes?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your mobility goals have been recommended by your healthcare team based on medical assessment. 
              If you feel these targets need adjustment, please contact your provider.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Shield className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Provider-Only Access</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    These goals can only be modified by your healthcare provider to ensure your safety 
                    and optimal recovery progression. To request changes, please contact your care team directly.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Back to Dashboard */}
        <div className="flex justify-center">
          <Button 
            onClick={() => setLocation("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
            size="lg"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}