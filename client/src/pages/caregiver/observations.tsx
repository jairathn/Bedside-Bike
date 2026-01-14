import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Activity,
  Moon,
  Utensils,
  Brain,
  Copy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const moodOptions = [
  { value: "great", label: "Great", icon: Smile, color: "text-green-500" },
  { value: "good", label: "Good", icon: Smile, color: "text-blue-500" },
  { value: "fair", label: "Fair", icon: Meh, color: "text-yellow-500" },
  { value: "poor", label: "Poor", icon: Frown, color: "text-red-500" }
];

const energyOptions = [
  { value: "high", label: "High Energy" },
  { value: "medium", label: "Moderate" },
  { value: "low", label: "Low Energy" }
];

const appetiteOptions = [
  { value: "good", label: "Good Appetite" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor Appetite" }
];

const sleepOptions = [
  { value: "good", label: "Slept Well" },
  { value: "fair", label: "Fair Sleep" },
  { value: "poor", label: "Poor Sleep" }
];

export default function CaregiverObservationsPage() {
  const [, setLocation] = useLocation();
  const { user, caregiverPatients } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [showFullForm, setShowFullForm] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    observationDate: new Date().toISOString().split('T')[0],
    moodLevel: "",
    painLevel: 0,
    energyLevel: "",
    appetite: "",
    sleepQuality: "",
    mobilityObservations: "",
    notes: "",
    concerns: "",
    questionsForProvider: ""
  });

  // Set default selected patient
  useEffect(() => {
    if (caregiverPatients && caregiverPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(caregiverPatients[0].id);
    }
  }, [caregiverPatients, selectedPatientId]);

  const selectedPatient = caregiverPatients?.find(p => p.id === selectedPatientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !selectedPatientId || !user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/caregivers/${user.id}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          patientId: selectedPatientId,
          painLevel: formData.painLevel || null,
          moodLevel: formData.moodLevel || null,
          energyLevel: formData.energyLevel || null,
          appetite: formData.appetite || null,
          sleepQuality: formData.sleepQuality || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        if (data.aiSummary) {
          setAiSummary(data.aiSummary);
        }
        toast({
          title: "Observation Logged!",
          description: "Thank you for your valuable input."
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save observation.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiSummary) {
      navigator.clipboard.writeText(aiSummary);
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard."
      });
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setAiSummary(null);
    setFormData({
      observationDate: new Date().toISOString().split('T')[0],
      moodLevel: "",
      painLevel: 0,
      energyLevel: "",
      appetite: "",
      sleepQuality: "",
      mobilityObservations: "",
      notes: "",
      concerns: "",
      questionsForProvider: ""
    });
  };

  if (!user || !caregiverPatients) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="text-green-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Observation Saved!</h2>
                <p className="text-gray-600 mt-2">
                  Your observation for {selectedPatient?.firstName} has been recorded.
                </p>
              </div>

              {aiSummary && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                      <Brain size={18} />
                      AI-Generated Summary for Provider
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Copy size={16} className="mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
                  <p className="text-xs text-purple-600 mt-2 italic">
                    You can copy this summary to share with the care team
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setLocation("/caregiver/dashboard")}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600"
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Log Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-500 to-purple-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => setLocation("/caregiver/dashboard")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-2"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-xl font-bold">Daily Observation</h1>
          <p className="text-rose-100 text-sm">
            Log how {selectedPatient?.firstName || "your loved one"} is doing today
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Patient Selector */}
        {caregiverPatients.length > 1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <Label>Logging observation for:</Label>
              <Select
                value={selectedPatientId?.toString()}
                onValueChange={(value) => setSelectedPatientId(parseInt(value))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caregiverPatients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          {/* Quick Status */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mood */}
              <div>
                <Label className="mb-3 block">Overall Mood Today</Label>
                <div className="grid grid-cols-4 gap-2">
                  {moodOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, moodLevel: option.value }))}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          formData.moodLevel === option.value
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon className={`mx-auto mb-1 ${option.color}`} size={24} />
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Level */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Pain Level</Label>
                  <span className="text-sm font-medium text-gray-600">
                    {formData.painLevel}/10
                  </span>
                </div>
                <Slider
                  value={[formData.painLevel]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, painLevel: value }))}
                  max={10}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>No Pain</span>
                  <span>Severe</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expandable Details */}
          <Card className="mb-4">
            <CardHeader
              className="cursor-pointer"
              onClick={() => setShowFullForm(!showFullForm)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Additional Details</CardTitle>
                {showFullForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </CardHeader>

            {showFullForm && (
              <CardContent className="space-y-6 pt-0">
                {/* Energy, Sleep, Appetite Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      <Activity size={16} className="text-green-500" />
                      Energy Level
                    </Label>
                    <Select
                      value={formData.energyLevel}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, energyLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {energyOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      <Moon size={16} className="text-blue-500" />
                      Sleep Quality
                    </Label>
                    <Select
                      value={formData.sleepQuality}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sleepQuality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sleepOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      <Utensils size={16} className="text-orange-500" />
                      Appetite
                    </Label>
                    <Select
                      value={formData.appetite}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, appetite: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {appetiteOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mobility Observations */}
                <div>
                  <Label htmlFor="mobility">Mobility Observations</Label>
                  <Textarea
                    id="mobility"
                    value={formData.mobilityObservations}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobilityObservations: e.target.value }))}
                    placeholder="How did they move today? Any improvements or difficulties with walking, transfers, etc.?"
                    className="mt-2"
                    rows={2}
                  />
                </div>

                {/* General Notes */}
                <div>
                  <Label htmlFor="notes">General Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any other observations about their day..."
                    className="mt-2"
                    rows={2}
                  />
                </div>

                {/* Concerns */}
                <div>
                  <Label htmlFor="concerns" className="flex items-center gap-1">
                    <AlertTriangle size={16} className="text-yellow-500" />
                    Concerns
                  </Label>
                  <Textarea
                    id="concerns"
                    value={formData.concerns}
                    onChange={(e) => setFormData(prev => ({ ...prev, concerns: e.target.value }))}
                    placeholder="Any worries or things that seem different?"
                    className="mt-2"
                    rows={2}
                  />
                </div>

                {/* Questions for Provider */}
                <div>
                  <Label htmlFor="questions">Questions for the Care Team</Label>
                  <Textarea
                    id="questions"
                    value={formData.questionsForProvider}
                    onChange={(e) => setFormData(prev => ({ ...prev, questionsForProvider: e.target.value }))}
                    placeholder="Any questions you'd like to ask the doctors or nurses?"
                    className="mt-2"
                    rows={2}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Observation"}
          </Button>
        </form>
      </main>
    </div>
  );
}
