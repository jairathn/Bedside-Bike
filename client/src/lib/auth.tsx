import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Patient } from "@shared/schema";

interface AuthContext {
  user: User | null;
  patient: Patient | null; // For backward compatibility
  login: (firstName: string, lastName: string, dateOfBirth: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session  
    const savedUser = localStorage.getItem("user") || localStorage.getItem("patient");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem("user");
        localStorage.removeItem("patient");
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("patient");
  };

  const updateUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      // Keep patient field for backward compatibility
      if (newUser.userType === 'patient') {
        localStorage.setItem("patient", JSON.stringify(newUser));
      }
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("patient");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      patient: user?.userType === 'patient' ? user as Patient : null, // For backward compatibility
      login, 
      logout, 
      setUser: updateUser,
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
