import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Trophy,
  Users,
  TrendingUp,
  Medal,
  Target,
  Calendar,
  Clock,
  Plus,
  UserPlus,
  BarChart3,
  Zap,
  Award,
  Crown,
  Star
} from "lucide-react";

interface Competition {
  id: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  targetMetric: string;
  participantCount: number;
  status: 'upcoming' | 'active' | 'completed';
}

interface LeaderboardEntry {
  rank: number;
  anonymousId: string;
  score: number;
  isCurrentPatient: boolean;
  improvement: number;
}

interface CohortComparison {
  patientPercentile: number;
  cohortSize: number;
  cohortCriteria: {
    diagnosis: string;
    ageRange: string;
    mobilityLevel: string;
  };
  metrics: {
    avgPower: { patient: number; cohortAvg: number; percentile: number };
    avgDuration: { patient: number; cohortAvg: number; percentile: number };
    sessionFrequency: { patient: number; cohortAvg: number; percentile: number };
    improvement: { patient: number; cohortAvg: number; percentile: number };
  };
}

export default function CompetitionCenterPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCompetition, setNewCompetition] = useState({
    name: '',
    type: 'weekly_distance',
    startDate: '',
    endDate: '',
    targetMetric: 'total_distance',
  });

  // Show loading state while auth initializes
  if (authLoading) {

  // Show loading state while auth initializes
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Get patients
  const { data: patients = [] } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Get available competitions
  const { data: competitions = [] } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Get cohort comparison for patient
  const { data: cohortComparison } = useQuery<CohortComparison>({
    queryKey: [`/api/patients/${selectedPatientId}/cohort-comparison`],
    enabled: !!selectedPatientId,
  });

  // Get patient's competitions
  const { data: patientCompetitions = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatientId}/competitions`],
    enabled: !!selectedPatientId,
  });

  // Create competition mutation
  const createCompetitionMutation = useMutation({
    mutationFn: async (data: typeof newCompetition) => {
      return await apiRequest('/api/competitions', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          createdBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      setShowCreateDialog(false);
      setNewCompetition({
        name: '',
        type: 'weekly_distance',
        startDate: '',
        endDate: '',
        targetMetric: 'total_distance',
      });
      toast({
        title: "Competition Created",
        description: "New competition has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create competition",
        variant: "destructive",
      });
    },
  });

  // Join competition mutation
  const joinCompetitionMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      return await apiRequest(`/api/competitions/${competitionId}/join`, {
        method: 'POST',
        body: JSON.stringify({ patientId: selectedPatientId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/competitions`] });
      toast({
        title: "Joined Competition",
        description: "Patient has joined the competition",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 text-center font-bold text-gray-600">{rank}</span>;
    }
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Trophy className="w-8 h-8 mr-3 text-yellow-500" />
              Competition Center
            </h1>
            <p className="text-gray-600 mt-2">
              Virtual competitions and cohort performance benchmarking
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Competition
          </Button>
        </div>

        {/* Patient Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(v) => setSelectedPatientId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient to view their competitions..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="competitions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="competitions">Active Competitions</TabsTrigger>
            <TabsTrigger value="cohort">Cohort Comparison</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          {/* Competitions Tab */}
          <TabsContent value="competitions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Competitions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    Available Competitions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {competitions.length > 0 ? (
                      competitions.map((comp) => (
                        <div key={comp.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium">{comp.name}</h3>
                              <p className="text-sm text-gray-500">{comp.type.replace('_', ' ')}</p>
                            </div>
                            <Badge className={getStatusColor(comp.status)}>
                              {comp.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(comp.startDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {comp.participantCount} participants
                            </div>
                          </div>
                          {selectedPatientId && comp.status !== 'completed' && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => joinCompetitionMutation.mutate(comp.id)}
                              disabled={joinCompetitionMutation.isPending}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Join Competition
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No active competitions</p>
                        <p className="text-sm">Create one to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Patient's Competitions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    {selectedPatientId ? "Patient's Competitions" : "Select a Patient"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPatientId ? (
                    patientCompetitions.length > 0 ? (
                      <div className="space-y-4">
                        {patientCompetitions.map((pc: any) => (
                          <div key={pc.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{pc.competition?.name}</h3>
                              <div className="flex items-center gap-1">
                                {getRankIcon(pc.rank)}
                                <span className="font-bold">#{pc.rank}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Score: {pc.score}</span>
                              <Badge variant="outline" className="text-xs">
                                +{pc.improvement}% improvement
                              </Badge>
                            </div>
                            <Progress value={(pc.rank <= 10 ? (11 - pc.rank) * 10 : 5)} className="mt-2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Medal className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Patient hasn't joined any competitions</p>
                        <p className="text-sm">Join one from the available list</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Select a patient to view their competitions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cohort Comparison Tab */}
          <TabsContent value="cohort" className="space-y-6">
            {selectedPatientId && cohortComparison ? (
              <>
                {/* Overall Percentile */}
                <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">
                          {cohortComparison.patientPercentile}th Percentile
                        </h2>
                        <p className="text-blue-100">
                          Compared to {cohortComparison.cohortSize} similar patients
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-100 text-sm">Cohort Criteria:</div>
                        <div className="text-sm">
                          {cohortComparison.cohortCriteria.diagnosis} |{' '}
                          {cohortComparison.cohortCriteria.ageRange} |{' '}
                          {cohortComparison.cohortCriteria.mobilityLevel}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metric Comparisons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Average Power
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Patient</span>
                          <span className="font-bold text-lg">{cohortComparison.metrics.avgPower.patient}W</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Cohort Avg</span>
                          <span className="text-gray-500">{cohortComparison.metrics.avgPower.cohortAvg}W</span>
                        </div>
                        <Progress value={cohortComparison.metrics.avgPower.percentile} />
                        <div className={`text-center font-medium ${getPercentileColor(cohortComparison.metrics.avgPower.percentile)}`}>
                          {cohortComparison.metrics.avgPower.percentile}th percentile
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Average Duration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Patient</span>
                          <span className="font-bold text-lg">{cohortComparison.metrics.avgDuration.patient} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Cohort Avg</span>
                          <span className="text-gray-500">{cohortComparison.metrics.avgDuration.cohortAvg} min</span>
                        </div>
                        <Progress value={cohortComparison.metrics.avgDuration.percentile} />
                        <div className={`text-center font-medium ${getPercentileColor(cohortComparison.metrics.avgDuration.percentile)}`}>
                          {cohortComparison.metrics.avgDuration.percentile}th percentile
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Session Frequency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Patient</span>
                          <span className="font-bold text-lg">{cohortComparison.metrics.sessionFrequency.patient}/day</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Cohort Avg</span>
                          <span className="text-gray-500">{cohortComparison.metrics.sessionFrequency.cohortAvg}/day</span>
                        </div>
                        <Progress value={cohortComparison.metrics.sessionFrequency.percentile} />
                        <div className={`text-center font-medium ${getPercentileColor(cohortComparison.metrics.sessionFrequency.percentile)}`}>
                          {cohortComparison.metrics.sessionFrequency.percentile}th percentile
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Improvement Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Patient</span>
                          <span className="font-bold text-lg">+{cohortComparison.metrics.improvement.patient}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Cohort Avg</span>
                          <span className="text-gray-500">+{cohortComparison.metrics.improvement.cohortAvg}%</span>
                        </div>
                        <Progress value={cohortComparison.metrics.improvement.percentile} />
                        <div className={`text-center font-medium ${getPercentileColor(cohortComparison.metrics.improvement.percentile)}`}>
                          {cohortComparison.metrics.improvement.percentile}th percentile
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Select a Patient
                  </h3>
                  <p className="text-gray-500">
                    Choose a patient to see how they compare to similar patients
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Trophy, name: "First Session", desc: "Complete first exercise session", unlocked: true },
                { icon: Zap, name: "Power Up", desc: "Reach 30W average power", unlocked: true },
                { icon: Clock, name: "Endurance", desc: "Complete 20 minute session", unlocked: true },
                { icon: TrendingUp, name: "Improver", desc: "Improve power by 10%", unlocked: false },
                { icon: Calendar, name: "Consistent", desc: "Exercise 5 days in a row", unlocked: false },
                { icon: Star, name: "Star Performer", desc: "Reach top 10 in competition", unlocked: false },
                { icon: Medal, name: "Champion", desc: "Win a competition", unlocked: false },
                { icon: Crown, name: "Elite", desc: "Reach 90th percentile", unlocked: false },
              ].map((achievement, idx) => (
                <Card key={idx} className={achievement.unlocked ? '' : 'opacity-50'}>
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      achievement.unlocked ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      <achievement.icon className={`w-6 h-6 ${
                        achievement.unlocked ? 'text-yellow-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <h3 className="font-medium text-sm">{achievement.name}</h3>
                    <p className="text-xs text-gray-500">{achievement.desc}</p>
                    {achievement.unlocked && (
                      <Badge className="mt-2 bg-green-500">Unlocked</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Competition Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Competition</DialogTitle>
              <DialogDescription>
                Set up a new competition for patients to participate in
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="comp-name">Competition Name</Label>
                <Input
                  id="comp-name"
                  value={newCompetition.name}
                  onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })}
                  placeholder="e.g., Weekly Distance Challenge"
                />
              </div>
              <div>
                <Label htmlFor="comp-type">Type</Label>
                <Select
                  value={newCompetition.type}
                  onValueChange={(v) => setNewCompetition({ ...newCompetition, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_distance">Weekly Distance</SelectItem>
                    <SelectItem value="weekly_duration">Weekly Duration</SelectItem>
                    <SelectItem value="power_challenge">Power Challenge</SelectItem>
                    <SelectItem value="consistency">Consistency Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newCompetition.startDate}
                    onChange={(e) => setNewCompetition({ ...newCompetition, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={newCompetition.endDate}
                    onChange={(e) => setNewCompetition({ ...newCompetition, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createCompetitionMutation.mutate(newCompetition)}
                disabled={!newCompetition.name || !newCompetition.startDate || !newCompetition.endDate || createCompetitionMutation.isPending}
              >
                {createCompetitionMutation.isPending ? "Creating..." : "Create Competition"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
