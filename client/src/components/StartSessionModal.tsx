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
import { Play, Mountain, TreePine, Waves, Bike } from "lucide-react";
import { useSessionTimer, SessionGame } from "@/contexts/SessionTimerContext";

interface StartSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGame?: SessionGame;
}

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

export default function StartSessionModal({ open, onOpenChange, defaultGame = 'none' }: StartSessionModalProps) {
  const [resistance, setResistance] = useState(3);
  const [selectedGame, setSelectedGame] = useState<SessionGame>(defaultGame);
  const { startSession, state } = useSessionTimer();

  // Don't allow starting a new session if one is active
  if (state.isActive) {
    return null;
  }

  const handleStart = () => {
    startSession(resistance, selectedGame);
    onOpenChange(false);
    // Reset for next time
    setResistance(3);
    setSelectedGame('none');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Play className="w-6 h-6 mr-2 text-blue-600" />
            Start Exercise Session
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

          {/* Start Button */}
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
          >
            <Play className="w-6 h-6 mr-2" />
            Start Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
