/**
 * HIPAA-Compliant Authentication Context
 *
 * Security features:
 * - No PHI stored in browser storage (localStorage or sessionStorage)
 * - Only non-sensitive identifiers stored client-side
 * - Full user data fetched from server on session restore
 * - Secure logout with session destruction
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";

// Patient is just a User with userType 'patient'
type Patient = User & { userType: 'patient' };

interface CaregiverLoginResponse {
  user: User;
  patients: Array<User & { relationship: any }>;
  unreadNotifications: number;
}

interface AuthContext {
  user: User | null;
  patient: Patient | null; // For backward compatibility
  caregiverPatients: Array<User & { relationship: any }> | null; // For caregivers
  login: (firstName: string, lastName: string, dateOfBirth: string) => Promise<boolean>;
  loginCaregiver: (email: string) => Promise<CaregiverLoginResponse | null>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setCaregiverPatients: (patients: Array<User & { relationship: any }> | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContext | null>(null);

/**
 * HIPAA-Compliant Session Storage
 *
 * We only store minimal, non-PHI identifiers in sessionStorage:
 * - userId: numeric identifier
 * - userType: role type (patient, provider, caregiver)
 *
 * NO PHI is stored client-side:
 * - No names
 * - No dates of birth
 * - No email addresses
 * - No health data
 */
interface SessionInfo {
  userId: number;
  userType: 'patient' | 'provider' | 'caregiver';
}

const SESSION_KEY = 'bb_session_info';

function getStoredSessionInfo(): SessionInfo | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse session info');
  }
  return null;
}

function storeSessionInfo(info: SessionInfo): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(info));
}

function clearSessionInfo(): void {
  sessionStorage.removeItem(SESSION_KEY);
  // Also clear any legacy localStorage items
  localStorage.removeItem('user');
  localStorage.removeItem('patient');
  localStorage.removeItem('caregiverPatients');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [caregiverPatients, setCaregiverPatientsState] = useState<Array<User & { relationship: any }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session and restore from server
    const restoreSession = async () => {
      // Clear any legacy localStorage PHI data for HIPAA compliance
      localStorage.removeItem('user');
      localStorage.removeItem('patient');
      localStorage.removeItem('caregiverPatients');

      const sessionInfo = getStoredSessionInfo();

      if (sessionInfo) {
        try {
          // Fetch full user data from server (validates session)
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            setUserState(data.user);
            if (data.caregiverPatients) {
              setCaregiverPatientsState(data.caregiverPatients);
            }
          } else {
            // Session expired or invalid - clear stored info
            clearSessionInfo();
          }
        } catch (error) {
          console.warn('Failed to restore session');
          clearSessionInfo();
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (firstName: string, lastName: string, dateOfBirth: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ firstName, lastName, dateOfBirth }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data.patient;
        setUserState(userData);

        // Store only non-PHI session info
        storeSessionInfo({
          userId: userData.id,
          userType: userData.userType,
        });

        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const loginCaregiver = async (email: string): Promise<CaregiverLoginResponse | null> => {
    try {
      const response = await fetch("/api/auth/login/caregiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data: CaregiverLoginResponse = await response.json();
        setUserState(data.user);
        setCaregiverPatientsState(data.patients);

        // Store only non-PHI session info
        storeSessionInfo({
          userId: data.user.id,
          userType: 'caregiver',
        });

        return data;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const logout = async () => {
    try {
      // Call server to destroy session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout request failed');
    }

    // Clear local state regardless of server response
    setUserState(null);
    setCaregiverPatientsState(null);
    clearSessionInfo();
  };

  const updateUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      // Update session info (non-PHI only)
      storeSessionInfo({
        userId: newUser.id,
        userType: newUser.userType as 'patient' | 'provider' | 'caregiver',
      });
    } else {
      clearSessionInfo();
    }
  };

  const updateCaregiverPatients = (patients: Array<User & { relationship: any }> | null) => {
    setCaregiverPatientsState(patients);
    // Note: Patient data is NOT stored locally - only kept in memory
  };

  return (
    <AuthContext.Provider value={{
      user,
      patient: user?.userType === 'patient' ? user as Patient : null, // For backward compatibility
      caregiverPatients, // For caregiver users
      login,
      loginCaregiver,
      logout,
      setUser: updateUser,
      setCaregiverPatients: updateCaregiverPatients,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
