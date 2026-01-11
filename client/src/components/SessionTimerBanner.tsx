import { useState } from "react";
import { useSessionTimer } from "@/contexts/SessionTimerContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, Pause, Square, Timer, Mountain, TreePine, Waves, Bike, TrendingUp } from "lucide-react";

export default function SessionTimerBanner() {
  const { state, pauseSession, resumeSession, endSession, cancelSession, formatTime } = useSessionTimer();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  if (!state.isActive) {
    return null;
  }

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endSession();
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  const getGameIcon = () => {
    switch (state.selectedGame) {
      case 'scenic-forest':
        return <TreePine className="w-5 h-5 text-green-400" />;
      case 'scenic-beach':
        return <Waves className="w-5 h-5 text-blue-300" />;
      case 'scenic-mountains':
        return <Mountain className="w-5 h-5 text-slate-300" />;
      case 'hill-ride':
        return <TrendingUp className="w-5 h-5 text-orange-400" />;
      default:
        return <Bike className="w-5 h-5 text-white" />;
    }
  };

  const getGameLabel = () => {
    switch (state.selectedGame) {
      case 'scenic-forest':
        return 'Forest Path';
      case 'scenic-beach':
        return 'Beach Cruise';
      case 'scenic-mountains':
        return 'Mountain Vista';
      case 'hill-ride':
        return 'Hill Ride';
      default:
        return 'Free Ride';
    }
  };

  const getCurrentHillStatus = () => {
    if (state.selectedGame !== 'hill-ride' || state.hillIntervals.length === 0) {
      return null;
    }

    const currentInterval = state.hillIntervals[state.currentHillIndex];
    if (!currentInterval) return null;

    const intervalElapsed = state.elapsedSeconds - currentInterval.startTime;
    const intervalRemaining = currentInterval.duration - intervalElapsed;

    return {
      label: currentInterval.label,
      remaining: intervalRemaining,
      isUphill: currentInterval.resistanceChange > 0,
    };
  };

  const hillStatus = getCurrentHillStatus();

  return (
    <>
      <div className={`sticky top-0 z-50 ${state.isPaused ? 'bg-yellow-600' : 'bg-blue-600'} text-white shadow-lg transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Timer and Game Info */}
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className="flex items-center space-x-2">
                <Timer className={`w-6 h-6 ${state.isPaused ? 'text-yellow-200' : 'text-blue-200'}`} />
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-wider">
                  {formatTime(state.elapsedSeconds)}
                </span>
              </div>

              {/* Divider */}
              <div className={`hidden sm:block h-8 w-px ${state.isPaused ? 'bg-yellow-400' : 'bg-blue-400'}`} />

              {/* Game Info */}
              <div className="hidden sm:flex items-center space-x-2">
                {getGameIcon()}
                <span className="font-medium">{getGameLabel()}</span>
              </div>

              {/* Resistance */}
              <div className={`hidden sm:block px-2 py-1 rounded ${state.isPaused ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                <span className="text-sm">
                  R: {state.currentResistance}
                  {state.selectedGame === 'hill-ride' && state.currentResistance !== state.baselineResistance && (
                    <span className="text-orange-300 ml-1">
                      ({state.currentResistance > state.baselineResistance ? '+1 Uphill' : 'Flat'})
                    </span>
                  )}
                </span>
              </div>

              {/* Hill Ride Status */}
              {hillStatus && (
                <div className={`hidden md:flex items-center px-2 py-1 rounded text-sm ${
                  hillStatus.isUphill ? 'bg-orange-500' : 'bg-green-500'
                }`}>
                  <span className="mr-2">{hillStatus.isUphill ? '⛰️' : '🛤️'}</span>
                  <span>{hillStatus.label}</span>
                  <span className="ml-2 font-mono">{hillStatus.remaining}s</span>
                </div>
              )}
            </div>

            {/* Status Badge */}
            {state.isPaused && (
              <div className="flex items-center px-3 py-1 bg-yellow-500 rounded-full text-sm font-medium animate-pulse">
                PAUSED
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {state.isPaused ? (
                <Button
                  onClick={resumeSession}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Play className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Resume</span>
                </Button>
              ) : (
                <Button
                  onClick={pauseSession}
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Pause</span>
                </Button>
              )}

              <Button
                onClick={() => setShowEndConfirm(true)}
                size="sm"
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
              >
                <Square className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">End</span>
              </Button>
            </div>
          </div>

          {/* Mobile: Show additional info below */}
          <div className="sm:hidden mt-2 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {getGameIcon()}
              <span>{getGameLabel()}</span>
            </div>
            <div className={`px-2 py-1 rounded ${state.isPaused ? 'bg-yellow-500' : 'bg-blue-500'}`}>
              Resistance: {state.currentResistance}
            </div>
          </div>

          {/* Mobile: Hill status */}
          {hillStatus && (
            <div className="md:hidden mt-2">
              <div className={`flex items-center justify-center px-2 py-1 rounded text-sm ${
                hillStatus.isUphill ? 'bg-orange-500' : 'bg-green-500'
              }`}>
                <span className="mr-2">{hillStatus.isUphill ? '⛰️' : '🛤️'}</span>
                <span>{hillStatus.label}</span>
                <span className="ml-2 font-mono">{hillStatus.remaining}s remaining</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End Session Confirmation Dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Exercise Session?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Your session will be saved with the following details:</p>
              <div className="bg-gray-100 rounded-lg p-3 mt-2">
                <p><strong>Duration:</strong> {formatTime(state.elapsedSeconds)} ({Math.round(state.elapsedSeconds / 60)} minutes)</p>
                <p><strong>Resistance:</strong> Level {state.baselineResistance}</p>
                <p><strong>Ride:</strong> {getGameLabel()}</p>
              </div>
              {state.elapsedSeconds < 60 && (
                <p className="text-yellow-600 text-sm mt-2">
                  Note: Sessions under 1 minute will not be recorded.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isEnding}>
              Continue Riding
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                cancelSession();
                setShowEndConfirm(false);
              }}
              disabled={isEnding}
              className="text-gray-600"
            >
              Cancel Without Saving
            </Button>
            <AlertDialogAction
              onClick={handleEndSession}
              disabled={isEnding}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isEnding ? "Saving..." : "End & Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
