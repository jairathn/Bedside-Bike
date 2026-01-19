import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Home,
  Pill,
  Calendar,
  Phone,
  AlertTriangle,
  Dumbbell,
  Utensils,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Shield,
  Lightbulb
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Discharge checklist sections
const checklistSections = [
  {
    id: "equipment",
    title: "Equipment & Supplies",
    icon: Package,
    color: "blue",
    items: [
      { id: "walker", label: "Walker/cane arranged", tip: "Make sure it's the right height for you" },
      { id: "wheelchair", label: "Wheelchair (if needed)", tip: "Practice using it before discharge" },
      { id: "commode", label: "Bedside commode (if needed)", tip: "Place near your bed for nighttime use" },
      { id: "shower_chair", label: "Shower chair/bath bench", tip: "Essential for safe bathing" },
      { id: "reacher", label: "Reacher/grabber tool", tip: "Helps pick up items without bending" },
      { id: "pillbox", label: "Pill organizer", tip: "Weekly organizers help with medication schedule" },
      { id: "bp_monitor", label: "Blood pressure monitor", tip: "Ask your provider how often to check" },
    ]
  },
  {
    id: "home_safety",
    title: "Home Safety",
    icon: Home,
    color: "green",
    items: [
      { id: "rugs_removed", label: "Remove or secure loose rugs", tip: "Major fall hazard - tape down or remove" },
      { id: "grab_bars", label: "Grab bars in bathroom", tip: "Install near toilet and in shower" },
      { id: "raised_toilet", label: "Raised toilet seat", tip: "Makes sitting down and standing easier" },
      { id: "good_lighting", label: "Good lighting throughout home", tip: "Night lights in hallways and bathrooms" },
      { id: "clear_pathways", label: "Clear pathways (no clutter)", tip: "Wide enough for walker if using one" },
      { id: "stair_plan", label: "Plan for stairs (if applicable)", tip: "Consider sleeping on main floor initially" },
      { id: "phone_accessible", label: "Phone within reach", tip: "Keep a phone in each main room" },
    ]
  },
  {
    id: "medications",
    title: "Medications",
    icon: Pill,
    color: "purple",
    items: [
      { id: "med_list", label: "Written medication list", tip: "Include name, dose, timing, and purpose" },
      { id: "understand_meds", label: "Understand what each medication does", tip: "Ask your pharmacist if unsure" },
      { id: "pharmacy_confirmed", label: "Pharmacy has prescriptions", tip: "Call ahead to confirm they're ready" },
      { id: "med_storage", label: "Proper medication storage", tip: "Some need refrigeration - check labels" },
    ]
  },
  {
    id: "appointments",
    title: "Follow-up Appointments",
    icon: Calendar,
    color: "orange",
    items: [
      { id: "pt_scheduled", label: "Physical therapy scheduled", tip: "Usually starts within 1-2 weeks of discharge" },
      { id: "ot_scheduled", label: "Occupational therapy scheduled", tip: "Helps with daily activities" },
      { id: "pcp_scheduled", label: "Primary care follow-up scheduled", tip: "Within 1-2 weeks is typical" },
    ]
  },
  {
    id: "emergency",
    title: "Emergency Contacts",
    icon: Phone,
    color: "red",
    items: [
      { id: "emergency_name", label: "Emergency contact name written down", tip: "Someone who can come quickly if needed" },
      { id: "emergency_phone", label: "Emergency contact phone number", tip: "Keep posted near your phone" },
      { id: "doctor_number", label: "Doctor's office number", tip: "For non-emergency questions" },
    ]
  },
  {
    id: "warning_signs",
    title: "Warning Signs to Watch",
    icon: AlertTriangle,
    color: "yellow",
    items: [
      { id: "fall_risk", label: "Know fall risk warning signs", tip: "Dizziness, weakness, confusion" },
      { id: "infection_signs", label: "Know signs of infection", tip: "Fever, redness, swelling, increased pain" },
      { id: "bleeding_signs", label: "Know when to call doctor", tip: "Unusual bleeding, severe pain, difficulty breathing" },
    ]
  },
  {
    id: "exercise",
    title: "Home Exercise Plan",
    icon: Dumbbell,
    color: "teal",
    items: [
      { id: "exercise_written", label: "Written exercise instructions", tip: "Ask PT for pictures/videos if helpful" },
      { id: "exercise_frequency", label: "Know how often to exercise", tip: "Typically 2-3 times daily for short sessions" },
      { id: "exercise_difficulty", label: "Know when exercises are too hard", tip: "Should be challenging but not painful" },
    ]
  },
  {
    id: "diet",
    title: "Diet & Nutrition",
    icon: Utensils,
    color: "pink",
    items: [
      { id: "diet_restrictions", label: "Understand any diet restrictions", tip: "Low salt, diabetic, etc." },
      { id: "food_drug_interactions", label: "Know food-drug interactions", tip: "e.g., grapefruit with certain medications" },
    ]
  },
];

export default function PatientDischargeChecklistPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["equipment", "home_safety"]));
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  // Fetch existing checklist
  const { data: checklist, isLoading } = useQuery({
    queryKey: [`/api/patients/${user?.id}/discharge-checklist`],
    enabled: !!user?.id,
  });

  // Initialize checked items from server data
  useEffect(() => {
    if (checklist?.items) {
      const items: Record<string, boolean> = {};
      Object.entries(checklist.items as Record<string, any>).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          items[key] = (value as any).completed || false;
        } else {
          items[key] = Boolean(value);
        }
      });
      setCheckedItems(items);
    }
  }, [checklist]);

  // Save checklist mutation
  const saveChecklistMutation = useMutation({
    mutationFn: async (items: Record<string, boolean>) => {
      const formattedItems: Record<string, any> = {};
      Object.entries(items).forEach(([key, completed]) => {
        formattedItems[key] = {
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        };
      });

      if (checklist?.id) {
        return await apiRequest(`/api/discharge-checklists/${checklist.id}`, {
          method: "PATCH",
          body: JSON.stringify({ items: formattedItems }),
        });
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${user?.id}/discharge-checklist`] });
    },
  });

  const toggleItem = (itemId: string) => {
    const newCheckedItems = { ...checkedItems, [itemId]: !checkedItems[itemId] };
    setCheckedItems(newCheckedItems);
    saveChecklistMutation.mutate(newCheckedItems);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Calculate progress
  const totalItems = checklistSections.reduce((sum, section) => sum + section.items.length, 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getColorClasses = (color: string, isExpanded: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", hover: "hover:bg-blue-100" },
      green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", hover: "hover:bg-green-100" },
      purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", hover: "hover:bg-purple-100" },
      orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", hover: "hover:bg-orange-100" },
      red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", hover: "hover:bg-red-100" },
      yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", hover: "hover:bg-yellow-100" },
      teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", hover: "hover:bg-teal-100" },
      pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", hover: "hover:bg-pink-100" },
    };
    return colors[color] || colors.blue;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to continue.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Before Discharge</h1>
                <p className="text-sm text-gray-600">Prepare for a safe transition home</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Progress Card */}
        <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Discharge Readiness</h2>
                <p className="text-green-100">Track your preparation for going home</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{progressPercent}%</div>
                <div className="text-green-100 text-sm">{completedItems} of {totalItems} items</div>
              </div>
            </div>
            <Progress value={progressPercent} className="h-3 bg-white/20" />
            {progressPercent === 100 && (
              <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Excellent! You're well prepared for discharge.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Taking Charge of Your Recovery</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Going through this checklist helps ensure you have everything you need for a safe and successful recovery at home.
                  Check off items as you prepare them - your progress is saved automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Sections */}
        {checklistSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.id);
          const colorClasses = getColorClasses(section.color, isExpanded);
          const sectionCompleted = section.items.filter(item => checkedItems[item.id]).length;
          const sectionTotal = section.items.length;
          const sectionPercent = Math.round((sectionCompleted / sectionTotal) * 100);

          return (
            <Card key={section.id} className={`border-2 ${colorClasses.border} overflow-hidden`}>
              <button
                className={`w-full p-4 flex items-center justify-between ${colorClasses.bg} ${colorClasses.hover} transition-colors`}
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                    <Icon className={`w-5 h-5 ${colorClasses.text}`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${colorClasses.text}`}>{section.title}</h3>
                    <p className="text-sm text-gray-600">{sectionCompleted} of {sectionTotal} completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sectionPercent === 100 && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="p-4 space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-all ${
                        checkedItems[item.id]
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={checkedItems[item.id] || false}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={item.id}
                            className={`cursor-pointer font-medium ${
                              checkedItems[item.id] ? "text-green-700 line-through" : "text-gray-900"
                            }`}
                          >
                            {item.label}
                          </Label>
                          {item.tip && (
                            <p className="text-sm text-gray-500 mt-1">
                              <span className="text-blue-600">Tip:</span> {item.tip}
                            </p>
                          )}
                        </div>
                        {checkedItems[item.id] && (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Bottom padding for better scrolling */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
