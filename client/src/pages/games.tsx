import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TreePine, Waves, Mountain, TrendingUp, Play, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import StartSessionModal from "@/components/StartSessionModal";
import { useSessionTimer, SessionGame } from "@/contexts/SessionTimerContext";

interface RideOption {
  id: SessionGame;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  bgGradient: string;
  borderColor: string;
  features: string[];
}

const rideOptions: RideOption[] = [
  {
    id: 'scenic-forest',
    title: 'Forest Path',
    description: 'Peaceful woodland scenery',
    longDescription: 'Immerse yourself in the tranquil beauty of an ancient forest. Watch sunlight filter through towering trees as you pedal along a peaceful woodland path.',
    icon: <TreePine className="w-8 h-8 text-green-600" />,
    bgGradient: 'bg-gradient-to-br from-green-50 to-emerald-100',
    borderColor: 'border-green-200 hover:border-green-400',
    features: ['Calming nature sounds', 'Gentle, steady pace', 'Perfect for relaxation'],
  },
  {
    id: 'scenic-beach',
    title: 'Beach Cruise',
    description: 'Calming ocean views',
    longDescription: 'Experience the serenity of a coastal ride. Feel the virtual ocean breeze as you cycle along beautiful sandy shores with waves gently lapping nearby.',
    icon: <Waves className="w-8 h-8 text-blue-500" />,
    bgGradient: 'bg-gradient-to-br from-blue-50 to-cyan-100',
    borderColor: 'border-blue-200 hover:border-blue-400',
    features: ['Ocean wave sounds', 'Smooth terrain', 'Soothing atmosphere'],
  },
  {
    id: 'scenic-mountains',
    title: 'Mountain Vista',
    description: 'Majestic peak panoramas',
    longDescription: 'Take in breathtaking mountain views as you ride through alpine meadows. Enjoy crisp mountain air and spectacular vistas of snow-capped peaks.',
    icon: <Mountain className="w-8 h-8 text-slate-600" />,
    bgGradient: 'bg-gradient-to-br from-slate-50 to-gray-100',
    borderColor: 'border-slate-200 hover:border-slate-400',
    features: ['Stunning landscapes', 'Fresh mountain air feel', 'Inspiring views'],
  },
  {
    id: 'hill-ride',
    title: 'Hill Ride',
    description: 'Gentle interval training',
    longDescription: 'Experience gentle hills that automatically adjust your resistance. The bike will increase resistance by 1 level during uphill sections, then return to your baseline on flat terrain. This provides effective interval training without excessive strain.',
    icon: <TrendingUp className="w-8 h-8 text-orange-500" />,
    bgGradient: 'bg-gradient-to-br from-orange-50 to-amber-100',
    borderColor: 'border-orange-200 hover:border-orange-400',
    features: ['Auto-adjusting resistance', 'Max +1 level increase', '45s flat, 30s uphill intervals'],
  },
];

export default function GamesPage() {
  const [, setLocation] = useLocation();
  const { patient, user } = useAuth();
  const currentPatient = patient || user;
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState<SessionGame>('none');
  const [expandedCard, setExpandedCard] = useState<SessionGame | null>(null);
  const { state: sessionState } = useSessionTimer();

  const handleStartRide = (rideId: SessionGame) => {
    setSelectedRide(rideId);
    setShowStartModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mr-2 sm:mr-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Exercise Experiences</h1>
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, {currentPatient?.firstName}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Active Session Warning */}
        {sessionState.isActive && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-blue-800">
                  <Info className="w-5 h-5 mr-2" />
                  <span className="font-medium">You have an active session running</span>
                </div>
                <Badge className="bg-blue-600">In Progress</Badge>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                End your current session before starting a new ride.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Introduction */}
        <Card className="mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Make Exercise Enjoyable
            </h2>
            <p className="text-gray-600 mb-4">
              Choose a scenic ride or interval training experience. Each ride starts a timed session
              that tracks your exercise automatically.
            </p>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <p className="text-sm text-green-800">
                <strong>Safe & Gentle:</strong> These experiences are designed for recovery.
                There are no games that encourage going faster or pushing too hard.
                The Hill Ride only increases resistance by 1 level maximum.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ride Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {rideOptions.map((ride) => (
            <Card
              key={ride.id}
              className={`${ride.bgGradient} border-2 ${ride.borderColor} transition-all duration-200 ${
                expandedCard === ride.id ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 sm:mr-4">
                      {ride.icon}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">{ride.title}</h3>
                      <p className="text-sm text-gray-600">{ride.description}</p>
                    </div>
                  </div>
                </div>

                {/* Expandable details */}
                <div className="mb-4">
                  <button
                    onClick={() => setExpandedCard(expandedCard === ride.id ? null : ride.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {expandedCard === ride.id ? 'Show less' : 'Learn more'}
                    <svg
                      className={`w-4 h-4 ml-1 transition-transform ${expandedCard === ride.id ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedCard === ride.id && (
                    <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                      <p className="text-sm text-gray-700">{ride.longDescription}</p>
                      <div className="space-y-1">
                        {ride.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleStartRide(ride.id)}
                  disabled={sessionState.isActive}
                  className="w-full"
                  variant={ride.id === 'hill-ride' ? 'default' : 'outline'}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {sessionState.isActive ? 'Session Active' : `Start ${ride.title}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <Card className="mt-6 sm:mt-8">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>Choose a ride experience and set your resistance level</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>A timer banner appears at the top of your screen</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>Pause anytime if you need a break, then continue when ready</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                  4
                </div>
                <p>End your session when done - it's automatically saved to your progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Start Session Modal */}
      <StartSessionModal
        open={showStartModal}
        onOpenChange={setShowStartModal}
        defaultGame={selectedRide}
      />
    </div>
  );
}
