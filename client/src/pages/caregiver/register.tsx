import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const relationshipTypes = [
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "child", label: "Adult Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "friend", label: "Friend" },
  { value: "other_family", label: "Other Family Member" },
  { value: "professional_caregiver", label: "Professional Caregiver" }
];

export default function CaregiverRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    patientFirstName: "",
    patientLastName: "",
    patientDateOfBirth: "",
    relationshipType: "",
    tosAccepted: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!formData.tosAccepted) {
      toast({
        title: "Terms Required",
        description: "You must accept the Terms of Service to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register/caregiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userType: "caregiver",
          tosVersion: "1.0"
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Request Submitted!",
          description: data.message || "Your access request has been sent to the patient for approval."
        });
      } else {
        toast({
          title: "Registration Failed",
          description: data.error || "Could not complete registration. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 to-purple-700 px-4 py-8">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your access request has been sent to the patient. You'll receive a notification once they approve your request.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setLocation("/caregiver/login")}
                className="w-full bg-gradient-to-r from-rose-500 to-purple-600"
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phoneNumber: "",
                    dateOfBirth: "",
                    patientFirstName: "",
                    patientLastName: "",
                    patientDateOfBirth: "",
                    relationshipType: "",
                    tosAccepted: false
                  });
                }}
                className="w-full"
              >
                Request Access to Another Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 to-purple-700 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => setLocation("/caregiver/login")}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Login
        </button>

        <Card className="shadow-2xl">
          <CardHeader className="text-center border-b">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-rose-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
              <Heart className="text-white" size={28} />
            </div>
            <CardTitle className="text-2xl">Request Caregiver Access</CardTitle>
            <p className="text-gray-600 mt-1">
              Complete this form to request access to your loved one's recovery progress
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Your Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Your Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="dob">Your Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Patient Information</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Enter the patient's information exactly as it appears in their medical records
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patientFirstName">Patient's First Name *</Label>
                    <Input
                      id="patientFirstName"
                      value={formData.patientFirstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, patientFirstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="patientLastName">Patient's Last Name *</Label>
                    <Input
                      id="patientLastName"
                      value={formData.patientLastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, patientLastName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="patientDob">Patient's Date of Birth *</Label>
                    <Input
                      id="patientDob"
                      type="date"
                      value={formData.patientDateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, patientDateOfBirth: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Relationship */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Relationship</h3>
                <div>
                  <Label htmlFor="relationship">Relationship to Patient *</Label>
                  <Select
                    value={formData.relationshipType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, relationshipType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Terms of Service */}
              <div className="border-t pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="tos"
                    checked={formData.tosAccepted}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, tosAccepted: checked === true }))
                    }
                  />
                  <label htmlFor="tos" className="text-sm text-gray-600 cursor-pointer">
                    I agree to the{" "}
                    <a href="#" className="text-purple-600 hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>.
                    I understand that my access is subject to the patient's approval and can be revoked at any time.
                  </label>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
                disabled={isLoading || !formData.relationshipType}
              >
                {isLoading ? "Submitting..." : "Submit Access Request"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                The patient will receive a notification to approve or deny your request.
                You'll be notified via email once they respond.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
