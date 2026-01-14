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
  logout: () => void;
  setUser: (user: User | null) => void;
  setCaregiverPatients: (patients: Array<User & { relationship: any }> | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [caregiverPatients, setCaregiverPatients] = useState<Array<User & { relationship: any }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    console.log('🔄 AuthContext initializing, checking localStorage...');
    const savedUser = localStorage.getItem("user") || localStorage.getItem("patient");
    const savedCaregiverPatients = localStorage.getItem("caregiverPatients");
    console.log('🔄 Found in localStorage:', savedUser ? 'YES' : 'NO');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('🔄 Parsed user data:', { userType: userData.userType, id: userData.id, email: userData.email });
        setUser(userData);

        // Restore caregiver patients if available
        if (savedCaregiverPatients) {
          setCaregiverPatients(JSON.parse(savedCaregiverPatients));
        }
      } catch (error) {
        console.log('🔄 Error parsing saved user, clearing localStorage:', error);
        localStorage.removeItem("user");
        localStorage.removeItem("patient");
        localStorage.removeItem("caregiverPatients");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (firstName: string, lastName: string, dateOfBirth: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, dateOfBirth }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data.patient;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        // Keep patient field for backward compatibility
        if (data.patient) {
          localStorage.setItem("patient", JSON.stringify(data.patient));
        }
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
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data: CaregiverLoginResponse = await response.json();
        setUser(data.user);
        setCaregiverPatients(data.patients);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("caregiverPatients", JSON.stringify(data.patients));
        return data;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setCaregiverPatients(null);
    localStorage.removeItem("user");
    localStorage.removeItem("patient");
    localStorage.removeItem("caregiverPatients");
  };

  const updateUser = (newUser: User | null) => {
    console.log('📝 AuthContext updateUser called with:', newUser);
    setUser(newUser);
    if (newUser) {
      console.log('📝 Saving to localStorage:', { userType: newUser.userType, id: newUser.id });
      localStorage.setItem("user", JSON.stringify(newUser));
      console.log('📝 Saved to localStorage, verifying:', localStorage.getItem("user")?.substring(0, 100));
      // Keep patient field for backward compatibility
      if (newUser.userType === 'patient') {
        localStorage.setItem("patient", JSON.stringify(newUser));
      }
    } else {
      console.log('📝 Removing from localStorage');
      localStorage.removeItem("user");
      localStorage.removeItem("patient");
    }
  };

  const updateCaregiverPatients = (patients: Array<User & { relationship: any }> | null) => {
    setCaregiverPatients(patients);
    if (patients) {
      localStorage.setItem("caregiverPatients", JSON.stringify(patients));
    } else {
      localStorage.removeItem("caregiverPatients");
    }
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
