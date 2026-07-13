// Symptom Checker Service (AI-Powered)
import api from './api';

export interface Symptom {
  id: string;
  name: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  bodyPart?: string;
}

export interface SymptomAnalysis {
  id: string;
  userId: string;
  symptoms: Symptom[];
  predictions: PossibleCondition[];
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  suggestedSpecialist?: string;
  disclaimer: string;
  createdAt: string;
}

export interface PossibleCondition {
  name: string;
  probability: number; // 0-100
  description: string;
  commonSymptoms: string[];
  seriousness: 'minor' | 'moderate' | 'serious' | 'critical';
  treatmentOptions: string[];
  whenToSeeDoctor: string;
}

export interface MedicalHistory {
  conditions: string[];
  allergies: string[];
  medications: string[];
  surgeries: string[];
  familyHistory: string[];
}

export interface SymptomCheckRequest {
  symptoms: string[];
  duration: string;
  severity: string;
  additionalInfo?: string;
  age?: number;
  gender?: string;
  medicalHistory?: MedicalHistory;
}

// Common symptoms list for quick selection
export const COMMON_SYMPTOMS: Symptom[] = [
  { id: '1', name: 'Headache', category: 'Head', severity: 'mild' },
  { id: '2', name: 'Fever', category: 'General', severity: 'moderate' },
  { id: '3', name: 'Cough', category: 'Respiratory', severity: 'mild' },
  { id: '4', name: 'Sore Throat', category: 'Respiratory', severity: 'mild' },
  { id: '5', name: 'Fatigue', category: 'General', severity: 'mild' },
  { id: '6', name: 'Nausea', category: 'Digestive', severity: 'mild' },
  { id: '7', name: 'Vomiting', category: 'Digestive', severity: 'moderate' },
  { id: '8', name: 'Diarrhea', category: 'Digestive', severity: 'moderate' },
  { id: '9', name: 'Chest Pain', category: 'Chest', severity: 'severe' },
  { id: '10', name: 'Shortness of Breath', category: 'Respiratory', severity: 'severe' },
  { id: '11', name: 'Dizziness', category: 'Head', severity: 'moderate' },
  { id: '12', name: 'Back Pain', category: 'Musculoskeletal', severity: 'mild' },
  { id: '13', name: 'Joint Pain', category: 'Musculoskeletal', severity: 'mild' },
  { id: '14', name: 'Muscle Pain', category: 'Musculoskeletal', severity: 'mild' },
  { id: '15', name: 'Skin Rash', category: 'Skin', severity: 'mild' },
  { id: '16', name: 'Stomach Pain', category: 'Digestive', severity: 'moderate' },
  { id: '17', name: 'Loss of Appetite', category: 'General', severity: 'mild' },
  { id: '18', name: 'Runny Nose', category: 'Respiratory', severity: 'mild' },
  { id: '19', name: 'Sneezing', category: 'Respiratory', severity: 'mild' },
  { id: '20', name: 'Body Aches', category: 'General', severity: 'mild' },
  { id: '21', name: 'Chills', category: 'General', severity: 'mild' },
  { id: '22', name: 'Sweating', category: 'General', severity: 'mild' },
  { id: '23', name: 'Insomnia', category: 'General', severity: 'mild' },
  { id: '24', name: 'Anxiety', category: 'Mental', severity: 'mild' },
  { id: '25', name: 'Depression', category: 'Mental', severity: 'moderate' },
];

class SymptomService {
  // Analyze symptoms using AI
  async analyzeSymptoms(
    request: SymptomCheckRequest
  ): Promise<{ success: boolean; data?: SymptomAnalysis; error?: string }> {
    try {
      const response = await api.post<SymptomAnalysis>('/symptoms/analyze', request);
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Symptom analysis error:', error);
      return { success: false, error: 'Failed to analyze symptoms' };
    }
  }

  // Get symptom suggestions based on partial input
  async getSymptomSuggestions(query: string): Promise<{ success: boolean; data?: Symptom[]; error?: string }> {
    try {
      const response = await api.get<Symptom[]>(`/symptoms/suggestions?query=${encodeURIComponent(query)}`);
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get suggestions error:', error);
      // Fallback to local filtering
      const filtered = COMMON_SYMPTOMS.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase())
      );
      return { success: true, data: filtered };
    }
  }

  // Get symptom history
  async getSymptomHistory(): Promise<{ success: boolean; data?: SymptomAnalysis[]; error?: string }> {
    try {
      const response = await api.get<SymptomAnalysis[]>('/symptoms/history');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get symptom history error:', error);
      return { success: false, error: 'Failed to fetch symptom history' };
    }
  }

  // Get all common symptoms
  getCommonSymptoms(): Symptom[] {
    return COMMON_SYMPTOMS;
  }

  // Get symptoms by category
  getSymptomsByCategory(category: string): Symptom[] {
    return COMMON_SYMPTOMS.filter(s => s.category === category);
  }

  // Get symptom categories
  getCategories(): string[] {
    return [...new Set(COMMON_SYMPTOMS.map(s => s.category))];
  }

  // Local symptom analysis (fallback when offline)
  analyzeLocalSymptoms(symptoms: string[]): PossibleCondition[] {
    // Simple rule-based analysis as fallback
    const conditions: PossibleCondition[] = [];

    const symptomSet = new Set(symptoms.map(s => s.toLowerCase()));

    // Common cold
    if (
      symptomSet.has('runny nose') ||
      symptomSet.has('sneezing') ||
      (symptomSet.has('cough') && symptomSet.has('sore throat'))
    ) {
      conditions.push({
        name: 'Common Cold',
        probability: 75,
        description: 'A viral infection of the upper respiratory tract',
        commonSymptoms: ['Runny nose', 'Sneezing', 'Sore throat', 'Cough', 'Mild fever'],
        seriousness: 'minor',
        treatmentOptions: ['Rest', 'Fluids', 'Over-the-counter cold medications'],
        whenToSeeDoctor: 'If symptoms persist beyond 10 days or worsen significantly',
      });
    }

    // Flu
    if (
      symptomSet.has('fever') &&
      (symptomSet.has('body aches') || symptomSet.has('fatigue'))
    ) {
      conditions.push({
        name: 'Influenza (Flu)',
        probability: 70,
        description: 'A viral infection that attacks the respiratory system',
        commonSymptoms: ['High fever', 'Body aches', 'Fatigue', 'Cough', 'Headache'],
        seriousness: 'moderate',
        treatmentOptions: ['Rest', 'Fluids', 'Antiviral medications if caught early'],
        whenToSeeDoctor: 'If fever is very high or symptoms are severe',
      });
    }

    // Gastroenteritis
    if (symptomSet.has('vomiting') || symptomSet.has('diarrhea')) {
      conditions.push({
        name: 'Gastroenteritis',
        probability: 65,
        description: 'Stomach and intestinal infection',
        commonSymptoms: ['Nausea', 'Vomiting', 'Diarrhea', 'Stomach cramps', 'Fever'],
        seriousness: 'moderate',
        treatmentOptions: ['Stay hydrated', 'BRAT diet', 'Rest'],
        whenToSeeDoctor: 'If signs of dehydration or blood in stool',
      });
    }

    // Migraine
    if (symptomSet.has('headache') && (symptomSet.has('nausea') || symptomSet.has('dizziness'))) {
      conditions.push({
        name: 'Migraine',
        probability: 60,
        description: 'A severe recurring headache',
        commonSymptoms: ['Severe headache', 'Nausea', 'Sensitivity to light', 'Dizziness'],
        seriousness: 'moderate',
        treatmentOptions: ['Dark quiet room', 'Pain relievers', 'Migraine medications'],
        whenToSeeDoctor: 'If migraines are frequent or debilitating',
      });
    }

    // Add disclaimer condition
    if (symptomSet.has('chest pain') || symptomSet.has('shortness of breath')) {
      conditions.unshift({
        name: 'Possible Cardiac Event',
        probability: 0,
        description: 'Chest pain and shortness of breath can indicate serious conditions',
        commonSymptoms: ['Chest pain', 'Shortness of breath', 'Arm pain', 'Sweating'],
        seriousness: 'critical',
        treatmentOptions: ['Seek immediate medical attention'],
        whenToSeeDoctor: 'IMMEDIATELY - Call emergency services',
      });
    }

    return conditions;
  }
}

export const symptomService = new SymptomService();
export default symptomService;
