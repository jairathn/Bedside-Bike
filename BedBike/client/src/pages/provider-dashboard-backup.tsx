import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, LogOut, Target, Activity, Clock, Zap, TrendingUp, Calendar, CheckCircle, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ProviderGoalEditor } from "@/components/provider-goal-editor";

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  // Check if user can edit goals (all provider types can edit)
  const canEditGoals = (user: any) => {
    return user?.userType === 'provider';
  };

  // Get list of patients this provider can access
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Get selected patient's goals
  const { data: patientGoals = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/goals`],
    enabled: !!selectedPatient?.id,
  });

  // Get selected patient's recent sessions (7 days)
  const { data: recentSessions = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/sessions`],
    enabled: !!selectedPatient?.id,
  });

  // Get selected patient's usage trend data (30 days)
  const { data: usageData = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/usage-data`],
    enabled: !!selectedPatient?.id,
  });

  // Get selected patient's dashboard stats
  const { data: patientStats } = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/dashboard`],
    enabled: !!selectedPatient?.id,
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: number; updates: any }) => {
      return await apiRequest(`/api/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient?.id}/goals`] });
      setEditingGoal(null);
      toast({
        title: "Goal Updated",
        description: "Patient goal has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update goal",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
  };

  if (patientsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading provider portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <Users className="text-white" size={16} />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Provider Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.credentials} {user?.firstName} {user?.lastName}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Active Patients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patients?.map((patient: any) => (
                  <div
                    key={patient.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPatient?.id === patient.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                        <p className="text-sm text-gray-500">
                          Admitted: {new Date(patient.admissionDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Day {Math.floor((Date.now() - new Date(patient.admissionDate).getTime()) / (1000 * 60 * 60 * 24))}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!patients || patients.length === 0) && !patientsLoading && (
                  <div className="text-center py-6 space-y-3">
                    <Users className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-gray-600 font-medium">No patients have granted access yet</p>
                      <p className="text-sm text-gray-500">
                        Patients can grant you access from their dashboard
                      </p>
                    </div>
                  </div>
                )}
                {patientsLoading && (
                  <p className="text-gray-500 text-center py-4">
                    Loading patients...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patient Clinical Dashboard */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Clinical Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      {selectedPatient.firstName} {selectedPatient.lastName} - Clinical Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.floor((Date.now() - new Date(selectedPatient.admissionDate).getTime()) / (1000 * 60 * 60 * 24))}
                        </p>
                        <p className="text-sm text-gray-600">Days in Hospital</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Activity className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">
                          {recentSessions?.length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Sessions (7 days)</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">
                          {recentSessions && recentSessions.length > 0 ? 
                            Math.round(recentSessions.reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / recentSessions.length * 10) / 10 :
                            0
                          }W
                        </p>
                        <p className="text-sm text-gray-600">Recent Avg Power</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">
                          {patientGoals?.filter((g: any) => g.isActive).length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Active Goals</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Daily Duration Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={usageData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value, name) => [`${Math.floor(Number(value))} min`, 'Duration']} />
                            <Line type="monotone" dataKey="duration" stroke="#3B82F6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Power Output Progression</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={usageData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value, name) => [`${value}W`, 'Power']} />
                            <Line type="monotone" dataKey="avgPower" stroke="#10B981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comprehensive Goal Management */}
                <ProviderGoalEditor
                  patientGoals={patientGoals || []}
                  patientId={selectedPatient.id}
                  onUpdateGoals={(goals) => {
                    goals.forEach(goal => {
                      if (goal.id) {
                        updateGoalMutation.mutate({
                          goalId: goal.id,
                          updates: {
                            targetValue: goal.targetValue
                          }
                        });
                      }
                    });
                  }}
                  onRunRiskCalculator={() => {
                    window.open(`/risk-assessment?patient=${selectedPatient.id}`, '_blank');
                  }}
                  isLoading={updateGoalMutation.isPending}
                />


                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      DELETED - DO NOT USE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(patientGoals || []).map((goal: any) => (
                        <div key={goal.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center mb-3">
                            {goal.goalType === 'duration' && <Clock className="w-5 h-5 mr-2 text-blue-500" />}
                            {goal.goalType === 'power' && <Zap className="w-5 h-5 mr-2 text-yellow-500" />}
                            {goal.goalType === 'sessions' && <Activity className="w-5 h-5 mr-2 text-green-500" />}
                            <h4 className="font-medium text-lg">{goal.goalType === 'duration' ? 'Duration' : goal.goalType === 'power' ? 'Power' : 'Sessions'}</h4>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Current Target:</span>
                              <span className="font-medium">
                                {goal.goalType === 'duration' ? `${Math.floor(goal.targetValue / 60)} min` : `${goal.targetValue} ${goal.unit}`}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                placeholder={goal.targetValue}
                                className="flex-1"
                                onChange={(e) => setEditingGoal({...goal, targetValue: e.target.value})}
                              />
                              <span className="text-sm text-gray-500 min-w-fit">
                                {goal.goalType === 'duration' ? 'min' : goal.unit}
                              </span>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => {
                                  if (editingGoal?.targetValue) {
                                    updateGoalMutation.mutate({
                                      goalId: goal.id,
                                      updates: {
                                        targetValue: goal.goalType === 'duration' ? 
                                          (parseInt(editingGoal.targetValue) * 60).toString() : 
                                          editingGoal.targetValue
                                      }
                                    });
                                  }
                                }}
                                disabled={updateGoalMutation.isPending || !canEditGoals(user)}
                              >
                                {canEditGoals(user) ? 'Update' : 'View Only'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant={goal.isActive ? "destructive" : "default"}
                                onClick={() => {
                                  updateGoalMutation.mutate({
                                    goalId: goal.id,
                                    updates: { isActive: !goal.isActive }
                                  });
                                }}
                              >
                                {goal.isActive ? 'Pause' : 'Activate'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {(!patientGoals || (patientGoals as any[]).length === 0) && (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No goals set for this patient</p>
                        <p className="text-sm text-gray-400">
                          {canEditGoals(user) ? 'Use the Risk Calculator to create AI-prescribed goals' : 'Goals will appear here once created by authorized providers'}
                        </p>
                        {canEditGoals(user) && (
                          <Button
                            className="mt-4"
                            onClick={() => window.open(`/risk-assessment?patient=${selectedPatient.id}`, '_blank')}
                          >
                            <Calculator className="w-4 h-4 mr-2" />
                            Open Risk Calculator
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Risk Assessment & AI Goal Setting */}
                {canEditGoals(user) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calculator className="w-5 h-5 mr-2" />
                        AI-Powered Risk Assessment & Goal Setting
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="font-medium">Risk Assessment Tools</h4>
                          <p className="text-sm text-gray-600">
                            Generate personalized mobility prescriptions based on patient medical history, 
                            anthropometric data, and risk factors.
                          </p>
                          <ul className="text-sm text-gray-500 space-y-1">
                            <li>• AI-powered medical text analysis</li>
                            <li>• Deconditioning, VTE, Falls & Pressure risk calculation</li>
                            <li>• Length of Stay & discharge predictions</li>
                            <li>• Anthropometric-aware power prescriptions</li>
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-medium">Automated Goal Creation</h4>
                          <p className="text-sm text-gray-600">
                            Risk assessment results automatically generate optimized patient goals 
                            that can be instantly applied to their profile.
                          </p>
                          <Button
                            className="w-full"
                            onClick={() => window.open(`/risk-assessment?patient=${selectedPatient.id}`, '_blank')}
                          >
                            <Calculator className="w-4 h-4 mr-2" />
                            Run Risk Assessment & Set Goals
                          </Button>
                          <p className="text-xs text-gray-400">
                            Opens in new tab - results can be pushed directly to patient goals
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Patient
                  </h3>
                  <p className="text-gray-600">
                    Choose a patient from the list to view and manage their mobility goals
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}