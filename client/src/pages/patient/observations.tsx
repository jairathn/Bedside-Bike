import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Smile, Meh, Frown, Angry, Heart, Zap, Moon, Utensils, Activity, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const moodOptions = [
  { value: "great", label: "Great", icon: Smile, color: "text-green-500 bg-green-50 border-green-200" },
  { value: "good", label: "Good", icon: Smile, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { value: "fair", label: "Fair", icon: Meh, color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
  { value: "poor", label: "Poor", icon: Frown, color: "text-red-500 bg-red-50 border-red-200" },
];

const energyOptions = [
  { value: "high", label: "High Energy", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "medium", label: "Medium", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "low", label: "Low Energy", color: "text-red-600 bg-red-50 border-red-200" },
];

const simpleOptions = [
  { value: "good", label: "Good", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "fair", label: "Fair", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "poor", label: "Poor", color: "text-red-600 bg-red-50 border-red-200" },
];

export default function PatientObservationsPage() {
  const [, setLocation] = useLocation();
  const { user, patient } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For caregivers, use the selected patient; for patients, use their own ID
  const targetPatientId = user?.userType === 'caregiver' ? patient?.id : user?.id;

  const [showFullForm, setShowFullForm] = useState(true);
  const [formData, setFormData] = useState({
    moodLevel: "" as string,
    painLevel: 0,
    energyLevel: "" as string,
    appetite: "" as string,
    sleepQuality: "" as string,
    mobilityObservations: "",
    notes: "",
    concerns: "",
    questionsForProvider: "",
  });

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch existing observations for today
  const { data: existingObservations = [] } = useQuery({
    queryKey: [`/api/patients/${targetPatientId}/observations`, { date: today }],
    enabled: !!targetPatientId,
  });

  const submitObservation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest(`/api/patients/${targetPatientId}/observations`, {
        method: "POST",
        body: JSON.stringify({
          patientId: targetPatientId,
          observationDate: today,
          ...data,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Observation Logged",
        description: "Your observation has been saved and shared with your care team.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${targetPatientId}/observations`] });
      // Reset form
      setFormData({
        moodLevel: "",
        painLevel: 0,
        energyLevel: "",
        appetite: "",
        sleepQuality: "",
        mobilityObservations: "",
        notes: "",
        concerns: "",
        questionsForProvider: "",
      });
      setShowFullForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save observation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Validate at least one field is filled
    const hasData = formData.moodLevel || formData.painLevel > 0 || formData.energyLevel ||
      formData.appetite || formData.sleepQuality || formData.mobilityObservations ||
      formData.notes || formData.concerns || formData.questionsForProvider;

    if (!hasData) {
      toast({
        title: "Please fill in at least one field",
        description: "Add some information about how you're feeling today.",
        variant: "destructive",
      });
      return;
    }

    submitObservation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to continue.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Log Your Observations</h1>
                <p className="text-sm text-gray-600">Help your care team understand how you're feeling</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Why Log Observations?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Your observations help your care team understand how you're doing between visits.
                  This information is valuable for tracking your progress and adjusting your care plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle Form */}
        <Button
          variant="outline"
          className="w-full flex justify-between items-center py-6"
          onClick={() => setShowFullForm(!showFullForm)}
        >
          <span className="font-semibold">
            {showFullForm ? "Hide Observation Form" : "Log New Observation"}
          </span>
          {showFullForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>

        {showFullForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                How Are You Feeling Today?
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mood Level */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-gray-500" />
                  Overall Mood
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {moodOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, moodLevel: option.value })}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          formData.moodLevel === option.value
                            ? option.color + " border-current"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Level */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                  Pain Level (0-10)
                </Label>
                <div className="px-2">
                  <Slider
                    value={[formData.painLevel]}
                    onValueChange={(value) => setFormData({ ...formData, painLevel: value[0] })}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>No Pain (0)</span>
                    <span className="font-bold text-lg text-blue-600">{formData.painLevel}</span>
                    <span>Severe (10)</span>
                  </div>
                </div>
              </div>

              {/* Energy Level */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-500" />
                  Energy Level
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {energyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, energyLevel: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.energyLevel === option.value
                          ? option.color + " border-current"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Appetite */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-gray-500" />
                  Appetite
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {simpleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, appetite: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.appetite === option.value
                          ? option.color + " border-current"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep Quality */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-gray-500" />
                  Sleep Quality (Last Night)
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {simpleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, sleepQuality: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.sleepQuality === option.value
                          ? option.color + " border-current"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobility Observations */}
              <div className="space-y-2">
                <Label htmlFor="mobility" className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  Mobility Notes
                </Label>
                <Textarea
                  id="mobility"
                  placeholder="How has your movement been today? Any changes from yesterday?"
                  value={formData.mobilityObservations}
                  onChange={(e) => setFormData({ ...formData, mobilityObservations: e.target.value })}
                  rows={2}
                />
              </div>

              {/* General Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Anything else you'd like to share about how you're feeling?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Concerns */}
              <div className="space-y-2">
                <Label htmlFor="concerns" className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-4 h-4" />
                  Any Concerns?
                </Label>
                <Textarea
                  id="concerns"
                  placeholder="Any health concerns you want your care team to know about?"
                  value={formData.concerns}
                  onChange={(e) => setFormData({ ...formData, concerns: e.target.value })}
                  rows={2}
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>

              {/* Questions for Provider */}
              <div className="space-y-2">
                <Label htmlFor="questions" className="flex items-center gap-2 text-blue-700">
                  <HelpCircle className="w-4 h-4" />
                  Questions for Your Care Team
                </Label>
                <Textarea
                  id="questions"
                  placeholder="Any questions you'd like to ask your healthcare provider?"
                  value={formData.questionsForProvider}
                  onChange={(e) => setFormData({ ...formData, questionsForProvider: e.target.value })}
                  rows={2}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
                onClick={handleSubmit}
                disabled={submitObservation.isPending}
              >
                {submitObservation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Save Observation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Observations */}
        {existingObservations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Observations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {existingObservations.slice(0, 5).map((obs: any, index: number) => (
                  <div key={obs.id || index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        {obs.moodLevel && <span className="mr-2">Mood: {obs.moodLevel}</span>}
                        {obs.painLevel !== null && <span className="mr-2">Pain: {obs.painLevel}/10</span>}
                        {obs.energyLevel && <span>Energy: {obs.energyLevel}</span>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(obs.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {obs.notes && <p className="text-sm text-gray-600 mt-1">{obs.notes}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
