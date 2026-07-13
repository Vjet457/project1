// Type definitions for AarogyaSaathi

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  profileComplete: boolean;
}

export interface HealthData {
  heartRate: VitalData;
  bloodOxygen: VitalData;
  bloodPressure: BloodPressureData;
  bodyTemp: VitalData;
  steps: StepsData;
}

export interface VitalData {
  value: number;
  unit: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface BloodPressureData {
  systolic: number;
  diastolic: number;
  unit: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface StepsData {
  value: number;
  unit: string;
  goal: number;
}

export interface Mood {
  id: number;
  emoji: string;
  label: string;
  value: number;
}

export interface Symptom {
  id: number;
  name: string;
  emoji: string;
  category: 'pain' | 'general' | 'respiratory' | 'digestive';
}

export interface DiseasePrediction {
  name: string;
  probability: number;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface QuickAction {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  route: string;
}

export interface Activity {
  title: string;
  value: string;
  target: string;
  icon: string;
  color: string;
  progress: number;
}

export interface Appointment {
  type: string;
  doctorName: string;
  specialty: string;
  time: string;
}

export interface MentalActivity {
  id: number;
  title: string;
  duration: string;
  icon: string;
  color: string[];
  route: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Dashboard: undefined;
  HealthTracking: undefined;
  MentalHealth: undefined;
  HealthHistory: undefined;
  HealthScoreAnalytics: undefined;
  Profile: undefined;
  SymptomChecker: undefined;
  PhysicalHealth: undefined;
  DoctorFinder: undefined;
  Emergency: undefined;
  PersonalInfo: undefined;
  EditProfile: undefined;
  MedicalRecords: undefined;
};

export type TabParamList = {
  DashboardTab: undefined;
  HealthTab: undefined;
  MentalTab: undefined;
  ProfileTab: undefined;
};
