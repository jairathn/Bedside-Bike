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
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Heart,
  Utensils,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  label: string;
  tip?: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  items: ChecklistItem[];
}

// Standard discharge checklist - same for all patients
const STANDARD_CHECKLIST: ChecklistSection[] = [
  {
    id: "equipment",
    title: "Equipment & Supplies",
    icon: ShoppingBag,
    description: "Medical equipment and supplies needed at home",
    items: [
      { id: "eq_walker", label: "Walker or cane (if prescribed)", tip: "Make sure it's adjusted to the right height" },
      { id: "eq_wheelchair", label: "Wheelchair (if needed)", tip: "Practice folding and transporting" },
      { id: "eq_commode", label: "Bedside commode (if needed)" },
      { id: "eq_shower", label: "Shower chair or bath bench" },
      { id: "eq_reacher", label: "Reacher/grabber tool" },
      { id: "eq_pillbox", label: "Pill organizer/weekly pillbox" },
      { id: "eq_bp", label: "Blood pressure monitor (if recommended)" },
    ]
  },
  {
    id: "home_safety",
    title: "Home Safety",
    icon: Home,
    description: "Make the home safe to prevent falls",
    items: [
      { id: "home_rugs", label: "Remove or secure loose rugs and cords" },
      { id: "home_grab", label: "Install grab bars in bathroom", tip: "Near toilet and in shower/tub" },
      { id: "home_toilet", label: "Raised toilet seat (if needed)" },
      { id: "home_lighting", label: "Ensure good lighting, especially at night" },
      { id: "home_clutter", label: "Clear pathways of clutter" },
      { id: "home_stairs", label: "Plan for stairs - consider main floor living if possible" },
      { id: "home_phone", label: "Phone accessible from bed/chair" },
    ]
  },
  {
    id: "medications",
    title: "Medications",
    icon: Pill,
    description: "Understand and organize all medications",
    items: [
      { id: "med_list", label: "Have written list of all medications", tip: "Include dose, frequency, and purpose" },
      { id: "med_understand", label: "Understand what each medication is for" },
      { id: "med_schedule", label: "Know the schedule - which meds and when" },
      { id: "med_filled", label: "Prescriptions filled before discharge" },
      { id: "med_sideeffects", label: "Know common side effects to watch for" },
      { id: "med_interactions", label: "Asked about food/drug interactions" },
      { id: "med_refills", label: "Know how to get refills" },
    ]
  },
  {
    id: "followup",
    title: "Follow-up Care",
    icon: Calendar,
    description: "Appointments and ongoing care plans",
    items: [
      { id: "fu_pcp", label: "Primary care follow-up scheduled", tip: "Usually within 7-14 days" },
      { id: "fu_specialist", label: "Specialist appointments scheduled (if needed)" },
      { id: "fu_pt", label: "Physical therapy appointments scheduled (if prescribed)" },
      { id: "fu_homehealth", label: "Home health services arranged (if prescribed)" },
      { id: "fu_labs", label: "Know about any lab tests needed" },
      { id: "fu_transport", label: "Transportation planned for appointments" },
    ]
  },
  {
    id: "warning_signs",
    title: "Warning Signs",
    icon: AlertTriangle,
    description: "Know when to seek help",
    items: [
      { id: "warn_911", label: "Know when to call 911", tip: "Chest pain, difficulty breathing, stroke symptoms" },
      { id: "warn_doctor", label: "Know when to call the doctor", tip: "Fever, increasing pain, wound changes" },
      { id: "warn_written", label: "Have warning signs written down" },
      { id: "warn_numbers", label: "Emergency numbers posted visibly" },
      { id: "warn_infection", label: "Know signs of infection", tip: "Redness, swelling, fever, discharge" },
    ]
  },
  {
    id: "daily_care",
    title: "Daily Care & Activities",
    icon: Heart,
    description: "Understanding daily care needs",
    items: [
      { id: "care_bathing", label: "Understand bathing/showering assistance needed" },
      { id: "care_dressing", label: "Understand dressing assistance needed" },
      { id: "care_mobility", label: "Know safe transfer and mobility techniques" },
      { id: "care_exercise", label: "Understand home exercise program", tip: "Ask PT to demonstrate" },
      { id: "care_rest", label: "Know activity restrictions and rest needs" },
      { id: "care_wound", label: "Understand wound care (if applicable)" },
    ]
  },
  {
    id: "nutrition",
    title: "Nutrition & Diet",
    icon: Utensils,
    description: "Dietary needs and restrictions",
    items: [
      { id: "nutr_restrictions", label: "Understand any dietary restrictions" },
      { id: "nutr_fluids", label: "Know fluid intake recommendations" },
      { id: "nutr_meals", label: "Plan for meal preparation" },
      { id: "nutr_swallow", label: "Understand any swallowing precautions" },
    ]
  },
  {
    id: "emergency",
    title: "Emergency Preparedness",
    icon: Shield,
    description: "Be ready for emergencies",
    items: [
      { id: "emerg_contacts", label: "Emergency contact list completed" },
      { id: "emerg_medlist", label: "Medication list in wallet/purse" },
      { id: "emerg_allergies", label: "Allergies documented and accessible" },
      { id: "emerg_insurance", label: "Insurance cards accessible" },
      { id: "emerg_advance", label: "Advance directives discussed (if appropriate)" },
    ]
  }
];

export default function CaregiverDischargeChecklistPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const patientId = params.patientId ? parseInt(params.patientId) : null;
  const { user, caregiverPatients } = useAuth();
  const { toast } = useToast();

  // Track completed items in localStorage per patient
  const storageKey = `discharge-checklist-${patientId}`;
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["equipment", "home_safety", "medications"])
  );

  const selectedPatient = caregiverPatients?.find(p => p.id === patientId);

  // Load saved progress from localStorage
  useEffect(() => {
    if (patientId) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setCompletedItems(new Set(JSON.parse(saved)));
        } catch (e) {
          console.error("Error loading checklist progress:", e);
        }
      }
    }
  }, [patientId, storageKey]);

  // Save progress to localStorage
  const saveProgress = (items: Set<string>) => {
    localStorage.setItem(storageKey, JSON.stringify([...items]));
  };

  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      saveProgress(newSet);
      return newSet;
    });
  };

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

  // Calculate completion stats
  const totalItems = STANDARD_CHECKLIST.reduce((acc, section) => acc + section.items.length, 0);
  const completedCount = completedItems.size;
  const completionPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

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
          <h1 className="text-xl font-bold">Discharge Preparation Checklist</h1>
          <p className="text-rose-100 text-sm">
            Preparing for {selectedPatient?.firstName}'s transition home
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress Overview */}
        <Card className="mb-6 border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
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
              {completedCount} of {totalItems} items checked
            </p>
          </CardContent>
        </Card>

        {/* Intro Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Use this checklist</strong> to make sure you're ready for your loved one's return home.
              Check off items as you complete them. Your progress is saved automatically.
            </p>
          </CardContent>
        </Card>

        {/* Checklist Sections */}
        <div className="space-y-4">
          {STANDARD_CHECKLIST.map(section => {
            const SectionIcon = section.icon;
            const sectionItemIds = section.items.map(i => i.id);
            const sectionCompleted = sectionItemIds.filter(id => completedItems.has(id)).length;
            const sectionTotal = section.items.length;
            const allComplete = sectionCompleted === sectionTotal;
            const isExpanded = expandedSections.has(section.id);

            return (
              <Card key={section.id} className={allComplete ? "border-l-4 border-l-green-500" : ""}>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${allComplete ? "bg-green-100" : "bg-gray-100"}`}>
                        <SectionIcon className={allComplete ? "text-green-600" : "text-gray-600"} size={20} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {section.title}
                          {allComplete && <CheckCircle2 className="text-green-500" size={16} />}
                        </CardTitle>
                        <p className="text-sm text-gray-500">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{sectionCompleted}/{sectionTotal}</span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-1 border-t pt-4">
                      {section.items.map(item => {
                        const isChecked = completedItems.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isChecked ? "bg-green-50" : "hover:bg-gray-50"
                            }`}
                            onClick={() => toggleItem(item.id)}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className={`${isChecked ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                {item.label}
                              </p>
                              {item.tip && (
                                <p className="text-xs text-gray-500 mt-0.5">{item.tip}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Help Card */}
        <Card className="mt-6 bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-purple-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-medium text-purple-900">Questions?</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Don't hesitate to ask the care team about any items on this list. The nurse, case manager,
                  or social worker can help arrange equipment, services, and answer questions about
                  caring for your loved one at home.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500"
            onClick={() => {
              if (confirm("Reset all checklist progress? This cannot be undone.")) {
                setCompletedItems(new Set());
                localStorage.removeItem(storageKey);
                toast({
                  title: "Checklist Reset",
                  description: "All items have been unchecked."
                });
              }
            }}
          >
            Reset Checklist
          </Button>
        </div>
      </main>
    </div>
  );
}
