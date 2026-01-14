import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Users, BookOpen, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Research statistics for the rotating banner
const researchStats = [
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

// Demo caregiver accounts
const demoCaregivers = [
  {
    name: "Maria Martinez",
    email: "maria.martinez@caregiver.local",
    relationship: "Spouse",
    patientName: "Robert Martinez",
    patientCondition: "COPD + Parkinson's (Hospital ICU)",
    dob: "1958-05-15"
  },
  {
    name: "Michael Chen",
    email: "michael.chen@caregiver.local",
    relationship: "Adult Son",
    patientName: "Dorothy Chen",
    patientCondition: "Hip Fracture (Inpatient Rehab)",
    dob: "1971-08-22"
  },
  {
    name: "Sarah Thompson",
    email: "sarah.thompson@caregiver.local",
    relationship: "Daughter",
    patientName: "James Thompson",
    patientCondition: "Sepsis + CHF (SNF)",
    dob: "1988-11-03"
  }
];

export default function CaregiverLoginPage() {
  const [, setLocation] = useLocation();
  const { loginCaregiver } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [currentStatIndex, setCurrentStatIndex] = useState(0);

  // Auto-rotate research stats every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % researchStats.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentStat = researchStats[currentStatIndex];

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

  const fillDemoCaregiver = (caregiver: typeof demoCaregivers[0]) => {
    setEmail(caregiver.email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      const result = await loginCaregiver(email);
      if (result) {
        toast({
          title: `Welcome, ${result.user.firstName}!`,
          description: `You have access to ${result.patients.length} patient${result.patients.length !== 1 ? 's' : ''}.`,
        });
        setLocation("/caregiver/dashboard");
      } else {
        toast({
          title: "Invalid credentials",
          description: "No caregiver account found with this email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "An error occurred while signing in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const CategoryIcon = getCategoryIcon(currentStat.category);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 to-purple-700 px-4 py-8">
      <div className="w-full max-w-5xl">
        {/* Research Stats Banner */}
        <Card className="mb-6 bg-white/95 backdrop-blur shadow-2xl fade-in overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              {/* Category indicator */}
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

                  {/* Navigation arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentStatIndex((prev) => (prev - 1 + researchStats.length) % researchStats.length)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Previous stat"
                    >
                      <ChevronLeft size={18} className="text-gray-400" />
                    </button>
                    <span className="text-xs text-gray-400 min-w-[3ch] text-center">
                      {currentStatIndex + 1}/{researchStats.length}
                    </span>
                    <button
                      onClick={() => setCurrentStatIndex((prev) => (prev + 1) % researchStats.length)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Next stat"
                    >
                      <ChevronRight size={18} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentStat.title}
                </h3>

                <div className="flex items-baseline gap-3 mb-2">
                  <span className={`text-4xl font-bold ${
                    currentStat.category === "INFORM" ? "text-blue-600" :
                    currentStat.category === "ACTIVATE" ? "text-green-600" :
                    "text-purple-600"
                  }`}>
                    {currentStat.stat}
                  </span>
                  <span className="text-gray-600 text-sm">
                    {currentStat.description}
                  </span>
                </div>

                <p className="text-xs text-gray-400 italic">
                  {currentStat.citation}
                </p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-3">
              {researchStats.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStatIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStatIndex
                      ? getCategoryColor(researchStats[index].category)
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  aria-label={`Go to stat ${index + 1}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Login Form */}
          <Card className="shadow-2xl fade-in">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Heart className="text-white text-2xl" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Caregiver Portal</h1>
                <p className="text-gray-600 mt-2">Support your loved one's recovery</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In as Caregiver"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">New caregiver?</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => setLocation("/caregiver/register")}
                >
                  Request Access to Patient
                  <ArrowRight className="ml-2" size={16} />
                </Button>

                <div className="text-center pt-4">
                  <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">
                    Back to Patient Login
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Demo Caregiver Credentials */}
          <div className="space-y-4">
            <Card className="shadow-2xl fade-in bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="text-purple-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Demo Caregiver Accounts</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Click any caregiver to auto-fill login credentials
                </p>
                <div className="space-y-3">
                  {demoCaregivers.map((caregiver) => (
                    <button
                      key={caregiver.email}
                      type="button"
                      onClick={() => fillDemoCaregiver(caregiver)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 group-hover:text-purple-700">
                              {caregiver.name}
                            </p>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              {caregiver.relationship}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Caring for: <span className="font-medium">{caregiver.patientName}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{caregiver.patientCondition}</p>
                          <p className="text-xs font-mono text-gray-400 mt-2 bg-gray-50 px-2 py-1 rounded inline-block">
                            {caregiver.email}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Framework explanation */}
            <Card className="shadow-2xl fade-in bg-gradient-to-br from-rose-50 to-purple-50 border-rose-200">
              <CardContent className="p-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  Inform - Activate - Collaborate
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <BookOpen size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p><span className="font-medium text-blue-600">Inform:</span> Stay updated on your loved one's progress and care plan</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Heart size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p><span className="font-medium text-green-600">Activate:</span> Encourage mobility, log observations, support recovery</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                    <p><span className="font-medium text-purple-600">Collaborate:</span> Share insights with the care team for better outcomes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
