import { Patient } from "@shared/schema";

export interface AuthState {
  patient: Patient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class AuthService {
  private static instance: AuthService;
  private storageKey = "bedside-bike-patient";

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(patientId: string, accessCode: string): Promise<{ success: boolean; patient?: Patient; error?: string }> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientId, accessCode }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setStoredPatient(data.patient);
        return { success: true, patient: data.patient };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || "Authentication failed" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please check your connection." };
    }
  }

  logout(): void {
    this.clearStoredPatient();
  }

  getStoredPatient(): Patient | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error parsing stored patient data:", error);
      this.clearStoredPatient();
    }
    return null;
  }

  private setStoredPatient(patient: Patient): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(patient));
    } catch (error) {
      console.error("Error storing patient data:", error);
    }
  }

  private clearStoredPatient(): void {
    localStorage.removeItem(this.storageKey);
  }

  isSessionValid(patient: Patient | null): boolean {
    if (!patient) return false;
    
    // Check if patient data has required fields
    return !!(patient.id && patient.patientId && patient.name && patient.isActive);
  }

  getDaysSinceStart(startDate: string | Date): number {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  formatSessionTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  calculateGoalProgress(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }

  getNextLevel(currentXp: number): { level: number; xpNeeded: number; xpForNext: number } {
    // XP requirements: Level 1: 0, Level 2: 100, Level 3: 300, Level 4: 600, Level 5: 1000, etc.
    const xpThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
    
    let level = 1;
    for (let i = xpThresholds.length - 1; i >= 0; i--) {
      if (currentXp >= xpThresholds[i]) {
        level = i + 1;
        break;
      }
    }
    
    const nextLevelIndex = Math.min(level, xpThresholds.length - 1);
    const xpForNext = xpThresholds[nextLevelIndex] || xpThresholds[xpThresholds.length - 1] + 1000;
    const xpNeeded = Math.max(0, xpForNext - currentXp);
    
    return { level, xpNeeded, xpForNext };
  }

  formatLeaderboardDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const decimalHours = hours + (minutes / 60);
    return `${decimalHours.toFixed(1)} hours this week`;
  }

  getEncouragementMessage(progress: number, streak: number): string {
    if (progress >= 100) {
      return "🎉 Congratulations! You've exceeded your goals!";
    } else if (progress >= 80) {
      return "🔥 You're so close to your goal! Keep pushing!";
    } else if (streak >= 5) {
      return "⚡ Amazing consistency! Your dedication is paying off!";
    } else if (progress >= 50) {
      return "💪 You're making great progress! Stay motivated!";
    } else {
      return "🌟 Every step counts! You're building healthy habits!";
    }
  }

  validatePatientId(patientId: string): boolean {
    return /^[A-Z0-9]{6,12}$/.test(patientId);
  }

  validateAccessCode(accessCode: string): boolean {
    return /^[A-Z0-9]{4,8}$/.test(accessCode);
  }
}

export const authService = AuthService.getInstance();
