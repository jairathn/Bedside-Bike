/**
 * Report Types and Interfaces
 *
 * Defines types for clinical documentation and reporting
 */

export interface ShiftReportOptions {
  patientId: number;
  startTime: Date;
  endTime: Date;
  includeRiskAssessment?: boolean;
  includeProtocol?: boolean;
}

export interface PTProgressNoteOptions {
  patientId: number;
  sessionIds: number[];
  subjective?: string;
  additionalNotes?: string;
}

export interface ReportMetadata {
  generatedAt: Date;
  generatedBy?: number;
  reportType: 'shift_summary' | 'pt_progress_note' | 'fhir_export' | 'cms_quality';
  patientId: number;
}

export interface ShiftReportData {
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    admissionDate?: string;
  };
  sessions: Array<{
    id: number;
    sessionDate: string;
    startTime: Date;
    endTime?: Date;
    duration: number;
    avgPower?: string;
    maxPower?: string;
    avgRpm?: number;
    resistance?: string;
    currentStatus?: string;
    sessionNotes?: string;
  }>;
  risks?: {
    deconditioning: number;
    vte: number;
    falls: number;
    pressure: number;
  };
  protocol?: {
    name: string;
    currentPhase: string;
    frequency: string;
    duration: number;
  };
  alerts?: Array<{
    type: string;
    priority: string;
    message: string;
    triggeredAt: Date;
  }>;
}

export interface SOAPNote {
  patient: {
    firstName: string;
    lastName: string;
    id: number;
  };
  date: Date;
  subjective: string;
  objective: {
    sessionsCompleted: number;
    protocolPhase: string;
    avgDuration: number;
    avgPower: number;
    avgRPM: number;
    safetyNotes: string;
    vitalSigns: string;
  };
  assessment: string;
  plan: string;
  provider?: {
    firstName: string;
    lastName: string;
    credentials: string;
  };
}
