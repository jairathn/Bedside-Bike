import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bike, User, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "Neil",
    lastName: "Jairath",
    dateOfBirth: "1996-04-01",
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
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dob
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submission
    
    setIsLoading(true);

    try {
      const success = await login(formData.firstName, formData.lastName, formData.dateOfBirth);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Login Form */}
          <Card className="shadow-2xl fade-in">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Bike className="text-white text-2xl" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Bedside Bike</h1>
                <p className="text-gray-600 mt-2">Patient Portal</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                    className="w-full"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 pulse-glow"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>

                <div className="text-center">
                  <a href="#" className="text-sm text-blue-600 hover:underline">
                    Need help accessing your account?
                  </a>
                </div>
              </form>
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
