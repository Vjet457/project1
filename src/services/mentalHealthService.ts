// Mental Health Service
import api from './api';

export interface MoodEntry {
  id: string;
  userId: string;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  moodScore: number; // 1-5
  emotions: string[];
  triggers?: string[];
  activities?: string[];
  notes?: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: MoodEntry['mood'];
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeditationSession {
  id: string;
  userId: string;
  type: 'guided' | 'breathing' | 'body_scan' | 'visualization' | 'unguided';
  duration: number; // minutes
  completedDuration: number;
  title: string;
  category: string;
  timestamp: string;
}

export interface MeditationContent {
  id: string;
  title: string;
  description: string;
  type: MeditationSession['type'];
  duration: number;
  category: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  isPremium: boolean;
  instructor?: string;
}

export interface MentalHealthAssessment {
  id: string;
  userId: string;
  type: 'PHQ9' | 'GAD7' | 'stress' | 'wellbeing';
  score: number;
  maxScore: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  responses: { question: string; answer: number }[];
  recommendations: string[];
  timestamp: string;
}

export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  pattern: {
    inhale: number;
    hold?: number;
    exhale: number;
    holdAfterExhale?: number;
  };
  duration: number; // suggested duration in minutes
  benefits: string[];
}

export interface DailyMentalHealthRecordInput {
  date?: string;
  mood?: {
    overall: number;
    emotions?: string[];
    notes?: string;
  };
  stressLevel?: number;
  anxietyLevel?: number;
  energyLevel?: number;
  motivationLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  socialInteraction?: 'isolated' | 'minimal' | 'moderate' | 'active' | 'very_active';
  exerciseImpact?: 'none' | 'light' | 'moderate' | 'intense';
  activities?: {
    meditation?: { practiced?: boolean; duration?: number };
    journaling?: { practiced?: boolean; entry?: string };
    breathingExercises?: { practiced?: boolean; duration?: number };
    gratitude?: string[];
  };
  triggers?: string[];
  copingStrategies?: string[];
  workLifeBalance?: number;
  notes?: string;
}

// Predefined breathing exercises
export const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: '1',
    name: '4-7-8 Breathing',
    description: 'A relaxation technique that promotes better sleep and reduces anxiety',
    pattern: { inhale: 4, hold: 7, exhale: 8 },
    duration: 5,
    benefits: ['Reduces anxiety', 'Helps with sleep', 'Manages stress'],
  },
  {
    id: '2',
    name: 'Box Breathing',
    description: 'Used by Navy SEALs to stay calm and focused',
    pattern: { inhale: 4, hold: 4, exhale: 4, holdAfterExhale: 4 },
    duration: 5,
    benefits: ['Improves focus', 'Reduces stress', 'Increases alertness'],
  },
  {
    id: '3',
    name: 'Calm Breathing',
    description: 'Simple breathing pattern for everyday relaxation',
    pattern: { inhale: 4, exhale: 6 },
    duration: 3,
    benefits: ['Quick relaxation', 'Easy to do anywhere', 'Reduces tension'],
  },
  {
    id: '4',
    name: 'Energizing Breath',
    description: 'Rapid breathing to increase energy and alertness',
    pattern: { inhale: 2, exhale: 2 },
    duration: 2,
    benefits: ['Increases energy', 'Improves alertness', 'Wakes you up'],
  },
];

// PHQ-9 Questions for depression screening
export const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety/restless',
  'Thoughts of self-harm or being better off dead',
];

// GAD-7 Questions for anxiety screening
export const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it\'s hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];

class MentalHealthService {
  async getTodayMentalHealthRecord(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await api.get('/mental-health/today');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get today mental health record error:', error);
      return { success: false, error: 'Failed to fetch today\'s mental health record' };
    }
  }

  async saveDailyMentalHealthRecord(
    record: DailyMentalHealthRecordInput
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const todayResponse = await this.getTodayMentalHealthRecord();
      const recordPayload = {
        ...record,
        date: record.date ?? new Date().toISOString(),
        mood: record.mood ?? { overall: 3 },
      };

      if (todayResponse.success && todayResponse.data?._id) {
        const response = await api.put(`/mental-health/record/${todayResponse.data._id}`, recordPayload);
        return { success: response.success, data: response.data, error: response.error };
      }

      const response = await api.post('/mental-health/record', recordPayload);
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Save daily mental health record error:', error);
      return { success: false, error: 'Failed to save daily mental health record' };
    }
  }

  // Mood tracking
  async logMood(mood: Omit<MoodEntry, 'id' | 'userId' | 'timestamp'>): Promise<{ success: boolean; data?: MoodEntry; error?: string }> {
    try {
      const response = await this.saveDailyMentalHealthRecord({
        date: new Date().toISOString(),
        mood: {
          overall: mood.moodScore,
          emotions: mood.emotions,
          notes: mood.notes,
        },
        triggers: mood.triggers,
        activities: mood.activities ? { gratitude: mood.activities } : undefined,
        notes: mood.notes,
      });
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Log mood error:', error);
      return { success: false, error: 'Failed to log mood' };
    }
  }

  async getMoodHistory(
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data?: MoodEntry[]; error?: string }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daySpan = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
        ? 30
        : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      const response = await api.get<MoodEntry[]>(`/mental-health/mood-history?days=${daySpan}`);
      const records = Array.isArray(response.data) ? response.data : [];
      const normalizedRecords = records.map((record: any) => ({
        id: record._id ?? record.id ?? record.date ?? `${Date.now()}`,
        userId: record.user?._id ?? record.user ?? '',
        mood: record.mood?.overall >= 4 ? 'good' : record.mood?.overall === 3 ? 'okay' : 'bad',
        moodScore: record.mood?.overall ?? 3,
        emotions: Array.isArray(record.mood?.emotions) ? record.mood.emotions : [],
        triggers: Array.isArray(record.triggers) ? record.triggers : [],
        activities: record.activities ? Object.keys(record.activities) : [],
        notes: record.notes ?? record.mood?.notes,
        timestamp: record.date ?? record.createdAt ?? new Date().toISOString(),
      }));
      return { success: response.success, data: normalizedRecords, error: response.error };
    } catch (error) {
      console.error('Get mood history error:', error);
      return { success: false, error: 'Failed to fetch mood history' };
    }
  }

  // Journal entries
  async createJournalEntry(
    entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; data?: JournalEntry; error?: string }> {
    try {
      const response = await api.post<JournalEntry>('/mental-health/journal', entry);
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Create journal entry error:', error);
      return { success: false, error: 'Failed to create journal entry' };
    }
  }

  async getJournalEntries(): Promise<{ success: boolean; data?: JournalEntry[]; error?: string }> {
    try {
      const response = await api.get<JournalEntry[]>('/mental-health/journal');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get journal entries error:', error);
      return { success: false, error: 'Failed to fetch journal entries' };
    }
  }

  async updateJournalEntry(
    id: string,
    updates: Partial<JournalEntry>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.put(`/mental-health/journal/${id}`, updates);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Update journal entry error:', error);
      return { success: false, error: 'Failed to update journal entry' };
    }
  }

  async deleteJournalEntry(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/mental-health/journal/${id}`);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Delete journal entry error:', error);
      return { success: false, error: 'Failed to delete journal entry' };
    }
  }

  // Meditation
  async getMeditationContent(
    category?: string
  ): Promise<{ success: boolean; data?: MeditationContent[]; error?: string }> {
    try {
      const query = category ? `?category=${category}` : '';
      const response = await api.get<MeditationContent[]>(`/mental-health/meditations${query}`);
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get meditation content error:', error);
      return { success: false, error: 'Failed to fetch meditation content' };
    }
  }

  async logMeditationSession(
    session: Omit<MeditationSession, 'id' | 'userId' | 'timestamp'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post('/mental-health/meditations/sessions', {
        ...session,
        timestamp: new Date().toISOString(),
      });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Log meditation session error:', error);
      return { success: false, error: 'Failed to log meditation session' };
    }
  }

  async getMeditationHistory(): Promise<{ success: boolean; data?: MeditationSession[]; error?: string }> {
    try {
      const response = await api.get<MeditationSession[]>('/mental-health/meditations/sessions');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get meditation history error:', error);
      return { success: false, error: 'Failed to fetch meditation history' };
    }
  }

  // Assessments
  async submitAssessment(
    type: MentalHealthAssessment['type'],
    responses: { question: string; answer: number }[]
  ): Promise<{ success: boolean; data?: MentalHealthAssessment; error?: string }> {
    try {
      const score = responses.reduce((sum, responseItem) => sum + responseItem.answer, 0);
      const fallbackMood = Math.max(1, Math.min(5, Math.round(5 - score / Math.max(1, responses.length || 1)))) || 3;
      const response = await this.saveDailyMentalHealthRecord({
        date: new Date().toISOString(),
        mood: {
          overall: fallbackMood,
          notes: `${type.toUpperCase()} assessment submitted`,
        },
        notes: JSON.stringify({ type, responses }),
      });
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Submit assessment error:', error);
      return { success: false, error: 'Failed to submit assessment' };
    }
  }

  async getAssessmentHistory(): Promise<{ success: boolean; data?: MentalHealthAssessment[]; error?: string }> {
    try {
      const response = await api.get<MentalHealthAssessment[]>('/mental-health/assessments');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get assessment history error:', error);
      return { success: false, error: 'Failed to fetch assessment history' };
    }
  }

  // Calculate PHQ-9 score
  calculatePHQ9Score(responses: number[]): { score: number; severity: MentalHealthAssessment['severity'] } {
    const score = responses.reduce((sum, val) => sum + val, 0);
    let severity: MentalHealthAssessment['severity'];

    if (score <= 4) severity = 'minimal';
    else if (score <= 9) severity = 'mild';
    else if (score <= 14) severity = 'moderate';
    else if (score <= 19) severity = 'moderately_severe';
    else severity = 'severe';

    return { score, severity };
  }

  // Calculate GAD-7 score
  calculateGAD7Score(responses: number[]): { score: number; severity: MentalHealthAssessment['severity'] } {
    const score = responses.reduce((sum, val) => sum + val, 0);
    let severity: MentalHealthAssessment['severity'];

    if (score <= 4) severity = 'minimal';
    else if (score <= 9) severity = 'mild';
    else if (score <= 14) severity = 'moderate';
    else severity = 'severe';

    return { score, severity };
  }

  // Get breathing exercises
  getBreathingExercises(): BreathingExercise[] {
    return BREATHING_EXERCISES;
  }

  // Get PHQ-9 questions
  getPHQ9Questions(): string[] {
    return PHQ9_QUESTIONS;
  }

  // Get GAD-7 questions
  getGAD7Questions(): string[] {
    return GAD7_QUESTIONS;
  }

  // Get mood statistics
  async getMoodStats(
    period: 'week' | 'month' | 'year'
  ): Promise<{ success: boolean; data?: { average: number; trend: string; total: number }; error?: string }> {
    try {
      const response = await api.get<{ average: number; trend: string; total: number }>(
        `/mental-health/mood/stats?period=${period}`
      );
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get mood stats error:', error);
      return { success: false, error: 'Failed to fetch mood statistics' };
    }
  }
}

export const mentalHealthService = new MentalHealthService();
export default mentalHealthService;
