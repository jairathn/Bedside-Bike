import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Mountain, TreePine, Waves, Bike, Footprints, Armchair, AlertTriangle, ArrowLeft } from "lucide-react";
import { useSessionTimer, SessionGame, ActivityType, AssistanceLevel } from "@/contexts/SessionTimerContext";

interface StartSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGame?: SessionGame;
  defaultActivityType?: ActivityType;
}

type ModalStep = 'activity' | 'walk-safety' | 'walk-assistance' | 'ride-options' | 'sit-confirm';

const activityOptions: { id: ActivityType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'ride',
    label: 'Ride',
    description: 'Cycling on the Bedside Bike',
    icon: <Bike className="w-8 h-8 text-blue-600" />,
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  },
  {
    id: 'walk',
    label: 'Walk',
    description: 'Walking with assistance',
    icon: <Footprints className="w-8 h-8 text-green-600" />,
    color: 'bg-green-50 border-green-200 hover:border-green-400',
  },
  {
    id: 'sit',
    label: 'Chair',
    description: 'Sitting out of bed in a chair',
    icon: <Armchair className="w-8 h-8 text-purple-600" />,
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  },
];

const gameOptions: { id: SessionGame; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'none',
    label: 'Free Ride',
    description: 'Simple timer with no visuals',
    icon: <Bike className="w-6 h-6" />,
    color: 'bg-gray-100 border-gray-300 hover:border-gray-400',
  },
  {
    id: 'scenic-forest',
    label: 'Forest Path',
    description: 'Peaceful woodland scenery',
    icon: <TreePine className="w-6 h-6 text-green-600" />,
    color: 'bg-green-50 border-green-200 hover:border-green-400',
  },
  {
    id: 'scenic-beach',
    label: 'Beach Cruise',
    description: 'Calming ocean views',
    icon: <Waves className="w-6 h-6 text-blue-500" />,
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  },
  {
    id: 'scenic-mountains',
    label: 'Mountain Vista',
    description: 'Majestic peak panoramas',
    icon: <Mountain className="w-6 h-6 text-slate-600" />,
    color: 'bg-slate-50 border-slate-200 hover:border-slate-400',
  },
  {
    id: 'hill-ride',
    label: 'Hill Ride',
    description: 'Interval training with varying resistance',
    icon: <Mountain className="w-6 h-6 text-orange-500" />,
    color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  },
];

export default function StartSessionModal({ open, onOpenChange, defaultGame = 'none', defaultActivityType = 'ride' }: StartSessionModalProps) {
  const [step, setStep] = useState<ModalStep>('activity');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(defaultActivityType);
  const [resistance, setResistance] = useState(3);
  const [selectedGame, setSelectedGame] = useState<SessionGame>(defaultGame);
  const [assistanceLevel, setAssistanceLevel] = useState<AssistanceLevel>('assisted');
  const [fallWarningAccepted, setFallWarningAccepted] = useState(false);
  const { startSession, state } = useSessionTimer();

  // Reset state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStep('activity');
      setSelectedActivity(defaultActivityType);
      setResistance(3);
      setSelectedGame(defaultGame);
      setAssistanceLevel('assisted');
      setFallWarningAccepted(false);
    }
    onOpenChange(isOpen);
  };

  // Don't allow starting a new session if one is active
  if (state.isActive) {
    return null;
  }

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
    switch (activity) {
      case 'ride':
        setStep('ride-options');
        break;
      case 'walk':
        setStep('walk-safety');
        break;
      case 'sit':
        setStep('sit-confirm');
        break;
    }
  };

  const handleStart = () => {
    startSession({
      activityType: selectedActivity,
      resistance: selectedActivity === 'ride' ? resistance : undefined,
      assistanceLevel: selectedActivity === 'walk' ? assistanceLevel : undefined,
      game: selectedActivity === 'ride' ? selectedGame : 'none',
    });
    handleOpenChange(false);
  };

  const handleBack = () => {
    setStep('activity');
    setFallWarningAccepted(false);
  };

  const resistanceDescriptions: Record<number, string> = {
    1: 'Very light - Minimal effort',
    2: 'Light - Easy pedaling',
    3: 'Light-moderate - Comfortable',
    4: 'Moderate - Some effort',
    5: 'Moderate - Steady workout',
    6: 'Moderate-hard - Challenging',
    7: 'Hard - Significant effort',
    8: 'Hard - Heavy pedaling',
    9: 'Very hard - Maximum effort',
    10: 'Maximum - All-out effort',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Activity Selection Step */}
        {step === 'activity' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-2xl">
                <Play className="w-6 h-6 mr-2 text-blue-600" />
                Start Movement Session
              </DialogTitle>
              <DialogDescription>
                Choose what type of movement you'd like to track
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {activityOptions.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => handleActivitySelect(activity.id)}
                  className={`w-full flex items-center p-4 rounded-lg border-2 transition-all text-left ${activity.color}`}
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center mr-4 shadow-sm">
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{activity.label}</div>
                    <div className="text-sm text-gray-600">{activity.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Walking Safety Warning Step */}
        {step === 'walk-safety' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl text-yellow-700">
                <AlertTriangle className="w-6 h-6 mr-2 text-yellow-600" />
                Fall Safety Warning
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium mb-3">
                  Walking requires staff or family assistance.
                </p>
                <p className="text-yellow-700 text-sm mb-3">
                  Falls during hospitalization can extend your stay and delay your recovery.
                  The Bedside Bike lets you move safely from your bed without fall risk.
                </p>
                <p className="text-yellow-800 font-semibold text-sm">
                  Make sure someone is with you before you begin walking.
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="fall-warning"
                  checked={fallWarningAccepted}
                  onCheckedChange={(checked) => setFallWarningAccepted(checked === true)}
                />
                <label htmlFor="fall-warning" className="text-sm text-gray-700 cursor-pointer">
                  I confirm that I have staff or family assistance with me for this walking session.
                </label>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep('walk-assistance')}
                  disabled={!fallWarningAccepted}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Walking Assistance Level Step */}
        {step === 'walk-assistance' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <Footprints className="w-6 h-6 mr-2 text-green-600" />
                Walking Assistance Level
              </DialogTitle>
              <DialogDescription>
                How much help do you have while walking?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-3">
                <button
                  onClick={() => setAssistanceLevel('assisted')}
                  className={`w-full flex items-center p-4 rounded-lg border-2 transition-all text-left ${
                    assistanceLevel === 'assisted'
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Assisted</div>
                    <div className="text-sm text-gray-600">
                      Physical support from staff or family member
                    </div>
                  </div>
                  {assistanceLevel === 'assisted' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setAssistanceLevel('independent')}
                  className={`w-full flex items-center p-4 rounded-lg border-2 transition-all text-left ${
                    assistanceLevel === 'independent'
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Independent</div>
                    <div className="text-sm text-gray-600">
                      Walking without physical help (supervised only)
                    </div>
                  </div>
                  {assistanceLevel === 'independent' && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep('walk-safety')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStart}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Walking
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Cycling Options Step */}
        {step === 'ride-options' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <Bike className="w-6 h-6 mr-2 text-blue-600" />
                Cycling Session
              </DialogTitle>
              <DialogDescription>
                Set your resistance level and choose a ride experience
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Resistance Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  Resistance Level: <span className="text-blue-600">{resistance}</span>
                </Label>
                <Slider
                  value={[resistance]}
                  onValueChange={(value) => setResistance(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Light</span>
                  <span>Moderate</span>
                  <span>Hard</span>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {resistanceDescriptions[resistance]}
                </p>
              </div>

              {/* Game Selection */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Choose Your Ride</Label>
                <div className="grid grid-cols-1 gap-2">
                  {gameOptions.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className={`flex items-center p-3 rounded-lg border-2 transition-all text-left ${
                        selectedGame === game.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : game.color
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
                        {game.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{game.label}</div>
                        <div className="text-sm text-gray-600">{game.description}</div>
                      </div>
                      {selectedGame === game.id && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hill Ride Note */}
              {selectedGame === 'hill-ride' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Hill Ride:</strong> The resistance will automatically increase by 1 level during uphill sections,
                    then return to your baseline. This provides gentle interval training without excessive strain.
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStart}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Riding
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Chair Sitting Confirmation Step */}
        {step === 'sit-confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <Armchair className="w-6 h-6 mr-2 text-purple-600" />
                Chair Sitting Session
              </DialogTitle>
              <DialogDescription>
                Track time spent sitting out of bed
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800 font-medium mb-2">
                  Great choice! Sitting out of bed is important for your recovery.
                </p>
                <p className="text-purple-700 text-sm">
                  Even sitting in a chair uses more muscles than lying in bed, helping you maintain strength
                  and prevent complications. Every minute counts!
                </p>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStart}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Timer
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
