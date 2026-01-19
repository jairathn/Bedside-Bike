import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Heart,
  LogOut,
  Activity,
  ChevronRight,
  ChevronLeft,
  Calendar,
  User,
  Loader2,
  UserPlus,
  BookOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Research statistics for caregiver rotating banner
const caregiverResearchStats = [
  {
    category: "INFORM",
    title: "Family engagement reduces readmissions",
    stat: "25%",
    description: "reduction in 30-day readmissions when families are actively involved in care transitions",
    citation: "AHRQ Patient & Family Engagement Guide, 2023"
  },
  {
    category: "ACTIVATE",
    title: "Caregiver involvement improves outcomes",
    stat: "40%",
    description: "improvement in medication adherence when caregivers participate in discharge planning",
    citation: "Joint Commission Family Engagement Standards, 2024"
  },
  {
    category: "COLLABORATE",
    title: "Shared decision-making increases satisfaction",
    stat: "3x",
    description: "higher patient satisfaction scores when families collaborate with care teams",
    citation: "Institute for Patient & Family-Centered Care, 2023"
  },
  {
    category: "INFORM",
    title: "Knowledge improves caregiver confidence",
    stat: "67%",
    description: "of caregivers report feeling unprepared at discharge; education reduces anxiety",
    citation: "National Alliance for Caregiving, 2024"
  },
  {
    category: "ACTIVATE",
    title: "Early mobilization requires support",
    stat: "2.5x",
    description: "faster functional recovery when families encourage and track mobility exercises",
    citation: "AACN Evidence-Based Practice Guidelines, 2023"
  },
  {
    category: "COLLABORATE",
    title: "Caregiver observations catch issues early",
    stat: "48%",
    description: "of clinical deterioration signs first noticed by family members, not staff",
    citation: "Journal of Hospital Medicine, 2024"
  }
];

// Caregiver Stats Banner Component
function CaregiverStatsBanner() {
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % caregiverResearchStats.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentStat = caregiverResearchStats[currentStatIndex];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "INFORM": return "bg-blue-500";
      case "ACTIVATE": return "bg-green-500";
      case "COLLABORATE": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "INFORM": return BookOpen;
      case "ACTIVATE": return Heart;
      case "COLLABORATE": return Users;
      default: return BookOpen;
    }
  };

  const CategoryIcon = getCategoryIcon(currentStat.category);

  return (
    <Card className="bg-white/95 backdrop-blur shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={`${getCategoryColor(currentStat.category)} w-2 flex-shrink-0`} />
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className={`${getCategoryColor(currentStat.category)} p-2 rounded-lg`}>
                  <CategoryIcon className="text-white" size={20} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  currentStat.category === "INFORM" ? "text-blue-600" :
                  currentStat.category === "ACTIVATE" ? "text-green-600" :
                  "text-purple-600"
                }`}>
                  {currentStat.category}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentStatIndex((prev) => (prev - 1 + caregiverResearchStats.length) % caregiverResearchStats.length)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft size={18} className="text-gray-400" />
                </button>
                <span className="text-xs text-gray-400 min-w-[3ch] text-center">
                  {currentStatIndex + 1}/{caregiverResearchStats.length}
                </span>
                <button
                  onClick={() => setCurrentStatIndex((prev) => (prev + 1) % caregiverResearchStats.length)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentStat.title}</h3>
            <div className="flex items-baseline gap-3 mb-2">
              <span className={`text-4xl font-bold ${
                currentStat.category === "INFORM" ? "text-blue-600" :
                currentStat.category === "ACTIVATE" ? "text-green-600" :
                "text-purple-600"
              }`}>
                {currentStat.stat}
              </span>
              <span className="text-gray-600 text-sm">{currentStat.description}</span>
            </div>
            <p className="text-xs text-gray-400 italic">{currentStat.citation}</p>
          </div>
        </div>
        <div className="flex justify-center gap-1.5 pb-3">
          {caregiverResearchStats.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStatIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStatIndex
                  ? getCategoryColor(caregiverResearchStats[index].category)
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Relationship type display mapping
const relationshipLabels: Record<string, string> = {
  spouse: "Spouse",
  partner: "Partner",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  friend: "Friend",
  other_family: "Family Member",
  professional_caregiver: "Professional Caregiver",
};

export default function CaregiverPatientSelectorPage() {
  const [, setLocation] = useLocation();
  const { user, logout, setPatient, selectedPatient } = useAuth();
  const { toast } = useToast();

  // Navigate to dashboard when a patient is selected
  useEffect(() => {
    if (selectedPatient) {
      setLocation("/dashboard");
    }
  }, [selectedPatient, setLocation]);

  // Fetch linked patients
  const { data: linkedPatients = [], isLoading } = useQuery({
    queryKey: [`/api/caregivers/${user?.id}/patients`],
    enabled: !!user?.id && user?.userType === 'caregiver',
  });

  // Fetch pending invitations
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: [`/api/caregivers/${user?.id}/patient-invitations`],
    enabled: !!user?.id && user?.userType === 'caregiver',
  });

  const handleSelectPatient = (patient: any) => {
    // Store selected patient in auth context - useEffect will handle navigation
    setPatient(patient);
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user || user.userType !== 'caregiver') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in as a caregiver to continue.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Welcome, {user.firstName}!
                </h1>
                <p className="text-sm text-gray-600">Select a patient to view their dashboard</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Inform/Activate/Collaborate Stats Banner */}
        <CaregiverStatsBanner />

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-500 to-rose-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Users className="w-8 h-8 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-2">Caregiver Dashboard</h2>
                <p className="text-purple-100">
                  As a caregiver, you have full access to your loved one's recovery journey.
                  Select a patient below to view their dashboard, log observations, track discharge preparation, and more.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Pending Invitations ({pendingInvitations.length})
              </CardTitle>
              <CardDescription className="text-orange-700">
                You have pending invitations from patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => setLocation("/caregiver/dashboard")}
              >
                View Invitations
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Patient List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Your Patients ({linkedPatients.length})
          </h3>

          {linkedPatients.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-8 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Patients Yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't been connected to any patients yet.
                  Ask your loved one to invite you, or request access to their account.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/caregiver/register")}
                >
                  Request Access to a Patient
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedPatients.map((patientData: any) => (
                <Card
                  key={patientData.id}
                  className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-purple-300"
                  onClick={() => handleSelectPatient(patientData)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-rose-400 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {patientData.firstName?.[0]}{patientData.lastName?.[0]}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                            {patientData.firstName} {patientData.lastName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {relationshipLabels[patientData.relationship?.relationshipType] || patientData.relationship?.relationshipType}
                            </Badge>
                            {patientData.dateOfBirth && (
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(patientData.dateOfBirth).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-gray-500">Connected since</p>
                          <p className="text-sm font-medium text-gray-700">
                            {patientData.relationship?.approvedAt
                              ? new Date(patientData.relationship.approvedAt).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/caregiver/dashboard")}
            >
              <Activity className="w-4 h-4 mr-2" />
              View Full Caregiver Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/caregiver/register")}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Request Access to Another Patient
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
