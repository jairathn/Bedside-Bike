import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export type SessionGame =
  | 'none'
  | 'scenic-forest'
  | 'scenic-beach'
  | 'scenic-mountains'
  | 'hill-ride';

export interface HillInterval {
  startTime: number; // seconds from start
  duration: number; // seconds
  resistanceChange: number; // +1 or 0 (relative to baseline)
  label: string; // "Uphill" or "Flat"
}

export interface SessionTimerState {
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  elapsedSeconds: number;
  pausedSeconds: number; // Time spent paused
  baselineResistance: number;
  currentResistance: number;
  selectedGame: SessionGame;
  hillIntervals: HillInterval[];
  currentHillIndex: number;
}

interface SessionTimerContextType {
  state: SessionTimerState;
  startSession: (resistance: number, game?: SessionGame) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<void>;
  cancelSession: () => void;
  formatTime: (seconds: number) => string;
}

const defaultState: SessionTimerState = {
  isActive: false,
  isPaused: false,
  startTime: null,
  elapsedSeconds: 0,
  pausedSeconds: 0,
  baselineResistance: 3,
  currentResistance: 3,
  selectedGame: 'none',
  hillIntervals: [],
  currentHillIndex: -1,
};

// Generate hill intervals for Hill Ride game
// Pattern: 45s flat, 30s uphill (+1), 45s flat, 30s uphill, repeat
function generateHillIntervals(): HillInterval[] {
  const intervals: HillInterval[] = [];
  let currentTime = 0;

  // Generate enough intervals for a 30+ minute session
  for (let i = 0; i < 15; i++) {
    // Flat section
    intervals.push({
      startTime: currentTime,
      duration: 45,
      resistanceChange: 0,
      label: "Flat Road",
    });
    currentTime += 45;

    // Uphill section (max +1 from baseline)
    intervals.push({
      startTime: currentTime,
      duration: 30,
      resistanceChange: 1,
      label: "Uphill",
    });
    currentTime += 30;
  }

  return intervals;
}

const SessionTimerContext = createContext<SessionTimerContextType | null>(null);

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionTimerState>(defaultState);
  const { patient, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentPatient = patient || user;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.isActive && !state.isPaused) {
      interval = setInterval(() => {
        setState(prev => {
          const newElapsed = prev.elapsedSeconds + 1;

          // Check for hill interval changes
          if (prev.selectedGame === 'hill-ride' && prev.hillIntervals.length > 0) {
            const currentInterval = prev.hillIntervals.find(
              (interval, idx) =>
                newElapsed >= interval.startTime &&
                newElapsed < interval.startTime + interval.duration &&
                idx !== prev.currentHillIndex
            );

            if (currentInterval) {
              const newIdx = prev.hillIntervals.indexOf(currentInterval);
              const newResistance = prev.baselineResistance + currentInterval.resistanceChange;

              return {
                ...prev,
                elapsedSeconds: newElapsed,
                currentHillIndex: newIdx,
                currentResistance: Math.min(10, Math.max(1, newResistance)),
              };
            }
          }

          return { ...prev, elapsedSeconds: newElapsed };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state.isActive, state.isPaused]);

  // Mutation to save session
  const saveSessionMutation = useMutation({
    mutationFn: async (sessionData: {
      patientId: number;
      duration: number;
      resistance: number;
      sessionDate: string;
      startTime: string;
    }) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: sessionData.patientId,
          duration: sessionData.duration,
          resistance: sessionData.resistance,
          sessionDate: sessionData.sessionDate,
          startTime: sessionData.startTime,
          isCompleted: true,
          isManual: false, // This is a timed session
          avgPower: sessionData.resistance * 5,
          avgRpm: 50,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save session');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Saved!",
        description: "Your exercise session has been recorded successfully.",
      });
      // Refresh dashboard data
      if (currentPatient?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/patients/${currentPatient.id}/dashboard`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Session",
        description: error.message || "Failed to save session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startSession = useCallback((resistance: number, game: SessionGame = 'none') => {
    const hillIntervals = game === 'hill-ride' ? generateHillIntervals() : [];

    setState({
      isActive: true,
      isPaused: false,
      startTime: new Date(),
      elapsedSeconds: 0,
      pausedSeconds: 0,
      baselineResistance: resistance,
      currentResistance: resistance,
      selectedGame: game,
      hillIntervals,
      currentHillIndex: game === 'hill-ride' ? 0 : -1,
    });

    toast({
      title: "Session Started!",
      description: game !== 'none'
        ? `Enjoy your ${game.replace('-', ' ')} ride!`
        : "Start pedaling! Your session is being timed.",
    });
  }, [toast]);

  const pauseSession = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
    toast({
      title: "Session Paused",
      description: "Take a break. Resume when you're ready.",
    });
  }, [toast]);

  const resumeSession = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
    toast({
      title: "Session Resumed",
      description: "Keep pedaling!",
    });
  }, [toast]);

  const endSession = useCallback(async () => {
    if (!state.startTime || !currentPatient?.id) {
      setState(defaultState);
      return;
    }

    // Calculate duration in minutes (excluding paused time)
    const activeSeconds = state.elapsedSeconds;
    const durationMinutes = Math.round(activeSeconds / 60);

    if (durationMinutes < 1) {
      toast({
        title: "Session Too Short",
        description: "Sessions must be at least 1 minute to be recorded.",
        variant: "destructive",
      });
      setState(defaultState);
      return;
    }

    // Format date for session
    const sessionDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(state.startTime);

    await saveSessionMutation.mutateAsync({
      patientId: currentPatient.id,
      duration: durationMinutes,
      resistance: state.baselineResistance,
      sessionDate,
      startTime: state.startTime.toISOString(),
    });

    setState(defaultState);
  }, [state, currentPatient, saveSessionMutation, toast]);

  const cancelSession = useCallback(() => {
    setState(defaultState);
    toast({
      title: "Session Cancelled",
      description: "Your session was not recorded.",
    });
  }, [toast]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <SessionTimerContext.Provider value={{
      state,
      startSession,
      pauseSession,
      resumeSession,
      endSession,
      cancelSession,
      formatTime,
    }}>
      {children}
    </SessionTimerContext.Provider>
  );
}

export function useSessionTimer() {
  const context = useContext(SessionTimerContext);
  if (!context) {
    throw new Error("useSessionTimer must be used within a SessionTimerProvider");
  }
  return context;
}
