// Services Index - Export all services
export { default as api } from './api';
export { default as authService, type User, type LoginCredentials, type RegisterData } from './authService';
export { default as healthService, type VitalRecord, type ActivityRecord, type SleepRecord, type HealthGoal, type HealthSummary } from './healthService';
export * as healthConnectService from './healthConnect';
export { type HealthConnectData } from './healthConnect';
export { default as doctorService, type Doctor, type Appointment, type TimeSlot, type Prescription } from './doctorService';
export { default as emergencyService, type EmergencyContact, type Hospital, type AmbulanceService } from './emergencyService';
export { default as symptomService, type Symptom, type SymptomAnalysis, type PossibleCondition } from './symptomService';
export { default as mentalHealthService, type MoodEntry, type JournalEntry, type MeditationSession } from './mentalHealthService';

// AI Health Service
export { 
  default as aiHealthService,
  analyzeSymptomSeverity,
  calculatePhysicalHealthScore,
  calculateMentalHealthScore,
  type Symptom as AISymptom,
  type SymptomSeverityResult,
  type PredictedCondition,
  type PhysicalHealthInput,
  type PhysicalHealthScore,
  type MentalHealthInput,
  type MentalHealthScore,
} from './aiHealthService';
