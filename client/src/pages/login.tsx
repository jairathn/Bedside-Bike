import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Bike, User, Stethoscope, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login form data
  const [loginData, setLoginData] = useState({
    firstName: "Neil",
    lastName: "Jairath",
    dateOfBirth: "1996-04-01",
  });

  // Registration form data
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    sex: "" as "male" | "female" | "other" | "",
    // Height in imperial (default) or metric
    heightUnit: "imperial" as "imperial" | "metric",
    heightFeet: "",
    heightInches: "",
    heightCm: "",
    // Weight in imperial (default) or metric
    weightUnit: "imperial" as "imperial" | "metric",
    weightLbs: "",
    weightKg: "",
    // Terms of Service
    tosAccepted: false,
  });

  const demoPatients = [
    {
      name: "Robert Martinez",
      firstName: "Robert",
      lastName: "Martinez",
      dob: "1955-01-01",
      description: "70yo, Hospital ICU - COPD + Parkinson's",
      type: "Hospital Patient"
    },
    {
      name: "Dorothy Chen",
      firstName: "Dorothy",
      lastName: "Chen",
      dob: "1943-01-01",
      description: "82yo, Inpatient Rehab - Hip Fracture + Diabetes",
      type: "Rehab Patient"
    },
    {
      name: "James Thompson",
      firstName: "James",
      lastName: "Thompson",
      dob: "1960-01-01",
      description: "65yo, SNF - Sepsis + CHF Recovery",
      type: "SNF Patient"
    }
  ];

  const fillDemoPatient = (patient: typeof demoPatients[0]) => {
    setLoginData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dob
    });
    setActiveTab("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      const success = await login(loginData.firstName, loginData.lastName, loginData.dateOfBirth);
      if (success) {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your account.",
        });
        setLocation("/dashboard");
      } else {
        toast({
          title: "Invalid credentials",
          description: "Please check your name and date of birth.",
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate required fields
    if (!registerData.sex) {
      toast({
        title: "Missing required field",
        description: "Please select your sex.",
        variant: "destructive",
      });
      return;
    }

    // Validate height
    if (registerData.heightUnit === "imperial") {
      if (!registerData.heightFeet) {
        toast({
          title: "Missing required field",
          description: "Please enter your height.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!registerData.heightCm) {
        toast({
          title: "Missing required field",
          description: "Please enter your height in centimeters.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate weight
    if (registerData.weightUnit === "imperial") {
      if (!registerData.weightLbs) {
        toast({
          title: "Missing required field",
          description: "Please enter your weight.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!registerData.weightKg) {
        toast({
          title: "Missing required field",
          description: "Please enter your weight in kilograms.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!registerData.tosAccepted) {
      toast({
        title: "Terms of Service required",
        description: "Please accept the Terms of Service to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare registration payload
      const payload: any = {
        userType: "patient",
        email: registerData.email || `${registerData.firstName.toLowerCase()}.${registerData.lastName.toLowerCase()}@patient.local`,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        dateOfBirth: registerData.dateOfBirth,
        sex: registerData.sex,
        heightUnit: registerData.heightUnit,
        weightUnit: registerData.weightUnit,
        tosAccepted: registerData.tosAccepted,
        tosVersion: "1.0.0",
      };

      // Add height based on unit
      if (registerData.heightUnit === "imperial") {
        payload.heightFeet = parseInt(registerData.heightFeet) || 0;
        payload.heightInches = parseInt(registerData.heightInches) || 0;
      } else {
        payload.heightCm = parseFloat(registerData.heightCm) || 0;
      }

      // Add weight based on unit
      if (registerData.weightUnit === "imperial") {
        payload.weightLbs = parseFloat(registerData.weightLbs) || 0;
      } else {
        payload.weightKg = parseFloat(registerData.weightKg) || 0;
      }

      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({
        title: "Registration successful!",
        description: "Your account has been created. Redirecting to dashboard...",
      });

      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Login/Register Form */}
          <Card className="shadow-2xl fade-in">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Bike className="text-white text-2xl" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Bedside Bike</h1>
                <p className="text-gray-600 mt-2">Patient Portal</p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="flex items-center gap-2">
                    <User size={16} />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-2">
                    <UserPlus size={16} />
                    Register
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="loginFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </Label>
                      <Input
                        id="loginFirstName"
                        type="text"
                        value={loginData.firstName}
                        onChange={(e) => setLoginData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter your first name"
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="loginLastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </Label>
                      <Input
                        id="loginLastName"
                        type="text"
                        value={loginData.lastName}
                        onChange={(e) => setLoginData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter your last name"
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="loginDateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </Label>
                      <Input
                        id="loginDateOfBirth"
                        type="text"
                        value={loginData.dateOfBirth}
                        onChange={(e) => setLoginData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        placeholder="YYYY-MM-DD"
                        className="w-full"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab("register")}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Don't have an account? Register here
                      </button>
                    </div>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="regFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </Label>
                        <Input
                          id="regFirstName"
                          type="text"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="First name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="regLastName" className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </Label>
                        <Input
                          id="regLastName"
                          type="text"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Last name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="regEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email (optional)
                      </Label>
                      <Input
                        id="regEmail"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="regDob" className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth *
                        </Label>
                        <Input
                          id="regDob"
                          type="date"
                          value={registerData.dateOfBirth}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="regSex" className="block text-sm font-medium text-gray-700 mb-1">
                          Sex *
                        </Label>
                        <Select
                          value={registerData.sex}
                          onValueChange={(value: "male" | "female" | "other") =>
                            setRegisterData(prev => ({ ...prev, sex: value }))
                          }
                        >
                          <SelectTrigger id="regSex">
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Height Section */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium text-gray-700">Height *</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRegisterData(prev => ({ ...prev, heightUnit: "imperial" }))}
                            className={`text-xs px-2 py-1 rounded ${
                              registerData.heightUnit === "imperial"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            ft/in
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterData(prev => ({ ...prev, heightUnit: "metric" }))}
                            className={`text-xs px-2 py-1 rounded ${
                              registerData.heightUnit === "metric"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            cm
                          </button>
                        </div>
                      </div>
                      {registerData.heightUnit === "imperial" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={registerData.heightFeet}
                            onChange={(e) => setRegisterData(prev => ({ ...prev, heightFeet: e.target.value }))}
                            placeholder="Feet"
                            min="3"
                            max="8"
                          />
                          <Input
                            type="number"
                            value={registerData.heightInches}
                            onChange={(e) => setRegisterData(prev => ({ ...prev, heightInches: e.target.value }))}
                            placeholder="Inches"
                            min="0"
                            max="11"
                          />
                        </div>
                      ) : (
                        <Input
                          type="number"
                          value={registerData.heightCm}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, heightCm: e.target.value }))}
                          placeholder="Height in cm (e.g., 175)"
                          min="100"
                          max="250"
                        />
                      )}
                    </div>

                    {/* Weight Section */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium text-gray-700">Weight *</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRegisterData(prev => ({ ...prev, weightUnit: "imperial" }))}
                            className={`text-xs px-2 py-1 rounded ${
                              registerData.weightUnit === "imperial"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            lbs
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterData(prev => ({ ...prev, weightUnit: "metric" }))}
                            className={`text-xs px-2 py-1 rounded ${
                              registerData.weightUnit === "metric"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            kg
                          </button>
                        </div>
                      </div>
                      {registerData.weightUnit === "imperial" ? (
                        <Input
                          type="number"
                          value={registerData.weightLbs}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, weightLbs: e.target.value }))}
                          placeholder="Weight in lbs (e.g., 160)"
                          min="50"
                          max="500"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={registerData.weightKg}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, weightKg: e.target.value }))}
                          placeholder="Weight in kg (e.g., 72)"
                          min="20"
                          max="250"
                        />
                      )}
                    </div>

                    {/* Terms of Service */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="tos"
                        checked={registerData.tosAccepted}
                        onCheckedChange={(checked) =>
                          setRegisterData(prev => ({ ...prev, tosAccepted: checked === true }))
                        }
                      />
                      <Label htmlFor="tos" className="text-sm text-gray-600 leading-tight">
                        I accept the{" "}
                        <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                        {" "}and{" "}
                        <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Already have an account? Sign in
                      </button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Demo Credentials */}
          <div className="space-y-4">
            <Card className="shadow-2xl fade-in bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-blue-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Demo Patient Accounts</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Click any patient to auto-fill login credentials
                </p>
                <div className="space-y-3">
                  {demoPatients.map((patient) => (
                    <button
                      key={patient.name}
                      type="button"
                      onClick={() => fillDemoPatient(patient)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 group-hover:text-blue-700">
                            {patient.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{patient.description}</p>
                          <p className="text-xs font-mono text-gray-400 mt-1 bg-gray-50 px-1.5 py-0.5 rounded inline-block">
                            DOB: {patient.dob}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap ml-2">
                          {patient.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl fade-in bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="text-green-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Provider Access</h2>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Email:</span> heidikissane@hospital.com
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Access provider portal for all 3 demo patients
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
