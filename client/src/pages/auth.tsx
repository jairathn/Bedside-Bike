import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, Activity, Shield, UserPlus, LogIn, Lightbulb, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calculator, User } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

// Patient-Friendly Did You Know Component
function PatientFactoids() {
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
      stat: "20 minutes",
      text: "of cycling daily while you're admitted, or 400-900 steps can reduce or prevent hospital-acquired functional decline",
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
    startAutoRotation();
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
    <Card className="mb-6 bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-base font-semibold text-white">Did You Know?</h3>
              <div className="flex space-x-1">
                {statistics.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                      index === currentStatIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-base font-medium mb-1 flex-1">
                <span className="text-xl font-bold text-yellow-300">{currentStat.stat}</span>
                {' '}{currentStat.text}
                <button
                  onClick={() => setExpandedCitation(expandedCitation === currentStatIndex ? null : currentStatIndex)}
                  className="ml-2 text-yellow-300 hover:text-yellow-200 transition-colors"
                >
                  {expandedCitation === currentStatIndex ? (
                    <ChevronUp className="w-3 h-3 inline" />
                  ) : (
                    <ChevronDown className="w-3 h-3 inline" />
                  )}
                </button>
              </div>
              <div className="flex items-center space-x-1 ml-3">
                <button
                  onClick={navigatePrevious}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Previous statistic"
                >
                  <ChevronLeft className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={navigateNext}
                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Next statistic"
                >
                  <ChevronRight className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
            {expandedCitation === currentStatIndex && (
              <div className="mt-2 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-xs text-green-100 italic whitespace-pre-line">
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

const demoPatients = [
  {
    name: "Robert Martinez",
    firstName: "Robert",
    lastName: "Martinez",
    dob: "1955-01-01",
    description: "70yo, Hospital ICU - COPD + Parkinson's",
    type: "Hospital"
  },
  {
    name: "Dorothy Chen",
    firstName: "Dorothy",
    lastName: "Chen",
    dob: "1943-01-01",
    description: "82yo, Inpatient Rehab - Hip Fracture + Diabetes",
    type: "Rehab"
  },
  {
    name: "James Thompson",
    firstName: "James",
    lastName: "Thompson",
    dob: "1960-01-01",
    description: "65yo, SNF - Sepsis + CHF Recovery",
    type: "SNF"
  }
];

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [userType, setUserType] = useState<"patient" | "provider">("patient");
  const [patientCredentials, setPatientCredentials] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: ""
  });
  const [suggestedDevice, setSuggestedDevice] = useState<string>("");
  const { toast } = useToast();

  // Query to get last used device when patient credentials are complete
  const { data: lastDeviceData } = useQuery({
    queryKey: ['/api/patients/last-device', patientCredentials.firstName, patientCredentials.lastName, patientCredentials.dateOfBirth],
    enabled: !!(patientCredentials.firstName && patientCredentials.lastName && patientCredentials.dateOfBirth),
    staleTime: 30000, // Cache for 30 seconds
    queryFn: () => {
      console.log('Fetching last device for:', patientCredentials);
      return fetch(`/api/patients/last-device?firstName=${encodeURIComponent(patientCredentials.firstName)}&lastName=${encodeURIComponent(patientCredentials.lastName)}&dateOfBirth=${encodeURIComponent(patientCredentials.dateOfBirth)}`)
        .then(res => res.json());
    }
  });

  // Auto-populate device number when last device is found
  useEffect(() => {
    if (lastDeviceData?.lastDevice) {
      setSuggestedDevice(lastDeviceData.lastDevice);
      console.log('Setting suggested device:', lastDeviceData.lastDevice);
    } else {
      setSuggestedDevice("");
    }
  }, [lastDeviceData]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (loginData: any) => {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginData),
      });
      return response;
    },
    onSuccess: (data) => {
      onAuthSuccess(data.user || data.patient);
      
      // Show device switching notification if available
      if (data.deviceLinkResult && data.deviceLinkResult.message) {
        toast({
          title: data.deviceLinkResult.isDeviceSwitch ? "Device Switched!" : "Device Linked!",
          description: data.deviceLinkResult.message,
          duration: 6000, // Show longer for device switching messages
        });
      } else {
        // Default welcome message if no device info
        toast({
          title: "Welcome back!",
          description: userType === 'patient' ? "Access your personalized therapy dashboard" : "Access your provider portal",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (registerData: any) => {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerData),
      });
      return response;
    },
    onSuccess: (data) => {
      onAuthSuccess(data.user);
      toast({
        title: "Account created!",
        description: userType === 'patient' ? "Welcome to your personalized therapy journey" : "Your provider account is ready",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
    },
  });

  const fillDemoPatient = (patient: typeof demoPatients[0]) => {
    // Update state - controlled inputs will automatically update
    setPatientCredentials({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dob
    });

    toast({
      title: "Demo patient loaded",
      description: `${patient.name}'s credentials have been filled in. Click "Sign In to Dashboard" to login.`,
      duration: 5000,
    });
  };

  const handleLogin = (formData: FormData) => {
    const data = Object.fromEntries(formData.entries());

    console.log('=== LOGIN DEBUG ===');
    console.log('Form data:', data);
    console.log('Patient credentials state:', patientCredentials);
    console.log('Date from form:', data.dateOfBirth);
    console.log('Date from state:', patientCredentials.dateOfBirth);

    // Support legacy patient login (name + DOB only)
    if (userType === 'patient' && data.firstName && data.lastName && data.dateOfBirth && !data.email) {
      const loginPayload = {
        firstName: data.firstName as string,
        lastName: data.lastName as string,
        dateOfBirth: data.dateOfBirth as string,
        deviceNumber: (data.deviceNumber as string) || null,
      };
      console.log('Sending login payload:', loginPayload);
      loginMutation.mutate(loginPayload);
    } else {
      loginMutation.mutate({
        ...data,
        userType,
        deviceNumber: data.deviceNumber || null,
      });
    }
  };

  const handleRegister = (formData: FormData) => {
    const data = Object.fromEntries(formData.entries());
    registerMutation.mutate({
      ...data,
      userType,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Heart className="w-12 h-12 text-red-500" />
              <Activity className="w-6 h-6 text-blue-600 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bedside Bike</h1>
            <p className="text-gray-600 mt-2">Personalized Hospital Mobility Platform</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>AI-Powered Risk Assessment & Therapy</span>
            </div>
          </div>
        </div>

        {/* Introduction to Immobility Harm */}
        <Card className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 mb-3">What Is Immobility Harm?</h3>
                <p className="text-red-700 leading-relaxed">
                  Immobility harm is what happens when hospital patients spend too much time lying in bed—their bodies start to forget how to be strong. Within just days, muscles shrink, balance falters, and simple tasks like walking to the bathroom become dangerous, turning what should be healing time into a fight against an already recovering body.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anonymous Risk Calculator - Top Priority */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-3">
              <Calculator className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Try Our Risk Calculator</h3>
            <p className="text-sm text-green-700 mb-4">
              Get personalized mobility recommendations and risk outcomes instantly - no account required
            </p>
            <Button 
              onClick={() => window.location.href = '/anonymous-risk-calculator'}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3"
              size="lg"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Try Anonymous Risk Calculator
            </Button>
          </CardContent>
        </Card>

        {/* Patient Education Factoids */}
        <PatientFactoids />

        {/* User Type Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Choose Account Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={userType} onValueChange={(value) => setUserType(value as "patient" | "provider")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patient" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Patient
                </TabsTrigger>
                <TabsTrigger value="provider" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Provider
                </TabsTrigger>
              </TabsList>

              {/* Patient Auth */}
              <TabsContent value="patient" className="mt-6">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="register" className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Register
                    </TabsTrigger>
                  </TabsList>

                  {/* Patient Login */}
                  <TabsContent value="login">
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient Sign In</CardTitle>
                        <CardDescription>
                          Access your personalized therapy dashboard
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleLogin(new FormData(e.currentTarget));
                        }} className="space-y-4">
                          
                          {/* Email-based login */}
                          <div className="space-y-2">
                            <Label htmlFor="email">Email (Recommended)</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="your.email@example.com"
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-muted-foreground">
                                Or use legacy login
                              </span>
                            </div>
                          </div>

                          {/* Legacy name + DOB login */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                name="firstName"
                                placeholder="John"
                                value={patientCredentials.firstName}
                                onChange={(e) => {
                                const value = e.target.value;
                                console.log('First name changed:', value);
                                setPatientCredentials(prev => ({ ...prev, firstName: value }));
                              }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input
                                id="lastName"
                                name="lastName"
                                placeholder="Doe"
                                value={patientCredentials.lastName}
                                onChange={(e) => {
                                const value = e.target.value;
                                console.log('Last name changed:', value);
                                setPatientCredentials(prev => ({ ...prev, lastName: value }));
                              }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                            <Input
                              id="dateOfBirth"
                              name="dateOfBirth"
                              type="date"
                              value={patientCredentials.dateOfBirth}
                              onChange={(e) => {
                                const value = e.target.value;
                                console.log('Date of birth changed:', value);
                                setPatientCredentials(prev => ({ ...prev, dateOfBirth: value }));
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="deviceNumber">
                              Bike Number {suggestedDevice && "(Auto-suggested)"}
                            </Label>
                            <Input
                              id="deviceNumber"
                              name="deviceNumber"
                              placeholder="121, 122, 123, etc."
                              defaultValue={suggestedDevice}
                              key={suggestedDevice} // Force re-render when suggestion changes
                            />
                            <p className="text-xs text-gray-500">
                              {suggestedDevice 
                                ? `✅ Bike ${suggestedDevice} suggested based on your previous sessions`
                                : "Enter your bedside bike number to link your session"
                              }
                            </p>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? "Signing In..." : "Sign In to Dashboard"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Demo Patient Credentials */}
                    <Card className="mt-4 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600" />
                          <CardTitle className="text-lg">Demo Patient Accounts</CardTitle>
                        </div>
                        <CardDescription>
                          Click any patient below to auto-fill their credentials
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {demoPatients.map((patient) => (
                          <button
                            key={patient.name}
                            type="button"
                            onClick={() => fillDemoPatient(patient)}
                            className="w-full text-left p-3 rounded-lg border border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                                  {patient.name}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">{patient.description}</p>
                                <p className="text-xs font-mono text-gray-500 mt-1.5 bg-gray-50 px-2 py-0.5 rounded inline-block">
                                  DOB: {patient.dob}
                                </p>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-3">
                                {patient.type}
                              </span>
                            </div>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Patient Registration */}
                  <TabsContent value="register">
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient Registration</CardTitle>
                        <CardDescription>
                          Create your account to start your therapy journey
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleRegister(new FormData(e.currentTarget));
                        }} className="space-y-4">
                          
                          <div className="space-y-2">
                            <Label htmlFor="reg-email">Email Address *</Label>
                            <Input
                              id="reg-email"
                              name="email"
                              type="email"
                              required
                              placeholder="your.email@example.com"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="reg-firstName">First Name *</Label>
                              <Input
                                id="reg-firstName"
                                name="firstName"
                                required
                                placeholder="John"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reg-lastName">Last Name *</Label>
                              <Input
                                id="reg-lastName"
                                name="lastName"
                                required
                                placeholder="Doe"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reg-dateOfBirth">Date of Birth *</Label>
                            <Input
                              id="reg-dateOfBirth"
                              name="dateOfBirth"
                              type="date"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reg-deviceNumber">Bike Number (Optional)</Label>
                            <Input
                              id="reg-deviceNumber"
                              name="deviceNumber"
                              placeholder="121, 122, 123, etc."
                            />
                            <p className="text-xs text-gray-500">Enter your bedside bike number to link your session</p>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? "Creating Account..." : "Create Patient Account"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Provider Auth */}
              <TabsContent value="provider" className="mt-6">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="register" className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Register
                    </TabsTrigger>
                  </TabsList>

                  {/* Provider Login */}
                  <TabsContent value="login">
                    <Card>
                      <CardHeader>
                        <CardTitle>Provider Sign In</CardTitle>
                        <CardDescription>
                          Access your provider portal to manage patient care
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleLogin(new FormData(e.currentTarget));
                        }} className="space-y-4">
                          
                          <div className="space-y-2">
                            <Label htmlFor="provider-email">Email Address</Label>
                            <Input
                              id="provider-email"
                              name="email"
                              type="email"
                              required
                              placeholder="provider@hospital.com"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="provider-firstName">First Name</Label>
                              <Input
                                id="provider-firstName"
                                name="firstName"
                                required
                                placeholder="Dr. Jane"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="provider-lastName">Last Name</Label>
                              <Input
                                id="provider-lastName"
                                name="lastName"
                                required
                                placeholder="Smith"
                              />
                            </div>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? "Signing In..." : "Access Provider Portal"}
                          </Button>
                        </form>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Demo Provider:</strong> heidikissane@hospital.com
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Provider Registration */}
                  <TabsContent value="register">
                    <Card>
                      <CardHeader>
                        <CardTitle>Provider Registration</CardTitle>
                        <CardDescription>
                          Register as a healthcare provider to manage patient care
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleRegister(new FormData(e.currentTarget));
                        }} className="space-y-4">
                          
                          <div className="space-y-2">
                            <Label htmlFor="prov-reg-email">Email Address *</Label>
                            <Input
                              id="prov-reg-email"
                              name="email"
                              type="email"
                              required
                              placeholder="provider@hospital.com"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="prov-reg-firstName">First Name *</Label>
                              <Input
                                id="prov-reg-firstName"
                                name="firstName"
                                required
                                placeholder="Dr. Jane"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="prov-reg-lastName">Last Name *</Label>
                              <Input
                                id="prov-reg-lastName"
                                name="lastName"
                                required
                                placeholder="Smith"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="credentials">Credentials *</Label>
                              <Select name="credentials" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select credentials" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DPT">DPT - Doctor of Physical Therapy</SelectItem>
                                  <SelectItem value="MD">MD - Medical Doctor</SelectItem>
                                  <SelectItem value="RN">RN - Registered Nurse</SelectItem>
                                  <SelectItem value="OT">OT - Occupational Therapist</SelectItem>
                                  <SelectItem value="PT">PT - Physical Therapist</SelectItem>
                                  <SelectItem value="NP">NP - Nurse Practitioner</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="specialty">Specialty *</Label>
                              <Input
                                id="specialty"
                                name="specialty"
                                required
                                placeholder="Physical Therapy"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="licenseNumber">License Number (Optional)</Label>
                            <Input
                              id="licenseNumber"
                              name="licenseNumber"
                              placeholder="PT12345"
                            />
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? "Creating Account..." : "Create Provider Account"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


        {/* Features */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">Powered by AI-driven risk assessment technology</p>
          <div className="flex justify-center gap-6 text-xs text-gray-500">
            <span>✓ Personalized Goals</span>
            <span>✓ Real-time Analytics</span>
            <span>✓ Provider Collaboration</span>
          </div>
        </div>
      </div>
    </div>
  );
}