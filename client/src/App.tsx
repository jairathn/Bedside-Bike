import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth.tsx";
import { SessionTimerProvider } from "@/contexts/SessionTimerContext";
import SessionTimerBanner from "@/components/SessionTimerBanner";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import SessionPage from "@/pages/session";
import GoalsPage from "@/pages/goals";
import ReportsPage from "@/pages/reports";
import GamesPage from "@/pages/games";
import RiskAssessmentPage from "@/pages/risk-assessment";
import NotFound from "@/pages/not-found";
import ProviderDashboard from "@/pages/provider-dashboard";
import KudosWall from "@/pages/kudos-wall";
import ProviderAccessPage from "@/pages/provider-access";
import AnonymousRiskCalculator from "@/pages/anonymous-risk-calculator";
import PublicDischargeReadinessPage from "@/pages/public-discharge-readiness";

// Caregiver Pages
import CaregiverLoginPage from "@/pages/caregiver-login";
import CaregiverDashboard from "@/pages/caregiver/dashboard";
import CaregiverRegisterPage from "@/pages/caregiver/register";
import CaregiverObservationsPage from "@/pages/caregiver/observations";
import CaregiverDischargeChecklistPage from "@/pages/caregiver/discharge-checklist";
import CaregiverPatientSelectorPage from "@/pages/caregiver/patient-selector";

// Patient Pages (observations and discharge checklist)
import PatientObservationsPage from "@/pages/patient/observations";
import PatientDischargeChecklistPage from "@/pages/patient/discharge-checklist";

// Personalization Module Pages
import PersonalizedPrescriptionPage from "@/pages/personalization/personalized-prescription";
import FatigueMonitorPage from "@/pages/personalization/fatigue-monitor";
import ProgressionDashboardPage from "@/pages/personalization/progression-dashboard";
import MedicationSafetyPage from "@/pages/personalization/medication-safety";
import MobilityScoresPage from "@/pages/personalization/mobility-scores";
import CompetitionCenterPage from "@/pages/personalization/competition-center";
import InsuranceReportsPage from "@/pages/personalization/insurance-reports";
import BilateralForcePage from "@/pages/personalization/bilateral-force";
import DischargeReadinessPage from "@/pages/personalization/discharge-readiness";

function Router() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, setUser } = useAuth();

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth", "/anonymous-risk-calculator", "/public-discharge-readiness", "/caregiver/login", "/caregiver/register"];

  useEffect(() => {
    if (!isLoading) {
      if (user && location === "/") {
        if (user.userType === 'provider') {
          setLocation("/provider-dashboard");
        } else if (user.userType === 'caregiver') {
          // Caregivers go to patient selector
          setLocation("/caregiver/select-patient");
        } else {
          setLocation("/dashboard");
        }
      } else if (!user && !publicRoutes.includes(location)) {
        setLocation("/");
      }
    }
  }, [user, location, setLocation, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAuthSuccess = (userData: any) => {
    console.log('🎯 handleAuthSuccess called with:', userData);
    console.log('🎯 User type:', userData?.userType);
    console.log('🎯 User ID:', userData?.id);
    setUser(userData);
    console.log('🎯 setUser called, checking localStorage...');
    console.log('🎯 localStorage user:', localStorage.getItem('user'));
    if (userData.userType === 'provider') {
      setLocation("/provider-dashboard");
    } else if (userData.userType === 'caregiver') {
      // Caregivers go to patient selector to choose which patient to view
      setLocation("/caregiver/select-patient");
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <Switch>
      <Route path="/" component={user ? DashboardPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/auth" component={() => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/dashboard" component={user ? DashboardPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/session" component={user ? SessionPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/goals" component={user ? GoalsPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/reports" component={user ? ReportsPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/games" component={user ? GamesPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/risk-assessment" component={user ? RiskAssessmentPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/kudos-wall" component={user ? KudosWall : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/provider-access" component={user ? ProviderAccessPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/provider-dashboard" component={user?.userType === 'provider' ? ProviderDashboard : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/anonymous-risk-calculator" component={AnonymousRiskCalculator} />
      <Route path="/public-discharge-readiness" component={PublicDischargeReadinessPage} />

      {/* Patient Routes (observations and discharge checklist) */}
      <Route path="/patient/observations" component={user ? PatientObservationsPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/patient/discharge-checklist" component={user ? PatientDischargeChecklistPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />

      {/* Caregiver Routes */}
      <Route path="/caregiver/login" component={CaregiverLoginPage} />
      <Route path="/caregiver/register" component={CaregiverRegisterPage} />
      <Route path="/caregiver/select-patient" component={user?.userType === 'caregiver' ? CaregiverPatientSelectorPage : CaregiverLoginPage} />
      <Route path="/caregiver/dashboard" component={user?.userType === 'caregiver' ? CaregiverDashboard : CaregiverLoginPage} />
      <Route path="/caregiver/observations" component={user?.userType === 'caregiver' ? CaregiverObservationsPage : CaregiverLoginPage} />
      <Route path="/caregiver/discharge-checklist/:patientId" component={user?.userType === 'caregiver' ? CaregiverDischargeChecklistPage : CaregiverLoginPage} />

      {/* Personalization Module Routes (Provider Only) */}
      <Route path="/personalized-prescription" component={user?.userType === 'provider' ? PersonalizedPrescriptionPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/fatigue-monitor" component={user?.userType === 'provider' ? FatigueMonitorPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/progression" component={user?.userType === 'provider' ? ProgressionDashboardPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/medication-safety" component={user?.userType === 'provider' ? MedicationSafetyPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/mobility-scores" component={user?.userType === 'provider' ? MobilityScoresPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/competitions" component={user ? CompetitionCenterPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/insurance-reports" component={user?.userType === 'provider' ? InsuranceReportsPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/bilateral-force" component={user?.userType === 'provider' ? BilateralForcePage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/discharge-readiness" component={user?.userType === 'provider' ? DischargeReadinessPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SessionTimerProvider>
            <Toaster />
            <SessionTimerBanner />
            <Router />
          </SessionTimerProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
