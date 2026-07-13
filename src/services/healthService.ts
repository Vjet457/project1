// Health Data Service
import api from './api';
import { getAllHealthData, HealthConnectData } from './healthConnect';

export interface VitalRecord {
  id: string;
  userId: string;
  type: 'heart_rate' | 'blood_pressure' | 'blood_oxygen' | 'temperature' | 'blood_glucose';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  timestamp: string;
  source: 'manual' | 'health_connect' | 'device';
  notes?: string;
}

export interface ActivityRecord {
  id: string;
  userId: string;
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activeCalories: number;
  activeMinutes: number;
  floors?: number;
}

export interface SleepRecord {
  id: string;
  userId: string;
  date: string;
  duration: number; // in hours
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  bedTime: string;
  wakeTime: string;
  stages?: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
}

export interface HealthGoal {
  id: string;
  userId: string;
  type: 'steps' | 'calories' | 'sleep' | 'water' | 'weight' | 'exercise';
  target: number;
  current: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
}

export interface HealthSummary {
  vitals: {
    heartRate: number;
    bloodPressure: { systolic: number; diastolic: number };
    bloodOxygen: number;
    temperature?: number;
  };
  activity: {
    steps: number;
    calories: number;
    distance: number;
    activeMinutes: number;
  };
  sleep: {
    lastNight: number;
    average: number;
    quality: string;
  };
  healthScore: number;
  lastSync: string;
}

export interface DailyHealthRecordInput {
  date?: string;
  vitals?: {
    heartRate?: number;
    bloodPressure?: { systolic?: number; diastolic?: number };
    bloodOxygen?: number;
    bodyTemperature?: number;
    respiratoryRate?: number;
  };
  activity?: {
    steps?: number;
    distance?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
    exerciseType?: 'walking' | 'running' | 'cycling' | 'swimming' | 'gym' | 'yoga' | 'other' | 'none';
    exerciseDuration?: number;
  };
  sleep?: {
    duration?: number;
    quality?: number;
  };
  nutrition?: {
    waterIntake?: number;
    caloriesConsumed?: number;
  };
  body?: {
    weight?: number;
    bmi?: number;
    bodyFatPercentage?: number;
  };
  healthScore?: {
    overall?: number;
    vitalsScore?: number;
    activityScore?: number;
    sleepScore?: number;
    nutritionScore?: number;
  };
  notes?: string;
  source?: 'manual' | 'health_connect' | 'apple_health' | 'fitbit' | 'garmin' | 'other';
}

const mapWearableDataToDailyRecord = (
  wearableData: HealthConnectData,
  extras: Partial<DailyHealthRecordInput> = {}
): DailyHealthRecordInput => ({
  date: extras.date ?? new Date().toISOString(),
  vitals: {
    heartRate: wearableData.heartRate || undefined,
    bloodPressure: {
      systolic: wearableData.bloodPressure?.systolic || undefined,
      diastolic: wearableData.bloodPressure?.diastolic || undefined,
    },
    bloodOxygen: wearableData.bloodOxygen || undefined,
  },
  activity: {
    steps: wearableData.steps || undefined,
    distance: wearableData.distance || undefined,
    caloriesBurned: wearableData.activeCalories || wearableData.calories || undefined,
    activeMinutes: wearableData.activeCalories ? Math.round(wearableData.activeCalories / 6) : undefined,
  },
  sleep: wearableData.sleep ? { duration: wearableData.sleep } : undefined,
  body: {
    bmi: wearableData.bmi || undefined,
  },
  healthScore: extras.healthScore,
  notes: extras.notes,
  source: extras.source ?? 'health_connect',
});

type HealthScoreUpdateListener = () => void;

class HealthService {
  private healthScoreUpdateListeners = new Set<HealthScoreUpdateListener>();

  subscribeToHealthScoreUpdates(listener: HealthScoreUpdateListener): () => void {
    this.healthScoreUpdateListeners.add(listener);
    return () => {
      this.healthScoreUpdateListeners.delete(listener);
    };
  }

  private notifyHealthScoreUpdated(): void {
    this.healthScoreUpdateListeners.forEach((listener) => listener());
  }

  async getTodayHealthRecord(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await api.get('/health/today');
      const payload = response.success ? (response.data as any)?.data ?? response.data : undefined;
      return { success: response.success, data: payload, error: response.error };
    } catch (error) {
      console.error('Get today health record error:', error);
      return { success: false, error: 'Failed to fetch today\'s health record' };
    }
  }

  async getHealthHistory(limit = 30): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await api.get<any[]>(`/health/records?limit=${limit}`);
      const payload = response.success ? (response.data as any)?.data ?? response.data : undefined;
      return { success: response.success, data: Array.isArray(payload) ? payload : [], error: response.error };
    } catch (error) {
      console.error('Get health history error:', error);
      return { success: false, error: 'Failed to fetch health history' };
    }
  }

  async saveDailyHealthRecord(
    record: DailyHealthRecordInput
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const todayResponse = await this.getTodayHealthRecord();
      const recordPayload = {
        ...record,
        date: record.date ?? new Date().toISOString(),
      };

      const derivedOverallScore = this.calculateHealthScore({
        vitals: {
          heartRate: recordPayload.vitals?.heartRate ?? 0,
          bloodPressure: recordPayload.vitals?.bloodPressure ?? { systolic: 0, diastolic: 0 },
          bloodOxygen: recordPayload.vitals?.bloodOxygen ?? 0,
        },
        activity: {
          steps: recordPayload.activity?.steps ?? 0,
          calories: recordPayload.activity?.caloriesBurned ?? 0,
          distance: recordPayload.activity?.distance ?? 0,
          activeMinutes: recordPayload.activity?.activeMinutes ?? 0,
        },
        sleep: {
          lastNight: recordPayload.sleep?.duration ?? 0,
          average: recordPayload.sleep?.duration ?? 0,
          quality: recordPayload.sleep?.quality ? `${recordPayload.sleep.quality}` : 'fair',
        },
      });

      const payloadWithScore = {
        ...recordPayload,
        healthScore: {
          ...recordPayload.healthScore,
          overall: typeof recordPayload.healthScore?.overall === 'number'
            ? recordPayload.healthScore.overall
            : derivedOverallScore,
        },
      };

      let response;
      if (todayResponse.success && todayResponse.data?._id) {
        response = await api.put(`/health/record/${todayResponse.data._id}`, payloadWithScore);
      } else {
        response = await api.post('/health/record', payloadWithScore);
      }

      if (response.success && typeof payloadWithScore.healthScore?.overall === 'number') {
        try {
          await api.post('/health-score-history', {
            overallHealthScore: payloadWithScore.healthScore.overall,
            date: payloadWithScore.date,
            remarks: payloadWithScore.notes || 'AI-calculated health score',
          }, true);
          this.notifyHealthScoreUpdated();
        } catch (historyError) {
          console.warn('Failed to persist health score history:', historyError);
          this.notifyHealthScoreUpdated();
        }
      }

      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Save daily health record error:', error);
      return { success: false, error: 'Failed to save daily health record' };
    }
  }

  async getHealthScoreHistory(limit = 10): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await api.get<any[]>(`/health-score-history/recent?limit=${limit}`);
      const payload = response.success ? (response.data as any)?.data ?? response.data : undefined;
      return { success: response.success, data: Array.isArray(payload) ? payload : [], error: response.error };
    } catch (error) {
      console.error('Get health score history error:', error);
      return { success: false, error: 'Failed to fetch health score history' };
    }
  }

  async getHealthScoreTrend(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await api.get<any>('/health-score-history/trend');
      const payload = response.success ? (response.data as any)?.data ?? response.data : undefined;
      return { success: response.success, data: payload, error: response.error };
    } catch (error) {
      console.error('Get health score trend error:', error);
      return { success: false, error: 'Failed to fetch health score trend' };
    }
  }

  // Sync data from Health Connect
  async syncHealthConnect(): Promise<{ success: boolean; data?: HealthConnectData; error?: string }> {
    try {
      const healthData = await getAllHealthData();

      const recordResponse = await this.saveDailyHealthRecord(
        mapWearableDataToDailyRecord(healthData, { source: 'health_connect' })
      );

      if (recordResponse.success) {
        return { success: true, data: healthData };
      }

      return { success: false, error: recordResponse.error };
    } catch (error) {
      console.error('Health Connect sync error:', error);
      return { success: false, error: 'Failed to sync health data' };
    }
  }

  // Get health summary
  async getHealthSummary(): Promise<{ success: boolean; data?: HealthSummary; error?: string }> {
    try {
      const response = await api.get<HealthSummary>('/health/summary');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get health summary error:', error);
      return { success: false, error: 'Failed to fetch health summary' };
    }
  }

  // Record vital manually
  async recordVital(vital: Omit<VitalRecord, 'id' | 'userId' | 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.saveDailyHealthRecord({
        date: new Date().toISOString(),
        vitals: {
          heartRate: vital.type === 'heart_rate' && typeof vital.value === 'number' ? vital.value : undefined,
          bloodPressure:
            vital.type === 'blood_pressure' && typeof vital.value === 'object'
              ? vital.value
              : undefined,
          bloodOxygen: vital.type === 'blood_oxygen' && typeof vital.value === 'number' ? vital.value : undefined,
          bodyTemperature: vital.type === 'temperature' && typeof vital.value === 'number' ? vital.value : undefined,
          respiratoryRate: vital.type === 'blood_glucose' && typeof vital.value === 'number' ? vital.value : undefined,
        },
        notes: vital.notes,
        source: 'manual',
      });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Record vital error:', error);
      return { success: false, error: 'Failed to record vital' };
    }
  }

  // Get vital history
  async getVitalHistory(
    type: VitalRecord['type'],
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data?: VitalRecord[]; error?: string }> {
    try {
      const response = await api.get<VitalRecord[]>(
        `/health/vitals?type=${type}&startDate=${startDate}&endDate=${endDate}`
      );
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get vital history error:', error);
      return { success: false, error: 'Failed to fetch vital history' };
    }
  }

  // Get activity history
  async getActivityHistory(
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data?: ActivityRecord[]; error?: string }> {
    try {
      const response = await api.get<ActivityRecord[]>(
        `/health/activity?startDate=${startDate}&endDate=${endDate}`
      );
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get activity history error:', error);
      return { success: false, error: 'Failed to fetch activity history' };
    }
  }

  // Record sleep data
  async recordSleep(sleep: Omit<SleepRecord, 'id' | 'userId'>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.saveDailyHealthRecord({
        date: sleep.date ?? new Date().toISOString(),
        sleep: {
          duration: sleep.duration,
          quality: sleep.quality === 'poor' ? 1 : sleep.quality === 'fair' ? 2 : sleep.quality === 'good' ? 4 : 5,
        },
        source: 'manual',
      });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Record sleep error:', error);
      return { success: false, error: 'Failed to record sleep data' };
    }
  }

  // Get sleep history
  async getSleepHistory(
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; data?: SleepRecord[]; error?: string }> {
    try {
      const response = await api.get<SleepRecord[]>(
        `/health/sleep?startDate=${startDate}&endDate=${endDate}`
      );
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get sleep history error:', error);
      return { success: false, error: 'Failed to fetch sleep history' };
    }
  }

  // Get/Set health goals
  async getHealthGoals(): Promise<{ success: boolean; data?: HealthGoal[]; error?: string }> {
    try {
      const response = await api.get<HealthGoal[]>('/health/goals');
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get health goals error:', error);
      return { success: false, error: 'Failed to fetch health goals' };
    }
  }

  async setHealthGoal(goal: Omit<HealthGoal, 'id' | 'userId'>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post('/health/goals', goal);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Set health goal error:', error);
      return { success: false, error: 'Failed to set health goal' };
    }
  }

  // Calculate health score
  calculateHealthScore(summary: Partial<HealthSummary>): number {
    let score = 50; // Base score

    // Heart rate contribution (60-100 is normal)
    if (summary.vitals?.heartRate) {
      const hr = summary.vitals.heartRate;
      if (hr >= 60 && hr <= 100) score += 10;
      else if (hr >= 50 && hr <= 110) score += 5;
    }

    // Blood oxygen contribution (95-100 is normal)
    if (summary.vitals?.bloodOxygen) {
      const bo = summary.vitals.bloodOxygen;
      if (bo >= 95) score += 10;
      else if (bo >= 90) score += 5;
    }

    // Steps contribution
    if (summary.activity?.steps) {
      const steps = summary.activity.steps;
      if (steps >= 10000) score += 15;
      else if (steps >= 7500) score += 10;
      else if (steps >= 5000) score += 5;
    }

    // Sleep contribution
    if (summary.sleep?.lastNight) {
      const sleep = summary.sleep.lastNight;
      if (sleep >= 7 && sleep <= 9) score += 15;
      else if (sleep >= 6) score += 8;
    }

    return Math.min(100, Math.max(0, score));
  }
}

export const healthService = new HealthService();
export default healthService;
