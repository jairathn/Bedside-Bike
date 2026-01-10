import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  LogOut,
  Target,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  Calendar,
  CheckCircle,
  Calculator,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pill,
  Trophy,
  FileText,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  Menu,
  X,
  ClipboardCheck
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ProviderGoalEditor } from "@/components/provider-goal-editor";

// Did You Know Component
function DidYouKnowSection() {
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const statistics = [
    {
      stat: "More than 90%",
      text: "of time in the hospital is spent immobile in bed",
      reference: "Brown CJ, et al. Mobility limitation in the older patient: a clinical review. JAMA. 2013;310(11):1168-1177."
    },
    {
      stat: "More than 2%",
      text: "of muscle mass is lost daily in older hospitalized patients",
      reference: "Kortebein P, et al. Effect of 10 days of bed rest on skeletal muscle in healthy older adults. JAMA. 2007;297(16):1772-1774."
    },
    {
      stat: "One-third",
      text: "of patients leave more disabled than when they arrived",
      reference: "Brown CJ, et al. Mobility limitation in the older patient: a clinical review. JAMA. 2013;310(11):1168-1177."
    },
    {
      stat: "15%",
      text: "of 30-day readmissions are due to falls in newly deconditioned patients",
      reference: "Mahoney JE, et al. Temporal association between hospitalization and rate of falls after discharge. Arch Intern Med. 2000;160(18):2788-2795."
    },
    {
      stat: "12 million",
      text: "patients over age 65 enter US hospitals each year",
      reference: "National Hospital Discharge Survey. CDC/NCHS. 2010."
    },
    {
      stat: "30%",
      text: "experience permanent disability and",
      secondStat: "40%",
      secondText: "die within one year after hospitalization due to lost mobility",
      reference: "Covinsky KE, et al. Loss of independence in activities of daily living in older adults hospitalized with medical illnesses. J Am Geriatr Soc. 2011;59(1):83-88; Gill TM, et al. Trajectories of disability in the last year of life. N Engl J Med. 2010;362(13):1173-1180."
    },
    {
      stat: "$93 billion",
      text: "in healthcare dollars are spent on post-acute care and non-medical hospital days annually",
      reference: "Medicare Payment Advisory Commission. Report to Congress: Medicare Payment Policy. 2019."
    },
    {
      stat: "$5 billion",
      text: "in hospital dollars are lost to penalties annually (quality scores, 30-day readmissions)",
      reference: "CMS Hospital Readmissions Reduction Program. Annual Report. 2020."
    },
    {
      stat: "Up to 60%",
      text: "of mobility restriction orders do not have a documented medical indication",
      reference: "Brown CJ, Friedkin RJ, Inouye SK. Prevalence and outcomes of low mobility in hospitalized older patients. J Am Geriatr Soc. 2004 Aug;52(8):1263-70. doi: 10.1111/j.1532-5415.2004.52354.x. PMID: 15271112."
    },
    {
      stat: "20 minutes",
      text: "of cycling daily while admitted, or 400-900 steps can reduce or prevent hospital-acquired functional decline",
      reference: "Burtin C, et al. Early exercise in critically ill patients enhances short-term functional recovery. Crit Care Med. 2009;37(9):2499-505.\n\nAgmon M, et al. Association Between 900 Steps a Day and Functional Decline in Older Hospitalized Patients. JAMA Intern Med. 2017;177(2):272-274."
    }
  ];

  const startAutoRotation = () => {
    if (intervalId) clearInterval(intervalId);
    const newInterval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % statistics.length);
      setExpandedCitation(null);
    }, 7000);
    setIntervalId(newInterval);
  };

  const navigateToStat = (index: number) => {
    setCurrentStatIndex(index);
    setExpandedCitation(null);
    startAutoRotation(); // Reset the timer
  };

  const navigatePrevious = () => {
    const newIndex = currentStatIndex === 0 ? statistics.length - 1 : currentStatIndex - 1;
    navigateToStat(newIndex);
  };

  const navigateNext = () => {
    const newIndex = (currentStatIndex + 1) % statistics.length;
    navigateToStat(newIndex);
  };

  useEffect(() => {
    startAutoRotation();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  const currentStat = statistics[currentStatIndex];

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-white">Did You Know?</h3>
              <div className="flex space-x-1">
                {statistics.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      index === currentStatIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xl font-medium mb-2 flex-1">
                <span className="text-3xl font-bold text-yellow-300">{currentStat.stat}</span>
                {' '}{currentStat.text}
                {currentStat.secondStat && (
                  <>
                    {' '}<span className="text-3xl font-bold text-yellow-300">{currentStat.secondStat}</span>
                    {' '}{currentStat.secondText}
                  </>
                )}
                <button
                  onClick={() => setExpandedCitation(expandedCitation === currentStatIndex ? null : currentStatIndex)}
                  className="ml-2 text-yellow-300 hover:text-yellow-200 transition-colors"
                >
                  {expandedCitation === currentStatIndex ? (
                    <ChevronUp className="w-4 h-4 inline" />
                  ) : (
                    <ChevronDown className="w-4 h-4 inline" />
                  )}
                </button>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={navigatePrevious}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Previous statistic"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={navigateNext}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Next statistic"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            {expandedCitation === currentStatIndex && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-blue-100 italic whitespace-pre-line">
                  <strong>Reference:</strong> {currentStat.reference}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Navigation menu items for personalization features
const navigationItems = [
  {
    category: "Clinical Tools",
    items: [
      { name: "Personalized Prescription", href: "/personalized-prescription", icon: Target, description: "Diagnosis-adjusted mobility prescription" },
      { name: "Fatigue Monitor", href: "/fatigue-monitor", icon: Activity, description: "Real-time fatigue detection" },
      { name: "Progression Dashboard", href: "/progression", icon: TrendingUp, description: "Progressive overload tracking" },
      { name: "Medication Safety", href: "/medication-safety", icon: Pill, description: "Drug-exercise interactions" },
    ]
  },
  {
    category: "Assessment & Scoring",
    items: [
      { name: "Discharge Readiness", href: "/discharge-readiness", icon: ClipboardCheck, description: "Elderly Mobility Scale calculator" },
      { name: "Mobility Scores", href: "/mobility-scores", icon: BarChart3, description: "Multi-modal scoring system" },
      { name: "Bilateral Force", href: "/bilateral-force", icon: ArrowLeftRight, description: "Force symmetry analysis" },
    ]
  },
  {
    category: "Engagement & Reporting",
    items: [
      { name: "Competitions", href: "/competitions", icon: Trophy, description: "Virtual competitions & cohorts" },
      { name: "Insurance Reports", href: "/insurance-reports", icon: FileText, description: "Authorization documentation" },
    ]
  }
];

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  // Check if user can edit goals (all provider types can edit)
  const canEditGoals = (user: any) => {
    return user?.userType === 'provider';
  };

  // Get list of patients this provider can access
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Debug logging for provider dashboard
  useEffect(() => {
    console.log('🏥 Provider Dashboard Debug:', {
      user: user ? { id: user.id, userType: user.userType, email: user.email } : 'NO USER',
      queryEnabled: !!user && user.userType === 'provider',
      patients: patients,
      patientsCount: patients?.length || 0,
      patientsLoading,
      selectedPatient: selectedPatient ? { id: selectedPatient.id, name: `${selectedPatient.firstName} ${selectedPatient.lastName}` } : 'NONE',
      queryKey: `/api/providers/${user?.id}/patients`
    });
  }, [user, patients, patientsLoading, selectedPatient]);

  // Get selected patient's goals
  const { data: patientGoals = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/goals`],
    enabled: !!selectedPatient?.id,
  });

  // Get selected patient's recent sessions (2 days)
  const { data: allSessions = [] } = useQuery({
    queryKey: [`/api/patients/${selectedPatient?.id}/sessions`],
    enabled: !!selectedPatient?.id,
  });

  // Filter sessions to last 2 days
  const recentSessions = allSessions.filter((session: any) => {
    const sessionDate = new Date(session.createdAt);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    return sessionDate >= twoDaysAgo;
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
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="mr-2"
                onClick={() => setNavMenuOpen(!navMenuOpen)}
              >
                {navMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
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

      {/* Navigation Sidebar */}
      <div
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${
          navMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setNavMenuOpen(false)}
        />

        {/* Sidebar Panel */}
        <div
          className={`absolute left-0 top-16 bottom-0 w-80 bg-white shadow-xl transform transition-transform duration-300 overflow-y-auto ${
            navMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              Personalization Tools
            </h2>

            {navigationItems.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {category.category}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item, itemIndex) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={itemIndex}
                        onClick={() => {
                          setLocation(item.href);
                          setNavMenuOpen(false);
                        }}
                        className="w-full flex items-start p-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setLocation('/risk-assessment');
                    setNavMenuOpen(false);
                  }}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Risk Calculator
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedPatient) {
                      setLocation(`/personalized-prescription?patient=${selectedPatient.id}`);
                    } else {
                      setLocation('/personalized-prescription');
                    }
                    setNavMenuOpen(false);
                  }}
                >
                  <Target className="w-4 h-4 mr-2" />
                  {selectedPatient ? `Personalized Rx for ${selectedPatient.firstName}` : 'Personalized Prescription'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-green-50 border-green-200 hover:bg-green-100"
                  onClick={() => {
                    setLocation('/discharge-readiness');
                    setNavMenuOpen(false);
                  }}
                >
                  <ClipboardCheck className="w-4 h-4 mr-2 text-green-600" />
                  {selectedPatient ? `Discharge Readiness for ${selectedPatient.firstName}` : 'Discharge Readiness Score'}
                </Button>
              </div>
            </div>

            {/* Alert for Patient Selection */}
            {!selectedPatient && (
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No Patient Selected</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Select a patient from the dashboard to use patient-specific features.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Did You Know Section */}
        <DidYouKnowSection />
        
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
                        <p className="text-sm text-gray-600">Sessions (2 days)</p>
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

                    {/* Quick Assessment Action */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <ClipboardCheck className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Discharge Readiness Assessment</h4>
                        <p className="text-sm text-gray-600">Evaluate mobility using the validated Elderly Mobility Scale</p>
                      </div>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setLocation('/discharge-readiness')}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Assess Now
                      </Button>
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
                          <LineChart data={(usageData || []).map(item => ({
                            ...item,
                            duration: Math.floor(Number(item.duration)) // Duration already in minutes
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value, name) => [`${value} min`, 'Duration']} />
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