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
import { Play, Pause, Square, Timer, Mountain, TreePine, Waves, Bike, TrendingUp, Footprints, Armchair } from "lucide-react";

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

  const getActivityIcon = () => {
    switch (state.activityType) {
      case 'walk':
        return <Footprints className="w-5 h-5 text-green-300" />;
      case 'sit':
        return <Armchair className="w-5 h-5 text-purple-300" />;
      case 'ride':
      default:
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
    }
  };

  const getActivityLabel = () => {
    switch (state.activityType) {
      case 'walk':
        return state.assistanceLevel === 'assisted' ? 'Walking (Assisted)' : 'Walking';
      case 'sit':
        return 'Chair Sitting';
      case 'ride':
      default:
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
    }
  };

  const getBannerColor = () => {
    if (state.isPaused) return 'bg-yellow-600';
    switch (state.activityType) {
      case 'walk':
        return 'bg-green-600';
      case 'sit':
        return 'bg-purple-600';
      case 'ride':
      default:
        return 'bg-blue-600';
    }
  };

  const getSecondaryColor = () => {
    if (state.isPaused) return 'bg-yellow-500';
    switch (state.activityType) {
      case 'walk':
        return 'bg-green-500';
      case 'sit':
        return 'bg-purple-500';
      case 'ride':
      default:
        return 'bg-blue-500';
    }
  };

  const getDividerColor = () => {
    if (state.isPaused) return 'bg-yellow-400';
    switch (state.activityType) {
      case 'walk':
        return 'bg-green-400';
      case 'sit':
        return 'bg-purple-400';
      case 'ride':
      default:
        return 'bg-blue-400';
    }
  };

  const getTimerIconColor = () => {
    if (state.isPaused) return 'text-yellow-200';
    switch (state.activityType) {
      case 'walk':
        return 'text-green-200';
      case 'sit':
        return 'text-purple-200';
      case 'ride':
      default:
        return 'text-blue-200';
    }
  };

  const getCurrentHillStatus = () => {
    if (state.activityType !== 'ride' || state.selectedGame !== 'hill-ride' || state.hillIntervals.length === 0) {
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
      <div className={`sticky top-0 z-50 ${getBannerColor()} text-white shadow-lg transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Timer and Activity Info */}
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className="flex items-center space-x-2">
                <Timer className={`w-6 h-6 ${getTimerIconColor()}`} />
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-wider">
                  {formatTime(state.elapsedSeconds)}
                </span>
              </div>

              {/* Divider */}
              <div className={`hidden sm:block h-8 w-px ${getDividerColor()}`} />

              {/* Activity Info */}
              <div className="hidden sm:flex items-center space-x-2">
                {getActivityIcon()}
                <span className="font-medium">{getActivityLabel()}</span>
              </div>

              {/* Resistance (only for cycling) */}
              {state.activityType === 'ride' && (
                <div className={`hidden sm:block px-2 py-1 rounded ${getSecondaryColor()}`}>
                  <span className="text-sm">
                    R: {state.currentResistance}
                    {state.selectedGame === 'hill-ride' && state.currentResistance !== state.baselineResistance && (
                      <span className="text-orange-300 ml-1">
                        ({state.currentResistance > state.baselineResistance ? '+1 Uphill' : 'Flat'})
                      </span>
                    )}
                  </span>
                </div>
              )}

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
              {getActivityIcon()}
              <span>{getActivityLabel()}</span>
            </div>
            {state.activityType === 'ride' && (
              <div className={`px-2 py-1 rounded ${getSecondaryColor()}`}>
                Resistance: {state.currentResistance}
              </div>
            )}
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
            <AlertDialogTitle>End {getActivityLabel()} Session?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Your session will be saved with the following details:</p>
              <div className="bg-gray-100 rounded-lg p-3 mt-2">
                <p><strong>Activity:</strong> {getActivityLabel()}</p>
                <p><strong>Duration:</strong> {formatTime(state.elapsedSeconds)} ({Math.round(state.elapsedSeconds / 60)} minutes)</p>
                {state.activityType === 'ride' && (
                  <p><strong>Resistance:</strong> Level {state.baselineResistance}</p>
                )}
                {state.activityType === 'walk' && state.assistanceLevel && (
                  <p><strong>Assistance:</strong> {state.assistanceLevel === 'assisted' ? 'Assisted' : 'Independent'}</p>
                )}
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
              Continue
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
              className={`${
                state.activityType === 'walk' ? 'bg-green-600 hover:bg-green-700' :
                state.activityType === 'sit' ? 'bg-purple-600 hover:bg-purple-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isEnding ? "Saving..." : "End & Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
