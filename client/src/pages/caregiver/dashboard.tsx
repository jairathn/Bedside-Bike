import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Heart,
  Activity,
  Clock,
  TrendingUp,
  Bell,
  MessageSquare,
  FileText,
  User,
  Award,
  ChevronRight,
  LogOut,
  ClipboardList,
  Flame,
  Target,
  Calendar,
  UserPlus,
  UserMinus,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Relationship type display names
const relationshipLabels: Record<string, string> = {
  spouse: "Spouse",
  partner: "Partner",
  child: "Adult Child",
  parent: "Parent",
  sibling: "Sibling",
  friend: "Friend",
  other_family: "Family Member",
  professional_caregiver: "Professional Caregiver"
};

export default function CaregiverDashboard() {
  const [, setLocation] = useLocation();
  const { user, caregiverPatients, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState<any>(null);

  // Get pending patient invitations (patients who invited this caregiver)
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: [`/api/caregivers/${user?.id}/patient-invitations`],
    enabled: !!user?.id && user?.userType === 'caregiver',
  });

  // Show invitations modal when there are pending invitations on first load
  useEffect(() => {
    if (pendingInvitations.length > 0 && !showInvitationsModal) {
      setShowInvitationsModal(true);
    }
  }, [pendingInvitations]);

  // Respond to patient invitation mutation
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ relationId, status }: { relationId: number; status: 'approved' | 'denied' }) => {
      return await apiRequest(`/api/caregivers/${user?.id}/patient-invitations/${relationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/caregivers/${user?.id}/patient-invitations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/caregivers/${user?.id}/patients`] });
      toast({
        title: variables.status === 'approved' ? "Invitation Accepted" : "Invitation Declined",
        description: variables.status === 'approved'
          ? "You can now view this patient's progress."
          : "You have declined the invitation.",
      });
      // Reload page to update caregiverPatients in auth context
      if (variables.status === 'approved') {
        window.location.reload();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to respond to invitation",
        variant: "destructive",
      });
    },
  });

  // Remove patient access mutation
  const removePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return await apiRequest(`/api/caregivers/${user?.id}/patients/${patientId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/caregivers/${user?.id}/patients`] });
      // If removed patient was selected, clear selection
      if (selectedPatientId === patientToRemove?.id) {
        setSelectedPatientId(null);
      }
      setShowRemoveConfirmModal(false);
      setPatientToRemove(null);
      toast({
        title: "Access Removed",
        description: "You have removed yourself from this patient's care team.",
      });
      // Refresh the page to update caregiverPatients in auth context
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove patient access",
        variant: "destructive",
      });
    },
  });

  // Set default selected patient
  useEffect(() => {
    if (caregiverPatients && caregiverPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(caregiverPatients[0].id);
    }
  }, [caregiverPatients, selectedPatientId]);

  const selectedPatient = caregiverPatients?.find(p => p.id === selectedPatientId);

  // Fetch dashboard data for selected patient
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/caregivers", user?.id, "patients", selectedPatientId, "dashboard"],
    queryFn: async () => {
      if (!user?.id || !selectedPatientId) return null;
      const res = await fetch(`/api/caregivers/${user.id}/patients/${selectedPatientId}/dashboard`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: !!user?.id && !!selectedPatientId
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ["/api/caregivers", user?.id, "notifications"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/caregivers/${user.id}/notifications`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id
  });

  const unreadNotifications = notifications?.filter((n: any) => !n.isRead) || [];

  // Mark all notifications as read mutation
  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/caregivers/${user?.id}/notifications/read-all`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregivers", user?.id, "notifications"] });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/caregiver/login");
  };

  if (!user || !caregiverPatients) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Format duration from seconds to minutes (for session duration)
  const formatDurationFromSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins > 0 ? `${mins} min` : "< 1 min";
  };

  // Format duration that's already in minutes (for stats.totalDuration)
  const formatDurationMinutes = (minutes: number) => {
    return minutes > 0 ? `${Math.round(minutes)} min` : "< 1 min";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="text-white" size={28} />
              <div>
                <h1 className="text-xl font-bold">Caregiver Portal</h1>
                <p className="text-rose-100 text-sm">Welcome, {user.firstName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowInvitationsModal(true)}
                  >
                    <UserPlus size={20} />
                    <span className="absolute -top-1 -right-1 bg-green-400 text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {pendingInvitations.length}
                    </span>
                  </Button>
                </div>
              )}

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setShowNotificationsModal(true)}
                >
                  <Bell size={20} />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut size={18} className="mr-1" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Patient Selector */}
          {caregiverPatients.length > 1 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-rose-100 text-sm">Viewing:</span>
              {caregiverPatients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedPatientId === patient.id
                      ? "bg-white text-purple-700 font-medium"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {patient.firstName} {patient.lastName}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Empty State - No approved patients */}
        {!selectedPatient && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-purple-600" size={40} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Patients Yet</h2>
              <p className="text-gray-600 mb-4">
                {pendingInvitations.length > 0
                  ? "You have pending patient invitations waiting for your response."
                  : "When patients invite you to view their progress, you'll see their invitations here."}
              </p>
              {pendingInvitations.length > 0 && (
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowInvitationsModal(true)}
                >
                  <UserPlus size={18} className="mr-2" />
                  View {pendingInvitations.length} Pending Invitation{pendingInvitations.length > 1 ? 's' : ''}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {selectedPatient && (
          <>
            {/* Patient Info Card */}
            <Card className="mb-6 border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-purple-100 rounded-full flex items-center justify-center">
                      <User size={28} className="text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </h2>
                      <p className="text-gray-600 text-sm">
                        You are their {relationshipLabels[selectedPatient.relationship?.relationshipType] || "caregiver"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Access Approved
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPatientToRemove(selectedPatient);
                        setShowRemoveConfirmModal(true);
                      }}
                    >
                      <UserMinus size={18} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            {isLoading ? (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : dashboardData ? (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 text-sm">Total Sessions</span>
                      <Activity className="text-purple-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.stats?.totalSessions || 0}
                    </p>
                    <p className="text-xs text-gray-500">all-time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 text-sm">Total Exercise Time</span>
                      <Clock className="text-blue-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDurationMinutes(dashboardData.stats?.totalDuration || 0)}
                    </p>
                    <p className="text-xs text-gray-500">cumulative</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 text-sm">Current Streak</span>
                      <Flame className="text-orange-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.stats?.consistencyStreak || 0} days
                    </p>
                    <p className="text-xs text-gray-500">consecutive</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 text-sm">Level</span>
                      <Award className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      Level {dashboardData.stats?.level || 1}
                    </p>
                    <p className="text-xs text-gray-500">{dashboardData.stats?.xp || 0} XP</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Goals Progress */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="text-purple-500" size={20} />
                    Today's Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.goals?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.goals.map((goal: any) => {
                        const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{goal.label}</span>
                              <span className="text-sm text-gray-600">
                                {goal.currentValue} / {goal.targetValue} {goal.unit}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            {goal.subtitle && (
                              <p className="text-xs text-gray-500">{goal.subtitle}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No goals set yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="text-rose-500" size={20} />
                    Support Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
                    onClick={() => setLocation("/caregiver/observations")}
                  >
                    <ClipboardList size={18} className="mr-2" />
                    Log Daily Observation
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={() => setLocation(`/caregiver/discharge-checklist/${selectedPatientId}`)}
                  >
                    <FileText size={18} className="mr-2" />
                    Discharge Checklist
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Send encouragement messages feature is under development.",
                      });
                    }}
                  >
                    <MessageSquare size={18} className="mr-2" />
                    Send Encouragement
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Sessions */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="text-blue-500" size={20} />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.recentSessions?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.recentSessions.slice(0, 5).map((session: any) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Activity className="text-green-600" size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatDurationMinutes(session.duration)} cycling session
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(session.sessionDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {session.avgPower ? `${Math.round(session.avgPower)}W` : '--'}
                            </p>
                            <p className="text-xs text-gray-500">avg power</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No recent sessions</p>
                  )}
                </CardContent>
              </Card>

              {/* Supporter Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="text-yellow-500" size={20} />
                    Your Supporter Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-3">
                      <span className="text-3xl font-bold text-orange-600">
                        {selectedPatient.relationship?.supporterLevel || 1}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">Supporter Level</p>
                    <p className="text-sm text-gray-500">
                      {selectedPatient.relationship?.supporterXp || 0} XP earned
                    </p>
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Observations logged</span>
                      <span className="font-medium">
                        {dashboardData?.observationCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Encouragements sent</span>
                      <span className="font-medium">
                        {dashboardData?.nudgeCount || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications Section */}
            {unreadNotifications.length > 0 && (
              <Card className="mt-6 border-l-4 border-l-yellow-400">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="text-yellow-500" size={20} />
                    Recent Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {unreadNotifications.slice(0, 3).map((notification: any) => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bell className="text-yellow-600" size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="text-gray-400" size={20} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Pending Patient Invitations Dialog */}
      <Dialog open={showInvitationsModal} onOpenChange={setShowInvitationsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-purple-600" />
              Patient Invitations
            </DialogTitle>
            <DialogDescription>
              The following patients have invited you to be their caregiver.
              Accept to view their mobility progress and support their recovery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {pendingInvitations.map((invitation: any) => (
              <div
                key={invitation.relationship.id}
                className="p-4 border rounded-lg bg-purple-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invitation.firstName} {invitation.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Relationship: {relationshipLabels[invitation.relationship.relationshipType] || invitation.relationship.relationshipType}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Invited: {new Date(invitation.relationship.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => respondToInvitationMutation.mutate({
                        relationId: invitation.relationship.id,
                        status: 'denied',
                      })}
                      disabled={respondToInvitationMutation.isPending}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => respondToInvitationMutation.mutate({
                        relationId: invitation.relationship.id,
                        status: 'approved',
                      })}
                      disabled={respondToInvitationMutation.isPending}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {pendingInvitations.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No pending invitations
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvitationsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caregiver Notifications Dialog */}
      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2 text-purple-600" />
              Notifications
            </DialogTitle>
            <DialogDescription>
              Updates about your patients and access requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {notifications?.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.isRead ? 'bg-gray-50 border-gray-200' : 'bg-purple-50 border-purple-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${notification.isRead ? 'text-gray-700' : 'text-purple-900'}`}>
                      {notification.title}
                    </p>
                    <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-600' : 'text-purple-700'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-2"></span>
                  )}
                </div>
              </div>
            ))}
            {(!notifications || notifications.length === 0) && (
              <p className="text-center text-gray-500 py-4">
                No notifications yet
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            {unreadNotifications.length > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllNotificationsReadMutation.mutate()}
                disabled={markAllNotificationsReadMutation.isPending}
              >
                Mark All Read
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowNotificationsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Patient Confirmation Dialog */}
      <Dialog open={showRemoveConfirmModal} onOpenChange={setShowRemoveConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Remove Patient Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove yourself from {patientToRemove?.firstName} {patientToRemove?.lastName}'s care team?
              You will no longer be able to view their progress or provide support.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirmModal(false);
                setPatientToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => patientToRemove && removePatientMutation.mutate(patientToRemove.id)}
              disabled={removePatientMutation.isPending}
            >
              {removePatientMutation.isPending ? "Removing..." : "Remove Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
