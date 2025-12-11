import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth.tsx";
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

// Personalization Module Pages
import PersonalizedPrescriptionPage from "@/pages/personalization/personalized-prescription";
import FatigueMonitorPage from "@/pages/personalization/fatigue-monitor";
import ProgressionDashboardPage from "@/pages/personalization/progression-dashboard";
import MedicationSafetyPage from "@/pages/personalization/medication-safety";
import MobilityScoresPage from "@/pages/personalization/mobility-scores";
import CompetitionCenterPage from "@/pages/personalization/competition-center";
import InsuranceReportsPage from "@/pages/personalization/insurance-reports";
import BilateralForcePage from "@/pages/personalization/bilateral-force";

function Router() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, setUser } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user && location === "/") {
        if (user.userType === 'provider') {
          setLocation("/provider-dashboard");
        } else {
          setLocation("/dashboard");
        }
      } else if (!user && location !== "/" && location !== "/auth" && location !== "/anonymous-risk-calculator") {
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

      {/* Personalization Module Routes (Provider Only) */}
      <Route path="/personalized-prescription" component={user?.userType === 'provider' ? PersonalizedPrescriptionPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/fatigue-monitor" component={user?.userType === 'provider' ? FatigueMonitorPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/progression" component={user?.userType === 'provider' ? ProgressionDashboardPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/medication-safety" component={user?.userType === 'provider' ? MedicationSafetyPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/mobility-scores" component={user?.userType === 'provider' ? MobilityScoresPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/competitions" component={user ? CompetitionCenterPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/insurance-reports" component={user?.userType === 'provider' ? InsuranceReportsPage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />
      <Route path="/bilateral-force" component={user?.userType === 'provider' ? BilateralForcePage : () => <AuthPage onAuthSuccess={handleAuthSuccess} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
