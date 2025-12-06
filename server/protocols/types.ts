/**
 * Type definitions for Clinical Protocol Engine
 */

export interface ProtocolPhase {
  phase: string;                      // "POD 0-2", "POD 3-7", "Acute", "Recovery"
  frequency: string;                  // "BID", "TID", "QID", "daily"
  duration: number;                   // Minutes per session
  resistance: { min: number; max: number }; // Watts
  rpm: { min: number; max: number }; // Target RPM range
  goals: string;                      // Clinical goals for this phase
  progressionCriteria: string[];      // When to advance to next phase
  monitoringParams?: string[];        // What to monitor during exercise
  stopCriteria?: string[];            // When to stop immediately
}

export interface ClinicalProtocol {
  id: number;
  name: string;
  indication: string;                 // Clinical indication
  contraindications: string[];        // Absolute contraindications
  diagnosisCodes: string[];           // ICD-10 codes
  phases: ProtocolPhase[];           // Progression phases
  evidenceCitation: string;           // Research reference
  isActive: boolean;
}

export interface ProtocolPrescription {
  frequency: string;
  duration: number;                   // Minutes
  resistance: { min: number; max: number }; // Watts
  rpm: { min: number; max: number };
  rationale: string;                  // Why this prescription
  phase: string;                      // Current phase name
  goals: string;                      // What this achieves
  monitoringParams?: string[];
  stopCriteria?: string[];
}

export interface ProgressionCheck {
  shouldProgress: boolean;
  currentPhase: string;
  nextPhase?: string;
  reason: string;
  criteria?: string[];
}

export interface ProtocolAssignment {
  id: number;
  patientId: number;
  protocolId: number;
  assignedBy: number;
  currentPhase: string;
  startDate: Date;
  progressionDate?: Date;
  status: 'active' | 'completed' | 'discontinued';
  notes?: string;
}
