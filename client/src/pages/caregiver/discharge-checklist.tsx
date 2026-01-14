import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Home,
  Pill,
  Calendar,
  Phone,
  AlertTriangle,
  Dumbbell,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ChecklistSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  notes?: string;
}

export default function CaregiverDischargeChecklistPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const patientId = params.patientId ? parseInt(params.patientId) : null;
  const { user, caregiverPatients } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["equipment", "home", "medications"]));

  const selectedPatient = caregiverPatients?.find(p => p.id === patientId);

  // Fetch discharge checklist
  const { data: checklist, isLoading } = useQuery({
    queryKey: ["/api/patients", patientId, "discharge-checklist"],
    queryFn: async () => {
      if (!patientId) return null;
      const res = await fetch(`/api/patients/${patientId}/discharge-checklist`);
      if (!res.ok) throw new Error("Failed to fetch checklist");
      return res.json();
    },
    enabled: !!patientId
  });

  // Mutation to update checklist
  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/patients/${patientId}/discharge-checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "discharge-checklist"] });
      toast({
        title: "Progress Saved",
        description: "Your checklist has been updated."
      });
    }
  });

  // Parse checklist data into sections
  const sections: ChecklistSection[] = checklist ? [
    {
      id: "equipment",
      title: "Equipment Needs",
      icon: Dumbbell,
      description: "Medical equipment needed at home",
      items: Object.entries(JSON.parse(checklist.equipmentNeeds || "{}")).map(([key, value]: [string, any]) => ({
        id: `equipment_${key}`,
        label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        completed: value?.acquired || false,
        notes: value?.notes
      }))
    },
    {
      id: "home",
      title: "Home Modifications",
      icon: Home,
      description: "Safety modifications for the home",
      items: Object.entries(JSON.parse(checklist.homeModifications || "{}")).map(([key, value]: [string, any]) => ({
        id: `home_${key}`,
        label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        completed: value?.installed || value?.arranged || false
      }))
    },
    {
      id: "medications",
      title: "Medication Review",
      icon: Pill,
      description: "Understanding medications and schedules",
      items: [
        {
          id: "med_reviewed",
          label: "Medications reviewed with care team",
          completed: JSON.parse(checklist.medicationReview || "{}")?.reviewed || false
        },
        {
          id: "med_pillbox",
          label: "Pillbox/organizer set up",
          completed: JSON.parse(checklist.medicationReview || "{}")?.pillbox_organized || false
        }
      ]
    },
    {
      id: "appointments",
      title: "Follow-up Appointments",
      icon: Calendar,
      description: "Scheduled post-discharge visits",
      items: (JSON.parse(checklist.followUpAppointments || "[]") as any[]).map((apt, idx) => ({
        id: `apt_${idx}`,
        label: `${apt.type} appointment`,
        completed: apt.scheduled || false,
        notes: apt.date
      }))
    },
    {
      id: "contacts",
      title: "Emergency Contacts",
      icon: Phone,
      description: "Important phone numbers documented",
      items: (JSON.parse(checklist.emergencyContacts || "[]") as any[]).map((contact, idx) => ({
        id: `contact_${idx}`,
        label: `${contact.name} (${contact.relationship})`,
        completed: true,
        notes: contact.phone
      }))
    },
    {
      id: "warning",
      title: "Warning Signs",
      icon: AlertTriangle,
      description: "Know when to call for help",
      items: [
        {
          id: "warning_911",
          label: "I know when to call 911",
          completed: (JSON.parse(checklist.warningSigns || "{}")?.call_911?.length || 0) > 0
        },
        {
          id: "warning_doctor",
          label: "I know when to call the doctor",
          completed: (JSON.parse(checklist.warningSigns || "{}")?.call_doctor?.length || 0) > 0
        }
      ]
    },
    {
      id: "exercise",
      title: "Home Exercise Plan",
      icon: Dumbbell,
      description: "Exercise routine for home",
      items: [
        {
          id: "exercise_understood",
          label: "Exercise plan explained and understood",
          completed: JSON.parse(checklist.homeExercisePlan || "{}")?.understood || false
        },
        {
          id: "exercise_equipment",
          label: "Exercise equipment available at home",
          completed: JSON.parse(checklist.homeExercisePlan || "{}")?.equipment_at_home || false
        },
        {
          id: "exercise_trained",
          label: "Caregiver trained on exercises",
          completed: JSON.parse(checklist.homeExercisePlan || "{}")?.caregiver_trained || false
        }
      ]
    }
  ] : [];

  // Calculate completion percentage
  const totalItems = sections.reduce((acc, section) => acc + section.items.length, 0);
  const completedItems = sections.reduce(
    (acc, section) => acc + section.items.filter(item => item.completed).length,
    0
  );
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  if (!user || !caregiverPatients) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-500 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => setLocation("/caregiver/dashboard")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-2"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-xl font-bold">Discharge Preparation</h1>
          <p className="text-rose-100 text-sm">
            Checklist for {selectedPatient?.firstName}'s transition home
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress Overview */}
        <Card className="mb-6 border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
              <Badge
                variant="outline"
                className={`${
                  completionPercent >= 80
                    ? "bg-green-50 text-green-700 border-green-200"
                    : completionPercent >= 50
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                {completionPercent}% Complete
              </Badge>
            </div>
            <Progress value={completionPercent} className="h-3" />
            <p className="text-sm text-gray-600 mt-2">
              {completedItems} of {totalItems} items completed
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(section => {
              const SectionIcon = section.icon;
              const sectionComplete = section.items.every(item => item.completed);
              const isExpanded = expandedSections.has(section.id);

              return (
                <Card key={section.id} className={sectionComplete ? "border-l-4 border-l-green-500" : ""}>
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          sectionComplete ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          <SectionIcon className={sectionComplete ? "text-green-600" : "text-gray-600"} size={20} />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {section.title}
                            {sectionComplete && (
                              <CheckCircle2 className="text-green-500" size={16} />
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-500">{section.description}</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3 border-t pt-4">
                        {section.items.length > 0 ? (
                          section.items.map(item => (
                            <div
                              key={item.id}
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                            >
                              <div className="mt-0.5">
                                {item.completed ? (
                                  <CheckCircle2 className="text-green-500" size={20} />
                                ) : (
                                  <Circle className="text-gray-300" size={20} />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`${item.completed ? "text-gray-600" : "text-gray-900"}`}>
                                  {item.label}
                                </p>
                                {item.notes && (
                                  <p className="text-sm text-gray-500 mt-0.5">{item.notes}</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm italic">No items in this section yet</p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <Card className="mt-6 bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-purple-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-medium text-purple-900">Need Help?</h3>
                <p className="text-sm text-purple-700 mt-1">
                  This checklist helps ensure a safe transition home. Work with the care team to address any
                  incomplete items before discharge. The social worker or case manager can help arrange
                  equipment and services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
